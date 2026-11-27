# Decisions

Everything that waits on Kyle, in one place. Each entry has the question, an example, the options and a recommendation.

- An entry leaves this file when it is ruled. The entries ruled on 2026-11-21 have left it: PV1 to PV7, RC1, W7, E1 and I10, then TK1 to TK9 and W1 to W6. TK10 to TK12 and S4 left it on 2026-11-22, AD1 to AD4, TK13 and W3b on 2026-11-23. SD1 to SD4, AD5 and BP1 left it on 2026-11-24, the day they were put.
- The ruling is written in [CHANGELOG.md](CHANGELOG.md) under its date, and one line is added to [Ruled](#ruled) at the end of this file.
- What is next once these are ruled is in [ROADMAP.md](ROADMAP.md).
- "Today" in an example means the `loops` binary built from main on 2026-11-21. Every "today" answer below was run, not predicted.
## At a glance

**Eleven entries wait on a ruling: [IS1 to IS11](#identity-and-standing-is1-to-is11), on identity and standing.** They were put on 2026-11-24, after a walk in five parts and a review by margins, Neon and Astra. One other question is [being prepared](#being-prepared). On 2026-11-27 [a note](notes/2026-11-27-a-seat-as-a-case.md) read the eleven against one real store, and IS6 and IS8 each gained the alternative they were put without.

Every earlier entry is ruled.

- The tick record, TK1 to TK13: ruled and built. Step 4 is closed. The questions as they were put are in [the tick record note](notes/2026-11-21-tick-record.md#10-the-questions-as-they-were-put), sections 10 and 11.
- The order of work, W1 to W6, and W3b, the look at the JavaScript after ticks: ruled. The entries as put are in [the order-of-work note](notes/2026-11-21-order-of-work.md).
- The adoption step, AD1 to AD4: ruled on 2026-11-23. AD1 and AD2 each for its recommendation with additions, AD3 for its recommendation in both rows, AD4 for rows 1 to 3 with row 4 the other way and a rule for old ids. The entries as put, and the additions, are in [the adoption note](notes/2026-11-22-adoption.md).
- What a store says about its kinds, SD1 to SD3, a read of what refers to a thing, SD4, and one written form for a reference at the import, AD5: put and ruled on 2026-11-24, each as recommended. The entries as put are in [the kinds and references note](notes/2026-11-24-kinds-and-references.md).
- The nine narrow cases the build plan found open, BP1: ruled on 2026-11-24, seven rows as recommended and two the other way, on the principle that what was entered is accepted strictly. The entry as put is at the end of the same note.
- The strict shorthand, ST1: ruled in direction on 2026-11-24 and settled in the room; with it a mention declined and the import's AD5 work deferred. It is the last section of the same note.
- Two more stops in the shorthand, asked for in the first issues filed from a store being rebuilt: a field every write of a kind must state (`every_write`), and a stated `--sets` that leaves out a key given. Ruled on 2026-11-25 after a round in the room, and built. They were never entries here; the record is in the changelog under that date.

Below: [what is being prepared](#being-prepared), [what is deferred](#deferred) and [what is ruled](#ruled). Nothing waits to be confirmed: under Kyle's ruling of 2026-11-21 an implementer choice comes here only when it changes bytes or answers.

## Identity and standing: IS1 to IS11

**Put on 2026-11-24.** These come from [the walk](notes/2026-11-24-identity-walk.md), written at Kyle's request in four parts and then put to margins, Neon and Astra, who were asked where it is wrong. Part five of the note is what they broke and what replaces it. Each entry below is as it reads after that review, and names the draft entry and the items of part five it comes from. All four reviewers said the round had converged.

They take as given what Kyle said during the walk, none of which was a ruling: anybody can emit; records travel as git objects without pull requests; standing decides what is canonical; the steward is a lineage for the team, with grants from it.

"Today" in these examples is the `loops` binary built from main at `c483cb9`. Every "today" answer was run in a scratch store with invented names. Where something is proposed and cannot be run, it says so.

**What needs ruling first.** IS1, IS2, IS3 and IS11 are what a trial needs. The rest are needed before the first store that is kept.

**What is not here.** Leanings that change no bytes and no answers stay in the note and stand unless Kyle objects: recovery (ID6), where a person's keys are kept (ID3), what stays erasable (ID7), names (ID8), how the team's root is used (SW2), a description two stewards changed apart (SW7), and how records travel in git (SL6, now an outbox for each place that writes). Four questions are left open on purpose and listed in section 22 of the note.

### IS1: what "more standing" means

*From SL1. Nobody in the review broke it.*

**Question.** Kyle said a director or a lead has more standing than a junior developer. More of what?

**Example, run today.** A lead wrote a decision and a junior then wrote over it:

```
$ loops emit decision --of decision:kiln-schedule chosen=weekly      (the lead's key)
$ loops emit decision --of decision:kiln-schedule chosen=daily       (the junior's key)
$ loops of decision:kiln-schedule --plain
heads  1
  chosen  daily
```

One head and no conflict: the junior's write anchored on the lead's and replaced it.

| | Standing is | Cost |
| --- | --- | --- |
| A | A rank: where two disagree, the higher wins. | The example is a replacement, not a disagreement, so a rank decides nothing in it. It would have to say who may replace whom. A junior's dissent is hidden. |
| B | Counted or not, for the whole store. | A junior's notes become proposals as well. |
| **C (recommended)** | Counted or not, kind by kind, with the right to accept what others propose. A junior's `note` counts; only a lead's `decision` does. | A scope has to be written down. A set of kinds is the smallest one. |

**Changes:** what a grant holds, and so what IS4 writes.

### IS2: a record that does not count

*From SL2 and ID4, and item 1 of part five (margins).*

**Question.** What does a read do with a record whose writer has no standing for its kind, or whose key does not speak for its observer?

**Example, run today.** The lead wrote `monthly` and then `weekly`. The junior wrote `daily`. The lead then accepted it by writing `daily`, anchored on the junior's record as `emit` does. Read with the junior's record taken out:

```
$ loops of decision:kiln-schedule --plain
heads  2
  chosen  conflict (2): daily | weekly
```

Taking the record out cut the chain between the lead's two writes.

| | A fold | Cost |
| --- | --- | --- |
| A | Leaves the record out before it finds the heads. | The example: accepting a proposal breaks. |
| **B (recommended)** | The record stays in the order of what is above what, and sets nothing, its envelope included. It is shown as proposed and counted beside the result. One reading for both reasons a record may not count. | Every read has a second part. A fold's answer changes when a late grant or binding arrives, as it already does for a late `prev`. |
| C | Includes it and counts it, as `loops check` does today with `unbound`. | Nothing is canonical. |

Under B the example reads `chosen weekly` with one proposal against it, then `chosen daily` after the lead accepts. That is proposed and not run: it needs the clause built.

**With it.** A record that cannot yet be shown to count (its grant, its binding or an envelope in between has not arrived) does not count yet. Admission keeps two answers.

**Changes:** what a spec answers. The model, the vectors and Rust.

### IS3: every record in a store with standing names what it stands on

*New in part five: items 2, 3, 17 and 20 (Neon, margins, Astra).*

**Question.** How is a record tied to the store it counts in, and a grant to the grant that allowed it?

**Example, run today.** One team lineage anchors a workshop store and a yard store. A grant written in the workshop:

```
$ loops -C workshop emit grant --root --about sl:junior-example --about kind:decision
$ loops -C workshop export | loops -C yard import -
$ loops -C yard check
{"altered":[],"lines":1,"records":1,"refused":[],"segments":1,"unbound":0}
```

The same signed line is held in the yard, with the same id. Nothing in it says which store it was for, and anybody can emit. The same is true of an ordinary record by someone granted in both.

| | Tie | Cost |
| --- | --- | --- |
| **A (recommended)** | Every record names one thing in `under`: its grant, or the store's anchor when it has none. Every grant names the grant above it, down to the anchor. Admission checks that the record's observer is the one its grant names, that its kind is one the grant covers, and the same of each grant above. A record under the anchor from anyone but a founder is a proposal addressed to that store. | The bytes of every record written in such a store. A record counts by the one grant it names, so a second valid grant does not keep it counting when the first ends. |
| B | A grant names its store among its mentions. Ordinary records name nothing, and admission searches for a grant. | An ordinary record still replays from one store to another. A tree of grants over lineages can loop (margins: the founder grants A, A grants B, B grants A). |
| C | Nothing names a store. | The example. |

`under` is already an envelope field, "the record id of the grant it acts on". Nothing writes it today, and nothing checks what it names beyond its being held.

**Changes:** what a record holds, and what admission reads.

### IS4: what a grant's envelope holds

*From SW3, and items 7 and 20 of part five.*

**Question.** Where is a grant's scope written?

**Example, run today,** as an ordinary record:

```
$ loops emit grant --root --about sl:junior-example --about kind:note --about kind:task
  about  kind:note, kind:task, sl:junior-example      payload {}
```

A spec that takes grants mentioning `kind:note` finds it, and finds it again after `loops erase`.

| | Scope | Cost |
| --- | --- | --- |
| **A (recommended)** | The mentions are exactly one grantee and the kinds. The store comes from `under` (IS3). A right to grant is a record kind of its own, with the kinds it may pass on. | No scope finer than a set of kinds. A kind becomes a thing, `kind:<name>`. |
| B | In the payload, in spec vocabulary. | A reader without the payload cannot judge a record, so admission gains a third answer. |

**Changes:** what a grant holds. Permanent for each grant written.

### IS5: ending a grant

*From SW5, and items 2, 8, 18 and 21 of part five.*

**Question.** When someone leaves, how does their grant end without taking their past decisions out of the canon?

**Example.** A director is granted `decision` in March and leaves in October. Their decisions from March to October must still read as canonical in November. A record signed with their key in November must not.

| | An end | Cost |
| --- | --- | --- |
| **A (recommended, before a team store is kept)** | A record of the grant it ends, by someone above that grant. It carries, as mentions, the topmost ids of a closed cut of what stands. It takes with it the grants made beneath the ended one, from then on. A record stands only if every end that counts covers it. | A law of the model changes: holding more can now stop a writer counting, outside a cover. The envelope is about as wide as the number of things the leaver wrote in. The verb refuses to sign unless its cut is closed. |
| B | Nothing ends a grant yet. The host takes away the leaver's right to deliver. | The host is the boundary for this case, and only for stores it carries. |

**Changes:** what a reader counts.

### IS6: an explicit cut follows `under`

*From item 23 of part five (Neon).*

**Question.** Does a tick over a chosen set of records take in what those records stand on?

**Example, run today.** A note under a grant under an anchor:

```
$ loops tick spec.json                 covers 3 ids   {"answer":"same","closure":"yes"}
$ loops tick spec.json --cover <note>  covers 1 id    {"answer":"same","closure":"no"}
```

A bare tick follows `prev` and `under`. A cut by ids or by time follows `prev` only, as it is documented to.

| | A cut by ids or by time | Cost |
| --- | --- | --- |
| **A (recommended)** | Closes over `under` as well as `prev`. IS5's end and IS8's continuing store are both explicit cuts. | A cut takes in records its maker did not name: each grant above what was named, down to the anchor. |
| B | Follows `prev` only, as documented. A verb that needs the grants names their ids itself. | The example: the tick answers `closure no`. A store continued from such a tick holds a note and not the grant that makes it count, so under IS3 the note stops counting there. Each verb that cuts has to walk `under` in its own code. |

*Option B was added on 2026-11-27; the entry was put without an alternative.*

**Changes:** what such a tick covers. No record written today carries `under`, so no existing tick changes.

### IS7: a second steward, and a person's seats

*From SW6, and items 2, 16 and 25 of part five.*

**Question.** A store starts with one steward. How is a second added, and who may end whom?

**Example.** The team's lineage founds the store and gives the lead the right to grant. The lead gives it to a second lead. The two fall out, and each tries to end the other.

| | Rule | Cost |
| --- | --- | --- |
| **A (recommended)** | A second steward is a grant that carries the right to grant. A grant is ended by whoever is above it in the chain of `under`, and by nobody else. The founder holds no grant and is never ended. People are granted by the team's lineage directly. A person's grant carries the right to grant its kinds to their own seats. | Ending a lead's grant ends what that lead granted. Hence people directly from the team. |
| B | Stewards are equals who may end each other. | The example has two consistent readings and no rule between them. |

Under A the second lead cannot end the first, and the first can end the second. Whether one of two founders may end a grant the other made is left open.

**Changes:** what admission reads of a grant.

### IS8: a store that continues another, or is raised from open

*From items 19 and 24 of part five (margins, Neon).*

**Question.** Under IS3 every record ends at one store's anchor. What happens to records written before that anchor existed, or under an anchor that has to be replaced?

**Example.** A team's root key is taken in June. The remedy the walk first gave was a new store that takes the old records as history. Under IS3 none of the old records would count in it.

| | The old records | Cost |
| --- | --- | --- |
| **A (recommended)** | A store's anchor may name a tick, and an earlier anchor. Records inside that tick's cover count as they did: records with no `under` from a store that was open, or records chained to the earlier anchor. For a root that was taken, the cover stops before the theft. | Admission has a second way for a record to count, by a cover and not by a chain. The tick named has to be one the new founder trusts. |
| B | They are written again under the new anchor, each as a new record. | Every id changes. Anything that named an old id stops finding it: a reference field, a `prev` held elsewhere, a tick, and a countersign of that tick in another store. The new records say they were written on the day of the move, by whoever moved them. |

*Option B was added on 2026-11-27; the entry was put without an alternative. [A seat as a case](notes/2026-11-27-a-seat-as-a-case.md) runs the countersign.*

**Changes:** what a store's anchor holds, and what admission counts beneath it.

### IS9: a record that is to count in a second store

*From items 13, 15 and 24 of part five (Astra, Neon).*

**Question.** The design has a record promoted from one store to another as the same record, so that one erasure covers every copy. Under IS3 a record counts in one store only. What replaces promotion?

**Example, run today.** A junior's proposal set `chosen=daily` and cleared `day`. The lead accepted it by restating the value alone, and the canon read `chosen daily; day warm`. Restating the clearing as well gave `chosen daily; day —`.

| | A record counts elsewhere, or a proposal is accepted, by | Cost |
| --- | --- | --- |
| A | Restating it: a new record with the same edit. | A new id, so an erasure of the original does not reach it. The example: a restatement by hand loses part of the edit, and two stacked proposals need their combined edit. |
| **B (recommended)** | An affirm stance by someone with standing there, after which the record counts as it is, under its own id. Built with the first kept store. Restating stays as a verb for the trial, and it copies the edit exactly. | A kind that admission reads before anything else. |
| C | Ordinary records are not bound to a store, so a verbatim copy counts wherever its writer is granted. | IS3's example comes back for ordinary records. |

**Changes:** B adds a kind that admission reads.

### IS10: who gets a lineage

*From ID1. Not challenged in the review.*

**Question.** What does an observer name?

**Example.** One person has a laptop from an employer and a machine at home, an agent harness on each, and writes in an employer's stores and in a public repository.

| | Lineages | Cost |
| --- | --- | --- |
| **A (recommended)** | One for each person in each realm (work, own). One for each harness of each person in each realm. A session and a worker are things a seat writes about, and get none. | Four lineages in the example. "The same person" across realms is a claim they may make and need not. |
| B | One for each person, everywhere. | Every store that person writes in is linked by an id that no erasure removes. |
| C | One for each session. | No continuity for an agent. |

**Changes:** the observer in every record written afterwards.

### IS11: the trial, on keys or on lineages

*From items 10 and 22 of part five. Argued both ways in the review, and left to Kyle.*

**Question.** The trial is on stores declared disposable. Either way it has a store anchor and grants as records. Is an observer in it a key, as today, or a lineage?

**Example.** One person in the trial writes from a laptop, a workbench and an agent.

| | Observers in the trial | Cost |
| --- | --- | --- |
| **A (recommended by the coordinator)** | Keys, as today. Standing is built first, on what exists. | The person in the example is three observers, with three grants. The plain views show keys. |
| B (Neon's leaning) | Lineages declared disposable. One person is one observer from the first day, and the model of who speaks runs from the first day. | IS2's reading for an unattributed record, and IS10, have to be ruled and built before the trial starts. |

**Changes:** only the order of the work.

## Being prepared

Nothing here needs a ruling yet. It is listed so that a reader knows what is coming.

**Numbers stored as text**, with the import ([W1](notes/2026-11-21-order-of-work.md#w1-an-adoption-step-before-standing-and-sharing)). [TK6](notes/2026-11-21-tick-record.md#tk6-what-a-spec-reads-of-a-tick) shows one use for it.

## Deferred

Not asked now. Each comes back when its step does.

- **A strict store's policy for an emit behind what the store holds:** warn, fail, or let it through as a conflict. Kyle raised it on 2026-11-20 and left it for step 3. margins-claude's answer is recorded in [the cut note](notes/2026-11-15-the-cut.md), section 8.
- **Refusing an undeclared payload key in a strict store.** Step 3. Kyle ruled on 2026-11-10 that refusal is progressive.
- **A top-N across groups.** 2026-11-11: "a later discussion".
- **What the old tool's `combine` and `discover` vertices did.** 2026-11-20: they wait until they are wanted.
- **The provenance export mapping,** W3C PROV or PREMIS.
- **The import writing a reference as `kind:key` (AD5), and a second cutover of the homelab.** 2026-11-24: deferred until a store is picked from by its reference fields; then built into a fresh group that is not cut over. Row 2 of AD5 comes back to Kyle before it is built ([the kinds and references note](notes/2026-11-24-kinds-and-references.md#st1-the-shorthand-is-strict-and-the-description-says-what-it-allows)).

## Ruled

One line for each ruling, newest first. The full text is in [CHANGELOG.md](CHANGELOG.md) under the date, or in the note named.

| Date | Ruling | Where |
| --- | --- | --- |
| 2026-11-25 | Two stops in the shorthand: a kind's `every_write` fields must be stated on every shorthand write, an explicit `--sets-nothing` excepted (version 2 of the description file), with a count of records in `describe`; and a stated `--sets` stops when it leaves out a key the command gives. Neither is standing: `emit -` and the store refuse nothing | Changelog |
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
