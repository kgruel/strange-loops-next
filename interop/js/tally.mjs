// What every checker shares: a tally of checks, and running one alone.
// check.mjs runs them all, so each returns its tally rather than exiting.

import { readdirSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { canonical } from "./loops.mjs";

// A tally: { passed, failures, files }, with checks comparing canonical JSON.
export function tally() {
  const t = { passed: 0, failures: [], files: 0 };
  t.expect = (name, got, want) => {
    if (canonical(got) === canonical(want)) t.passed++;
    else t.failures.push(`${name}: got ${canonical(got)}, want ${canonical(want)}`);
  };
  return t;
}

// The .json files in a directory, sorted.
export const jsonFiles = (dir) => readdirSync(dir).filter((f) => f.endsWith(".json")).sort().map((f) => join(dir, f));

// Every rotation of xs: each one starting at a different element.
export const rotations = (xs) => xs.map((_, k) => [...xs.slice(k), ...xs.slice(0, k)]);

export function report({ passed, failures, files }) {
  console.log(`${files} vector files read`);
  console.log(`${passed} checks passed`);
  if (failures.length) {
    console.log(failures.slice(0, 20).join("\n"));
    console.log(`${failures.length} failed`);
  }
}

// Run check(dir) when the module is the program itself, not an import.
export function runAlone(url, check) {
  if (!process.argv[1] || url !== pathToFileURL(process.argv[1]).href) return;
  const t = check(process.argv[2] ?? "../../vectors");
  report(t);
  if (t.failures.length) process.exit(1);
}
