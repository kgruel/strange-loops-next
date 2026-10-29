// The laws, joined: each law's sentence, shape and question (laws.json, ours to write) to
// what the protocol says of it (protocol/laws.md), what proves it (the proof graph
// `lake exe proofs` writes, proofs.json) and what pins it (the vectors). Two pages are built
// on this: the laws page says what is guaranteed, the evidence page why. Every join is
// checked here, so a law, question, theorem, vector or edge either page can't place fails
// the build.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { lawEdges, lawTable, proofs, resolveTheorem, resolveVectors, slug, vectorFiles } from "../protocol.mjs";
import { checkPremises } from "./premises.mjs";

export const REPO = "https://github.com/kgruel/strange-loops-next/blob/main";
export const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// A law's place on either page: the laws page holds its sentence there, the evidence page its card.
export const anchor = (k) => `law-${slug(k)}`;

// `verb` is "stay" for a `stays` that is plural ("the admitted records and each thing's heads"),
// and absent otherwise.
export const verbOf = (l) => l.verb ?? "stays";
export const sentence = (l) => l.shape === "invariance"
  ? `Change <span class="var">${l.change}</span>, and <span class="inv">${l.stays}</span> ${verbOf(l)}.`
  : l.says;

const KEYS = ["shape", "layer", "question", "change", "stays", "verb", "says", "scope", "premises"];

