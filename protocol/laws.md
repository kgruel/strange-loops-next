# Laws

The tables name theorems in `model/Laws/` or mark guarantees supplied by construction.
Lean checks the listed proofs under their premises.
The model computes protocol-vector answers; external standards supply separate fixtures.
JS and Rust check all fixture families, including those standards.

## Id digests (`model/Laws/Id.lean`, `model/Laws/IdText.lean`, `model/Laws/IdSource.lean`)

| Law | Theorem | Says | Vectors |
|---|---|---|---|
| `id.digest` | `idDigest_length`, `idDigest_byte`, `idDigest_roundtrip`, `idDigest_bytes_roundtrip`, `idText_injective`, `bytes_bounded`, `bytes_idDigest`, `idOf_eq_idText`, `Gen.sha256_length`, `Gen.sha256_bounded`, `Gen.sha256_idOf_eq_idText`, `Gen.Read.recordId_bounded` | An id's digest has exactly 32 bytes. Reading these bytes gives the same id. Two ids have the same text only when they are equal. Reading any 32 bytes gives an id below 2^256. Writing that id back gives the same 32 bytes. | (proved) |

## Canonical byte and instant text (`model/Laws/Base32.lean`, `model/Laws/IdText.lean`, `model/Laws/Instant.lean`)

| Law | Theorem | Says | Vectors |
|---|---|---|---|
| `base32.canonical` | `base32_injective`, `unbase32_base32`, `unbase32_eq_some_iff`, `byteText_eq_true_iff` | The decoder accepts exactly the encoder image and recovers its bytes. The fixed-width reader also requires the stated byte count. No hash premise is needed. | `byte-text/*` |
| `id.text-order` | `idText_order` | Actual String lexical order on id text equals numeric order. Both inputs have type RecordId, which bounds them below 2^256. | `byte-text/id-32`, runtime id-order pins |
| `instant.unique` | `instant_moment_unique` | If the actual instant reader accepts both Strings with the same moment, those Strings are equal. | `occurred/04`, `record/r4-emitted-0`, `record/r4-emitted-2`, `record/r4-emitted-5`, `record/r4-offset-0` |
| `instant.round-trip` | `instantParts_render`, `instant_parse_render` | If the actual instant parser returns numeric fields, rendering those fields recovers the original text. | `occurred/04`, runtime parse/render pins |

The model keeps every record id and reference below 2^256.
The id reader returns only ids below 2^256.

The model's SHA-256 returns 32 bytes.
With the model's SHA-256, an id written from bytes equals the id written from the number.

## Folds (`model/Laws/Fold.lean`)

| Law | Theorem | Says | Vectors |
|---|---|---|---|
| incremental = batch | `Count.batch`, `LatestBy.batch` | folding `xs` then `ys` is folding `xs ++ ys` | every fold vector |
| `count.perm` | `Count.perm` | arrival order doesn't change a count | `fold/count/01`, `02` |
| `count.repeats` | `Count.repeats` | a repeated delivery is counted again, which is why the read path hands each id over once | `fold/count/03` |
| `latest-by.set` | `LatestBy.set_decides` | the state depends only on the set of records folded | `fold/latest-by/*` |
| `latest-by.order` | `LatestBy.winner_newer` | The winner is a head, newer than every other head. Head membership follows `prev`; content order compares span, `emitted`, then id. | `fold/latest-by/02`, `05`, `06`, `12`, `13` |
| content order | `Newer.irrefl`, `Newer.trans`, `Newer.total`, `Newer.congr`, `id_order` (`Laws/Order.lean`) | Records order by span, then `emitted`, then id digest bytes. Without `occurred`, the span is an instant at `emitted`. Distinct ids have strict total order. Time spelling does not affect this order. | `fold/latest-by/05`, `06`, `12`, `13` |
| `latest-by.repeats` | `LatestBy.repeats` | re-delivering records changes nothing | `fold/latest-by/08` |
| `latest-by.converge` | `LatestBy.converge` | two places syncing in either direction reach the same state | `fold/latest-by/09` |

