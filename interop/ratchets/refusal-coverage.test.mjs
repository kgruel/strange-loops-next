import test from 'node:test';
import assert from 'node:assert/strict';
import { refusalCodes, addAnswer, checkCoverage, fuzzCoverage } from './refusal-coverage.mjs';

test('only refusal fields in answers count', () => {
  assert.deepEqual(refusalCodes({ refused: [{ id: 'x', code: 'a' }], nested: { refused: 'b' }, code: 'c' }), ['a', 'b']);
  const counts = {}; addAnswer(counts, { refused: 'a' }); assert.deepEqual(counts, { a: 1 });
});
test('allowances are known, explained and shrink-only', () => {
  assert.throws(() => checkCoverage(['a'], {}, { b: 'reason' }, 'test'), /unknown allowance/);
  assert.throws(() => checkCoverage(['a'], { a: 1 }, { a: 'reason' }, 'test'), /stale allowance/);
  assert.throws(() => checkCoverage(['a'], {}, {}, 'test'), /missing coverage/);
  assert.throws(() => checkCoverage(['a'], { b: 1 }, {}, 'test'), /unknown refusal/);
});
test('disagreement does not produce coverage', async () => {
  await assert.rejects(fuzzCoverage({ warm: false, batch: async vectors => vectors.map(() => ({ lean: { expect: { refused: 'a' } }, rust: { expect: { refused: 'b' } } })) }), /mismatch/);
});
