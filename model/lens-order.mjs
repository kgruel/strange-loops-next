#!/usr/bin/env node
import { readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// This checks the approved source shape, not the semantics of Lean code.
const declaration = "def edit (base : List Section) (text : List Line) : Option EditResult :=\n  if Valid base then do\n    let parsed ← parse text\n    let outcomes := diff base parsed\n    some { parsed, normalized := render parsed, outcomes, applied := apply base outcomes }\n  else none";
export function checkLensOrder(source) {
  // Remove strings and Lean comments while preserving line breaks.
  let clean = '', depth = 0, line = false, string = false, escaped = false;
  for (let i = 0; i < source.length; i++) {
    const c = source[i], pair = source.slice(i, i + 2);
    if (line) { if (c === '\n') { line = false; clean += c; } else clean += ' '; continue; }
    if (depth) {
      if (pair === '/-') { depth++; clean += '  '; i++; }
      else if (pair === '-/') { depth--; clean += '  '; i++; }
      else clean += c === '\n' ? '\n' : ' ';
      continue;
    }
    if (string) {
      clean += c === '\n' ? '\n' : ' ';
      if (escaped) escaped = false;
      else if (c === '\\') escaped = true;
      else if (c === '"') string = false;
    } else if (pair === '/-') { depth = 1; clean += '  '; i++; }
    else if (pair === '--') { line = true; clean += '  '; i++; }
    else if (c === '"') { clean += ' '; string = true; }
    else clean += c;
  }
  if (depth || string) return false;
  return clean.split('def edit (base : List Section)').length === 2 &&
    clean.includes(`\n${declaration}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
  const model = process.argv[2] ?? path.dirname(fileURLToPath(import.meta.url));
  const source = readFileSync(path.join(model, 'Loops/Lens.lean'), 'utf8');
  if (!checkLensOrder(source)) {
    console.error('Lens edit source does not match the approved base-before-parse shape');
    process.exitCode = 1;
  }
}
