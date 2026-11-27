// The design build's checks, held to account: each mutant is a plausible wrong edit to what
// the pages are built from, and the build must refuse it. A mutant that survives fails this
// script unless it is listed in SURVIVORS with why; a listed survivor that starts failing
// must leave the list, so the list only shrinks.
//
//   node design/mutants.mjs
//
// Edits to generated files (vectors/, design/laws/proofs.json, boundaries.json) aren't mutants here: CI
// regenerates those from the model and fails on any difference. No dependencies.

import { cpSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));

// Text edits name exactly what they replace; one that no longer applies is a stale mutant.
const swap = (from, to) => (t) => {
  if (!t.includes(from)) throw new Error(`stale mutant: no ${JSON.stringify(from.slice(0, 60))}`);
  return t.replace(from, to);
};
const json = (f) => (t) => { const d = JSON.parse(t); f(d); return JSON.stringify(d, null, 2); };

const MUTANTS = [
  ["a law with no sentence", "design/laws/laws.json", json((d) => { delete d.laws["count.perm"]; })],
  ["a sentence for no law", "design/laws/laws.json", json((d) => { d.laws["no.such"] = { ...d.laws["count.perm"] }; })],
  ["an unknown shape", "design/laws/laws.json", json((d) => { d.laws["count.perm"].shape = "circle"; })],
  ["an unknown layer", "design/laws/laws.json", json((d) => { d.laws["count.perm"].layer = "Attic"; })],
  ["an unknown key on a law", "design/laws/laws.json", json((d) => { d.laws["count.perm"].premise = "x"; })],
  ["an invariance without what stays", "design/laws/laws.json", json((d) => { delete d.laws["count.perm"].stays; })],
  ["a proof resting on a layer above it", "design/laws/laws.json", json((d) => { d.laws["content order"].layer = "Text"; })],
  ["a stale vectorTags entry", "design/laws/laws.json", json((d) => { d.vectorTags["no.such"] = "x"; })],
  ["a bench vector that doesn't name its law", "design/front/laws.mjs", swap('three: "fold/count/02-three"', 'three: "fold/count/03-repeats-counted"')],
  ["a misspelt theorem", "protocol/laws.md", swap("| `count.perm` | `Count.perm` |", "| `count.perm` | `Count.permz` |")],
  ["a theorem that lost its backticks", "protocol/laws.md", swap("| `count.perm` | `Count.perm` |", "| `count.perm` | Count.perm |")],
  ["an ambiguous theorem name", "protocol/laws.md", swap("| `count.perm` | `Count.perm` |", "| `count.perm` | `set_decides` |")],
  ["a vector that doesn't exist", "protocol/laws.md", swap("`fold/count/03`", "`fold/count/09`")],
  ["a malformed vector name", "protocol/laws.md", swap("`fold/count/01`", "`fold/count/01-empy`")],
  ["a missing named vector", "protocol/laws.md", swap("`spec/run/gap14-field-types`", "`spec/run/gap14-missing`")],
  ["a stale notTheorems entry", "protocol/laws.md", swap("`writeProblem_none`, `Written`", "`writeProblem_none`")],
  ["a grammar word citing no law", "design/front/grammar.json", json((g) => { g.nouns[0].laws.push("no.such"); })],
  ["a refusal code the page lost", "design/front/grammar.json", json((g) => { g.refusals[0].codes.pop(); })],
  ["a refusal code no vector pins", "design/front/grammar.json", json((g) => { g.refusals[0].codes.push("no-such-code"); })],
  ["a matrix verb that isn't a verb", "design/front/grammar.json", json((g) => { g.matrix.cols[0] = "dance"; })],
  ["a walk step claiming its own heads", "design/front/walk.json", json((d) => { d.steps[2].heads = ["A"]; })],
  ["a walk step the vector doesn't have", "design/front/walk.json", json((d) => { d.steps[2].name = "fork-twice"; })],
  ["a walk record the vector doesn't have", "design/front/walk.json", json((d) => { d.records.push({ label: "G", col: 5, row: 1 }); })],
  ["demo orders that aren't one set of records", "vectors/fold/latest-by/02-fork.json", json((d) => { d.input.orders[1][0].prev = [d.input.orders[1][1].id]; })],
  ["demo spellings that differ in more than a set", "vectors/record/03-sets-are-sets.json", json((d) => { d.input.envs[1].kind = "other"; })],
  ["demo records in a zone that doesn't sort as time", "vectors/fold/count/02-three.json", json((d) => { for (const o of d.input.orders) for (const r of o) if (r.emitted.endsWith("00:01:40Z")) r.emitted = "2026-10-01T00:01:40+01:00"; })],
  ["a vector naming no law", "vectors/fold/count/02-three.json", json((d) => { d.laws.push("no.such"); })],
  ["a gap in a cited range", "vectors/record/23-emitted-lowercase.json", null],
  ["a bench vector whose law was renamed", "vectors/fold/latest-by/02-fork.json", json((v) => { v.laws = ["latest-by.repeats"]; })],
  ["a law with no edges moved to another layer", "design/laws/laws.json", json((d) => { d.laws["record.commit"].layer = "Text"; })],
  ["a law with no question", "design/laws/laws.json", json((d) => { delete d.laws["count.perm"].question; })],
  ["an unknown question key", "design/laws/laws.json", json((d) => { d.laws["count.perm"].question = "attic"; })],
  ["a question no law answers", "design/laws/laws.json", json((d) => { d.questions["no-such"] = "What if nobody asks?"; })],
  ["a premise case that no card shows", "design/front/laws.mjs", swap("L_BOUND: bounds.map", "L_BOUND: bounds.slice(1).map")],
  ["a note under a question nobody asks", "design/laws/laws.json", json((d) => { d.questionNotes["no-such"] = "x"; })],
  ["a law that drops a premise its theorem takes", "design/laws/laws.json", json((d) => { delete d.laws["view.no-resurrection (things)"].premises; })],
  ["a law that drops a premise its other theorems take too", "design/laws/laws.json", json((d) => { d.laws["lens.put-get"].premises = []; })],
  ["a lens roundtrip without section validity", "design/laws/laws.json", json((d) => { d.laws["lens.round-trip"].premises = []; })],
  ["escaping without a nonempty id", "design/laws/laws.json", json((d) => { d.laws["lens.escaping"].premises = []; })],
  ["one-thing equality without its thing premise", "design/laws/laws.json", json((d) => { d.laws["latest.one-thing"].premises = []; })],
  ["a law that lists a premise none of its theorems takes", "design/laws/laws.json", json((d) => { d.laws["count.perm"].premises = ["EnvOnly"]; })],
  ["a law that lists a premise the page says for every law", "design/laws/laws.json", json((d) => { d.laws["latest-by.set"].premises = ["Addressed"]; })],
  ["a law that lists a premise that is another law's subject", "design/laws/laws.json", json((d) => { d.laws["count.perm"].premises = ["View"]; })],
  ["a law that lists a premise outside the vocabulary", "design/laws/laws.json", json((d) => { d.laws["count.perm"].premises = ["Coprime"]; })],
  ["a hypothesis the vocabulary doesn't know", "design/laws/laws.json", json((d) => { delete d.premises.vocabulary.Forms; d.laws["settle.set"].premises = []; })],
  ["a vocabulary entry no theorem takes", "design/laws/laws.json", json((d) => { d.premises.vocabulary.Coprime = { where: "law", says: "x" }; })],
  ["a subject list naming a law whose theorems don't take it", "design/laws/laws.json", json((d) => { d.premises.vocabulary.View.laws.push("count.perm"); })],
  ["a subject premise dropped from its law's list", "design/laws/laws.json", json((d) => { d.premises.vocabulary.View.laws = d.premises.vocabulary.View.laws.filter((k) => k !== "spec.select"); })],
  ["an exemption its theorem no longer needs", "design/laws/laws.json", json((d) => { d.premises.exempt["Spec.view_state"] = "x"; })],
  ["a list-level step's premise said by no law and not exempt", "design/laws/laws.json", json((d) => { delete d.premises.exempt.wholeThings_distinct; })],
  ["keyed.slots claiming a premise only an exempt step takes", "design/laws/laws.json", json((d) => { d.laws["keyed.slots"].premises = ["SortedNewest"]; })],
  ["digest law restores the obsolete bound premise", "design/laws/laws.json", json((d) => { d.laws["id.digest"].premises = ["BoundedId"]; })],
  ["digest vocabulary restores the obsolete bound", "design/laws/laws.json", json((d) => { d.premises.vocabulary.BoundedId = { where: "law", says: "each id is less than 2<sup>256</sup>" }; })],
  ["spec state without its envelope-only rule", "design/laws/laws.json", json((d) => { delete d.laws["spec.after-supersession"].premises; })],
  ["spec state without its view subject", "design/laws/laws.json", json((d) => { d.premises.vocabulary.View.laws = d.premises.vocabulary.View.laws.filter((k) => k !== "spec.after-supersession"); })],
  ["an exemption for a theorem no law names", "design/laws/laws.json", json((d) => { d.premises.exempt["No.such"] = "x"; })],
  ["a law citing a theorem whose premise it doesn't say", "protocol/laws.md", swap("| `count.perm` | `Count.perm` |", "| `count.perm` | `Count.perm`, `admit_view` |")],
  ["an unknown verb on a law", "design/laws/laws.json", json((d) => { d.laws["count.perm"].verb = "are"; })],
  ["a link to a law's evidence that lands nowhere", "design/front/evidence.mjs", swap("s: slug(key)", 's: "card-" + slug(key)')],
  ["a document link to a missing heading", "ROADMAP.md", (s) => s + "\n[Decision](DECISIONS.md#missing-decision-heading)\n"],
  ["a document link to a missing repository path", "notes/retained-boundaries.md", (s) => s + "\n[Protocol](../protocol/missing-boundary.md)\n"],
  ["an unsupported document block", "CHANGELOG.md", (s) => s + "\n> A quoted ruling.\n"],
  ["a front-page ruling linking to a missing section", "design/front/decisions.mjs",
    swap("[Changelog](CHANGELOG.md)", "[Changelog](CHANGELOG.md#missing-ruling)")],
  ["a board item naming a decision that is not open", "design/front/grammar.json",
    json((g) => { g.board.open[0].decisions.push("IS999"); })],
  ["an unclosed guide marker", "GUIDE.md", (s) => s + "\n<!-- guide:stepper -->\n"],
  ["a stylesheet naming a missing font", "design/front/fonts.css",
    swap("fonts/inter-normal-latin.woff2", "fonts/missing.woff2")],
  ["a front-page tip linking to a missing card", "design/front/data/grammar-presentation.json",
    swap("#is3", "#ev-no-such-law")],
  ["an incoming link to a missing front-page noun", "design/rethink/top.html",
    (s) => s + '<a href="../#n-no-such-noun">Noun</a>\n'],
  ["a nested view using a root-relative prefix", "design/build.mjs",
    swap("frontPage(root, { view, depth: 1 })", 'frontPage(root, { view, depth: view === "guide" ? 0 : 1 })')],
  ["an llms.txt link to a missing repository file", "design/build.mjs",
    swap('["README.md", "Records in', '["missing-readme.md", "Records in')],
];

