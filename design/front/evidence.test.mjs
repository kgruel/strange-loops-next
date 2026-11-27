import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { esc, joinLaws } from "../laws/join.mjs";
import { frontData } from "./render.mjs";

const root = fileURLToPath(new URL("../../", import.meta.url));
const data = frontData(root);
const laws = data.get("E_LAWS"), theorems = data.get("E_T"), svg = data.get("E_MAP");
const source = joinLaws(root);

test("each law has exactly one evidence card", () => {
  const { laws: entries } = JSON.parse(readFileSync(join(root, "design/laws/laws.json"), "utf8"));
  assert.deepEqual(laws.map((law) => law.k).sort(), Object.keys(entries).sort());
});

test("each card names its resolved theorems and each theorem has its Lean statement", () => {
  for (const law of laws) {
    const names = source.resolved.get(law.k);
    assert.deepEqual(law.th, names.map((name) => name.replace(/^Loops\./, "")), law.k);
    for (const [i, name] of names.entries()) {
      const proof = source.graph[name];
      assert.deepEqual(theorems[law.th[i]], [proof.module, proof.states.replace(/\bLoops\./g, "")], name);
    }
  }
  assert.deepEqual(Object.keys(theorems).sort(), [...new Set(laws.flatMap((law) => law.th))].sort());
});

test("the evidence counts agree with the cards, vector inventory, implementations and map", () => {
  assert.deepEqual(data.get("E_COUNTS"), {
    laws: laws.length,
    theorems: Object.keys(theorems).length,
    vectors: new Set(laws.flatMap((law) => law.ci)).size,
    vectorFiles: source.files.size,
    impls: data.get("E_IMPL").length,
    edges: [...svg.matchAll(/<g class="edge"/g)].length,
    connected: [...svg.matchAll(/<a class="node\b/g)].length,
  });
});

test("the proof map uses the front page's size and node height", () => {
  assert.match(svg, /^<svg viewBox="0 0 967 1424" width="100%" style="--w:967px"/);
  const nodes = [...svg.matchAll(/<a class="node\b[^>]*>.*?<\/a>/g)];
  assert.equal(nodes.length, data.get("E_COUNTS").connected);
  for (const [node] of nodes) assert.match(node, /<rect\b[^>]*\bheight="28"/);
});

test("map links and labels name each connected law, and each edge names its proof", () => {
  const id = new Map(laws.map((law) => [law.k, `ev-${law.s}`]));
  const connected = laws.filter((law) => law.ro.length || law.ca.length);
  const nodes = [...svg.matchAll(/<a\b([^>]*)><title>([^<]+)<\/title>/g)].map(([, attrs, title]) => {
    return [attrs.match(/data-id="([^"]+)"/)[1], attrs.match(/href="#([^"]+)"/)[1], title];
  });
  const expected = connected.map((law) => {
    const label = law.n.length > 1 ? `${law.n[0]} …` : law.k;
    return [id.get(law.k), id.get(law.k), esc(label)];
  });
  assert.deepEqual(nodes.sort(), expected.sort());

  const edges = [...svg.matchAll(/<g class="edge" data-a="([^"]+)" data-b="([^"]+)" data-via="([^"]*)"/g)];
  const rests = laws.flatMap((law) => law.ro.map(([other, via]) => [
    id.get(law.k), id.get(other), esc(via).replaceAll('"', "&quot;"),
  ]));
  assert.deepEqual(edges.map((match) => match.slice(1)).sort(), rests.sort());
});
