import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const model = dirname(fileURLToPath(import.meta.url));
const root = dirname(model);
const mutants = [
  ["typed about", "Gen/Read.lean", 'if typedRef s then pure s else bad p "expected a typed reference"', 'pure s'],
  ["lens validity", "Loops/Lens.lean", 'if Valid d then some d else none', 'some d'],
  ["integer bound", "Loops/Record.lean", 'if -(2^53 - 1) ≤ i ∧ i ≤ 2^53 - 1 then some i else none', 'some i'],
  ["fraction as zero", "Loops/Record.lean", '    | _ => none\n  else none\n\n/-- Withhold', '    | some (.number _) => some 0\n    | _ => none\n  else none\n\n/-- Withhold'],
  ["global heads", "Loops/Fold.lean", 'orderHeads ((perThing xs).flatMap fun ts => ts.2.heads)', '(LatestBy.fold .empty xs).heads'],
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
  let killed = 0;
  for (const [name, file, from, to] of mutants) {
    const path = join(copy, file);
    const original = readFileSync(path, "utf8");
    if (original.split(from).length !== 2) throw new Error(`mutant is not unique: ${name}`);
    try {
      writeFileSync(path, original.replace(from, to));
      success(run(["build", "checks"]), `${name} build`);
      const result = run(["exe", "checks", root]);
      if (result.status === 0) throw new Error(`mutant survives: ${name}`);
      console.log(`killed ${name}: ${(result.stderr + result.stdout).trim()}`);
      killed++;
    } finally {
      writeFileSync(path, original);
    }
  }
  console.log(`${killed} of ${mutants.length} mutants killed`);
} finally {
  rmSync(work, { recursive: true, force: true });
}
