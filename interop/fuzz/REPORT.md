# Differential fuzz report

## Scope

This report tracks the current ratchets-1 JS, Lean, and Rust campaign.
It also records earlier campaigns as historical results.
The harness covers record, fold, spec, realm, scenario, batch, and lens inputs.

## Current ratchets-1 three-way campaign

The Node 22 run checks 5,600 cases, with 800 per family.
It completes in 70.56 seconds and exits 0.
It reports 3,889 matches, 1,349 protocol refusals, 362 shared decoder refusals, and zero mismatches.
It uses 88 chunks and no shrink trials.
Shared decoder refusals do not establish protocol agreement.
The [campaign summary](evidence/ratchets-1/summary.json) contains the retained evidence.

| Family | Match | Protocol refusal | Decoder refusal | Mismatch |
|---|---:|---:|---:|---:|
| record | 246 | 537 | 17 | 0 |
| fold | 694 | 0 | 106 | 0 |
| spec | 561 | 194 | 45 | 0 |
| realm | 705 | 0 | 95 | 0 |
| scenario | 701 | 0 | 99 | 0 |
| batch | 455 | 345 | 0 | 0 |
| lens | 527 | 273 | 0 | 0 |

### Refusal-code histogram

Counts cover refusal occurrences in shared answers, including nested answers.
They are not case counts; lens refusals remain untyped.
The campaign reaches all 30 implemented codes.
`prev-not-permitted` and `sum-overflow` remain reserved and unimplemented.

| Code | Occurrences |
|---|---:|
| `about-not-typed` | 12 |
| `emitted-not-rfc3339` | 52 |
| `envelope-field-unknown` | 195 |
| `erases-not-record-id` | 12 |
| `fold-argument` | 12 |
| `fold-invalid` | 12 |
| `fold-type` | 12 |
| `follow-invalid` | 12 |
| `follow-missing` | 12 |
| `from-invalid` | 12 |
| `from-missing` | 12 |
| `kind-empty` | 12 |
| `label-cycle` | 80 |
| `label-duplicate` | 12 |
| `label-unknown` | 100 |
| `limit-invalid` | 12 |
| `member-duplicate` | 56 |
| `number-out-of-range` | 18 |
| `observer-not-typed` | 12 |
| `occurred-not-span` | 219 |
| `prev-not-record-id` | 101 |
| `prev-unknown` | 11 |
| `prev-unrelated` | 515 |
| `salt-not-16-bytes` | 4 |
| `spec-not-object` | 12 |
| `under-not-record-id` | 12 |
| `unknown-key` | 12 |
| `vertex-invalid` | 12 |
| `vertex-missing` | 12 |
| `where-invalid` | 12 |

```sh
fnm exec --using 22 node interop/fuzz/run.mjs --rust --seed ratchets-1 --n 5600 --shrink-trials 80 --out /tmp/fuzz-ratchets-1
python3 interop/fuzz/summarize.py campaign /tmp/fuzz-ratchets-1 ratchets-1
```

## Historical Step-1 campaign

The historical `step1-3` run checked 5,600 cases, with 800 per family.
It reported 42 duplicate-base lens mismatches.
Those results describe the earlier implementation, not the settled public edit boundary.
Earlier `step1-1` and `step1-2` runs found the same class.
The repository does not retain evidence artifacts for those runs.

## Historical integrated three-way campaign

This campaign predates the Step-1 spelling changes.
It does not establish results for the updated generator.

A fresh Node 22 run compared JS, Lean, and Rust on 5,600 cases: 800 per family.
It used seed `integrate-1`, shrink limit 80, 88 chunks, and completed in 160.70 seconds.
The historical run exited 1 because of the then-unresolved duplicate-base lens disagreement.

| Family | Before: match / protocol refusal / decoder refusal / mismatch | After: match / protocol refusal / decoder refusal / mismatch |
|---|---:|---:|
| record | 686 / 94 / 20 / 0 | 686 / 94 / 20 / 0 |
| fold | 700 / 0 / 100 / 0 | 700 / 0 / 100 / 0 |
| spec | 687 / 64 / 49 / 0 | 687 / 64 / 49 / 0 |
| realm | 698 / 0 / 102 / 0 | 698 / 0 / 102 / 0 |
| scenario | 648 / 0 / 98 / 54 | 702 / 0 / 98 / 0 |
| batch | 605 / 195 / 0 / 0 | 605 / 195 / 0 / 0 |
| lens | 577 / 179 / 0 / 44 | 577 / 179 / 0 / 44 |

The fixed run totals 4,655 matches, 532 matching protocol refusals, 369 decoder refusals, and 44 mismatches.
All 369 decoder refusals reject in both Lean and Rust; they are not agreement.
Only 20 refusal diagnostic pairs are text-identical; wording differences do not change their classification.

