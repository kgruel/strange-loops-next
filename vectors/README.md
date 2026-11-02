# Vectors

`model/` writes the protocol fixture families:
`fold/`, `lens/`, `record/`, `byte-text/`, `spec/`, `batch/`, `realm/`, `occurred/` and `scenario/`.
Run `lake exe gen ../vectors` from `model/`; never edit these fixtures by hand.
CI regenerates them and fails on any difference.
`standard/` holds external standards data; see its README.
JS and the Rust workspace check all fixture families and standards.

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

`input.orders` lists arrival orders of the same records.
Fold each order separately; each must produce `expect`.
`count.repeats` has one order.

* Count: `expect` is the number.
* LatestBy: each thing has `heads` newest first, a `winner` and `others`.
  Nonempty `others` shows a fork.
  A record about several things counts in each.
  A record about nothing anchors its own thing, named by its id.
* Latest: the `winner` and `others` of the combined, distinct-id per-thing heads.
* Sum: the number.
* Extrema: `min` and `max`, each `null` when nothing was folded.

Each record's `about` is a set of things.
It carries `emitted` and may carry `occurred`, as defined in `protocol/record.md`.
Content order compares span start, span end, `emitted`, then id digest bytes.
A record without `occurred` has an instant span at its `emitted`.
Newest first reverses this whole order.
Ids use layer 0's encoding, but these fixture digests are made up.
The `n` field supplies held safe-whole numbers to the raw sum and extrema fixtures.
Selected-reader semantics do not redefine these raw primitives.
Optional `observer`, `erases` and `fields` supply the observer, erased ids and further payload fields.
A hidden payload uses `shown` (`withheld` or `erased`) instead of `value`, `n` and `fields`.

## `fold/heads`

Answers come from LatestBy's heads.
`expect.max.value` is the largest readable safe whole `n`, or `null` if none exists.
`expect.max.unread` counts every head with an unreadable `n`, not just hidden payloads.
`expect["limit-2"]` lists the two newest heads.

## `fold/view`

Some records arrive without payloads.
`expect.heads` lists heads newest first, with each record's `shown` form.
With consistent forms, these are the same heads as the full reader's.
`expect.max` follows `fold/heads`.

## `fold/select`

`input.where` uses spec syntax and names envelope fields `env.<field>`.
`gen` checks that it gives the test the model runs.
An envelope test always answers.
A payload test answers unknown when the reader lacks the payload.
`expect.count` and `expect.sum` give `value` over selected, readable records and an `unread` count.
A covered record is unread if its test is unknown or its selected fold cannot read it.
Count needs no payload.
Sum, min and max require a held payload and a safe whole field value.
Full-result equality requires both answering tests and fold-readable covered records.

## `spec/parse`

`input.spec` is a vertex's JSON spec.
A repeated-key spec also supplies `input.spec_text`; read that text without discarding repeats.
`expect.parsed` gives the parsed form, which parses back to itself.
Alternatively, `expect.refused` gives the code and `path`.
`protocol/spec.md` defines the normative grammar, parsed form and refusal order.
Several vectors break multiple rules; refusal order decides the expected code and path.

## `spec/run`

`input.spec` and `input.orders` follow the fold fixtures.
`expect` names each `fold` slot.
Count, sum, min and max return `value` and `unread`.
Latest-by returns each thing's current records in `things`.
Collect returns records newest first in `heads`.
Each record carries its held form; `unread` counts records whose payload tests cannot answer.
Count each unread id once per slot, even when it heads several things.

Latest-by and collect with `"follow": "prev"` read heads.
Supersession runs per thing over the admitted set before selection.
`from` and envelope tests choose heads; payload tests then filter them.
Collect without `follow` takes every selected record, superseded or not.
Collect counts unread candidates before applying its limit.

## `batch`

