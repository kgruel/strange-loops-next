"""Compare frozen legacy exports with the readings of their shadow stores."""

import argparse
from collections import Counter, defaultdict
from contextlib import ExitStack
from dataclasses import dataclass, field, replace
from datetime import date
from decimal import Decimal
from enum import Enum, auto
import errno
import hashlib
import json
import math
import os
from pathlib import Path
import re
import struct
import subprocess
import sys
import tempfile

from compare_refs import Fact, Invalid, Mentions, References, paired, parts
from old_id import valid_old_id


def require(condition, message):
    if not condition:
        raise Invalid(message)


def load_json(raw):
    def distinct(pairs):
        obj = dict(pairs)
        require(len(pairs) == len(obj), "duplicate JSON member")
        return obj

    def bad_number(_):
        raise Invalid("invalid JSON number")

    return json.loads(raw, object_pairs_hook=distinct, parse_constant=bad_number)


class State(Enum):
    ABSENT = auto()
    CONFLICT = auto()
    UNKNOWN = auto()


def value(v):
    """Hashable JSON equality, including nested arrays and objects and true != 1."""
    if isinstance(v, dict):
        return ("object", frozenset((k, value(x)) for k, x in v.items()))
    if isinstance(v, list):
        return ("array", tuple(map(value, v)))
    if isinstance(v, bool):
        return ("bool", v)
    if isinstance(v, float):
        require(math.isfinite(v), "nonfinite payload number")
    return v


@dataclass
class Thing:
    key: str | None
    fields: dict = field(default_factory=dict)
    heads: int = 1
    unheld: bool = False
    about: set = field(default_factory=set)
    identity: str | None = None  # Stable root identity where a translation is available.
    old_id: str | None = None
    coverage: str | None = None
    ignore_ref: bool = False  # The legacy fold consumed this payload member.


@dataclass
class Kind:
    keyed: dict = field(default_factory=dict)
    roots: list = field(default_factory=list)


@dataclass
class Cut:
    source: str
    destination: Path
    kinds: dict
    reviewed: set
    unmapped_records: int | None = None
    rows: dict = field(default_factory=dict)
    reading: dict = field(default_factory=lambda: defaultdict(Kind))
    facts: Counter = field(default_factory=Counter)
    fields: dict = field(default_factory=lambda: defaultdict(set))
    history: dict = field(default_factory=lambda: defaultdict(list))


def decimal(s, low, high):
    n = int(s)
    require(str(n) == s and low <= n < high, "invalid export integer")
    return n


