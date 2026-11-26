"""Compare the same invented AD4 cuts through three independent public readings."""

import copy
import hashlib
import json
from pathlib import Path
import subprocess
import sys

import ad4


def compare(*args, status=0):
    result = subprocess.run([sys.executable, Path(ad4.TOOLS) / "compare.py", "--loops", ad4.LOOPS,
                             "--group", "potter.group.json", *args], capture_output=True, text=True)
    assert result.returncode == status, (result.returncode, result.stdout, result.stderr)
    for private in ("workshop", "potter", "yard", "kiln", ad4.END, ad4.POTTER):
        assert private not in result.stdout + result.stderr
    return json.loads(result.stdout)


def changed_cut(path, old, change):
    original = path.read_bytes()
    lines = original.splitlines(keepends=True)
    for i in range(1, len(lines) - 1):
        row = json.loads(lines[i])
        if row["id"] == old:
            change(row)
            lines[i] = json.dumps(row).encode() + b"\n"
            break
    else:
        raise AssertionError("missing fixture row")
    digest = hashlib.sha256(lines[0]).digest()
    for line in lines[1:-1]:
        digest = hashlib.sha256(digest + line).digest()
    path.write_bytes(b"".join(lines[:-1]) + json.dumps(
        {"count": str(len(lines) - 2), "digest": digest.hex()}).encode() + b"\n")
    return original


def main():
    group = ad4.init()
    ad4.save("potter.group.json", group)
    ad4.imp()
    whole = compare()
    assert [(s["things"]["equal"], s["things"]["retained_ref_fields_export_checked"])
            for s in whole["sources"]] == [(14, 3), (7, 1), (2, 1)]
    assert whole["union"]["differing"] == 0
    workshop, yard, kiln = group["sources"]
    def operands(src):
        return [src[k] for k in ("facts", "map", "destination")]

    # Each alternative is an independently framed cut compared to the original signed shadow.
    for src, old, field, edit, expected in [
        (workshop, "third", "observer", "kiln", (0, 1, 0)),
        (workshop, "middle", "ref", "task/yard", (0, 1, 0)),  # cross-store root -> thing
        (workshop, "absent", "ref", "new unknown text", (1, 0, 1)),
        (yard, ad4.END, "heat", 5, (1, 0, 0)),
        (kiln, "root-reader", "ref", ad4.END, (0, 1, 0)),  # two different yard roots
    ]:
        path = Path(src["facts"])
        def change(row):
            if field == "observer":
                row[field] = edit
            else:
                row["payload"] = json.dumps({**json.loads(row["payload"]), field: edit})
        original = changed_cut(path, old, change)
        summary = compare(*operands(src), status=1)["sources"][0]["things"]
        assert tuple(summary[k] for k in ("fields_differing", "mentions_differing",
                                           "retained_ref_fields_differing")) == expected, summary
        path.write_bytes(original)

    # Kiln's complete old collect reading carries literal refs, but no raw ref payload field.
    old_rows = [{"kind": "change", "key": None, "id": old, "observer": "", "payload": {}, "refs": [ref]}
                for old, ref in [("ambiguous", "shared"), ("root-reader", "missing-key")]]
    ad4.save("old.json", {"rows": old_rows})
    compare(*operands(kiln), "--old-json", "old.json")
    old_rows[1]["refs"] = [ad4.END]
    ad4.save("old.json", {"rows": old_rows})
    row = compare(*operands(kiln), "--old-json", "old.json", status=1)["sources"][0]["kinds"][0]
    for side in ("old_json", "old_json_shadow"):
        assert row[side]["mentions_differing"] == 1 and row[side]["fields_differing"] == 0

    # sl shows three recent collected roots and the keyed task. Two older roots
    # and the missing-key task have no row on the old side.
    yard_rows = [{"kind": "task", "key": "yard", "id": "task/legacy", "refs": [],
                  "payload": {"name": "yard"}, "observer": ""}]
    yard_rows.extend({"kind": "change", "key": None, "id": old, "observer": "", "refs": refs, "payload": {}}
                     for old, refs in [("cycle-b", ["cycle-a"]), ("external", ["middle", "cycle-a"]),
                                       ("local-yard", ["shared"])])
    ad4.save("old.json", {"rows": yard_rows})
    # Those absences are counted, so the run passes.
    report = compare(*operands(yard), "--old-json", "old.json")["sources"][0]
    assert report["things"]["differing"] == 0
    counts = [k["old_json"] for k in report["kinds"]]
    for name, total in [("missing_key_roots", 1), ("outside_collect_limit", 2), ("only_old", 3),
                        ("equal", 4), ("differing", 0)]:
        assert sum(c[name] for c in counts) == total, counts
    assert sum(k["old_json_shadow"]["only_new"] for k in report["kinds"]) == 3

    # The sidecar cannot supply its own evidence of group membership or record identity.
    path = Path("potter.group.ids.json")
    good = ad4.read(path)
    for mutation in ("extra_field", "wrong_target", "wrong_source", "missing_copy",
                     "wrong_destination", "missing_record", "revision_order"):
        bad = copy.deepcopy(good)
        entry = bad["first"][0]
        if mutation == "extra_field":
            entry["payload"] = "private"
        elif mutation == "wrong_target":
            entry["thing"] = "task:yard"
        elif mutation == "wrong_source":
            entry["source"] = "kiln"
        elif mutation == "missing_copy":
            bad["shared"].pop()
        elif mutation == "wrong_destination":
            entry["destination"] = "yard"
        elif mutation == "missing_record":
            entry["record"] = "r:absent"
        else:
            second = bad["second"][0]
            entry["record"], second["record"] = second["record"], entry["record"]
        ad4.save(path, bad)
        proc = subprocess.run([sys.executable, Path(ad4.TOOLS) / "compare.py", "--group", "potter.group.json",
                               "--loops", ad4.LOOPS], capture_output=True, text=True)
        assert proc.returncode == 1 and not proc.stdout and "id map" in proc.stderr
        assert "private" not in proc.stderr and "workshop" not in proc.stderr
    ad4.save(path, good)

    # A subsequent signed shadow revision has no legacy occurrence. The map
    # still locates every imported record, so report both inventory and reading.
    ad4.run("-C", "workshop", "emit", "task", "--of", "task:kiln", "--about",
            "task:yard", "--sets", "name", "name=kiln")
    changed = compare(*operands(workshop), status=1)["sources"][0]
    assert changed["unmapped_shadow_records"] == changed["record_count_mismatches"] == 1
    assert changed["things"]["mentions_differing"] == 1 and changed["things"]["fields_differing"] == 0


if __name__ == "__main__":
    main()
