import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { base32 } from "./loops.mjs";
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
