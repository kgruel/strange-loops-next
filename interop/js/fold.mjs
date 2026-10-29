// The folds, written from protocol/laws.md and vectors/README.md: the
// accumulating family (count, sum, min, max), the family over heads
// (latest-by, latest, heads, view), and select, the where-tests in front of
// the accumulating ones. Pure functions over records in the vectors' JSON form;
// none keeps state, so a late record is folding the longer list again.
// No dependencies.

import { base32Decode, occurredSpan, spanBefore, momentBefore } from "./loops.mjs";
import { answer, held, payloadOf, YES, UNKNOWN } from "./where.mjs";

// Content order: the record's span (a record without `occurred` is an instant
// at its `emitted`), then its `emitted` moment, then its id as digest bytes.

const spanOf = (r) => {
  const s = occurredSpan(r.occurred ?? r.emitted);
  if (!s) throw new Error(`occurred-not-span: ${r.id}`);
  return s;
};

const digests = new Map();
function digest(id) {
  if (!digests.has(id)) digests.set(id, base32Decode(id.slice(2)));
  return digests.get(id);
}

// -1, 0 or 1 comparing digest bytes, unsigned, first byte first.
function compareBytes(a, b) {
  for (let i = 0; i < Math.min(a.length, b.length); i++) if (a[i] !== b[i]) return a[i] < b[i] ? -1 : 1;
  return Math.sign(a.length - b.length);
}

// Ids ordered as digest bytes, the order content order ends on.
export const idOrder = (a, b) => compareBytes(digest(a), digest(b));

// Oldest first: negative when a is older than b.
export function contentOrder(a, b) {
  const [x, y] = [spanOf(a), spanOf(b)];
  if (spanBefore(x, y)) return -1;
  if (spanBefore(y, x)) return 1;
  const [p, q] = [occurredSpan(a.emitted).start, occurredSpan(b.emitted).start];
  if (momentBefore(p, q)) return -1;
  if (momentBefore(q, p)) return 1;
  return idOrder(a.id, b.id);
}

export const newestFirst = (a, b) => contentOrder(b, a);

// The store hands each id over once; the folds over heads take the first of a repeat.
function distinct(records) {
  const seen = new Set();
  return records.filter((r) => !seen.has(r.id) && seen.add(r.id));
}

// The accumulating family: select with the where-test, then fold what is read.
// A record the test can't answer is unread; so is a selected one the fold
// can't read (the payload not held, or the field not a whole number).

function select(records, where) {
  const selected = [];
  let unread = 0;
  for (const r of records) {
    const a = answer(where, r);
    if (a === YES) selected.push(r);
    else if (a === UNKNOWN) unread++;
  }
  return { selected, unread };
}

export function count(records, { where } = {}) {
  const { selected, unread } = select(records, where);
  return { value: selected.length, unread };
}

const wholeAt = (r, field) => {
  const v = (payloadOf(r) ?? {})[field];
  return typeof v === "number" && Number.isSafeInteger(v) ? v : undefined;
};

function readNumbers(records, { field = "n", where } = {}) {
  const { selected, unread } = select(records, where);
  const xs = selected.map((r) => wholeAt(r, field)).filter((v) => v !== undefined);
  return { xs, unread: unread + selected.length - xs.length };
}

// Sums accumulate in 128 bits, signed; past that, `sum-overflow`, never a wrap.
// The value is a Number while it is a safe integer, else a BigInt.
const LIMIT = 2n ** 127n;

export function sum(records, opts) {
  const { xs, unread } = readNumbers(records, opts);
  const total = xs.reduce((t, x) => t + BigInt(x), 0n);
  if (total >= LIMIT || total < -LIMIT) throw new Error("sum-overflow");
  const safe = total <= BigInt(Number.MAX_SAFE_INTEGER) && total >= -BigInt(Number.MAX_SAFE_INTEGER);
  return { value: safe ? Number(total) : total, unread };
}

const extremum = (pick) => (records, opts) => {
  const { xs, unread } = readNumbers(records, opts);
  return { value: xs.length ? xs.reduce(pick) : null, unread };
};
export const min = extremum((a, b) => (b < a ? b : a));
export const max = extremum((a, b) => (b > a ? b : a));

// The family over heads. A thing's state is LatestBy over the records about
// it: a record about several things is in each, one about nothing anchors a
// thing named by its own id. `prev` supersedes within a thing, and reads only
// the envelope, so a record whose payload is withheld still supersedes.

const thingsOf = (r) => (r.about?.length ? [...new Set(r.about)] : [r.id]);

// The heads of one set of records, newest first.
function headsOf(records) {
  const superseded = new Set(records.flatMap((r) => r.prev ?? []));
  return records.filter((r) => !superseded.has(r.id)).sort(newestFirst);
}

// Each thing's heads (records), newest first.
export function states(records) {
  const byThing = new Map();
  for (const r of distinct(records)) {
    for (const t of thingsOf(r)) byThing.set(t, [...(byThing.get(t) ?? []), r]);
  }
  return new Map([...byThing].map(([t, rs]) => [t, headsOf(rs)]));
}

const ids = (rs) => rs.map((r) => r.id);

// Per thing: its heads (ids, newest first), its winner and its others (a fork when non-empty).
export function latestBy(records) {
  const out = Object.create(null);
  for (const [t, hs] of states(records)) out[t] = { heads: ids(hs), winner: hs[0].id, others: ids(hs.slice(1)) };
  return out;
}

// Latest is LatestBy over one thing: every record, whatever it is about.
export function latest(records) {
  const hs = headsOf(distinct(records));
  return { winner: hs.length ? hs[0].id : null, others: ids(hs.slice(1)) };
}

// Every thing's heads together (a record that is a head in two things once), newest first.
export function heads(records, { limit } = {}) {
  const hs = distinct([...states(records).values()].flat()).sort(newestFirst);
  return limit === undefined ? hs : hs.slice(0, limit);
}

// Max over the heads: the largest `field` among the readable ones, and how many heads weren't.
export const maxOfHeads = (records, opts) => max(heads(records), opts);

// What a reader holding less sees: the heads a reader holding everything would,
// each with what is held of it.
export const view = (records) => heads(records).map((r) => ({ id: r.id, shown: held(r) ? "here" : r.shown }));

const FAMILIES = { count, sum, min, max, latest, "latest-by": latestBy, heads, "max-heads": maxOfHeads, view };

// fold(kind, records, opts): kind is one of the keys above; opts are `where`
// and `field` for the accumulating ones, `limit` for heads.
export function fold(kind, records, opts) {
  if (!Object.hasOwn(FAMILIES, kind)) throw new Error(`unknown fold: ${kind}`);
  return FAMILIES[kind](records, opts);
}
