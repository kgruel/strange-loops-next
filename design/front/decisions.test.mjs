import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { readDecisions } from "./decisions.mjs";

const repo = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const keep = (source, line, href) => href;

const GOOD = `# Decisions

## Identity

"Today" is the \`loops\` binary built from main at \`c483cb9\`.

**What needs ruling first.** IS1 is what a trial needs.

### IS1: what a thing means

*From SL1.*

**Question.** More of what?

**Example, run today.** A lead wrote:

\`\`\`
$ loops emit a | b
\`\`\`

One head.

| | Standing is | Cost |
| --- | --- | --- |
| A | A rank, written \`a | b\`. | Nothing. |
| **B (recommended by the coordinator)** | Counted. | A scope. |

**With it.** A thing follows.

**Changes:** what a grant holds.

## Ruled
`;

function read(text) {
  const root = mkdtempSync(join(tmpdir(), "front-decisions-"));
  writeFileSync(join(root, "DECISIONS.md"), text);
  return readDecisions(root, keep);
}

test("an entry is read in the file's own words", () => {
  const { entries: [e], at } = read(GOOD);
  assert.equal(at, "c483cb9");
  assert.deepEqual([e.id, e.trial, e.title, e.from, e.ask, e.changes], ["IS1", true, "What a thing means", "From SL1.", "More of what?", "what a grant holds."]);
  assert.equal(e.run, "$ loops emit a | b");
  assert.deepEqual(e.before, [{ text: "One head." }]);
  assert.deepEqual(e.after, [{ label: "With it", text: "A thing follows." }]);
  assert.deepEqual(e.options, [
    { k: "A", choice: "A rank, written <code>a | b</code>.", cost: "Nothing." },
    { k: "B", choice: "Counted.", cost: "A scope.", label: "Recommended by the coordinator", rec: true },
  ]);
});

test("an entry that does not fit stops the build and names its line", () => {
  assert.throws(() => read(GOOD.replace("**Question.** More of what?\n\n", "")), /DECISIONS\.md:9: IS1 has no ask/);
  assert.throws(() => read(GOOD.replace("**Changes:** what a grant holds.\n", "")), /IS1 has no changes/);
  assert.throws(() => read(GOOD.replace("| A | A rank", "| A1 | A rank")), /DECISIONS\.md:25: IS1: an option's key is a letter/);
  assert.throws(() => read(GOOD.replace("| **B (recommended by the coordinator)** |", "| B (recommended) |")), /a recommended option is in bold/);
  assert.throws(() => read(GOOD.replace("**Example, run today.**", "**Example.**")), /shows a run its example does not claim/);
  assert.throws(() => read(GOOD.replace("One head.", "```\nmore\n```")), /a fenced block must follow the entry's example/);
  assert.throws(() => read(GOOD.replace("built from main at `c483cb9`", "built somewhere")), /does not say which binary/);
});

test("the repository's own entries are read", () => {
  const { entries } = readDecisions(repo, keep);
  for (const e of entries) assert.ok(e.options.length >= 2, `${e.id} has options to choose between`);
  assert.equal(new Set(entries.map((e) => e.id)).size, entries.length);
});
