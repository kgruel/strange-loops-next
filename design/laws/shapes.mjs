// A picture for each of the six shapes in laws.json, whose form is its meaning: lanes that
// meet in one state, a loop that comes back to its start, a staircase down in what is held
// whose answers stay, turn unknown or count what they could not read, a strip whose ties are
// broken in turn, a gate with two bins, and a boundary in the limit colour with who accounts
// for it. A reader learns six forms once and reads every law with them.
//
// shapeFigure(shape, law?) returns an inline SVG string, worked out when the page is built.
// Deterministic: the same shape and law always give the same bytes. Given a law (an entry of
// laws.json's `laws`, its key as law.key), the figure is labelled with the law's own words,
// short and truncated; without one it is the shape's generic figure. Each label says no more
// than the words it is taken from.
//
// Colour lives in shapes.css, by class: nothing here names a colour. Motion lives in shapes.js,
// which reads the data-m marks; without it every figure is already complete. Records are
// lettered A, B, C as on the grammar page.

const W = 340;                      // every figure is 340 wide: at 320px, 12-unit text is 11.3px
const SIZE = 12.5;                  // body text; captions are 12 (shapes.css), nothing smaller
const R = 22;                       // a record's square

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const decode = (s) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&amp;/g, "&");
const plain = (html) => decode(html.replace(/<sup>(.*?)<\/sup>/g, "^$1").replace(/<[^>]+>/g, ""));
const n = (v) => String(Math.round(v * 10) / 10);

// ---- words ---------------------------------------------------------------------------------

// A law's words are HTML. <code> keeps its mono face, <sup> becomes ^, other tags go. Each
// token remembers whether a space came before it, so "<code>prev</code>," stays glued.
function tokens(html) {
  const out = [];
  let gap = false;
  const push = (text, code) => {
    for (const piece of text.split(/(\s+)/)) {
      if (!piece) continue;
      if (/^\s+$/.test(piece)) { gap = true; continue; }
      out.push({ t: piece, code, sp: gap && out.length > 0 });
      gap = false;
    }
  };
  const re = /<code>(.*?)<\/code>|<sup>(.*?)<\/sup>|<[^>]+>|([^<]+)/g;
  for (const m of html.matchAll(re)) {
    if (m[1] != null) push(decode(m[1]), true);
    else if (m[2] != null) { if (out.length) out[out.length - 1].t += `^${decode(m[2])}`; }
    else if (m[3] != null) push(decode(m[3]), false);
  }
  return out;
}

// Widths are estimated, not measured: Inter at about .55em a character, the mono at .6em.
// The estimate errs wide, so a line ends early rather than running out of its box.
const charW = (code, size) => size * (code ? 0.61 : 0.555);
const tokW = (k, size) => k.t.length * charW(k.code, size);
const lineW = (line, size) => line.reduce((s, k, i) => s + tokW(k, size) + (i && k.sp ? size * 0.28 : 0), 0);

// Greedy lines no wider than `width`; past `lines`, the last line ends in an ellipsis.
function wrap(html, width, size, lines) {
  const out = [[]];
  for (const k of tokens(html)) {
    const cur = out[out.length - 1];
    if (cur.length && lineW([...cur, k], size) > width) out.push([k]);
    else cur.push(k);
  }
  if (out.length <= lines) return out;
  const kept = out.slice(0, lines);
  const last = kept[lines - 1];
  const dots = { t: "…", code: false, sp: false };
  while (last.length > 1 && lineW([...last, dots], size) > width) last.pop();
  // A word that ends a clause reads better without its comma before the ellipsis.
  last[last.length - 1] = { ...last[last.length - 1], t: last[last.length - 1].t.replace(/[,;:.]$/, "") + "…" };
  return kept;
}

const tspans = (line) => line.map((k, i) =>
  (i && k.sp ? " " : "") + (k.code ? `<tspan class="sg-code">${esc(k.t)}</tspan>` : esc(k.t))).join("");

// A block of wrapped text; returns the markup and how many lines it took.
function words(x, y, html, { width, size = SIZE, lines = 2, lh = 1.3, cls = "sg-t", anchor = "start" } = {}) {
  const ls = wrap(html, width, size, lines);
  const svg = ls.map((l, i) =>
    `<text class="${cls}" x="${n(x)}" y="${n(y + i * size * lh)}"${anchor === "start" ? "" : ` text-anchor="${anchor}"`}${size === SIZE ? "" : ` font-size="${size}"`}>${tspans(l)}</text>`).join("");
  return { svg, lines: ls.length };
}

