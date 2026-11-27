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
