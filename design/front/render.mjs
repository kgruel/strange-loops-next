// The front page: the prototype's markup, styles and script, with its content put back in.
// The page began as a prototype in one document. extract.mjs took it apart once; the
// repository is its source now. The files under data/ hold constants from the prototype,
// including the grammar presentation constants grouped in one file. Those in GENERATED
// are worked out here from the repository's own sources.

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { isDeepStrictEqual } from "node:util";
import { rewriteLink } from "../decisions/links.mjs";
import { fill } from "../page.mjs";
import { LE } from "./bench.mjs";
import { decisionsView, frontRewrite, readAround, readDecisions } from "./decisions.mjs";
import { readEvidence } from "./evidence.mjs";
import { readGrammar } from "./grammar.mjs";
import { guideConstants, readGuide } from "./guide.mjs";
import { readLaws } from "./laws.mjs";
import { readWalk } from "./walk.mjs";

// The working documents the decisions pages render, as design/decisions/render.mjs names them.
function documents(root) {
  const docs = new Map([["DECISIONS.md", "index.html"], ["ROADMAP.md", "roadmap.html"], ["CHANGELOG.md", "changelog.html"], ["GUIDE.md", "guide.html"]]);
  for (const e of readdirSync(join(root, "notes"), { withFileTypes: true }))
    if (e.isFile() && e.name.endsWith(".md")) docs.set("notes/" + e.name, "note-" + e.name.slice(0, -3) + ".html");
  return docs;
}

// What the decisions and grammar views show, read once.
function decisions(root) {
  const rewrite = frontRewrite(root, documents(root), rewriteLink);
  const open = readDecisions(root, rewrite);
  const grammar = readGrammar(root, open.entries);
  return { open, around: readAround(root, rewrite), grammar };
}

// The map of which question depends on which is drawn by hand: a short name and a place
// for each open entry, and the edges between them. Every open entry must be on it, and
// what names an entry that is no longer open is left off.
function onMap(root, name, model) {
  const value = JSON.parse(readFileSync(join(root, "design", "front", "map", name + ".json"), "utf8"));
  const ids = new Set(model.open.entries.map((e) => e.id));
  if (name === "DEC_EDGES") return value.filter(([a, b]) => ids.has(a) && ids.has(b));
  for (const id of ids) if (!(id in value)) throw new Error(`front: map/${name}.json has no place for ${id}`);
  return Object.fromEntries(Object.entries(value).filter(([id]) => ids.has(id)));
}

// name -> (root, model) => value.
export const GENERATED = new Map([
  ...guideConstants.map((name) => [name, (root, m) => m.guide.data[name]]),
  ["DEC", (root, m) => m.open.entries],
  ["DEC_AT", (root, m) => m.open.at],
  ["RULED", (root, m) => m.around.ruled],
  ["POS", (root, m) => onMap(root, "POS", m)],
  ["ISSHORT", (root, m) => onMap(root, "ISSHORT", m)],
  ["DEC_EDGES", (root, m) => onMap(root, "DEC_EDGES", m)],
  ...["LAWS", "L_SHAPES", "L_QS", "L_UNLESS", "L_NOPROMISE", "L_SIMPL", "L_BOUND", "L_VEC"]
    .map((name) => [name, (root, m) => m.laws[name]]),
  ...["E_REPO", "E_LAYERS", "E_SHAPES", "E_IMPL", "E_NOT", "E_COUNTS", "E_T", "E_LAWS", "E_MAP"]
    .map((name) => [name, (root, m) => m.evidence[name]]),
  ...["STATUS", "NOUN_GROUPS", "NOUNS", "VERBS", "CONSTRUCTIONS", "LAYERS", "MATRIX", "REFUSALS", "PROVENANCE", "BOARD"]
    .map((name) => [name, (root, m) => m.grammar.constants[name]]),
  ...["WALK", "WALK_TEXT", "STEP_LAWS", "SENTENCE"].map((name) => [name, (root, m) => m.walk[name]]),
  ["LNAME", (root, m) => [...m.grammar.constants.LAYERS].reverse().map(({ name }) => name)],
  ["SHAPE", (root, m) => Object.fromEntries(m.laws.L_SHAPES.map(({ k, mark }) => [k, mark]))],
]);

