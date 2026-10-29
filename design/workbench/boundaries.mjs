// Live premise examples use the same readers as the scenario workbench.
// The generated boundary file supplies the law, premise, and model answer.
import { base32 } from "../../interop/js/record.mjs";
import { latestBy } from "../../interop/js/fold.mjs";
import { render } from "../../interop/js/lens.mjs";
import { equal, runScenario } from "./runtime.mjs";

const id = (n) => `r:${base32(Uint8Array.from({ length: 32 }, (_, i) => i === 31 ? n : 0))}`;
const record = (n, value) => ({ id: id(n), kind: "note", observer: "sl:reader", about: ["decision:auth"], prev: [], emitted: "2026-10-01T00:00:00Z", value });
const inputOf = (records, fold, shown = "here") => ({
  thing: "decision:auth", records,
  spec: { vertex: "premise", from: [{ store: "." }], fold },
  steps: [{ name: "premise", forms: records.map((r) => ({ id: r.id, shown })), orders: [records.map((r) => r.id)] }],
});

export function boundaryResult(law, removed) {
  const live = (given, actual, holds, note = "This example is separate from your scenario.") => ({ given, actual, holds, mode: "live", note });
  if (law === "result.full") {
    const r = record(1, "Estimate");
    if (!removed) r.fields = { est: 3 };
    const actual = runScenario(inputOf([r], { total: { sum: "est" } })).expect.steps[0].slots;
    return live(removed ? "The record lacks est." : "The record holds est = 3.", actual, actual.total.unread === 0);
  }
  if (law === "where.complements") {
    const input = inputOf([record(1, "yes")], {
      isYes: { count: true, where: { value: { is: "yes" } } },
      notYes: { count: true, where: { value: { not: "yes" } } },
    }, removed ? "withheld" : "here");
    const actual = runScenario(input).expect.steps[0].slots;
    return live(removed ? "The reader lacks the payload." : "The reader holds value = yes.", actual,
      actual.isYes.value + actual.notYes.value === 1 && actual.isYes.unread + actual.notYes.unread === 0);
  }
  if (law === "lens.no-op" || law === "lens.put-get") {
    const input = inputOf([], { count: { count: true } });
    const base = [{ id: "decision:auth", body: ["Passkeys."] }, { id: "decision:cache", body: ["No cache."] }];
    if (law === "lens.no-op") {
      if (removed) base[1].id = base[0].id;
      input.lens = { base, text: render(base) };
    } else {
      const edited = [{ id: base[0].id, body: ["Passkeys everywhere."] }, base[1]];
      input.lens = { base, text: render(removed ? edited.slice(0, 1) : edited) };
    }
    const actual = runScenario(input).expect.lens;
    const holds = law === "lens.no-op" ? equal(actual.outcomes, []) : actual.applied !== null && equal(render(actual.applied), input.lens.text);
    return live(law === "lens.no-op" ? (removed ? "Two base sections share an id." : "Each base section has its own id.") :
      (removed ? "The edit drops decision:cache." : "The edit keeps both sections."), actual, holds,
      "The lens runs on a supplied base. This example does not assert that the base is a scenario head.");
  }
  if (law === "latest-by.set") {
    const a = record(1, "first"), b = record(2, "second");
    if (removed) b.id = a.id;
    const actual = [[a, b], [b, a]].map((records) => {
      const winner = latestBy(records)["decision:auth"].winner;
      return { winner, value: records.find((r) => r.id === winner).value };
    });
    return live(removed ? "One id names two different records." : "Each record has its own id.", actual, equal(actual[0], actual[1]),
      "This calls the existing LatestBy fold directly. A scenario refuses repeated record ids, so this invalid store stays outside your edit.");
  }
  if (law === "record.member-order") return {
    given: removed ? 'Raw members: [["x",1],["x",2]], then their reverse.' : 'Raw members: [["x",1],["y",2]], then their reverse.',
    actual: null, holds: !removed, mode: "model",
    note: "Model evidence only. A JSON object cannot keep repeated member names. The layer-0 writer refuses this input with member-duplicate.",
  };
  throw new Error(`No premise example for ${law}`);
}