const cap = (x, y, text, cls = "") =>
  `<text class="sg-cap${cls ? " " + cls : ""}" x="${n(x)}" y="${n(y)}">${esc(text)}</text>`;

// ---- marks ---------------------------------------------------------------------------------

// The motion marks shapes.js reads: what to play (data-m) and when (data-at, seconds).
const mv = (m, at, extra = "") => ` data-m="${m}" data-at="${n(at)}"${extra}`;

// A record: a lettered square, as on the grammar page. `mod` is held (default), withheld
// (dashed: its payload not held), other (faint: about another thing) or tall (doesn't fit).
function rec(x, y, label, { mod = "", w = R, h = R, m = "" } = {}) {
  return `<g class="sg-rec${mod ? " is-" + mod : ""}"${m}><rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" rx="5"/>` +
    `<text x="${n(x + w / 2)}" y="${n(y + h / 2 + 4.5)}" text-anchor="middle">${esc(label)}</text></g>`;
}

// An arrowhead at (x, y), pointing along angle `a` (radians; 0 is right).
function head(x, y, a = 0, cls = "sg-head") {
  const p = (dx, dy) => `${n(x + dx * Math.cos(a) - dy * Math.sin(a))},${n(y + dx * Math.sin(a) + dy * Math.cos(a))}`;
  return `<path class="${cls}" d="M${p(-7, -4)}L${n(x)},${n(y)}L${p(-7, 4)}Z"/>`;
}

const wire = (d, cls = "sg-wire", m = "") => `<path class="${cls}" d="${d}" pathLength="1"${m}/>`;

// A dot that travels the given points once, when the figure is played: the figure's input
// on its way. Invisible otherwise, by its opacity attribute, which is what Motion animates (a
// CSS opacity would outrank it and keep the dot hidden).
const ghost = (pts, at, cls = "") =>
  `<circle class="sg-ghost${cls ? " " + cls : ""}" cx="0" cy="0" r="4" opacity="0"${mv("go", at, ` data-pts="${pts.map(([x, y]) => `${n(x)},${n(y)}`).join(" ")}"`)}/>`;

// A box with a caption and wrapped words, the words centred in the room under the caption:
// the state, an answer.
function box(x, y, w, h, caption, html, { cls = "sg-state", lines = 4, size = SIZE, m = "" } = {}) {
  const k = wrap(html, w - 20, size, lines).length, lh = size * 1.3;
  const top = y + 28, room = h - 28 - 6;
  const body = words(x + 10, top + (room - k * lh) / 2 + size * 0.95, html, { width: w - 20, size, lines, cls: "sg-t sg-ink" });
  return `<g class="${cls}"${m}><rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" rx="9"/>` +
    cap(x + 10, y + 19, caption) + body.svg + "</g>";
}

const pill = (cx, cy, text, { cls = "sg-pill", m = "" } = {}) => {
  const w = text.length * charW(false, SIZE) + 18;
  return `<g class="${cls}"${m}><rect x="${n(cx - w / 2)}" y="${n(cy - 12)}" width="${n(w)}" height="24" rx="12"/>` +
    `<text x="${n(cx)}" y="${n(cy + 4.5)}" text-anchor="middle">${esc(text)}</text></g>`;
};

// ---- invariance: several lanes, one state ---------------------------------------------------

// What an invariance's lanes vary, read from the words of its `change`, first rule that
// matches. Each draws only what its words say; words no rule knows are drawn as the same
// records in other forms (A, A′), which every invariance is. A change inside one record or one
// text (an object's members, a set field's order and repeats, a payload's opening, a section
// dropped from the text) varies a form, not which records arrive or are held, so it comes first.
const LANES = [
  [/member|erases|opening|drop/, "forms"],
  [/repeat|again/, "repeats"],
  [/in parts|refold|cached/, "parts"],
  [/payloads a reader holds|which form/, "hidden"],
  [/other things/, "others"],
  [/order|arriv|first|sync|which way/, "orders"],
];
const LANE_RECS = {
  orders: [["A", "B", "C"], ["C", "A", "B"], ["B", "C", "A"]],
  repeats: [["A", "B", "C"], ["B", "A", "A", "C"], ["C", "B", "C", "A"]],
  parts: [["A", "B", "C"], ["A", "B", "|", "C"], ["A", "|", "B", "|", "C"]],
  hidden: [["A", "B", "C"], ["A", "B?", "C"], ["A?", "B", "C?"]],
  others: [["A", "B"], ["A", "X", "B"], ["Y", "A", "B", "X"]],
  forms: [["A", "B", "C"], ["A′", "B", "C′"], ["A″", "B′", "C"]],
};
export const laneKind = (change) => (LANES.find(([re]) => re.test(plain(change))) ?? [null, "forms"])[1];

