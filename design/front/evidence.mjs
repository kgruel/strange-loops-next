// The front page's evidence cards in protocol table order, and the map of their proofs.
import { layoutMap } from "../evidence/layout.mjs";
import { proofMapData, theoremName, theoremStatement, vectorEvidence } from "../evidence/render.mjs";
import { joinLaws, REPO, sentence } from "../laws/join.mjs";
import { inline, slug } from "../protocol.mjs";

// The front map's label metrics and spacing. The current rows wrap the same from 851 to 864.
const mapSizes = {
  characterWidth: 7.3, nodePadding: 22, nodeHeight: 28, bandGap: 22,
  leftGutter: 100, maxRowWidth: 860, labelX: 11, labelY: 18.5,
};

export function readEvidence(root) {
  const joined = joinLaws(root);
  const { data, rows, graph, resolved, restsOn, carries, via, unpremised } = joined;
  const declarations = new Set([...resolved.values()].flat());
  const theorems = Object.fromEntries([...declarations].map((name) => {
    const proof = graph[name];
    return [theoremName(name), [proof.module, theoremStatement(proof)]];
  }));

  const laws = rows.map((row) => {
    const key = row.key, law = data.laws[key];
    const { listed, uncited, unnamed, note } = vectorEvidence(row, joined);
    // A cited vector that also names the law counts just once for each runner.
    const runners = [...listed, ...uncited].map((path) => joined.runBy([path]));
    return {
      k: key, n: row.names, s: slug(key), ly: law.layer, sh: law.shape, q: law.question,
      sen: sentence(law), sc: joined.scopeOf(key), md: inline(row.says),
      sec: row.section, lf: row.files, th: resolved.get(key).map(theoremName),
      nt: row.theorems.filter((name) => data.notTheorems[name]), bc: row.byConstruction,
      vc: note ?? "", ci: listed, ex: uncited, un: unnamed,
      ru: data.implementations.map((impl) => runners.filter((group) => group.includes(impl)).length),
      ro: restsOn.get(key).map((other) => [other, via.get(`${key}\u0000${other}`)]),
      ca: carries.get(key), pr: unpremised.get(key) ?? null,
    };
  });

  return {
    E_REPO: REPO,
    E_LAYERS: joined.layers,
    E_SHAPES: Object.fromEntries(Object.entries(data.shapes).map(([key, shape]) => [key, shape.name])),
    E_IMPL: data.implementations.map(({ name, what, checker, except, ops }) => ({
      name, what, checker: Boolean(checker), except: except ?? [], ops: ops ?? null,
    })),
    E_NOT: data.notTheorems,
    E_COUNTS: {
      laws: laws.length, theorems: declarations.size, vectors: new Set(laws.flatMap((law) => law.ci)).size,
      vectorFiles: joined.files.size, impls: data.implementations.length, edges: joined.edges.length,
      connected: laws.filter((law) => law.ro.length || law.ca.length).length,
    },
    E_T: theorems,
    E_LAWS: laws,
    E_MAP: layoutMap(proofMapData(joined, (key) => `ev-${slug(key)}`), mapSizes),
  };
}
