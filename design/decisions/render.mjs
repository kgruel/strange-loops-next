import { readFileSync } from "node:fs";
import { join } from "node:path";
import { documentOf, header } from "../page.mjs";
import { rewriteLink, workingDocuments } from "./links.mjs";
import { escapeHtml, renderMarkdown } from "./markdown.mjs";

export function renderDecisions(root, siteUrl) {
  const documents = workingDocuments(root);

  const pages = [...documents].map(([source, filename]) => {
    const links = new Map();
    const rewrite = (href, line) => {
      const url = rewriteLink(root, documents, source, line, href);
      links.set(url, `${source}:${line}: link ${href}`);
      return url;
    };
    const { html, headings } = renderMarkdown(readFileSync(join(root, source), "utf8"), source, rewrite);
    const title = headings.find((h) => h.level === 1)?.title ?? source;
    return { source, filename, links, html, headings, title };
  });

  const css = readFileSync(join(root, "design", "decisions", "styles.css"), "utf8");
  return pages.map(({ source, filename, title, links, headings, html }) => {
    const nav = pages.map((p) =>
      `<a href="${encodeURIComponent(p.filename)}"${p.filename === filename ? ' aria-current="page"' : ""}>${escapeHtml(p.title)}</a>`).join("\n");
    const sections = headings.filter((h) => h.level === 2);
    const contents = sections.length ? `<details class="contents"><summary>On this page</summary>
<ul>${sections.map((h) => `<li><a href="#${h.id}">${escapeHtml(h.title)}</a></li>`).join("\n")}</ul></details>` : "";
    const body = `${header("decisions", [])}
<main class="wrap reader">
<nav class="documents" aria-label="Documents">${nav}</nav>
<p class="source">Rendered from <code>${escapeHtml(source)}</code> in the repository.</p>
${contents}
<article>
${html}
</article>
</main>`;
    const canonical = source === "GUIDE.md" ? null : new URL(`decisions/${encodeURIComponent(filename)}`, siteUrl).href;
    const head = `<title>${escapeHtml(title)} · Strange Loops</title>\n`;
    const text = documentOf(root, { head, css, body, scripts: [], canonical });
    return [join(root, "out", "decisions", filename), text, links, canonical];
  });
}
