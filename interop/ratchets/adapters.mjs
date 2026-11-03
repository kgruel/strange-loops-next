// Lexical boundary ratchet, not semantic static analysis. Run: node interop/ratchets/adapters.mjs
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = fileURLToPath(new URL('../../', import.meta.url));
const js = ['check-batch.mjs', 'check-fold.mjs', 'check-lens.mjs', 'check-realm.mjs', 'check-scenario.mjs', 'check-spec.mjs', 'check.mjs'];
const fuzz = ['evaluate.mjs', 'fuzz.test.mjs', 'generate.mjs', 'json-source.test.mjs', 'phase2.test.mjs', 'reader.test.mjs', 'run.mjs', 'shrink.mjs', 'step1.test.mjs', 'transport.mjs'];
// evaluate is the JS adapter. The other fuzz files generate, transport, shrink,
// orchestrate, or test cases; they do not compute JS library answers.
const rust = ['batch.rs', 'byte_text.rs', 'fold.rs', 'json.rs', 'lens.rs', 'lib.rs', 'main.rs', 'reader.rs', 'realm.rs', 'record.rs', 'scenario.rs', 'spec.rs'];
// Only Read and Run replay inputs. Batch, ByteText, Occurred, Realm, Records,
// Rulings, Scenario and Spec write expected vectors. Main runs the generator;
// Boundaries, Checks and Proofs run separate checks or proof reports. Ed25519,
// Encode, Json and Sha2 support generation. None is a replay adapter.
const lean = ['Batch.lean', 'Boundaries.lean', 'ByteText.lean', 'Checks.lean', 'Ed25519.lean', 'Encode.lean', 'Json.lean', 'Main.lean', 'Occurred.lean', 'Proofs.lean', 'Read.lean', 'Realm.lean', 'Records.lean', 'Rulings.lean', 'Run.lean', 'Scenario.lean', 'Sha2.lean', 'Spec.lean'];
const checks = new Set(['checkEnvelopeKeys', 'unknownEnvelopeKeys', 'envelopeKeysProblem', 'envelopesKeysProblem', 'draftsKeysProblem', 'checkKeys', 'check_keys', 'check_all_keys', 'check_draft_keys', 'unknown_envelope_keys', 'check_envelope_keys']);
const allowances = [
  { file: 'rust/eval/src/record.rs', value: 'envelope-field-unknown', reason: 'Maps the library decoder error into the protocol answer.' },
  { file: 'rust/eval/src/batch.rs', value: 'envelope-field-unknown', reason: 'Maps the library decoder error into the protocol answer.' },
  { file: 'model/Gen/Run.lean', value: 'envelope-field-unknown', reason: 'envelopeOutcome maps the library decoder error into the protocol answer.' },
  { file: 'model/Gen/Read.lean', value: 'number-out-of-range', reason: 'valOf maps a nonfinite decoded number to its decoder error.' },
];

