# Lean model mutation report

## Round 2 review-fix snapshot: `8a12ba6`

The Node 22 run completes all 195 catalogue entries with a 240-second command timeout.
The retained [summary](evidence/mutations-fixes2/summary.json) supports these counts.
Run `python3 interop/fuzz/summarize.py report` from the repository root.
The script derives the outcome, guard, and survivor counts without raw logs.

| Outcome | Count |
|---|---:|
| Rejected by build | 146 |
| Vector differences | 27 |
| Generator assertion exceptions | 16 |
| Survivors | 6 |

The runner exits 1 for generator assertions.
Each error retains its assertion text in the summary.
No command times out, receives a signal, or reports a spawn or cleanup error.
Build rejections are not semantic proof kills.
Generator assertions are not vector-difference kills.
Survival alone proves neither equivalence nor reachability.

The proof graph has no outside user of `stripZeros` or its five lemmas.
The implementation removes that family and retires its sole entry, `wide-time-094`.
[COVERAGE.md](COVERAGE.md) records the reason.
The raw-reader mutations now target `Loops.Read`, not `Gen.Read`.
The catalogue runner accepts only library source paths.
The eight guard mutations remain:

| Mutation | Full-catalogue outcome |
|---|---|
| `step1-base32-reencode` | rejected-by-build |
| `step1-fraction-final-zero` | rejected-by-build |
| `step1-seconds-bound` | rejected-by-build |
| `step1-zone-only-z` | rejected-by-build |
| `step1-envelope-keys-remove` | error |
| `step1-envelope-keys-after-value` | error |
| `step1-draft-keys-after-values` | error |
| `step1-record-keys-after-values` | error |

The six older survivors remain unchanged:

- `extra-families-max-acc`
- `extra-families-min-acc`
- `finish-json-hexdigit`
- `last-spec-tests-conds`
- `wide-families-013`
- `wide-spec-064`

D6 stays unapproved.
Both baseline builds pass; initial generation matches the committed corpus.
The completed run covers exactly the current catalogue IDs.
Source and vector files restore to HEAD, and `model/.mutation-run.lock` is absent.
No other parent-started Lean build or LSP probe runs during the catalogue.
Automatic tooling isolation is not independently established.
The separate G2 probes also fail each implementation's own vector layer after deleting or moving its per-envelope check.

```sh
fnm exec --using 22 node model/mutate/run.mjs --timeout 240 --output /tmp/review-fixes2-mutants.json
python3 interop/fuzz/summarize.py mutation /tmp/review-fixes2-mutants.json mutations-fixes2
```

### Guard and retired mutations

Earlier Step-1 runs at `6fa9857` and `f1b32fb` produced the guard and retirement decisions below; their evidence is not retained.
The cheap CI runner uses the same eight guard replacements.
Every cheap guard mutation compiles and then fails runtime checks.
The full catalogue includes the proof modules, so its detection stages can differ.
Direct JS and Rust tests also pin canonical byte decoding, fraction endings, second bounds, UTC markers, and raw key checks.

The catalogue retires `finish-occurred-stamp-of` and `wide-time-094`.
`finish-occurred-stamp-of` added `if s.toList.contains '+' then none else` before the existing parser call in `Stamp.of?`.
Accepted text contains only decimal digits and the fixed separators `-`, `T`, `:`, `.`, and `Z`.
It cannot contain `+`; R4 already refuses every numeric offset.
Thus the added guard is redundant for accepted instants, and rejected instants still return `none` on both paths.
This is a source-based equivalence interpretation, not a Lean equivalence theorem or a conclusion from survival alone.
`wide-time-094` targeted the removed `stripZeros` family, as described above.

The Step-1 re-anchors remain in the catalogue:

- `wide-envelope-010` changes decoded width from 32 to 31 bytes.
- `wide-time-095` refuses the sole accepted UTC marker.
- `wide-time-096` negates fraction nonemptiness in the new canonical check.
- `coverage-time-instant-` excludes second 59 in `instantParts?`.

The catalogue does not claim exhaustive mutation coverage for the new decoder and instant helpers.

## HISTORICAL integrated snapshot: `08fa7029485648fdc9de642d8c0f19c1dccc3651`

The full catalogue run completes all 189 entries on Node `v22.23.4`, with a 240-second command timeout.

| Outcome | Count |
| --- | ---: |
| Rejected by build | 140 |
| Vector differences | 27 |
| Generator assertion exceptions | 16 |
| Survivors | 6 |

The runner exits 1 because generator assertions fail, not because of timeout or infrastructure failure.
No command times out, receives a signal, or reports a spawn or cleanup error.
A build rejection is not a semantic proof kill.
Survival does not establish equivalence or reachability.

The six survivor IDs match `17bd7d4`.
Four remain unapproved helper candidates: `wide-families-013`, `wide-spec-064`, `extra-families-max-acc`, and `extra-families-min-acc`.
The scoped-equivalence interpretations concern `finish-json-hexdigit` and `last-spec-tests-conds`.
Those interpretations do not follow from the run alone; their boundaries appear below.

At `17bd7d4`, the counts are 140 build rejections, 29 vector differences, 14 assertions, and six survivors.
`spec-source-all-any` and `things-negate-erases` now hit the new `phase2-thing-state` assertion before byte comparison.
A rerun of those two cases and four suspicious build cases reproduces all six outcomes.
The runner's clean baseline and final baseline pass, as does the rerun's final baseline.

Restored tracked model and vector paths match the snapshot, and the mutation lock is absent.
A fresh `lake build --wfail` and direct Lean checks of Things, Families, Lens, and Spec laws pass.
Isolation is not independently established.
A stale pi-lens notice has unknown capture time; the parent runs no explicit Lean or LSP commands during mutation.
The root `README.md` changes only a link outside the checked source paths.
Fresh checks do not establish that all diagnostics are clean.

Build diagnostic markers overlap: 62 type mismatches, zero syntax markers, one unknown identifier, one heartbeat, two recursion-depth markers, and 81 unsolved goals.
A type mismatch can occur in a law; it does not imply a malformed patch.
These markers neither classify cases by majority nor constitute a complete syntax or semantic audit.
The local details are historical provenance only, not retained evidence in the repository.

## HISTORICAL integration scope

The historical tables below record runs on the original `mutants` branch, not the merged model.
Integration starts from `c97d0ef` and merges `0000469`.
The catalogue retains all 189 mutants.
Nine entries move with their definitions to `model/Loops/Fold.lean` or `model/Loops/Id.lean`.
Five numeric replacements now match the safe-whole reader and its current head and accumulator routes.
The head mutation still selects hidden records and reads their fixture numbers.
The accumulator mutations still mark hidden records as readable.
No mutation requires retirement.
Listing and eight runner tests validate the catalogue without running it on the real source.
The run at `17bd7d4` predates Rust and the latest pins.
The old counts, detection sites, and proposed laws are historical evidence only.
The extrema candidates below describe the current safe-whole numeric reader.
They remain unapproved.
No proposed law receives a proof or acceptance in this merge.
The local merged-gate logs are historical provenance only, not retained evidence in the repository.