function invariance(law) {
  const change = law ? law.change : "the order the records arrive in";
  const stays = law ? law.stays : "the state";
  const kind = law ? laneKind(change) : "orders";
  const top = 70, laneH = 30, laneGap = 10, laneX = 12, laneW = 140;
  const bx = 212, bw = 116, by = top, bh = 3 * laneH + 2 * laneGap;
  const bmid = by + bh / 2;
  let out = cap(12, 18, "change") + words(12, 38, change, { width: W - 24, lines: 2, cls: "sg-t sg-ink" }).svg;
  LANE_RECS[kind].forEach((lane, i) => {
    const y = top + i * (laneH + laneGap), mid = y + laneH / 2;
    out += `<rect class="sg-lane" x="${laneX}" y="${y}" width="${laneW}" height="${laneH}" rx="8"/>`;
    let x = laneX + 8;
    lane.forEach((r, j) => {
      const at = 0.08 * i + 0.06 * j;
      if (r === "|") { out += `<path class="sg-cut" d="M${n(x + 2)},${y + 5}V${y + laneH - 5}"/>`; x += 8; return; }
      const mod = r.endsWith("?") ? "withheld" : /[XY]/.test(r) ? "other" : "";
      out += rec(x, y + 4, r.replace("?", ""), { mod, m: mv("in", at) });
      x += R + 6;
    });
    // Each lane runs into the one state: the curves meet where the claim is.
    const x0 = laneX + laneW + 4, x1 = bx - 2;
    out += wire(`M${x0},${mid}C${x0 + 30},${mid} ${x1 - 34},${bmid} ${x1},${bmid}`, "sg-wire", mv("draw", 0.3 + 0.08 * i));
    out += ghost([[x0, mid], [x0 + 22, mid + (bmid - mid) * 0.25], [x1 - 18, bmid - (bmid - mid) * 0.08], [x1 + 10, bmid]], 0.55 + 0.12 * i);
  });
  out += head(bx - 2, bmid);
  out += box(bx, by, bw, bh, "stays", stays, { lines: 4, m: mv("pulse", 1.0) });
  const title = law ? `Invariance: change ${plain(change)}, and ${plain(stays)} stays.` : "Invariance: change this, and that stays.";
  return { h: top + bh + 12, body: out, title };
}

// ---- round trip: a loop back to the start ---------------------------------------------------

// Which way a round trip goes can't be read from its words ("Parse an unedited render" goes
// render first), so the laws say it here, by key; a round trip not listed fails the build
// rather than be drawn in a guessed direction. `join` is what is said where the loop closes;
// `end` names what comes back when it isn't what went out (lens.no-op ends in no edits).
const TRIPS = {
  "lens.round-trip": { start: ["sections", "form"], out: "render", mid: ["text", "text"], back: "parse", join: "the same sections" },
  "lens.escaping": { start: ["any body", "text"], out: "render", mid: ["section text", "text"], back: "parse", join: "the same body" },
  "lens.no-op": { start: ["the base", "form"], out: "render", mid: ["unedited text", "text"], back: "parse", end: ["no edits", ""], join: "nothing to apply" },
  "lens.put-get": { start: ["an edit", "text"], out: "apply", mid: ["the state", "form"], back: "render", join: "the same, in normal form" },
  "spec.parse": { start: ["a parsed spec", "form"], out: "print", mid: ["spec JSON", "text"], back: "parse", join: "the same spec" },
};
const GENERIC_TRIP = { start: ["text", "text"], out: "parse", mid: ["parsed form", "form"], back: "render", join: "the same text" };

// A station: a sheet with its name and a glyph of what it holds, lines of text or records.
function station(x, y, w, name, kind, m) {
  let g = `<g class="sg-sheet"${m}><rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="50" rx="8"/>` +
    words(x + 10, y + 19, name, { width: w - 20, lines: 1, cls: "sg-t sg-ink" }).svg;
  if (kind === "text") for (let i = 0; i < 2; i++) g += `<path class="sg-lines" d="M${x + 10},${y + 31 + i * 8}H${x + w - (i ? 34 : 18)}"/>`;
  else if (kind === "form") for (let i = 0; i < 3; i++) g += `<rect class="sg-mini" x="${x + 10 + i * 15}" y="${y + 28}" width="11" height="11" rx="2.5"/>`;
  return g + "</g>";
}

