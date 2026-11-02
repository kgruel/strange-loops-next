# Differential fuzz report

## Scope

This report covers the Step-1 JS, Lean, and Rust campaign.
It also preserves evidence from earlier two-way campaigns as historical findings.
The harness covers record, fold, spec, realm, scenario, batch, and lens inputs.

## Round 2 review-fix three-way campaign

Source commit: `8a12ba6`.
Node 22 checks 5,600 cases with seed `step1-3`: 800 cases per family.
The run uses 88 chunks and takes 155.26 seconds.
Exit 1 records D1, not an infrastructure failure.
The retained [summary](evidence/step1-3/summary.json) and [D1 mismatch list](evidence/step1-3/d1-mismatches.json) support these counts.
Run `python3 interop/fuzz/summarize.py report` from the repository root.
The script derives totals from these tracked artifacts without local logs.

| Family | Cases | Match | Protocol refusal | Shared decoder refusal | Mismatch |
|---|---:|---:|---:|---:|---:|
| record | 800 | 325 | 454 | 21 | 0 |
| fold | 800 | 694 | 0 | 106 | 0 |
| spec | 800 | 693 | 48 | 59 | 0 |
| realm | 800 | 699 | 0 | 101 | 0 |
| scenario | 800 | 698 | 0 | 102 | 0 |
| batch | 800 | 511 | 289 | 0 | 0 |
| lens | 800 | 574 | 184 | 0 | 42 |
| Total | 5,600 | 4,194 | 975 | 389 | 42 |

All 389 decoder refusals occur in both Lean and Rust.
They are not protocol agreement.
The importer checks every raw and reduced mismatch against the complete historical D1 input and all three answers.
All 42 cases match that example exactly, with Lean and Rust agreeing against JS.
The retained list stores each seed and index, plus shared raw and reduced examples.
This representation removes repeated content without dropping a mismatch.
No new mismatch class appears; D1–D7 remain unchanged.

Each reduction uses 76 trials and 3 accepted rounds.
The totals are 3,192 trials and 126 accepted rounds; 0 reductions reach the limit.
These results do not prove absolute minimality.
Raw logs and large per-case files are not committed.
The artifact tests check totals, D1 identity, and infrastructure-failure rejection.
Run `python3 -B -m unittest discover -s interop/fuzz/evidence -p 'test_*.py'`.

```sh
fnm exec --using 22 node interop/fuzz/run.mjs --rust --seed step1-3 --n 5600 --shrink-trials 80 --out /tmp/fuzz-step1-3
python3 interop/fuzz/summarize.py campaign /tmp/fuzz-step1-3 step1-3
```

## Historical round 1 review-fix three-way campaign

Node 22 checks 5,600 cases with seed `step1-2`: 800 cases per family.
The run uses 88 chunks and takes 179.98 seconds.
Exit 1 records the existing D1 disagreement, not an infrastructure failure.
The retained [summary](evidence/step1-2/summary.json) and [D1 mismatch list](evidence/step1-2/d1-mismatches.json) support these counts.
Run `python3 interop/fuzz/summarize.py report` from the repository root.
The script sums family rows and checks mismatch references and reduction counts.
The mismatch list retains representative inputs and answers, not every raw case file.

| Family | Cases | Match | Protocol refusal | Shared decoder refusal | Mismatch |
|---|---:|---:|---:|---:|---:|
| record | 800 | 333 | 445 | 22 | 0 |
| fold | 800 | 683 | 0 | 117 | 0 |
| spec | 800 | 694 | 49 | 57 | 0 |
| realm | 800 | 704 | 0 | 96 | 0 |
| scenario | 800 | 695 | 0 | 105 | 0 |
| batch | 800 | 529 | 271 | 0 | 0 |
| lens | 800 | 574 | 182 | 0 | 44 |
| Total | 5,600 | 4,212 | 947 | 397 | 44 |

All 397 decoder refusals occur in both Lean and Rust.
They are not protocol agreement.
Scheduled shape probes combine unknown keys with duplicate, unknown, and cyclic labels.
Other probes combine unknown keys with malformed values, malformed salts, and multiple record envelopes.
Both draft orders occur.
A separate raw replay checks a repeated `env` member whose earlier value has an unknown key.
The adapter preserves every raw member for the public JS shape check.

The parent checks all 44 raw and 44 reduced mismatch artifacts.
Their complete inputs and JS, Lean, and Rust answers match the previous D1 examples.
Lean and Rust agree against JavaScript in every case.
No new mismatch class appears.
Each reduction uses 76 trials and 3 accepted rounds, below the 80-trial limit.
The total is 3,344 trials; 0 reductions reach the limit.
These results do not prove absolute minimality.
D1–D7 remain unchanged.

The raw replay and interrupted run logs are historical provenance only.
They are not retained evidence in the repository.
The interrupted run does not enter these totals.

```sh
fnm exec --using 22 node interop/fuzz/run.mjs --rust --seed step1-2 --n 5600 --shrink-trials 80 --out /tmp/fuzz-step1-2
```

## Historical Step-1 three-way campaign

Node 22 checks 5,600 cases with seed `step1-1`: 800 cases per family.
The run uses 88 chunks and takes 155.43 seconds.
Exit 1 records the existing D1 disagreement, not an infrastructure failure.

