// Mock-only tests. This file never starts Lean, Rust, or a real campaign.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { readFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { assess } from './evaluate.mjs';
import { equal } from '../answers.mjs';
import { batchVectors, executeBatch, parseResponses, warmRust, ROOT } from './transport.mjs';
import { sameDisagreement, shrink, candidates } from './shrink.mjs';
import { parseArgs, campaign } from './run.mjs';

const vector = { layer: 'fold/count', input: { orders: [[], []] } };
const response = (lean, rust) => ({ lean: { expect: lean }, rust: { expect: rust } });
const check = (lean, rust, answers = [0, 0]) => assess(vector, response(lean, rust), { js: () => answers });
async function temporary(fn) {
  const dir = await mkdtemp(join(tmpdir(), 'loops-fuzz-phase2-'));
  try { return await fn(dir); } finally { await rm(dir, { recursive: true, force: true }); }
}

test('three-way comparison records every order, pair, and equality group without a verdict', () => {
  const agreement = check(0, 0);
  assert.equal(agreement.status, 'match');
  assert.deepEqual(assess(vector, { rust: { expect: 0 }, lean: { expect: 0 } }).comparison, agreement.comparison);
  assert.deepEqual(agreement.implementations, ['js', 'lean', 'rust']);
  assert.deepEqual(agreement.comparison.acceptance, { lean: 'decoded', rust: 'decoded', js: 'answered' });
  assert.deepEqual(agreement.comparison.partition, [['lean', 'rust', 'js:0', 'js:1']]);
  for (const [lean, rust, answers, partition] of [
    [1, 0, [0, 0], [['lean'], ['rust', 'js:0', 'js:1']]],
    [0, 1, [0, 0], [['lean', 'js:0', 'js:1'], ['rust']]],
    [0, 0, [1, 1], [['lean', 'rust'], ['js:0', 'js:1']]],
    [0, 1, [2, 3], [['lean'], ['rust'], ['js:0'], ['js:1']]],
    [0, 0, [0, 1], [['lean', 'rust', 'js:0'], ['js:1']]],
  ]) {
    const result = check(lean, rust, answers);
    assert.equal(result.status, 'mismatch');
    assert.deepEqual(result.jsAnswers, answers);
    assert.deepEqual(result.comparison.partition, partition);
    assert.equal(result.comparison.pairwise['lean:rust'], lean === rust);
    assert.equal(result.comparison.pairwise['lean:js:1'], lean === answers[1]);
    assert.equal(result.comparison.pairwise['rust:js:1'], rust === answers[1]);
    assert.equal(result.comparison.pairwise['js:0:js:1'], answers[0] === answers[1]);
    assert.equal(result.responses.lean.expect, lean);
    assert.equal(result.responses.rust.expect, rust);
    assert.equal(Object.hasOwn(result, 'guilty'), false);
  }
  assert.equal(check({ refused: true }, { refused: true }, [{ refused: true }]).status, 'protocol-refusal');
  assert.equal(check({ refused: 'bad' }, { refused: 'bad' }, [{ refused: 'bad' }]).status, 'protocol-refusal');
  assert.equal(check({ refused: [] }, { refused: [] }, [{ refused: [] }]).status, 'match');
  assert.equal(check({ refused: 'a' }, { refused: 'b' }, [{ refused: 'a' }]).status, 'mismatch');
  assert.equal(assess(vector, { expect: 0 }).status, 'match');
});

