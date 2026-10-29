# Layer-one boundaries, quirks and deferrals

No model, vector, protocol, design or interop files were changed. No known
behavioral deviation within the implemented parser/record surface is being
accepted silently. These are review points, not proposed new laws.

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
- The other deferred JSON counts are fold 37, spec 70, realm 9, scenario 1,
  batch 11, lens 10. Total deferred JSON: 150. No full RFC 8785 or independent
  SUPERCOP conformance claim is made.

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