function roundTrip(law) {
  if (law && !TRIPS[law.key]) throw new Error(`shapes: no way round for the round trip ${law.key}; add it to TRIPS`);
  const t = law ? TRIPS[law.key] : GENERIC_TRIP;
  const end = t.end ?? t.start;
  const sx = 12, sw = 118, s1 = 26, s2 = 136;          // the join: where the loop starts and ends
  const fx = 214, fw = 114, fy = 81;                    // the far side
  const fcx = fx + fw / 2;
  let out = "";
  out += station(sx, s1, sw, t.start[0], t.start[1], mv("in", 0));
  out += station(fx, fy, fw, t.mid[0], t.mid[1], mv("in", 0.45));
  out += station(sx, s2, sw, end[0], end[1], mv("in", 0.95));
  // Out along the top, round the far side, back along the bottom.
  const a = `M${sx + sw + 4},${s1 + 25}H${fcx - 22}C${fcx - 2},${s1 + 25} ${fcx},${s1 + 35} ${fcx},${fy - 6}`;
  const b = `M${fcx},${fy + 56}C${fcx},${s2 + 15} ${fcx - 2},${s2 + 25} ${fcx - 22},${s2 + 25}H${sx + sw + 6}`;
  out += wire(a, "sg-wire sg-strong", mv("draw", 0.15)) + head(fcx, fy - 4, Math.PI / 2);
  out += wire(b, "sg-wire sg-strong", mv("draw", 0.65)) + head(sx + sw + 4, s2 + 25, Math.PI);
  out += `<text class="sg-verb" x="${n((sx + sw + fcx) / 2 - 8)}" y="${s1 + 18}" text-anchor="middle">${esc(t.out)}</text>`;
  out += `<text class="sg-verb" x="${n((sx + sw + fcx) / 2 - 8)}" y="${s2 + 42}" text-anchor="middle">${esc(t.back)}</text>`;
  // The join: what came back set against what went out.
  const jy = (s1 + 50 + s2) / 2;
  out += `<path class="sg-bracket" d="M${sx + 24},${s1 + 54}V${s2 - 4}"/>`;
  const jw = fx - 10 - (sx + 54), jk = wrap(t.join, jw, SIZE, 2).length;
  const said = words(sx + (t.end ? 34 : 54), jy + 4 - (jk - 1) * SIZE * 0.65, t.join, { width: jw, lines: 2, cls: "sg-t sg-ink" }).svg;
  out += `<g${mv("pulse", 1.25)}>` + (t.end ? "" : `<text class="sg-eq" x="${sx + 34}" y="${n(jy + 7)}">=</text>`) + said + "</g>";
  out += ghost([[sx + sw + 4, s1 + 25], [fcx - 22, s1 + 25], [fcx, fy - 4], [fcx, fy + 56], [fcx - 22, s2 + 25], [sx + sw + 4, s2 + 25]], 0.3);
  const title = law
    ? `Round trip: ${t.start[0]}, ${t.out} to ${t.mid[0]}, ${t.back}, and ${t.join}.`
    : "Round trip: there and back gives what you started with.";
  return { h: s2 + 50 + 10, body: out, title };
}

// ---- refinement: a staircase of less in view --------------------------------------------------

// The answers each step gives. A law that counts what it can't read instead of guessing
// (result.unread) says how many are unread; any other says yes, yes, unknown. A law that says
// nothing is unread (result.full) draws no step with less in: see `full`.
const ANSWERS = {
  answer: { steps: ["yes", "yes", "unknown"], wrong: "no" },
  unread: { steps: ["0 unread", "1 unread", "2 unread"], wrong: "guess" },
};

// What result.full states and no more: every record answered and readable, none unread. One
// step, with everything held; no withheld records and no wrong answer to strike out.
function full(law) {
  const head0 = words(12, 20, law.says, { width: W - 24, lines: 3, cls: "sg-t sg-ink" });
  const ty = 26 + head0.lines * 16 + 42, py = ty + 50, cx = 12 + 39;
  let out = head0.svg + cap(12, ty - 34, "every record answered and readable");
  ["A", "B", "C"].forEach((r, j) => out += rec(12 + j * 28, ty - 27, r, { m: mv("in", 0.05 * j) }));
  out += wire(`M${cx},${ty + 4}V${py - 14}`, "sg-wire", mv("draw", 0.2));
  out += pill(cx, py, "0 unread", { m: mv("pop", 0.4) });
  return { h: py + 24, body: out, title: `Refinement: ${plain(law.says)}` };
}

