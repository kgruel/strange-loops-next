# Layers one through three, realm, and scenario: limits and review points

This port changes no model, vector, protocol, design, or interop files.
The implemented reader surface follows Lean except for the explicit representation boundaries below.
These notes identify review points. They do not propose new laws.

## Scope and proof requirements

Layer two covers all 37 fold vectors.
Fold selection uses only the closed where grammar and its evaluation.
Layer three covers all 70 spec vectors, the full parser, renderer, slots, execution, and admission.
The realm layer covers all nine realm vectors, settlement, and admission (`model/Loops/Things.lean:47–92`).
The scenario fixture is checked. Batches, lens vectors, the CLI, and storage service remain future work.

Lean requires commuting steps through `Acc.comm` (`model/Loops/Families.lean:33–39`).
Rust callers must supply pure steps that commute.
Envelope predicates must depend only on `SameEnvelope`, as `Where.envelope.only` requires (`model/Loops/Families.lean:108–110`).
Rust does not enforce these proofs.

The latest permutation, repeat, and convergence laws require `Addressed` input (`model/Laws/Fold.lean:247–267`).
`Acc.set_decides` requires `Distinct` input (`model/Laws/Families.lean:109–112`).
Raw Count and Sum still count repeats (`model/Laws/Fold.lean:44–45`; `model/Laws/Numeric.lean:43–44`).
The port does not remove repeats before every fold.

`LatestBy` keeps public lists that permit unchecked states.
`insertRec` tests `Newer`, then full record equality (`model/Loops/Fold.lean:33–35`).
Different payloads or time spellings can survive with equal order keys.
Insertion leaves repeated or unsorted tails unchanged.
Requiring checked state or `Record::Ord` incorrectly restricts this executable domain.

`parseWhere` permits repeated fields and operators (`model/Loops/Spec.lean:380–396`).
It keeps written order and reports the first invalid field path.
Recursive duplicate checks belong to `Spec.ofJson` or the outer selection input boundary.
See `model/Loops/Spec.lean:554–555` and `model/Gen/Run.lean:114–118`.
`RefusalCode` names all 14 spec refusal codes.
`Refusal` keeps the exact wire code and field path. It implements `Display` and `Error`.
`Spec.of_object` and the lower parser helpers retain their raw domains without recursive duplicate checks.

The test reader follows `Gen.Read` shapes and rejection rules.
Its diagnostic text uses Rust wording. It does not claim identical Lean diagnostic text.
Core spec and where refusals retain exact protocol codes and paths.

## Spec metadata and admission

The header at `model/Loops/Spec.lean:42` says accepted unused keys are carried.
The actual structure and renderer discard those keys (`model/Loops/Spec.lean:307–311,601–605`).
Rust follows that executable behavior. These keys gain no runtime meaning.
Recursive duplicate checks still inspect every ignored value before any shape or grammar check.
No model file changes to resolve this header mismatch.

Admission requires a pure `EnvOnly` rule (`model/Loops/Things.lean:73–88`).
The rule must depend only on both envelopes, not their payloads or reader forms.
Rust cannot enforce that proof requirement for arbitrary closures.
The port makes no unconditional admission-law claim.
Admission filters once against the original held records, not a changing accepted set.
All held forms with the linked id must share a thing and pass the rule. Missing predecessors pass.

`Spec.run` expects one record per id, as the Lean comment states (`model/Loops/Spec.lean:322–328`).
It admits records but does not call `settle` or remove duplicate ids.
Tests retain the executable behavior on raw unequal forms with the same id.
Latest-by and following collect resolve per-thing heads over all admitted records before source or where tests.
Latest-by counts distinct unknown ids across things. Collect counts unknown raw heads before the limit.
A hidden head with no payload tests can be a known match.
The collect limit applies to known matches, not unknown counts or readable records alone.
Large limits take every match without truncating to machine width.

## Realm premises and raw forms

