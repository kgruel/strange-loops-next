import { runScenario, stringify, equal, parseJSON, parseVector } from './runtime.mjs';
import { boundaryResult } from './boundaries.mjs';
import { base32 } from '../../interop/js/record.mjs';

const $ = (id) => document.getElementById(id);
const data = parseJSON(document.querySelector('#workbench-data').textContent);
for (const preset of data.presets) preset.vector = parseVector(stringify(preset.vector, 0));
const presets = data.presets;
const clone = (v) => parseJSON(stringify(v, 0));
const object = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const asText = (v) => typeof v === 'string' ? v : stringify(v);
const message = (error) => error instanceof Error ? error.message : String(error);
const timers = new Map();
const fieldErrors = new Map();
let vector;
let live;
let valid = false;
let rawPending = false;
let recordIndex = 0;
let stepIndex = 0;
let resultIndex = 0;
let generation = 0;
let importGeneration = 0;

// All data goes through text nodes or DOM properties, never through HTML strings.
function node(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value !== false && value != null) el.setAttribute(key, value === true ? '' : String(value));
  }
  for (const child of children.flat()) {
    if (child != null) el.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return el;
}
function replace(id, ...children) { $(id).replaceChildren(...children.flat().filter((child) => child != null)); }
function errorAt(id, text = '') {
  $(id).textContent = text;
  $(id).hidden = !text;
}
function later(key, fn) {
  clearTimeout(timers.get(key));
  timers.set(key, setTimeout(() => { timers.delete(key); fn(); }, 350));
}
function stopTimers() {
  for (const timer of timers.values()) clearTimeout(timer);
  timers.clear();
}
function options(select, entries, selected) {
  select.replaceChildren(...entries.map(([value, text]) => node('option', { value }, text)));
  if (selected != null) select.value = String(selected);
}
const recordLabel = (id) => {
  const i = vector.input.records.findIndex((r) => r.id === id);
  return i < 0 ? id : i < 26 ? String.fromCharCode(65 + i) : `R${i + 1}`;
};
function setValidity(ok) {
  valid = ok;
  document.querySelectorAll('.requires-valid').forEach((el) => { el.disabled = !ok; });
  $('structured-edit').disabled = rawPending;
}
function invalidate(text) {
  live = null;
  setValidity(false);
  $('draft-status').textContent = 'Draft not run. Save and export are disabled.';
  errorAt('draft-error', text);
  $('scenario-status').textContent = 'No live result for this draft.';
  $('step-status').textContent = '';
  replace('order-lanes');
  replace('comparison', node('p', { class: 'hint' }, 'Fix the draft to compute a new result. No previous result is shown.'));
  $('lens-results').hidden = true;
}
function validateEnvelope(v) {
  if (!object(v)) throw new Error('vector: expected an object');
  if (typeof v.vector !== 'string') throw new Error('vector.vector: expected a name');
  if (v.layer !== 'scenario') throw new Error('vector.layer: expected scenario');
  if (typeof v.source !== 'string') throw new Error('vector.source: expected a source');
  if (!Array.isArray(v.laws) || v.laws.some((law) => typeof law !== 'string')) throw new Error('vector.laws: expected law names');
  if (v.description !== undefined && typeof v.description !== 'string') throw new Error('vector.description: expected text');
  if (!object(v.input)) throw new Error('vector.input: expected an object');
  if (!object(v.expect) || !Array.isArray(v.expect.steps)) throw new Error('vector.expect.steps: expected the stored baseline steps');
}
function share() {
  if (!valid) return;
  try {
    const url = new URL(window.location.href);
    url.hash = `scenario=${encodeURIComponent(stringify(vector, 0))}`;
    window.history.replaceState(null, '', url.href);
    errorAt('url-error');
  } catch (error) {
    errorAt('url-error', `Could not update the share URL: ${message(error)}. Export a file instead.`);
  }
}
function paintValid(writeURL = true) {
  setValidity(true);
  errorAt('draft-error');
  $('draft-status').textContent = 'Valid fixture draft. All supplied arrival orders run. The stored expect stays unchanged.';
  renderMeta();
  renderResults();
  if (writeURL) share();
}
function runCurrent() {
  if (rawPending) return;
  if (fieldErrors.size) { invalidate([...fieldErrors.values()].join('\n')); return; }
  try {
    validateEnvelope(vector);
    live = runScenario(vector.input);
    paintValid();
  } catch (error) { invalidate(message(error)); }
}
function writeRaw() { $('raw').value = stringify(vector); }
function mutate(fn, redraw) {
  try {
    fn();
    writeRaw();
    if (redraw) redraw();
    runCurrent();
  } catch (error) { invalidate(message(error)); }
}
function adoptText(text, writeURL = true) {
  importGeneration++;
  stopTimers();
  fieldErrors.clear();
  rawPending = true;
  $('raw').value = text;
  try {
    const next = parseVector(text);
    validateEnvelope(next);
    const answer = runScenario(next.input);
    vector = next;
    live = answer;
    generation++;
    rawPending = false;
    recordIndex = 0;
    stepIndex = 0;
    resultIndex = 0;
    renderEditors();
    paintValid(writeURL);
    if (!writeURL) errorAt('url-error');
    return true;
  } catch (error) {
    invalidate(message(error));
    document.querySelector('.raw-panel').open = true;
    return false;
  }
}
function renderMeta() {
  $('description').textContent = vector.description || 'This fixture has no description. Read its records, steps, and stored baseline below.';
  $('fixture-meta').textContent = `${vector.vector} · ${vector.layer} · source: ${vector.source}`;
  const preset = presets.find((p) => equal(p.vector, vector));
  $('preset').value = preset ? preset.path : '';
  replace('law-links', vector.laws.map((law) => {
    const anchor = Object.hasOwn(data.lawAt, law) ? data.lawAt[law] : null;
    if (!anchor) return node('span', { class: 'hint' }, `${law} (no law link)`);
    return node('span', { class: 'law-pair' },
      node('a', { href: `../laws/#${encodeURIComponent(anchor)}` }, node('code', {}, law)),
      node('a', { href: `../evidence/#${encodeURIComponent(anchor)}` }, 'Evidence'));
  }));
}
function renderEditors() {
  $('thing').value = vector.input.thing;
  renderThings();
  renderRecordSelect();
  renderRecord();
  renderStepSelects();
  renderStep();
  renderSpec();
  renderLens();
}
function renderThings() {
  const things = new Set(vector.input.records.flatMap((r) => r.about));
  replace('things', [...things].map((thing) => node('option', { value: thing })));
}
function renderRecordSelect() {
  recordIndex = Math.max(0, Math.min(recordIndex, vector.input.records.length - 1));
  options($('record-select'), vector.input.records.map((r, i) => [i, `${recordLabel(r.id)} · ${r.kind} · ${r.value ?? ''}`]), recordIndex);
  $('remove-record').disabled = !vector.input.records.length;
}
function field(label, id, value, update, { area = false, full = false, readonly = false, hint = '' } = {}) {
  const control = node(area ? 'textarea' : 'input', { id, type: area ? null : 'text', rows: area ? 4 : null, readonly, spellcheck: 'false' });
  control.value = value ?? '';
  if (update) control.addEventListener('change', () => update(control.value));
  return node('div', { class: `field${full ? ' full' : ''}` }, node('label', { for: id }, label), control,
    hint ? node('p', { class: 'hint' }, hint) : null);
}
function listValue(text, path) {
  const value = JSON.parse(text);
  if (!Array.isArray(value) || value.some((v) => typeof v !== 'string')) throw new Error(`${path}: expected an array of strings`);
  return value;
}
function editRecordJSON(key, text, parse) {
  const r = vector.input.records[recordIndex];
  try {
    const value = parse(text);
    fieldErrors.delete(`record.${key}`);
    mutate(() => {
      if (value === undefined) delete r[key]; else r[key] = value;
    });
    if (key === 'about') renderThings();
  } catch (error) {
    fieldErrors.set(`record.${key}`, `input.records[${recordIndex}].${key}: ${message(error)}`);
    invalidate([...fieldErrors.values()].join('\n'));
  }
}
function renderRecord() {
  const r = vector.input.records[recordIndex];
  if (!r) { replace('record-editor', node('p', { class: 'hint' }, 'No records. Add a fixture record to start.')); return; }
  const text = (key, value) => mutate(() => { r[key] = value; }, () => { renderRecordSelect(); renderForms(); });
  const fields = [
    field('Fixture id · read only', 'record-id', r.id, null, { full: true, readonly: true }),
    field('Kind', 'record-kind', r.kind, (value) => text('kind', value)),
    field('Observer', 'record-observer', r.observer, (value) => text('observer', value)),
    field('About · JSON string array', 'record-about', stringify(r.about), (value) => editRecordJSON('about', value, (s) => listValue(s, 'about')), { area: true, full: true }),
    field('Value · text', 'record-value', r.value ?? '', (value) => text('value', value), { area: true, full: true }),
    field('n · JSON number, blank to omit', 'record-n', r.n === undefined ? '' : stringify(r.n), (value) => editRecordJSON('n', value, (s) => {
      if (!s.trim()) return undefined;
      const n = JSON.parse(s);
      if (typeof n !== 'number' || !Number.isFinite(n)) throw new Error('expected a finite JSON number');
      return n;
    })),
    field('Emitted', 'record-emitted', r.emitted, (value) => text('emitted', value)),
    field('Occurred · blank to omit', 'record-occurred', r.occurred ?? '', (value) => mutate(() => {
      if (value.trim()) r.occurred = value; else delete r.occurred;
    }), { full: true }),
    field('Fields · JSON object, blank to omit', 'record-fields', r.fields === undefined ? '' : stringify(r.fields), (value) => editRecordJSON('fields', value, (s) => {
      if (!s.trim()) return undefined;
      const fields = JSON.parse(s);
      if (!object(fields)) throw new Error('expected a JSON object');
      return fields;
    }), { area: true, full: true }),
    field('Prev · JSON id array', 'record-prev', stringify(r.prev ?? []), (value) => editRecordJSON('prev', value, (s) => listValue(s, 'prev')), { area: true, full: true }),
    field('Erases · JSON id array', 'record-erases', stringify(r.erases ?? []), (value) => editRecordJSON('erases', value, (s) => listValue(s, 'erases')), { area: true, full: true }),
  ];
  replace('record-editor', node('div', { class: 'fields' }, fields));
}
function renderStepSelects() {
  stepIndex = Math.max(0, Math.min(stepIndex, vector.input.steps.length - 1));
  resultIndex = Math.max(0, Math.min(resultIndex, vector.input.steps.length - 1));
  const entries = vector.input.steps.map((step, i) => [i, `${i + 1} · ${step.name}`]);
  options($('step-select'), entries, stepIndex);
  options($('result-step'), entries, resultIndex);
  $('remove-step').disabled = vector.input.steps.length <= 1;
}
// This only maintains membership after a structured edit. The runner checks manual orders.
function keepPermutations(step) {
  const ids = step.forms.map((f) => f.id);
  step.orders = (step.orders.length ? step.orders : [[]]).map((order) => {
    const kept = [...new Set(order.filter((id) => ids.includes(id)))];
    return [...kept, ...ids.filter((id) => !kept.includes(id))];
  });
}
function renderStep() {
  const step = vector.input.steps[stepIndex];
  $('step-name').value = step.name;
  $('orders').value = stringify(step.orders);
  renderForms();
}
function renderForms() {
  const step = vector.input.steps[stepIndex];
  replace('forms-editor', vector.input.records.map((r) => {
    const form = step.forms.find((f) => f.id === r.id);
    const id = `form-${vector.input.records.indexOf(r)}`;
    const select = node('select', { id });
    options(select, [['absent', 'Absent'], ['here', 'Here'], ['withheld', 'Withheld'], ['erased', 'Erased']], form?.shown ?? 'absent');
    select.addEventListener('change', () => {
      if (!permitStructure()) {
        select.value = step.forms.find((f) => f.id === r.id)?.shown ?? 'absent';
        return;
      }
      mutate(() => {
        const value = select.value;
        step.forms = step.forms.filter((f) => f.id !== r.id);
        if (value !== 'absent') step.forms.push({ id: r.id, shown: value });
        keepPermutations(step);
        $('orders').value = stringify(step.orders);
      });
    });
    return node('div', { class: 'form-row' }, node('label', { for: id, title: r.id },
      `${recordLabel(r.id)} · ${r.kind}`, node('span', {}, ` · ${r.value ?? '(no value)'}`)), select);
  }));
}
function renderSpec() {
  $('vertex').value = vector.input.spec.vertex;
  $('spec-json').value = stringify(vector.input.spec);
  $('may-replace').value = stringify(vector.input.mayReplace ?? null);
}
function renderLens() {
  const lens = vector.input.lens;
  $('lens-enabled').checked = !!lens;
  $('lens-editor').hidden = !lens;
  $('lens-base').value = stringify(lens?.base ?? []);
  $('lens-text').value = lens?.text.join('\n') ?? '';
}
function jsonPanel(el) {
  const key = el.dataset.json;
  fieldErrors.set(key, `${key}: JSON edit has not run yet.`);
  invalidate([...fieldErrors.values()].join('\n'));
  const atStep = stepIndex;
  const atGeneration = generation;
  const text = el.value;
  later(key, () => {
    if (generation !== atGeneration || rawPending) return;
    try {
      const value = JSON.parse(text);
      if (key === 'orders' && (!Array.isArray(value) || value.some((order) => !Array.isArray(order)))) throw new Error('expected arrays of record ids');
      if (key === 'spec' && !object(value)) throw new Error('expected a spec object');
      if (key === 'mayReplace' && value !== null && !Array.isArray(value)) throw new Error('expected pairs or null');
      if (key === 'lensBase' && !Array.isArray(value)) throw new Error('expected an array of sections');
      fieldErrors.delete(key);
      mutate(() => {
        if (key === 'orders') vector.input.steps[atStep].orders = value;
        if (key === 'spec') { vector.input.spec = value; $('vertex').value = value.vertex ?? ''; }
        if (key === 'mayReplace') {
          if (value === null) delete vector.input.mayReplace; else vector.input.mayReplace = value;
        }
        if (key === 'lensBase') vector.input.lens.base = value;
      });
    } catch (error) {
      fieldErrors.set(key, `${key}: ${message(error)}`);
      invalidate([...fieldErrors.values()].join('\n'));
    }
  });
}
function permitStructure() {
  if (!fieldErrors.size) return true;
  errorAt('draft-error', `${[...fieldErrors.values()].join('\n')}\nFix this field before changing the editor selection or structure.`);
  return false;
}
function fixtureId() {
  const ids = new Set(vector.input.records.map((r) => r.id));
  let id;
  do {
    id = `r:${base32(crypto.getRandomValues(new Uint8Array(32)))}`;
  } while (ids.has(id));
  return id;
}

