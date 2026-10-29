// A vertex's spec: parse it per protocol/spec.md (the parsed form, or a
// refusal with its code and path, checked in the stated order), and run it
// over records per protocol/laws.md, reusing the folds and where-tests.
// Written from protocol/ and vectors/README.md. No dependencies.

import { occurredSpan, problem } from "./loops.mjs";
import { answer, held, YES, UNKNOWN } from "./where.mjs";
import * as F from "./fold.mjs";

// JSON as written: an object keeps its members in order, repeats included,
// as { members: [[key, node], ...] }; an array is { items: [node, ...] };
// anything else is its value. JSON.parse would keep one of a repeat and put
// integer-like keys first, and the refusals depend on both.

export const isObject = (n) => n !== null && typeof n === "object" && Array.isArray(n.members);
export const isArray = (n) => n !== null && typeof n === "object" && Array.isArray(n.items);

export function readJson(text) {
  let i = 0;
  const ws = () => { while (" \t\n\r".includes(text[i]) && i < text.length) i++; };
  const token = (re) => { re.lastIndex = i; const m = re.exec(text); if (!m) throw new Error(`bad JSON at ${i}`); i = re.lastIndex; return m[0]; };
  const STR = /"(?:[^"\\\u0000-\u001f]|\\.)*"/y, NUM = /-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/y;
  function value() {
    ws();
    const c = text[i];
    if (c === "{") {
      i++; const members = [];
      ws(); if (text[i] === "}") { i++; return { members }; }
      for (;;) {
        ws(); const k = JSON.parse(token(STR));
        ws(); token(/:/y);
        members.push([k, value()]);
        ws();
        if (text[i] === ",") { i++; continue; }
        token(/\}/y); return { members };
      }
    }
    if (c === "[") {
      i++; const items = [];
      ws(); if (text[i] === "]") { i++; return { items }; }
      for (;;) { items.push(value()); ws(); if (text[i] === ",") { i++; continue; } token(/\]/y); return { items }; }
    }
    if (c === '"') return JSON.parse(token(STR));
    if (c === "t" || c === "f" || c === "n") return JSON.parse(token(/true|false|null/y));
    return Number(token(NUM));
  }
  const v = value(); ws();
  if (i !== text.length) throw new Error(`bad JSON at ${i}`);
  return v;
}

// A value JSON.parse gave, as a node. Its members come in Object.keys order,
// which puts integer-like keys first: read text with readJson when that matters.
export const nodeOf = (v) =>
  Array.isArray(v) ? { items: v.map(nodeOf) }
  : v !== null && typeof v === "object" ? { members: Object.entries(v).map(([k, x]) => [k, nodeOf(x)]) }
  : v;

// A node as a plain value. Only called once repeats are ruled out;
// fromEntries defines members, so a key "__proto__" stays a key.
const plain = (n) =>
  isArray(n) ? n.items.map(plain)
  : isObject(n) ? Object.fromEntries(n.members.map(([k, x]) => [k, plain(x)]))
  : n;

const get = (n, key) => n.members.find(([k]) => k === key)?.[1];

// The first repeated key, depth first in member order: a member's value is
// searched before the members after it, an array's elements in order. The
// path of keys from the top, or null when nothing repeats.
export function repeatAt(n, path = []) {
  if (isArray(n)) {
    for (const x of n.items) { const at = repeatAt(x, path); if (at) return at; }
  } else if (isObject(n)) {
    const seen = new Set();
    for (const [k, x] of n.members) {
      if (seen.has(k)) return [...path, k];
      seen.add(k);
      const at = repeatAt(x, [...path, k]);
      if (at) return at;
    }
  }
  return null;
}

// What layer 0 accepts in a field, asked of loops.mjs's own envelope check
// (an envelope valid but for that one field) so the two can't drift apart.
const VALID = { kind: "k", observer: "x:y", emitted: "1970-01-01T00:00:00Z" };
const text = (v) => typeof v === "string" && v !== "";
const typedRef = (v) => typeof v === "string" && problem({ ...VALID, about: [v] }) === null;
const recordId = (v) => typeof v === "string" && problem({ ...VALID, under: v }) === null;
const time = (v) => typeof v === "string" && occurredSpan(v) !== null;
// A payload number layer 0 writes: whole, within ±(2^53 − 1).
const whole = (v) => Number.isSafeInteger(v);
const payloadValue = (v) => typeof v === "string" || typeof v === "boolean" || whole(v);