export function joinLaws(root) {
  const read = (...p) => readFileSync(join(root, "design", "laws", ...p), "utf8");
  const data = JSON.parse(read("laws.json"));
  const { rows, notes } = lawTable(root);
  const files = vectorFiles(root);
  const graph = proofs(root);
  const layers = JSON.parse(readFileSync(join(root, "design", "grammar", "words.json"), "utf8")).layers.map((l) => l.name);
  const fail = (msg) => { throw new Error(`laws: ${msg}`); };

  // Every row of laws.md has a sentence here, and nothing here lacks a row.
  const keys = new Set(rows.map((r) => r.key));
  for (const r of rows) if (!data.laws[r.key]) fail(`no entry in laws.json for ${r.key}`);
  for (const k of Object.keys(data.laws)) if (!keys.has(k)) fail(`laws.json has ${k}, which isn't a row of protocol/laws.md`);
  for (const [k, l] of Object.entries(data.laws)) {
    for (const f of Object.keys(l)) if (!KEYS.includes(f)) fail(`${k}: unknown key ${f}`);
    if (!data.shapes[l.shape]) fail(`${k}: unknown shape ${l.shape}`);
    if (!layers.includes(l.layer)) fail(`${k}: ${l.layer} isn't a layer on the grammar page`);
    const inv = l.shape === "invariance";
    if (l.verb !== undefined && (l.verb !== "stay" || !inv)) fail(`${k}: verb is "stay", for an invariance whose \`stays\` is plural`);
    if (inv !== Boolean(l.change && l.stays) || inv === Boolean(l.says)) fail(`${k}: an invariance says what changes and what stays; any other shape says its sentence`);
  }

  // The questions are a closed set the laws page is read by: each law answers exactly one,
  // and each question is answered by at least one law, or it would be a heading over nothing.
  for (const [k, l] of Object.entries(data.laws)) {
    if (!l.question) fail(`${k}: no question; every law answers one of laws.json's questions`);
    if (!data.questions[l.question]) fail(`${k}: ${l.question} isn't one of laws.json's questions`);
  }
  for (const q of Object.keys(data.questionNotes)) if (!data.questions[q]) fail(`questionNotes: ${q} isn't one of laws.json's questions`);
  const asked = new Set(Object.values(data.laws).map((l) => l.question));
  for (const q of Object.keys(data.questions)) if (!asked.has(q)) fail(`question ${q}: no law answers it; take it off the list`);

  // Each theorem laws.md names is one declaration in the proof graph. A name that isn't one
  // is listed in notTheorems with why; one that becomes resolvable must leave the list.
  const resolved = new Map();
  const unresolved = new Set();
  for (const r of rows) {
    const ts = [];
    for (const t of r.theorems) {
      if (t.includes("/")) continue; // a file, as in "(`Laws/Order.lean`)"
      const n = resolveTheorem(t, graph);
      if (n) ts.push(n);
      else if (data.notTheorems[t]) unresolved.add(t);
      else fail(`${r.key}: ${t} is no theorem in proofs.json (run lake exe proofs, or list it in notTheorems)`);
    }
    resolved.set(r.key, ts);
  }
  for (const t of Object.keys(data.notTheorems))
    if (!unresolved.has(t)) fail(`notTheorems: ${t} is no longer named, or now resolves; take it off the list`);

  // The hypotheses each law's theorems take, each said once on the page or by the law.
  const premises = checkPremises({ data, rows, resolved, graph, fail });
  // What a law's scope line shows: the premises it alone needs, then what else bounds it.
  const scopeOf = (k) => {
    const holds = premises.holds(k);
    return [holds.length ? `<span class="holds">Holds when</span> ${holds.join("; ")}.` : "", data.laws[k].scope ?? ""].filter(Boolean).join(" ");
  };

  // The vectors each law cites, and the ones that name the law themselves.
  const cited = new Map(rows.map((r) => [r.key, resolveVectors(r.vectors, files)]));
  const nameOf = new Map(rows.flatMap((r) => r.names.map((n) => [n, r.key])));
  const naming = new Map(rows.map((r) => [r.key, []]));
  const usedTags = new Set();
  for (const [path, v] of files) for (const tag of v.laws ?? []) {
    if (nameOf.has(tag)) naming.get(nameOf.get(tag)).push(path);
    else if (data.vectorTags[tag]) usedTags.add(tag);
    else fail(`vector ${path} names ${tag}, which is no law in protocol/laws.md (or list it in vectorTags)`);
  }
  for (const t of Object.keys(data.vectorTags)) {
    if (nameOf.has(t)) fail(`vectorTags: ${t} is now a law; take it off the list`);
    if (!usedTags.has(t)) fail(`vectorTags: no vector names ${t}; take it off the list`);
  }

  // Who runs each vector.
  // A checker claiming every directory ("*") holds itself to it: check.mjs fails on a
  // vectors/ directory no family reads, and CI runs it.
  for (const impl of data.implementations) if (impl.checker) {
    const text = readFileSync(join(root, impl.checker), "utf8");
    if (impl.dirs === "*" && !text.includes("no checker reads")) fail(`${impl.checker} claims every vector but doesn't refuse an unread directory`);
    if (impl.dirs !== "*") for (const d of impl.dirs) if (!text.includes(`join(dir, "${d}")`)) fail(`${impl.checker} doesn't read vectors/${d}`);
  }
  const runBy = (paths) => data.implementations.filter((i) => paths.some((p) => i.dirs === "*" || i.dirs.includes(p.split("/")[0])));

  // Law to law, from the proofs. The stack only rests downward: a proof of a law uses
  // theorems of its own layer or the ones below it, never above.
  const edges = lawEdges(rows, graph, resolved);
  const depth = (k) => layers.indexOf(data.laws[k].layer);
  const upward = edges.filter(([a, b]) => depth(b) < depth(a));
  if (upward.length) fail(`a proof rests on a law above it: ${upward.map(([a, b]) => `${a} → ${b}`).join(", ")}`);
  const restsOn = new Map(rows.map((r) => [r.key, []])), carries = new Map(rows.map((r) => [r.key, []]));
  const via = new Map(edges.map(([a, b, v]) => [`${a}\u0000${b}`, v.map((t) => t.replace(/^Loops\./, "")).join(" → ")]));
  for (const [a, b] of edges) { restsOn.get(a).push(b); carries.get(b).push(a); }

  // A demo or a premise case names its law as vectors do; both pages place it by the law's row.
  const keyOf = (name, what) => (rows.find((r) => r.names.includes(name)) ?? fail(`${what}: no law ${name}`)).key;
  // Without the premise: the model's answer with a law's premise and without it, written by
  // lake exe boundaries, which checks the first keeps the law and the second differs.
  const bounds = JSON.parse(read("boundaries.json")).cases;
  const tried = new Map(data.demos.map((d) => [keyOf(d.law, "demo"), d.law]));
  const unpremised = new Map(bounds.map((c) => [keyOf(c.law, "boundaries"), c.law]));

  return { data, rows, notes, premises, scopeOf, files, graph, layers, fail, resolved, cited, naming, runBy, edges, restsOn, carries, via, keyOf, bounds, tried, unpremised };
}
