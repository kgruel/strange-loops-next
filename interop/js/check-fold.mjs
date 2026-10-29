// Run every fold vector against fold.mjs, folding each arrival order in
// input.orders. Usage: node check-fold.mjs <vectors dir>

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import * as F from "./fold.mjs";
import { tally, jsonFiles, runAlone } from "./tally.mjs";

// What each family's vector expects, from one arrival order.
const RUN = {
  "fold/count": (rs) => F.count(rs).value,
  "fold/sum": (rs) => F.sum(rs).value,
  "fold/extrema": (rs) => ({ min: F.min(rs).value, max: F.max(rs).value }),
  "fold/latest-by": (rs) => F.latestBy(rs),
  "fold/latest": (rs) => F.latest(rs),
  "fold/heads": (rs) => ({ max: F.maxOfHeads(rs), "limit-2": F.heads(rs, { limit: 2 }).map((r) => r.id) }),
  "fold/view": (rs) => ({ heads: F.view(rs), max: F.maxOfHeads(rs) }),
  "fold/select": (rs, v) => ({ count: F.count(rs, v.input), sum: F.sum(rs, v.input) }),
};

export function check(dir) {
  const t = tally();
  for (const family of readdirSync(join(dir, "fold")).sort()) {
    for (const file of jsonFiles(join(dir, "fold", family))) {
      const v = JSON.parse(readFileSync(file, "utf8"));
      t.files++;
      const n = `${v.layer}/${v.vector}`;
      if (!RUN[v.layer]) {
        t.failures.push(`${n}: no runner for ${v.layer}`);
        continue;
      }
      if (!v.input.orders.length) t.failures.push(`${n}: no orders`);
      for (const [i, order] of v.input.orders.entries()) {
        let got;
        try { got = RUN[v.layer](order, v); } catch (e) { got = `threw ${e.message}`; }
        t.expect(`${n} order ${i}`, got, v.expect);
      }
    }
  }
  return t;
}

runAlone(import.meta.url, check);