// Exact comparisons use the runtime's equality, not JSON member order or rounded output.
function differences(expected, actual, path = '$', out = []) {
  if (equal(expected, actual)) return out;
  if (Array.isArray(expected) && Array.isArray(actual)) {
    const length = Math.max(expected.length, actual.length);
    for (let i = 0; i < length; i++) differenceKey(expected, actual, i, `${path}[${i}]`, out);
  } else if (object(expected) && object(actual)) {
    for (const key of new Set([...Object.keys(expected), ...Object.keys(actual)])) differenceKey(expected, actual, key, `${path}[${JSON.stringify(key)}]`, out);
  } else {
    out.push(`${path}: baseline ${stringify(expected)}; live ${stringify(actual)}`);
  }
  return out;
}
function differenceKey(expected, actual, key, path, out) {
  const hasExpected = Object.hasOwn(expected, key), hasActual = Object.hasOwn(actual, key);
  if (!hasExpected) out.push(`${path}: absent from baseline; live ${stringify(actual[key])}`);
  else if (!hasActual) out.push(`${path}: baseline ${stringify(expected[key])}; absent from live`);
  else differences(expected[key], actual[key], path, out);
}
function chips(ids) {
  return node('div', { class: 'order-chips' }, ids.length ? ids.map((id) => node('span', { class: 'order-chip', title: id }, recordLabel(id))) : node('span', { class: 'hint' }, 'None'));
}
function jsonBlock(title, value) {
  return node('div', { class: 'stack' }, node('h3', {}, title), node('pre', {}, value === undefined ? '(absent)' : stringify(value)));
}
function recordCard(form, result) {
  const record = vector.input.records.find((r) => r.id === form.id);
  const isHead = result.heads.includes(form.id);
  const isWinner = result.winner === form.id;
  const mod = isHead ? isWinner ? ' head' : ' fork' : ' super';
  const shown = form.shown;
  return node('article', { class: `rec${mod}`, title: form.id },
    node('div', { class: 'rid' }, node('b', {}, recordLabel(form.id)), node('span', {}, record?.emitted ?? '')),
    node('p', { class: 'who' }, `${record?.observer ?? ''} · ${record?.kind ?? ''}`),
    node('div', { class: `val${shown === 'here' ? '' : ` ${shown}`}` }, shown === 'here' ? asText(record?.value ?? '') : shown),
    node('p', { class: 'tag' }, `${shown} · ${isWinner ? 'winner' : isHead ? 'head' : 'not a head'} · ${(record?.about ?? []).join(', ')}`),
    node('details', {}, node('summary', {}, 'Record id and payload form'), node('pre', {}, stringify({ ...form, ...(shown === 'here' ? { value: record?.value, n: record?.n, fields: record?.fields } : {}) }))));
}
function renderResults() {
  if (!valid || !live) return;
  const allMatch = equal(vector.expect, live.expect) && live.orders.every((orders, i) => orders.every((out) => equal(vector.expect.steps[i], out)));
  $('scenario-status').textContent = allMatch ? 'Whole scenario: matches the stored baseline in every order and the lens.' : 'Whole scenario: differs from the stored baseline.';
  $('scenario-status').dataset.match = String(allMatch);
  const step = vector.input.steps[resultIndex];
  const outputs = live.orders[resultIndex];
  const baseline = vector.expect.steps[resultIndex];
  const n = outputs.filter((out) => equal(baseline, out)).length;
  $('step-status').textContent = `${step.name}: ${n} of ${outputs.length} orders match the stored baseline.`;
  $('step-status').dataset.match = String(n === outputs.length);
  replace('order-lanes', outputs.map((out, i) => {
    const matches = equal(baseline, out);
    const card = node('article', { class: 'lane' }, node('h3', {}, `Order ${i + 1} of ${outputs.length}`), chips(step.orders[i]),
      node('p', { class: 'status', 'data-match': String(matches) }, matches ? 'Matches baseline' : 'Differs from baseline'),
      node('h4', {}, 'Settled forms'), node('div', { class: 'rec-list' }, out.settled.map((form) => recordCard(form, out))),
      node('h4', {}, 'Admitted'), chips(out.admitted),
      node('h4', {}, 'Heads · newest first'), chips(out.heads),
      node('p', { class: 'mini' }, `Winner: ${out.winner ? recordLabel(out.winner) : 'none'}`),
      jsonBlock('Slots', out.slots));
    if (Object.hasOwn(out, 'refused')) card.append(jsonBlock('Refused', out.refused));
    card.append(node('details', {}, node('summary', {}, 'Full live step JSON'), node('pre', {}, stringify(out))));
    return card;
  }));
  const first = outputs[0];
  const diffParts = outputs.map((out, i) => {
    const items = differences(baseline, out);
    return node('details', { open: items.length > 0 }, node('summary', {}, `Order ${i + 1}: ${items.length ? `${items.length} differences` : 'exact match'}`),
      items.length ? node('ul', { class: 'difference-list' }, items.map((item) => node('li', {}, item))) : node('p', { class: 'hint' }, 'No differences.'));
  });
  replace('comparison', node('h3', {}, 'Stored baseline and live JSON'),
    node('p', { class: 'hint' }, 'The stored expect is a baseline, not a recomputed claim. Edits never update it automatically.'),
    node('div', { class: 'compare-grid' }, jsonBlock('Baseline expect · selected step', baseline), jsonBlock('Live · first arrival order', first)),
    diffParts,
    node('details', {}, node('summary', {}, 'Whole scenario · baseline and live JSON'), node('div', { class: 'compare-grid' },
      jsonBlock('Stored baseline expect', vector.expect), jsonBlock('Live expect · first order of each step', live.expect)),
      node('ul', { class: 'difference-list' }, differences(vector.expect, live.expect).map((item) => node('li', {}, item)))));
  renderLensResults();
}
function renderLensResults() {
  const actual = live.expect.lens;
  const baseline = vector.expect.lens;
  const included = Object.hasOwn(vector.input, 'lens');
  $('lens-results').hidden = !included && baseline === undefined;
  if ($('lens-results').hidden) return;
  const match = equal(baseline, actual);
  const blocks = [node('h3', {}, 'Lens'), node('p', { class: 'status', 'data-match': String(match) }, match ? 'Lens matches the stored baseline.' : 'Lens differs from the stored baseline.')];
  if (included) {
    blocks.push(node('h3', {}, 'Input · edited text'), node('pre', {}, vector.input.lens.text.join('\n')),
      node('h3', {}, 'Rendered base'), node('pre', {}, Array.isArray(actual?.rendered) ? actual.rendered.join('\n') : asText(actual?.rendered ?? '')),
      jsonBlock('Outcomes', actual?.outcomes), jsonBlock('Applied', actual?.applied));
  } else blocks.push(node('p', { class: 'hint' }, 'The current input has no lens. The stored baseline still includes one.'));
  blocks.push(node('div', { class: 'compare-grid' }, jsonBlock('Stored baseline lens', baseline), jsonBlock('Live lens', actual)),
    node('ul', { class: 'difference-list' }, differences(baseline, actual, '$.lens').map((item) => node('li', {}, item))));
  replace('lens-results', blocks);
}
function renderBoundary() {
  const entry = data.boundaries.find((b) => b.law === $('boundary-select').value);
  if (!entry) { replace('boundary-result', node('p', {}, 'No boundary cases supplied.')); return; }
  const removed = $('remove-premise').checked;
  try {
    const answer = boundaryResult(entry.law, removed);
    const side = removed ? entry.removed : entry.holds;
    const anchor = data.lawAt[entry.law];
    const actualPanel = answer.mode === 'live'
      ? jsonBlock('Actual live JavaScript result', answer.actual)
      : node('div', { class: 'stack' }, node('h3', {}, 'No live result · model-only evidence'),
        node('p', { class: 'hint' }, 'This case uses the reference model answer only. It does not run as a live scenario.'));
    const links = anchor ? node('p', { class: 'law-pair' },
      node('a', { href: `../laws/#${encodeURIComponent(anchor)}` }, entry.law), node('a', { href: `../evidence/#${encodeURIComponent(anchor)}` }, 'Evidence')) : null;
    replace('boundary-result', links,
      node('p', {}, node('b', {}, 'Premise: '), entry.premise),
      node('div', { class: 'boundary-givens' }, node('p', {}, node('b', {}, 'With premise · given'), entry.holds.given), node('p', {}, node('b', {}, 'Without premise · given'), entry.removed.given)),
      node('p', { class: 'status' }, removed ? 'The premise is removed.' : 'The premise is present.'),
      node('p', {}, node('b', {}, 'Current example: '), answer.given),
      node('div', { class: 'compare-grid' }, node('div', { class: 'stack' }, node('h3', {}, 'Reference model answer'), node('pre', {}, side.answer)), actualPanel),
      node('p', { class: 'status', 'data-match': String(answer.holds) }, `${answer.mode === 'live' ? 'Live example' : 'Reference model example'} · law holds: ${answer.holds ? 'yes' : 'no'}.`),
      node('p', { class: 'boundary-note' }, `${entry.input}. ${answer.note}`),
      node('p', { class: 'hint' }, 'This fixed example does not use or change your draft.'));
  } catch (error) {
    replace('boundary-result', node('p', { class: 'error', role: 'alert' }, message(error)));
  }
}

