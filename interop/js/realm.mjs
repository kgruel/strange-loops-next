// What a reader keeps before any vertex asks its question, per protocol/
// laws.md ("Things and what a reader holds"): settle the forms its places
// hold into one record per id, admit those entitled to their prev, and work
// out each thing's state over the rest. Records are in the fold vectors'
// JSON form. Written from protocol/ and vectors/README.md. No dependencies.

import * as F from "./fold.mjs";
import { held } from "./where.mjs";

// The payload's part of a fold record; the rest is the envelope.
const PAYLOAD = ["value", "n", "fields", "shown"];
const envelopeOf = (form) => Object.fromEntries(Object.entries(form).filter(([k]) => !PAYLOAD.includes(k)));

const byId = (a, b) => F.idOrder(a.id, b.id);

// One record per id, ordered by id as digest bytes. A payload any place
// holds is kept; a record in the set whose `erases` names an id erases every
// form of it, whatever that record's kind; a form that arrives erased with
// no such record behind it counts as withheld.
export function settle(forms) {
  const formsOf = new Map();
  for (const f of forms) formsOf.set(f.id, [...(formsOf.get(f.id) ?? []), f]);
  const erased = new Set(forms.flatMap((f) => f.erases ?? []));
  return [...formsOf.values()].map((fs) => {
    const kept = fs.find(held);
    if (erased.has(fs[0].id)) return { ...envelopeOf(fs[0]), shown: "erased" };
    if (kept) return { ...kept, shown: "here" };
    return { ...envelopeOf(fs[0]), shown: "withheld" };
  }).sort(byId);
}

// A record's things: what it is about, or, about nothing, its own id.
const thingsOf = (r) => (r.about?.length ? r.about : [r.id]);

// A record whose prev names a held record it shares no thing with is
// refused (prev-unrelated). A prev naming a record not held is admitted: the
// reader can't judge it. The store's rule (prev-not-permitted) is step 3's;
// here it allows everything.
export function admit(records) {
  const things = new Map(records.map((r) => [r.id, thingsOf(r)]));
  const admitted = [], refused = [];
  for (const r of records) {
    const mine = thingsOf(r);
    const unrelated = (r.prev ?? []).some((p) => things.has(p) && !things.get(p).some((t) => mine.includes(t)));
    if (unrelated) refused.push({ id: r.id, code: "prev-unrelated" });
    else admitted.push(r);
  }
  return { admitted, refused };
}

const shownOf = (r) => ({ id: r.id, shown: r.shown });

// What the reader keeps (settled, as { id, shown }), what it refuses, each
// thing's state over the rest and Sum over them; the admitted records too,
// in full, for a spec to run over.
export function realm(forms) {
  const settled = settle(forms);
  const { admitted, refused } = admit(settled);
  return { settled: settled.map(shownOf), refused, things: F.latestBy(admitted), sum: F.sum(admitted), admitted };
}
