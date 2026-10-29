// Greedy reductions preserve a disagreement's acceptance and equality pattern.
// This is not a minimality proof.
import { equal } from '../answers.mjs';

function* reductions(value, path = []) {
  if (Array.isArray(value)) {
    for (let size = Math.max(1, Math.ceil(value.length / 2)); size >= 1; size = Math.floor(size / 2)) {
      for (let start = 0; start < value.length; start += size) {
        yield { path, value: [...value.slice(0, start), ...value.slice(start + size)] };
      }
    }
    for (let i = 0; i < value.length; i++) yield* reductions(value[i], [...path, i]);
  } else if (value !== null && typeof value === 'object') {
    for (const key of Object.keys(value)) {
      const next = { ...value }; delete next[key]; yield { path, value: next };
      yield* reductions(value[key], [...path, key]);
    }
  } else {
    let choices = [];
    if (typeof value === 'string') choices = ['', value.slice(0, Math.floor(value.length / 2))];
    else if (typeof value === 'number') choices = [0, Math.sign(value), Math.trunc(value / 2)];
    else if (value === true) choices = [false];
    for (const next of choices) if (!equal(value, next)) yield { path, value: next };
  }
}
function replace(input, path, value) {
  if (!path.length) return structuredClone(value);
  const next = structuredClone(input);
  let parent = next;
  for (const key of path.slice(0, -1)) parent = parent[key];
  parent[path.at(-1)] = structuredClone(value);
  return next;
}

function repair(vector, edit, source) {
  const input = vector.input;
  // Removing records from an arrival order removes the same IDs from every order.
  if (edit.path[0] === 'orders' && edit.path.length === 2 && Array.isArray(edit.value)) {
    const ids = new Set(edit.value.map(r => r?.id));
    if (input.orders.every(Array.isArray)) input.orders = input.orders.map(o => o.filter(r => ids.has(r?.id)));
  }
  // A member edit changes the same logical record in every arrival order.
  if (edit.path[0] === 'orders' && edit.path.length >= 3 && Array.isArray(input.orders)) {
    const before = source.input.orders?.[edit.path[1]]?.[edit.path[2]];
    const after = input.orders?.[edit.path[1]]?.[edit.path[2]];
    if (before?.id && after && typeof after === 'object') {
      input.orders = input.orders.map(o => {
        if (!Array.isArray(o)) return o;
        return o.map(r => r?.id === before.id ? structuredClone(after) : r);
      });
    }
  }
  // A scenario's orders name its surviving forms. Forms name its surviving pool.
  if (vector.layer === 'scenario' && Array.isArray(input.records) && Array.isArray(input.steps)) {
    const ids = new Set(input.records.map(r => r?.id));
    for (const step of input.steps) {
      if (!step || !Array.isArray(step.forms)) continue;
      step.forms = step.forms.filter(f => ids.has(f?.id));
      const present = new Set(step.forms.map(f => f?.id));
      if (Array.isArray(step.orders)) step.orders = step.orders.map(o => Array.isArray(o) ? o.filter(id => present.has(id)) : o);
    }
  }
  return vector;
}
function coherent(vector) {
  const input = vector.input;
  if (Array.isArray(input?.orders) && input.orders.every(Array.isArray)) {
    const first = input.orders[0] ?? [];
    for (const order of input.orders.slice(1)) {
      if (order.length !== first.length) return false;
      if (first.some(r => !order.some(s => equal(r, s)))) return false;
    }
  }
  if (vector.layer === 'scenario' && Array.isArray(input?.steps)) {
    for (const step of input.steps) {
      if (!Array.isArray(step?.forms) || !Array.isArray(step?.orders)) continue;
      const ids = step.forms.map(f => f?.id).sort();
      if (step.orders.some(o => Array.isArray(o) && !equal([...o].sort(), ids))) return false;
    }
  }
  const forms = vector.layer === 'realm' ? input?.forms : input?.records;
  if (Array.isArray(forms)) {
    const envelope = r => Object.fromEntries(Object.entries(r).filter(([k]) => !['value', 'n', 'fields', 'shown'].includes(k)));
    for (let i = 0; i < forms.length; i++) for (const other of forms.slice(i + 1)) {
      const r = forms[i];
      if (!r || !other || r.id !== other.id) continue;
      if (!equal(envelope(r), envelope(other))) return false;
      if ((r.shown ?? 'here') === 'here' && (other.shown ?? 'here') === 'here' && !equal(r, other)) return false;
    }
  }
  return true;
}
export function* candidates(vector) {
  const seen = new Set();
  const size = JSON.stringify(vector.input).length;
  for (const edit of reductions(vector.input)) {
    const next = repair({ ...vector, input: replace(vector.input, edit.path, edit.value) }, edit, vector);
    const text = JSON.stringify(next.input);
    if (text.length >= size || seen.has(text) || !coherent(next)) continue;
    seen.add(text); yield next;
  }
}

export function sameDisagreement(original, candidate) {
  if (original.status !== 'mismatch' || candidate.status !== 'mismatch'
    || !equal(original.jsException, candidate.jsException)) return false;
  if (original.comparison || candidate.comparison) {
    return equal(original.comparison?.acceptance, candidate.comparison?.acceptance)
      && equal(original.comparison?.partition, candidate.comparison?.partition);
  }
  // Older callers supply answer fields without comparison metadata.
  const fields = ['lean', 'rust', 'js', 'leanError', 'rustError'];
  if (fields.some(name => Object.hasOwn(original, name) !== Object.hasOwn(candidate, name))) return false;
  const names = ['lean', 'rust', 'js'].filter(name => Object.hasOwn(original, name));
  return names.every((name, i) => names.slice(i + 1).every(other =>
    equal(original[name], original[other]) === equal(candidate[name], candidate[other])));
}

// testMany is a batched disagreement predicate. Its results use assess()'s shape.
export async function shrink(vector, original, testMany, { maxTrials = 80, batchSize = 16 } = {}) {
  if (original.status !== 'mismatch') throw new Error('shrink requires a mismatch');
  if (!Number.isSafeInteger(maxTrials) || maxTrials < 0 || !Number.isSafeInteger(batchSize) || batchSize < 1 || batchSize > 256) {
    throw new Error('invalid shrink trial or batch bound');
  }
  let current = structuredClone(vector), answer = original, trials = 0, rounds = 0;
  while (trials < maxTrials) {
    let improved = false;
    const iterator = candidates(current);
    while (trials < maxTrials) {
      const chunk = [];
      while (chunk.length < Math.min(batchSize, maxTrials - trials)) {
        const next = iterator.next(); if (next.done) break; chunk.push(next.value);
      }
      if (!chunk.length) break;
      const results = await testMany(chunk);
      if (results.length !== chunk.length) throw new Error('shrink predicate loses candidates');
      trials += chunk.length;
      const i = results.findIndex(result => sameDisagreement(original, result));
      if (i !== -1) { current = chunk[i]; answer = results[i]; improved = true; rounds++; break; }
    }
    if (!improved) return { vector: current, answer, trials, rounds, bounded: trials >= maxTrials };
  }
  return { vector: current, answer, trials, rounds, bounded: true };
}
