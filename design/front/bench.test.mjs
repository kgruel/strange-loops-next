import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { LE } from "./bench.mjs";
import { frontData } from "./render.mjs";

const root = fileURLToPath(new URL("../../", import.meta.url));
const data = frontData(root);
const vectors = data.get("L_VEC"), rules = data.get("PROTO");

// Only the protocol settings have model answers. The controls for first/newer counts,
// supersession after arrival, first/last winners, disabling order keys, dropping hidden
// records, skipping unread heads, list order, given member order, hashing the payload,
// fence-only/no escaping and reported/silent deletion are intentionally unchecked.
//
// These vectors never call leap or use DAYS. They omit masked/qualified dates, fractions,
// closed intervals, invalid times, absent occurred/of in latest-by, equal decoded ids,
// ties and headless things. Record envelopes exercise only kind/observer/emitted/about.
// View heads omit explicit "here" and held heads with a missing or non-integer n.
// All lens texts parse, so neither parse refusals nor edit's error return is exercised.

for (const v of Object.values(vectors.count)) {
  test(v.file, () => {
    for (const [i, order] of v.orders.entries())
      assert.equal(LE.count(order, rules.count.add), v.expect, `order ${i + 1}`);
  });
}

for (const v of Object.values(vectors.latest)) {
  test(v.file, () => {
    for (const [i, order] of v.orders.entries()) {
      const state = LE.latestBy(order, rules.current), actual = {};
      const records = new Map(order.map((r) => [r.id, r]));
      for (const [thing, { heads, winner, tie, named }] of Object.entries(state)) {
        actual[thing] = { heads, winner, others: heads.filter((id) => id !== winner) };
        const newest = heads.map((id) => records.get(id)).sort((a, b) => LE.contentOrder(b, a))[0];
        assert.equal(newest?.id ?? null, winner, `order ${i + 1}: newest head for ${thing}`);
        assert.equal(tie, false, `order ${i + 1}: tied heads for ${thing}`);
        assert.equal(named.has(winner), false, `order ${i + 1}: superseded winner for ${thing}`);
      }
      assert.deepEqual(actual, v.expect, `order ${i + 1}`);
    }
  });
}

for (const v of Object.values(vectors.view)) {
  test(v.file, () => {
    for (const [i, order] of v.orders.entries()) {
      const { heads, max, missed } = LE.view(order, rules.withheld);
      const label = `order ${i + 1}`;
      assert.deepEqual({ heads, max }, v.expect, label);
      assert.equal(missed, v.expect.max.unread, label);
      // The page compares the full reader across things by head membership.
      const full = Object.values(LE.fullReader(order)).flatMap((s) => s.heads);
      assert.deepEqual(full.sort(), v.expect.heads.map((h) => h.id).sort(), label);
    }
  });
}

for (const [name, v] of Object.entries(vectors.record)) {
  test(v.file, () => {
    const r = rules.id, sorted = r.members === "sorted";
    for (const [i, original] of v.envs.entries()) {
      // The sets control starts with each about list in a comma-separated text field.
      const env = name === "sets"
        ? { ...original, about: original.about.join(", ").split(",").map((s) => s.trim()).filter(Boolean) }
        : original;
      for (const [j, payload] of v.payloads.entries()) {
        assert.deepEqual({
          env_canonical: LE.canonical(LE.envJson(env, r), sorted),
          payload_canonical: LE.canonical(payload, sorted),
          commit: LE.commitOf(v.salt, payload, r),
          id: LE.idOf(env, v.salt, payload, r),
        }, v.expect, `envelope ${i + 1}, payload ${j + 1}`);
        if (name === "erasure") assert.equal(LE.erasedIdOf(env, v.salt, payload, r), v.expect.id);
      }
    }
  });
}

for (const [name, { file, input, expect }] of Object.entries(vectors.lens)) {
  test(file, () => {
    const { escape } = rules.text;
    if (name === "round" || name === "escape") {
      // The notes case on the page starts with the vector's parsed section (its base is empty).
      const sections = name === "round" ? input.base : expect.parsed;
      const lines = LE.render(sections, escape);
      assert.deepEqual(lines, expect.normalized);
      assert.deepEqual(LE.parse(lines), { sections: expect.parsed });
    }
    if (name === "escape") {
      const [{ id, body }] = expect.parsed;
      assert.deepEqual(body.map((line) => LE.escapeLine(line, escape)), expect.normalized.slice(1, -1));
      for (const line of body) {
        const sections = [{ id, body: [line] }];
        assert.deepEqual(LE.parse(LE.render(sections, escape)), { sections });
      }
    }
    const { sections, ...edit } = LE.edit(input.base, input.text, rules.text);
    assert.deepEqual({ parsed: sections, ...edit }, expect);
  });
}