function refinement(law) {
  if (law && /nothing is unread/.test(plain(law.says))) return full(law);
  const a = law && /unread|instead of guessing/.test(plain(law.says)) ? ANSWERS.unread : ANSWERS.answer;
  const cols = [12, 104, 196], cw = 88;
  const held = [["A", "B", "C"], ["A", "B?", "C"], ["A?", "B", "C?"]];
  const steps = ["all held", "one withheld", "two withheld"];
  const head0 = words(12, 20, law ? law.says : "Fewer payloads held, step by step:", { width: W - 24, lines: 2, cls: "sg-t sg-ink" });
  const y0 = 26 + head0.lines * 16;               // the first step's caption
  const tread = (i) => y0 + 42 + i * 26;
  let out = head0.svg;
  // The stair: each tread a step down in what the reader holds.
  out += `<path class="sg-stair" d="M${cols[0]},${tread(0)}H${cols[0] + cw + 4}V${tread(1)}H${cols[1] + cw + 4}V${tread(2)}H${W - 12}"/>`;
  const py = tread(2) + 50;                            // the answers, side by side
  cols.forEach((x, i) => {
    const ty = tread(i);
    out += cap(x, ty - 34, steps[i]);
    held[i].forEach((r, j) => out += rec(x + j * 28, ty - 27, r.replace("?", ""), { mod: r.endsWith("?") ? "withheld" : "", m: mv("in", 0.25 * i + 0.05 * j) }));
    const cx = i === 2 ? x + 30 : x + 39;
    out += wire(`M${cx},${ty + 4}V${py - 14}`, "sg-wire", mv("draw", 0.25 * i + 0.2));
    out += pill(cx, py, a.steps[i], { cls: a.steps[i] === "unknown" ? "sg-pill is-unknown" : "sg-pill", m: mv("pop", 0.25 * i + 0.4) });
  });
  // The path never taken: to a wrong answer, drawn, then struck out.
  const wx = W - 34, ty2 = tread(2);
  out += wire(`M${cols[2] + 64},${ty2 + 4}C${cols[2] + 64},${ty2 + 26} ${wx},${ty2 + 18} ${wx},${py - 14}`, "sg-wire sg-never", mv("draw", 1.0));
  out += pill(wx, py, a.wrong, { cls: "sg-pill is-never", m: mv("pop", 1.2) });
  const ww = a.wrong.length * charW(false, SIZE) + 18;
  out += `<path class="sg-strike" d="M${n(wx - ww / 2 - 3)},${py + 9}L${n(wx + ww / 2 + 3)},${py - 9}" pathLength="1"${mv("draw", 1.45)}/>`;
  out += `<text class="sg-cap" x="${wx}" y="${py + 32}" text-anchor="middle">never</text>`;
  const title = law
    ? `Refinement: ${plain(law.says)}`
    : "Refinement: with less in, an answer stays, becomes unknown, or says how much it could not read.";
  return { h: py + 42, body: out, title };
}

// ---- order: a strip whose ties are broken, key after key -----------------------------------

// The keys an order compares by, read from its words: "by span, then emitted, then id". A law
// that orders by code units compares unit after unit; one about complements is drawn as a
// split instead (see complements below).
export function orderKeys(says) {
  const s = plain(says);
  if (/code units/.test(s)) return { keys: ["unit 1", "unit 2", "unit 3"], strings: true, by: "by UTF-16 code units, one after another" };
  const clause = s.split(/[.:;]\s*/).find((c) => /, then /.test(c));
  if (!clause) return null;
  const keys = clause.split(/, then /).map((k, i) => (i === 0 ? k.replace(/^.*\bby /, "") : k).split(",")[0].trim());
  return { keys, strings: false, by: `by ${keys.join(", then ")}`, openLast: /open end last/.test(s) };
}