## HISTORICAL integration run at `17bd7d4`

The full run at `17bd7d4` covered 189 entries.
It found 140 build rejections and 29 vector differences.
It also found 14 generator assertions and six survivors.
The local run logs are historical provenance only, not retained evidence in the repository.
Of the 140 build rejections, 16 had type or elaboration diagnostics.
The other 124 were not independently audited semantic proof kills.
Automated Lean setup-file probes ran concurrently and may have affected shared Lake artifacts.
This is not a full-catalogue result for the final tree.

Four survivors were `wide-families-013`, `wide-spec-064`, `extra-families-max-acc`, and `extra-families-min-acc`.
The two distinct equivalent candidates were `finish-json-hexdigit` and `last-spec-tests-conds`.
These are candidate interpretations, not approved laws.

## HISTORICAL branch counts

| Pass | Mutants | Build gate | Vector difference | Survived | Gen assertion error |
| --- | ---: | ---: | ---: | ---: | ---: |
| Initial catalogue | 189 | 130 | 30 | 16 | 13 |
| Survivor retest | 16 | 1 | 6 | 6 | 3 |
| Combined latest results | 189 | 131 | 36 | 6 | 16 |

The old branch report described the 131 build detections as 130 proof failures and one heartbeat limit.
These historical labels are not independent semantic verdicts.
Ten new cases detect ten initial survivors.
Six survivors remain: two equivalent mutations and four low-level gaps.
The four unapproved candidate laws below concern those gaps.

### Combined counts per file

| File | Mutants | Build gate | Vector difference | Survived | Gen assertion error |
| --- | ---: | ---: | ---: | ---: | ---: |
| `model/Loops/Base32.lean` | 1 | 0 | 0 | 0 | 1 |
| `model/Loops/Batch.lean` | 8 | 2 | 6 | 0 | 0 |
| `model/Loops/Envelope.lean` | 5 | 0 | 1 | 0 | 4 |
| `model/Loops/Families.lean` | 16 | 8 | 5 | 3 | 0 |
| `model/Loops/Fold.lean` | 16 | 14 | 2 | 0 | 0 |
| `model/Loops/Json.lean` | 17 | 9 | 4 | 1 | 3 |
| `model/Loops/Lens.lean` | 12 | 11 | 1 | 0 | 0 |
| `model/Loops/Occurred.lean` | 11 | 10 | 0 | 0 | 1 |
| `model/Loops/Record.lean` | 9 | 4 | 4 | 0 | 1 |
| `model/Loops/Spec.lean` | 63 | 52 | 8 | 2 | 1 |
| `model/Loops/Stored.lean` | 6 | 4 | 2 | 0 | 0 |
| `model/Loops/Things.lean` | 17 | 14 | 3 | 0 | 0 |
| `model/Loops/Time.lean` | 8 | 3 | 0 | 0 | 5 |

## HISTORICAL branch scope

The catalogue contains 189 mutants across all 13 `model/Loops` files.
The baseline commit is `f537fdf` on branch `mutants`.
The catalogue reuses the earlier run's uncommitted work.
Each `before` string matches its HEAD source exactly once.
[COVERAGE.md](COVERAGE.md) lists 182 covered definitions and 46 exclusions.
The exclusions contain no direct eligible operation.
The catalogue retains all eight requested operator groups.

The initial run checks all 189 mutants in sequence.
The second run checks all 16 initial survivors after ten new Gen cases.
The combined counts use each mutant's latest result.
They do not claim a second full-catalogue run.
Each runner restores the source and passes its final baseline build.
No run shares `.lake` with another mutation run.

## HISTORICAL branch result limits

The old branch runner labeled every nonzero build `killed-by-proof`.
That legacy table status means only a build rejection, not a semantic verdict.
The current runner uses `rejected-by-build` and `buildRejectionNeedsAudit`.
The old branch audit described 129 proof failures and one proof heartbeat limit.
These locations alone do not establish semantic counterexamples.
The reported failures include law proofs, an embedded proof, and generator premise proofs.
The old branch audit found no build that failed only from a malformed replacement or an unused binding.

`wide-time-091` reaches Lean's 200000-heartbeat limit in `model/Laws/Time.lean:167`.
This outcome proves neither semantic difference nor equivalence.
It remains a build-gate detection, not a confirmed law counterexample.

A proof script can depend on a definition's shape.
For example, `things-here-last` returns the same record for valid `Forms`, but its proof script fails.
`occurred-open-stop` and `wide-spec-074` compile as executable definitions, then fail in law proofs.
Their tactic and type diagnostics do not make their source patches malformed.

A generator assertion produces `error`, not `killed-by-vector`.
The assertion detects a change before the byte comparison can finish.
The initial run has 13 such errors.
The error table below preserves the exact assertion messages.
No error in these runs indicates a missing tool or an unavailable file.
The mutation command returns exit code 1 when these assertions fail.
This exit does not mean that the clean baseline gates fail.

## HISTORICAL initial survivors

All 16 initial survivors have a classification.
Fourteen expose unpinned behaviour, including four low-level contracts with no current vector route.
Two have scoped-equivalence interpretations at the protocol boundary.
These interpretations do not follow from survival alone.

| Mutant | Site | Classification | Distinguishing case or reason |
| --- | --- | --- | --- |
| `wide-envelope-009` | `model/Loops/Envelope.lean:45` | Unpinned behaviour | `1:x` and `a!:x` must fail the typed-prefix check. |
| `wide-families-013` | `model/Loops/Families.lean:61` | Unpinned low-level behaviour | A missing field changes raw `Sum.on` from zero to one. Current spec routes filter it first. |
| `wide-families-014` | `model/Loops/Families.lean:65` | Unpinned behaviour | Named max must return 5 for readable values 3 and 5. |
| `wide-families-015` | `model/Loops/Families.lean:75` | Unpinned behaviour | Named min must return 3 for readable values 3 and 5. |
| `wide-json-028` | `model/Loops/Json.lean:123` | Unpinned behaviour | The writer must accept -9007199254740991. |
| `wide-spec-063` | `model/Loops/Spec.lean:318` | Unpinned behaviour | A task must match the union of task and note sources. |
| `wide-spec-064` | `model/Loops/Spec.lean:320` | Unpinned low-level behaviour | `Spec.select` must keep a matching record. `Spec.run` does not call this helper. |
| `wide-things-084` | `model/Loops/Things.lean:39` | Unpinned behaviour | A successor can add thing B when it shares thing A with its predecessor. |
| `wide-time-095` | `model/Loops/Time.lean:50` | Unpinned behaviour | The writer must accept offset +23:00. |
| `finish-batch-envthings` | `model/Loops/Batch.lean:84` | Unpinned behaviour | A held record with empty `about` anchors its own thing. |
| `finish-json-hexdigit` | `model/Loops/Json.lean:57` | Equivalent at the protocol boundary | JSON escaping never uses the changed out-of-range default. |
| `finish-occurred-stamp-of` | `model/Loops/Occurred.lean:134` | Unpinned behaviour | A typed emitted stamp must accept +01:00. |
| `finish-stored-write` | `model/Loops/Stored.lean:124` | Unpinned behaviour | An empty kind must take refusal priority over an empty salt. |
| `extra-families-max-acc` | `model/Loops/Families.lean:51` | Unpinned low-level behaviour | Concrete `Max.acc` must read a here record. No current vector calls this accumulator. |
| `extra-families-min-acc` | `model/Loops/Families.lean:55` | Unpinned low-level behaviour | Concrete `Min.acc` must read a here record. No current vector calls this accumulator. |
| `last-spec-tests-conds` | `model/Loops/Spec.lean:228` | Equivalent at the protocol boundary | Field-block reversal preserves every conjunction result. |