test('shared decoder refusals ignore diagnostic spelling; one-sided refusal remains a mismatch', () => {
  let calls = 0;
  const js = () => { calls++; return [0]; };
  const shared = assess(vector, { lean: { error: 'Lean detail' }, rust: { error: 'Rust detail' } }, { js });
  assert.equal(shared.status, 'decoder-refusal');
  assert.equal(calls, 0);
  assert.deepEqual(shared.diagnostics, { lean: 'Lean detail', rust: 'Rust detail' });
  assert.equal(shared.comparison.pairwise['lean:rust'], true);
  assert.deepEqual(shared.comparison.acceptance, { lean: 'decoder-refusal', rust: 'decoder-refusal', js: 'not-called' });
  const leanOnly = assess(vector, { lean: { error: 'Lean detail' }, rust: { expect: 0 } }, { js });
  assert.equal(leanOnly.status, 'mismatch');
  assert.equal(calls, 0);
  assert.equal(leanOnly.leanError, 'Lean detail');
  assert.equal(leanOnly.rust, 0);
  assert.equal(leanOnly.comparison.pairwise['lean:rust'], false);
  assert.equal(Object.hasOwn(leanOnly, 'jsAnswers'), false);
  const rustOnly = assess(vector, { lean: { expect: 0 }, rust: { error: 'Rust detail' } }, { js });
  assert.equal(rustOnly.status, 'mismatch');
  assert.equal(calls, 1);
  assert.equal(rustOnly.comparison.pairwise['lean:js:0'], true);
  assert.equal(rustOnly.comparison.pairwise['rust:js:0'], false);
  assert.throws(() => assess(vector, { lean: { expect: 0 }, rust: {} }), /Rust response/);
});

test('JS exceptions retain both engine answers and exact exception identity', () => {
  const broken = (name, message, lean = 0, rust = 0) => assess(vector, response(lean, rust), {
    js() { const error = new Error(message); error.name = name; throw error; },
  });
  const original = broken('TypeError', 'broken');
  assert.equal(original.status, 'mismatch');
  assert.equal(original.lean, 0); assert.equal(original.rust, 0);
  assert.deepEqual(original.jsException, { name: 'TypeError', message: 'broken' });
  assert.ok(sameDisagreement(original, broken('TypeError', 'broken', 9, 9)));
  assert.ok(!sameDisagreement(original, broken('Error', 'broken')));
  assert.ok(!sameDisagreement(original, broken('TypeError', 'other')));
  assert.ok(!sameDisagreement(original, broken('TypeError', 'broken', 0, 1)));
  assert.ok(!sameDisagreement(original, check(0, 0, [1])));
});

test('both engine parsers preserve exact unsafe integers, including nested negative sums', () => {
  for (const engine of ['lean', 'rust']) {
    const [r] = parseResponses('{"file":"/tmp/a.json","expect":{"sum":9007199254740993,"negative":-9007199254740993}}', ['/tmp/a.json'], { engine });
    assert.deepEqual(r.expect, { sum: 9007199254740993n, negative: -9007199254740993n });
    assert.equal(check(r.expect, r.expect, [{ sum: 9007199254740992, negative: -9007199254740992 }]).status, 'mismatch');
    assert.equal(check(r.expect, r.expect, [r.expect]).status, 'match');
    assert.ok(equal(9007199254740992n, 9007199254740992));
    assert.ok(!equal(9007199254740993n, 9007199254740992));
    assert.throws(() => parseResponses('{"file":"/tmp/a.json","expect":1e400}', ['/tmp/a.json'], { engine }), /non-JSON/);
  }
});

test('response validation and fatal process failures name the engine', () => {
  const files = ['/tmp/a.json', '/tmp/b.json'];
  const a = JSON.stringify({ file: files[0], expect: 0 });
  const b = JSON.stringify({ file: files[1], error: 'bad input' });
  for (const engine of ['lean', 'rust']) {
    const label = engine === 'lean' ? 'Lean' : 'Rust';
    const rejects = (stdout, pattern) => assert.throws(() => parseResponses(stdout, files, { engine }), error => error.message.startsWith(label) && pattern.test(error.message));
    assert.equal(parseResponses(`${b}\n${a}`, files, { engine })[0].expect, 0);
    rejects(a, /missing/); rejects(`${a}\n${a}`, /duplicate/);
    rejects('noise', /non-JSON/); rejects('{"expect":0}', /no file/);
    rejects('{"file":"/tmp/else.json","expect":0}', /unexpected/);
    rejects('{"file":"/tmp/a.json","expect":0,"error":"bad"}', /invalid/);
    rejects('{"file":"/tmp/a.json","error":1}', /invalid/);
    assert.throws(() => parseResponses(a, [files[0], files[0]], { engine }), new RegExp(`${label}.*duplicate requested`));
    for (const result of [
      { error: new Error('ENOENT') }, { error: new Error('ETIMEDOUT') },
      { status: 2, stderr: 'fatal IO' }, { status: null, signal: 'SIGTERM', stderr: '' },
      { status: 0, stdout: a },
    ]) {
      assert.throws(() => executeBatch('/tmp', files, { engine, timeoutMs: 17, spawn(_cmd, _args, opts) {
        assert.equal(opts.timeout, 17); assert.equal(opts.maxBuffer, 64 * 1024 * 1024);
        return result;
      } }), error => error.message.startsWith(`${label} batch`));
    }
  }
});

