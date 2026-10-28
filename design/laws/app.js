// The laws page's behaviour: the sentence, the demos and the map. Motion supplies the springs,
// pinned; without it, or with reduced motion, every animation jumps to its end. The map is
// drawn when the page is built, so without scripts it is still there, each law a link to its card.
(() => {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const M = !reduced && window.Motion ? window.Motion : null;
  const last = (v) => (Array.isArray(v) ? v[v.length - 1] : v);
  const animate = M ? M.animate : (el, kf) => {
    for (const [k, v] of Object.entries(kf)) el.style[k] = last(v);
    return Promise.resolve();
  };
  const spring = (stiffness, damping, delay = 0) => ({ type: "spring", stiffness, damping, delay });
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  // Section links: mark the one in view.
  const links = $$(".seg a");
  const io = new IntersectionObserver((es) => {
    for (const e of es) if (e.isIntersecting)
      for (const a of links) a.setAttribute("aria-current", a.hash === `#${e.target.id}` ? "true" : "false");
  }, { rootMargin: "-45% 0px -50% 0px" });
  for (const a of links) { const s = $(a.hash); if (s) io.observe(s); }

  // A law reached by a link lights up briefly.
  const flash = (id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.add("flash");
    setTimeout(() => el.classList.remove("flash"), 1600);
  };
  addEventListener("hashchange", () => flash(location.hash.slice(1)));

  // The sentence: one invariance after another, the slots changing and the frame staying.
  const sheet = $(".rotor-sheet");
  const change = $("#rotor-change"), stays = $("#rotor-stays"), law = $("#rotor-law");
  let k = 0, hover = false, visible = false;
  const next = async () => {
    k = (k + 1) % ROTOR.length;
    const r = ROTOR[k];
    await Promise.all([change, stays, law].map((el) => animate(el, { opacity: [1, 0], transform: ["translateY(0px)", "translateY(-6px)"] }, { duration: 0.18 })));
    change.innerHTML = r.change; stays.innerHTML = r.stays; law.innerHTML = r.link;
    [change, stays, law].forEach((el, i) => animate(el, { opacity: [0, 1], transform: ["translateY(6px)", "translateY(0px)"] }, spring(320, 26, 0.05 * i)));
  };
  // It turns by itself only while nobody is reading it: not under the pointer, not holding
  // focus, not paused. Next and Pause are real buttons, so the keyboard has both.
  let paused = !M, focused = false;
  const pause = $("#rotor-pause");
  const showPause = () => { pause.setAttribute("aria-pressed", String(paused)); pause.textContent = paused ? "Play" : "Pause"; };
  if (!M) pause.hidden = true;
  showPause();
  $("#rotor-next").addEventListener("click", next);
  pause.addEventListener("click", () => { paused = !paused; showPause(); });
  sheet.addEventListener("click", (e) => { if (!e.target.closest("a, button")) next(); });
  sheet.addEventListener("mouseenter", () => (hover = true));
  sheet.addEventListener("mouseleave", () => (hover = false));
  sheet.addEventListener("focusin", () => (focused = true));
  sheet.addEventListener("focusout", (e) => { if (!sheet.contains(e.relatedTarget)) focused = false; });
  new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(sheet);
  if (M) setInterval(() => { if (visible && !hover && !focused && !paused && !document.hidden) next(); }, 4200);

  // The demos: show the next variant, moving each piece from where it was to where it is.
  for (const demo of $$(".demo")) {
    const variants = $$(".variant", demo);
    const answers = $$(".answer[data-v]", demo);
    const fixed = $(".answer:not([data-v])", demo);
    let at = 0;
    $(".poke", demo).addEventListener("click", () => {
      const from = variants[at];
      const before = new Map($$("[data-k]", from).map((el) => [el.dataset.k, el.getBoundingClientRect()]));
      at = (at + 1) % variants.length;
      variants.forEach((v, i) => (v.hidden = i !== at));
      const to = variants[at];
      const seen = new Set();
      $$("[data-k]", to).forEach((el, i) => {
        const was = !seen.has(el.dataset.k) && before.get(el.dataset.k);
        seen.add(el.dataset.k);
        if (was) {
          const now = el.getBoundingClientRect();
          animate(el, { transform: [`translate(${was.left - now.left}px, ${was.top - now.top}px)`, "translate(0px, 0px)"] }, spring(420, 30, 0.02 * i));
        } else animate(el, { opacity: [0, 1], transform: ["translateY(6px)", "translateY(0px)"] }, spring(380, 26, 0.03 * i));
      });
      animate($(".variant-l", to), { opacity: [0.2, 1] }, { duration: 0.3 });
      if (answers.length) {
        answers.forEach((a, i) => (a.hidden = i !== at));
        animate(answers[at], { opacity: [0, 1], transform: ["scale(0.97)", "scale(1)"] }, spring(380, 20));
      } else if (fixed) {
        // It stays: a small settle, nothing more.
        animate(fixed, { transform: ["scale(1)", "scale(1.015)", "scale(1)"] }, { duration: 0.45 });
      }
    });
  }

  // The map: drawn when the page was built. Following a law lights everything it rests on,
  // down, and everything that rests on it, up; a line names the theorems that make it.
  const holder = $("#lawmap"), note = $("#map-note");
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
  const clear = () => {
    holder.classList.remove("focus");
    nodeEls.forEach((g) => g.classList.remove("on", "me"));
    edgeEls.forEach((p) => p.classList.remove("on", "down", "up", "me"));
    note.textContent = "";
  };
  const focus = (id) => {
    if (!id) return clear();
    holder.classList.add("focus");
    const below = reach(id, down), above = reach(id, up);
    nodeEls.forEach((g, k) => { g.classList.toggle("on", k === id || below.has(k) || above.has(k)); g.classList.toggle("me", k === id); });
    edgeEls.forEach((p) => {
      const d = (p.dataset.a === id || below.has(p.dataset.a)) && below.has(p.dataset.b);
      const u = (p.dataset.b === id || above.has(p.dataset.b)) && above.has(p.dataset.a);
      p.classList.toggle("on", d || u); p.classList.toggle("down", d); p.classList.toggle("up", u && !d); p.classList.remove("me");
    });
    const n = MAP_NOTES[id];
    note.innerHTML = `<b>${n.label}</b>: ${n.sentence} Rests on ${below.size} law${below.size === 1 ? "" : "s"}, carries ${above.size}. <a href="#${id}">Its card</a>`;
  };
  const showEdge = (p) => {
    holder.classList.add("focus");
    const { a, b, via } = p.dataset;
    nodeEls.forEach((g, k) => { g.classList.toggle("on", k === a || k === b); g.classList.remove("me"); });
    edgeEls.forEach((q) => { q.classList.toggle("on", q === p); q.classList.toggle("me", q === p); q.classList.remove("down", "up"); });
    note.innerHTML = `<b>${MAP_NOTES[a].label}</b> rests on <b>${MAP_NOTES[b].label}</b>: <span class="via">${via}</span>`;
  };
  // A mouse follows a law by pointing and opens its card with a click; a touch has no
  // pointing, so its first tap follows the law and a second opens the card; Enter opens it.
  let touched = null, touch = false;
  for (const [id, g] of nodeEls) {
    g.addEventListener("pointerdown", (e) => { touch = e.pointerType === "touch"; });
    g.addEventListener("mouseenter", () => focus(id));
    g.addEventListener("focus", () => focus(id));
    g.addEventListener("click", (e) => {
      if (touch && touched !== id) { e.preventDefault(); touched = id; focus(id); }
    });
  }
  for (const p of edgeEls) {
    p.addEventListener("mouseenter", () => showEdge(p));
    p.addEventListener("click", () => showEdge(p));
  }
  // Leaving with the pointer keeps a law the keyboard chose; leaving with the keyboard clears it.
  const svg = $("svg", holder);
  const chosen = () => document.activeElement?.closest?.(".node")?.dataset.id ?? null;
  svg.addEventListener("mouseleave", () => focus(chosen()));
  svg.addEventListener("focusout", (e) => { if (!svg.contains(e.relatedTarget)) focus(null); });

  if (location.hash) flash(location.hash.slice(1));
})();
