#!/usr/bin/env node
import { mkdir, mkdtemp, readFile, readdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { performance } from 'node:perf_hooks';
import { FAMILIES, generate } from './generate.mjs';
import { assess } from './evaluate.mjs';
import { batchVectors, warmLean, warmRust } from './transport.mjs';
import { shrink } from './shrink.mjs';
import { addAnswer } from '../ratchets/refusal-coverage.mjs';

function number(text, flag, min = 1) {
  const n = Number(text);
  if (!Number.isSafeInteger(n) || n < min) throw new Error(`${flag} needs a safe integer >= ${min}`);
  return n;
}
export function parseArgs(args) {
  const options = { seed: '1', n: 70, chunkSize: 64, timeoutMs: 120000, maxTrials: 80, noShrink: false, rust: false };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--no-shrink') { options.noShrink = true; continue; }
    if (arg === '--rust') { options.rust = true; continue; }
    if (!['--seed', '--n', '--family', '--out', '--replay', '--chunk-size', '--timeout-ms', '--shrink-trials'].includes(arg)) {
      throw new Error(`unknown option: ${arg}`);
    }
    if (i + 1 === args.length || args[i + 1].startsWith('--')) throw new Error(`missing value: ${arg}`);
    const value = args[++i];
    if (arg === '--seed') options.seed = value;
    if (arg === '--family') options.family = value;
    if (arg === '--out') options.out = resolve(value);
    if (arg === '--replay') options.replay = resolve(value);
    if (arg === '--n') options.n = number(value, arg);
    if (arg === '--chunk-size') options.chunkSize = number(value, arg);
    if (arg === '--timeout-ms') options.timeoutMs = number(value, arg);
    if (arg === '--shrink-trials') options.maxTrials = number(value, arg, 0);
  }
  if (options.family && !FAMILIES.includes(options.family)) throw new Error(`unknown family: ${options.family}`);
  if (options.chunkSize > 256) throw new Error('--chunk-size must be <= 256');
  if (options.rust && options.noShrink) throw new Error('--rust requires shrinking; --no-shrink is two-way only');
  options.implementations = options.rust ? ['js', 'lean', 'rust'] : ['js', 'lean'];
  return options;
}

export async function persistMismatch(out, index, artifact) {
  await mkdir(join(out, 'mismatches'), { recursive: true });
  const file = join(out, 'mismatches', `${String(index).padStart(6, '0')}.json`);
  await writeFile(file, JSON.stringify(artifact, (_key, value) =>
    typeof value === 'bigint' ? { $integer: value.toString() } : value, 2) + '\n');
  return file;
}

export async function campaign(options, {
  js, warm = true, batch = batchVectors, buildLean = warmLean, buildRust = warmRust,
} = {}) {
  if (options.rust && options.noShrink) throw new Error('--rust requires shrinking; --no-shrink is two-way only');
  const implementations = options.rust ? ['js', 'lean', 'rust'] : ['js', 'lean'];
  const out = options.out ?? await mkdtemp(join(tmpdir(), 'loops-fuzz-run-'));
  await mkdir(out, { recursive: true });
  const entries = await readdir(out);
  if (entries.length) throw new Error(`artifact directory is not empty: ${out}`);
  if (warm) {
    buildLean();
    if (options.rust) buildRust();
  }
  const start = performance.now();
  const families = options.family ? [options.family] : FAMILIES;
  let replay, rawText;
  if (options.replay) {
    let content;
    try { content = JSON.parse(await readFile(options.replay, 'utf8')); }
    catch (error) { throw new Error(`replay ${options.replay}: ${error.message}`, { cause: error }); }
    replay = content.vector ?? content;
    rawText = content.rawText ?? (!content.vector ? await readFile(options.replay, 'utf8') : undefined);
  }
  const summary = { implementations, seed: String(options.seed), requested: replay ? 1 : options.n, counts: {},
    mismatches: 0, decoderRefusals: 0, protocolRefusals: 0, refusalCodes: {}, chunks: 0, shrinkTrials: 0, seconds: 0 };
  await writeFile(join(out, 'options.json'), JSON.stringify({ ...options, implementations }, null, 2) + '\n');
  const diagnostics = [];
  let failureIndex = 0;
  for (let offset = 0; offset < summary.requested; offset += options.chunkSize) {
    const vectors = Array.from({ length: Math.min(options.chunkSize, summary.requested - offset) }, (_, j) => {
      const i = offset + j;
      return replay ?? generate(options.seed, Math.floor(i / families.length), families[i % families.length]);
    });
    // A replay preserves raw spec member order and repeated members.
    const directory = join(out, 'inputs', String(summary.chunks).padStart(5, '0'));
    const answers = await batch(vectors, { directory, timeoutMs: options.timeoutMs, rawText, rust: options.rust });
    if (answers.length !== vectors.length) throw new Error('campaign transport loses vectors');
    summary.chunks++;
    for (let j = 0; j < vectors.length; j++) {
      const vector = vectors[j], result = assess(vector, answers[j], { js, rawText });
      const family = vector.fuzz?.family ?? vector.layer.split('/')[0];
      const counts = summary.counts[family] ??= { cases: 0, match: 0, 'protocol-refusal': 0, 'decoder-refusal': 0, mismatch: 0 };
      counts.cases++; counts[result.status]++;
      if (result.status === 'decoder-refusal') {
        summary.decoderRefusals++;
        diagnostics.push({ case: offset + j, vector: vector.fuzz, layer: vector.layer,
          diagnostic: result.diagnostic, diagnostics: result.diagnostics });
      }
      if (result.status === 'protocol-refusal') summary.protocolRefusals++;
      if (result.status !== 'mismatch' && result.status !== 'decoder-refusal') addAnswer(summary.refusalCodes, result.lean);
      if (result.status !== 'mismatch') continue;
      summary.mismatches++;
      const artifact = { implementations, vector, rawText, answer: result,
        note: 'Unclassified disagreement. Parent review decides its cause.' };
      // Persist the raw case before any reduction or transport failure.
      const index = failureIndex++;
      await persistMismatch(out, index, artifact);
      if (!options.noShrink && !rawText) {
        artifact.shrink = await shrink(vector, result, async candidates => {
          const responses = await batch(candidates, { timeoutMs: options.timeoutMs, rust: options.rust });
          if (responses.length !== candidates.length) throw new Error('shrink transport loses candidates');
          return candidates.map((v, i) => assess(v, responses[i], { js }));
        }, { maxTrials: options.maxTrials });
        summary.shrinkTrials += artifact.shrink.trials;
        await persistMismatch(out, index, artifact);
      }
    }
    summary.seconds = (performance.now() - start) / 1000;
    await writeFile(join(out, 'decoder-refusals.json'), JSON.stringify(diagnostics, null, 2) + '\n');
    await writeFile(join(out, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');
  }
  return { out, summary };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const { out, summary } = await campaign(parseArgs(process.argv.slice(2)));
    process.stdout.write(JSON.stringify({ out, ...summary }, null, 2) + '\n');
    process.exitCode = summary.mismatches ? 1 : 0;
  } catch (error) { console.error(error.stack); process.exitCode = 2; }
}