test('Rust warmup has the public build contract and fails fatally', () => {
  let calls = 0;
  warmRust({ spawn(command, args, options) {
    calls++;
    assert.equal(command, 'cargo');
    assert.deepEqual(args, ['build', '-p', 'loops-eval', '--bin', 'loops-eval']);
    assert.equal(options.cwd, join(ROOT, 'rust'));
    return { status: 0 };
  } });
  assert.equal(calls, 1);
  assert.throws(() => warmRust({ spawn: () => ({ status: 1, stderr: 'bad build' }) }), /Rust build fails: bad build/);
});

test('input-only dispatch writes one chunk for both public CLIs and shares the parser', async () => {
  await temporary(async directory => {
    const vectors = [vector, { ...vector, input: { orders: [[]] } }];
    const seen = [];
    const answers = await batchVectors(vectors, { directory, rust: true, spawn(command, args, options) {
      const rust = command.endsWith('loops-eval');
      assert.equal(command, rust ? join(ROOT, 'rust/target/debug/loops-eval') : 'lake');
      assert.deepEqual(args, rust ? ['--batch', directory] : ['--quiet', 'exe', 'run', '--batch', directory]);
      assert.equal(options.cwd, rust ? ROOT : join(ROOT, 'model'));
      const files = readdirSync(directory).sort().map(name => join(directory, name));
      const sources = files.map(file => readFileSync(file, 'utf8'));
      seen.push({ files, sources });
      const lines = files.map((file, i) => {
        const input = JSON.parse(sources[i]);
        assert.equal(Object.hasOwn(input, 'expect'), false);
        // Compute from input. No vector expect or fixture lookup is available.
        return JSON.stringify({ file, expect: input.input.orders[0].length });
      });
      return { status: 0, stdout: lines.reverse().join('\n') };
    } });
    assert.deepEqual(seen[0], seen[1]);
    assert.equal(seen.length, 2);
    assert.equal(answers.length, 2);
    for (let i = 0; i < answers.length; i++) {
      assert.equal(answers[i].lean.file, answers[i].rust.file);
      assert.equal(assess(vectors[i], answers[i]).status, 'match');
    }
    await assert.rejects(batchVectors([vector, vector], { rawText: '{}' }), /one vector/);
    const notDirectory = join(directory, 'not-directory');
    await writeFile(notDirectory, '');
    await assert.rejects(batchVectors([vector], { directory: notDirectory, rust: true }), /Lean\/Rust batch input IO fails/);
  });
});

