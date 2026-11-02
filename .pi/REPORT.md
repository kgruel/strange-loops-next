# Step-1 rulings

## Review fixes, round 2

G1–G6 are complete in commits `8a12ba6` and `20d9bcf`.
The final evidence and restored-tree gates pass.
R1–R6, F1, D1–D7, and the six older survivors remain unchanged.
Public `base32` names remain unchanged.

| Fix | Change | Commit |
|---|---|---|
| G1 | Lean and Rust libraries own raw envelope decoding and all-envelope shape checks. JS owns record-input shape checks. | `8a12ba6` |
| G2 | Singleton readers and active JS writers have no outer shape check. Six deliberate faults fail vector replay. | `8a12ba6` |
| G3 | Four vectors combine unknown fields with malformed variants in both orders. Two singleton vectors expose value-first decoding. | `8a12ba6` |
| G4 | Batch prose gives shape, labels, writer values, and previous-record checks in order. JS documents its raw-text boundary. | `8a12ba6`, `20d9bcf` |
| G5 | The proof graph has no outside user of the dead `stripZeros` family. Remove it and its single catalogue entry. | `8a12ba6` |
| G6 | Tracked campaign summaries, D1 lists, mutation summaries, and a tested script reproduce the reported counts. | `20d9bcf` |

### Library boundaries and scope

`Loops.Read` owns raw envelope and draft readers.
`Gen.Read` delegates to these readers.
The catalogue targets only `Loops` source files.
Rust core already has lossless `Json`, so its raw readers need no new dependency.
Rust batch reading retains the existing held-input decode stage between shape checks and draft values.
The callback preserves that order without moving fixture-specific held input into the core.

Singleton record readers use the per-envelope check directly.
Multi-envelope readers check every key before they decode any envelope value.
JS `writeRecord` checks only the envelopes that the selected writer never sees.
`seal` and `writeText` each check the active envelope once.
The fuzz adapter catches the resulting shape refusal outside Cartesian expansion.
Repeated raw `env` members remain the caller's responsibility in JS.
The fuzz adapter reads every occurrence from the original text.
This boundary is not a vector-covered duplicate-member rule; D5 stays open.

The full sequential gate passes before commit `8a12ba6`.
An initial run finds one stale Rust assertion about duplicate unknown keys.
The corrected assertion preserves the former outer shape priority; it adds no duplicate-member rule.
All 21 steps pass on the rerun.
The source tree contains 76 laws, 624 exported theorems, and 6 boundary witnesses.
The corpus contains 334 JSON fixtures: 322 generated fixtures and 12 standard fixtures.
Lean replays 313 inputs; 9 occurred fixtures use separate checks.
JS passes 5,338 vector checks and 18 tests; the fuzz suite passes 44 tests.
Rust passes 127 tests across the complete workspace.
The cheap runner detects all 13 mutations; all 9 catalogue-runner tests pass.
The CI campaign checks 28 cases without mismatches.
Design checks refuse 59 of 60 mutations; the existing allowlisted survivor remains.
The first LSP probes time out; a later probe reports stale imports and unknown identifiers.
The imported definitions exist, and both full gates and catalogue baseline builds pass.
The successful Lean builds, not the stale LSP snapshot, establish compilation.

### G2 deliberate vector failures

Each probe starts from committed source `8a12ba6`.
The probe deletes the library's per-envelope check or moves it after value decoding or validation.
Each probe restores the exact committed source bytes in a `finally` block.
All three restored vector commands pass after their two probes.
The following excerpts retain the actual failing output.
Decoder failures name the affected vectors without printing the expected JSON.
The probe harness initially requires that JSON text; the parent narrows its assertion to the vector failure.
This harness correction changes no production source.

#### LEAN

Command: `cd model && lake exe run --check ../vectors`.

Delete check; exit 1:

```text
309 of 313 vectors reproduced from their inputs
mismatch: ../vectors/record/r6-single-unknown-kind-number.json: input.envs[0].kind: expected text
mismatch: ../vectors/record/r6-single-unknown-missing-kind.json: input.envs[0]: is missing "kind"
mismatch: ../vectors/record/r6-unknown-before-kind.json: expect line 2 differs
    run:  "refused": "kind-empty"
    file: "refused": "envelope-field-unknown"
mismatch: ../vectors/record/r6-unknown-field.json: input: is missing "seed"
```

Reorder check; exit 1:

```text
311 of 313 vectors reproduced from their inputs
mismatch: ../vectors/record/r6-single-unknown-kind-number.json: input.envs[0].kind: expected text
mismatch: ../vectors/record/r6-single-unknown-missing-kind.json: input.envs[0]: is missing "kind"
```

#### RUST

