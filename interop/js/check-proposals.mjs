// Check all proposal vectors, including files in unknown directories.
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative, dirname } from "node:path";
import { asOf, ticks } from "./proposals.mjs";
import { parseNode, readJson } from "./spec.mjs";
import { tally, runAlone } from "./tally.mjs";

function files(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name)).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? files(path) : entry.name.endsWith(".json") ? [path] : [];
  });
}

export function check(dir) {
  const t = tally(), root = join(dir, "proposals");
  for (const file of files(root)) {
    t.files++;
    const path = relative(root, file), family = dirname(path);
    try {
      const text = readFileSync(file, "utf8"), v = JSON.parse(text);
      const n = `${path} (${v.vector})`;
      if (!["as-of", "ticks"].includes(family) || v.layer !== `proposals/${family}`) {
        t.failures.push(`${n}: unknown proposal layer ${v.layer}`);
        continue;
      }
      if (family === "ticks") {
        t.expect(n, ticks(v.input.old, v.input.new), v.expect);
      } else {
        const input = readJson(text).members.find(([k]) => k === "input")[1];
        const spec = parseNode(input.members.find(([k]) => k === "spec")[1]);
        if (!spec.parsed) throw new Error(`spec refused: ${spec.refused}`);
        if (!v.input.orders.length || !v.input.queries.length) throw new Error("orders and queries must be nonempty");
        if (new Set(v.input.queries.map((q) => q.name)).size !== v.input.queries.length) throw new Error("duplicate query name");
        for (const [i, order] of v.input.orders.entries()) {
          t.expect(`${n} order ${i}`, { queries: v.input.queries.map((q) => asOf(spec.parsed, order, q)) }, v.expect);
        }
      }
    } catch (e) {
      t.failures.push(`${path}: threw ${e.message}`);
    }
  }
  return t;
}

runAlone(import.meta.url, check);
