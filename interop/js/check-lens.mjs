// Run every lens vector against lens.mjs.
// Usage: node check-lens.mjs <vectors dir>

import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as Lens from "./lens.mjs";
import { tally, jsonFiles, runAlone } from "./tally.mjs";

export function check(dir) {
  const t = tally();
  for (const file of jsonFiles(join(dir, "lens", "section"))) {
    const v = JSON.parse(readFileSync(file, "utf8"));
    const n = `lens/section/${v.vector}`;
    const { base, text } = v.input;
    t.files++;
    const parsed = Lens.parse(text);
    if (v.expect.refused) {
      t.expect(`${n} refused`, parsed, null);
      continue;
    }
    t.expect(`${n} parsed`, parsed, v.expect.parsed);
    t.expect(`${n} normalized`, Lens.render(parsed), v.expect.normalized);
    const outcomes = Lens.diff(base, parsed);
    t.expect(`${n} outcomes`, outcomes, v.expect.outcomes);
    t.expect(`${n} applied`, Lens.apply(base, outcomes), v.expect.applied);
    // The laws the vectors illustrate, held over the vector's own documents.
    t.expect(`${n} round trip`, Lens.parse(Lens.render(parsed)), parsed);
    t.expect(`${n} base round trip`, Lens.parse(Lens.render(base)), base);
    t.expect(`${n} no-op`, Lens.diff(base, base), []);
  }
  return t;
}

runAlone(import.meta.url, check);
