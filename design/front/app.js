const LAWS = /*data:LAWS*/;
const RULED = /*data:RULED*/;

// Hand-written words: the grammar's nouns, verbs, layers and walk, in the site's voice.

const STATUS = /*data:STATUS*/;

const NOUN_GROUPS = /*data:NOUN_GROUPS*/;

const NOUNS = /*data:NOUNS*/;

const VERBS = /*data:VERBS*/;

const CONSTRUCTIONS = /*data:CONSTRUCTIONS*/;

const LAYERS = /*data:LAYERS*/;

const PROVENANCE = /*data:PROVENANCE*/;

// The walk. Records, heads, counts and the lens edit come from vectors/scenario/01-decision
// (through the built page's WALK). Only the words are new.
const WALK_TEXT = /*data:WALK_TEXT*/;

// The decisions waiting on Kyle, from DECISIONS.md (IS1 to IS11, put 2026-11-24).
// Examples marked `run` were run with the loops binary at c483cb9; their output is verbatim.
const DEC = /*data:DEC*/;
const DEC_AT = /*data:DEC_AT*/;

// What depends on what, read from the entries' own words.
const DEC_EDGES = /*data:DEC_EDGES*/;




// Copied from design/grammar/words.json and the built page's WALK (vectors/scenario/01-decision).

const REFUSALS = /*data:REFUSALS*/;

const MATRIX = /*data:MATRIX*/;

const WALK = /*data:WALK*/;

const SENTENCE = /*data:SENTENCE*/;

const ISSHORT = /*data:ISSHORT*/;


/* ---------- Guide data ---------- */
const G_ANNOT = /*data:G_ANNOT*/;
const G_DIAGRAMS = /*data:G_DIAGRAMS*/;

// The ten minutes, as drawn. Ids and fields are the guide's own.
const G_FIRST = /*data:G_FIRST*/;
const G_STEP_NOTES = /*data:G_STEP_NOTES*/;

// The three cases of sets. Drawn by hand to show the rule.
const G_SETS = /*data:G_SETS*/;

const G_SHAPES = /*data:G_SHAPES*/;
const G_SHAPE_LABELS = /*data:G_SHAPE_LABELS*/;
const G_SHAPE_KINDS = /*data:G_SHAPE_KINDS*/;

// The book, as print.jq prints it at each step.
const P11 = /*data:P11*/;
const P12a = /*data:P12a*/;
const P12b = /*data:P12b*/;
const P12c = /*data:P12c*/;
const P12s = /*data:P12s*/;
const P21 = /*data:P21*/;
const G_BOOK = /*data:G_BOOK*/;
const G_BOOK_NOTES = /*data:G_BOOK_NOTES*/;

