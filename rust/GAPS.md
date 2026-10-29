# Layers one and two: boundaries, quirks and deferrals

No model, vector, protocol, design or interop files were changed. No known
behavioral deviation within the implemented parser/record surface is being
accepted silently. These are review points, not proposed new laws.

## Fold premises, unchecked inputs and selection boundary

- Layer two is complete for its 37 fold vectors; layer three is not. Only
  Spec's closed where grammar/evaluation is pulled forward for fold/select.
  Full Spec.ofJson/toJson/run, slots and remaining refusal codes are deferred.
  Realm settle/admit is NOT implemented (model/Loops/Things.lean:46–92).
- Acc.comm and Where.envelope.only are proof-bearing fields
  (model/Loops/Families.lean:33–39,108–110). Rust closures must remain pure,
  steps commute, and envelope predicates depend only on SameEnvelope; none of
  these are enforced at runtime. The library does not claim Rust proofs.
- Set/order results require their actual premises: LatestBy.perm/repeats and
  converge require Addressed (model/Laws/Fold.lean:247–267); Acc.set_decides
  requires Distinct input (model/Laws/Families.lean:109–112). Raw Count/Sum
  still count repeats (model/Laws/Fold.lean:44–45,
  model/Laws/Numeric.lean:43–44). No pre-fold dedup is introduced.
- LatestBy Vec fields stay public/unchecked. insertRec tests full equality,
  not id or order-key equality (model/Loops/Fold.lean:33–35); distinct payloads
  or time spellings with identical order keys may both survive. Unsorted and
  repeated tails stay as Lean's recursion leaves them. A validated-state
  wrapper or a Record::Ord would incorrectly narrow this executable domain.
- parseWhere itself permits duplicate fields/operators, preserving written
  order and first-error path (model/Loops/Spec.lean:380–396). Recursive duplicate
  checks belong to Spec.ofJson (model/Loops/Spec.lean:554–555), or selectRun's
  outer input boundary (model/Gen/Run.lean:114–118). RefusalCode currently has
  only WhereInvalid, with exact code() spelling, Display/Error and a path;
  extending the complete layer-three vocabulary remains explicit.
- Test-only Gen.Read decoding preserves strict shapes and rejection behavior,
  but its diagnostic prose is Rust-specific, not a claim of byte-identical
  Gen.Read error messages. Core parseWhere refusal code/path IS exact.

## JS differences — Lean behavior deliberately retained

- interop/js/fold.mjs:47–51 distinct retains the FIRST repeated id.
  model/Loops/Families.lean:26–28 dedup retains the LAST. The Rust port follows
  Lean, including differing reader forms; it does not silently import JS policy.
- interop/js/fold.mjs:84–93 sums in signed 128 bits and throws sum-overflow.
  model/Loops/Fold.lean:77–79 and model/Loops/Families.lean:60–61 accumulate
  unbounded Int. Rust keeps unbounded arithmetic and integer fixture answers,
  with tests beyond 128 bits; it deliberately has no JS sum-overflow limit.
- JS exported numeric folds select readable numbers; Lean Gen.Run.foldAnswer
  raw Count/Sum/Min/Max do NOT select/dedup first (model/Gen/Run.lean:75–90).
  Visibility applies at Acc.select/maxHeads, not primitive/raw Acc.fold.
  These are different entry points, not grounds to change Lean's definitions.

## Integer JSON versus external standards data

- model/Loops/Json.lean:12,118–132 defines only integer numeric values and a
  separate exact-range check; model/Gen/Records.lean:41–56 defines the record
  signatures/wire shape. vectors/standard/README.md describes external JCS,
  binary64-number and SUPERCOP Ed25519 corpora.
- Considered: add binary64 to core, coerce external numbers to integers, or defer
  the external suite. Chosen: defer the entire standard family explicitly,
  including its 12 JCS JSON files, es6-numbers.txt and ed25519.input.gz.
  Integer-only Lean does not define general binary64 behavior. The external
  crypto corpus is a separate deferred dependency-verification task, not an
  integer restriction; all model record signatures are compared now using
  maintained crypto dependencies.
- The other deferred JSON counts are spec 70, realm 9, scenario 1,
  batch 11, lens 10. With standard 12, total deferred JSON is 113;
  record 26 + occurred 8 + fold 37 = 71 are checked. No full RFC 8785 or
  independent SUPERCOP conformance claim is made.

## Unbounded ids versus finite wire ids — preserved

- model/Loops/Record.lean:31,58–66 admits arbitrary Nat ids; idDigest retains
  an unbounded first digit, while idText applies Nat.toUInt8 to each digit.
  model/Laws/Order.lean:46 proves id_order without a 256-bit bound.
- Considered: u64 reader ids, enforce 256 bits, or retain arbitrary integers.
  Chosen: private num-bigint wrappers. idText can collide for ids differing
  above bit 255; Newer still distinguishes their Nat ids. No bound law exists
  to justify narrowing links, ids, or Record.n.

## First-wins canonicalization on invalid input — preserved

- model/Loops/Json.lean:41–49,76,98,122 makes canon defined before validation;
  model/Laws/Record.lean:291 assumes keysDistinct for member-order invariance.
- Considered: map-based last-wins parsing, reject before canon, or preserve
  first-wins sortBy. Chosen: Vec object members with stable sorting, then
  first-wins deduplication only while rendering. keys_distinct and in_range
  remain separate and inspect raw members, even members canon discards.

## Temporal domain and spelling — preserved within parser boundary

- model/Loops/Time.lean:32 permits arbitrary raw List Int moments; instant?
  at model/Loops/Time.lean:65 only produces canonical digits/seconds.
  model/Loops/Occurred.lean:56,80,105 also defines bounded dates, qualifier
  dispatch and intervals that compare their second endpoint's START.
- Considered: expose arbitrary raw moments, use a general date library, or
  expose only parsed canonical moments. Chosen: private parsed Moment fields
  with i64 seconds and unlimited digit vectors, as explicitly authorized.
  Raw arbitrary List Int construction is not an implemented API.
- Leap-second 60 is accepted in every minute; offsets allow up to 23:59;
  qualifiers do not make instants valid; year zero and calendar ends at year
  10000 remain possible. No policy or standards-library correction is applied.

## Character classification

- model/Loops/Envelope.lean:40–49 and model/Loops/Time.lean:18 use Lean Char
  predicates. Verified isLower/isDigit against Lean v4.35.0
  Init/Data/Char/Basic.lean:113,129: both are ASCII comparisons.
- Considered Rust Unicode predicates versus ASCII predicates. Chosen ASCII.
  recordId checks length/alphabet only, not final base32 padding bits; that
  permissiveness is retained, not strengthened into decoder validation.
