// A changeset of drafts whose about and prev may name each other by @label,
// resolved to real ids, written with loops.mjs's writer so the ids match
// layer 0's. Written from vectors/batch and protocol/; no dependencies.

import { base32Decode, canonical, envJson, idOf, commitOf, seal } from "./loops.mjs";

const isLabel = (s) => typeof s === "string" && s.startsWith("@");
const labelsOf = (d) => [...(d.env.about ?? []), ...(d.env.prev ?? [])].filter(isLabel);

// What writing refuses, in the order protocol/record.md checks it.
const WRITE_CODES = [
  "kind-empty", "observer-not-typed", "emitted-not-rfc3339", "occurred-not-span",
  "about-not-typed", "prev-not-record-id", "under-not-record-id", "erases-not-record-id",
  "salt-not-16-bytes", "member-duplicate", "number-out-of-range",
];

// A record id that names nothing, standing in for a label while a draft is
// checked on its own: only its shape matters there.
const STAND_IN = "r:" + "a".repeat(52);
const NO_KEY = new Uint8Array(32);

const withRefs = (env, ref) => {
  const out = { ...env };
  for (const k of ["about", "prev"]) if (env[k]) out[k] = env[k].map((s) => (isLabel(s) ? ref(s) : s));
  return out;
};

// The code writing the draft gives, or null. Erases takes no label: one there
// is simply not a record id.
function writeProblem(d) {
  try {
    seal(withRefs(d.env, () => STAND_IN), base32Decode(d.salt), d.payload, NO_KEY);
    return null;
  } catch (e) {
    if (!WRITE_CODES.includes(e.message)) throw e;
    return e.message;
  }
}

// A label cycle: a draft reaching itself through labels in about or prev.
function hasCycle(drafts, byLabel) {
  const state = new Map(); // draft -> "open" | "done"
  const visit = (d) => {
    if (state.get(d) === "done") return false;
    if (state.get(d) === "open") return true;
    state.set(d, "open");
    const cyclic = labelsOf(d).some((l) => visit(byLabel.get(l)));
    state.set(d, "done");
    return cyclic;
  };
  return drafts.some(visit);
}

// A record's things: what it is about, or, about nothing, its own id.
const thingsOf = (id, about) => (about.length ? about : [id]);

// The batch's records, one per draft in the order given, each { id,
// env_canonical }; or { refused } with the first stage that refuses: labels
// (duplicate, unknown, cycle), writing, then prev-unknown, then prev-unrelated.
// Each stage looks at the whole batch, so no draft order changes the answer.
export function resolveBatch(drafts, held) {
  const byLabel = new Map();
  for (const d of drafts) {
    if (d.label === undefined) continue;
    if (byLabel.has(d.label)) return { refused: "label-duplicate" };
    byLabel.set(d.label, d);
  }
  if (drafts.some((d) => labelsOf(d).some((l) => !byLabel.has(l)))) return { refused: "label-unknown" };
  if (hasCycle(drafts, byLabel)) return { refused: "label-cycle" };

  const problems = drafts.map(writeProblem).filter(Boolean);
  if (problems.length) return { refused: problems.sort((a, b) => WRITE_CODES.indexOf(a) - WRITE_CODES.indexOf(b))[0] };

  // Acyclic, so every label's record can be written once what it names is.
  const written = new Map();
  const write = (d) => {
    if (!written.has(d)) {
      const env = withRefs(d.env, (l) => write(byLabel.get(l)).id);
      const salt = base32Decode(d.salt);
      written.set(d, { id: idOf(env, commitOf(salt, d.payload)), env });
    }
    return written.get(d);
  };
  const records = drafts.map(write);

  const things = new Map(held.map((h) => [h.id, thingsOf(h.id, h.about)]));
  for (const r of records) things.set(r.id, thingsOf(r.id, r.env.about ?? []));
  const prevs = records.flatMap((r) => (r.env.prev ?? []).map((p) => [r, p]));
  if (prevs.some(([, p]) => !things.has(p))) return { refused: "prev-unknown" };
  if (prevs.some(([r, p]) => !things.get(r.id).some((t) => things.get(p).includes(t)))) return { refused: "prev-unrelated" };

  return { records: records.map((r) => ({ id: r.id, env_canonical: canonical(envJson(r.env)) })) };
}
