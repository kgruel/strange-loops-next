// The block grammar used by the working documents. Keep source line numbers through
// list indentation, table cells and inline links so a refusal identifies the edit.
export const escapeHtml = (s) => s.replaceAll("&", "&amp;").replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;").replaceAll('"', "&quot;");

const heading = /^(#{1,6}) +(.+?) *(?: +#+ *)?$/;
const fence = /^(`{3,})([\w+-]*) *$/;
const marker = /^([-+*]|\d{1,9}[.)])( +)(.*)$/;
const guideComment = /^<!-- guide:[a-z][a-z-]*(?: [a-z][a-z-]*)? -->$/;
const table = /^\|/;
// Recognize block starters even inside a paragraph or list. Only ordinary
// prose reaches the paragraph fallback. Raw HTML goes through text escaping.
const unsupported = [
  /^\s|^>|^`{3,}|^~{3,}/,                                  // indentation, quote, unsupported fence
  /^(?:(?:-\s*)+|(?:\*\s*){3,}|(?:_\s*){3,}|=+)$/,         // breaks and setext headings
  /^\[[^\]]+\]:|^!\[|^\[\[?_TOC_\]?\]$/i,                   // definitions, images, generated contents
  /^:{3,}|^:{1,2} |^\$\$|^\+{3,}$|^!!!(?: |$)/,             // directives, definitions, math, metadata
  /^:?-+:?\s*\||^#{1,6}$|^(?:[+*]|\d{1,9}[.)])$/,           // unsupported table, empty heading or item
];
const unsupportedBlock = (s) => unsupported.some((start) => start.test(s));
const beginsBlock = (s) => !s.trim() || guideComment.test(s.trimEnd()) || heading.test(s) || marker.test(s) || table.test(s) || unsupportedBlock(s);

// Code is opaque, including stars and link-shaped text. Keep the visible text
// alongside the HTML: titles, navigation labels and heading ids all use it.
export function inline(source, line, rewrite) {
  let html = "", plain = "";
  function append(value, markup = escapeHtml(value)) {
    html += markup;
    plain += value;
  }
  const token = /(`+)([\s\S]*?)\1(?!`)|\[((?:`[^`]*`|[^\]`\n])*)\]\(([^\s()]*(?:\([^()\s]*\)[^\s()]*)*)\)|(\*\*|__|\*|_)/g;
  let end = 0;
  for (let m; (m = token.exec(source)); end = token.lastIndex) {
    append(source.slice(end, m.index));
    const tokenLine = line + source.slice(0, m.index).split("\n").length - 1;
    const nested = (text) => inline(text, tokenLine, rewrite);
    if (m[1]) {
      append(m[2], `<code>${escapeHtml(m[2])}</code>`);
    } else if (m[3] !== undefined) {
      const label = nested(m[3]);
      const href = rewrite(m[4], tokenLine);
      append(label.plain, `<a href="${escapeHtml(href)}">${label.html}</a>`);
    } else {
      const mark = m[5];
      // Skip code spans while finding the matching emphasis delimiter.
      const rest = source.slice(token.lastIndex);
      const close = /(`+)[\s\S]*?\1(?!`)|(\*+|_+)/g;
      let match;
      if (/^\S/.test(rest) && !(mark.startsWith("_") && /\w/.test(source[m.index - 1] ?? ""))) {
        while ((match = close.exec(rest))) {
          if (match[2] === mark && match.index > 0 && /\S/.test(rest[match.index - 1])) break;
        }
      }
      if (match) {
        const content = nested(rest.slice(0, match.index));
        const tag = mark.length === 2 ? "strong" : "em";
        append(content.plain, `<${tag}>${content.html}</${tag}>`);
        token.lastIndex += close.lastIndex;
      } else append(mark);
    }
  }
  append(source.slice(end));
  return { html, plain };
}

