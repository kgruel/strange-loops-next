import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { appendFileSync, cpSync, mkdtempSync, readdirSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));

test("the front page and a rethink tab can link to each other", (t) => {
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
});

test("the front page says what it is in its head, and is open to indexing", async () => {
  const { frontPage, SITE } = await import("./render.mjs");
  const root = fileURLToPath(new URL("../../", import.meta.url));
  const html = frontPage(root).html;
  const head = html.slice(0, html.indexOf("</head>"));
  const body = html.slice(html.indexOf("<body>"));
  assert.match(head, /<title>[^<]+<\/title>/);
  assert.ok(head.includes(`<link rel="canonical" href="${SITE.url}">`));
  assert.ok(head.includes('<meta name="description" content="'));
  assert.ok(SITE.description.length <= 240, "a description a search result can show");
  assert.ok(!/name="robots"/.test(html), "no robots tag: the page may be indexed");
  assert.ok(!/<title>|name="description"/.test(body), "nothing a crawler reads from the head is left in the body");
  assert.ok(!/https?:\/\/[^"']*\.(?:googleapis|gstatic)\.com/.test(html), "no request to a font host");
  JSON.parse(head.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
});
