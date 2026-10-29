# Vectors

`fold/`, `lens/`, `record/`, `spec/`, `batch/`, `realm/`, `occurred/` and `scenario/` are written by `model/` (`lake exe gen
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

Each record's `about` is a set of things. It carries `emitted` and may carry
`occurred`, both as text per `protocol/record.md`, and some spell one time two
ways. Content order is the record's span, by start, then end (a record
without `occurred` is an instant at its `emitted`), then the `emitted`
moment, then the id as digest bytes, the greatest newest. Ids are written
as layer 0 writes them, but their digests are made up. It carries `n`, the integer the
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

`input.where` is a test as a spec writes it, with envelope fields named
`env.<field>` (`gen` checks it gives what the model runs). A test on the
envelope always answers; a test on a payload the reader doesn't hold answers unknown.
`expect.count` and `expect.sum` give the `value` over the selected, readable
records and how many covered records were `unread`: unknown to the test, or
selected but needed by the fold and not readable. Count needs no payload;
sum, min and max read a record only when its payload is held and has the
field as a number.

## `spec/parse`

`input.spec` is a vertex's spec as JSON. A spec that repeats a key also
comes as `input.spec_text`, the spec as written: read that one, since a JSON
parser may keep only one of the repeats. `expect` is either `parsed`, the
spec in its parsed form (which parses back to itself), or `refused` with a
code and the `path` of what broke the rule. `protocol/spec.md` is the
grammar, the parsed form and the order the refusals are checked in; several
vectors break more than one rule, so that only that order gives the code
and path expected.

## `spec/run`

`input.spec` and `input.orders`, as in the fold vectors. `expect` names each
slot of `fold` and what it holds: `value` and `unread` for count, sum, min
and max; for latest-by, each thing's current records (`things`), and for
collect the records newest first (`heads`), each with what the reader holds
of it, and how many a payload test couldn't answer (`unread`). Latest-by,
and collect with `"follow": "prev"`, read heads: supersession runs over
everything held, per thing, then `from` and the envelope tests choose heads
and payload tests filter them. Collect without `follow` takes every selected
record, superseded or not.

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
Write `settled` and `refused` in ascending record-id order.
Compare ids by unsigned digest bytes, first byte first, not by id text.
This order does not change head content order.

## `scenario`

A sequence of steps over one spec. `input.records` are the records, in full;
each of `input.steps` names the forms a reader's places hold at that step
(`forms`, each an id and what is held of it) and the orders `gen` checked
(`orders`, every rotation). `expect.steps` gives, per step, what the reader
keeps (`settled`, as in `realm`), what is admitted (`admitted`),
`input.thing`'s heads newest first and its winner, and each slot of the spec
over the admitted records (`slots`, as in `spec/run`). Every rotation of a
step's forms must give the same.
Write `settled` and `admitted` in ascending record-id order, by unsigned digest bytes.
Each step holds one form per id. An order names each form exactly once.
The format does not represent repeated delivery or several simultaneous forms of one id.

`input.mayReplace` is optional. It is an array of two-item arrays: `[newRecordId, predecessorId]`.
Both ids must name records in `input.records`. Malformed pairs and unknown ids fail decoding.
An absent list allows every related replacement. An empty list denies every replacement of a held predecessor.
The rule tests ids only. It does not evaluate grants, signatures, owners, or payloads.
Admission still refuses an unrelated held predecessor, even when the pair appears in the list.
A predecessor not held in the step cannot be judged, so it does not cause refusal.
All held records participate in admission checks, including records that admission later refuses.
Settlement applies erasure before admission. A held eraser still erases its targets when admission later refuses it.
The runner passes the same rule to admission and each spec run.

Only inputs with `mayReplace` add `refused` to each output step.
This array contains `{id, code}` for each refused settled record, in ascending digest-id order.
The codes are `prev-unrelated` and `prev-not-permitted`. Unrelated predecessors take precedence.
Inputs without the list keep their existing output shape, including when a record is refused.

`input.lens` is optional. Record-only cases omit it and `expect.lens`.
`input.lens.base` holds base sections, and `input.lens.text` holds edited lines.
`expect.lens` holds the rendered base, outcomes, and applied sections.
The scenario adapter splits a head's value at each LF and keeps all parts, including empty parts.
It leaves CR unchanged; the lens itself does not split line elements.
The scenario checker keeps the last-two-winners relation.
The base is the selected thing's winner before the last step. The applied document is its winner after that step.
This check supports one keyed section. It does not support an arbitrary multi-section document.
See [`protocol/lens.md`](../protocol/lens.md).

`01-decision` is the walk the grammar page draws: two people write, fork,
merge and erase one decision, a reader holds less, and a lens edit comes
back as a record.

### Horizon cases

Each new case has a top-level `description` that names its partial claim.
The generator checks known heads, slot values, unread counts, or refusal codes in every rotation.
These assertions are separate from the model-derived `expect`.
The map in [`protocol/horizons.md`](../protocol/horizons.md) lists the wider workflows and their limits.

| Case | Checked partial claim and limit |
|---|---|
| `02-editable-lenses` | A keyed edit becomes the next head. No file write or stale-base check occurs. Unknown and absent sections remain separate `lens/section` tests. |
| `03-lsp-context` | Revised and forked ADRs share a supplied birth key. The case performs no Git discovery. |
| `04-web-annotation` | An annotation and a Discord thread share a supplied URL key. Admission refuses an unrelated replacement. The case does not normalize URLs. |
| `05-context-forms` | Held and withheld heads supersede erased history. The forms do not constitute a tick or bundle. |
| `06-selective-disclosure` | Two reader forms preserve heads. Hidden payload tests change known yes or no answers to unread. The case evaluates no disclosure policy. |
| `07-knowledge-build` | Equal inputs and an irrelevant addition preserve slots. A relevant addition changes slots. The case checks no hashes or cache. |
| `08-bitemporal-questions` | Both emitted and occurred tests select historical records without `follow`. A head-filter contrast shows why selection after supersession is not as-of reconstruction. |
| `09-fuzzy-dates` | Coarse and open spans determine content order by meaning. No adapter infers dates from text. |
| `10-cross-store-query` | A supplied union shares keys and preserves multi-thing heads. Source store labels neither fetch records nor partition them by origin. |
| `11-store-transfer` | An owner-claim revision retains history under one thing key. An owner claim does not transfer authority. |
| `12-file-sync` | Supplied sets combine in different orders with the same result. The format checks neither a filesystem nor repeated delivery. |
| `13-dispute-log` | Numeric claims retain corrections and disputed heads. The accumulating sum includes history; it is not a sum of current heads. |
| `14-stale-review` | Explicit time thresholds select heads before and after a review. The case checks no clock or scheduler. |
| `15-contradiction-queue` | An explicit id-only rule admits successors and refuses denied or unrelated replacements. Withholding preserves these decisions. No grant evaluator runs. |
| `16-agent-tools` | Successive supplied record sets change open and closed query results. The case checks no MCP transport. |
| `17-agent-lens` | A spec exposes forks while a supplied keyed document edits the winner. The case does not generate a full agent document. |
| `18-collectors` | Distinct supplied observers share one target and fold deterministically. The case checks no importer, framing, or retries. |
| `19-erasure` | A held eraser erases here, withheld, and falsely erased targets, even when admission refuses it. Later full targets cannot restore payloads. External deletion remains outside the check. |

## `occurred`

`input.occurred` lists `occurred` texts. `expect.spans` gives each one's
span, `start` and `end` as UTC instants (`end` is `null` when the span has
no end yet; years outside 0000 to 9999 are signed or five digits, as
`-0001-12-31T23:00:00Z` and `10000-01-01T00:00:00Z`), or
`refused`, in the same order. In `08-order`, `expect["oldest-first"]` is the
texts sorted by span, per `protocol/record.md`.

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
