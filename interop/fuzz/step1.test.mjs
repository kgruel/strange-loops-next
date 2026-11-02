// Unit checks only. No engine processes or campaigns run here.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { generate } from './generate.mjs';
import { evaluateJS } from './evaluate.mjs';
import { occurredSpan } from '../js/loops.mjs';

const dir = new URL('../../vectors/byte-text/', import.meta.url);
test('byte-text adapter uses the public strict decoder', () => {
  for (const file of readdirSync(dir)) {
    const vector = JSON.parse(readFileSync(new URL(file, dir), 'utf8'));
    assert.deepEqual(evaluateJS(vector), [vector.expect], file);
  }
});

test('named record boundaries remain scheduled across seeds', () => {
  const names = ['id-uppercase', 'id-w', 'id-x', 'id-y', 'id-z', 'id-pad-bits', 'salt-pad-bits'];
  const parts = ['emitted', 'occurred-single', 'occurred-start', 'occurred-stop', 'occurred-open'];
  const kinds = ['offset', 'second-60', 'trailing-zero', 'ten-digits'];
  names.push(...parts.flatMap(part => kinds.map(kind => `${part}-${kind}`)), 'unknown-envelope-key-empty-kind');
  for (const seed of ['a', 'b', 'c', 'd']) {
    for (const [i, name] of names.entries()) {
      const v = generate(seed, i, 'record');
      assert.equal(v.fuzz.nearMiss, name);
      assert.equal(v.input.envs.length, 1);
      const env = v.input.envs[0];
      if (i === 6) { assert.throws(() => evaluateJS(v)); continue; }
      const expected = i < 6 ? 'prev-not-record-id' : i < 11 ? 'emitted-not-rfc3339'
        : i < 27 ? 'occurred-not-span' : 'envelope-field-unknown';
      assert.deepEqual(evaluateJS(v), Array(i === 27 ? 1 : 2).fill({ refused: expected }), name);
      if (i === 27) { assert.equal(env.kind, ''); assert.equal(env.extra, true); }
    }
  }
});

test('record preflight and writer refusal precede seed decoding', () => {
  const env = { kind: '', observer: 'o:x', emitted: '2024-01-01T00:00:00Z' };
  const input = { envs: [env], payloads: [null], salt: '00000000000000000000000000', seed: '!' };
  assert.deepEqual(evaluateJS({ layer: 'record', input }), [{ refused: 'kind-empty' }]);
  input.envs.push({ ...env, extra: true });
  input.salt = '!';
  assert.deepEqual(evaluateJS({ layer: 'record', input }), [{ refused: 'envelope-field-unknown' }]);
});

test('record shape refusal escapes Cartesian expansion in both malformed orders', () => {
  for (const raw of [7, { kind: 7 }]) {
    const unknown = { kind: '', extra: true };
    for (const envs of [[raw, unknown], [unknown, raw], [{ extra: 1 }], [{ kind: 7, extra: 1 }]]) {
      const input = { envs, payloads: [null, {}], salt: '!', seed: '!' };
      assert.deepEqual(evaluateJS({ layer: 'record', input }), [{ refused: 'envelope-field-unknown' }]);
    }
  }
});

test('raw batch preflight retains every repeated envelope member', () => {
  for (const envs of ['"env":{"extra":1},"env":{"kind":""}', '"env":{"kind":""},"env":{"extra":1}']) {
    const raw = `{"layer":"batch","input":{"held":[],"drafts":[{${envs},"salt":"","payload":null}]}}`;
    assert.deepEqual(evaluateJS(JSON.parse(raw), raw), [{ refused: 'envelope-field-unknown' }]);
  }
});

test('shape cases are scheduled in both orders', () => {
  for (const seed of ['a', 'b']) {
    for (let i = 10; i < 20; i++) {
      const v = generate(seed, i, 'batch');
      assert.match(v.fuzz.nearMiss, /^shape-/);
      assert.deepEqual(evaluateJS(v), [{ refused: 'envelope-field-unknown' }]);
    }
    for (let i = 28; i < 32; i++) {
      const v = generate(seed, i, 'record');
      assert.match(v.fuzz.nearMiss, /^shape-multi-record-/);
      assert.deepEqual(evaluateJS(v), [{ refused: 'envelope-field-unknown' }]);
    }
  }
});

test('valid generated records include fractional instants and occurred forms', () => {
  const envs = Array.from({ length: 128 }, (_, i) => generate('valid-times', i * 64 + 40, 'record'))
    .filter(v => v.fuzz.nearMiss === null).flatMap(v => v.input.envs);
  assert.ok(envs.some(env => /\.\d+Z$/.test(env.emitted)));
  assert.ok(envs.some(env => /T.*\//.test(env.occurred)));
  assert.ok(envs.some(env => /T.*Z$/.test(env.occurred)));
  const intervals = envs.filter(env => env.occurred.includes('/'));
  assert.ok(intervals.some(env => env.occurred.includes('T') && !env.occurred.endsWith('/..')));
  assert.ok(intervals.some(env => env.occurred.includes('T') && env.occurred.endsWith('/..')));
  for (const env of intervals) assert.ok(occurredSpan(env.occurred), env.occurred);
});