// Return identifier, string and punctuation tokens. Ignore nested block and line
// comments. Preserve positions to identify locations. Rust raw strings are read.
export function tokens(source, language) {
  const out = []; let i = 0, line = 1;
  const advance = end => { line += (source.slice(i, end).match(/\n/g) ?? []).length; i = end; };
  while (i < source.length) {
    if (/\s/.test(source[i])) { advance(i + 1); continue; }
    const lineComment = language === 'lean' ? '--' : '//';
    const blockOpen = language === 'lean' ? '/-' : '/*', blockClose = language === 'lean' ? '-/' : '*/';
    if (source.startsWith(lineComment, i)) { const end = source.indexOf('\n', i); advance(end < 0 ? source.length : end); continue; }
    if (source.startsWith(blockOpen, i)) {
      let j = i + 2, depth = 1;
      while (j < source.length && depth) { if (source.startsWith(blockOpen, j)) { depth++; j += 2; } else if (source.startsWith(blockClose, j)) { depth--; j += 2; } else j++; }
      if (depth) throw new Error(`unclosed comment at ${line}`); advance(j); continue;
    }
    const char = language === 'rust' && /^(?:b)?'(?:\\\\.|[^'\\\\])'/.exec(source.slice(i));
    if (char) { advance(i + char[0].length); continue; }
    const raw = language === 'rust' && /^r(#{0,255})"/.exec(source.slice(i));
    if (raw) { const start = i + raw[0].length, end = source.indexOf('"' + raw[1], start); if (end < 0) throw new Error(`unclosed raw string at ${line}`); out.push({ kind: 'string', value: source.slice(start, end), line }); advance(end + 1 + raw[1].length); continue; }
    if (source[i] === '"' || (language === 'js' && source[i] === "'")) {
      const quote = source[i]; let j = i + 1;
      while (j < source.length && source[j] !== quote) { if (source[j] === '\\') j++; j++; }
      if (j >= source.length) throw new Error(`unclosed string at ${line}`);
      const rawString = source.slice(i, j + 1); let value;
      try { value = quote === '"' ? JSON.parse(rawString) : JSON.parse('"' + rawString.slice(1, -1).replace(/\\'/g, "'").replace(/"/g, '\\"') + '"'); } catch { value = rawString.slice(1, -1); }
      out.push({ kind: 'string', value, line }); advance(j + 1); continue;
    }
    if (language === 'js' && source[i] === '`') { // Scan template expressions too, without treating their text as literals.
      let j = i + 1; while (j < source.length && source[j] !== '`') { if (source[j] === '\\') j++; j++; }
      if (j >= source.length) throw new Error(`unclosed template at ${line}`);
      const body = source.slice(i + 1, j);
      if (!body.includes('${')) {
        let value; try { value = JSON.parse('"' + body.replace(/"/g, '\\"').replace(/\n/g, '\\n') + '"'); } catch { value = body; }
        out.push({ kind: 'string', value, line });
      }
      for (const match of body.matchAll(/\$\{([^}]*)\}/g)) out.push(...tokens(match[1], language).map(t => ({ ...t, line: line + (body.slice(0, match.index).match(/\n/g) ?? []).length + t.line - 1 })));
      advance(j + 1); continue;
    }
    const ident = /^[A-Za-z_][A-Za-z_0-9]*/.exec(source.slice(i));
    if (ident) { out.push({ kind: 'identifier', value: ident[0], line }); advance(i + ident[0].length); continue; }
    out.push({ kind: 'punct', value: source[i], line }); advance(i + 1);
  }
  return out;
}

// cfg(test) modules are tests, not adapters. Do not exclude cfg(test) functions
// or production code merely because an attribute appears nearby.
function withoutTestModules(ts) {
  const result = [];
  for (let i = 0; i < ts.length; i++) {
    const values = ts.slice(i, i + 9).map(t => t.value).join(' ');
    if (/^# \[ cfg \( test \) \] mod \w+$/.test(values) && ts[i + 9]?.value === '{') {
      let j = i + 10, depth = 1;
      while (j < ts.length && depth) { if (ts[j].value === '{') depth++; if (ts[j].value === '}') depth--; j++; }
      if (depth) throw new Error('unclosed cfg(test) module'); i = j - 1; continue;
    }
    result.push(ts[i]);
  }
  return result;
}
export function scan(source, language, codes) {
  let ts = tokens(source, language); if (language === 'rust') ts = withoutTestModules(ts);
  return ts.filter(t => t.kind === 'string' && codes.has(t.value) || t.kind === 'identifier' && checks.has(t.value));
}
export function applyAllowances(findings, entries) {
  const used = new Set(), errors = [];
  for (const entry of entries) if (!entry.reason?.trim()) errors.push(`missing reason: ${entry.file} ${entry.value}`);
  for (const finding of findings) {
    const index = entries.findIndex(e => e.file === finding.file && e.value === finding.value);
    if (index < 0) errors.push(`${finding.file}:${finding.line}: forbidden ${finding.kind} ${finding.value}`);
    else used.add(index);
  }
  entries.forEach((e, i) => { if (!used.has(i)) errors.push(`stale allowance: ${e.file} ${e.value}`); });
  return errors;
}
function inventory(dir, expected, predicate, recursive = false) {
  const walk = (base, prefix = '') => readdirSync(base, { withFileTypes: true }).flatMap(entry => {
    const name = prefix + entry.name;
    if (entry.isDirectory()) return recursive ? walk(resolve(base, entry.name), name + '/') : [];
    return predicate(name) ? [name] : [];
  });
  const actual = walk(resolve(root, dir)).sort();
  if (JSON.stringify(actual) !== JSON.stringify([...expected].sort())) throw new Error(`${dir}: inventory changed; classify files: ${actual.join(', ')}`);
}
export function run() {
  inventory('interop/js', js, f => /^check.*\.mjs$/.test(f));
  inventory('interop/fuzz', fuzz, f => f.endsWith('.mjs'));
  inventory('rust/eval/src', rust, f => f.endsWith('.rs'), true);
  inventory('model/Gen', lean, f => f.endsWith('.lean'), true);
  let words;
  try { words = JSON.parse(readFileSync(resolve(root, 'design/grammar/words.json'), 'utf8')); }
  catch (error) { throw new Error(`cannot read refusal codes: ${error.message}`); }
  const codes = new Set(words.refusals.flatMap(x => x.codes));
  const files = [...js.map(f => [`interop/js/${f}`, 'js']), ['interop/fuzz/evaluate.mjs', 'js'], ...rust.map(f => [`rust/eval/src/${f}`, 'rust']), ...['Read.lean', 'Run.lean'].map(f => [`model/Gen/${f}`, 'lean'])];
  const findings = files.flatMap(([file, language]) => {
    try { return scan(readFileSync(resolve(root, file), 'utf8'), language, codes).map(t => ({ ...t, file })); }
    catch (error) { throw new Error(`${file}: ${error.message}`); }
  });
  const errors = applyAllowances(findings, allowances);
  if (errors.length) throw new Error(errors.join('\n'));
  console.log(`adapter lexical boundary: ${files.length} files checked; ${allowances.length} allowances`);
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { run(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