(() => {
  "use strict";
  const $ = (q, r = document) => r.querySelector(q);
  const $$ = (q, r = document) => [...r.querySelectorAll(q)];
  const NS = "http://www.w3.org/2000/svg";
  const sv = (tag, attrs = {}, parent) => {
    const e = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) if (v != null) e.setAttribute(k, v);
    if (parent) parent.appendChild(e);
    return e;
  };
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const strip = (html) => { const d = document.createElement("div"); d.innerHTML = html; return d.textContent; };
  const RM = window.matchMedia ? matchMedia("(prefers-reduced-motion: reduce)") : { matches: false };
  const reduced = () => RM.matches;
  const local = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* private window */ } },
  };
  const ease = (t) => (t < 0 ? 0 : t > 1 ? 1 : t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
  const lerp = (a, b, t) => a + (b - a) * t;

  /* ---------- shared bits ---------- */
  const SHAPE = /*data:SHAPE*/;
  const chip = (st) => `<span class="st ${st}"><i aria-hidden="true">${STATUS[st].mark}</i>${STATUS[st].name}</span>`;
  const lawChip = (name) => LAWS[name] ? `<button class="law" data-law="${name}" aria-expanded="false">${name}<span class="sh" aria-hidden="true">${SHAPE[LAWS[name][1]] || ""}</span></button>` : "";
  const lawRow = (names) => names && names.length ? `<div class="laws">${names.map(lawChip).join("")}</div>` : "";

  // Law popover
  const pop = $("#pop");
  let popFor = null;
  function closePop() { if (popFor) popFor.setAttribute("aria-expanded", "false"); popFor = null; pop.hidden = true; }
  function openPop(btn) {
    const name = btn.dataset.law, L = LAWS[name];
    if (!L) return;
    if (popFor === btn) { closePop(); return; }
    closePop();
    popFor = btn; btn.setAttribute("aria-expanded", "true");
    pop.innerHTML = `<div class="pn"><span>${esc(name)}</span><span>${esc(L[1])} ${SHAPE[L[1]] || ""}</span></div><div class="ps"></div><a href="#${esc(L[0])}">Open on the Laws page</a>`;
    $(".ps", pop).textContent = L[2];
    pop.hidden = false;
    const r = btn.getBoundingClientRect(), pw = pop.offsetWidth, ph = pop.offsetHeight;
    let x = r.left + window.scrollX, y = r.bottom + window.scrollY + 8;
    x = Math.max(16 + window.scrollX, Math.min(x, window.scrollX + document.documentElement.clientWidth - pw - 16));
    if (r.bottom + ph + 16 > window.innerHeight && r.top > ph + 16) y = r.top + window.scrollY - ph - 8;
    pop.style.left = x + "px"; pop.style.top = y + "px";
  }
  document.addEventListener("click", (e) => {
    const b = e.target.closest(".law");
    if (b) { e.preventDefault(); openPop(b); return; }
    if (!e.target.closest("#pop")) closePop();
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closePop(); });

  /* ---------- router ---------- */
  const views = { grammar: $("#v-grammar"), guide: $("#v-guide"), laws: $("#v-laws"), evidence: $("#v-evidence"), decisions: $("#v-decisions") };
  let current = null;
  function route() {
    const id = decodeURIComponent(location.hash.slice(1));
    let v = "grammar";
    if (id === "decisions" || (id && views.decisions.querySelector("#" + CSS.escape(id)))) v = "decisions";
    else if (id === "guide" || (id && views.guide.querySelector("#" + CSS.escape(id)))) v = "guide";
    else if (id === "laws" || (id && views.laws.querySelector("#" + CSS.escape(id)))) v = "laws";
    else if (id === "evidence" || id.startsWith("ev-") || (id && views.evidence.querySelector("#" + CSS.escape(id)))) v = "evidence";
    const changed = v !== current;
    current = v;
    for (const [k, el] of Object.entries(views)) el.hidden = k !== v;
    $$(".nav a[data-view]").forEach((a) => (a.dataset.view === v ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current")));
    closePop();
    if (!id || id === "grammar" || id === "decisions" || id === "guide" || id === "laws" || id === "evidence") { if (changed || !id || id === v) window.scrollTo(0, 0); }
    else if (!id.startsWith("ev-")) {
      const t = document.getElementById(id);
      if (t) requestAnimationFrame(() => { t.scrollIntoView({ block: "start" }); t.classList.add("ping"); setTimeout(() => t.classList.remove("ping"), 1600); });
    }
    if (v === "grammar") requestAnimationFrame(() => { drawEdges(); });
    updateTray();
  }
  window.addEventListener("hashchange", route);

  /* ---------- status key ---------- */
  $("#key").innerHTML = ["proved", "settled", "open"].map((k) => `<span>${chip(k)}<span>${STATUS[k].says}</span></span>`).join("");

  /* ---------- isometric stack geometry ---------- */
  const G = { cx: 290, w: 330, d: 108, y0: 352, gap: 54 };
  const planeY = (i) => G.y0 - i * G.gap;
  const P = (i, a, b) => [G.cx - G.w / 2 + (a + b) * G.w / 2, planeY(i) + (b - a) * G.d / 2];
  const pts = (arr) => arr.map((p) => p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" ");
  const LGIST = /*data:LGIST*/;
  const LNAME = /*data:LNAME*/;

  function buildStack(svg, { labels = true, small = false } = {}) {
    svg.setAttribute("viewBox", "0 0 720 422");
    const defs = sv("defs", {}, svg);
    const mk = sv("marker", { id: svg.id + "-ar", viewBox: "0 0 10 10", refX: "5", refY: "5", markerWidth: "7", markerHeight: "7", orient: "auto-start-reverse" }, defs);
    sv("path", { d: "M1 1 9 5 1 9", class: "mk", "stroke-width": "1.6" }, mk);
    const out = { planes: [], under: [], svg };
    for (let i = 0; i < 6; i++) {
      const g = sv("g", { class: "pl", "data-i": i }, svg);
      const L = P(i, 0, 0), T = P(i, 1, 0), R = P(i, 1, 1), B = P(i, 0, 1);
      sv("polygon", { class: "pl-side", points: pts([L, B, R, [R[0], R[1] + 5], [B[0], B[1] + 5], [L[0], L[1] + 5]]) }, g);
      const face = sv("polygon", { class: "pl-face svg-plane" + (i === 0 ? " ground" : ""), points: pts([L, T, R, B]) }, g);
      if (i === 0) {
        for (let k = 1; k < 6; k++) {
          sv("line", { class: "pl-grid", x1: P(0, k / 6, 0)[0], y1: P(0, k / 6, 0)[1], x2: P(0, k / 6, 1)[0], y2: P(0, k / 6, 1)[1] }, g);
          sv("line", { class: "pl-grid", x1: P(0, 0, k / 6)[0], y1: P(0, 0, k / 6)[1], x2: P(0, 1, k / 6)[0], y2: P(0, 1, k / 6)[1] }, g);
        }
      }
      const under = sv("g", { class: "pl-under" }, svg);
      out.under.push(under);
      let lab = null;
      if (labels) {
        lab = sv("g", { class: "lay-label", "data-i": i, tabindex: "0", role: "button", "aria-label": LNAME[i] + " layer" }, svg);
        sv("line", { x1: R[0] + 6, y1: R[1], x2: R[0] + 30, y2: R[1], class: "leader" }, lab);
        const t1 = sv("text", { x: R[0] + 38, y: R[1] + 1, class: "svgs ln", "font-size": "19" }, lab); t1.textContent = LNAME[i];
        const t2 = sv("text", { x: R[0] + 38, y: R[1] + 18, class: "svgt gist", "font-size": "12.5" }, lab); t2.textContent = LGIST[i];
      }
      out.planes.push({ g, face, lab, L, T, R, B });
    }
    out.top = sv("g", { class: "over" }, svg);
    return out;
  }

  function slab(parent, a, b, cls) {
    const sz = 0.065, g = sv("g", { class: "slab " + (cls || "") }, parent);
    const L = P(0, a - sz, b - sz), T = P(0, a + sz, b - sz), R = P(0, a + sz, b + sz), B = P(0, a - sz, b + sz);
    const lift = 5;
    const up = (p) => [p[0], p[1] - lift];
    sv("polygon", { class: "slab-side", points: pts([L, B, R, up(R), up(B), up(L)]) }, g);
    sv("polygon", { class: "slab-top", points: pts([up(L), up(T), up(R), up(B)]) }, g);
    return g;
  }

  /* ---------- hero loop ---------- */
  const PHASES = /*data:PHASES*/;
  const CYCLE = 8900;
  // Places on the ground for the records, chosen in picture space so slabs never overlap.
  const SPOTS = [[290, 364], [240, 382], [340, 364], [190, 364], [290, 382], [390, 364], [340, 382], [240, 364]].map(([x, y]) => {
    const s1 = (x - (290 - 165)) * 2 / 330, s2 = (y - 352) * 2 / 108;
    return [(s1 - s2) / 2, (s1 + s2) / 2];
  });
  (function hero() {
    const svg = $("#loop");
    const S = buildStack(svg, { labels: true });
    const leftX = G.cx - G.w / 2 - 22;
    const ret = sv("path", { class: "retpath", d: `M${leftX} ${planeY(5) + 4} L${leftX} ${planeY(0) - 4}`, "marker-end": `url(#${svg.id}-ar)` }, S.top);
    const rl = sv("text", { class: "svgm retlab", "font-size": "11", transform: `translate(${leftX - 9} ${(planeY(5) + planeY(0)) / 2}) rotate(-90)`, "text-anchor": "middle" }, S.top);
    rl.textContent = "edits come back as records";
    const beam = sv("line", { class: "beam", x1: G.cx, x2: G.cx, y1: G.y0, y2: G.y0 }, S.top);
    const riser = sv("circle", { class: "riser", cx: G.cx, cy: G.y0, r: 4.5 }, S.top);
    const ring = sv("ellipse", { class: "ring", cx: G.cx, cy: planeY(4), rx: 0, ry: 0 }, S.top);
    const tickMark = sv("polygon", { class: "tickmark", points: pts([P(4, .44, .5), P(4, .5, .44), P(4, .56, .5), P(4, .5, .56)]) }, S.top);
    const lines = [.34, .5, .66].map((b, k) => {
      const p0 = P(5, .2, b), p1 = P(5, k === 1 ? .7 : .8, b);
      const len = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
      const l = sv("line", { class: "txtline", x1: p0[0], y1: p0[1], x2: p1[0], y2: p1[1], "stroke-dasharray": len, "stroke-dashoffset": len }, S.top);
      return { l, len };
    });
    const stTxt = sv("text", { class: "svgm statetxt", x: P(3, .5, .5)[0] + 16, y: P(3, .5, .5)[1] + 4, "font-size": "12" }, S.top);
    const dot = sv("circle", { class: "editdot", r: 5, cx: -20, cy: -20 }, S.top);
    const recs = S.under[0];
    const placed = [];

    const phN = $("#phasen"), phT = $("#phaset"), btn = $("#loopbtn");
    let playing = !reduced(), visible = true, last = performance.now(), elapsed = 0, lastPhase = -1, lastCycle = -1;

    function setRecs(n) {
      while (placed.length > n) placed.pop().remove();
      while (placed.length < n) { const [a, b] = SPOTS[placed.length % SPOTS.length]; placed.push(slab(recs, a, b)); }
    }
    function pathPoint(t, target) {
      const p0 = P(5, .16, .5), p1 = [leftX, planeY(5) + 10], p2 = [leftX, planeY(0) + 6], p3 = target;
      const segs = [[p0, p1], [p1, p2], [p2, p3]];
      const lens = segs.map(([a, b]) => Math.hypot(b[0] - a[0], b[1] - a[1]));
      let d = t * lens.reduce((x, y) => x + y, 0);
      for (let k = 0; k < 3; k++) { if (d <= lens[k] || k === 2) { const f = Math.min(1, d / lens[k]); return [lerp(segs[k][0][0], segs[k][1][0], f), lerp(segs[k][0][1], segs[k][1][1], f)]; } d -= lens[k]; }
    }
    function frame(ms) {
      const cyc = Math.floor(ms / CYCLE), t = ms % CYCLE;
      let ph = 0; for (let k = 0; k < PHASES.length; k++) if (t >= PHASES[k][0]) ph = k;
      const start = PHASES[ph][0], end = ph + 1 < PHASES.length ? PHASES[ph + 1][0] : CYCLE;
      const pr = Math.min(1, (t - start) / Math.min(1000, end - start));
      const n = (cyc % SPOTS.length) + 1;
      if (cyc !== lastCycle) { setRecs(n === 1 ? 0 : n - 1); const g = slab(recs, ...SPOTS[n - 1], "fresh"); placed.push(g); lastCycle = cyc; }
      const fresh = placed[placed.length - 1];
      if (ph === 0) { const k = ease(Math.min(1, t / 800)); fresh.setAttribute("transform", `translate(0 ${(-46 * (1 - k)).toFixed(1)})`); fresh.style.opacity = k; }
      else { fresh.removeAttribute("transform"); fresh.style.opacity = 1; }
      S.planes.forEach((p, i) => p.face.classList.toggle("on", i === 0 || (i <= ph && ph < 6) || (ph === 6 && i <= 5 && t < PHASES[6][0] + 400)));
      S.planes.forEach((p, i) => p.face.classList.toggle("now", i === ph && i > 0 && i < 6));
      // beam
      let top = G.y0, show = 0;
      if (ph >= 1 && ph <= 5) { top = lerp(planeY(ph - 1), planeY(ph), ease(pr)); show = 1; }
      else if (ph === 6) { top = planeY(5); show = Math.max(0, 1 - (t - PHASES[6][0]) / 600); }
      beam.setAttribute("y2", top.toFixed(1)); beam.style.opacity = show;
      riser.setAttribute("cy", top.toFixed(1)); riser.style.opacity = ph >= 1 && ph <= 5 ? 1 : 0;
      // state text
      stTxt.textContent = ph >= 3 ? `count ${placed.length}` : "";
      // tick
      if (ph === 4) { const k = ease(pr); ring.setAttribute("rx", (12 + 92 * k).toFixed(1)); ring.setAttribute("ry", ((12 + 92 * k) * G.d / G.w).toFixed(1)); ring.style.opacity = 1 - k; }
      else ring.style.opacity = 0;
      tickMark.style.opacity = ph >= 4 ? 1 : 0;
      // text lines
      lines.forEach((o, k) => { const kk = ph > 5 ? 1 : ph === 5 ? ease(Math.min(1, Math.max(0, pr * 1.4 - k * .22))) : 0; o.l.setAttribute("stroke-dashoffset", (o.len * (1 - kk)).toFixed(1)); });
      // edit dot
      if (ph === 6) {
        const nextSpot = SPOTS[n % SPOTS.length];
        const tgt = P(0, nextSpot[0], nextSpot[1]);
        const k = ease(Math.min(1, (t - PHASES[6][0]) / (CYCLE - PHASES[6][0] - 150)));
        const [x, y] = pathPoint(k, [tgt[0], tgt[1] - 5]);
        dot.setAttribute("cx", x.toFixed(1)); dot.setAttribute("cy", y.toFixed(1)); dot.style.opacity = 1;
        ret.classList.add("on");
      } else { dot.style.opacity = 0; ret.classList.remove("on"); }
      if (ph !== lastPhase) { lastPhase = ph; phN.textContent = `${ph + 1}/7`; phT.textContent = PHASES[ph][1]; }
    }
    function staticFrame() {
      setRecs(0); for (let k = 0; k < 5; k++) placed.push(slab(recs, ...SPOTS[k]));
      S.planes.forEach((p) => p.face.classList.add("on"));
      beam.setAttribute("y2", planeY(3)); beam.style.opacity = .8; riser.style.opacity = 0;
      stTxt.textContent = "count 5"; ring.style.opacity = 0; tickMark.style.opacity = 1;
      lines.forEach((o) => o.l.setAttribute("stroke-dashoffset", 0));
      dot.style.opacity = 0; ret.classList.add("on");
      phN.textContent = ""; phT.textContent = "A record lands on the ground. Folds rise to state, a tick fixes it, a lens renders text, and edits come back down as records.";
    }
    function loop(now) {
      if (playing && visible) { elapsed += Math.max(0, Math.min(64, now - last)); frame(elapsed); }
      last = now;
      if (playing) requestAnimationFrame(loop);
    }
    const ICON_PAUSE = btn.innerHTML;
    const ICON_PLAY = /*data:ICON_PLAY*/;
    function setPlaying(on) {
      playing = on;
      btn.innerHTML = on ? ICON_PAUSE : ICON_PLAY;
      btn.setAttribute("aria-label", on ? "Pause the animation" : "Play the animation");
      if (on) { last = performance.now(); requestAnimationFrame(loop); }
    }
    btn.addEventListener("click", () => { if (!playing && lastCycle < 0) { setRecs(0); } setPlaying(!playing); });
    if ("IntersectionObserver" in window) new IntersectionObserver((es) => { visible = es[0].isIntersecting; }).observe(svg);
    if (reduced()) { staticFrame(); setPlaying(false); btn.innerHTML = ICON_PLAY; }
    else { frame(0); setPlaying(true); }
    S.planes.forEach((p, i) => {
      const go = () => { selectLayer(i); location.hash = "layers"; };
      p.lab.addEventListener("click", go);
      p.lab.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); } });
    });
  })();

  /* ---------- sentence and record ---------- */
  (function anatomy() {
    const TIPS = /*data:TIPS*/;
    const w = (k, html, cls = "") => `<span class="w ${cls}" data-w="${k}" tabindex="0">${html}</span>`;
    $("#sentence").innerHTML =
      `${w("observer", "Rosa")}, ${w("emitted", "writing at 09:40 on Sunday 22 November")}, says that ${w("kind", "the recipe")} ${w("of", "for <i>recipe:chili</i>")}, ${w("occurred", "as Grandma made it in the 1960s")}, is ${w("payload", "“3 tbsp cumin, dark chocolate.”")} It ${w("prev", "replaces M")}, ${w("erases", "erases what A said", "er")}, and ${w("under", "acts under grant G")}.` +
      `<div class="wtip" id="wtip">Every part of the sentence is one field. The payload is kept apart from the envelope, so readers can hold a record without what it says.</div>`;
    const E = SENTENCE.env;
    const line = (k, v, last) => `  ${w(k, `<span class="k">"${k}"</span>: ${v}`)}${last ? "" : ","}`;
    const str = (x) => `"${esc(x)}"`, arr = (a) => "[" + a.map(str).join(", ") + "]";
    $("#json").innerHTML =
      `<span class="grp">envelope</span>{\n` +
      [line("emitted", str(E.emitted)), line("erases", arr(E.erases)), line("kind", str(E.kind)), line("observer", str(E.observer)), line("occurred", str(E.occurred)), line("of", str(E.of)), line("prev", arr(E.prev)), line("under", str(E.under), true)].join("\n") +
      `\n}\n<span class="grp">payload</span>{ ${w("payload", `<span class="k">"text"</span>: ${str(SENTENCE.payload.text)}`)} }\n<span class="grp">and</span>${w("id", `<span class="k">id</span> ${SENTENCE.id}`)}   salt · signature`;
    const tip = $("#wtip"), deftip = tip.innerHTML;
    const on = (k) => { $$(".w").forEach((e) => e.classList.toggle("on", e.dataset.w === k)); tip.innerHTML = k && TIPS[k] ? `<b>${TIPS[k][0]}</b> &nbsp;${TIPS[k][1]}` : deftip; };
    $$(".w").forEach((e) => {
      e.addEventListener("mouseenter", () => on(e.dataset.w));
      e.addEventListener("focus", () => on(e.dataset.w));
      e.addEventListener("click", () => on(e.dataset.w));
    });
    $("#record").addEventListener("mouseleave", () => on(null));
  })();

  /* ---------- hash lab ---------- */
  // SHA-256, used only when crypto.subtle is missing (for example on a page served without https).
  function sha256js(bytes) {
    const K = [0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2];
    let H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
    const l = bytes.length, n = ((l + 9 + 63) >> 6) << 6, m = new Uint8Array(n);
    m.set(bytes); m[l] = 0x80; const bits = l * 8;
    for (let i = 0; i < 4; i++) m[n - 1 - i] = (bits >>> (8 * i)) & 255;
    const W = new Uint32Array(64), r = (x, k) => (x >>> k) | (x << (32 - k));
    for (let o = 0; o < n; o += 64) {
      for (let i = 0; i < 16; i++) W[i] = (m[o + 4 * i] << 24) | (m[o + 4 * i + 1] << 16) | (m[o + 4 * i + 2] << 8) | m[o + 4 * i + 3];
      for (let i = 16; i < 64; i++) { const s0 = r(W[i - 15], 7) ^ r(W[i - 15], 18) ^ (W[i - 15] >>> 3), s1 = r(W[i - 2], 17) ^ r(W[i - 2], 19) ^ (W[i - 2] >>> 10); W[i] = (W[i - 16] + s0 + W[i - 7] + s1) | 0; }
      let [a, b, c, d, e, f, g, h] = H;
      for (let i = 0; i < 64; i++) {
        const t1 = (h + (r(e, 6) ^ r(e, 11) ^ r(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + W[i]) | 0;
        const t2 = ((r(a, 2) ^ r(a, 13) ^ r(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) | 0;
        h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
      }
      H = H.map((x, i) => (x + [a, b, c, d, e, f, g, h][i]) | 0);
    }
    return H.map((x) => (x >>> 0).toString(16).padStart(8, "0")).join("");
  }
  async function sha256(text) {
    const bytes = typeof TextEncoder === "function" ? new TextEncoder().encode(text) : Uint8Array.from(unescape(encodeURIComponent(text)), (ch) => ch.charCodeAt(0));
    try { if (crypto && crypto.subtle) { const buf = await crypto.subtle.digest("SHA-256", bytes); return [...new Uint8Array(buf)].map((x) => x.toString(16).padStart(2, "0")).join(""); } } catch (e) { /* fall through */ }
    return sha256js(bytes);
  }
  const canon = (v) => {
    if (Array.isArray(v)) return "[" + [...new Set(v.map(canon))].sort().join(",") + "]";
    if (v && typeof v === "object") return "{" + Object.keys(v).sort().map((k) => JSON.stringify(k) + ":" + canon(v[k])).join(",") + "}";
    return JSON.stringify(v);
  };
  (function lab() {
    const SALT = /*data:SALT*/;
    const base = { kind: "recipe", observer: "k:rosa…", emitted: "2026-11-22T09:30:00Z", of: "recipe:chili" };
    const st = { swapped: false, erased: false, changed: false, commitment: null };
    const box = $("#labrec"), say = $("#labsay");
    let firstId = null;
    async function compute() {
      const prevWritten = st.swapped ? ["r:C…", "r:B…"] : ["r:B…", "r:C…"];
      const payload = { text: st.changed ? "3 tbsp cumin, milk chocolate." : "3 tbsp cumin, dark chocolate." };
      if (!st.erased) st.commitment = await sha256(SALT + canon(payload));
      const env = Object.assign({}, base, { prev: prevWritten });
      const id = "r:" + (await sha256(canon({ env, commitment: st.commitment }))).slice(0, 12);
      return { prevWritten, payload, id };
    }
    async function render(flash) {
      const r = await compute();
      if (!firstId) firstId = r.id;
      const same = r.id === firstId;
      box.innerHTML =
        `<div><span class="rl">envelope</span>` +
        `<div class="row"><span>kind</span><span class="v">recipe</span></div>` +
        `<div class="row"><span>observer</span><span class="v">k:rosa…</span></div>` +
        `<div class="row"><span>of</span><span class="v">recipe:chili</span></div>` +
        `<div class="row"><span>prev</span><span class="v ${flash === "swap" ? "flash" : ""}">[${r.prevWritten.join(", ")}]</span></div>` +
        `<div class="canon">canonical: ${esc(canon(r.prevWritten))}</div></div>` +
        `<div class="pay ${st.erased ? "gone" : ""}"><span class="rl">payload</span><span class="gonetag">erased</span>` +
        `<div class="row"><span>text</span><span class="v ${flash === "word" ? "flash" : ""}">${esc(r.payload.text)}</span></div></div>` +
        `<div><span class="rl">commitment ${st.erased ? "· kept" : ""}</span><span class="v" style="color:var(--muted)">${st.commitment.slice(0, 24)}…</span></div>` +
        `<div><span class="rl">id</span><div class="idline"><span class="idv ${flash ? "flash" : ""}">${r.id}</span><span class="verdict ${same ? "" : "changed"}">${same ? "same id" : "a new id"}</span></div></div>`;
      $$("[data-lab=word]").forEach((b) => (b.disabled = st.erased));
    }
    const MSG = {
      swap: () => `You wrote <code>prev</code> as [${st.swapped ? "C, B" : "B, C"}]. Written canonically it is still [B, C], so the id stays. ${lawChip("record.sets")}`,
      erase: () => `The payload is gone. The commitment to it stays in the record, so the id, the signature and every record that cites M still hold. ${lawChip("record.erasure")}`,
      word: () => st.changed ? `One word changed the payload, so its commitment changed, and so did the id. This is a different record.` : `Back to the original word, and the original id.`,
      reset: () => `Back to record M as it was written.`,
    };
    $$("[data-lab]").forEach((b) => b.addEventListener("click", async () => {
      const k = b.dataset.lab;
      if (k === "swap") st.swapped = !st.swapped;
      if (k === "erase") { if (st.erased) return; st.erased = true; }
      if (k === "word") st.changed = !st.changed;
      if (k === "reset") { st.swapped = st.erased = st.changed = false; }
      await render(k === "reset" ? null : k);
      say.innerHTML = MSG[k]();
      $$("[data-lab=erase]").forEach((x) => (x.disabled = st.erased));
    }));
    render(null);
  })();

  /* ---------- the walk ---------- */
  let drawEdges = () => {};
  (function walk() {
    const steps = $("#steps"), dag = $("#dag"), edges = $("#edges");
    const STEP_LAWS = /*data:STEP_LAWS*/;
    WALK.steps.forEach((s, i) => {
      const t = WALK_TEXT[i];
      const d = document.createElement("div");
      d.className = "step"; d.dataset.i = i;
      d.innerHTML = `<div class="card"><div class="sn">Step ${i + 1} of 9 <span>·</span> <span>${s.key.replace(/-/g, " ")}</span></div><h3>${t.title}</h3><p>${t.text}</p>${i === 7 ? '<div class="rn"><b>Was: proposed, not built</b>The live step says the tick record is proposed and not built. It was built on 21 to 23 November.</div>' : ""}${lawRow(STEP_LAWS[i])}${s.lens ? lensUI() : ""}</div>`;
      steps.appendChild(d);
    });
    function lensUI() {
      return `<div class="lensbox"><textarea id="lens" rows="4" spellcheck="false" aria-label="The rendered section, which you can edit" readonly></textarea>` +
        `<div class="lensbar"><button class="ibtn solid" id="lensapply" disabled>Parse and apply</button><button class="ibtn ghost" id="lensreset">Reset the walk</button></div>` +
        `<div class="lensout" id="lensout"></div></div>`;
    }
    const R = Object.assign({}, WALK.records);
    const cards = {};
    const mkCard = (id) => {
      const r = R[id];
      const c = document.createElement("div");
      c.className = "rec hide" + (id === "G" ? " you" : "");
      c.style.gridColumn = r.col; c.style.gridRow = r.row;
      c.innerHTML = `<span class="rtag">head</span><div class="rh"><span class="rid">${id}</span><span class="rwho">${r.who} · ${r.at}</span></div><div class="rtx"></div>`;
      $(".rtx", c).textContent = r.text;
      dag.appendChild(c); cards[id] = c;
    };
    Object.keys(R).forEach(mkCard);
    const st = { i: 0, fApplied: false, you: null, timers: [], typing: false };
    const clearTimers = () => { st.timers.forEach(clearTimeout); st.timers = []; };
    const later = (fn, ms) => st.timers.push(setTimeout(fn, ms));

    function model() {
      const s = WALK.steps[st.i];
      const shown = new Set(s.shown);
      let heads = s.heads.slice(), count = s.count;
      if (s.lens) {
        if (!st.fApplied) { shown.delete("F"); heads = ["E"]; count = 5; }
        if (st.you) { shown.add("G"); heads = ["G"]; count += 1; }
      }
      return { s, shown, heads, count, erased: new Set(s.erased || []), withheld: new Set(s.withheld || []) };
    }
    let lastDrawn = "";
    drawEdges = function () {
      if (!dag.offsetParent) return;
      const m = model();
      const box = dag.getBoundingClientRect();
      const rect = (id) => { const r = cards[id].getBoundingClientRect(); return { l: r.left - box.left, r: r.right - box.left, t: r.top - box.top, b: r.bottom - box.top, cy: (r.top + r.bottom) / 2 - box.top, cx: (r.left + r.right) / 2 - box.left }; };
      edges.setAttribute("viewBox", `0 0 ${box.width} ${box.height}`);
      let html = "";
      for (const id of m.shown) {
        const r = R[id]; if (!r) continue;
        for (const p of r.prev) if (m.shown.has(p)) {
          const a = rect(p), b = rect(id), dx = Math.max(12, (b.l - a.r) / 2);
          html += `<path class="edge live" d="M${a.r} ${a.cy} C${a.r + dx} ${a.cy}, ${b.l - dx} ${b.cy}, ${b.l} ${b.cy}"/>`;
        }
        for (const x of r.erases || []) if (m.shown.has(x)) {
          const a = rect(id), b = rect(x);
          const top1 = Math.min(...[...m.shown].map((k) => rect(k).t));
          const yc = top1 - .6 * (a.t - top1) - 8, peak = .125 * (a.t + b.t) + .75 * yc;
          html += `<path class="edge ers" d="M${a.cx} ${a.t} C${a.cx} ${yc}, ${b.cx} ${yc}, ${b.cx} ${b.t}"/>` +
            `<text class="hull-l" x="${(a.cx + b.cx) / 2}" y="${peak - 5}" text-anchor="middle" style="fill:var(--alert)">erases</text>`;
        }
      }
      if (m.s.covers) {
        const rs = m.s.covers.map(rect);
        const l = Math.min(...rs.map((r) => r.l)) - 7, t = Math.min(...rs.map((r) => r.t)) - 7, r = Math.max(...rs.map((r) => r.r)) + 7, b = Math.max(...rs.map((r) => r.b)) + 7;
        html = `<rect class="hull" x="${l}" y="${t}" width="${r - l}" height="${b - t}" rx="14"/><text class="hull-l" x="${l + 10}" y="${b + 15}">tick · covers ${m.s.covers.length} records</text>` + html;
      }
      if (html !== lastDrawn) { edges.innerHTML = html; lastDrawn = html; }
    };

    function render() {
      const m = model(), s = m.s;
      $$(".step", steps).forEach((d, k) => d.classList.toggle("on", k === st.i));
      for (const [id, c] of Object.entries(cards)) {
        const vis = m.shown.has(id), head = m.heads.includes(id), fork = head && m.heads.length > 1;
        c.classList.toggle("hide", !vis);
        c.classList.toggle("head", head);
        c.classList.toggle("fork", fork);
        c.classList.toggle("old", vis && !head);
        c.classList.toggle("erased", m.erased.has(id));
        c.classList.toggle("withheld", m.withheld.has(id));
        $(".rtag", c).textContent = fork ? (m.heads[0] === id ? "head · 1st" : "head · 2nd") : "head";
      }
      const reader = $("#reader");
      reader.textContent = s.reader === "kim" ? "Reading as Kim, with less" : "Reading as Rosa";
      reader.classList.toggle("cy", s.reader === "kim");
      const cur = $("#scur"), un = $("#sunread");
      un.textContent = "";
      if (m.heads.length > 1) cur.innerHTML = `<span class="cf"><b>conflict (2)</b>${m.heads.map((h) => esc(R[h].text)).join(" | ")}</span>`;
      else if (m.withheld.has(m.heads[0])) { cur.innerHTML = `<span class="wh">${m.heads[0]} · payload withheld</span>`; un.textContent = "1 record it couldn't read"; }
      else cur.textContent = R[m.heads[0]].text;
      const sc = $("#scount");
      if (sc.textContent !== String(m.count)) { sc.textContent = m.count; sc.classList.remove("flash"); void sc.offsetWidth; sc.classList.add("flash"); }
      $("#wcount").textContent = `${st.i + 1} / 9`;
      $("#wprev").disabled = st.i === 0; $("#wnext").disabled = st.i === 8;
      // delivery lanes
      const lanes = $("#lanes");
      if (s.orders) {
        lanes.innerHTML = s.orders.map((o, k) => `<div class="lane"><span class="ln">order ${k + 1}</span>${o.map((x) => `<span class="ch">${x}</span>`).join("")}<span class="out">current E · count 5</span></div>`).join("");
        lanes.classList.remove("hide");
        const chips = $$(".lane", lanes);
        chips.forEach((ln, k) => {
          $$(".ch", ln).forEach((c, j) => (reduced() ? c.classList.add("in") : later(() => c.classList.add("in"), 200 + k * 140 + j * 170)));
          reduced() ? $(".out", ln).classList.add("in") : later(() => $(".out", ln).classList.add("in"), 200 + k * 140 + 5 * 170 + 250);
        });
      } else lanes.classList.add("hide");
      drawEdges();
      setTimeout(drawEdges, 480);
      if (s.lens) enterLens();
    }
    function go(i, scroll) {
      i = Math.max(0, Math.min(8, i));
      if (i === st.i && !scroll) return;
      if (st.typing && i !== 8) finishLens();
      clearTimers();
      st.i = i; render();
      if (scroll) {
        const el = $$(".step", steps)[i], card = $(".card", el), r = card.getBoundingClientRect();
        const target = innerWidth <= 860 ? r.top + scrollY - innerHeight * .6 : r.top + scrollY - (innerHeight - r.height) / 2;
        window.scrollTo({ top: Math.max(0, target), behavior: reduced() ? "auto" : "smooth" });
      }
    }
    $("#wprev").addEventListener("click", () => go(st.i - 1, true));
    $("#wnext").addEventListener("click", () => go(st.i + 1, true));
    document.addEventListener("keydown", (e) => {
      if (current !== "grammar" || /input|textarea|select/i.test(e.target.tagName)) return;
      const w = $("#walk").getBoundingClientRect();
      if (w.top > innerHeight * .5 || w.bottom < innerHeight * .5) return;
      if (e.key === "ArrowRight" || e.key === "ArrowDown" && e.altKey) { e.preventDefault(); go(st.i + 1, true); }
      if (e.key === "ArrowLeft") { e.preventDefault(); go(st.i - 1, true); }
    });
    // Scroll drives the steps.
    let io = null;
    function observe() {
      if (io) io.disconnect();
      if (!("IntersectionObserver" in window)) return;
      const narrow = innerWidth <= 860;
      io = new IntersectionObserver((es) => {
        es.forEach((e) => { if (e.isIntersecting) go(+e.target.dataset.i, false); });
      }, { rootMargin: narrow ? "-68% 0px -26% 0px" : "-46% 0px -46% 0px" });
      $$(".step", steps).forEach((d) => io.observe(d));
    }
    observe();
    let rz; addEventListener("resize", () => { clearTimeout(rz); rz = setTimeout(() => { observe(); drawEdges(); }, 150); });
    if ("ResizeObserver" in window) new ResizeObserver(() => drawEdges()).observe(dag);

    // The lens step
    const lensEl = () => $("#lens"), out = () => $("#lensout");
    function enterLens() {
      const ta = lensEl();
      if (st.fApplied || st.typing) return;
      if (reduced()) { ta.value = WALK.lens.after; finishLens(); return; }
      st.typing = true; ta.readOnly = true; ta.value = WALK.lens.before;
      out().innerHTML = `Ben edits the rendered section…`;
      const from = "3 tbsp cumin, dark chocolate.", to = "3 tbsp cumin, dark chocolate, a bay leaf.", keep = "3 tbsp cumin, dark chocolate";
      let t = 700;
      for (let n = from.length; n >= keep.length; n--) { const v = from.slice(0, n); later(() => { ta.value = `::: recipe:chili\n${v}\n:::`; }, t); t += 28; }
      for (let n = keep.length + 1; n <= to.length; n++) { const v = to.slice(0, n); later(() => { ta.value = `::: recipe:chili\n${v}\n:::`; }, t); t += 62; }
      later(() => { out().innerHTML = `<span class="ok">parse → 1 accepted edit for recipe:chili</span>`; }, t + 300);
      later(() => { finishLens(); }, t + 1100);
    }
    function finishLens() {
      clearTimers();
      st.typing = false; st.fApplied = true;
      const ta = lensEl(); ta.value = WALK.lens.after; ta.readOnly = false;
      $("#lensapply").disabled = false;
      out().innerHTML = `<span class="ok">parse → 1 accepted edit · apply → emit F, prev: [E]</span><br>Now it's your turn: change the text and apply it.`;
      if (st.i === 8) { render(); cards.F.classList.add("pulse"); setTimeout(() => cards.F.classList.remove("pulse"), 1200); }
    }
    function parseLens(text) {
      const lines = text.replace(/\r/g, "").split("\n"), secs = [];
      let cur = null;
      for (let n = 0; n < lines.length; n++) {
        const L = lines[n];
        if (L.trim() === ":::") { if (!cur) return { err: `line ${n + 1} closes a section that was never opened` }; secs.push(cur); cur = null; continue; }
        if (/^:::\s*\S/.test(L)) { if (cur) return { err: `line ${n + 1} opens a section inside ${cur.id}` }; cur = { id: L.replace(/^:::\s*/, "").trim(), body: [] }; continue; }
        if (cur) cur.body.push(L);
        else if (L.trim()) return { err: `line ${n + 1} is outside any section` };
      }
      if (cur) return { err: `the section ${cur.id} is never closed` };
      const ids = new Set();
      for (const s of secs) { if (ids.has(s.id)) return { err: `the id ${s.id} is used twice` }; ids.add(s.id); }
      return { secs: secs.map((s) => ({ id: s.id, body: s.body.join("\n").trim() })) };
    }
    steps.addEventListener("click", (e) => {
      if (e.target.id === "lensreset") {
        clearTimers(); st.you = null; st.fApplied = false; st.typing = false;
        delete R.G; if (cards.G) { cards.G.remove(); delete cards.G; }
        lensEl().readOnly = true; lensEl().value = WALK.lens.before; $("#lensapply").disabled = true; out().textContent = "";
        go(0, true);
        return;
      }
      if (e.target.id !== "lensapply") return;
      const o = out(), res = parseLens(lensEl().value);
      const head = st.you ? "G" : "F", curText = R[head].text;
      if (res.err) { o.innerHTML = `<span class="no">Refused: ${esc(res.err)}.</span> Nothing is emitted. ${lawChip("lens.refuse")}`; return; }
      const sec = res.secs.find((s) => s.id === WALK.thing);
      const extra = res.secs.filter((s) => s.id !== WALK.thing).length;
      const tail = extra ? ` Sections with other ids are left alone here; this walk has one.` : "";
      if (!sec) { o.innerHTML = `No edit. The section ${WALK.thing} is missing, and a section left out keeps its old body. Leaving something out is never an edit. ${lawChip("lens.absence-not-edit")}${tail}`; return; }
      if (!sec.body) { o.innerHTML = `<span class="no">Refused here: the section is empty.</span> To remove what a record says, erase it instead.`; return; }
      if (sec.body === curText) { o.innerHTML = `No edit. The text matches what was rendered.${tail}`; return; }
      if (st.you) { o.innerHTML = `One edit of yours per visit. Reset the walk to try again.`; return; }
      const now = new Date();
      R.G = { who: "you", at: `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`, col: 6, row: 2, text: sec.body, prev: ["F"] };
      mkCard("G"); st.you = R.G;
      o.innerHTML = `<span class="ok">parse → 1 accepted edit · apply → emit G, prev: [F]</span><br>G is yours. It isn't in the test vector.${tail}`;
      requestAnimationFrame(() => { render(); cards.G.classList.add("pulse"); });
    });
    render();
  })();

  /* ---------- layers ---------- */
  let selectLayer = () => {};
  (function layers() {
    const S = buildStack($("#stack"), { labels: true });
    const panel = $("#laypanel"), table = $("#laytable");
    const REBUILD = /*data:REBUILD*/;
    const byIdx = (i) => LAYERS[5 - i];
    table.innerHTML = `<thead><tr><th>Layer</th><th>What it is</th><th>Made by</th><th>Lasts</th><th>Named by</th></tr></thead><tbody>` +
      [5, 4, 3, 2, 1, 0].map((i) => { const L = byIdx(i); return `<tr data-i="${i}"><td>${L.name}</td><td>${L.gist}</td><td><code>${L.made}</code></td><td>${L.lasts}</td><td>${L.named}</td></tr>`; }).join("") + `</tbody>`;
    let sel = 0, busy = false;
    selectLayer = (i) => {
      sel = i; const L = byIdx(i);
      S.planes.forEach((p, k) => { p.face.classList.toggle("on", k === i); p.face.classList.toggle("sel", k === i); });
      $$("tr[data-i]", table).forEach((tr) => tr.classList.toggle("sel", +tr.dataset.i === i));
      panel.innerHTML = `<span class="lbl">Layer ${i + 1} of 6, from the ground up</span><h3>${L.name}</h3><p class="gist">${L.gist}</p>` +
        `<dl><dt>Made by</dt><dd><code>${L.made}</code></dd><dt>Lasts</dt><dd>${L.lasts}</dd><dt>Named by</dt><dd>${L.named}</dd><dt>Status</dt><dd>${chip(L.status)}</dd></dl>` +
        `<div class="acts"><button class="ibtn" id="toss" ${i === 0 ? "disabled" : ""}>Throw it away</button><a class="ibtn ghost" href="#n-${L.word}">Read <i style="font-family:var(--serif)">${L.word}</i></a></div>` +
        `<div class="rebuild" id="rebuild">${i === 0 ? "The ground can't be thrown away. A record can lose its payload, never its place." : ""}</div>`;
      $("#toss") && $("#toss").addEventListener("click", toss);
    };
    function toss() {
      if (busy || sel === 0) return;
      busy = true; const i = sel, p = S.planes[i], msg = $("#rebuild");
      $("#toss").disabled = true;
      p.g.classList.add("gone");
      msg.textContent = `${byIdx(i).name} is gone.`;
      const below = planeY(i - 1), here = planeY(i);
      const beam = sv("line", { class: "beam", x1: G.cx, x2: G.cx, y1: below, y2: below }, S.top);
      const t0 = performance.now() + (reduced() ? 0 : 650), dur = reduced() ? 1 : 750;
      (function step(now) {
        const k = Math.max(0, Math.min(1, (now - t0) / dur));
        beam.setAttribute("y2", lerp(below, here, ease(k)).toFixed(1));
        if (k < 1) return requestAnimationFrame(step);
        p.g.classList.remove("gone");
        msg.textContent = REBUILD[i];
        setTimeout(() => { beam.remove(); busy = false; const b = $("#toss"); if (b && sel === i) b.disabled = false; }, reduced() ? 0 : 500);
      })(performance.now());
    }
    S.planes.forEach((p, i) => {
      const pick = () => selectLayer(i);
      p.g.addEventListener("click", pick); p.lab.addEventListener("click", pick);
      p.lab.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(); } });
    });
    table.addEventListener("click", (e) => { const tr = e.target.closest("tr[data-i]"); if (tr) selectLayer(+tr.dataset.i); });
    selectLayer(0);
  })();

  /* ---------- nouns ---------- */
  (function nouns() {
    const dict = $("#dict"), fl = $("#nfilters");
    const counts = { all: NOUNS.length };
    NOUNS.forEach((n) => (counts[n.status] = (counts[n.status] || 0) + 1));
    fl.innerHTML = ["all", "proved", "settled", "open"].filter((k) => counts[k]).map((k) => `<button class="fbtn" data-f="${k}" aria-pressed="${k === "all"}">${k === "all" ? "All" : STATUS[k].mark + " " + k}<span class="c">${counts[k]}</span></button>`).join("");
    dict.innerHTML = NOUN_GROUPS.map((g, gi) => {
      const list = NOUNS.filter((n) => n.group === gi);
      return `<div class="dgroup"><div class="gh"><h3>${g.name}</h3><p>${g.gist}</p><span class="lbl">${g.layer}</span></div><div class="entries">` +
        list.map((n) => `<article class="entry" id="n-${n.word}" data-status="${n.status}">` +
          `<div class="eh"><h4 class="hw">${n.word}</h4><span class="pos">n.</span>${chip(n.status)}</div>` +
          `<p class="purpose">${n.purpose}</p><p class="principle">${n.principle}</p>` +
          (n.note ? `<p class="note">${n.note}</p>` : "") +
          `<details><summary>State${n.laws.length ? " and laws" : ""}</summary><div><p>${n.state}</p>${lawRow(n.laws)}</div></details>` +
          `<p class="eg"><span class="lbl">In the walk</span>${n.eg}</p></article>`).join("") + `</div></div>`;
    }).join("");
    fl.addEventListener("click", (e) => {
      const b = e.target.closest(".fbtn"); if (!b) return;
      $$(".fbtn", fl).forEach((x) => x.setAttribute("aria-pressed", x === b));
      const f = b.dataset.f;
      $$(".entry", dict).forEach((en) => en.classList.toggle("dim", f !== "all" && en.dataset.status !== f));
      $$(".dgroup", dict).forEach((g) => (g.style.display = $$(".entry:not(.dim)", g).length ? "" : "none"));
    });
  })();

  /* ---------- verbs ---------- */
  (function verbs() {
    const fam = [
      ["write", "Write", "adds to the ground"],
      ["read", "Read", "in this order"],
      ["text", "Text", "to people and back"],
      ["any", "Any layer", "at every step"],
    ];
    const pipe = $("#pipe");
    pipe.innerHTML = fam.map(([k, name, sub]) => {
      const vs = VERBS.filter((v) => v.family === k);
      return `<div class="prow"><div class="pf">${name}<small>${sub}</small></div><div class="vchain">` +
        vs.map((v, j) => `${j ? `<span class="arrow" aria-hidden="true">${k === "read" || k === "text" ? "→" : "·"}</span>` : ""}<button class="vchip" data-v="${v.word}" aria-pressed="false"><span class="gl" aria-hidden="true">${STATUS[v.status].mark}</span>${v.word}</button>`).join("") + `</div></div>`;
    }).join("") + `<div class="vdetail" id="vdetail" aria-live="polite"></div>`;
    const show = (w) => {
      const v = VERBS.find((x) => x.word === w);
      $$(".vchip", pipe).forEach((c) => c.setAttribute("aria-pressed", c.dataset.v === w));
      $("#vdetail").innerHTML = `<div class="vh"><b>${v.word}</b><i>v.</i>${chip(v.status)}</div><p>${v.says}</p>${lawRow(v.laws)}`;
    };
    pipe.addEventListener("click", (e) => { const c = e.target.closest(".vchip"); if (c) show(c.dataset.v); });
    show("emit");
    $("#cons").innerHTML = CONSTRUCTIONS.map((c) => `<div class="con ${c.state ? "state" : ""}"><div class="eq"><span class="lhs">${c.word}</span><span class="op">=</span>${c.parts.map((p) => `<span class="part">${esc(p)}</span>`).join('<span class="op">+</span>')}${c.state ? '<span class="statetag">a state</span>' : ""}</div><p>${c.says}</p></div>`).join("");
    // Codebook
    const grid = $("#cbgrid"), q = $("#cbq"), cnt = $("#cbcount");
    const unique = new Set(REFUSALS.flatMap((g) => g.codes));
    grid.innerHTML = REFUSALS.map((g) => `<div class="cbg ${g.unpinned ? "unpinned" : ""}"><h4>${g.group}<span>${g.codes.length}</span></h4><p>${g.note}</p><ol>${g.codes.map((c) => `<li>${c}</li>`).join("")}</ol></div>`).join("");
    const base = `${unique.size} codes in ${REFUSALS.length} groups. Two are named and not pinned by a vector yet.`;
    cnt.textContent = base;
    q.addEventListener("input", () => {
      const v = q.value.trim().toLowerCase();
      let hits = 0;
      $$(".cbg", grid).forEach((g) => {
        let any = false;
        $$("li", g).forEach((li) => { const m = v && li.textContent.includes(v); li.classList.toggle("hit", !!m); if (m) { any = true; hits++; } });
        g.classList.toggle("dim", !!v && !any);
      });
      cnt.textContent = v ? (hits ? `${hits} match${hits === 1 ? "" : "es"}. A code in two groups is listed twice.` : "No code matches. Refusals are a closed set, so a code that isn't here doesn't exist.") : base;
    });
  })();

  /* ---------- matrix ---------- */
  (function matrix() {
    const t = $("#mx"), cols = MATRIX.cols;
    const colN = cols.map((c) => MATRIX.rows.filter(([, r]) => r[c]).length);
    t.innerHTML = `<thead><tr><th></th>${cols.map((c, j) => `<th data-c="${j}">${c}</th>`).join("")}<th class="n">verbs</th></tr></thead><tbody>` +
      MATRIX.rows.map(([noun, r], i) => `<tr data-r="${i}"><th scope="row"><a href="#n-${noun}" style="text-decoration:none">${noun}</a></th>${cols.map((c, j) => `<td data-r="${i}" data-c="${j}" class="${r[c] ? "" : "e"}">${r[c] ? esc(r[c]) : "none"}</td>`).join("")}<td class="n">${Object.keys(r).length}</td></tr>`).join("") +
      `</tbody><tfoot><tr><td class="n" style="text-align:left">nouns</td>${colN.map((n) => `<td class="n" style="text-align:left">${n}</td>`).join("")}<td></td></tr></tfoot>`;
    const clear = () => $$(".xr,.xc,.xx", t).forEach((e) => e.classList.remove("xr", "xc", "xx"));
    const hl = (cell) => {
      clear(); if (!cell || cell.dataset.r == null) return;
      const r = cell.dataset.r, c = cell.dataset.c;
      $$(`[data-r="${r}"]`, t).forEach((e) => e.tagName === "TD" && e.classList.add("xr"));
      $$(`[data-c="${c}"]`, t).forEach((e) => e.classList.add("xc"));
      if (!cell.classList.contains("e")) cell.classList.add("xx");
    };
    t.addEventListener("mouseover", (e) => hl(e.target.closest("td[data-c]")));
    t.addEventListener("click", (e) => hl(e.target.closest("td[data-c]")));
    t.addEventListener("mouseleave", clear);
  })();

  /* ---------- status board ---------- */
  (function board() {
    const nounLink = (n) => `<a class="nv" href="#n-${n.word}">${n.word}</a>`;
    const verbLink = (v) => `<a class="nv" href="#verbs">${v.word}</a>`;
    const cols = [
      { k: "proved", items: [`<b>Nouns</b>`, ...NOUNS.filter((n) => n.status === "proved").map(nounLink), `<b>Verbs</b>`, ...VERBS.filter((v) => v.status === "proved").map(verbLink)] },
      { k: "settled", items: [...VERBS.filter((v) => v.status === "settled").map((v) => `${verbLink(v)}: edits become records`), `Naming a vertex by its spec's hash`, `When a vertex ticks`] },
      { k: "open", items: [...NOUNS.filter((n) => n.status === "open").map((n) => `${nounLink(n)}: <a href="#is3">IS3</a>, <a href="#is4">IS4</a>, <a href="#is5">IS5</a>, <a href="#is7">IS7</a>`), `What an observer names: <a href="#is10">IS10</a>, <a href="#is11">IS11</a>`] },
      { k: "planned", items: [`Emitting accepted edits (the lens)`, `Views shaped for an audience (render)`, `Tick boundaries, markers and the runner`, `Lineages, key bindings and standing, in step 3`, `Standing as part of admit, in step 3`] },
    ];
    const SAY = { proved: STATUS.proved.says, settled: STATUS.settled.says, open: STATUS.open.says, planned: "Named in an entry, and neither decided as a design nor built." };
    $("#boardcols").innerHTML = cols.map((c) => `<div class="col ${c.k}"><h3>${c.k === "planned" ? "Planned" : chip(c.k)}<span class="c">${c.items.filter((x) => !x.startsWith("<b>")).length}</span></h3><p>${SAY[c.k]}</p><ul>${c.items.map((x) => `<li${x.startsWith("<b>") ? ' class="hd"' : ""}>${x}</li>`).join("")}</ul></div>`).join("");
  })();

  $("#prov").innerHTML = PROVENANCE.map((p) => `<div><div class="w">${p.work}</div><p>${p.here}</p></div>`).join("");

  /* ---------- decisions ---------- */
  const leans = local.get("sl-leans") || {};
  const decById = Object.fromEntries(DEC.map((d) => [d.id, d]));
  function updateTray() {
    const n = Object.keys(leans).length, tray = $("#tray");
    tray.classList.toggle("show", current === "decisions" && n > 0);
    $("#traytxt").innerHTML = `${n} of ${DEC.length} marked <small>· kept in this browser only</small>`;
    $$(".depmap .nd").forEach((g) => g.classList.toggle("lean", !!leans[g.dataset.id]));
  }
  const decNote = (x) => `<p class="after">${x.label ? `<b>${x.label}.</b> ` : ""}${x.text}</p>`;
  (function decisions() {
    $("#starthere").innerHTML = DEC.filter((d) => d.trial).map((d) => `<a class="sh" href="#${d.id.toLowerCase()}"><span class="isid">${d.id}</span><b>${d.title}</b></a>`).join("");
    $("#decs").innerHTML = DEC.map((d) => `<article class="sheet dec" id="${d.id.toLowerCase()}">` +
      `<div class="dh"><span class="isid">${d.id}</span>${d.trial ? '<span class="trialtag">Needed for the trial</span>' : ""}<span class="lean-state" data-ls="${d.id}"></span></div>` +
      `<h3>${d.title}</h3><p class="ask">${d.ask}</p>` +
      `<div class="egbox"><span class="lbl">Example</span><p>${d.eg}</p>${d.run ? `<details><summary>What the binary printed at ${DEC_AT}</summary><pre>${esc(d.run)}</pre></details>` : ""}</div>` +
      d.before.map(decNote).join("") +
      `<div class="opts">${d.options.map((o) => `<div class="opt ${o.rec ? "rec" : ""}" data-d="${d.id}" data-k="${esc(o.k)}"><span class="ok">${o.k}</span><div>` +
        (o.label ? `<span class="recby">${o.label}</span>` : "") +
        `<p class="oc">${o.choice}</p><p class="ocost"><b>Cost</b>${o.cost}</p></div><div class="oside"><button class="leanbtn" aria-pressed="false">I lean this way</button></div></div>`).join("")}</div>` +
      d.after.map(decNote).join("") +
      `<div class="meta"><span><b>What it changes</b>${d.changes}</span><span><b>Source</b>${d.from}</span></div></article>`).join("");
    const paint = () => {
      $$(".opt").forEach((o) => { const on = leans[o.dataset.d] === o.dataset.k; o.classList.toggle("leaned", on); $(".leanbtn", o).setAttribute("aria-pressed", on); $(".leanbtn", o).textContent = on ? "You lean this way" : "I lean this way"; });
      $$("[data-ls]").forEach((e) => (e.textContent = leans[e.dataset.ls] ? `you lean ${leans[e.dataset.ls]}` : ""));
      local.set("sl-leans", leans); updateTray();
    };
    $("#decs").addEventListener("click", (e) => {
      const b = e.target.closest(".leanbtn"); if (!b) return;
      const o = b.closest(".opt"), id = o.dataset.d, k = o.dataset.k;
      if (leans[id] === k) delete leans[id]; else leans[id] = k;
      paint();
    });
    $("#trayclear").addEventListener("click", () => { Object.keys(leans).forEach((k) => delete leans[k]); paint(); });
    $("#traycopy").addEventListener("click", async () => {
      const lines = DEC.filter((d) => leans[d.id]).map((d) => { const o = d.options.find((x) => x.k === leans[d.id]); const t = strip(o.choice), m1 = t.match(/^.+?[.!?](?=\s|$)/); return `${d.id} ${leans[d.id]}: ${m1 ? m1[0] : t}`; });
      const text = "My leanings on the open decisions:\n" + lines.join("\n");
      const btn = $("#traycopy");
      let ok = false;
      try { await navigator.clipboard.writeText(text); ok = true; } catch (e) {
        const ta = document.createElement("textarea"); ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0"; document.body.appendChild(ta); ta.select();
        try { ok = document.execCommand("copy"); } catch (e2) { ok = false; }
        ta.remove();
      }
      btn.textContent = ok ? "Copied" : "Couldn't copy";
      setTimeout(() => (btn.textContent = "Copy as text"), 1600);
    });
    paint();

    // Dependency map
    const svg = $("#depsvg");
    svg.setAttribute("viewBox", "0 0 760 380");
    const POS = /*data:POS*/;
    const W = 168, H = 40;
    const eg = sv("g", {}, svg), ng = sv("g", {}, svg);
    const edgeEls = DEC_EDGES.map(([a, b, why, soft]) => {
      const [x1, y1] = POS[a], [x2, y2] = POS[b];
      const sx = x1 + W / 2, ex = x2 - W / 2, mx = (sx + ex) / 2;
      const p = sv("path", { class: "de" + (soft ? " soft" : ""), d: `M${sx} ${y1} C${mx} ${y1}, ${mx} ${y2}, ${ex - 6} ${y2}`, "marker-end": "url(#dep-ar)" }, eg);
      return { a, b, why, soft, p };
    });
    const defs = sv("defs", {}, svg);
    const mk = sv("marker", { id: "dep-ar", viewBox: "0 0 10 10", refX: "6", refY: "5", markerWidth: "7", markerHeight: "7", orient: "auto" }, defs);
    sv("path", { d: "M1 1 9 5 1 9", class: "mk", "stroke-width": "1.6" }, mk);
    const cap = $("#dcap"), capDef = cap.textContent;
    Object.entries(POS).forEach(([id, [x, y]]) => {
      const d = decById[id];
      const g = sv("g", { class: "nd" + (d.trial ? " trial" : ""), "data-id": id, tabindex: "0", role: "link", "aria-label": `${id}: ${ISSHORT[id]}` }, ng);
      sv("rect", { x: x - W / 2, y: y - H / 2, width: W, height: H, rx: 10 }, g);
      const t1 = sv("text", { x: x - W / 2 + 12, y: y + 4.5, class: "ndid", "font-size": "12" }, g); t1.textContent = id;
      const t2 = sv("text", { x: x - W / 2 + 50, y: y + 4.5, class: "svgt", "font-size": "13" }, g); t2.textContent = ISSHORT[id];
      const enter = () => {
        g.classList.add("hl");
        const mine = edgeEls.filter((e) => e.a === id || e.b === id);
        mine.forEach((e) => e.p.classList.add("hl"));
        mine.forEach((e) => $(`.nd[data-id="${e.a === id ? e.b : e.a}"]`, svg).classList.add("hl"));
        cap.innerHTML = mine.length ? mine.map((e) => `<b>${e.a} → ${e.b}</b> ${e.why}${e.soft ? " (a reading, not stated in the entry)" : ""}`).join(" · ") : `${id} stands alone.`;
      };
      const leave = () => { $$(".hl", svg).forEach((e) => e.classList.remove("hl")); cap.textContent = capDef; };
      g.addEventListener("mouseenter", enter); g.addEventListener("focus", enter);
      g.addEventListener("mouseleave", leave); g.addEventListener("blur", leave);
      g.addEventListener("click", () => (location.hash = id.toLowerCase()));
      g.addEventListener("keydown", (e) => { if (e.key === "Enter") location.hash = id.toLowerCase(); });
    });
    const tx = sv("text", { x: 100, y: 14, class: "svgm", "font-size": "11", "text-anchor": "middle" }, svg); tx.textContent = "rule first";
    const tx2 = sv("text", { x: 380, y: 14, class: "svgm", "font-size": "11", "text-anchor": "middle" }, svg); tx2.textContent = "then";
    const tx3 = sv("text", { x: 660, y: 14, class: "svgm", "font-size": "11", "text-anchor": "middle" }, svg); tx3.textContent = "last";
    $("#deplist").innerHTML = DEC_EDGES.map(([a, b, why, soft]) => `<li><a href="#${a.toLowerCase()}">${a}</a> → <a href="#${b.toLowerCase()}">${b}</a>: ${why}${soft ? " (a reading, not stated in the entry)" : ""}.</li>`).join("");
    updateTray();

    // Ruled log
    const logs = $("#logs"), lq = $("#logq"), more = $("#logmore"), lc = $("#logcount");
    let all = false;
    logs.innerHTML = RULED.map((r) => `<li><span class="ld">${r.date.replace(/^2026-/, "")}</span><div><div class="lh">${r.head}</div>${r.text ? `<div class="lt">${r.text}</div>` : ""}${r.where.length ? `<div class="lw">${r.where.join("")}</div>` : ""}</div></li>`).join("");
    const items = $$("li", logs);
    const filter = () => {
      const v = lq.value.trim().toLowerCase();
      let shown = 0;
      items.forEach((li, k) => { const m = !v || li.textContent.toLowerCase().includes(v); const vis = m && (all || v || k < 8); li.classList.toggle("hide", !vis); if (vis) shown++; });
      more.hidden = all || !!v;
      lc.textContent = v ? `${shown} of ${RULED.length}` : all ? `All ${RULED.length}` : `Latest 8 of ${RULED.length}`;
    };
    lq.addEventListener("input", filter);
    more.addEventListener("click", () => { all = true; filter(); });
    filter();
  })();

  route();
})();


