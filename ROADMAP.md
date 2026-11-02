# Roadmap

## State

The tree has three implementations: Lean, JavaScript, and Rust.
Step 1 applies the six settled rulings before records exist.
The law index has 76 entries, 627 theorems, and six boundary witnesses.
See [the law index](design/laws/laws.json) and [proof and boundary data](design/laws/).
These proofs apply only under their stated premises.

The tree has 315 JSON fixtures: 303 generated fixtures and 12 standard fixtures.
Lean replays 294 generated fixtures; nine occurred fixtures use separate checks.
Rust checks all 315 fixtures, six JCS byte pairs, 4,000 binary64 cases, and 128 SUPERCOP signing cases with ed25519-dalek.
The verified Rust run passes 122 tests; JavaScript passes 5,184 vector checks and 16 regression tests.
The fuzz suite passes 40 tests.
See [vectors](vectors/README.md), [Rust boundaries](rust/GAPS.md), and [the mutation report](model/mutate/REPORT.md).
These checks provide bounded evidence, not complete JCS or cryptographic correctness.
They do not certify browser accessibility, external links, or official ASD dictionary compliance.

Input numbers round once to binary64.
The nonfinite refusal stage remains open.
The writer accepts values with magnitude at most 2^53 − 1, including fractions.
Numeric folds read safe whole values only.
Raw constructors and theorem premises retain separate domains.

The Step-1 sequential gate runs pass on Node 22.
The `step1-1` campaign checks 5,600 cases, 800 per family, in 155.43 seconds.
It reports 3,768 matches, 813 protocol refusals, 377 shared decoder refusals, and 42 duplicate-base lens mismatches.
Decoder refusals are not agreement.
The parent checks all 42 raw and 42 reduced mismatches; no new mismatch class appears.
Each reduction uses 76 trials and three accepted rounds, below the 80-trial limit.
These reductions do not establish absolute minimality.
See [the three-way campaign report](interop/fuzz/REPORT.md) for current and historical results.
The CI seed `ci-1` checks 28 three-way cases without mismatches.

The mutation catalogue retains all 189 entries, with four re-anchored replacements.
The full run at `6fa9857` reports 143 build rejections, 27 vector differences, 12 generator assertion exceptions, and seven survivors.
The runner exits 1 for assertion exceptions; no timeout or infrastructure failure occurs.
All six old survivors remain, including the four unapproved D6 helpers.
The new survivor adds a redundant positive-offset guard after R4 already forbids offsets.
Build rejections are not semantic proof kills.
Survival does not prove equivalence.
See [the mutation report](model/mutate/REPORT.md) for outcomes, restoration checks, and limits.

## Decisions for the human

### Settled: Step-1 rulings R1–R6

- **R1:** Every byte string uses lowercase, unpadded base32hex.
  Readers require canonical lengths and zero pad bits.
  Proved id text order equals digest order.
- **R2:** The id preimage remains the JCS object containing `commit` and `env`.
- **R3:** Signed bytes remain `loops/record/v1:` followed by the id text, encoded as UTF-8.
- **R4:** Instants use UTC `Z`, seconds 00 through 59, and optional fractions of one through nine digits.
  A fraction ends in a nonzero digit.
  The actual parser has proved spelling uniqueness and parse-render recovery.
- **R5:** Typed references retain lowercase prefixes; sets retain UTF-16 code-unit sorting.
- **R6:** Raw envelope readers return `envelope-field-unknown` before checking values, including `kind-empty`.
  The payload remains the extension point.

See [record rules](protocol/record.md) and [the settled ledger](design/rethink/ledger.json).
D1–D7 below remain open and unchanged.

### Settled: binary64 standards and writer range

The human closes the standards choice with Option A.
Rust uses native shortest binary64 digits, ECMAScript notation, and exact midpoint tie correction.
The writer refuses every magnitude above 2^53 − 1, including fractional values.
Canonical formatting covers finite binary64 independently of writer acceptance.
A Lean roundtrip proof and a shortest proof do not yet exist; neither blocks this choice.
See [Rust numeric boundaries](rust/GAPS.md) and [record rules](protocol/record.md).

### D1: Duplicate base lens IDs