| Family | Cases | Match | Protocol refusal | Shared decoder refusal | Mismatch |
|---|---:|---:|---:|---:|---:|
| record | 800 | 367 | 406 | 27 | 0 |
| fold | 800 | 698 | 0 | 102 | 0 |
| spec | 800 | 716 | 42 | 42 | 0 |
| realm | 800 | 698 | 0 | 102 | 0 |
| scenario | 800 | 696 | 0 | 104 | 0 |
| batch | 800 | 615 | 185 | 0 | 0 |
| lens | 800 | 578 | 180 | 0 | 42 |
| Total | 5,600 | 4,368 | 813 | 377 | 42 |

All 377 decoder refusals occur in both Lean and Rust.
They are not protocol agreement.
The generator now uses canonical base32hex and UTC instants, including fractions.
Scheduled refusal probes cover byte spellings, every instant position, and unknown-key precedence.
Random near-miss choices cannot replace those probes.

The parent checks all 42 raw and 42 reduced mismatch artifacts.
Each repeats base ID `t:repeat`; Lean and Rust agree, and JavaScript differs.
These artifacts contain one distinct raw input and one distinct reduced input.
No new mismatch class appears.
The existing fixture `found/03-duplicate-base-id.json` retains this D1 boundary.
The campaign does not settle duplicate-base semantics.

Each reduction uses 76 trials and three accepted rounds, below the 80-trial limit.
The total is 3,192 trials; no reduction reaches its limit.
These results do not prove absolute minimality.
The retained [summary](evidence/step1-1/summary.json) and [D1 mismatch list](evidence/step1-1/d1-mismatches.json) support these counts.
Run `python3 interop/fuzz/summarize.py report` from the repository root.
The list retains representative inputs and answers, not every raw case file.

Reproduce in a new directory:

```sh
fnm exec --using 22 node interop/fuzz/run.mjs --rust --seed step1-1 --n 5600 --shrink-trials 80 --out /tmp/fuzz-step1-1
```

## Historical integrated three-way campaign

This campaign predates the Step-1 spelling changes.
It does not establish results for the updated generator.

A fresh Node 22 run compared JS, Lean, and Rust on 5,600 cases: 800 per family.
It used seed `integrate-1`, shrink limit 80, 88 chunks, and completed in 160.70 seconds.
Exit 1 was expected because the duplicate-base lens disagreement remains.

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
All 54 prior scenario mismatches now match; all 44 lens mismatches remain.
Replaying those 54 previous scenario cases restored a single JS/Lean/Rust equality partition in every case.
All 44 old and new raw and shrunk lens answer payloads match, ignoring artifact-local file paths.
The remaining lens inputs all repeat base ID `t:repeat`; JS differs from Lean/Rust.
The public fixture is `found/03-duplicate-base-id.json`; raw replay remains one mismatch and exits 1.
This probe does not decide whether duplicate base IDs are valid or prescribe protocol behavior.

The Rust scenario adapter now calls `things::state_in(thing, &admitted)` after settlement and admission.
That scopes state to the selected thing; it does not reduce the whole admitted view with latest-fold.
This aligns scenario `heads` and `winner` with the thing-specific state used by Lean and JS.

Reproduce into fresh output directories:

```sh
fnm exec --using 22 node interop/fuzz/run.mjs --rust --seed integrate-1 --n 5600 --shrink-trials 80 --out /tmp/fuzz-integrate-1-5600
fnm exec --using 22 node interop/fuzz/run.mjs --rust --replay interop/fuzz/found/03-duplicate-base-id.json --out /tmp/fuzz-duplicate-base
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
Their 105,000-case total and findings below describe historical code, not the current integrated three-way run.
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
The duplicate-base finding remains an open protocol-domain question.

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

### 3. Duplicate base IDs — spec gap

File: [`found/03-duplicate-base-id.json`](found/03-duplicate-base-id.json).
The final campaign contains 273 cases. The first uses family-local index 23.

Two base sections share one ID and have different bodies.
The edited text matches the first section.
Lean reports no edit. JS replaces both bodies with the first body's value.

`model/Loops/Lens.lean:78-91` uses first-match `lookup` in `diffSection` and `diff`.
`interop/js/lens.mjs:51` constructs a map, which keeps the last base entry.
`model/Laws/Lens.lean:143,250` requires unique base IDs for `no_op` and `put_get`.
At the time, the prose table at `protocol/laws.md:186-187` omitted that premise.
Current `protocol/laws.md` states distinct valid lens premises.
The historical design premise inventory did name `SectionIds`; the gap was not a claim about every document.
`model/Gen/Read.lean:328-332` accepts the duplicate base.

This is a domain-boundary probe, not a valid-base law violation.
The public boundary needs either an explicit unique-base requirement or defined duplicate handling.
Neither result proves that a valid-base edit loses data.

### Reduction and replay

The remaining candidate contains its input, Lean `expect`, JS answer, verdict, scope, citations, and reduction evidence.
The historical reduction checks use 56, 20, and 35 trials respectively, without reaching their bounds.
No smaller candidate from those domain-preserving checks retains the same cause.
This is not a global minimality proof.

```sh
node interop/fuzz/run.mjs --replay interop/fuzz/found/03-duplicate-base-id.json --out /tmp/fuzz-base
```

The command returns exit 1 while its disagreement remains.
Use a new output directory for each run.
The tests reproduce both answers and require an update when a finding resolves.
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
The fuzz runner has no mismatch allowlist. The duplicate-base question remains open.