| `latest.set`, `latest.repeats` | `Latest.set_decides`, `Latest.perm`, `Latest.repeats` | the input set decides Latest's whole-reader heads and winner | `fold/latest/*` |
| `heads.whole-view` | `mem_wholeHeads`, `wholeHeads_sorted`, `wholeHeads_distinct` | every head belongs to some thing; heads occur once per id in content order | `fold/heads/gap15-partial-and-anchor`, `fold/view/gap15-partial-and-anchor`, `fold/latest/gap16-newest-union-head` |
| `latest.newest` | `Latest.winner_newest`, `Latest.others_ordered` | Latest chooses the newest whole-reader head; its other heads stay in content order | `fold/latest/01-chain`, `fold/latest/gap16-newest-union-head` |
| `latest.one-thing` | `Latest.oneThing` | Latest equals global LatestBy when every record names exactly the same single thing | `fold/latest/01-chain` |
| `numeric.safe-whole` | `Record.num_safe`, `Record.num_number` | numeric slots read only safe-whole values; nonwhole values count as unread | `spec/run/gap14-field-types` |
| `sum.perm` | `Sum.perm` | arrival order doesn't change a sum | `fold/sum/01`, `02` |
| `sum.repeats` | `Sum.repeats` | a repeated delivery is added again, which is why the read path hands each id over once | `fold/sum/03` |
| `extrema.set` | `Max.set_decides`, `Min.set_decides` | Min and Max depend only on the set of records | `fold/extrema/*` |

Incremental = batch holds for every step fold by construction. The law with
teeth is `latest-by.set`: it is what lets late arrivals, re-sent segments and
two-way syncs agree. It needs content addressing (`Addressed`): within a
store, an id names one record.

Numeric slots read safe-whole binary64 values within ±(2^53 − 1).
Integral decimals and exponents, including `1.0` and `1e2`, normalize to integers.
Payloads retain nonwhole binary64 numbers, but numeric slots count them as unread.
Addition uses exact integers because binary64 addition is not associative.

The model, JS and Rust accumulate sums with unbounded integers (BigInt).
Writers accept finite binary64 values within ±(2^53 − 1), whole or not; numeric readers additionally require whole values.
A future bounded implementation must refuse overflow with `sum-overflow`; it must never wrap.

## Two families, views and honest results (`model/Laws/Families.lean`)

With distinct input ids, every fold depends only on the set of records it receives. **Accumulating** folds (Count, Sum, Min, Max) have a step that commutes.
Folds **over heads** follow `prev`, keep LatestBy's state and compute their answer from it. A new record folds onto a commuting accumulator's cached state.
Over-head proofs use cached LatestBy state, not merely a cached answer.

| Law | Theorem | Says | Vectors |
|---|---|---|---|
| `input.distinct` | `Distinct.addressed`, `distinct_dedup`, `mem_dedup` | The read path hands each id over once. `dedup` leaves each id once. Where an id names one record, it keeps the same records. | (the read path) |
| `input.union` | `dedup_union` | the union doesn't depend on which place is read first | (the read path) |
| `acc.set` | `Acc.set_decides` | any step that commutes gives the same state for the same set | every count, sum, extrema vector |
| `acc.late` | `Acc.late` | a late record folds onto the cached state | (follows from `acc.set`) |
| `heads.set` | `OverHeads.set_decides` | any answer worked out from the heads depends only on the set | `fold/heads/*` |
| `heads.late` | `OverHeads.late` | a late record folds onto the cached heads | (follows from `heads.set`) |
| `heads.why` | `Max.cannot_follow_prev` | Max's scalar state cannot maintain the maximum over changing heads | `fold/heads/01`, `02` |
| `view.no-resurrection` | `LatestBy.view`, `LatestBy.view_head_ids`, `LatestBy.no_false_resurrection` | A view keeps each thing's head ids. A record superseded within a thing is never current there. | `fold/view/*` |
| `view.refines` | `Where.eval_view` | a view only loses information: a `where` answer stays or becomes unknown | `fold/select/01` |
| `result.unread` | `LatestBy.maxHeads_view`, `Acc.select_unread`, `Count.select_unread`, `latestOf_unread`, `collectOf_unread` | A fold does not guess. It counts the records whose test is unknown and the selected records it cannot read. | `fold/view/04`, `fold/select/*`, `spec/run/02`, `spec/run/03` |
| `result.full` | `Acc.select_full` | when every test answers and every record is readable to the fold, nothing is unread and the result is the plain fold | `fold/select/03` |
| `select.set` | `Acc.select_set_decides` | what is read and what is unread depend only on the set | `fold/select/*` |

