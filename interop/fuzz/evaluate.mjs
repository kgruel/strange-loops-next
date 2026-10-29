// Adapters ask the public JS APIs the same questions as Gen.Run.
import { jsonSourceAt } from './json-source.mjs';
import * as F from '../js/fold.mjs';
import * as L from '../js/loops.mjs';
import * as S from '../js/spec.mjs';
import * as Lens from '../js/lens.mjs';
import { admit, realm } from '../js/realm.mjs';
import { resolveBatch } from '../js/batch.mjs';
import { formOf, step, lensEdit } from '../js/scenario.mjs';

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
const WRITE_CODES = new Set([
  'kind-empty', 'observer-not-typed', 'emitted-not-rfc3339', 'occurred-not-span',
  'about-not-typed', 'prev-not-record-id', 'under-not-record-id', 'erases-not-record-id',
  'salt-not-16-bytes', 'member-duplicate', 'number-out-of-range',
]);
// Run.lean asks about one global LatestBy state, not all per-thing states.
// JS latest exposes that same primitive. Per-thing heads remain covered by specs.
function globalHeads(rs) {
  const { winner, others } = F.latest(rs);
  return (winner === null ? [] : [winner, ...others]).map(id => rs.find(r => r.id === id));
}
const folds = {
  'fold/count': rs => F.count(rs).value,
  'fold/sum': rs => F.sum(rs).value,
  'fold/extrema': rs => ({ min: F.min(rs).value, max: F.max(rs).value }),
  'fold/latest-by': rs => F.latestBy(rs),
  'fold/latest': rs => F.latest(rs),
  'fold/heads': rs => ({ max: F.max(globalHeads(rs)), 'limit-2': globalHeads(rs).slice(0, 2).map(r => r.id) }),
  'fold/view': rs => ({ heads: globalHeads(rs).map(r => ({ id: r.id, shown: r.shown ?? 'here' })), max: F.max(globalHeads(rs)) }),
  'fold/select': (rs, input) => ({ count: F.count(rs, input), sum: F.sum(rs, input) }),
};

// The raw vector keeps spec member order, including integer-like member names.
function specNode(vector, rawText) {
  if (vector.input.spec_text !== undefined) return S.readJson(vector.input.spec_text);
  if (!rawText) return S.nodeOf(vector.input.spec);
  const input = S.readJson(rawText).members.find(([k]) => k === 'input')[1];
  return input.members.find(([k]) => k === 'spec')[1];
}
function lensAnswer({ base, text }) {
  const parsed = Lens.parse(text);
  if (parsed === null) return { parsed: null, refused: true };
  const outcomes = Lens.diff(base, parsed);
  return { parsed, normalized: Lens.render(parsed), outcomes, applied: Lens.apply(base, outcomes) };
}
function recordAnswer(input) {
  const env = input.envs[0], salt = L.base32Decode(input.salt);
  const seed = L.base32Decode(input.seed ?? L.base32(new Uint8Array(32)));
  let r, payload;
  try {
    payload = input.payload_text === undefined ? input.payloads[0] : undefined;
    r = input.payload_text === undefined ? L.seal(env, salt, payload, seed)
      : L.writeText(env, salt, input.payload_text, seed);
    if (input.payload_text !== undefined) payload = L.parse(input.payload_text);
  } catch (error) {
    if (!WRITE_CODES.has(error.message)) throw error;
    return { refused: error.message };
  }
  return {
    env_canonical: L.canonical(L.envJson(env)), payload_canonical: L.canonical(payload),
    commit: r.commit, id_preimage: L.idPreimage(env, r.commit), id: r.id,
    signing_input: L.signingInput(r.id), key: r.sig.key, ed25519: r.sig.ed25519,
    line: r.line, erased_line: r.erasedLine,
  };
}

// One answer per arrival order exposes disagreement in any listed order.
export function evaluateJS(vector, rawText) {
  const { layer, input } = vector;
  if (folds[layer]) return input.orders.map(rs => folds[layer](rs, input));
  switch (layer) {
    case 'record': return input.envs.flatMap(env =>
      (input.payloads ?? [null]).map((payload, i) => {
        const variant = { ...input, envs: [env] };
        if (rawText !== undefined && input.payload_text === undefined && input.payloads) {
          variant.payload_text = jsonSourceAt(rawText, ['input', 'payloads', i]);
          delete variant.payloads;
        } else if (input.payloads) variant.payloads = [payload];
        return recordAnswer(variant);
      }));
    case 'lens/section': return [lensAnswer(input)];
    case 'spec/parse': return [S.parseNode(specNode(vector, rawText))];
    case 'spec/run': {
      const parsed = S.parseNode(specNode(vector, rawText));
      if (!parsed.parsed) return [parsed];
      // Spec.run admits its input. JS supplies that stage through realm.admit.
      // Neither side settles here; settlement belongs to realm/scenario.
      return input.orders.map(rs => S.runSpec(parsed.parsed, admit(rs).admitted));
    }
    case 'batch': return [resolveBatch(input.drafts, input.held)];
    case 'realm': {
      const forms = input.forms;
      return Array.from({ length: Math.max(1, forms.length) }, (_, i) => {
        const { settled, refused, things, sum } = realm([...forms.slice(i), ...forms.slice(0, i)]);
        return { settled, refused, things, sum };
      });
    }
    case 'scenario': {
      const { parsed } = S.parseSpec(input.spec);
      if (!parsed) throw new Error('scenario spec does not parse');
      const pool = new Map(input.records.map(r => [r.id, r]));
      const answers = input.steps.map(s => {
        const forms = new Map(s.forms.map(f => [f.id, formOf(pool.get(f.id), f.shown)]));
        return [step(parsed, input.thing, [...forms.values()]),
          ...s.orders.map(order => step(parsed, input.thing, order.map(id => forms.get(id))))];
      });
      const base = { steps: answers.map(as => as[0]), lens: lensEdit(input.lens) };
      return [base, ...answers.flatMap((as, i) => as.slice(1).map(a => ({
        ...base, steps: base.steps.map((b, j) => i === j ? a : b),
      })))];
    }
    default: throw new Error(`unsupported layer: ${layer}`);
  }
}

// Decoder errors are not protocol answers. Typed JS APIs have no fixture decoder.
export function assess(vector, lean, { rawText, js = evaluateJS } = {}) {
  if (Object.hasOwn(lean, 'error')) return { status: 'decoder-refusal', diagnostic: lean.error };
  if (!Object.hasOwn(lean, 'expect')) throw new Error('Lean response has no answer');
  let answers;
  try { answers = js(vector, rawText); }
  catch (error) {
    return { status: 'mismatch', lean: lean.expect, jsException: { name: error.name, message: error.message } };
  }
  if (!Array.isArray(answers) || !answers.length) throw new Error('adapter produces no answers');
  const order = answers.findIndex(answer => !equal(answer, lean.expect));
  if (order !== -1) return { status: 'mismatch', lean: lean.expect, js: answers[order], order };
  const refused = lean.expect?.refused;
  return { status: typeof refused === 'string' || refused === true ? 'protocol-refusal' : 'match' };
}