def read_cut(facts, map_file, destination, unnamed):
    mapping = load_json(map_file.read_text(encoding="utf-8"))
    require(mapping["format"] == "shadow-map-v1", "unsupported map format")
    require(set(mapping) - {"ref_fields"} == {"format", "source", "store", "vertex_sha256", "kinds"}
            and re.fullmatch("[0-9a-f]{64}", mapping["vertex_sha256"]), "invalid map")
    reviewed = mapping.get("ref_fields", [])
    require(isinstance(reviewed, list) and all(isinstance(k, str) and k and k != "ref"
            and not k.endswith("_ref") for k in reviewed) and len(reviewed) == len(set(reviewed)),
            "invalid map ref_fields")
    cut = Cut(mapping["source"], destination, mapping["kinds"], set(reviewed))
    for kind, fold in cut.kinds.items():
        require(kind, "empty map kind")
        if set(fold) == {"collect"}:
            decimal(fold["collect"], 0, 2**64)
        else:
            require(set(fold) == {"by"} and isinstance(fold["by"], str) and fold["by"],
                    "invalid map fold")
    with facts.open("rb") as stream:
        def decode(line):
            require(line.endswith(b"\n") and not line.endswith(b"\r\n"), "invalid export framing")
            return load_json(line.decode("utf-8"))

        line = stream.readline()
        header = decode(line)
        require(header["format"] == "shadow-facts-v1" and header["source"] == mapping["source"]
                and header["vertex_sha256"] == mapping["vertex_sha256"], "map and export disagree")
        require(set(header) == {"format", "source", "vertex_sha256", "order", "ticks"},
                "invalid export header")
        decimal(header["ticks"], 0, 2**64)
        axes = {"rowid": 1, "arrival": 2}[header["order"]]
        digest = hashlib.sha256(line).digest()
        previous = ()
        for number, line in enumerate(stream, 2):
            row = decode(line)
            if "count" in row:
                require(row == {"count": str(len(cut.rows)), "digest": digest.hex()}
                        and not stream.read(1), "invalid export trailer")
                return cut
            digest = hashlib.sha256(digest + line).digest()
            require(set(row) == {"coordinate", "id", "kind", "ts_bits", "observer", "origin",
                                 "payload", "signature"} and isinstance(row["coordinate"], list)
                    and all(isinstance(row[k], str) for k in
                            ("kind", "observer", "origin", "payload"))
                    and (row["signature"] is None or isinstance(row["signature"], str))
                    and re.fullmatch("[0-9a-f]{16}", row["ts_bits"]),
                    "invalid export row")
            old_id = row["id"]
            require(valid_old_id(old_id) and old_id not in cut.rows,
                    f"shadow-source-invalid at line {number}: invalid or duplicate old id")
            coord = tuple(decimal(s, -2**63, 2**63) for s in row["coordinate"])
            kind = row["kind"]
            require(len(coord) == axes and coord > previous,
                    "invalid export coordinate or old id")
            previous = coord
            payload = key = None
            ts, = struct.unpack(">d", bytes.fromhex(row["ts_bits"]))
            if kind in cut.kinds or unnamed:
                payload = load_json(row["payload"])
                require(isinstance(payload, dict), "expected an object payload")
                require(math.isfinite(ts), "invalid occurrence time")
                by = cut.kinds.get(kind, {}).get("by")
                if by in payload:
                    key = payload[by]
                    require(isinstance(key, str) and key, "invalid key value")
                cut.facts[kind] += 1
                cut.fields[kind].update(payload)
            cut.rows[old_id] = Fact(cut.destination, old_id, kind, key, payload, row["observer"], ts, coord)
    raise Invalid("missing export trailer")


def overlay(item, mentions, row, changes):
    additions, replacements, removed = changes
    item.fields.update((k, value(v)) for k, v in row.payload.items() if k not in removed)
    for k in removed:
        item.fields.pop(k, None)
    item.about = mentions.apply(additions, replacements, row.observer, row.thing)


def project(cut, refs):
    states = defaultdict(Mentions)
    for row in cut.rows.values():
        if row.payload is None:
            continue
        kind = cut.reading[row.kind]
        changes = refs.changes(row, row.payload, cut.reviewed, paired(row.payload))
        if row.key is None:
            item = Thing(row.record or row.old_id, identity=row.record, old_id=row.old_id)
            kind.roots.append(item)
            mentions = Mentions()
        else:
            item = kind.keyed.setdefault(row.key, Thing(row.key))
            mentions = states[row.thing]
            cut.history[row.kind, row.key].append((row, changes))
        overlay(item, mentions, row, changes)

    for kind, items in cut.reading.items():
        fold = cut.kinds.get(kind, {})
        if "by" in fold:
            for root in items.roots:
                root.coverage = "missing_key_roots"
        elif limit := int(fold.get("collect", 0)):
            for root in items.roots[:-limit]:
                root.coverage = "outside_collect_limit"


class Loops:
    def __init__(self, binary, env):
        self.binary = binary
        self.env = env

    def output(self, store, *args, spec=None):
        proc = subprocess.run([self.binary, "-C", store, *args], env=self.env,
                              input=json.dumps(spec).encode() if spec else b"",
                              capture_output=True)
        require(proc.returncode == 0, f"loops {args[0]} failed")
        return proc.stdout

    def run(self, store, *args, spec=None):
        return load_json(self.output(store, *args, spec=spec).decode("utf-8"))

    def envelopes(self, store):
        records = {}
        for line in self.output(store, "export").splitlines():
            row = load_json(line)
            records[row["id"]] = row["env"]
        return records

    def fold(self, stores):
        bindings = []
        sources = []
        for i, store in enumerate(stores):
            alias = f"source-{i}"
            bindings.extend(["--store", f"{alias}={store}"])
            sources.append({"store": alias})
        spec = {"vertex": "compare", "from": sources,
                "fold": {"items": {"latest-by": "of", "follow": "keys"}}}
        return self.run(stores[0], "fold", "-", "--values", *bindings, spec=spec)["items"]["things"]