Count can read every selected record.
Latest-by counts each head once when its payload tests are unknown, after the source and envelope tests select it.
Collect counts each unknown record once, before its limit.
It counts heads when it follows replacements, and all records otherwise.
Max over heads counts each head whose `n` field lacks a readable safe whole value.
Numeric folds count hidden, missing, nonnumeric, nonwhole and unsafe whole values as unread.

`view.no-resurrection` holds because `prev`, ids and times are on the
envelope, which every reader holds. A `where` test on the envelope always
answers; one on a missing payload answers unknown, and the result counts it.

**Proof policy.** The model and its vectors are required at every step.
`the set decides` (in each family) and `view.no-resurrection` define what the
system means and must be proved. Other laws may be listed here as
conjectures, checked by vectors and fuzzing until proved; `lake build
--wfail` keeps `sorry` out of the build.

## Things and what a reader holds (`model/Laws/Things.lean`)

`prev` is succession within a thing. Before evaluating a vertex, the reader settles place-held forms to one record per id.
It applies admission to `prev`, then computes per-thing states over admitted records:

* **Settle.** Settling keeps a held payload unless a held eraser names its id.
  The read-order law requires consistent forms. A record in the set whose
  `erases` names an id erases every form of it, whatever that record's kind.
  A form that arrives erased with no such record behind it counts as
  withheld.
* **Admit.** The reader refuses a record when a held `prev` target shares no thing with it (`prev-unrelated`).
  It also refuses the record when the store forbids replacement of a held target (`prev-not-permitted`).
  Unknown targets do not cause refusal. The rule reads only envelopes;
  step 2 allows everything, and step 3 supplies standing.
* **Per thing.** A record about several things lives in each. A record about nothing anchors its own thing, named by its id.
  Unrelated records about nothing never fork each other.
  A revision names the original id in `about`.
  Each thing's state is LatestBy over the records about it.

| Law | Theorem | Says | Vectors |
|---|---|---|---|
| `settle.set` | `settle_eq`, `settle_distinct` | what a reader keeps depends only on which forms its places hold, one record per id | `realm/01`–`03` |
| `settle.keeps` | `settle_keeps` | a payload any place holds is kept unless erased | `realm/01`, `02` |
| `settle.erased` | `settle_erased` | once a record naming it in `erases` is held, every form of its target is erased | `realm/03`, `09` |
| `admit.set` | `admit_same`, `refusalOf_none` | admission depends only on the set; a record is refused exactly when it isn't entitled to its `prev` | `realm/04` |
| `admit.no-cross` | `admit_no_cross` | Each held `prev` target shares a thing with its admitted successor and permits replacement. Readers admit unknown targets because they cannot judge them. | `realm/04`, `08` |
| `thing.local` | `stateIn_local`, `perThing_set_decides` | For a fixed admitted set, a thing's state depends only on its records. The set decides per thing. | `realm/04`–`08`, `fold/latest-by/*` |
| `view.no-resurrection` (things) | `admit_view`, `stateIn_view`, `stateIn_no_false_resurrection` | With an envelope-only admission rule, a view admits the same records and keeps each thing's heads in view form. A superseded record never becomes current within that thing. | `fold/view/*`, `spec/run/03` |

Writing checks `prev` too: you can only replace what you hold. `emit` refuses an unheld `prev` target outside the batch (`prev-unknown`).
It also refuses a target with no shared thing (`prev-unrelated`).

## The spec (`model/Laws/Spec.lean`, `model/Laws/Parse.lean`)

[`spec.md`](spec.md) is the grammar: the keys, what each test may compare
against, and the refusals in the order they are checked. These are its laws.

