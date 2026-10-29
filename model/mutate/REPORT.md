# Lean model mutation report

## Scope and counts

The catalogue targets seven core modules.
It includes all eight requested operator groups.
The order puts admission, head selection, unread counts, and numeric checks first.

The run starts from `d9f4111` on branch `mutants`.
The first pass runs 30 mutants.
The second pass repeats those mutants after two new Gen cases.
A separate final run checks the integer match-arm mutant.
These runs contain 61 attempts and 31 distinct mutants.

| Pass | Mutants | Proof kills | Vector kills | Survivors | Errors |
| --- | ---: | ---: | ---: | ---: | ---: |
| Before new cases | 30 | 24 | 3 | 2 | 1 |
| After new cases, including the extra match-arm mutant | 31 | 24 | 6 | 0 | 1 |

Both initial survivors expose real gaps.
No initial survivor is equivalent or unclear.
No survivor remains after the new cases.
One generator assertion remains outside the proof and vector kill counts.

## Result limits

The runner marks a nonzero build as `killed-by-proof` and requests a log audit.
The audit finds 22 failures in law proofs, one embedded proof failure, and one generator premise proof failure.
No audited build fails only because of mutant syntax or an unused binding.

A proof failure does not establish a semantic difference.
A tactic can depend on the definition's shape.
For example, `things-here-last` is equivalent for valid `Forms`.
The validity rule requires equal readable records for one record ID.
Choosing the first or last readable form therefore returns the same record.

`occurred-qualifier-and` builds, but Gen exits with this existing assertion:

```text
uncaught exception: occurred/03-qualifiers: 2009? refused
```

This assertion detects a semantic change.
Gen does not finish the vector comparison.
The runner records `error`, not a proof kill, vector kill, or survivor.
The full catalogue therefore returns exit code 1.
No new law is necessary for this detected behavior.

## Results

Locations name the mutation site.
The last column names an existing check or the new vector.
For multiple vector differences, the table gives the first path and the total.

| Mutant | File:line | Result | Verdict | Added or recommended kill |
| --- | --- | --- | --- | --- |
| `things-prev-or` | `model/Loops/Things.lean:79` | killed-by-proof | An existing proof check fails. | `model/Laws/Things.lean:200`. |
| `things-drop-may` | `model/Loops/Things.lean:79` | killed-by-proof | An existing proof check fails. | `model/Laws/Things.lean:200`. |
| `things-drop-erasure` | `model/Loops/Things.lean:60` | killed-by-proof | An existing proof check fails. | `model/Laws/Things.lean:79`. |
| `fold-drop-prev-filter` | `model/Loops/Fold.lean:44` | killed-by-proof | An existing proof check fails. | `model/Laws/Fold.lean:180`. |
| `fold-drop-named-guard` | `model/Loops/Fold.lean:46` | killed-by-proof | An existing proof check fails. | `model/Laws/Fold.lean:179`. |
| `spec-unread-duplicates` | `model/Loops/Spec.lean:274` | survived → killed-by-vector | Real gap; the new vector closes it. | Add `vectors/spec/run/10-unread-shared-head.json`. |
| `spec-below-time-inclusive` | `model/Loops/Spec.lean:178` | killed-by-proof | An existing proof check fails. | `model/Laws/Spec.lean:53`. |
| `spec-atleast-time-strict` | `model/Loops/Spec.lean:172` | killed-by-proof | An existing proof check fails. | `model/Laws/Spec.lean:53`. |
| `spec-source-all-any` | `model/Loops/Spec.lean:316` | killed-by-vector | Existing vectors detect the change. | `vectors/scenario/01-decision.json` (11 files). |
| `families-unknown-no` | `model/Loops/Families.lean:114` | killed-by-proof | An existing proof check fails. | `model/Laws/Families.lean:294`. |
| `families-drop-readable` | `model/Loops/Families.lean:127` | killed-by-proof | An existing proof check fails. | `model/Laws/Families.lean:307`. |
| `families-unread-zero` | `model/Loops/Families.lean:128` | killed-by-proof | An existing proof check fails. | `model/Laws/Families.lean:308`. |
| `things-here-last` | `model/Loops/Things.lean:54` | killed-by-proof | Equivalent for valid forms; proof code still fails. | `model/Laws/Things.lean:62`. |
| `things-no-self-anchor` | `model/Loops/Things.lean:35` | killed-by-proof | An existing proof check fails. | `model/Laws/Spec.lean:284`. |
| `things-negate-erases` | `model/Loops/Things.lean:50` | killed-by-vector | Existing vectors detect the change. | `vectors/realm/01-erased-without-record-is-withheld.json` (10 files). |
| `fold-winner-last` | `model/Loops/Fold.lean:54` | killed-by-proof | An existing proof check fails. | `model/Laws/Families.lean:227`. |
| `fold-insert-nonstrict` | `model/Loops/Fold.lean:30` | killed-by-proof | An existing proof check fails. | `model/Laws/Fold.lean:72`. |
| `fold-count-zero` | `model/Loops/Fold.lean:16` | killed-by-proof | An existing proof check fails. | `model/Laws/Fold.lean:37`. |
| `spec-drop-head-choice` | `model/Loops/Spec.lean:268` | killed-by-proof | An existing proof check fails. | `model/Laws/Spec.lean:439`. |
| `spec-drop-collect-choice` | `model/Loops/Spec.lean:281` | killed-by-proof | An existing proof check fails. | `model/Laws/Spec.lean:325`. |
| `spec-collect-unknown-yes` | `model/Loops/Spec.lean:282` | killed-by-proof | An existing proof check fails. | `model/Laws/Spec.lean:498`. |
| `spec-below-number-inclusive` | `model/Loops/Spec.lean:177` | killed-by-proof | An existing proof check fails. | `model/Laws/Spec.lean:46`. |
| `stored-salt-check` | `model/Loops/Stored.lean:72` | killed-by-proof | An embedded proof fails. | `model/Loops/Stored.lean:98`. |
| `stored-commit-order` | `model/Loops/Stored.lean:26` | killed-by-vector | Existing vectors detect the change. | `vectors/batch/01-two-labels.json` (22 files). |
| `stored-refusal-last` | `model/Loops/Stored.lean:120` | killed-by-proof | An existing proof check fails. | `model/Laws/Write.lean:47`. |
| `record-newer-id-flip` | `model/Loops/Record.lean:80` | killed-by-proof | An existing proof check fails. | `model/Laws/Order.lean:72`. |
| `record-num-hidden` | `model/Loops/Record.lean:124` | survived → killed-by-vector | Real gap; the new vector closes it. | Add `vectors/spec/run/11-hidden-numbers.json`. |
| `occurred-month-end` | `model/Loops/Occurred.lean:70` | killed-by-proof | An existing generator premise proof fails. | `model/Gen/Spec.lean:186`. |
| `occurred-open-stop` | `model/Loops/Occurred.lean:40` | killed-by-proof | An existing proof check fails. | `model/Laws/Time.lean:43`. |
| `occurred-qualifier-and` | `model/Loops/Occurred.lean:53` | error | An existing generator assertion detects the change. | Keep the assertion in `model/Gen/Occurred.lean:105-107`. |
| `record-num-drop-int` | `model/Loops/Record.lean:126` | killed-by-vector | Existing vectors detect the change. | `vectors/spec/run/01-tasks.json` (6 files). |

