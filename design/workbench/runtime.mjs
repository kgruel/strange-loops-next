// This adapter reads the scenario fixture format. The readers own every result.
import { base32, base32Decode, problem } from "../../interop/js/record.mjs";
import { parseSpec } from "../../interop/js/spec.mjs";
import { formOf, step, lensEdit, replacementRule } from "../../interop/js/scenario.mjs";

const object = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const fail = (path, message) => { throw new Error(`${path}: ${message}`); };
const need = (ok, path, message) => { if (!ok) fail(path, message); };
const strings = (v) => Array.isArray(v) && v.every((x) => typeof x === "string");
const recordId = (s) => typeof s === "string" && /^r:[a-z2-7]{52}$/.test(s) && base32(base32Decode(s.slice(2))) === s.slice(2);

// Large sum results stay exact in the displayed JSON. They are output, not record payloads.
export const stringify = (value, space = 2) => JSON.stringify(value, (_, v) => typeof v === "bigint" ? JSON.rawJSON(v.toString()) : v, space);

// Fold results can exceed binary64's exact integer range. Preserve their JSON tokens.
export const parseJSON = (text) => JSON.parse(text, (_, value, context) =>
  typeof value === "number" && !Number.isSafeInteger(value) && /^-?\d+$/.test(context?.source ?? "")
    ? BigInt(context.source) : value);
const numbers = (v) => typeof v === "bigint" ? Number(v) : Array.isArray(v) ? v.map(numbers)
  : object(v) ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, numbers(x)])) : v;
export function parseVector(text) {
  const vector = parseJSON(text);
  if (!object(vector)) return vector;
  // Scenario inputs still use the protocol's binary64 number domain.
  for (const key of Object.keys(vector)) if (key !== "expect") vector[key] = numbers(vector[key]);
  const check = (v, path) => {
    if (typeof v === "number" && (!Number.isFinite(v) || (Number.isInteger(v) && !Number.isSafeInteger(v))))
      fail(path, "write a large whole baseline result as an integer JSON token, without a decimal point or exponent");
    if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) check(x, `${path}.${k}`);
  };
  check(vector.expect, "expect");
  return vector;
}
export function equal(a, b) {
  if (Object.is(a, b) || a === b) return true;
  if (typeof a === "bigint" && typeof b === "number" && Number.isSafeInteger(b)) return a === BigInt(b);
  if (typeof b === "bigint" && typeof a === "number" && Number.isSafeInteger(a)) return BigInt(a) === b;
  if (!a || !b || typeof a !== "object" || typeof b !== "object" || Array.isArray(a) !== Array.isArray(b)) return false;
  const keys = Object.keys(a);
  return keys.length === Object.keys(b).length && keys.every((k) => Object.hasOwn(b, k) && equal(a[k], b[k]));
}

export function runScenario(input) {
  need(object(input), "input", "expected an object");
  const finite = (v, path) => {
    if (typeof v === "number") need(Number.isFinite(v), path, "expected a finite number");
    if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) finite(x, `${path}.${k}`);
  };
  finite(input, "input");
  need(typeof input.thing === "string" && input.thing.length > 0, "input.thing", "expected a thing name");
  const spec = parseSpec(input.spec);
  need(spec.parsed, "input.spec", `refused ${stringify(spec.refused)}`);
  need(Array.isArray(input.records), "input.records", "expected an array");
  const records = new Map();
  for (const [i, r] of input.records.entries()) {
    const at = `input.records[${i}]`;
    need(object(r), at, "expected a record");
    need(recordId(r.id), `${at}.id`, "expected a canonical 32-byte record id");
    need(!records.has(r.id), `${at}.id`, "repeated record id");
    for (const key of ["kind", "observer", "emitted"]) need(typeof r[key] === "string", `${at}.${key}`, "expected text");
    for (const key of ["about", "prev"]) need(strings(r[key]), `${at}.${key}`, "expected an array of names");
    if (Object.hasOwn(r, "erases")) need(strings(r.erases), `${at}.erases`, "expected an array of ids");
    if (Object.hasOwn(r, "occurred")) need(typeof r.occurred === "string", `${at}.occurred`, "expected a time or span");
    if (Object.hasOwn(r, "value")) need(typeof r.value === "string", `${at}.value`, "expected text");
    if (Object.hasOwn(r, "n")) need(typeof r.n === "number" && Number.isFinite(r.n), `${at}.n`, "expected a finite number");
    if (Object.hasOwn(r, "fields")) need(object(r.fields), `${at}.fields`, "expected an object");
    // These are full fixture records. A step chooses the form each reader holds.
    need(!Object.hasOwn(r, "shown"), `${at}.shown`, "set the form on the step, not the record");
    const refusal = problem(r);
    need(!refusal, at, refusal);
    records.set(r.id, r);
  }
  const may = replacementRule(input, records);
  const reportRefused = Object.hasOwn(input, "mayReplace");
  need(Array.isArray(input.steps) && input.steps.length > 0, "input.steps", "expected at least one step");
  const orders = input.steps.map((s, i) => {
    const at = `input.steps[${i}]`;
    need(object(s), at, "expected a step");
    need(typeof s.name === "string", `${at}.name`, "expected text");
    need(Array.isArray(s.forms), `${at}.forms`, "expected an array");
    const forms = new Map();
    for (const [j, f] of s.forms.entries()) {
      const fp = `${at}.forms[${j}]`;
      need(object(f), fp, "expected a form");
      need(records.has(f.id), `${fp}.id`, "names no record");
      need(!forms.has(f.id), `${fp}.id`, "repeated form id");
      need(["here", "withheld", "erased"].includes(f.shown), `${fp}.shown`, "expected here, withheld, or erased");
      forms.set(f.id, formOf(records.get(f.id), f.shown));
    }
    need(Array.isArray(s.orders) && s.orders.length > 0, `${at}.orders`, "expected at least one arrival order");
    return s.orders.map((order, j) => {
      const op = `${at}.orders[${j}]`;
      need(strings(order) && order.length === forms.size && new Set(order).size === forms.size && order.every((id) => forms.has(id)), op, "must name each form exactly once");
      try { return step(spec.parsed, input.thing, order.map((id) => forms.get(id)), may, reportRefused); }
      catch (e) { fail(op, e.message); }
    });
  });
  const expect = { steps: orders.map((os) => os[0]) };
  if (Object.hasOwn(input, "lens")) {
    const lens = input.lens;
    need(object(lens) && Array.isArray(lens.base) && strings(lens.text), "input.lens", "expected base sections and text lines");
    for (const [i, section] of lens.base.entries()) {
      need(object(section) && typeof section.id === "string" && strings(section.body), `input.lens.base[${i}]`, "expected an id and body lines");
    }
    expect.lens = lensEdit(lens);
  }
  return { expect, orders };
}
