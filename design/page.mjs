// The shell the site's pages share: one placeholder per generated block, the header
// that links the pages, and the document around them. Pages built on this one are
// served only on projects.gruel.world, so they may load pinned libraries from a CDN.

import { readFileSync } from "node:fs";
import { join } from "node:path";

// One placeholder line per generated block; each must appear exactly once.
export function fill(text, name, value) {
  const mark = `<!-- build:${name} -->\n`;
  if (text.split(mark).length !== 2) throw new Error(`expected one ${mark.trim()}`);
  return text.replace(mark, () => value);
}

// The pages, in the order the header lists them, and the sections each one names.
export const PAGES = [
  { id: "grammar", name: "Grammar" },
  { id: "laws", name: "Laws" },
];

export function header(current, sections) {
  const pages = PAGES.map((p) =>
    `<a class="page" href="../${p.id}/"${p.id === current ? ' aria-current="page"' : ""}>${p.name}</a>`).join("");
  const seg = sections.map(([id, name]) => `<a href="#${id}">${name}</a>`).join("");
  return `<header class="top">
  <div class="wrap top-row">
    <p class="mark"><a href="../rethink/">Strange Loops</a>${pages}</p>
    <nav class="seg" aria-label="Sections">
      ${seg}
    </nav>
  </div>
</header>
`;
}

export function documentOf(root, { head, css, body, scripts }) {
  const register = readFileSync(join(root, "design", "register.css"), "utf8");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow">
${head}<style>
${register}
${css}</style>
</head>
<body>
${body}
${scripts.map((s) => `<script>\n${s}</script>\n`).join("")}</body>
</html>
`;
}
