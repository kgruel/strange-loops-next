// Proposal readers. These functions do not activate spec fields.
import { createHash } from "node:crypto";
import { base32, base32Decode, momentBefore, occurredSpan, validEmitted } from "./loops.mjs";
import { settle } from "./realm.mjs";
import { runSpec } from "./spec.mjs";

const instant = (stamp) => {
  if (!validEmitted(stamp)) throw new Error(`invalid cutoff: ${stamp}`);
  return occurredSpan(stamp).start;
};

export function asOf(spec, forms, query) {
  const emittedCut = query.emittedThrough === null ? null : instant(query.emittedThrough);
  const occurredCut = query.occurredThrough === null ? null : instant(query.occurredThrough);
  const selected = settle(forms).filter((r) => {
    const emitted = instant(r.emitted);
    const occurred = r.occurred === undefined ? emitted : occurredSpan(r.occurred).start;
    return (emittedCut === null || !momentBefore(emittedCut, emitted)) &&
      (occurredCut === null || !momentBefore(occurredCut, occurred));
  });
  return { name: query.name, selected: selected.map(({ id, shown }) => ({ id, shown })), result: runSpec(spec, selected) };
}

function idBytes(id) {
  if (typeof id !== "string" || !/^r:[a-z2-7]{52}$/.test(id)) throw new Error(`invalid record id: ${id}`);
  const bytes = Buffer.from(base32Decode(id.slice(2)));
  if (bytes.length !== 32 || `r:${base32(bytes)}` !== id) throw new Error(`invalid record id: ${id}`);
  return bytes;
}

export function tick(ids) {
  const entries = ids.map((id) => ({ id, bytes: idBytes(id) })).sort((a, b) => Buffer.compare(a.bytes, b.bytes));
  const unique = entries.filter((entry, i) => i === 0 || !entry.bytes.equals(entries[i - 1].bytes));
  const bytes = Buffer.concat([Buffer.from("loops/tick-cover/v1:", "utf8"), ...unique.map((x) => x.bytes)]);
  return { cover: unique.map((x) => x.id), bytes: bytes.toString("hex"), hash: `h:${base32(createHash("sha256").update(bytes).digest())}` };
}

export function ticks(oldIds, newIds) {
  const old = tick(oldIds), next = tick(newIds);
  const oldSet = new Set(old.cover), newSet = new Set(next.cover);
  return { old, new: next, added: next.cover.filter((id) => !oldSet.has(id)), removed: old.cover.filter((id) => !newSet.has(id)) };
}