def fold_thing(key, row):
    fields = {k: value(v) for k, v in row["values"].items()}
    for k, setters in row.get("setters", {}).items():
        fields[k] = State.CONFLICT if len(setters) > 1 else State.UNKNOWN
    about = row["about"]
    require(isinstance(about, list) and all(isinstance(s, str) for s in about), "invalid shadow mentions")
    return Thing(key, fields, len(row["heads"]), bool(row.get("unheld")), set(about))


def projection(cell):
    state = cell["state"]
    if state == "value":
        return value(cell["value"])
    return {"unset": State.ABSENT, "conflict": State.CONFLICT, "unknown": State.UNKNOWN}[state]


def read_shadow(loops, store, cut):
    records = {r["kind"]: r["records"] for r in loops.run(store, "ls")["kinds"]}
    reading = defaultdict(Kind)
    # A values fold also discovers fields present only in the shadow and the
    # payloads of roots, whose record ids cannot be derived from a legacy cut.
    for thing, row in loops.fold([store]).items():
        kind, key = thing.split(":", 1)
        if kind == "r":
            kind = row["heads"][0]["env"]["kind"]
            item = fold_thing(thing, row)
            item.identity = thing
            reading[kind].roots.append(item)
        else:
            reading[kind].keyed[key] = fold_thing(key, row)

    keyed = {k for k, fold in cut.kinds.items()
             if "by" in fold and re.fullmatch("[a-z][a-z0-9-]*", k) and k != "r"}
    keyed.update(k for k, items in reading.items() if items.keyed)
    for kind in sorted(keyed):
        items = reading[kind].keyed
        names = cut.fields[kind].union(*(t.fields for t in items.values()))
        # The ls comma-list cannot express these names. The fold above can.
        names = sorted(n for n in names if n and "," not in n and "\0" not in n)
        args = ["--fields", ",".join(names)] if names else []
        try:
            rows = loops.run(store, "ls", kind + ":", *args)["things"]
        except OSError as error:
            if error.errno != errno.E2BIG or not names:
                raise
            # Some valid field lists exceed the OS exec argument limit.
            # Keep the complete field values from the bound fold in that case.
            names = []
            rows = loops.run(store, "ls", kind + ":")["things"]
        seen = set()
        for row in rows:
            prefix, key = row["thing"].split(":", 1)
            require(prefix == kind and key in items and key not in seen, "inconsistent shadow reads")
            seen.add(key)
            item = items[key]
            require(item.heads == row["heads"], "inconsistent shadow heads")
            for name in names:
                cell = projection(row["fields"][name])
                if cell == State.ABSENT:
                    item.fields.pop(name, None)
                else:
                    item.fields[name] = cell
        require(seen == items.keys(), "inconsistent shadow inventory")
    return records, reading


def root_pairs(rows, inventory, identity_field):
    """Inventory roots all have identities (export old IDs or shadow record IDs)."""
    available = {getattr(t, identity_field): t for t in inventory}
    anonymous = []
    for row in rows:
        identity = getattr(row, identity_field)
        if identity is None:
            anonymous.append(row)
        else:
            yield row, available.pop(identity, None)

    def signature(t, exact, ignore_ref):
        fields = frozenset((k, v) for k, v in t.fields.items() if not (ignore_ref and k == "ref"))
        return fields, frozenset(t.about) if exact else None

    # Preserve multiplicity. Match equal readings first, then equal payloads
    # so a mention-only change stays visible when a legacy row lacks an ID.
    for exact in (True, False):
        for ignore_ref in {t.ignore_ref for t in anonymous}:
            buckets = defaultdict(list)
            for identity, t in available.items():
                if not t.unheld:
                    buckets[signature(t, exact, ignore_ref)].append(identity)
            remaining = []
            for row in anonymous:
                matches = buckets.get(signature(row, exact, ignore_ref)) if row.ignore_ref == ignore_ref else None
                if matches:
                    yield row, available.pop(matches.pop())
                else:
                    remaining.append(row)
            anonymous = remaining
    for row in anonymous:
        yield row, None
    for t in available.values():
        yield None, t


