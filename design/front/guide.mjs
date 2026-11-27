// GUIDE.md uses ordinary headings, lists, tables and fenced examples. A standalone
// <!-- guide:NAME --> opens a component; <!-- guide:end --> closes the innermost one.
// Inside a paragraph, <!-- guide:hint append="..." --> adds a sentence in the view.
// With replace="...", the hint takes the place of the preceding Markdown line.
// stepper: numbered steps, their commands, record cards and final field reading.
// sets: one heading, records table, reading and explanation per case.
// shapes: one heading, description and examples table per shape.
// diagram headsfig/judgefig/turnfig/wordings: a diagram's description, labels and caption.
// envelope: the envelope and payload side by side. more: a disclosure headed by its summary.
// annotated members/spec: a named JSON file, its introduction and its member notes.
// book sources/draft/fork/settled/null/final: the walk beside the book at that point.
// questions: one tab per fourth-level heading, including the wording diagram in its answer.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { REPO } from "../laws/join.mjs";
import { guideComponent, guideHint, inline } from "../decisions/markdown.mjs";

export const guideConstants = [
  "G_FIRST", "G_STEP_NOTES", "G_SETS", "G_SHAPES", "G_SHAPE_KINDS", "G_SHAPE_LABELS",
  "G_ANNOT", "G_DIAGRAMS", "P11", "P12a", "P12b", "P12c", "P12s", "P21", "G_BOOK", "G_BOOK_NOTES",
];

// Keep incoming front-page links working. The Markdown links use GitHub's heading ids.
const anchors = {
  "ten-minutes-a-first-store": "g-start",
  "how-to-think-about-it": "g-think",
  "a-store-is-a-set-of-signed-statements": "g-set",
  "a-record-has-an-outside-and-an-inside": "g-envelope",
  "a-record-is-of-one-thing": "g-of",
  "a-revision-points-at-what-it-replaces": "g-prev",
  "a-revision-says-which-fields-it-sets": "g-sets",
  "the-same-records-give-the-same-answer": "g-same",
  "loops-counts-and-you-judge": "g-judge",
  "a-store-owns-no-meaning": "g-meaning",
  "laying-out-your-data": "g-layout",
  "where-one-store-ends-and-another-begins": "g-split",
  "three-shapes": "g-shapes",
  "where-the-reason-for-a-change-goes": "g-reason",
  "links-between-things": "g-links",
  "fields": "g-fields",
  "time": "g-time",
  "a-field-at-a-time-or-whole": "g-whole",
  "write-the-description-first": "g-describe",
  "bringing-old-data-in": "g-import",
  "using-the-command": "g-use",
  "naming-the-store": "g-naming",
  "writing": "g-writing",
  "when-the-shorthand-stops-you": "g-stops",
  "reading": "g-reading",
  "standing-questions": "g-spec",
  "ticks": "g-ticks",
  "writing-from-what-you-read": "g-base",
  "batches-and-exceptions": "g-batch",
  "erasing": "g-erase",
  "checking-the-fit": "g-fit",
  "from-scripts-and-agents": "g-agents",
  "a-second-walk-a-book-and-its-sources": "g-book",
  "a-store-for-the-book": "g-bookstore",
  "the-sources-come-first": "g-booksources",
  "passages": "g-bookpassages",
  "the-book-is-a-fold": "g-bookfold",
  "two-people-revise-a-passage-at-once": "g-bookfork",
  "whole-every-time": "g-bookwhole",
  "asking-the-same-records-something-else": "g-bookask",
  "the-same-shape-elsewhere": "g-bookshape",
  "for-reference": "g-ref",
  "what-is-built-and-what-is-not": "g-built",
  "if-you-used-the-old-tool": "g-old",
  "words": "g-words",
  "where-the-rules-are-1": "g-rules"
};