`Forms` requires equal envelopes for equal ids and equal records for two `Here` forms (`model/Loops/Things.lean:67–70`).
The `settle_eq` order and repeat law requires `Forms` (`model/Laws/Things.lean:124–125`).
The port does not check that premise or reject conflicting forms.
`base_form` keeps the first `Here` form, or withholds the first form when none is `Here`.
Outside `Forms`, input order can therefore change the chosen envelope or payload.
A hidden form with unchecked payload fields loses those fields through `Record::withhold`.
An erased form alone becomes withheld without an original erasure link.

Erasure reads all original forms, including discarded forms and records that admission later refuses.
The eraser's kind and visibility do not affect erasure (`model/Loops/Things.lean:49–61`).
Erasure does not add absent ids. Settlement returns held ids in sorted digest order.
`settle_distinct` and `settle_erased` need no `Forms` premise (`model/Laws/Things.lean:137–146`).
`realm` settles before admission. It does not admit forms before checking erasure.

`refusal_of` reports unrelated predecessors before denied permission across the whole list (`model/Loops/Things.lean:82–85`).
The typed enum retains both exact codes through `Display` and implements `Error`.
This check includes every held matching form. Missing predecessors pass.
Admission view laws require `EnvOnly` (`model/Laws/Things.lean:255–277`).
Raw functions still accept closures outside that premise, including rules that inspect settled payload visibility.
These functions add no unconditional order or view law.

## Digest ids

Reader ids and all reader links use `Digest([u8; 32])`.
Slice conversion refuses every length except 32 bytes.
`id_digest` returns those exact bytes. `id_text` encodes those bytes without a numeric conversion.
Derived `Ord` compares unsigned bytes, with the most significant byte first.
`id_order` relates digest order to numeric order (`model/Laws/Order.lean:46`).
Text order does not replace digest order because the base32 alphabet has a different character order.

The expected laws state that ids are bounded digests; see branch `lean-unread`.
That branch supplies the expected id bound below `2^256`, bounded `idText` injectivity, and digest roundtrip laws.
This worktree does not contain or locally verify those expected laws.
The representation follows that explicit amendment, not an unrestricted interpretation of local `Record.id : Nat`.
No public conversion connects `Nat` to an id. Private tests construct small ids from bytes.
Writer envelopes keep raw text links because their validation must report invalid text.

## Numeric bounds

`Json.int` holds an unbounded `Int` (`model/Loops/Json.lean:12–18`).
`Json.inRange` separately checks ±(2^53 - 1) (`model/Loops/Json.lean:118–132`).
`writeProblem` checks the envelope, salt length, duplicate names, and numeric range, in that order (`model/Loops/Stored.lean:68–77`).
Only the writer boundary requires that range before accepting a payload.
A checked writer integer fits `i64`.

`Gen.Read.number` and reader numeric fields remain unbounded (`model/Gen/Read.lean`; `model/Gen/Read.lean:286–331`).
`Spec.parseArg` also accepts unbounded payload integers (`model/Loops/Spec.lean:346–357`).
Unchecked `Json.canon` writes those integers without a range check (`model/Loops/Json.lean:76–89`).
Raw folds can therefore receive integers outside the writer range.
Rust keeps `Int` and `Nat` arbitrary precision for raw JSON, record numbers, fold state, counts, unread totals, and limits.
A shared fixed-width type rejects raw values before the writer can apply its refusal order.
It also changes raw fold results.
A separate checked numeric type adds no required behavior, so this port adds none.

## Differences from JavaScript

JavaScript keeps the first form of each repeated id (`interop/js/fold.mjs:47–51`).
Lean keeps the last form (`model/Loops/Families.lean:26–28`).
Rust follows Lean, including when repeated ids have different reader forms.

JavaScript uses signed 128-bit sums and throws `sum-overflow` (`interop/js/fold.mjs:84–93`).
Lean uses unbounded sums (`model/Loops/Fold.lean:77–79`; `model/Loops/Families.lean:60–61`).
Rust keeps exact sums and fixture answers beyond 128 bits. It adds no JavaScript sum limit.

