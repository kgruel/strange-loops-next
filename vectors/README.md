# Vectors

`fold/`, `lens/`, `record/`, `spec/`, `batch/` and `realm/` are written by `model/` (`lake exe gen
../vectors`); never edit them by hand. CI regenerates them and fails on any
difference. `standard/` holds test data from the standards themselves; see
its README.

Every file has the same envelope:

```json
{
  "vector": "02-fork",
  "layer": "fold/latest-by",
  "laws": ["latest-by.set", "latest-by.order"],
  "source": "model",
  "input": { },
  "expect": { }
}
```

## `fold/count`, `fold/latest-by`, `fold/latest`, `fold/sum`, `fold/extrema`

`input.orders` lists one or more arrival orders of the same records. An
implementation folds each order separately; every one must produce
`expect` (except `count.repeats`, which has one order).

* Count: `expect` is the number.
* LatestBy: per thing, its `heads` (newest first), its `winner` and its
  `others` (a fork when non-empty). A record about several things counts in
  each; a record about nothing anchors a thing of its own, named by its id.
* Latest: the `winner` and the `others`.
* Sum: the number. Extrema: `min` and `max`, `null` when nothing was folded.

Each record's `about` is a set of things. It carries `n`, the integer the
numeric folds read, and may carry `observer`, `erases` (the ids whose
payloads it erases, whatever its kind) and `fields`, further payload fields
by name. A record whose payload the reader doesn't hold has `shown`
(`withheld` or `erased`) instead of `value`, `n` and `fields`.

## `fold/heads`

Answers worked out from LatestBy's heads. `expect.max` is the largest `n`
among the readable heads (`value`, `null` if none) and how many heads were
unreadable (`unread`); `expect["limit-2"]` is the two newest heads.

## `fold/view`

Some records arrive without their payload. `expect.heads` lists the heads
newest first, each with what the reader holds (`shown`): the same heads a
reader holding everything gets. `expect.max` is as in `fold/heads`.

## `fold/select`

`input.where` is a test as a spec writes it. A test on the envelope always
answers; a test on a payload the reader doesn't hold answers unknown.
`expect.count` and `expect.sum` give the `value` over the selected, readable
records and how many covered records were `unread`: unknown to the test, or
selected but needed by the fold and not held. Count needs no payload.

## `spec/parse`

`input.spec` is a vertex's spec as JSON. `expect` is either `parsed`, the
spec in its parsed form (which parses back to itself), or `refused` with the
`path` of the offending key, per `protocol/laws.md`. Refusals are checked in
order: an object, known keys, `vertex`, `from` (present and non-empty), then
each slot.

## `spec/run`

`input.spec` and `input.orders`, as in the fold vectors. `expect` names each
slot of `fold` and what it holds: `value` and `unread` for count, sum, min
and max; for latest-by, each thing's current records (`things`), and for
collect the records newest first (`heads`), each with what the reader holds
of it, and how many heads a payload test couldn't answer (`unread`). Over
heads, supersession runs over everything held, per thing; `from` and the
envelope tests then choose heads, and payload tests filter them.

## `batch`

`input.drafts` is one changeset: each draft has an optional `label`
(`@name`), an envelope whose `about` and `prev` may use labels (`erases` may
not), a `salt` and a payload. `input.held` lists what the store already holds: each id and its
`about`. `expect.records` gives each record's `id` and canonical envelope
with labels replaced by ids, in the order given; or `expect.refused`:
`label-duplicate`, `label-unknown`, `label-cycle`, a code `write` gives
(the first, in `protocol/record.md`'s order, among every draft's), then
`prev-unknown` or `prev-unrelated`, each checked across the whole batch.
Every order of the drafts, and of each `prev` set, gives the same records or
the same refusal.

## `realm`

`input.forms` lists every form a reader's places hold, in one list. `expect`
gives what the reader keeps, one record per id with what it holds of each
(`settled`); the records refused for their `prev`, with the code
(`refused`); each thing's state over the rest (`things`, as in
`fold/latest-by`); and Sum over them (`sum`). Every rotation of the forms
must give the same.

## `lens/section`

`input.base` is the base document, `input.text` the edited text as lines.
`expect` is either `{"parsed": null, "refused": true}` or the parsed
document, its normal form, the outcomes (`accepted`, `unknown`, `absent`)
and the base with the outcomes applied.

## `record`

A stored-record vector gives `input.envs` (envelope variants that must all give the
same id), `input.payloads` (payload variants that must all give the same
commitment), the `salt` and the signing key's `seed` (both base32).
`expect` pins every intermediate: the canonical envelope and payload, the
commitment, the id's preimage, the id, the signing key and signature, and
the stored line before and after erasure.

A refused vector has `expect.refused`: writing its envelope with its `salt`
(base32) and its payload is refused for that reason, per
`protocol/record.md`. The payload is given as JSON text, `payload_text`, so
a repeated member name survives into the vector; parse it with a parser that
refuses repeats.