const diagrams = { headsfig: "headsfig sheet", judgefig: "loopmini", turnfig: "turn", wordings: "wordings" };
const fail = (block, message) => { throw new Error(`GUIDE.md:${block.line}: ${message}`); };
const text = (s) => s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
const attribute = (s) => text(s).replaceAll('"', "&quot;");
const rewrite = (href) => {
  if (href === "DECISIONS.md#identity-and-standing-is1-to-is11") return "#open";
  if (href === "CHANGELOG.md" || href === "ROADMAP.md") return "decisions/" + href.toLowerCase().replace(".md", ".html");
  if (/^[^:#]+\.md(?:#|$)/.test(href)) return REPO + "/" + href;
  return href.startsWith("#") && Object.hasOwn(anchors, href.slice(1)) ? "#" + anchors[href.slice(1)] : href;
};
const plain = (s) => inline(s, 1, rewrite).plain;
function html(s) {
  // The prototype writes quotes literally in text and uses b for emphasis.
  return inline(s, 1, rewrite).html.replace(/<[^>]+>|&quot;|⁵³/g, (m) => {
    if (m === "&quot;") return '"';
    if (m === "⁵³") return "<sup>53</sup>";
    return m.replace(/^<(\/?)strong>$/, "<$1b>");
  });
}

function parse(source) {
  const lines = source.replaceAll("\r\n", "\n").split("\n");
  const root = { body: [] }, stack = [root];
  for (let i = 0; i < lines.length;) {
    const line = i + 1, s = lines[i++];
    if (!s.trim()) continue;
    const body = stack.at(-1).body;
    if (s.startsWith("<!-- guide:")) {
      const name = s.match(guideComponent)?.[1];
      if (name === "end") {
        if (stack.length === 1) fail({ line }, "guide:end has no opening marker");
        stack.pop();
      } else {
        if (!name) fail({ line }, `unknown guide marker: ${s}`);
        const part = { type: "component", name, line, body: [] };
        body.push(part);
        stack.push(part);
      }
    } else if (s.startsWith("```")) {
      const from = i;
      while (i < lines.length && lines[i] !== "```") i++;
      if (i === lines.length) fail({ line }, "unclosed code fence");
      body.push({ type: "code", lang: s.slice(3), value: lines.slice(from, i++).join("\n"), line });
    } else if (s.startsWith("#")) {
      const h = s.match(/^(#{1,6}) (.+)$/);
      if (!h) fail({ line }, "expected a heading");
      body.push({ type: "heading", level: h[1].length, value: h[2], line });
    } else if (s.startsWith("|")) {
      const cells = (row) => {
        if (!row.endsWith("|")) fail({ line }, "unclosed table row");
        return row.slice(1, -1).split(/(?<!\\)\|/).map((c) => c.trim().replaceAll("\\|", "|"));
      };
      const head = cells(s);
      const rule = cells(lines[i++] ?? "");
      if (rule.length !== head.length || rule.some((c) => !/^:?-+:?$/.test(c))) fail({ line }, "invalid table header");
      const rows = [];
      while (lines[i]?.startsWith("|")) {
        const row = cells(lines[i++]);
        if (row.length !== head.length) fail({ line: i }, "wrong number of table cells");
        rows.push(row);
      }
      body.push({ type: "table", head, rows, line });
    } else if (/^(?:- |\d+\. )/.test(s)) {
      const ordered = !s.startsWith("-");
      const prefix = ordered ? /^\d+\. / : /^- /;
      const items = [s.replace(prefix, "")];
      while (prefix.test(lines[i] ?? "")) items.push(lines[i++].replace(prefix, ""));
      body.push({ type: "list", ordered, items, line });
    } else {
      const para = [s];
      while (lines[i]?.trim()) {
        const hint = lines[i].match(guideHint);
        if (hint) {
          if (hint[1] === "replace") para.pop();
          para.push(hint[2]);
          i++;
        } else if (/^(?:<!-- guide:|`{3}|#|\||- |\d+\. )/.test(lines[i])) break;
        else para.push(lines[i++]);
      }
      body.push({ type: "p", value: para.join(" "), line });
    }
  }
  if (stack.length > 1) fail(stack.at(-1), `unclosed guide:${stack.at(-1).name}`);
  return root.body;
}

// Split at headings of the requested level, keeping the introductory blocks.
function sections(blocks, level) {
  const intro = [], groups = [];
  let body = intro;
  for (const block of blocks) {
    if (block.type === "heading" && block.level === level) {
      body = [];
      groups.push({ title: block.value, line: block.line, body });
    } else body.push(block);
  }
  return { intro, groups };
}

function code(block) {
  const kind = { json: "json", console: "term", sh: "sh", "": "term" }[block.lang];
  if (!kind) fail(block, "unknown code language " + block.lang);
  let value = text(block.value);
  if (kind === "json") {
    value = value.replace(/"([^"\\]*(?:\\.[^"\\]*)*)"(?=\s*:)/g, (key, name) =>
      `<span class="k" data-k="${name.replaceAll('"', "&quot;")}">${key}</span>`);
  } else if (kind === "sh") {
    value = value.replace(/(\s)(# [^\n]*)/g, '$1<span class="cm">$2</span>');
  } else {
    // The transcript indents command continuations, including the closing done of a shell loop.
    let command = false;
    value = value.split("\n").map((line) => {
      command = line.startsWith("$ ") || (command && /^(?:    |  done\b)/.test(line));
      return command ? `<span class="cl">${line}</span>` : line;
    }).join("\n");
  }
  return `<pre class="code ${kind}">${value}</pre>`;
}

function table(block) {
  const { head, rows } = block;
  const dl = { "Field|Says": "fields", "Name|What it does": "flags", "Rule|Where": "flags",
    "Question|Answer": "qa", "Word|Meaning": "words" }[head.join("|")];
  if (dl) return `<dl class="${dl}">` + rows.map(([term, def]) => `<dt>${html(term)}</dt><dd>${html(def)}</dd>`).join("") + "</dl>";
  const list = (cls, render) => `<ul class="${cls}">` + rows.map((row) => "<li>" + render(...row) + "</li>").join("") + "</ul>";
  switch (head.join("|")) {
    case "Write|Message":
      return list("stops", (write, msg) => `<code class="w">${text(plain(write))}</code><span class="says">${text(plain(msg))}</span>`);
    case "Answer|Meaning":
      return list("answers", (answer, meaning) => html(answer) + `<span>${html(meaning)}</span>`);
    case "Status|What it covers":
      return list("built", (status, description) => {
        if (!["Built", "Not built"].includes(status)) fail(block, "unknown build status");
        const [cls, mark] = status === "Built" ? ["proved", "●"] : ["open", "○"];
        return `<span class="st ${cls}"><i aria-hidden="true">${mark}</i>${status}</span><div>${html(description)}</div>`;
      });
    case "Precision|Occurred":
      return '<ol class="ladder" aria-label="How exactly occurred can be stated, from coarse to fine">' +
        rows.map(([label, time]) => `<li><span>${html(label)}</span>${html(time)}</li>`).join("") + "</ol>";
  }
  const row = (cells, tag) => "<tr>" + cells.map((c) => `<${tag}>${html(c)}</${tag}>`).join("") + "</tr>";
  return '<div class="tablewrap"><table class="t"><thead>' + row(head, "th") + "</thead><tbody>" +
    rows.map((cells) => row(cells, "td")).join("") + "</tbody></table></div>";
}

function requireBlocks(part, blocks, ...types) {
  if (blocks.length !== types.length || blocks.some((b, i) => b.type !== types[i]))
    fail(part, `expected ${types.join(", ")} in ${part.name ?? part.title}`);
  return blocks;
}

function entries(part, blocks = part.body) {
  const { intro, groups } = sections(blocks, 4);
  if (intro.length) fail(intro[0], `expected a fourth-level heading in ${part.name}`);
  if (!groups.length) fail(part, part.name === "stepper" ? "stepper has no steps" : `${part.name} has no entries`);
  return groups;
}

function cells(block, ...head) {
  if (block.head.join("|") !== head.join("|") || !block.rows.length)
    fail(block, "expected a table of " + head.join(", "));
  return block.rows;
}

function record(id, env, payload, block) {
  const pay = {};
  if (payload !== "no fields") for (const field of payload.split(", ")) {
    const m = field.match(/^`([^:]+): (.+)`$/);
    if (!m) fail(block, "expected a payload field and value");
    pay[m[1]] = m[2];
  }
  return { id: plain(id), env, pay };
}

function reading(block, ids) {
  return cells(block, "Field", "Value", "From").map(([field, value, from]) => {
    const id = plain(from);
    if (id !== "no setter" && !ids.has(id)) fail(block, "unknown setter " + id);
    return [plain(field), plain(value), ids.get(id) ?? null];
  });
}

function stepper(part, data, render) {
  const first = { steps: [] }, ids = new Map(), notes = [];
  const [place, ...blocks] = part.body;
  if (!blocks.length) fail(part, "stepper has no steps");
  if (place?.type !== "p") fail(part, "the stepper needs the store path");
  const steps = entries(part, blocks).map((entry, i) => {
    const at = entry.body.findIndex((b) => b.type === "p" && /^\*\*.+\*\*$/.test(b.value));
    if (at < 0) fail(entry, "step needs a stage label in bold");
    const step = { say: plain(entry.body[at].value) };
    const extra = [];
    for (const b of entry.body.slice(at + 1)) {
      if (b.type === "p") extra.push(html(b.value));
      else if (b.type === "table" && b.head[0] === "Head") {
        for (const row of cells(b, "Head", "Envelope", "Payload")) {
          const rec = record(...row, b), key = "r" + (ids.size + 1);
          if (ids.has(rec.id)) fail(b, "duplicate record " + rec.id);
          ids.set(rec.id, key);
          first[key] = rec;
        }
      } else if (b.type === "table") step.read = reading(b, ids);
      else fail(b, "unexpected block after the stage label");
    }
    if (ids.size) {
      step.recs = [...ids.values()];
      step.head = step.recs.at(-1);
      const seen = new Set();
      for (const key of step.recs.toReversed()) {
        const fields = Object.keys(first[key].pay);
        const dead = fields.filter((f) => seen.has(f));
        if (dead.length) (step.dead ??= {})[key] = dead;
        for (const field of fields) seen.add(field);
      }
    }
    first.steps.push(step);
    notes.push(extra);
    if (!entry.title.startsWith((i + 1) + ". ")) fail(entry, "step headings must be numbered in order");
    const title = html(entry.title.replace(/^\d+\. /, ""));
    return `<li class="fstep" data-s="${i}"><button class="fhead" aria-expanded="${i === 0}"><span class="fn">${i + 1}</span><span>${title}</span></button><div class="fbody">${render(entry.body.slice(0, at))}</div></li>`;
  });
  data.G_FIRST = first;
  // Notes accompany the empty store, its description, and the first superseded fields.
  data.G_STEP_NOTES = notes;
  return `<div class="first sheet" id="first"><ol class="fsteps">${steps.join("")}</ol>
    <div class="fstage" aria-live="polite"><div class="fstagehead"><span>${text(plain(place.value))}</span><span id="fsay">${text(first.steps[0].say)}</span></div>
    <div class="fstore" id="fstore"></div><div class="fread" id="fread"></div>
    <div class="fctrl"><button class="ibtn" id="fprev" aria-label="Previous step">←</button><span id="fcount">1 / ${steps.length}</span><button class="ibtn solid" id="fnext">Next step</button></div></div></div>`;
}

function sets(part, data) {
  data.G_SETS = entries(part).map((entry) => {
    const [records, values, desc] = requireBlocks(entry, entry.body, "table", "table", "p");
    const layers = new Map(), rows = [];
    for (const [label, env, pay] of cells(records, "Record", "Envelope", "Payload")) {
      const id = label.replace(/ \(head\)$/, "");
      const rec = record(id, env, pay, records);
      if (label !== id) rec.head = true;
      const parents = env.match(/^prev (.+?) · /)?.[1].split(", ") ?? [];
      if (layers.has(id) || parents.some((p) => !layers.has(p))) fail(records, "duplicate record or unknown prev");
      const layer = parents.length ? 1 + Math.max(...parents.map((p) => layers.get(p))) : 0;
      layers.set(id, layer);
      (rows[layer] ??= []).push(rec);
    }
    const ids = new Map([...layers.keys()].map((id) => [id, id]));
    return { tab: html(entry.title), rows, read: reading(values, ids), say: html(desc.value) };
  });
  return '<div class="setsdemo sheet" id="setsdemo"></div>';
}

function shapes(part, data) {
  data.G_SHAPES = [];
  data.G_SHAPE_LABELS = [];
  data.G_SHAPE_KINDS = entries(part).map((entry, shape) => {
    const [label, use, how, examples] = requireBlocks(entry, entry.body, "p", "p", "p", "table");
    const after = (b, prefix) => {
      if (!b.value.startsWith(prefix)) fail(b, "expected " + prefix);
      return b.value.slice(prefix.length);
    };
    data.G_SHAPE_LABELS.push(plain(label.value));
    for (const [name, ex] of cells(examples, "Things in the workshop", "Is named"))
      data.G_SHAPES.push({ name, shape, ex: plain(ex) });
    return { title: plain(entry.title), use: plain(after(use, "**Use it for** ")), how: html(after(how, "**How** ")) };
  });
  return '<div class="shapes sheet" id="shapes"></div>';
}

function book(part, state, data, render) {
  const { intro, groups } = sections(part.body, 4);
  if (groups.length !== 1) fail(part, "a book figure needs one title");
  const [{ title, body }] = groups;
  const [pages, ...paragraphs] = body;
  if (pages?.type !== "table" || !paragraphs.length || paragraphs.some((b) => b.type !== "p"))
    fail(part, "a book figure needs its rows, notes and caption");
  const result = { title: plain(title), cap: plain(paragraphs.pop().value) };
  if (state === "sources") result.sources = cells(pages, "Occurred", "Source");
  else {
    const groups = new Map();
    for (const page of cells(pages, "Passage", "Title", "Text")) {
      if (!groups.has(page[0])) groups.set(page[0], []);
      groups.get(page[0]).push(page);
    }
    result.pages = [...groups.values()];
    for (const p of paragraphs) {
      const status = p.value.match(/^(\d+\.\d+) — (status (cut|final)\b.*)$/);
      if (status) {
        const index = [...groups.keys()].indexOf(status[1]);
        if (index < 0) fail(p, "status of unknown passage");
        result[status[3] === "cut" ? "cut" : "finalAt"] = index;
        data.G_BOOK_NOTES[status[3]] = plain(status[2]);
      } else if (state === "fork") {
        result.two = result.pages.findIndex((group) => group.length > 1);
        if (result.two < 0) fail(p, "book fork needs two heads");
        result.note = plain(p.value);
      } else if (state === "null") {
        data.G_BOOK_NOTES.nul = plain(p.value);
        result.nul = [...groups.keys()].indexOf("null.null");
        if (result.nul < 0) fail(p, "missing null passage");
      } else fail(p, "unknown book note");
    }
    // The passage constants name the pages of these editions.
    if (state === "draft") [data.P11, data.P12a, data.P21] = result.pages.map(([page]) => page);
    if (state === "fork") [data.P12b, data.P12c] = result.pages[result.two];
    if (state === "settled") data.P12s = groups.get("1.2")?.[0];
  }
  data.G_BOOK[state] = result;
  const cls = state === "null" ? "book ghost" : "book";
  return `<div class="bookrow"><div>${render(intro)}</div><figure class="${cls}" data-book="${state}"></figure></div>`;
}

function component(part, data, render) {
  const [kind, name] = part.name.split(" ");
  switch (kind) {
    case "stepper": return stepper(part, data, render);
    case "sets": return sets(part, data);
    case "shapes": return shapes(part, data);
    case "book": return book(part, name, data, render);
    case "diagram": {
      const [label, ...body] = part.body;
      if (label?.type !== "p") fail(part, "a diagram needs its description");
      const [labels, cap] = requireBlocks(part, name === "wordings" ? body.slice(1) : body, "table", "p");
      data.G_DIAGRAMS[name] = { labels: cells(labels, "Step", "What happens").map((row) => row.map(html)), caption: plain(cap.value) };
      if (name === "wordings") {
        if (body[0]?.type !== "p") fail(part, "the wording diagram needs its revision order");
        data.G_DIAGRAMS[name].order = plain(body[0].value);
      }
      return `<figure class="${diagrams[name]}" id="${name}" aria-label="${attribute(plain(label.value))}"></figure>`;
    }
    case "annotated": {
      const [file, example, intro, notes] = requireBlocks(part, part.body, "p", "code", "p", "table");
      data.G_ANNOT[name] = Object.fromEntries(cells(notes, "Member", "Says").map(([member, def]) => {
        const key = plain(member);
        return [key, [key, plain(def)]];
      }));
      return `<div class="annot" data-annot="${name}">${render([file, example])}<aside class="annotside sheet" aria-live="polite"><p class="annotdef">${html(intro.value)}</p></aside></div>`;
    }
    case "envelope": {
      const sides = entries(part);
      if (sides.length !== 2) fail(part, "expected an envelope and a payload");
      return '<div class="envfig">' + sides.map((side, i) => {
        const title = html(side.title).replace(/<em>(.*?)<\/em>$/, "<span>$1</span>");
        return `<div class="${i ? "payside" : "envside"} sheet"><h4 class="gx">${title}</h4>${render(side.body)}</div>`;
      }).join("") + "</div>";
    }
    case "more": {
      const [summary, ...body] = part.body;
      if (summary?.type !== "heading") fail(part, "a disclosure needs a heading");
      return `<details class="more"><summary>${html(summary.value)}</summary>${render(body)}</details>`;
    }
    case "questions": {
      const questions = entries(part);
      const tabs = questions.map((q, i) => `<button role="tab" aria-selected="${i === 0}" data-a="${i}">${html(q.title)}</button>`);
      const panes = questions.map((q, i) => `<div class="askpane" data-a="${i}" role="tabpanel"${i ? " hidden" : ""}>${render(q.body)}</div>`);
      return '<div class="asks" id="asks"><div class="asktabs" role="tablist" aria-label="Four other questions">' +
        tabs.join("") + "</div>" + panes.join("") + "</div>";
    }
  }
}

function list(b, cls = b.ordered ? "glist num" : "glist") {
  const tag = b.ordered ? "ol" : "ul";
  return `<${tag} class="${cls}">` + b.items.map((s) => `<li>${html(s)}</li>`).join("") + `</${tag}>`;
}

const partComments = { "g-start": "TEN MINUTES", "g-think": "PART 1", "g-layout": "PART 2",
  "g-use": "PART 3", "g-book": "THE BOOK", "g-ref": "REFERENCE" };

export function parseGuide(source) {
  const blocks = parse(source);
  const data = { G_ANNOT: {}, G_BOOK: {}, G_BOOK_NOTES: {}, G_DIAGRAMS: {} };
  function render(blocks) {
    const out = [];
    for (let i = 0; i < blocks.length; i++) {
      const b = blocks[i];
      switch (b.type) {
        case "heading": out.push(`<h${b.level} class="gx">${html(b.value)}</h${b.level}>`); break;
        case "p": {
          const file = b.value.match(/^`([^`]+\.json)`$/);
          if (file && blocks[i + 1]?.type === "code")
            out.push(`<figure class="file"><figcaption>${text(file[1])}</figcaption>${code(blocks[++i])}</figure>`);
          else out.push(`<p>${html(b.value)}</p>`);
          break;
        }
        case "code": out.push(code(b)); break;
        case "table": out.push(table(b)); break;
        case "list": out.push(list(b)); break;
        case "component": out.push(component(b, data, render)); break;
      }
    }
    return out.join("\n");
  }

  const { intro, groups: parts } = sections(blocks, 2);
  const { intro: top, groups: facts } = sections(intro, 3);
  const [title, lede, map] = requireBlocks({ line: 1, name: "guide introduction" }, top, "heading", "p", "list");
  const hero = `<section class="ghero" id="guide"><div class="wrap"><h1 class="display">${html(title.value).replace(/ (\S+)$/, "&nbsp;$1")}</h1>
    <p class="lede">${html(lede.value)}</p>${list(map, "gmap")}
    <div class="gfacts">${facts.map((f) => `<div><h2 class="gfh">${html(f.title)}</h2>${render(f.body)}</div>`).join("")}</div></div></section>`;

  function sectionId(section) {
    const slug = plain(section.title).toLowerCase().replace(/[^\p{L}\p{N} -]/gu, "").replaceAll(" ", "-");
    // The reference list shares its heading with a note in the introduction.
    return anchors[slug] ?? anchors[slug + "-1"] ?? "g-" + slug;
  }
  const article = parts.map((part) => {
    const id = sectionId(part), { intro, groups } = sections(part.body, 3);
    let body = render(intro).replace(/^<p>/, '<p class="stand">');
    for (const section of groups) {
      const content = render(section.body);
      const title = `<h3 class="gh">${html(section.title)}</h3>`;
      if (id === "g-start") body += title + content.replace(/<p>([^<]*)<\/p>$/, '<p class="pull">$1</p>');
      else body += `<section class="gsec" id="${attribute(sectionId(section))}">${title}${content}</section>`;
    }
    const comment = partComments[id] ? `<!-- ================= ${partComments[id]} ================= -->` : "";
    return `${comment}<section class="gpart" id="${attribute(id)}"><h2 class="gp">${html(part.title)}</h2>${body}</section>`;
  }).join("\n");
  for (const name of guideConstants) if (data[name] === undefined) fail({ line: 1 }, "missing guide content for " + name);
  return { data, html: `<main id="v-guide" class="view" hidden>${hero}
    <div class="wrap gbody"><nav class="gtoc" aria-label="On this page"><details class="gtocd" id="gtocd" open><summary>On this page</summary><ol id="gtoc"></ol></details></nav>
    <article class="gdoc" id="gdoc">${article}</article></div>
    <footer class="end"><div class="wrap"><span>Built from <code>GUIDE.md</code>. Every command and output is copied from it.</span><a href="decisions/guide.html">The guide, as written</a></div></footer></main>\n` };
}

export function readGuide(root) {
  return parseGuide(readFileSync(join(root, "GUIDE.md"), "utf8"));
}
