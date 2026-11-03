import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { checkLensOrder } from "./lens-order.mjs";

const model = dirname(fileURLToPath(import.meta.url));
const root = dirname(model);
// Both runners use the same replacement sites. This runner builds only runtime checks.
const catalogue = JSON.parse(readFileSync(join(model, "mutate/mutants.json"), "utf8"));
const guardMutants = ["step1-base32-reencode","step1-fraction-final-zero","step1-seconds-bound","step1-zone-only-z","step1-envelope-keys-remove","step1-envelope-keys-after-value","step1-draft-keys-after-values","step1-record-keys-after-values","ratchets-lens-base-remove","ratchets-lens-base-after-parse"].map(id => {
  const m = catalogue.find(m => m.id === id);
  if (!m) throw new Error(`missing guard mutant: ${id}`);
  return [m.id, m.file.includes("/") ? m.file : `Loops/${m.file}`, m.before, m.after];
});
const mutants = [
  ["typed about", "Gen/Read.lean", 'if typedRef s then pure s else bad p "expected a typed reference"', 'pure s'],
  ["lens validity", "Loops/Lens.lean", 'if Valid d then some d else none', 'some d'],
  ["integer bound", "Loops/Record.lean", 'if -(2^53 - 1) ≤ i ∧ i ≤ 2^53 - 1 then some i else none', 'some i'],
  ["fraction as zero", "Loops/Record.lean", '    | _ => none\n  else none\n\n/-- Withhold', '    | some (.number _) => some 0\n    | _ => none\n  else none\n\n/-- Withhold'],
  ["global heads", "Loops/Fold.lean", 'orderHeads ((perThing xs).flatMap fun ts => ts.2.heads)', '(LatestBy.fold .empty xs).heads'],
  ...guardMutants,
];
const work = mkdtempSync(join(tmpdir(), "loops-model-mutants-"));
const copy = join(work, "model");
function run(args) {
  const r = spawnSync("lake", args, { cwd: copy, encoding: "utf8", timeout: 240000, maxBuffer: 8 * 1024 * 1024 });
  if (r.error || r.signal) throw new Error(`lake ${args.join(" ")}: ${r.error?.message ?? r.signal}`);
  return r;
}
function success(r, label) {
  if (r.status !== 0) throw new Error(`${label} failed (${r.status}):\n${r.stdout}\n${r.stderr}`);
}
try {
  cpSync(model, copy, { recursive: true });
  success(run(["build", "checks"]), "baseline build");
  success(run(["exe", "checks", root]), "baseline checks");
  if (!checkLensOrder(readFileSync(join(copy, "Loops/Lens.lean"), "utf8"))) throw new Error("baseline lens source shape failed");
  let killed = 0;
  for (const [name, file, from, to] of mutants) {
    const path = join(copy, file);
    const original = readFileSync(path, "utf8");
    if (original.split(from).length !== 2) throw new Error(`mutant is not unique: ${name}`);
    try {
      writeFileSync(path, original.replace(from, to));
      success(run(["build", "checks"]), `${name} build`);
      const result = run(["exe", "checks", root]);
      if (result.status === 0 && !(name.startsWith("ratchets-lens-base-") && !checkLensOrder(readFileSync(join(copy, "Loops/Lens.lean"), "utf8")))) throw new Error(`mutant survives: ${name}`);
      console.log(result.status === 0 ? `killed ${name}: lens edit source shape differs` : `killed ${name}: ${(result.stderr + result.stdout).trim()}`);
      killed++;
    } finally {
      writeFileSync(path, original);
    }
  }
  console.log(`${killed} of ${mutants.length} mutants killed`);
} finally {
  rmSync(work, { recursive: true, force: true });
}
