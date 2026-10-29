import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { ROOT, executeBatch, warmLean } from './transport.mjs';

async function temporary(fn) {
  const dir = await mkdtemp(join(tmpdir(), 'loops-reader-test-'));
  try { return await fn(dir); } finally { await rm(dir, { recursive: true, force: true }); }
}
function check(dir) {
  return spawnSync('lake', ['--quiet', 'exe', 'run', '--check', dir], {
    cwd: join(ROOT, 'model'), encoding: 'utf8', timeout: 30000,
  });
}
const fixture = () => readFile(join(ROOT, 'vectors/fold/select/phase2-exact-output.json'), 'utf8');

test('real Lean --check compares nested exact output integers, not rounded expectations', { timeout: 120000 }, async () => {
  warmLean();
  await temporary(async dir => {
    const nested = join(dir, 'fold', 'select', 'nested');
    await mkdir(nested, { recursive: true });
    const file = join(nested, 'sum.json'), source = await fixture();
    await writeFile(file, source);
    const good = check(dir);
    assert.equal(good.status, 0, good.stdout + good.stderr);
    assert.match(good.stdout, /1 of 1 vectors reproduced/);
    for (const wrong of ['9007199254740994', '9007199254740992']) {
      await writeFile(file, source.replace('"value": 9007199254740993', `"value": ${wrong}`));
      const bad = check(dir);
      assert.equal(bad.status, 1, bad.stdout + bad.stderr);
      assert.match(bad.stdout, /expect line .* differs/);
      assert.ok(bad.stdout.includes(wrong));
    }
  });
});

test('real Lean batch computes from binary64 inputs regardless of numeric expect metadata', { timeout: 120000 }, async () => {
  await temporary(async dir => {
    const source = await fixture(), files = [];
    for (const [i, expect] of ['null', '1e999', '{"nested":[9007199254740993,-9007199254740993]}'].entries()) {
      const file = join(dir, `${i}.json`);
      // Replace only fixture metadata; never feed an output back as an input.
      const input = JSON.parse(source);
      delete input.expect;
      await writeFile(file, JSON.stringify(input).replace(/}$/, `,"expect":${expect}}`));
      files.push(file);
    }
    const answers = executeBatch(dir, files);
    for (const answer of answers) assert.deepEqual(answer.expect, {
      count: { value: 2, unread: 0 }, sum: { value: 9007199254740993n, unread: 0 },
    });
    // Lexical unsafe integers still round to binary64 and remain unread.
    const unsafe = join(dir, 'unsafe.json');
    const unsafeInput = JSON.parse(source);
    unsafeInput.input.where = { 'env.kind': { is: 'decision' } };
    await writeFile(unsafe, JSON.stringify(unsafeInput).replaceAll('"n":9007199254740991', '"n":9007199254740993'));
    files.push(unsafe);
    assert.deepEqual(executeBatch(dir, files).at(-1).expect, {
      count: { value: 2, unread: 0 }, sum: { value: 2, unread: 1 },
    });
    // The ordinary input API still rounds this fraction once to a safe integer.
    const rounded = join(dir, 'rounded.json');
    await writeFile(rounded, source.replaceAll('"n": 9007199254740991', '"n": 9007199254740991.1'));
    files.push(rounded);
    assert.deepEqual(executeBatch(dir, files).at(-1).expect, answers[0].expect);
  });
});

test('real Lean writer refuses unsafe input and ignores numeric expectations', { timeout: 120000 }, async () => {
  await temporary(async dir => {
    const original = JSON.parse(await readFile(join(ROOT, 'vectors/batch/05-large-number-out-of-range.json'), 'utf8'));
    delete original.expect;
    const source = JSON.stringify(original), files = [];
    for (const [i, metadata] of ['', ',"expect":1e999', ',"expect":{"sum":9007199254740993}'].entries()) {
      const file = join(dir, `${i}.json`);
      await writeFile(file, source.replace('9007199254740992', '9007199254740993').replace(/}$/, `${metadata}}`));
      files.push(file);
    }
    for (const answer of executeBatch(dir, files)) assert.deepEqual(answer.expect, { refused: 'number-out-of-range' });
  });
});

test('real Lean reader retains duplicate refusal, Unicode, and existing text decoding behavior', { timeout: 120000 }, async () => {
  await temporary(async dir => {
    const sources = [
      '{"layer":"spec/parse","input":{"spec":{"vertex":"a","vertex":"b","from":[{"store":"s"}]}},"expect":1e999}',
      '{"layer":"lens/section","input":{"base":[{"id":"雪😀","body":["λ"]}],"text":["::: 雪\\ud83d\\ude00","λ",":::"]},"expect":9007199254740993}',
      '{"layer":"fold/count","input":{"orders":[[]]},"input":{"orders":[[]]}}',
      '{"layer":"lens/section","input":{"base":[],"text":["\\ud800"]},"expect":1e999}',
    ];
    const files = await Promise.all(sources.map(async (source, i) => {
      const file = join(dir, `${i}.json`); await writeFile(file, source); return file;
    }));
    const answers = executeBatch(dir, files);
    assert.deepEqual(answers[0].expect, { refused: 'member-duplicate', path: 'vertex' });
    assert.deepEqual(answers[1].expect, { parsed: [{ id: '雪😀', body: ['λ'] }], normalized: ['::: 雪😀', 'λ', ':::'], outcomes: [], applied: [{ id: '雪😀', body: ['λ'] }] });
    assert.match(answers[2].error, /repeats the member "input"/);
    assert.match(answers[3].error, /expected/);
  });
});
