// Build the design pages from their sources and the repository's working documents.
//
//   node design/build.mjs                    writes the pages under out/
//   node design/build.mjs --fragment <file>  writes the rethink page as the claude.ai artifact takes it
//
// The fragment is what the artifact host wraps in its own document; the full
// document carries that wrapper's reset (base.css) so the page renders the
// same on strangeloops.dev. The front page and working documents have no
// artifact mirror. No dependencies.

import { mkdirSync, readdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { renderDecisions } from "./decisions/render.mjs";
import { frontPage, SITE, VIEWS } from "./front/render.mjs";
import { fill } from "./page.mjs";

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
  if (s.id !== "map") return text;
  // The map and ledger both cite the working documents.
  return fill(text, "ledger", renderLedger(ledger)).replaceAll('href="../decisions/"', 'href="../decisions/decisions.html"');
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

function sitemap(urls) {
  return '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    [...new Set(urls)].map((url) => `  <url><loc>${url}</loc></url>\n`).join("") + '</urlset>\n';
}

function llms(root) {
  const raw = "https://raw.githubusercontent.com/kgruel/strange-loops-next/main/";
  const protocol = new Map([
    ["protocol/record.md", "Layer 0, the record"],
    ["protocol/spec.md", "How a spec chooses records and names its slots"],
    ["protocol/tick.md", "The tick record and its payload"],
    ["protocol/lens.md", "The lens contract for keyed sections"],
    ["protocol/laws.md", "Theorems and guarantees supplied by construction"],
  ]);
  const markdown = readdirSync(join(root, "protocol"), { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => relative(root, join(entry.parentPath, entry.name))).sort();
  for (const path of markdown) if (!protocol.has(path)) {
    const heading = readFileSync(join(root, path), "utf8").match(/^# +(.+)$/m)?.[1];
    protocol.set(path, heading ?? "Protocol notes");
  }
  const section = (name, files) => `## ${name}\n\n` + Array.from(files, ([path, description]) => {
    if (!statSync(join(root, path), { throwIfNoEntry: false })?.isFile())
      throw new Error(`llms.txt: repository file does not exist: ${path}`);
    const url = raw + path.split("/").map(encodeURIComponent).join("/");
    return `- [${path}](${url}): ${description}\n`;
  }).join("") + "\n";
  return `# ${SITE.name}\n\n` +
    `> ${VIEWS.grammar.description}\n\n` +
    section("Start here", [
      ["GUIDE.md", "A guide to loops, from an empty folder to a working store"],
      ["README.md", "Records in, folds and ticks out, lenses back to text"],
    ]) +
    section("Protocol", protocol) +
    section("Design and working documents", [
      ["DECISIONS.md", "Questions that wait on Kyle"],
      ["CHANGELOG.md", "What was built and what Kyle ruled"],
      ["ROADMAP.md", "What is next, in order"],
      ["design/laws/laws.json", "Law wording, shapes and the questions they answer"],
      ["design/front/grammar.json", "The nouns, verbs and layers of the grammar"],
    ]) +
    `## Releases\n\n- [Releases](${SITE.repository}/releases): Published versions and release notes\n`;
}

const args = process.argv.slice(2);
const at = args.indexOf("--fragment");
const out = join(root, "out");
const outputs = [];
if (at >= 0) outputs.push([args[at + 1], fragment]);

// Check the assembled pages before writing any of them. Rethink's own hash
// routes can select nested tabs. Incoming links still land on real section ids.
if (at < 0) {
  const front = frontPage(root);
  const fronts = new Map([[join(out, "index.html"), front]]);
  for (const view of Object.keys(VIEWS))
    fronts.set(join(out, view, "index.html"), frontPage(root, { view, depth: 1 }));
  const rethink = join(out, "rethink", "index.html");
  const documents = renderDecisions(root, SITE.url);
  outputs.push(...Array.from(fronts, ([file, { html }]) => [file, html]), [rethink, full], ...documents);

  const assets = new Map(Array.from(front.fontFiles, (path) => [join(out, path), join(root, "design", "front", path)]));
  const pages = new Map();
  for (const [file, text] of outputs) {
    const markup = text.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
    const ids = [...markup.matchAll(/<[\w:-]+\b[^<>]*?\sid\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/gi)].map((m) => m[1] ?? m[2] ?? m[3]);
    if (file === rethink) {
      for (const [, sub] of markup.matchAll(/class="subpanel" id="([^"]+)"/g)) ids.push(`horizons/${sub}`);
    }
    const links = [...markup.matchAll(/<a\b[^<>]*?\shref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi)].map((m) => m[1] ?? m[2] ?? m[3]);
    const copy = fronts.get(file);
    if (copy) {
      ids.push(...copy.ids);
      links.push(...copy.links);
    }
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
      if ((!target && !assets.has(dest)) || (id && !target?.ids.has(id))) throw new Error(`${origin}: no target for ${href}`);
    }
  }
  // Read every font before publishing anything, even if an older copy is in out/.
  for (const [file, source] of assets) outputs.push([file, readFileSync(source)]);
  const urls = [...Array.from(fronts.values(), ({ canonical }) => canonical), ...documents.map(([, , , canonical]) => canonical).filter(Boolean)];
  outputs.push([join(out, "sitemap.xml"), sitemap(urls)], [join(out, "llms.txt"), llms(root)]);
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