### Equivalence boundaries

`hexDigit` differs on indices of 16 or more.
JSON escaping only supplies `n / 16` and `n % 16` when `n < 32`.
Both indices stay below 16, so the changed fallback is unreachable.
This claim does not assert unrestricted helper equality.

`Tests.conds` reversal changes list order but not membership.
All slot consumers combine conditions with associative, commutative three-valued conjunction.
`Cond.all_perm` already proves permutation invariance.
Head slots partition the conditions, then conjoin each partition.
Reversal preserves both partitions' members.
Parsing, refusal order, and `Tests.toJson` do not use the changed order.

`Sum.on` also remains equivalent through current protocol routes.
`Acc.select` only folds records for which `(r.num field).isSome` holds.
The changed missing-number default therefore affects only unguarded low-level calls.
The report keeps this public helper gap visible instead of hiding it in the equivalence count.

## HISTORICAL new Gen cases

Gen writes every new vector.
No vector receives a manual edit.
No new law or protocol definition forms part of this change.

| Vector | Gen owner | Expected result |
| --- | --- | --- |
| `vectors/record/12-negative-exact-boundary.json` | `model/Gen/Records.lean` | The writer accepts -9007199254740991. |
| `vectors/record/13-offset-hour-23.json` | `model/Gen/Records.lean` | The writer accepts +23:00. |
| `vectors/record/35-observer-prefix-start.json` | `model/Gen/Records.lean` | `1:x` yields `observer-not-typed`. |
| `vectors/record/36-observer-prefix-tail.json` | `model/Gen/Records.lean` | `a!:x` yields `observer-not-typed`. |
| `vectors/record/37-empty-salt-envelope-first.json` | `model/Gen/Records.lean` | An empty kind and empty salt yield `kind-empty`. |
| `vectors/spec/run/12-readable-extrema.json` | `model/Gen/Spec.lean` | Min is 3, max is 5, and both unread counts are zero. |
| `vectors/spec/run/13-source-union.json` | `model/Gen/Spec.lean` | One task matches one of two sources and gives count 1. |
| `vectors/realm/10-successor-expands-things.json` | `model/Gen/Realm.lean` | The reader admits both records and refuses neither. |
| `vectors/batch/04-held-self-anchor.json` | `model/Gen/Batch.lean` | The batch accepts a revision of an about-nothing held record. |
| `vectors/fold/count/04-positive-offset-emitted.json` | `model/Gen/Main.lean` | The typed +01:00 emitted stamp gives count 1. |

The extrema case checks both record orders.
The realm case checks both arrival orders.
The typed stamp case differs from a raw envelope timestamp case.
Its `stamp` helper requires a default `by decide` acceptance proof.
The stamp mutant fails this new premise during build, before vector generation.
The raw record writer does not call `Stamp.of?`.

## Proposed laws

These four candidate laws remain unapproved human choices.
This change adds no proofs or vector schema.
The Sum and Spec candidates below also require human decisions.
The extrema candidates use the current safe-whole reader, not the historical shown-only predicate.

In `model/Laws/Families.lean`:

```lean
theorem Sum.on_step_missing (field : String) (s : Int) (r : Record)
    (h : r.num field = none) :
    (Sum.on field).step s r = s

theorem Max.acc_readable (r : Record) :
    Max.acc.readable r = (r.num "n").isSome

theorem Min.acc_readable (r : Record) :
    Min.acc.readable r = (r.num "n").isSome
```

Named extrema vectors call `Max.on` and `Min.on`, not the concrete accumulators.
Direct extrema vectors call `Max.fold` and `Min.fold`.
Adding more inputs to those routes cannot check `Max.acc` or `Min.acc`.

In `model/Laws/Spec.lean`:

```lean
theorem Spec.mem_select (sp : Spec) (xs : List Record) (r : Record) :
    r ∈ sp.select xs ↔ r ∈ xs ∧ sp.takes r = true
```

`Spec.run` passes `sp.takes` directly to each slot.
It does not call `Spec.select`.
The source-union case therefore checks `Spec.takes`, not the unused selection helper.

## Reproduce

From the repository root:

```sh
node model/mutate/run.mjs --list
node model/mutate/run.mjs --timeout 240 --output /tmp/loops-mutants.json
node --test model/mutate/run.test.mjs
```

The mutation command runs the catalogue on the current tree.
The full mutation command returns 1 when generator assertions detect mutants.
Inspect the result categories and logs rather than treating that exit as a baseline failure.

The local initial result is `/tmp/slnext-mutants-brief2-initial.json`.
The survivor retest is `/tmp/slnext-mutants-brief2-retest.json`.
Each result has a sibling `.logs` directory.
These temporary files are historical provenance only, not retained evidence in the repository.
The following tables preserve each outcome and its first detection site.
The catalogue preserves every exact replacement.

## HISTORICAL per-mutant results

The site column names the original mutation location.
The evidence column gives the latest result's first proof diagnostic, vector difference, or generator assertion.
A proof diagnostic is a gate location, not a semantic counterexample.