/* ================= Guide ================= */
(() => {
  "use strict";
  const root = document.getElementById("v-guide");
  if (!root) return;
  const $ = (q, r = root) => r.querySelector(q);
  const $$ = (q, r = root) => [...r.querySelectorAll(q)];
  const NS = "http://www.w3.org/2000/svg";
  const sv = (tag, attrs = {}, parent) => {
    const e = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) if (v != null) e.setAttribute(k, v);
    if (parent) parent.appendChild(e);
    return e;
  };
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const mq = (q) => (window.matchMedia ? matchMedia(q) : { matches: false, addEventListener() {} });

  /* ---------- copy buttons ---------- */
  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text);
    return new Promise((res, rej) => {
      const ta = document.createElement("textarea");
      ta.value = text; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy") ? res() : rej(); } catch (e) { rej(e); }
      ta.remove();
    });
  }
  $$("pre.code").forEach((pre) => {
    const b = document.createElement("button");
    b.className = "cp"; b.type = "button"; b.textContent = "Copy";
    const term = pre.classList.contains("term");
    b.setAttribute("aria-label", term ? "Copy the commands" : "Copy");
    b.addEventListener("click", () => {
      const text = term
        ? $$(".cl", pre).map((s) => s.textContent.replace(/^\$ /, "")).join("\n")
        : [...pre.childNodes].filter((n) => n !== b).map((n) => n.textContent).join("");
      copyText(text.replace(/\n+$/, "")).then(() => {
        b.textContent = "Copied"; b.classList.add("done");
        setTimeout(() => { b.textContent = "Copy"; b.classList.remove("done"); }, 1600);
      }, () => { b.textContent = "Select and copy"; });
    });
    pre.appendChild(b);
  });

  /* ---------- contents ---------- */
  const toc = $("#gtoc"), tocd = $("#gtocd");
  const marks = [];
  $$("#gdoc > .gpart").forEach((part) => {
    const h = $(":scope > h2", part);
    const li = document.createElement("li"); li.className = "p";
    li.innerHTML = `<a href="#${part.id}">${h.innerHTML}</a>`;
    toc.appendChild(li);
    marks.push({ el: part, a: $("a", li), part: li });
    $$(":scope > .gsec", part).forEach((s) => {
      const h3 = $(":scope > h3", s);
      const si = document.createElement("li"); si.className = "s"; si.dataset.part = part.id;
      si.innerHTML = `<a href="#${s.id}">${h3.innerHTML}</a>`;
      toc.appendChild(si);
      marks.push({ el: s, a: $("a", si), part: li });
    });
  });
  const small = mq("(max-width: 980px)");
  const fitToc = () => { tocd.open = !small.matches; };
  fitToc();
  if (small.addEventListener) small.addEventListener("change", fitToc);
  toc.addEventListener("click", (e) => { if (e.target.closest("a") && small.matches) tocd.open = false; });
  let lastOn = null, ticking = false;
  function spy() {
    ticking = false;
    if (root.hidden) return;
    let on = null;
    for (const m of marks) { if (m.el.getBoundingClientRect().top <= 140) on = m; else break; }
    if (on === lastOn) return;
    lastOn = on;
    marks.forEach((m) => m.a.removeAttribute("aria-current"));
    const partId = on ? (on.part.querySelector("a").getAttribute("href").slice(1)) : null;
    $$("li.s", toc).forEach((li) => li.classList.toggle("vis", li.dataset.part === partId));
    if (on) {
      on.a.setAttribute("aria-current", "true");
      if (!small.matches && on.a.scrollIntoView) {
        const r = on.a.getBoundingClientRect(), t = toc.parentElement.parentElement.getBoundingClientRect();
        if (r.top < t.top || r.bottom > t.bottom) on.a.scrollIntoView({ block: "nearest" });
      }
    }
  }
  window.addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(spy); } }, { passive: true });
  window.addEventListener("hashchange", () => requestAnimationFrame(spy));
  spy();

  /* ---------- record cards ---------- */
  function card(r, { head, dead = [], tag } = {}) {
    const pay = Object.entries(r.pay);
    return `<div class="frec${head ? " head" : ""}" data-r="${esc(tag || r.id)}">
      <div class="fid"><span>${esc(r.id)}</span>${head ? "<b>head</b>" : ""}</div>
      <div class="fenv">${esc(r.env)}</div>
      <div class="fpay">${pay.length ? pay.map(([k, v]) => `<span data-f="${esc(k)}" class="${dead.includes(k) ? "dead" : ""}"${dead.includes(k) ? ' title="No longer read: a later record set it"' : ""}>${esc(k)}: ${esc(v)}</span>`).join("") : '<span class="dead" title="This record sets nothing">no fields</span>'}</div>
    </div>`;
  }
  function reading(rows, title, cardsEl, idOf) {
    return `<div class="rh">${title}</div>` + rows.map(([f, v, from]) =>
      `<div class="rr" tabindex="0" data-f="${esc(f)}" data-from="${from ? esc(from) : ""}"><span class="f">${esc(f)}</span><span class="v">${esc(v)}</span><span class="from">${from ? "from " + esc(idOf ? idOf(from) : from) : "no setter"}</span></div>`).join("");
  }
  function wireReading(readEl, scope) {
    const light = (rr, on) => {
      rr.classList.toggle("lit", on);
      const from = rr.dataset.from, f = rr.dataset.f;
      if (!from) return;
      const c = scope.querySelector(`.frec[data-r="${CSS.escape(from)}"] [data-f="${CSS.escape(f)}"]`);
      if (c) c.classList.toggle("lit", on);
    };
    readEl.querySelectorAll(".rr").forEach((rr) => {
      rr.addEventListener("mouseenter", () => light(rr, true));
      rr.addEventListener("mouseleave", () => light(rr, false));
      rr.addEventListener("focus", () => light(rr, true));
      rr.addEventListener("blur", () => light(rr, false));
    });
  }

  /* ---------- ten minutes ---------- */
  (() => {
    const box = $("#first");
    if (!box) return;
    const steps = $$(".fstep", box), store = $("#fstore"), read = $("#fread"), say = $("#fsay"), count = $("#fcount");
    const next = $("#fnext"), prev = $("#fprev");
    let i = 0;
    function render(focus) {
      steps.forEach((s, k) => {
        s.classList.toggle("on", k === i); s.classList.toggle("done", k < i);
        $(".fhead", s).setAttribute("aria-expanded", String(k === i));
      });
      const S = G_FIRST.steps[i];
      say.textContent = S.say;
      count.textContent = `${i + 1} / ${steps.length}`;
      prev.disabled = i === 0;
      next.textContent = i === steps.length - 1 ? "Start again" : "Next step";
      let h = "";
      if (i === 0) h = `<div class="fempty">${G_STEP_NOTES[0][0]}</div>`;
      else h = `<div class="fdesc">${G_STEP_NOTES[1][0]}</div>`;
      if (i === 1) h += `<div class="fempty">${G_STEP_NOTES[1][1]}</div>`;
      (S.recs || []).slice().reverse().forEach((k) => {
        h += card(G_FIRST[k], { head: S.head === k, dead: (S.dead || {})[k] || [], tag: k });
      });
      if (S.dead) h += `<div class="fdesc">${G_STEP_NOTES[3][0]}</div>`;
      store.innerHTML = h;
      if (S.read) {
        read.hidden = false;
        read.innerHTML = reading(S.read, "loops of kiln:east", store, (k) => G_FIRST[k].id);
        wireReading(read, store);
      } else { read.hidden = true; read.innerHTML = ""; }
      if (focus) $(".fhead", steps[i]).focus();
    }
    steps.forEach((s, k) => $(".fhead", s).addEventListener("click", () => { i = k; render(); }));
    next.addEventListener("click", () => { i = (i + 1) % steps.length; render(); });
    prev.addEventListener("click", () => { if (i > 0) { i--; render(); } });
    render();
  })();

  /* ---------- heads, fork, join ---------- */
  (() => {
    const fig = $("#headsfig");
    if (!fig) return;
    const panels = [
      { t: G_DIAGRAMS.headsfig.labels[0][0], s: G_DIAGRAMS.headsfig.labels[0][1], n: [[28, 60], [80, 60], [132, 60]], e: [[1, 0], [2, 1]], h: [2] },
      { t: G_DIAGRAMS.headsfig.labels[1][0], s: G_DIAGRAMS.headsfig.labels[1][1], n: [[28, 60], [118, 28], [118, 92]], e: [[1, 0], [2, 0]], h: [1, 2] },
      { t: G_DIAGRAMS.headsfig.labels[2][0], s: G_DIAGRAMS.headsfig.labels[2][1], n: [[22, 60], [76, 28], [76, 92], [134, 60]], e: [[1, 0], [2, 0], [3, 1], [3, 2]], h: [3] },
    ];
    panels.forEach((P, pi) => {
      const d = document.createElement("div"); d.className = "hf";
      const svg = sv("svg", { viewBox: "0 0 160 120", role: "img", "aria-label": `${P.t}: ${P.s}` }, d);
      const mk = sv("marker", { id: `hfm${pi}`, viewBox: "0 0 10 10", refX: "8", refY: "5", markerWidth: "7", markerHeight: "7", orient: "auto" }, sv("defs", {}, svg));
      sv("path", { d: "M1 1 9 5 1 9", class: "fig-mk" }, mk);
      P.e.forEach(([a, b]) => {
        const [x1, y1] = P.n[a], [x2, y2] = P.n[b];
        const L = Math.hypot(x2 - x1, y2 - y1), ux = (x2 - x1) / L, uy = (y2 - y1) / L;
        sv("line", { class: "fig-e", x1: x1 + ux * 11, y1: y1 + uy * 11, x2: x2 - ux * 12, y2: y2 - uy * 12, "marker-end": `url(#hfm${pi})` }, svg);
      });
      P.n.forEach(([x, y], k) => sv("circle", { cx: x, cy: y, r: 9, class: "fig-n" + (P.h.includes(k) ? " hd" : "") }, svg));
      const p = document.createElement("p"); p.innerHTML = `${P.t}<span>${P.s}</span>`; d.appendChild(p);
      fig.appendChild(d);
    });
    const cap = document.createElement("p");
    cap.style.cssText = "grid-column:1/-1;font:400 13px/1.45 var(--sans)!important;color:var(--faint);margin:0!important;text-align:center";
    cap.textContent = G_DIAGRAMS.headsfig.caption;
    fig.appendChild(cap);
  })();

  /* ---------- the three cases of sets ---------- */
  (() => {
    const box = $("#setsdemo");
    if (!box) return;
    box.innerHTML = `<div class="segtabs" role="tablist" aria-label="Three cases of sets">${G_SETS.map((c, k) => `<button role="tab" aria-selected="${k === 0}" data-k="${k}">${c.tab}</button>`).join("")}</div><div class="segbody"><div class="segrecs"></div><div class="fread"></div><p class="segsay"></p></div>`;
    const tabs = $$(".segtabs button", box), recs = $(".segrecs", box), rd = $(".fread", box), say = $(".segsay", box);
    function show(k) {
      const C = G_SETS[k];
      tabs.forEach((t, j) => { t.setAttribute("aria-selected", String(j === k)); t.tabIndex = j === k ? 0 : -1; });
      const dead = {};
      C.read.forEach(([f, , from]) => { C.rows.flat().forEach((r) => { if (r.pay[f] != null && r.id !== from) (dead[r.id] = dead[r.id] || []).push(f); }); });
      recs.innerHTML = C.rows.map((row) => `<div class="row">${row.map((r) => card(r, { head: r.head, dead: dead[r.id] || [] })).join("")}</div>`).join("");
      rd.innerHTML = reading(C.read, "What the kiln reads as");
      wireReading(rd, recs);
      say.innerHTML = C.say;
    }
    tabs.forEach((t, k) => {
      t.addEventListener("click", () => show(k));
      t.addEventListener("keydown", (e) => {
        if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
        const j = (k + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length;
        tabs[j].focus(); show(j);
      });
    });
    show(0);
  })();

  /* ---------- flows (judge, agent turn) ---------- */
  function flow(el, boxes, back) {
    if (!el) return;
    el.innerHTML = `<div class="flow">${boxes.map((b, k) => `${k ? '<span class="fa" aria-hidden="true"></span>' : ""}<div class="fl${b.ink ? " ink" : ""}"><b>${b.t}</b><span>${b.s}</span></div>`).join("")}</div>${back ? `<div class="flback"><span aria-hidden="true">↺</span>${back}</div>` : ""}`;
  }
  flow($("#judgefig"), [
    { t: G_DIAGRAMS.judgefig.labels[0][0], s: G_DIAGRAMS.judgefig.labels[0][1] },
    { t: G_DIAGRAMS.judgefig.labels[1][0], s: G_DIAGRAMS.judgefig.labels[1][1] },
    { t: G_DIAGRAMS.judgefig.labels[2][0], s: G_DIAGRAMS.judgefig.labels[2][1], ink: true },
  ], G_DIAGRAMS.judgefig.caption);
  flow($("#turnfig"), [
    { t: G_DIAGRAMS.turnfig.labels[0][0], s: G_DIAGRAMS.turnfig.labels[0][1] },
    { t: G_DIAGRAMS.turnfig.labels[1][0], s: G_DIAGRAMS.turnfig.labels[1][1] },
    { t: G_DIAGRAMS.turnfig.labels[2][0], s: G_DIAGRAMS.turnfig.labels[2][1], ink: true },
    { t: G_DIAGRAMS.turnfig.labels[3][0], s: G_DIAGRAMS.turnfig.labels[3][1] },
  ], G_DIAGRAMS.turnfig.caption);

  /* ---------- shapes ---------- */
  (() => {
    const box = $("#shapes");
    if (!box) return;
    box.innerHTML = `<div class="shapeitems" role="group" aria-label="Things in the workshop">${G_SHAPES.map((s, k) => `<button aria-pressed="${k === 0}" data-k="${k}">${s.name}</button>`).join("")}</div><div class="shapedetail" aria-live="polite"><div class="glyph"></div><div class="txt"></div></div>`;
    const btns = $$(".shapeitems button", box), glyph = $(".glyph", box), txt = $(".txt", box);
    function draw(kind) {
      glyph.innerHTML = "";
      const svg = sv("svg", { viewBox: "0 0 150 96", "aria-hidden": "true" }, glyph);
      if (kind === 0) {
        sv("rect", { x: 6, y: 18, width: 138, height: 62, rx: 12, class: "fig-box" }, svg);
        [[38, 49], [75, 49], [112, 49]].forEach(([x, y], k, a) => {
          if (k) sv("line", { x1: a[k - 1][0] + 9, y1: y, x2: x - 9, y2: y, class: "fig-e" }, svg);
          sv("circle", { cx: x, cy: y, r: 8, class: "fig-n" + (k === 2 ? " hd" : "") }, svg);
        });
        sv("text", { x: 75, y: 12, "text-anchor": "middle", class: "fig-tl" }, svg).textContent = G_SHAPE_LABELS[0];
      } else if (kind === 1) {
        sv("circle", { cx: 75, cy: 50, r: 11, class: "fig-n hd" }, svg);
        sv("line", { x1: 86, y1: 50, x2: 134, y2: 50, class: "fig-e", "stroke-dasharray": "3 3" }, svg);
        sv("rect", { x: 118, y: 40, width: 28, height: 20, rx: 6, class: "fig-box" }, svg);
        sv("text", { x: 75, y: 84, "text-anchor": "middle", class: "fig-tl" }, svg).textContent = G_SHAPE_LABELS[1];
      } else {
        sv("circle", { cx: 22, cy: 50, r: 13, class: "fig-n" }, svg);
        sv("circle", { cx: 128, cy: 50, r: 13, class: "fig-n" }, svg);
        sv("line", { x1: 35, y1: 50, x2: 115, y2: 50, class: "fig-e" }, svg);
        sv("rect", { x: 61, y: 39, width: 28, height: 22, rx: 6, class: "fig-box ink" }, svg);
        sv("text", { x: 75, y: 88, "text-anchor": "middle", class: "fig-tl" }, svg).textContent = G_SHAPE_LABELS[2];
      }
    }
    function show(k) {
      const S = G_SHAPES[k], K = G_SHAPE_KINDS[S.shape];
      btns.forEach((b, j) => b.setAttribute("aria-pressed", String(j === k)));
      draw(S.shape);
      txt.innerHTML = `<h4>${K.title}</h4><p><b>Use it for</b> ${K.use}</p><p><b>How</b> ${K.how}</p><p><b>${esc(S.name)} is named</b> <code>${esc(S.ex)}</code></p>`;
    }
    btns.forEach((b, k) => b.addEventListener("click", () => show(k)));
    show(0);
  })();

  /* ---------- annotated files ---------- */
  $$(".annot").forEach((box) => {
    const dict = G_ANNOT[box.dataset.annot] || {};
    const side = $(".annotside", box), first = side.innerHTML;
    let pinned = null;
    const keys = $$("pre .k", box).filter((k) => dict[k.dataset.k]);
    keys.forEach((k) => k.setAttribute("tabindex", "0"));
    function show(k) {
      keys.forEach((x) => x.classList.toggle("lit", x === k));
      if (!k) { side.innerHTML = first; return; }
      const [name, def] = dict[k.dataset.k];
      side.innerHTML = `<p class="an">${esc(name)}</p><p>${esc(def)}</p>`;
    }
    keys.forEach((k) => {
      k.addEventListener("mouseenter", () => { if (!pinned) show(k); });
      k.addEventListener("focus", () => show(k));
      k.addEventListener("click", () => { pinned = pinned === k ? null : k; show(k); });
    });
    box.addEventListener("mouseleave", () => { if (!pinned) show(null); });
  });

  /* ---------- the book ---------- */
  $$("figure.book").forEach((fig) => {
    const B = G_BOOK[fig.dataset.book];
    if (!B) return;
    let h = `<div class="bk-t"><span>${esc(B.title)}</span><span>${B.sources ? "3 sources" : "print.jq"}</span></div>`;
    if (B.sources) h += B.sources.map(([when, text]) => `<div class="bk-src"><span>occurred ${esc(when)}</span><p>${esc(text)}</p></div>`).join("");
    else B.pages.forEach((group, gi) => {
      group.forEach((p, pj) => {
        const cls = ["bk-p"];
        if (group.length > 1) cls.push("two");
        if (B.cut === gi) cls.push("cut");
        if (B.nul === gi) cls.push("nul");
        h += `<div class="${cls.join(" ")}"><div class="bk-h"><span>${esc(p[0])}</span>${esc(p[1])}</div><p>${esc(p[2])}</p>`;
        if (group.length > 1 && pj === group.length - 1) h += `<div class="bk-n alert">${esc(B.note)}</div>`;
        if (B.cut === gi) h += `<div class="bk-n">${esc(G_BOOK_NOTES.cut)}</div>`;
        if (B.finalAt === gi) h += `<div class="bk-n">${esc(G_BOOK_NOTES.final)}</div>`;
        if (B.nul === gi) h += `<div class="bk-n alert">${esc(G_BOOK_NOTES.nul)}</div>`;
        h += "</div>";
      });
    });
    h += `<figcaption>${esc(B.cap)}</figcaption>`;
    fig.innerHTML = h;
    fig.setAttribute("aria-label", B.title);
  });

  /* ---------- four questions ---------- */
  (() => {
    const box = $("#asks");
    if (!box) return;
    const tabs = $$(".asktabs button", box), panes = $$(".askpane", box);
    function show(k) {
      tabs.forEach((t, j) => { t.setAttribute("aria-selected", String(j === k)); t.tabIndex = j === k ? 0 : -1; });
      panes.forEach((p, j) => (p.hidden = j !== k));
    }
    tabs.forEach((t, k) => {
      t.addEventListener("click", () => show(k));
      t.addEventListener("keydown", (e) => {
        if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
        const j = (k + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length;
        tabs[j].focus(); show(j);
      });
    });
    show(0);
  })();

  /* ---------- every wording ---------- */
  (() => {
    const fig = $("#wordings");
    if (!fig) return;
    const svg = sv("svg", { viewBox: "0 0 520 150", role: "img", "aria-label": G_DIAGRAMS.wordings.order }, fig);
    const mk = sv("marker", { id: "wdm", viewBox: "0 0 10 10", refX: "8", refY: "5", markerWidth: "7", markerHeight: "7", orient: "auto" }, sv("defs", {}, svg));
    sv("path", { d: "M1 1 9 5 1 9", class: "fig-mk" }, mk);
    const N = [[50, 60, ...G_DIAGRAMS.wordings.labels[0]], [250, 26, ...G_DIAGRAMS.wordings.labels[1]], [250, 94, ...G_DIAGRAMS.wordings.labels[2]], [450, 60, ...G_DIAGRAMS.wordings.labels[3]]];
    [[1, 0], [2, 0], [3, 1], [3, 2]].forEach(([a, b]) => {
      const [x1, y1] = N[a], [x2, y2] = N[b];
      const L = Math.hypot(x2 - x1, y2 - y1), ux = (x2 - x1) / L, uy = (y2 - y1) / L;
      sv("line", { class: "fig-e", x1: x1 + ux * 14, y1: y1 + uy * 14, x2: x2 - ux * 15, y2: y2 - uy * 15, "marker-end": "url(#wdm)" }, svg);
    });
    N.forEach(([x, y, n, t], k) => {
      sv("circle", { cx: x, cy: y, r: 13, class: "fig-n" + (k === 3 ? " hd" : "") }, svg);
      sv("text", { x, y: y + 4.5, "text-anchor": "middle", class: "fig-bt" + (k === 3 ? " inv" : "") }, svg).textContent = n;
      sv("text", { x, y: y + (k === 1 ? -22 : 32), "text-anchor": "middle", class: "fig-st" }, svg).textContent = t;
    });
    const cap = document.createElement("p");
    cap.style.cssText = "font:400 13px/1.45 var(--sans)!important;color:var(--faint);margin:8px 0 0!important";
    cap.textContent = G_DIAGRAMS.wordings.caption;
    fig.appendChild(cap);
  })();
})();

