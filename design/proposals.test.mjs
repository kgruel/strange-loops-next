import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { vectorFiles, vectorCodes } from "./protocol.mjs";

test("the adopted pages exclude only the top-level proposal directory", () => {
  const root = mkdtempSync(join(tmpdir(), "loops-proposal-scope-"));
  try {
    for (const path of ["record", "proposals/as-of", "proposals/ticks", "scenario/proposals"]) {
      mkdirSync(join(root, "vectors", path), { recursive: true });
      writeFileSync(join(root, "vectors", path, "one.json"),
        JSON.stringify({ laws: [path], expect: { refused: path } }));
    }
    const files = vectorFiles(root);
    assert.deepEqual([...files.keys()].sort(), ["record/one", "scenario/proposals/one"]);
    assert.deepEqual([...vectorCodes(files)].sort(), ["record", "scenario/proposals"]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