function order(law) {
  if (law && /complement/.test(plain(law.says))) return complements(law);
  const o = (law && orderKeys(law.says)) || { keys: ["key 1", "key 2", "key 3"], strings: false, by: "by one key, then the next where they tie" };
  const k = o.keys.length, cnt = k + 1;
  // Values: at row r the first record still tied is the smaller; the rest tie, and go on.
  const strs = ["ba", "ca", "cba", "cbb"];
  const val = (r, c) => {
    if (o.strings) return strs[c][r];
    if (o.openLast && r === k - 1) return c === r ? "4" : "open";
    return String(c === r ? [1, 5, "c", "e"][r] : [2, 7, "f", "h"][r]);
  };
  const gx = 72, x0 = gx + 6, colW = (W - 12 - x0) / cnt;
  const cx = (c) => x0 + colW * c + colW / 2;
  const cw = o.strings ? 34 : R;
  let out = words(12, 20, o.by, { width: W - 24, lines: 1, cls: "sg-t sg-ink" }).svg;
  const ry = 34;
  for (let c = 0; c < cnt; c++) {
    out += rec(cx(c) - cw / 2, ry, o.strings ? strs[c] : "ABCDE"[c], { w: cw, m: mv("in", 0.06 * c) });
    if (c) out += `<text class="sg-lt" x="${n(cx(c) - colW / 2)}" y="${ry + 16}" text-anchor="middle">&lt;</text>`;
  }
  const row = (r) => ry + R + 34 + r * 36;
  for (let r = 0; r < k; r++) {
    const y = row(r);
    out += `<g${mv("in", 0.35 + 0.4 * r)}>`;
    out += `<text class="sg-key" x="12" y="${y}">${esc(o.keys[r].length > 9 ? o.keys[r].slice(0, 8) + "…" : o.keys[r])}</text>`;
    for (let c = 0; c < cnt; c++) {
      // Records already placed by an earlier key aren't compared again.
      if (c < r) { out += `<circle class="sg-done" cx="${n(cx(c))}" cy="${y - 4}" r="1.6"/>`; continue; }
      out += `<text class="${c === r ? "sg-val is-decides" : "sg-val"}" x="${n(cx(c))}" y="${y}" text-anchor="middle">${esc(val(r, c))}</text>`;
    }
    // The one this key places: smallest of those still tied, marked under its value.
    out += `<path class="sg-decide" d="M${n(cx(r) - 9)},${y + 6}H${n(cx(r) + 9)}"/>`;
    // The rest still tie on this key: bracketed together, on to the next.
    if (cnt - r > 2) out += `<path class="sg-tie" d="M${n(cx(r + 1) - 12)},${y + 5}v5H${n(cx(cnt - 1) + 12)}v-5"/>`;
    out += "</g>";
  }
  const title = law ? `Order: ${plain(law.says)}` : "Order: any two distinct things compare one way, by one key, then the next where they tie.";
  return { h: row(k - 1) + 18, body: out, title };
}

// Complements: of a test and its complement, exactly one holds where the test answers; on a
// payload the reader doesn't hold both are unknown (where.complements' scope says so).
function complements(law) {
  const s = plain(law.says);
  const [, no, yes] = s.match(/(\w[\w-]*) is the complement of (\w[\w-]*)/) ?? [null, "not", "is"];
  let out = words(12, 20, "exactly one holds, where the test answers", { width: W - 24, lines: 1, cls: "sg-t sg-ink" }).svg;
  const y = 34, h = 74, mid = W / 2;
  out += `<rect class="sg-field" x="12" y="${y}" width="${W - 24}" height="${h}" rx="10"/>`;
  out += `<path class="sg-split" d="M${mid},${y + 8}V${y + h - 8}"/>`;
  out += `<text class="sg-key" x="24" y="${y + 22}">${esc(yes)}</text><text class="sg-key" x="${mid + 12}" y="${y + 22}">${esc(no)}</text>`;
  ["A", "C"].forEach((l, i) => out += rec(24 + i * 30, y + 36, l, { m: mv("in", 0.1 + 0.15 * i) }));
  ["B", "D"].forEach((l, i) => out += rec(mid + 12 + i * 30, y + 36, l, { m: mv("in", 0.18 + 0.15 * i) }));
  const ey = y + h + 14;
  out += rec(12, ey, "E", { mod: "withheld", m: mv("in", 0.6) });
  out += words(44, ey + 15, "payload not held: both unknown", { width: W - 56, lines: 1 }).svg;
  return { h: ey + R + 10, body: out, title: `Order: ${s}` };
}

// ---- exactness: a gate with two bins --------------------------------------------------------

// A law that speaks of accepting or refusing gets bins named accepted and refused; any other
// law, in and out. A refusal is tagged only when the law says what it carries: a code it names
// (its own <code> words that look like codes, kebab-case), or "a reason" it says is stated.
// What doesn't fit is drawn too tall for the gate's opening.
export const refusalCodes = (says) => [...says.matchAll(/<code>([a-z]+(?:-[a-z]+)+)<\/code>/g)].map((m) => m[1]);