export function renderMarkdown(source, file, rewrite = (href) => href) {
  const headings = [], used = new Set();
  const fail = (line, why) => { throw new Error(`${file}:${line}: ${why}`); };
  const span = (s, line) => inline(s, line, rewrite);
  const cellTexts = (row, line) => {
    if (!row.endsWith("|")) fail(line, "table row needs a closing pipe");
    return row.slice(1, -1).split(/(?<!\\)\|/).map((s) => s.trim().replaceAll("\\|", "|"));
  };

  // Each recursive call reads one list item's blocks after removing its marker
  // indentation. This also puts a paragraph after a sublist back in its parent.
  function blocks(lines, firstLine) {
    const out = [];
    let i = 0;
    while (i < lines.length) {
      const line = firstLine + i;
      const s = lines[i++].trimEnd();
      if (!s || guideComment.test(s)) continue;
      const h = s.match(heading), f = s.match(fence), item = s.match(marker);
      if (h) {
        const { html, plain } = span(h[2], line);
        const base = plain.trim().toLowerCase().replace(/[^\p{L}\p{M}\p{N} -]/gu, "").replaceAll(" ", "-");
        let id = base;
        for (let n = 1; used.has(id); n++) id = `${base}-${n}`;
        used.add(id);
        headings.push({ level: h[1].length, id, title: plain });
        out.push(`<h${h[1].length} id="${id}">${html}</h${h[1].length}>`);
      } else if (f) {
        const from = i, close = new RegExp("^`{" + f[1].length + ",} *$");
        while (i < lines.length && !close.test(lines[i])) i++;
        if (i === lines.length) fail(line, "unclosed code fence");
        const code = lines.slice(from, i++).join("\n");
        out.push(`<pre><code${f[2] ? ` class="language-${f[2]}"` : ""}>${escapeHtml(code)}\n</code></pre>`);
      } else if (table.test(s)) {
        const cells = cellTexts(s, line);
        if (!table.test(lines[i])) fail(line, "table needs an alignment row");
        const align = cellTexts(lines[i++].trimEnd(), line + 1);
        if (align.length !== cells.length || align.some((a) => !/^:?-+:?$/.test(a)))
          fail(line + 1, "invalid table alignment row");
        const alignment = align.map((a) => {
          if (a.endsWith(":")) return a.startsWith(":") ? "center" : "right";
          return a.startsWith(":") ? "left" : "";
        });
        const row = (cells, tag, n) => {
          if (cells.length !== align.length) fail(n, `expected ${align.length} table columns, found ${cells.length}`);
          const scope = tag === "th" ? ' scope="col"' : "";
          return "<tr>" + cells.map((cell, j) => {
            const cls = alignment[j] ? ` class="align-${alignment[j]}"` : "";
            return `<${tag}${scope}${cls}>${span(cell, n).html}</${tag}>`;
          }).join("") + "</tr>";
        };
        const rows = [];
        while (i < lines.length && table.test(lines[i])) {
          rows.push(row(cellTexts(lines[i].trimEnd(), firstLine + i), "td", firstLine + i));
          i++;
        }
        out.push(`<div class="table-scroll" tabindex="0"><table><thead>${row(cells, "th", line)}</thead>\n<tbody>\n${rows.join("\n")}\n</tbody></table></div>`);
      } else if (unsupportedBlock(s)) {
        fail(line, `unsupported Markdown block: ${s}`);
      } else if (item) {
        const kind = item[1].at(-1), ordered = /[.)]/.test(kind);
        const tag = ordered ? "ol" : "ul";
        const start = ordered ? parseInt(item[1], 10) : 1;
        const items = [];
        let next = item;
        while (true) {
          const itemLine = firstLine + i - 1;
          if (/^\[[ xX]\](?: |$)/.test(next[3])) fail(itemLine, "unsupported Markdown block: task list");
          const indent = " ".repeat(next[1].length + next[2].length);
          const content = [next[3]];
          while (i < lines.length) {
            if (lines[i].startsWith(indent)) content.push(lines[i++].slice(indent.length));
            else if (!lines[i].trim()) content.push(lines[i++]);
            else if (content.at(-1).trim() && !beginsBlock(lines[i])) content.push(lines[i++]);
            else break;
          }
          items.push(`<li>${blocks(content, itemLine)}</li>`);
          next = lines[i]?.match(marker);
          if (next?.[1].at(-1) !== kind || unsupportedBlock(lines[i])) break;
          i++;
        }
        out.push(`<${tag}${start !== 1 ? ` start="${start}"` : ""}>\n${items.join("\n")}\n</${tag}>`);
      } else {
        const paragraph = [s];
        while (i < lines.length && !beginsBlock(lines[i])) paragraph.push(lines[i++].trimEnd());
        out.push(`<p>${span(paragraph.join("\n"), line).html}</p>`);
      }
    }
    return out.join("\n");
  }
  const html = blocks(source.replaceAll("\r\n", "\n").split("\n"), 1);
  return { html, headings };
}
