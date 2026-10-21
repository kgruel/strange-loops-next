# Vectors

`fold/`, `lens/` and `record/` are written by `model/` (`lake exe gen
../vectors`); never edit them by hand. CI regenerates them and fails on any
difference. `standard/` holds test data from the standards themselves; see
its README.

Every file has the same envelope:

```json
{
  "vector": "02-fork",
  "layer": "fold/upsert",
  "laws": ["upsert.set", "upsert.order"],
  "source": "model",
  "input": { },
  "expect": { }
}
```

## `fold/count`, `fold/upsert`

`input.orders` lists one or more arrival orders of the same records. An
implementation folds each order separately; every one must produce
`expect` (except `count.repeats`, which has one order).

* Count: `expect` is the number.
* Upsert: `expect.heads` (newest first), `expect.named` (ascending), and
  per key the `winner` and the `others` (a fork when non-empty).

## `lens/section`

`input.base` is the base document, `input.text` the edited text as lines.
`expect` is either `{"parsed": null, "refused": true}` or the parsed
document, its normal form, the outcomes (`accepted`, `unknown`, `absent`)
and the base with the outcomes applied.

## `record`

A sealed vector gives `input.envs` (envelope variants that must all give the
same id), `input.payloads` (payload variants that must all give the same
commitment), the `salt` and the signing key's `seed` (both base32).
`expect` pins every intermediate: the canonical envelope and payload, the
commitment, the id's preimage, the id, the signing key and signature, and
the stored line before and after erasure.

A refused vector has `expect.refused`: the reason, per `spec/record.md`.