// Each envelope field and what `is` and `not` may compare it with.
const ENV_FIELDS = {
  kind: text, observer: typedRef, about: typedRef,
  prev: recordId, under: recordId, erases: recordId,
  emitted: time, occurred: time,
};

const TOP_KEYS = new Set(["vertex", "from", "fold", "note", "ticks", "order", "resolve", "window", "boundary", "param", "covers", "into", "bundle"]);
const SOURCE_KEYS = new Set(["store", "kind", "about"]);
const FOLD_TYPES = ["count", "sum", "min", "max", "latest-by", "collect"];
const SLOT_KEYS = new Set([...FOLD_TYPES, "follow", "limit", "where", "note"]);

// Each fold type's argument.
const ARGUMENT = {
  count: (v) => v === true, collect: (v) => v === true,
  sum: text, min: text, max: text,
  "latest-by": (v) => v === "about",
};

class Refusal extends Error {
  constructor(code, path) { super(code); this.code = code; this.path = path; }
}
const refuse = (code, path) => { throw new Refusal(code, path); };

// A where field's value test, or null when the name isn't a field.
function fieldValue(field) {
  if (field.startsWith("env.")) return Object.hasOwn(ENV_FIELDS, field.slice(4)) ? ENV_FIELDS[field.slice(4)] : null;
  return field === "" ? null : payloadValue;
}

function testFits(field, op, arg) {
  switch (op) {
    case "is": case "not": return fieldValue(field)(arg);
    case "present": case "absent": return arg === true;
    case "at-least": case "below":
      if (field === "env.emitted" || field === "env.occurred") return time(arg);
      return !field.startsWith("env.") && whole(arg);
    default: return false;
  }
}

function whereOf(n, at) {
  if (!isObject(n) || n.members.length === 0) refuse("where-invalid", at);
  for (const [field, tests] of n.members) {
    const here = [...at, field];
    if (!fieldValue(field) || !isObject(tests) || tests.members.length === 0) refuse("where-invalid", here);
    for (const [op, arg] of tests.members) if (!testFits(field, op, arg)) refuse("where-invalid", here);
  }
  return plain(n);
}

function slotOf(name, n) {
  const at = ["fold", name];
  if (name === "" || !isObject(n)) refuse("fold-invalid", at);
  for (const [k] of n.members) if (!SLOT_KEYS.has(k)) refuse("unknown-key", [...at, k]);
  const types = n.members.map(([k]) => k).filter((k) => FOLD_TYPES.includes(k));
  if (types.length !== 1) refuse("fold-type", at);
  const [type] = types;
  const [follow, limit, where] = ["follow", "limit", "where"].map((k) => get(n, k));
  if (type === "latest-by" && follow === undefined) refuse("follow-missing", [...at, "follow"]);
  if (follow !== undefined && (follow !== "prev" || (type !== "collect" && type !== "latest-by"))) refuse("follow-invalid", [...at, "follow"]);
  if (limit !== undefined && (!(Number.isInteger(limit) && limit >= 1) || type !== "collect")) refuse("limit-invalid", [...at, "limit"]);
  if (!ARGUMENT[type](get(n, type))) refuse("fold-argument", [...at, type]);
  const slot = { [type]: get(n, type) };
  if (follow !== undefined) slot.follow = follow;
  if (limit !== undefined) slot.limit = limit;
  if (where !== undefined) slot.where = whereOf(where, [...at, "where"]);
  return slot;
}

// store, kind and about are checked in that order however they are written.
function sourceOf(n) {
  if (!isObject(n)) refuse("from-invalid", ["from"]);
  for (const [k] of n.members) if (!SOURCE_KEYS.has(k)) refuse("unknown-key", ["from", k]);
  const [store, kind, about] = ["store", "kind", "about"].map((k) => get(n, k));
  if (!text(store)) refuse("from-invalid", ["from", "store"]);
  if (kind !== undefined && !(isArray(kind) && kind.items.length > 0 && kind.items.every(text))) refuse("from-invalid", ["from", "kind"]);
  if (about !== undefined && !typedRef(about)) refuse("from-invalid", ["from", "about"]);
  const source = { store };
  if (kind !== undefined) source.kind = plain(kind);
  if (about !== undefined) source.about = about;
  return source;
}

