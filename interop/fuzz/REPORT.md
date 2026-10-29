# Differential fuzz report

## Scope

The change adds a dependency-free Node harness, a Lean batch CLI, and CI checks.
It leaves `model/Loops`, `protocol/`, `interop/js`, and existing vectors unchanged.
The harness covers record, fold, spec, realm, scenario, batch, and lens inputs.

## Campaigns

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

## Ranked findings

### 1. Repeated edited section IDs — JS wrong

File: [`found/01-repeated-section-id.json`](found/01-repeated-section-id.json).
The final campaign contains 270 cases. The first uses family-local index 5.

The minimum text contains two empty sections with the same nonempty ID.
The base is empty, so its IDs are unique.
Lean parses both sections and reports two unknown IDs.
JS refuses the text.

`model/Loops/Lens.lean:54-66` defines `parseGo` and `parse` without a distinct-ID check.
`model/Laws/Lens.lean:90` proves `parse_render` for every document.
`protocol/laws.md:185` states that round-trip law without a uniqueness premise.
`interop/js/lens.mjs:41` adds the refusal.

This verdict concerns the keyed-section combinator, not a product's policy for applying conflicting edits.
A product restriction needs an explicit boundary; it cannot silently narrow the round-trip law.

### 2. Empty section ID — JS wrong

File: [`found/02-empty-section-id.json`](found/02-empty-section-id.json).
The final campaign contains 272 cases. The first uses family-local index 6.

The minimum text is `["::: ", ":::"]`, with an empty base.
Lean returns one empty-ID section and one unknown-ID outcome.
JS refuses the text.

`model/Loops/Lens.lean:37-43` permits an empty ID in `headerId?` and `Section`.
`model/Loops/Lens.lean:54-66` accepts its render.
`model/Laws/Lens.lean:90` and `protocol/laws.md:185` require that round trip.
`interop/js/lens.mjs:29` rejects it.

### 3. Duplicate base IDs — spec gap

File: [`found/03-duplicate-base-id.json`](found/03-duplicate-base-id.json).
The final campaign contains 273 cases. The first uses family-local index 23.

Two base sections share one ID and have different bodies.
The edited text matches the first section.
Lean reports no edit. JS replaces both bodies with the first body's value.

`model/Loops/Lens.lean:78-91` uses first-match `lookup` in `diffSection` and `diff`.
`interop/js/lens.mjs:51` constructs a map, which keeps the last base entry.
`model/Laws/Lens.lean:143,250` requires unique base IDs for `no_op` and `put_get`.
The prose table at `protocol/laws.md:186-187` omits that premise.
The design premise inventory does name `SectionIds`; the gap is not a claim about every document.
`model/Gen/Read.lean:328-332` accepts the duplicate base.

This is a domain-boundary probe, not a valid-base law violation.
The public boundary needs either an explicit unique-base requirement or defined duplicate handling.
Neither result proves that a valid-base edit loses data.

### Reduction and replay

Each candidate contains its input, Lean `expect`, JS answer, verdict, scope, citations, and reduction evidence.
Reduction preserves each finding's cause and domain.
The three checks use 56, 20, and 35 trials respectively, without reaching their bounds.
No smaller candidate from those domain-preserving checks retains the same cause.
This is not a global minimality proof.

```sh
node interop/fuzz/run.mjs --replay interop/fuzz/found/01-repeated-section-id.json --out /tmp/fuzz-repeat
node interop/fuzz/run.mjs --replay interop/fuzz/found/02-empty-section-id.json --out /tmp/fuzz-empty
node interop/fuzz/run.mjs --replay interop/fuzz/found/03-duplicate-base-id.json --out /tmp/fuzz-base
```

Each command returns exit 1 while its disagreement remains.
Use a new output directory for each run.
The tests reproduce both answers and require an update when a finding resolves.
`--check` discovers the existing family directory layout, so it does not discover files directly under `found/`.

## Harness errors, not protocol findings

The initial campaign's 3,091 mismatches do not establish protocol bugs.

- Global heads: 411 `fold/heads` and 572 `fold/view` cases compare different scopes.
  `model/Gen/Run.lean:98-99` asks about one global `LatestBy` state.
  JS `heads` combines per-thing states at `interop/js/fold.mjs:142-152`.
  The adapter now composes JS `latest` with numeric results and view metadata.
  The per-thing rule remains covered through specs and realms; see `protocol/laws.md:90-93`.
- Admission: 1,900 spec cases skip the JS admission stage.
  `model/Loops/Spec.lean:325-328` admits before evaluating slots.
  The adapter now composes JS `admit` with `runSpec`.
  `protocol/laws.md:77-93` explains that reader sequence.
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

## Checks and CI

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
An auxiliary rule flags `JSON.parse` in `interop/fuzz/json-source.mjs:19` because that local call can throw.
The source walker requires valid JSON; the evaluator catches thrown errors and reports them as mismatches.
That rule does not follow the outer catch.
Executable checks supply the verification evidence.

The model CI job installs Node 22, runs the harness tests, and runs seed `ci-1` with N=28.
Each new check step has a one-minute timeout.
The fixed corpus has no mismatches on Node 22.
Its local timed loop takes 0.430 seconds; the full command takes 1.44 seconds.
It covers every family, but only the first four generated fold sublayers.
The adapter corpus test covers every supported existing vector.
The job uploads run artifacts even on failure.
The fuzz runner has no mismatch allowlist. Large campaigns still fail on the known lens cases.