`where` has six operators: `is`, `not`, `present`, `absent`, `at-least`, `below`.
It has three answers.
A map holds when every test holds. An `env.<field>` test reads the written envelope and always answers.
A payload-field test answers unknown when the reader lacks the payload.
A record about nothing has an empty `env.about`, though it anchors a thing
named by its own id. `about`, `prev`, `under` and `erases` are sets; `under` has at most one member.
`is` tests membership, `not` tests nonmembership, and `present` tests whether the set holds anything. Time tests read `emitted` and `occurred` by meaning.
`is` asks for equal spans, regardless of spelling.
`at-least` and `below` compare starts; absent `occurred` passes neither.

`from` chooses by thing: `"about": "t"` takes records about `t`.
A record about nothing belongs to its own id's thing.
Thus `"about": "r:X"` takes X and its revisions.

Accumulating slots select, then fold.
A numeric fold (sum, min, max) counts a selected record as unread when its payload is not held.
It also counts the record as unread when its field is not a safe whole number.
Text is not a number.
Slots over heads read each thing's admitted state before selection.
These slots are latest-by and collect with `"follow": "prev"`.
`from` and envelope tests choose heads; payload tests then filter them. Selecting first
would bring back a record whose successor is of another kind, no longer
matches, or is withheld. Collect without `follow` takes every selected
record, superseded or not.

The parser gives exactly the specs that fit (`Spec.Fits`).
A fitting spec has a vertex, at least one source and distinct slot names.
Names and kinds are nonempty.
Each `where` names fields once, supplies tests, and never repeats an operator.
Each argument fits layer 0's field rules. Every spec that fits has a
written form that parses back to it, so an accepted spec's parsed form
parses back to itself. A spec with a repeated key is refused, at the path
the search in `Json.repeatAt` gives. These say what the parser gives, not
which JSON it accepts: a stricter parser would satisfy them too. Which JSON
is accepted, the order of the checks, and each refusal's code and path are
pinned by the vectors rather than proved.

| Law | Theorem | Says | Vectors |
|---|---|---|---|
| `where.complements` | `Op.not_is`, `Op.absent_present`, `Op.atLeast_below`, `Op.atLeast_below_time` | `not` complements `is`; `absent` complements `present`. With a held safe whole value and a numeric bound, exactly one of `at-least` and `below` holds. Present times obey the corresponding time law. | `spec/run/06`, `07` |
| `where.typed` | `Op.ordered_like_only`, `parseOp_ok_iff`, `parseArg_ok_iff`, `parseBound_ok_iff` | `at-least` and `below` compare like numeric or time values only. A test parses exactly when its argument fits its field (`Op.Fits`). Rendering preserves the written test. | `spec/run/07`, `spec/parse/22`–`37` |
| `where.fields` | `Cond.text_is`, `Cond.about_is`, `Cond.id_is`, `Cond.set_present`, `Cond.emitted_is`, `Cond.emitted_atLeast`, `Cond.emitted_below` | `kind` and `observer` read as text. `about`, `prev`, `under` and `erases` test members (`is`) and nonemptiness (`present`). `emitted` reads as its own instant. `occurred` is `where.time`'s | `spec/run/08`, `09` |
| `where.time` | `Cond.occurred_is`, `Cond.occurred_atLeast`, `Cond.occurred_below`, `Cond.occurred_missing`, `Cond.time_meaning`, `Op.time_arg_meaning` | Envelope-time tests read meaning, not record or argument spelling. `is` compares spans. `at-least` and `below` compare starts. A record without `occurred` passes neither bound. | `spec/run/06`, `08` |
| `where.total` | `Cond.eval_here`, `Cond.eval_envelope` | a test answers for every record whose payload is here, and an envelope test for every record, withheld or not | every `spec/run` vector |
| `where.set` | `Cond.all_perm` | the tests of a `where` map can come in any order | (by construction) |
| `view.refines` (where) | `Cond.eval_view`, `Cond.all_view`, `Tri.and_refines` | under a view a test, and a `where` map, keeps its answer or becomes unknown | `spec/run/02` |
| `spec.select` | `Spec.select_view`, `Source.takes_view` | selection reads only envelopes, so a view selects the same records | `spec/run/*` |
| `spec.from-thing` | `Source.takes_about` | `from`'s `about` takes exactly the records about the thing, and a record about nothing is about its own id and nothing else | `spec/run/09` |
| `spec.set` | `Slot.set_decides`, `Spec.set_decides` | Every slot of every spec gives the same value for the same distinct-id set, with each id consumed once. | `spec/run/*` |
| `spec.after-supersession` | `latestOf_heads`, `collectOf_heads`, `Spec.view_state` | A slot over heads returns only heads retained in at least one thing, selected by its source, and passing every test. If the store's replacement rule reads only envelopes, a view keeps each thing's heads. Each head then shows only what the view shows. | `spec/run/03`, `04`, `08` |
| `spec.parse` | `Spec.ofJson_fits`, `Spec.ofJson_toJson`, `Spec.reparse`, `Spec.parsed_iff`, `Spec.ofJson_repeat`, `Json.repeatAt_none` | The parser gives exactly fitting specs, each with a source. Parsed forms parse back to themselves. Repeated keys are refused at `Json.repeatAt`'s path. Specs without repeats never receive that refusal. | `spec/parse/*` |