// The cases the bench uses to demonstrate each law. Check the vector's own
// attribution before presenting its records as an example of that law.
function checkBench(vectors, rules) {
  const laws = {
    count: { three: "count.perm", twice: "count.repeats" },
    latest: { fork: "latest-by.set", chain: "latest-by.set", late: "latest-by.set", merge: "latest-by.set",
      emitted: "latest-by.order", id: "latest-by.order", span: "latest-by.order", repeats: "latest-by.repeats" },
    view: { withheld: "view.no-resurrection", erased: "view.no-resurrection", max: "result.unread" },
    record: { sets: "record.sets", members: "record.member-order", erasure: "record.erasure" },
    lens: { round: "lens.round-trip", escape: "lens.escaping", edit: "lens.put-get", drop: "lens.absence-not-edit" },
  };
  for (const [group, cases] of Object.entries(laws)) for (const [name, law] of Object.entries(cases)) {
    const v = vectors[group][name];
    if (!v?.laws.includes(law)) throw new Error(`front bench: ${group}/${name} needs a vector naming ${law}`);
    if (v.envs) for (const env of v.envs) {
      if (LE.canonical(LE.envJson(env, rules.id)) !== v.expect.env_canonical)
        throw new Error(`front bench: an envelope in ${v.file} differs from the model's canonical spelling`);
    }
    if (!v.orders) continue;
    const records = new Map();
    for (const order of v.orders) for (const r of order) {
      if (!r.emitted.endsWith("Z")) throw new Error(`front bench: ${v.file} needs UTC writing times`);
      if (records.has(r.id) && !isDeepStrictEqual(r, records.get(r.id)))
        throw new Error(`front bench: ${v.file} changes record ${r.id} across deliveries`);
      records.set(r.id, r);
    }
    // Only the repeats case varies how many copies of each record arrive.
    const ids = (order) => {
      const labels = order.map((r) => r.id);
      return (law === "latest-by.repeats" ? [...new Set(labels)] : labels).sort();
    };
    const first = ids(v.orders[0]);
    for (const order of v.orders.slice(1)) if (!isDeepStrictEqual(ids(order), first))
      throw new Error(`front bench: ${v.file} changes the records across deliveries`);
  }
}

export function frontData(root, model = decisions(root)) {
  const dir = join(root, "design", "front", "data");
  const data = new Map();
  for (const f of readdirSync(dir).sort()) {
    if (!f.endsWith(".json")) throw new Error(`front: ${f} is not a data file`);
    const value = JSON.parse(readFileSync(join(dir, f), "utf8"));
    const entries = f === "grammar-presentation.json" ? Object.entries(value) : [[f.slice(0, -5), value]];
    for (const [name, constant] of entries) {
      if (GENERATED.has(name)) throw new Error(`front: ${name} is generated, so remove it from data/${f}`);
      if (data.has(name)) throw new Error(`front: data/${f} provides ${name} twice`);
      data.set(name, constant);
    }
  }
  const walk = readWalk(root);
  const sources = {
    ...model, walk, guide: model.guide ?? readGuide(root), evidence: readEvidence(root),
    laws: readLaws(root, walk.STEP_LAWS.flat()),
  };
  for (const [name, make] of GENERATED) data.set(name, make(root, sources));
  checkBench(data.get("L_VEC"), data.get("PROTO"));
  return data;
}