| Mutant | Site | Initial → latest | Detection or remaining contract |
| --- | --- | --- | --- |
| `things-prev-or` | `model/Loops/Things.lean:79` | killed-by-proof | `model/Laws/Things.lean:200`: Type mismatch: After simplification, term |
| `things-drop-may` | `model/Loops/Things.lean:79` | killed-by-proof | `model/Laws/Things.lean:200`: Type mismatch: After simplification, term |
| `things-drop-erasure` | `model/Loops/Things.lean:60` | killed-by-proof | `model/Laws/Things.lean:79`: Tactic `split` failed: Could not split an `if` or `match` expression in the goal |
| `fold-drop-prev-filter` | `model/Loops/Fold.lean:44` | killed-by-proof | `model/Laws/Fold.lean:180`: Type mismatch |
| `fold-drop-named-guard` | `model/Loops/Fold.lean:46` | killed-by-proof | `model/Laws/Fold.lean:179`: Tactic `split` failed: Could not split an `if` or `match` expression in the goal |
| `spec-unread-duplicates` | `model/Loops/Spec.lean:274` | killed-by-vector | `vectors/spec/run/10-unread-shared-head.json` (1 files). |
| `spec-below-time-inclusive` | `model/Loops/Spec.lean:178` | killed-by-proof | `model/Laws/Spec.lean:53`: typeclass instance problem is stuck |
| `spec-atleast-time-strict` | `model/Loops/Spec.lean:172` | killed-by-proof | `model/Laws/Spec.lean:53`: typeclass instance problem is stuck |
| `spec-source-all-any` | `model/Loops/Spec.lean:316` | killed-by-vector | `vectors/scenario/01-decision.json` (11 files). |
| `families-unknown-no` | `model/Loops/Families.lean:114` | killed-by-proof | `model/Laws/Families.lean:294`: unsolved goals |
| `families-drop-readable` | `model/Loops/Families.lean:127` | killed-by-proof | `model/Laws/Families.lean:307`: Tactic `rewrite` failed: Did not find an occurrence of the pattern |
| `families-unread-zero` | `model/Loops/Families.lean:128` | killed-by-proof | `model/Laws/Families.lean:308`: Tactic `rewrite` failed: Did not find an occurrence of the pattern |
| `things-here-last` | `model/Loops/Things.lean:54` | killed-by-proof | `model/Laws/Things.lean:62`: Application type mismatch: The argument |
| `things-no-self-anchor` | `model/Loops/Things.lean:35` | killed-by-proof | `model/Laws/Spec.lean:284`: Tactic `simp` failed with a nested error: |
| `things-negate-erases` | `model/Loops/Things.lean:50` | killed-by-vector | `vectors/realm/01-erased-without-record-is-withheld.json` (10 files). |
| `fold-winner-last` | `model/Loops/Fold.lean:54` | killed-by-proof | `model/Laws/Families.lean:227`: Tactic `subst` failed: invalid equality proof, it is not of the form (x = t) or (t = x) |
| `fold-insert-nonstrict` | `model/Loops/Fold.lean:30` | killed-by-proof | `model/Laws/Fold.lean:72`: Type mismatch |
| `fold-count-zero` | `model/Loops/Fold.lean:16` | killed-by-proof | `model/Laws/Fold.lean:37`: omega could not prove the goal: |
| `spec-drop-head-choice` | `model/Loops/Spec.lean:268` | killed-by-proof | `model/Laws/Spec.lean:439`: Application type mismatch: The argument |
| `spec-drop-collect-choice` | `model/Loops/Spec.lean:281` | killed-by-proof | `model/Laws/Spec.lean:325`: unsolved goals |
| `spec-collect-unknown-yes` | `model/Loops/Spec.lean:282` | killed-by-proof | `model/Laws/Spec.lean:498`: Application type mismatch: The argument |
| `spec-below-number-inclusive` | `model/Loops/Spec.lean:177` | killed-by-proof | `model/Laws/Spec.lean:46`: omega could not prove the goal: |
| `stored-salt-check` | `model/Loops/Stored.lean:72` | killed-by-proof | `model/Loops/Stored.lean:98`: unsolved goals |
| `stored-commit-order` | `model/Loops/Stored.lean:26` | killed-by-vector | `vectors/batch/01-two-labels.json` (22 files). |
| `stored-refusal-last` | `model/Loops/Stored.lean:120` | killed-by-proof | `model/Laws/Write.lean:47`: Tactic `rfl` failed: The left-hand side |
| `record-newer-id-flip` | `model/Loops/Record.lean:80` | killed-by-proof | `model/Laws/Order.lean:72`: Application type mismatch: The argument |
| `record-num-hidden` | `model/Loops/Record.lean:124` | killed-by-vector | `vectors/spec/run/11-hidden-numbers.json` (1 files). |
| `occurred-month-end` | `model/Loops/Occurred.lean:70` | killed-by-proof | `model/Gen/Spec.lean:186`: could not synthesize default value for parameter 'ok' using tactics |
| `occurred-open-stop` | `model/Loops/Occurred.lean:40` | killed-by-proof | `model/Laws/Time.lean:43`: too many variable names provided |
| `occurred-qualifier-and` | `model/Loops/Occurred.lean:53` | error | occurred/03-qualifiers: 2009? refused |
| `record-num-drop-int` | `model/Loops/Record.lean:126` | killed-by-vector | `vectors/spec/run/01-tasks.json` (6 files). |
| `wide-batch-003` | `model/Loops/Batch.lean:37` | killed-by-vector | `vectors/batch/01-two-labels.json` (6 files). |
| `wide-batch-004` | `model/Loops/Batch.lean:51` | killed-by-proof | `model/Laws/Batch.lean:55`: Application type mismatch: The argument |
| `wide-batch-005` | `model/Loops/Batch.lean:64` | killed-by-vector | `vectors/batch/01-two-labels.json` (8 files). |
| `wide-batch-006` | `model/Loops/Batch.lean:73` | killed-by-vector | `vectors/batch/01-two-labels.json` (8 files). |
| `wide-batch-007` | `model/Loops/Batch.lean:107` | killed-by-vector | `vectors/batch/01-two-labels.json` (11 files). |
| `wide-envelope-008` | `model/Loops/Envelope.lean:40` | error | record/01-minimal: unexpectedly refused: observer-not-typed |
| `wide-envelope-009` | `model/Loops/Envelope.lean:45` | survived → error | record/35-observer-prefix-start: expected a refusal |
| `wide-envelope-010` | `model/Loops/Envelope.lean:51` | error | record/02-full-envelope: unexpectedly refused: prev-not-record-id |
| `wide-envelope-011` | `model/Loops/Envelope.lean:56` | error | record/01-minimal: unexpectedly refused: kind-empty |
| `wide-families-012` | `model/Loops/Families.lean:28` | killed-by-proof | `model/Laws/Families.lean:74`: Type mismatch: After simplification, term |
| `wide-families-013` | `model/Loops/Families.lean:61` | survived | Unpinned: `Sum.on_step_missing`; guarded protocol routes remain equivalent. |
| `wide-families-014` | `model/Loops/Families.lean:65` | survived → killed-by-vector | `vectors/spec/run/12-readable-extrema.json` (1 files). |
| `wide-families-015` | `model/Loops/Families.lean:75` | survived → killed-by-vector | `vectors/spec/run/12-readable-extrema.json` (1 files). |
| `wide-families-016` | `model/Loops/Families.lean:90` | killed-by-vector | `vectors/fold/heads/01-max-follows-prev.json` (3 files). |
| `wide-families-017` | `model/Loops/Families.lean:133` | killed-by-proof | `model/Laws/Families.lean:164`: Tactic `decide` proved that the proposition |
| `wide-fold-019` | `model/Loops/Fold.lean:83` | killed-by-proof | `model/Laws/Numeric.lean:56`: Type mismatch |
| `wide-fold-020` | `model/Loops/Fold.lean:89` | killed-by-proof | `model/Laws/Numeric.lean:101`: unsolved goals |
| `wide-json-021` | `model/Loops/Json.lean:25` | killed-by-proof | `model/Laws/Record.lean:96`: `simp` made no progress |
| `wide-json-022` | `model/Loops/Json.lean:35` | killed-by-proof | `model/Laws/Record.lean:37`: unsolved goals |
| `wide-json-023` | `model/Loops/Json.lean:45` | killed-by-proof | `model/Laws/Record.lean:182`: Type mismatch |
| `wide-json-025` | `model/Loops/Json.lean:61` | killed-by-vector | `vectors/record/05-unicode.json` (1 files). |
| `wide-json-026` | `model/Loops/Json.lean:78` | killed-by-vector | `vectors/record/04-member-order.json` (4 files). |
| `wide-json-027` | `model/Loops/Json.lean:100` | killed-by-proof | `model/Laws/Write.lean:66`: Invalid projection: Projections extract constructor fields for one-constructor inductive types. The expression |
| `wide-json-028` | `model/Loops/Json.lean:123` | survived → error | record/12-negative-exact-boundary: unexpectedly refused: number-out-of-range |
| `wide-json-029` | `model/Loops/Json.lean:130` | error | record/29-number-out-of-range: expected a refusal |
| `wide-json-030` | `model/Loops/Json.lean:134` | error | record/29-number-out-of-range: expected a refusal |
| `wide-lens-031` | `model/Loops/Lens.lean:25` | killed-by-proof | `model/Laws/Lens.lean:34`: unsolved goals |
| `wide-lens-032` | `model/Loops/Lens.lean:27` | killed-by-proof | `model/Laws/Lens.lean:29`: unsolved goals |
| `wide-lens-033` | `model/Loops/Lens.lean:32` | killed-by-proof | `model/Laws/Lens.lean:29`: unsolved goals |
| `wide-lens-034` | `model/Loops/Lens.lean:38` | killed-by-proof | `model/Laws/Lens.lean:83`: unsolved goals |
| `wide-lens-036` | `model/Loops/Lens.lean:56` | killed-by-vector | `vectors/lens/section/07-unclosed.json` (1 files). |
| `wide-lens-037` | `model/Loops/Lens.lean:80` | killed-by-proof | `model/Laws/Lens.lean:116`: unsolved goals |
| `wide-lens-038` | `model/Loops/Lens.lean:84` | killed-by-proof | `model/Laws/Lens.lean:136`: unsolved goals |
| `wide-lens-039` | `model/Loops/Lens.lean:88` | killed-by-proof | `model/Laws/Lens.lean:138`: unsolved goals |
| `wide-lens-041` | `model/Loops/Lens.lean:95` | killed-by-proof | `model/Laws/Lens.lean:156`: unsolved goals |
| `wide-occurred-042` | `model/Loops/Occurred.lean:84` | killed-by-proof | `model/Laws/Time.lean:159`: unsolved goals |
| `wide-occurred-043` | `model/Loops/Occurred.lean:112` | killed-by-proof | `model/Laws/Time.lean:145`: unsolved goals |
| `wide-record-044` | `model/Loops/Record.lean:66` | killed-by-vector | `vectors/fold/count/02-three.json` (58 files). |
| `wide-record-049` | `model/Loops/Record.lean:118` | error | fold/select/01-payload-test-on-withheld: the test as written and as run disagree on r:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaqq |
| `wide-record-050` | `model/Loops/Record.lean:131` | killed-by-proof | `model/Laws/Families.lean:204`: Type mismatch |
| `wide-spec-051` | `model/Loops/Spec.lean:65` | killed-by-proof | `model/Laws/Parse.lean:326`: Tactic `decide` failed to reduce |
| `wide-spec-052` | `model/Loops/Spec.lean:90` | killed-by-vector | `vectors/spec/parse/27-env-text-as-number.json` (3 files). |
| `wide-spec-053` | `model/Loops/Spec.lean:106` | killed-by-proof | `model/Laws/Parse.lean:326`: Tactic `decide` proved that the proposition |
| `wide-spec-054` | `model/Loops/Spec.lean:120` | error | fold/select/01-payload-test-on-withheld: its test is refused (where-invalid) |
| `wide-spec-055` | `model/Loops/Spec.lean:161` | killed-by-proof | `model/Laws/Spec.lean:248`: unsolved goals |
| `wide-spec-056` | `model/Loops/Spec.lean:186` | killed-by-proof | `model/Laws/Spec.lean:37`: Not a definitional equality: the left-hand side |
| `wide-spec-057` | `model/Loops/Spec.lean:200` | killed-by-proof | `model/Laws/Spec.lean:219`: Tactic `rfl` failed: The left-hand side |
| `wide-spec-059` | `model/Loops/Spec.lean:254` | killed-by-proof | `model/Laws/Spec.lean:469`: Application type mismatch: The argument |
| `wide-spec-061` | `model/Loops/Spec.lean:263` | killed-by-proof | `model/Laws/Spec.lean:413`: unsolved goals |
| `wide-spec-062` | `model/Loops/Spec.lean:288` | killed-by-vector | `vectors/spec/run/01-tasks.json` (4 files). |
| `wide-spec-063` | `model/Loops/Spec.lean:318` | survived → killed-by-vector | `vectors/spec/run/13-source-union.json` (1 files). |
| `wide-spec-064` | `model/Loops/Spec.lean:320` | survived | Unpinned: `Spec.mem_select`. |
| `wide-spec-066` | `model/Loops/Spec.lean:407` | killed-by-proof | `model/Laws/Parse.lean:418`: unsolved goals |
| `wide-spec-067` | `model/Loops/Spec.lean:413` | killed-by-proof | `model/Laws/Parse.lean:421`: unsolved goals |
| `wide-spec-068` | `model/Loops/Spec.lean:434` | killed-by-proof | `model/Laws/Parse.lean:573`: omega could not prove the goal: |
| `wide-spec-069` | `model/Loops/Spec.lean:442` | killed-by-vector | `vectors/spec/parse/64-slot-argument-before-where.json` (1 files). |
| `wide-spec-070` | `model/Loops/Spec.lean:489` | killed-by-proof | `model/Laws/Parse.lean:458`: unsolved goals |
| `wide-spec-073` | `model/Loops/Spec.lean:555` | killed-by-proof | `model/Laws/Parse.lean:195`: unsolved goals |
| `wide-spec-074` | `model/Loops/Spec.lean:561` | killed-by-proof | `model/Laws/Parse.lean:81`: Application type mismatch: The argument |
| `wide-spec-076` | `model/Loops/Spec.lean:572` | killed-by-proof | `model/Laws/Parse.lean:123`: unsolved goals |
| `wide-stored-081` | `model/Loops/Stored.lean:130` | killed-by-proof | `model/Laws/Record.lean:30`: unsolved goals |
| `wide-things-083` | `model/Loops/Things.lean:37` | killed-by-proof | `model/Laws/Spec.lean:284`: Tactic `rfl` failed: The left-hand side |
| `wide-things-084` | `model/Loops/Things.lean:39` | survived → killed-by-vector | `vectors/realm/10-successor-expands-things.json` (1 files). |
| `wide-time-091` | `model/Loops/Time.lean:19` | killed-by-proof | `model/Laws/Time.lean:167`: 200000-heartbeat limit; semantic verdict remains open. |
| `wide-time-092` | `model/Loops/Time.lean:22` | error | record/24-emitted-no-such-day: expected a refusal |
| `wide-time-093` | `model/Loops/Time.lean:26` | error | record/24-emitted-no-such-day: expected a refusal |
| `wide-time-094` | `model/Loops/Time.lean:42` | killed-by-proof | `model/Laws/Time.lean:216`: unsolved goals |
| `wide-time-095` | `model/Loops/Time.lean:50` | survived → error | record/13-offset-hour-23: unexpectedly refused: emitted-not-rfc3339 |
| `wide-time-096` | `model/Loops/Time.lean:60` | killed-by-proof | `model/Gen/Main.lean:51`: could not synthesize default value for parameter 'ok' using tactics |
| `wide-time-097` | `model/Loops/Time.lean:79` | error | record/01-minimal: unexpectedly refused: emitted-not-rfc3339 |
| `coverage-json-json-alldistinct` | `model/Loops/Json.lean:105` | killed-by-proof | `model/Laws/Parse.lean:162`: unsolved goals |
| `coverage-json-json-membersdistinct` | `model/Loops/Json.lean:109` | killed-by-proof | `model/Laws/Parse.lean:184`: Insufficient number of fields for `⟨...⟩` constructor: Constructor `Eq.refl` does not have explicit fields, but 2 were provided |
| `coverage-spec-parsearg` | `model/Loops/Spec.lean:349` | killed-by-proof | `model/Laws/Parse.lean:66`: Type mismatch: After simplification, term |
| `coverage-spec-parsebound` | `model/Loops/Spec.lean:362` | killed-by-proof | `model/Laws/Parse.lean:106`: Tactic `subst` failed: did not find equation for eliminating 'hty' |
| `coverage-spec-parseop` | `model/Loops/Spec.lean:368` | killed-by-proof | `model/Laws/Parse.lean:123`: unsolved goals |
| `coverage-spec-parsewhere` | `model/Loops/Spec.lean:394` | killed-by-proof | `model/Laws/Parse.lean:542`: Application type mismatch: The argument |
| `coverage-spec-slotfollow` | `model/Loops/Spec.lean:426` | killed-by-proof | `model/Laws/Parse.lean:418`: unsolved goals |
| `coverage-spec-parseslot` | `model/Loops/Spec.lean:458` | killed-by-proof | `model/Laws/Parse.lean:418`: unsolved goals |
| `coverage-spec-parsekinds` | `model/Loops/Spec.lean:473` | killed-by-proof | `model/Laws/Parse.lean:617`: Application type mismatch: The argument |
| `coverage-spec-sourcestore` | `model/Loops/Spec.lean:480` | killed-by-proof | `model/Laws/Parse.lean:457`: unsolved goals |
| `coverage-spec-json-repeatin` | `model/Loops/Spec.lean:514` | killed-by-proof | `model/Laws/Parse.lean:162`: unsolved goals |
| `coverage-spec-json-repeatmember` | `model/Loops/Spec.lean:520` | killed-by-proof | `model/Laws/Parse.lean:175`: Tactic `introN` failed: There are no additional binders or `let` bindings in the goal to introduce |
| `coverage-occurred-span-closed-` | `model/Loops/Occurred.lean:89` | killed-by-proof | `model/Gen/Scenario.lean:34`: could not synthesize default value for parameter 'ok' using tactics |
| `coverage-occurred-between` | `model/Loops/Occurred.lean:107` | killed-by-proof | `model/Laws/Time.lean:151`: unsolved goals |
| `coverage-time-instant-` | `model/Loops/Time.lean:72` | error | record/09-leap-second: unexpectedly refused: emitted-not-rfc3339 |
| `coverage-spec-slottests` | `model/Loops/Spec.lean:451` | killed-by-proof | `model/Laws/Parse.lean:427`: unsolved goals |
| `coverage-spec-sourcekinds` | `model/Loops/Spec.lean:484` | killed-by-proof | `model/Laws/Parse.lean:464`: unsolved goals |
| `coverage-spec-specslots` | `model/Loops/Spec.lean:535` | killed-by-proof | `model/Laws/Parse.lean:689`: `simp` made no progress |
| `coverage-base32-bit-order` | `model/Loops/Base32.lean:14` | error | self-check failed: base32: , my, m33a, m33pm, m33pmrq, m33pmrug, m33pmrugjy ≠ , my, mzxq, mzxw6, mzxw6yq, mzxw6ytb, mzxw6ytboi |
| `finish-batch-subst` | `model/Loops/Batch.lean:43` | killed-by-proof | `model/Laws/Batch.lean:28`: unsolved goals |
| `finish-batch-envthings` | `model/Loops/Batch.lean:84` | survived → killed-by-vector | `vectors/batch/04-held-self-anchor.json` (1 files). |
| `finish-batch-checkprev` | `model/Loops/Batch.lean:94` | killed-by-vector | `vectors/batch/16-refusal-order.json` (1 files). |
| `finish-envelope-env-tojson` | `model/Loops/Envelope.lean:33` | killed-by-vector | `vectors/batch/01-two-labels.json` (5 files). |
| `finish-families-acc-fold` | `model/Loops/Families.lean:41` | killed-by-proof | `model/Laws/Families.lean:106`: Type mismatch |
| `finish-families-tri-ofbool` | `model/Loops/Families.lean:101` | killed-by-proof | `model/Laws/Spec.lean:133`: unsolved goals |
| `finish-fold-count-fold` | `model/Loops/Fold.lean:18` | killed-by-proof | `model/Laws/Fold.lean:23`: unsolved goals |
| `finish-fold-insertrec` | `model/Loops/Fold.lean:35` | killed-by-proof | `model/Laws/Fold.lean:117`: Type mismatch |
| `finish-fold-latestby-fold` | `model/Loops/Fold.lean:50` | killed-by-proof | `model/Laws/Fold.lean:27`: unsolved goals |
| `finish-fold-latestby-others` | `model/Loops/Fold.lean:57` | killed-by-proof | `model/Laws/Families.lean:230`: Type mismatch: After simplification, term |
| `finish-fold-latest-others` | `model/Loops/Fold.lean:69` | killed-by-vector | `vectors/fold/latest/01-chain.json` (4 files). |
| `finish-fold-sum-fold` | `model/Loops/Fold.lean:79` | killed-by-proof | `model/Laws/Numeric.lean:29`: unsolved goals |
| `finish-fold-max-fold` | `model/Loops/Fold.lean:85` | killed-by-proof | `model/Laws/Numeric.lean:49`: unsolved goals |
| `finish-fold-min-fold` | `model/Loops/Fold.lean:91` | killed-by-proof | `model/Laws/Numeric.lean:85`: unsolved goals |
| `finish-json-sortby` | `model/Loops/Json.lean:50` | killed-by-proof | `model/Laws/Record.lean:223`: Type mismatch |
| `finish-json-hexdigit` | `model/Loops/Json.lean:57` | survived | Equivalent: escape indices stay below 16. |
| `finish-json-json-canonall` | `model/Loops/Json.lean:88` | killed-by-vector | `vectors/batch/01-two-labels.json` (7 files). |
| `finish-json-json-canonmembers` | `model/Loops/Json.lean:92` | killed-by-proof | `model/Laws/Record.lean:288`: unsolved goals |
| `finish-occurred-halves` | `model/Loops/Occurred.lean:95` | killed-by-proof | `model/Laws/Time.lean:86`: unsolved goals |
| `finish-occurred-stamp-of` | `model/Loops/Occurred.lean:134` | survived → killed-by-proof | `model/Gen/Main.lean:96`: could not synthesize default value for parameter 'ok' using tactics |
| `finish-occurred-claim-of` | `model/Loops/Occurred.lean:146` | killed-by-proof | `model/Laws/Parse.lean:54`: `simp` made no progress |
| `finish-record-digestdigits` | `model/Loops/Record.lean:60` | killed-by-proof | `model/Laws/Order.lean:37`: unsolved goals |
| `finish-record-record-span` | `model/Loops/Record.lean:72` | killed-by-vector | `vectors/fold/latest-by/12-emitted-without-occurred.json` (3 files). |
| `finish-spec-field-name` | `model/Loops/Spec.lean:111` | killed-by-proof | `model/Laws/Parse.lean:326`: Tactic `decide` failed to reduce |
| `finish-spec-field-onenvelope` | `model/Loops/Spec.lean:115` | killed-by-proof | `model/Laws/Spec.lean:214`: unsolved goals |
| `finish-spec-arg-matches` | `model/Loops/Spec.lean:165` | killed-by-proof | `model/Laws/Spec.lean:84`: unsolved goals |
| `finish-spec-cond-eval` | `model/Loops/Spec.lean:195` | killed-by-proof | `model/Laws/Spec.lean:79`: Tactic `rfl` failed: The left-hand side |
| `finish-spec-cond-all` | `model/Loops/Spec.lean:208` | killed-by-proof | `model/Laws/Spec.lean:225`: Type mismatch |
| `finish-spec-chosen` | `model/Loops/Spec.lean:261` | killed-by-proof | `model/Laws/Spec.lean:409`: Tactic `cases` failed with a nested error: |
| `finish-spec-memberpath` | `model/Loops/Spec.lean:378` | killed-by-vector | `vectors/spec/parse/13-two-fold-types.json` (40 files). |
| `finish-spec-slottype` | `model/Loops/Spec.lean:418` | killed-by-proof | `model/Laws/Parse.lean:418`: unsolved goals |
| `finish-spec-parsesource` | `model/Loops/Spec.lean:496` | killed-by-proof | `model/Laws/Parse.lean:457`: unsolved goals |
| `finish-spec-json-repeatat` | `model/Loops/Spec.lean:508` | killed-by-proof | `model/Laws/Parse.lean:152`: Type mismatch |
| `finish-spec-specvertex` | `model/Loops/Spec.lean:526` | killed-by-proof | `model/Laws/Parse.lean:486`: unsolved goals |
| `finish-spec-specsources` | `model/Loops/Spec.lean:531` | killed-by-proof | `model/Laws/Parse.lean:486`: unsolved goals |
| `finish-spec-spec-ofobject` | `model/Loops/Spec.lean:542` | killed-by-proof | `model/Laws/Parse.lean:486`: unsolved goals |
| `finish-spec-arg-tojson` | `model/Loops/Spec.lean:567` | killed-by-proof | `model/Laws/Parse.lean:75`: unsolved goals |
| `finish-spec-slot-tojson` | `model/Loops/Spec.lean:592` | killed-by-proof | `model/Laws/Parse.lean:406`: unsolved goals |
| `finish-spec-source-tojson` | `model/Loops/Spec.lean:596` | killed-by-proof | `model/Laws/Parse.lean:457`: unsolved goals |
| `finish-stored-stored-commit` | `model/Loops/Stored.lean:48` | killed-by-proof | `model/Laws/Record.lean:23`: unsolved goals |
| `finish-stored-write` | `model/Loops/Stored.lean:124` | survived → killed-by-vector | `vectors/record/37-empty-salt-envelope-first.json` (1 files). |
| `finish-things-idsof` | `model/Loops/Things.lean:47` | killed-by-proof | `model/Laws/Things.lean:31`: unsolved goals |
| `finish-things-refusalof` | `model/Loops/Things.lean:83` | killed-by-proof | `model/Laws/Things.lean:207`: `simp` made no progress |
| `finish-things-admit` | `model/Loops/Things.lean:88` | killed-by-proof | `model/Laws/Things.lean:172`: Type mismatch |
| `finish-things-statein` | `model/Loops/Things.lean:98` | killed-by-proof | `model/Laws/Things.lean:229`: Type mismatch |
| `extra-lens-apply` | `model/Loops/Lens.lean:100` | killed-by-proof | `model/Laws/Lens.lean:225`: unsolved goals |
| `extra-spec-parsefield` | `model/Loops/Spec.lean:387` | killed-by-proof | `model/Laws/Parse.lean:529`: Application type mismatch: The argument |
| `extra-lens-render` | `model/Loops/Lens.lean:47` | killed-by-proof | `model/Laws/Lens.lean:85`: Tactic `rewrite` failed: Did not find an occurrence of the pattern |
| `extra-lens-diff` | `model/Loops/Lens.lean:91` | killed-by-proof | `model/Laws/Lens.lean:137`: `simp` made no progress |
| `extra-fold-latest-winner` | `model/Loops/Fold.lean:67` | killed-by-vector | `vectors/fold/latest/02-fork.json` (2 files). |
| `extra-occurred-span-before` | `model/Loops/Occurred.lean:48` | killed-by-proof | `model/Laws/Time.lean:52`: Application type mismatch: The argument |
| `extra-record-addressed` | `model/Loops/Record.lean:87` | killed-by-proof | `model/Laws/Fold.lean:187`: Application type mismatch: The argument |
| `extra-things-thingsof` | `model/Loops/Things.lean:42` | killed-by-proof | `model/Laws/Things.lean:233`: Type mismatch |
| `extra-things-settle` | `model/Loops/Things.lean:63` | killed-by-proof | `model/Laws/Things.lean:140`: Tactic `rewrite` failed: Did not find an occurrence of the pattern |
| `extra-things-perthing` | `model/Loops/Things.lean:101` | killed-by-vector | `vectors/fold/latest-by/09-converge.json` (11 files). |
| `extra-spec-shownids` | `model/Loops/Spec.lean:257` | killed-by-proof | `model/Laws/Spec.lean:438`: Application type mismatch: The argument |
| `extra-spec-spec-run` | `model/Loops/Spec.lean:328` | killed-by-vector | `vectors/scenario/01-decision.json` (12 files). |
| `extra-spec-tests-tojson` | `model/Loops/Spec.lean:578` | killed-by-proof | `model/Laws/Parse.lean:363`: Type mismatch: After simplification, term |
| `extra-spec-spec-tojson` | `model/Loops/Spec.lean:602` | killed-by-proof | `model/Laws/Parse.lean:486`: unsolved goals |
| `extra-families-sum-acc` | `model/Loops/Families.lean:47` | killed-by-vector | `vectors/fold/select/01-payload-test-on-withheld.json` (10 files). |
| `extra-families-max-acc` | `model/Loops/Families.lean:51` | survived | Unpinned: `Max.acc_readable`. |
| `extra-families-min-acc` | `model/Loops/Families.lean:55` | survived | Unpinned: `Min.acc_readable`. |
| `last-families-count-acc` | `model/Loops/Families.lean:44` | killed-by-vector | `vectors/fold/select/01-payload-test-on-withheld.json` (14 files). |
| `last-families-tri-refines` | `model/Loops/Families.lean:104` | killed-by-proof | `model/Laws/Families.lean:290`: `simp` made no progress |
| `last-things-forms` | `model/Loops/Things.lean:68` | killed-by-proof | `model/Laws/Things.lean:95`: Application type mismatch: The argument |
| `last-things-envonly` | `model/Loops/Things.lean:74` | killed-by-proof | `model/Laws/Things.lean:258`: Type mismatch |
| `last-spec-tests-conds` | `model/Loops/Spec.lean:228` | survived | Equivalent: conjunction preserves permutation. |
| `last-json-utf16` | `model/Loops/Json.lean:28` | killed-by-proof | `model/Laws/Record.lean:117`: Application type mismatch: The argument |
| `last-json-quote` | `model/Loops/Json.lean:73` | killed-by-vector | `vectors/batch/01-two-labels.json` (30 files). |