function specOf(n) {
  const repeat = repeatAt(n);
  if (repeat) refuse("member-duplicate", repeat);
  if (!isObject(n)) refuse("spec-not-object", []);
  for (const [k] of n.members) if (!TOP_KEYS.has(k)) refuse("unknown-key", [k]);

  const vertex = get(n, "vertex");
  if (vertex === undefined) refuse("vertex-missing", ["vertex"]);
  if (!text(vertex)) refuse("vertex-invalid", ["vertex"]);

  const from = get(n, "from");
  if (from === undefined || (isArray(from) && from.items.length === 0)) refuse("from-missing", ["from"]);
  if (!isArray(from)) refuse("from-invalid", ["from"]);
  const sources = from.items.map(sourceOf);

  const fold = get(n, "fold") ?? { members: [] };
  if (!isObject(fold)) refuse("fold-invalid", ["fold"]);
  const slots = fold.members.map(([name, slot]) => [name, slotOf(name, slot)]);
  return { vertex, from: sources, fold: Object.fromEntries(slots) };
}

// A spec as a node: { parsed } in its parsed form, or { refused, path } with
// the path's keys joined by ".".
export function parseNode(n) {
  try {
    return { parsed: specOf(n) };
  } catch (e) {
    if (!(e instanceof Refusal)) throw e;
    return { refused: e.code, path: e.path.join(".") };
  }
}

export const parseSpecText = (t) => parseNode(readJson(t));
export const parseSpec = (v) => parseNode(nodeOf(v));

// Running a parsed spec over the records a reader holds, one per id, in the
// fold vectors' JSON form.

// A record's things: what it is about, or, about nothing, its own id.
const thingsOf = (r) => (r.about?.length ? r.about : [r.id]);

// A source takes a record of one of its kinds about its thing; the spec, a
// record any source takes. Only envelopes are read.
const sourceTakes = (s, r) => (s.kind === undefined || s.kind.includes(r.kind)) && (s.about === undefined || thingsOf(r).includes(s.about));
export const takes = (spec, r) => spec.from.some((s) => sourceTakes(s, r));

const shownOf = (r) => ({ id: r.id, shown: held(r) ? "here" : r.shown });

// Of some records, those every test holds for, and those a test couldn't answer.
function choose(records, where) {
  const chosen = [], unknown = [];
  for (const r of records) {
    const a = answer(where, r);
    if (a === YES) chosen.push(r);
    else if (a === UNKNOWN) unknown.push(r);
  }
  return { chosen, unknown };
}

// Collect: the chosen records newest first, the newest `limit` when given.
function collect(records, slot) {
  const { chosen, unknown } = choose(records, slot.where);
  const heads = chosen.sort(F.newestFirst).map(shownOf);
  return { heads: slot.limit === undefined ? heads : heads.slice(0, slot.limit), unread: unknown.length };
}

// Latest-by: per thing, its heads `from` takes and every test holds for; a
// thing with none is left out. A head the tests couldn't answer is unread
// once, however many things it heads.
function latestBy(states, spec, slot) {
  const things = Object.create(null), unread = new Set();
  for (const [t, hs] of states) {
    const { chosen, unknown } = choose(hs.filter((r) => takes(spec, r)), slot.where);
    for (const r of unknown) unread.add(r.id);
    if (chosen.length) things[t] = chosen.map(shownOf);
  }
  return { things, unread: unread.size };
}

// Accumulating slots select, then fold the records `from` takes. Slots over
// heads (latest-by, collect following prev) supersede over every record held,
// then choose among the heads, so selection never brings back what was
// superseded. Collect without follow takes every selected record.
function runSlot(slot, spec, { records, taken, states }) {
  const where = slot.where;
  if ("count" in slot) return F.count(taken, { where });
  for (const type of ["sum", "min", "max"]) if (type in slot) return F[type](taken, { where, field: slot[type] });
  if ("latest-by" in slot) return latestBy(states, spec, slot);
  if (slot.follow === "prev") return collect(F.heads(records).filter((r) => takes(spec, r)), slot);
  return collect(taken, slot);
}

// Every slot's value, by name.
export function runSpec(spec, records) {
  const ctx = { records, taken: records.filter((r) => takes(spec, r)), states: F.states(records) };
  const out = Object.create(null);
  for (const [name, slot] of Object.entries(spec.fold)) out[name] = runSlot(slot, spec, ctx);
  return out;
}
