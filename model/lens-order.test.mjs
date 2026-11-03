import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { checkLensOrder } from './lens-order.mjs';

test('approved edit source shape works without comments and rejects both mutations', () => {
  const source = readFileSync(new URL('./Loops/Lens.lean', import.meta.url), 'utf8');
  const catalogue = JSON.parse(readFileSync(new URL('./mutate/mutants.json', import.meta.url), 'utf8'));
  const stripped = source.replace(/\/-[\s\S]*?-\//g, '').replace(/--[^\n]*/g, '');
  assert.equal(checkLensOrder(source), true);
  assert.equal(checkLensOrder(stripped), true);
  for (const mutant of catalogue.filter(m => m.guard === 'lens-base-order')) {
    const changed = source.replace(mutant.before, mutant.after);
    assert.equal(checkLensOrder(changed), false, mutant.id);
    assert.equal(checkLensOrder(changed + '\n/- ' + source + ' -/'), false, 'comment is not an edit declaration');
  }
});
