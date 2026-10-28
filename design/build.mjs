// Build the design pages: design/rethink/ and design/grammar/.
//
//   node design/build.mjs                    writes out/rethink/index.html and out/grammar/index.html
//   node design/build.mjs --fragment <file>  writes the rethink page as the claude.ai artifact takes it
//
// The fragment is what the artifact host wraps in its own document; the full
// document carries that wrapper's reset (base.css) so the page renders the
// same on projects.gruel.world. The grammar page has no artifact mirror.
// No dependencies.

import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
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

// The grammar page, from design/grammar/: the words as data (words.json),
// rendered into page.html. It is served only on projects.gruel.world, so it may
// load a library from a CDN; the rethink page stays self-contained for its mirror.
const gsrc = join(root, "design", "grammar");
const gread = (...p) => readFileSync(join(gsrc, ...p), "utf8");
const words = JSON.parse(gread("words.json"));

// What the page names must be what the protocol names: every law it cites is a
// law in protocol/laws.md, and its refusal codes are exactly those the vectors
// pin, apart from the ones it marks as not pinned yet.
function lawNames() {
  const names = new Set();
  for (const line of readFileSync(join(root, "protocol", "laws.md"), "utf8").split("\n")) {
    const cell = line.match(/^\| ([^|]+) \|/);
    if (cell) for (const m of cell[1].matchAll(/`([^`]+)`/g)) names.add(m[1]);
  }
  return names;
}
function vectorCodes() {
  const codes = new Set();
  const walk = (v) => {
    if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) {
      if ((k === "refused" || k === "code") && typeof x === "string") codes.add(x);
      else walk(x);
    }
  };
  const dir = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) dir(p);
      else if (e.name.endsWith(".json")) walk(JSON.parse(readFileSync(p, "utf8")));
    }
  };
  dir(join(root, "vectors"));
  return codes;
}
function checkWords() {
  const laws = lawNames();
  const walk = JSON.parse(gread("walk.json"));
  const cited = [...words.nouns, ...words.verbs, ...walk.steps].flatMap((w) => w.laws);
  const unknown = cited.filter((l) => !laws.has(l));
  if (unknown.length) throw new Error(`grammar: not a law in protocol/laws.md: ${unknown.join(", ")}`);
  for (const w of [...words.nouns, ...words.verbs, ...words.layers])
    if (!words.status[w.status]) throw new Error(`grammar: unknown status ${w.status} on ${w.word ?? w.name}`);
  const pinned = new Set(words.refusals.filter((g) => g.pinned !== false).flatMap((g) => g.codes));
  const unpinned = words.refusals.filter((g) => g.pinned === false).flatMap((g) => g.codes);
  const inVectors = vectorCodes();
  const missing = [...inVectors].filter((c) => !pinned.has(c));
  const absent = [...pinned].filter((c) => !inVectors.has(c));
  const nowPinned = unpinned.filter((c) => inVectors.has(c));
  if (missing.length) throw new Error(`grammar: vectors refuse with codes the page lacks: ${missing.join(", ")}`);
  if (absent.length) throw new Error(`grammar: codes no vector pins: ${absent.join(", ")}`);
  if (nowPinned.length) throw new Error(`grammar: now pinned, move out of "not pinned yet": ${nowPinned.join(", ")}`);
  const nouns = new Set(words.nouns.map((n) => n.word));
  const verbs = new Set(words.verbs.map((v) => v.word));
  for (const v of words.matrix.verbs) if (!verbs.has(v)) throw new Error(`grammar: matrix verb ${v} isn't a verb`);
  for (const r of words.matrix.rows) {
    if (!nouns.has(r.noun)) throw new Error(`grammar: matrix row ${r.noun} isn't a noun`);
    for (const v of Object.keys(r.cells)) if (!words.matrix.verbs.includes(v)) throw new Error(`grammar: matrix cell ${r.noun}/${v} has no column`);
  }
}

const LAWS = "https://github.com/kgruel/strange-loops-next/blob/main/protocol/laws.md";
const NUMBER = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen"];
const count = (n) => NUMBER[n] ?? String(n);
const chip = (s) => `<span class="chip ${s}">${s}</span>`;
const lawList = (ls) => ls.length
  ? `<p class="laws">${ls.map((l) => `<a href="${LAWS}"><code>${l}</code></a>`).join(" ")}</p>`
  : "";

function renderGrammar() {
  checkWords();
  const lede = `  <p class="lede">Records in, folds and ticks out, lenses back to text. ` +
    `${count(words.nouns.length)[0].toUpperCase() + count(words.nouns.length).slice(1)} nouns, ` +
    `${count(words.verbs.length)} verbs and ${count(words.layers.length)} layers, each a little higher off the ground ` +
    `and a little more temporary. Everything said is a record on the ground; everything above it is worked out, ` +
    `and can be thrown away and worked out again.</p>\n`;

  const nouns = words.nouns.map((n) =>
    `    <article class="card${n.status === "settled" ? " is-settled" : ""}" id="noun-${n.word}">\n` +
    `      <div class="card-h"><h3>${n.word}</h3>${chip(n.status)}</div>\n` +
    `      <dl>\n` +
    `        <dt>Purpose</dt><dd>${n.purpose}</dd>\n` +
    `        <dt>State</dt><dd>${n.state}</dd>\n` +
    `        <dt>Principle</dt><dd>${n.principle}</dd>\n` +
    `      </dl>\n` +
    (n.pending ? `      <p class="pending">${n.pending}</p>\n` : "") +
    (n.laws.length ? `      ${lawList(n.laws)}\n` : "") +
    `    </article>\n`).join("");

  const FAMILY = { write: "Write", any: "Any layer", read: "Read", text: "Text" };
  const verbs = Object.keys(FAMILY).map((f) => {
    const vs = words.verbs.filter((v) => v.family === f);
    return `    <h3>${FAMILY[f]}</h3>\n    <div class="rows">\n` + vs.map((v) =>
      `      <div class="row${v.status === "settled" ? " is-settled" : ""}"><div class="row-k"><b>${v.word}</b>${chip(v.status)}</div>` +
      `<div class="row-v"><p>${v.says}</p>${lawList(v.laws)}</div></div>\n`).join("") + "    </div>\n";
  }).join("");

  const constructions = words.constructions.map((c) =>
    `      <div class="row"><div class="row-k"><b>${c.word}</b></div><div class="row-v"><p class="made">${c.made}</p><p>${c.says}</p></div></div>\n`).join("");

  const refusals = words.refusals.map((g) =>
    `      <div class="ref${g.pinned === false ? " is-settled" : ""}"><p class="ref-h"><b>${g.where}</b> <span>${g.note}</span></p>` +
    `<p class="codes">${g.codes.map((c) => `<code>${c}</code>`).join(" ")}</p></div>\n`).join("");

  const n = words.layers.length;
  const plates = words.layers.map((l, k) =>
    `      <div class="plate${l.status === "settled" ? " is-settled" : ""}" data-layer="${k}" style="--z:${n - 1 - k}"><span>${l.name}</span></div>\n`).join("");
  const layerRows = words.layers.map((l, k) =>
    `        <tr data-layer="${k}"><th scope="row">${l.name}${l.status === "settled" ? ` ${chip("settled")}` : ""}<span class="gist">${l.gist}</span></th>` +
    `<td>${l.made}</td><td>${l.lasts}</td><td>${l.named}</td></tr>\n`).join("");

  const mv = words.matrix.verbs;
  const status = Object.fromEntries(words.verbs.map((v) => [v.word, v.status]));
  const matrix = `      <thead><tr><th scope="col"></th>${mv.map((v) => `<th scope="col"${status[v] === "settled" ? ' class="is-settled"' : ""}><span>${v}</span></th>`).join("")}</tr></thead>\n` +
    "      <tbody>\n" + words.matrix.rows.map((r) =>
      `        <tr><th scope="row">${r.noun}</th>${mv.map((v) => r.cells[v]
        ? `<td class="on"><span class="dot" aria-hidden="true"></span><span class="cell-t">${r.cells[v]}</span></td>`
        : '<td><span class="sr">—</span></td>').join("")}</tr>\n`).join("") +
    "      </tbody>\n";

  const provenance = words.provenance.map((p) =>
    `    <div class="row"><div class="row-k wide">${p.work}</div><div class="row-v"><p>${p.here}</p></div></div>\n`).join("");

  let body = gread("page.html");
  for (const [name, value] of Object.entries({ lede, nouns, verbs, constructions, refusals, plates, "layer-rows": layerRows, matrix, provenance }))
    body = fill(body, name, value);

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow">
${gread("head.html")}<style>
${gread("styles.css")}</style>
</head>
<body>
${body}
<script>
const WALK = ${JSON.stringify(JSON.parse(gread("walk.json")))};
</script>
<script>
${gread("app.js")}</script>
</body>
</html>
`;
}

const args = process.argv.slice(2);
const at = args.indexOf("--fragment");
const outputs = at >= 0
  ? [[args[at + 1], fragment]]
  : [[join(root, "out", "rethink", "index.html"), full], [join(root, "out", "grammar", "index.html"), renderGrammar()]];
for (const [file, text] of outputs) {
  if (!file) throw new Error("--fragment needs a path");
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, text);
  console.log(`wrote ${file}`);
}
