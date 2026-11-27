// The laws directory, grammar chips and bench on the front page.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { anchor, joinLaws, sentence } from "../laws/join.mjs";
import { lawNotes, unlessSaid } from "../laws/render.mjs";
import { plain } from "../laws/shapes.mjs";

function grammarChips(root, { data, keyOf, nameOf }, extraNames) {
  const read = (path) => JSON.parse(readFileSync(join(root, "design", path), "utf8"));
  const { nouns, verbs } = read("grammar/words.json");
  const { steps } = read("grammar/walk.json");
  const names = new Set([...nouns, ...verbs, ...steps].flatMap((entry) => entry.laws).concat(extraNames));
  // A popover takes plain text. Keep the exponent legible when dropping its HTML.
  const exponent = (_, n) => /^\d+$/.test(n) ? n.replace(/\d/g, (d) => "⁰¹²³⁴⁵⁶⁷⁸⁹"[d]) : "^" + n;
  return Object.fromEntries([...names].map((name) => {
    const law = data.laws[keyOf(name, "grammar chip")];
    // Two unqualified names recur on qualified rows. Grammar links to the last
    // row with the name, while the chip quotes the first, unqualified law.
    return [name, [anchor(nameOf.get(name)), law.shape, plain(sentence(law), exponent)]];
  }));
}

// The controls in app.js choose these files. No inputs or model answers live here.
const benchFiles = {
  count: {
    three: "fold/count/02-three",
    twice: "fold/count/03-repeats-counted",
  },
  latest: {
    fork: "fold/latest-by/02-fork",
    chain: "fold/latest-by/03-chain",
    late: "fold/latest-by/04-chain-late",
    emitted: "fold/latest-by/05-emitted-breaks-tie",
    id: "fold/latest-by/06-id-breaks-tie",
    merge: "fold/latest-by/07-merge",
    repeats: "fold/latest-by/08-repeats",
    span: "fold/latest-by/13-span-order",
  },
  view: {
    withheld: "fold/view/01-withheld-head-still-supersedes",
    erased: "fold/view/02-erased-head-still-supersedes",
    max: "fold/view/04-max-counts-unread-heads",
  },
  record: {
    sets: "record/03-sets-are-sets",
    members: "record/04-member-order",
    erasure: "record/08-erasure",
  },
  lens: {
    round: "lens/section/01-round-trip",
    escape: "lens/section/02-escaping",
    edit: "lens/section/04-edit-body",
    drop: "lens/section/06-dropped-section",
  },
};

function benchVector(path, files) {
  const file = `vectors/${path}.json`;
  const vector = files.get(path);
  if (!vector) throw new Error(`front: missing bench vector ${file}`);
  const { input, expect, laws } = vector;
  if (input.orders) {
    const orders = input.orders.map((order) => order.map(({ kind, observer, about, ...record }) => record));
    return { file, laws, orders, expect };
  }
  if (vector.layer === "record") {
    const { envs, payloads, salt } = input;
    const { env_canonical, payload_canonical, commit, id } = expect;
    return { file, laws, envs, payloads, salt, expect: { env_canonical, payload_canonical, commit, id } };
  }
  return { file, laws, input, expect };
}

export function readLaws(root, grammarWalkLaws = []) {
  const joined = joinLaws(root);
  const { data, rows, scopeOf, bounds, keyOf, files } = joined;
  const shapes = Object.entries(data.shapes).map(([k, shape]) => ({
    k, ...shape, n: rows.filter(({ key }) => data.laws[key].shape === k).length,
  }));
  const questions = Object.entries(data.questions).map(([k, q]) => {
    const tally = {};
    const answers = rows.filter(({ key }) => data.laws[key].question === k).map(({ key, names }) => {
      const law = data.laws[key];
      tally[law.shape] = (tally[law.shape] ?? 0) + 1;
      // A single name keeps its row's qualifier. A joint row lists each name.
      return { id: anchor(key), shape: law.shape, s: sentence(law), scope: scopeOf(key) || null,
        names: names.length === 1 ? [key] : names };
    });
    return { k, q, tally, note: data.questionNotes[k] ?? null, rows: answers };
  });
  const vectors = {};
  for (const [group, cases] of Object.entries(benchFiles)) {
    vectors[group] = Object.fromEntries(Object.entries(cases).map(([name, path]) => [name, benchVector(path, files)]));
  }
  return {
    LAWS: grammarChips(root, joined, grammarWalkLaws),
    L_SHAPES: shapes,
    L_QS: questions,
    L_UNLESS: unlessSaid(joined.premises),
    L_NOPROMISE: lawNotes(joined, "What these laws don't promise"),
    L_SIMPL: lawNotes(joined, "Simplifications in the model").map(({ k, v }) => k ? `<b>${k}</b> ${v}` : v),
    L_BOUND: bounds.map((c) => ({ ...c, row: anchor(keyOf(c.law, "boundaries")) })),
    L_VEC: vectors,
  };
}
