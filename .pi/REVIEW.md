# Integration review

## Five merges

1. `f6a86a8` combines unread laws, view premises, and typed record IDs.
   Its gates pass without vector changes.
2. `cf9d105` combines bounded IDs with numeric payloads and the gap rulings.
   It adapts fixture IDs and the per-thing heads and latest proofs without widening their premises.
3. `c97d0ef` resolves the CI conflict and aligns fuzz adapters with per-thing heads and spec admission.
   Gap 17 resolves the repeated and empty edited-ID findings; duplicate base IDs remain open.
4. `17bd7d4` resolves four conflicts cumulatively and re-anchors 14 mutants.
   It retains 189 catalogue entries and adds 12 vectors without changing protocol laws.
   An unchanged timeout retry passed its gates.
5. `52aab85` aligns Rust adapters with the merged vectors, numeric rules, heads, and lens behavior.
   It separates fixture readers from the core and corrects native shortest-number midpoint ties.
   The Rust evaluator validates ignored metadata for Unicode without consulting expected answers.

The parent first misread the writer cap as permitting every finite number.
Before the final fifth merge, the parent restored the human ruling: magnitudes above 2^53 − 1 refuse, including fractions.
Finite canonical formatting remains separate from writer acceptance.
The final isolated gates passed; one earlier cleanup timing test passed unchanged on retry.

## Phase 2

Phase 2 is committed as `e2d1cc9`; all 26 isolated gates passed on Node 22 without retries.
The fixed `integrate-1` run covered 5,600 cases: 4,655 matches, 532 matching protocol refusals, 369 decoder refusals, and 44 mismatches.
Decoder refusals are not agreement.
The 44 remaining mismatches concern duplicate base lens IDs; their 76-trial reductions did not hit the 80-trial limit.
The earlier 98 disagreements reduced; 54 scenario cases hit that limit.
Those 54 cases exposed one Rust scenario adapter bug, not 54 distinct bugs.
The fix composes per-thing state and pins it with `vectors/scenario/phase2-thing-state.json`.
All 108 old scenario raw and shrink replays match; 88 lens replays still differ.
The checker fixes preserve exact integers and handle empty heads, explicit null folds, and unsafe collect limits.
Bounded shrinking does not prove absolute minimality.
See [the campaign report](../interop/fuzz/REPORT.md).

## Phase 3

Phase 3 is committed as `08fa702`.
The review narrows prose to theorem premises and marks unimplemented examples as proposed or prototype.
It corrects privacy, index, hash, signature-prefix, and obsolete Rust claims.
All other gates passed on their first run, but the initial design mutant gate failed on a stale quotation.
The parent re-anchored the same mutant intent; the rerun refused 59 of 60, with the same expected survivor.
The final tree retains all 260 vector JSON files unchanged.
The checks include 120 Rust tests, 5,101 JavaScript checks, 14 JavaScript regression tests, and 37 fuzz tests.
The `ci-1` seed checks 28 three-way cases with zero mismatches.
Local gate details are in `.pi/gates/03-review/FINAL.md` and `.pi/gates/03-review/design-mutant-fix.md`.
Stale or inconclusive LSP diagnostics do not establish a clean result.

## Limits

Lean holds the 72 laws, 606 theorems, and six boundary witnesses under their stated premises.
JavaScript and Rust receive checks, not formal equivalence proofs.
There are 260 JSON fixtures, including 248 generated; Lean replays 240 generated fixtures.
The checks do not prove all permutations, cryptographic correctness, or complete JCS.
They do not certify browser accessibility, external links, or official ASD dictionary compliance.
The full mutation run at `08fa7029485648fdc9de642d8c0f19c1dccc3651` completes all 189 entries.
It reports 140 build rejections, 27 vector differences, 16 generator assertion exceptions, and six survivors.
The runner exits 1 for assertions, not timeout or infrastructure failure.
Build rejections are not semantic proof kills, and survival does not prove equivalence.
Clean baseline, restoration, fresh build, and four direct Lean law checks pass.
Isolation is not independently established; a stale pi-lens notice has unknown capture time.
See [the mutation report](../model/mutate/REPORT.md) for the delta, rerun, survivors, and limits.
See the [roadmap](../ROADMAP.md) for human decisions and retained boundaries.

## Final verification

All clean-baseline gate entries pass once on Node 22.23.4.
Model restoration and four direct Lean law checks pass.
Repeated vectors, proof metadata, boundaries, and `out` match HEAD byte for byte; generated deltas are absent.
The separate full mutation experiment exits 1 for generator assertions, not baseline failures.
Local evidence is in `.pi/gates/04-final/RESULTS.md`.
