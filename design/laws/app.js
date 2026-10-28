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

  // The demos. Without scripts a card lists every variant and every answer. With them it shows
  // one variant at a time, and the trail starts with the first answer and gains one for each
  // variant the reader asks for; when all are shown, the card says so, in words scoped to the
  // vector. The premise button takes the law's premise away and adds what the model then says.
  // The card's figure is drawn from the same vector, a lane per variant: the lane on show is lit.
  const appear = (el) => animate(el, { opacity: [0, 1], transform: ["translateY(4px)", "translateY(0px)"] }, spring(380, 26));
  for (const demo of $$(".demo")) {
    const variants = $$(".variant", demo);
    const answers = $$(".answer[data-v]", demo);
    const fixed = $(".answer:not([data-v])", demo);
    const entries = $$(".trail li[data-v]", demo);
    const gone = $(".trail .gone", demo);
    const done = $(".trail-done", demo);
    const poke = $(".poke", demo), unpremise = $(".unpremise", demo);
    const compact = demo.classList.contains("is-compact");
    const fig = $(".demo-fig svg", demo), lanes = fig ? $$("[data-lane]", fig) : [];
    if (lanes.length) fig.classList.add("is-stepping");
    const seen = new Set([0]);
    let at = 0;
    const view = (i) => {
      at = i;
      variants.forEach((v, k) => (v.hidden = k !== at));
      answers.forEach((a, k) => (a.hidden = k !== at));
      lanes.forEach((l) => l.classList.toggle("is-on", Number(l.dataset.lane) === at));
    };
    view(0);
    entries.forEach((li, k) => (li.hidden = k > 0));
    if (gone) gone.hidden = true;
    if (done) done.hidden = true;

    if (poke) poke.addEventListener("click", () => {
      const from = variants[at];
      const before = new Map($$("[data-k]", from).map((el) => [el.dataset.k, el.getBoundingClientRect()]));
      view((at + 1) % variants.length);
      const to = variants[at];
      const placed = new Set();
      $$("[data-k]", to).forEach((el, i) => {
        const was = !placed.has(el.dataset.k) && before.get(el.dataset.k);
        placed.add(el.dataset.k);
        if (was) {
          const now = el.getBoundingClientRect();
          animate(el, { transform: [`translate(${was.left - now.left}px, ${was.top - now.top}px)`, "translate(0px, 0px)"] }, spring(420, 30, 0.02 * i));
        } else animate(el, { opacity: [0, 1], transform: ["translateY(6px)", "translateY(0px)"] }, spring(380, 26, 0.03 * i));
      });
      animate($(".variant-l", to), { opacity: [0.2, 1] }, { duration: 0.3 });
      if (answers.length) animate(answers[at], { opacity: [0, 1], transform: ["scale(0.97)", "scale(1)"] }, spring(380, 20));
      else if (fixed) animate(fixed, { transform: ["scale(1)", "scale(1.015)", "scale(1)"] }, { duration: 0.45 });
      // The trail gains this variant's answer the first time it is shown.
      if (!seen.has(at)) { seen.add(at); entries[at].hidden = false; appear(entries[at]); }
      if (done && seen.size === entries.length && done.hidden) { done.hidden = false; appear(done); }
    });

    if (unpremise) unpremise.addEventListener("click", () => {
      const on = unpremise.getAttribute("aria-pressed") !== "true";
      unpremise.setAttribute("aria-pressed", String(on));
      unpremise.textContent = on ? "Put the premise back" : "Remove the premise";
      demo.classList.toggle("is-removed", on);
      gone.hidden = !on;
      if (on) appear(gone);
      // A card with only the premise to turn shows the question asked each way.
      if (compact) { view(on ? 1 : 0); entries[0].hidden = false; }
    });
  }
  animateShapes(document, animate);

  if (location.hash) flash(location.hash.slice(1));
})();