const STORAGE_KEY = 'strange-loops.workbench.slots.v1';
function readSlots() {
  // Accessing the localStorage property itself can throw.
  const text = window.localStorage.getItem(STORAGE_KEY);
  const slots = text === null ? [] : parseJSON(text);
  if (!Array.isArray(slots) || slots.some((slot) => !object(slot) || typeof slot.name !== 'string' || !object(slot.vector))) throw new Error('Saved slots have an unknown format.');
  return slots.map((slot) => ({ ...slot, vector: parseVector(stringify(slot.vector, 0)) }));
}
function storageAction(fn) {
  try { errorAt('keep-error'); return fn(); }
  catch (error) { errorAt('keep-error', `Browser storage is unavailable: ${message(error)}. Import, export, and URL sharing still work.`); return undefined; }
}
function refreshSlots() {
  storageAction(() => {
    const slots = readSlots();
    const selected = $('slots').value;
    options($('slots'), slots.length ? slots.map((slot) => [slot.name, slot.name]) : [['', 'No saved slots']], selected);
    if ($('slots').selectedIndex < 0) $('slots').selectedIndex = 0;
    $('load-slot').disabled = !slots.length;
    $('delete-slot').disabled = !slots.length;
  });
}
function fromHash(initial = false) {
  let hash;
  try {
    hash = window.location.hash.slice(1);
    if (hash.startsWith('scenario=')) {
      adoptText(decodeURIComponent(hash.slice(9)), false);
      return true;
    }
    if (hash.startsWith('preset=')) {
      const path = decodeURIComponent(hash.slice(7));
      const preset = presets.find((p) => p.path === path);
      if (!preset) throw new Error(`Unknown preset: ${path}`);
      adoptText(stringify(preset.vector));
      return true;
    }
    if (!initial && ['edit', 'results', 'break', 'keep'].includes(hash)) share();
    return false;
  } catch (error) {
    errorAt('url-error', `Could not load the URL draft: ${message(error)}.`);
    rawPending = true;
    invalidate('The URL draft did not load. Choose a preset or import a vector.');
    return true;
  }
}

