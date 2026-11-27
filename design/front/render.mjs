// The front page: the prototype's markup, styles and script, with its content put back in.
// extract.mjs made the files; this joins them. Each file under data/ is one constant the
// script reads. Those listed in GENERATED are worked out here from the repository's own
// sources and must not be read from data/; the rest are still as the prototype had them.

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fill } from "../page.mjs";

// name -> (root) => value. Empty until the first constant is generated from its source.
export const GENERATED = new Map();

export function frontData(root) {
  const dir = join(root, "design", "front", "data");
  const data = new Map();
  for (const f of readdirSync(dir).sort()) {
    if (!f.endsWith(".json")) throw new Error(`front: ${f} is not a data file`);
    const name = f.slice(0, -5);
    if (GENERATED.has(name)) throw new Error(`front: ${name} is generated, so data/${f} must go`);
    data.set(name, JSON.parse(readFileSync(join(dir, f), "utf8")));
  }
  for (const [name, make] of GENERATED) data.set(name, make(root));
  return data;
}

export function renderFront(root) {
  const read = (f) => readFileSync(join(root, "design", "front", f), "utf8");
  const data = frontData(root);
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
  body = fill(body, "styles", `<style>\n${read("styles.css")}</style>\n`);
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