def different_fields(left, right):
    return sorted(k for k in left.keys() | right.keys()
                  if left.get(k, State.ABSENT) != right.get(k, State.ABSENT))


@dataclass
class Examples:
    limit: int
    rows: list = field(default_factory=list)

    def add(self, source, comparison, kind, key, fields):
        if len(self.rows) < self.limit:
            self.rows.append({"source": source, "comparison": comparison, "kind": kind,
                              "key": key, "fields": sorted(fields)})


def thing_counts():
    return dict(old=0, new=0, equal=0, differing=0, only_old=0, only_new=0,
                fields_differing=0, mentions_differing=0, fields_conflicting=0, multiple_heads=0)


def compare_kind(old, new, examples, source, comparison, kind):
    counts = thing_counts()
    if comparison == "old_json":
        counts.update(missing_key_roots=0, outside_collect_limit=0)
    if comparison == "shadow":
        counts.update(retained_ref_fields_export_checked=0, retained_ref_fields_differing=0)
    counts.update(old=len(old.roots) + len(old.keyed), new=len(new.roots) + len(new.keyed))

    def compare(a, b):
        if b is not None:
            counts["multiple_heads"] += b.heads > 1
            counts["fields_conflicting"] += sum(v == State.CONFLICT for v in b.fields.values())
        if a is None or b is None:
            counts["only_new" if a is None else "only_old"] += 1
            item = b if a is None else a
            if comparison == "old_json" and b is None and a.coverage:
                counts[a.coverage] += 1
            examples.add(source, comparison, kind, item.key, item.fields)
        else:
            fields = different_fields(a.fields, b.fields)
            if a.ignore_ref or b.ignore_ref:
                fields = [k for k in fields if k != "ref"]
            if comparison == "shadow" and "ref" in a.fields:
                counts["retained_ref_fields_export_checked"] += 1
                counts["retained_ref_fields_differing"] += "ref" in fields
            counts["mentions_differing"] += a.about != b.about
            if fields or a.about != b.about or b.unheld:
                counts["differing"] += 1
                counts["fields_differing"] += len(fields)
                examples.add(source, comparison, kind, a.key, fields)
            else:
                counts["equal"] += 1

    for key in sorted(old.keyed.keys() | new.keyed.keys()):
        compare(old.keyed.get(key), new.keyed.get(key))
    if comparison == "old_json":
        for b, a in root_pairs(new.roots, old.roots, "old_id"):
            compare(a, b)
    else:
        for a, b in root_pairs(old.roots, new.roots, "identity"):
            compare(a, b)
    return counts


def disagrees(counts):
    return any(counts[k] for k in ("only_old", "only_new", "differing"))


def old_reading_disagrees(row):
    """Whether a kind's reading by the old tool differs for a cause not counted.

    The old reader shows no fact that lacks its key and only the last
    `collect` items. Those export roots are counted as `missing_key_roots`
    and `outside_collect_limit`. The same roots are absent from the old rows
    in both comparisons: `only_old` against the export and `only_new`
    against the shadow. The export and the shadow are compared one for one
    in `things`, so equal counts here are the same roots.
    """
    export, shadow = row["old_json"], row["old_json_shadow"]
    counted = export["missing_key_roots"] + export["outside_collect_limit"]
    return bool(export["only_old"] - counted or export["only_new"] or export["differing"]
                or shadow["only_new"] - counted or shadow["only_old"] or shadow["differing"])


LEGACY_METADATA = {"_ts", "_observer", "_origin", "_id", "_n", "_refs"}


