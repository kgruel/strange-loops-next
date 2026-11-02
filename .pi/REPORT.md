# Step-1 rulings

## Changes

R1 makes every byte string lowercase, unpadded base32hex.
The shared decoders require exact encoder-image equality.
Fixed-width readers also check the decoded byte count.
Writer links preserve their existing field refusal codes.

R4 accepts only canonical UTC instants.
Seconds range from 00 through 59.
Optional fractions have one through nine digits and end in a nonzero digit.
Every occurred instant position uses the same parser.
Calendar precision, qualifiers, and date intervals keep their rules.

R6 checks raw envelope keys before values.
Unknown keys return `envelope-field-unknown` before `kind-empty`.
Typed envelopes keep their eight fields.

R2 keeps the JCS object containing `commit` and `env` as the id preimage.
R3 keeps the UTF-8 signature domain prefix `loops/record/v1:` followed by the id text.
R5 keeps lowercase typed prefixes and UTF-16 set sorting.
The design ledger records all six choices as settled.
D1–D7 remain unchanged.

## Laws

Four new cards raise the law count from 72 to 76.
The proof export contains 627 theorems, up from 606.
Six existing boundary witnesses remain.

- `base32.canonical` retains `base32_injective` and proves unconditional byte recovery, exact encoder-image acceptance, and fixed-width acceptance.
- `id.text-order` proves `idText a < idText b ↔ a < b` for bounded `RecordId` values.
  It uses actual String order, not an assumed ordering function.
- `instant.unique` proves that two accepted texts with the same parsed moment are equal.
  The proof derives calendar and clock injectivity from parser bounds.
- `instant.round-trip` proves that rendering parsed numeric fields recovers the accepted text.
  The renderer does not store or return the input text.

The new proof modules are `Laws.TextRadix`, `Laws.InstantCalendar`, and `Laws.Instant`.
The law root imports instant laws directly.
No proof assumes the requested result as a premise.

## Vectors

The tree has 315 JSON fixtures: 303 generated fixtures and 12 standard fixtures.
Lean replays 294 generated inputs.
Nine occurred fixtures use generator assertions and separate reader checks.
Rust checks all 315 fixtures.

The new byte-text family covers salts, ids, commitments, keys, and signatures.
It tests uppercase, outside-alphabet characters, lengths, padding characters, and every nonzero final pad-bit pattern.
Record vectors pin field-specific refusals and unknown-key precedence.
Time vectors cover each new refusal in emitted and each occurred instant position.
Independent runtime pins also check actual id text order and parser recovery.

## Gates

Six complete runs pass all 21 sequential gates.
Their local logs are `.pi/gates/{model-final,vectors,js,rust,evidence,pages}/`.
Each behavior commit receives a complete run before commit.
The final page run also checks the restored mutation sources and current generated output.

- Lean builds 90 jobs with `--wfail` and no `sorry`.
- Generation writes 303 fixtures; replay reproduces 294 inputs.
- Runtime checks pass canonical-text pins and 4,000 binary64 cases.
- The separate source-mutation gate detects all five mutations.
- JavaScript passes 5,184 vector checks and 16 regression tests.
- Fuzz tests pass all 40 tests.
- Rust format, clippy, tests, docs, and evaluator build pass.
  Its 122 tests cover all 315 fixtures and independent standard checks.
- The CI campaign checks 28 three-way cases without mismatches.
- All eight mutation-runner tests pass.
- Design checks refuse 59 of 60 mutations; the existing single allowlisted survivor remains.
- Generated-file and whitespace checks pass.

Initial design gates find three metadata errors, not runtime failures.
The parent adds the missing grammar refusal, gives parser premises accurate shared wording, and replaces unsupported vector globs with explicit paths.
The complete rerun passes after these corrections.

## Three-way campaign

