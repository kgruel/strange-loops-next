// The shape figures in motion: when a figure scrolls into view it plays once, showing what it
// means (records flowing down the lanes into the state, the loop traced, the gate sorting).
// Every figure is complete without this; the motion only replays how it got there. What to play
// is marked on the figure itself by shapes.mjs, so this knows no shape:
//   data-m="in"     fades and slides into place       data-m="draw"  its stroke is drawn
//   data-m="pulse"  settles, once it has been reached  data-m="pop"   appears with a small spring
//   data-m="go"     a dot travels data-pts, then goes
// each after data-at seconds. Inlined as a classic script before app.js, which calls
// animateShapes(document, animate) with Motion's animate or its fallback of the same signature.
// Under reduced motion it does nothing.
function animateShapes(root, animate) {
  if (!("IntersectionObserver" in window) || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) { io.unobserve(e.target); playShape(e.target, animate); }
  }, { threshold: 0.6 });
  for (const svg of root.querySelectorAll("svg.shape-fig")) io.observe(svg);
}

// Motion animates opacity and stroke-dashoffset on SVG elements as attributes, not styles, so
// the start is set as an attribute too: a style would outrank the attribute Motion moves. The
// fallback writes styles, which outrank these starts, so without Motion all lands at its end.
function playShape(svg, animate) {
  for (const el of svg.querySelectorAll("[data-m]")) {
    const delay = Number(el.dataset.at || 0);
    switch (el.dataset.m) {
      case "in":
        // Set the start at once, so nothing shows in its end place while it waits its turn.
        el.setAttribute("opacity", "0");
        animate(el, { opacity: [0, 1], transform: ["translateX(-8px)", "translateX(0px)"] }, { duration: 0.35, delay, ease: "easeOut" });
        break;
      case "draw":
        // The wires carry pathLength="1", so one dash of length 1 is the whole line.
        el.setAttribute("stroke-dasharray", "1 1");
        el.setAttribute("stroke-dashoffset", "1");
        animate(el, { strokeDashoffset: [1, 0] }, { duration: 0.45, delay, ease: "easeInOut" }).then(() => {
          el.removeAttribute("stroke-dasharray"); el.removeAttribute("stroke-dashoffset"); el.style.strokeDashoffset = "";
        });
        break;
      case "pop":
        el.setAttribute("opacity", "0");
        animate(el, { opacity: [0, 1], transform: ["scale(0.85)", "scale(1)"] }, { type: "spring", stiffness: 380, damping: 20, delay });
        break;
      case "pulse":
        animate(el, { transform: ["scale(1)", "scale(1.04)", "scale(1)"] }, { duration: 0.45, delay });
        break;
      case "go": {
        const pts = el.dataset.pts.split(" ").map((p) => `translate(${p.split(",").map((v) => `${v}px`).join(", ")})`);
        const fade = pts.map((_, i) => (i === 0 || i === pts.length - 1 ? 0 : 1));
        animate(el, { transform: pts, opacity: fade }, { duration: 0.22 * (pts.length - 1) + 0.2, delay, ease: "easeInOut" });
        break;
      }
    }
  }
}
