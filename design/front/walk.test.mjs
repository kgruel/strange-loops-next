import assert from "node:assert/strict";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { walkOf } from "../grammar/render.mjs";
import { frontData } from "./render.mjs";
import { readWalk } from "./walk.mjs";

const root = fileURLToPath(new URL("../../", import.meta.url));
const storyPath = "design/front/walk.json";
const read = (path) => JSON.parse(readFileSync(join(root, path), "utf8"));
const story = read(storyPath);
const vectorPath = `vectors/${story.vector}.json`;

function withMutation(t, path, edit) {
  const fixture = mkdtempSync(join(tmpdir(), "front-walk-"));
  t.after(() => rmSync(fixture, { recursive: true, force: true }));
  for (const file of [storyPath, "protocol/laws.md", vectorPath]) {
    mkdirSync(join(fixture, dirname(file)), { recursive: true });
    const dest = join(fixture, file);
    if (file === path) {
      const value = read(file);
      edit(value);
      writeFileSync(dest, JSON.stringify(value));
    } else copyFileSync(join(root, file), dest);
  }
  return () => readWalk(fixture);
}

test("the recipe retells the vector with its own writers and text", () => {
  const old = read("design/grammar/walk.json");
  const scenario = walkOf(root, old);
  const { WALK, WALK_TEXT, STEP_LAWS, SENTENCE } = readWalk(root);
  assert.equal(story.vector, old.vector);
  assert.deepEqual(Object.keys(WALK.records), Object.keys(scenario.records));
  for (const { label, text } of story.records) {
    const { who, body, erases, ...shared } = scenario.records[label];
    assert.deepEqual(WALK.records[label], {
      ...shared, who: story.people[who], text, ...(erases.length && { erases }),
    }, label);
    assert.notEqual(text, body, label);
  }
  for (const [i, step] of WALK.steps.entries()) {
    const expected = scenario.steps[i];
    assert.equal(step.key, old.steps[i].name);
    for (const key of ["shown", "heads", "count", "orders"])
      assert.deepEqual(step[key], expected[key], `${step.key} ${key}`);
    for (const key of ["erased", "withheld"])
      assert.deepEqual(step[key] ?? [], expected[key], `${step.key} ${key}`);
    assert.deepEqual(step.covers, expected.tick?.covers, step.key);
    assert.equal(Boolean(step.lens), Boolean(expected.lens), step.key);
  }
  assert.deepEqual(WALK_TEXT, story.steps.map(({ title, text }) => ({ title, text })));
  assert.deepEqual(STEP_LAWS, story.steps.map(({ laws }) => laws));
  assert.deepEqual(WALK.lens, {
    before: `::: ${WALK.thing}\n${WALK.records.E.text}\n:::`,
    after: `::: ${WALK.thing}\n${WALK.records.F.text}\n:::`,
  });
  assert.equal(SENTENCE.id, "r:E…");
  assert.equal(SENTENCE.payload.text, WALK.records.E.text);
});

test("a step names its unknown law", (t) => {
  const load = withMutation(t, storyPath, (s) => { s.steps[2].laws.push("recipe.unknown"); });
  assert.throws(load, /front walk: step fork cites recipe\.unknown.*protocol\/laws\.md/);
});

test("step record references must exist", (t) => {
  const load = withMutation(t, vectorPath, (v) => { v.expect.steps[2].heads.push("r:unknown-head"); });
  assert.throws(load, /walk: no record r:unknown-head/);
});

test("edge endpoints must exist", (t) => {
  const load = withMutation(t, vectorPath, (v) => { v.input.records[1].prev = ["r:unknown-parent"]; });
  assert.throws(load, /walk: no record r:unknown-parent/);
});

test("the anatomy sentence must name a recipe record", (t) => {
  const load = withMutation(t, storyPath, (s) => { s.sentence.record = "unknown"; });
  assert.throws(load, /the anatomy sentence names unknown record unknown/);
});

test("the walk needs its named vector and cannot override an answer", async (t) => {
  await t.test("missing vector", (t) => {
    const load = withMutation(t, storyPath, (s) => { s.vector = "scenario/missing"; });
    assert.throws(load, /no vector scenario\/missing/);
  });
  await t.test("hand-entered heads", (t) => {
    const load = withMutation(t, storyPath, (s) => { s.steps[2].heads = ["A"]; });
    assert.throws(load, /step fork has heads.*comes from scenario\/01-decision/);
  });
});

test("the vector's lens edit must apply the new head's text", (t) => {
  const load = withMutation(t, vectorPath, (v) => { v.expect.lens.applied[0].body = ["a different edit"]; });
  assert.throws(load, /the lens edit in scenario\/01-decision must render E and accept the body of F/);
});

test("the derived layer names and shape marks equal the prototype values", () => {
  const data = frontData(root);
  const names = ["Record", "Store", "View", "State", "Tick", "Text"];
  assert.deepEqual(data.get("LNAME"), names);
  assert.deepEqual(data.get("LAYERS").map((layer) => layer.name).reverse(), names);
  const marks = { invariance: "=", "round-trip": "↺", refinement: "?", order: "<", exactness: "⇔", limit: "!" };
  assert.deepEqual(data.get("SHAPE"), marks);
  assert.deepEqual(Object.fromEntries(data.get("L_SHAPES").map(({ k, mark }) => [k, mark])), marks);
});
