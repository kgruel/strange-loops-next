// Run every realm vector against realm.mjs, in every rotation of its forms.
// Usage: node check-realm.mjs <vectors dir>

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { realm } from "./realm.mjs";
import { tally, jsonFiles, rotations, runAlone } from "./tally.mjs";

export function check(dir) {
  const t = tally();
  for (const file of jsonFiles(join(dir, "realm"))) {
    const v = JSON.parse(readFileSync(file, "utf8"));
    const n = `${v.layer}/${v.vector}`;
    t.files++;
    for (const [k, forms] of rotations(v.input.forms).entries()) {
      let got;
      try {
        const { settled, refused, things, sum } = realm(forms);
        got = { settled, refused, things, sum };
      } catch (e) { got = `threw ${e.message}`; }
      t.expect(`${n} rotation ${k}`, got, v.expect);
    }
  }
  return t;
}

runAlone(import.meta.url, check);
