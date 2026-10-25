// Build the design page from design/rethink/.
//
//   node design/build.mjs                    writes out/rethink/index.html, a full document
//   node design/build.mjs --fragment <file>  writes the page as the claude.ai artifact takes it
//
// The fragment is what the artifact host wraps in its own document; the full
// document carries that wrapper's reset (base.css) so the page renders the
// same on projects.gruel.world. No dependencies.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const src = join(root, "design", "rethink");
const read = (...p) => readFileSync(join(src, ...p), "utf8");

const page = JSON.parse(read("page.json"));
const ledger = JSON.parse(read("ledger.json"));

// The decision ledger: records grouped under headings, in the order given.
const PILL = { settled: "p-ok", leaning: "p-lean" };
function renderLedger(recs) {
  let out = "", group = null;
  for (const r of recs) {
    if (r.kind !== "decision") throw new Error(`ledger: unknown kind ${r.kind}`);
    if (!PILL[r.status]) throw new Error(`ledger: unknown status ${r.status}`);
    if (r.group !== group) out += `    <h4>${(group = r.group)}</h4>\n`;
    out += `    <div class="rec"><div class="meta"><span>kind: decision</span><span class="pill ${PILL[r.status]}">${r.status}</span></div>` +
      `<div class="claim">${r.claim}</div><div class="why">${r.why}</div></div>\n`;
  }
  return out;
}

// One placeholder line per generated block; each must appear exactly once.
function fill(text, name, value) {
  const mark = `<!-- build:${name} -->\n`;
  if (text.split(mark).length !== 2) throw new Error(`expected one ${mark.trim()}`);
  return text.replace(mark, () => value);
}

const nav = '  <div class="wrap" role="tablist">\n' + page.sections.map((s, k) =>
  `    <button role="tab" id="t-${s.id}" aria-controls="${s.id}" aria-selected="${k === 0}"><span class="n">${String(k).padStart(2, "0")}</span>${s.tab}</button>\n`
).join("") + "  </div>\n";

const sections = page.sections.map((s, k) => {
  const text = read("sections", `${String(k).padStart(2, "0")}-${s.id}.html`);
  if (!text.startsWith(`<section class="panel" id="${s.id}" `)) throw new Error(`section ${s.id}: wrong file`);
  return s.id === "map" ? fill(text, "ledger", renderLedger(ledger)) : text;
});

const body = read("top.html") +
  '<nav class="rail" aria-label="Sections">\n' + nav + "</nav>\n\n" +
  '<main><div class="wrap">\n\n' + sections.join("\n") + "\n</div></main>\n\n" +
  "<script>\n" + read("app.js") + "</script>\n";

const head = read("head.html") + "<style>\n" + read("styles.css") + "</style>\n";
const fragment = head + body;

const full = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow">
<style>${read("base.css").trimEnd()}</style>
${head}</head>
<body>
${body}</body>
</html>
`;

const args = process.argv.slice(2);
const at = args.indexOf("--fragment");
const [file, text] = at >= 0 ? [args[at + 1], fragment] : [join(root, "out", "rethink", "index.html"), full];
if (!file) throw new Error("--fragment needs a path");
mkdirSync(dirname(file), { recursive: true });
writeFileSync(file, text);
console.log(`wrote ${file}`);
