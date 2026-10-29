import test from "node:test";
import assert from "node:assert/strict";
import { base32 } from "./loops.mjs";
import { admit, realm } from "./realm.mjs";
import { runSpec } from "./spec.mjs";
import { step, formOf } from "./scenario.mjs";
import { replacementRule } from "./check-scenario.mjs";

const id = (n) => `r:${base32(Uint8Array.from({ length: 32 }, () => n))}`;
const record = (n, about, prev = []) => ({
  id: id(n), kind: "note", observer: "sl:test", about, prev,
  emitted: `2026-10-01T00:00:0${n}Z`, value: "body", n,
});
const a = record(1, ["thing:a"]);
const b = record(2, ["thing:a"], [a.id]);
const c = record(3, ["thing:b"], [a.id]);
const pool = new Map([a, b, c].map((r) => [r.id, r]));
const spec = { from: [{ store: "." }], fold: { count: { count: true } } };

test("fixture rule distinguishes absent, empty, allowed, and reversed pairs", () => {
  for (const [input, permitted] of [
    [{}, true], [{ mayReplace: [] }, false],
    [{ mayReplace: [[b.id, a.id]] }, true], [{ mayReplace: [[a.id, b.id]] }, false],
  ]) {
    const may = replacementRule(input, pool);
    assert.equal(may(b, a), permitted);
    assert.equal(may(formOf(b, "withheld"), formOf(a, "withheld")), permitted);
    assert.deepEqual(admit([a, b], may).admitted.map((r) => r.id), permitted ? [a.id, b.id] : [a.id]);
    assert.deepEqual(runSpec(spec, [a, b], may).count, { value: permitted ? 2 : 1, unread: 0 });
    assert.deepEqual(realm([b, a], may).admitted.map((r) => r.id), permitted ? [a.id, b.id] : [a.id]);
  }
});

test("fixture rule rejects malformed pairs and unknown pool ids", () => {
  for (const mayReplace of [null, {}, "pairs", [null], [a.id], [[]], [[a.id]],
    [[a.id, b.id, c.id]], [[1, a.id]], [[id(9), a.id]], [[a.id, id(9)]]]) {
    assert.throws(() => replacementRule({ mayReplace }, pool), /input\.mayReplace:/);
  }
});

test("scenario reports refusal codes only when requested, sorted over settled ids", () => {
  const may = replacementRule({ mayReplace: [] }, pool);
  const forms = [c, b, a];
  const plain = step(spec, "thing:a", forms);
  assert.equal(Object.hasOwn(plain, "refused"), false);
  const got = step(spec, "thing:a", forms, may, true);
  assert.deepEqual(got.admitted, [a.id]);
  assert.deepEqual(got.slots.count, { value: 1, unread: 0 });
  assert.deepEqual(got.refused, [
    { id: b.id, code: "prev-not-permitted" },
    { id: c.id, code: "prev-unrelated" },
  ]);
  // Missing predecessors cannot be judged, even under an empty rule.
  assert.deepEqual(step(spec, "thing:a", [b], may, true).refused, []);
});

test("a refused held eraser still erases before admission", () => {
  const eraser = { ...b, erases: [a.id] };
  const may = replacementRule({ mayReplace: [] }, pool);
  for (const target of [a, formOf(a, "withheld"), formOf(a, "erased")]) {
    for (const forms of [[target, eraser], [eraser, target]]) {
      const got = step(spec, "thing:a", forms, may, true);
      assert.deepEqual(got.settled, [{ id: a.id, shown: "erased" }, { id: b.id, shown: "here" }]);
      assert.deepEqual(got.admitted, [a.id]);
      assert.deepEqual(got.refused, [{ id: b.id, code: "prev-not-permitted" }]);
      assert.deepEqual(got.slots.count, { value: 1, unread: 0 });
    }
  }
});