def old_answer(path, cut, refs):
    reading = defaultdict(Kind)
    unnamed = 0
    for row in load_json(path.read_text(encoding="utf-8"))["rows"]:
        kind, key, payload = row["kind"], row["key"], row["payload"]
        if kind not in cut.kinds:
            unnamed += 1
            continue
        require(isinstance(payload, dict) and (key is None or type(key) in (str, int)),
                "invalid old row")
        by = cut.kinds[kind].get("by")
        old_id = row.get("id")
        require(old_id is None or isinstance(old_id, str), "invalid old row id")
        origin = cut.rows.get(old_id)
        if by == "ref" and key is None and origin and origin.kind == kind:
            # The old fold consumed its own key field; its row id still identifies the thing.
            key = origin.key
        keyed = by and (by in payload or key in cut.reading[kind].keyed)
        if origin and (origin.kind != kind or origin.key != (key if keyed else None)):
            origin = None
        # The folded row loses same-fact field presence. Consult only the last
        # supplier for that provenance; take each field VALUE from the old row.
        history = [r for r, _ in cut.history.get((kind, key), ())] if keyed else []
        if not history and origin:
            history = [origin]
        companions = paired(payload)
        coerced, literal = set(), set()
        for fact in history:
            supplied = {k for k in fact.payload if k.endswith("_ref")}
            companions.difference_update(supplied)
            companions.update(paired(fact.payload))
            raw = fact.payload.get("ref")
            if isinstance(raw, str):
                literal.update(parts(raw))
            elif raw:
                # sl stringifies non-text ref. That spelling cannot attest a mention.
                coerced.update(parts(str(raw)))
        context = history[-1] if history else Fact(cut.destination, "", kind, key if keyed else None,
                                                   {}, "", 0, ())
        additions, replacements, removed = refs.changes(context, payload, cut.reviewed, companions)
        legacy_refs = row.get("refs", [])
        require(isinstance(legacy_refs, list) and all(isinstance(s, str) for s in legacy_refs),
                "invalid old references")
        for part in set(parts(legacy_refs, reviewed=True)) - (coerced - literal):
            target = refs.resolve(context, part, True)
            if target is not None and target is not context:
                additions.add(target)
        observer = row.get("observer", "")
        require(isinstance(observer, str), "invalid old observer")
        about = Mentions().apply(additions, replacements, observer, context.thing)
        fields = {k: value(v) for k, v in payload.items() if k not in LEGACY_METADATA | removed
                  and (not k.startswith("_") or k in cut.fields[kind])}
        item = Thing(key, fields, about=about, old_id=old_id, ignore_ref="ref" not in payload)
        if keyed:
            require(isinstance(key, str) and key not in reading[kind].keyed, "invalid old row key")
            reading[kind].keyed[key] = item
        else:
            if origin:
                item.identity = origin.record
            elif old_id is not None:
                # An unrecognized old identity must remain unmatched.
                item.identity = "old:" + old_id
            reading[kind].roots.append(item)
    return reading, unnamed


def without_old_metadata(original):
    def clean(t):
        return replace(t, fields={k: v for k, v in t.fields.items() if k not in LEGACY_METADATA})

    return Kind({k: clean(t) for k, t in original.keyed.items()}, list(map(clean, original.roots)))


def source_report(cut, records, shadow, old_json, examples, source, refs):
    old_rows, excluded = old_answer(old_json, cut, refs) if old_json else ({}, 0)
    kinds = sorted(cut.kinds.keys() | cut.facts.keys() | records.keys() | shadow.keys())
    total = Counter(thing_counts())
    total.update(retained_ref_fields_export_checked=0, retained_ref_fields_differing=0)
    mismatches = 0
    rows = []
    for kind in kinds:
        counts = compare_kind(cut.reading[kind], shadow[kind], examples, source, "shadow", kind)
        total.update(counts)
        row = {"facts": cut.facts[kind], "records": records.get(kind, 0), "things": counts}
        mismatches += row["facts"] != row["records"]
        if old_json and kind in cut.kinds:
            old = without_old_metadata(cut.reading[kind])
            row["old_json"] = compare_kind(old, old_rows[kind], examples, source, "old_json", kind)
            row["old_json_shadow"] = compare_kind(old_rows[kind], without_old_metadata(shadow[kind]),
                                                 examples, source, "old_json_shadow", kind)
        rows.append(row)
    summary = {"things": dict(total), "kinds": rows, "record_count_mismatches": mismatches}
    if cut.unmapped_records is not None:
        summary["unmapped_shadow_records"] = cut.unmapped_records
    if old_json:
        summary["old_json_unnamed_rows"] = excluded
    differences = any(old_reading_disagrees(r) for r in rows if "old_json" in r)
    return summary, bool(mismatches or cut.unmapped_records or disagrees(total) or differences)


