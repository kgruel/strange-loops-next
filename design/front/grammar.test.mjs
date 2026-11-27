import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { lawTable } from "../protocol.mjs";
import { readGrammar } from "./grammar.mjs";

const root = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const grammarPath = "design/front/grammar.json";
const g = readGrammar(root);
const text = (s) => s.replace(/<[^>]+>/g, "");

function withEdit(t, file, edit) {
  const fixture = mkdtempSync(join(tmpdir(), "front-grammar-"));
  t.after(() => rmSync(fixture, { recursive: true, force: true }));
  mkdirSync(join(fixture, dirname(grammarPath)), { recursive: true });
  for (const path of [grammarPath, "DECISIONS.md", "protocol", "vectors"]) {
    const source = join(root, path), dest = join(fixture, path);
    if (path === file) writeFileSync(dest, edit(readFileSync(source, "utf8")));
    else symlinkSync(source, dest);
  }
  return () => readGrammar(fixture);
}

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

test("the board keeps the authored items in their columns and order", () => {
  assert.deepEqual(g.constants.BOARD, {
    designed: [
      { text: "Naming a vertex by its spec's hash" },
      { text: "When a vertex ticks" },
    ],
    open: [
      { noun: "grant", decisions: ["IS3", "IS4", "IS5", "IS7"] },
      { text: "What an observer names", decisions: ["IS10", "IS11"] },
    ],
    planned: [
      { text: "Emitting accepted edits (the lens)" },
      { text: "Views shaped for an audience (render)" },
      { text: "Tick boundaries, markers and the runner" },
      { text: "Lineages, key bindings and standing, in step 3" },
      { text: "Standing as part of admit, in step 3" },
    ],
  });
});

test("a ruled decision names the board item that still points at it", (t) => {
  const load = withEdit(t, "DECISIONS.md", (source) => source.replace(/^### IS7: [\s\S]*?(?=^### IS8: )/m, ""));
  assert.throws(load, /board item grant names IS7, which is not open.*move the item to another column/);
});

test("a non-open decision names the noun note that still points at it", (t) => {
  const load = withEdit(t, grammarPath, (source) => {
    const grammar = JSON.parse(source);
    grammar.nouns.find(({ word }) => word === "observer").note += ` See <a href='#is999'>IS999</a>.`;
    return JSON.stringify(grammar);
  });
  assert.throws(load, /observer note names IS999, which is not open.*reword the note/);
});

test("a non-open decision also names the refusal note that points at it", (t) => {
  const load = withEdit(t, grammarPath, (source) => {
    const grammar = JSON.parse(source);
    grammar.refusals.find(({ group }) => group === "Envelope").note += ` See <a href="#is999">IS999</a>.`;
    return JSON.stringify(grammar);
  });
  assert.throws(load, /Envelope note names IS999, which is not open.*reword the note/);
});
