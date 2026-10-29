// Run every scenario vector against scenario.mjs: each step in every order
// gen checked, then the lens edit.
// Usage: node check-scenario.mjs <vectors dir>

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { canonical } from "./loops.mjs";
import * as S from "./spec.mjs";
import { formOf, step, lensEdit, sectionOf } from "./scenario.mjs";
import { tally, jsonFiles, runAlone } from "./tally.mjs";

export function check(dir) {
  const t = tally();
  for (const file of jsonFiles(join(dir, "scenario"))) {
    const v = JSON.parse(readFileSync(file, "utf8"));
    const n = `${v.layer ?? "scenario"}/${v.vector}`;
    t.files++;
    const spec = S.parseSpec(v.input.spec);
    if (!spec.parsed) { t.failures.push(`${n}: spec refused, ${spec.refused}`); continue; }
    const records = new Map(v.input.records.map((r) => [r.id, r]));
    const winners = [];

    for (const [i, s] of v.input.steps.entries()) {
      const name = `${n} step ${i} (${s.name})`;
      const forms = new Map(s.forms.map((f) => [f.id, formOf(records.get(f.id), f.shown)]));
      // An order names each of the step's forms once, by id.
      for (const [j, order] of s.orders.entries()) {
        if (canonical([...order].sort()) !== canonical([...forms.keys()].sort())) {
          t.failures.push(`${name} order ${j}: not the step's forms`);
          continue;
        }
        let got;
        try { got = step(spec.parsed, v.input.thing, order.map((id) => forms.get(id))); } catch (e) { got = `threw ${e.message}`; }
        t.expect(`${name} order ${j}`, got, v.expect.steps[i]);
      }
      winners.push(v.expect.steps[i].winner);
    }

    if (!v.input.lens) continue;
    const { base, text } = v.input.lens;
    t.expect(`${n} lens`, lensEdit({ base, text }), v.expect.lens);
    // The walk's reading of the lens: the base is the thing's head before the
    // last step, and the last step's head holds the accepted body.
    const [before, after] = winners.slice(-2).map((id) => records.get(id));
    t.expect(`${n} lens base is the head`, base, [sectionOf(v.input.thing, before)]);
    t.expect(`${n} lens edit is the next head`, [sectionOf(v.input.thing, after)], v.expect.lens.applied);
  }
  return t;
}

runAlone(import.meta.url, check);
