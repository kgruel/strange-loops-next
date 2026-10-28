// The laws page, from design/laws/: each law as a sentence, under the question a reader
// would ask that it answers (laws.json), with the demos that let a reader try one. What
// proves and pins each law is on the evidence page (design/evidence/); both pages are built
// on join.mjs, which checks every join.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { documentOf, fill, header } from "../page.mjs";
import { inline, slug } from "../protocol.mjs";
import { REPO, anchor, esc, joinLaws, sentence } from "./join.mjs";
import { shapeFigure } from "./shapes.mjs";

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const short = (s, n = 22) => (s.length > n ? `${s.slice(0, n - 8)}…${s.slice(-6)}` : s);
// A sentence as an attribute: its marks dropped, its quotes escaped.
const plain = (html) => esc(html.replace(/<[^>]+>/g, "")).replace(/"/g, "&quot;");

export function renderLaws(root) {
  const read = (...p) => readFileSync(join(root, "design", "laws", ...p), "utf8");
  const { data, rows, notes, files, layers, fail, keyOf, bounds, tried, unpremised } = joinLaws(root);
  const law = (k) => data.laws[k];
  const lawLink = (k) => `<a class="lawref" href="#${anchor(k)}"><code>${esc(k)}</code></a>`;
  const mark = (shape) => `<span class="mk" aria-hidden="true">${data.shapes[shape].mark}</span>`;

  // Records are lettered as the grammar page's walk letters them: the one written first is A,
  // then B, C, by `emitted` and then by id. Arrival order is what a card varies, so it can't
  // be what names a record. (The records here are all in UTC, so their text sorts as time.)
  const lettering = (...vs) => {
    const byId = new Map(vs.flatMap((v) => v.input.orders.flat()).map((r) => [r.id, r]));
    const recs = [...byId.values()];
    if (recs.some((r) => !r.emitted.endsWith("Z"))) fail("a demo's records aren't all in UTC, so their text doesn't sort as time");
    if (recs.length > 26) fail("a demo with more records than letters");
    recs.sort((x, y) => (x.emitted < y.emitted ? -1 : x.emitted > y.emitted ? 1 : x.id < y.id ? -1 : 1));
    const L = new Map(recs.map((r, i) => [r.id, "ABCDEFGHIJKLMNOPQRSTUVWXYZ"[i]]));
    return (id) => L.get(id) ?? fail(`no record ${id} in the demo's vector`);
  };
  const heads = (label, ids) => ids.map(label).sort().join(" ");

  // The demos: a vector that names its law, the inputs it varies, and what the model gave. Each
  // variant has what is shown (html), the model's answer to it (said) and the name it goes by in
  // the trail; `done` is what the card may say once every variant the vector holds has been shown.
  const demos = data.demos.map((d) => demo(d));
  function demo(d) {
    const v = files.get(d.vector) ?? fail(`demo ${d.law}: no vector ${d.vector}`);
    const key = keyOf(d.law, "demo");
    if (!(v.laws ?? []).includes(d.law)) fail(`demo ${d.law}: ${d.vector} doesn't name ${d.law}`);
    const out = { law: d.law, key, anchor: anchor(key), vector: d.vector, change: d.change, stays: d.stays, shape: law(key).shape };
    // A record as the walk draws one: its letter and when it was written, its value, and the
    // thing it is about and what it follows. The full id is its title and never its name.
    const rec = (label, r, again) => {
      const thing = r.about.map((a) => a.replace(/^[a-z]+:/, "")).join(", ");
      const after = r.prev.length ? ` · after ${heads(label, r.prev)}` : "";
      return `<div class="rec${r.shown ? ` ${r.shown}` : ""}" data-k="${label(r.id)}" title="${esc(r.id)}">` +
        `<div class="rid"><b>${label(r.id)}</b><span>${r.emitted.slice(11, 19)}</span></div>` +
        `<div class="val${r.shown ? ` ${r.shown}` : ""}">${r.shown ?? esc(r.value)}</div>` +
        `<div class="tag">${again ? "again · " : ""}${esc(thing)}${after}</div></div>`;
    };
    const order = (label, o) => {
      const seen = new Set();
      return `<div class="rcs">${o.map((r) => { const again = seen.has(r.id); seen.add(r.id); return rec(label, r, again); }).join("")}</div>`;
    };
    if (d.kind === "orders") {
      const os = v.input.orders;
      if (os.length < 2) fail(`demo ${d.law}: one order is nothing to vary`);
      // The same records, field for field, in each order: what varies is arrival alone.
      const asSet = (o) => [...o].sort((x, y) => (x.id < y.id ? -1 : x.id > y.id ? 1 : 0));
      if (!os.every((o) => same(asSet(o), asSet(os[0])))) fail(`demo ${d.law}: the orders aren't one set of records`);
      const label = lettering(v);
      const a = answerOf(d.vector, v.expect, label);
      out.variants = os.map((o, i) => ({ label: `order ${i + 1} of ${os.length}`, key: `order ${i + 1}`, html: order(label, o), said: a.said }));
      out.answer = a.html;
      out.done = d.done ? d.done.replace("{n}", `all ${os.length}`) : `Same ${d.stays} for all ${os.length} orders the vector holds.`;
      if (d.note) out.note = d.note;
      // A quoted sentence is in the file it is quoted from, word for word.
      if (d.quote && !readFileSync(join(root, d.quote.file), "utf8").replace(/\s+/g, " ").includes(d.quote.text)) fail(`demo ${d.law}: ${d.quote.file} no longer says "${d.quote.text}"`);
    } else if (d.kind === "repeats") {
      const a = files.get(d.against) ?? fail(`demo ${d.law}: no vector ${d.against}`);
      const ids = (vv) => [...new Set(vv.input.orders[0].map((r) => r.id))].sort();
      if (!same(ids(v), ids(a))) fail(`demo ${d.law}: ${d.vector} and ${d.against} aren't the same records`);
      if (same(v.expect, a.expect)) fail(`demo ${d.law}: a limit's answer must move`);
      const label = lettering(v, a);
      const once = answerOf(d.against, a.expect, label), twice = answerOf(d.vector, v.expect, label);
      out.variants = [
        { label: `each once`, key: "each once", html: order(label, a.input.orders[0]), answer: once.html, said: once.said },
        { label: `delivered again`, key: "delivered again", html: order(label, v.input.orders[0]), answer: twice.html, said: twice.said },
      ];
      out.done = `On this vector the ${d.stays} moves, ${once.said} to ${twice.said}.`;
    } else if (d.kind === "envs") {
      if (v.input.envs.length < 2) fail(`demo ${d.law}: one envelope is nothing to vary`);
      // The spellings may differ only in what the canonical form removes: a set's order and repeats.
      const canon = (e) => Object.fromEntries(Object.entries(e).map(([k, x]) =>
        [k, ["about", "prev", "erases"].includes(k) ? [...new Set(x)].sort() : x]).sort(([a], [b]) => (a < b ? -1 : 1)));
      if (!v.input.envs.every((e) => same(canon(e), canon(v.input.envs[0])))) fail(`demo ${d.law}: the envelopes differ in more than a set's spelling`);
      const id = `<code title="${esc(v.expect.id)}">${short(v.expect.id, 30)}</code>`;
      out.variants = v.input.envs.map((e, i) => ({ label: `record A, spelling ${i + 1} of ${v.input.envs.length}`, key: `spelling ${i + 1}`, said: `id ${id}`,
        html: `<div class="rcs"><div class="rec" data-k="A"><div class="rid"><b>A</b><span>${esc(e.emitted.slice(11, 19))}</span></div>` +
          `<div class="val">${esc(e.kind)}</div><div class="tag">about</div></div>` +
          `<pre class="jv">[${e.about.map((x) => `<span data-k="${esc(x)}">${esc(x)}</span>`).join(", ")}]</pre></div>` }));
      out.answer = `id ${id}`;
      out.done = `Same id for all ${v.input.envs.length} spellings the vector holds.`;
      out.note = `One id for every spelling: the envelope is written in its canonical form, sorted with repeats removed, before it is hashed. The JS writer computes the same id.`;
    } else if (d.kind === "lines") {
      for (const f of ["line", "erased_line"]) if (!v.expect[f].includes(`"id":"${v.expect.id}"`)) fail(`demo ${d.law}: ${f} doesn't carry the id`);
      const show = (line) => {
        const o = JSON.parse(line);
        return `<pre class="jv">${Object.keys(o).map((k) => `<span data-k="${k}">"${k}": ${esc(short(JSON.stringify(o[k]), 34))}</span>`).join("\n")}</pre>`;
      };
      const id = `<code title="${esc(v.expect.id)}">${short(v.expect.id, 30)}</code>`;
      out.variants = [
        { label: "record A, stored, payload held", key: "payload held", html: show(v.expect.line), said: `id ${id}` },
        { label: "record A, erased: the commitment kept", key: "payload erased", html: show(v.expect.erased_line), said: `id ${id}` },
      ];
      out.answer = `id ${id}`;
      out.done = "Same id for both lines the vector holds.";
      out.note = "Both lines are the vector's own; each carries this id. The id hashes the commitment, never the payload, so forgetting the opening can't move it.";
    } else if (d.kind === "spans") {
      const picked = d.pick.map((i) => [v.input.occurred[i], v.expect.spans[i]]);
      if (!picked.every(([, s]) => same(s, picked[0][1]))) fail(`demo ${d.law}: the picked texts don't read as one span`);
      const span = `<code>${picked[0][1].start}</code> → <code>${picked[0][1].end}</code>`;
      out.variants = picked.map(([t], i) => ({ label: `spelling ${i + 1} of ${picked.length}`, key: `spelling ${i + 1}`, html: `<pre class="jv big">${esc(t)}</pre>`, said: span }));
      out.answer = span;
      out.done = `Same span for all ${picked.length} spellings this card picks from the vector.`;
    } else if (d.kind === "lens") {
      const ids = (ss) => ss.map((s) => s.id).join(", ");
      const sections = (ss) => `<pre class="jv">${ss.map((s) => `<span data-k="${esc(s.id)}"><b>${esc(s.id)}</b>  ${esc(s.body.filter(Boolean).join(" / "))}</span>`).join("\n")}</pre>`;
      const target = v.expect.outcomes.length ? v.expect.applied : v.expect.parsed;
      if (!same(target, v.input.base)) fail(`demo ${d.law}: what came back isn't the base`);
      const absent = v.expect.outcomes.filter((o) => o.absent).map((o) => o.absent);
      out.variants = [
        { label: "the state", key: "the state", html: sections(v.input.base), said: `<code>${esc(ids(v.input.base))}</code>` },
        { label: "the text", key: "the text, parsed", html: `<pre class="jv">${v.input.text.map(esc).join("\n")}</pre>`,
          said: `<code>${esc(ids(v.expect.parsed))}</code>${absent.length ? ` · absent <code>${absent.join(", ")}</code>` : ""}` },
      ];
      out.answer = sections(target);
      out.done = absent.length
        ? `Parsing reports ${absent.map((a) => `<code>${a}</code>`).join(", ")} as absent, and applying changes nothing: the section is still there.`
        : "Parsing the render gives the sections back, exactly.";
    } else fail(`demo ${d.law}: unknown kind ${d.kind}`);
    return out;
  }
  // The model's answer in the records' letters: as a box (html) and as a line for the trail (said).
  function answerOf(path, e, label) {
    if (path.startsWith("fold/count/")) return { html: `<span class="num">${e}</span>`, said: String(e) };
    if (path.startsWith("fold/latest-by/")) return {
      html: Object.entries(e).map(([thing, s]) => `<span class="thing"><code>${thing}</code> heads ${heads(label, s.heads)} · winner <b>${label(s.winner)}</b></span>`).join(""),
      said: Object.entries(e).map(([thing, s]) => `heads ${heads(label, s.heads)}, winner ${label(s.winner)}`).join("; "),
    };
    if (path.startsWith("fold/view/")) {
      const hs = e.heads.map((h) => `${label(h.id)}${h.shown ? ` (${h.shown})` : ""}`).sort().join(" ");
      return { html: `<span class="thing">heads <b>${hs}</b></span><span class="thing">max ${e.max.value ?? "none"} · unread ${e.max.unread}</span>`,
        said: `heads ${hs}, max ${e.max.value ?? "none"}, unread ${e.max.unread}` };
    }
    fail(`no answer for ${path}`);
  }

  // Without the premise: each case asks the model the same question with the premise and without
  // it. A case whose law has a demo goes on that demo's card; any other has a card of its own.
  const attached = new Map(), alone = [];
  bounds.forEach((c) => {
    const key = keyOf(c.law, "boundaries");
    const at = demos.findIndex((d) => d.key === key);
    if (at >= 0) attached.set(at, c); else alone.push(c);
  });
  const premise = (c, id) => {
    const label = c.input[0].toUpperCase() + c.input.slice(1);
    return { c, label,
      note: `<p class="premise"${id ? ` id="without-${slug(c.law)}"` : ""} data-boundary="${esc(c.law)}"><span>premise</span> ${esc(c.premise)}</p>\n`,
      ctl: `<button type="button" class="unpremise" aria-pressed="false">Remove the premise</button>`,
      gone: `<li class="gone"><span class="t-k">premise removed</span>: <span class="t-v">${esc(c.removed.answer)}</span>` +
        ` <span class="t-n">Asked of: ${esc(c.removed.given)}. With the premise: ${esc(c.holds.answer)}.</span>` +
        ` <span class="t-in">${esc(label)}</span></li>` };
  };

  const figure = (key) => `      <div class="demo-fig">${shapeFigure(law(key).shape, { ...law(key), key })}</div>\n`;
  const trailOf = (items, done) =>
    `      <ol class="trail" aria-label="What this card has shown" aria-live="polite">${items.join("")}</ol>\n` +
    (done ? `      <p class="trail-done">${done}</p>\n` : "");

  const demoCard = (d, i) => {
    const p = attached.has(i) ? premise(attached.get(i), true) : null;
    return `    <article class="demo${d.shape === "limit" ? " is-limit" : ""}" id="try-${slug(d.law)}" data-demo="${i}">\n` +
      `      <p class="demo-s">${sentence(law(d.key))}</p>\n` +
      (law(d.key).scope ? `      <p class="law-scope">${law(d.key).scope}</p>\n` : "") +
      figure(d.key) +
      `      <div class="demo-in">${d.variants.map((x, j) => `<div class="variant" data-v="${j}"><p class="variant-l">${x.label}</p>${x.html}</div>`).join("")}</div>\n` +
      `      <div class="demo-ctl"><button type="button" class="poke">${d.change} <span aria-hidden="true">↻</span></button>${p ? p.ctl : ""}</div>\n` +
      (p ? "      " + p.note : "") +
      `      <div class="demo-out"><p class="out-l">${d.shape === "limit" ? `the ${d.stays} moves` : `the ${d.stays}`}</p>` +
      (d.answer ? `<div class="answer">${d.answer}</div>` : d.variants.map((x, j) => `<div class="answer" data-v="${j}">${x.answer}</div>`).join("")) +
      `</div>\n` +
      trailOf([...d.variants.map((x, j) => `<li data-v="${j}"><span class="t-k">${x.key}</span>: <span class="t-v">${x.said}</span></li>`), ...(p ? [p.gone] : [])], d.done) +
      (d.note ? `      <p class="demo-n">${d.note}</p>\n` : "") +
      `      <p class="demo-src"><a href="#${d.anchor}"><code>${d.law}</code></a>, from <a href="${REPO}/vectors/${d.vector}.json"><code>vectors/${d.vector}.json</code></a> as the model wrote it</p>\n` +
      `    </article>\n`;
  };

  const boundCard = (c) => {
    const key = keyOf(c.law, "boundaries"), l = law(key), p = premise(c);
    const sides = [["premise holds", c.holds], ["premise removed", c.removed]];
    return `    <article class="demo is-compact" id="without-${slug(c.law)}" data-demo="b-${slug(c.law)}">\n` +
      `      <p class="demo-s">${sentence(l)}</p>\n` +
      (l.scope ? `      <p class="law-scope">${l.scope}</p>\n` : "") +
      figure(key) +
      `      <div class="demo-in">${sides.map(([k, x], j) => `<div class="variant" data-v="${j}"><p class="variant-l">${k}</p><p class="given">${esc(x.given)}</p></div>`).join("")}</div>\n` +
      `      <div class="demo-ctl">${p.ctl}</div>\n` +
      "      " + p.note +
      trailOf([`<li data-v="0"><span class="t-k">premise holds</span>: <span class="t-v">${esc(c.holds.answer)}</span></li>`, p.gone]) +
      `      <p class="demo-src"><a href="#${anchor(key)}"><code>${esc(c.law)}</code></a>, from <code>design/laws/boundaries.json</code>, written by <code>lake exe boundaries</code></p>\n` +
      `    </article>\n`;
  };

  // The page opens on one sentence, then the whole at once, then each question in turn.
  const questions = Object.entries(data.questions);
  const shapes = Object.entries(data.shapes);
  const answering = (q) => rows.filter((r) => law(r.key).question === q);
  const qOrder = (r) => questions.findIndex(([q]) => q === law(r.key).question);
  const shapeCount = (s) => rows.filter((r) => law(r.key).shape === s).length;

  const lede = `  <p class="lede">${rows.length} laws, each a theorem Lean checks on every build, or a rule held by construction, or, where its card says so, partly pinned by vectors instead of proved. ` +
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
    `      <div data-shape="${id}"${id === "limit" ? ' class="is-limit"' : ""}><div class="sk-fig">${shapeFigure(id)}</div><p class="sk-n">${mark(id)}${s.name}</p><p class="sk-t">${s.template}</p></div>\n`).join("");
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
    const ds = demos.map((d, i) => [d, i]).filter(([d]) => law(d.key).question === q);
    const bs = alone.filter((c) => law(keyOf(c.law, "boundaries")).question === q);
    const tally = shapes.map(([id, s]) => [id, s, rs.filter((r) => law(r.key).shape === id).length]).filter(([, , n]) => n)
      .map(([id, s, n]) => `<span>${mark(id)}${s.name} ${n}</span>`).join("");
    return `<section class="wrap block q" id="q-${q}" aria-labelledby="h-q-${q}">\n` +
      `  <div class="side">\n    <p class="q-k">Question ${i + 1} of ${questions.length}</p>\n    <h2 id="h-q-${q}">${text}</h2>\n` +
      `    <p class="q-tally"><span>${rs.length} law${rs.length === 1 ? "" : "s"}:</span>${tally}</p>\n  </div>\n` +
      `  <div class="stack">\n` + (data.questionNotes[q] ? `    <p class="note q-note">${data.questionNotes[q]}</p>\n` : "") + `    <ol class="q-laws">\n${rs.map(entry).join("")}    </ol>\n` +
      (ds.length || bs.length ? `    <h3>Try to break it</h3>\n    <p class="note">Each card is the model's own output: a vector it wrote, or, for a premise, a case <code>lake exe boundaries</code> writes. With scripts on, a button varies what the law lets vary, and the trail keeps the answer the model gave for each variant shown. Where a law has a premise, a second button takes it away and adds what the model says then; some of those inputs are ones the protocol doesn't produce, and each says whether it is one. Without scripts, a card lists every variant and every answer. Nothing is computed in your browser.</p>\n` +
        `    <div class="demos">\n${ds.map(([d, i]) => demoCard(d, i)).join("")}${bs.map(boundCard).join("")}    </div>\n` : "") +
      `  </div>\n</section>\n`;
  };

  const bullets = (heading) => (notes[heading] ?? fail(`laws.md has no notes under ${heading}`)).map((b) => {
    const m = b.match(/^\*\*(.+?)\*\*\s*(.*)$/);
    return m ? `      <div class="row"><div class="row-k wide"><b>${inline(m[1])}</b></div><div class="row-v"><p>${inline(m[2])}</p></div></div>\n`
      : `      <div class="row"><div class="row-v"><p>${inline(b)}</p></div></div>\n`;
  }).join("");

  const top = header("laws", [["sentence", "Sentence"], ["overview", "Overview"], ["questions", "Questions"], ["stop", "Edges"]]);
  let body = read("page.html");
  // Every boundary case is on the page, on its law's card or on one of its own: read off the
  // page as built, so a card that goes missing can't pass for one that was drawn.
  const asked = questions.map(section).join("\n");
  for (const c of bounds) if (!asked.includes(`data-boundary="${esc(c.law)}"`)) fail(`boundaries.json: ${c.law} is on no card; every case must be shown`);
  for (const [name, value] of Object.entries({
    header: top, lede, opening, filters, overview, "shape-key": shapeKey, "question-index": questionIndex, questions: asked,
    "no-promise": bullets("What these laws don't promise"), simplifications: bullets("Simplifications in the model"),
  })) body = fill(body, name, value);

  const rotor = invariances.map((r) => ({ change: law(r.key).change, stays: law(r.key).stays, link: lawLink(r.key) }));
  return documentOf(root, {
    head: read("head.html"),
    css: read("sentence.css") + read("shapes.css") + read("styles.css"),
    body,
    scripts: [`const ROTOR = ${JSON.stringify(rotor)};\n`, read("shapes.js"), read("app.js")],
  });
}