## Initial survivors and new cases

### Duplicate unread heads

`spec-unread-duplicates` replaces `(idsOf unknown).length` with `unknown.length`.
A hidden head can belong to more than one thing.
The old inputs do not distinguish unread records from unread things.

`10-unread-shared-head` supplies one withheld task record about `task:2` and `task:9`.
The payload-filtered latest-by result contains no readable things and has `unread: 1`.
The unfiltered result retains both things and has `unread: 0`.
The mutant changes the filtered count to 2.

### Hidden numeric placeholders

`record-num-hidden` removes the readable-payload guard from `Record.num`.
The old numeric inputs use custom fields that disappear when a record becomes hidden.
They do not expose the hidden record's internal `n = 0` placeholder.

`11-hidden-numbers` supplies one withheld record and one erased record.
The spec requests count, sum, min, and max without a payload filter.
Count returns 2 with no unread records.
Sum returns 0 with two unread records.
Min and max return null with two unread records.
The mutant treats both placeholders as readable numbers.

Both cases come from `model/Gen/Spec.lean`.
The second case checks both record orders.
The JS implementation accepts both cases without changes.
The change adds no laws and changes no protocol definitions.

## Reproduce

From the repository root:

```sh
node model/mutate/run.mjs --list
node model/mutate/run.mjs --timeout 240 --output /tmp/loops-mutants.json
node --test model/mutate/run.test.mjs
```

Each mutation uses a separate temporary vector directory.
The runner copies `vectors/` before generation.
Gen replaces its own directories and retains the standard fixtures and README files.
An empty temporary directory would create unrelated differences for those static files.
The runner restores each source with `git checkout -- <file>`.
It also rebuilds the baseline after the run.

The raw local results use these paths:

- `/tmp/slnext-mutants-initial.json`
- `/tmp/slnext-mutants-final.json`
- `/tmp/slnext-mutants-match.json`

Each result has a sibling `.logs` directory.
These temporary logs do not form part of the commit.
The table records the audited outcomes.
The catalogue preserves each exact replacement for later runs.

## Final checks

| Command | Result |
| --- | --- |
| `lake build --wfail` | Pass |
| `lake exe gen ../vectors` | Pass; 174 vectors |
| `lake exe proofs ../design/laws/proofs.json` | Pass; no artifact change |
| `lake exe boundaries ../design/laws/boundaries.json` | Pass; no artifact change |
| `lake exe run --check ../vectors` | Pass; 166 files |
| `node design/build.mjs` | Pass |
| `node design/mutants.mjs` | Pass; 51 of 52 refused, one existing listed survivor |
| `node interop/js/check.mjs vectors` | Pass; 4,894 checks |
| `node --test model/mutate/run.test.mjs` | Pass; seven tests |

The design mutant suite is separate from this Lean mutation catalogue.
The generated evidence page includes the two new vectors.
The final source check finds no changes under `model/Loops/`.
