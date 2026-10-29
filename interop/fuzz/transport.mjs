import { spawnSync } from 'node:child_process';
import { parseOutputJson } from '../answers.mjs';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const MAX_BUFFER = 64 * 1024 * 1024;
const ENGINES = {
  lean: { label: 'Lean', cwd: join(ROOT, 'model'), command: 'lake', args: dir => ['--quiet', 'exe', 'run', '--batch', dir] },
  rust: { label: 'Rust', cwd: ROOT, command: join(ROOT, 'rust/target/debug/loops-eval'), args: dir => ['--batch', dir] },
};
function engineConfig(engine) {
  if (!Object.hasOwn(ENGINES, engine)) throw new Error(`unknown batch engine: ${engine}`);
  return ENGINES[engine];
}
function build(engine, command, args, cwd, spawn) {
  const { label } = engineConfig(engine);
  const result = spawn(command, args, { cwd, encoding: 'utf8', timeout: 120000, maxBuffer: MAX_BUFFER });
  if (result.error || result.status !== 0) {
    throw new Error(`${label} build fails: ${result.error?.message ?? result.stderr ?? result.stdout}`);
  }
}
export function warmLean({ spawn = spawnSync } = {}) {
  build('lean', 'lake', ['build', 'run'], join(ROOT, 'model'), spawn);
}
export function warmRust({ spawn = spawnSync } = {}) {
  build('rust', 'cargo', ['build', '-p', 'loops-eval', '--bin', 'loops-eval'], join(ROOT, 'rust'), spawn);
}

// Every requested path has exactly one response. Unexpected output fails the transport.
export function parseResponses(stdout, files, { engine = 'lean' } = {}) {
  const { label } = engineConfig(engine);
  const fail = message => { throw new Error(`${label} batch: ${message}`); };
  if (typeof stdout !== 'string' || Buffer.byteLength(stdout) > MAX_BUFFER) fail('output exceeds buffer bound');
  const expected = new Set(files.map(f => resolve(f)));
  if (expected.size !== files.length) fail('duplicate requested file');
  const responses = new Map();
  for (const line of stdout.split('\n').filter(line => line.trim())) {
    let response;
    try {
      response = parseOutputJson(line);
    }
    catch { fail(`non-JSON batch output: ${line.slice(0, 200)}`); }
    if (!response || typeof response.file !== 'string') fail('batch response has no file');
    const file = resolve(response.file);
    if (!expected.has(file)) fail(`unexpected response: ${file}`);
    if (responses.has(file)) fail(`duplicate response: ${file}`);
    const hasError = Object.hasOwn(response, 'error'), hasExpect = Object.hasOwn(response, 'expect');
    if (hasError === hasExpect || (hasError && typeof response.error !== 'string')) fail(`invalid response: ${file}`);
    responses.set(file, response);
  }
  if (responses.size !== files.length) fail(`missing responses: ${files.length - responses.size}`);
  return files.map(f => responses.get(resolve(f)));
}

export function executeBatch(directory, files, { timeoutMs = 120000, engine = 'lean', command, spawn = spawnSync } = {}) {
  const config = engineConfig(engine);
  const result = spawn(command ?? config.command, config.args(resolve(directory)), {
    cwd: config.cwd, encoding: 'utf8', timeout: timeoutMs, maxBuffer: MAX_BUFFER,
  });
  if (result.error) throw new Error(`${config.label} batch transport fails: ${result.error.message}`);
  if (result.status !== 0) throw new Error(`${config.label} batch exits ${result.status} (${result.signal ?? 'no signal'}): ${result.stderr}`);
  return parseResponses(result.stdout, files, { engine });
}

// Write each chunk once. Both engines read these same input-only paths.
// Two-way mode returns Lean wrappers. Rust mode returns { lean, rust } per vector.
export async function batchVectors(vectors, { directory, rawText, rust = false, ...options } = {}) {
  if (rawText !== undefined && vectors.length !== 1) throw new Error('raw replay needs one vector');
  const owned = !directory;
  const label = rust ? 'Lean/Rust' : 'Lean';
  directory = directory ? resolve(directory) : undefined;
  try {
    let files;
    try {
      directory ??= await mkdtemp(join(tmpdir(), 'loops-fuzz-'));
      await mkdir(directory, { recursive: true });
      files = vectors.map((_, i) => join(directory, `${String(i).padStart(6, '0')}.json`));
      await Promise.all(files.map((file, i) => writeFile(file, rawText ?? (JSON.stringify(vectors[i]) + '\n'))));
    } catch (error) {
      throw new Error(`${label} batch input IO fails: ${error.message}`, { cause: error });
    }
    const lean = executeBatch(directory, files, { ...options, engine: 'lean' });
    if (!rust) return lean;
    const answers = executeBatch(directory, files, { ...options, engine: 'rust' });
    return lean.map((response, i) => ({ lean: response, rust: answers[i] }));
  } finally {
    if (owned && directory) {
      try { await rm(directory, { recursive: true, force: true }); }
      catch (error) { throw new Error(`${label} batch cleanup IO fails: ${error.message}`, { cause: error }); }
    }
  }
}