Command: `cd rust && cargo test -p loops-eval --test vectors`.

Delete check; exit 101:

```text
test every_registered_json_and_every_arrival_order ... FAILED
assertion `left == right` failed: all registered files executed
  left: ["\"/Users/kaygee/Code/slnext-step1/rust/eval/../../vectors/record/r6-single-unknown-kind-number.json\": input.envs[0].kind: expected text", "\"/Users/kaygee/Code/slnext-step1/rust/eval/../../vectors/record/r6-single-unknown-missing-kind.json\": input.envs[0]: missing kind", "\"/Users/kaygee/Code/slnext-step1/rust/eval/../../vectors/record/r6-unknown-before-kind.json\": got {\"refused\":\"kind-empty\"} expected {\"refused\":\"envelope-field-unknown\"}", "\"/Users/kaygee/Code/slnext-step1/rust/eval/../../vectors/record/r6-unknown-before-kind.json\": order/variant 0 differs", "\"/Users/kaygee/Code/slnext-step1/rust/eval/../../vectors/record/r6-unknown-field.json\": input: missing seed"]
 right: []
test result: FAILED. 1 passed; 1 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.18s
```

Reorder check; exit 101:

```text
test every_registered_json_and_every_arrival_order ... FAILED
assertion `left == right` failed: all registered files executed
  left: ["\"/Users/kaygee/Code/slnext-step1/rust/eval/../../vectors/record/r6-single-unknown-kind-number.json\": input.envs[0].kind: expected text", "\"/Users/kaygee/Code/slnext-step1/rust/eval/../../vectors/record/r6-single-unknown-missing-kind.json\": input.envs[0]: missing kind"]
 right: []
test result: FAILED. 1 passed; 1 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.18s
```

#### JS

Command: `node interop/js/check.mjs vectors`.

Delete check; exit 1:

```text
record/r6-single-unknown-missing-kind seal refused: got "kind-empty", want "envelope-field-unknown"
record/r6-single-unknown-missing-kind writeText refused: got "kind-empty", want "envelope-field-unknown"
record/r6-unknown-before-kind seal refused: got "kind-empty", want "envelope-field-unknown"
record/r6-unknown-before-kind writeText refused: got "kind-empty", want "envelope-field-unknown"
14 failed, 5324 checks passed
```

Reorder check; exit 1:

```text
record/r6-single-unknown-missing-kind seal refused: got "kind-empty", want "envelope-field-unknown"
record/r6-single-unknown-missing-kind writeText refused: got "kind-empty", want "envelope-field-unknown"
record/r6-unknown-before-kind seal refused: got "kind-empty", want "envelope-field-unknown"
record/r6-unknown-before-kind writeText refused: got "kind-empty", want "envelope-field-unknown"
6 failed, 5332 checks passed
```

### G6 evidence and G7 completion

Commit `20d9bcf` retains three campaign summaries and their D1 mismatch lists under `interop/fuzz/evidence/`.
It retains three mutation summaries under `model/mutate/evidence/`.
These cover the original run, round one, and round two.
`interop/fuzz/summarize.py report` derives their counts without ignored files or raw logs.
Four artifact tests pass.
The importer checks every raw and reduced D1 input and all three answers before removing repeated content.
Each retained mismatch still has its seed, index, family, and reduction statistics.
Each mutation still has its ID, outcome, command statuses, and any generator assertion.
Raw logs and large per-case files remain untracked.

The `step1-3` campaign completes 5,600 cases, with 800 per family.
It reports 4,194 matches, 975 protocol refusals, 389 shared decoder refusals, and 42 D1 mismatches.
All raw and reduced mismatches equal the historical D1 examples.
No other mismatch appears.
The reductions use 3,192 trials and 126 accepted rounds; none reaches its trial limit.
These results do not prove absolute minimality.

The full catalogue completes all 195 entries.
It reports 146 build rejections, 27 vector differences, 16 generator assertion exceptions, and 6 survivors.
Every catalogue ID occurs exactly once.
The survivors equal the six older survivors; D6 remains unapproved.
Both baseline builds pass; initial generation matches the corpus.
No timeout, signal, spawn error, or cleanup error appears.
The source and vector paths restore exactly, and `model/.mutation-run.lock` is absent.
Build rejections are not semantic proof kills; generator exceptions remain a separate outcome.

The final restored-tree run passes all 21 sequential gates before the evidence commit.
Its local logs are `.pi/gates/fixes2-final/`; these logs are not the retained campaign evidence.
The parent sums every Rust suite and confirms 127 passing tests.
The final counts match the baseline counts above.
The generated pages reproduce without a diff.
`ROADMAP.md` reports the current counts and leaves D1–D7 unchanged.
All helpers and long commands finish before this run closes.
No requested fix is blocked, and no push occurs.

