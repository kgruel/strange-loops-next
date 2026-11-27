// The open entries of DECISIONS.md, read into the form the front page draws.
// The words are the file's own. An entry is a heading "### IS1: ..." followed by blocks:
//   *From ...*                      where the entry comes from (the first italic paragraph)
//   **Question.** ...               what is asked (once)
//   **Example ....** ...            the example, and the fenced block after it is what was run
//   a table                         the options: a key, the choice, its cost
//   **Changes:** ...                what a ruling changes (once)
// Any other paragraph is kept in order, before or after the options, with its label if it
// has one. A block that fits none of these stops the build, and names its line.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { inline } from "../decisions/markdown.mjs";

const SOURCE = "DECISIONS.md";

// Blocks of an entry: paragraphs, fenced code and tables, each with its first line number.
function blocks(lines, from, to) {
  const out = [];
  for (let i = from; i < to; i++) {
    if (!lines[i].trim()) continue;
    const at = i + 1;
    if (lines[i].startsWith("```")) {
      const body = [];
      for (i++; i < to && !lines[i].startsWith("```"); i++) body.push(lines[i]);
      if (i >= to) throw new Error(`${SOURCE}:${at}: a fenced block is not closed`);
      out.push({ type: "code", at, text: body.join("\n") });
    } else if (lines[i].startsWith("|")) {
      const rows = [];
      for (; i < to && lines[i].startsWith("|"); i++) rows.push(lines[i]);
      i--;
      out.push({ type: "table", at, rows });
    } else {
      const body = [];
      for (; i < to && lines[i].trim() && !lines[i].startsWith("```") && !lines[i].startsWith("|"); i++) body.push(lines[i]);
      i--;
      out.push({ type: "para", at, text: body.join("\n") });
    }
  }
  return out;
}

// A table row's cells. A pipe inside a code span does not split.
function cells(row, at) {
  const parts = [];
  let cur = "", code = false;
  for (const c of row.trim().replace(/^\|/, "").replace(/\|$/, "")) {
    if (c === "`") code = !code;
    if (c === "|" && !code) { parts.push(cur.trim()); cur = ""; } else cur += c;
  }
  parts.push(cur.trim());
  if (code) throw new Error(`${SOURCE}:${at}: a code span is not closed in a table row`);
  return parts;
}

