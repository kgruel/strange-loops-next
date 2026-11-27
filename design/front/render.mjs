// The front page: the prototype's markup, styles and script, with its content put back in.
// The page began as a prototype in one document. extract.mjs took it apart once; the
// repository is its source now. Each file under data/ is one constant the script reads,
// still as the prototype had it. Those in GENERATED are worked out here from the
// repository's own sources and have no file.

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { rewriteLink } from "../decisions/links.mjs";
import { fill } from "../page.mjs";
import { decisionsView, frontRewrite, readAround, readDecisions } from "./decisions.mjs";

// The working documents the decisions pages render, as design/decisions/render.mjs names them.
function documents(root) {
  const docs = new Map([["DECISIONS.md", "index.html"], ["ROADMAP.md", "roadmap.html"], ["CHANGELOG.md", "changelog.html"], ["GUIDE.md", "guide.html"]]);
  for (const e of readdirSync(join(root, "notes"), { withFileTypes: true }))
    if (e.isFile() && e.name.endsWith(".md")) docs.set("notes/" + e.name, "note-" + e.name.slice(0, -3) + ".html");
  return docs;
}

// Everything the decisions view shows, read once.
function decisions(root) {
  const rewrite = frontRewrite(root, documents(root), rewriteLink);
  return { open: readDecisions(root, rewrite), around: readAround(root, rewrite) };
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
  ["DEC", (root, m) => m.open.entries],
  ["DEC_AT", (root, m) => m.open.at],
  ["RULED", (root, m) => m.around.ruled],
  ["POS", (root, m) => onMap(root, "POS", m)],
  ["ISSHORT", (root, m) => onMap(root, "ISSHORT", m)],
  ["DEC_EDGES", (root, m) => onMap(root, "DEC_EDGES", m)],
]);

export function frontData(root, model = decisions(root)) {
  const dir = join(root, "design", "front", "data");
  const data = new Map();
  for (const f of readdirSync(dir).sort()) {
    if (!f.endsWith(".json")) throw new Error(`front: ${f} is not a data file`);
    const name = f.slice(0, -5);
    if (GENERATED.has(name)) throw new Error(`front: ${name} is generated, so data/${f} must go`);
    data.set(name, JSON.parse(readFileSync(join(dir, f), "utf8")));
  }
  for (const [name, make] of GENERATED) data.set(name, make(root, model));
  return data;
}

export function renderFront(root) {
  const read = (f) => readFileSync(join(root, "design", "front", f), "utf8");
  const model = decisions(root);
  const data = frontData(root, model);
  const used = new Set();
  // "<" is escaped so that no value can close the script element.
  const script = read("app.js").replace(/\/\*data:([A-Z0-9_]+)\*\//g, (_, name) => {
    if (!data.has(name)) throw new Error(`front: the script reads ${name} and nothing provides it`);
    if (used.has(name)) throw new Error(`front: the script defines ${name} twice`);
    used.add(name);
    return JSON.stringify(data.get(name)).replaceAll("<", "\\u003c");
  });
  for (const name of data.keys()) if (!used.has(name)) throw new Error(`front: ${name} is provided and the script does not read it`);
  let body = read("shell.html");
  body = fill(body, "view-decisions", decisionsView(model.open, model.around));
  body = fill(body, "styles", `<style>\n${read("fonts.css")}${read("styles.css")}</style>\n`);
  body = fill(body, "script", `<script>\n${script}</script>\n`);
  const base = readFileSync(join(root, "design", "rethink", "base.css"), "utf8").trimEnd();
  return `<!doctype html>
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
}
