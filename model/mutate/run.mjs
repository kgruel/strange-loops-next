#!/usr/bin/env node
import { spawn, spawnSync } from 'node:child_process';
import { readFile, writeFile, mkdir, mkdtemp, rm, readdir, rename, cp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { realpathSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pathToFileURL } from 'node:url';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const model = path.join(root, 'model');
const lock = path.join(model, '.mutation-run.lock');
const cataloguePath = path.join(model, 'mutate/mutants.json');

// Catalogue names target the library, including its raw readers.
export function sourcePath(file) {
  if (!/^(?:Loops\/)?[A-Za-z0-9-]+\.lean$/.test(file)) throw new Error(`Invalid mutant source: ${file}`);
  return `model/${file.includes('/') ? file : `Loops/${file}`}`;
}

export function replaceUnique(source, before, after) {
  const i = source.indexOf(before);
  if (i < 0 || source.indexOf(before, i + 1) !== -1) throw new Error('Replacement site is not unique');
  return { text: source.slice(0, i) + after + source.slice(i + before.length), line: source.slice(0, i).split('\n').length };
}

export async function files(dir, prefix = '') {
  const result = new Map();
  for (const entry of await readdir(path.join(dir, prefix), { withFileTypes: true })) {
    const name = path.join(prefix, entry.name);
    if (entry.isDirectory()) for (const [k, v] of await files(dir, name)) result.set(k, v);
    else if (entry.isFile()) result.set(name, await readFile(path.join(dir, name)));
    else throw new Error(`Unsupported vector entry: ${name}`);
  }
  return result;
}
export async function changedPaths(a, b) {
  const left = await files(a), right = await files(b);
  return [...new Set([...left.keys(), ...right.keys()])].sort().filter(k => !left.has(k) || !right.has(k) || !left.get(k).equals(right.get(k)));
}

function git(args) {
  const r = spawnSync('git', args, { cwd: root, encoding: 'utf8' });
  if (r.error || r.status !== 0) throw new Error(`git ${args[0]} failed: ${r.error?.message || r.stderr}`);
  return r.stdout;
}

let interrupted = null;
let active = null;
let signalKillTimer;
function stopTree(signal = 'SIGTERM') {
  if (!active) return;
  try { process.kill(-active.pid, signal); } catch (e) { if (e.code !== 'ESRCH') throw e; }
}
function onSignal(signal) {
  interrupted ||= signal;
  stopTree();
  if (active && !signalKillTimer) signalKillTimer = setTimeout(() => stopTree('SIGKILL'), 2000);
}

async function groupGone(pid) {
  try { process.kill(-pid, 0); } catch (e) { if (e.code === 'ESRCH') return true; throw e; }
  // Orphaned zombies cannot execute or retain files; some init processes reap slowly.
  const ps = spawnSync('ps', ['-axo', 'pgid=,stat='], { encoding: 'utf8' });
  if (ps.status !== 0) return false;
  const members = ps.stdout.trim().split('\n').map(line => line.trim().split(/\s+/)).filter(([group]) => Number(group) === pid);
  return members.length > 0 && members.every(([, state]) => state.startsWith('Z'));
}

export async function command(program, args, timeout, logPath, allowInterrupted = false) {
  const commandLine = [program, ...args];
  if (interrupted && !allowInterrupted) return { command: commandLine, status: 'interrupted', signal: interrupted };
  const initialSignal = interrupted;
  return await new Promise(resolve => {
    let out = '', timedOut = false, spawnError = null, killTimer;
    const child = spawn(program, args, { cwd: model, detached: true, stdio: ['ignore', 'pipe', 'pipe'] });
    active = child;
    child.stdout.on('data', chunk => { out += chunk; });
    child.stderr.on('data', chunk => { out += chunk; });
    const timer = setTimeout(() => { timedOut = true; stopTree(); killTimer = setTimeout(() => stopTree('SIGKILL'), 2000); }, timeout * 1000);
    child.on('error', error => { spawnError = error.message; });
    child.on('close', async (code, signal) => {
      clearTimeout(timer); clearTimeout(killTimer); clearTimeout(signalKillTimer); signalKillTimer = null;
      // A descendant can outlive its leader. Terminate the entire group before cleanup.
      try { process.kill(-child.pid, 'SIGKILL'); } catch (e) { if (e.code !== 'ESRCH') spawnError ||= e.message; }
      let cleanupError;
      if (child.pid) {
        const deadline = Date.now() + 2000;
        try {
          while (!(await groupGone(child.pid))) {
            if (Date.now() >= deadline) { cleanupError = `Process group ${child.pid} did not disappear after SIGKILL`; break; }
            await new Promise(resolve => setTimeout(resolve, 25));
          }
        } catch (e) { cleanupError = `Process group cleanup failed: ${e.message}`; }
      }
      active = null;
      try { await writeFile(logPath, out); } catch (e) { spawnError ||= e.message; }
      let status = 'nonzero';
      if (code === 0) status = 'ok';
      if (signal) status = 'signal';
      if (spawnError) status = 'spawn-error';
      if (timedOut) status = 'timeout';
      if (interrupted && (!allowInterrupted || interrupted !== initialSignal)) status = 'interrupted';
      if (cleanupError) status = 'cleanup-error';
      resolve({ command: commandLine, status, code, signal, error: cleanupError || spawnError, log: logPath });
    });
  });
}

function options(args) {
  const o = { timeout: 180, output: path.join(model, 'mutate/results.json') };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--list') o.list = true;
    else if (['--only', '--output', '--timeout'].includes(arg)) {
      if (!args[i + 1] || args[i + 1].startsWith('--')) throw new Error(`Missing value for ${arg}`);
      const v = args[++i];
      if (arg === '--only') o.only = v.split(',');
      if (arg === '--output') o.output = path.resolve(v);
      if (arg === '--timeout') o.timeout = Number(v);
    } else throw new Error(`Unknown argument: ${arg}`);
  }
  if (!Number.isFinite(o.timeout) || o.timeout <= 0) throw new Error('Timeout must be positive');
  return o;
}

