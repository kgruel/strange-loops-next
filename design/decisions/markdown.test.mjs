import assert from "node:assert/strict";
import test from "node:test";
import { renderMarkdown } from "./markdown.mjs";

const render = (text) => renderMarkdown(text, "note.md");

test("headings use visible words, punctuation-free ids and page-local suffixes", () => {
  const { headings, html } = render("### TK4: `covers` lists every record that was folded\n" +
    "## [Ångström](#x) — *MeV!*\n## A\n## A\n## A-1\n## A");
  assert.deepEqual(headings.map((h) => h.id), [
    "tk4-covers-lists-every-record-that-was-folded", "ångström--mev", "a", "a-1", "a-1-1", "a-2",
  ]);
  assert.match(html, /<h3 id="[^"]+">TK4: <code>covers<\/code>/);
  assert.equal(render("## A").headings[0].id, "a");
});

test("soft lines, emphasis, code and links keep their meaning and source locations", () => {
  const calls = [];
  const { html } = renderMarkdown('Text & <b>\n**Read `*_ref`** and *the [`note`](a.md)*.\n\n`[skip](b)`', "test.md", (href, line) => {
    calls.push([href, line]);
    return 'x?a=1&b="2"';
  });
  assert.equal(html, '<p>Text &amp; &lt;b&gt;\n<strong>Read <code>*_ref</code></strong> and ' +
    '<em>the <a href="x?a=1&amp;b=&quot;2&quot;"><code>note</code></a></em>.</p>\n<p><code>[skip](b)</code></p>');
  assert.deepEqual(calls, [["a.md", 2]]);
});

test("numbered and bulleted sublists, continued prose and dedented paragraphs", () => {
  const { html } = render("- Parent\n  continued\n  2. Child\n     - Grandchild\n\n  Parent again.\n- Next\n\nOutside.");
  assert.equal(html, '<ul>\n<li><p>Parent\ncontinued</p>\n<ol start="2">\n<li><p>Child</p>\n' +
    '<ul>\n<li><p>Grandchild</p></li>\n</ul></li>\n</ol>\n<p>Parent again.</p></li>\n<li><p>Next</p></li>\n</ul>\n<p>Outside.</p>');
});

test("tables keep empty cells, alignment, formatting and escaped pipes", () => {
  const { html } = render('| | **middle** | right |\n|:---|:---:|---:|\n| a\\|b | `2` | 3 |');
  assert.match(html, /<th scope="col" class="align-left"><\/th><th scope="col" class="align-center"><strong>middle<\/strong>/);
  assert.match(html, /<td class="align-left">a\|b<\/td><td class="align-center"><code>2<\/code><\/td><td class="align-right">3/);
});

test("fences preserve indentation, blank lines and literal markup", () => {
  assert.equal(render('```lean\n  | "x" < 2\n\n# **A** & [b](c)\n```').html,
    '<pre><code class="language-lean">  | &quot;x&quot; &lt; 2\n\n# **A** &amp; [b](c)\n</code></pre>');
  assert.equal(render('<script>alert("hello")</script>').html, '<p>&lt;script&gt;alert(&quot;hello&quot;)&lt;/script&gt;</p>');
});

test("unknown blocks inside prose or lists and malformed supported blocks name their line", () => {
  for (const block of ["> quote", "    indented code", "---", "* * *", "===", "[ref]: target", "~~~js", "- [x] done", "::: tip", "!!! warning", "[[_TOC_]]", "$$"]) {
    assert.throws(() => render("Intro\n" + block), /note\.md:2: unsupported Markdown block/);
  }
  assert.throws(() => render("- item\n  > nested"), /note\.md:2: unsupported Markdown block/);
  assert.throws(() => render("Intro\n```\nunclosed"), /note\.md:2: unclosed code fence/);
  assert.throws(() => render("| a |\n| x |"), /note\.md:2: invalid table alignment/);
  assert.throws(() => render("| a |\n|---|\n| x | y |"), /note\.md:3: expected 1 table columns/);
});

test("a guide marker takes its own line, and is literal inside code or prose", () => {
  const { html } = render("Before\n<!-- guide:annotated spec -->\nAfter\n<!-- guide:end -->\n" +
    "\n```\n<!-- guide:end -->\n```\nInline <!-- guide:end --> stays.\n<!-- ordinary comment -->");
  assert.equal(html, "<p>Before</p>\n<p>After</p>\n<pre><code>&lt;!-- guide:end --&gt;\n</code></pre>\n" +
    "<p>Inline &lt;!-- guide:end --&gt; stays.\n&lt;!-- ordinary comment --&gt;</p>");
});
