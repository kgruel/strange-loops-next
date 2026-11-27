// Build the design pages from their sources and the repository's working documents.
//
//   node design/build.mjs                    writes the pages under out/
//   node design/build.mjs --fragment <file>  writes the rethink page as the claude.ai artifact takes it
//
// The fragment is what the artifact host wraps in its own document; the full
// document carries that wrapper's reset (base.css) so the page renders the
// same on strangeloops.dev. The other pages are built on
// design/page.mjs and have no artifact mirror. No dependencies.

import { mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { renderDecisions } from "./decisions/render.mjs";
import { renderEvidence } from "./evidence/render.mjs";
import { frontPage } from "./front/render.mjs";
import { renderGrammar } from "./grammar/render.mjs";
import { fill } from "./page.mjs";
import { renderLaws } from "./laws/render.mjs";

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
const frontFile = join(root, "out", "index.html");
const front = at < 0 ? frontPage(root) : null;
const outputs = at >= 0
  ? [[args[at + 1], fragment]]
  : [[frontFile, front.html],
     [join(root, "out", "rethink", "index.html"), full],
     [join(root, "out", "grammar", "index.html"), renderGrammar(root)],
     [join(root, "out", "laws", "index.html"), renderLaws(root)],
     [join(root, "out", "evidence", "index.html"), renderEvidence(root)],
     ...renderDecisions(root)];

// Check the assembled pages before writing any of them. Rethink's own hash
// routes can select nested tabs. Incoming links still land on real section ids.
if (at < 0) {
  const pages = new Map();
  const rethink = join(root, "out", "rethink", "index.html");
  for (const [file, text] of outputs) {
    const markup = text.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
    const ids = [...markup.matchAll(/<[\w:-]+\b[^<>]*?\sid\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/gi)].map((m) => m[1] ?? m[2] ?? m[3]);
    if (file === rethink) {
      for (const [, sub] of markup.matchAll(/class="subpanel" id="([^"]+)"/g)) ids.push(`horizons/${sub}`);
    }
    const links = [...markup.matchAll(/<a\b[^<>]*?\shref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi)].map((m) => m[1] ?? m[2] ?? m[3]);
    if (file === frontFile) {
      ids.push(...front.ids);
      links.push(...front.links);
    }
    if (file === join(root, "out", "grammar", "index.html"))
      links.push(...[...text.matchAll(/"(law-[a-z0-9-]+)"/g)].map((m) => `../laws/#${m[1]}`));
    pages.set(file, { ids: new Set(ids), links: new Set(links.map((href) => href.replaceAll("&quot;", '"').replaceAll("&amp;", "&"))) });
  }
  for (const [file, , sources] of outputs) {
    for (const href of pages.get(file).links) {
      if (/^(?:https?:\/\/|mailto:)/i.test(href)) continue;
      const [, path, fragment] = href.match(/^([^#]*)(?:#(.*))?$/);
      const origin = sources?.get(href) ?? `${file}: link ${href}`;
      let dest, id;
      try {
        dest = path ? resolve(dirname(file), decodeURIComponent(path), path.endsWith("/") ? "index.html" : "") : file;
        id = decodeURIComponent(fragment ?? "");
      } catch { throw new Error(`${origin}: invalid URL encoding in ${href}`); }
      const target = pages.get(dest);
      if (!target || (id && !target.ids.has(id))) throw new Error(`${origin}: no target for ${href}`);
    }
  }
  // Read every font before publishing anything, even if an older copy is in out/.
  for (const path of front.fontFiles)
    outputs.push([join(root, "out", path), readFileSync(join(root, "design", "front", path))]);
}
for (const [file, text] of outputs) {
  if (!file) throw new Error("--fragment needs a path");
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, text);
  console.log(`wrote ${file}`);
}

// A removed or renamed note must also disappear from the files the site syncs.
if (at < 0) {
  const dir = join(root, "out", "decisions");
  const built = new Set(outputs.map(([file]) => file));
  for (const name of readdirSync(dir)) {
    const file = join(dir, name);
    if (/^note-.*\.html$/.test(name) && !built.has(file)) unlinkSync(file);
  }
}