The earlier integrated run took 279.98 seconds and had 98 mismatches.
That fix resolved all 54 prior scenario mismatches but left 44 lens mismatches at the time.
Replaying those 54 previous scenario cases restored a single JS/Lean/Rust equality partition in every case.
All 44 old and new raw and shrunk lens answer payloads match, ignoring artifact-local file paths.
Those lens inputs all repeated base ID `t:repeat`; JS differed from Lean and Rust.
The finding records historical answers in `found/03-duplicate-base-id.json`.
The later ruling requires public edits to refuse invalid bases before parsing.

The Rust scenario adapter now calls `things::state_in(thing, &admitted)` after settlement and admission.
That scopes state to the selected thing; it does not reduce the whole admitted view with latest-fold.
This aligns scenario `heads` and `winner` with the thing-specific state used by Lean and JS.

Reproduce into fresh output directories:

```sh
fnm exec --using 22 node interop/fuzz/run.mjs --rust --seed integrate-1 --n 5600 --shrink-trials 80 --out /tmp/fuzz-integrate-1-5600
```

The runner shrinks each generated disagreement within its configured bound.
All 98 initial mismatches were reduced: 54 scenario reductions hit the 80-trial bound, and 44 lens reductions used 76 trials.
After the fix, all 44 remaining mismatches used 76 trials, three accepted rounds, and did not hit the bound.
Their input sizes reduced from 119 to 98 serialized bytes; no absolute-minimality claim follows.
The local per-case and raw reduction logs are historical provenance only.
They are not retained evidence in the repository.
The previous run's successful answer payloads were not persisted, so full answer-by-answer comparison is unavailable for its 5,502 prior non-mismatches.
Non-scenario family acceptance counts were unchanged.

## Historical campaigns

These two-way campaigns ran before the gap15, gap16, and gap17 rulings.
Their local logs are historical provenance only, not retained evidence in the repository.
Their 105,000-case total and findings below describe historical code, not the current ratchets-1 run.
The two large campaigns contain 105,000 cases: 15,000 per family.
The first campaign checks the initial adapters.
The final campaign checks corrected API boundaries and adds lens, integer, and held-reference cases.
Only the final campaign supplies the findings below.
Small checks, replay cases, and shrink trials are additional work; they do not enter these totals.

```sh
node interop/fuzz/run.mjs --seed campaign-20261029 --n 70000 --no-shrink --out /tmp/slnext-fuzz-campaign-70000
node interop/fuzz/run.mjs --seed campaign-final-20261029 --n 35000 --no-shrink --out /tmp/slnext-fuzz-final-35000
```

| Campaign | Cases per family | Total | Timed loop | Raw mismatches |
|---|---:|---:|---:|---:|
| Initial | 10,000 | 70,000 | 549.479 s | 3,091 |
| Final | 5,000 | 35,000 | 321.636 s | 815 |

The initial generator has SHA256 `399ea7a8f852f200deb706cb360901439e381bbefec21a2ba30f7e056ec18a64`.
The final generator has SHA256 `14afb8777d4d46069740e354ea0361aead1d1491e4793ddd749e4a4f0bf7b0dc`.
The final campaign uses evaluator SHA256 `515d56f7dc1662dd0e85c31a9cb34d61845305e67433cc58a762d9b2213c7e31`.
A later raw-record replay fix does not change generated-case evaluation.

### Final counts

| Family | Cases | Match | Protocol refusal | Decoder refusal | Mismatch |
|---|---:|---:|---:|---:|---:|
| record | 5,000 | 4,371 | 518 | 111 | 0 |
| fold | 5,000 | 4,376 | 0 | 624 | 0 |
| spec | 5,000 | 4,352 | 312 | 336 | 0 |
| realm | 5,000 | 4,433 | 0 | 567 | 0 |
| scenario | 5,000 | 4,376 | 0 | 624 | 0 |
| batch | 5,000 | 3,932 | 1,068 | 0 | 0 |
| lens | 5,000 | 3,604 | 581 | 0 | 815 |

All 815 mismatches are answer differences. None is a JS exception.
The 2,262 decoder refusals do not count as protocol agreement.
The 2,479 protocol refusals match between implementations.

## Historical findings

The human gap17 ruling resolves the repeated and empty edited-ID findings.
The official vectors are `vectors/lens/section/gap17-duplicate-id.json` and `vectors/lens/section/gap17-empty-id.json`.
The human D1 ruling also settles the duplicate-base finding.

### 1. Repeated edited section IDs — resolved by gap17

