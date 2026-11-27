import { statSync } from "node:fs";
import { dirname, join, posix } from "node:path";
import { REPO } from "../laws/join.mjs";

export function rewriteLink(root, documents, source, line, href) {
  const fail = (why) => { throw new Error(`${source}:${line}: link ${href}: ${why}`); };
  if (/^https?:\/\//i.test(href)) {
    if (!URL.canParse(href)) fail("invalid URL");
    return href;
  }
  if (href.startsWith("#")) return href;
  if (!href || /^(?:[a-z][a-z0-9+.-]*:|\/)/i.test(href)) fail("expected a relative repository path");

  const [, raw, fragment] = href.match(/^([^#]*)(#.*)?$/);
  let path;
  try { path = posix.join(dirname(source), decodeURIComponent(raw)); }
  catch { fail("invalid path encoding"); }
  // Published page addresses can occur in a document alongside repository paths.
  // A link to design/laws/ itself still opens the proof and boundary data.
  const retired = /^\.\.\/(grammar|laws|evidence)\/(?:index\.html)?$/.exec(raw)
    ?? /^out\/(grammar|laws|evidence)\/(?:index\.html)?$/.exec(path);
  if (retired) {
    const view = retired[1];
    if (!fragment || fragment === "#") return "../#" + view;
    if (view === "grammar" && fragment.startsWith("#noun-")) return "../#n-" + fragment.slice(6);
    if (view === "evidence" && fragment.startsWith("#law-")) return "../#ev-" + fragment.slice(5);
    if (view === "laws" && /^#(?:law-|q-|h-q-)/.test(fragment)) return "../" + fragment;
    if (view === "laws" && fragment.startsWith("#without-")) return "../#prem-" + fragment.slice(9);
    fail("no matching front-page anchor for this retired page link");
  }
  if (path === ".." || path.startsWith("../") || path.startsWith("/") || path.includes("\\")) fail("outside the repository");
  const target = statSync(join(root, path), { throwIfNoEntry: false });
  if (!target) fail("repository path does not exist");

  path = path.replace(/\/$/, "");
  const suffix = fragment ?? "";
  const doc = documents.get(path);
  if (doc) return encodeURIComponent(doc) + suffix;
  const section = path.match(/^design\/rethink\/sections\/\d\d-([\w-]+)\.html$/);
  if (section) {
    const tab = section[1];
    const sub = fragment?.slice(1);
    return `../rethink/#${tab}` + (sub && sub !== tab ? "/" + sub : "");
  }
  const base = target.isDirectory() ? REPO.replace("/blob/", "/tree/") : REPO;
  return base + "/" + path.split("/").map(encodeURIComponent).join("/") + suffix;
}
