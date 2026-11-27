// Split a saved copy of the prototype artifact into the files the front page is built from.
//
//   node design/front/extract.mjs <saved-artifact.html>
//
// The prototype is one document: a stylesheet, the markup of five views, and one script
// that holds its content as named constants beside the code that draws them. This writes
//   styles.css     the stylesheet
//   shell.html     the markup, with one placeholder where the script was
//   app.js         the script, with one placeholder for each constant that is plain data
//   data/<NAME>.json   each such constant
// so that render.mjs can put them back together, and so that each data file can be
// replaced, one at a time, by something generated from the repository's own sources.
// Run it again on a later copy of the artifact to take in a new pass of its prose.

import { mkdirSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const here = dirname(fileURLToPath(import.meta.url));
// The repository is the page's source now: app.js and shell.html have been edited here,
// and some constants are generated. Running this again would overwrite that work, so it
// asks to be told twice.
const source = process.argv[2];
if (!source || process.argv[3] !== "--overwrite")
  throw new Error("usage: node design/front/extract.mjs <saved-artifact.html> --overwrite   (replaces app.js, shell.html, styles.css and data/)");
const text = readFileSync(source, "utf8");

// The host wraps the page in its own document. The page starts at its <title>.
const start = text.indexOf("<title>");
const stop = text.lastIndexOf("</body>");
if (start < 0 || stop < 0) throw new Error("not a saved artifact: no <title> or </body>");
const page = text.slice(start, stop);

function one(re, what) {
  const all = [...page.matchAll(re)];
  if (all.length !== 1) throw new Error(`expected one ${what}, found ${all.length}`);
  return all[0];
}
const style = one(/<style>\n?([\s\S]*?)<\/style>\n?/g, "stylesheet");
const script = one(/<script>\n?([\s\S]*?)<\/script>\n?/g, "script");
const css = style[1], js = script[1];
// The prototype loads its typefaces from a font host. The site serves them itself
// (fonts.css and fonts/), so the three lines that reach out are dropped here.
const hosted = [...page.matchAll(/<link rel="(?:preconnect|stylesheet)" href="https:\/\/fonts\.(?:googleapis|gstatic)\.com[^>]*>\n/g)];
if (hosted.length !== 3) throw new Error(`expected three font host lines, found ${hosted.length}`);
let shell = page.replace(style[0], "<!-- build:styles -->\n").replace(script[0], "<!-- build:script -->\n");
for (const [line] of hosted) shell = shell.replace(line, "");
if (/fonts\.(googleapis|gstatic)\.com/.test(shell + css + js)) throw new Error("the page still reaches a font host");

// Where a literal that starts at i ends: brackets balanced, strings and templates skipped.
function end(i) {
  let depth = 0;
  for (; i < js.length; i++) {
    const c = js[i];
    if (c === '"' || c === "'" || c === "`") {
      for (i++; js[i] !== c; i++) if (js[i] === "\\") i++;
      if (depth === 0) return i + 1;
    } else if ("[{(".includes(c)) depth++;
    else if ("]})".includes(c) && --depth === 0) return i + 1;
  }
  throw new Error("unbalanced literal");
}

// A constant is data when its literal stands alone and survives a round trip through JSON.
const data = new Map();
let app = "", from = 0;
for (const m of js.matchAll(/^[ \t]*(?:const|let|var)\s+([A-Z][A-Z0-9_]{2,})\s*=\s*(?=[\[\{`"'])/gm)) {
  const name = m[1], at = m.index + m[0].length;
  if (at < from) continue;
  const to = end(at);
  let value;
  try { value = vm.runInNewContext("(" + js.slice(at, to) + ")"); } catch { continue; }
  // JSON drops a function without complaint, so look for one before trusting the round trip.
  const plain = (v) => v === null || ["string", "number", "boolean"].includes(typeof v) || (typeof v === "object" && Object.values(v).every(plain));
  if (!plain(value)) continue;
  const json = JSON.stringify(value);
  if (js[to] !== ";" || JSON.stringify(JSON.parse(json)) !== json) continue;
  if (data.has(name)) throw new Error(`constant ${name} is defined twice`);
  data.set(name, JSON.parse(json));
  app += js.slice(from, at) + `/*data:${name}*/`;
  from = to;
}
app += js.slice(from);

mkdirSync(join(here, "data"), { recursive: true });
for (const f of readdirSync(join(here, "data"))) unlinkSync(join(here, "data", f));
for (const [name, value] of data) writeFileSync(join(here, "data", name + ".json"), JSON.stringify(value, null, 1) + "\n");
writeFileSync(join(here, "styles.css"), css);
writeFileSync(join(here, "shell.html"), shell);
writeFileSync(join(here, "app.js"), app);
console.log(`${data.size} data files, ${css.length} bytes of styles, ${shell.length} of markup, ${app.length} of script`);
