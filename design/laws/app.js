// The laws page's behaviour: the sentence, the shape filters and the demos. Motion supplies
// the springs, pinned; without it, or with reduced motion, every animation jumps to its end.
// Without scripts the page still reads: the first sentence, every law, and shape links that
// pick out their laws by :target.
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
    const el = id && document.getElementById(id);
    if (!el) return;
    el.classList.add("flash");
    setTimeout(() => el.classList.remove("flash"), 1600);
  };
  addEventListener("hashchange", () => flash(location.hash.slice(1)));

  // The sentence: one invariance after another, the slots changing and the frame staying. It
  // moves only when the reader asks, so nobody in a meeting loses their place.
  const change = $("#rotor-change"), stays = $("#rotor-stays"), law = $("#rotor-law"), at = $("#rotor-at");
  let k = 0;
  const step = async (by) => {
    k = (k + by + ROTOR.length) % ROTOR.length;
    const r = ROTOR[k];
    await Promise.all([change, stays, law].map((el) => animate(el, { opacity: [1, 0], transform: ["translateY(0px)", `translateY(${-6 * by}px)`] }, { duration: 0.16 })));
    change.innerHTML = r.change; stays.innerHTML = r.stays; law.innerHTML = r.link;
    at.textContent = `${k + 1} of ${ROTOR.length}`;
    [change, stays, law].forEach((el, i) => animate(el, { opacity: [0, 1], transform: [`translateY(${6 * by}px)`, "translateY(0px)"] }, spring(320, 26, 0.05 * i)));
  };
  $("#rotor-next").addEventListener("click", () => step(1));
  $("#rotor-prev").addEventListener("click", () => step(-1));

  // The shapes: with scripts, each link is a toggle that picks out its laws in the overview,
  // and more than one may be on. All turns them off.
  const ov = $("#ov");
  const shapeLinks = $$(".sf[data-shape]:not(.all)");
  const all = $(".sf.all");
  const on = new Set();
  const showShapes = () => {
    for (const a of shapeLinks) a.setAttribute("aria-pressed", String(on.has(a.dataset.shape)));
    all.setAttribute("aria-pressed", String(!on.size));
    for (const c of $$(".lc", ov)) c.classList.toggle("off", on.size > 0 && !on.has(c.dataset.shape));
  };
  for (const a of [all, ...shapeLinks]) a.setAttribute("role", "button");
  for (const a of shapeLinks) a.addEventListener("click", (e) => {
    e.preventDefault();
    const s = a.dataset.shape;
    if (on.has(s)) on.delete(s); else on.add(s);
    showShapes();
  });
  all.addEventListener("click", (e) => { e.preventDefault(); on.clear(); showShapes(); });
  // A link that arrived on a shape starts with it picked out.
  const arrived = location.hash.match(/^#shape-(.+)$/);
  if (arrived && shapeLinks.some((a) => a.dataset.shape === arrived[1])) on.add(arrived[1]);
  showShapes();
  // Space presses a button; these are links acting as buttons, so they take it too.
  for (const a of [all, ...shapeLinks]) a.addEventListener("keydown", (e) => { if (e.key === " ") { e.preventDefault(); a.click(); } });

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

  if (location.hash) flash(location.hash.slice(1));
})();