## HISTORICAL generator assertion errors

These assertions detect changed behaviour before the vector comparison completes.

| Mutant | Exact assertion |
| --- | --- |
| `occurred-qualifier-and` | `uncaught exception: occurred/03-qualifiers: 2009? refused` |
| `wide-envelope-008` | `uncaught exception: record/01-minimal: unexpectedly refused: observer-not-typed` |
| `wide-envelope-009` | `uncaught exception: record/35-observer-prefix-start: expected a refusal` |
| `wide-envelope-010` | `uncaught exception: record/02-full-envelope: unexpectedly refused: prev-not-record-id` |
| `wide-envelope-011` | `uncaught exception: record/01-minimal: unexpectedly refused: kind-empty` |
| `wide-json-028` | `uncaught exception: record/12-negative-exact-boundary: unexpectedly refused: number-out-of-range` |
| `wide-json-029` | `uncaught exception: record/29-number-out-of-range: expected a refusal` |
| `wide-json-030` | `uncaught exception: record/29-number-out-of-range: expected a refusal` |
| `wide-record-049` | `uncaught exception: fold/select/01-payload-test-on-withheld: the test as written and as run disagree on r:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaqq` |
| `wide-spec-054` | `uncaught exception: fold/select/01-payload-test-on-withheld: its test is refused (where-invalid)` |
| `wide-time-092` | `uncaught exception: record/24-emitted-no-such-day: expected a refusal` |
| `wide-time-093` | `uncaught exception: record/24-emitted-no-such-day: expected a refusal` |
| `wide-time-095` | `uncaught exception: record/13-offset-hour-23: unexpectedly refused: emitted-not-rfc3339` |
| `wide-time-097` | `uncaught exception: record/01-minimal: unexpectedly refused: emitted-not-rfc3339` |
| `coverage-time-instant-` | `uncaught exception: record/09-leap-second: unexpectedly refused: emitted-not-rfc3339` |
| `coverage-base32-bit-order` | `uncaught exception: self-check failed: base32: , my, m33a, m33pm, m33pmrq, m33pmrug, m33pmrugjy ≠ , my, mzxq, mzxw6, mzxw6yq, mzxw6ytb, mzxw6ytboi` |

## HISTORICAL branch final gates

| Command | Result |
| --- | --- |
| `lake build --wfail` | Pass; 72 jobs. |
| `lake exe gen ../vectors` | Pass; 184 vectors. |
| `lake exe proofs ../design/laws/proofs.json` | Pass; 549 theorems. |
| `lake exe boundaries ../design/laws/boundaries.json` | Pass; six boundaries. |
| `lake exe run --check ../vectors` | Pass; 176 of 176 runnable vectors. |
| `node design/build.mjs` | Pass. |
| `node design/mutants.mjs` | Pass; 51 of 52 refused, one listed survivor. |
| `node interop/js/check.mjs vectors` | Pass; 4933 checks. |
| `node --test model/mutate/run.test.mjs` | Pass; seven tests. |
| Protected-source diff | No changes in `model/Loops`, `model/Laws`, `interop/js`, or `protocol`. |

The JS implementation agrees with all ten new vectors.
No JS change is necessary.
The clean baseline passes every gate after the retest restores the source.
The Lean replay command excludes the `occurred` and `standard` layers by design.
The design mutation suite remains separate from the Lean catalogue.
The proof and boundary artifacts remain unchanged.