// Generated by extract-laws.mjs from strange-loops-next at bb1459e: the live Laws page as built
// (sentences, scopes, premises), laws.json, boundaries.json and the vectors the bench runs.
const L_SHAPES = /*data:L_SHAPES*/;
const L_QS = /*data:L_QS*/;
const L_UNLESS = /*data:L_UNLESS*/;
const L_NOPROMISE = /*data:L_NOPROMISE*/;
const L_SIMPL = /*data:L_SIMPL*/;
const L_BOUND = /*data:L_BOUND*/;
const L_VEC = /*data:L_VEC*/;

// The bench's engine: five of the protocol's rules, written small, each with the variants the
// reader can pick. With the protocol's choices it reproduces the vectors' expected answers
// (laws-check.cjs checks this when the prototype is built). The other choices are hypothetical:
// no model stands behind them. Ported from interop/js (loops.mjs, fold.mjs, lens.mjs) at bb1459e.
const LE = (() => {
  /* ---------- bytes ---------- */
  const B32 = /*data:B32*/;
  function b32(bytes) {
    let out = "", bits = 0, value = 0;
    for (const b of bytes) {
      value = ((value << 8) | b) & 0xffff; bits += 8;
      while (bits >= 5) { out += B32[(value >>> (bits - 5)) & 31]; bits -= 5; }
    }
    if (bits > 0) out += B32[(value << (5 - bits)) & 31];
    return out;
  }
  function b32d(text) {
    const out = []; let bits = 0, value = 0;
    for (const c of text) {
      value = ((value << 5) | B32.indexOf(c)) & 0xffff; bits += 5;
      if (bits >= 8) { out.push((value >>> (bits - 8)) & 255); bits -= 8; }
    }
    return Uint8Array.from(out);
  }
  const utf8 = (s) => new TextEncoder().encode(s);
  const K = new Uint32Array([0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2]);
  function sha256(msg) {
    const len = msg.length, n = ((len + 9 + 63) >> 6) << 6, m = new Uint8Array(n);
    m.set(msg); m[len] = 0x80;
    const dv = new DataView(m.buffer);
    dv.setUint32(n - 4, (len * 8) >>> 0); dv.setUint32(n - 8, Math.floor(len / 0x20000000));
    const h = new Uint32Array([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]);
    const w = new Uint32Array(64), r = (x, k) => (x >>> k) | (x << (32 - k));
    for (let o = 0; o < n; o += 64) {
      for (let i = 0; i < 16; i++) w[i] = dv.getUint32(o + i * 4);
      for (let i = 16; i < 64; i++) {
        const s0 = r(w[i - 15], 7) ^ r(w[i - 15], 18) ^ (w[i - 15] >>> 3), s1 = r(w[i - 2], 17) ^ r(w[i - 2], 19) ^ (w[i - 2] >>> 10);
        w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
      }
      let [a, b, c, d, e, f, g, hh] = h;
      for (let i = 0; i < 64; i++) {
        const t1 = (hh + (r(e, 6) ^ r(e, 11) ^ r(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + w[i]) >>> 0;
        const t2 = ((r(a, 2) ^ r(a, 13) ^ r(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) >>> 0;
        hh = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
      }
      h[0] += a; h[1] += b; h[2] += c; h[3] += d; h[4] += e; h[5] += f; h[6] += g; h[7] += hh;
    }
    const out = new Uint8Array(32), ov = new DataView(out.buffer);
    h.forEach((x, i) => ov.setUint32(i * 4, x));
    return out;
  }

  /* ---------- naming a record ---------- */
  // canonical JSON (RFC 8785 for the values these vectors hold). sorted: members by name, or as given.
  function canonical(v, sorted = true) {
    if (v === null || typeof v !== "object") return JSON.stringify(v);
    if (Array.isArray(v)) return "[" + v.map((x) => canonical(x, sorted)).join(",") + "]";
    const ks = Object.keys(v);
    return "{" + (sorted ? ks.sort() : ks).map((k) => JSON.stringify(k) + ":" + canonical(v[k], sorted)).join(",") + "}";
  }
  // rules.sets: "set" sorts and removes repeats; "list" keeps the lists as written.
  function envJson(env, rules) {
    const out = { kind: env.kind, observer: env.observer, emitted: env.emitted };
    if (env.occurred !== undefined) out.occurred = env.occurred;
    for (const k of ["about", "prev", "erases"]) if (env[k] && env[k].length) out[k] = rules.sets === "set" ? [...new Set(env[k])].sort() : env[k].slice();
    if (env.of !== undefined) out.of = env.of;
    if (env.sets !== undefined) out.sets = rules.sets === "set" ? [...new Set(env.sets)].sort() : env.sets.slice();
    return out;
  }
  const cat = (a, b) => { const o = new Uint8Array(a.length + b.length); o.set(a); o.set(b, a.length); return o; };
  const commitOf = (salt, payload, rules) => "h:" + b32(sha256(cat(b32d(salt), utf8(canonical(payload, rules.members === "sorted")))));
  // rules.covers: "commit" hashes the envelope with a commitment to the payload; "payload" hashes
  // the payload itself, so a form without it (erased) hashes the envelope alone.
  function idOf(env, salt, payload, rules) {
    const sorted = rules.members === "sorted", e = envJson(env, rules);
    if (rules.covers === "commit") return "r:" + b32(sha256(utf8(canonical({ commit: commitOf(salt, payload, rules), env: e }, sorted))));
    return "r:" + b32(sha256(utf8(canonical(payload === undefined ? { env: e } : { env: e, payload }, sorted))));
  }
  // The id an erased form carries: the commitment is kept, so the id is the same one.
  function erasedIdOf(env, salt, payload, rules) {
    return rules.covers === "commit" ? idOf(env, salt, payload, rules) : idOf(env, salt, undefined, rules);
  }

  /* ---------- time and content order ---------- */
  const DAYS = /*data:DAYS*/;
  const leap = (y) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  const daySecs = (y, m, d) => { const t = new Date(0); t.setUTCFullYear(y, m - 1, d); return t.getTime() / 1000; };
  function instant(s) {
    const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?Z$/.exec(s);
    if (!m) return null;
    const [y, mo, d, h, mi, se] = m.slice(1, 7).map(Number);
    return [daySecs(y, mo, d) + h * 3600 + mi * 60 + se, m[7] || ""];
  }
  function dateSpan(s) {
    const span = (a, b) => [[a, ""], [b, ""]];
    let m;
    if ((m = /^(\d{2})XX$/.exec(s))) return span(daySecs(100 * m[1], 1, 1), daySecs(100 * m[1] + 100, 1, 1));
    if ((m = /^(\d{3})X$/.exec(s))) return span(daySecs(10 * m[1], 1, 1), daySecs(10 * m[1] + 10, 1, 1));
    if ((m = /^(\d{4})(?:-XX(?:-XX)?)?$/.exec(s))) return span(daySecs(+m[1], 1, 1), daySecs(+m[1] + 1, 1, 1));
    if ((m = /^(\d{4})-(\d{2})(?:-XX)?$/.exec(s))) return span(daySecs(+m[1], +m[2], 1), daySecs(+m[1], +m[2] + 1, 1));
    if ((m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s))) return span(daySecs(+m[1], +m[2], +m[3]), daySecs(+m[1], +m[2], +m[3] + 1));
    return null;
  }
  const point = (s) => (/[?~%]$/.test(s) ? dateSpan(s.slice(0, -1)) : s.includes("T") ? ((t) => t && [t, t])(instant(s)) : dateSpan(s));
  function spanOf(s) {
    const parts = s.split("/"), p = point(parts[0]);
    if (parts.length === 1) return { start: p[0], end: p[1] };
    if (parts[1] === "..") return { start: p[0], end: null };
    return { start: p[0], end: point(parts[1])[1] };
  }
  const before = (a, b) => a[0] < b[0] || (a[0] === b[0] && a[1] < b[1]);
  function spanBefore(a, b) {
    if (before(a.start, b.start)) return true;
    if (before(b.start, a.start)) return false;
    if (a.end === null) return false;
    return b.end === null || before(a.end, b.end);
  }
  function idCmp(a, b) {
    const x = b32d(a.slice(2)), y = b32d(b.slice(2));
    for (let i = 0; i < Math.min(x.length, y.length); i++) if (x[i] !== y[i]) return x[i] < y[i] ? -1 : 1;
    return Math.sign(x.length - y.length);
  }
  const ALL = /*data:ALL*/;
  // Oldest first, over the keys switched on; 0 is a tie.
  function contentOrder(a, b, keys = ALL) {
    if (keys.span) {
      const x = spanOf(a.occurred ?? a.emitted), y = spanOf(b.occurred ?? b.emitted);
      if (spanBefore(x, y)) return -1;
      if (spanBefore(y, x)) return 1;
    }
    if (keys.emitted) {
      const p = instant(a.emitted), q = instant(b.emitted);
      if (before(p, q)) return -1;
      if (before(q, p)) return 1;
    }
    return keys.id ? idCmp(a.id, b.id) : 0;
  }

  /* ---------- counting ---------- */
  // rule: "every" adds one per delivery; "first" only the first time an id arrives;
  // "newer" only when a record was written after every record so far.
  function count(order, rule) {
    if (rule === "every") return order.length;
    if (rule === "first") return new Set(order.map((r) => r.id)).size;
    let n = 0, top = null;
    for (const r of order) { const t = instant(r.emitted); if (!top || before(top, t)) { n++; top = t; } }
    return n;
  }

  /* ---------- picking the current record ---------- */
  // rules.supersede: "any" (a record of the thing that names it in prev, whenever it arrives)
  // or "after" (only one that arrives after it). rules.winner: "newest", "last" or "first".
  // rules.keys: which parts of content order are compared.
  function latestBy(order, rules) {
    const first = new Map(), last = new Map(), recs = [];
    order.forEach((r, i) => { if (!first.has(r.id)) { first.set(r.id, i); recs.push(r); } last.set(r.id, i); });
    const things = new Map();
    for (const r of recs) { const t = r.of ?? r.id; if (!things.has(t)) things.set(t, []); things.get(t).push(r); }
    const out = {};
    for (const [t, rs] of things) {
      const gone = (r) => rs.some((q) => q.prev.includes(r.id) && (rules.supersede === "any" || first.get(q.id) > first.get(r.id)));
      const heads = rs.filter((r) => !gone(r)).sort((a, b) => contentOrder(b, a, rules.keys));
      let tie = false;
      for (let i = 1; i < heads.length; i++) if (contentOrder(heads[i - 1], heads[i], rules.keys) === 0) tie = true;
      let winner = heads[0] || null;
      if (rules.winner === "last") winner = heads.reduce((w, h) => (last.get(h.id) > last.get(w.id) ? h : w), heads[0]);
      if (rules.winner === "first") winner = heads.reduce((w, h) => (first.get(h.id) < first.get(w.id) ? h : w), heads[0]);
      out[t] = { heads: heads.map((h) => h.id), winner: winner && winner.id, tie, named: new Set(rs.flatMap((r) => r.prev)) };
    }
    return out;
  }
  const MODEL_LATEST = { supersede: "any", winner: "newest", keys: ALL };

  /* ---------- reading without payloads ---------- */
  const held = (r) => !r.shown || r.shown === "here";
  // rules.hidden: "supersedes" (a record without its payload still replaces what it names) or
  // "dropped" (it is left out). rules.unread: "count" or "skip".
  function view(order, rules) {
    let rs = order;
    if (rules.hidden === "dropped") rs = rs.filter(held);
    const st = latestBy(rs, MODEL_LATEST);
    const byId = new Map(order.map((r) => [r.id, r]));
    const heads = Object.values(st).flatMap((s) => s.heads).map((id) => byId.get(id)).sort((a, b) => contentOrder(b, a));
    const readable = heads.filter((r) => held(r) && r.fields && Number.isSafeInteger(r.fields.n));
    const value = readable.length ? Math.max(...readable.map((r) => r.fields.n)) : null;
    const missed = heads.length - readable.length;
    return { heads: heads.map((r) => ({ id: r.id, shown: held(r) ? "here" : r.shown })), max: { value, unread: rules.unread === "count" ? missed : 0 }, missed };
  }
  const fullReader = (order) => latestBy(order.map((r) => ({ ...r, shown: undefined })), MODEL_LATEST);

  /* ---------- text and back ---------- */
  const FENCE = /*data:FENCE*/;
  // rules.escape: "both" (a body line that starts with ::: or a backslash gets one in front),
  // "fence" (only one that starts with :::), "none".
  const escapeLine = (line, rule) =>
    (rule === "both" && (line.startsWith("\\") || line.startsWith(FENCE))) || (rule === "fence" && line.startsWith(FENCE)) ? "\\" + line : line;
  const unescape = (line) => (line.startsWith("\\") && (line[1] === "\\" || line.slice(1).startsWith(FENCE)) ? line.slice(1) : line);
  const render = (sections, rule) => sections.flatMap((s) => [`${FENCE} ${s.id}`, ...s.body.map((l) => escapeLine(l, rule)), FENCE]);
  // Sections, or { error } saying where the text stops parsing.
  function parse(lines) {
    const sections = []; let open = null;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (open === null) {
        if (!line.startsWith(FENCE + " ") || line.length === FENCE.length + 1) return { error: line.trim() === "" ? `line ${i + 1} is blank, outside any section` : `line ${i + 1} is outside any section`, line: i };
        open = { id: line.slice(FENCE.length + 1), body: [] };
      } else if (line === FENCE) { sections.push(open); open = null; }
      else if (line.startsWith(FENCE)) return { error: `line ${i + 1} looks like a fence inside a body`, line: i };
      else open.body.push(unescape(line));
    }
    if (open !== null) return { error: `the section ${open.id} is never closed`, line: lines.length - 1 };
    if (new Set(sections.map((s) => s.id)).size !== sections.length) return { error: "a section id is given twice", line: -1 };
    return { sections };
  }
  const same = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);
  // rules.absent: "keep" (left as it was and reported absent), "report" (deleted and reported),
  // "silent" (deleted, and nothing said).
  function edit(base, lines, rules) {
    const p = parse(lines);
    if (p.error) return p;
    const held = new Map(base.map((s) => [s.id, s])), outcomes = [];
    for (const s of p.sections) {
      const was = held.get(s.id);
      if (!was) outcomes.push({ unknown: s.id });
      else if (!same(was.body, s.body)) outcomes.push({ accepted: s.id, body: s.body });
    }
    const seen = new Set(p.sections.map((s) => s.id));
    const missing = base.filter((s) => !seen.has(s.id)).map((s) => s.id);
    if (rules.absent === "keep") missing.forEach((id) => outcomes.push({ absent: id }));
    if (rules.absent === "report") missing.forEach((id) => outcomes.push({ deleted: id }));
    const acc = new Map(outcomes.filter((o) => "accepted" in o).map((o) => [o.accepted, o.body]));
    const applied = base.filter((s) => rules.absent === "keep" || seen.has(s.id)).map((s) => (acc.has(s.id) ? { id: s.id, body: acc.get(s.id) } : s));
    return { sections: p.sections, normalized: render(p.sections, "both"), outcomes, applied };
  }

  return { b32, b32d, sha256, utf8, canonical, envJson, commitOf, idOf, erasedIdOf, contentOrder, count, latestBy, MODEL_LATEST, view, fullReader, held, render, parse, edit, escapeLine, same };
})();

/* ================= Laws ================= */
(() => {
  "use strict";
  const root = document.getElementById("v-laws");
  if (!root) return;
  const $ = (q, r = root) => r.querySelector(q);
  const $$ = (q, r = root) => [...r.querySelectorAll(q)];
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const V = L_VEC;
  const MARK = Object.fromEntries(L_SHAPES.map((s) => [s.k, s.mark]));
  const SNAME = Object.fromEntries(L_SHAPES.map((s) => [s.k, s.name]));
  const ROW = new Map();
  for (const q of L_QS) for (const r of q.rows) for (const n of r.names) ROW.set(n, r);
  const EVID = (id) => `#ev-${id.replace(/^law-/, "")}`;
  const SRC = (f) => `https://github.com/kgruel/strange-loops-next/blob/main/${f}`;
  const shortId = (id) => id.slice(0, 14) + "…";

  /* ---------- records as letters ---------- */
  // Each case letters its records A, B, C in the order they were written (emitted, then id),
  // as the live page does.
  function letters(orders) {
    const seen = new Map();
    for (const o of orders) for (const r of o) if (!seen.has(r.id)) seen.set(r.id, r);
    const rs = [...seen.values()].sort((a, b) => LE.contentOrder(a, b, { emitted: true, id: true }));
    return new Map(rs.map((r, i) => [r.id, String.fromCharCode(65 + i)]));
  }
  const timeOf = (s) => s.slice(11, 19);
  function tile(r, L) {
    const hid = r.shown && r.shown !== "here" ? r.shown : "";
    const prev = r.prev.map((p) => L.get(p) || "?").join("");
    const tip = `${L.get(r.id)}, written ${timeOf(r.emitted)}` + (r.occurred && r.occurred !== r.emitted ? `, about ${r.occurred}` : "") +
      (prev ? `, replaces ${prev.split("").join(" and ")}` : "") + (hid ? `, its payload ${hid}` : "") + (r.fields ? `, n = ${r.fields.n}` : "");
    return `<span class="tl${hid ? " " + hid : ""}" title="${esc(tip)}">${L.get(r.id)}${prev ? `<i aria-hidden="true">←${prev}</i>` : ""}</span>`;
  }
  const tiles = (o, L) => `<span class="tls">${o.map((r) => tile(r, L)).join("")}</span>`;
  const run = (k, body, ans, off) => `<div class="run${off ? " off" : ""}"><span class="rk">${k}</span>${body}<span class="ra">${ans}</span></div>`;
  const runs = (rows, head) => `${head ? `<p class="rhead">${head}</p>` : ""}<div class="runs">${rows.join("")}</div>`;
  const nth = (i) => `Order ${i + 1}`;

  /* ---------- the five rules ---------- */
  const lstate = (st, L) => {
    const s = Object.values(st)[0];
    return `heads ${s.heads.map((h) => L.get(h)).join(" ") || "none"} · winner <b>${s.winner ? L.get(s.winner) : "none"}</b>`;
  };
  const sameState = (a, b) => JSON.stringify(Object.entries(a).map(([t, s]) => [t, [...s.heads].sort(), s.winner]).sort()) ===
    JSON.stringify(Object.entries(b).map(([t, s]) => [t, [...s.heads].sort(), s.winner]).sort());

  const LCASES = [
    { name: "A fork", say: "A and B are two records of one thing. Neither names the other.", orders: V.latest.fork.orders, files: [V.latest.fork.file] },
    { name: "A chain", say: "B replaces A. In the second order, B arrives first.", orders: [...V.latest.chain.orders, ...V.latest.late.orders], files: [V.latest.chain.file, V.latest.late.file] },
    { name: "A merge", say: "B replaces A, and D replaces both B and C.", orders: V.latest.merge.orders, files: [V.latest.merge.file] },
    { name: "One span, two times", say: "A and B claim the same moment, so the time each was written decides.", orders: V.latest.emitted.orders, files: [V.latest.emitted.file] },
    { name: "One span, one time", say: "A and B claim the same moment and were written at the same second. Only the id is left to decide.", orders: V.latest.id.orders, files: [V.latest.id.file] },
    { name: "Four kinds of span", say: "An instant, a month, a span with no end and a year, all of one thing.", orders: V.latest.span.orders, files: [V.latest.span.file] },
  ].map((c) => ({ ...c, L: letters(c.orders) }));
  const RCASE = { name: "Repeats", say: "A and B, with some delivered more than once.", orders: V.latest.repeats.orders, files: [V.latest.repeats.file] };
  RCASE.L = letters(RCASE.orders);

  const VCASES = [
    { name: "A withheld successor", say: "B replaces A. This reader doesn't hold B's payload.", v: V.view.withheld },
    { name: "An erased merge", say: "B replaces A, and D replaces B and C. D's payload was erased.", v: V.view.erased },
    { name: "Two hosts and a max", say: "A holds n = 5 and B holds n = 9, on two hosts. C replaces B, and C's payload is withheld.", v: V.view.max },
  ].map((c) => ({ ...c, orders: c.v.orders, L: letters(c.v.orders), files: [c.v.file] }));

  const lawOut = (name, verdict, why, detail, open) => ({ name, verdict, why, detail, open: open ?? verdict === "broken" });

  const MACHINES = [
    {
      key: "count", tab: "Counting", title: "Counting records",
      gist: "A count adds records up one at a time. The protocol's rule is the plainest there is.",
      clauses: [{ text: "For each record that arrives, the count goes up by one {add}.", opts: { add: [["every", "every time"], ["first", "only the first time its id arrives"], ["newer", "only if it was written after every record so far"]] } }],
      files: [V.count.three.file, V.count.twice.file],
      laws(R) {
        const L = letters(V.count.three.orders), os = V.count.three.orders, ns = os.map((o) => LE.count(o, R.add));
        const ok = ns.every((n) => n === ns[0]);
        const perm = lawOut("count.perm", ok ? "ok" : "broken",
          ok ? `The same count, ${ns[0]}, in all ${os.length} arrival orders.` : `The count now depends on the order: ${ns.join(", ")} for the ${os.length} orders.`,
          runs(os.map((o, i) => run(nth(i), tiles(o, L), `count <b>${ns[i]}</b>`, ns[i] !== ns[0]))));
        const once = ns[0], tw = LE.count(V.count.twice.orders[0], R.add);
        const v = tw === 2 * once ? "ok" : tw === once ? "gone" : "broken";
        const why = v === "ok" ? `Delivered twice, the three records count ${tw}: the count doubles, as the law says.`
          : v === "gone" ? `Delivered twice, they count ${tw}, the same as once. Repeats no longer move this count. The protocol does that before the count instead, on the read path (<a class="lawref" href="#law-input-distinct"><code>input.distinct</code></a>), and keeps the count itself simple.`
            : `Delivered twice, they count ${tw}: neither once nor twice the ${once} that one delivery counts.`;
        const rep = lawOut("count.repeats", v, why,
          runs([run("Once", tiles(os[0], L), `count <b>${once}</b>`), run("Twice", tiles(V.count.twice.orders[0], L), `count <b>${tw}</b>`, v !== "ok")]));
        return [perm, rep];
      },
    },
    {
      key: "current", tab: "Picking the current one", title: "Picking the current record",
      gist: "Every thing has heads, the records nothing newer replaces, and one winner among them.",
      clauses: [
        { text: "A record stops being a head once a record of its thing names it in <code>prev</code>, {supersede}.", opts: { supersede: [["any", "whenever that record arrives"], ["after", "but only if that record arrives after it"]] } },
        { text: "Of the heads, the winner is the one {winner}.", opts: { winner: [["newest", "that is newest by content order"], ["last", "that arrived last"], ["first", "that arrived first"]] } },
        { text: "Content order compares {keys}.", keys: true },
      ],
      files: [...LCASES.flatMap((c) => c.files), ...RCASE.files],
      laws(R) {
        const rules = { supersede: R.supersede, winner: R.winner, keys: R.keys };
        const per = LCASES.map((c) => ({ c, st: c.orders.map((o) => LE.latestBy(o, rules)) }));
        // latest-by.set
        let first = null;
        const setRows = per.map(({ c, st }) => {
          const bad = st.findIndex((s) => !sameState(s, st[0]));
          if (bad >= 0 && !first) first = `${c.name}: ${lstate(st[0], c.L)} in order 1, but ${lstate(st[bad], c.L)} in order ${bad + 1}.`;
          return runs(c.orders.map((o, i) => run(nth(i), tiles(o, c.L), lstate(st[i], c.L), !sameState(st[i], st[0]))), `<b>${c.name}.</b> ${c.say}`);
        });
        const nOrders = per.reduce((a, p) => a + p.st.length, 0);
        const set = lawOut("latest-by.set", first ? "broken" : "ok",
          first || `The same heads and winner in every arrival order, for all ${LCASES.length} cases and ${nOrders} orders.`, setRows.join(""));
        // latest-by.repeats
        const rs = RCASE.orders.map((o) => LE.latestBy(o, rules));
        const rbad = rs.findIndex((s) => !sameState(s, rs[0]));
        const rep = lawOut("latest-by.repeats", rbad < 0 ? "ok" : "broken",
          rbad < 0 ? `Delivering A and B again changes nothing: the same state for all ${rs.length} deliveries.` : `Delivering again moves the state: ${lstate(rs[0], RCASE.L)} once, but ${lstate(rs[rbad], RCASE.L)} in delivery ${rbad + 1}.`,
          runs(RCASE.orders.map((o, i) => run(`Delivery ${i + 1}`, tiles(o, RCASE.L), lstate(rs[i], RCASE.L), rbad >= 0 && !sameState(rs[i], rs[0]))), `<b>${RCASE.name}.</b> ${RCASE.say}`));
        // latest-by.order
        let ofirst = null;
        const ordRows = per.map(({ c, st }) => {
          const byId = new Map(c.orders.flat().map((r) => [r.id, r]));
          return runs(c.orders.map((o, i) => {
            const s = Object.values(st[i])[0], W = s.winner && c.L.get(s.winner);
            const hs = s.heads.map((h) => byId.get(h)), newest = [...hs].sort((a, b) => LE.contentOrder(b, a))[0];
            let fail = "";
            if (s.winner && s.named.has(s.winner)) fail = `the winner, ${W}, is named in <code>prev</code>`;
            else if (s.tie) { const t = hs.filter((h, k) => k && LE.contentOrder(hs[k - 1], h, rules.keys) === 0)[0]; fail = `heads tie under this content order, so arrival picks ${W}`; if (t) fail = `${c.L.get(hs[hs.indexOf(t) - 1].id)} and ${c.L.get(t.id)} tie under this content order, so arrival picks ${W}`; }
            else if (newest && s.winner !== newest.id) fail = `the winner is ${W}, but ${c.L.get(newest.id)} is newer by span, then emitted, then id`;
            if (fail && !ofirst) ofirst = `${c.name}, order ${i + 1}: ${fail}.`;
            return run(nth(i), tiles(o, c.L), fail ? `winner <b>${W || "none"}</b>` : `winner <b>${W}</b>`, !!fail);
          }), `<b>${c.name}.</b> ${c.say}`);
        });
        const ord = lawOut("latest-by.order", ofirst ? "broken" : "ok",
          ofirst || `Every winner is a head nothing names in <code>prev</code>, newer than every other head, with no ties.`, ordRows.join(""));
        return [set, rep, ord];
      },
    },
    {
      key: "withheld", tab: "Reading with less", title: "Reading without every payload",
      gist: "A reader may hold a record's envelope and not its payload. Two rules say what it may still conclude.",
      clauses: [
        { text: "A record whose payload this reader doesn't hold {hidden}.", opts: { hidden: [["supersedes", "still replaces what it names in <code>prev</code>"], ["dropped", "is left out, as if it never arrived"]] } },
        { text: "When the max meets a head whose payload it can't read, it {unread}.", opts: { unread: [["count", "counts that head as unread"], ["skip", "skips it without a word"]] } },
      ],
      files: VCASES.flatMap((c) => c.files),
      laws(R) {
        const desc = (v, L) => v.heads.map((h) => `${L.get(h.id)}${h.shown !== "here" ? `<small> ${h.shown}</small>` : ""}`).join(" ");
        let nf = null, uf = null;
        const nrRows = [], urRows = [];
        for (const c of VCASES) {
          const vs = c.orders.map((o) => LE.view(o, R)), full = c.orders.map((o) => LE.fullReader(o));
          const fullHeads = (i) => Object.values(full[i]).flatMap((s) => s.heads);
          nrRows.push(runs(c.orders.map((o, i) => {
            const got = vs[i].heads.map((h) => h.id).sort(), want = fullHeads(i).slice().sort();
            const off = JSON.stringify(got) !== JSON.stringify(want);
            if (off && !nf) nf = `${c.name}: this reader's heads are ${got.map((g) => c.L.get(g)).join(" ")}, where a reader holding everything has ${want.map((g) => c.L.get(g)).join(" ")}.`;
            return run(nth(i), tiles(o, c.L), `heads ${desc(vs[i], c.L)}`, off);
          }), `<b>${c.name}.</b> ${c.say}`));
          urRows.push(runs(c.orders.map((o, i) => {
            const m = vs[i].max, off = m.unread !== vs[i].missed;
            if (off && !uf) uf = `${c.name}: the max says ${m.value ?? "nothing"} and that it missed nothing, but ${vs[i].missed} of its heads ${vs[i].missed === 1 ? "has" : "have"} no payload here.`;
            return run(nth(i), tiles(o, c.L), `max <b>${m.value ?? "none"}</b> · ${m.unread} unread`, off);
          }), `<b>${c.name}.</b> ${c.say}`));
        }
        return [
          lawOut("view.no-resurrection", nf ? "broken" : "ok", nf || "Every view has the same heads, by id, as a reader holding everything. What was replaced stays replaced.", nrRows.join("")),
          lawOut("result.unread", uf ? "broken" : "ok", uf || "Every max says how many heads it couldn't read. In two hosts, it reads 5 and says C was unread.", urRows.join("")),
        ];
      },
    },
    {
      key: "id", tab: "Naming a record", title: "Naming a record",
      gist: "A record's id is a SHA-256 hash, worked out here as you type. What goes into it, and how it is written, decides what moves it.",
      clauses: [
        { text: "Before the envelope is hashed, <code>about</code>, <code>prev</code>, <code>erases</code> and <code>sets</code> are {sets}.", opts: { sets: [["set", "sorted, with repeats removed"], ["list", "kept just as written"]] } },
        { text: "Every object's members are written {members}.", opts: { members: [["sorted", "in order of their names"], ["given", "in the order they were given"]] } },
        { text: "The id is a hash of the envelope and {covers}.", opts: { covers: [["commit", "a commitment to the payload"], ["payload", "the payload itself"]] } },
      ],
      files: [V.record.sets.file, V.record.members.file, V.record.erasure.file],
      inputs: true,
      laws(R, S) {
        const vs = V.record.sets, abouts = S.raw.map((t) => t.split(",").map((x) => x.trim()).filter(Boolean));
        const envs = vs.envs.map((e, i) => ({ ...e, about: abouts[i] }));
        const ids = envs.map((e) => LE.idOf(e, vs.salt, vs.payloads[0], R));
        const setKey = (xs) => JSON.stringify([...new Set(xs)].sort());
        const sameSet = abouts.every((a) => setKey(a) === setKey(abouts[0]));
        const allSame = ids.every((x) => x === ids[0]);
        const mark = (id, want) => (id === want ? `<span class="vok" title="The id the vector expects">the vector's</span>` : "");
        const setRows = envs.map((e, i) => `<div class="idrow${sameSet && ids[i] !== ids[0] ? " off" : ""}"><label class="idin"><span class="rk">Envelope ${i + 1}</span><input type="text" data-about="${i}" value="${esc(S.raw[i])}" spellcheck="false" autocomplete="off" aria-label="Envelope ${i + 1}: the about list, separated by commas"></label><code class="idv" title="${ids[i]}">${shortId(ids[i])}</code>${mark(ids[i], vs.expect.id)}</div>`).join("");
        const sets = lawOut("record.sets", !sameSet ? "na" : allSame ? "ok" : "broken",
          !sameSet ? "These lists aren't the same set any more, so the law says nothing about them. Their ids differ, as they should."
            : allSame ? `Three spellings of one set, and one id for all three: <code>${shortId(ids[0])}</code>.` : "Three spellings of one set now get different ids, so the same record could be written down three ways.",
          `<p class="rhead"><b>One envelope, three ways.</b> Edit an <code>about</code> list and its id is worked out again. Same payload, same salt.</p><div class="idrows">${setRows}</div>`, true);
        const vm = V.record.members, cs = vm.payloads.map((p) => LE.canonical(p, R.members === "sorted")), cm = vm.payloads.map((p) => LE.commitOf(vm.salt, p, R));
        const mOk = cs[0] === cs[1];
        const mem = lawOut("record.member-order", mOk ? "ok" : "broken",
          mOk ? "Two member orders, one canonical spelling, so one commitment." : "The two member orders now spell the payload two ways, and the commitment to it moves.",
          `<p class="rhead"><b>One payload, its members in two orders.</b></p><div class="idrows">${cs.map((c, i) => `<div class="idrow${!mOk ? " off" : ""}"><span class="rk">Payload ${i + 1}</span><code class="idb">${esc(c)}</code><code class="idv" title="${cm[i]}">${shortId(cm[i])}</code>${mark(cm[i], vm.expect.commit)}</div>`).join("")}</div>`);
        const ve = V.record.erasure, env = ve.envs[0], kept = LE.idOf(env, ve.salt, ve.payloads[0], R), gone = LE.erasedIdOf(env, ve.salt, ve.payloads[0], R);
        const eOk = kept === gone;
        const era = lawOut("record.erasure", eOk ? "ok" : "broken",
          eOk ? "Erasing the payload leaves the commitment, and so the id, where it was." : "The id now covers the words themselves, so erasing them changes it. Nothing that named the record can find it any more.",
          `<p class="rhead"><b>A note, kept and then erased.</b> Its payload: <q>${esc(ve.payloads[0].body)}</q></p><div class="idrows"><div class="idrow"><span class="rk">Kept</span><code class="idv" title="${kept}">${shortId(kept)}</code>${mark(kept, ve.expect.id)}</div><div class="idrow${!eOk ? " off" : ""}"><span class="rk">Erased</span><code class="idv" title="${gone}">${shortId(gone)}</code>${mark(gone, ve.expect.id)}</div></div>`);
        return [sets, mem, era];
      },
    },
    {
      key: "text", tab: "Text and back", title: "Text and back",
      gist: "A thing's sections can be written out as text, edited and read back. Two rules decide what survives the trip.",
      clauses: [
        { text: "When a section is written out, a body line gets a backslash in front {escape}.", opts: { escape: [["both", "if it starts with ::: or a backslash"], ["fence", "only if it starts with :::"], ["none", "never"]] } },
        { text: "A section the edited text leaves out is {absent}.", opts: { absent: [["keep", "left as it was, and reported as absent"], ["report", "deleted, and reported as deleted"], ["silent", "deleted, and nothing is said"]] } },
      ],
      files: [V.lens.round.file, V.lens.escape.file, V.lens.drop.file, V.lens.edit.file],
      own: true,
      laws(R) {
        const show = (l) => `<code class="ln">${l === "" ? "<i>blank</i>" : esc(l).replace(/ /g, "·")}</code>`;
        const secs = (ss) => ss.map((s) => `<code class="ln">${esc(s.id)}</code>`).join(" ");
        // round trip
        const cases = [["The two decisions", V.lens.round.input.base], ["The notes section", V.lens.escape.expect.parsed]];
        let rf = null;
        const rtRows = cases.map(([k, ss]) => {
          const back = LE.parse(LE.render(ss, R.escape));
          const ok = !back.error && JSON.stringify(back.sections) === JSON.stringify(ss);
          const say = back.error ? `doesn't read back: ${back.error}` : ok ? "comes back as written" : `comes back different: ${back.sections.length} section${back.sections.length === 1 ? "" : "s"}`;
          if (!ok && !rf) rf = `${k} ${say}.`;
          return run(k, "", say, !ok);
        });
        const rt = lawOut("lens.round-trip", rf ? "broken" : "ok", rf || "Written out and read back, both cases come back as they were.", runs(rtRows));
        // escaping, a line at a time
        const body = V.lens.escape.expect.parsed[0].body;
        let ef = 0;
        const esRows = body.map((l) => {
          const w = LE.escapeLine(l, R.escape), back = LE.parse(LE.render([{ id: "notes", body: [l] }], R.escape));
          const got = back.error ? null : back.sections[0] ? back.sections[0].body : [];
          const ok = got && got.length === 1 && got[0] === l;
          if (!ok) ef++;
          return `<div class="esrow${ok ? "" : " off"}">${show(l)}<span class="arr" aria-hidden="true">→</span>${show(w)}<span class="arr" aria-hidden="true">→</span>${got === null ? `<span class="ra">reads as a fence</span>` : got.length === 1 ? show(got[0]) : `<span class="ra">${got.length ? got.map(show).join(" ") : "nothing"}</span>`}</div>`;
        });
        const es = lawOut("lens.escaping", ef ? "broken" : "ok",
          ef ? `${ef} of the ${body.length} body lines don't survive: written out, they read back as something else.` : `All ${body.length} awkward body lines survive the trip, backslashes and all.`,
          `<p class="rhead"><b>Awkward lines, one at a time.</b> Each body line, as it is written out, and as it reads back. A dot is a space.</p><div class="eshead"><span>In the body</span><span></span><span>Written out</span><span></span><span>Read back</span></div>${esRows.join("")}`);
        // a dropped section
        const d = V.lens.drop, out = LE.edit(d.input.base, d.input.text, R);
        const cache = out.applied.find((s) => s.id === "decision:cache"), was = d.input.base.find((s) => s.id === "decision:cache");
        const kept = cache && LE.same(cache.body, was.body);
        const said = out.outcomes.map((o) => Object.entries(o).filter(([k]) => k !== "body").map(([k, v]) => `${k} <code>${esc(v)}</code>`).join("")).join(", ") || "nothing";
        const dropRuns = runs([run("The edit", `<span class="tls">${secs(d.input.base.filter((s) => d.input.text.includes("::: " + s.id)))}</span>`, "keeps only decision:auth"), run("Reported", "", said, R.absent === "silent"), run("The state after", `<span class="tls">${secs(out.applied)}</span>`, kept ? "decision:cache as it was" : "decision:cache is gone", !kept)],
          "<b>A section left out.</b> The text keeps decision:auth and drops decision:cache.");
        const ab = lawOut("lens.absence-not-edit", kept ? "ok" : "broken", kept ? "Leaving decision:cache out of the text leaves it alone in the state." : "Leaving decision:cache out of the text deleted it. A section can now be lost by not being in the text.", dropRuns);
        const reported = out.outcomes.some((o) => o.absent === "decision:cache" || o.deleted === "decision:cache");
        const nd = lawOut("lens.nothing-dropped", reported || kept ? "ok" : "broken", reported ? `Every section is accounted for: decision:cache is reported ${R.absent === "keep" ? "absent" : "deleted"}.` : "decision:cache is gone from the state, and nothing says so.", dropRuns);
        // put-get
        const e = V.lens.edit, pg = LE.edit(e.input.base, e.input.text, R);
        const pOk = !pg.error && JSON.stringify(pg.applied) === JSON.stringify(pg.sections);
        const put = lawOut("lens.put-get", pOk ? "ok" : "broken", pOk ? "An edit that keeps both sections applies exactly, under any of these rules: neither touches it." : "An edit that keeps both sections no longer applies exactly.",
          runs([run("The edit", "", "decision:auth becomes <q>Use passkeys.</q>"), run("The state after", `<span class="tls">${secs(pg.applied)}</span>`, pOk ? "exactly the edit" : "not the edit", !pOk)]));
        return [rt, es, ab, nd, put];
      },
    },
  ];
  const PROTO = /*data:PROTO*/;
  const BENCH = new Map(MACHINES.flatMap((m) => m.laws(PROTO[m.key], { raw: V.record.sets.envs.map((e) => e.about.join(", ")) }).map((l) => [l.name, m.key])));

  /* ---------- the bench ---------- */
  const state = {
    m: "count",
    R: JSON.parse(JSON.stringify(PROTO)),
    S: { raw: V.record.sets.envs.map((e) => e.about.join(", ")) },
    open: {}, last: {},
  };
  const changed = (k) => JSON.stringify(state.R[k]) !== JSON.stringify(PROTO[k]);
  const optLabel = (m, key, v) => { for (const c of m.clauses) if (c.opts && c.opts[key]) return c.opts[key].find((o) => o[0] === v)[1]; return v; };
  const KEYNAMES = /*data:KEYNAMES*/;
  const ASK = /*data:ASK*/;

  function clauseHTML(m, c, i) {
    const R = state.R[m.key], P = PROTO[m.key];
    let html = c.text.replace(/\{(\w+)\}/g, (all, key) => {
      if (key === "keys") return KEYNAMES.map(([k, l], j) => `${j ? ", then " : ""}<button type="button" class="ktog${R.keys[k] ? "" : " off"}" data-key="${k}" aria-pressed="${R.keys[k]}" aria-label="Compare ${l.replace(/<[^>]+>/g, "")}: ${R.keys[k] ? "on" : "off"}">${l}</button>`).join("");
      const opts = c.opts[key];
      const cur = opts.find((o) => o[0] === R[key])[1];
      return `<span class="pick${R[key] !== P[key] ? " moved" : ""}" role="button" tabindex="0" aria-haspopup="menu" aria-expanded="false" data-key="${key}" aria-label="${esc(ASK[key] + ": " + cur.replace(/<[^>]+>/g, ""))}">${cur}</span>`;
    });
    let was = "";
    if (c.keys) { const off = KEYNAMES.filter(([k]) => !R.keys[k]); if (off.length) was = `The protocol compares all three. Press one to put it back.`; }
    else for (const key of Object.keys(c.opts)) if (R[key] !== P[key]) was = `The protocol: ${optLabel(m, key, P[key])}.`;
    return `<li class="cl${was ? " moved" : ""}"><span class="cn">${i + 1}</span><p>${html}</p>${was ? `<p class="was">${was}</p>` : ""}</li>`;
  }

  function lawHTML(l) {
    const r = ROW.get(l.name);
    const V2 = { ok: "Holds", broken: "Broken", gone: "No longer true", na: "Doesn't apply" }[l.verdict];
    const open = state.open[l.name] ?? l.open;
    return `<li class="bl ${l.verdict}" data-law="${l.name}"><div class="bltop"><span class="blm" aria-hidden="true" title="${SNAME[r.shape]}">${MARK[r.shape]}</span><p class="bls">${r.s}</p><span class="blv">${V2}</span></div>` +
      `<p class="blw">${l.why}</p><details class="blr"${open ? " open" : ""}><summary><span>${l.verdict === "broken" ? "Where it breaks" : "The cases"}</span><code>${esc(l.name)}</code></summary><div class="blrb">${l.detail}</div></details></li>`;
  }

  function drawTabs() {
    $("#btabs").innerHTML = MACHINES.map((m) => {
      const broken = state.last[m.key] || 0;
      return `<button type="button" role="tab" id="bt-${m.key}" aria-controls="bpanel" aria-selected="${m.key === state.m}" tabindex="${m.key === state.m ? 0 : -1}" data-m="${m.key}"><span>${m.tab}</span>${broken ? `<span class="bb" aria-label="${broken} broken">${broken}</span>` : changed(m.key) ? `<span class="bb same" aria-label="rule changed">·</span>` : ""}</button>`;
    }).join("");
  }

  function results(m) { return m.laws(state.R[m.key], state.S); }
  function tally() { for (const m of MACHINES) state.last[m.key] = results(m).filter((l) => l.verdict === "broken").length; }

  function draw(keepFocus) {
    const m = MACHINES.find((x) => x.key === state.m);
    const ls = results(m);
    const broken = ls.filter((l) => l.verdict === "broken").length;
    state.last[m.key] = broken;
    const moved = changed(m.key);
    const n = ls.length, gone = ls.filter((l) => l.verdict === "gone").length, na = ls.filter((l) => l.verdict === "na").length;
    const all = n === 2 ? "both laws hold" : `all ${n} laws hold`;
    const sum = broken ? (broken === n ? (n === 2 ? "Both laws are broken." : `All ${n} laws are broken.`) : `${broken} of the ${n} laws ${broken === 1 ? "is" : "are"} broken.`)
      : gone || na ? `Nothing is broken.${gone ? ` ${gone === 1 ? "One law no longer describes" : gone + " laws no longer describe"} the rule.` : ""}${na ? ` ${na === 1 ? "One law doesn't" : na + " laws don't"} apply to what you typed.` : ""}`
      : moved ? `Changed, and ${all} still.` : `With the protocol's rule${m.clauses.length > 1 ? "s" : ""}, ${all}.`;
    const prevVerdicts = Object.fromEntries($$(".bl", $("#bpanel")).map((e) => [e.dataset.law, e.className]));
    $("#bpanel").setAttribute("aria-labelledby", "bt-" + m.key);
    $("#bpanel").innerHTML =
      `<div class="bgrid"><div class="brule"><div class="brh"><h3>${m.title}</h3><p>${m.gist}</p></div>` +
      `<p class="lbl">${moved ? "The rule, as you've changed it" : "The rule, as the protocol writes it"}</p><ol class="cls">${m.clauses.map((c, i) => clauseHTML(m, c, i)).join("")}</ol>` +
      `<div class="bact"><button type="button" class="ibtn" id="breset"${moved ? "" : " disabled"}>Put the protocol's rule back</button></div>` +
      `<p class="bsrc">Test vectors from ${m.files.filter((f, i, a) => a.indexOf(f) === i).map((f) => `<a href="${SRC(f)}">${esc(f.replace(/^vectors\//, ""))}</a>`).join(", ")}.</p></div>` +
      `<div class="blaws"><p class="bsum${broken ? " bad" : ""}" aria-live="polite">${sum}</p><ol class="bls-list">${ls.map(lawHTML).join("")}</ol>${m.own ? ownHTML() : ""}</div></div>`;
    for (const el of $$(".bl", $("#bpanel"))) if (prevVerdicts[el.dataset.law] && prevVerdicts[el.dataset.law] !== el.className) { el.classList.add("flip"); setTimeout(() => el.classList.remove("flip"), 900); }
    drawTabs();
    if (keepFocus) { const f = $(keepFocus, $("#bpanel")); if (f) { f.focus(); if (f.setSelectionRange && f.value != null && f.type === "text") f.setSelectionRange(f.value.length, f.value.length); } }
    if (m.own) wireOwn();
  }

  /* ---------- your own text (like step 9 of the walk) ---------- */
  let ownText = null;
  function ownHTML() {
    const R = state.R.text;
    if (ownText === null) ownText = LE.render(V.lens.round.input.base, R.escape).join("\n");
    return `<div class="own"><p class="lbl">Try your own edit</p><p class="ownp">The two decisions, written out with the rule as it stands. Change a body, delete a section or add one, then read it back.</p>` +
      `<textarea id="owntext" rows="8" spellcheck="false" aria-label="The written-out sections, which you can edit">${esc(ownText)}</textarea>` +
      `<div class="lensbar"><button type="button" class="ibtn solid" id="ownapply">Read it back</button><button type="button" class="ibtn ghost" id="ownreset">Start again</button></div><div class="ownout" id="ownout" aria-live="polite"></div></div>`;
  }
  function wireOwn() {
    const ta = $("#owntext");
    ta.addEventListener("input", () => (ownText = ta.value));
    $("#ownreset").addEventListener("click", () => { ownText = LE.render(V.lens.round.input.base, state.R.text.escape).join("\n"); ta.value = ownText; $("#ownout").innerHTML = ""; });
    $("#ownapply").addEventListener("click", () => {
      const base = V.lens.round.input.base, out = LE.edit(base, ta.value.replace(/\r/g, "").replace(/\n$/, "").split("\n"), state.R.text);
      if (out.error) { $("#ownout").innerHTML = `<p class="oerr">It doesn't read back: ${esc(out.error)}. Nothing is applied.</p>`; return; }
      const said = out.outcomes.length ? out.outcomes.map((o) => { const [k, v] = Object.entries(o)[0]; return `<li><b>${k}</b> <code>${esc(v)}</code>${o.body ? `<span class="ob">${esc(o.body.join("\n"))}</span>` : ""}</li>`; }).join("") : "<li>Nothing changed, so nothing is applied.</li>";
      $("#ownout").innerHTML = `<p class="lbl">What it says</p><ul class="osaid">${said}</ul><p class="lbl">The state after</p><div class="ostate">${out.applied.map((s) => `<div><code>${esc(s.id)}</code><span class="ob">${esc(s.body.join("\n")) || "<i>empty</i>"}</span></div>`).join("") || "<p>No sections are left.</p>"}</div>`;
    });
  }

  /* ---------- the choice menu ---------- */
  const menu = document.createElement("div");
  menu.className = "bmenu"; menu.setAttribute("role", "menu"); menu.hidden = true;
  root.appendChild(menu);
  let menuFor = null;
  function closeMenu(focusChip) {
    if (!menuFor) return;
    const chip = $(`.pick[data-key="${menuFor}"]`, $("#bpanel"));
    menu.hidden = true; menuFor = null;
    if (chip) { chip.setAttribute("aria-expanded", "false"); if (focusChip) chip.focus(); }
  }
  function openMenu(chip) {
    const key = chip.dataset.key, m = MACHINES.find((x) => x.key === state.m);
    const c = m.clauses.find((x) => x.opts && x.opts[key]), P = PROTO[m.key][key], R = state.R[m.key][key];
    menu.setAttribute("aria-label", ASK[key]);
    menu.innerHTML = c.opts[key].map(([v, l]) => `<button type="button" role="menuitemradio" aria-checked="${v === R}" data-v="${v}" tabindex="-1"><span>${l}</span>${v === P ? `<span class="mp">the protocol</span>` : ""}</button>`).join("");
    menu.hidden = false; menuFor = key;
    chip.setAttribute("aria-expanded", "true");
    const cr = chip.getClientRects(), rs = cr.length ? cr : [chip.getBoundingClientRect()], r = rs[rs.length - 1], mw = menu.offsetWidth, mh = menu.offsetHeight;
    let x = Math.min(r.left, innerWidth - mw - 12), y = r.bottom + 6;
    if (y + mh > innerHeight - 8) y = Math.max(8, rs[0].top - mh - 6);
    menu.style.left = Math.max(12, x) + "px"; menu.style.top = y + "px";
    (menu.querySelector('[aria-checked="true"]') || menu.firstChild).focus();
  }
  function choose(v) {
    const key = menuFor;
    closeMenu(false);
    state.R[state.m][key] = v;
    if (state.m === "text" && key === "escape") ownText = null;
    draw(`.pick[data-key="${key}"]`);
  }
  menu.addEventListener("click", (e) => { const b = e.target.closest("button[data-v]"); if (b) choose(b.dataset.v); });
  menu.addEventListener("keydown", (e) => {
    const items = [...menu.querySelectorAll("button")], i = items.indexOf(document.activeElement);
    if (e.key === "Escape") { e.preventDefault(); closeMenu(true); }
    else if (e.key === "Tab") closeMenu(false);
    else if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); items[(i + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length].focus(); }
    else if (e.key === "Home" || e.key === "End") { e.preventDefault(); items[e.key === "Home" ? 0 : items.length - 1].focus(); }
  });
  document.addEventListener("click", (e) => { if (menuFor && !e.target.closest(".bmenu") && !e.target.closest(".pick")) closeMenu(false); });
  addEventListener("scroll", () => closeMenu(false), { passive: true });
  addEventListener("resize", () => closeMenu(false));
  $("#bpanel").addEventListener("keydown", (e) => {
    const chip = e.target.closest(".pick");
    if (chip && (e.key === "Enter" || e.key === " " || e.key === "ArrowDown")) { e.preventDefault(); openMenu(chip); }
  });
  $("#bpanel").addEventListener("click", (e) => {
    const chip = e.target.closest(".pick");
    if (chip) { if (menuFor === chip.dataset.key) closeMenu(true); else { closeMenu(false); openMenu(chip); } return; }
    const k = e.target.closest(".ktog");
    if (k) { const R = state.R.current; R.keys[k.dataset.key] = !R.keys[k.dataset.key]; draw(`.ktog[data-key="${k.dataset.key}"]`); return; }
    if (e.target.closest("#breset")) {
      state.R[state.m] = JSON.parse(JSON.stringify(PROTO[state.m]));
      if (state.m === "id") state.S.raw = V.record.sets.envs.map((x) => x.about.join(", "));
      if (state.m === "text") ownText = null;
      state.open = {};
      draw(); $(".cls .pick, .cls .ktog", $("#bpanel"))?.focus();
    }
  });
  $("#bpanel").addEventListener("click", (e) => { const s = e.target.closest(".blr > summary"); if (s) state.open[s.closest(".bl").dataset.law] = !s.parentNode.open; });
  $("#bpanel").addEventListener("input", (e) => {
    const inp = e.target.closest("input[data-about]");
    if (!inp) return;
    state.S.raw[+inp.dataset.about] = inp.value;
    const pos = inp.selectionStart;
    draw(`input[data-about="${inp.dataset.about}"]`);
    const again = $(`input[data-about="${inp.dataset.about}"]`, $("#bpanel"));
    if (again && pos != null) again.setSelectionRange(pos, pos);
  });
  function selectMachine(k, focus) {
    closeMenu(false);
    state.m = k; draw();
    if (focus) $("#bt-" + k).focus();
  }
  $("#btabs").addEventListener("click", (e) => { const b = e.target.closest("button[data-m]"); if (b) selectMachine(b.dataset.m, true); });
  $("#btabs").addEventListener("keydown", (e) => {
    const i = MACHINES.findIndex((m) => m.key === state.m);
    const j = e.key === "ArrowRight" ? i + 1 : e.key === "ArrowLeft" ? i - 1 : e.key === "Home" ? 0 : e.key === "End" ? MACHINES.length - 1 : null;
    if (j === null) return;
    e.preventDefault();
    selectMachine(MACHINES[(j + MACHINES.length) % MACHINES.length].key, true);
  });
  tally();
  draw();

  /* ---------- six shapes ---------- */
  // The live notes are terse, and one is wrong ("Most laws are this one": Exactness has more). Said plainly here.
  const GIST = /*data:GIST*/;
  L_SHAPES.forEach((s) => { if (GIST[s.k]) s.gist = GIST[s.k]; });
  $("#lshapes").innerHTML = L_SHAPES.map((s) => `<li><button type="button" data-shape="${s.k}" aria-label="Show the ${s.n} ${s.name.toLowerCase()} laws"><span class="smk" aria-hidden="true">${s.mark}</span><span class="snm">${s.name}</span><span class="sct">${s.n}</span><span class="sgs">${s.gist}</span></button></li>`).join("");
  $("#lshapes").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-shape]");
    if (!b) return;
    setShape(b.dataset.shape);
    document.getElementById("every-law").scrollIntoView({ block: "start" });
  });

  /* ---------- premises ---------- */
  const slug = (s) => s.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  $("#prem").innerHTML = L_BOUND.map((b) => {
    const r = ROW.get(b.law);
    return `<li class="pc" id="prem-${slug(b.law)}"><div class="pch"><a class="pcl" href="#${r.id}"><span aria-hidden="true">${MARK[r.shape]}</span><code>${esc(b.law)}</code></a><p class="pcs">${r.s}</p></div>` +
      `<p class="pcp"><span class="holds">Holds when</span> ${esc(b.premise)}.</p><p class="pci">${esc(b.input[0].toUpperCase() + b.input.slice(1))}.</p>` +
      `<div class="pcb"><button type="button" class="switch" aria-pressed="false"><span class="knob" aria-hidden="true"></span><span>Remove the premise</span></button>` +
      `<dl class="pcd" aria-live="polite"><div><dt>Given</dt><dd data-g>${esc(b.holds.given)}</dd></div><div><dt>The model's answer</dt><dd data-a>${esc(b.holds.answer)}</dd></div></dl></div></li>`;
  }).join("");
  $("#prem").addEventListener("click", (e) => {
    const sw = e.target.closest(".switch");
    if (!sw) return;
    const li = sw.closest(".pc"), b = L_BOUND[[...li.parentNode.children].indexOf(li)];
    const on = sw.getAttribute("aria-pressed") !== "true";
    sw.setAttribute("aria-pressed", on);
    li.classList.toggle("gone", on);
    const c = on ? b.removed : b.holds;
    $("[data-g]", li).textContent = c.given;
    $("[data-a]", li).textContent = c.answer;
  });

  /* ---------- every law ---------- */
  $("#lunless").textContent = L_UNLESS;
  const total = L_QS.reduce((a, q) => a + q.rows.length, 0);
  const PREM = new Set(L_BOUND.map((b) => b.law));
  $("#lqs").innerHTML = L_QS.map((q, i) => `<section class="lq" id="q-${q.k}" aria-labelledby="h-q-${q.k}"><div class="lqside"><p class="lqk">Question ${i + 1} of ${L_QS.length}</p><h3 id="h-q-${q.k}">${esc(q.q)}</h3>` +
    `<p class="lqt">${q.rows.length} laws${Object.entries(q.tally).sort((a, b) => b[1] - a[1]).map(([s, n]) => `<span><span class="mk" aria-hidden="true">${MARK[s]}</span>${SNAME[s]} ${n}</span>`).join("")}</p></div>` +
    `<div class="lqstack">${q.note ? `<p class="lqnote">${q.note}</p>` : ""}<ol class="lrowsl">${q.rows.map((r) => {
      const bench = r.names.map((n) => BENCH.get(n)).find(Boolean), prem = r.names.find((n) => PREM.has(n));
      const text = (r.s + " " + (r.scope || "") + " " + r.names.join(" ")).replace(/<[^>]+>/g, "").toLowerCase();
      return `<li class="lrow" id="${r.id}" data-shape="${r.shape}" data-text="${esc(text)}"><p class="lrs">${r.s}</p>${r.scope ? `<p class="lrsc">${r.scope}</p>` : ""}` +
        `<p class="lrf"><span class="lrsh"><span class="mk" aria-hidden="true">${MARK[r.shape]}</span>${SNAME[r.shape]}</span><code>${esc(r.names.join(", "))}</code><span class="lrgo">` +
        `${bench ? `<button type="button" class="lrb" data-m="${bench}">Break it</button>` : ""}${prem ? `<a href="#prem-${slug(prem)}">Without its premise</a>` : ""}<a href="${EVID(r.id)}">Evidence</a></span></p></li>`;
    }).join("")}</ol></div></section>`).join("");
  $("#lqidx").innerHTML = L_QS.map((q, i) => `<li><a href="#q-${q.k}"><span class="qn">${i + 1}</span><span class="qq">${esc(q.q)}</span><span class="qc" data-qc="${q.k}">${q.rows.length}</span></a></li>`).join("");
  $("#lchips").innerHTML = `<button type="button" aria-pressed="true" data-shape="">All</button>` + L_SHAPES.map((s) => `<button type="button" aria-pressed="false" data-shape="${s.k}"><span class="mk" aria-hidden="true">${s.mark}</span>${s.name}</button>`).join("");
  let shape = "";
  function filter() {
    const words = $("#lq").value.toLowerCase().split(/\s+/).filter(Boolean);
    let shown = 0;
    for (const sec of $$(".lq", $("#lqs"))) {
      let n = 0;
      for (const li of $$(".lrow", sec)) {
        const hit = (!shape || li.dataset.shape === shape) && words.every((w) => li.dataset.text.includes(w));
        li.hidden = !hit; if (hit) n++;
      }
      sec.hidden = n === 0; shown += n;
      $(`[data-qc="${sec.id.slice(2)}"]`).textContent = n;
      $(`[data-qc="${sec.id.slice(2)}"]`).closest("li").classList.toggle("none", n === 0);
    }
    $("#lcount").textContent = shown === total ? `${total} laws` : `${shown} of ${total} laws`;
    $("#lnone").hidden = shown > 0;
  }
  function setShape(k) {
    shape = k;
    $$("#lchips button").forEach((b) => b.setAttribute("aria-pressed", b.dataset.shape === k ? "true" : "false"));
    filter();
  }
  $("#lchips").addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) setShape(b.dataset.shape); });
  $("#lq").addEventListener("input", filter);
  function breakLaw(m, name) {
    selectMachine(m);
    document.getElementById("break").scrollIntoView({ block: "start" });
    const target = $(`.bl[data-law="${CSS.escape(name)}"]`, $("#bpanel"));
    if (target) { target.classList.add("ping"); setTimeout(() => target.classList.remove("ping"), 1600); }
    $("#bt-" + m).focus({ preventScroll: true });
  }
  $("#lqs").addEventListener("click", (e) => {
    const b = e.target.closest(".lrb");
    if (!b) return;
    breakLaw(b.dataset.m, b.closest(".lrow").querySelector("code").textContent.split(", ").find((n) => BENCH.has(n)));
  });
  // The Evidence page opens the bench at a law: the address moves first, so this view is showing.
  window.SL_BENCH = BENCH;
  window.slBreak = (m, name) => {
    if (location.hash !== "#break") location.hash = "break";
    setTimeout(() => breakLaw(m, name), 40);
  };
  filter();

  /* ---------- where the guarantees stop ---------- */
  $("#lnopromise").innerHTML = L_NOPROMISE.map((r) => `<div><dt>${r.k}</dt><dd>${r.v}</dd></div>`).join("");
  $("#lsimpl").innerHTML = L_SIMPL.map((s) => `<li>${s}</li>`).join("");
})();

