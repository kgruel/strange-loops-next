import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { runScenario, equal, stringify, parseVector, parseJSON } from "./runtime.mjs";
import { boundaryResult } from "./boundaries.mjs";
import { browserModules, workbenchData } from "./render.mjs";

const root = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const fixture = () => JSON.parse(readFileSync(join(root, "vectors/scenario/01-decision.json"), "utf8"));

test("every preset and every arrival order equals its model baseline", () => {
  const data = workbenchData(root);
  assert.ok(data.presets.length > 0);
  for (const { path, vector } of data.presets) {
    const live = runScenario(vector.input);
    assert.ok(equal(live.expect, vector.expect), path);
    for (const [i, orders] of live.orders.entries()) for (const output of orders) assert.ok(equal(output, vector.expect.steps[i]), path);
  }
});

test("input guards refuse malformed steps, records, rules, specs, and lenses", () => {
  const cases = [
    [(i) => { i.records.push(i.records[0]); }, /repeated record id/],
    [(i) => { i.records[0].id = "r:bad"; }, /canonical 32-byte/],
    [(i) => { i.records[0].about = ["untyped"]; }, /about-not-typed/],
    [(i) => { i.records[0].emitted = "yesterday"; }, /emitted-not-rfc3339/],
    [(i) => { i.records[0].n = Infinity; }, /finite number/],
    [(i) => { i.records[0].fields = []; }, /expected an object/],
    [(i) => { i.records[0].fields = { nested: { n: Infinity } }; }, /finite number/],
    [(i) => { i.records[0].shown = "withheld"; }, /set the form on the step/],
    [(i) => { i.steps = []; }, /at least one step/],
    [(i) => { i.steps[0].orders = []; }, /at least one arrival order/],
    [(i) => { i.steps[0].orders[0].push(i.steps[0].orders[0][0]); }, /each form exactly once/],
    [(i) => { i.steps[0].forms.push(i.steps[0].forms[0]); }, /repeated form id/],
    [(i) => { i.steps[0].forms[0].shown = "lost"; }, /here, withheld, or erased/],
    [(i) => { i.steps[0].forms[0].id = "r:unknown"; }, /names no record/],
    [(i) => { i.mayReplace = [[i.records[0].id, "r:unknown"]]; }, /names none of input.records/],
    [(i) => { i.spec = { no: "spec" }; }, /input.spec/],
    [(i) => { i.lens = { base: [], text: "not lines" }; }, /input.lens/],
  ];
  for (const [edit, error] of cases) {
    const { input } = fixture(); edit(input);
    assert.throws(() => runScenario(input), error);
  }
});

test("running an edit leaves the input and vector baseline intact", () => {
  const v = fixture(), baseline = structuredClone(v.expect);
  v.input.records[0].value = "A changed payload";
  const before = structuredClone(v.input);
  runScenario(v.input);
  assert.deepEqual(v.input, before);
  assert.deepEqual(v.expect, baseline);
});

test("sum JSON keeps a result beyond the safe integer range exact", () => {
  assert.equal(stringify({ n: 18014398509481982n }), '{\n  "n": 18014398509481982\n}');
  assert.equal(equal({ a: 2n, b: [] }, { b: [], a: 2 }), true);
  assert.equal(equal({ a: 9007199254740993n }, { a: 9007199254740992 }), false);
  assert.equal(equal({}, []), false);
  assert.equal(equal({ x: null }, {}), false);
});

test("baseline integers survive import, cloning, storage, and sharing exactly", () => {
  const text = '{"input":{"n":9007199254740993},"expect":{"n":9007199254740993}}';
  const parsed = parseVector(text);
  assert.equal(typeof parsed.input.n, "number");
  assert.equal(parsed.expect.n, 9007199254740993n);
  assert.ok(equal(parseVector(stringify(parsed)), parsed));
  assert.ok(equal(parseJSON(stringify([{ vector: parsed }]))[0].vector.expect, parsed.expect));
  assert.ok(equal(parseVector(decodeURIComponent(encodeURIComponent(stringify(parsed)))), parsed));
  assert.throws(() => parseVector('{"expect":{"n":9.007199254740993e15}}'), /integer JSON token/);
});

test("every generated premise has a scoped example with both states", () => {
  const { cases } = JSON.parse(readFileSync(join(root, "design/laws/boundaries.json"), "utf8"));
  const modelOnly = new Set(["record.member-order"]);
  for (const c of cases) {
    assert.equal(boundaryResult(c.law, false).holds, true, c.law);
    const removed = boundaryResult(c.law, true);
    assert.equal(removed.holds, false, c.law);
    assert.equal(removed.mode, modelOnly.has(c.law) ? "model" : "live", c.law);
  }
  assert.throws(() => boundaryResult("unknown", false), /No premise example/);
});

test("browser bundle includes the actual readers, never the Node writer", () => {
  const { imports } = browserModules(root, "design/workbench/app.mjs");
  assert.ok(imports["@workbench/interop/js/scenario.mjs"]);
  assert.ok(imports["@workbench/interop/js/record.mjs"]);
  assert.ok(!imports["@workbench/interop/js/loops.mjs"]);
  for (const uri of Object.values(imports)) assert.doesNotMatch(Buffer.from(uri.split(",")[1], "base64").toString(), /\bBuffer\s*[.(]/);
});

test("browser bundle refuses external and unsupported imports", () => {
  const dir = mkdtempSync(join(tmpdir(), "workbench-bundle-"));
  try {
    mkdirSync(join(dir, "modules"));
    for (const code of ['import fs from "node:fs";', 'import "./side.mjs";', 'const x = import("./side.mjs");', 'console.log(import.meta.url);']) {
      writeFileSync(join(dir, "modules/main.mjs"), code);
      assert.throws(() => browserModules(dir, "modules/main.mjs"), /workbench bundle:/);
    }
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
