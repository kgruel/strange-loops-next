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
    try { L.seal(envs[0], new Uint8Array(16), v.input.payloads[0], new Uint8Array(32)); }
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
