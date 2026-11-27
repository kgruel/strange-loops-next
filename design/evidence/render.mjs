// The evidence page, from design/laws/ and design/evidence/: what stands behind each law the
// laws page states. Each law's card gives its row in protocol/laws.md, the theorems that
// prove it as Lean states them, the vectors that pin it and who runs them, and the laws its
// proof rests on; the coverage table and the proof map show the same joins across every law.
// The joins, and every check on them, are in design/laws/join.mjs.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { documentOf, fill, header } from "../page.mjs";
import { inline, slug } from "../protocol.mjs";
import { REPO, anchor, esc, joinLaws, sentence } from "../laws/join.mjs";
import { layoutMap } from "./layout.mjs";

export const theoremName = (name) => name.replace(/^Loops\./, "");
export const theoremStatement = (proof) => proof.states.replace(/\bLoops\./g, "");

// The two sides of the vector join, and any prose left in the row's Vectors cell.
export function vectorEvidence(row, { cited, naming }) {
  const listed = cited.get(row.key), named = naming.get(row.key);
  const words = /[a-z]/i.test(row.vectors.replace(/`[^`]*`/g, ""));
  return {
    listed, named,
    unnamed: listed.filter((p) => !named.includes(p)),
    uncited: named.filter((p) => !listed.includes(p)),
    note: words || !listed.length ? inline(row.vectors) : null,
  };
}

// Both evidence views draw the same proof graph, with their own card anchors.
export function proofMapData({ data, rows, layers, edges }, idOf = anchor) {
  const connected = new Set(edges.flatMap(([a, b]) => [a, b]));
  return {
    layers,
    nodes: rows.filter((r) => connected.has(r.key)).map((r) => {
      const law = data.laws[r.key];
      return {
        id: idOf(r.key), label: r.names.length > 1 ? `${r.names[0]} …` : r.key,
        layer: law.layer, shape: law.shape, sentence: sentence(law),
      };
    }),
    edges: edges.map(([a, b, via]) => [idOf(a), idOf(b), via]),
    alone: rows.filter((r) => !connected.has(r.key)),
  };
}

export function renderEvidence(root) {
  const read = (...p) => readFileSync(join(root, "design", "evidence", ...p), "utf8");
  const joined = joinLaws(root);
  const { data, rows, graph, layers, resolved, cited, runBy, restsOn, carries, via, tried, unpremised, scopeOf } = joined;
  const law = (k) => data.laws[k];
  const label = (r) => r.names.join(", ");
  const lawLink = (k) => `<a class="lawref" href="#${anchor(k)}"><code>${esc(k)}</code></a>`;

  const lede = `  <p class="lede">Evidence for the listed laws on <a href="../laws/">the laws page</a>: the theorems Lean checked, ` +
    `the vectors that pin it and who runs them. The page also shows the laws each proof uses. ` +
    `For an implementer, what to pass; for a maintainer, which laws have less evidence than others.</p>\n`;

  // The chain from claim to code, counted.
  const theoremCount = new Set([...resolved.values()].flat()).size;
  const vectorCount = new Set([...cited.values()].flat()).size;
  const chain = [
    [rows.length, "laws", "rows of <code>protocol/laws.md</code>, each a sentence on the laws page"],
    [theoremCount, "theorems", "the declarations they name, found in the proofs Lean checked"],
    [vectorCount, "vectors", "the files they cite, every one found on disk"],
    [data.implementations.length, "implementations", data.implementations.map((i) => i.name).join(" and ")],
  ].map(([n, k, what]) => `    <div class="tile"><p class="tile-n">${n}</p><p class="tile-k">${k}</p><p class="tile-w">${what}</p></div>\n`).join('    <div class="tile-arrow" aria-hidden="true">→</div>\n');

  const fileLinks = (ps) => ps.map((p) => `<a href="${REPO}/vectors/${p}.json"><code>${p}</code></a> (current main; may differ from this page's build)`).join(" ");
  const card = (r) => {
    const l = law(r.key);
    const ts = resolved.get(r.key);
    const { listed, uncited: extra, note } = vectorEvidence(r, joined);
    const impl = runBy([...listed, ...extra]);
    const theorems = ts.length
      ? ts.map((t) => `<details class="thm"><summary><code>${esc(theoremName(t))}</code></summary>` +
        `<p class="thm-m">${graph[t].module}</p><pre>${esc(theoremStatement(graph[t]))}</pre></details>`).join("") +
        (r.theorems.filter((t) => data.notTheorems[t]).map((t) => ` <code class="not">${t}</code>`).join(""))
      : r.byConstruction ? "<span class=\"muted\">by construction: no theorem, pinned by vectors</span>" : "<span class=\"muted\">none named</span>";
    const many = listed.length > 6;
    const back = [`<a href="../laws/#${anchor(r.key)}">In its question</a>`,
      tried.has(r.key) ? `<a href="../laws/#try-${slug(tried.get(r.key))}">Try to break it</a>` : "",
      unpremised.has(r.key) ? `<a href="../laws/#without-${slug(unpremised.get(r.key))}">Without its premise</a>` : ""].filter(Boolean);
    return `    <article class="law${l.shape === "limit" ? " is-limit" : ""}" id="${anchor(r.key)}" data-shape="${l.shape}">\n` +
      `      <div class="law-h"><h4>${esc(label(r))}</h4><span class="chip">${data.shapes[l.shape].name}</span></div>\n` +
      `      <p class="law-s">${sentence(l)}</p>\n` +
      (scopeOf(r.key) ? `      <p class="law-scope">${scopeOf(r.key)}</p>\n` : "") +
      `      <p class="law-md"><span>laws.md</span> ${inline(r.says)}</p>\n` +
      `      <dl class="chain">\n` +
      `        <dt>proved by</dt><dd>${theorems}</dd>\n` +
      `        <dt>pinned by</dt><dd>${note !== null ? `<span>${note}</span>` : ""}${listed.length ? (many ? `<details><summary>${listed.length} files</summary>${fileLinks(listed)}</details>` : `<span class="files">${fileLinks(listed)}</span>`) : ""}` +
      (extra.length ? `<span class="files also">also naming it: ${fileLinks(extra)}</span>` : "") + `</dd>\n` +
      (impl.length ? `        <dt>run by</dt><dd>${impl.map((i) => i.name).join(", ")}</dd>\n` : "") +
      (restsOn.get(r.key).length ? `        <dt>rests on</dt><dd>${restsOn.get(r.key).map((b) =>
        lawLink(b).replace('<a class="lawref"', `<a class="lawref" title="via ${esc(via.get(`${r.key}\u0000${b}`))}"`)).join(" ")}</dd>\n` : "") +
      (carries.get(r.key).length ? `        <dt>carries</dt><dd>${carries.get(r.key).map(lawLink).join(" ")}</dd>\n` : "") +
      `      </dl>\n` +
      `      <p class="law-back">${back.join("")}</p>\n` +
      `    </article>\n`;
  };
  const byLayer = [...layers].reverse().map((layer) => {
    const rs = rows.filter((r) => law(r.key).layer === layer);
    return `    <div class="layer-group" id="layer-${slug(layer)}">\n      <h3>${layer} <span>${rs.length ? `${rs.length} law${rs.length === 1 ? "" : "s"}` : "no laws yet"}</span></h3>\n` +
      (rs.length ? `      <div class="laws-grid">\n${rs.map(card).join("")}      </div>\n` : `      <p class="note">Nothing is built here yet, so nothing is proved.</p>\n`) +
      `    </div>\n`;
  }).join("");

  // Coverage: what evidence each law has. A filled cell says the evidence exists, not that
  // it is complete.
  const dash = '<span class="z">–</span>';
  const n = (k) => (k ? String(k) : dash);
  let disagree = 0;
  const coverRows = [...layers].reverse().map((layer) => {
    const rs = rows.filter((r) => law(r.key).layer === layer);
    if (!rs.length) return "";
    return `        <tr class="cov-band"><th scope="rowgroup" colspan="9"><span>${layer}</span></th></tr>\n` + rs.map((r) => {
      const { listed, named, unnamed, uncited } = vectorEvidence(r, joined);
      const agree = !listed.length && !named.length ? dash
        : !unnamed.length && !uncited.length ? '<span class="ok" title="every cited vector names it, and every vector naming it is cited">✓</span>'
        : (disagree++, `<span class="off" title="${esc([unnamed.length ? `cited, not naming it: ${unnamed.join(", ")}` : "", uncited.length ? `naming it, not cited: ${uncited.join(", ")}` : ""].filter(Boolean).join("; "))}">${unnamed.length ? `−${unnamed.length}` : ""}${unnamed.length && uncited.length ? " " : ""}${uncited.length ? `+${uncited.length}` : ""}</span>`);
      const js = runBy([...listed, ...named]).some((i) => i.checker) ? '<span class="ok">✓</span>' : dash;
      const proved = resolved.get(r.key).length ? n(resolved.get(r.key).length) : r.byConstruction ? '<span class="c" title="by construction">c</span>' : dash;
      return `        <tr><th scope="row"><a href="#${anchor(r.key)}"><code>${esc(r.key)}</code></a></th>` +
        `<td class="sh">${data.shapes[law(r.key).shape].name}</td><td>${proved}</td><td>${n(listed.length)}</td><td>${n(named.length)}</td>` +
        `<td>${agree}</td><td>${js}</td><td>${tried.has(r.key) ? '<span class="ok">✓</span>' : dash}</td>` +
        `<td>${n(restsOn.get(r.key).length)} / ${n(carries.get(r.key).length)}</td></tr>\n`;
    }).join("");
  }).join("");
  const byTheorem = rows.filter((r) => resolved.get(r.key).length).length;
  const byConstructionCount = rows.filter((r) => !resolved.get(r.key).length && r.byConstruction).length;
  const coverage = `    <p class="cov-sum">${byTheorem} laws are theorems and ${byConstructionCount} hold by construction. ` +
    `For ${disagree}, the cited vectors and the vectors naming the law differ. Hover the cell to see which.</p>\n` +
    `    <div class="pan"><div class="cov-scroll"><table class="cov">\n      <thead><tr><th scope="col">law</th><th scope="col">shape</th>` +
    `<th scope="col" title="theorems named, or c: by construction">proved</th><th scope="col" title="vector files laws.md cites">cited</th>` +
    `<th scope="col" title="vector files whose laws field names it">named by</th><th scope="col" title="cited and naming agree">agree</th>` +
    `<th scope="col" title="the JS implementation runs at least one of its vectors">JS</th><th scope="col">demo</th>` +
    `<th scope="col" title="laws its proofs rest on / laws resting on it">rests / carries</th></tr></thead>\n      <tbody>\n${coverRows}      </tbody>\n    </table></div></div>\n`;

  // What rests on what: the laws joined by a proof, laid out when the page is built.
  const mapData = proofMapData(joined);
  const { alone } = mapData;
  const mapSvg = layoutMap(mapData);
  const mapNotes = Object.fromEntries(mapData.nodes.map((m) => [m.id, { label: m.label, sentence: m.sentence }]));
  const aloneNote = `    <p class="note">${alone.length} laws stand alone: their proofs use no other law's theorem. ${alone.map((r) => lawLink(r.key)).join(" ")}</p>\n`;

  const top = header("evidence", [["coverage", "Coverage"], ["map", "Map"], ["chain", "Claim to code"]]);
  let body = read("page.html");
  for (const [name, value] of Object.entries({ header: top, lede, coverage, map: mapSvg, alone: aloneNote, chain, laws: byLayer }))
    body = fill(body, name, value);

  return documentOf(root, {
    head: read("head.html"),
    css: readFileSync(join(root, "design", "laws", "sentence.css"), "utf8") + read("styles.css"),
    body,
    scripts: [`const MAP_NOTES = ${JSON.stringify(mapNotes)};\n`, read("app.js")],
  });
}