export function readDecisions(root, rewrite) {
  const lines = readFileSync(join(root, SOURCE), "utf8").split("\n");
  const html = (text, at) => inline(text, at, (href, line) => rewrite(SOURCE, line, href)).html;

  const starts = [];
  lines.forEach((l, i) => { if (/^### IS\d+: /.test(l)) starts.push(i); });
  if (!starts.length) return { entries: [], at: null };
  const section = lines.findLastIndex((l, i) => i < starts[0] && l.startsWith("## "));
  const end = lines.findIndex((l, i) => i > starts.at(-1) && l.startsWith("## "));
  if (section < 0 || end < 0) throw new Error(`${SOURCE}: the open entries are not inside a section`);

  // What the section says of itself: the binary its runs used, and which entries a trial needs.
  const intro = lines.slice(section, starts[0]).join("\n");
  const built = intro.match(/binary built from main at `([0-9a-f]{7,40})`/);
  if (!built) throw new Error(`${SOURCE}:${section + 1}: the section does not say which binary its examples ran on`);
  const first = intro.match(/\*\*What needs ruling first\.\*\* ([^.]*)\./);
  if (!first) throw new Error(`${SOURCE}:${section + 1}: the section does not say what needs ruling first`);
  const trial = new Set(first[1].match(/IS\d+/g) ?? []);

  const entries = starts.map((start, n) => {
    const stop = n + 1 < starts.length ? starts[n + 1] : end;
    const [, id, name] = lines[start].match(/^### (IS\d+): (.+?)\s*$/);
    const e = { id, trial: trial.has(id), title: html(name[0].toUpperCase() + name.slice(1), start + 1), before: [], after: [] };
    const where = () => (e.options ? e.after : e.before);
    let last = null;
    for (const b of blocks(lines, start + 1, stop)) {
      const fail = (why) => { throw new Error(`${SOURCE}:${b.at}: ${id}: ${why}`); };
      if (b.type === "code") {
        if (last !== "example" || e.run !== undefined) fail("a fenced block must follow the entry's example");
        e.run = b.text;
      } else if (b.type === "table") {
        if (e.options) fail("a second table");
        const [head, rule, ...rows] = b.rows;
        if (!rule || !/^\|[\s:|-]+\|$/.test(rule.trim()) || !rows.length) fail("not a table of options");
        const heads = cells(head, b.at);
        if (heads.length !== 3 || heads[0] !== "" || heads[2] !== "Cost") fail("an options table has three columns: key, choice, Cost");
        e.options = rows.map((row, r) => {
          const at = b.at + 2 + r, c = cells(row, at);
          if (c.length !== 3) throw new Error(`${SOURCE}:${at}: ${id}: an option has a key, a choice and a cost`);
          const m = c[0].match(/^(\*\*)?([A-Z])(?: \(([^)]+)\))?\1$/);
          if (!m) throw new Error(`${SOURCE}:${at}: ${id}: an option's key is a letter, with a note in brackets if it has one`);
          const o = { k: m[2], choice: html(c[1], at), cost: html(c[2], at) };
          if (m[3]) o.label = html(m[3][0].toUpperCase() + m[3].slice(1), at);
          if (m[3] && /^recommended\b/.test(m[3])) { if (!m[1]) throw new Error(`${SOURCE}:${at}: ${id}: a recommended option is in bold`); o.rec = true; }
          return o;
        });
        if (new Set(e.options.map((o) => o.k)).size !== e.options.length) fail("two options share a key");
      } else {
        const italic = b.text.match(/^\*([^*][\s\S]*[^*])\*$/);
        const led = b.text.match(/^\*\*([^*]+?)([.:,])\*\*\s*([\s\S]*)$/);
        if (italic && e.from === undefined && !e.ask) e.from = html(italic[1], b.at);
        else if (led && led[1] === "Question") { if (e.ask) fail("a second question"); e.ask = html(led[3], b.at); }
        else if (led && /^Example\b/.test(led[1])) {
          if (e.eg !== undefined) fail("a second example");
          e.eg = html(led[3], b.at); e.ran = /\brun today\b/.test(led[1]);
          last = "example"; continue;
        }
        else if (led && led[1] === "Changes") { if (e.changes) fail("a second Changes"); e.changes = html(led[3], b.at); }
        else if (led) where().push({ label: html(led[1], b.at), text: html(led[3], b.at) });
        else where().push({ text: html(italic ? italic[1] : b.text, b.at) });
      }
      last = null;
    }
    for (const need of ["from", "ask", "eg", "options", "changes"])
      if (e[need] === undefined) throw new Error(`${SOURCE}:${start + 1}: ${id} has no ${need === "from" ? "source line" : need}`);
    if (e.run !== undefined && !e.ran) throw new Error(`${SOURCE}:${start + 1}: ${id} shows a run its example does not claim`);
    return e;
  });
  return { entries, at: built[1] };
}

// ---------------------------------------------------------------------------------------
// The rest of the file, around the open entries: when they were put, what they take as
// given, what is being prepared, what is deferred, and the rulings.

const NUMBER = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve",
  "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
// A count as a word, as the site writes counts under a hundred in running prose.
export function word(n) {
  if (!Number.isInteger(n) || n < 0) throw new Error(`not a count: ${n}`);
  if (n < 20) return NUMBER[n];
  if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? "-" + NUMBER[n % 10] : "");
  return String(n);
}
export const Word = (n) => { const w = word(n); return w[0].toUpperCase() + w.slice(1); };

const MONTH = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const day = (iso) => { const [y, m, d] = iso.split("-").map(Number); return `${d} ${MONTH[m - 1]} ${y}`; };

// The lines of one "## " section, without its heading.
function section(lines, name) {
  const at = lines.indexOf("## " + name);
  if (at < 0) throw new Error(`${SOURCE}: no section "${name}"`);
  const end = lines.findIndex((l, i) => i > at && l.startsWith("## "));
  return { from: at + 1, to: end < 0 ? lines.length : end };
}

export function readAround(root, rewrite) {
  const lines = readFileSync(join(root, SOURCE), "utf8").split("\n");
  const html = (text, at) => inline(text, at, (href, line) => rewrite(SOURCE, line, href)).html;
  const paras = (s) => blocks(lines, s.from, s.to);

  // The open section's own paragraphs, before its first entry.
  const open = lines.findIndex((l) => /^## Identity and standing/.test(l));
  const firstEntry = lines.findIndex((l, i) => i > open && l.startsWith("### "));
  if (open < 0 || firstEntry < 0) throw new Error(`${SOURCE}: no open section`);
  const intro = blocks(lines, open + 1, firstEntry);
  const led = (label) => {
    const b = intro.find((p) => p.type === "para" && p.text.startsWith(`**${label}`));
    if (!b) throw new Error(`${SOURCE}:${open + 1}: the open section has no paragraph "${label}"`);
    return b;
  };
  const putBlock = led("Put on ");
  const put = putBlock.text.match(/^\*\*Put on (\d{4}-\d\d-\d\d)\.\*\*\s*([\s\S]*)$/);
  if (!put) throw new Error(`${SOURCE}:${putBlock.at}: expected "**Put on yyyy-mm-dd.**"`);
  const givenBlock = intro.find((p) => p.type === "para" && p.text.startsWith("They take as given"));
  if (!givenBlock) throw new Error(`${SOURCE}:${open + 1}: the open section does not say what it takes as given`);
  const notHere = led("What is not here.");

  // Being prepared: paragraphs. Deferred: an opening line, then one bullet each.
  const prepared = paras(section(lines, "Being prepared")).map((b) => {
    if (b.type !== "para") throw new Error(`${SOURCE}:${b.at}: Being prepared holds paragraphs only`);
    return html(b.text, b.at);
  });
  const deferredBlocks = paras(section(lines, "Deferred"));
  const deferred = [];
  for (const b of deferredBlocks) {
    if (b.type !== "para") throw new Error(`${SOURCE}:${b.at}: Deferred holds a list only`);
    if (!b.text.startsWith("- ")) continue;
    b.text.split(/\n(?=- )/).forEach((item, k) => {
      const m = item.match(/^- \*\*([^*]+)\*\*([.:,]?)\s*([\s\S]*)$/);
      if (!m) throw new Error(`${SOURCE}:${b.at + k}: a deferred item starts with what it is, in bold`);
      deferred.push({ what: html(m[1] + m[2], b.at + k), said: html(m[3], b.at + k) });
    });
  }

  // Ruled: one table, newest first.
  const ruledBlocks = paras(section(lines, "Ruled"));
  const table = ruledBlocks.find((b) => b.type === "table");
  if (!table) throw new Error(`${SOURCE}: Ruled has no table`);
  if (cells(table.rows[0], table.at).join("|") !== "Date|Ruling|Where") throw new Error(`${SOURCE}:${table.at}: Ruled's columns are Date, Ruling, Where`);
  let before = "9999-99-99";
  const ruled = table.rows.slice(2).map((row, r) => {
    const at = table.at + 2 + r, c = cells(row, at);
    if (c.length !== 3 || !c[0] || !c[1]) throw new Error(`${SOURCE}:${at}: a ruling has a date, its text and where it is recorded`);
    // The oldest rows are dated by the step they closed, and come after every dated row.
    const dated = /^\d{4}-\d\d-\d\d$/.test(c[0]);
    if (!dated && !/^Step \d+$/.test(c[0])) throw new Error(`${SOURCE}:${at}: a ruling is dated yyyy-mm-dd, or by its step`);
    if (dated && c[0] > before) throw new Error(`${SOURCE}:${at}: rulings are listed newest first`);
    before = dated ? c[0] : "0000-00-00";
    // The headline is the ruling's first sentence, or its first clause when it is one sentence.
    const cut = c[1].search(/\. |; /);
    const head = cut < 0 ? c[1] : c[1].slice(0, cut);
    const where = c[2].split(/;\s*/).filter(Boolean).map((w) =>
      w === "Changelog" ? html(`[Changelog](CHANGELOG.md)`, at) : html(w, at));
    return { date: c[0], head: html(head, at), text: head === c[1] ? "" : html(c[1], at), where };
  });

  return {
    put: put[1], putDay: day(put[1]), putText: html(put[2], putBlock.at),
    given: html(givenBlock.text, givenBlock.at),
    notHere: html(notHere.text.replace(/^\*\*What is not here\.\*\*\s*/, ""), notHere.at),
    first: html(led("What needs ruling first.").text.replace(/^\*\*What needs ruling first\.\*\*\s*/, ""), led("What needs ruling first.").at),
    prepared, deferred, ruled,
  };
}

// ---------------------------------------------------------------------------------------
// Links. The front page is served at the site's root; the working documents are rendered
// under decisions/, and the entries are sections of the front page itself.

export function frontRewrite(root, documents, rewriteLink) {
  const HERE = { "being-prepared": "prepared", deferred: "deferred", ruled: "ruled", "identity-and-standing-is1-to-is11": "open" };
  return (source, line, href) => {
    const url = rewriteLink(root, documents, source, line, href);
    if (/^https?:/i.test(url)) return url;
    if (url.startsWith("../rethink/")) return url.slice(3);
    const [path, fragment = ""] = url.split("#");
    if (path === "" || path === documents.get(SOURCE)) {
      const entry = fragment.match(/^(is\d+)-/);
      if (entry) return "#" + entry[1];
      if (HERE[fragment]) return "#" + HERE[fragment];
      return "decisions/" + documents.get(SOURCE) + (fragment ? "#" + fragment : "");
    }
    return "decisions/" + url;
  };
}

// ---------------------------------------------------------------------------------------
// The decisions view. Its headings and sentences carry counts, dates and lists that come
// from the file, so the whole view is written here and nothing in it is typed twice.
// It speaks to any reader of the site, and asks for their view.

export const FEEDBACK = {
  issues: "https://github.com/kgruel/strange-loops-next/issues/new",
  mail: ["kyle@strangeloops.dev", "tally@strangeloops.dev"],
};

export function decisionsView({ entries, at }, around) {
  const n = entries.length, trial = entries.filter((e) => e.trial), rest = n - trial.length;
  const list = (ids) => ids.length < 2 ? ids.join("") : ids.slice(0, -1).join(", ") + " and " + ids.at(-1);
  const s = (k, one, many) => (k === 1 ? one : many);
  const mail = FEEDBACK.mail.map((m) => `<a href="mailto:${m}?subject=${encodeURIComponent("An open decision in strange-loops")}">${m}</a>`);
  const search = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="7" cy="7" r="4.5"/><path d="m10.5 10.5 3 3"/></svg>';
  return `<main id="v-decisions" class="view" hidden>
  <section class="dhero" id="decisions">
    <div class="wrap">
      <h1 class="display">${Word(n)} ${s(n, "question is", "questions are")}&nbsp;open.</h1>
      <p class="lede">${s(n, "It is", `All ${word(n)} are`)} about <b>identity and standing</b>: who a record is from, and whether it counts where it lands. Each one states the choice, the options and what each option costs. None is settled, and a good argument can still change any of them.</p>
      <p class="tally">They were put on ${around.putDay}. Beside them, <a href="#prepared">${word(1)} more is being prepared</a>, <a href="#deferred">${word(around.deferred.length)} ${s(around.deferred.length, "is", "are")} deferred</a> and <a href="#ruled">${around.ruled.length} ${s(around.ruled.length, "is", "are")} ruled</a>.</p>
    </div>
  </section>

  <section class="block" id="say">
    <div class="wrap narrow" style="margin-left:auto;margin-right:auto">
      <h2 class="sec">Tell us where an entry is wrong.</h2>
      <p class="secintro">A case an entry misses, a cost it understates, or an option nobody listed is worth more to us than agreement. Mark the options you lean to and copy them as text, or write in your own words.</p>
      <p class="secintro"><a href="${FEEDBACK.issues}">Open an issue on GitHub</a>, or write to ${mail.join(" or ")}. Kyle keeps the project. Tally is its coordinating agent, an AI, and reads its mail at the start of each working session.</p>
    </div>
  </section>

  <section class="block" id="open">
    <div class="wrap">
      <header>
        <h2 class="sec">${Word(trial.length)} ${s(trial.length, "decides", "decide")} whether a trial can start.</h2>
        <p class="secintro">${list(trial.map((e) => e.id))} ${s(trial.length, "is", "are")} what a trial needs. The other ${word(rest)} ${s(rest, "is", "are")} needed before the first store that is kept.</p>
      </header>
      <div class="starthere" id="starthere"></div>
      <div class="sheet depmap" id="depmap">
        <svg id="depsvg" role="img" aria-label="Which open questions depend on which"></svg>
        <ul class="deplist" id="deplist"></ul>
        <div class="dcap" id="dcap">What depends on what. Point at a question to trace it, or select it to read it.</div>
      </div>
      <p class="secintro" style="font-size:14.5px">“Today” in the examples is the <code>loops</code> binary built from main at <code>${at}</code>, run in a scratch store with invented names. Where something is proposed and can't be run, it says so.</p>
      <div class="decs" id="decs"></div>
    </div>
  </section>

  <section class="block" id="context">
    <div class="wrap">
      <header>
        <h2 class="sec">What they take as given, and what they leave alone.</h2>
      </header>
      <div class="given" id="given">
        <div><h3>Where they come from</h3><p>${around.putText}</p></div>
        <div><h3>Taken as given</h3><p>${around.given}</p></div>
        <div><h3>What is not here</h3><p>${around.notHere}</p></div>
      </div>
    </div>
  </section>

  <section class="block" id="prepared">
    <div class="wrap narrow" style="margin-left:auto;margin-right:auto">
      <h2 class="sec">One more is coming.</h2>
${around.prepared.map((p) => `      <p class="secintro">${p}</p>`).join("\n")}
    </div>
  </section>

  <section class="block" id="deferred">
    <div class="wrap">
      <header>
        <h2 class="sec">${Word(around.deferred.length)} that come back with their step.</h2>
      </header>
      <div class="sheet" style="padding:6px 20px"><div class="defer" id="defer">
${around.deferred.map((d) => `        <div><div class="dw">${d.what}</div><div class="dd">${d.said}</div></div>`).join("\n")}
      </div></div>
    </div>
  </section>

  <section class="block" id="ruled">
    <div class="wrap">
      <header>
        <h2 class="sec">${Word(around.ruled.length)} rulings, newest first.</h2>
      </header>
      <div class="sheet log">
        <div class="loghead">
          <span class="stepcount" id="logcount" style="text-align:left"></span>
          <label class="search">${search}<input id="logq" type="search" placeholder="Search the rulings" autocomplete="off" aria-label="Search the rulings"></label>
        </div>
        <ol class="logs" id="logs"></ol>
        <div style="margin-top:12px"><button class="ibtn" id="logmore">Show all ${around.ruled.length}</button></div>
      </div>
      <p class="howpage" style="margin-top:44px">How this page works: each open question states the choice, the options and what each one costs, and what a ruling changes. Once a question is ruled, it leaves the top and joins the log above, with its date. Nothing else is kept at the top.</p>
    </div>
  </section>

  <footer class="end"><div class="wrap"><span>Built from <code>DECISIONS.md</code> in the repository.</span><a href="decisions/decisions.html">The decisions file, as written</a></div></footer>
</main>
`;
}
