// A small, independent writer for layer 0: canonical bytes, commitment, id,
// signature. Node's own SHA-256 and Ed25519; JCS from JSON.stringify, whose
// string escapes and UTF-16 key order are exactly RFC 8785's. No dependencies.

import { createHash, createPrivateKey, createPublicKey, sign, verify } from "node:crypto";

import { base32, base32Decode, canonical, envJson, problem } from "./record.mjs";
export * from "./record.mjs";

const utf8 = (s) => new TextEncoder().encode(s);
const sha256 = (bytes) => createHash("sha256").update(bytes).digest();

export function commitOf(salt, payload) {
  return "h:" + base32(sha256(Buffer.concat([Buffer.from(salt), utf8(canonical(payload))])));
}

export const idPreimage = (env, commit) => canonical({ commit, env: envJson(env) });
export const idOf = (env, commit) => "r:" + base32(sha256(utf8(idPreimage(env, commit))));
export const signingInput = (id) => "loops/record/v1:" + id;

// An Ed25519 private key from its 32-byte seed (PKCS #8 wrapping).
const PKCS8 = Buffer.from("302e020100300506032b657004220420", "hex");
const privateKey = (seed) => createPrivateKey({ key: Buffer.concat([PKCS8, Buffer.from(seed)]), format: "der", type: "pkcs8" });

export function publicKey(seed) {
  return createPublicKey(privateKey(seed)).export({ format: "der", type: "spki" }).subarray(-32);
}

export function signId(seed, id) {
  return { key: "k:" + base32(publicKey(seed)), ed25519: base32(sign(null, utf8(signingInput(id)), privateKey(seed))) };
}

export function verifyId(sig, id) {
  const spki = Buffer.concat([Buffer.from("302a300506032b6570032100", "hex"), Buffer.from(base32Decode(sig.key.slice(2)))]);
  const key = createPublicKey({ key: spki, format: "der", type: "spki" });
  return verify(null, utf8(signingInput(id)), key, Buffer.from(base32Decode(sig.ed25519)));
}

// Every number within ±(2^53 - 1): past that, two numbers share one canonical form.
const inRange = (v) =>
  typeof v === "number" ? Math.abs(v) <= Number.MAX_SAFE_INTEGER
  : v !== null && typeof v === "object" ? Object.values(v).every(inRange)
  : true;

// JSON text to a value, refusing a repeated member name at any depth, which
// JSON.parse would silently resolve to the last one.
export function parse(text) {
  let i = 0;
  const ws = () => { while (" \t\n\r".includes(text[i]) && i < text.length) i++; };
  const token = (re) => { re.lastIndex = i; const m = re.exec(text); if (!m) throw new Error(`bad JSON at ${i}`); i = re.lastIndex; return m[0]; };
  const STR = /"(?:[^"\\\u0000-\u001f]|\\.)*"/y, NUM = /-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/y;
  function value() {
    ws();
    const c = text[i];
    if (c === "{") {
      i++; const o = {}, seen = new Set();
      ws(); if (text[i] === "}") { i++; return o; }
      for (;;) {
        ws(); const k = JSON.parse(token(STR));
        if (seen.has(k)) throw new Error("member-duplicate");
        // Defined, not assigned: assigning "__proto__" would set the prototype.
        seen.add(k); ws(); token(/:/y);
        Object.defineProperty(o, k, { value: value(), enumerable: true, writable: true, configurable: true });
        ws();
        if (text[i] === ",") { i++; continue; }
        token(/\}/y); return o;
      }
    }
    if (c === "[") {
      i++; const a = [];
      ws(); if (text[i] === "]") { i++; return a; }
      for (;;) { a.push(value()); ws(); if (text[i] === ",") { i++; continue; } token(/\]/y); return a; }
    }
    if (c === '"') return JSON.parse(token(STR));
    if (c === "t" || c === "f" || c === "n") return JSON.parse(token(/true|false|null/y));
    return Number(token(NUM));
  }
  const v = value(); ws();
  if (i !== text.length) throw new Error(`bad JSON at ${i}`);
  return v;
}

const saltProblem = (salt) => (salt.length === 16 ? null : "salt-not-16-bytes");

// Write a record from its payload as JSON text, checking in the model's order:
// the envelope, the salt, repeated member names, then numbers.
export function writeText(env, salt, text, seed) {
  const why = problem(env) ?? saltProblem(salt);
  if (why) throw new Error(why);
  return seal(env, salt, parse(text), seed);
}

// Seal a record: the stored line, and the line after erasure. Refuses a bad
// envelope, a salt that isn't 16 bytes, then a payload number outside
// ±(2^53 - 1) as JSON reads it.
export function seal(env, salt, payload, seed) {
  const why = problem(env) ?? saltProblem(salt) ?? (inRange(payload) ? null : "number-out-of-range");
  if (why) throw new Error(why);
  const commit = commitOf(salt, payload);
  const id = idOf(env, commit);
  const sig = signId(seed, id);
  return {
    commit, id, sig,
    line: canonical({ id, env: envJson(env), salt: base32(salt), payload, sig }),
    erasedLine: canonical({ id, env: envJson(env), commit, sig }),
  };
}