options($('preset'), [['', 'Current draft'], ...presets.map((p) => [p.path, p.path])]);
$('preset').addEventListener('change', () => {
  const preset = presets.find((p) => p.path === $('preset').value);
  if (preset) adoptText(stringify(preset.vector));
});
$('raw').addEventListener('input', () => {
  importGeneration++;
  stopTimers();
  fieldErrors.clear();
  rawPending = true;
  invalidate('Raw JSON edit has not run yet.');
  later('raw', () => adoptText($('raw').value));
});
$('run-raw').addEventListener('click', () => adoptText($('raw').value));
$('thing').addEventListener('change', () => mutate(() => { vector.input.thing = $('thing').value; }));
$('record-select').addEventListener('change', () => {
  if (!permitStructure()) { $('record-select').value = String(recordIndex); return; }
  recordIndex = Number($('record-select').value);
  renderRecord();
});
$('add-record').addEventListener('click', () => {
  if (!permitStructure()) return;
  mutate(() => {
    const first = vector.input.records[0];
    const record = { id: fixtureId(), kind: first?.kind ?? 'note', observer: first?.observer ?? 'sl:reader', about: vector.input.thing ? [vector.input.thing] : [], value: 'New fixture record.', prev: [], emitted: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'), n: 0 };
    vector.input.records.push(record);
    recordIndex = vector.input.records.length - 1;
    const step = vector.input.steps[stepIndex];
    step.forms.push({ id: record.id, shown: 'here' });
    keepPermutations(step);
  }, () => { renderRecordSelect(); renderRecord(); renderStep(); renderThings(); });
});
$('remove-record').addEventListener('click', () => {
  if (!permitStructure()) return;
  mutate(() => {
    const id = vector.input.records[recordIndex].id;
    vector.input.records.splice(recordIndex, 1);
    for (const record of vector.input.records) {
      record.prev = (record.prev ?? []).filter((ref) => ref !== id);
      if (record.erases) record.erases = record.erases.filter((ref) => ref !== id);
    }
    for (const step of vector.input.steps) {
      step.forms = step.forms.filter((f) => f.id !== id);
      keepPermutations(step);
    }
    if (vector.input.mayReplace) vector.input.mayReplace = vector.input.mayReplace.filter((pair) => !Array.isArray(pair) || !pair.includes(id));
  }, renderEditors);
});
$('step-select').addEventListener('change', () => {
  if (!permitStructure()) { $('step-select').value = String(stepIndex); return; }
  stepIndex = Number($('step-select').value);
  resultIndex = stepIndex;
  $('result-step').value = String(resultIndex);
  renderStep();
  renderResults();
});
$('step-name').addEventListener('change', () => mutate(() => {
  vector.input.steps[stepIndex].name = $('step-name').value;
}, renderStepSelects));
$('add-step').addEventListener('click', () => {
  if (!permitStructure()) return;
  mutate(() => {
    const current = vector.input.steps[stepIndex];
    vector.input.steps.push({ name: `step-${vector.input.steps.length + 1}`, forms: clone(current.forms), orders: clone(current.orders) });
    stepIndex = vector.input.steps.length - 1;
    resultIndex = stepIndex;
  }, () => { renderStepSelects(); renderStep(); });
});
$('remove-step').addEventListener('click', () => {
  if (!permitStructure() || vector.input.steps.length <= 1) return;
  mutate(() => { vector.input.steps.splice(stepIndex, 1); resultIndex = Math.min(resultIndex, vector.input.steps.length - 1); }, () => { renderStepSelects(); renderStep(); });
});
$('reverse-order').addEventListener('click', () => {
  if (!permitStructure()) return;
  mutate(() => {
    const step = vector.input.steps[stepIndex];
    const first = step.orders[0] ?? step.forms.map((form) => form.id);
    step.orders.push([...first].reverse());
    $('orders').value = stringify(step.orders);
  });
});
document.querySelectorAll('[data-json]').forEach((el) => el.addEventListener('input', () => jsonPanel(el)));
$('vertex').addEventListener('change', () => {
  if (fieldErrors.has('spec')) {
    $('vertex').value = vector.input.spec.vertex ?? '';
    permitStructure();
    return;
  }
  mutate(() => {
    vector.input.spec.vertex = $('vertex').value;
    $('spec-json').value = stringify(vector.input.spec);
  });
});
$('spec-template').addEventListener('click', () => {
  if (!permitStructure()) return;
  mutate(() => {
    vector.input.spec = { vertex: $('vertex').value || 'draft', from: [{ store: '.' }], fold: { count: { count: true }, current: { 'latest-by': 'about', follow: 'prev' } } };
  }, renderSpec);
});
$('lens-enabled').addEventListener('change', () => {
  if (!permitStructure()) { $('lens-enabled').checked = !!vector.input.lens; return; }
  mutate(() => {
    if ($('lens-enabled').checked) vector.input.lens = { base: [{ id: vector.input.thing || 'thing:draft', body: ['Draft text.'] }], text: [`::: ${vector.input.thing || 'thing:draft'}`, 'Draft text.', ':::'] };
    else delete vector.input.lens;
  }, renderLens);
});
$('lens-text').addEventListener('change', () => mutate(() => { vector.input.lens.text = $('lens-text').value.split('\n'); }));
$('result-step').addEventListener('change', () => { resultIndex = Number($('result-step').value); renderResults(); });
options($('boundary-select'), data.boundaries.map((entry) => [entry.law, entry.law]));
$('boundary-select').addEventListener('change', () => { $('remove-premise').checked = false; renderBoundary(); });
$('remove-premise').addEventListener('change', renderBoundary);
$('refresh-slots').addEventListener('click', refreshSlots);
$('save-slot').addEventListener('click', () => {
  if (!valid) return;
  const name = $('slot-name').value.trim();
  if (!name) { errorAt('keep-error', 'Enter a slot name.'); return; }
  storageAction(() => {
    const slots = readSlots().filter((slot) => slot.name !== name);
    slots.push({ name, vector: clone(vector) });
    window.localStorage.setItem(STORAGE_KEY, stringify(slots, 0));
    refreshSlots();
    $('slots').value = name;
    $('keep-status').textContent = `Saved ${name}. The stored baseline expect stays unchanged.`;
  });
});
$('load-slot').addEventListener('click', () => storageAction(() => {
  const slot = readSlots().find((entry) => entry.name === $('slots').value);
  if (!slot) throw new Error('The saved slot no longer exists. Refresh the list.');
  $('slot-name').value = slot.name;
  if (adoptText(stringify(slot.vector))) $('keep-status').textContent = `Loaded ${slot.name}.`;
}));
$('delete-slot').addEventListener('click', () => storageAction(() => {
  const name = $('slots').value;
  window.localStorage.setItem(STORAGE_KEY, stringify(readSlots().filter((slot) => slot.name !== name), 0));
  refreshSlots();
  $('keep-status').textContent = `Deleted ${name}.`;
}));
$('import-file').addEventListener('change', async () => {
  const file = $('import-file').files[0];
  if (!file) return;
  const request = ++importGeneration;
  stopTimers();
  rawPending = true;
  invalidate('Reading the imported vector.');
  try {
    const text = await file.text();
    if (request !== importGeneration) return;
    $('import-file').value = '';
    if (adoptText(text)) $('keep-status').textContent = `Imported ${file.name}.`;
    else errorAt('keep-error', 'Import is not a valid scenario vector. Fix its raw JSON or choose another file.');
  } catch (error) {
    if (request === importGeneration) invalidate(`Could not read the file: ${message(error)}`);
  } finally {
    if (request === importGeneration) $('import-file').value = '';
  }
});
$('export-vector').addEventListener('click', () => {
  if (!valid) return;
  let url;
  try {
    url = URL.createObjectURL(new Blob([stringify(vector) + '\n'], { type: 'application/json' }));
    const link = node('a', { href: url, download: `${vector.vector.replace(/[^a-zA-Z0-9._-]/g, '-') || 'scenario'}.json` });
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    $('keep-status').textContent = 'Exported the current valid vector, including its stored baseline expect.';
  } catch (error) {
    if (url) URL.revokeObjectURL(url);
    errorAt('keep-error', `Could not export the vector: ${message(error)}`);
  }
});
// Section links scroll without replacing the share fragment.
document.addEventListener('click', (event) => {
  const link = event.target.closest('a[href]');
  if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const href = link.getAttribute('href');
  if (!['#edit', '#results', '#break', '#keep'].includes(href)) return;
  event.preventDefault();
  $(href.slice(1)).scrollIntoView({ behavior: 'auto', block: 'start' });
});
window.addEventListener('hashchange', () => fromHash());
renderBoundary();
refreshSlots();
if (!fromHash(true)) {
  if (presets.length) adoptText(stringify(presets[0].vector));
  else { rawPending = true; invalidate('No presets are supplied. Import a scenario vector.'); }
}
