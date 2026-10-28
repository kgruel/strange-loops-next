// Run every spec vector against spec.mjs: spec/parse (the parsed form, or the
// refusal's code and path) and spec/run (every slot, in every arrival order).
// Usage: node check-spec.mjs <vectors dir>

import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as S from "./spec.mjs";
import { tally, jsonFiles, runAlone } from "./tally.mjs";

// A vector's input.spec as written: readJson keeps member order and repeats,
// which JSON.parse would not.
const specNode = (file) => S.readJson(readFileSync(file, "utf8")).members
  .find(([k]) => k === "input")[1].members.find(([k]) => k === "spec")[1];

export function check(dir) {
  const t = tally();

  for (const file of jsonFiles(join(dir, "spec", "parse"))) {
    const v = JSON.parse(readFileSync(file, "utf8"));
    const n = `${v.layer}/${v.vector}`;
    t.files++;
    // A spec that repeats a key comes as text too: read that one.
    const got = v.input.spec_text !== undefined ? S.parseSpecText(v.input.spec_text) : S.parseNode(specNode(file));
    t.expect(n, got, v.expect);
    // spec.parse: an accepted spec's parsed form parses back to itself.
    if (got.parsed) t.expect(`${n} reparses`, S.parseSpec(got.parsed), { parsed: got.parsed });
  }

  for (const file of jsonFiles(join(dir, "spec", "run"))) {
    const v = JSON.parse(readFileSync(file, "utf8"));
    const n = `${v.layer}/${v.vector}`;
    t.files++;
    const { parsed, refused } = S.parseNode(specNode(file));
    if (!parsed) { t.failures.push(`${n}: spec refused, ${refused}`); continue; }
    if (!v.input.orders.length) t.failures.push(`${n}: no orders`);
    for (const [i, order] of v.input.orders.entries()) {
      let got;
      try { got = S.runSpec(parsed, order); } catch (e) { got = `threw ${e.message}`; }
      t.expect(`${n} order ${i}`, got, v.expect);
    }
  }
  return t;
}

runAlone(import.meta.url, check);
