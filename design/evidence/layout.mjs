// The law map's layout, worked out when the page is built, so the page carries a finished
// SVG: no layout library, nothing to download, and a map without scripts. Deterministic:
// the same laws and edges always give the same drawing, so CI can diff it.
//
// Bands, one per layer, top to bottom. Within a band, a law sits a row below every law of
// its band that rests on it (the longest path over the band's own edges). Rows are ordered
// by barycenter sweeps over every edge, wrapped when too wide, and each law is then pulled
// toward the laws it is joined to. An edge runs from the bottom of the law whose proof uses
// a theorem to the top of the law that owns it.

const CHAR = 6.6, PAD = 20, H = 26, GAP = 12, ROW = 30, BAND = 20, LEFT = 96, MAXW = 760;

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function layoutMap({ layers, nodes, edges }) {
  const byId = new Map(nodes.map((n) => [n.id, { ...n, w: Math.round(n.label.length * CHAR) + PAD, band: layers.indexOf(n.layer) }]));
  const down = new Map([...byId.keys()].map((k) => [k, []])), up = new Map([...byId.keys()].map((k) => [k, []]));
  for (const [a, b] of edges) { down.get(a).push(b); up.get(b).push(a); }

  // Levels within a band: one below every in-band law resting on it; a cycle is cut where found.
  const level = new Map();
  const visiting = new Set();
  const levelOf = (k) => {
    if (level.has(k)) return level.get(k);
    if (visiting.has(k)) return 0;
    visiting.add(k);
    const n = byId.get(k);
    const above = up.get(k).filter((a) => byId.get(a).band === n.band);
    const l = above.length ? Math.max(...above.map((a) => levelOf(a) + 1)) : 0;
    visiting.delete(k);
    level.set(k, l);
    return l;
  };
  const ids = [...byId.keys()].sort();
  ids.forEach(levelOf);

  // Rows: by band, then level; each starts in name order.
  let rows = [];
  for (let b = 0; b < layers.length; b++) {
    const inBand = ids.filter((k) => byId.get(k).band === b);
    const depth = Math.max(-1, ...inBand.map((k) => level.get(k)));
    for (let l = 0; l <= depth; l++) rows.push({ band: b, ids: inBand.filter((k) => level.get(k) === l) });
  }
  rows = rows.filter((r) => r.ids.length);

  // Barycenter sweeps: order each row by where its neighbours sit, down then up.
  const rowOf = () => { const m = new Map(); rows.forEach((r, i) => r.ids.forEach((k, j) => m.set(k, [i, j / Math.max(1, r.ids.length - 1)]))); return m; };
  for (let sweep = 0; sweep < 12; sweep++) {
    const downward = sweep % 2 === 0;
    const order = downward ? rows : [...rows].reverse();
    for (const r of order) {
      const at = rowOf();
      const key = (k) => {
        const ns = (downward ? up.get(k) : down.get(k)).map((x) => at.get(x)[1]);
        return ns.length ? ns.reduce((s, x) => s + x, 0) / ns.length : at.get(k)[1];
      };
      const keys = new Map(r.ids.map((k) => [k, key(k)]));
      r.ids = [...r.ids].sort((x, y) => keys.get(x) - keys.get(y) || (x < y ? -1 : 1));
    }
  }

  // Wrap a row too wide for the column into rows of its band, keeping its order.
  const width = (ks) => ks.reduce((s, k) => s + byId.get(k).w, 0) + GAP * (ks.length - 1);
  rows = rows.flatMap((r) => {
    if (width(r.ids) <= MAXW) return [r];
    const out = [];
    let cur = [];
    for (const k of r.ids) {
      if (cur.length && width([...cur, k]) > MAXW) { out.push({ band: r.band, ids: cur }); cur = []; }
      cur.push(k);
    }
    out.push({ band: r.band, ids: cur });
    return out;
  });

  // x: pack each row, then pull every law toward its neighbours without overlapping.
  const W = Math.max(...rows.map((r) => width(r.ids)));
  const x = new Map();
  for (const r of rows) {
    let at = (W - width(r.ids)) / 2;
    for (const k of r.ids) { x.set(k, at); at += byId.get(k).w + GAP; }
  }
  const centre = (k) => x.get(k) + byId.get(k).w / 2;
  for (let pass = 0; pass < 8; pass++) {
    for (const r of rows) {
      const want = r.ids.map((k) => {
        const ns = [...up.get(k), ...down.get(k)];
        return ns.length ? ns.reduce((s, n) => s + centre(n), 0) / ns.length - byId.get(k).w / 2 : x.get(k);
      });
      // Left to right, then right to left, each keeping the gap and the frame.
      let prev = -Infinity;
      r.ids.forEach((k, i) => { const v = Math.max(want[i], prev, 0); x.set(k, v); prev = v + byId.get(k).w + GAP; });
      let next = Infinity;
      for (let i = r.ids.length - 1; i >= 0; i--) {
        const k = r.ids[i], w = byId.get(k).w;
        const v = Math.min(x.get(k), next - w, W - w);
        x.set(k, v); next = v - GAP;
      }
    }
  }

  // y: rows top to bottom, a band's rows together, a little air between bands.
  const y = new Map(), bands = [];
  let at = 16;
  rows.forEach((r, i) => {
    if (i && rows[i - 1].band !== r.band) at += BAND;
    for (const k of r.ids) y.set(k, at);
    const band = bands.find((b) => b.band === r.band);
    if (band) band.y1 = at + H; else bands.push({ band: r.band, y0: at, y1: at + H });
    at += H + ROW;
  });
  const height = at - ROW + 16;
  const total = W + LEFT + 16;

  // The drawing.
  const px = (v) => Math.round(v * 10) / 10;
  const paths = edges.map(([a, b, via]) => {
    const A = byId.get(a), B = byId.get(b);
    const x1 = LEFT + centre(a), y1 = y.get(a) + H, x2 = LEFT + centre(b), y2 = y.get(b);
    const dy = (y2 - y1) / 2;
    const d = `M${px(x1)} ${px(y1)} C${px(x1)} ${px(y1 + dy)},${px(x2)} ${px(y2 - dy)},${px(x2)} ${px(y2)}`;
    const v = esc(via.map((t) => t.replace(/^Loops\./, "")).join(" → "));
    return `<g class="edge" data-a="${a}" data-b="${b}" data-via="${v}"><path class="hit" d="${d}"/><path class="line" d="${d}"/></g>`;
  });
  const bandRects = bands.map((b, i) =>
    `<rect class="band${i % 2 ? " alt" : ""}" x="0" y="${px(b.y0 - 9)}" width="${px(total)}" height="${px(b.y1 - b.y0 + 18)}"/>` +
    `<text class="band-l" x="14" y="${px((b.y0 + b.y1) / 2 + 4)}">${esc(layers[b.band])}</text>`);
  const nodeEls = ids.map((k) => {
    const n = byId.get(k);
    return `<a class="node${n.shape === "limit" ? " limit" : ""}" href="#${k}" data-id="${k}" transform="translate(${px(LEFT + x.get(k))} ${px(y.get(k))})">` +
      `<title>${esc(n.label)}</title><rect width="${n.w}" height="${H}" rx="7"/><text x="10" y="17">${esc(n.label)}</text></a>`;
  });
  return `<svg viewBox="0 0 ${px(total)} ${px(height)}" width="100%" style="min-width:${Math.round(total * 0.85)}px;max-width:${Math.round(total)}px" ` +
    `role="group" aria-label="Which laws each law's proof rests on">\n` +
    `<g class="bands">${bandRects.join("")}</g>\n<g class="edges">\n${paths.join("\n")}\n</g>\n<g class="nodes">\n${nodeEls.join("\n")}\n</g>\n</svg>\n`;
}
