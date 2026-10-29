import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { base32 } from "./loops.mjs";
import { asOf, tick, ticks } from "./proposals.mjs";
import { check } from "./check-proposals.mjs";

const id = (byte) => `r:${base32(Buffer.alloc(32, byte))}`;
const spec = { from: [{ store: "." }], fold: { count: { count: true }, sum: { sum: "n" } } };
const record = (n, emitted, extra = {}) => ({ id: id(n), kind: "note", emitted, n, ...extra });
const query = (emittedThrough = null, occurredThrough = null) => ({ name: "q", emittedThrough, occurredThrough });

test("as-of compares inclusive instants with offsets, fractions, and span starts", () => {
  const forms = [
    record(1, "1970-01-01T00:00:00.00000001Z", { occurred: "1969/.." }),
    record(2, "1970-01-01T01:00:00.00000002+01:00", { occurred: "1970" }),
    record(3, "1969-12-31T19:00:00.00000001-05:00"),
  ];
  const got = asOf(spec, forms, query("1970-01-01T00:00:00.00000001Z", "1970-01-01T00:00:00.00000001Z"));
  assert.deepEqual(got.selected.map((r) => r.id), [id(1), id(3)]);
  assert.equal(got.result.count.value, 2);
  assert.deepEqual(asOf(spec, forms, query(null, "1969-12-31T23:59:59Z")).selected.map((r) => r.id), [id(1)]);
});

test("as-of keeps erasure by an eraser outside the cut", () => {
  const target = record(1, "2018-01-01T00:00:00Z");
  const eraser = record(2, "2021-01-01T00:00:00Z", { erases: [target.id] });
  const got = asOf(spec, [target, eraser, target], query("2019-12-31T23:59:59Z"));
  assert.deepEqual(got.selected, [{ id: target.id, shown: "erased" }]);
  assert.deepEqual(got.result.sum, { value: 0, unread: 1 });
});

test("tick validates canonical fixed-width ids and sorts bytes", () => {
  const low = id(0), trap = id(208), max = id(255);
  assert.ok(trap < low);
  assert.deepEqual(tick([max, trap, low, trap]).cover, [low, trap, max]);
  assert.equal(tick([max]).bytes, Buffer.concat([Buffer.from("loops/tick-cover/v1:"), Buffer.alloc(32, 255)]).toString("hex"));
  for (const bad of ["r:", `h:${low.slice(2)}`, low.toUpperCase(), `${low.slice(0, -1)}b`, `${low}a`]) assert.throws(() => tick([bad]), /invalid record id/);
});

test("tick differences are directional and equal covers have the same hash", () => {
  const a = id(1), b = id(2), c = id(3);
  const delta = ticks([b, a, a], [c, b]);
  assert.deepEqual(delta.added, [c]);
  assert.deepEqual(delta.removed, [a]);
  const same = ticks([a, b], [b, a, b]);
  assert.equal(same.old.hash, same.new.hash);
  assert.deepEqual(same.added, []);
  assert.deepEqual(same.removed, []);
  const held = record(1, "2020-01-01T00:00:00Z");
  const withheld = { id: held.id, kind: held.kind, emitted: held.emitted, shown: "withheld" };
  assert.notDeepEqual(asOf(spec, [held], query()).result, asOf(spec, [withheld], query()).result);
  assert.equal(tick([held.id]).hash, tick([withheld.id]).hash);
  assert.equal(tick([]).hash, `h:${base32(Buffer.from("634cbb29cec89027fbba15871d2c3af66ad0746c96d6d4fc4cfe2b3aa3175bf1", "hex"))}`);
});

test("checker accounts for nested and unknown proposal layers", () => {
  const root = mkdtempSync(join(tmpdir(), "proposal-check-"));
  try {
    const dir = join(root, "proposals", "as-of", "unknown");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "bad.json"), JSON.stringify({ vector: "bad", layer: "proposals/as-of/unknown" }));
    const result = check(root);
    assert.equal(result.files, 1);
    assert.equal(result.failures.length, 1);
    assert.match(result.failures[0], /unknown proposal layer/);
    const validDir = join(root, "proposals", "ticks");
    mkdirSync(validDir, { recursive: true });
    writeFileSync(join(validDir, "empty.json"), JSON.stringify({
      vector: "empty", layer: "proposals/ticks", input: { old: [], new: [] },
      expect: { old: tick([]), new: tick([]), added: [], removed: [] },
    }));
    const both = check(root);
    assert.equal(both.files, 2);
    assert.equal(both.passed, 1);
    assert.equal(both.failures.length, 1);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
