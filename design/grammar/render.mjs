import { vectorFiles } from "../protocol.mjs";

// The walk: its narration and layout are walk.json's, and everything it shows of the protocol
// (records, heads, winner, counts, what is erased or withheld, the lens edit) is the
// scenario vector the model wrote. The two must name the same records and steps.
export function walkOf(root, walk, files = vectorFiles(root)) {
  const v = files.get(walk.vector);
  if (!v) throw new Error(`grammar: no vector ${walk.vector}`);
  const fail = (m) => { throw new Error(`grammar: walk: ${m}`); };
  const recs = v.input.records;
  if (recs.length !== walk.records.length) fail(`${walk.records.length} records drawn, ${recs.length} in the vector`);
  const label = new Map(recs.map((r, i) => [r.id, walk.records[i].label]));
  if (new Set(label.values()).size !== recs.length) fail("two records share a label");
  const L = (id) => label.get(id) ?? fail(`no record ${id}`);
  // walk.json says only how to tell the walk; a key for anything else would be silently ignored.
  const STEP = ["name", "title", "text", "laws", "reader", "settled", "tick", "orders", "lens"];
  for (const st of walk.steps) for (const k of Object.keys(st))
    if (!STEP.includes(k)) fail(`step ${st.name} has ${k}; what a step shows of the protocol comes from ${walk.vector}`);
  for (const r of walk.records) for (const k of Object.keys(r))
    if (!["label", "col", "row"].includes(k)) fail(`record ${r.label} has ${k}; records come from ${walk.vector}`);
  const names = v.input.steps.map((s) => s.name);
  if (JSON.stringify(names) !== JSON.stringify(walk.steps.map((s) => s.name))) fail(`steps ${walk.steps.map((s) => s.name)} aren't the vector's ${names}`);
  const records = Object.fromEntries(recs.map((r, i) => [L(r.id), {
    who: r.observer.replace(/^sl:/, ""), at: r.emitted.slice(11, 16), col: walk.records[i].col, row: walk.records[i].row,
    body: typeof r.fields?.value === "string" ? r.fields.value : fail(`record ${L(r.id)} needs a text value`),
    prev: r.prev.map(L), erases: (r.erases ?? []).map(L),
  }]));
  const thing = v.input.thing;
  const lens = v.expect.lens;
  const steps = walk.steps.map((w, i) => {
    const e = v.expect.steps[i];
    const shownAs = (k) => e.settled.filter((x) => x.shown === k).map((x) => L(x.id));
    const st = {
      title: w.title, text: w.text, laws: w.laws, reader: w.reader, settled: w.settled,
      shown: e.settled.map((x) => L(x.id)), heads: e.heads.map(L), winner: e.winner && L(e.winner),
      count: e.slots.decisions.value, erased: shownAs("erased"), withheld: shownAs("withheld"),
      current: e.slots.current.things[thing].map((h) => ({ id: L(h.id), shown: h.shown })),
    };
    if (JSON.stringify(st.current.map((h) => h.id)) !== JSON.stringify(st.heads)) fail(`${w.name}: the slot's heads aren't the thing's`);
    if (w.orders) st.orders = v.input.steps[i].orders.slice(0, 3).map((o) => o.map(L));
    if (w.tick) st.tick = { covers: st.shown };
    if (w.lens) {
      const [acc] = lens.outcomes;
      const back = recs.find((r) => r.fields?.value === acc.body.join("\n")) ?? fail("no record carries the accepted edit");
      st.lens = { before: lens.rendered, after: v.input.lens.text,
        outcome: `accepted <code>${acc.accepted}</code> → emit ${L(back.id)}, <code>prev: [${back.prev.map(L).join(", ")}]</code>` };
    }
    return st;
  });
  return { records, steps };
}