// What the build can't know, and why.
const SURVIVORS = {
  "a law with no edges moved to another layer":
    "a law's layer is declared, not derived; the proofs constrain it only along their edges, and the page says so",
};

const work = mkdtempSync(join(tmpdir(), "loops-mutants-"));
const copy = join(work, "tree");

const build = () => spawnSync(process.execPath, [join(copy, "design", "build.mjs")], { encoding: "utf8" });

const bad = [];
let refused = 0;
try {
  // Copy build inputs and output privately. Other repository paths can be link
  // targets (including large toolchain directories), but are never mutated.
  mkdirSync(copy);
  const inputs = new Set(["design", "protocol", "vectors", "interop", "notes", "DECISIONS.md", "ROADMAP.md", "CHANGELOG.md", "out"]);
  for (const [, file] of MUTANTS) inputs.add(file.split("/")[0]);
  for (const name of readdirSync(root)) {
    if (name === ".git" || join(root, name) === work) continue;
    if (inputs.has(name)) cpSync(join(root, name), join(copy, name), { recursive: true });
    else symlinkSync(join(root, name), join(copy, name));
  }
  const baseline = build();
  if (baseline.status !== 0) throw new Error(`the unmutated copy doesn't build: ${baseline.stderr}`);
  for (const [name, file, edit] of MUTANTS) {
    const path = join(copy, file);
    const old = readFileSync(path, "utf8");
    try {
      if (edit) writeFileSync(path, edit(old)); else unlinkSync(path);
      const r = build();
      const survived = r.status === 0;
      const listed = name in SURVIVORS;
      if (survived && !listed) bad.push(`survived: ${name}`);
      if (!survived && listed) bad.push(`now refused, take it off SURVIVORS: ${name}`);
      if (!survived && !/Error: /.test(r.stderr)) bad.push(`refused without a stated reason: ${name}`);
      if (!survived) refused++;
      console.log(`${survived ? "survives" : "refused "}  ${name}${survived ? "" : `: ${(r.stderr.match(/Error: (.*)/) ?? [])[1] ?? ""}`}`);
    } finally {
      writeFileSync(path, old);
    }
  }
  for (const s of Object.keys(SURVIVORS)) if (!MUTANTS.some(([n]) => n === s)) bad.push(`SURVIVORS names no mutant: ${s}`);
} finally {
  rmSync(work, { recursive: true, force: true });
}
console.log(`${refused} of ${MUTANTS.length} refused; ${Object.keys(SURVIVORS).length} listed to survive`);
if (bad.length) { console.error(bad.join("\n")); process.exit(1); }
