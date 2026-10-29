import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { documentOf, fill, header } from "../page.mjs";
import { lawTable, slug } from "../protocol.mjs";
import { equal, runScenario, stringify, parseVector } from "./runtime.mjs";
import { boundaryResult } from "./boundaries.mjs";

const json = (value) => stringify(value, 0).replace(/</g, "\\u003c");

export function workbenchData(root) {
  const lawAt = Object.fromEntries(lawTable(root).rows.flatMap((r) => r.names.map((name) => [name, `law-${slug(r.key)}`])));
  const presets = readdirSync(join(root, "vectors", "scenario")).filter((f) => f.endsWith(".json")).sort().map((file) => ({
    path: `scenario/${file.slice(0, -5)}`,
    vector: parseVector(readFileSync(join(root, "vectors", "scenario", file), "utf8")),
  }));
  if (!presets.length) throw new Error("workbench: no scenario presets");
  for (const { path, vector } of presets) {
    if (vector.layer !== "scenario") throw new Error(`workbench ${path}: expected scenario layer`);
    for (const law of vector.laws) if (!Object.hasOwn(lawAt, law)) throw new Error(`workbench ${path}: no law ${law}`);
    const live = runScenario(vector.input);
    if (!equal(live.expect, vector.expect)) throw new Error(`workbench ${path}: live output differs from vector expect`);
    live.orders.forEach((orders, i) => orders.forEach((output, j) => {
      if (!equal(output, vector.expect.steps[i])) throw new Error(`workbench ${path}: step ${i + 1}, order ${j + 1} differs from vector expect`);
    }));
  }
  const boundaries = JSON.parse(readFileSync(join(root, "design", "laws", "boundaries.json"), "utf8")).cases;
  for (const b of boundaries) {
    if (!Object.hasOwn(lawAt, b.law)) throw new Error(`workbench boundary: no law ${b.law}`);
    if (!boundaryResult(b.law, false).holds || boundaryResult(b.law, true).holds) throw new Error(`workbench boundary ${b.law}: premise example does not change the result`);
  }
  return { presets, lawAt, boundaries };
}

// Bundle our static-import-only ESM graph without changing its code or export rules.
// Native modules resolve through an import map. Data URLs keep the page self-contained.
export function browserModules(root, entry) {
  const imports = {}, visiting = new Set();
  const visit = (path) => {
    const rel = relative(root, path).split(sep).join("/");
    if (rel.startsWith("../")) throw new Error(`workbench bundle: module outside root: ${path}`);
    const name = `@workbench/${rel}`;
    if (imports[name] || visiting.has(name)) return name;
    visiting.add(name);
    let source = readFileSync(path, "utf8");
    if (/\bimport\s*\(|\bimport\s*["']|\bimport\.meta\b/.test(source)) throw new Error(`workbench bundle: unsupported import in ${rel}`);
    source = source.replace(/(\b(?:import|export)\s+[^;]*?\s+from\s+)(["'])([^"']+)\2/g, (_, prefix, quote, specifier) => {
      if (!specifier.startsWith(".")) throw new Error(`workbench bundle: non-local import ${specifier} in ${rel}`);
      return `${prefix}${quote}${visit(resolve(dirname(path), specifier))}${quote}`;
    });
    imports[name] = `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
    visiting.delete(name);
    return name;
  };
  const name = visit(join(root, entry));
  return { imports, entry: name };
}

export function renderWorkbench(root) {
  const read = (file) => readFileSync(join(root, "design", "workbench", file), "utf8");
  const data = workbenchData(root);
  const bundle = browserModules(root, "design/workbench/app.mjs");
  const body = fill(read("page.html"), "header", header("workbench", [["edit", "Edit"], ["results", "Results"], ["break", "Break it"], ["keep", "Keep / share"]]));
  return documentOf(root, {
    head: `<title>Workbench — Strange Loops</title>\n<script type="importmap">${json({ imports: bundle.imports })}</script>\n`,
    css: read("styles.css"),
    body: `${body}\n<script type="application/json" id="workbench-data">${json(data)}</script>\n<script type="module">import ${JSON.stringify(bundle.entry)};</script>\n`,
    scripts: [],
  });
}