## Historical review fixes

F1–F4 are complete.
R1–R6, D1–D7, and the six older mutation survivors remain unchanged.
Public `base32` API and theorem names remain unchanged.
No push occurs.

| Fix | Change | Commits |
|---|---|---|
| F1 | Raw shape preflight precedes all envelope values and labels; typed writer codes exclude shape errors. | `fd341e6`, `3fda645`, `e7c42cc`, `f1b32fb`, `4689a7a` |
| F2 | Scripts derive campaign totals and correct the historical match count. | `4689a7a`, `8130da0`; this report |
| F3 | Eight guard mutations cover canonical text and raw shape order; only the redundant plus guard retires. | `fd341e6`, `e7c42cc`, `f1b32fb`, `4689a7a` |
| F4 | UTC tail loses offset residue; equal-span tests and the offset fixture name recover their intent. | `fd341e6`, `3fda645`, `f1b32fb`, `8130da0` |

The Rust core exposes `envelope::check_keys` and a distinct `ShapeError`.
The JavaScript port exposes `checkEnvelopeKeys`; its harness no longer owns the key policy.
Every batch envelope receives shape checks before any draft value or label.
Any unknown envelope key gives record variants one top-level shape refusal.
Signing seed decoding occurs only after writing succeeds.
The independent review finds one overwritten repeated `env` member in the JS fuzz adapter.
The parent preserves every raw occurrence and adds both-order regression tests.
The reviewer accepts the correction; a separate three-way replay confirms it.
This fix does not add a duplicate-member refusal or settle D5.

The tree contains 76 laws, 629 exported theorems, and 6 boundary witnesses.
It contains 328 JSON fixtures: 316 generated fixtures and 12 standard fixtures.
Lean replays 307 inputs; 9 occurred fixtures use separate checks.
The ledger and regenerated pages show these counts in that historical snapshot.
The ASCII scope states where JS, Rust, and Lean string orders agree.
This snapshot retains the unused `stripZeros` family.
The round-two review removes it after checking the exported proof graph.

Full sequential gates precede each behavior commit.
The first four logs are `.pi/gates/fixes-{model,vectors,js,rust}/`.
The remaining logs are `.pi/gates/fixes-{adapters,evidence,pages}/`.
These runs cover the adapter correction, restored mutation sources, evidence, and final pages.
JavaScript passes 5,322 vector checks and 17 regression tests.
The fuzz suite passes 43 tests; Rust passes 125 tests.
All thirteen cheap mutations compile and fail runtime checks.
All nine catalogue-runner tests pass.
The CI seed checks 28 three-way cases without mismatches.
Design mutations retain the existing single allowlisted survivor.

The `step1-2` campaign checks 5,600 cases, with 800 per family.
It reports 4,212 matches, 947 protocol refusals, 397 shared decoder refusals, and 44 D1 mismatches.
The parent checks every raw and reduced mismatch against the previous D1 input and all three runtime answers.
No new mismatch class appears.
The 196-entry catalogue reports 147 build rejections, 27 vector differences, 16 generator assertion exceptions, and 6 survivors.
These outcomes remain separate; build rejections are not semantic proof kills.
All eight new mutations receive detection in both runners.
No command has a timeout, signal, spawn error, or cleanup error.
Sources and vectors restore, and the lock is absent.

The original run uses local count and report scripts.
Round two replaces their evidence dependency with tracked artifacts and `interop/fuzz/summarize.py`.
The reports preserve earlier snapshots as historical evidence.
The original `step1-1` match count is 4,368, not 3,768.
See `interop/fuzz/REPORT.md` and `model/mutate/REPORT.md` for commands and evidence limits.

No requested fix is blocked.

## Original run

This section records the earlier run and its historical counts and decisions.
The review-fix section above supersedes the affected details.

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
It reports 4,368 matches, 813 protocol refusals, 377 shared decoder refusals, and 42 mismatches.
Shared decoder refusals do not count as agreement.
The parent checks all 42 raw and 42 reduced mismatch artifacts.
All show D1 duplicate-base lens behavior, with Lean and Rust agreeing against JavaScript.
No new mismatch class appears.
Every reduction uses 76 trials and three accepted rounds, below the 80-trial limit.
The total is 3,192 trials; minimality is not proved.
See `interop/fuzz/REPORT.md` and `interop/fuzz/evidence/step1-1/`.

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
See `model/mutate/REPORT.md` and `model/mutate/evidence/step1/summary.json`.

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
- The original run retains `stripZeros` without a real outside user.
  Round two checks the proof graph and removes this dead family.
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
