# Proposal: tick covers

Status: proposal. The human decides whether to adopt this design.
This document does not activate the spec's carried `ticks` field.

## Tick

A tick consists of a canonical cover and its computed hash.
The cover is a finite set of record ids.
Each id fits in 32 bytes.
Sort the ids by unsigned digest bytes, first byte first.
Remove repeated ids.
Do not sort their base32 text.

The model checks the id bound before encoding.
The empty cover is valid.
The hash uses this byte sequence:

```text
UTF8("loops/tick-cover/v1:") || id1_bytes || id2_bytes || ... || idN_bytes
```

Each `id_bytes` has exactly 32 bytes, most significant byte first.
The domain prefix is fixed.
The fixed width separates adjacent ids without a delimiter.
The vectors use SHA-256.
The abstract model accepts the existing `Loops.Hash` parameter.
The printed hash is `h:` followed by lowercase, unpadded base32.

The hash commits only to the cover.
It does not commit to a spec, cut-off, replacement rule, payload access, or fold result.
Two readers can hold the same ids but have different payload access.
Their cover hashes agree even when their fold results differ.
This cover hash must not serve as a rendered-result key.

## Difference

`diff(old, new)` contains ids in the new cover but not in the old cover.
It returns each id once, in ascending digest order.
These are added ids.
`diff(new, old)` gives removed ids.
Together, they describe the change between the two covers.

`diff(t, t)` is empty.
An empty forward difference does not prove equal covers.
The new cover can be a proper subset of the old cover.
Both directional differences are empty exactly when the covers agree.

This is a changelog of covered ids, not a summary of changed beliefs.
A lens can read the added and removed records to explain their meaning.
A payload can become withheld or erased without changing either cover.
Such a change does not appear in this difference.

## Checked properties and hash premise

The model lives in `model/Proposals/Tick.lean`.
Its proofs live in `model/Proposals/TickLaws.lean`.

Normalization preserves set membership and removes order and repeat differences.
The canonical encoding identifies the bounded cover without a hash assumption.
Equal covers give equal hashes for every hash function.

Hash binding needs a separate premise.
For the two compared cover encodings, equal hash outputs must imply equal input bytes.
Under that premise, equal tick hashes imply equal covers.
The proof does not prove SHA-256 collision resistance.
The existing model defines an abstract hash but supplies no collision-resistance theorem.
This proposal states the needed premise explicitly and adds no axiom.

The generated vectors live in `vectors/proposals/ticks/`.
Both the Lean runner and the independent JS checker recompute the cover, bytes, hash, and differences.
The proposal laws stay outside the main laws page.

## Relation to as-of folds

An as-of reader can construct a cover from the ids it selects.
The caller must state whether this cover names selected inputs, admitted inputs, or output heads.
This proposal does not choose that role implicitly.

A cover does not prove when a store holds those records.
A witness needs a separate claim, authority rule, and verification procedure.
An external timestamp also needs its own receipt and verification rule.
This proposal supplies neither one.

## Open decisions

Each recommendation below remains a proposal, not an adopted rule.

| Decision | Options | Recommendation |
|---|---|---|
| Cover meaning | Supplied records; selected records; admitted records; output heads. | Keep this primitive generic. Each caller must name its cover role. |
| Id range | Accept arbitrary model naturals; require 32-byte ids. | Require 32-byte ids. Never truncate a larger value. |
| Cover encoding | Fixed-width digest bytes; canonical JSON id strings; a tree of hashes. | Use fixed-width digest bytes. The simple encoding has a direct injectivity proof. |
| Hash domain | Share the record domain; use a separate versioned prefix. | Use `loops/tick-cover/v1:`. Keep tick inputs distinct from record inputs. |
| Hash trust | Assume global injectivity; state a local collision premise; make no binding claim. | State a local premise for compared encodings. Do not claim global SHA-256 injectivity. |
| Difference direction | Added ids only; removed ids only; a symmetric difference. | Expose added ids and obtain removed ids by reversing the arguments. Keep the directions distinct. |
| Result identity | Reuse the cover hash; define a separate result key. | Define a separate result key later. Cover membership omits inputs that affect a fold result. |
| Store witness | Treat every tick as a witness; define a signed witness separately. | Define a witness separately. A cover hash alone proves no possession, time, or authority. |
| Large covers | Keep the whole list; add a Merkle tree and membership proofs. | Keep the list now. Add a tree only when a measured use requires it. |
| Adoption | Activate spec `ticks`; retain a separate proposal API. | Retain the proposal API until the human accepts its semantics and byte format. |

## Limits

A tick proves no completeness, provenance, event truth, payload availability, or access right.
It performs no fetch, signature check, external timestamp check, or storage operation.
See [as-of.md](as-of.md) for the time-selection proposal.
