// What every page built on design/page.mjs does: a .pan says whether there is more of it to
// the right, so its fade shows exactly while there is (design/register.css).
(() => {
  for (const pan of document.querySelectorAll(".pan")) {
    const s = pan.firstElementChild;
    const more = () => pan.classList.toggle("is-more", s.scrollLeft + s.clientWidth < s.scrollWidth - 1);
    s.addEventListener("scroll", more, { passive: true });
    addEventListener("resize", more);
    more();
  }
})();
