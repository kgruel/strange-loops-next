# Vectors

Written by `model/` (`lake exe gen ../vectors`); never edit by hand. CI
regenerates them and fails on any difference.

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