function exactness(law) {
  const refusing = !law || /refus|accept/.test(plain(law.says));
  // Each refusal's tag, as HTML: a code the law names, in its mono face, or else plain words.
  const codes = law ? refusalCodes(law.says).map((c) => `<code>${c}</code>`) : [];
  const tags = !refusing ? null
    : codes.length ? [codes[0], codes[1] ?? codes[0]]
    : !law ? ["a stated reason", "another reason"]
    : /reason/.test(plain(law.says)) ? ["with its reason", "with its reason"] : null;
  const gy = 58, open = 28, gx = 140;                  // the gate, its opening a record's height
  const tallH = 34;
  let out = "";
  [["A", ""], ["B", "tall"], ["C", ""], ["D", "tall"]].forEach(([l, mod], i) => {
    const h = mod ? tallH : R;
    out += rec(12 + i * 28, gy - h / 2, l, { mod, h, m: mv("in", 0.06 * i) });
  });
  out += `<rect class="sg-gate" x="${gx}" y="${gy - open / 2 - 30}" width="7" height="30" rx="2"/>`;
  out += `<rect class="sg-gate" x="${gx}" y="${gy + open / 2}" width="7" height="30" rx="2"/>`;
  // Through the opening, to the bin of what was taken.
  const ax = 186, aw = W - 12 - ax;
  out += wire(`M${122},${gy}H${ax - 4}`, "sg-wire sg-strong", mv("draw", 0.3)) + head(ax - 2, gy);
  out += `<g${mv("pulse", 1.0)}><rect class="sg-bin" x="${ax}" y="${gy - 34}" width="${aw}" height="68" rx="9"/>` +
    cap(ax + 10, gy - 14, refusing ? "accepted" : "in: all that fit") +
    rec(ax + 10, gy - 4, "A") + rec(ax + 38, gy - 4, "C") + "</g>";
  // What doesn't fit turns down before the gate, into the other bin, below the whole width.
  const ry = gy + 58, rx = 12, rw = W - 24;
  out += wire(`M${gx - 8},${gy}C${gx - 8},${gy + 30} ${gx - 8},${gy + 30} ${gx - 8},${ry - 4}`, "sg-wire", mv("draw", 0.55)) + head(gx - 8, ry - 2, Math.PI / 2);
  const rh = tags ? 30 + 2 * (tallH + 8) : 30 + tallH + 10;
  out += `<g${mv("pulse", 1.3)}><rect class="sg-bin is-out" x="${rx}" y="${ry}" width="${rw}" height="${rh}" rx="9"/>` +
    cap(rx + 10, ry + 19, refusing ? "refused" : "out: the rest");
  ["B", "D"].forEach((l, i) => {
    if (tags) {
      const y = ry + 28 + i * (tallH + 8);
      out += rec(rx + 10, y, l, { mod: "tall", h: tallH });
      out += words(rx + 44, y + tallH / 2 + 4.5, tags[i], { width: rw - 54, lines: 1, cls: "sg-t sg-ink" }).svg;
    } else out += rec(rx + 10 + i * 30, ry + 28, l, { mod: "tall", h: tallH });
  });
  out += "</g>";
  out += ghost([[118, gy], [gx + 3, gy], [ax + 30, gy]], 0.5);
  out += ghost([[118, gy], [gx - 8, gy + 6], [gx - 8, ry + 20]], 0.8);
  const title = law ? `Exactness: ${plain(law.says)}` : "Exactness: accepted exactly when it fits; where the law refuses, it says what it refuses with.";
  return { h: ry + rh + 10, body: out, title };
}

// ---- limit: the boundary, in the limit colour, and who accounts for it ---------------------

// From a limit's words: what moves (the first sentence, after its colon if it has one) and
// who accounts for it (the sentence beginning "So").
export function limitParts(says) {
  const s = plain(says);
  const so = s.match(/\bSo (.*?)\.?$/);
  const first = (so ? s.slice(0, so.index).trim() : s).split(/(?<=\.)\s+/)[0].replace(/\.$/, "");
  const moves = first.includes(":") ? first.split(":").pop().trim() : first;
  return { moves, party: so ? so[1] : null, repeats: /twice|again|doubles/.test(s), noun: (s.match(/the (\w+) doubles/) ?? [])[1] ?? null };
}

