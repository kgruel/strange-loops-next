// A scenario: steps over one spec, each a set of forms a reader's places
// hold. Per step, what the reader keeps and admits, one thing's heads and
// winner, and the spec's slots over what it admitted; then a lens edit of
// that thing's head. Composes realm.mjs, spec.mjs and lens.mjs; adds no rule
// of its own. Written from vectors/README.md. No dependencies.

import * as F from "./fold.mjs";
import * as Lens from "./lens.mjs";
import { realm, settle } from "./realm.mjs";
import { runSpec } from "./spec.mjs";

const PAYLOAD = ["value", "n", "fields"];

// A form of a record: the record in full when held, else its envelope and
// what the place has instead (`withheld` or `erased`).
export function formOf(record, shown) {
  if (shown === "here") return record;
  const env = Object.fromEntries(Object.entries(record).filter(([k]) => !PAYLOAD.includes(k)));
  return { ...env, shown };
}

// One step: forms (records already in their forms) over a parsed spec,
// looking at one thing.
export function step(spec, thing, forms, may = () => true, reportRefused = false) {
  const r = realm(forms, may);
  const hs = F.states(r.admitted).get(thing) ?? [];
  const result = {
    settled: r.settled,
    admitted: r.admitted.map((x) => x.id),
    heads: hs.map((x) => x.id),
    winner: hs.length ? hs[0].id : null,
    slots: runSpec(spec, settle(forms), may),
  };
  if (reportRefused) result.refused = r.refused;
  return result;
}

// The lens edit: the base rendered, the edited text read back against it.
export function lensEdit({ base, text }) {
  const parsed = Lens.parse(text);
  const outcomes = parsed === null ? null : Lens.diff(base, parsed);
  return { rendered: Lens.render(base), outcomes, applied: outcomes && Lens.apply(base, outcomes) };
}

// A thing's head as a keyed section: its id, and the head's value as lines.
export const sectionOf = (thing, head) => ({ id: thing, body: String(head.value).split("\n") });

// Fixture rules name pool ids only. Absence differs from an empty rule.
export function replacementRule(input, records) {
  if (!Object.hasOwn(input, "mayReplace")) return () => true;
  if (!Array.isArray(input.mayReplace)) throw new Error("input.mayReplace: expected an array");
  for (const pair of input.mayReplace) {
    if (!Array.isArray(pair) || pair.length !== 2) throw new Error("input.mayReplace: expected two-item pairs");
    if (!pair.every((id) => typeof id === "string" && records.has(id))) {
      throw new Error("input.mayReplace: names none of input.records");
    }
  }
  return (r, q) => input.mayReplace.some(([next, prev]) => next === r.id && prev === q.id);
}
