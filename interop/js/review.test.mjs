import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { equal, parseOutputJson, readVector } from '../answers.mjs';
import { parseSpec, parseSpecText } from './spec.mjs';
import { latestBy } from './fold.mjs';
import { tally } from './tally.mjs';
import { check as checkFold } from './check-fold.mjs';
import { check as checkSpec } from './check-spec.mjs';
import { check as checkRealm } from './check-realm.mjs';
import { check as checkScenario } from './check-scenario.mjs';

const sourceSpec = { vertex: 'v', from: [{ store: 's' }] };

test('only an absent fold defaults to empty; explicit null is refused', () => {
  const parsed = { parsed: { ...sourceSpec, fold: {} } };
  assert.deepEqual(parseSpec(sourceSpec), parsed);
  assert.deepEqual(parseSpec({ ...sourceSpec, fold: {} }), parsed);
  assert.deepEqual(parseSpecText('{"vertex":"v","from":[{"store":"s"}],"fold":null}'),
    { refused: 'fold-invalid', path: 'fold' });
});

test('collect limits are positive safe whole numbers', () => {
  const spec = limit => ({ ...sourceSpec, fold: { rows: { collect: true, limit } } });
  for (const limit of [0, -1, 1.5, 9007199254740992]) {
    assert.deepEqual(parseSpec(spec(limit)), { refused: 'limit-invalid', path: 'fold.rows.limit' });
  }
  for (const limit of [1, Number.MAX_SAFE_INTEGER]) assert.deepEqual(parseSpec(spec(limit)), { parsed: spec(limit) });
  assert.deepEqual(parseSpecText('{"vertex":"v","from":[{"store":"s"}],"fold":{"rows":{"collect":true,"limit":9007199254740993}}}'),
    { refused: 'limit-invalid', path: 'fold.rows.limit' });
});

test('latest-by retains things with no heads and a null winner', () => {
  const id = `r:${'a'.repeat(52)}`;
  for (const about of [[], ['t:x']]) {
    const out = latestBy([{ id, about, prev: [id] }]);
    assert.deepEqual({ ...out }, { [about[0] ?? id]: { heads: [], winner: null, others: [] } });
  }
  assert.deepEqual({ ...latestBy([]) }, {});
});

test('answer equality compares actual binary integers and nested outputs without canonicalization', () => {
  assert.ok(equal(9007199254740992, 9007199254740992n));
  assert.ok(equal(9007199254740992n, 9007199254740992));
  assert.ok(!equal(9007199254740992, 9007199254740993n));
  assert.ok(equal(1000000000000000100, 1000000000000000128n));
  assert.ok(!equal(1000000000000000100, 1000000000000000100n));
  assert.ok(!equal(1n, 1.5));
  assert.ok(!equal([1], { 0: 1 }));
  assert.ok(!equal([1, 2], [2, 1]));
  const got = { rows: [{ sum: 9007199254740993n }], text: '9007199254740993' };
  const want = Object.assign(Object.create(null), { text: '9007199254740993', rows: [{ sum: 9007199254740993n }] });
  assert.ok(equal(got, want));
  const t = tally();
  t.expect('same', got, want);
  t.expect('different', 9007199254740993n, 9007199254740994n);
  t.expect('nested difference', got, { ...want, rows: [{ sum: 9007199254740994n }] });
  t.expect('quoted text', got, { ...want, text: '9007199254740994' });
  assert.equal(t.passed, 1);
  assert.equal(t.failures.length, 3);
  assert.match(t.failures[0], /got 9007199254740993n, want 9007199254740994n/);
});

test('vector inputs remain binary64 while only expected output uses exact integer sources', () => {
  const raw = String.raw`{"input":{"n":9007199254740993,"fraction":1.5,"exponent":1e400},"expect":{"nested":[9007199254740993,-9007199254740993],"text":"9007199254740993","escaped":"\"9007199254740993\""}}`;
  const v = readVector(raw);
  assert.equal(v.input.n, 9007199254740992);
  assert.equal(typeof v.input.n, 'number');
  assert.equal(v.input.fraction, 1.5);
  assert.equal(v.input.exponent, Infinity);
  assert.deepEqual(v.expect, { nested: [9007199254740993n, -9007199254740993n], text: '9007199254740993', escaped: '"9007199254740993"' });
  assert.equal(readVector('{"expect":9007199254740993}').expect, 9007199254740993n);
  assert.deepEqual(readVector('{"input":{"n":9007199254740993}}'), { input: { n: 9007199254740992 } });
  assert.deepEqual(parseOutputJson('{"x":1e0,"y":-0,"text":"1.5"}'), { x: 1, y: -0, text: '1.5' });
  for (const text of ['1.5', '9007199254740992.0', '9007199254740992e0', '1e400']) {
    assert.throws(() => parseOutputJson(text), /no exact integer source/);
  }
});

test('fold, spec, realm and scenario checkers reject wrong exact sums', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'loops-js-review-'));
  try {
    for (const family of ['fold/sum', 'fold/select', 'spec/parse', 'spec/run', 'realm', 'scenario']) {
      await mkdir(join(dir, family), { recursive: true });
    }
    const ids = [`r:${'a'.repeat(52)}`, `r:${'b'.repeat(51)}a`, `r:${'c'.repeat(51)}a`];
    const records = ids.map((id, i) => ({ id, kind: 'note', observer: 'o:x', emitted: `2024-01-01T00:00:0${i}Z`,
      about: ['t:x'], prev: [], shown: 'here', value: '9007199254740993', n: [Number.MAX_SAFE_INTEGER, 2, 'UNSAFE_INPUT'][i] }));
    const spec = { ...sourceSpec, fold: { total: { sum: 'n' } } };
    const sum = { value: 'EXACT_SUM', unread: 1 };
    const settled = ids.map(id => ({ id, shown: 'here' }));
    const fixtures = [
      ['fold/sum', checkFold, { orders: [records] }, 'EXACT_SUM'],
      ['fold/select', checkFold, { orders: [records] }, { count: { value: 3, unread: 0 }, sum }],
      ['spec/run', checkSpec, { spec, orders: [records] }, { total: sum }],
      ['realm', checkRealm, { forms: records }, { settled, refused: [], things: { 't:x': { heads: [...ids].reverse(), winner: ids[2], others: [ids[1], ids[0]] } }, sum }],
      ['scenario', checkScenario, { spec, thing: 't:x', records, steps: [{ name: 'all', forms: ids.map(id => ({ id, shown: 'here' })), orders: [ids] }] },
        { steps: [{ settled, admitted: ids, heads: [...ids].reverse(), winner: ids[2], slots: { total: sum } }] }],
    ];
    for (const [family, check, input, expect] of fixtures) {
      const file = join(dir, family, 'exact.json');
      const fixture = total => JSON.stringify({ vector: 'exact', layer: family, input, expect })
        .replaceAll('"UNSAFE_INPUT"', '9007199254740993').replaceAll('"EXACT_SUM"', total);
      const raw = fixture('9007199254740993');
      await writeFile(file, raw);
      assert.deepEqual(check(dir).failures, [], family);
      // Change only the expected sum. Identical inputs still produce ...993n.
      const wrong = fixture('9007199254740994');
      assert.notEqual(wrong, raw);
      await writeFile(file, wrong);
      const failed = check(dir);
      assert.ok(failed.failures.length > 0, family);
      assert.match(failed.failures.join('\n'), /9007199254740993n/);
      assert.match(failed.failures.join('\n'), /9007199254740994n/);
      await rm(file);
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
