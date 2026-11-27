import assert from "node:assert/strict";
import { dirname } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { lawTable } from "../protocol.mjs";
import { readGrammar } from "./grammar.mjs";

const root = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const g = readGrammar(root);
const text = (s) => s.replace(/<[^>]+>/g, "");

test("the headings count what the file holds", () => {
  const { NOUNS, VERBS } = g.constants;
  assert.equal(NOUNS.length, 13);
  assert.match(text(g.nounsHeading), /^\s*Thirteen nouns, each with one job\.\s*$/);
  assert.match(text(g.verbsHeading), /^\s*Two verbs write, seven read, three work on text, and one refuses\.\s*$/);
  assert.match(text(g.intro), /thirteen nouns and thirteen verbs/);
  assert.equal(VERBS.length, 13);
});

test("a status is one the key defines, and nothing proved lacks a law", () => {
  const { STATUS, NOUNS, VERBS, LAYERS } = g.constants;
  assert.deepEqual(Object.keys(STATUS), ["proved", "designed", "open"]);
  const laws = new Set(lawTable(root).rows.flatMap((r) => r.names));
  for (const w of [...NOUNS, ...VERBS]) {
    assert.ok(STATUS[w.status], w.word);
    for (const l of w.laws) assert.ok(laws.has(l), `${w.word}: ${l}`);
    if (w.status === "proved") assert.ok(w.laws.length, w.word);
  }
  for (const l of LAYERS) assert.ok(STATUS[l.status], l.name);
});

test("the words that state a law keep its premise", () => {
  const noun = Object.fromEntries(g.constants.NOUNS.map((n) => [n.word, n]));
  const verb = Object.fromEntries(g.constants.VERBS.map((v) => [v.word, v]));
  assert.match(noun.store.principle, /Where the copies of a record agree/);
  assert.match(noun.thing.purpose, /within the records a reader has admitted/);
  assert.match(noun.slot.principle, /^Hand each record over once/);
  assert.match(noun.fold.principle, /whose steps can run in any order/);
  assert.match(noun.lens.principle, /^With section ids that are nonempty and distinct/);
  assert.match(noun.view.principle, /keeps every envelope/);
  assert.match(verb.settle.says, /^Where a record's forms agree/);
});
