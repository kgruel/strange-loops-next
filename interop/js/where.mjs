// The where-tests of a spec, run on one fold record. A test answers yes, no or
// unknown: a test on the envelope always answers, one on a payload the reader
// doesn't hold answers unknown. Takes a where map already parsed (protocol/
// spec.md says what parses); records are in the vectors' JSON form. No
// dependencies.

import { occurredSpan, momentBefore } from "./loops.mjs";

export const YES = "yes", NO = "no", UNKNOWN = "unknown";

const yes = (b) => (b ? YES : NO);
// The complement of a test: `not` of `is`, `absent` of `present`. Unknown stays unknown.
const flip = (a) => (a === YES ? NO : a === NO ? YES : UNKNOWN);

// A record whose payload the reader doesn't hold says so in `shown`.
export const held = (r) => r.shown === undefined || r.shown === "here";

// The payload a record holds: `value`, `n` and the named `fields`; null when not held.
export function payloadOf(r) {
  if (!held(r)) return null;
  const p = { ...(r.fields ?? {}) };
  if (r.value !== undefined) p.value = r.value;
  if (r.n !== undefined) p.n = r.n;
  return p;
}

// A whole number, as the numeric folds and at-least/below read one.
const isWhole = (v) => typeof v === "number" && Number.isSafeInteger(v);

const sameMoment = (a, b) => !momentBefore(a, b) && !momentBefore(b, a);
const sameSpan = (a, b) =>
  sameMoment(a.start, b.start) && (a.end === null || b.end === null ? a.end === b.end : sameMoment(a.end, b.end));

const argSpan = (arg) => {
  const s = typeof arg === "string" ? occurredSpan(arg) : null;
  if (!s) throw new Error("where-invalid: not a time");
  return s;
};

// What an envelope field reads as: text, a set of members, a time (span, null
// when the record has none), or a payload value (held false when not here).
function reading(field, r) {
  switch (field) {
    case "kind": case "observer": return { type: "text", v: r[field] };
    case "about": case "prev": case "erases": return { type: "set", members: r[field] ?? [] };
    case "under": return { type: "set", members: r.under === undefined ? [] : [].concat(r.under) };
    case "emitted": return { type: "time", span: occurredSpan(r.emitted) };
    case "occurred": return { type: "time", span: r.occurred === undefined ? null : occurredSpan(r.occurred) };
    default: throw new Error(`where-invalid: env.${field}`);
  }
}

const payloadReading = (field, r) => {
  const p = payloadOf(r);
  return p === null ? { type: "value", held: false } : { type: "value", held: true, v: Object.hasOwn(p, field) ? p[field] : undefined };
};

const isTest = (arg, f) =>
  f.type === "text" ? f.v === arg
  : f.type === "set" ? f.members.includes(arg)
  : f.type === "time" ? f.span !== null && sameSpan(f.span, argSpan(arg))
  : f.v !== undefined && f.v === arg;

const presentTest = (f) =>
  f.type === "text" ? true
  : f.type === "set" ? f.members.length > 0
  : f.type === "time" ? f.span !== null
  : f.v !== undefined;

// at-least and below hold for numbers and times only; for nothing else, either.
function bound(op, arg, f) {
  if (f.type === "time") {
    if (f.span === null) return false;
    const before = momentBefore(f.span.start, argSpan(arg).start);
    return op === "at-least" ? !before : before;
  }
  if (f.type === "value" && isWhole(f.v) && isWhole(arg)) return op === "at-least" ? f.v >= arg : f.v < arg;
  return false;
}

export function testAnswer(op, arg, f) {
  if (f.type === "value" && !f.held) return UNKNOWN;
  switch (op) {
    case "is": return yes(isTest(arg, f));
    case "not": return flip(yes(isTest(arg, f)));
    case "present": return yes(presentTest(f));
    case "absent": return flip(yes(presentTest(f)));
    case "at-least": case "below": return yes(bound(op, arg, f));
    default: throw new Error(`where-invalid: operator ${op}`);
  }
}

// A map holds when every test does: one no is no, else one unknown is unknown.
export function answer(where, r) {
  let out = YES;
  for (const [name, tests] of Object.entries(where ?? {})) {
    const f = name.startsWith("env.") ? reading(name.slice(4), r) : payloadReading(name, r);
    for (const [op, arg] of Object.entries(tests)) {
      const a = testAnswer(op, arg, f);
      if (a === NO) return NO;
      if (a === UNKNOWN) out = UNKNOWN;
    }
  }
  return out;
}