// Ids the script installs at startup, plus the hashes its router handles.
// Evidence routes select a card by slug, even for laws with no node on the map.
export function frontIds(data) {
  const diagrams = data.get("G_DIAGRAMS");
  return [
    "grammar", "guide", "laws", "evidence", "decisions",
    ...data.get("DEC").map(({ id }) => id.toLowerCase()),
    ...data.get("NOUN_GROUPS").flatMap((_, i) =>
      data.get("NOUNS").filter(({ group }) => group === i).map(({ word }) => `n-${word}`)),
    ...data.get("L_QS").flatMap(({ k, rows }) => [`q-${k}`, `h-q-${k}`, ...rows.map(({ id }) => id)]),
    ...data.get("L_BOUND").map(({ law }) => "prem-" + law.replace(/[^a-z0-9]+/gi, "-").toLowerCase()),
    ...data.get("E_LAWS").map(({ s }) => `ev-${s}`),
    // The walk, stack, verb detail and five bench tabs are drawn at startup.
    // The own-text editor only exists after switching to the text machine.
    "wtip", "lens", "lensapply", "lensreset", "lensout", "toss", "rebuild", "vdetail",
    "bt-count", "bt-current", "bt-withheld", "bt-id", "bt-text", "breset",
    "loop-ar", "stack-ar", "dep-ar",
    ...(diagrams.headsfig ? ["hfm0", "hfm1", "hfm2"] : []),
    ...(diagrams.wordings ? ["wdm"] : []),
  ];
}

// A constant can contain a whole SVG, a paragraph, or an array of link snippets.
function* dataLinks(value) {
  if (typeof value === "string") {
    for (const m of value.matchAll(/(?:^|\s)href\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi))
      yield m[1] ?? m[2] ?? m[3];
  } else if (value && typeof value === "object") {
    for (const child of Object.values(value)) yield* dataLinks(child);
  }
}

export function frontPage(root) {
  const read = (f) => readFileSync(join(root, "design", "front", f), "utf8");
  const model = { ...decisions(root), guide: readGuide(root) };
  const data = frontData(root, model);
  const used = new Set();
  // Inline the Node module at the original declaration in the page's classic script.
  const parts = read("app.js").split("/*bench:LE*/\n");
  if (parts.length !== 2) throw new Error("front: expected one bench engine placeholder");
  const app = parts.join(read("bench.mjs").replace(/^export (?=const LE = )/, ""));
  // "<" is escaped so that no value can close the script element.
  const script = app.replace(/\/\*data:([A-Za-z0-9_]+)\*\//g, (_, name) => {
    if (!data.has(name)) throw new Error(`front: the script reads ${name} and nothing provides it`);
    if (used.has(name)) throw new Error(`front: the script defines ${name} twice`);
    used.add(name);
    return JSON.stringify(data.get(name)).replaceAll("<", "\\u003c");
  });
  for (const name of data.keys()) if (!used.has(name)) throw new Error(`front: ${name} is provided and the script does not read it`);
  let body = read("shell.html");
  body = fill(body, "view-decisions", decisionsView(model.open, model.around));
  body = fill(body, "grammar-intro", model.grammar.intro);
  body = fill(body, "grammar-nouns", model.grammar.nounsHeading);
  body = fill(body, "grammar-verbs", model.grammar.verbsHeading);
  body = fill(body, "view-guide", model.guide.html);
  const fonts = read("fonts.css");
  body = fill(body, "styles", `<style>\n${fonts}${read("styles.css")}</style>\n`);
  body = fill(body, "script", `<script>\n${script}</script>\n`);
  const base = readFileSync(join(root, "design", "rethink", "base.css"), "utf8").trimEnd();
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow">
<style>${base}</style>
</head>
<body>
${body}</body>
</html>
`;
  const links = [...data.values()].flatMap((value) => [...dataLinks(value)]);
  // The law directory links every row to its evidence, including standalone
  // laws. Evidence in turn links back to each model-supplied premise case.
  for (const { rows } of data.get("L_QS")) for (const { id } of rows)
    links.push("#ev-" + id.replace(/^law-/, ""));
  for (const { pr } of data.get("E_LAWS")) if (pr)
    links.push("#prem-" + pr.replace(/[^a-z0-9]+/gi, "-").toLowerCase());
  const fontFiles = new Set(["fonts/LICENSES.md"]);
  for (const [, , path] of fonts.matchAll(/url\(\s*(["']?)(.*?)\1\s*\)/gi)) {
    if (!/^fonts\/[^/\\]+\.woff2$/.test(path)) throw new Error(`front: expected a font file in fonts.css, got ${path}`);
    fontFiles.add(path);
  }
  return { html, ids: frontIds(data), links, fontFiles };
}

export function renderFront(root) {
  return frontPage(root).html;
}
