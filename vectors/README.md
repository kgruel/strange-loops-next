# Vectors

`fold/`, `lens/` and `record/` are written by `model/` (`lake exe gen
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
* LatestBy: `expect.heads` (newest first), `expect.named` (ascending), and
  per key the `winner` and the `others` (a fork when non-empty).
* Latest: the `winner` and the `others`.
* Sum: the number. Extrema: `min` and `max`, `null` when nothing was folded.

Each record carries `n`, the integer the numeric folds read. A record whose
payload the reader doesn't hold has `shown` (`withheld` or `erased`) instead
of `value` and `n`.

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

A refused vector has `expect.refused`: the reason, per `protocol/record.md`.
