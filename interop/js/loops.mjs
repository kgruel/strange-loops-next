// A small, independent writer for layer 0: canonical bytes, commitment, id,
// signature. Node's own SHA-256 and Ed25519; JCS from JSON.stringify, whose
// string escapes and UTF-16 key order are exactly RFC 8785's. No dependencies.

import { createHash, createPrivateKey, createPublicKey, sign, verify } from "node:crypto";

const B32 = "abcdefghijklmnopqrstuvwxyz234567";

export function base32(bytes) {
  let out = "", bits = 0, value = 0;
  for (const b of bytes) {
    value = (value << 8) | b;
    bits += 8;
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(text) {
  const out = [];
  let bits = 0, value = 0;
  for (const c of text) {
    const v = B32.indexOf(c);
    if (v < 0) throw new Error(`not base32: ${c}`);
    value = (value << 5) | v;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Uint8Array.from(out);
}

// RFC 8785. Numbers use ECMAScript's own formatting, which is the RFC's.
export function canonical(v) {
  if (v === null || typeof v === "boolean" || typeof v === "string") return JSON.stringify(v);
  if (typeof v === "number") {
    if (!Number.isFinite(v)) throw new Error("JCS has no NaN or Infinity");
    return JSON.stringify(v);
  }
  if (Array.isArray(v)) return "[" + v.map(canonical).join(",") + "]";
  return "{" + Object.keys(v).sort().map((k) => JSON.stringify(k) + ":" + canonical(v[k])).join(",") + "}";
}

const utf8 = (s) => new TextEncoder().encode(s);
const sha256 = (bytes) => createHash("sha256").update(bytes).digest();

// Sets: sorted by UTF-16 code units (JavaScript's default sort), repeats removed.
const canonSet = (xs) => [...new Set(xs)].sort();

export function envJson(env) {
  const out = { kind: env.kind, observer: env.observer, emitted: env.emitted };
  if (env.occurred !== undefined) out.occurred = env.occurred;
  for (const k of ["about", "prev"]) {
    if (env[k] && env[k].length) out[k] = canonSet(env[k]);
  }
  if (env.under !== undefined) out.under = env.under;
  return out;
}

const DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const leap = (y) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;

export function validEmitted(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(\.\d+)?(Z|[+-](\d{2}):(\d{2}))$/.exec(s);
  if (!m) return false;
  const [y, mo, d, h, mi, se] = m.slice(1, 7).map(Number);
  if (mo < 1 || mo > 12) return false;
  const days = mo === 2 && leap(y) ? 29 : DAYS[mo - 1];
  if (d < 1 || d > days || h > 23 || mi > 59 || se > 60) return false;
  if (m[8] !== "Z" && (Number(m[9]) > 23 || Number(m[10]) > 59)) return false;
  return true;
}

const typedRef = (s) => /^[a-z][a-z0-9-]*:./su.test(s);
const recordId = (s) => /^r:[a-z2-7]{52}$/.test(s);

export function problem(env) {
  if (!env.kind) return "kind-empty";
  if (!typedRef(env.observer)) return "observer-not-typed";
  if (!validEmitted(env.emitted)) return "emitted-not-rfc3339";
  if (!(env.about ?? []).every(typedRef)) return "about-not-typed";
  if (!(env.prev ?? []).every(recordId)) return "prev-not-record-id";
  if (env.under !== undefined && !recordId(env.under)) return "under-not-record-id";
  return null;
}

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

// Seal a record: the stored line, and the line after erasure. Refuses a bad
// envelope, then a payload number it can't carry exactly (never rounded).
export function seal(env, salt, payload, seed) {
  const why = problem(env) ?? (inRange(payload) ? null : "number-out-of-range");
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