The final campaign contains 270 cases. The first uses family-local index 5.

The minimum text contains two empty sections with the same nonempty ID.
The base is empty, so its IDs are unique.
Lean parses both sections and reports two unknown IDs.
JS refuses the text.

The human ruling now requires the parser to refuse repeated section IDs.

### 2. Empty section ID — resolved by gap17
The final campaign contains 272 cases. The first uses family-local index 6.

The minimum text is `["::: ", ":::"]`, with an empty base.
Lean returns one empty-ID section and one unknown-ID outcome.
JS refuses the text.

The human ruling now requires the parser to refuse empty section IDs.

### 3. Duplicate base IDs — settled by D1

File: [`found/03-duplicate-base-id.json`](found/03-duplicate-base-id.json).
The final campaign contains 273 cases. The first uses family-local index 23.

Two base sections share one ID and have different bodies.
The edited text matches the first section.
Lean reports no edit. JS replaces both bodies with the first body's value.

The historical implementations differed on duplicate bases at the raw boundary.
The law table then omitted the distinct-base premise; the design premise inventory did name `SectionIds`.
This probe did not show a valid-base law violation.
The ruling requires public edits to refuse empty or repeated base IDs before parsing text.
The refusal is untyped; raw lookup, diff, and apply retain their behavior.

### Reduction and replay

The finding retains its input, historical Lean `expect` and JS answer, verdict, scope, citations, and reduction evidence.
The historical reduction checks use 56, 20, and 35 trials respectively, without reaching their bounds.
No smaller candidate from those domain-preserving checks retains the same cause.
This is not a global minimality proof.

```sh
node interop/fuzz/run.mjs --replay interop/fuzz/found/03-duplicate-base-id.json --out /tmp/fuzz-base
```

The public edit now requires matching refusals for this input.
Use a new output directory for each run.
The recorded answers describe the historical disagreement, not the current expectation.
`--check` discovers the existing family directory layout, so it does not discover files directly under `found/`.

## Harness errors, not protocol findings

The initial campaign's 3,091 mismatches do not establish protocol bugs.

- Heads: 411 `fold/heads` and 572 `fold/view` cases compared different scopes.
  The current model combines per-thing heads under gap15.
  The adapter uses the public JS `heads` operation.
- Admission: 1,900 spec cases skipped the JS admission stage.
  The current JS `runSpec` admits its input, as Lean `Spec.run` does.
- Raw extrema: 208 cases compare raw Lean numeric primitives with view-aware JS readers.
  `model/Loops/Fold.lean:81-99` reads numeric placeholders; JS skips unread payloads.
  `protocol/laws.md:62` relates the operations when every record is readable.
  Raw numeric generators now satisfy that premise. Spec slots still test unread numeric results.

Reassessment makes all 2,883 heads, view, and admission cases agree.
The 208 old extrema cases remain outside the corrected generator's domain.
They do not enter `found/` as semantic bugs.
Spec generation also supplies settled forms, as `model/Loops/Spec.lean:322-325` requires.

Independent review also identifies raw-record replay loss and unbounded synchronous test subprocesses.
Raw payload source extraction and subprocess limits address those harness defects.

## Historical checks and CI

These results describe the earlier campaign, not a new run.

```sh
node --test interop/fuzz/*.test.mjs
npx --yes --package node@22 node --test interop/fuzz/*.test.mjs
(cd model && lake build --wfail && lake exe run --check ../vectors)
node interop/js/check.mjs vectors
node design/build.mjs
node design/mutants.mjs
git diff --check
```

Lean builds all 72 jobs and reproduces all 164 supported vectors.
The existing JS checker passes 4,891 checks.
The design build leaves tracked output unchanged.
The mutant check refuses 51 cases and preserves its one expected survivor.
All 19 harness tests pass on Node 22 in 3.980 seconds.
Active LSP probes leave eight files unconfirmed.
A historical auxiliary rule flagged `JSON.parse` in `interop/fuzz/json-source.mjs:19` because that local call can throw.
The current shared JSON source file is `interop/json-source.mjs`.
The source walker requires valid JSON; the evaluator catches thrown errors and reports them as mismatches.
That rule does not follow the outer catch.
Executable checks supply the verification evidence.

The historical model CI job installed Node 22, ran the harness tests, and ran seed `ci-1` with N=28.
Each new check step has a one-minute timeout.
The fixed corpus has no mismatches on Node 22.
Its local timed loop takes 0.430 seconds; the full command takes 1.44 seconds.
It covers every family, but only the first four generated fold sublayers.
The adapter corpus test covers every supported existing vector.
The job uploads run artifacts even on failure.
The fuzz runner has no mismatch allowlist.
