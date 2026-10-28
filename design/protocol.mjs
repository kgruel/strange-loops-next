// What the design pages read from the protocol: the law table in protocol/laws.md,
// the vectors, and the proof graph `lake exe proofs` writes. Each reader refuses
// what it can't read, so a page never renders a guess about the protocol.

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

// Inline markdown, as laws.md writes it: `code` and **bold**.
export const inline = (s) => s
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/`([^`]+)`/g, "<code>$1</code>")
  .replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>");

export const slug = (key) => key.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();

// The law table: one law per row, keyed by its first cell as written, without backticks.
// A row's names are the backticked names in that cell, or its key when there are none.
export function lawTable(root) {
  const rows = [];
  const notes = {};
  let section = null, file = null, note = null;
  for (const line of readFileSync(join(root, "protocol", "laws.md"), "utf8").split("\n")) {
    const h = line.match(/^## (.+?)(?: \((.+)\))?$/);
    if (h) {
      section = h[1];
      file = h[2] ? [...h[2].matchAll(/`([^`]+)`/g)].map((m) => m[1]) : [];
      note = null;
      continue;
    }
    // Bulleted notes under a heading: "* **Lead.** text", continued on indented lines.
    const b = line.match(/^\* (.*)$/);
    if (b) { (notes[section] ??= []).push(b[1]); note = notes[section]; continue; }
    if (note && /^  \S/.test(line)) { note[note.length - 1] += " " + line.trim(); continue; }
    if (!line.trim()) note = null;
    const m = line.match(/^\| (.+) \|$/);
    if (!m) continue;
    const cells = m[1].split(" | ");
    if (cells[0] === "Law" || /^-+$/.test(cells[0])) continue;
    if (cells.length !== 4) throw new Error(`laws.md: a law row needs four cells: ${line}`);
    const [law, theorems, says, vectors] = cells;
    const key = law.replace(/`/g, "");
    // A theorem cell is backticked names (and a file in parentheses), or "(by construction)":
    // a name that lost its backticks would otherwise drop out of the law's proof unnoticed.
    if (theorems.trim() !== "(by construction)" && !/^[\s,()]*$/.test(theorems.replace(/`[^`]+`/g, "")))
      throw new Error(`laws.md: ${key}: the theorem cell holds more than backticked names: ${theorems}`);
    const names = [...law.matchAll(/`([^`]+)`/g)].map((x) => x[1]);
    rows.push({
      key, section, files: file, names: names.length ? names : [key],
      theorems: [...theorems.matchAll(/`([^`]+)`/g)].map((x) => x[1]),
      byConstruction: theorems.trim() === "(by construction)",
      says, vectors,
    });
  }
  const seen = new Set();
  for (const r of rows) {
    if (seen.has(r.key)) throw new Error(`laws.md: two rows are both ${r.key}`);
    seen.add(r.key);
  }
  return { rows, notes };
}

// Every vector file, by its path under vectors/ without .json, with what it says of itself.
export function vectorFiles(root) {
  const out = new Map();
  const dir = (d, rel) => {
    for (const e of readdirSync(d, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const p = join(d, e.name), r = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) dir(p, r);
      else if (e.name.endsWith(".json")) out.set(r.slice(0, -5), JSON.parse(readFileSync(p, "utf8")));
    }
  };
  dir(join(root, "vectors"), "");
  return out;
}

// Every refusal code a vector pins.
export function vectorCodes(files) {
  const codes = new Set();
  const walk = (v) => {
    if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) {
      if ((k === "refused" || k === "code") && typeof x === "string") codes.add(x);
      else walk(x);
    }
  };
  for (const v of files.values()) walk(v);
  return codes;
}

// A law row's Vectors cell, resolved to files. `dir/NN` names a file; a bare `NN` after it is in
// the same directory; `NN`–`MM` is the range, every member of which must exist; `dir/*`, or a
// directory named on its own ("every `spec/run` vector"), is all of a directory. A backticked
// token that is none of these and holds a `/` is refused; one without (a field such as
// `erased_line`, a law such as `acc.set`) belongs to the cell's description, kept as written.
export function resolveVectors(cell, files) {
  const names = [...files.keys()];
  const found = new Set();
  let dir = null, last = null;
  const pick = (d, item) => {
    const hit = item === "*" ? names.filter((n) => n.startsWith(`${d}/`) && !n.slice(d.length + 1).includes("/"))
      : names.filter((n) => n.startsWith(`${d}/${item}-`));
    if (!hit.length) throw new Error(`laws.md: no vector ${d}/${item} (in "${cell}")`);
    hit.forEach((h) => found.add(h));
  };
  const tokens = [...cell.matchAll(/`([^`]+)`|–/g)];
  let range = false;
  for (const t of tokens) {
    if (t[0] === "–") { range = true; continue; }
    let tok = t[1];
    const slash = tok.lastIndexOf("/");
    if (slash >= 0 && !/^(\d+|\*)$/.test(tok.slice(slash + 1))) {
      if (!names.some((n) => n.startsWith(`${tok}/`))) throw new Error(`laws.md: ${tok} is no vector or directory of vectors (in "${cell}")`);
      pick(tok, "*");
      dir = null; last = null; range = false;
      continue;
    }
    if (slash >= 0) { dir = tok.slice(0, slash); tok = tok.slice(slash + 1); }
    if (!dir || !/^(\d+|\*)$/.test(tok)) { range = false; continue; }
    if (range && last !== null) {
      for (let n = Number(last) + 1; n < Number(tok); n++) pick(dir, String(n).padStart(tok.length, "0"));
    }
    pick(dir, tok);
    last = tok === "*" ? null : tok;
    range = false;
  }
  return [...found].sort();
}

// The proof graph: theorem → { module, uses }.
export const proofs = (root) => JSON.parse(readFileSync(join(root, "design", "laws", "proofs.json"), "utf8")).theorems;

// A theorem as laws.md names it (`Count.perm`) resolved to the one declaration it names: null
// when none does; refused when several do, since picking one would be a guess.
export function resolveTheorem(name, graph) {
  const hits = Object.keys(graph).filter((n) => n === name || n.endsWith(`.${name}`));
  if (hits.length > 1) throw new Error(`laws.md: ${name} is ambiguous: ${hits.join(", ")}`);
  return hits[0] ?? null;
}

// Law to law: a proof of one law's theorem uses a theorem of another, directly or through
// lemmas no law names. That is all an edge says.
export function lawEdges(rows, graph, resolved) {
  const owner = new Map();
  for (const r of rows) for (const t of resolved.get(r.key)) {
    if (!owner.has(t)) owner.set(t, new Set());
    owner.get(t).add(r.key);
  }
  const edges = new Set();
  for (const r of rows) {
    const start = new Set(resolved.get(r.key));
    const stack = [...start], seen = new Set(start);
    while (stack.length) {
      for (const u of graph[stack.pop()].uses) {
        if (seen.has(u)) continue;
        seen.add(u);
        if (owner.has(u)) { for (const o of owner.get(u)) if (o !== r.key) edges.add(`${r.key}\u0000${o}`); }
        else if (graph[u]) stack.push(u);
      }
    }
  }
  return [...edges].sort().map((e) => e.split("\u0000"));
}
