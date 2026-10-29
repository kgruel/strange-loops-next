import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile, mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { FAMILIES, FOLD_LAYERS, generate } from './generate.mjs';
import { assess, equal } from './evaluate.mjs';
import { ROOT, batchVectors, executeBatch, parseResponses, warmLean } from './transport.mjs';
import { candidates, sameDisagreement, shrink } from './shrink.mjs';
import { campaign, parseArgs, persistMismatch } from './run.mjs';

async function temporary(fn) {
  const dir = await mkdtemp(join(tmpdir(), 'loops-fuzz-test-'));
  try { return await fn(dir); } finally { await rm(dir, { recursive: true, force: true }); }
}
async function* jsonFiles(dir) {
  for (const entry of (await readdir(dir, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* jsonFiles(path);
    else if (entry.name.endsWith('.json')) yield path;
  }
}

test('generation is deterministic, varied, balanced, and independent of scheduling', () => {
  const corpus = FAMILIES.flatMap(f => Array.from({ length: 8 }, (_, i) => generate('stable', i, f)));
  assert.equal(createHash('sha256').update(JSON.stringify(corpus)).digest('hex'),
    '29ab67014503e8f9289ea57d57bc8a6fe210485648effeb50c8ee2df08643b5c');
  const layers = new Set();
  for (const family of FAMILIES) {
    const seen = new Set();
    for (let i = 0; i < 32; i++) {
      const vector = generate('stable', i, family);
      assert.deepEqual(vector, generate('stable', i, family));
      assert.notDeepEqual(vector, generate('other', i, family));
      seen.add(JSON.stringify(vector.input)); layers.add(vector.layer);
      if (vector.input.orders) {
        const sets = vector.input.orders.map(o => o.map(r => JSON.stringify(r)).sort());
        for (const set of sets) assert.deepEqual(set, sets[0]);
      }
      const records = vector.input.orders?.flat().filter(r => typeof r === 'object')
        ?? vector.input.records ?? vector.input.forms ?? [];
      for (const record of records) if (record.id !== 'r:bad') assert.match(record.id, /^r:[a-z2-7]{51}[aq]$/);
    }
    assert.ok(seen.size > 25, family);
    const isolated = generate('stable', 6, family);
    for (const other of FAMILIES) generate('stable', 20, other);
    assert.deepEqual(generate('stable', 6, family), isolated);
  }
  for (const layer of FOLD_LAYERS) assert.ok(layers.has(`fold/${layer}`));
  assert.ok(layers.has('spec/run')); assert.ok(layers.has('spec/parse'));
});

test('raw numeric folds use readable records and specs use settled forms', () => {
  for (let i = 0; i < 128; i++) {
    const fold = generate('domains', i, 'fold');
    if (['fold/sum', 'fold/extrema'].includes(fold.layer)) {
      for (const r of fold.input.orders[0]) assert.equal(r.shown ?? 'here', 'here');
    }
    const spec = generate('domains', i, 'spec');
    if (spec.layer !== 'spec/run') continue;
    const rs = spec.input.orders[0], erased = new Set(rs.flatMap(r => r.erases ?? []));
    for (const r of rs) {
      assert.equal(r.shown === 'erased', erased.has(r.id));
      if (erased.has(r.id)) assert.equal(Object.hasOwn(r, 'n'), false);
    }
  }
});

test('scheduled lens boundaries retain their intended inputs', () => {
  const pick = (index, label) => {
    for (let seed = 0; seed < 100; seed++) {
      const vector = generate(seed, index, 'lens');
      if (vector.fuzz.nearMiss === label) return vector.input;
    }
    assert.fail(`no unoverridden lens case at ${index}`);
  };
  const escaped = pick(4, null);
  assert.deepEqual(escaped.base[0].body, ['::: old', '\\old', '', 'λ']);
  assert.deepEqual(escaped.text, ['::: t:fence', '\\:::', '\\::: next', '\\\\next', '', '雪', ':::']);
  assert.deepEqual(pick(5, 'section-repeat').text,
    ['::: t:repeat', 'first', ':::', '::: t:repeat', 'second', ':::']);
  assert.deepEqual(pick(6, 'section-empty').text, ['::: ', 'body', ':::']);
  const repeated = pick(7, 'base-repeat');
  assert.deepEqual(repeated.base, [{ id: 't:repeat', body: ['first'] }, { id: 't:repeat', body: ['second'] }]);
  assert.deepEqual(repeated.text, ['::: t:repeat', 'first', ':::']);
});

test('scheduled numeric records reach each reader without dependencies', () => {
  for (const family of ['fold', 'spec', 'realm', 'scenario']) {
    let vector;
    for (let seed = 0; seed < 100; seed++) {
      const candidate = generate(seed, 9, family);
      if (candidate.fuzz.nearMiss === null) { vector = candidate; break; }
    }
    assert.ok(vector, family);
    const input = vector.input;
    if (family === 'fold') assert.equal(vector.layer, 'fold/sum');
    if (family === 'spec') assert.equal(vector.layer, 'spec/run');
    const records = input.orders?.[0] ?? input.records ?? input.forms.slice(0, 3);
    assert.deepEqual(records.map(r => r.n), [Number.MAX_SAFE_INTEGER, 2, -Number.MAX_SAFE_INTEGER]);
    assert.equal(new Set(records.map(r => r.id)).size, 3);
    for (const r of records) {
      assert.match(r.id, /^r:[a-z2-7]{51}[aq]$/);
      assert.deepEqual(r.about, ['t:numeric']);
      assert.deepEqual(r.prev, []);
      assert.equal(r.shown, 'here');
      assert.equal(r.under, undefined); assert.equal(r.erases, undefined);
    }
    if (family === 'scenario') {
      assert.equal(input.thing, 't:numeric');
      assert.deepEqual(input.steps.at(-1).forms.map(f => f.shown), ['here', 'here', 'here']);
      assert.deepEqual(input.steps.at(-1).orders[0], records.map(r => r.id));
    }
  }
});

test('scheduled batch references point to held records', () => {
  for (const index of [4, 5]) {
    let input;
    for (let seed = 0; seed < 100; seed++) {
      const vector = generate(seed, index, 'batch');
      if (vector.fuzz.nearMiss === null) { input = vector.input; break; }
    }
    assert.ok(input);
    const held = input.held[0], draft = input.drafts[0];
    assert.match(held.id, /^r:[a-z2-7]{51}[aq]$/);
    assert.deepEqual(held.about, draft.env.about);
    if (index === 4) assert.deepEqual(draft.env.prev, [held.id]);
    else assert.equal(draft.env.under, held.id);
  }
});

test('structured equality ignores object order and prototypes, but keeps arrays and strings exact', () => {
  assert.ok(equal({ a: 1, b: 2 }, Object.assign(Object.create(null), { b: 2, a: 1 })));
  assert.ok(!equal([1, 2], [2, 1]));
  assert.ok(!equal({ text: '{"a":1,"b":2}' }, { text: '{"b":2,"a":1}' }));
  assert.ok(!equal([], {}));
  assert.ok(equal(9007199254740992n, 9007199254740992));
  assert.ok(equal(9007199254740992, 9007199254740992n));
  assert.ok(!equal(9007199254740993n, 9007199254740992));
  assert.ok(!equal(1n, 1.5));
});

test('all existing supported vectors agree with the public API adapters', async () => {
  let checked = 0, refused = 0;
  for (const family of FAMILIES) {
    for await (const file of jsonFiles(join(ROOT, 'vectors', family))) {
      const rawText = await readFile(file, 'utf8'), vector = JSON.parse(rawText);
      const result = assess(vector, { expect: vector.expect }, { rawText });
      assert.notEqual(result.status, 'mismatch', `${file}\n${JSON.stringify(result)}`);
      checked++; refused += result.status === 'protocol-refusal';
    }
  }
  assert.ok(checked > 100); assert.ok(refused > 10);
});

test('reviewed candidate vectors reproduce both recorded answers', async () => {
  const vectors = [];
  for await (const file of jsonFiles(join(ROOT, 'interop/fuzz/found'))) {
    vectors.push(JSON.parse(await readFile(file, 'utf8')));
  }
  assert.deepEqual((await readdir(join(ROOT, 'interop/fuzz/found'))).sort(), ['03-duplicate-base-id.json']);
  assert.equal(vectors.length, 1);
  const responses = await batchVectors(vectors);
  for (let i = 0; i < vectors.length; i++) {
    const vector = vectors[i], result = assess(vector, responses[i]);
    assert.ok(equal(responses[i].expect, vector.expect));
    assert.equal(result.status, 'mismatch', 'A finding resolves. Update or promote its candidate vector.');
    assert.ok(equal(result.js, vector.js));
  }
});

test('official gap17 vectors agree', async () => {
  const vectors = await Promise.all(['gap17-duplicate-id.json', 'gap17-empty-id.json'].map(async name =>
    JSON.parse(await readFile(join(ROOT, 'vectors/lens/section', name), 'utf8'))));
  const responses = await batchVectors(vectors);
  for (let i = 0; i < vectors.length; i++) {
    assert.ok(equal(responses[i].expect, vectors[i].expect));
    assert.equal(assess(vectors[i], responses[i]).status, 'protocol-refusal');
  }
});

test('adapters align per-thing heads and admission boundaries', async () => {
  const a = { id: `r:${'a'.repeat(52)}`, kind: 'note', observer: 'o:x', about: ['t:x', 't:y'],
    prev: [], emitted: '2024-01-01T00:00:00Z', value: '', n: 9 };
  const b = { ...a, id: `r:${'b'.repeat(51)}a`, about: ['t:x'], prev: [a.id], n: 1 };
  const orders = [[a, b], [b, a]];
  const vectors = ['fold/heads', 'fold/view'].map(layer => ({ layer, input: { orders } }));
  vectors.push({ layer: 'fold/latest', input: { orders } });
  vectors.push({ layer: 'spec/run', input: { spec: { vertex: 'v', from: [{ store: 's:local' }], fold: { total: { count: true } } },
    orders: [[{ ...a, about: ['t:x'] }, { ...b, about: ['t:y'] }]] } });
  const responses = await batchVectors(vectors);
  for (let i = 0; i < vectors.length; i++) {
    assert.equal(assess(vectors[i], responses[i]).status, 'match', JSON.stringify(responses[i]));
  }
  assert.equal(responses[0].expect.max.value, 9);
  assert.ok(responses[1].expect.heads.some(head => head.id === a.id));
  assert.deepEqual(responses[2].expect, { winner: b.id, others: [a.id] });
  assert.equal(responses[3].expect.total.value, 1);
});

test('decoder refusals, protocol refusals, and JS exceptions have distinct accounts', () => {
  const vector = generate('transport', 0, 'lens');
  let invoked = false;
  assert.equal(assess(vector, { error: 'input: expected an array' }, { js() { invoked = true; } }).status, 'decoder-refusal');
  assert.equal(invoked, false);
  assert.equal(assess(vector, { expect: { refused: [] } }, { js: () => [{ refused: [] }] }).status, 'match');
  assert.equal(assess(vector, { expect: { refused: 'label-unknown' } }, {
    js: () => [{ refused: 'label-unknown' }],
  }).status, 'protocol-refusal');
  assert.equal(assess(vector, { expect: {} }, { js() { throw new TypeError('broken adapter'); } }).status, 'mismatch');
  assert.throws(() => assess(vector, {}), /no answer/);
});

test('a boundary injection proves that the detector sees altered answers', () => {
  const vector = { layer: 'fold/count', input: { orders: [[], []] } };
  assert.equal(assess(vector, { expect: 0 }).status, 'match');
  assert.equal(assess(vector, { expect: 0 }, { js: () => [0, 1] }).status, 'mismatch');
  assert.equal(assess(vector, { expect: 0 }, { js: () => [1] }).status, 'mismatch');
});

test('transport rejects missing, duplicate, unexpected, and malformed responses', () => {
  const files = ['/tmp/a.json', '/tmp/b.json'];
  const a = JSON.stringify({ file: files[0], expect: 0 });
  const b = JSON.stringify({ file: files[1], error: 'bad input' });
  assert.equal(parseResponses(`${b}\n${a}\n`, files)[0].expect, 0);
  assert.equal(parseResponses('{"file":"/tmp/a.json","expect":9007199254740993}', [files[0]])[0].expect, 9007199254740993n);
  assert.throws(() => parseResponses(a, files), /missing/);
  assert.throws(() => parseResponses(`${a}\n${a}`, files), /duplicate/);
  assert.throws(() => parseResponses('noise', files), /non-JSON/);
  assert.throws(() => parseResponses('{"file":"/tmp/else.json","expect":0}', files), /unexpected/);
  assert.throws(() => parseResponses('{"file":"/tmp/a.json","error":1}', files), /invalid/);
  assert.throws(() => executeBatch('/tmp', [], { command: '/no-such-command' }), /transport fails/);
});

test('real Lean batch sorts recursive files and continues after decoding errors', { timeout: 120000 }, async () => {
  warmLean();
  await temporary(async dir => {
    await mkdir(join(dir, 'nested'));
    const a = join(dir, 'a.json'), b = join(dir, 'nested', 'b.json'), c = join(dir, 'z.json');
    await writeFile(a, JSON.stringify({ layer: 'fold/count', input: { orders: [[]] } }));
    await writeFile(b, JSON.stringify({ layer: 'fold/count', input: { orders: 'wrong' } }));
    await writeFile(c, JSON.stringify({ layer: 'lens/section', input: { base: [], text: [] } }));
    const command = spawnSync('lake', ['--quiet', 'exe', 'run', '--batch', dir], {
      cwd: join(ROOT, 'model'), encoding: 'utf8', timeout: 10000,
    });
    assert.equal(command.status, 0, command.stderr);
    const lines = command.stdout.trim().split('\n').map(line => JSON.parse(line));
    assert.deepEqual(lines.map(r => r.file), [a, b, c]);
    assert.equal(lines[0].expect, 0); assert.match(lines[1].error, /expected an array/);
    assert.equal(assess(JSON.parse(await readFile(c, 'utf8')), lines[2]).status, 'match');
    assert.throws(() => executeBatch(join(dir, 'missing'), []), /exits/);
    assert.throws(() => executeBatch(dir, [a, b, c], { timeoutMs: 1 }), /transport fails/);
    // Existing single-file output stays an answer, not a batch wrapper.
    const single = spawnSync('lake', ['--quiet', 'exe', 'run', a], {
      cwd: join(ROOT, 'model'), encoding: 'utf8', timeout: 10000,
    });
    assert.equal(single.status, 0); assert.equal(JSON.parse(single.stdout), 0);
  });
});

test('shrinking bounds trials, repairs arrival sets, and persists both answers', async () => {
  const vector = { layer: 'fold/count', input: { orders: [
    [{ id: 'a', value: 'long text' }, { id: 'b', value: 'more text' }],
    [{ id: 'b', value: 'more text' }, { id: 'a', value: 'long text' }],
  ] } };
  const original = { status: 'mismatch', lean: 2, js: 3 };
  const result = await shrink(vector, original, async xs => xs.map(v => {
    const os = v.input?.orders;
    if (!Array.isArray(os) || !os.length || os.some(o => !Array.isArray(o))) return { status: 'decoder-refusal' };
    const ids = o => o.map(r => r?.id).sort().join(',');
    if (os.some(o => ids(o) !== ids(os[0]))) return { status: 'decoder-refusal' };
    return { status: 'mismatch', lean: os[0].length, js: os[0].length + 1 };
  }), { maxTrials: 40, batchSize: 4 });
  assert.ok(result.trials <= 40); assert.ok(result.rounds > 0);
  assert.ok(JSON.stringify(result.vector).length < JSON.stringify(vector).length);
  assert.equal(result.vector.layer, vector.layer);
  assert.ok(!sameDisagreement(original, { status: 'mismatch', jsException: { name: 'TypeError', message: 'new bug' } }));
  assert.ok(!sameDisagreement(original, { status: 'decoder-refusal' }));
  const reduced = [...candidates(vector)];
  assert.ok(reduced.some(v => v.input?.orders?.[0]?.length === 1 && v.input.orders[1].length === 1));
  for (const v of reduced) if (v.input.orders?.every(Array.isArray)) {
    const sets = v.input.orders.map(o => o.map(r => JSON.stringify(r)).sort());
    for (const set of sets) assert.deepEqual(set, sets[0]);
  }
  assert.ok(reduced.some(v => v.input.orders?.[0]?.some(r => r.id === 'a' && r.value === '')));
  for (const v of candidates(generate('stable', 0, 'scenario'))) {
    if (!Array.isArray(v.input?.steps)) continue;
    for (const step of v.input.steps) {
      if (!Array.isArray(step?.forms) || !Array.isArray(step?.orders)) continue;
      const ids = step.forms.map(f => f?.id).sort();
      for (const order of step.orders) if (Array.isArray(order)) assert.deepEqual([...order].sort(), ids);
    }
  }
  await temporary(async dir => {
    const file = await persistMismatch(dir, 0, { vector, answer: original, shrink: result });
    const saved = JSON.parse(await readFile(file, 'utf8'));
    assert.deepEqual(saved.shrink, result); assert.deepEqual(saved.answer, original);
    const large = await persistMismatch(dir, 1, { answer: { lean: 9007199254740993n, js: 1 } });
    assert.deepEqual(JSON.parse(await readFile(large, 'utf8')).answer.lean, { $integer: '9007199254740993' });
  });
});

test('small real campaign counts every family and persists injected failures', { timeout: 120000 }, async () => {
  await temporary(async dir => {
    const options = parseArgs(['--seed', 'ci-1', '--n', '28', '--out', dir, '--no-shrink']);
    const { summary } = await campaign(options, { warm: false });
    assert.equal(Object.keys(summary.counts).length, FAMILIES.length);
    assert.equal(Object.values(summary.counts).reduce((n, x) => n + x.cases, 0), 28);
    assert.equal(summary.mismatches, 0, JSON.stringify(summary));
    const injected = await campaign(parseArgs(['--family', 'lens', '--n', '1', '--out', join(dir, 'injected'), '--shrink-trials', '16']), {
      warm: false, js: () => [{ injected: true }],
    });
    assert.equal(injected.summary.mismatches, 1);
    const artifact = JSON.parse(await readFile(join(injected.out, 'mismatches', '000000.json'), 'utf8'));
    assert.equal(artifact.answer.status, 'mismatch'); assert.ok(artifact.shrink.trials <= 16);
    assert.equal(artifact.shrink.answer.status, 'mismatch');
  });
});

test('raw replay preserves duplicate spec members through Lean and JS', { timeout: 120000 }, async () => {
  await temporary(async dir => {
    const file = join(dir, 'repeat.json');
    await writeFile(file, '{"layer":"spec/parse","input":{"spec":{"vertex":"a","vertex":"b","from":[{"store":"s"}]}}}');
    const { summary, out } = await campaign(parseArgs(['--replay', file, '--out', join(dir, 'replay')]), { warm: false });
    assert.equal(summary.requested, 1); assert.equal(summary.protocolRefusals, 1); assert.equal(summary.mismatches, 0);
    assert.equal(await readFile(join(out, 'inputs', '00000', '000000.json'), 'utf8'), await readFile(file, 'utf8'));
    await assert.rejects(campaign(parseArgs(['--n', '1', '--out', out]), { warm: false }), /not empty/);
  });
});

test('CLI options reject ambiguous or unbounded inputs', () => {
  for (const args of [['--n', '0'], ['--n', '1.2'], ['--family', 'other'], ['--seed'], ['--chunk-size', '257'], ['--wat']]) {
    assert.throws(() => parseArgs(args));
  }
});
