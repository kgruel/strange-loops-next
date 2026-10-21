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

Incremental = batch holds for every step fold by construction. The law with
teeth is `upsert.set`: it is what lets late arrivals, re-sent segments and
two-way syncs agree. It needs content addressing (`Addressed`): within a
store, an id names one record.

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

## Simplifications in step 0

* Ids are numbers standing for content hashes, written as fixed-width hex
  (`r:00000011`) so byte order and numeric order agree.
* `occurred` and `emitted` are plain numbers; EDTF and RFC 3339 arrive with
  layer 0's vectors.
* Text is a list of lines; splitting a file into lines is outside the model.
