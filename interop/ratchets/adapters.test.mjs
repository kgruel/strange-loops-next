import test from 'node:test';
import assert from 'node:assert/strict';
import { scan, applyAllowances, run } from './adapters.mjs';
import { resolveBatch } from '../js/batch.mjs';

const codes = new Set(['kind-empty']);
test('comments are ignored; quoted codes and internal references are found', () => {
  const source = `// 'kind-empty' checkEnvelopeKeys\n/* check_keys "kind-empty" */\nconst a = 'kind-empty'; const b = "kind-empty"; L.checkEnvelopeKeys(envs);`;
  assert.deepEqual(scan(source, 'js', codes).map(t => t.value), ['kind-empty', 'kind-empty', 'checkEnvelopeKeys']);
  assert.deepEqual(scan('-- "kind-empty"\n/- check_keys /- nested -/ -/\n"kind-empty"', 'lean', codes).map(t => t.value), ['kind-empty']);
  assert.deepEqual(scan('/* check_keys */ r#"kind-empty"#; check_all_keys();', 'rust', codes).map(t => t.value), ['kind-empty', 'check_all_keys']);
});
test('Rust test modules are excluded, production references are not', () => {
  const source = '#[cfg(test)] mod tests { fn t() { check_keys(); } } fn f() { check_keys(); }';
  assert.deepEqual(scan(source, 'rust', codes).map(t => t.value), ['check_keys']);
});
test('allowances need reasons and become stale when unused', () => {
  const entry = { file: 'x', value: 'check_keys', reason: 'legacy' };
  assert.deepEqual(applyAllowances([{ file: 'x', value: 'check_keys', line: 1 }], [entry]), []);
  assert.match(applyAllowances([], [entry])[0], /stale allowance/);
  assert.match(applyAllowances([], [{ ...entry, reason: '' }]).join('\n'), /missing reason/);
  assert.match(applyAllowances([{ file: 'y', value: 'check_keys', line: 1 }], [entry]).join('\n'), /forbidden/);
});
test('raw repeated draft envelopes are checked before typed drafts', () => {
  const raw = '[{"env":{"extra":1},"env":{},"salt":"","payload":null}]';
  assert.deepEqual(resolveBatch(JSON.parse(raw), [], raw), { refused: 'envelope-field-unknown' });
});
test('repository inventory and allowances are current', () => run());