export async function main(args) {
  const o = options(args);
  const catalogue = JSON.parse(await readFile(cataloguePath, 'utf8'));
  if (new Set(catalogue.map(m => m.id)).size !== catalogue.length) throw new Error('Duplicate mutant id');
  const selected = o.only ? catalogue.filter(m => o.only.includes(m.id)) : catalogue;
  if (o.only && (new Set(o.only).size !== o.only.length || selected.length !== o.only.length)) throw new Error('Unknown or duplicate mutant id');
  for (const m of catalogue) {
    if (!m.before || m.before === m.after) throw new Error(`Invalid mutant: ${m.id}`);
    const relative = sourcePath(m.file);
    git(['ls-files', '--error-unmatch', '--', relative]);
    replaceUnique(await readFile(path.join(root, relative), 'utf8'), m.before, m.after);
  }
  if (o.list) { for (const m of selected) console.log(`${m.id}\t${sourcePath(m.file)}\t${m.reason}`); return 0; }
  await mkdir(lock).catch(e => { if (e.code === 'EEXIST') throw new Error(`Mutation lock exists: ${lock}`); throw e; });
  const logs = `${o.output}.logs`;
  const result = { baseline: {}, mutants: [], finalBaseline: null };
  let temp, mutated = null, failed = false;
  const save = async () => { await mkdir(path.dirname(o.output), { recursive: true }); const tmp = `${o.output}.tmp`; await writeFile(tmp, `${JSON.stringify(result, null, 2)}\n`); await rename(tmp, o.output); };
  const restore = () => { if (mutated) { git(['checkout', '--', mutated]); mutated = null; } };
  const run = (name, program, argv) => command(program, argv, o.timeout, path.join(logs, `${name}.log`));
  const handlerInt = () => onSignal('SIGINT'), handlerTerm = () => onSignal('SIGTERM');
  process.on('SIGINT', handlerInt); process.on('SIGTERM', handlerTerm);
  try {
    const sources = [...new Set(catalogue.map(m => sourcePath(m.file)))];
    const dirty = git(['status', '--porcelain', '--untracked-files=no', '--', ...sources]);
    if (dirty) throw new Error(`Candidate source files are dirty:\n${dirty}`);
    await mkdir(logs, { recursive: true });
    temp = await mkdtemp(path.join(tmpdir(), 'loops-mutate-'));
    result.baseline.build = await run('baseline-build', 'lake', ['build', '--wfail']);
    if (result.baseline.build.status !== 'ok') throw new Error('Baseline build failed');
    const baselineDir = path.join(temp, 'baseline');
    // Gen replaces its own directories and leaves the standard fixtures unchanged.
    await cp(path.join(root, 'vectors'), baselineDir, { recursive: true });
    result.baseline.gen = await run('baseline-gen', 'lake', ['exe', 'gen', baselineDir]);
    if (result.baseline.gen.status !== 'ok') throw new Error('Baseline generator failed');
    result.baseline.changedPaths = await changedPaths(path.join(root, 'vectors'), baselineDir);
    if (result.baseline.changedPaths.length) throw new Error('Baseline vectors differ from generated vectors');
    await save();
    for (const m of selected) {
      if (interrupted) break;
      const relative = sourcePath(m.file), absolute = path.join(root, relative);
      const original = await readFile(absolute, 'utf8');
      const patch = replaceUnique(original, m.before, m.after);
      const entry = { id: m.id, file: relative, line: patch.line, patch: { before: m.before, after: m.after }, reason: m.reason, status: 'error', commands: [], changedPaths: [] };
      result.mutants.push(entry);
      try {
        // Check again immediately before any checkout can become necessary.
        if (git(['status', '--porcelain', '--untracked-files=no', '--', relative])) throw new Error(`Target became dirty: ${relative}`);
        mutated = relative;
        await writeFile(absolute, patch.text);
        const build = await run(`${m.id}-build`, 'lake', ['build', '--wfail']); entry.commands.push(build);
        if (build.status === 'nonzero') { entry.status = 'rejected-by-build'; entry.failureDetail = `Build exited ${build.code}; inspect the build log to identify the rejection.`; entry.buildRejectionNeedsAudit = true; }
        else if (build.status === 'ok') {
          const dir = await mkdtemp(path.join(temp, `${m.id}-`));
          await cp(path.join(root, 'vectors'), dir, { recursive: true });
          const gen = await run(`${m.id}-gen`, 'lake', ['exe', 'gen', dir]); entry.commands.push(gen);
          if (gen.status === 'ok') { entry.changedPaths = await changedPaths(path.join(root, 'vectors'), dir); entry.status = entry.changedPaths.length ? 'killed-by-vector' : 'survived'; }
          else entry.failureDetail = `Generator ${gen.status}`;
        } else entry.failureDetail = `Build ${build.status}`;
      } catch (e) { entry.failureDetail = e.message; }
      finally { restore(); await save(); }
      console.log(`${m.id}: ${entry.status}`);
      if (entry.status === 'error') failed = true;
      if (entry.commands.some(command => command.status === 'cleanup-error')) break;
    }
  } catch (e) { failed = true; result.error = e.message; console.error(e.message); }
  finally {
    try { restore(); } catch (e) { failed = true; result.restoreError = e.message; }
    if (temp && !result.restoreError && !result.mutants.some(entry => entry.commands.some(command => command.status === 'cleanup-error')) && result.baseline.build?.status !== 'cleanup-error' && result.baseline.gen?.status !== 'cleanup-error') {
      try { result.finalBaseline = await command('lake', ['build', '--wfail'], o.timeout, path.join(logs, 'final-baseline-build.log'), true); if (result.finalBaseline.status !== 'ok') failed = true; } catch (e) { failed = true; result.finalBaseline = { status: 'error', error: e.message }; }
    }
    try { if (temp) await save(); } catch (e) { failed = true; console.error(e.message); }
    try { if (temp) await rm(temp, { recursive: true, force: true }); }
    catch (e) { failed = true; console.error(`Temporary cleanup failed: ${e.message}`); }
    finally {
      try { await rm(lock, { recursive: true, force: true }); }
      catch (e) { failed = true; console.error(`Lock cleanup failed: ${e.message}`); }
      process.removeListener('SIGINT', handlerInt); process.removeListener('SIGTERM', handlerTerm);
    }
  }
  if (interrupted === 'SIGINT') return 130;
  if (interrupted) return 143;
  return failed ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
  main(process.argv.slice(2)).then(code => { process.exitCode = code; }).catch(e => { console.error(e.message); process.exitCode = 1; });
}