JavaScript's exported numeric folds select readable numbers.
Lean's raw Count, Sum, Min, and Max answers do not select or remove repeats first (`model/Gen/Run.lean:75–90`).
`Acc.fold` also skips readability checks.
Visibility checks belong to `Acc.select` and `maxHeads`, not these raw entry points.

## External standards data

The Lean numeric JSON model covers integers, not general binary64 values (`model/Loops/Json.lean:12,118–132`).
Record signatures and stored lines follow `model/Gen/Records.lean:41–56`.
`vectors/standard/README.md` describes separate JCS, binary64, and SUPERCOP Ed25519 data.

The possible approaches include adding binary64, converting external numbers to integers, or deferring the external suite.
This port defers the whole standard family because Lean does not define general binary64 behavior.
That family includes 12 JCS JSON files, `es6-numbers.txt`, and `ed25519.input.gz`.
The crypto corpus needs separate dependency checks; its deferral does not follow from the integer restriction.
Current record tests compare model signatures through maintained crypto dependencies.
The port claims neither full RFC 8785 coverage nor independent SUPERCOP conformance.

| Deferred JSON family | Files |
| --- | ---: |
| batch | 11 |
| lens | 10 |
| standard | 12 |
| Total | 33 |

The registry checks 26 record, eight occurred, 37 fold, 70 spec, nine realm, and one scenario file: 151 of 184 recursive JSON files.
Spec includes 61 parse files and nine run files.
The remaining allowlist stays `batch`, `lens`, and `standard`.

## Canonicalization before validation

`Json.canon` remains defined on objects with duplicate names (`model/Loops/Json.lean:41–49,76`).
The member-order law requires distinct keys (`model/Laws/Record.lean:291`).
That law does not permit a change to raw duplicate behavior.

The alternatives include last-wins maps, rejection before rendering, and Lean's first-wins sorting.
Rust keeps object members in a `Vec`, applies a stable UTF-16 sort, and keeps the first equal-key member only during rendering.
Both validators still inspect raw members, including values that rendering removes (`model/Loops/Json.lean:98,122`).

## Time values and spelling

Raw Lean moments permit arbitrary integer lists (`model/Loops/Time.lean:32`).
The instant parser produces canonical moments (`model/Loops/Time.lean:65`).
Occurred parsing defines bounded dates, qualifier rules, and interval checks against the right endpoint's start.
See `model/Loops/Occurred.lean:56,80,105`.

The alternatives include exposing raw moments, using a general date library, or exposing only parsed moments.
Rust uses the authorized parsed boundary: private `Moment` fields, `i64` seconds, and fraction digits without a length limit.
Four-digit years and bounded offsets keep seconds within `i64`.
This API does not implement arbitrary raw Lean moment construction.

The parser accepts second 60 in every minute and offsets through `23:59`.
Qualifiers do not make instants valid. Year zero and calendar end boundaries at year 10000 remain possible.
The port does not replace these rules with a date library's policy.

## Character checks

Envelope and time parsers use Lean character predicates (`model/Loops/Envelope.lean:40–49`; `model/Loops/Time.lean:18`).
Lean v4.35.0 defines `isLower` and `isDigit` with ASCII comparisons (`Init/Data/Char/Basic.lean:113,129`).
Rust uses ASCII predicates, not Unicode character classes.
`Env.recordId` checks length and alphabet only. It does not check final base32 padding bits.
The fixture reader applies stricter canonical decoding, as `Gen.Read.recordId` requires (`model/Gen/Read.lean:238–248`).

## Scenario composition

The scenario harness follows `model/Gen/Run.lean` and `model/Gen/Scenario.lean`.
It settles forms, admits them, and runs the spec on settled forms.
Each listed arrival order must produce the canonical forms outcome.
The scenario layer adds the core lens dependency before the lens vector layer.
Lens vector dispatch remains deferred.

Scenario orders may be empty, as `model/Gen/Run.lean` permits.
The harness compares outcomes, not order permutations.
