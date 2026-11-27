import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { appendFileSync, cpSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { SITE, VIEWS } from "./render.mjs";

const root = fileURLToPath(new URL("../../", import.meta.url));

test("the build publishes the view addresses and discovery files", async (t) => {
  const work = mkdtempSync(join(tmpdir(), "front-links-"));
  t.after(() => rmSync(work, { recursive: true, force: true }));
  cpSync(join(root, "design"), join(work, "design"), { recursive: true });
  for (const name of readdirSync(root)) {
    if (!name.startsWith(".") && name !== "design" && name !== "out")
      symlinkSync(join(root, name), join(work, name));
  }
  const targets = ["../", "../#grammar", "../#g-start", "../#is3", "../#n-record",
    "../#law-count-perm", "../#ev-count-perm", "../#q-limits", "../#h-q-limits", "../#prem-lens-put-get"];
  appendFileSync(join(work, "design/rethink/top.html"), targets.map((href) => `<a href="${href}">Read</a>`).join("\n"));
  appendFileSync(join(work, "design/front/shell.html"), '<a href="rethink/#horizons/h-lsp">Horizons</a>');
  const result = spawnSync(process.execPath, [join(work, "design/build.mjs")], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  const output = join(work, "out");
  const read = (path) => readFileSync(join(output, path), "utf8");

  await t.test("each copy opens on its view and links to the site from its own depth", () => {
    assert.equal(new Set(Object.values(VIEWS).map(({ title }) => title)).size, 5);
    for (const [view, folder] of [["grammar", ""], ...Object.keys(VIEWS).map((view) => [view, view + "/"])]) {
      const html = read(folder + "index.html");
      const prefix = folder ? "../" : "";
      const canonical = SITE.url + (view === "grammar" ? "" : folder);
      assert.ok(html.includes(`<html lang="en" data-view="${view}">`));
      assert.ok(html.includes(`<title>${VIEWS[view].title}</title>`));
      assert.ok(html.includes(`<meta name="description" content="${VIEWS[view].description}">`));
      assert.ok(html.includes(`<link rel="canonical" href="${canonical}">`));
      assert.doesNotMatch(html, /<base\b/);
      for (const target of ["grammar", "guide", "laws", "evidence", "decisions"]) {
        const href = prefix + target + "/";
        assert.ok(html.includes(`href="${href}" data-view="${target}"`));
        assert.ok(statSync(join(output, folder, href, "index.html")).isFile());
      }
      assert.ok(html.includes(`href="${prefix}rethink/#horizons/h-lsp"`));
      assert.ok(html.includes(`href="${prefix}decisions/decisions.html">The decisions file, as written`));
      assert.ok(html.includes(`href=\\"${prefix}decisions/changelog.html\\"`), "a link in script data");
      for (const [, href] of html.matchAll(/url\(([^)]+\.woff2)\)/g)) {
        assert.ok(href.startsWith(prefix + "fonts/"));
        assert.ok(statSync(join(output, folder, href)).isFile());
      }
    }
  });

  await t.test("the sitemap lists exactly the canonical, indexable pages", () => {
    const notePages = readdirSync(join(output, "decisions")).filter((name) => /^note-.*\.html$/.test(name));
    const documents = ["decisions.html", "changelog.html", "roadmap.html", ...notePages].map((name) => "decisions/" + name);
    const indexable = ["", "guide/", "laws/", "evidence/", "decisions/", ...documents];
    const sitemap = read("sitemap.xml");
    const locations = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(([, url]) => url);
    assert.deepEqual(locations.sort(), indexable.map((path) => SITE.url + path).sort());
    assert.doesNotMatch(sitemap, /<lastmod>/);
    for (const path of indexable) {
      const html = read(path.endsWith(".html") ? path : path + "index.html");
      assert.doesNotMatch(html, /name="robots"/);
      assert.ok(html.includes(`<link rel="canonical" href="${SITE.url + path}">`));
    }
    for (const path of ["rethink/index.html", "decisions/guide.html"])
      assert.match(read(path), /name="robots" content="noindex, nofollow"/);
    assert.match(read("decisions/decisions.html"), /href="decisions\.html" aria-current="page">Decisions<\/a>/);
    assert.match(read("decisions/roadmap.html"), /href="decisions\.html">DECISIONS\.md<\/a>/);
    assert.match(read("rethink/index.html"), /href="\.\.\/decisions\/decisions\.html">the decisions<\/a>/);
    assert.match(read("rethink/index.html"), /href="\.\.\/decisions\/decisions\.html">the Decisions page<\/a>/);
  });

  await t.test("llms.txt gives the raw files, including every protocol Markdown file", () => {
    const llms = read("llms.txt");
    assert.match(llms, /^# Strange Loops\n\n> .+\n\n## /);
    const raw = "https://raw.githubusercontent.com/kgruel/strange-loops-next/main/";
    const paths = [];
    const links = [...llms.matchAll(/^- \[[^\]]+\]\(([^)]+)\): (.+)$/gm)].map(([, url]) => url);
    assert.equal(links.length, llms.match(/^- /gm).length, "each link has a description");
    for (const url of links) {
      if (url === SITE.repository + "/releases") continue;
      assert.ok(url.startsWith(raw), url);
      const path = decodeURIComponent(url.slice(raw.length));
      assert.ok(statSync(join(work, path)).isFile(), path);
      paths.push(path);
    }
    assert.equal(links.filter((url) => url === SITE.repository + "/releases").length, 1);
    const protocol = readdirSync(join(root, "protocol"), { recursive: true, withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
      .map((entry) => relative(root, join(entry.parentPath, entry.name)));
    const expected = ["GUIDE.md", "README.md", "DECISIONS.md", "CHANGELOG.md", "ROADMAP.md",
      "design/laws/laws.json", "design/front/grammar.json", ...protocol];
    assert.deepEqual(paths.sort(), expected.sort());
  });
});

test("the front page says what it is in its head, and is open to indexing", async () => {
  const { frontPage } = await import("./render.mjs");
  const html = frontPage(root).html;
  const head = html.slice(0, html.indexOf("</head>"));
  const body = html.slice(html.indexOf("<body>"));
  assert.match(head, /<title>[^<]+<\/title>/);
  assert.ok(head.includes(`<link rel="canonical" href="${SITE.url}">`));
  assert.ok(head.includes('<meta name="description" content="'));
  for (const { description } of Object.values(VIEWS))
    assert.ok(description.length <= 240, "a description a search result can show");
  assert.ok(!/name="robots"/.test(html), "no robots tag: the page may be indexed");
  assert.ok(!/<title>|name="description"/.test(body), "nothing a crawler reads from the head is left in the body");
  assert.ok(!/https?:\/\/[^"']*\.(?:googleapis|gstatic)\.com/.test(html), "no request to a font host");
  JSON.parse(head.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
});
