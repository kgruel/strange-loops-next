# Laws

Each law is a theorem in `model/Laws/`, checked by Lean on every build, and
illustrated by vectors in `vectors/`. Implementations are tested against the
vectors; the model is what the vectors come from.

## Folds (`model/Laws/Fold.lean`)

| Law | Theorem | Says | Vectors |
|---|---|---|---|
| incremental = batch | `Count.batch`, `LatestBy.batch` | folding `xs` then `ys` is folding `xs ++ ys` | every fold vector |
| `count.perm` | `Count.perm` | arrival order doesn't change a count | `fold/count/01`, `02` |
| `count.repeats` | `Count.repeats` | a repeated delivery is counted again, so the store must hand each id over once | `fold/count/03` |
| `latest-by.set` | `LatestBy.set_decides` | the state depends only on the set of records folded | `fold/latest-by/*` |
| `latest-by.order` | `LatestBy.winner_newer` | the winner is a head, newer than every other head: winners follow content order, `prev` first, then the span, `emitted`, id | `fold/latest-by/02`, `05`, `06`, `12`, `13` |
| content order | `Newer.irrefl`, `Newer.trans`, `Newer.total`, `Newer.congr`, `id_order` (`Laws/Order.lean`) | records order by span (`occurred`'s, or `emitted` as an instant), then `emitted`, then id as digest bytes: a strict total order on distinct ids that reads only those three, never how a time is spelled | `fold/latest-by/05`, `06`, `12`, `13` |
| `latest-by.repeats` | `LatestBy.repeats` | re-delivering records changes nothing | `fold/latest-by/08` |
| `latest-by.converge` | `LatestBy.converge` | two places syncing in either direction reach the same state | `fold/latest-by/09` |

| `latest.set`, `latest.repeats` | `Latest.perm`, `Latest.repeats` | Latest is LatestBy over one thing, so it inherits LatestBy's laws | `fold/latest/*` |
| `sum.perm` | `Sum.perm` | arrival order doesn't change a sum | `fold/sum/01`, `02` |
| `sum.repeats` | `Sum.repeats` | a repeated delivery is added again, so the store must hand each id over once | `fold/sum/03` |
| `extrema.set` | `Max.set_decides`, `Min.set_decides` | Min and Max depend only on the set of records | `fold/extrema/*` |

Incremental = batch holds for every step fold by construction. The law with
teeth is `latest-by.set`: it is what lets late arrivals, re-sent segments and
two-way syncs agree. It needs content addressing (`Addressed`): within a
store, an id names one record.

The numeric folds read an **exact** field: an integer. Over floating point,
addition isn't associative, so the order records arrive in would change a
sum, and `sum.perm` would be false. Decimals, if they come, must be exact
too.

The model's integers are unbounded; an implementation's are not. A writer
refuses a payload number outside ±(2^53 − 1) (`number-out-of-range`, see
`protocol/record.md`), so implementations accumulate sums in 128 bits:
overflowing that takes more than 2^74 records. An
implementation that cannot hold a sum refuses with `sum-overflow`, never
wraps.

## Two families, views and honest results (`model/Laws/Families.lean`)

Every fold depends only on the set of records it is handed. Folds come in
two families, each with one law: **accumulating** folds (Count, Sum, Min,
Max) have a step that commutes; folds **over heads** follow `prev`, keep
LatestBy's state and work their answer out from it. A late record folds onto
the cached state in both, so there is no partial rewind.

| Law | Theorem | Says | Vectors |
|---|---|---|---|
| `input.distinct` | `Distinct.addressed`, `distinct_dedup`, `mem_dedup` | a fold is handed each id once; `dedup` is the realm's union | (the read path) |
| `input.union` | `dedup_union` | the union doesn't depend on which place is read first | (the read path) |
| `acc.set` | `Acc.set_decides` | any step that commutes gives the same state for the same set | every count, sum, extrema vector |
| `acc.late` | `Acc.late` | a late record folds onto the cached state | (follows from `acc.set`) |
| `heads.set` | `OverHeads.set_decides` | any answer worked out from the heads depends only on the set | `fold/heads/*` |
| `heads.late` | `OverHeads.late` | a late record folds onto the cached heads | (follows from `heads.set`) |
| `heads.why` | `Max.cannot_follow_prev` | Max can't follow `prev`: no step from Max's state and the next record keeps the current maximum | `fold/heads/01`, `02` |
| `view.no-resurrection` | `LatestBy.view`, `LatestBy.view_head_ids`, `LatestBy.no_false_resurrection` | a view (withheld or erased payloads) folds to the same heads; a superseded record is never current | `fold/view/*` |
| `view.refines` | `Where.eval_view` | a view only loses information: a `where` answer stays or becomes unknown | `fold/select/01` |
| `result.unread` | `LatestBy.maxHeads_view` | a result counts the covered records it couldn't read | `fold/view/04`, `fold/select/*` |
| `result.full` | `Acc.select_full` | with every payload here, nothing is unread and the result is the plain fold | `fold/select/03` |
| `select.set` | `Acc.select_set_decides` | what is read and what is unread depend only on the set | `fold/select/*` |

`view.no-resurrection` holds because `prev`, ids and times are on the
envelope, which every reader holds. A `where` test on the envelope always
answers; one on a missing payload answers unknown, and the result counts it.

**Proof policy.** The model and its vectors are required at every step.
`the set decides` (in each family) and `view.no-resurrection` define what the
system means and must be proved. Other laws may be listed here as
conjectures, checked by vectors and fuzzing until proved; `lake build
--wfail` keeps `sorry` out of the build.

## Things and what a reader holds (`model/Laws/Things.lean`)

`prev` is succession within a thing. Before any vertex asks its question, a
reader settles the forms its places hold into one record per id, refuses
records whose `prev` it can't accept, and works out each thing's state over
everything left:

* **Settle.** A payload any place holds is kept. A record in the set whose
  `erases` names an id erases every form of it, whatever that record's kind.
  A form that arrives erased with no such record behind it counts as
  withheld.
* **Admit.** A record whose `prev` names a held record it shares no thing
  with is refused (`prev-unrelated`), as is one the store's rule says may
  not replace it (`prev-not-permitted`). The rule reads only envelopes;
  step 2 allows everything, and step 3 supplies standing.
* **Per thing.** A record about several things lives in each. A record about
  nothing anchors a thing of its own, named by its id, so unrelated records
  about nothing never fork each other; a revision of one is about its id.
  Each thing's state is LatestBy over the records about it.

| Law | Theorem | Says | Vectors |
|---|---|---|---|
| `settle.set` | `settle_eq`, `settle_distinct` | what a reader keeps depends only on which forms its places hold, one record per id | `realm/01`–`03` |
| `settle.keeps` | `settle_keeps` | a payload any place holds is kept unless erased | `realm/01`, `02` |
| `settle.erased` | `settle_erased` | once a record naming it in `erases` is held, every form of its target is erased | `realm/03`, `09` |
| `admit.set` | `admit_same`, `refusalOf_none` | admission depends only on the set; a record is refused exactly when it isn't entitled to its `prev` | `realm/04` |
| `admit.no-cross` | `admit_no_cross` | an admitted record's `prev` names only held records it shares a thing with and may replace | `realm/04`, `08` |
| `thing.local` | `stateIn_local`, `perThing_set_decides` | a thing's state depends only on the records about it; the set decides per thing | `realm/04`–`08`, `fold/latest-by/*` |
| `view.no-resurrection` (things) | `admit_view`, `stateIn_view`, `stateIn_no_false_resurrection` | a view admits the same records and folds each thing to the full reader's state; a record superseded in a thing is never current there | `fold/view/*`, `spec/run/03` |

Writing checks `prev` too: you can only replace what you hold. `emit`
refuses a `prev` naming a record neither in the batch nor in the store
(`prev-unknown`) or one about other things (`prev-unrelated`).

## The spec (`model/Laws/Spec.lean`)

A spec parses into a closed type: `from` selects by envelope, and `fold`
names slots, each one fold with an optional `where`. `where` has six
operators (`is`, `not`, `present`, `absent`, `at-least`, `below`) and three
answers; a `where` map holds when every test does, and has at least one.
A test names an envelope field as `env.` and its name (`env.kind`,
`env.observer`, `env.about`, `env.prev`, `env.under`, `env.erases`,
`env.emitted`, `env.occurred`); any other name is a payload field, and
`env.` with a name the envelope doesn't have is refused. `env.` reads the
envelope as written: a record about nothing has an empty `about`, though it
anchors a thing named by its own id. `about`, `prev`, `under` and `erases`
are sets (`under` of at most one): `is` asks whether the set holds the
value, `not` whether it doesn't, and `present` whether it holds anything.

What a test compares against must be what layer 0 would accept in its
field, since nothing else can match; otherwise the spec is refused
(`where-invalid`). That is text that isn't empty for `kind`, a typed
reference (`prefix:value`) for `observer` and `about`, a record id for
`prev`, `under` and `erases`, and a time in `occurred`'s grammar for
`emitted` and `occurred`. A payload field takes text, a whole number or a
boolean, and `at-least` and `below` take a number there and a time on a
time. `present` and `absent` take `true`. `from` holds its kinds and its
`about` to the same rule. A time is tested by what it reads as: `is` asks
for the same span however either is spelled, `at-least` and `below`
compare starts, and a record without `occurred` passes neither.

Accumulating slots select, then fold; a numeric fold (sum, min, max) counts
a selected record as unread when its payload isn't held or lacks the field
as a number. Slots over heads (latest-by, and collect with
`"follow": "prev"`) read each thing's state, already settled over
everything the reader holds; `from` and the envelope tests then choose
heads, and payload tests filter them. Selecting first would bring back a
record whose successor is of another kind, no longer matches, or is
withheld. Latest-by always follows `prev`, and a spec must say so; collect
without it takes every selected record, superseded or not.

A spec is JSON with no key repeated in any object (layer 0's
`member-duplicate`), checked before anything else, so its parsed form
renders back to it. Then, in order: an object, known keys, `vertex`, `from`,
and each slot in the order written. A slot checks its keys, one fold type,
`follow`, `limit`, the fold's argument, then `where`, its fields in the order
written and each field's tests in turn. A refusal's path is the offending
member's: keys joined by `.`, with no index into arrays, and a test's
refusal names its field.

| Law | Theorem | Says | Vectors |
|---|---|---|---|
| `where.complements` | `Op.not_is`, `Op.absent_present`, `Op.atLeast_below`, `Op.atLeast_below_time` | `not` is the complement of `is`, `absent` of `present`; on a number, or a time, exactly one of `at-least` and `below` holds | `spec/run/06`, `07` |
| `where.typed` | `Op.ordered_like_only`, `parseOp_ok_iff`, `parseArg_ok_iff`, `parseBound_ok_iff` | `at-least` and `below` compare numbers with numbers and times with times, and hold for nothing else; a test is accepted exactly when its argument fits its field (`Op.Fits`), and renders back to what was written | `spec/run/07`, `spec/parse/22`–`37` |
| `where.fields` | `Cond.text_is`, `Cond.about_is`, `Cond.set_present`, `Cond.emitted_is`, `Cond.emitted_atLeast`, `Cond.emitted_below` | each envelope field reads as what it holds: `kind` and `observer` as their text, a set as its members, `emitted` as its own instant | `spec/run/08` |
| `where.time` | `Cond.occurred_is`, `Cond.occurred_atLeast`, `Cond.occurred_below`, `Cond.occurred_missing`, `Cond.time_meaning`, `Op.time_arg_meaning` | a test on a time reads its span, never its spelling, the record's or the argument's: `is` asks for the same span, `at-least` and `below` compare starts, and a record without `occurred` passes neither | `spec/run/06`, `08` |
| `where.total` | `Cond.eval_here`, `Cond.eval_envelope` | a test answers for every record whose payload is here, and an envelope test for every record, withheld or not | every `spec/run` vector |
| `where.set` | `Cond.all_perm` | the tests of a `where` map can come in any order | (by construction) |
| `view.refines` | `Cond.eval_view`, `Cond.all_view`, `Tri.and_refines` | under a view a test, and a `where` map, keeps its answer or becomes unknown | `spec/run/02` |
| `spec.select` | `Spec.select_view`, `Source.takes_view` | selection reads only envelopes, so a view selects the same records | `spec/run/*` |
| `spec.set` | `Slot.set_decides`, `Spec.set_decides` | every slot of every spec gives the same value for the same set | `spec/run/*` |
| `spec.after-supersession` | `latestOf_heads`, `collectOf_heads`, `Spec.view_state` | slots over heads return only heads: records no record about their thing has superseded, so selection never brings back what was superseded; under a view each thing's state is the full reader's with payloads hidden | `spec/run/03`, `04`, `08` |
| `spec.parse` | `Spec.ofJson_repeat`, `Json.repeatAt_none`; the rest checked by `gen` | a spec with a repeated key is refused at the repeat; the parsed form parses back to itself; refusals name a closed code and a path; a spec with no source is refused (`from-missing`), never run empty | `spec/parse/*` |

## A batch with labels (`model/Laws/Batch.lean`)

| Law | Theorem | Says | Vectors |
|---|---|---|---|
| `batch.meaning` | `Meaning.unique` | an acyclic batch has one meaning: each label's id is its record's id with real ids in place of labels, so draft order never matters | `batch/01`–`03` |
| `batch.refuse` | (by construction) | a label given twice, used but never given, or in a cycle is refused; so is a draft `write` refuses, a `prev` naming a record not held, or one about other things | `batch/10`–`17` |
| `batch.refuse-order` | `firstRefusal_set`, `writeProblem_codes` | the refusal reported depends only on which refusals there are: across the batch, labels, then writing, then `prev-unknown`, then `prev-unrelated` | `batch/15`, `16` |

`gen` checks every batch vector in every rotation of its drafts, and again
with each draft's `prev` reversed: an accepted batch must give the same
records, one per draft, each as `Meaning` says; a refused one must give the
same code. What isn't proved yet is that `resolveBatch` returns the meaning
`Meaning.unique` speaks of; `gen` checks it on the vectors.

## Lens: keyed sections (`model/Laws/Lens.lean`)

| Law | Theorem | Says | Vectors |
|---|---|---|---|
| `lens.escaping` | `escaping`, `unescape_keeps` | any body survives rendering and parsing; reading drops a backslash only where rendering would have written one | `lens/section/02`, `10` |
| `lens.round-trip` | `parse_render` | `parse (render d) = some d` | `lens/section/01` |
| `lens.no-op` | `no_op` | the unedited render gives no outcomes | `lens/section/03` |
| `lens.put-get` | `put_get`, `put_get_text` | an edit that keeps the sections in order applies exactly, up to normal form | `lens/section/04`, `10` |
| `lens.nothing-dropped` | `nothing_dropped`, `absence_reported` | every section is unchanged, accepted or reported; every dropped one is reported | `lens/section/05`, `06` |
| `lens.absence-not-edit` | `absence_not_edit` | a dropped section changes nothing | `lens/section/06` |
| normal form | `normalize_idem` | normalizing twice is normalizing once | every lens vector |
| `lens.refuse` | (by construction) | malformed text is refused, not guessed at | `lens/section/07`–`09` |

## Record (`model/Laws/Record.lean`)

| Law | Theorem | Says | Vectors |
|---|---|---|---|
| `record.erasure` | `erase_keeps_id`, `erase_idem` | forgetting the opening never changes the id | `record/08`, every `erased_line` |
| `record.commit` | `opening_checks` | a record's own salt and payload open its commitment | every stored record vector |
| `record.sets` | `id_sets`, `canonSet_eq` | reordering or repeating `about`, `prev` or `erases` never changes the id | `record/02`, `03`, `11` |
| `record.member-order` | `canon_member_order` | reordering an object's members never changes its canonical bytes | `record/04` |
| UTF-16 order | `lexLt_trans`, `lexLt_total`, `utf16_inj` | member and set order is a strict total order on distinct strings | every record vector |
| `record.refuse` | (by construction) | a bad envelope, a salt that isn't 16 bytes, a repeated member name or a payload number outside ±(2^53 − 1) is refused with a stated reason | `record/20`–`34` |
| `write.checked` | `writeProblem_none`, `Written` | `write` succeeds exactly when every check passes, and what it returns carries the proof; a batch writes through it | `record/*`, `batch/15`, `17` |
| `write.member-order` | `Written.commit_member_order` | a written payload's commitment doesn't depend on the order of its members: `write` established the distinct names `record.member-order` needs | `record/04` |

## Occurred (`model/Laws/Time.lean`)

| Law | Theorem | Says | Vectors |
|---|---|---|---|
| `occurred.span` | `occurred_point`, `occurred_open`, `occurred_interval`, `point_le` | every point the reader accepts becomes the span the grammar gives it, alone, with `..` or with a second point starting no earlier; a span's end is never before its start | `occurred/01`–`06` |
| `occurred.qualifier` | `occurred_qualified`, `occurred_qualified_start`, `occurred_qualified_end` | a qualifier never changes a span, on a date alone or on either end of an interval | `occurred/03`, `05` |
| `occurred.moment` | `instant_canonical`, `point_canonical`, `moment_lt_iff_scaled`, `stripZeros_replicate_zero` | every moment the reader makes is whole seconds then digits not ending in zero; comparing two as lists is comparing them as exact decimals; trailing zeros never change one | `occurred/04` |
| `occurred.order` | `Span.before_irrefl`, `Span.before_trans`, `Span.before_total` | spans order by start then end, an open end last: a strict total order, so every store orders them the same | `occurred/08` |
| `occurred.refuse` | (by construction) | a text the reader doesn't accept is refused with `occurred-not-span`, never guessed at | `occurred/07`, `record/34` |

Which texts are points is the definition itself (`dateDays?`, `instant?`),
pinned by the vectors rather than by a theorem about the grammar. The
acceptance and decimal-order proofs are adapted from Gemini's review.

The laws hold for any hash function. The vectors use SHA-256 and Ed25519,
computed by reference code in `model/Gen/` that checks itself against
FIPS 180-4 and RFC 8032 values before it writes anything.

## What these laws don't promise

Every law is about a given set of records. None says the set is complete,
current, trusted or well dated:

* **Absence isn't visible.** A reader that hasn't synced a successor sees
  the record it replaces as current, and can't count what it doesn't know
  exists. The laws promise convergence, not freshness.
* **Torn reads.** A reader must not see half a changeset: segments close
  per changeset with an atomic rename, and readers ignore a partial last
  line.
* **Time is the writer's word.** Content order breaks ties by claimed
  times, so a skewed clock picks a fork's winner. Every head of a fork is
  still shown.
* **Trust is step 3.** Nothing here checks signatures or standing; the laws
  hold for whatever a reader admits.
* **A checkpoint is a set.** "Since" means segments not yet seen, not an
  offset, or a late segment is missed.

## Simplifications in the model

* An id is its 32-byte digest read as a number, most significant byte
  first, and written as layer 0 writes one (`r:` and base32). The digests
  are made up: nothing yet connects these records to layer 0's real ones,
  so nothing yet proves a fold record holds the times its envelope was
  checked with.
* The payload is `value`, `n` and named `fields`.
* Fold records carry their times as text with what each reads as (`Stamp`,
  `Claim`); a record's other envelope fields are as written, not read from
  an envelope.
* Text is a list of lines; splitting a file into lines is outside the model.
