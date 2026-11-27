import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { anchor, joinLaws, sentence } from "../laws/join.mjs";
import { plain } from "../laws/shapes.mjs";
import { frontData } from "./render.mjs";

const root = fileURLToPath(new URL("../../", import.meta.url));
const read = (path) => JSON.parse(readFileSync(join(root, path), "utf8"));
const source = joinLaws(root);
const front = frontData(root);
const questions = front.get("L_QS");
const chips = front.get("LAWS");

test("each source law appears once, under the question it answers", () => {
  const { laws, questions: headings, questionNotes } = read("design/laws/laws.json");
  const byId = new Map(Object.keys(laws).map((key) => [anchor(key), key]));
  const seen = [];
  assert.deepEqual(questions.map((q) => q.k), Object.keys(headings));
  for (const q of questions) {
    assert.equal(q.q, headings[q.k]);
    assert.equal(q.note, questionNotes[q.k] ?? null);
    const tally = {};
    for (const row of q.rows) {
      const key = byId.get(row.id);
      assert.ok(key, row.id);
      seen.push(key);
      const law = laws[key];
      assert.equal(law.question, q.k, key);
      assert.equal(row.s, sentence(law), key);
      assert.equal(row.shape, law.shape, key);
      assert.equal(row.scope, source.scopeOf(key) || null, key);
      assert.deepEqual(row.names, key.split(", "), key);
      tally[law.shape] = (tally[law.shape] ?? 0) + 1;
    }
    assert.deepEqual(q.tally, tally);
  }
  assert.deepEqual(seen.sort(), Object.keys(laws).sort());
});

test("grammar chips quote their law and link to the grammar page's target", () => {
  const { nouns, verbs } = read("design/grammar/words.json");
  const { steps } = read("design/grammar/walk.json");
  const cited = new Set([...nouns, ...verbs, ...steps].flatMap((entry) => entry.laws));
  assert.deepEqual(Object.keys(chips).sort(), [...cited].sort());
  for (const [name, [id, shape, text]] of Object.entries(chips)) {
    const matches = source.rows.filter((r) => r.names.includes(name));
    assert.ok(matches.length, name);
    assert.equal(id, anchor(matches.at(-1).key), name);
    const law = source.data.laws[name] ?? source.data.laws[matches[0].key];
    assert.equal(shape, law.shape, name);
    {
      // Compare exponents in the caret notation that the source figures use.
      const digits = "⁰¹²³⁴⁵⁶⁷⁸⁹";
      const normalized = text.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]+/gu, (s) => "^" + [...s].map((d) => digits.indexOf(d)).join(""));
      assert.equal(normalized, plain(sentence(law)), name);
    }
  }
});

test("each bench case carries its vector's inputs and expected answers", () => {
  const vectors = front.get("L_VEC");
  const cases = {
    count: ["three", "twice"], latest: ["fork", "chain", "late", "emitted", "id", "merge", "repeats", "span"],
    view: ["withheld", "erased", "max"], record: ["sets", "members", "erasure"], lens: ["round", "escape", "edit", "drop"],
  };
  assert.deepEqual(Object.keys(vectors).sort(), Object.keys(cases).sort());
  const seen = new Set();
  for (const [group, names] of Object.entries(cases)) {
    assert.deepEqual(Object.keys(vectors[group]).sort(), names.sort());
    for (const v of Object.values(vectors[group])) {
      assert.match(v.file, /^vectors\/(?:[\w-]+\/)+[\w-]+\.json$/);
      assert.ok(!seen.has(v.file), v.file);
      seen.add(v.file);
      const { laws, input, expect } = read(v.file);
      assert.deepEqual(v.laws, laws, v.file);
      if (group === "record") {
        for (const k of ["envs", "payloads", "salt"]) assert.deepEqual(v[k], input[k], v.file);
        assert.deepEqual(Object.keys(v.expect).sort(), ["commit", "env_canonical", "id", "payload_canonical"]);
        for (const k of Object.keys(v.expect)) assert.deepEqual(v.expect[k], expect[k], v.file);
      } else {
        assert.deepEqual(v.expect, expect, v.file);
        if (group === "lens") assert.deepEqual(v.input, input, v.file);
        else {
          // Put back only the envelope fields the bench omits, then compare every order.
          const orders = v.orders.map((order, i) => order.map((record, j) => {
            const { kind, observer, about } = input.orders[i][j];
            return { kind, observer, about, ...record };
          }));
          assert.deepEqual(orders, input.orders, v.file);
        }
      }
    }
  }
});
