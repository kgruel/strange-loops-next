// Run every layer 0 vector, model-written and standard, against loops.mjs.
// Usage: node check.mjs <vectors dir>

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";
import * as L from "./loops.mjs";

const dir = process.argv[2] ?? "../../vectors";
let passed = 0;
const failures = [];
const expect = (name, got, want) => {
  if (got === want) passed++;
  else failures.push(`${name}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
};

// Model-written record vectors.
for (const f of readdirSync(join(dir, "record")).sort()) {
  const v = JSON.parse(readFileSync(join(dir, "record", f), "utf8"));
  const n = `record/${v.vector}`;
  const envs = v.input.envs;
  if (v.expect.refused) {
    let got = null;
    try { L.writeText(envs[0], L.base32Decode(v.input.salt), v.input.payload_text, new Uint8Array(32)); }
    catch (e) { got = e.message; }
    expect(`${n} refused`, got, v.expect.refused);
    continue;
  }
  const salt = L.base32Decode(v.input.salt);
  const seed = L.base32Decode(v.input.seed);
  const r = L.seal(envs[0], salt, v.input.payloads[0], seed);
  expect(`${n} env`, L.canonical(L.envJson(envs[0])), v.expect.env_canonical);
  expect(`${n} payload`, L.canonical(v.input.payloads[0]), v.expect.payload_canonical);
  expect(`${n} commit`, r.commit, v.expect.commit);
  expect(`${n} id preimage`, L.idPreimage(envs[0], r.commit), v.expect.id_preimage);
  expect(`${n} id`, r.id, v.expect.id);
  expect(`${n} key`, r.sig.key, v.expect.key);
  expect(`${n} signature`, r.sig.ed25519, v.expect.ed25519);
  expect(`${n} verifies`, L.verifyId(r.sig, r.id), true);
  expect(`${n} line`, r.line, v.expect.line);
  expect(`${n} erased line`, r.erasedLine, v.expect.erased_line);
  for (const [i, e] of envs.entries()) expect(`${n} env variant ${i}`, L.idOf(e, r.commit), v.expect.id);
  for (const [i, p] of v.input.payloads.entries()) expect(`${n} payload variant ${i}`, L.commitOf(salt, p), v.expect.commit);
  // The same record, its payload read from text by the strict parser.
  expect(`${n} from text`, L.writeText(envs[0], salt, JSON.stringify(v.input.payloads[0]), seed).id, v.expect.id);
}

// Model-written occurred vectors: each text's span in UTC, and the order.
const pad = (n, w = 2) => String(n).padStart(w, "0");
const utc = ([secs, frac]) => {
  const t = new Date(secs * 1000);
  return `${pad(t.getUTCFullYear(), 4)}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}T` +
    `${pad(t.getUTCHours())}:${pad(t.getUTCMinutes())}:${pad(t.getUTCSeconds())}${frac ? "." + frac : ""}Z`;
};
for (const f of readdirSync(join(dir, "occurred")).sort()) {
  const v = JSON.parse(readFileSync(join(dir, "occurred", f), "utf8"));
  const n = `occurred/${v.vector}`;
  const texts = v.input.occurred;
  if (v.expect["oldest-first"]) {
    const sorted = [...texts].sort((a, b) => {
      const [x, y] = [L.occurredSpan(a), L.occurredSpan(b)];
      return L.spanBefore(x, y) ? -1 : L.spanBefore(y, x) ? 1 : 0;
    });
    expect(`${n} order`, JSON.stringify(sorted), JSON.stringify(v.expect["oldest-first"]));
    continue;
  }
  for (const [i, t] of texts.entries()) {
    const sp = L.occurredSpan(t);
    const got = sp ? { start: utc(sp.start), end: sp.end && utc(sp.end) } : { refused: "occurred-not-span" };
    expect(`${n} ${JSON.stringify(t)}`, JSON.stringify(got), JSON.stringify(v.expect.spans[i]));
  }
}

// RFC 8785: the reference test data, and ECMAScript number formatting.
const jcs = join(dir, "standard", "jcs");
for (const f of readdirSync(join(jcs, "input")).sort()) {
  const got = L.canonical(JSON.parse(readFileSync(join(jcs, "input", f), "utf8")));
  expect(`jcs/${f}`, got, readFileSync(join(jcs, "output", f), "utf8"));
}
for (const line of readFileSync(join(dir, "standard", "es6-numbers.txt"), "utf8").trim().split("\n")) {
  const [hex, want] = line.split(",");
  const b = Buffer.alloc(8);
  b.writeBigUInt64BE(BigInt("0x" + hex));
  expect(`es6 ${hex}`, L.canonical(b.readDoubleBE(0)), want);
}

// Ed25519: the SUPERCOP test set Go ships (sk||pk : pk : msg : sig||msg).
const ed = gunzipSync(readFileSync(join(dir, "standard", "ed25519.input.gz"))).toString().trim().split("\n");
for (const [i, line] of ed.entries()) {
  const [sk, pk, msg, sm] = line.split(":");
  const seed = Buffer.from(sk.slice(0, 64), "hex");
  expect(`ed25519 ${i} key`, L.base32(L.publicKey(seed)), L.base32(Buffer.from(pk, "hex")));
}

console.log(`${passed} checks passed`);
if (failures.length) {
  console.log(failures.slice(0, 20).join("\n"));
  console.log(`${failures.length} failed`);
  process.exit(1);
}
