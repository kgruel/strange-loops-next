// The laws page's behaviour: the sentence, the demos and the map. Motion supplies the springs
// and elkjs lays the map out; both are pinned. Without Motion, or with reduced motion, every
// animation jumps to its end. Without elkjs there is no map, and every law's card still says
// what it rests on and what it carries.
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
  sheet.addEventListener("click", (e) => { if (!e.target.closest("a")) next(); });
  sheet.addEventListener("mouseenter", () => (hover = true));
  sheet.addEventListener("mouseleave", () => (hover = false));
  new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(sheet);
  if (M) setInterval(() => { if (visible && !hover && !document.hidden) next(); }, 4200);

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

  // The map: laid out by elkjs in bands, one per layer, the top layer first.
  const ELK_SRC = "https://cdn.jsdelivr.net/npm/elkjs@0.9.3/lib/elk.bundled.js";
  const ELK_SRI = "sha384-KO35c6PFq7tFxAEx6FtATwL9vOBOmCzQYr7GM0iTr3oO22s7Jc9OkclOH4AV7jwK";
  const holder = $("#lawmap"), note = $("#map-note");
  const loadElk = () => new Promise((ok, no) => {
    if (window.ELK) return ok(window.ELK);
    const s = document.createElement("script");
    s.src = ELK_SRC; s.integrity = ELK_SRI; s.crossOrigin = "anonymous";
    s.onload = () => (window.ELK ? ok(window.ELK) : no(new Error("no ELK")));
    s.onerror = no;
    document.head.appendChild(s);
  });
  const svgNS = "http://www.w3.org/2000/svg";
  const el = (name, attrs = {}, parent) => {
    const e = document.createElementNS(svgNS, name);
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
    if (parent) parent.appendChild(e);
    return e;
  };
  const rounded = (pts, r = 6) => {
    let d = `M${pts[0].x} ${pts[0].y}`;
    for (let i = 1; i < pts.length - 1; i++) {
      const p = pts[i - 1], q = pts[i], n = pts[i + 1];
      const a = Math.min(r, Math.hypot(q.x - p.x, q.y - p.y) / 2), b = Math.min(r, Math.hypot(n.x - q.x, n.y - q.y) / 2);
      const ux = Math.sign(q.x - p.x), uy = Math.sign(q.y - p.y), vx = Math.sign(n.x - q.x), vy = Math.sign(n.y - q.y);
      d += ` L${q.x - ux * a} ${q.y - uy * a} Q${q.x} ${q.y} ${q.x + vx * b} ${q.y + vy * b}`;
    }
    const z = pts[pts.length - 1];
    return d + ` L${z.x} ${z.y}`;
  };

  async function drawMap() {
    let ELK;
    try { ELK = await loadElk(); } catch {
      holder.innerHTML = '<p class="note map-wait">The map is drawn by elkjs, which didn\'t load. Every law\'s card above still lists what it rests on and what it carries.</p>';
      return;
    }
    await document.fonts.ready;
    const ctx = document.createElement("canvas").getContext("2d");
    ctx.font = '11px "JetBrains Mono", ui-monospace, monospace';
    const layerOf = new Map(MAP.nodes.map((n) => [n.id, n]));
    const graph = {
      id: "root",
      layoutOptions: {
        // Partitions keep each layer in its own band; ELK honours them across the whole graph
        // only when it doesn't lay out each connected part on its own.
        "elk.algorithm": "layered", "elk.direction": "DOWN", "elk.partitioning.activate": "true",
        "elk.separateConnectedComponents": "false",
        "elk.edgeRouting": "ORTHOGONAL", "elk.layered.spacing.nodeNodeBetweenLayers": "34",
        "elk.spacing.nodeNode": "10", "elk.layered.spacing.edgeNodeBetweenLayers": "14",
        "elk.layered.nodePlacement.strategy": "BRANDES_KOEPF", "elk.padding": "[top=16,left=16,bottom=16,right=16]",
      },
      children: MAP.nodes.map((n) => ({
        id: n.id, width: Math.ceil(ctx.measureText(n.label).width) + 20, height: 26,
        layoutOptions: { "elk.partitioning.partition": String(MAP.layers.indexOf(n.layer)) },
      })),
      edges: MAP.edges.map(([a, b], i) => ({ id: `e${i}`, sources: [a], targets: [b] })),
    };
    const out = await new ELK().layout(graph);
    const LEFT = 92;
    const W = out.width + LEFT, H = out.height;
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: "img", "aria-label": "Which laws each law's proof rests on" });
    const bands = el("g", {}, svg);
    const pos = new Map(out.children.map((c) => [c.id, c]));
    MAP.layers.forEach((layer, i) => {
      const ns = out.children.filter((c) => layerOf.get(c.id).layer === layer);
      if (!ns.length) return;
      const y0 = Math.min(...ns.map((c) => c.y)) - 9, y1 = Math.max(...ns.map((c) => c.y + c.height)) + 9;
      el("rect", { class: `band${i % 2 ? " alt" : ""}`, x: 0, y: y0, width: W, height: y1 - y0, rx: 0 }, bands);
      const t = el("text", { class: "band-l", x: 14, y: (y0 + y1) / 2 + 4 }, bands);
      t.textContent = layer;
    });
    const gEdges = el("g", { transform: `translate(${LEFT} 0)` }, svg);
    const gNodes = el("g", { transform: `translate(${LEFT} 0)` }, svg);
    const edgeEls = out.edges.map((e, i) => {
      const s = e.sections[0];
      const pts = [s.startPoint, ...(s.bendPoints ?? []), s.endPoint];
      const p = el("path", { class: "edge", d: rounded(pts) }, gEdges);
      p.dataset.a = MAP.edges[i][0]; p.dataset.b = MAP.edges[i][1];
      return p;
    });
    const nodeEls = new Map();
    for (const n of MAP.nodes) {
      const c = pos.get(n.id);
      const g = el("g", { class: `node${n.shape === "limit" ? " limit" : ""}`, transform: `translate(${c.x} ${c.y})`, tabindex: 0, role: "button" }, gNodes);
      el("rect", { width: c.width, height: c.height, rx: 7 }, g);
      const t = el("text", { x: 10, y: 17 }, g);
      t.textContent = n.label;
      g.dataset.id = n.id;
      nodeEls.set(n.id, g);
    }
    // Fit the column, down to 85%; past that, the map scrolls sideways.
    const fit = () => {
      const scale = Math.min(1, Math.max(0.85, holder.clientWidth / W));
      svg.setAttribute("width", Math.round(W * scale));
      svg.setAttribute("height", Math.round(H * scale));
    };
    holder.innerHTML = "";
    holder.appendChild(svg);
    fit();
    addEventListener("resize", fit);
    if (M) {
      animate(svg, { opacity: [0, 1] }, { duration: 0.4 });
      [...nodeEls.values()].forEach((g, i) => animate($("rect", g), { opacity: [0, 1] }, { duration: 0.3, delay: 0.004 * i }));
    }

    // Following a law: everything it rests on, down; everything it carries, up.
    const down = new Map(), up = new Map();
    for (const [a, b] of MAP.edges) { (down.get(a) ?? down.set(a, []).get(a)).push(b); (up.get(b) ?? up.set(b, []).get(b)).push(a); }
    const reach = (start, adj) => {
      const seen = new Set(), stack = [start];
      while (stack.length) for (const x of adj.get(stack.pop()) ?? []) if (!seen.has(x)) { seen.add(x); stack.push(x); }
      return seen;
    };
    const focus = (id) => {
      holder.classList.toggle("focus", Boolean(id));
      if (!id) { nodeEls.forEach((g) => g.classList.remove("on", "me")); edgeEls.forEach((p) => p.classList.remove("on", "down", "up")); note.textContent = ""; return; }
      const below = reach(id, down), above = reach(id, up);
      nodeEls.forEach((g, k) => { g.classList.toggle("on", k === id || below.has(k) || above.has(k)); g.classList.toggle("me", k === id); });
      edgeEls.forEach((p) => {
        const d = (p.dataset.a === id || below.has(p.dataset.a)) && below.has(p.dataset.b);
        const u = (p.dataset.b === id || above.has(p.dataset.b)) && above.has(p.dataset.a);
        p.classList.toggle("on", d || u); p.classList.toggle("down", d); p.classList.toggle("up", u && !d);
      });
      const n = layerOf.get(id);
      note.innerHTML = `<b>${n.label}</b>: ${n.sentence} Rests on ${below.size} law${below.size === 1 ? "" : "s"}, carries ${above.size}. <a href="#${id}">Its card</a>`;
    };
    for (const [id, g] of nodeEls) {
      g.addEventListener("mouseenter", () => focus(id));
      g.addEventListener("focus", () => focus(id));
      g.addEventListener("click", () => {
        focus(id);
        // On a map wider than its column, bring the law to the middle.
        const r = g.getBoundingClientRect(), h = holder.getBoundingClientRect();
        holder.scrollBy({ left: r.left + r.width / 2 - (h.left + h.width / 2), behavior: reduced ? "auto" : "smooth" });
      });
    }
    svg.addEventListener("mouseleave", () => focus(null));
  }
  new IntersectionObserver(([e], obs) => { if (e.isIntersecting) { obs.disconnect(); drawMap(); } }, { rootMargin: "600px 0px" }).observe(holder);

  if (location.hash) flash(location.hash.slice(1));
})();
