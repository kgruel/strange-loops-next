import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, copyFile, chmod, rm } from 'node:fs/promises';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { changedPaths, replaceUnique, command } from './run.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));

test('catalogue keeps 189 unique mutations at current source sites; listing does not mutate', async () => {
  const catalogue = JSON.parse(await readFile(path.join(here, 'mutants.json'), 'utf8'));
  assert.equal(catalogue.length, 189);
  assert.equal(new Set(catalogue.map(m => m.id)).size, catalogue.length);
  const sources = new Map();
  for (const m of catalogue) {
    const file = path.resolve(here, '../Loops', m.file);
    if (!sources.has(file)) sources.set(file, await readFile(file, 'utf8'));
    assert.notEqual(m.before, m.after, m.id);
    assert.doesNotThrow(() => replaceUnique(sources.get(file), m.before, m.after), m.id);
  }
  const result = spawnSync(process.execPath, [path.join(here, 'run.mjs'), '--list'], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim().split('\n').length, catalogue.length);
  for (const [file, before] of sources) assert.equal(await readFile(file, 'utf8'), before, file);
});

test('replacement requires one exact site and reports its line', () => {
  assert.deepEqual(replaceUnique('a\nb\nc', 'b', 'x'), { text: 'a\nx\nc', line: 2 });
  assert.throws(() => replaceUnique('abc', 'z', 'x'), /not unique/);
  assert.throws(() => replaceUnique('abcabc', 'abc', 'x'), /not unique/);
});

test('recursive vector comparison detects paths and bytes', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'mutation-test-'));
  try {
    const a = path.join(dir, 'a'), b = path.join(dir, 'b');
    await mkdir(path.join(a, 'nested'), { recursive: true });
    await mkdir(path.join(b, 'nested'), { recursive: true });
    await writeFile(path.join(a, 'nested', 'same'), 'same');
    await writeFile(path.join(b, 'nested', 'same'), 'same');
    await writeFile(path.join(a, 'old'), 'old');
    await writeFile(path.join(b, 'new'), 'new');
    assert.deepEqual(await changedPaths(a, b), ['new', 'old']);
    await writeFile(path.join(b, 'nested', 'same'), 'changed');
    assert.deepEqual(await changedPaths(a, b), ['nested/same', 'new', 'old']);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('command reports success, failure, spawn failure, and timeout', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'mutation-command-'));
  try {
    const log = path.join(dir, 'out.log');
    assert.equal((await command(process.execPath, ['-e', 'console.log("ok")'], 5, log)).status, 'ok');
    assert.equal((await command(process.execPath, ['-e', 'process.exit(2)'], 5, log)).status, 'nonzero');
    assert.equal((await command('/no-such-executable', [], 5, log)).status, 'spawn-error');
    assert.equal((await command(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], 0.1, log)).status, 'timeout');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('command kills a descendant ignoring SIGTERM with closed stdio', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'mutation-tree-'));
  try {
    const marker = path.join(dir, 'escaped');
    const script = `const {spawn}=require('child_process'); spawn(process.execPath,['-e',${JSON.stringify(`process.on('SIGTERM',()=>{}); setTimeout(()=>require('fs').writeFileSync(${JSON.stringify(marker)},'alive'),800)`)}],{stdio:'ignore'}); setTimeout(()=>{},10000)`;
    assert.equal((await command(process.execPath, ['-e', script], 0.2, path.join(dir, 'log'))).status, 'timeout');
    await new Promise(resolve => setTimeout(resolve, 900));
    await assert.rejects(readFile(marker), { code: 'ENOENT' });
  } finally { await rm(dir, { recursive: true, force: true }); }
});