## A batch with labels (`model/Laws/Batch.lean`)

| Law | Theorem | Says | Vectors |
|---|---|---|---|
| `batch.meaning` | `Meaning.unique` | An acyclic batch has at most one meaning. This does not prove resolver correctness. | `batch/01`–`03` |
| `batch.refuse` | (by construction) | Duplicate, unknown and cyclic labels are refused. So are drafts refused by `write`, unheld `prev` targets and targets with no shared thing. | `batch/10`–`17` |
| `batch.refuse-order` | `envelopeKeysProblem_set`, `firstRefusal_set`, `writeProblem_codes` | Across the batch: shape, then labels, then writing, then `prev-unknown`, then `prev-unrelated`. Raw shape checks every envelope's keys before any draft value, label or salt is decoded. Shape depends only on keys, and writing's priority only on the refusal set; stage order is by construction, pinned by raw-input rotations. | `batch/15`, `16`, `18`–`22` |

`gen` checks batch vectors across draft rotations and reversed `prev` sets.
Accepted variants must give the same records, one per draft, satisfying `Meaning`.
Refused variants must give the same code. What isn't proved yet is that `resolveBatch` returns the meaning
`Meaning.unique` speaks of; `gen` checks it on the vectors.

## Lens: keyed sections (`model/Laws/Lens.lean`)

| Law | Theorem | Says | Vectors |
|---|---|---|---|
| `lens.escaping` | `escaping`, `unescape_keeps` | any body survives when its section id is nonempty; reading removes only an escape backslash | `lens/section/02`, `10` |
| `lens.round-trip` | `parse_render`, `parse_render_iff` | rendering roundtrips exactly when section ids are nonempty and distinct | `lens/section/01` |
| `lens.no-op` | `no_op` | the unedited render gives no outcomes when section ids are nonempty and distinct | `lens/section/03` |
| `lens.put-get` | `put_get`, `put_get_text` | With distinct base ids, an edit keeping exactly the base's sections in the same order applies exactly, up to normal form. | `lens/section/04`, `10` |
| `lens.nothing-dropped` | `nothing_dropped`, `absence_reported` | every section is unchanged, accepted or reported; every dropped one is reported | `lens/section/05`, `06` |
| `lens.absence-not-edit` | `absence_not_edit` | a dropped section leaves that section in the state as it was; the other sections' accepted edits still apply | `lens/section/06` |
| normal form | `normalize_idem` | normalizing twice is normalizing once | every lens vector |
| `lens.refuse` | `parse_valid` | malformed text, empty section ids and repeated section ids are refused | `lens/section/07`–`09` |

## Record (`model/Laws/Record.lean`)

