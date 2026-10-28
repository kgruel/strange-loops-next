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
  const walkData = walkOf(root, walk);

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

  const walkStatic = walkData.steps.map((st) =>
    `      <li><b>${st.title}</b>${st.settled ? ' <span class="chip settled">settled</span>' : ""} <span>${st.text}</span> ` +
    `<span class="mono">heads ${st.heads.join(", ")} · decisions ${st.count}${st.erased.length ? ` · erased ${st.erased.join(", ")}` : ""}` +
    `${st.withheld.length ? ` · withheld ${st.withheld.join(", ")}` : ""}</span></li>\n`).join("");
  const top = header("grammar", [["nouns", "Nouns"], ["verbs", "Verbs"], ["layers", "Layers"], ["walk", "Walk"], ["matrix", "Matrix"]]);
  let body = read("page.html");
  for (const [name, value] of Object.entries({ header: top, lede, nouns: nounCards, verbs: verbRows, constructions, refusals, plates, "layer-rows": layerRows, matrix, provenance, "walk-static": walkStatic }))
    body = fill(body, name, value);

  const walkLaws = Object.fromEntries(walk.steps.flatMap((s) => s.laws).map((l) => [l, lawAt.get(l)]));
  return documentOf(root, {
    head: read("head.html"),
    css: read("styles.css"),
    body,
    scripts: [`const WALK = ${JSON.stringify(walkData)};\nconst LAW_AT = ${JSON.stringify(walkLaws)};\n`, read("app.js")],
  });
}

// The walk: its narration and layout are walk.json's, and everything it shows of the protocol
// (records, heads, winner, counts, what is erased or withheld, the lens edit) is the
// scenario vector the model wrote. The two must name the same records and steps.
function walkOf(root, walk) {
  const v = vectorFiles(root).get(walk.vector);
  if (!v) throw new Error(`grammar: no vector ${walk.vector}`);
  const fail = (m) => { throw new Error(`grammar: walk: ${m}`); };
  const recs = v.input.records;
  if (recs.length !== walk.records.length) fail(`${walk.records.length} records drawn, ${recs.length} in the vector`);
  const label = new Map(recs.map((r, i) => [r.id, walk.records[i].label]));
  if (new Set(label.values()).size !== recs.length) fail("two records share a label");
  const L = (id) => label.get(id) ?? fail(`no record ${id}`);
  // walk.json says only how to tell the walk; a key for anything else would be silently ignored.
  const STEP = ["name", "title", "text", "laws", "reader", "settled", "tick", "orders", "lens"];
  for (const st of walk.steps) for (const k of Object.keys(st))
    if (!STEP.includes(k)) fail(`step ${st.name} has ${k}; what a step shows of the protocol comes from ${walk.vector}`);
  for (const r of walk.records) for (const k of Object.keys(r))
    if (!["label", "col", "row"].includes(k)) fail(`record ${r.label} has ${k}; records come from ${walk.vector}`);
  const names = v.input.steps.map((s) => s.name);
  if (JSON.stringify(names) !== JSON.stringify(walk.steps.map((s) => s.name))) fail(`steps ${walk.steps.map((s) => s.name)} aren't the vector's ${names}`);
  const records = Object.fromEntries(recs.map((r, i) => [L(r.id), {
    who: r.observer.replace(/^sl:/, ""), at: r.emitted.slice(11, 16), col: walk.records[i].col, row: walk.records[i].row,
    body: r.value, prev: r.prev.map(L), erases: (r.erases ?? []).map(L),
  }]));
  const thing = v.input.thing;
  const lens = v.expect.lens;
  const steps = walk.steps.map((w, i) => {
    const e = v.expect.steps[i];
    const shownAs = (k) => e.settled.filter((x) => x.shown === k).map((x) => L(x.id));
    const st = {
      title: w.title, text: w.text, laws: w.laws, reader: w.reader, settled: w.settled,
      shown: e.settled.map((x) => L(x.id)), heads: e.heads.map(L), winner: e.winner && L(e.winner),
      count: e.slots.decisions.value, erased: shownAs("erased"), withheld: shownAs("withheld"),
      current: e.slots.current.things[thing].map((h) => ({ id: L(h.id), shown: h.shown })),
    };
    if (JSON.stringify(st.current.map((h) => h.id)) !== JSON.stringify(st.heads)) fail(`${w.name}: the slot's heads aren't the thing's`);
    if (w.orders) st.orders = v.input.steps[i].orders.slice(0, 3).map((o) => o.map(L));
    if (w.tick) st.tick = { covers: st.shown };
    if (w.lens) {
      const [acc] = lens.outcomes;
      const back = recs.find((r) => r.value === acc.body.join("\n")) ?? fail("no record carries the accepted edit");
      st.lens = { before: lens.rendered, after: v.input.lens.text,
        outcome: `accepted <code>${acc.accepted}</code> → emit ${L(back.id)}, <code>prev: [${back.prev.map(L).join(", ")}]</code>` };
    }
    return st;
  });
  return { records, steps };
}