// Generated by extract-evidence.mjs from strange-loops-next at bb1459e, through the live page's
// own joins (design/laws/join.mjs) and map layout (design/evidence/layout.mjs).
const E_REPO = /*data:E_REPO*/;
const E_LAYERS = /*data:E_LAYERS*/;
const E_SHAPES = /*data:E_SHAPES*/;
const E_IMPL = /*data:E_IMPL*/;
const E_NOT = /*data:E_NOT*/;
const E_COUNTS = /*data:E_COUNTS*/;
const E_T = /*data:E_T*/;
const E_LAWS = /*data:E_LAWS*/;
const E_MAP = /*data:E_MAP*/;

/* The Evidence view: one law followed from its sentence to the code that runs it, the map
   of which proofs rest on which, and the laws with the least behind them. Everything shown
   comes from evidence-data.js, joined by the live page's own build. */
(() => {
  const view = document.getElementById("v-evidence");
  if (!view) return;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const plural = (n, one, many = one + "s") => `${n} ${n === 1 ? one : many}`;
  const text = (h) => String(h).replace(/<[^>]+>/g, "").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const MARK = Object.fromEntries(L_SHAPES.map((s) => [s.k, s.mark]));
  const QOF = Object.fromEntries(L_QS.map((q) => [q.k, q.q]));
  const GROUND_UP = [...E_LAYERS].reverse();
  const LAWS = GROUND_UP.flatMap((ly) => E_LAWS.filter((l) => l.ly === ly));
  const BY = new Map(LAWS.map((l) => [l.k, l]));
  const BYID = new Map(LAWS.map((l) => [`ev-${l.s}`, l]));
  const idOf = (l) => `ev-${l.s}`;
  const filesOf = (l) => [...l.ci, ...l.ex];
  const vecUrl = (p) => `${E_REPO}/vectors/${p}.json`;
  const jsIdx = E_IMPL.findIndex((i) => i.checker);
  const IMPL_NAME = E_IMPL.map((i) => ({ "the model": "The model", "the JS implementation": "JavaScript", "the Rust implementation": "Rust" })[i.name] || i.name);

  /* ---------- the chain, counted ---------- */
  $("#echain").innerHTML = [
    [E_COUNTS.laws, "laws", "Sentences on the Laws page, each one a row of <code>protocol/laws.md</code>."],
    [E_COUNTS.theorems, "theorems", "Named by those rows, and every one found in the proofs Lean checked."],
    [E_COUNTS.vectors, "test vectors", "Files the rows cite, each one an input and its exact answer."],
    [E_COUNTS.impls, "implementations", "The model works out each answer. JavaScript and Rust check theirs against it."],
  ].map(([n, w, l], i) => `<li style="--i:${i}"><span class="ecn">${n}</span><span class="ecw">${w}</span><span class="ecl">${l}</span></li>`).join("");

  /* ---------- the gaps ---------- */
  const LENS = [
    { k: "all", t: "Every law", say: "Every law, from the ground up. Pick a gap above to see only the laws it leaves out.", has: () => true },
    { k: "novec", t: "No vector file of its own", col: "v", has: (l) => filesOf(l).length === 0,
      say: "No vector file cites or names these laws. Each is pinned by its proof alone, or by a whole family of vectors, as <code>protocol/laws.md</code> says in its own words." },
    { k: "one", t: "One vector file", col: "v", has: (l) => filesOf(l).length === 1,
      say: "A single vector pins each of these laws. That is one input and one answer: the law is pinned at one point." },
    { k: "nojs", t: "Not run by JavaScript", col: "js", has: (l) => filesOf(l).length > 0 && !(l.ru[jsIdx] > 0),
      say: "These laws have vectors, and JavaScript runs none of them. All of them are tick vectors, which JavaScript doesn't run (W3 on the Decisions page). The model and Rust run every one." },
    { k: "differ", t: "The two lists differ", col: "a", has: (l) => l.un.length > 0 || l.ex.length > 0,
      say: "<code>protocol/laws.md</code> cites a set of vectors for each law, and each vector names the laws it pins. For these laws the two lists differ. − counts files cited that don't name the law; + counts files naming it that aren't cited." },
    { k: "bc", t: "Held by construction", col: "t", has: (l) => !l.th.length && l.bc,
      say: "No theorem names these laws. They hold because of how the code is built, and their vectors pin them." },
  ];
  LENS.forEach((x) => { x.n = LAWS.filter(x.has).length; });
  const proved = LAWS.filter((l) => l.th.length).length, built = LAWS.filter((l) => !l.th.length && l.bc).length;
  $("#ethin-sum").innerHTML = `Lean has checked a proof of ${proved} laws, and ${built} hold by construction. The model and Rust run every one of these laws' vectors. A law in a gap here may well hold; it just has less behind it, and that is where to add evidence first.`;
  $("#elens").innerHTML = LENS.map((x) => `<button type="button" data-k="${x.k}" aria-pressed="${x.k === "all"}"><span class="eln">${x.n}</span><span class="elt">${x.t}</span></button>`).join("");

  const dash = '<span class="ez" aria-label="none">–</span>';
  const agreeCell = (l) => {
    if (!filesOf(l).length) return dash;
    if (!l.un.length && !l.ex.length) return '<span class="eok">agree</span>';
    const parts = [l.un.length ? `−${l.un.length}` : "", l.ex.length ? `+${l.ex.length}` : ""].filter(Boolean).join(" ");
    const said = [l.un.length ? `${l.un.length} cited don't name it` : "", l.ex.length ? `${l.ex.length} naming it aren't cited` : ""].filter(Boolean).join(", ");
    return `<span class="eoff" aria-hidden="true">${parts}</span><span class="sro">${said}</span>`;
  };
  const jsCell = (l) => !filesOf(l).length ? dash : l.ru[jsIdx] > 0 ? '<span class="eok">runs</span>' : '<span class="eoff">none</span>';
  $("#ecov-b").innerHTML = GROUND_UP.map((ly) => {
    const ls = LAWS.filter((l) => l.ly === ly);
    if (!ls.length) return "";
    return `<tr class="eband" data-ly="${ly}"><th scope="rowgroup" colspan="8"><span>${ly}</span> <span class="ebn" data-bn="${ly}">${plural(ls.length, "law")}</span></th></tr>` +
      ls.map((l) => `<tr data-k="${esc(l.k)}" data-ly="${ly}"><th scope="row"><a href="#${idOf(l)}"><code>${esc(l.k).replace(/([.-])/g, "$1<wbr>")}</code></a></th>` +
        `<td class="esh"><span class="mk" aria-hidden="true">${MARK[l.sh]}</span>${E_SHAPES[l.sh]}</td>` +
        `<td data-c="t">${l.th.length ? l.th.length : l.bc ? '<span class="eoff">by construction</span>' : dash}</td>` +
        `<td data-c="v">${filesOf(l).length || dash}</td><td data-c="a">${agreeCell(l)}</td><td data-c="js">${jsCell(l)}</td>` +
        `<td>${l.ro.length || dash}</td><td>${l.ca.length || dash}</td></tr>`).join("");
  }).join("");
  let lens = LENS[0];
  function setLens(k) {
    lens = LENS.find((x) => x.k === k) || LENS[0];
    $$("#elens button").forEach((b) => b.setAttribute("aria-pressed", b.dataset.k === lens.k ? "true" : "false"));
    $("#elens-say").innerHTML = `<b>${plural(lens.n, "law")}.</b> ${lens.say}`;
    const shown = {};
    $$("#ecov-b tr[data-k]").forEach((tr) => {
      const on = lens.has(BY.get(tr.dataset.k));
      tr.hidden = !on;
      if (on) shown[tr.dataset.ly] = (shown[tr.dataset.ly] || 0) + 1;
      $$("[data-c]", tr).forEach((td) => td.classList.toggle("hot", lens.col === td.dataset.c));
    });
    $$("#ecov-b tr.eband").forEach((tr) => {
      const n = shown[tr.dataset.ly] || 0;
      tr.hidden = n === 0;
      $(`[data-bn]`, tr).textContent = plural(n, "law");
    });
  }
  $("#elens").addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) setLens(b.dataset.k); });
  setLens("all");

  /* ---------- the index ---------- */
  const TRY = /*data:TRY*/;
  $("#etry").innerHTML = `<span class="etry-l">Try</span> ` + TRY.filter(([k]) => BY.has(k)).map(([k, why]) => `<a href="#${idOf(BY.get(k))}" title="${esc(why)}"><code>${esc(k)}</code></a>`).join(" ");
  $("#eidx").innerHTML = GROUND_UP.map((ly) => {
    const ls = LAWS.filter((l) => l.ly === ly);
    if (!ls.length) return "";
    return `<li class="eig" data-ly="${ly}"><p class="eigh">${ly} <span>${ls.length}</span></p><ol>${ls.map((l) => {
      const find = [l.k, ...l.n, text(l.sen), l.sh].join(" ").toLowerCase();
      return `<li><a href="#${idOf(l)}" data-k="${esc(l.k)}" data-find="${esc(find)}"><span class="mk" aria-hidden="true">${MARK[l.sh]}</span><code>${esc(l.k)}</code></a></li>`;
    }).join("")}</ol></li>`;
  }).join("");
  const idx = $("#eidx");
  $("#eq").addEventListener("input", () => {
    const words = $("#eq").value.toLowerCase().split(/\s+/).filter(Boolean);
    let n = 0;
    $$(".eig", idx).forEach((g) => {
      let m = 0;
      $$("a[data-k]", g).forEach((a) => { const hit = words.every((w) => a.dataset.find.includes(w)); a.parentElement.hidden = !hit; if (hit) m++; });
      g.hidden = m === 0; n += m;
    });
    $("#enone").hidden = n > 0;
  });

  /* ---------- one law, followed ---------- */
  const lawLink = (k) => { const l = BY.get(k); return l ? `<a class="elaw" href="#${idOf(l)}"><code>${esc(k)}</code></a>` : `<code>${esc(k)}</code>`; };
  const fileList = (ps, cls = "") => {
    const cut = ps.length > 10 ? 8 : ps.length;
    const li = (p) => `<li><a href="${vecUrl(p)}"><code>${esc(p)}</code></a></li>`;
    return `<ul class="evf ${cls}">${ps.slice(0, cut).map(li).join("")}</ul>` +
      (ps.length > cut ? `<details class="emore"><summary>Show the other ${ps.length - cut}</summary><ul class="evf ${cls}">${ps.slice(cut).map(li).join("")}</ul></details>` : "");
  };
  const benchOf = (l) => { const B = window.SL_BENCH; if (!B) return null; const name = l.n.find((n) => B.has(n)); return name ? [B.get(name), name] : null; };

  function trace(l) {
    const i = LAWS.indexOf(l), prev = LAWS[i - 1], next = LAWS[i + 1];
    const files = filesOf(l), both = l.ci.filter((p) => !l.un.includes(p));
    const bench = benchOf(l);
    const links = [`<a href="#law-${l.s}">Read it among its question</a>`,
      bench ? `<button type="button" class="lrb ebreak" data-m="${bench[0]}" data-name="${esc(bench[1])}">Break it</button>` : "",
      l.pr ? `<a href="#prem-${esc(l.pr.replace(/[^a-z0-9]+/gi, "-").toLowerCase())}">Take its premise away</a>` : ""].filter(Boolean).join("");

    // Proved by
    let proof;
    if (l.th.length) {
      const one = (t) => `<details class="ethm"><summary><code>${esc(t)}</code><span class="ethm-m">${esc(E_T[t][0])}</span></summary><pre>${esc(E_T[t][1])}</pre></details>`;
      const cut = l.th.length > 7 ? 5 : l.th.length;
      proof = `<p class="esay">Open a theorem to read exactly what Lean checked.</p><div class="ethms">${l.th.slice(0, cut).map(one).join("")}</div>` +
        (l.th.length > cut ? `<details class="emore"><summary>Show the other ${l.th.length - cut}</summary><div class="ethms">${l.th.slice(cut).map(one).join("")}</div></details>` : "") +
        l.nt.map((t) => `<p class="esay"><code>${esc(t)}</code> is named too: ${E_NOT[t]}.</p>`).join("");
    } else if (l.bc) {
      proof = `<p class="esay">No theorem names it. It holds because of how the code is built, and the vectors below pin it.</p>`;
    } else proof = `<p class="esay">No theorem is named.</p>`;
    const proofH = l.th.length ? `Proved by ${plural(l.th.length, "theorem")}` : l.bc ? "Held by construction" : "No proof named";

    // Pinned by
    let pin;
    if (!files.length) {
      pin = `<p class="esay">No vector file cites or names it.${l.vc ? ` The row's vectors cell says: <span class="ecell">${l.vc}</span>` : ""}</p>`;
    } else {
      const agree = !l.un.length && !l.ex.length;
      pin = (agree
        ? `<p class="esay eagree"><span class="eok">The two lists agree.</span> Every vector the row cites names this law, and every vector naming it is cited.</p>`
        : `<p class="esay eagree"><span class="eoff">The two lists differ.</span> The row cites ${plural(l.ci.length, "file")}; ${plural(both.length + l.ex.length, "file")} name the law themselves.</p>`) +
        (l.vc ? `<p class="esay">The row's vectors cell also says: <span class="ecell">${l.vc}</span></p>` : "") +
        (both.length ? `<p class="evg">Cited, and naming it <span>${both.length}</span></p>${fileList(both)}` : "") +
        (l.un.length ? `<p class="evg evg-off">Cited, but the file doesn't name it <span>${l.un.length}</span></p>${fileList(l.un, "off")}` : "") +
        (l.ex.length ? `<p class="evg">Naming it, but not cited <span>${l.ex.length}</span></p>${fileList(l.ex)}` : "") +
        `<p class="esay esmall">Files open on GitHub at current main, which may differ from this build.</p>`;
    }
    const pinH = files.length ? `Pinned by ${plural(files.length, "vector file")}` : "No vector file of its own";

    // Run by
    const ran = E_IMPL.filter((_, j) => l.ru[j] > 0).length;
    const run = files.length
      ? `<ul class="eruns">${E_IMPL.map((impl, j) => {
          const n = l.ru[j], all = n === files.length;
          return `<li class="${n ? "" : "off"}"><span class="ern">${IMPL_NAME[j]}</span>` +
            `<span class="erbar" aria-hidden="true"><span style="width:${(100 * n / files.length).toFixed(1)}%"></span></span>` +
            `<span class="erc">${n ? (all ? `runs all ${files.length}` : `runs ${n} of ${files.length}`) : "runs none"}</span>` +
            (n < files.length ? `<span class="erw">${impl.what}</span>` : "") + `</li>`;
        }).join("")}</ul>`
      : `<p class="esay">With no vector file, there is nothing for an implementation to run.</p>`;
    const runH = files.length ? `Run by ${ran} of ${E_IMPL.length} implementations` : "Nothing to run";

    // Rests on, carries
    const rests = `<div class="erc2"><div><p class="evg">Rests on <span>${l.ro.length}</span></p>${l.ro.length
      ? `<ul class="erl">${l.ro.map(([k, via]) => `<li>${lawLink(k)}<span class="evia">${esc(via)}</span></li>`).join("")}</ul>`
      : `<p class="esay">Its proofs use no other law's theorem.</p>`}</div>` +
      `<div><p class="evg">Carries <span>${l.ca.length}</span></p>${l.ca.length
      ? `<p class="erl2">${l.ca.map(lawLink).join(" ")}</p>`
      : `<p class="esay">No other law's proof uses its theorems.</p>`}</div></div>` +
      (l.ro.length || l.ca.length ? `<p class="esay"><a href="#e-map" class="eonmap" data-id="${idOf(l)}">Show it on the map</a></p>` : "");

    const step = (s, mark, h, body) => `<li class="es" data-s="${s}"><span class="esm" aria-hidden="true">${mark}</span><div class="esb"><h4>${h}</h4>${body}</div></li>`;
    return `<header class="eth"><h3 class="etn"><code>${esc(l.k)}</code></h3>` +
      `<p class="etl"><span class="mk" aria-hidden="true">${MARK[l.sh]}</span>${E_SHAPES[l.sh]}, in the ${l.ly} layer. It answers “${esc(QOF[l.q] || "")}”</p>` +
      `<nav class="etnav" aria-label="Neighbouring laws">${prev ? `<a href="#${idOf(prev)}" rel="prev">← <code>${esc(prev.k)}</code></a>` : "<span></span>"}${next ? `<a href="#${idOf(next)}" rel="next"><code>${esc(next.k)}</code> →</a>` : ""}</nav></header>` +
      `<ol class="est">` +
      step("claim", "“", "The claim", `<p class="esen">${l.sen}</p>${l.sc ? `<p class="esc">${l.sc}</p>` : ""}<p class="elinks">${links}</p>`) +
      step("row", "§", "The row in <code>protocol/laws.md</code>", `<p class="emd">${l.md}</p><p class="esay esmall">Under “${esc(l.sec)}”, proved in ${l.lf.map((f) => `<code>${esc(f)}</code>`).join(", ")}.</p>`) +
      step("proved", "⊢", proofH, proof) +
      step("pinned", "≡", pinH, pin) +
      step("run", "▷", runH, run) +
      step("rests", "⇵", "What it rests on, and what rests on it", rests) +
      `</ol>`;
  }

  let cur = null;
  function select(l, scroll) {
    if (!l) return;
    const changed = l !== cur;
    cur = l;
    if (changed) $("#etrace").innerHTML = trace(l);
    $$("a[data-k]", idx).forEach((a) => (a.dataset.k === l.k ? a.setAttribute("aria-current", "true") : a.removeAttribute("aria-current")));
    $$("#ecov-b tr[data-k]").forEach((tr) => tr.classList.toggle("cur", tr.dataset.k === l.k));
    const a = $(`a[aria-current="true"]`, idx);
    if (a && idx.scrollHeight > idx.clientHeight) {
      const top = a.offsetTop - idx.offsetTop, h = idx.clientHeight;
      if (top < idx.scrollTop || top > idx.scrollTop + h - 40) idx.scrollTop = Math.max(0, top - h / 3);
    }
    if (pinned) mapPin(idOf(l), false);
    if (scroll) {
      const t = $("#etrace"), r = t.getBoundingClientRect();
      if (r.top < 60 || r.top > innerHeight * 0.55) t.scrollIntoView({ block: "start", behavior: reduce ? "auto" : "smooth" });
      if (changed && !reduce) { t.classList.remove("swap"); void t.offsetWidth; t.classList.add("swap"); }
    }
  }
  $("#etrace").addEventListener("click", (e) => {
    const b = e.target.closest(".ebreak");
    if (b && window.slBreak) { window.slBreak(b.dataset.m, b.dataset.name); return; }
    const m = e.target.closest(".eonmap");
    if (m) { mapPin(m.dataset.id, true); }
  });

  /* ---------- the map ---------- */
  const holder = $("#emap"), note = $("#emap-note");
  holder.innerHTML = E_MAP;
  const svg = $("svg", holder);
  const nodeEls = new Map($$(".node", holder).map((g) => [g.dataset.id, g]));
  const edgeEls = $$(".edge", holder);
  const down = new Map(), up = new Map();
  for (const p of edgeEls) {
    const { a, b } = p.dataset;
    (down.get(a) ?? down.set(a, []).get(a)).push(b);
    (up.get(b) ?? up.set(b, []).get(b)).push(a);
  }
  const reach = (start, adj) => {
    const seen = new Set(), stack = [start];
    while (stack.length) for (const x of adj.get(stack.pop()) ?? []) if (!seen.has(x)) { seen.add(x); stack.push(x); }
    return seen;
  };
  let pinned = null;
  function light(id) {
    if (!id || !nodeEls.has(id)) {
      holder.classList.remove("focus");
      nodeEls.forEach((g) => g.classList.remove("on", "me"));
      edgeEls.forEach((p) => p.classList.remove("on", "down", "up", "me"));
      note.innerHTML = "";
      return;
    }
    holder.classList.add("focus");
    const below = reach(id, down), above = reach(id, up);
    nodeEls.forEach((g, k) => { g.classList.toggle("on", k === id || below.has(k) || above.has(k)); g.classList.toggle("me", k === id); });
    edgeEls.forEach((p) => {
      const d = (p.dataset.a === id || below.has(p.dataset.a)) && below.has(p.dataset.b);
      const u = (p.dataset.b === id || above.has(p.dataset.b)) && above.has(p.dataset.a);
      p.classList.toggle("on", d || u); p.classList.toggle("down", d); p.classList.toggle("up", u && !d); p.classList.remove("me");
    });
    const l = BYID.get(id);
    note.innerHTML = `<p class="emn-h"><code>${esc(l.k)}</code></p><p class="emn-s">${l.sen}</p>` +
      `<p class="emn-c">It rests on ${plural(below.size, "law")}, directly or through others, and ${plural(above.size, "law")} rest${above.size === 1 ? "s" : ""} on it.` +
      `${cur === l ? "" : ` <a href="#${id}">Follow it</a>`}</p>`;
  }
  function showEdge(p) {
    holder.classList.add("focus");
    const { a, b, via } = p.dataset;
    nodeEls.forEach((g, k) => { g.classList.toggle("on", k === a || k === b); g.classList.remove("me"); });
    edgeEls.forEach((q) => { q.classList.toggle("on", q === p); q.classList.toggle("me", q === p); q.classList.remove("down", "up"); });
    note.innerHTML = `<p class="emn-c"><a href="#${a}"><code>${esc(BYID.get(a).k)}</code></a> rests on <a href="#${b}"><code>${esc(BYID.get(b).k)}</code></a> through</p><p class="emn-v">${via}</p>`;
  }
  function mapPin(id, go) {
    pinned = nodeEls.has(id) ? id : null;
    light(pinned);
    if (go) {
      const g = pinned && nodeEls.get(pinned);
      requestAnimationFrame(() => {
        $("#e-map").scrollIntoView({ block: "start", behavior: reduce ? "auto" : "smooth" });
        if (g) {
          const box = g.getBoundingClientRect(), hb = holder.getBoundingClientRect();
          holder.scrollLeft += (box.left + box.width / 2) - (hb.left + hb.width / 2);
        }
      });
    }
  }
  for (const [id, g] of nodeEls) {
    g.addEventListener("mouseenter", () => light(id));
    g.addEventListener("focus", () => light(id));
    g.addEventListener("click", (e) => { e.preventDefault(); pinned = id; light(id); });
  }
  for (const p of edgeEls) {
    p.addEventListener("mouseenter", () => showEdge(p));
    p.addEventListener("click", (e) => { e.stopPropagation(); showEdge(p); });
  }
  svg.addEventListener("mouseleave", () => light(pinned));
  svg.addEventListener("focusout", (e) => { if (!svg.contains(e.relatedTarget)) light(pinned); });
  svg.addEventListener("click", (e) => { if (!e.target.closest(".node, .edge")) { pinned = null; light(null); } });
  const connected = new Set([...nodeEls.keys()]);
  const alone = LAWS.filter((l) => !connected.has(idOf(l)));
  $("#ealone").innerHTML = `The map shows ${plural(connected.size, "law")} joined by ${plural(edgeEls.length, "proof")}. The other ${alone.length} stand alone: their proofs use no other law's theorem. ` +
    alone.map((l) => `<a href="#${idOf(l)}"><code>${esc(l.k)}</code></a>`).join(" ");

  /* ---------- following the address ---------- */
  function fromHash(scroll) {
    const id = decodeURIComponent(location.hash.slice(1));
    const l = BYID.get(id);
    if (l) { select(l, scroll); return true; }
    return false;
  }
  addEventListener("hashchange", () => fromHash(true));
  if (!fromHash(true)) select(BY.get("record.sets") || LAWS[0], false);
})();

