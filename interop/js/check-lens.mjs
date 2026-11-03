// Run every lens vector against lens.mjs.
// Usage: node check-lens.mjs <vectors dir>

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { readVector } from "../answers.mjs";
import * as Lens from "./lens.mjs";
import { tally, jsonFiles, runAlone } from "./tally.mjs";

export function check(dir) {
  const t = tally();
  for (const file of jsonFiles(join(dir, "lens", "section"))) {
    const v = readVector(readFileSync(file, "utf8"));
    const n = `lens/section/${v.vector}`;
    const { base, text } = v.input;
    t.files++;
    const result = Lens.edit(base, text);
    if (v.expect.refused) {
      t.expect(`${n} refused`, result, null);
      continue;
    }
    if (result === null) {
      t.failures.push(`${n} parsed: unexpected null`);
      continue;
    }
    for (const field of ["parsed", "normalized", "outcomes", "applied"]) {
      t.expect(`${n} ${field}`, result[field], v.expect[field]);
    }
  }
  return t;
}

runAlone(import.meta.url, check);
