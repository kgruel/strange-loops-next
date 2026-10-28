// The evidence page's behaviour: the section links and the map. The map is drawn when the
// page is built, so without scripts it is still there, each law a link to its card; scripts
// add following a law through what it rests on and what rests on it.
(() => {
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
    const el = id && document.getElementById(id);
    if (!el) return;
    el.classList.add("flash");
    setTimeout(() => el.classList.remove("flash"), 1600);
  };
  addEventListener("hashchange", () => flash(location.hash.slice(1)));

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