**Readings:** Refuse duplicate IDs at the public base boundary, or define duplicate matching and application semantics.
**Effects:** Strict validation enforces existing lens premises; wider semantics need new interoperability tests and scoped laws.
**Recommendation:** Validate public bases strictly and specify refusal precedence.
Keep raw core first-lookup behavior unchanged.
See [the lens contract](protocol/lens.md) and [the duplicate-base example](interop/fuzz/found/03-duplicate-base-id.json).

### D2: Lone surrogates

**Readings:** Report decoder refusal, or map that refusal to a protocol refusal before hashing.
**Effects:** Text decoding and direct JavaScript values can encounter different inputs and error stages.
**Recommendation:** Reject lone surrogates in text and direct-value APIs before hashing.
Include keys, envelopes, and ignored metadata.
The human must choose the refusal mapping, error code, and precedence.
Non-scalar input must be rejected; no alternative representation is proposed.
Rust already validates ignored metadata; this correction does not settle the public contract.

### D3: Overflow stage

**Readings:** Refuse overflow during decoding, retain it for writer refusal, or map a decoder error at the adapter boundary.
**Effects:** Rust currently rejects nonfinite overflow earlier than Lean's writer, which can change refusal precedence.
**Recommendation:** Preserve the finite core and choose an explicit adapter mapping, stage, and precedence.
Pin the chosen behavior across implementations.

### D4: Fixture signing seeds

**Readings:** Require exactly 32 decoded seed bytes for successful signing fixtures, or support Lean's arbitrary canonical byte seeds.
**Effects:** The first narrows the fixture contract; the second needs compatible signing behavior and tests.
**Recommendation:** Require a canonical 32-byte seed at the fixture boundary.
Never pad or truncate seeds.
This is not a record protocol rule.

### D5: Mixed record variants

**Readings:** Return the first writer refusal, as Lean does, or require agreement across all Cartesian variants.
**Effects:** First refusal depends on order; agreement checks can require a seed before an earlier refusal.
**Recommendation:** Use Lean-compatible first refusal for oracle equivalence.
Test mixed accepted and refused variants and differently refused variants.

### D6: Four mutant candidates

All four candidates remain unapproved; no candidate proof was added.
**Readings:** Approve concrete helper lemmas and pins, or leave their behavior unpromised.
**Effects:** Approval specifies these helpers, not fundamental protocol rules.
**Recommendation:** Approve all four concrete helper lemmas and pins.
`Spec.select` has explicit limited use: `Spec.run` does not call it.
See [the mutation report](model/mutate/REPORT.md).

1. **Sum missing step.** Statement: `r.num field = none → (Sum.on field).step s r = s`.
   Premise: the selected field is unreadable.
   Effect: an unreadable field leaves the sum unchanged.
   Why: this pins the concrete helper; generic accumulator commutativity does not state it.
2. **Max readability.** Statement: `Max.acc.readable r = (r.num "n").isSome`.
   Premises: none beyond the record type.
   Effect: readability follows the safe-whole numeric field, not visibility alone.
   Why: a held record can lack a readable `n`; generic accumulator laws do not specify this predicate.
3. **Min readability.** Statement: `Min.acc.readable r = (r.num "n").isSome`.
   Premises: none beyond the record type.
   Effect: readability follows the safe-whole numeric field, not visibility alone.
   Why: held records can lack readable numbers; the concrete predicate needs its own pin if promised.
4. **Spec selection.** Statement: `r ∈ sp.select xs ↔ r ∈ xs ∧ sp.takes r = true`.
   Premises: none beyond the types.
   Effect: selection contains exactly the input records that pass the test.
   Why: this follows from filter membership but names the concrete helper contract; `Spec.run` does not call it.

### D7: Canonical result encoding

This is a future human choice, not a current behavior change.
The [open design](design/rethink/sections/16-open.html) prefers JCS for results.
Exact, unbounded `Sum` outputs include `9007199254740993` in `phase2-exact-output`.
Neither current tests nor the model define a canonical result hash codec.
**Readings:** Define a separate exact-integer canonical JSON extension, or use typed decimal integer strings inside JCS.
Raw JCS numeric rounding cannot preserve every `Int`.
**Effects:** These choices produce different bytes, hashes, and schemas.
**Recommendation:** Define a separate versioned result codec using typed decimal integer strings under JCS.
Never round or cap current model outputs.