test('shrinking keeps acceptance, disagreeing implementations, all order groups, and coherent inputs', async () => {
  const source = { layer: 'fold/count', input: { orders: [
    [{ id: 'a', value: 'long' }, { id: 'b', value: 'other' }],
    [{ id: 'b', value: 'other' }, { id: 'a', value: 'long' }],
  ] } };
  const original = assess(source, response(2, 3), { js: () => [2, 2] });
  assert.ok(sameDisagreement(original, check(4, 9, [4, 4])));
  assert.ok(!sameDisagreement(original, check(4, 4, [9, 9])));
  assert.ok(!sameDisagreement(original, check(9, 4, [4, 4])));
  assert.ok(!sameDisagreement(original, check(4, 9, [4, 9])));
  const legacy = { status: 'mismatch', lean: 1, rust: 2, js: 1 };
  assert.ok(sameDisagreement(legacy, { status: 'mismatch', lean: 3, rust: 4, js: 3 }));
  assert.ok(!sameDisagreement(legacy, { status: 'mismatch', lean: 1, rust: 1, js: 2 }));
  assert.ok(!sameDisagreement(legacy, { status: 'mismatch', lean: 1, rustError: 'shape', js: 1 }));
  const decoder = assess(source, { lean: { expect: 2 }, rust: { error: 'reject' } }, { js: () => [2, 2] });
  assert.ok(!sameDisagreement(original, decoder));
  assert.ok(sameDisagreement(decoder, assess(source, { lean: { expect: 4 }, rust: { error: 'different detail' } }, { js: () => [4, 4] })));
  assert.ok(!sameDisagreement(decoder, assess(source, { lean: { error: 'reject' }, rust: { expect: 2 } })));
  const reduced = await shrink(source, original, async xs => xs.map(v => {
    if (!v.input?.orders?.length || v.input.orders.some(o => !Array.isArray(o))) return { status: 'decoder-refusal' };
    const n = v.input.orders[0].length;
    return assess(v, response(n, n + 1), { js: () => v.input.orders.map(o => o.length) });
  }), { maxTrials: 64, batchSize: 4 });
  assert.ok(reduced.rounds > 0); assert.ok(reduced.trials <= 64);
  assert.ok(sameDisagreement(original, reduced.answer));
  assert.equal(reduced.vector.layer, source.layer);
  assert.ok(JSON.stringify(reduced.vector).length < JSON.stringify(source).length);
  for (const candidate of candidates(source)) if (candidate.input.orders?.every(Array.isArray)) {
    const orders = candidate.input.orders.map(o => o.map(r => JSON.stringify(r)).sort());
    for (const order of orders) assert.deepEqual(order, orders[0]);
  }
});

test('mock campaign names implementations, builds each once, and shrinks every raw failure through both engines', async () => {
  await temporary(async out => {
    const options = parseArgs(['--rust', '--family', 'lens', '--n', '3', '--chunk-size', '2', '--out', out, '--shrink-trials', '4']);
    let leanBuilds = 0, rustBuilds = 0, rawCalls = 0, shrinkCalls = 0;
    const { summary } = await campaign(options, {
      buildLean() { leanBuilds++; }, buildRust() { rustBuilds++; }, js: () => [0],
      async batch(vectors, opts) {
        assert.equal(opts.rust, true);
        if (opts.directory) rawCalls++;
        else {
          shrinkCalls++;
          // Each raw failure exists before its first reduction batch.
          const raw = JSON.parse(await readFile(join(out, 'mismatches', `${String(shrinkCalls - 1).padStart(6, '0')}.json`), 'utf8'));
          assert.equal(raw.answer.status, 'mismatch');
          assert.equal(Object.hasOwn(raw, 'shrink'), false);
        }
        return vectors.map(() => response(0, 9007199254740993n));
      },
    });
    assert.equal(leanBuilds, 1); assert.equal(rustBuilds, 1);
    assert.equal(rawCalls, 2); assert.equal(shrinkCalls, 3);
    assert.equal(summary.mismatches, 3); assert.equal(summary.shrinkTrials, 12);
    assert.deepEqual(summary.implementations, ['js', 'lean', 'rust']);
    const savedOptions = JSON.parse(await readFile(join(out, 'options.json'), 'utf8'));
    assert.deepEqual(savedOptions.implementations, summary.implementations);
    for (let i = 0; i < 3; i++) {
      const artifact = JSON.parse(await readFile(join(out, 'mismatches', `${String(i).padStart(6, '0')}.json`), 'utf8'));
      assert.deepEqual(artifact.answer.rust, { $integer: '9007199254740993' });
      assert.deepEqual(artifact.shrink.answer.comparison.partition, artifact.answer.comparison.partition);
    }
  });
});

