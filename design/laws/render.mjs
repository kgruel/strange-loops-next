// The laws page, from design/laws/: each law as a sentence, under the question a reader
// would ask that it answers (laws.json), with the demos that let a reader try one. What
// proves and pins each law is on the evidence page (design/evidence/); both pages are built
// on join.mjs, which checks every join.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { documentOf, fill, header } from "../page.mjs";
import { inline, slug } from "../protocol.mjs";
import { REPO, anchor, esc, joinLaws, sentence } from "./join.mjs";

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const tail = (id) => `…${id.slice(-4)}`;
const short = (s, n = 22) => (s.length > n ? `${s.slice(0, n - 8)}…${s.slice(-6)}` : s);
// A sentence as an attribute: its marks dropped, its quotes escaped.
const plain = (html) => esc(html.replace(/<[^>]+>/g, "")).replace(/"/g, "&quot;");

export function renderLaws(root) {
  const read = (...p) => readFileSync(join(root, "design", "laws", ...p), "utf8");
  const { data, rows, notes, files, layers, fail, keyOf, bounds, tried, unpremised } = joinLaws(root);
  const law = (k) => data.laws[k];
  const lawLink = (k) => `<a class="lawref" href="#${anchor(k)}"><code>${esc(k)}</code></a>`;
  const mark = (shape) => `<span class="mk" aria-hidden="true">${data.shapes[shape].mark}</span>`;

  // The demos: a vector that names its law, the inputs it varies, and what the model gave.
  const demos = data.demos.map((d) => demo(d));
  function demo(d) {
    const v = files.get(d.vector) ?? fail(`demo ${d.law}: no vector ${d.vector}`);
    const key = keyOf(d.law, "demo");
    if (!(v.laws ?? []).includes(d.law)) fail(`demo ${d.law}: ${d.vector} doesn't name ${d.law}`);
    const out = { law: d.law, key, anchor: anchor(key), vector: d.vector, change: d.change, stays: d.stays, shape: law(key).shape };
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

  const demoCard = (d, i) =>
    `    <article class="demo${d.shape === "limit" ? " is-limit" : ""}" id="try-${slug(d.law)}" data-demo="${i}">\n` +
    `      <div class="demo-h"><a href="#${d.anchor}"><code>${d.law}</code></a><span class="chip">${data.shapes[d.shape].name}</span></div>\n` +
    `      <p class="demo-s">${sentence(law(d.key))}</p>\n` +
    (law(d.key).scope ? `      <p class="law-scope">${law(d.key).scope}</p>\n` : "") +
    `      <div class="demo-in">${d.variants.map((x, j) => `<div class="variant" data-v="${j}"${j ? " hidden" : ""}><p class="variant-l">${x.label}</p>${x.html}</div>`).join("")}</div>\n` +
    `      <div class="demo-ctl"><button type="button" class="poke">${d.change} <span aria-hidden="true">↻</span></button></div>\n` +
    `      <div class="demo-out"><p class="out-l">${d.shape === "limit" ? `the ${d.stays} moves` : `the ${d.stays}`}</p>` +
    (d.answer ? `<div class="answer">${d.answer}</div>` : d.variants.map((x, j) => `<div class="answer" data-v="${j}"${j ? " hidden" : ""}>${x.answer}</div>`).join("")) +
    `</div>\n` +
    (d.note ? `      <p class="demo-n">${d.note}</p>\n` : "") +
    `      <p class="demo-src">from <a href="${REPO}/vectors/${d.vector}.json"><code>vectors/${d.vector}.json</code></a>, as the model wrote it</p>\n` +
    `    </article>\n`;

  // Without the premise: each case asks the model the same question with the premise and without it.
  const boundCard = (c, i) => {
    const key = keyOf(c.law, "boundaries"), l = law(key);
    const side = (x) => ({ html: `<p class="given">${esc(x.given)}</p>`, answer: `<span class="said">${esc(x.answer)}</span>` });
    const vs = [side(c.holds), side(c.removed)];
    return `    <article class="demo is-boundary" id="without-${slug(c.law)}" data-demo="b${i}">\n` +
      `      <div class="demo-h"><a href="#${anchor(key)}"><code>${esc(c.law)}</code></a><span class="chip">${data.shapes[l.shape].name}</span></div>\n` +
      `      <p class="premise"><span>premise</span> ${esc(c.premise)}</p>\n` +
      `      <p class="demo-s">${sentence(l)}</p>\n` +
      `      <div class="demo-in">${vs.map((x, j) => `<div class="variant" data-v="${j}"${j ? " hidden" : ""}><p class="variant-l">${j ? "premise removed" : "premise holds"}</p>${x.html}</div>`).join("")}</div>\n` +
      `      <div class="demo-ctl"><button type="button" class="poke">Remove the premise, or put it back <span aria-hidden="true">↻</span></button></div>\n` +
      `      <div class="demo-out"><p class="out-l">what the model gives</p>${vs.map((x, j) => `<div class="answer${j ? " moved" : ""}" data-v="${j}"${j ? " hidden" : ""}>${x.answer}</div>`).join("")}</div>\n` +
      `      <p class="demo-n">${esc(c.input[0].toUpperCase() + c.input.slice(1))}.</p>\n` +
      `      <p class="demo-src">from <code>design/laws/boundaries.json</code>, written by <code>lake exe boundaries</code></p>\n` +
      `    </article>\n`;
  };

  // The page opens on one sentence, then the whole at once, then each question in turn.
  const questions = Object.entries(data.questions);
  const shapes = Object.entries(data.shapes);
  const answering = (q) => rows.filter((r) => law(r.key).question === q);
  const qOrder = (r) => questions.findIndex(([q]) => q === law(r.key).question);
  const shapeCount = (s) => rows.filter((r) => law(r.key).shape === s).length;

  const lede = `  <p class="lede">${rows.length} laws, each a theorem Lean checks on every build, or a rule held by construction. ` +
    `They are grouped here by the question they answer, in plain sentences. ` +
    `What proves each one, the vectors that pin it and what its proof rests on are on <a href="../evidence/">the evidence page</a>.</p>\n`;

  // The sentence: the invariances, one at a time, stepped by the reader and never by a timer.
  const invariances = rows.filter((r) => law(r.key).shape === "invariance");
  const first = law(invariances[0].key);
  const opening = `    <p class="big-s" id="rotor" aria-live="polite"><span class="w">Change</span> <span class="slot var" id="rotor-change">${first.change}</span>, ` +
    `<span class="w">and</span> <span class="slot inv" id="rotor-stays">${first.stays}</span> <span class="w">stays.</span></p>\n` +
    `    <p class="rotor-law" id="rotor-law">${lawLink(invariances[0].key)}</p>\n` +
    `    <p class="rotor-ctl"><button type="button" id="rotor-prev">Previous</button>` +
    `<span class="rotor-at" id="rotor-at">1 of ${invariances.length}</span><button type="button" id="rotor-next">Next</button></p>\n`;

  // The overview: every law as a chip on its layer's row, marked with its shape. A shape is a
  // link to itself, so without scripts :target picks its laws out; with them it is a toggle.
  const filters = `    <p class="filters" role="group" aria-label="Pick out one shape">` +
    `<a class="sf all" href="#overview" data-shape=""><b>All</b><span class="n">${rows.length}</span></a>` +
    shapes.map(([id, s]) => `<a class="sf" id="shape-${id}" href="#shape-${id}" data-shape="${id}">${mark(id)}<b>${s.name}</b>` +
      `<span class="n">${shapeCount(id)}</span></a>`).join("") + "</p>\n";
  const shapeKey = shapes.map(([id, s]) =>
    `      <div data-shape="${id}"${id === "limit" ? ' class="is-limit"' : ""}><dt>${mark(id)}${s.name}</dt><dd>${s.template}</dd></div>\n`).join("");
  const chip = (r) => {
    const l = law(r.key);
    return `<a class="lc${l.shape === "limit" ? " is-limit" : ""}" href="#${anchor(r.key)}" data-shape="${l.shape}" title="${plain(sentence(l))}">` +
      `${mark(l.shape)}${esc(r.key)}<span class="sr">, ${data.shapes[l.shape].name}</span></a>`;
  };
  const overview = layers.map((layer) => {
    const rs = rows.filter((r) => law(r.key).layer === layer).sort((a, b) => qOrder(a) - qOrder(b));
    return `      <div class="ov-row"><p class="ov-l">${layer}<span>${rs.length || ""}</span></p>` +
      `<div class="ov-chips">${rs.length ? rs.map(chip).join("") : '<span class="ov-none">nothing built here yet, so nothing proved</span>'}</div></div>\n`;
  }).join("");
  const questionIndex = questions.map(([q, text]) =>
    `      <li><a href="#q-${q}">${text}</a><span>${answering(q).length}</span></li>\n`).join("");

  // A question, its laws as sentences, and the demos of those laws.
  const entry = (r) => {
    const l = law(r.key);
    const links = [`<a href="../evidence/#${anchor(r.key)}">Evidence</a>`,
      tried.has(r.key) ? `<a href="#try-${slug(tried.get(r.key))}">Try it</a>` : "",
      unpremised.has(r.key) ? `<a href="#without-${slug(unpremised.get(r.key))}">Without its premise</a>` : ""].filter(Boolean);
    return `      <li class="q-law${l.shape === "limit" ? " is-limit" : ""}" id="${anchor(r.key)}" data-shape="${l.shape}">\n` +
      `        <p class="q-s">${sentence(l)}</p>\n` +
      (l.scope ? `        <p class="law-scope">${l.scope}</p>\n` : "") +
      `        <p class="q-f"><span class="q-shape">${mark(l.shape)}${data.shapes[l.shape].name}</span><code>${esc(r.key)}</code><span class="q-go">${links.join("")}</span></p>\n` +
      `      </li>\n`;
  };
  const section = ([q, text], i) => {
    const rs = answering(q);
    const ds = demos.filter((d) => law(d.key).question === q);
    const bs = bounds.map((c, k) => [c, k]).filter(([c]) => law(keyOf(c.law, "boundaries")).question === q);
    const tally = shapes.map(([id, s]) => [id, s, rs.filter((r) => law(r.key).shape === id).length]).filter(([, , n]) => n)
      .map(([id, s, n]) => `<span>${mark(id)}${s.name} ${n}</span>`).join("");
    return `<section class="wrap block q" id="q-${q}" aria-labelledby="h-q-${q}">\n` +
      `  <div class="side">\n    <p class="q-k">Question ${i + 1} of ${questions.length}</p>\n    <h2 id="h-q-${q}">${text}</h2>\n` +
      `    <p class="q-tally"><span>${rs.length} law${rs.length === 1 ? "" : "s"}:</span>${tally}</p>\n  </div>\n` +
      `  <div class="stack">\n    <ol class="q-laws">\n${rs.map(entry).join("")}    </ol>\n` +
      (ds.length ? `    <h3>Try to break it</h3>\n    <p class="note">Vectors the model wrote: the button varies what the law lets vary, and the answer is the one the model computed for each variant. Nothing is computed in your browser.</p>\n` +
        `    <div class="demos">\n${ds.map((d) => demoCard(d, demos.indexOf(d))).join("")}    </div>\n` : "") +
      (bs.length ? `    <h3>Without the premise</h3>\n    <p class="note">The model asked the same question with the law's premise and without it. Some of these inputs are ones the protocol never produces; each card says which.</p>\n` +
        `    <div class="demos">\n${bs.map(([c, k]) => boundCard(c, k)).join("")}    </div>\n` : "") +
      `  </div>\n</section>\n`;
  };

  const bullets = (heading) => (notes[heading] ?? fail(`laws.md has no notes under ${heading}`)).map((b) => {
    const m = b.match(/^\*\*(.+?)\*\*\s*(.*)$/);
    return m ? `      <div class="row"><div class="row-k wide"><b>${inline(m[1])}</b></div><div class="row-v"><p>${inline(m[2])}</p></div></div>\n`
      : `      <div class="row"><div class="row-v"><p>${inline(b)}</p></div></div>\n`;
  }).join("");

  const top = header("laws", [["sentence", "Sentence"], ["overview", "Overview"], ["questions", "Questions"], ["stop", "Edges"]]);
  let body = read("page.html");
  for (const [name, value] of Object.entries({
    header: top, lede, opening, filters, overview, "shape-key": shapeKey, "question-index": questionIndex, questions: questions.map(section).join("\n"),
    "no-promise": bullets("What these laws don't promise"), simplifications: bullets("Simplifications in the model"),
  })) body = fill(body, name, value);

  const rotor = invariances.map((r) => ({ change: law(r.key).change, stays: law(r.key).stays, link: lawLink(r.key) }));
  return documentOf(root, {
    head: read("head.html"),
    css: read("sentence.css") + read("styles.css"),
    body,
    scripts: [`const ROTOR = ${JSON.stringify(rotor)};\n`, read("app.js")],
  });
}