def union_report(cuts, stores, loops, examples):
    owners = Counter()
    for cut in cuts:
        owners.update(cut.history.keys())
    shared = [t for t, n in owners.items() if n > 1]
    union = loops.fold(stores) if shared else {}
    differing = multiple = fields_differing = mentions_differing = 0
    for kind, key in sorted(shared):
        arrivals = [(r.time, r.coordinate, i, r, changes) for i, cut in enumerate(cuts)
                    for r, changes in cut.history.get((kind, key), ())]
        old, mentions = Thing(key), Mentions()
        for _, _, _, r, changes in sorted(arrivals, key=lambda entry: entry[:3]):
            overlay(old, mentions, r, changes)
        row = union.get(f"{kind}:{key}")
        actual = fold_thing(key, row) if row is not None else Thing(key)
        multiple += actual.heads > 1
        fields = different_fields(old.fields, actual.fields)
        fields_differing += len(fields)
        mentions_differing += old.about != actual.about
        if row is None or fields or old.about != actual.about or actual.unheld:
            differing += 1
            examples.add(None, "union", kind, key, fields)
    return {"shared": len(shared), "differing": differing, "multiple_heads": multiple,
            "fields_differing": fields_differing, "mentions_differing": mentions_differing}


def group_inputs(group):
    manifest = load_json(group.read_text(encoding="utf-8"))
    require(set(manifest) == {"sources", "state"} and isinstance(manifest["sources"], list)
            and manifest["sources"], "invalid group")
    inputs = {}
    for entry in manifest["sources"]:
        require(set(entry) == {"facts", "map", "destination", "name"}, "invalid group source")
        paths = [entry[k] for k in ("facts", "map", "destination")]
        require(all(isinstance(p, str) and p and not Path(p).is_absolute() for p in paths),
                "invalid group paths")
        name = entry["name"]
        require(isinstance(name, str) and name and name not in inputs, "duplicate or invalid group source")
        inputs[name] = tuple((group.parent / p).resolve() for p in paths)
    return inputs


def occurred_micros(instant):
    # The writer can represent year zero. Moving it one Gregorian cycle forward
    # keeps the month and day valid for datetime.date.
    calendar, time = instant.removesuffix("Z").split("T")
    year, month, day = map(int, calendar.split("-"))
    days = (date(year or 400, month, day) - date(1970, 1, 1)).days
    if year == 0:
        days -= 146097
    hour, minute, seconds = time.split(":")
    return ((days * 24 + int(hour)) * 3600 + int(minute) * 60 + Decimal(seconds)) * 1000000


def bind_ids(group, cuts, loops):
    """Bind only record identities. Derive the expected thing and inclusion from the cut."""
    path = group.with_suffix(".ids.json")
    require(path.is_file(), "missing group id map")
    ids = load_json(path.read_text(encoding="utf-8"))
    require(isinstance(ids, dict) and ids.keys() == {k for cut in cuts for k in cut.rows},
            "id map and cuts disagree")
    locations = {cut.source: cut for cut in cuts}
    envelopes = {cut.source: loops.envelopes(cut.destination) for cut in cuts}
    claimed = defaultdict(set)
    for old_id, copies in ids.items():
        require(isinstance(copies, list), "invalid id map occurrences")
        for entry in copies:
            require(isinstance(entry, dict) and set(entry) == {"source", "destination", "record", "thing"}
                    and all(isinstance(v, str) for v in entry.values()), "invalid id map occurrence")
            name = entry["source"]
            require(name in locations, "unknown id map source")
            cut = locations[name]
            row = cut.rows.get(old_id)
            require(row is not None and row.record is None
                    and os.path.relpath(cut.destination, group.parent) == entry["destination"],
                    "id map and source disagree")
            record = entry["record"]
            env = envelopes[name].get(record)
            require(record not in claimed[name], "duplicate record in id map")
            claimed[name].add(record)
            row.record = record
            require(env is not None and env["kind"] == row.kind and row.thing == entry["thing"]
                    and env.get("of") == (None if row.key is None else row.thing)
                    and occurred_micros(env["occurred"]) == Decimal(f"{row.time:.6f}") * 1000000,
                    "id map and shadow disagree")
    unnamed_modes = set()
    for cut in cuts:
        cut.unmapped_records = len(envelopes[cut.source]) - len(claimed[cut.source])
        previous = {}
        for row in cut.rows.values():
            if row.kind in cut.kinds:
                require(row.record is not None, "id map omits a named occurrence")
            else:
                unnamed_modes.add(row.record is not None)
            if row.key is not None:
                prev = envelopes[cut.source][row.record].get("prev", [])
                require(previous[row.thing] in prev if row.thing in previous else not prev,
                        "id map and revision order disagree")
                previous[row.thing] = row.record
    require(len(unnamed_modes) <= 1, "id map omits some unnamed occurrences")


