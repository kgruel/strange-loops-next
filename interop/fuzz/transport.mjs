import { spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export function warmLean() {
  const result = spawnSync('lake', ['build', 'run'], { cwd: join(ROOT, 'model'), encoding: 'utf8', timeout: 120000 });
  if (result.error || result.status !== 0) throw new Error(`Lean build fails: ${result.error?.message ?? result.stderr ?? result.stdout}`);
}

// Every requested path has exactly one response. Unexpected output fails the transport.
export function parseResponses(stdout, files) {
  const expected = new Set(files.map(f => resolve(f)));
  if (expected.size !== files.length) throw new Error('duplicate requested file');
  const responses = new Map();
  for (const line of stdout.split('\n').filter(line => line.trim())) {
    let response;
    try {
      response = JSON.parse(line, (_key, value, context) => {
        if (typeof value !== 'number' || Number.isSafeInteger(value)) return value;
        if (/^-?\d+$/.test(context?.source ?? '')) return BigInt(context.source);
        throw new Error('batch number has no exact integer source');
      });
    }
    catch { throw new Error(`non-JSON batch output: ${line.slice(0, 200)}`); }
    if (!response || typeof response.file !== 'string') throw new Error('batch response has no file');
    const file = resolve(response.file);
    if (!expected.has(file)) throw new Error(`unexpected response: ${file}`);
    if (responses.has(file)) throw new Error(`duplicate response: ${file}`);
    const hasError = Object.hasOwn(response, 'error'), hasExpect = Object.hasOwn(response, 'expect');
    if (hasError === hasExpect || (hasError && typeof response.error !== 'string')) throw new Error(`invalid response: ${file}`);
    responses.set(file, response);
  }
  if (responses.size !== files.length) throw new Error(`missing responses: ${files.length - responses.size}`);
  return files.map(f => responses.get(resolve(f)));
}

export function executeBatch(directory, files, { timeoutMs = 120000, command = 'lake' } = {}) {
  const result = spawnSync(command, ['--quiet', 'exe', 'run', '--batch', resolve(directory)], {
    cwd: join(ROOT, 'model'), encoding: 'utf8', timeout: timeoutMs, maxBuffer: 64 * 1024 * 1024,
  });
  if (result.error) throw new Error(`Lean batch transport fails: ${result.error.message}`);
  if (result.status !== 0) throw new Error(`Lean batch exits ${result.status} (${result.signal ?? 'no signal'}): ${result.stderr}`);
  return parseResponses(result.stdout, files);
}

// A chunk uses one Lean process. Temporary input files survive only in an artifact run.
export async function batchVectors(vectors, { directory, rawText, ...options } = {}) {
  if (rawText !== undefined && vectors.length !== 1) throw new Error('raw replay needs one vector');
  const owned = !directory;
  directory = directory ? resolve(directory) : await mkdtemp(join(tmpdir(), 'loops-fuzz-'));
  try {
    await mkdir(directory, { recursive: true });
    const files = vectors.map((_, i) => join(directory, `${String(i).padStart(6, '0')}.json`));
    await Promise.all(files.map((file, i) => writeFile(file, rawText ?? (JSON.stringify(vectors[i]) + '\n'))));
    return executeBatch(directory, files, options);
  } finally {
    if (owned) await rm(directory, { recursive: true, force: true });
  }
}
