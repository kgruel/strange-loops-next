// The grammar page, from design/grammar/: the words as data (words.json, and walk.json for
// the walk), rendered into page.html.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { documentOf, fill, header } from "../page.mjs";
import { lawTable, slug, vectorCodes, vectorFiles } from "../protocol.mjs";

const NUMBER = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen"];
const count = (n) => NUMBER[n] ?? String(n);
const chip = (s) => `<span class="chip ${s}">${s}</span>`;

export function renderGrammar(root) {
  const read = (...p) => readFileSync(join(root, "design", "grammar", ...p), "utf8");
  const words = JSON.parse(read("words.json"));
  const walk = JSON.parse(read("walk.json"));

  // A law name to its card on the laws page.
  const { rows } = lawTable(root);
  const lawAt = new Map(rows.flatMap((r) => r.names.map((n) => [n, `law-${slug(r.key)}`])));
  const lawList = (ls) => ls.length
    ? `<p class="laws">${ls.map((l) => `<a href="../laws/#${lawAt.get(l)}"><code>${l}</code></a>`).join(" ")}</p>`
    : "";

  // What the page names must be what the protocol names: every law it cites is a law in
  // protocol/laws.md, and its refusal codes are exactly those the vectors pin, apart from
  // the ones it marks as not pinned yet.
  const cited = [...words.nouns, ...words.verbs, ...walk.steps].flatMap((w) => w.laws);
  const unknown = cited.filter((l) => !lawAt.has(l));
  if (unknown.length) throw new Error(`grammar: not a law in protocol/laws.md: ${unknown.join(", ")}`);
  for (const w of [...words.nouns, ...words.verbs, ...words.layers])
    if (!words.status[w.status]) throw new Error(`grammar: unknown status ${w.status} on ${w.word ?? w.name}`);
  const pinned = new Set(words.refusals.filter((g) => g.pinned !== false).flatMap((g) => g.codes));
  const unpinned = words.refusals.filter((g) => g.pinned === false).flatMap((g) => g.codes);
  const inVectors = vectorCodes(vectorFiles(root));
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

  const lede = `  <p class="lede">Records in, folds and ticks out, lenses back to text. ` +
    `${count(words.nouns.length)[0].toUpperCase() + count(words.nouns.length).slice(1)} nouns, ` +
    `${count(words.verbs.length)} verbs and ${count(words.layers.length)} layers, each a little higher off the ground ` +
    `and a little more temporary. Everything said is a record on the ground; everything above it is worked out, ` +
    `and can be thrown away and worked out again.</p>\n`;

  const nounCards = words.nouns.map((n) =>
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
  const verbRows = Object.keys(FAMILY).map((f) => {
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

  const top = header("grammar", [["nouns", "Nouns"], ["verbs", "Verbs"], ["layers", "Layers"], ["walk", "Walk"], ["matrix", "Matrix"]]);
  let body = read("page.html");
  for (const [name, value] of Object.entries({ header: top, lede, nouns: nounCards, verbs: verbRows, constructions, refusals, plates, "layer-rows": layerRows, matrix, provenance }))
    body = fill(body, name, value);

  const walkLaws = Object.fromEntries(walk.steps.flatMap((s) => s.laws).map((l) => [l, lawAt.get(l)]));
  return documentOf(root, {
    head: read("head.html"),
    css: read("styles.css"),
    body,
    scripts: [`const WALK = ${JSON.stringify(walk)};\nconst LAW_AT = ${JSON.stringify(walkLaws)};\n`, read("app.js")],
  });
}
