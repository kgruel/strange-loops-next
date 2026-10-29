// Run every vector against the JS implementation, which CI does: layer 0
// (record, occurred, and the standards' own test data) against loops.mjs, and
// each reader family through its checker (check-fold, check-lens,
// check-batch, check-spec, check-realm, check-scenario), each also runnable
// alone. Every directory of model-written vectors must have a family here,
// and each family must read every .json file in it, so a new family or a
// skipped file fails rather than passing unchecked. The last line is the total.
// Usage: node check.mjs <vectors dir>

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";
import * as L from "./loops.mjs";
import { tally, jsonFiles } from "./tally.mjs";
import * as fold from "./check-fold.mjs";
import * as lens from "./check-lens.mjs";
import * as batch from "./check-batch.mjs";
import * as spec from "./check-spec.mjs";
import * as realm from "./check-realm.mjs";
import * as scenario from "./check-scenario.mjs";

// Layer 0 compares strings exactly, as it always has, rather than canonical JSON.
function exact() {
  const t = tally();
  t.expect = (name, got, want) => {
    if (got === want) t.passed++;
    else t.failures.push(`${name}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
  };
  return t;
}

// Model-written record vectors.
function checkRecord(dir) {
  const t = exact();
  for (const file of jsonFiles(join(dir, "record"))) {
    const v = JSON.parse(readFileSync(file, "utf8"));
    t.files++;
    const n = `record/${v.vector}`;
    const envs = v.input.envs;
    if (v.expect.refused) {
      let got = null;
      try { L.writeText(envs[0], L.base32Decode(v.input.salt), v.input.payload_text, new Uint8Array(32)); }
      catch (e) { got = e.message; }
      t.expect(`${n} refused`, got, v.expect.refused);
      continue;
    }
    const salt = L.base32Decode(v.input.salt);
    const seed = L.base32Decode(v.input.seed);
    const r = L.seal(envs[0], salt, v.input.payloads[0], seed);
    t.expect(`${n} env`, L.canonical(L.envJson(envs[0])), v.expect.env_canonical);
    t.expect(`${n} payload`, L.canonical(v.input.payloads[0]), v.expect.payload_canonical);
    t.expect(`${n} commit`, r.commit, v.expect.commit);
    t.expect(`${n} id preimage`, L.idPreimage(envs[0], r.commit), v.expect.id_preimage);
    t.expect(`${n} id`, r.id, v.expect.id);
    t.expect(`${n} key`, r.sig.key, v.expect.key);
    t.expect(`${n} signature`, r.sig.ed25519, v.expect.ed25519);
    t.expect(`${n} verifies`, L.verifyId(r.sig, r.id), true);
    t.expect(`${n} line`, r.line, v.expect.line);
    t.expect(`${n} erased line`, r.erasedLine, v.expect.erased_line);
    for (const [i, e] of envs.entries()) t.expect(`${n} env variant ${i}`, L.idOf(e, r.commit), v.expect.id);
    for (const [i, p] of v.input.payloads.entries()) t.expect(`${n} payload variant ${i}`, L.commitOf(salt, p), v.expect.commit);
    // The same record, its payload read from text by the strict parser.
    t.expect(`${n} from text`, L.writeText(envs[0], salt, JSON.stringify(v.input.payloads[0]), seed).id, v.expect.id);
  }
  return t;
}

// Model-written occurred vectors: each text's span in UTC, and the order.
const pad = (n, w = 2) => String(n).padStart(w, "0");
const utc = ([secs, frac]) => {
  const d = new Date(secs * 1000);
  const y = d.getUTCFullYear();
  return `${y < 0 ? "-" + pad(-y, 4) : pad(y, 4)}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T` +
    `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}${frac ? "." + frac : ""}Z`;
};
function checkOccurred(dir) {
  const t = exact();
  for (const file of jsonFiles(join(dir, "occurred"))) {
    const v = JSON.parse(readFileSync(file, "utf8"));
    t.files++;
    const n = `occurred/${v.vector}`;
    const texts = v.input.occurred;
    if (v.expect["oldest-first"]) {
      const sorted = [...texts].sort((a, b) => {
        const [x, y] = [L.occurredSpan(a), L.occurredSpan(b)];
        return L.spanBefore(x, y) ? -1 : L.spanBefore(y, x) ? 1 : 0;
      });
      t.expect(`${n} order`, JSON.stringify(sorted), JSON.stringify(v.expect["oldest-first"]));
      continue;
    }
    for (const [i, s] of texts.entries()) {
      const sp = L.occurredSpan(s);
      const got = sp ? { start: utc(sp.start), end: sp.end && utc(sp.end) } : { refused: "occurred-not-span" };
      t.expect(`${n} ${JSON.stringify(s)}`, JSON.stringify(got), JSON.stringify(v.expect.spans[i]));
    }
  }
  return t;
}

// The standards' own test data: RFC 8785 and ECMAScript number formatting,
// and the SUPERCOP Ed25519 set Go ships (sk||pk : pk : msg : sig||msg).
function checkStandard(dir) {
  const t = exact();
  const jcs = join(dir, "standard", "jcs");
  for (const f of readdirSync(join(jcs, "input")).sort()) {
    t.files++;
    const got = L.canonical(JSON.parse(readFileSync(join(jcs, "input", f), "utf8")));
    t.expect(`jcs/${f}`, got, readFileSync(join(jcs, "output", f), "utf8"));
  }
  t.files++;
  for (const line of readFileSync(join(dir, "standard", "es6-numbers.txt"), "utf8").trim().split("\n")) {
    const [hex, want] = line.split(",");
    const b = Buffer.alloc(8);
    b.writeBigUInt64BE(BigInt("0x" + hex));
    t.expect(`es6 ${hex}`, L.canonical(b.readDoubleBE(0)), want);
  }
  t.files++;
  const ed = gunzipSync(readFileSync(join(dir, "standard", "ed25519.input.gz"))).toString().trim().split("\n");
  for (const [i, line] of ed.entries()) {
    const [sk, pk] = line.split(":");
    const seed = Buffer.from(sk.slice(0, 64), "hex");
    t.expect(`ed25519 ${i} key`, L.base32(L.publicKey(seed)), L.base32(Buffer.from(pk, "hex")));
  }
  return t;
}

// Each family: the vectors/ directory it reads, and its checker.
const FAMILIES = [
  ["record", checkRecord], ["occurred", checkOccurred],
  ["fold", fold.check], ["lens", lens.check], ["batch", batch.check],
  ["spec", spec.check], ["realm", realm.check], ["scenario", scenario.check],
];
// Not written by the model: its files aren't all vectors, so it isn't counted.
const STANDARD = "standard";

// The .json files under a directory, at any depth.
const countJson = (d) => readdirSync(d).reduce((n, f) => {
  const p = join(d, f);
  return n + (statSync(p).isDirectory() ? countJson(p) : f.endsWith(".json") ? 1 : 0);
}, 0);

const dir = process.argv[2] ?? "../../vectors";
let passed = 0;
const failures = [];
const row = (name, files, onDisk, t) =>
  console.log(`${name.padEnd(9)} ${String(files).padStart(4)} files read ${String(onDisk).padStart(4)} on disk ${String(t.passed).padStart(6)} passed ${String(t.failures.length).padStart(4)} failed`);

for (const [name, check] of [...FAMILIES, [STANDARD, checkStandard]]) {
  let t;
  try { t = check(dir); } catch (e) { t = { passed: 0, failures: [`${name}: threw ${e.stack}`], files: 0 }; }
  const onDisk = name === STANDARD ? "-" : countJson(join(dir, name));
  if (name !== STANDARD && t.files !== onDisk) t.failures.push(`${name}: read ${t.files} vector files of ${onDisk}`);
  row(name, t.files, onDisk, t);
  passed += t.passed;
  failures.push(...t.failures);
}

// Every directory of vectors has a family.
const known = new Set([...FAMILIES.map(([name]) => name), STANDARD]);
for (const d of readdirSync(dir).sort()) {
  if (statSync(join(dir, d)).isDirectory() && !known.has(d)) failures.push(`${d}: no checker reads vectors/${d}`);
}

if (failures.length) {
  console.log(failures.slice(0, 20).join("\n"));
  console.log(`${failures.length} failed, ${passed} checks passed`);
  process.exit(1);
}
console.log(`${passed} checks passed`);