function limit(law) {
  const p = law ? limitParts(law.says) : { moves: "the answer", party: "whoever the law names", repeats: false, noun: null };
  if (!p.party) throw new Error(`shapes: limit ${law.key} names nobody who accounts for it (a sentence beginning "So")`);
  const lane = p.repeats ? ["A", "B", "C", "A", "B", "C"] : ["A", "B", "C"];
  const ly = 86, lw = p.repeats ? 18 : R;
  let out = "";
  if (p.repeats) out += cap(12 + 3 * (lw + 4), ly - lw / 2 - 8, "again");
  lane.forEach((l, i) => out += rec(12 + i * (lw + 4), ly - lw / 2, l, { w: lw, h: lw, m: mv("in", 0.05 * i) }));
  const lx = 12 + lane.length * (lw + 4) + 2;
  const bx = 212, bw = W - 12 - bx;
  // Without whoever accounts for it, the answer moves: in the limit colour.
  const upY = 12, upH = 66, upM = upY + upH / 2;
  out += wire(`M${lx},${ly}C${lx + 30},${ly} ${bx - 40},${upM} ${bx - 4},${upM}`, "sg-wire sg-limit-wire", mv("draw", 0.3)) + head(bx - 2, upM, 0, "sg-head sg-limit-head");
  const moved = p.noun === "count" ? `${p.moves}: 6` : p.moves;
  out += box(bx, upY, bw, upH, "moves", moved, { cls: "sg-state is-moved", lines: 2, m: mv("pulse", 1.0) });
  // Through the boundary, it holds.
  const dnY = 100, dnH = 44, dnM = dnY + dnH / 2, wallX = 184;
  out += wire(`M${lx},${ly}C${lx + 30},${ly} ${wallX - 30},${dnM} ${bx - 4},${dnM}`, "sg-wire sg-strong", mv("draw", 0.55)) + head(bx - 2, dnM);
  out += `<rect class="sg-wall" x="${wallX - 3}" y="${dnY - 6}" width="6" height="${dnH + 12}" rx="2"/>`;
  const held = p.noun === "count" ? "the count: 3" : p.noun ? `the ${p.noun}, once each` : "holds";
  out += `<g class="sg-state"${mv("pulse", 1.3)}><rect x="${bx}" y="${dnY}" width="${bw}" height="${dnH}" rx="9"/>` +
    words(bx + 10, dnM + 4.5, held, { width: bw - 20, lines: 1, cls: "sg-t sg-ink" }).svg + "</g>";
  // Who accounts for it: a rule from the boundary, and their words under it.
  const py = dnY + dnH + 40;
  out += `<path class="sg-leader" d="M${wallX},${dnY + dnH + 6}V${py - 18}H12"/>`;
  out += cap(12, py, "who accounts for it", "sg-limit-t");
  const party = words(12, py + 20, p.party.charAt(0).toUpperCase() + p.party.slice(1), { width: W - 24, lines: 2, cls: "sg-t sg-ink" });
  out += party.svg;
  out += ghost([[lx, ly], [lx + 40, ly - 22], [bx - 30, upM], [bx + 10, upM]], 0.6, "is-limit");
  out += ghost([[lx, ly], [lx + 40, ly + 10], [wallX, dnM], [bx + 10, dnM]], 0.85);
  // A repeat meets the boundary and goes no further: the store hands each id over once.
  if (p.repeats) out += ghost([[lx, ly], [lx + 40, ly + 10], [wallX - 6, dnM]], 1.05, "is-stopped");
  const title = law ? `Limit: ${plain(law.says)}` : "Limit: this one moves, or can't be done here, and here is who accounts for it.";
  return { h: py + 20 + (party.lines - 1) * SIZE * 1.3 + 10, body: out, title };
}

// ---- the figure ---------------------------------------------------------------------------

const FIGURES = { invariance, "round-trip": roundTrip, refinement, order, exactness, limit };
export const SHAPES = Object.keys(FIGURES);

export function shapeFigure(shape, law) {
  const draw = FIGURES[shape];
  if (!draw) throw new Error(`shapes: no figure for shape ${shape}`);
  if (law && law.shape !== shape) throw new Error(`shapes: ${law.key ?? "a law"} is ${law.shape}, not ${shape}`);
  const { h, body, title } = draw(law);
  return `<svg class="shape-fig sg-${shape}" viewBox="0 0 ${W} ${n(h)}" width="100%" role="img" data-shape="${shape}"${law?.key ? ` data-law="${esc(law.key)}"` : ""}>` +
    `<title>${esc(title)}</title>${body}</svg>`;
}
