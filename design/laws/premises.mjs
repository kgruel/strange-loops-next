// The premise ratchet. A sentence on the laws page may claim no more than its theorem states,
// and the commonest way to claim more is to leave out a hypothesis: "the winner is the same in
// any order" holds only where an id names one record. Reviews kept finding these one at a
// time, so the build finds them: it reads the hypotheses off each theorem's Lean statement
// (proofs.json) and holds the law to say each one.
//
// laws.json's `premises.vocabulary` names every hypothesis predicate the laws use, with its
// reader-facing wording and where the page states it:
//
//   page     said once, for every law ("Unless a law says otherwise, ..."); a law doesn't list it
//   law      said on the laws that need it, in their `premises`, shown as "Holds when ..."
//   subject  what the law is about, which its sentence already names (a view, a batch's
//            meaning, the order's own relation); `laws` lists them, so this is an explicit
//            rule and not a silent skip
//
// The build fails when
//   - a law's theorem takes a vocabulary premise that is not page-wide, not listed on the law
//     and not the law's subject;
//   - a law lists a premise none of its theorems takes, or one that is page-wide or its subject;
//   - a theorem takes a hypothesis shaped like a named predicate (`Foo xs`) or a `.Nodup` that
//     the vocabulary doesn't know, so a new hypothesis can't slip in unclassified;
//   - the vocabulary, a subject list or `premises.exempt` names something no theorem takes.
//
// What it does NOT catch, and no build check here could:
//   - what a hypothesis quantifies over. `stateIn_local` lets only the records not about t
//     vary, and a sentence that says "other things" still passes; the premise is named, its
//     scope is wording;
//   - hypotheses that are not named predicates: membership, equations, `Perm`, `getLast?`.
//     A sentence has to say those in its own words (`change`, `stays`), and a reviewer has to
//     read them;
//   - whether the wording of a premise says what the Lean predicate does.
// So the check holds a law to naming each premise; it doesn't certify the sentence is true.

// A statement split at its top-level arrows: hypotheses first, the conclusion last. Leading
// binders (`∀ ..., ∃ ..., ¬∃ ...,`) are dropped; brackets are tracked so an arrow inside a
// parenthesis, a hypothesis that is itself a ∀, or a `fun` body isn't split.
export function hypotheses(states) {
  const s = states.replace(/\s+/g, " ").replace(/\bLoops\./g, "");
  const open = "([{⟨", close = ")]}⟩";
  const parts = [];
  let depth = 0, cur = "", iff = false, arrow = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (open.includes(c)) depth++;
    else if (close.includes(c)) depth--;
    if (depth === 0 && (c === "∀" || c === "∃")) {
      let j = i + 1, d = 0;
      for (; j < s.length; j++) {
        if (open.includes(s[j])) d++;
        else if (close.includes(s[j])) d--;
        else if (d === 0 && s[j] === ",") break;
      }
      if (c === "∃" && cur.trim() === "¬") cur = "";
      iff = arrow = false;   // a binder's body is its own scope: `A → ∀ x, P ↔ Q` is A, then an iff
      i = j;
      continue;
    }
    if (depth === 0 && c === "↔") iff = true;
    if (depth === 0 && c === "→") arrow = true;
    if (iff && arrow) throw new Error(`premises: can't tell the hypotheses of a statement mixing → and ↔ at the top: ${s.slice(0, 80)}`);
    if (depth === 0 && c === "→") { parts.push(cur.trim()); cur = ""; continue; }
    cur += c;
  }
  parts.push(cur.trim());
  return parts.slice(0, -1);
}

