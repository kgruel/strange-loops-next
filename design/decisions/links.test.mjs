import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, readdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { rewriteLink } from "./links.mjs";

const root = fileURLToPath(new URL("../../", import.meta.url));
const pages = new Map([["ROADMAP.md", "roadmap.html"], ["notes/retained-boundaries.md", "note-retained-boundaries.html"]]);
const rewrite = (href) => rewriteLink(root, pages, "notes/retained-boundaries.md", 12, href);

test("destinations are relative to the Markdown source, including sibling and parent links", () => {
  assert.equal(rewrite("../ROADMAP.md#next"), "roadmap.html#next");
  assert.equal(rewrite("./retained-boundaries.md"), "note-retained-boundaries.html");
  assert.equal(rewrite("../design/rethink/sections/15-horizons.html"), "../rethink/#horizons");
  assert.equal(rewrite("../design/rethink/sections/15-horizons.html#h-lsp"), "../rethink/#horizons/h-lsp");
  assert.equal(rewrite("../protocol/spec.md#slots"), "https://github.com/kgruel/strange-loops-next/blob/main/protocol/spec.md#slots");
  assert.equal(rewrite("../design/laws/"), "https://github.com/kgruel/strange-loops-next/tree/main/design/laws");
  for (const url of ["#local", "https://example.org/a?b=2&c=3#d", "http://example.org"]) assert.equal(rewrite(url), url);
});

test("standalone page links keep their place on the front page", () => {
  for (const view of ["grammar", "laws", "evidence"])
    assert.equal(rewrite(`../${view}/`), `../#${view}`);
  for (const [old, place] of [
    ["../grammar/#noun-record", "n-record"], ["../laws/#law-record-erasure", "law-record-erasure"],
    ["../laws/#q-limits", "q-limits"], ["../laws/#h-q-limits", "h-q-limits"],
    ["../laws/#without-lens-put-get", "prem-lens-put-get"], ["../evidence/#law-record-erasure", "ev-record-erasure"],
    ["../out/laws/index.html#law-record-erasure", "law-record-erasure"],
  ]) assert.equal(rewrite(old), "../#" + place);
  assert.throws(() => rewrite("../laws/#rotor"), /no matching front-page anchor/);
});

test("a missing or out-of-repository path gives the source line and original link", () => {
  assert.throws(() => rewrite("lost.md#topic"), /notes\/retained-boundaries.md:12: link lost.md#topic: repository path does not exist/);
  for (const url of ["../../other", "javascript:alert(1)", "//other.example/file", "/root", "%zz"])
    assert.throws(() => rewrite(url), /retained-boundaries.md:12: link/);
});

test("a new note gets its own page, navigation and checked fragments, and disappears when removed", (t) => {
  const work = mkdtempSync(join(root, ".decisions-test-"));
  t.after(() => rmSync(work, { recursive: true, force: true }));
  // The build locates the repository from its module path. Copy design/ so
  // it writes inside the fixture, and share the read-only protocol inputs.
  cpSync(join(root, "design"), join(work, "design"), { recursive: true });
  // The other pages link to headings of the real documents, and the documents link to
  // files across the repository, so the fixture holds the real ones beside the new note.
  for (const name of readdirSync(root)) {
    if (name === "design" || name === "out" || name === "notes" || name.startsWith(".")) continue;
    symlinkSync(join(root, name), join(work, name));
  }
  cpSync(join(root, "notes"), join(work, "notes"), { recursive: true });
  const note = join(work, "notes/A note.md");
  const build = () => spawnSync(process.execPath, [join(work, "design/build.mjs")], { encoding: "utf8" });
  writeFileSync(note, "# New note\n## Here\n[Here](#here)");
  let result = build();
  assert.equal(result.status, 0, result.stderr);
  const published = join(work, "out/decisions/note-A note.html");
  assert.match(readFileSync(published, "utf8"), /href="note-A%20note.html" aria-current="page">New note/);
  for (const href of ["#absent", "../ROADMAP.md#absent", "../design/rethink/sections/15-horizons.html#absent",
    "../laws/#law-no-such-law", "../grammar/#noun-no-such-noun", "../evidence/#law-no-such-law"]) {
    writeFileSync(note, `# New note\n\n[missing](${href})`);
    result = build();
    assert.notEqual(result.status, 0);
    assert.ok(result.stderr.includes("notes/A note.md:3: link " + href), result.stderr);
  }
  rmSync(note);
  result = build();
  assert.equal(result.status, 0, result.stderr);
  assert.throws(() => readFileSync(published), { code: "ENOENT" });
});
