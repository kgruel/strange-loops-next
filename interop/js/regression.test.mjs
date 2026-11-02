import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { base32, base32Decode, fixedBytes, canonical, seal, writeText, problem, validEmitted, occurredSpan, signId, verifyId } from "./loops.mjs";
import { resolveBatch } from "./batch.mjs";
import { heads, latest, sum, min, max } from "./fold.mjs";
import { parse } from "./lens.mjs";
import { check as checkLens } from "./check-lens.mjs";
import { runSpec } from "./spec.mjs";
import { step } from "./scenario.mjs";

const id = (n) => `r:${base32(Uint8Array.from({ length: 32 }, () => n))}`;
const record = (n, about, prev = []) => ({
  id: id(n), kind: "note", about, prev, emitted: `2020-01-01T00:00:0${n}Z`, n,
});
const spec = { from: [{ store: "." }], fold: { count: { count: true } } };

test("latest uses the union of per-thing heads", () => {
  const a = record(1, ["task:a", "task:b"]);
  const b = record(2, ["task:a"], [a.id]);
  assert.deepEqual(heads([a, b]).map((r) => r.id), [b.id, a.id]);
  assert.deepEqual(latest([a, b]), { winner: b.id, others: [a.id] });
  assert.deepEqual(latest([]), { winner: null, others: [] });
});

test("spec and scenario admit once against all settled records", () => {
  const a = record(1, ["task:a"]);
  const b = record(2, ["task:b"], [a.id]);
  const c = record(3, ["task:a"], [b.id]);
  const records = [a, b, c];
  assert.deepEqual(runSpec(spec, records).count, { value: 1, unread: 0 });
  const result = step(spec, "task:a", records);
  assert.deepEqual(result.admitted, [a.id]);
  assert.deepEqual(result.heads, [a.id]);
  assert.deepEqual(result.slots.count, { value: 1, unread: 0 });
});

const writerEnv = { kind: "note", observer: "o:test", emitted: "2026-10-21T00:00:00Z" };
const writerSalt = new Uint8Array(16);
const writerSeed = new Uint8Array(32);

test("base32hex exact image, width and byte order", () => {
  const alphabet = "0123456789abcdefghijklmnopqrstuv";
  for (const [n, pad] of [[16, 2], [32, 4], [64, 3]]) {
    for (const byte of [0, 1, 127, 255]) {
      const bytes = new Uint8Array(n).fill(byte);
      const text = base32(bytes);
      assert.deepEqual(base32Decode(text), bytes);
      assert.deepEqual(fixedBytes(text, "", n), bytes);
      for (let i = 1; i < 2 ** pad; i++) {
        const last = alphabet.indexOf(text.at(-1));
        assert.throws(() => base32Decode(text.slice(0, -1) + alphabet[last + i]));
      }
      for (const bad of [text + "0", text.slice(1), text + "=", text.slice(0, -1) + "w"]) assert.throws(() => fixedBytes(bad, "", n));
    }
    assert.throws(() => base32Decode(base32(new Uint8Array(n).fill(255)).toUpperCase()));
  }
  const ordered = Array.from({ length: 256 }, (_, i) => Uint8Array.from({ length: 32 }, (_, j) => j === 0 ? i : 255 - i));
  assert.deepEqual(ordered.map(base32), ordered.map(base32).toSorted());
  for (const field of ["prev", "under", "erases"]) {
    const bad = "r:" + "0".repeat(51) + "1";
    assert.equal(problem({ ...writerEnv, [field]: field === "under" ? bad : [bad] }), `${field}-not-record-id`);
  }
  const signed = signId(writerSeed, id(1));
  assert.equal(verifyId(signed, id(1)), true);
  assert.throws(() => verifyId({ ...signed, key: "x:" + signed.key.slice(2) }, id(1)));
  assert.throws(() => verifyId({ ...signed, ed25519: signed.ed25519.slice(0, -1) + "1" }, id(1)));
});

test("canonical UTC instants and envelope key priority", () => {
  for (const s of ["0000-02-29T00:00:00Z", "2024-02-29T23:59:59.123456789Z", "9999-12-31T23:59:59.5Z"]) assert.equal(validEmitted(s), true);
  for (const s of ["2024-01-01T00:00:00+00:00", "2024-01-01T00:00:60Z", "2024-01-01T00:00:00.0Z", "2024-01-01T00:00:00.50Z", "2024-01-01T00:00:00.1234567891Z", "2023-02-29T00:00:00Z"]) {
    assert.equal(validEmitted(s), false, s);
    assert.equal(problem({ ...writerEnv, emitted: s }), "emitted-not-rfc3339");
    for (const occurred of [s, `${s}/..`, `${s}/2025`, `2020/${s}`]) assert.equal(occurredSpan(occurred), null, occurred);
  }
  const env = { ...writerEnv, kind: "", unexpected: 1 };
  assert.equal(problem(env), "envelope-field-unknown");
  assert.equal(problem(JSON.parse('{"__proto__":0,"kind":""}')), "envelope-field-unknown");
  assert.equal(problem(Object.defineProperty({ ...writerEnv }, "hidden", { value: 1 })), "envelope-field-unknown");
  const draft = { env, salt: base32(writerSalt), payload: {} };
  assert.deepEqual(resolveBatch([draft], []), { refused: "envelope-field-unknown" });
  assert.deepEqual(resolveBatch([{ ...draft, env: { ...env, about: ["@missing"] } }], []), { refused: "envelope-field-unknown" });
});

