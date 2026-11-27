// The grammar view's words: design/front/grammar.json. The nouns, verbs, constructions,
// layers, the matrix of which verb acts on which noun, the refusal codes and the status
// key, in the site's voice. What the view names must be what the protocol names, so the
// checks the grammar page made are made here: every law cited is a law in
// protocol/laws.md, every status is in the key, the refusal codes are exactly those the
// vectors pin apart from the ones marked not pinned yet, and the matrix names real words.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { lawTable, vectorCodes, vectorFiles } from "../protocol.mjs";
import { Word, word } from "./decisions.mjs";

const FAMILIES = ["write", "read", "text", "any"];

export function readGrammar(root) {
  const g = JSON.parse(readFileSync(join(root, "design", "front", "grammar.json"), "utf8"));
  const fail = (why) => { throw new Error(`front grammar: ${why}`); };

  const laws = new Set(lawTable(root).rows.flatMap((r) => r.names));
  for (const w of [...g.nouns, ...g.verbs]) {
    for (const l of w.laws) if (!laws.has(l)) fail(`${w.word} cites ${l}, which is not a law in protocol/laws.md`);
    if (w.status === "proved" && !w.laws.length) fail(`${w.word} is marked proved and cites no law`);
  }
  for (const w of [...g.nouns, ...g.verbs, ...g.layers])
    if (!g.status[w.status]) fail(`unknown status ${w.status} on ${w.word ?? w.name}`);

  const nouns = new Set(g.nouns.map((n) => n.word)), verbs = new Set(g.verbs.map((v) => v.word));
  if (nouns.size !== g.nouns.length || verbs.size !== g.verbs.length) fail("a noun or a verb is entered twice");
  for (const n of g.nouns) if (!g.groups[n.group]) fail(`${n.word} is in group ${n.group}, which does not exist`);
  for (const l of g.layers) if (!nouns.has(l.word)) fail(`layer ${l.name} points at ${l.word}, which is not a noun`);
  for (const v of g.matrix.cols) if (!verbs.has(v)) fail(`matrix column ${v} is not a verb`);
  for (const [noun, cells] of g.matrix.rows) {
    if (!nouns.has(noun)) fail(`matrix row ${noun} is not a noun`);
    for (const v of Object.keys(cells)) if (!g.matrix.cols.includes(v)) fail(`matrix cell ${noun}/${v} has no column`);
  }

  const pinned = new Set(g.refusals.filter((r) => !r.unpinned).flatMap((r) => r.codes));
  const loose = g.refusals.filter((r) => r.unpinned).flatMap((r) => r.codes);
  const inVectors = vectorCodes(vectorFiles(root));
  const missing = [...inVectors].filter((c) => !pinned.has(c)), absent = [...pinned].filter((c) => !inVectors.has(c));
  const nowPinned = loose.filter((c) => inVectors.has(c));
  if (missing.length) fail(`vectors refuse with codes the view lacks: ${missing.join(", ")}`);
  if (absent.length) fail(`codes no vector pins: ${absent.join(", ")}`);
  if (nowPinned.length) fail(`now pinned, move out of "not pinned yet": ${nowPinned.join(", ")}`);

  // The verbs heading counts each family, and names the one verb that belongs to every layer.
  const by = Object.fromEntries(FAMILIES.map((f) => [f, g.verbs.filter((v) => v.family === f)]));
  for (const v of g.verbs) if (!FAMILIES.includes(v.family)) fail(`${v.word} has family ${v.family}`);
  if (by.any.length !== 1 || !by.write.length || !by.read.length || !by.text.length)
    fail("the verbs heading is written for some verbs that write, some that read, some that work on text, and one for any layer");
  const s = (k, one, many) => (k === 1 ? one : many);
  const n = g.nouns.length, v = g.verbs.length;

  return {
    constants: {
      STATUS: g.status, NOUN_GROUPS: g.groups, NOUNS: g.nouns, VERBS: g.verbs, CONSTRUCTIONS: g.constructions,
      LAYERS: g.layers, MATRIX: g.matrix, REFUSALS: g.refusals, PROVENANCE: g.provenance,
    },
    intro: `          <p class="secintro">This page names the parts, ${word(n)} ${s(n, "noun", "nouns")} and ${word(v)} ${s(v, "verb", "verbs")}, after showing them at work on one family recipe.</p>\n`,
    nounsHeading: `        <h2 class="sec">${Word(n)} ${s(n, "noun", "nouns, each")} with one job.</h2>\n`,
    verbsHeading: `        <h2 class="sec">${Word(by.write.length)} ${s(by.write.length, "verb writes", "verbs write")}, ${word(by.read.length)} ${s(by.read.length, "reads", "read")}, ` +
      `${word(by.text.length)} ${s(by.text.length, "works", "work")} on text, and one ${by.any[0].word}s.</h2>\n`,
  };
}
