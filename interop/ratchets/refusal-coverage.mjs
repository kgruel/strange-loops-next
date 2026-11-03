#!/usr/bin/env node
import { readdir, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT, batchVectors, warmLean, warmRust } from '../fuzz/transport.mjs';
import { generate, FAMILIES } from '../fuzz/generate.mjs';
import { assess } from '../fuzz/evaluate.mjs';

// A complete 64-slot schedule for each of the seven families.
export const SEED = 'refusal-coverage-1';
export const SIZE = 64 * 7;
export const VECTOR_ALLOW = Object.freeze({
  'prev-not-permitted': 'Standing admission is not implemented.',
  'sum-overflow': 'Sum overflow is reserved and has no refusal implementation.',
});
export const FUZZ_ALLOW = Object.freeze({
  'prev-not-permitted': 'Standing admission is not implemented.',
  'sum-overflow': 'Sum overflow is reserved and has no refusal implementation.',
});

export function refusalCodes(answer) {
  const found = [];
  function visit(value, inRefused = false) {
    if (Array.isArray(value)) { value.forEach(item => visit(item, inRefused)); return; }
    if (!value || typeof value !== 'object') return;
    for (const [key, item] of Object.entries(value)) {
      if (key === 'refused' && typeof item === 'string') found.push(item);
      else if (inRefused && key === 'code' && typeof item === 'string') found.push(item);
      else if (typeof item === 'object') visit(item, key === 'refused' || inRefused);
    }
  }
  visit(answer);
  return found;
}
export function addAnswer(histogram, answer) {
  for (const code of refusalCodes(answer)) histogram[code] = (histogram[code] ?? 0) + 1;
}
export function checkCoverage(codes, histogram, allow, label) {
  const known = new Set(codes);
  for (const [code, reason] of Object.entries(allow)) {
    if (!known.has(code)) throw new Error(`${label}: unknown allowance ${code}`);
    if (typeof reason !== 'string' || !reason.trim() || reason.includes('\n')) throw new Error(`${label}: invalid reason ${code}`);
    if (histogram[code]) throw new Error(`${label}: stale allowance ${code}`);
  }
  for (const code of Object.keys(histogram)) if (!known.has(code)) throw new Error(`${label}: unknown refusal ${code}`);
  const missing = codes.filter(code => !histogram[code] && !Object.hasOwn(allow, code));
  if (missing.length) throw new Error(`${label}: missing coverage: ${missing.join(', ')}`);
}
async function readJson(path) {
  try { return JSON.parse(await readFile(path, 'utf8')); }
  catch (error) { throw new Error(`${path}: ${error.message}`, { cause: error }); }
}
async function* files(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* files(path);
    else if (entry.name.endsWith('.json')) yield path;
  }
}
export async function vectorCoverage(dir = join(ROOT, 'vectors')) {
  const histogram = {};
  for await (const file of files(dir)) {
    const vector = await readJson(file);
    if (Object.hasOwn(vector, 'expect')) addAnswer(histogram, vector.expect);
  }
  return histogram;
}
export async function fuzzCoverage({ batch = batchVectors, warm = true } = {}) {
  if (warm) { warmLean(); warmRust(); }
  const histogram = {};
  for (let offset = 0; offset < SIZE; offset += 64) {
    const vectors = Array.from({ length: Math.min(64, SIZE - offset) }, (_, j) => {
      const i = offset + j;
      return generate(SEED, Math.floor(i / FAMILIES.length), FAMILIES[i % FAMILIES.length]);
    });
    const answers = await batch(vectors, { rust: true });
    if (answers.length !== vectors.length) throw new Error('fuzz: transport loses vectors');
    for (let i = 0; i < vectors.length; i++) {
      if (!answers[i] || !Object.hasOwn(answers[i], 'lean') || !Object.hasOwn(answers[i], 'rust')) {
        throw new Error('fuzz: three implementation responses required');
      }
      const result = assess(vectors[i], answers[i], { rawText: JSON.stringify(vectors[i]) });
      if (result.status === 'mismatch') throw new Error(`fuzz mismatch: ${JSON.stringify(vectors[i].fuzz)}`);
      if (result.status !== 'decoder-refusal') addAnswer(histogram, result.lean);
    }
  }
  return histogram;
}
export async function main() {
  const words = await readJson(join(ROOT, 'design/grammar/words.json'));
  const codes = [...new Set(words.refusals.flatMap(group => group.codes))];
  const vectors = await vectorCoverage();
  const fuzz = await fuzzCoverage();
  console.log(JSON.stringify({ seed: SEED, size: SIZE, vectors, fuzz }, null, 2));
  checkCoverage(codes, vectors, VECTOR_ALLOW, 'vectors');
  checkCoverage(codes, fuzz, FUZZ_ALLOW, 'fuzz');
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(error => { console.error(error.stack); process.exitCode = 1; });
}