| Law | Theorem | Says | Vectors |
|---|---|---|---|
| `record.erasure` | `erase_keeps_id`, `erase_idem` | forgetting the opening never changes the id | `record/08`, every `erased_line` |
| `record.commit` | `opening_checks` | a record's own salt and payload open its commitment | every stored record vector |
| `record.sets` | `id_sets`, `canonSet_eq` | reordering or repeating `about`, `prev` or `erases` never changes the id | `record/02`, `03`, `11` |
| `record.member-order` | `canon_member_order` | reordering an object's members never changes its canonical bytes | `record/04` |
| UTF-16 order | `lexLt_trans`, `lexLt_total`, `utf16_inj` | member and set order is a strict total order on distinct strings | every record vector |
| `record.refuse` | (by construction) | Bad envelopes, salt lengths, repeated members, nonfinite and out-of-range numbers receive named refusals. Raw unknown envelope keys refuse before `kind-empty`. | `record/20`–`34`, `record/r6-unknown-field`, `record/r6-unknown-before-kind` |
| `write.checked` | `writeProblem_none`, `Written` | `write` succeeds exactly when every check passes, and what it returns carries the proof; a batch writes through it | `record/*`, `batch/15`, `17` |
| `write.member-order` | `Written.commit_member_order` | a written payload's commitment doesn't depend on the order of its members: `write` established the distinct names `record.member-order` needs | `record/04` |

## Occurred (`model/Laws/Time.lean`)

| Law | Theorem | Says | Vectors |
|---|---|---|---|
| `occurred.span` | `occurred_point`, `occurred_open`, `occurred_interval`, `point_le` | Each accepted point gives its grammar-defined span, alone, with `..`, or paired with a point starting no earlier. A span never ends before its start. | `occurred/01`–`06` |
| `occurred.qualifier` | `occurred_qualified`, `occurred_qualified_start`, `occurred_qualified_end` | a qualifier never changes a span, on a date alone or on either end of an interval | `occurred/03`, `05` |
| `occurred.moment` | `instant_canonical`, `point_canonical`, `moment_lt_iff_scaled` | A parsed moment has whole seconds and digits without trailing zeros. For stripped fractions and a scale covering both, list comparison equals exact decimal comparison. | `occurred/04` |
| `occurred.order` | `Span.before_irrefl`, `Span.before_trans`, `Span.before_total` | Spans have strict total order by start, then end, with an open end last. Stores using that order agree. | `occurred/08` |
| `occurred.refuse` | (by construction) | a text the reader doesn't accept is refused with `occurred-not-span`, never guessed at | `occurred/07`, `record/34` |

Which texts are points is the definition itself (`dateDays?`, `instant?`),
pinned by the vectors rather than by a theorem about the grammar. The
acceptance and decimal-order proofs are adapted from Gemini's review.

The laws hold for any hash function. The vectors use SHA-256 and Ed25519 reference code in `model/Gen/`.
Before writing, that code checks FIPS 180-4 and RFC 8032 values.

## What these laws don't promise

The laws about folds, views and specs are each about a given set of
records. None says the set is complete, current, trusted or well dated:

* **Absence isn't visible.** A reader that lacks a successor can see its predecessor as current.
  It cannot count records it does not know exist. The laws promise convergence, not freshness.
* **Torn reads.** A reader must not see half a changeset.
  The planned place closes each changeset through atomic rename.
  Readers ignore a partial last line.
* **Time is the writer's word.** Content order breaks ties by claimed
  times, so a skewed clock picks a fork's winner. Every head of a fork is
  still shown.
* **Trust is step 3.** Fold laws do not check signatures or standing.
  They require an admitted record set in which each id names one record.
* **A checkpoint is a set.** "Since" means segments not yet seen, not an
  offset, or a late segment is missed.

## Simplifications in the model

* The model stores each id as a natural number.
  The digest laws require each id to be less than 2^256.
  This bound applies to a record's id and each id that it references.
  The protocol supplies the bound through its 32-byte SHA-256 digests.
  The model does not derive fold records from stored records.
  No theorem connects a fold record's times to the checks on a stored record's envelope.
* The payload is `value`, `n` and named `fields`.
* Fold records carry time text and its parsed values (`Stamp`, `Claim`).
  Their other envelope fields are direct inputs, not fields parsed from an envelope.
* Text is a list of lines; splitting a file into lines is outside the model.
