import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { parseGuide } from "./guide.mjs";
import { renderFront } from "./render.mjs";

const root = fileURLToPath(new URL("../../", import.meta.url));
const source = readFileSync(new URL("../../GUIDE.md", import.meta.url), "utf8");
function fences(doc) {
  const lines = doc.split("\n"), blocks = [];
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/^(`{3,})(?:[\w+-]*) *$/);
    if (!match) continue;
    const start = ++i;
    while (i < lines.length && lines[i] !== match[1]) i++;
    assert.ok(i < lines.length, "unclosed fence at line " + start);
    blocks.push({ start, text: lines.slice(start, i).join("\n") });
  }
  return blocks;
}

// fixtures/guide-runs.txt holds the commands and outputs of runs that were made, with the
// release they were made on. A block in the guide must be one of them, whole or as a
// contiguous part. When the command changes what it prints, run it, record the run in the
// fixture, and then change the guide.
test("every fenced command or output in the guide is part of a recorded run", () => {
  const original = fences(readFileSync(new URL("./fixtures/guide-runs.txt", import.meta.url), "utf8"));
  assert.equal(original.length, 59);
  const blocks = fences(source);
  assert.equal(blocks.length, 61);
  for (const b of blocks) assert.ok(original.some((old) => old.text.includes(b.text)),
    `GUIDE.md:${b.start}: missing from original code blocks\n${b.text}`);
});

test("every component refuses an unclosed marker and reports its source line", () => {
  const names = new Set([...source.matchAll(/^<!-- guide:([a-z ]+) -->$/gm)].map((m) => m[1]));
  names.delete("end");
  for (const name of names) assert.throws(() => parseGuide("\n<!-- guide:" + name + " -->"),
    { message: "GUIDE.md:2: unclosed guide:" + name });
  assert.throws(() => parseGuide("\n<!-- guide:unknown -->"), /GUIDE.md:2: unknown guide marker/);
  assert.throws(() => parseGuide("\n<!-- guide:book missing -->"), /GUIDE.md:2: unknown guide marker/);
  assert.throws(() => parseGuide("\n<!-- guide:end -->"), /GUIDE.md:2: guide:end has no opening marker/);
});

test("a stepper must contain steps", () => {
  assert.throws(() => parseGuide(source.replace(/(<!-- guide:stepper -->)[\s\S]*?(<!-- guide:end -->)/, "$1\n$2")),
    /GUIDE.md:\d+: stepper has no steps/);
});

test("changes in the Markdown reach both the markup and the interactive data", () => {
  const edited = parseGuide(source.replace("#### 1. Make a key and a store", "#### 1. Make a store")
    .replace("**The store is empty**", "**An empty store**")
    .replace("A thing with a key. `loops emit kiln", "A named thing. `loops emit kiln"));
  assert.match(edited.html, /class="fn">1<\/span><span>Make a store</);
  assert.match(edited.html, /id="fsay">An empty store</);
  assert.equal(edited.data.G_FIRST.steps[0].say, "An empty store");
  assert.match(edited.data.G_ANNOT.members.kiln[1], /^A named thing\./);
});

test("a component with its contents removed identifies the bad section", () => {
  const names = ["sets", "shapes", "envelope", "more", "questions", "annotated members", "annotated spec",
    "diagram headsfig", "diagram judgefig", "diagram turnfig", "diagram wordings",
    "book sources", "book draft", "book fork", "book settled", "book null", "book final"];
  for (const name of names) {
    const doc = "# Guide\n\nIntroduction.\n\n1. First store.\n\n## First store\n\n" +
      `<!-- guide:${name} -->\n<!-- guide:end -->`;
    assert.throws(() => parseGuide(doc), /^Error: GUIDE\.md:9:/, name);
  }
});

test("paragraph hints reach the view and its step notes", () => {
  const edited = parseGuide(source.replace('append="Pick one to see what it does to the kiln."', 'append="Try a case."'));
  assert.match(edited.html, /different records\. Try a case\.<\/p>/);
  assert.match(edited.html, /cone didn't\. Point at a field in the reading/);
  assert.doesNotMatch(edited.html, /The reading lists the record/);
  assert.match(edited.data.G_STEP_NOTES[3][0], /^The faint fields are no longer read\. The second record/);
});
