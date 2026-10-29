// Compare answers structurally; payload canonicalization is not an output codec.
import { jsonSourceAt } from './json-source.mjs';

export function equal(a, b) {
  if (a === b) return true;
  // Compare the integer a Number actually holds, not its rounded decimal text.
  if (typeof a === 'bigint' && typeof b === 'number' && Number.isInteger(b)) return a === BigInt(b);
  if (typeof b === 'bigint' && typeof a === 'number' && Number.isInteger(a)) return BigInt(a) === b;
  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) return a.length === b.length && a.every((v, i) => equal(v, b[i]));
  const keys = Object.keys(a);
  return keys.length === Object.keys(b).length && keys.every(k => Object.hasOwn(b, k) && equal(a[k], b[k]));
}
// Output integers beyond the safe Number range retain their written value.
// Keep the transport contract: unsafe numbers need a plain integer source.
export function parseOutputJson(text) {
  return JSON.parse(text, (_key, value, context) => {
    if (typeof value !== 'number' || Number.isSafeInteger(value)) return value;
    if (/^-?\d+$/.test(context?.source ?? '')) return BigInt(context.source);
    throw new Error('batch number has no exact integer source');
  });
}

// Inputs still use binary64 JSON numbers. Only the expected answer is exact.
export function readVector(text) {
  const vector = JSON.parse(text);
  if (Object.hasOwn(vector, 'expect')) vector.expect = parseOutputJson(jsonSourceAt(text, ['expect']));
  return vector;
}