`input.drafts` is one changeset.
Each draft has an optional `label` (`@name`), an envelope, a `salt` and a payload.
`about`, `prev` and `under` may use labels; `erases` may not.
`input.held` lists store-held ids and their `about` sets.
Writers require every `prev` target in the batch or held store state.
Readers can admit unknown targets because they cannot judge them.

`expect.records` gives ids and canonical envelopes in draft order, with labels replaced by ids.
Alternatively, `expect.refused` gives the first refusal.
Shape checks run first across every raw envelope, before any draft value: `envelope-field-unknown`.
Label checks follow: `label-duplicate`, `label-unknown`, then `label-cycle`.
Next come writer codes from `kind-empty`, in `protocol/record.md` order across every draft.
Finally, `prev-unknown` and `prev-unrelated` run across the whole batch.
Every draft order and `prev` order gives the same records or refusal.
Meaning uniqueness states at most one satisfying label assignment; it does not prove resolver correctness.

## `realm`

`input.forms` lists all forms held across places.
Consistent forms share one record per id.
A held eraser can suppress a target's payload; a bare erased copy cannot suppress a held payload.
`expect.settled` gives one record per id and its held form.
`expect.refused` gives admission refusals and codes.
`expect.things` gives per-thing states, as in `fold/latest-by`.
`expect.sum` gives Sum over admitted records.
Every rotation must give the same answer when forms are consistent.
Write `settled` and `refused` in ascending id digest-byte order.
Canonical id text has the same order.
This order does not change head content order.

## `scenario`

A scenario gives steps over one spec.
`input.records` supplies full records.
Each `input.steps` entry names place-held `forms`: an id and its held form.
Its `orders` lists the rotations checked by `gen`.
Each `expect.steps` entry gives `settled`, `admitted`, the requested thing's heads and winner, and spec `slots`.
These fields follow `realm` and `spec/run`.
Consistent forms give the same answer in every rotation.
Write `settled` and `admitted` in ascending id digest-byte order.

`input.lens.base` holds base sections; `input.lens.text` holds edited lines.
`expect.lens` holds rendered base, outcomes and applied sections.
The scenario adapter splits head values at LF, keeping all parts, including empty parts.
It leaves CR unchanged.
The lens itself does not split line elements.
See [`protocol/lens.md`](../protocol/lens.md).

`01-decision` supplies the grammar page's walk.
Two people write, fork, merge and erase a decision.
A reader holds less; a lens edit returns as a record.

## `occurred`

`input.occurred` lists time texts.
`expect.spans` gives each span's UTC `start` and `end`, or `refused`, in input order.
An open span has `end: null`.
Instants use canonical UTC text as specified in `protocol/record.md`.
A calendar span ending after year 9999 can have a five-digit end year.
In `08-order`, `expect["oldest-first"]` lists texts ordered by span, per `protocol/record.md`.

## `lens/section`

`input.base` supplies base sections; `input.text` supplies edited lines.
`expect` is either `{"parsed": null, "refused": true}` or the parsed document and its normal form.
It also gives `accepted`, `unknown` and `absent` outcomes, plus the applied base.
Render roundtrip requires nonempty, distinct ids.
Put-get additionally requires distinct base ids and the exact same ordered id list in the edit.

## `record`

`input.envs` gives envelope variants with the same id.
`input.payloads` gives payload variants with the same commitment.
`salt` and the signing key's `seed` use base32hex.
`expect` pins canonical envelope and payload, commitment, id preimage, id, signing key, signature and both stored lines.
The two stored lines show forms before and after erasure.
The signed message uses the exact prefix `loops/record/v1:`.

A refused vector's `expect.refused` names the shape or writer refusal from `protocol/record.md`.
`payload_text` preserves repeated member names in JSON text.
Use a parser that detects repeated names.
Writers cap every number's magnitude at 2^53 − 1, whole or not.
Numeric readers separately require safe whole values.
JS and Rust sums use unbounded integers; future bounded ports must refuse overflow.
