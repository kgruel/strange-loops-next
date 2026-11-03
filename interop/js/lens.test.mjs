import test from "node:test";
import assert from "node:assert/strict";
import * as Lens from "./lens.mjs";

const section = (id, ...body) => ({ id, body });

test("invalid bases refuse before consuming text", () => {
  const unreadable = { [Symbol.iterator]() { throw new Error("text consumed"); } };
  for (const base of [[section("")], [section("x"), section("x")]]) {
    for (const text of [Lens.render([section("x")]), ["invalid"], unreadable]) {
      assert.equal(Lens.edit(base, text), null);
    }
  }
});

test("edit returns parsed sections and effects", () => {
  const base = [section("x", "old"), section("y", "keep")];
  const edited = [section("x", "new"), section("y", "keep")];
  const text = Lens.render(edited);
  assert.deepEqual(Lens.edit(base, text), {
    parsed: edited, normalized: text,
    outcomes: [{ accepted: "x", body: ["new"] }], applied: edited,
  });
  const noOp = Lens.edit(base, Lens.render(base));
  assert.deepEqual(noOp.outcomes, []);
  assert.deepEqual(noOp.applied, base);
});

test("raw diff keeps last matching base section", () => {
  const base = [section("x", "first"), section("x", "second")];
  assert.deepEqual(Lens.diff(base, [section("x", "second")]), []);
});