class Arguments(argparse.ArgumentParser):
    def error(self, message):
        # argparse's default diagnostic can echo private operands.
        self.print_usage(sys.stderr)
        self.exit(2, "invalid comparison arguments (see --help)\n")


def main():
    parser = Arguments(description=__doc__)
    for name in ("facts", "map", "shadow"):
        parser.add_argument(name, type=Path, nargs="?")
    parser.add_argument("--group", type=Path, help="complete import manifest and sibling id map")
    parser.add_argument("--loops", default="loops")
    parser.add_argument("--unnamed", action="store_true")
    parser.add_argument("--old-json", type=Path, help="old reader output for the first source")
    parser.add_argument("--also", nargs=3, type=Path, action="append", default=[],
                        metavar=("FACTS", "MAP", "SHADOW"))
    parser.add_argument("--show", type=int, default=0, metavar="N")
    args = parser.parse_args()
    if args.show < 0:
        parser.error("--show requires a nonnegative limit")
    operands = (args.facts, args.map, args.shadow)
    if any(operands) != all(operands) or (not all(operands) and (not args.group or args.also)):
        parser.error("supply a source triple or a group")
    examples = Examples(args.show)
    try:
        selected = [tuple(p.resolve() for p in triple) for triple in [operands, *args.also]] if all(operands) else []
        group = args.group
        names = group_inputs(group) if group else {}
        if group is None and Path("group.json").is_file():
            candidate = group_inputs(Path("group.json"))
            if all(triple in candidate.values() for triple in selected):
                group, names = Path("group.json"), candidate
        inputs = list(names.values()) if group else selected
        selected = selected or inputs
        require(all(triple in inputs for triple in selected), "selected source is outside the group")
        require(len(set(selected)) == len(selected), "duplicate selected source")
        stores = [path for _, _, path in inputs]
        require(len(set(stores)) == len(stores), "duplicate shadow directory")
        env = os.environ.copy()
        with ExitStack() as stack:
            if "LOOPS_CACHE_DIR" not in env:
                env["LOOPS_CACHE_DIR"] = stack.enter_context(tempfile.TemporaryDirectory())
            loops = Loops(args.loops, env)
            for store in stores:
                require((store / ".loops/segments").is_dir(), "missing shadow store")
                check = loops.run(store, "check")
                require(not check["altered"] and not check["refused"],
                        "shadow check failed")
            cuts = [read_cut(*triple, args.unnamed) for triple in inputs]
            if group:
                require(list(names) == [cut.source for cut in cuts], "group and export disagree")
                bind_ids(group, cuts, loops)
            refs = References(cuts)
            reports = []
            different = False
            selected_cuts = []
            for i, triple in enumerate(selected):
                cut = cuts[inputs.index(triple)]
                selected_cuts.append(cut)
                project(cut, refs)
                records, shadow = read_shadow(loops, triple[2], cut)
                report, differs = source_report(cut, records, shadow, args.old_json if i == 0 else None,
                                               examples, i + 1, refs)
                reports.append(report)
                different |= differs
            result = {"sources": reports}
            if len(selected) > 1:
                result["union"] = union_report(selected_cuts, [t[2] for t in selected], loops, examples)
                different |= bool(result["union"]["differing"])
            if args.show:
                result["examples"] = examples.rows
    except Invalid as error:
        print(error, file=sys.stderr)
        return 1
    except (OSError, ValueError, KeyError, IndexError, TypeError, AttributeError, ArithmeticError,
            struct.error, RuntimeError):
        print("unreadable or malformed comparison input or loops answer", file=sys.stderr)
        return 1
    print(json.dumps(result, separators=(",", ":")))
    return int(different)


if __name__ == "__main__":
    sys.exit(main())