test('mock campaign saves the raw failure even when reduction transport fails fatally', async () => {
  await temporary(async out => {
    await assert.rejects(campaign(parseArgs(['--rust', '--family', 'lens', '--n', '1', '--out', out]), {
      warm: false, js: () => [0],
      batch: async (_vectors, opts) => {
        if (!opts.directory) throw new Error('Rust batch transport fails: ETIMEDOUT');
        return [response(0, 1)];
      },
    }), /Rust batch transport fails/);
    const saved = JSON.parse(await readFile(join(out, 'mismatches/000000.json'), 'utf8'));
    assert.equal(saved.answer.status, 'mismatch');
    assert.equal(Object.hasOwn(saved, 'shrink'), false);
  });
});

test('raw replay sends identical source to both engines and never rewrites or shrinks it', async () => {
  await temporary(async dir => {
    const raw = '{"layer":"spec/parse","input":{"spec":{"vertex":"a","vertex":"b"}}}';
    const replay = join(dir, 'raw.json');
    await writeFile(replay, raw);
    let calls = 0;
    const result = await campaign(parseArgs(['--rust', '--replay', replay, '--out', join(dir, 'run')]), {
      warm: false,
      js(_vector, source) { assert.equal(source, raw); return [0]; },
      async batch(vectors, opts) {
        calls++; assert.equal(opts.rawText, raw); assert.equal(opts.rust, true);
        return batchVectors(vectors, { ...opts, spawn(command, args) {
          const file = join(args.at(-1), '000000.json');
          assert.equal(readFileSync(file, 'utf8'), raw);
          return { status: 0, stdout: JSON.stringify({ file, expect: command.endsWith('loops-eval') ? 1 : 0 }) };
        } });
      },
    });
    assert.equal(calls, 1); assert.equal(result.summary.mismatches, 1); assert.equal(result.summary.shrinkTrials, 0);
    assert.equal(await readFile(join(result.out, 'inputs/00000/000000.json'), 'utf8'), raw);
  });
});

test('mock campaigns shrink either one-sided decoder mismatch and save shared diagnostics separately', async () => {
  const profiles = [
    { lean: { error: 'lean shape' }, rust: { expect: 0 } },
    { lean: { expect: 0 }, rust: { error: 'rust shape' } },
    { lean: { error: 'lean shape' }, rust: { error: 'rust detail' } },
  ];
  for (let i = 0; i < profiles.length; i++) await temporary(async out => {
    let jsCalls = 0, reductionCalls = 0;
    const { summary } = await campaign(parseArgs(['--rust', '--family', 'lens', '--n', '1', '--out', out, '--shrink-trials', '4']), {
      warm: false,
      js() { jsCalls++; return [0]; },
      batch: async (vectors, opts) => {
        if (!opts.directory) reductionCalls++;
        assert.equal(opts.rust, true);
        return vectors.map(() => profiles[i]);
      },
    });
    if (i === 2) {
      assert.equal(summary.decoderRefusals, 1); assert.equal(summary.mismatches, 0);
      assert.equal(reductionCalls, 0);
      const diagnostics = JSON.parse(await readFile(join(out, 'decoder-refusals.json'), 'utf8'));
      assert.deepEqual(diagnostics[0].diagnostics, { lean: 'lean shape', rust: 'rust detail' });
    } else {
      assert.equal(summary.mismatches, 1); assert.equal(summary.decoderRefusals, 0);
      assert.ok(reductionCalls > 0); assert.equal(summary.shrinkTrials, 4);
      const saved = JSON.parse(await readFile(join(out, 'mismatches/000000.json'), 'utf8'));
      assert.ok(sameDisagreement(saved.answer, saved.shrink.answer));
    }
    assert.equal(jsCalls > 0, i === 1);
  });
});

test('three-way CLI is explicit and cannot skip generated failure reduction', () => {
  assert.deepEqual(parseArgs([]).implementations, ['js', 'lean']);
  assert.deepEqual(parseArgs(['--rust']).implementations, ['js', 'lean', 'rust']);
  assert.throws(() => parseArgs(['--rust', '--no-shrink']), /requires shrinking/);
});
