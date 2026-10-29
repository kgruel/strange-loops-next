// Run every batch vector against batch.mjs, in every order of the drafts and
// with each draft's prev and about sets reversed.
// Usage: node check-batch.mjs <vectors dir>

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { resolveBatch } from "./batch.mjs";
import { tally, jsonFiles, runAlone } from "./tally.mjs";

// Every order of xs, as lists of indices.
const orders = (n) => {
  const go = (rest) => (rest.length ? rest.flatMap((i) => go(rest.filter((j) => j !== i)).map((o) => [i, ...o])) : [[]]);
  return go([...Array(n).keys()]);
};

// A draft with the named sets of its envelope reversed.
const reversed = (d, keys) => ({
  ...d,
  env: Object.fromEntries(Object.entries(d.env).map(([k, v]) => [k, keys.includes(k) ? [...v].reverse() : v])),
});

const variants = { "as given": [], "prev reversed": ["prev"], "about reversed": ["about"], "both reversed": ["prev", "about"] };

export function check(dir) {
  const t = tally();
  for (const file of jsonFiles(join(dir, "batch"))) {
    const v = JSON.parse(readFileSync(file, "utf8"));
    const n = `batch/${v.vector}`;
    t.files++;
    for (const [how, keys] of Object.entries(variants)) {
      for (const order of orders(v.input.drafts.length)) {
        const name = `${n} [${order}] ${how}`;
        let got;
        try { got = resolveBatch(order.map((i) => reversed(v.input.drafts[i], keys)), v.input.held); }
        catch (e) { t.failures.push(`${name}: threw ${e.message}`); continue; }
        if (v.expect.refused) {
          t.expect(name, got.refused ?? null, v.expect.refused);
        } else {
          // Records come back in the order the drafts were given: put them back in the vector's.
          const records = [];
          for (const [at, i] of order.entries()) records[i] = got.records?.[at] ?? null;
          t.expect(name, records, v.expect.records.map(({ id, env_canonical }) => ({ id, env_canonical })));
        }
      }
    }
  }
  return t;
}

runAlone(import.meta.url, check);
