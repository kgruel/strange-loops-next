// The grammar page's behaviour: the sentence, the layer stack, the walk and the matrix.
// Motion (window.Motion) supplies the springs. Without it, or with reduced motion, every
// animation jumps to its last frame, so the page reads the same either way.
(() => {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const M = !reduced && window.Motion ? window.Motion : null;
  const last = (v) => (Array.isArray(v) ? v[v.length - 1] : v);
  const animate = M ? M.animate : (el, kf) => {
    for (const [k, v] of Object.entries(kf)) {
      if (k.startsWith("--")) el.style.setProperty(k, last(v)); else el.style[k] = last(v);
    }
    return Promise.resolve();
  };
  const spring = (stiffness, damping, delay = 0) => ({ type: "spring", stiffness, damping, delay });
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const wait = (ms) => new Promise((r) => setTimeout(r, M ? ms : 0));
  const rid = (k) => `r:${k}…`;

  // Section links: mark the one in view.
  const links = $$(".seg a");
  const io = new IntersectionObserver((es) => {
    for (const e of es) if (e.isIntersecting) {
      for (const a of links) a.setAttribute("aria-current", a.hash === `#${e.target.id}` ? "true" : "false");
    }
  }, { rootMargin: "-45% 0px -50% 0px" });
  for (const a of links) { const s = $(a.hash); if (s) io.observe(s); }

  // The sentence: a word and its field light together.
  const sentence = $("#sentence");
  const heat = (f) => $$("[data-f]", sentence).forEach((el) => el.classList.toggle("hot", el.dataset.f === f));
  for (const w of $$(".w", sentence)) {
    w.tabIndex = 0;
    w.addEventListener("mouseenter", () => heat(w.dataset.f));
    w.addEventListener("focus", () => heat(w.dataset.f));
    w.addEventListener("click", () => heat(w.dataset.f));
  }
  sentence.addEventListener("mouseleave", () => heat(null));

  // The layer stack. The ground never lifts: nothing on it is ever edited.
  const stack = $("#stack3d");
  const plates = $$(".plate", stack);
  const rows = $$(".layer-table tbody tr");
  const ground = plates.length - 1;
  const labels = plates.map((p) => {
    const l = document.createElement("span");
    l.className = "plate-label";
    l.textContent = p.textContent.trim();
    stack.appendChild(l);
    return l;
  });
  const placeLabels = () => {
    const box = stack.getBoundingClientRect();
    plates.forEach((p, k) => {
      const r = p.getBoundingClientRect();
      labels[k].style.left = `${r.left - box.left - 10}px`;
      labels[k].style.top = `${r.top - box.top + r.height * 0.62}px`;
    });
  };
  let follow = 0;
  const track = (ms) => {
    const until = performance.now() + ms;
    const go = () => { placeLabels(); if (performance.now() < until) follow = requestAnimationFrame(go); };
    cancelAnimationFrame(follow); go();
  };
  let lifted = null;
  const lift = (k) => {
    if (k === lifted) return;
    lifted = k;
    plates.forEach((p, i) => {
      const up = k !== null && i === k && i !== ground;
      p.classList.toggle("hot", i === k);
      labels[i].classList.toggle("hot", i === k);
      animate(p, { "--lift": up ? "22px" : "0px" }, spring(260 + 40 * i, 18 + 2 * i));
    });
    rows.forEach((r, i) => r.classList.toggle("hot", i === k));
    track(900);
  };
  [...plates, ...rows].forEach((el) => {
    const k = Number(el.dataset.layer);
    el.addEventListener("mouseenter", () => lift(k));
    el.addEventListener("click", () => lift(k));
  });
  $(".layers-fig").addEventListener("mouseleave", () => lift(null));
  addEventListener("resize", placeLabels);
  placeLabels();
  if (M) {
    // Each layer settles onto the one below it, the ground first.
    plates.forEach((p) => { p.style.opacity = "0"; p.style.setProperty("--lift", "140px"); });
    M.inView(stack, () => {
      plates.slice().reverse().forEach((p, j) => {
        animate(p, { opacity: [0, 1], "--lift": ["140px", "0px"] }, spring(170 + 30 * j, 17, 0.09 * j));
      });
      track(2200);
    }, { amount: 0.4 });
  }

  // The walk: each step is a whole state; render it, animating what changed.
  const dag = $("#dag"), edges = $("#edges");
  const stepsEl = $("#steps"), stepText = $("#step-text");
  const cards = new Map();
  let at = -1, token = 0;

  WALK.steps.forEach((s, k) => {
    const li = document.createElement("li");
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = s.title;
    b.addEventListener("click", () => show(k));
    li.appendChild(b);
    stepsEl.appendChild(li);
  });

  function card(id) {
    if (cards.has(id)) return cards.get(id);
    const r = WALK.records[id];
    const el = document.createElement("div");
    el.className = "rec";
    el.dataset.id = id;
    el.style.gridColumn = r.col;
    el.style.gridRow = r.row;
    el.innerHTML = `<div class="rid">${rid(id)}<span>${r.at}</span></div><div class="who">${r.who}</div><div class="val"></div><div class="tag"></div>`;
    dag.appendChild(el);
    cards.set(id, el);
    return el;
  }

  function paint(s, shown) {
    const fork = s.heads.length > 1;
    for (const [id, el] of cards) if (!shown.includes(id)) { cards.delete(id); el.remove(); }
    const fresh = [];
    for (const id of shown) {
      const isNew = !cards.has(id);
      const el = card(id);
      if (isNew) fresh.push(el);
      const head = s.heads.includes(id);
      el.classList.toggle("head", head && !fork);
      el.classList.toggle("fork", head && fork);
      el.classList.toggle("super", !head);
      const val = $(".val", el);
      const erased = (s.erased || []).includes(id), withheld = (s.withheld || []).includes(id);
      val.className = `val${erased ? " erased" : withheld ? " withheld" : ""}`;
      val.textContent = erased ? "erased · h:…" : withheld ? "withheld" : WALK.records[id].body;
      $(".tag", el).textContent = !head ? "superseded" : fork ? (id === s.heads[0] ? "fork · wins" : "fork") : "head";
    }
    fresh.forEach((el, j) => animate(el, { opacity: [0, 1], transform: ["translateY(10px) scale(0.96)", "translateY(0px) scale(1)"] }, spring(380, 26, 0.06 * j)));
    requestAnimationFrame(() => drawEdges(shown, fresh.map((el) => el.dataset.id)));
  }

  function drawEdges(shown, fresh) {
    const box = dag.getBoundingClientRect();
    const rect = (id) => cards.get(id).getBoundingClientRect();
    const paths = [];
    for (const id of shown) {
      const r = WALK.records[id];
      for (const p of r.prev) if (shown.includes(p)) {
        const a = rect(p), b = rect(id);
        const x1 = a.right - box.left, y1 = a.top + a.height / 2 - box.top;
        const x2 = b.left - box.left, y2 = b.top + b.height / 2 - box.top;
        const dx = (x2 - x1) / 2;
        paths.push({ d: `M${x1} ${y1} C${x1 + dx} ${y1},${x2 - dx} ${y2},${x2} ${y2}`, cls: "", key: `${p}>${id}`, isNew: fresh.includes(id) });
      }
      for (const e of r.erases || []) if (shown.includes(e)) {
        const a = rect(id), b = rect(e);
        const x1 = a.left + a.width / 2 - box.left, y1 = a.bottom - box.top;
        const x2 = b.left + b.width / 2 - box.left, y2 = b.bottom - box.top;
        // Under every card, so the line never crosses one.
        const low = Math.max(...[...cards.values()].map((c) => c.getBoundingClientRect().bottom)) - box.top + 26;
        paths.push({ d: `M${x1} ${y1} C${x1} ${low},${x2} ${low},${x2} ${y2}`, cls: "erase", key: `${id}x${e}`, isNew: fresh.includes(id) });
      }
    }
    edges.setAttribute("viewBox", `0 0 ${box.width} ${box.height}`);
    edges.innerHTML = paths.map((p) => `<path class="${p.cls}" data-k="${p.key}" d="${p.d}"/>`).join("");
    paths.forEach((p) => {
      if (!p.isNew) return;
      const el = edges.querySelector(`[data-k="${p.key}"]`);
      if (p.cls) { animate(el, { opacity: [0, 1] }, { duration: 0.5, delay: 0.25 }); return; }
      const len = el.getTotalLength();
      el.style.strokeDasharray = `${len}`;
      animate(el, { strokeDashoffset: [len, 0] }, { duration: 0.45, ease: "easeOut", delay: 0.12 });
    });
  }

  function slots(s, heads, count) {
    const cur = $("#slot-current");
    const withheld = s.withheld || [];
    const h = heads[0];
    cur.innerHTML = `<span class="v mono">${rid(h)}</span> ` + (withheld.includes(h)
      ? `<span class="sub">value unread</span>`
      : `<span class="sub">&ldquo;${WALK.records[h].body}&rdquo;</span>`) +
      (heads.length > 1 ? `<div class="sub alert">fork: also ${heads.slice(1).map(rid).join(", ")}</div>` : "");
    $("#slot-count").innerHTML = `<span class="v">${count}</span> <span class="sub">unread 0</span>`;
    for (const el of [cur, $("#slot-count")]) animate(el, { opacity: [0.35, 1] }, { duration: 0.35 });
  }

  function words(s) {
    const laws = s.laws.map((l) => `<a href="../laws/#${LAW_AT[l]}"><code>${l}</code></a>`).join(" ");
    stepText.innerHTML = `${s.settled ? '<span class="chip settled">settled</span>' : ""}<p>${s.text}</p>` +
      (laws ? `<p class="laws">${laws}</p>` : "") + (s.orders ? '<p class="arrival" id="arrival"></p>' : "");
    animate(stepText, { opacity: [0, 1], transform: ["translateY(4px)", "translateY(0px)"] }, spring(300, 30));
  }

  async function show(k) {
    k = Math.max(0, Math.min(WALK.steps.length - 1, k));
    const my = ++token;
    const s = WALK.steps[k];
    at = k;
    $$("button", stepsEl).forEach((b, i) => (i === k ? b.setAttribute("aria-current", "step") : b.removeAttribute("aria-current")));
    // Keep the current step in view where the steps are a row (narrow screens), without moving the page.
    const cur = $$("button", stepsEl)[k];
    stepsEl.scrollLeft = cur.offsetLeft - stepsEl.offsetLeft - stepsEl.clientWidth / 2 + cur.offsetWidth / 2;
    $("#prev-step").disabled = k === 0;
    $("#next-step").disabled = k === WALK.steps.length - 1;
    $("#stage-where").innerHTML = s.reader ? `reader <b>${s.reader}</b> · store <b>team</b>` : "store <b>team</b>";
    words(s);
    const tick = $("#tick"), lens = $("#lens");

    tick.hidden = !s.tick;
    if (s.tick) {
      tick.innerHTML = `<span class="chip settled">settled</span><span>tick of <b>decisions</b></span>` +
        `<span class="mono">covers ${s.tick.covers.map(rid).join(" ")}</span>` +
        `<span class="mono">current ${rid(s.heads[0])} · decisions ${s.count}</span>`;
      animate(tick, { opacity: [0, 1], transform: ["translateY(8px)", "translateY(0px)"] }, spring(320, 24));
    }

    if (!s.lens) {
      lens.hidden = true;
      paint(s, s.shown);
      slots(s, s.heads, s.count);
    } else {
      // Render, edit, parse, apply: the new record arrives only once the edit is applied.
      const prior = WALK.steps[k - 1];
      paint(prior, s.shown.filter((id) => prior.shown.includes(id)));
      slots(prior, prior.heads, prior.count);
      const text = $("#lens-text"), out = $("#lens-out");
      text.innerHTML = s.lens.before.join("\n");
      out.textContent = "";
      lens.hidden = false;
      animate(lens, { opacity: [0, 1], transform: ["translateY(18px)", "translateY(0px)"] }, spring(260, 24));
      await wait(1100); if (my !== token) return;
      const [open, body, close] = [s.lens.before[0], s.lens.before[1], s.lens.before[2]];
      text.innerHTML = `${open}\n<span class="gone">${body}</span>\n<span class="new">${s.lens.after[1]}</span>\n${close}`;
      animate($(".new", text), { opacity: [0, 1] }, { duration: 0.35 });
      await wait(1100); if (my !== token) return;
      out.innerHTML = s.lens.outcome;
      animate(out, { opacity: [0, 1] }, { duration: 0.35 });
      await wait(700); if (my !== token) return;
      paint(s, s.shown);
      slots(s, s.heads, s.count);
    }

    if (s.orders) {
      // Re-deliver in each order; the slots don't move.
      let j = 0;
      while (my === token) {
        const order = s.orders[j++ % s.orders.length];
        const line = $("#arrival");
        if (!line) return;
        line.textContent = `arrives: ${order.map(rid).join(" · ")}`;
        order.forEach((id, i) => animate(cards.get(id), { opacity: [0.15, 1], transform: ["translateY(-6px)", "translateY(0px)"] }, spring(420, 22, 0.14 * i)));
        if (!M) return;
        await wait(2600);
      }
    }
  }

  $("#prev-step").addEventListener("click", () => show(at - 1));
  $("#next-step").addEventListener("click", () => show(at + 1));
  $("#reset-walk").addEventListener("click", () => {
    for (const el of cards.values()) el.remove();
    cards.clear();
    show(0);
  });
  $("#stage").addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") { e.preventDefault(); show(at + 1); }
    if (e.key === "ArrowLeft") { e.preventDefault(); show(at - 1); }
  });
  $("#stage").tabIndex = 0;
  addEventListener("resize", () => { if (at >= 0) drawEdges(WALK.steps[at].shown.filter((id) => cards.has(id)), []); });
  show(0);

  // The matrix: a dot names what the verb does to the noun.
  const note = $("#matrix-note");
  const table = $(".matrix");
  const heads = $$("thead th", table);
  const tell = (td) => {
    const tr = td.parentElement;
    const col = [...tr.children].indexOf(td);
    $$(".hot, .col-hot", table).forEach((el) => el.classList.remove("hot", "col-hot"));
    td.classList.add("hot");
    heads[col].classList.add("col-hot");
    $$("tbody tr", table).forEach((r) => r.children[col].classList.add("col-hot"));
    note.innerHTML = `<b>${tr.firstElementChild.textContent}</b> × <b>${heads[col].textContent}</b>: ${$(".cell-t", td).textContent}`;
  };
  for (const td of $$("td.on", table)) {
    td.tabIndex = 0;
    td.addEventListener("mouseenter", () => tell(td));
    td.addEventListener("focus", () => tell(td));
    td.addEventListener("click", () => tell(td));
  }
})();
