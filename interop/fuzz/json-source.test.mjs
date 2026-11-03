import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { jsonSourceAt } from '../json-source.mjs';
import { evaluateJS } from './evaluate.mjs';
import { campaign, parseArgs } from './run.mjs';
import { batchVectors } from './transport.mjs';

test('source spans preserve nesting, escapes, lexemes, and primitives', () => {
  const text = String.raw` {"a\u0062": [ {"x":1,"x":2,"nested":["]}",{"q":"\\\""}]}, -1.2500e+09, true, null, "a\\b\"c" ] } `;
  assert.equal(jsonSourceAt(text, ['ab', 0]), String.raw`{"x":1,"x":2,"nested":["]}",{"q":"\\\""}]}`);
  assert.equal(jsonSourceAt(text, ['ab', 1]), '-1.2500e+09');
  assert.equal(jsonSourceAt(text, ['ab', 2]), 'true');
  assert.equal(jsonSourceAt(text, ['ab', 3]), 'null');
  assert.equal(jsonSourceAt(text, ['ab', 4]), String.raw`"a\\b\"c"`);
  assert.throws(() => jsonSourceAt(text, ['ab', 5]), /missing or ambiguous/);
  assert.throws(() => jsonSourceAt('{"a":1,"\\u0061":2}', ['a']), /missing or ambiguous/);
  assert.throws(() => jsonSourceAt('{"a":1}', ['a', 'b']), /missing or ambiguous/);
});

test('raw record replay preserves duplicate payload members', { timeout: 120000 }, async () => {
  const dir = await mkdtemp(join(tmpdir(), 'loops-json-source-'));
  try {
    const fixture = JSON.parse(await readFile(new URL('../../vectors/record/01-minimal.json', import.meta.url), 'utf8'));
    const vector = { layer: fixture.layer, input: fixture.input };
    vector.input.envs = [vector.input.envs[0]];
    vector.input.payloads = [{ x: 1 }];
    const structured = JSON.stringify(vector);
    const raw = structured.replace('"payloads":[{"x":1}]', '"payloads":[{"x":1,"x":2}]');
    assert.notEqual(raw, structured);
    const file = join(dir, 'record.json');
    await writeFile(file, raw);
    const [lean] = await batchVectors([JSON.parse(raw)], { rawText: raw });
    assert.deepEqual(lean.expect, { refused: 'member-duplicate' });
    assert.deepEqual(evaluateJS(JSON.parse(raw), raw), [{ refused: 'member-duplicate' }]);
    const { summary, out } = await campaign(parseArgs(['--replay', file, '--out', join(dir, 'out')]), { warm: false });
    assert.equal(summary.protocolRefusals, 1);
    assert.equal(summary.mismatches, 0);
    assert.equal(await readFile(join(out, 'inputs', '00000', '000000.json'), 'utf8'), raw);
    assert.deepEqual(evaluateJS(vector, structured), evaluateJS(vector));
    const multiple = { ...vector, input: { ...vector.input, payloads: [{ x: 1 }, { x: 2 }] } };
    const multipleRaw = JSON.stringify(multiple).replace('{"x":2}', '{"x":2,"x":3}');
    const answers = evaluateJS(JSON.parse(multipleRaw), multipleRaw);
    assert.deepEqual(answers[0], evaluateJS(vector)[0]);
    assert.deepEqual(answers[1], { refused: 'member-duplicate' });
    const explicit = { ...vector, input: { ...vector.input, payload_text: '{"x":1,"x":2}' } };
    assert.deepEqual(evaluateJS(explicit, JSON.stringify(explicit)), evaluateJS(explicit));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