### Retained boundaries

These boundaries trace existing domains and premises; they do not create new protocol choices.
See [Rust boundaries](rust/GAPS.md), [laws](protocol/laws.md), and [vectors](vectors/README.md).

- `Addressed`, `Distinct`, `Forms`, `EnvOnly`, and `Acc.comm` remain caller obligations where laws require them.
- Raw Count and Sum retain repeats; unchecked fold state and insertion retain their wider domains.
- Spec admission examines raw members before discarding accepted unused metadata; refusal precedence remains significant.
- Source routing, store retrieval, and external services are outside the pure evaluator.
- Reader IDs use bounded 32-byte digests; writer links remain text until validation.
  This boundary does not prove SHA correctness or the complete text-to-hash bridge.
- Raw integers and exact output sums remain unbounded; binary64 normalization applies to numeric input.
- Raw duplicate object names use stable UTF-16 sorting and first-equal-key rendering; validators inspect all raw members.
- Parsed time types do not expose every raw Lean moment; typed references use ASCII rules distinct from fixture digest decoding.
- Scenario checks cover supplied arrivals, not all permutations.
- Lens laws require their validity and success premises, including distinct base IDs and matching ordered IDs where stated.
- Batch meaning uniqueness requires acyclicity and meaning premises; it does not establish resolver correctness.
- Raw extrema fuzz compares held inputs with readable safe-whole `n`.
  This declared scope is not a bug; broader inputs require a different fixture contract.

Future public adapters can validate premises or expose raw operations with caller obligations.
Validation costs explicit error design; raw access demands greater caller responsibility.
Recommend validation at future public adapters, while keeping the existing raw core and premises.
Do not implicitly normalize the core.

Review corrections narrow proof scope and mark examples as prototype or proposed.
They also correct privacy, index, hash, signature-prefix, and obsolete Rust claims.
These mechanical corrections do not add protocol choices.

## Next work, by value

Costs are S, M, or L for relative effort, not schedules.

| Work | Value | Cost | Dependencies and blocking choices |
| --- | --- | --- | --- |
| Resolve D1–D5; add Lean pins and align three adapters | Shared public boundaries and repeatable refusals | L: cross-runtime contracts and precedence | Human decisions D1–D5; use the classified campaign evidence |
| Add four candidate helper lemmas and pins | Specifies useful concrete helper behavior | S: local proofs and pins | Human approval under D6; otherwise retain them as implementation details |
| Integrate a workbench page | Readers build scenarios and try vector presets | M: UI, validation, browser tests | Use the JS interpreter and scenario-vector presets; version localStorage drafts; never treat them as canonical storage |
| Define result encoding and Lean encoding vectors | Reproducible result bytes and hashes without losing exact integers | L: codec, schemas, and cross-runtime vectors | Human decision D7; preserve unbounded model outputs |
| Turn horizons into Lean scenario vectors | Tests concrete compositions and exposes missing premises | L: model and scenario work | Start with minimal compositions of existing core; mark new boundary, tick, and service premises unimplemented before proof claims |
| Prove binary64 roundtrip, then shortest | Strengthens assurance beyond sampled standard cases | L: formal number reasoning | Existing canonical formatter; neither proof blocks the settled standard choice |
| Bridge source and fold records to hashes | Connects text, record bytes, IDs, and fold outputs | L: byte-level model and evidence | Defined source and writer boundaries; do not assume SHA correctness from bounded IDs |
| Build services, routing, key management, and persistence | Supports operation beyond pure fixtures | L: architecture and security work | Explicit service contracts and key decisions; safe-wrapper versus raw access choice |
| Expand malformed-input fuzz and standards coverage | Finds more boundary and adapter differences | M: generators, triage, and regression pins | D1–D5 where inputs cross unresolved boundaries; explicit contract before broadening raw extrema |
| Complete browser, accessibility, and link validation | Checks the reader experience and published references | M: browser and accessibility checks | Workbench and generated pages; validate anchors and external links separately |
