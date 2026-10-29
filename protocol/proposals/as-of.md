# Proposal: as-of folds

Status: proposal. The human decides whether to adopt this design.
This document does not change the adopted spec grammar or its folds.
The spec still carries `ticks` and `window` without reading them.

## Question

An as-of fold asks about records whose stated times meet two cut-offs.
The belief cut-off reads `emitted`.
The occurrence cut-off reads the start of the record's effective span.
Each cut-off is an optional instant.
Both comparisons include equality.
An absent cut-off accepts every time on that axis.

Use the occurrence span when the record has `occurred`.
Otherwise, use the emitted instant.
A coarse span enters at its start.
An open span also enters at its start.
This test does not claim that the event ends before the cut-off.
Qualifiers and equivalent time spellings keep their existing span meaning.

`emitted` is the observer's claim, not a receipt from a store.
The fold does not prove what a person believes or what a store holds at that time.
A later arrival with an earlier emitted time can change the answer.

## Reader steps

1. Settle all supplied forms with the existing settlement rule.
2. Keep records that meet both cut-offs.
3. Apply the existing admission rule to those records.
4. Run the existing spec slots over the admitted records.

The cut precedes supersession.
A successor outside the cut cannot remove an earlier head.
A `where` test on current heads cannot perform this operation.
Source and slot tests still follow their existing rules.
Heads still belong to each thing, not to one global state.

Settlement precedes the cut to preserve current erasure effects.
An eraser outside the cut can still remove a selected record's payload.
Do not settle the selected records again.
A second settlement could change an erased form to withheld when the cut removes its eraser.
The query never restores an earlier payload from an erased record.
It reconstructs time-selected envelopes with the reader's current payload access.

Admission uses the selected records and the supplied current replacement rule.
A referenced predecessor outside the cut does not participate in admission.
This proposal does not reconstruct an earlier grant or authority policy.

## Checked properties

The model lives in `model/Proposals/AsOf.lean`.
Its proofs live in `model/Proposals/AsOfLaws.lean`.

With neither cut-off, the result equals the existing spec over settled forms.
Narrower cut-offs select a subset from the same supplied forms.
This subset law concerns selection before admission.
It does not claim that heads, admitted records, counts, or sums decrease.
An earlier head can return when a cut excludes its successor.
A sum can increase when a cut removes a negative value.

Selection is idempotent.
Under `Forms`, the same set of supplied forms gives the same selected input and spec result.
Thus arrival order does not change that result under `Forms`.
`Forms` requires equal envelopes for equal ids and equal records when both payloads are held.
A selected record stays erased when a supplied eraser names its id.

These statements do not prove complete history, source discovery, store routing, signature validity, or authority.
The proposal laws stay outside the main laws page.

## Scenario: 2019 belief about 2009

The generated scenario asks: what do the supplied records say by 2019 about events through 2009?
Set the belief cut-off to `2019-12-31T23:59:59Z`.
Set the occurrence cut-off to `2009-12-31T23:59:59Z`.

An observer emits a claim in 2018 about an event in 2009.
The observer emits a correction in 2021 about the same event.
The correction names the earlier claim in `prev`.
The 2019 query keeps the earlier claim as a head.
The current query keeps the correction instead.
A separate claim about 2015 passes the belief cut but fails the occurrence cut.

The occurrence cut means "through this instant", not "only during 2009".
An occurrence lower bound needs a separate window or query rule.
The generated proposal vectors live in `vectors/proposals/as-of/`.
Both the Lean runner and the independent JS checker recompute their answers.

## Open decisions

Each recommendation below remains a proposal, not an adopted rule.

| Decision | Options | Recommendation |
|---|---|---|
| Cut boundary | Include equality; exclude equality. | Include equality. The name "through" states this boundary. |
| Occurrence span | Compare its start; require its end before the cut; require overlap with a window. | Compare its start. This matches the proposed window rule. |
| Missing occurrence | Use emitted; exclude the record; report a separate unknown group. | Use emitted. This matches content order and the proposed window rule. |
| Erasure scope | Settle all forms first; settle only records inside the cut. | Settle all forms first. A historical query must not restore erased payloads. |
| Admission scope | Admit selected records; admit all current records before selection. | Admit selected records. Explicitly retain the current replacement rule. |
| Historical possession | Use emitted claims; require an independent witness of store possession. | Use emitted for this primitive. Define possession witnesses separately. |
| Public interface | Add spec fields; add a reader argument; leave this as a model-only proposal. | Keep a reader argument in this proposal. Do not activate carried spec keys. |
| Result identity | Cover selected ids; also commit to cuts, spec, forms, policy, and result. | Keep cover identity separate. A later result key must name every input that affects its result. |

## Limits

This proposal supplies no clock, scheduler, fetch operation, historical storage, or access grant.
It adds no timestamp witness or trusted statement about the past.
See [ticks.md](ticks.md) for the separate cover commitment proposal.