test("writers accept limits and within-range fractions after binary64 rounding", () => {
  for (const n of [Number.MAX_SAFE_INTEGER, -Number.MAX_SAFE_INTEGER, 9007199254740991.1,
    -9007199254740991.1, 1.5, -1.5, 1424953923781206.25, Number.MIN_VALUE, -0]) {
    const payload = JSON.parse(`{"deep":[{"n":${n}}],"__proto__":${n}}`);
    assert.deepEqual(JSON.parse(seal(writerEnv, writerSalt, payload, writerSeed).line).payload, payload);
    assert.deepEqual(writeText(writerEnv, writerSalt, JSON.stringify(payload), writerSeed),
      seal(writerEnv, writerSalt, payload, writerSeed));
  }
});

test("writers refuse unsafe magnitudes and nonfinite payloads with unchanged priority", () => {
  for (const n of [2 ** 53, -(2 ** 53), 9007199254740991.5, -9007199254740991.5,
    1e30, -1e30, Number.MAX_VALUE, -Number.MAX_VALUE, NaN, Infinity, -Infinity]) {
    assert.throws(() => seal(writerEnv, writerSalt, { deep: [{ n }] }, writerSeed),
      { message: "number-out-of-range" });
    assert.throws(() => seal({ ...writerEnv, kind: "" }, writerSalt, n, writerSeed),
      { message: "kind-empty" });
    assert.throws(() => seal(writerEnv, new Uint8Array(0), n, writerSeed),
      { message: "salt-not-16-bytes" });
  }
  for (const text of ["9007199254740991.5", "-9007199254740991.5", "1e30", "-1e30", "1e400", "-1e400"]) {
    assert.throws(() => writeText(writerEnv, writerSalt, text, writerSeed),
      { message: "number-out-of-range" });
  }
  for (const duplicate of ['{"n":1e30,"n":0}', '{"n":1e400,"n":0}']) {
    assert.throws(() => writeText(writerEnv, writerSalt, duplicate, writerSeed),
      { message: "member-duplicate" });
    assert.throws(() => writeText(writerEnv, new Uint8Array(0), duplicate, writerSeed),
      { message: "salt-not-16-bytes" });
    assert.throws(() => writeText({ ...writerEnv, kind: "" }, new Uint8Array(0), duplicate, writerSeed),
      { message: "kind-empty" });
  }
});

test("native canonicalization still handles all 4000 standards independently of writer range", () => {
  const rows = readFileSync(new URL("../../vectors/standard/es6-numbers.txt", import.meta.url), "utf8").trim().split("\n");
  assert.equal(rows.length, 4000);
  let outside = 0;
  for (const row of rows) {
    const [hex, expected] = row.split(",");
    const n = Buffer.from(hex.padStart(16, "0"), "hex").readDoubleBE();
    assert.equal(canonical(n), expected, hex);
    if (Math.abs(n) > Number.MAX_SAFE_INTEGER) outside++;
  }
  assert.ok(outside > 0, "the standard corpus includes out-of-range magnitudes");
});

test("numeric folds read safe whole values only", () => {
  const records = [1.0, 1.5, 2 ** 53, "2", true].map((n, i) => ({ ...record(i + 1, ["task:a"]), n }));
  for (const fold of [sum, min, max]) assert.deepEqual(fold(records), { value: 1, unread: 4 });
});

test("lens refuses empty and duplicate ids", () => {
  assert.equal(parse(["::: ", ":::"]), null);
  assert.equal(parse(["::: a", ":::", "::: a", ":::"]), null);
});

test("lens checker reports an unexpected null and checks the next vector", () => {
  const root = mkdtempSync(join(tmpdir(), "lens-check-"));
  try {
    const dir = join(root, "lens", "section");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "a.json"), JSON.stringify({ vector: "bad", input: { base: [], text: ["::: ", ":::"] }, expect: { parsed: [] } }));
    writeFileSync(join(dir, "b.json"), JSON.stringify({ vector: "next", input: { base: [], text: ["stray"] }, expect: { refused: true } }));
    const result = checkLens(root);
    assert.equal(result.files, 2);
    assert.equal(result.passed, 1);
    assert.equal(result.failures.length, 1);
    assert.match(result.failures[0], /lens\/section\/bad parsed/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
