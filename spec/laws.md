# Laws

Each law is a theorem in `model/Laws/`, checked by Lean on every build, and
illustrated by vectors in `vectors/`. Implementations are tested against the
vectors; the model is what the vectors come from.

## Folds (`model/Laws/Fold.lean`)

| Law | Theorem | Says | Vectors |
|---|---|---|---|
| incremental = batch | `Count.batch`, `Upsert.batch` | folding `xs` then `ys` is folding `xs ++ ys` | every fold vector |
| `count.perm` | `Count.perm` | arrival order doesn't change a count | `fold/count/01`, `02` |
| `count.repeats` | `Count.repeats` | a repeated delivery is counted again, so the store must hand each id over once | `fold/count/03` |
| `upsert.set` | `Upsert.set_decides` | the state depends only on the set of records folded | `fold/upsert/*` |
| `upsert.order` | `Upsert.perm` | winners follow content order: `prev`, then `occurred`, `emitted`, id | `fold/upsert/02`, `05`, `06` |
| `upsert.repeats` | `Upsert.repeats` | re-delivering records changes nothing | `fold/upsert/08` |
| `upsert.converge` | `Upsert.converge` | two places syncing in either direction reach the same state | `fold/upsert/09` |

| `latest.set`, `latest.repeats` | `Latest.perm`, `Latest.repeats` | Latest is Upsert with one key, so it inherits Upsert's laws | `fold/latest/*` |
| `sum.perm` | `Sum.perm` | arrival order doesn't change a sum | `fold/sum/01`, `02` |
| `sum.repeats` | `Sum.repeats` | a repeated delivery is added again, so the store must hand each id over once | `fold/sum/03` |
| `extrema.set` | `Max.set_decides`, `Min.set_decides` | Min and Max depend only on the set of records | `fold/extrema/*` |

Incremental = batch holds for every step fold by construction. The law with
teeth is `upsert.set`: it is what lets late arrivals, re-sent segments and
two-way syncs agree. It needs content addressing (`Addressed`): within a
store, an id names one record.

The numeric folds read an **exact** field: an integer. Over floating point,
addition isn't associative, so the order records arrive in would change a
sum, and `sum.perm` would be false. Decimals, if they come, must be exact
too.

## Two families, views and honest results (`model/Laws/Families.lean`)

Every fold depends only on the set of records it is handed. Folds come in
two families, each with one law: **accumulating** folds (Count, Sum, Min,
Max) have a step that commutes; folds **over heads** follow `prev`, keep
Upsert's state and work their answer out from it. A late record folds onto
the cached state in both, so there is no partial rewind.

| Law | Theorem | Says | Vectors |
|---|---|---|---|
| `input.distinct` | `Distinct.addressed`, `distinct_dedup`, `mem_dedup` | a fold is handed each id once; `dedup` is the realm's union | (the read path) |
| `input.union` | `dedup_union` | the union doesn't depend on which place is read first | (the read path) |
| `acc.set` | `Acc.set_decides` | any step that commutes gives the same state for the same set | every count, sum, extrema vector |
| `acc.late` | `Acc.late` | a late record folds onto the cached state | (follows from `acc.set`) |
| `heads.set` | `OverHeads.set_decides` | any answer worked out from the heads depends only on the set | `fold/heads/*` |
| `heads.late` | `OverHeads.late` | a late record folds onto the cached heads | (follows from `heads.set`) |
| `heads.why` | `Max.cannot_follow_prev` | a bounded state can't follow `prev`: Max can't be kept current from its own state | `fold/heads/01`, `02` |
| `view.no-resurrection` | `Upsert.view`, `Upsert.view_head_ids`, `Upsert.no_false_resurrection` | a view (withheld or erased payloads) folds to the same heads; a superseded record is never current | `fold/view/*` |
| `view.refines` | `Where.eval_view` | a view only loses information: a `where` answer stays or becomes unknown | `fold/select/01` |
| `result.unread` | `Upsert.maxHeads_view` | a result counts the covered records it couldn't read | `fold/view/04`, `fold/select/*` |
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

## Lens: keyed sections (`model/Laws/Lens.lean`)

| Law | Theorem | Says | Vectors |
|---|---|---|---|
| `lens.escaping` | `escaping` | any body survives rendering and parsing | `lens/section/02` |
| `lens.round-trip` | `parse_render` | `parse (render d) = some d` | `lens/section/01` |
| `lens.no-op` | `no_op` | the unedited render gives no outcomes | `lens/section/03` |
| `lens.put-get` | `put_get`, `put_get_text` | an edit that keeps the sections in order applies exactly, up to normal form | `lens/section/04` |
| `lens.nothing-dropped` | `nothing_dropped`, `absence_reported` | every section is unchanged, accepted or reported; every dropped one is reported | `lens/section/05`, `06` |
| `lens.absence-not-edit` | `absence_not_edit` | a dropped section changes nothing | `lens/section/06` |
| normal form | `normalize_idem` | normalizing twice is normalizing once | every lens vector |
| `lens.refuse` | (by construction) | malformed text is refused, not guessed at | `lens/section/07`–`09` |

## Record (`model/Laws/Record.lean`)

| Law | Theorem | Says | Vectors |
|---|---|---|---|
| `record.erasure` | `erase_keeps_id`, `erase_idem` | forgetting the opening never changes the id | `record/08`, every `erased_line` |
| `record.commit` | `opening_checks` | a record's own salt and payload open its commitment | every sealed record vector |
| `record.sets` | `id_sets`, `canonSet_eq` | reordering or repeating `about` or `prev` never changes the id | `record/02`, `03` |
| `record.member-order` | `canon_member_order` | reordering an object's members never changes its canonical bytes | `record/04` |
| UTF-16 order | `lexLt_trans`, `lexLt_total`, `utf16_inj` | member and set order is a strict total order on distinct strings | every record vector |
| `record.refuse` | (by construction) | a bad envelope is refused with a stated reason | `record/20`–`28` |

The laws hold for any hash function. The vectors use SHA-256 and Ed25519,
computed by reference code in `model/Gen/` that checks itself against
FIPS 180-4 and RFC 8032 values before it writes anything.

## Simplifications in step 0

* Ids are numbers standing for content hashes, written as fixed-width hex
  (`r:00000011`) so byte order and numeric order agree.
* `occurred` and `emitted` are plain numbers; EDTF and RFC 3339 arrive with
  layer 0's vectors.
* Text is a list of lines; splitting a file into lines is outside the model.