async function fixture() {
  const dir = await mkdtemp(path.join(tmpdir(), 'mutation-repo-'));
  for (const sub of ['model/mutate', 'model/Loops', 'vectors', 'bin']) await mkdir(path.join(dir, sub), { recursive: true });
  await copyFile(path.join(here, 'run.mjs'), path.join(dir, 'model/mutate/run.mjs'));
  await copyFile(path.join(here, 'mutants.json'), path.join(dir, 'model/mutate/mutants.json'));
  const mutants = ['syntax', 'type', 'vector', 'survive', 'genfail', 'timeout', 'signal'].map(id => ({ id, file: 'Test.lean', before: 'ORIGINAL', after: id, reason: id }));
  await writeFile(path.join(dir, 'model/mutate/mutants.json'), JSON.stringify(mutants));
  await writeFile(path.join(dir, 'model/Loops/Test.lean'), 'ORIGINAL\n');
  await writeFile(path.join(dir, 'vectors/data'), 'baseline');
  const lake = path.join(dir, 'bin/lake');
  await writeFile(lake, `#!${process.execPath}\nconst fs=require('fs'); const s=fs.readFileSync('Loops/Test.lean','utf8').trim(); const args=process.argv.slice(2); if(args[0]==='build') { if(s==='syntax'||s==='type') { console.error(s+' error'); process.exit(1); } if(s==='timeout'||s==='signal') { fs.writeFileSync(${JSON.stringify(path.join(dir, 'ready'))},s); setInterval(()=>{},1000); } } else { if(s==='genfail') process.exit(2); fs.writeFileSync(args[2]+'/data',s==='vector'?'changed':'baseline'); }\n`);
  await chmod(lake, 0o755);
  for (const args of [['init', '-q'], ['config', 'user.email', 'test@example.com'], ['config', 'user.name', 'Test'], ['add', '.'], ['commit', '-qm', 'fixture']]) {
    const r = spawnSync('git', args, { cwd: dir, encoding: 'utf8' }); assert.equal(r.status, 0, r.stderr);
  }
  return dir;
}

function runFixture(dir, args) {
  const child = spawn(process.execPath, [path.join(dir, 'model/mutate/run.mjs'), '--output', path.join(dir, 'result.json'), ...args], { cwd: dir, env: { ...process.env, PATH: `${path.join(dir, 'bin')}:${process.env.PATH}` }, stdio: ['ignore', 'pipe', 'pipe'] });
  let output = ''; child.stdout.on('data', c => output += c); child.stderr.on('data', c => output += c);
  const done = new Promise((resolve, reject) => { child.on('error', reject); child.on('close', code => resolve({ code, output })); });
  return { child, done };
}

test('synthetic repository exercises mutation outcomes and restoration', async () => {
  const dir = await fixture();
  try {
    const result = await runFixture(dir, ['--only', 'syntax,type,vector,survive,genfail,timeout', '--timeout', '0.4']).done;
    assert.equal(result.code, 1, result.output);
    const report = JSON.parse(await readFile(path.join(dir, 'result.json')));
    assert.deepEqual(report.mutants.map(m => m.status), ['rejected-by-build', 'rejected-by-build', 'killed-by-vector', 'survived', 'error', 'error']);
    for (const entry of report.mutants.slice(0, 2)) {
      assert.equal(entry.buildRejectionNeedsAudit, true);
      assert.equal(Object.hasOwn(entry, 'proofKillNeedsAudit'), false);
      assert.equal(entry.commands[0].status, 'nonzero');
      assert.match(await readFile(entry.commands[0].log, 'utf8'), /^(syntax|type) error/);
    }
    assert.equal(report.mutants[4].commands[1].status, 'nonzero');
    assert.equal(report.mutants[5].commands[0].status, 'timeout');
    assert.equal(report.finalBaseline.status, 'ok');
    assert.equal(await readFile(path.join(dir, 'model/Loops/Test.lean'), 'utf8'), 'ORIGINAL\n');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('SIGTERM restores source and removes lock', async () => {
  const dir = await fixture();
  try {
    const run = runFixture(dir, ['--only', 'signal', '--timeout', '10']);
    let ready = false;
    for (let i = 0; i < 200; i++) { try { if (await readFile(path.join(dir, 'ready'), 'utf8') === 'signal') { ready = true; break; } } catch {} await new Promise(resolve => setTimeout(resolve, 25)); }
    assert.ok(ready, 'mutant did not start');
    run.child.kill('SIGTERM');
    const result = await run.done; assert.equal(result.code, 143, result.output);
    assert.equal(await readFile(path.join(dir, 'model/Loops/Test.lean'), 'utf8'), 'ORIGINAL\n');
    await assert.rejects(readFile(path.join(dir, 'model/.mutation-run.lock')), { code: 'ENOENT' });
    const report = JSON.parse(await readFile(path.join(dir, 'result.json')));
    assert.equal(report.mutants[0].commands[0].status, 'interrupted');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('dirty and staged candidate files are refused without changing bytes', async () => {
  for (const staged of [false, true]) {
    const dir = await fixture();
    try {
      const source = path.join(dir, 'model/Loops/Test.lean');
      await writeFile(source, 'ORIGINAL\nlocal changes\n');
      if (staged) assert.equal(spawnSync('git', ['add', 'model/Loops/Test.lean'], { cwd: dir }).status, 0);
      const before = await readFile(source);
      const result = await runFixture(dir, ['--only', 'syntax']).done;
      assert.equal(result.code, 1, result.output); assert.match(result.output, /dirty/);
      assert.deepEqual(await readFile(source), before);
    } finally { await rm(dir, { recursive: true, force: true }); }
  }
});
