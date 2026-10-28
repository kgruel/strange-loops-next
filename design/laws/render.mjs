// The laws page, from design/laws/: each law as a sentence and a shape (laws.json, ours to
// write), joined to what the protocol says of it (protocol/laws.md), what proves it (the
// proof graph `lake exe proofs` writes, proofs.json) and what pins it (the vectors).
// Every join is checked: a law, theorem, vector or edge the page can't place fails the build.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { documentOf, fill, header } from "../page.mjs";
import { inline, lawEdges, lawTable, proofs, resolveTheorem, resolveVectors, slug, vectorFiles } from "../protocol.mjs";

const REPO = "https://github.com/kgruel/strange-loops-next/blob/main";
const NUMBER = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];
const count = (n) => NUMBER[n] ?? String(n);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const tail = (id) => `…${id.slice(-4)}`;
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const short = (s, n = 22) => (s.length > n ? `${s.slice(0, n - 8)}…${s.slice(-6)}` : s);

export function renderLaws(root) {
  const read = (...p) => readFileSync(join(root, "design", "laws", ...p), "utf8");
  const data = JSON.parse(read("laws.json"));
  const { rows, notes } = lawTable(root);
  const files = vectorFiles(root);
  const graph = proofs(root);
  const layers = JSON.parse(readFileSync(join(root, "design", "grammar", "words.json"), "utf8")).layers.map((l) => l.name);
  const fail = (msg) => { throw new Error(`laws: ${msg}`); };

  // Every row of laws.md has a sentence here, and nothing here lacks a row.
  const keys = new Set(rows.map((r) => r.key));
  for (const r of rows) if (!data.laws[r.key]) fail(`no entry in laws.json for ${r.key}`);
  for (const k of Object.keys(data.laws)) if (!keys.has(k)) fail(`laws.json has ${k}, which isn't a row of protocol/laws.md`);
  for (const [k, l] of Object.entries(data.laws)) {
    for (const f of Object.keys(l)) if (!["shape", "layer", "change", "stays", "says", "scope"].includes(f)) fail(`${k}: unknown key ${f}`);
    if (!data.shapes[l.shape]) fail(`${k}: unknown shape ${l.shape}`);
    if (!layers.includes(l.layer)) fail(`${k}: ${l.layer} isn't a layer on the grammar page`);
    const inv = l.shape === "invariance";
    if (inv !== Boolean(l.change && l.stays) || inv === Boolean(l.says)) fail(`${k}: an invariance says what changes and what stays; any other shape says its sentence`);
  }

  // Each theorem laws.md names is one declaration in the proof graph. A name that isn't one
  // is listed in notTheorems with why; one that becomes resolvable must leave the list.
  const resolved = new Map();
  const unresolved = new Set();
  for (const r of rows) {
    const ts = [];
    for (const t of r.theorems) {
      if (t.includes("/")) continue; // a file, as in "(`Laws/Order.lean`)"
      const n = resolveTheorem(t, graph);
      if (n) ts.push(n);
      else if (data.notTheorems[t]) unresolved.add(t);
      else fail(`${r.key}: ${t} is no theorem in proofs.json (run lake exe proofs, or list it in notTheorems)`);
    }
    resolved.set(r.key, ts);
  }
  for (const t of Object.keys(data.notTheorems))
    if (!unresolved.has(t)) fail(`notTheorems: ${t} is no longer named, or now resolves; take it off the list`);

  // The vectors each law cites, and the ones that name the law themselves.
  const cited = new Map(rows.map((r) => [r.key, resolveVectors(r.vectors, files)]));
  const nameOf = new Map(rows.flatMap((r) => r.names.map((n) => [n, r.key])));
  const naming = new Map(rows.map((r) => [r.key, []]));
  const usedTags = new Set();
  for (const [path, v] of files) for (const tag of v.laws ?? []) {
    if (nameOf.has(tag)) naming.get(nameOf.get(tag)).push(path);
    else if (data.vectorTags[tag]) usedTags.add(tag);
    else fail(`vector ${path} names ${tag}, which is no law in protocol/laws.md (or list it in vectorTags)`);
  }
  for (const t of Object.keys(data.vectorTags)) {
    if (nameOf.has(t)) fail(`vectorTags: ${t} is now a law; take it off the list`);
    if (!usedTags.has(t)) fail(`vectorTags: no vector names ${t}; take it off the list`);
  }

  // Who runs each vector.
  for (const impl of data.implementations) if (impl.checker) {
    const text = readFileSync(join(root, impl.checker), "utf8");
    for (const d of impl.dirs) if (!text.includes(`join(dir, "${d}")`)) fail(`${impl.checker} doesn't read vectors/${d}`);
  }
  const runBy = (paths) => data.implementations.filter((i) => paths.some((p) => i.dirs === "*" || i.dirs.includes(p.split("/")[0])));

  // Law to law, from the proofs. The stack only rests downward: a proof of a law uses
  // theorems of its own layer or the ones below it, never above.
  const edges = lawEdges(rows, graph, resolved);
  const depth = (k) => layers.indexOf(data.laws[k].layer);
  const upward = edges.filter(([a, b]) => depth(b) < depth(a));
  if (upward.length) fail(`a proof rests on a law above it: ${upward.map(([a, b]) => `${a} → ${b}`).join(", ")}`);
  const restsOn = new Map(rows.map((r) => [r.key, []])), carries = new Map(rows.map((r) => [r.key, []]));
  for (const [a, b] of edges) { restsOn.get(a).push(b); carries.get(b).push(a); }

  // Sentences.
  const sentence = (l) => l.shape === "invariance"
    ? `Change <span class="var">${l.change}</span>, and <span class="inv">${l.stays}</span> stays.`
    : l.says;
  const label = (r) => r.names.join(", ");
  const anchor = (k) => `law-${slug(k)}`;
  const lawLink = (k) => `<a class="lawref" href="#${anchor(k)}"><code>${esc(k)}</code></a>`;

  // The demos: a vector that names its law, the inputs it varies, and what the model gave.
  const demos = data.demos.map((d) => demo(d));
  function demo(d) {
    const v = files.get(d.vector) ?? fail(`demo ${d.law}: no vector ${d.vector}`);
    const row = rows.find((r) => r.names.includes(d.law)) ?? fail(`demo: no law ${d.law}`);
    if (!(v.laws ?? []).includes(d.law)) fail(`demo ${d.law}: ${d.vector} doesn't name ${d.law}`);
    const out = { law: d.law, key: row.key, anchor: anchor(row.key), vector: d.vector, change: d.change, stays: d.stays, shape: data.laws[row.key].shape };
    const rec = (r) => `<span class="rc${r.shown ? ` ${r.shown}` : ""}" data-k="${r.id}"><b>${tail(r.id)}</b>` +
      `<i>${r.shown ?? r.value}</i>${r.prev.length ? `<em>prev ${r.prev.map(tail).join(" ")}</em>` : ""}</span>`;
    const order = (o) => `<div class="rcs">${o.map(rec).join("")}</div>`;
    if (d.kind === "orders") {
      const os = v.input.orders;
      if (os.length < 2) fail(`demo ${d.law}: one order is nothing to vary`);
      // The same records, field for field, in each order: what varies is arrival alone.
      const asSet = (o) => [...o].sort((x, y) => (x.id < y.id ? -1 : x.id > y.id ? 1 : 0));
      if (!os.every((o) => same(asSet(o), asSet(os[0])))) fail(`demo ${d.law}: the orders aren't one set of records`);
      out.variants = os.map((o, i) => ({ label: `order ${i + 1} of ${os.length}`, html: order(o) }));
      out.answer = answerOf(d.vector, v.expect);
    } else if (d.kind === "repeats") {
      const a = files.get(d.against) ?? fail(`demo ${d.law}: no vector ${d.against}`);
      const ids = (vv) => [...new Set(vv.input.orders[0].map((r) => r.id))].sort();
      if (!same(ids(v), ids(a))) fail(`demo ${d.law}: ${d.vector} and ${d.against} aren't the same records`);
      if (same(v.expect, a.expect)) fail(`demo ${d.law}: a limit's answer must move`);
      out.variants = [
        { label: `each once (${d.against})`, html: order(a.input.orders[0]), answer: answerOf(d.against, a.expect) },
        { label: `delivered again (${d.vector})`, html: order(v.input.orders[0]), answer: answerOf(d.vector, v.expect) },
      ];
    } else if (d.kind === "envs") {
      if (v.input.envs.length < 2) fail(`demo ${d.law}: one envelope is nothing to vary`);
      // The spellings may differ only in what the canonical form removes: a set's order and repeats.
      const canon = (e) => Object.fromEntries(Object.entries(e).map(([k, x]) =>
        [k, ["about", "prev", "erases"].includes(k) ? [...new Set(x)].sort() : x]).sort(([a], [b]) => (a < b ? -1 : 1)));
      if (!v.input.envs.every((e) => same(canon(e), canon(v.input.envs[0])))) fail(`demo ${d.law}: the envelopes differ in more than a set's spelling`);
      out.variants = v.input.envs.map((e, i) => ({ label: `spelling ${i + 1} of ${v.input.envs.length}`,
        html: `<pre class="jv">about: [${e.about.map((x) => `<span data-k="${esc(x)}">${esc(x)}</span>`).join(", ")}]</pre>` }));
      out.answer = `<code>${short(v.expect.id, 30)}</code>`;
      out.note = `One id for every spelling: the envelope is written in its canonical form, sorted with repeats removed, before it is hashed. The JS writer computes the same id.`;
    } else if (d.kind === "lines") {
      for (const f of ["line", "erased_line"]) if (!v.expect[f].includes(`"id":"${v.expect.id}"`)) fail(`demo ${d.law}: ${f} doesn't carry the id`);
      const show = (line) => {
        const o = JSON.parse(line);
        return `<pre class="jv">${Object.keys(o).map((k) => `<span data-k="${k}">"${k}": ${esc(short(JSON.stringify(o[k]), 34))}</span>`).join("\n")}</pre>`;
      };
      out.variants = [{ label: "stored, payload held", html: show(v.expect.line) }, { label: "erased: the commitment kept", html: show(v.expect.erased_line) }];
      out.answer = `<code>${short(v.expect.id, 30)}</code>`;
      out.note = "Both lines are the vector's own; each carries this id. The id hashes the commitment, never the payload, so forgetting the opening can't move it.";
    } else if (d.kind === "spans") {
      const picked = d.pick.map((i) => [v.input.occurred[i], v.expect.spans[i]]);
      if (!picked.every(([, s]) => same(s, picked[0][1]))) fail(`demo ${d.law}: the picked texts don't read as one span`);
      out.variants = picked.map(([t], i) => ({ label: `spelling ${i + 1} of ${picked.length}`, html: `<pre class="jv big">${esc(t)}</pre>` }));
      out.answer = `<code>${picked[0][1].start}</code> → <code>${picked[0][1].end}</code>`;
    } else if (d.kind === "lens") {
      const sections = (ss) => `<pre class="jv">${ss.map((s) => `<span data-k="${esc(s.id)}"><b>${esc(s.id)}</b>  ${esc(s.body.filter(Boolean).join(" / "))}</span>`).join("\n")}</pre>`;
      const target = v.expect.outcomes.length ? v.expect.applied : v.expect.parsed;
      if (!same(target, v.input.base)) fail(`demo ${d.law}: what came back isn't the base`);
      out.variants = [
        { label: "the state", html: sections(v.input.base) },
        { label: "the text", html: `<pre class="jv">${v.input.text.map(esc).join("\n")}</pre>` },
      ];
      out.answer = sections(target);
      const absent = v.expect.outcomes.filter((o) => o.absent).map((o) => o.absent);
      out.note = absent.length
        ? `Parsing reports <code>${absent.join(", ")}</code> as absent, and applying changes nothing: the section is still there.`
        : "Parsing the render gives the sections back, exactly.";
    } else fail(`demo ${d.law}: unknown kind ${d.kind}`);
    return out;
  }
  function answerOf(path, e) {
    if (path.startsWith("fold/count/")) return `<span class="num">${e}</span>`;
    if (path.startsWith("fold/latest-by/")) return Object.entries(e).map(([thing, s]) =>
      `<span class="thing"><code>${thing}</code> heads ${s.heads.map(tail).join(" ")} · winner <b>${tail(s.winner)}</b></span>`).join("");
    if (path.startsWith("fold/view/")) return `<span class="thing">heads ${e.heads.map((h) => `<b>${tail(h.id)}</b>${h.shown ? ` (${h.shown})` : ""}`).join(" ")}</span>` +
      `<span class="thing">max ${e.max.value ?? "none"} · unread ${e.max.unread}</span>`;
    fail(`no answer for ${path}`);
  }

  // The page.
  const invariances = rows.filter((r) => data.laws[r.key].shape === "invariance");
  const shapeCount = (s) => rows.filter((r) => data.laws[r.key].shape === s).length;
  const first = data.laws[invariances[0].key];
  const opening = `    <p class="big-s" id="rotor"><span class="w">Change</span> <span class="slot var" id="rotor-change">${first.change}</span>, ` +
    `<span class="w">and</span> <span class="slot inv" id="rotor-stays">${first.stays}</span> <span class="w">stays.</span></p>\n` +
    `    <p class="rotor-law" id="rotor-law">${lawLink(invariances[0].key)}</p>\n` +
    `    <p class="rotor-ctl"><button type="button" id="rotor-next">Next law</button>` +
    `<button type="button" id="rotor-pause" aria-pressed="false">Pause</button></p>\n`;
  const lede = `  <p class="lede">${rows.length} laws, each a theorem Lean checks on every build, or a rule held by construction. ` +
    `Most say one thing: change this, and that stays. The rest take one of ${count(Object.keys(data.shapes).length - 1)} other shapes. ` +
    `Every sentence here is joined to the theorem that proves it, the vectors that pin it, and the laws its proof rests on.</p>\n`;

  const shapes = Object.entries(data.shapes).map(([id, s]) =>
    `    <div class="shape" data-shape="${id}"><p class="shape-h"><b>${s.name}</b><span>${shapeCount(id)}</span></p>` +
    `<p class="shape-t">${s.template}</p><p class="shape-g">${s.gist}</p></div>\n`).join("");
  const bar = `    <div class="bar" role="img" aria-label="${Object.entries(data.shapes).map(([id, s]) => `${s.name} ${shapeCount(id)}`).join(", ")}">` +
    Object.keys(data.shapes).map((id) => `<span class="seg-${id}" style="flex:${shapeCount(id)}" title="${data.shapes[id].name}: ${shapeCount(id)}"></span>`).join("") + "</div>\n";

  const theoremCount = new Set([...resolved.values()].flat()).size;
  const vectorCount = new Set([...cited.values()].flat()).size;
  const chain = [
    [rows.length, "laws", "rows of <code>protocol/laws.md</code>, each a sentence here"],
    [theoremCount, "theorems", "the declarations they name, found in the proofs Lean checked"],
    [vectorCount, "vectors", "the files they cite, every one found on disk"],
    [data.implementations.length, "implementations", data.implementations.map((i) => i.name).join(" and ")],
  ].map(([n, k, what]) => `    <div class="tile"><p class="tile-n">${n}</p><p class="tile-k">${k}</p><p class="tile-w">${what}</p></div>\n`).join('    <div class="tile-arrow" aria-hidden="true">→</div>\n');

  const demoCards = demos.map((d, i) =>
    `    <article class="demo${d.shape === "limit" ? " is-limit" : ""}" id="try-${slug(d.law)}" data-demo="${i}">\n` +
    `      <div class="demo-h"><a href="#${d.anchor}"><code>${d.law}</code></a><span class="chip">${data.shapes[d.shape].name}</span></div>\n` +
    `      <p class="demo-s">${sentence(data.laws[d.key])}</p>\n` +
    (data.laws[d.key].scope ? `      <p class="law-scope">${data.laws[d.key].scope}</p>\n` : "") +
    `      <div class="demo-in">${d.variants.map((x, j) => `<div class="variant" data-v="${j}"${j ? " hidden" : ""}><p class="variant-l">${x.label}</p>${x.html}</div>`).join("")}</div>\n` +
    `      <div class="demo-ctl"><button type="button" class="poke">${d.change} <span aria-hidden="true">↻</span></button></div>\n` +
    `      <div class="demo-out"><p class="out-l">${d.shape === "limit" ? `the ${d.stays} moves` : `the ${d.stays}`}</p>` +
    (d.answer ? `<div class="answer">${d.answer}</div>` : d.variants.map((x, j) => `<div class="answer" data-v="${j}"${j ? " hidden" : ""}>${x.answer}</div>`).join("")) +
    `</div>\n` +
    (d.note ? `      <p class="demo-n">${d.note}</p>\n` : "") +
    `      <p class="demo-src">from <a href="${REPO}/vectors/${d.vector}.json"><code>vectors/${d.vector}.json</code></a>, as the model wrote it</p>\n` +
    `    </article>\n`).join("");

  const demoOf = new Map(demos.map((d) => [d.key, d]));
  // A Vectors cell says more than its file names when words are left once the names are gone.
  const words = (cell) => /[a-z]/i.test(cell.replace(/`[^`]*`/g, ""));
  const fileLinks = (ps) => ps.map((p) => `<a href="${REPO}/vectors/${p}.json"><code>${p}</code></a>`).join(" ");
  const card = (r) => {
    const l = data.laws[r.key];
    const ts = resolved.get(r.key);
    const listed = cited.get(r.key);
    const extra = naming.get(r.key).filter((p) => !listed.includes(p));
    const impl = runBy([...listed, ...extra]);
    const theorems = ts.length
      ? ts.map((t) => `<details class="thm"><summary><code>${esc(t.replace(/^Loops\./, ""))}</code></summary>` +
        `<p class="thm-m">${graph[t].module}</p><pre>${esc(graph[t].states.replace(/\bLoops\./g, ""))}</pre></details>`).join("") +
        (r.theorems.filter((t) => data.notTheorems[t]).map((t) => ` <code class="not">${t}</code>`).join(""))
      : r.byConstruction ? "<span class=\"muted\">by construction: no theorem, pinned by vectors</span>" : "<span class=\"muted\">none named</span>";
    const many = listed.length > 6;
    return `    <article class="law${l.shape === "limit" ? " is-limit" : ""}" id="${anchor(r.key)}" data-shape="${l.shape}">\n` +
      `      <div class="law-h"><h4>${esc(label(r))}</h4><span class="chip">${data.shapes[l.shape].name}</span></div>\n` +
      `      <p class="law-s">${sentence(l)}</p>\n` +
      (l.scope ? `      <p class="law-scope">${l.scope}</p>\n` : "") +
      `      <p class="law-md"><span>laws.md</span> ${inline(r.says)}</p>\n` +
      `      <dl class="chain">\n` +
      `        <dt>proved by</dt><dd>${theorems}</dd>\n` +
      `        <dt>pinned by</dt><dd>${words(r.vectors) || !listed.length ? `<span>${inline(r.vectors)}</span>` : ""}${listed.length ? (many ? `<details><summary>${listed.length} files</summary>${fileLinks(listed)}</details>` : `<span class="files">${fileLinks(listed)}</span>`) : ""}` +
      (extra.length ? `<span class="files also">also naming it: ${fileLinks(extra)}</span>` : "") + `</dd>\n` +
      (impl.length ? `        <dt>run by</dt><dd>${impl.map((i) => i.name).join(", ")}</dd>\n` : "") +
      (restsOn.get(r.key).length ? `        <dt>rests on</dt><dd>${restsOn.get(r.key).map(lawLink).join(" ")}</dd>\n` : "") +
      (carries.get(r.key).length ? `        <dt>carries</dt><dd>${carries.get(r.key).map(lawLink).join(" ")}</dd>\n` : "") +
      `      </dl>\n` +
      (demoOf.has(r.key) ? `      <p class="law-try"><a href="#try-${slug(demoOf.get(r.key).law)}">Try to break it</a></p>\n` : "") +
      `    </article>\n`;
  };
  const byLayer = [...layers].reverse().map((layer) => {
    const rs = rows.filter((r) => data.laws[r.key].layer === layer);
    return `    <div class="layer-group" id="layer-${slug(layer)}">\n      <h3>${layer} <span>${rs.length ? `${rs.length} law${rs.length === 1 ? "" : "s"}` : "no laws yet"}</span></h3>\n` +
      (rs.length ? `      <div class="laws-grid">\n${rs.map(card).join("")}      </div>\n` : `      <p class="note">Nothing is built here yet, so nothing is proved.</p>\n`) +
      `    </div>\n`;
  }).join("");

  const connected = new Set(edges.flat());
  const alone = rows.filter((r) => !connected.has(r.key));
  const mapData = {
    layers,
    nodes: rows.filter((r) => connected.has(r.key)).map((r) => ({
      id: anchor(r.key), label: r.names[0] + (r.names.length > 1 ? " …" : ""), layer: data.laws[r.key].layer,
      shape: data.laws[r.key].shape, sentence: sentence(data.laws[r.key]),
    })),
    edges: edges.map(([a, b]) => [anchor(a), anchor(b)]),
  };
  const aloneNote = `    <p class="note">${alone.length} laws stand alone: their proofs use no other law's theorem. ${alone.map((r) => lawLink(r.key)).join(" ")}</p>\n`;

  const limits = rows.filter((r) => data.laws[r.key].shape === "limit").map((r) =>
    `      <div class="row"><div class="row-k">${lawLink(r.key)}</div><div class="row-v"><p>${data.laws[r.key].says}</p></div></div>\n`).join("");
  const bullets = (heading) => (notes[heading] ?? fail(`laws.md has no notes under ${heading}`)).map((b) => {
    const m = b.match(/^\*\*(.+?)\*\*\s*(.*)$/);
    return m ? `      <div class="row"><div class="row-k wide"><b>${inline(m[1])}</b></div><div class="row-v"><p>${inline(m[2])}</p></div></div>\n`
      : `      <div class="row"><div class="row-v"><p>${inline(b)}</p></div></div>\n`;
  }).join("");

  const top = header("laws", [["shapes", "Shapes"], ["try", "Try"], ["chain", "Chain"], ["map", "Map"], ["stop", "Limits"]]);
  let body = read("page.html");
  for (const [name, value] of Object.entries({
    header: top, lede, opening, shapes, bar, demos: demoCards, chain, laws: byLayer, "alone": aloneNote,
    limits, "no-promise": bullets("What these laws don't promise"), simplifications: bullets("Simplifications in the model"),
  })) body = fill(body, name, value);

  const rotor = invariances.map((r) => ({ change: data.laws[r.key].change, stays: data.laws[r.key].stays, link: lawLink(r.key) }));
  return documentOf(root, {
    head: read("head.html"),
    css: read("styles.css"),
    body,
    scripts: [`const ROTOR = ${JSON.stringify(rotor)};\nconst MAP = ${JSON.stringify(mapData)};\n`, read("app.js")],
  });
}

