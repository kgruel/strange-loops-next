import { readFileSync } from "node:fs";
import { join } from "node:path";
import { isDeepStrictEqual } from "node:util";
import { walkOf } from "../grammar/render.mjs";
import { lawTable, vectorFiles } from "../protocol.mjs";

const fail = (why) => { throw new Error(`front walk: ${why}`); };

// The recipe retells the decision scenario. Its words are in walk.json. The
// times, edges, folds and lens transition come from the scenario vector.
export function readWalk(root) {
  const { vector, thing, people, records, steps, spec, sentence } =
    JSON.parse(readFileSync(join(root, "design", "front", "walk.json"), "utf8"));
  const laws = new Set(lawTable(root).rows.flatMap((r) => r.names));
  for (const step of steps) for (const law of step.laws)
    if (!laws.has(law)) fail(`step ${step.name} cites ${law}, which is not a law in protocol/laws.md`);

  const files = vectorFiles(root);
  const layout = records.map(({ text, ...card }) => card);
  const scenario = walkOf(root, { vector, records: layout, steps }, files);
  const recipe = Object.fromEntries(records.map(({ label, text }) => {
    const { who, at, col, row, prev, erases } = scenario.records[label];
    if (!Object.hasOwn(people, who)) fail(`record ${label} has no recipe writer for ${who}`);
    if (typeof text !== "string") fail(`record ${label} needs recipe text`);
    return [label, { who: people[who], at, col, row, text, prev, ...(erases.length && { erases }) }];
  }));
  const answers = scenario.steps.map((s, i) => ({
    key: steps[i].name, shown: s.shown, heads: s.heads, count: s.count,
    ...(s.erased.length && { erased: s.erased }),
    ...(s.orders && { orders: s.orders }),
    ...(s.reader && { reader: s.reader }),
    ...(s.withheld.length && { withheld: s.withheld }),
    ...(s.tick && { covers: s.tick.covers }),
    ...(s.lens && { lens: true }),
  }));

  const lensAt = answers.findIndex((s) => s.lens);
  if (lensAt < 1) fail("the lens step needs a preceding step");
  const before = scenario.steps[lensAt - 1].winner, after = scenario.steps[lensAt].winner;
  const source = files.get(vector);
  const lens = recipeLens(source, scenario.records, recipe, thing, before, after, vector);

  const E = Object.hasOwn(recipe, sentence.record) ? recipe[sentence.record] : null;
  if (!E) fail(`the anatomy sentence names unknown record ${sentence.record}`);
  const shortId = (id) => `r:${id}…`;
  return {
    WALK: { thing, records: recipe, steps: answers, lens, spec },
    WALK_TEXT: steps.map(({ title, text }) => ({ title, text })),
    STEP_LAWS: steps.map((s) => s.laws),
    SENTENCE: {
      env: {
        emitted: `${sentence.date}T${E.at}:00Z`, erases: (E.erases ?? []).map(shortId),
        kind: spec.from[0].kind[0], observer: `k:${E.who}…`, occurred: sentence.occurred,
        of: thing, prev: E.prev.map(shortId), under: sentence.under,
      },
      id: shortId(sentence.record),
      payload: { text: E.text },
    },
  };
}

function recipeLens(source, records, recipe, thing, before, after, vector) {
  if (!before || !after || before === after || !records[after].prev.includes(before))
    fail(`the lens step in ${vector} must revise the preceding winner`);
  const id = source.input.thing;
  const { rendered, outcomes, applied } = source.expect.lens;
  const fence = rendered.at(-1);
  const section = (id, body) => [`${fence} ${id}`, ...body.split("\n"), fence];
  const body = records[after].body.split("\n");
  if (!isDeepStrictEqual(rendered, section(id, records[before].body)) ||
      !isDeepStrictEqual(source.input.lens.text, section(id, records[after].body)) ||
      !isDeepStrictEqual(outcomes, [{ accepted: id, body }]) ||
      !isDeepStrictEqual(applied, [{ id, body }]))
    fail(`the lens edit in ${vector} must render ${before} and accept the body of ${after}`);
  return {
    before: section(thing, recipe[before].text).join("\n"),
    after: section(thing, recipe[after].text).join("\n"),
  };
}