The `step1-1` campaign checks 5,600 cases, with 800 per family, in 155.43 seconds.
It reports 3,768 matches, 813 protocol refusals, 377 shared decoder refusals, and 42 mismatches.
Shared decoder refusals do not count as agreement.
The parent checks all 42 raw and 42 reduced mismatch artifacts.
All show D1 duplicate-base lens behavior, with Lean and Rust agreeing against JavaScript.
No new mismatch class appears.
Every reduction uses 76 trials and three accepted rounds, below the 80-trial limit.
The total is 3,192 trials; minimality is not proved.
See `interop/fuzz/REPORT.md` and local `.pi/evidence/step1-1/` artifacts.

## Mutation catalogue

The full 189-entry run uses snapshot `6fa98571b0f7d15d5ddbdae3ef12401efc0c92f7` and the reviewed re-anchored catalogue.
It reports 143 build rejections, 27 vector differences, 12 generator assertion exceptions, and seven survivors.
The runner exits 1 for generator assertions; no timeout or infrastructure failure appears.
Build rejections are not semantic proof kills; generator assertions are not vector-difference kills.
The parent checks all error log endings and the complete outcome counts.
Both baseline builds pass, model sources and vectors restore to HEAD, and the mutation lock is absent.

All six old survivors remain; D6 stays unapproved.
The new survivor, `finish-occurred-stamp-of`, adds an early refusal when the text contains `+`.
The actual R4 parser permits no `+` in accepted text, so this guard is redundant.
Rejected inputs still return `none` in either version.
This source-based interpretation is not a new formal equivalence theorem.
The catalogue retains the entry and reports its survival.
See `model/mutate/REPORT.md` and local `.pi/evidence/mutations/` artifacts.

Four entries have new unique anchors.
They target decoded id width, the UTC marker, fraction acceptance, and second 59.
No entry is removed.

## Judgement calls

- Exact decoder re-encoding replaces separate pad-bit predicates.
  This makes canonical acceptance a property of the shared codec.
- Raw envelope decoding owns unknown-key refusal.
  Typed envelopes cannot contain unknown fields and need no extra state.
- Generic API and theorem names retain `base32` for compatibility.
  Encoding prose names base32hex.
- `offsetSecs` and the tail tuple retain their small internal shape.
  They accept only `Z` and zero offset; instant arithmetic no longer subtracts offsets.
- `stripZeros` remains a general moment helper for existing laws.
  Accepted instant fractions already have no trailing zero.
- Year 10000 remains a rendered exclusive bound for the accepted year-9999 date span.
  Instant input years remain 0000 through 9999.
- Historical review evidence and deliberate refusal literals remain with explicit scope.
  Storage byte offsets and layout offsets are not timestamp rules.
- The parent reverses one generated fractional interval because `.123456789` precedes `.5`.
  A unit check now validates every interval in sampled unmutated record envelopes.
- Generated files are staged before regeneration checks.
  The clean check compares regeneration with the reviewed index, not the old encoding at HEAD.
- The final residue scout proposes removing fractional writer numbers.
  The parent rejects that finding: `Json.inRange` and the settled binary64 decision explicitly allow bounded fractions.
- The mutation helper speculates about equivalence for D6 helpers.
  The parent retains their existing unapproved status; survival does not establish those claims.
- The existing catalogue does not claim exhaustive mutation coverage of new Step-1 helpers.
- The `where.time` card now describes equal parsed spans, not alternate instant spellings.
  Date qualifiers can preserve a span; canonical instants cannot change spelling.
- Rust adds no dependency.
- Model and reader changes remain separate review units as requested.
  Cross-runtime gates run against the complete worktree before behavior commits.

## Review units

| Commit | Unit |
|---|---|
| `e5eaf7b` | Model, laws, and generators |
| `38d0482` | Generated vectors |
| `037b4f0` | JavaScript implementation |
| `6fa9857` | Rust implementation |
| `cca81f9` | Fuzz and mutation evidence |
| `0171513` | Protocol, pages, and settled ledger |

The final documentation commit adds this report, the progress log, and the roadmap.
No push occurs.

## Blocked

No requested law is false or blocked.
All requested evidence runs complete.
