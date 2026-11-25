# Decisions

Everything that waits on Kyle, in one place. Each entry has the question, an example, the options and a recommendation.

- An entry leaves this file when it is ruled. The entries ruled on 2026-11-21 have left it: PV1 to PV7, RC1, W7, E1 and I10, then TK1 to TK9 and W1 to W6. TK10 to TK12 and S4 left it on 2026-11-22, AD1 to AD4, TK13 and W3b on 2026-11-23. SD1 to SD4, AD5 and BP1 left it on 2026-11-24, the day they were put.
- The ruling is written in [CHANGELOG.md](CHANGELOG.md) under its date, and one line is added to [Ruled](#ruled) at the end of this file.
- What is next once these are ruled is in [ROADMAP.md](ROADMAP.md).
- "Today" in an example means the `loops` binary built from main on 2026-11-21. Every "today" answer below was run, not predicted.
## At a glance

Nothing waits on a ruling. Two things are [being prepared](#being-prepared).

Every entry is ruled.

- The tick record, TK1 to TK13: ruled and built. Step 4 is closed. The questions as they were put are in [the tick record note](notes/2026-11-21-tick-record.md#10-the-questions-as-they-were-put), sections 10 and 11.
- The order of work, W1 to W6, and W3b, the look at the JavaScript after ticks: ruled. The entries as put are in [the order-of-work note](notes/2026-11-21-order-of-work.md).
- The adoption step, AD1 to AD4: ruled on 2026-11-23. AD1 and AD2 each for its recommendation with additions, AD3 for its recommendation in both rows, AD4 for rows 1 to 3 with row 4 the other way and a rule for old ids. The entries as put, and the additions, are in [the adoption note](notes/2026-11-22-adoption.md).
- What a store says about its kinds, SD1 to SD3, a read of what refers to a thing, SD4, and one written form for a reference at the import, AD5: put and ruled on 2026-11-24, each as recommended. The entries as put are in [the kinds and references note](notes/2026-11-24-kinds-and-references.md).
- The nine narrow cases the build plan found open, BP1: ruled on 2026-11-24, seven rows as recommended and two the other way, on the principle that what was entered is accepted strictly. The entry as put is at the end of the same note.
- The strict shorthand, ST1: ruled in direction on 2026-11-24 and settled in the room; with it a mention declined and the import's AD5 work deferred. It is the last section of the same note.

Below: [what is being prepared](#being-prepared), [what you deferred](#deferred-by-you) and [what is ruled](#ruled). Nothing waits to be confirmed: under your ruling of 2026-11-21 an implementer choice comes here only when it changes bytes or answers.

## Being prepared

Nothing here needs you yet. It is listed so that you know what is coming.

**Numbers stored as text**, with the import ([W1](notes/2026-11-21-order-of-work.md#w1-an-adoption-step-before-standing-and-sharing)). [TK6](notes/2026-11-21-tick-record.md#tk6-what-a-spec-reads-of-a-tick) shows one use for it.

**Identity, standing and sharing.** [The walk](notes/2026-11-24-identity-walk.md) has two parts and fourteen draft entries. None is put. Part one walks identity through three scenes (ID1 to ID8). Part two walks the thinnest slice through standing and sharing, on your direction that anybody can emit, that records travel as git objects without pull requests, and that standing decides what is canonical (SL1 to SL6). The ones that decide what a fold answers would come here first: what "more standing" means (SL1), a record that does not count (SL2), and a record whose key does not speak for its observer (ID4). Who gets a lineage (ID1) and recovery (ID6) come before the first store that is kept.

## Deferred by you

Not asked now. Each comes back when its step does.

- **A strict store's policy for an emit behind what the store holds:** warn, fail, or let it through as a conflict. You raised it on 2026-11-20 and left it for step 3. margins-claude's answer is recorded in [the cut note](notes/2026-11-15-the-cut.md), section 8.
- **Refusing an undeclared payload key in a strict store.** Step 3. You ruled on 2026-11-10 that refusal is progressive.
- **A top-N across groups.** 2026-11-11: "a later discussion".
- **What the old tool's `combine` and `discover` vertices did.** 2026-11-20: they wait until they are wanted.
- **The provenance export mapping,** W3C PROV or PREMIS.
- **The import writing a reference as `kind:key` (AD5), and a second cutover of the homelab.** 2026-11-24: deferred until a store is picked from by its reference fields; then built into a fresh group that is not cut over. Row 2 of AD5 comes back to you before it is built ([the kinds and references note](notes/2026-11-24-kinds-and-references.md#st1-the-shorthand-is-strict-and-the-description-says-what-it-allows)).

## Ruled

One line for each ruling, newest first. The full text is in [CHANGELOG.md](CHANGELOG.md) under the date, or in the note named.

| Date | Ruling | Where |
| --- | --- | --- |
| 2026-11-24 | ST1: the shorthand is strict. With a description, `emit` stops on a kind it does not name, a lifecycle value in neither list, a reference field holding anything but references of a listed kind, and a comma in a reference or a key; the description loses `key_format` and `search`; no `name` headline once a description exists | Changelog; [the kinds and references note](notes/2026-11-24-kinds-and-references.md#st1-the-shorthand-is-strict-and-the-description-says-what-it-allows) |
| 2026-11-24 | AD5 amended: the mention in row 2 is declined; the import's AD5 work is deferred and the homelab is not cut over a second time | Changelog; [the kinds and references note](notes/2026-11-24-kinds-and-references.md#st1-the-shorthand-is-strict-and-the-description-says-what-it-allows) |
| 2026-11-24 | BP1: what was entered is accepted strictly. A key that is not text stops the shorthand; a root that is meant keeps its payload; `--add-about` and `--drop-about` of one thing is a usage error; the import leaves a bare key beside a twin as entered, makes a list from a comma or a reviewed comma and space, and mentions only what it repaired | Changelog; [the kinds and references note](notes/2026-11-24-kinds-and-references.md#bp1-nine-narrow-cases-the-build-plan-found-open) |
| 2026-11-24 | AD5: the import writes a reference field as `kind:key` where the old store proves it: where its twin resolves to the thing it names; in five slip fields the group's map names, with a mention; and as a list where a twin holds several ids. Never a kind's key field. The homelab is imported afresh | Changelog; [the kinds and references note](notes/2026-11-24-kinds-and-references.md#ad5-one-written-form-for-a-reference-set-at-the-import) |
| 2026-11-24 | SD4: `loops ls --refers-to <thing>` reads the declared reference fields as a fold's `is` does, yes, no or unknown, across kinds and across a group's stores, and states what it read | Changelog; [the kinds and references note](notes/2026-11-24-kinds-and-references.md#sd4-a-read-of-everything-that-refers-to-a-thing) |
| 2026-11-24 | SD3, option C: a kind's reference fields are described and nothing is copied into `about`; a mention is stated by the writer | Changelog; [the kinds and references note](notes/2026-11-24-kinds-and-references.md#sd3-reference-fields-copied-into-about-and-erasure) |
| 2026-11-24 | SD2, option A: `emit` stops before it signs a write with no key, or with a key field that disagrees with its thing's key; `--root` for a keyless root that is meant | Changelog; [the kinds and references note](notes/2026-11-24-kinds-and-references.md#sd2-a-write-that-contradicts-the-declared-key) |
| 2026-11-24 | SD1, option A: a store describes its kinds in a plain `.loops/store.json` that the CLI uses and no read depends on; it refuses nothing, and becomes records at step 3 | Changelog; [the kinds and references note](notes/2026-11-24-kinds-and-references.md#sd1-a-store-describes-its-kinds-in-a-file-and-enforces-nothing) |
| 2026-11-23 | W3b: the JavaScript stays frozen, as the rule; new steps are built in Lean and Rust | Changelog; [the order-of-work note](notes/2026-11-21-order-of-work.md#w3b-the-frozen-javascript-after-ticks) |
| 2026-11-23 | AD4: references in the old payloads become mentions of what they name, through one rule for old ids; the payload is cleaned of the fields they came from | Changelog; [the adoption note](notes/2026-11-22-adoption.md#ad4-references-in-the-old-payloads) |
| 2026-11-23 | TK13: `loops tick <spec>` with no cut named covers the records the answer depends on, with everything held under them through `prev` and `under`; for a spec that reads things by key, every record of the things it touches; `--all` covers everything | Changelog; [the tick record note](notes/2026-11-21-tick-record.md#tk13-what-a-tick-covers-when-you-name-no-cut) |
| 2026-11-23 | AD3: a fact of a kind the vertex does not name, brought in with `--include-unnamed`, is a root; the old time is kept to the microsecond | Changelog; [the adoption note](notes/2026-11-22-adoption.md#ad3-two-details-of-the-import) |
| 2026-11-23 | AD1: a store name is bound in a per-user list, in an optional list kept with a group of stores, or by `--store <name>=<dir>` on the command; a name bound to nothing refuses the whole read (`store-unknown`) | Changelog; [the adoption note](notes/2026-11-22-adoption.md) |
| 2026-11-23 | AD2: the import's eight choices as recommended, and four more: no observer mention for an empty observer; the old store's row order where it keeps no arrival number; a fact without its key is a root; a kind the vertex does not name is left out unless asked for | Changelog; the adoption note |
| 2026-11-22 | Step 4 (ticks) meets its exit criterion and is closed | Changelog |
| 2026-11-22 | TK12: `loops tick --check` exits 0 only for `same` | Changelog; the tick record note, section 11 |
| 2026-11-22 | TK10, seven details of `loops tick --check`, each as recommended: an erased payload is not read from old bytes; a covered eraser the tick ignores is not a tick at once; under newer rules the check tests only what no version changes, and a result's hash only for its spelling; a result no fold could give is `differs`; `rules` is a positive whole number as text; a spec this binary cannot read is `cannot check` | Changelog; [the tick record note](notes/2026-11-21-tick-record.md#11-the-later-questions-as-they-were-put), section 11 |
| 2026-11-22 | TK11, option C: a write against a base names the base's live records together with what is under them in the store, and says how many it named that the base did not hold | Changelog; the tick record note, section 11 |
| 2026-11-21 | The tick record, TK1 to TK9: an ordinary record of kind `tick`; it carries its result and the result's hash; it carries its spec and the spec's hash; `covers` lists every record folded; `withheld` lists those read without a payload; a spec reads a tick by the payload reading; a verb checks and no store refuses a tick; the window field is `env.when`; a member `rules` bound into the spec's hash | Changelog; [the tick record note](notes/2026-11-21-tick-record.md) |
| 2026-11-21 | The order of work, W1 to W6: an adoption step after ticks, its CLI pieces beside the tick work; a cache of checked segments in that step; the JavaScript frozen as a trial for step 4; one refusal per input inside the repository, single faults in the protocol text; the mutant check stays; `out/` stays committed | Changelog; [the order-of-work note](notes/2026-11-21-order-of-work.md) |
| 2026-11-21 | Payload values, PV1 to PV7: the reading is stated in the model; `value` and `n` are ordinary fields; `present` means written; a list reads as a set under `is`, `not` and `by`; a list is never a number | Changelog; [the payload values note](notes/2026-11-21-payload-values.md) |
| 2026-11-21 | A result hash has its own prefix, `res:`; the codec's other choices confirmed | Changelog |
| 2026-11-21 | Only a choice that changes bytes or answers comes to Kyle; other implementer choices stand unless he objects | Changelog |
| 2026-11-21 | The 20 built keyed-fold choices confirmed | Changelog |
| 2026-11-21 | Edges: three classes, no change to the envelope; an edge's payload holds `rel`, `from`, `to` and `state` | Changelog |
| 2026-11-21 | Issue #10 closed with no strict "after" operator | Changelog |
| 2026-11-20 | Step 2 meets its exit criterion and is closed | Changelog |
| 2026-11-20 | A verb that answers from a store that does not check answers and is then refused `store-not-clean` | Changelog |
| 2026-11-20 | The cut: a cut is a part closed downward over `prev`; "as of T" is down; a content tick folds a set named outright; ids without `shown` in the result; a window is a `where`; `emit` copies `occurred`; the changeset path can ask for the filler; the filler takes a base | [The cut note](notes/2026-11-15-the-cut.md), sections 1 to 8 |
| 2026-11-20 | The result codec carries no tag on an integer | The cut note, section 6 |
| 2026-11-15 | `loops of` shows values; `--values`; an emit of a held thing sets the fields it names | Changelog |
| 2026-11-15 | A keyed collect's `limit` counts things, each listed whole | Changelog |
| 2026-11-14 | A slot following `keys` reads the envelope from the heads ("Rule B"); every emit carries the thing's whole `about`; the anchor names every live record | [The declared-keys note](notes/2026-11-11-declared-keys.md), sections 3 and 5 |
| 2026-11-13 | `"follow": "keys"`, its result, how the other slots read a keyed thing, the laws and the writer | The declared-keys note, sections 1 to 5 |
| 2026-11-13 | A writer refuses an `under` target it does not hold | Changelog |
| 2026-11-11 | D7: a separate, versioned result codec with integers as decimal text | Changelog |
| 2026-11-11 | `by`: its spelling, text keys, `ungrouped`, a record in several groups, `limit` per group | Changelog |
| 2026-11-11 | `follow` on count, sum, min and max; the caching reader's law is step 4's first | Changelog |
| 2026-11-11 | Envelope shapes: one new code, `envelope-not-object` | Changelog |
| 2026-11-11 | The slice law is *witnessed*; a writer's tool fills in the anchor | Changelog, under D8 |
| 2026-11-10 | D8: `of` names a record's one thing; `about` only mentions; `sets` declares keys; natural keys; no conflict declared by the core; undeclared keys refused progressively | Changelog |
| 2026-11-10 | Withheld and erased are one state to a fold | Changelog, under D8 |
| 2026-11-10 | The order: step 2 with D8, then step 4, then step 3 with step 5 | Changelog |
| 2026-11-10 | D1 to D6, as their recommendations | Changelog |
| Step 1 | R1 to R6; binary64 by Option A | Changelog |
