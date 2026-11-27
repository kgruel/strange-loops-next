import { inline } from "../protocol.mjs";

export const theoremName = (name) => name.replace(/^Loops\./, "");
export const theoremStatement = (proof) => proof.states.replace(/\bLoops\./g, "");

// The two sides of the vector join, and any prose left in the row's Vectors cell.
export function vectorEvidence(row, { cited, naming }) {
  const listed = cited.get(row.key), named = naming.get(row.key);
  const words = /[a-z]/i.test(row.vectors.replace(/`[^`]*`/g, ""));
  return {
    listed,
    unnamed: listed.filter((p) => !named.includes(p)),
    uncited: named.filter((p) => !listed.includes(p)),
    note: words || !listed.length ? inline(row.vectors) : null,
  };
}

// Join the proof graph to the evidence cards it links.
export function proofMapData({ data, rows, layers, edges }, idOf) {
  const connected = new Set(edges.flatMap(([a, b]) => [a, b]));
  return {
    layers,
    nodes: rows.filter((r) => connected.has(r.key)).map((r) => {
      const law = data.laws[r.key];
      return {
        id: idOf(r.key), label: r.names.length > 1 ? `${r.names[0]} …` : r.key,
        layer: law.layer, shape: law.shape,
      };
    }),
    edges: edges.map(([a, b, via]) => [idOf(a), idOf(b), via]),
  };
}