// A hypothesis that reads like a named predicate: `Foo a b`, with no relation in it.
const NAMED = /^[A-Z][\w.']*(?: [^=≠∈∉≤≥<>↔∧∨∀∃¬,:]+)?$/;
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function checkPremises({ data, rows, resolved, graph, fail }) {
  const P = data.premises ?? fail("laws.json has no premises");
  const vocab = P.vocabulary ?? fail("laws.json premises has no vocabulary");
  const exempt = P.exempt ?? {};
  const KINDS = ["page", "law", "subject"];
  for (const [name, p] of Object.entries(vocab)) {
    if (!KINDS.includes(p.where)) fail(`premises.${name}: where is ${p.where}; one of ${KINDS.join(", ")}`);
    for (const f of Object.keys(p)) if (!["where", "says", "match", "laws"].includes(f)) fail(`premises.${name}: unknown key ${f}`);
    if (!p.says) fail(`premises.${name}: no wording in "says"`);
    if ((p.where === "subject") !== Array.isArray(p.laws)) fail(`premises.${name}: a subject premise lists its laws, and only one does`);
  }
  const matcher = (name) => new RegExp(vocab[name].match ?? `^${esc(name)}\\b`);
  const lawKeys = new Set(rows.map((r) => r.key));

  // What each law's theorems take, by premise, each with the theorems (as laws.md names them) that take it.
  const taken = new Map();
  for (const r of rows) {
    const t = new Map();
    for (const name of r.theorems) {
      const full = resolved.get(r.key).find((x) => x === name || x.endsWith(`.${name}`));
      if (!full) continue;
      for (const h of hypotheses(graph[full].states)) {
        const hit = Object.keys(vocab).find((v) => matcher(v).test(h));
        if (!hit) {
          if (NAMED.test(h) || /\.Nodup$/.test(h)) fail(`${r.key}: ${name} takes the hypothesis \`${h}\`, which laws.json premises.vocabulary doesn't know; add it (page, law or subject)`);
          continue;
        }
        if (!t.has(hit)) t.set(hit, []);
        t.get(hit).push(name);
      }
    }
    taken.set(r.key, t);
  }

  const covered = (key, name) => {
    const v = vocab[name];
    return v.where === "page" || (v.where === "subject" && v.laws.includes(key)) || (data.laws[key].premises ?? []).includes(name);
  };
  for (const r of rows) {
    const l = data.laws[r.key], t = taken.get(r.key);
    for (const [name, thms] of t) {
      const unsaid = thms.filter((th) => !(th in exempt));
      if (unsaid.length && !covered(r.key, name))
        fail(`${r.key}: ${unsaid.join(", ")} takes ${name} (${vocab[name].says}), which the law doesn't say; ${vocab[name].where === "subject" ? `if ${name} is its subject, list the law in premises.vocabulary.${name}.laws` : `list ${name} in the law's premises`}`);
    }
    for (const name of l.premises ?? []) {
      if (!vocab[name]) fail(`${r.key}: premise ${name} isn't in laws.json premises.vocabulary`);
      if (vocab[name].where !== "law") fail(`${r.key}: ${name} is ${vocab[name].where === "page" ? "said page-wide" : "the subject of other laws"}; a law lists only the premises it alone needs`);
      if (!t.has(name)) fail(`${r.key}: lists the premise ${name}, which none of its theorems takes`);
    }
  }

  // Nothing in the vocabulary, a subject list or the exemptions outlives the theorems it was for.
  for (const [name, v] of Object.entries(vocab)) {
    const users = rows.filter((r) => taken.get(r.key).has(name)).map((r) => r.key);
    if (!users.length) fail(`premises.${name}: no law's theorem takes it; take it off the vocabulary`);
    if (v.where === "law" && !users.some((k) => (data.laws[k].premises ?? []).includes(name))) fail(`premises.${name}: no law lists it`);
    for (const k of v.laws ?? []) {
      if (!lawKeys.has(k)) fail(`premises.${name}: ${k} is no law`);
      if (!users.includes(k)) fail(`premises.${name}: ${k} is listed as having it for its subject, but none of its theorems takes it`);
    }
  }
  for (const [th, why] of Object.entries(exempt)) {
    if (!why) fail(`premises.exempt: ${th} needs a reason`);
    const owners = rows.filter((r) => r.theorems.includes(th));
    if (!owners.length) fail(`premises.exempt: ${th} is named by no law`);
    // Needed only while the theorem takes a premise its law doesn't otherwise say.
    const needed = owners.some((r) => [...taken.get(r.key)].some(([name, thms]) => thms.includes(th) && !covered(r.key, name)));
    if (!needed) fail(`premises.exempt: ${th} no longer takes a premise its law leaves unsaid; take it off the list`);
  }

  return {
    // The wording a law shows: its own premises, in the vocabulary's order.
    holds: (key) => Object.keys(vocab).filter((n) => (data.laws[key].premises ?? []).includes(n)).map((n) => vocab[n].says),
    // The page-wide wording, in the vocabulary's order.
    pageWide: Object.values(vocab).filter((v) => v.where === "page").map((v) => v.says),
  };
}
