# Lean model mutation report

## Step 4 after the two-store exit, at `f001758`

The run selected the 91 tick entries added to the previous 328. Each uses a single exact replacement in a library file. The original 328 catalogue entries retain their sites and replacements.

Each batch ran locally with `node model/mutate/run.mjs --only <ids> --timeout 600 --output <file>`. Concurrent batches used separate scratch trees and indexes against the same commit. Each checked the baseline build and generated corpus first, restored its source between entries, and rebuilt the baseline on exit. After a build rejection, the executable verdict records whether the programs detect the fault without the laws. A generator assertion exception is recorded as `generator`. A vector difference compares the complete generated fixture, including its input.

| Final outcome | Entries |
|---|---:|
| `rejected-by-build` | 66 |
| `killed-by-checks` | 1 |
| `killed-by-vector` | 24 |

Of the 66 build rejections, the executable-only runs found 33 `vector`, 28 `generator`, 5 `checks`. Every published replacement has executable evidence. All selected commands completed within their time limit.

### What the first pass missed

Two entries survived outright and three stood on proofs alone. All five change observable behavior. The table pairs each first verdict with the rerun after adding evidence.

| Entry | First pass | Rerun | What separates the two behaviors |
|---|---|---|---|
| `tick-padded-natural` | rejected-by-build / none | rejected-by-build / vector | The natural reader accepted padded decimal text. The existing negative and signed-zero examples cannot distinguish that grammar. `check-padded-count` refits the result hash over `06` and requires `tick-result-invalid` at `result.runs.value`. |
| `tick-settle-outside` | rejected-by-build / none | rejected-by-build / checks | With an outside eraser and an undeclared lost opening, the store check stops before replay. `tickRun` itself must still settle the cover in isolation. The new runtime assertion compares the claim's bytes to a run on the one covered backup while the supplied forms also contain its outside eraser. |
| `tick-follow-inner-covers` | rejected-by-build / none | rejected-by-build / vector | The old weekly checker held none of the inner backups. `weekly-inner-records-held` gives it all six alongside the two nightly ticks and the note. The claim still counts three, the check says `same`, and the outside count is six. |
| `tick-check-text-order` | survived | killed-by-vector | The executable comparison of the `Ord Rules` instance already used 2 and 10. The check dispatch compares the version fields separately. `newer-ten-under-two` puts rules 10 on the wire and rules 2 in the checker and requires `made under newer rules`. |
| `tick-unheld-before-kind` | survived | killed-by-vector | The old wrong-kind subject had an opening. The old unheld subject had kind tick. `wrong-kind-unheld` checks a note from its envelope alone and requires `tick-kind` at `kind`. |

Rust ran all four new vectors through its existing tick evaluator. The tick family now has 130 files. JavaScript continues to count that family under W3. The pure-claim check runs in `lake exe checks`.

The cheap runner killed 50 of 50 in 14m 16.151s before the change and 58 of 58 in 13m 44.141s afterward. These are individual wall-clock measurements on a shared build machine. The added guards were `tick-label-colon`, `tick-rules-text-order`, `tick-when-unheld`, `tick-result-newer-fit`, `tick-duplicate-array-path`, `tick-negative-unread`, `tick-missing-before-eraser` and `tick-compare-hashes`.

The [final summary](evidence/mutations-tick/summary.json) contains one verdict per published replacement. The [first-pass evidence](evidence/mutations-tick/initial-gaps.json) retains the five entries before their new checks. Both use the mutation evidence importer's format. The tables give a changed fixture or assertion for each executable verdict. For a vector, `(+N)` counts the other files changed. Build coordinates identify the first diagnostic in the log.

### Json.lean

| Entry | Outcome | First build diagnostic or executable evidence |
|---|---|---|
| `tick-duplicate-skip-arrays` | rejected-by-build / vector | Laws/Parse.lean:156 · tick/spec-repeated-source.json (+3) |

### Result.lean

| Entry | Outcome | First build diagnostic or executable evidence |
|---|---|---|
| `tick-negative-count` | rejected-by-build / generator | Laws/TickRead.lean:178 · reading changed the payload's canonical bytes |
| `tick-negative-unread` | rejected-by-build / generator | Laws/TickRead.lean:178 · reading changed the payload's canonical bytes |
| `tick-minus-zero` | rejected-by-build / generator | Laws/Tick.lean:48 · reading changed the payload's canonical bytes |
| `tick-padded-natural` | rejected-by-build / vector | Laws/Tick.lean:45 · tick/check-padded-count.json |
| `tick-sum-null` | rejected-by-build / generator | Laws/TickRead.lean:178 · reading changed the payload's canonical bytes |
| `tick-extra-result-member` | rejected-by-build / generator | Laws/TickRead.lean:68 · reading changed the payload's canonical bytes |
| `tick-default-missing-unread` | rejected-by-build / generator | Laws/TickRead.lean:169 · reading changed the payload's canonical bytes |
| `tick-result-id-spelling` | rejected-by-build / generator | Laws/TickRead.lean:130 · reading changed the payload's canonical bytes |
| `tick-result-id-order` | rejected-by-build / generator | Laws/Tick.lean:23 · written result did not read back in normal form |
| `tick-group-counts-swapped` | rejected-by-build / generator | Laws/Tick.lean:91 · written result did not read back in normal form |
| `tick-keyed-heads-whole` | rejected-by-build / generator | Laws/Tick.lean:81 · written result did not read back in normal form |
| `tick-result-hide-duplicates` | rejected-by-build / generator | Laws/Tick.lean:26 · reading changed the payload's canonical bytes |

### Spec.lean

| Entry | Outcome | First build diagnostic or executable evidence |
|---|---|---|
| `tick-when-occurred` | rejected-by-build / vector | Laws/Spec.lean:192 · tick/when-backfill.json |
| `tick-when-emitted` | rejected-by-build / vector | Laws/Spec.lean:192 · tick/when-after-heads.json (+1) |
| `tick-when-unheld` | rejected-by-build / checks | Laws/Spec.lean:192 · window operators on the occurrence span |

### SpecHash.lean

| Entry | Outcome | First build diagnostic or executable evidence |
|---|---|---|
| `tick-label-domain` | rejected-by-build / vector | Laws/SpecHash.lean:73 · tick/admit-inside.json (+119) |
| `tick-label-fixed` | rejected-by-build / vector | Laws/SpecHash.lean:61 · tick/check-hash-before-version.json (+9) |
| `tick-label-colon` | rejected-by-build / vector | Laws/SpecHash.lean:61 · tick/admit-inside.json (+119) |
| `tick-spec-prefix` | rejected-by-build / generator | Laws/Tick.lean:232 · written payload refused |
| `tick-rules-leading-zero` | rejected-by-build / generator | Laws/SpecHash.lean:11 · reading changed the payload's canonical bytes |
| `tick-rules-zero` | rejected-by-build / checks | Laws/SpecHash.lean:22 · invalid rules version |
| `tick-rules-text-order` | killed-by-checks | numeric rules order and binding |
| `tick-label-unversioned` | rejected-by-build / vector | Laws/SpecHash.lean:61 · tick/admit-inside.json (+119) |
| `tick-hash-normalized-member` | rejected-by-build / vector | Laws/SpecHash.lean:64 · tick/carried-note.json (+4) |

### Tick.lean

| Entry | Outcome | First build diagnostic or executable evidence |
|---|---|---|
| `tick-write-rules` | rejected-by-build / generator | Laws/Tick.lean:228 · written payload refused |
| `tick-write-spec` | rejected-by-build / generator | Laws/Tick.lean:228 · written payload refused |
| `tick-write-spec-hash` | rejected-by-build / generator | Laws/Tick.lean:228 · written payload refused |
| `tick-write-covers` | rejected-by-build / generator | Laws/Tick.lean:228 · written payload refused |
| `tick-write-result` | rejected-by-build / generator | Laws/Tick.lean:228 · written payload refused |
| `tick-write-result-hash` | rejected-by-build / generator | Laws/Tick.lean:228 · written payload refused |
| `tick-write-withheld` | rejected-by-build / generator | Laws/Tick.lean:228 · written payload refused |
| `tick-write-empty-withheld` | rejected-by-build / generator | Laws/Tick.lean:228 · written payload refused |
| `tick-omit-withheld` | rejected-by-build / generator | Laws/Tick.lean:228 · written result did not read back in normal form |
| `tick-allow-unsorted` | rejected-by-build / vector | Laws/TickRead.lean:260 · tick/covers-unsorted.json (+1) |
| `tick-allow-repeated-ids` | rejected-by-build / vector | Laws/Tick.lean:164 · tick/covers-duplicate-id.json (+1) |
| `tick-allow-outsider` | rejected-by-build / vector | Laws/TickRead.lean:290 · tick/withheld-outside.json |
| `tick-read-empty-withheld` | rejected-by-build / generator | Laws/TickRead.lean:290 · reading changed the payload's canonical bytes |
| `tick-duplicate-top-only` | rejected-by-build / vector | Laws/TickRead.lean:331 · tick/result-repeated-group-value.json (+2) |
| `tick-duplicate-array-path` | killed-by-vector | tick/spec-repeated-source.json |
| `tick-hash-spelling` | rejected-by-build / vector | Laws/Tick.lean:170 · tick/check-newer-hash-spelling.json (+2) |
| `tick-spec-reader-version` | rejected-by-build / vector | Laws/Tick.lean:228 · tick/check-hash-before-version.json (+15) |
| `tick-result-newer-fit` | rejected-by-build / vector | Loops/Tick.lean:97 · tick/check-newer-result-label.json (+2) |
| `tick-result-own-unchecked` | rejected-by-build / generator | Laws/TickRead.lean:314 · reading changed the payload's canonical bytes |
| `tick-allow-raw-spec` | rejected-by-build / generator | Laws/TickRead.lean:399 · reading changed the payload's canonical bytes |
| `tick-skip-shape` | rejected-by-build / generator | Laws/Tick.lean:276 · reading changed the payload's canonical bytes |
| `tick-unknown-member` | rejected-by-build / generator | Laws/Tick.lean:228 · reading changed the payload's canonical bytes |
| `tick-skip-spec-object` | rejected-by-build / vector | Laws/Tick.lean:247 · tick/spec-not-object.json |
| `tick-skip-other-rules` | rejected-by-build / generator | Laws/TickRead.lean:395 · reading changed the payload's canonical bytes |
| `tick-duplicates-after-members` | rejected-by-build / checks | Laws/TickRead.lean:331 · nested duplicate lost its path before member validation |
| `tick-skip-spec-fit` | rejected-by-build / vector | Laws/TickRead.lean:314 · tick/check-hash-before-version.json (+1) |
| `tick-write-local-label` | rejected-by-build / vector | Laws/Tick.lean:228 · tick/check-newer-hash-spelling.json (+4) |

### TickCheck.lean

| Entry | Outcome | First build diagnostic or executable evidence |
|---|---|---|
| `tick-unmasked` | rejected-by-build / vector | Laws/TickCheck.lean:33 · tick/make-erased.json (+1) |
| `tick-mask-first-form` | rejected-by-build / vector | Laws/TickCheck.lean:33 · tick/withheld-open-at-checker.json |
| `tick-settle-outside` | rejected-by-build / checks | Laws/TickCheck.lean:19 · a claim settled an eraser outside its cover |
| `tick-admit-outside` | rejected-by-build / vector | Laws/TickCheck.lean:19 · tick/admit-inside.json |
| `tick-follow-inner-covers` | rejected-by-build / vector | Laws/TickCheck.lean:19 · tick/weekly-inner-records-held.json |
| `tick-cover-only-taken` | rejected-by-build / vector | Laws/TickCheck.lean:245 · tick/closed-cover.json (+12) |
| `tick-made-forgets-eraser` | rejected-by-build / vector | Laws/TickCheck.lean:245 · tick/covered-erasure.json |
| `tick-made-ignores-erased` | rejected-by-build / vector | Laws/TickCheck.lean:245 · tick/eraser-outside.json (+2) |
| `tick-open-with-eraser` | rejected-by-build / vector | Laws/TickCheck.lean:52 · tick/covered-erasure.json (+1) |
| `tick-closure-prev-only` | killed-by-vector | tick/open-under.json |
| `tick-closure-under-only` | killed-by-vector | tick/admit-inside.json (+2) |
| `tick-closure-missing-yes` | killed-by-vector | tick/closure-unknown.json (+5) |
| `tick-closure-missing-first` | killed-by-vector | tick/open-prev-partial.json |
| `tick-outside-before-admit` | killed-by-vector | tick/taken-after-admit.json |
| `tick-outside-includes-covered` | rejected-by-build / vector | Loops/TickCheck.lean:65 · tick/check-invalid-result.json (+28) |
| `tick-swap-counts` | killed-by-vector | tick/closure-unknown.json (+7) |
| `tick-count-twice` | killed-by-vector | tick/closure-unknown.json (+2) |
| `tick-demand-withheld-opening` | rejected-by-build / vector | Laws/TickCheck.lean:48 · tick/covered-erasure.json (+2) |
| `tick-ignore-covered-eraser` | rejected-by-build / vector | Laws/TickCheck.lean:264 · tick/covered-eraser-omitted-partial.json (+2) |
| `tick-missing-before-eraser` | killed-by-vector | tick/covered-eraser-omitted-partial.json (+2) |
| `tick-outside-eraser-fault` | rejected-by-build / vector | Laws/TickCheck.lean:264 · tick/eraser-outside-retained.json |
| `tick-skip-missing` | killed-by-vector | tick/closure-unknown.json (+7) |
| `tick-compare-hashes` | rejected-by-build / checks | Laws/TickCheck.lean:292 · the verdict compared digests instead of bytes |
| `tick-differs-hashes-swapped` | killed-by-vector | tick/different-result.json (+1) |
| `tick-no-kind-test` | killed-by-vector | tick/wrong-kind.json |
| `tick-unheld-as-malformed` | killed-by-vector | tick/own-payload-unheld.json |
| `tick-version-before-reader` | rejected-by-build / vector | Laws/TickCheck.lean:292 · tick/check-hash-before-version.json (+2) |
| `tick-reader-fault-as-unreadable` | killed-by-vector | tick/check-hash-before-version.json (+2) |
| `tick-older-as-newer` | killed-by-vector | tick/older-different-today.json (+6) |
| `tick-newer-as-current` | killed-by-vector | tick/check-newer-result-label.json (+1) |
| `tick-unreadable-as-malformed` | killed-by-vector | tick/unreadable-spec.json |
| `tick-skip-check-slots` | killed-by-vector | tick/check-invalid-result.json |
| `tick-today-always-same` | killed-by-vector | tick/older-different-today.json (+1) |
| `tick-older-needs-shape` | killed-by-vector | tick/older-foreign-result.json |
| `tick-lost-outside-report` | killed-by-vector | tick/older-different-today.json (+4) |
| `tick-check-text-order` | killed-by-vector | tick/newer-ten-under-two.json |
| `tick-lose-unavailable-why` | killed-by-vector | tick/older-ignored-erasure.json (+1) |
| `tick-covers-arrival-order` | rejected-by-build / vector | Laws/TickCheck.lean:245 · tick/admit-inside.json (+2) |
| `tick-unheld-before-kind` | killed-by-vector | tick/wrong-kind-unheld.json |

## Full run in CI after the payload-field change, 2026-11-21

GitLab pipeline 2190 ran all 328 entries on main at `48037ce`, in four shards with 600 seconds per command.
These are the CI outcomes under the runner at that commit. The six-entry local follow-up below uses the updated runner.

| CI outcome | Count |
|---|---:|
| Rejected by build | 282 |
| Vector differences | 20 |
| Generator assertion exceptions (`error`) | 22 |
| Survivors | 4 |

All 22 errors record a successful build followed by a nonzero generator exit. They are the same 22 entry IDs that hit generator assertions on 2026-11-15.
Of the 282 build rejections, 270 were also caught when building or running the executable targets. A generated vector differed for 139, the generator exited nonzero for 112, the executables failed to build for 7, and `lake exe checks` failed for 12.
The other twelve had `runtime.verdict = none` in CI.

| Kind in pipeline 2190 | Entries |
|---|---|
| Changes what only the laws read | Four propositions: `last-families-tri-refines`, `last-things-envonly`, `last-things-forms`, `extra-record-addressed`. Two comparison helpers: `result-unshown-keeps-shown`, `result-unshown-groups-kept`. |
| Cannot be reached before standing | `things-drop-may` |
| Equivalent at run time, by argument | `finish-json-json-canonmembers`, `finish-json-sortby`, `things-here-last`, `spec-unread-duplicates`, `families-drop-readable` |

The two new entries change the values compared in the result laws. `result-unshown-keeps-shown` retains each listed id's visibility. `result-unshown-groups-kept` skips the descent into grouped values, leaving visibility on their heads. The result codec writes ids directly through `idsJson`. Only the laws called the `unshown` helpers in this run. One executable check can exercise both definitions by comparing a grouped withheld head after `unshown` with the same grouped head marked `.here`.

Two of the four CI survivors exposed gaps. For `payload-whole-as-number`, the old full runner stopped when generated vectors matched. It missed the existing `binary64 whole` assertion that the cheap runner exercised. For `record-num-hidden`, the November 15 vector kill depended on the zero `n` left on a withheld record. After !63 made `n` an ordinary payload field, `Record.withhold`, `Record.erase`, and the erased branch of `Stored.readInto` clear the fields. A general `View.hides` can still hide a record and retain its fields. `Record.num_hidden` covers every such record under `numeric.safe-whole`, and the runtime check retains a written zero while changing only `shown`.

The local run selected the four CI survivors and the two new proofs-alone entries, with 600 seconds per command. Generated bytes matched and `run --check` reproduced all 640 supported vectors for all six, using the executable-only build for the three build rejections.

| Entry | Local status | What decided it |
|---|---|---|
| `record-num-hidden` | `rejected-by-build` | `Record.num_hidden` fails at `Laws/Numeric.lean:44`. Second verdict `checks` at `numeric field read from withheld record`. |
| `payload-whole-as-number` | `killed-by-checks` | The full build passes. The existing `binary64 whole` check fails. |
| `finish-json-hexdigit` | `survived` | All checks pass. Escaping uses digit indices below 16, outside the changed fallback. |
| `last-spec-tests-conds` | `survived` | All checks pass. Reversal preserves each partition's members and their three-valued conjunction. |
| `result-unshown-keeps-shown` | `rejected-by-build` | `idsJson_eq_iff` fails at `Laws/Result.lean:708`. Second verdict `checks` at `unshown keeps a grouped head's visibility`. |
| `result-unshown-groups-kept` | `rejected-by-build` | The grouped case of `SlotValue.result_inj` fails at `Laws/Result.lean:781`. The same grouped-head check gives the second verdict `checks`. |

The runner restored the source and rebuilt the baseline successfully. None of the six timed out or errored.

The retained [CI summary](evidence/mutations-payload/summary.json) comes directly from the joined file in catalogue order. The importer checks its outcome counts, second-verdict counts and proofs-alone list against the individual entries. The joined file omits the shard baselines and generator logs, so the summary retains the recorded `Generator nonzero` detail for those 22 entries.

```sh
python3 interop/fuzz/summarize.py mutation merged.json mutations-payload   # the mutation-report job's joined file
python3 interop/fuzz/summarize.py report
```

## Full run in CI, after D8c: the 291 entries at `132ecb2`, with 23 run again at `122fd7e`

The catalogue had 291 entries at `132ecb2`, before a keyed collect's limit counted things; the four entries that change added, and the two it retargeted, are in the section below and are not in this run.
GitLab CI ran all 291 on 2026-11-15 (pipeline 1961, `MUTATION_FULL` set), in four shards with the runner's default timeout of 180 seconds a command.
The retained [summary](evidence/mutations-d8c/summary.json) supports these counts.
Run `python3 interop/fuzz/summarize.py report` from the repository root.

| Outcome | Count |
|---|---:|
| Rejected by build | 243 |
| Vector differences | 24 |
| Generator assertion exceptions | 22 |
| Survivors | 2 |

The survivors are `finish-json-hexdigit` and `last-spec-tests-conds`, the two scoped-equivalence survivors of the run before.
Each generator assertion keeps its text in the summary.
Build rejections are not semantic proof kills: 243 entries stop the build, and this run did not read their logs to say whether each stops at a property or at a lemma that restates the mutated definition.

**The logs were read afterwards**, by margins-claude on 2026-11-15 (margins `notes/2026-11-15-mutation-audit.md`, with every entry in `mut/audit-2026-11-15.json`).
By the first error of each log, 17 entries stop at a restatement of the mutated definition, 6 at a restatement of one branch of it, 5 at a closed example, 46 at an invariance law most mutants still satisfy, 166 at a property, and 3 at a warning alone (`things-no-self-anchor`, `d8-subst-of-skipped`, `shape-not-object-skipped`).
Reading does not settle what a rejection is worth, since a proof can break while its statement still holds of the mutant, so each of the 243 was also run at `d32ca25` with the generator built alone, without the laws.
**230 of the 243 are also caught by something that runs:** a vector differs for 113, an assertion inside the generator fails for 104, the generator does not build for 7, and `lake exe checks` fails for 6. The three warning-only entries are among them.
The 13 that stood on proofs alone:

| Kind | Entries |
|---|---|
| Mutates a `Prop` that only laws read | `last-families-tri-refines`, `last-things-envonly`, `last-things-forms`, `extra-record-addressed` |
| Cannot be reached before standing | `things-drop-may` |
| Equivalent at run time, by argument and no proof | `finish-json-json-canonmembers`, `finish-json-sortby`, `things-here-last`, `spec-unread-duplicates`, `families-drop-readable` |
| Stated behaviour that nothing running held | `extra-spec-parsefield`, `coverage-spec-json-repeatin`, `wide-stored-081` |

The last three were gaps: a `where` field with no tests, the order in which an array is searched for a repeated key (the law it stopped at was still true of the mutant), and `opens`, which nothing ran. Merge request !45 pins each with vectors, a law and a runtime check.
The runner now records this second verdict itself for every build rejection (`runtime.verdict`, [README](README.md)), so a later full run names the entries on proofs alone without a separate pass.

**Two runs make these counts.** The first judged 268 entries: 226 build rejections, 22 vector differences, 18 generator assertions and the 2 survivors.
The other 23 timed out in the build, which is an error and not a kill: 22 in the one shard that ran on a slower CI runner, where every entry from 17:07 UTC on timed out, and `coverage-time-instant-` in another shard.
A build log read from one of them was still building at step 100 of 104.
Those 23 were run again on `main` at `122fd7e` (pipeline 1985, `MUTATION_ONLY`, 600 seconds a command) and none timed out: 17 build rejections, two vector differences (`d8-unrelated-ignores-target-of`, `under-unknown-before-prev`) and four generator assertions (`occurred-qualifier-and`, `wide-batch-005`, `wide-envelope-009`, `step1-draft-keys-after-values`).
The summary holds each of the 23 with its second outcome, and its baseline is the first run's.
`122fd7e` differs from `132ecb2` in the laws and in a keyed collect's limit, so a build rejection there may stop at a law the first run did not have; the 23 entries' own source sites are the same in both.
The second run also took eight entries the slow shard had not reached when it started; all eight were rejected by the build in both runs, and the summary holds their second outcome too.

The 23 that timed out first: `occurred-qualifier-and`, `wide-batch-005`, `wide-envelope-009`, `wide-families-013`, `step1-seconds-bound`, `step1-draft-keys-after-values`, `d2-lone-low-accepted`, `d8-thing-ignores-of`, `d8-unrelated-ignores-target-of`, `d8-env-of-reads-thing`, `read-wrong-type-accepted`, `read-salt-not-base32-filled`, `follow-pool-heads-always`, `follow-count-not-written`, `by-group-before-admit`, `by-membership-once`, `under-unknown-before-prev`, `sets-empty-name-accepted`, `sets-empty-left-out`, `sets-key-as-label`, `keys-whole-always-live`, `keys-whole-not-live`, `coverage-time-instant-`.

Each shard restored the source and rebuilt the baseline at its end; in the outcomes kept, no command timed out, received a signal or reported a spawn or cleanup error.
A shard exits 1 when an entry errors, so the CI jobs show as failed with their results uploaded; the three shards on one runner took 78 to 83 minutes each, and the slow one 162.
Since then the CI job gives each command 600 seconds, or `MUTATION_TIMEOUT`.

```sh
echo '{"ref":"main","variables":[{"key":"MUTATION_FULL","value":"1"}]}' | glab api -X POST projects/strange-loops%2Fstrange-loops-next/pipeline --input - -H "Content-Type: application/json"
python3 interop/fuzz/summarize.py mutation /tmp/joined-mutants.json mutations-d8c
```

The second command takes one result file: the four shards' `mutants` in catalogue order, the second run's entry in place of the first's, and the first shard's baseline.

## A keyed collect's limit over things: the four new entries, two retargeted and one whose definition moved, at `fe57cb6`

The catalogue has 295 entries: 291 and four that mutate the limit of a collect that follows `keys` (`keyedValue`, `wholeThings`, `thingsInOrder`), on Kyle's ruling of 2026-11-15 that it counts things, each listed whole.
`keys-slots-collect-heads` and `keys-slots-collect-no-limit` are retargeted at the collect's new site in `keyedValue`; `keys-slots-limit-over-records` is the rule as first built, now a wrong one.
The full catalogue is not rerun. Node 25.9 runs the four new entries, the two retargeted and `keys-slots-count-unknown-dropped`, the other entry on `keyedValue`, with `--only`, in one run, with a 900-second timeout.
The last column gives the first error the build reports, file and line in the mutated tree.

| Entry | Wrong rule | Outcome | Where |
|---|---|---|---|
| `keys-slots-limit-over-records` | let a keyed collect's limit count records, cutting a thing's live records | rejected by build | `Laws/KeyedSlots.lean:136` (`keyedValue_collect`) |
| `keys-slots-limit-cuts-things` | choose the things by the limit, then cut their records at the limit too | rejected by build | `Laws/KeyedSlots.lean:187` (`mem_wholeThings`) |
| `keys-slots-limit-oldest-first` | choose the things with the oldest live records, not the newest | rejected by build | `Laws/KeyedSlots.lean:187` (`mem_wholeThings`) |
| `keys-slots-things-repeated` | count a thing once per live record toward the limit | rejected by build | `Laws/KeyedSlots.lean:154` (`mem_thingsInOrder`) |
| `keys-slots-collect-heads` | (retargeted) collect a selected thing's heads, not its live records | rejected by build | `Laws/Spec.lean:455` (`keyedValue_set_decides`) |
| `keys-slots-collect-no-limit` | (retargeted) ignore limit on a collect that follows keys | rejected by build | `Laws/KeyedSlots.lean:285` (`keyedValue_collect_limit`) |
| `keys-slots-count-unknown-dropped` | (unchanged) | rejected by build | `Laws/KeyedSlots.lean:63` (`keyedValue_count`) |

No entry survives.
All seven are rejected by build, each at an error at a theorem, not a warning alone. Build rejections are not semantic proof kills; the entries rejected by build were not applied by hand. The same wrong rules as JavaScript ports, the limit over records and the oldest things first, fail 52 and 46 vector checks, `spec/run/51` among them (`interop/fuzz/REPORT.md`).
`keys-slots-limit-cuts-things` gives the same answers as `keys-slots-limit-over-records`: the first `k` records of the newest-first list are of at most `k` things, all among the first `k`.
The runner exits 0: no generator assertion, timeout or infrastructure failure occurs.
It restored the source after each entry and rebuilt the baseline at the end.
Raw results and logs were kept under the session's scratch directory and deleted once this summary was written.

At that commit no stated law said which things are kept, only that at most `k` are, each whole: `keyedValue_collect_limit` holds of the oldest things too, and `keys-slots-limit-oldest-first` was rejected where `mem_wholeThings` restates the definition and where `wholeThings_distinct` names its first `k` records.
`wholeThings_newest` and `keyedValue_collect_newest` now state it: over a list sorted newest first, a listed thing has a record newer than every record left out; at the slot, a live record of a selected thing that is left out is older than some live record of each listed thing.
The oldest-first rule falsifies both. On `spec/run/51`'s records the oldest things with a limit of 1 list `task:a`, whose live records are at 00:01:40, 00:05:00 and 00:08:20, and leave out `task:e`'s live record at 00:09:20. For any two records `a` and `e` of different things, `e` newer, the mutated `wholeThings (some 1) [e, a]` is `[a]`, and no record of `a`'s thing is newer than `e`.
That last statement was checked by hand: with the entry applied to `Loops/Spec.lean` and `mem_wholeThings` restated over `thingsInOrder rs.reverse`, a scratch file outside the tree proves the statement of `wholeThings_newest` false whenever two such records exist, and it does not build against the unmutated definition. The mutated build then fails at `wholeThings_things`, `wholeThings_newest`, `wholeThings_distinct` and `keyedValue_collect_limit`, whose proofs the restatement does not reach. The source was restored afterwards.
The runner still reports the first build error. Run alone with `--only` after the new laws, the entry is rejected by build at `Laws/KeyedSlots.lean:222` (`mem_wholeThings`), with a second error at `wholeThings_distinct`; it is not a semantic proof kill there. The new laws are what state the property it breaks.

## Count, sum, min, max and collect following `keys`: the twenty-one new entries and sixteen whose definitions moved, at `cd2e9ca`

The catalogue has 291 entries: 270 and twenty-one that mutate the slots that follow `keys` (`thingEv`, `soleSetter`, `Acc.overThings`, `keyedValue`, `By.thingKeys`, `Slot.keyedGrouped`, `Slot.run`, `Slot.plain`, `accPool`, `FoldType.follow`, `foldType`) and `setters` and `liveIn` (`Loops/Live.lean`).
`follow` on count, sum, min, max and collect is now an `Option Follow`, so eleven entries are retargeted at their new sites, and `keys-follow-anywhere` now refuses `keys` off latest-by.
The full catalogue is not rerun. Node 25.9 runs the twenty-one new entries, the eleven retargeted and five whose definitions the change touched, with `--only`, in one run, with a 900-second timeout.
The last column gives the first error the build reports, file and line in the unmutated tree.

| Entry | Wrong rule | Outcome | Where |
|---|---|---|---|
| `keys-slots-every-record-chooses` | let any record of a thing, not only a head, choose it | rejected by build | `Laws/Spec.lean:418` |
| `keys-slots-unchosen-unknown` | count a thing none of whose heads is chosen as unread | rejected by build | `Laws/KeyedSlots.lean:59` |
| `keys-slots-first-of-two-setters` | read a field from the newest of two or more live setters | rejected by build | `Laws/KeyedSlots.lean:84` |
| `keys-slots-unreadable-not-unread` | drop a selected thing whose field cannot be read without counting it unread | rejected by build | `Laws/KeyedSlots.lean:119` |
| `keys-slots-count-unknown-dropped` | count no thing unread whose tests are unknown | rejected by build | `Laws/KeyedSlots.lean:63` |
| `keys-slots-collect-heads` | collect a selected thing's heads, not its live records | rejected by build | `Laws/Spec.lean:455` |
| `keys-slots-collect-no-limit` | ignore limit on a collect that follows keys | rejected by build | `Laws/KeyedSlots.lean:435` |
| `keys-slots-every-record-listed` | list every record of a selected thing, replaced or not | rejected by build | `Laws/Spec.lean:433` |
| `keys-slots-replaced-setters` | read a field from every setter of it, replaced or not | rejected by build | `Laws/Spec.lean:423` |
| `keys-slots-payload-key-from-heads` | read a payload key from the chosen heads, not the field's live setters | rejected by build | `Laws/Spec.lean:466` |
| `keys-slots-envelope-key-every-head` | read an envelope key from every head, chosen or not | rejected by build | `Laws/KeyedSlots.lean:165` |
| `keys-slots-unheld-key-read` | read the keys of the setters held, passing over one not held | rejected by build | `Laws/KeyedSlots.lean:149` |
| `keys-slots-unreadable-key-dropped` | drop a thing whose key cannot be read without counting it unread | rejected by build | `Laws/KeyedSlots.lean:185` |
| `keys-slots-ungrouped-dropped` | count no thing ungrouped | rejected by build | `Laws/KeyedSlots.lean:185` |
| `keys-slots-grouped-as-records` | group a slot that follows keys by records, as written | rejected by build | `Laws/Spec.lean:557` |
| `keys-slots-count-as-records` | count records, as written, when following keys | rejected by build | `Laws/Spec.lean:487` |
| `keys-slots-sum-over-heads` | sum over the heads when following keys, as following prev does | rejected by build | `Laws/Spec.lean:487` |
| `keys-slots-collect-as-prev` | collect the heads when following keys, as following prev does | rejected by build | `Laws/Spec.lean:496` |
| `keys-slots-pool-swapped` | fold the heads without follow, and every record following prev | rejected by build | `Laws/Spec.lean:794` |
| `keys-slots-collect-not-following` | group a collect that follows keys by records, as written | rejected by build | `Laws/SpecSlice.lean:508` |
| `keys-slots-count-parsed-unfollowed` | parse a count that follows keys as one that does not follow | rejected by build | `Laws/Parse.lean:504` |
| `wide-spec-069` | (retargeted) change this selection or check | killed by vector | `spec/parse/64` |
| `follow-pool-every` | (retargeted) fold every record when following prev | rejected by build | `Laws/Spec.lean:491` |
| `follow-pool-heads-always` | (retargeted) fold the heads even without follow | rejected by build | `Laws/Spec.lean:492` |
| `follow-count-every` | (retargeted) count every record when following prev | rejected by build | `Laws/By.lean:228` |
| `follow-max-every` | (retargeted) take the maximum over every record when following prev | rejected by build | `Laws/KeyedSlots.lean:486` |
| `follow-sum-parse-dropped` | (retargeted) parse sum without its follow | rejected by build | `Laws/Parse.lean:504` |
| `follow-json-inverted` | (retargeted) write follow on the slots that do not follow | rejected by build | `Laws/Parse.lean:501` |
| `follow-count-envelope-first` | (retargeted) choose by from and where before working out the heads, when following prev | rejected by build | `Laws/Spec.lean:491` |
| `follow-count-unknown-first` | (retargeted) let an unknown payload test outrank a failing envelope test, when following prev | rejected by build | `Laws/By.lean:225` |
| `keys-follow-anywhere` | (retargeted) refuse follow keys on every fold type but latest-by | rejected by build | `Laws/Parse.lean:501` |
| `keys-written-as-prev` | (retargeted) write follow as prev in the parsed form of a keyed latest-by | rejected by build | `Laws/Parse.lean:508` |
| `wide-spec-062` | (unchanged) | rejected by build | `Laws/By.lean:225` |
| `finish-spec-slot-tojson` | (unchanged) | rejected by build | `Laws/Parse.lean:476` |
| `coverage-spec-slotfollow` | (unchanged) | rejected by build | `Laws/Parse.lean:504` |
| `follow-count-not-written` | (unchanged) | rejected by build | `Laws/Parse.lean:504` |
| `by-group-before-heads` | (unchanged) | rejected by build | `Laws/Spec.lean:548` |

No entry survives.
Thirty-six are rejected by build and one killed by a vector.
Each rejection is an error at a theorem, not a warning alone; five of them also report a warning first.
Build rejections are not semantic proof kills; the entries rejected by build were not applied by hand.
The runner exits 0: no generator assertion, timeout or infrastructure failure occurs.
It restored the source after each entry and rebuilt the baseline at the end.
Raw results and logs were kept under the session's scratch directory and deleted once this summary was written.

## Latest-by following `keys`: the twenty new entries and ten whose definitions moved, at `4a3817f`

The catalogue has 270 entries: 250 and twenty that mutate liveness per key (`Loops/Live.lean`) and the keyed slot, its selection, its grammar and its parsed form (`Loops/Spec.lean`).
`coverage-spec-slotfollow` is retargeted at `slotFollow`'s new result, `some .prev`.
The full catalogue is not rerun. Node 25.9 runs the twenty new entries and the ten whose definitions the change touched (`slotFollow`, `foldType`, `Slot.toJson`, `Slot.plain`), with `--only`, in one run, with a 900-second timeout.

| Entry | Wrong rule | Outcome | Where |
|---|---|---|---|
| `keys-live-for-no-above` | every setter of a key live, replaced or not | rejected by build | `liveFor_iff` |
| `keys-whole-sets-nothing` | a whole-read record sets no key | rejected by build | `live_iff` |
| `keys-env-not-live` | the envelope not among the keys a record is live for | rejected by build | `live_congr` |
| `keys-whole-always-live` | a whole-read record live under a whole-read record above it | rejected by build | `live_congr` |
| `keys-above-direct` | above only what names a record directly | rejected by build | `mem_above` |
| `keys-upward-one-step` | the upward reach stops after one record | rejected by build | `mem_upward` |
| `keys-from-heads` | only the heads' declared keys listed | rejected by build | `keyedIn_keys` |
| `keys-whole-not-live` | every whole-read record listed as whole | rejected by build | `keyedIn_whole` |
| `keys-heads-are-live` | the live records listed as the heads | rejected by build | `head_live` |
| `keys-chosen-by-live` | a live whole-read record chooses the thing | rejected by build | `keyedOf_things` |
| `keys-tests-on-heads` | payload tests asked of the heads | rejected by build | `Cond.onThing_congr` |
| `keys-unheld-skipped` | a setter not held passed over | rejected by build | `Cond.onThing_payload` |
| `keys-unset-unknown` | a field no record sets answers unknown | rejected by build | `Cond.onThing_payload` |
| `keys-differ-yes` | held setters that disagree answer yes | rejected by build | `Tri.agree_congr` |
| `keys-unread-no` | a thing whose tests answer no counted unread | rejected by build | `keyedOf_unread` |
| `keys-follow-anywhere` | `follow: keys` accepted on every fold type | killed by vector | `spec/parse/98`–`102`, `106`, `107` |
| `keys-parsed-as-prev` | a keyed latest-by parsed as following `prev` | rejected by build | `parseSlot_toJson` |
| `keys-written-as-prev` | a keyed latest-by written as following `prev` | rejected by build | `parseSlot_toJson` |
| `keys-run-as-prev` | a keyed latest-by run as following `prev` | rejected by build | `Slot.plain_set_decides` |
| `keys-withhold-drops-sets` | a withheld record loses `sets` | rejected by build | `withhold_envelope` |
| `coverage-spec-slotfollow` | (retargeted) `follow` only on collect and latest-by | rejected by build | `parseSlot_toJson` |
| `wide-spec-062` | (unchanged) | rejected by build | `Slot.plain_slice` |
| `wide-spec-069` | (unchanged) | killed by vector | `spec/parse/64` |
| `finish-spec-slot-tojson` | (unchanged) | rejected by build | `Slot.toJson_distinct` |
| `follow-count-every` | (unchanged) | rejected by build | `count_group` |
| `follow-max-every` | (unchanged) | killed by vector | `spec/run/16`, `18`, `24` |
| `follow-sum-parse-dropped` | (unchanged) | rejected by build | `parseSlot_toJson` |
| `follow-count-not-written` | (unchanged) | rejected by build | `parseSlot_toJson` |
| `follow-count-envelope-first` | (unchanged) | rejected by build | `Slot.plain_set_decides` |
| `follow-count-unknown-first` | (unchanged) | rejected by build | `Slot.plain_slice` |

No entry survives.
Twenty-seven are rejected by build and three killed by vectors.
Build rejections are not semantic proof kills; the entries rejected by build were not applied by hand.
The runner exits 0: no generator assertion, timeout or infrastructure failure occurs.
It restored the source after each entry and rebuilt the baseline at the end.
Raw results and logs were kept under the session's scratch directory and deleted once this summary was written.

## `sets`: the ten new entries and six whose targets moved, at `132e06a`

The catalogue has 250 entries: 240 and ten that mutate `sets` in the envelope, its reader, the writer's codes and the batch.
`finish-envelope-env-tojson` keeps its site, which is now `Loops.Env.baseJson`, and is retargeted there.
The full catalogue is not rerun. Node 25.9 runs the ten new entries and the six whose definitions the change touched, with `--only`, in one run, with a 900-second timeout.

| Entry | Wrong rule | Outcome | Where |
|---|---|---|---|
| `sets-not-keys-skipped` | a `sets` that is not keys accepted | rejected by build | `Env.problem_sets` |
| `sets-empty-name-accepted` | an empty name, so an unreadable member, accepted | rejected by build | `unreadable_refused` |
| `sets-before-erases` | `sets-not-keys` checked before `erases-not-record-id` | rejected by build | `Env.problem_sets_not_keys` |
| `sets-after-of-missing` | `sets-not-keys` checked after `of-missing` | rejected by build | `Env.problem_sets_not_keys` |
| `sets-write-code-after-of-missing` | `sets-not-keys` ranked after `of-missing` in a batch | generator assertion | `batch/80-sets-before-of-missing: rotation 0 gives (some of-missing)` |
| `sets-empty-left-out` | an empty `sets` left out of the canonical envelope | rejected by build | `setsJson_eq` |
| `sets-not-canonical` | members in the writer's order, repeats kept | rejected by build | `setsJson_eq` |
| `sets-field-unknown` | `sets` an unknown envelope field | generator assertion | `record/shape-sets-text: the model answers envelope-field-unknown` |
| `sets-read-dropped` | the reader drops `sets` | rejected by build | `Read.envOf_sets_mistyped` |
| `sets-key-as-label` | a key that looks like a label replaced by its id | rejected by build | `substEnv_congr` |
| `finish-envelope-env-tojson` | (unchanged) | killed by vector | `batch/01`, `02`, `record/02`, `03`, `11` |
| `wide-envelope-011` | (unchanged) | rejected by build | `Env.problem_unreadable` |
| `d8-of-not-typed-skipped` | (unchanged) | rejected by build | `Env.problem_unreadable` |
| `d8-of-missing-skipped` | (unchanged) | rejected by build | `Env.problem_of` |
| `step1-envelope-keys-remove` | (unchanged) | generator assertion | `R6 raw keys must precede envelope values` |
| `read-missing-kind-filled` | (unchanged) | rejected by build | `Read.envOf_missing` |

No entry survives.
Build rejections are not semantic proof kills; the entries rejected by build were not applied by hand.
The runner exits 1 for the generator assertions; no timeout or infrastructure failure occurs.
It restored the source after each entry and rebuilt the baseline at the end.
Raw results and logs were kept under the ignored `rust/target/scratch` and deleted once this summary was written.

## `under-unknown`: the four new entries, at `9b5f552`

The catalogue has 240 entries: 236 and four that mutate the new `under-unknown` check in `Loops.checkPrev`.
The full catalogue is not rerun. Node 25.9 runs only the four new entries, with `--only`, in one run, with the default 180-second timeout.

| Entry | Wrong rule | Outcome | Where |
|---|---|---|---|
| `under-unknown-skipped` | an unheld `under` target is accepted | killed by vector | `batch/67`, `73`, `74` |
| `under-unknown-before-prev` | `under-unknown` checked before `prev-unknown` | killed by vector | `batch/71`, `72` |
| `under-unknown-after-of-not-root` | `under-unknown` checked after `of-not-root` | killed by vector | `batch/73` |
| `under-unknown-store-only` | an `under` target looked up in the store only | generator assertion | `batch/65-chain-under: under-unknown` |

No entry survives.
`under-unknown-store-only` stops at the generator's own check of the `under` chain in `batch/65`.
Applied by hand, with the replay checker (`lake exe run --check`), it changes `batch/33`, `65`, `66` and `69`, each of which has a draft under a batch member; the source was then restored and the baseline rebuilt.
The runner exits 1 for the generator assertion; no timeout or infrastructure failure occurs.
It restored the source after each entry and rebuilt the baseline at the end.
Raw results and logs were kept under the ignored `rust/target/scratch` and deleted once this summary was written.

## `by` on a followed collect: the `by` entries, at `9e07995`

`by` now groups collect that follows `prev`, so `by-on-followed-collect` no longer names a wrong rule.
It is retargeted at the one refusal left, as `by-on-latest-by` (`by` accepted on latest-by); the catalogue keeps 236 entries.
Node 25.9 reruns the seven `by` entries alone, with `--only`, in runs of three and four.
Six are rejected by build and `by-unreadable-ungrouped` is killed by `spec/run/21`, `24`, `25` and the new `30`.
`by-on-latest-by` fails at `Laws/Parse.lean` (`parseSlot_toJson`); applied by hand with only the generator built, it changes `spec/parse/90`.
`by-group-before-heads` now also covers the grouped followed collect: applied by hand, it changes `spec/run/24` and `30`.
The other four build-rejected entries were not applied by hand again; their earlier hand applications below predate `spec/run/30`.
The runner restored the baseline build after both runs, and its output under the ignored `rust/target/scratch` was deleted.

## After the merge of `main` with issue #1: the `by` entries, at `8d39dbd`

The catalogue has 236 entries: 229 on `main` and the seven `by` adds.
The full catalogue is not rerun. Node 25.9 reruns the seven `by` entries alone, with `--only`, in runs of three and four, on the merged tree.
The outcomes are those of the run below: six rejected by build and `by-unreadable-ungrouped` killed by `spec/run/21`, `24` and `25`.
`by-empty-groups-kept` now first fails at `Laws/SpecSlice.lean` (`Slot.grouped_slice`) in the build's order; the rest fail at the same proofs as before.
The hand applications below were not repeated: the merge changes neither `Loops/Spec.lean`, which they mutate, nor `Gen/Spec.lean`, which writes the spec vectors they change.
The runner restored the baseline build after both runs, and its output under the ignored `rust/target/scratch` was deleted.

## `by`: targeted run

The full catalogue is not rerun for issue #2.
Node 25.9 runs only the seven entries `by` adds, with `--only`, in two runs of three and four, and the default 180-second timeout.
They mutate `Spec.run`, `Slot.grouped`, `groupKeys`, `inGroup`, `By.keys` twice and `slotBy`.

| Entry | Wrong rule | Outcome | Where |
|---|---|---|---|
| `by-group-before-admit` | a grouped slot reads the records as held, not as admitted | rejected by build | `Laws/Spec.lean`: `Spec.set_decides` |
| `by-group-before-heads` | each group works out heads from its own records | rejected by build | `Laws/Spec.lean`: `Slot.grouped_set_decides` |
| `by-empty-groups-kept` | a group for every key read, selected or not | rejected by build | `Laws/By.lean`: `groupKeys_nonempty`, `By.memberships` |
| `by-unknown-in-group` | an unknown `where` counts in its group as well as at the top | rejected by build | `Laws/By.lean`: `groupKeys_nonempty`, `By.memberships`; `Laws/SpecSlice.lean`: `Slot.grouped_slice` |
| `by-membership-once` | a record with several keys joins only the first | rejected by build | `Laws/By.lean`: `By.keys_nodup` |
| `by-unreadable-ungrouped` | a payload key on a withheld payload is ungrouped, not unread | killed by vector | `spec/run/21`, `24`, `25` |
| `by-on-followed-collect` | `by` accepted on collect with `follow` | rejected by build | `Laws/Parse.lean`: `parseSlot_toJson`, `parseSlot_fits` |

Build rejections are not kills.
`by-empty-groups-kept` and `by-unknown-in-group` fail where a law fails: no empty groups, and the groups holding the selected records once per key.
The other four fail because a proof matches the definition's form: grouping before admission or before the heads is still decided by the set, and taking one key keeps keys distinct.
So all six were also applied by hand, with only the generator built (`lake build gen`, then `lake exe gen` into a copy of `vectors/`).
Each changes vectors:

| Entry | Vectors that change |
|---|---|
| `by-group-before-admit` | `spec/run/23` (the refused revision appears in group `y`) |
| `by-group-before-heads` | `spec/run/24` (the moved task's old version stays current in `x`) |
| `by-empty-groups-kept` | `spec/run/21`, `22`, `24`, `25` |
| `by-unknown-in-group` | `spec/run/21`, `24` |
| `by-membership-once` | `spec/run/22`, `24` |
| `by-on-followed-collect` | `spec/parse/91` |

`by-group-before-admit` does not model settling within a group: the runner's spec vectors hand records over settled.
`scenario/by-01-erased-in-another-group` pins that case, settling forms first, and no catalogue entry mutates it.
Each build rejection was read in its log and fails at the named proof, not at a lint.
The runner restored the source and rebuilt the baseline after both runs; each hand application was reverted with `git checkout` and the generator rebuilt.
Raw results and logs were kept under the ignored `rust/target/scratch` and deleted once this summary was written.

## After the merge of `main`: both changes' entries, at `849d4da`

The catalogue has 229 entries: 210, then ten for issue #1 and nine for `follow`, with six earlier entries retargeted between them.
The full catalogue is not rerun. Node 25.9 runs the 25 entries the two changes add or retarget, with `--only`, five or fewer at a time.
The fourteen issue #1 entries give nine build rejections and five generator assertions, as in their review-round run below.
The eleven `follow` entries give eight build rejections and three vector differences (`wide-spec-069`, `follow-count-every`, `follow-max-every`), as in their run below.
No entry survives, and every run restores the baseline build.
The cheap runner, rerun on the merged tree, kills 33 of 33 mutants.

## Issue #1 and labels in `under`: the changed entries only

### After the review round, at `ee0b9d3`

The same fourteen entries, rerun alone, after `Laws.Read` and one retargeted site (`read-missing-kind-filled` now names `Read.envOf`):
nine are rejected by the build and five stop at a generator assertion.
The five reader entries (`read-wrong-type-accepted`, `read-wrong-set-empty`, `read-missing-kind-filled`, `read-salt-not-text-filled`, `read-salt-not-base32-filled`) now fail the build at `Laws/Read.lean`, where they were generator assertions.
The other nine keep the outcomes below.
The cheap runner, rerun at `ee0b9d3`, kills 33 of 33 mutants.

### First run

The catalogue has 220 entries: issue #1 retargets four and adds ten.
The full catalogue is not rerun; the D8a and D8b snapshot below remains the last full run, over 210 entries.
Only the fourteen changed entries run, with `--only`, in the working tree at `6691065`'s model:

| Mutation | Outcome |
|---|---|
| `wide-batch-004` (retargeted) | rejected-by-build |
| `step1-envelope-keys-after-value` (retargeted) | error |
| `step1-draft-keys-after-values` (retargeted) | error |
| `step1-record-keys-after-values` (retargeted) | error |
| `shape-not-object-skipped` | rejected-by-build |
| `shape-not-object-before-unknown` | error |
| `shape-draft-without-env-passes` | error |
| `read-wrong-type-accepted` | error |
| `read-wrong-set-empty` | error |
| `read-missing-kind-filled` | error |
| `read-salt-not-text-filled` | error |
| `read-salt-not-base32-filled` | error |
| `under-subst-skipped` | rejected-by-build |
| `under-refs-skipped` | rejected-by-build |

Every error is a generator assertion at the case the entry targets.
The reader entries stop at the `record/shape-*` vector whose refusal they remove, such as `record/shape-kind-number: no answer`.
`shape-draft-without-env-passes` stops at `batch/55-env-missing-before-label-value`, and the order entries at the R6 self-checks.
`step1-envelope-keys-after-value` first survived that run: a mistyped `kind` no longer fails decoding, so its old self-check passed.
A self-check that shape precedes a repeated envelope member now stops it; rerun alone at `fb16fc6`, it is an error again, as in the D8 run.
The cheap runner, which is rerun at `fb16fc6` with two retargeted sites, kills 33 of 33 mutants.
## Follow on count, sum, min and max: targeted run

The full catalogue is not rerun for issue #3.
Node 25.9 runs only the eleven entries the change adds or retargets, with `--only` and the default 180-second timeout.
The nine new entries mutate `accPool`, four followed counts and maxima in `Slot.run`, `foldType`, `Slot.toJson` and `followJson`.
`wide-spec-069` and `coverage-spec-slotfollow` are retargeted at the new grammar.

| Entry | Outcome | Where |
|---|---|---|
| `wide-spec-069` | killed by vector | `spec/parse/64` |
| `coverage-spec-slotfollow` | rejected by build | `Laws/Parse.lean`: `parseSlot_toJson` no longer closes |
| `follow-pool-every` | rejected by build | `Laws/Spec.lean`: `Slot.set_decides` no longer typechecks |
| `follow-pool-heads-always` | rejected by build | `Laws/Spec.lean`: `Slot.set_decides` |
| `follow-count-every` | killed by vector | `spec/run/01`–`05`, `16`–`18` |
| `follow-max-every` | killed by vector | `spec/run/16`, `18` |
| `follow-sum-parse-dropped` | rejected by build | `Laws/Parse.lean`: `parseSlot_toJson` |
| `follow-count-not-written` | rejected by build | `Laws/Parse.lean`: `parseSlot_toJson` |
| `follow-json-inverted` | rejected by build | `Laws/Parse.lean`: `parseSlot_toJson` |
| `follow-count-envelope-first` | rejected by build | `Laws/Spec.lean`: `Slot.set_decides` |
| `follow-count-unknown-first` | rejected by build | `Laws/SpecSlice.lean`: `Slot.run_slice` |

The last two are the wrong orders review asked about: choosing by `from` and `where` before working out the heads, and letting an unknown payload test outrank a failing envelope test.
Both are rejected by build because the proofs match the slot's form, not because a law fails, so each was also applied by hand, with only the generator built (`lake build gen`, then `lake exe gen`).
`follow-count-envelope-first` changes `spec/run/01`, `02`, `04`, `05`, `16` and `20`.
`follow-count-unknown-first` changes only `spec/run/20`, which pins a failing envelope test after supersession.

The first run of `follow-count-every` and `follow-max-every` failed only the unused-variable lint, which is no kill; both now keep `follow` referenced (`follow && false`), and the rerun kills them by vector.
Each build rejection was read in its log and fails at the named proof, not at a lint.
The runner restored the source and rebuilt the baseline after both runs.
These results are not imported as evidence; the counts below are the last full run, over 210 entries.

## D8a and D8b snapshot: `11784e5`

The Node 25.9 run completes all 210 catalogue entries with a 240-second command timeout.
The retained [summary](evidence/mutations-d8ab/summary.json) supports these counts.
Run `python3 interop/fuzz/summarize.py report` from the repository root.

| Outcome | Count |
|---|---:|
| Rejected by build | 165 |
| Vector differences | 28 |
| Generator assertion exceptions | 15 |
| Survivors | 2 |

The runner exits 1 for generator assertions.
Each error retains its assertion text in the summary.
No command times out, receives a signal, or reports a spawn or cleanup error.
Build rejections are not semantic proof kills.
Generator assertions are not vector-difference kills.
Survival alone proves neither equivalence nor reachability.

The catalogue retargets ten entries at `of` and the one thing it names.
Each gives this outcome:

| Mutation | D1–D6 run | This run |
|---|---|---|
| `spec-source-all-any` | error | rejected-by-build |
| `things-no-self-anchor` | rejected-by-build | rejected-by-build |
| `wide-batch-004` | rejected-by-build | rejected-by-build |
| `wide-spec-070` | rejected-by-build | rejected-by-build |
| `wide-things-083` | rejected-by-build | rejected-by-build |
| `wide-things-084` | killed-by-vector | rejected-by-build |
| `finish-batch-subst` | rejected-by-build | rejected-by-build |
| `finish-batch-envthings` | killed-by-vector | killed-by-vector |
| `finish-things-statein` | rejected-by-build | rejected-by-build |
| `extra-things-thingsof` | rejected-by-build | rejected-by-build |

Their targets changed, so these rows compare outcomes, not the same replacement.
No entry outside these ten changes its outcome.

Nine new entries cover D8:

| Mutation | Full-catalogue outcome |
|---|---|
| `d8-thing-ignores-of` | rejected-by-build |
| `d8-of-not-typed-skipped` | error |
| `d8-of-missing-skipped` | rejected-by-build |
| `d8-of-not-root-skipped` | killed-by-vector |
| `d8-unrelated-ignores-target-of` | killed-by-vector |
| `d8-subst-of-skipped` | rejected-by-build |
| `d8-source-of-by-about` | rejected-by-build |
| `d8-source-of-typed` | rejected-by-build |
| `d8-env-of-reads-thing` | rejected-by-build |

`d8-of-not-typed-skipped` stops at a generator assertion: `record/40-of-untyped: expected a refusal`.
`d8-of-not-root-skipped` and `d8-unrelated-ignores-target-of` build, and change batch vectors.
No law states the batch checks; the vectors pin them.

The 14 Step-1, D1 and D2 guard entries keep their D1–D6 outcomes.
2 survivors remain, the two with scoped-equivalence interpretations below:

- `finish-json-hexdigit`
- `last-spec-tests-conds`

Those interpretations are unchanged and are not approved laws.

The run uses a copy of `model/` and `vectors/` at `11784e5`, in its own repository.
`11784e5` is the model this report's commit carries; later commits change no file under `model/` or `vectors/`.
Both baseline builds pass there; initial generation matches the committed corpus.
The completed run covers exactly the current catalogue IDs.
Source files restore to the copy's commit, and `model/.mutation-run.lock` is absent.
Other builds ran in the working tree, not the copy, during the run.
The cheap runner, which is rerun, kills 33 of 33 mutants: every one compiles and then fails runtime checks.

```sh
node model/mutate/run.mjs --timeout 240 --output /tmp/d8ab-mutants.json
python3 interop/fuzz/summarize.py mutation /tmp/d8ab-mutants.json mutations-d8ab
```

## HISTORICAL D1–D6 snapshot: `bb9dc46`

This run predates D8; ten of its entries had other targets then.

The Node 25.9 run completes all 201 catalogue entries with a 240-second command timeout.
The retained [summary](evidence/mutations-d1-d6/summary.json) supports these counts.
Run `python3 interop/fuzz/summarize.py report` from the repository root.

| Outcome | Count |
|---|---:|
| Rejected by build | 157 |
| Vector differences | 27 |
| Generator assertion exceptions | 15 |
| Survivors | 2 |

The runner exits 1 for generator assertions.
Each error retains its assertion text in the summary.
No command times out, receives a signal, or reports a spawn or cleanup error.
Build rejections are not semantic proof kills.
Generator assertions are not vector-difference kills.
Survival alone proves neither equivalence nor reachability.

D6 approves the four helper lemmas, and the model now proves them.
Each of the four former survivors fails the build at its lemma:

| Mutation | Full-catalogue outcome |
|---|---|
| `wide-families-013` | rejected-by-build |
| `wide-spec-064` | rejected-by-build |
| `extra-families-max-acc` | rejected-by-build |
| `extra-families-min-acc` | rejected-by-build |

`Sum.on_step_missing`, `Max.acc_readable`, `Min.acc_readable`, and `Spec.mem_select` are those lemmas.
Runtime pins in `lake exe checks` reject the same four replacements after a successful build.
The cheap runner takes them as guards.

2 survivors remain, the two with scoped-equivalence interpretations below:

- `finish-json-hexdigit`
- `last-spec-tests-conds`

Those interpretations are unchanged and are not approved laws.

The catalogue has six new entries for the D1 base boundary and the D2 code-unit reader.
With the eight Step-1 guards they give these outcomes:

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
| `d1-base-problem-remove` | rejected-by-build |
| `d1-read-text-first` | rejected-by-build |
| `d2-lone-low-accepted` | rejected-by-build |
| `d2-lone-high-accepted` | rejected-by-build |
| `d2-low-surrogate-range` | rejected-by-build |
| `d2-high-surrogate-range` | rejected-by-build |

Every entry whose outcome differs from the Round 2 run:

| Mutation | Round 2 | This run |
|---|---|---|
| `extra-families-max-acc` | survived | rejected-by-build |
| `extra-families-min-acc` | survived | rejected-by-build |
| `things-negate-erases` | error | rejected-by-build |
| `wide-families-013` | survived | rejected-by-build |
| `wide-spec-064` | survived | rejected-by-build |

The run uses a copy of `model/` and `vectors/` at `bb9dc46`, in its own repository.
Both baseline builds pass there; initial generation matches the committed corpus.
The completed run covers exactly the current catalogue IDs.
The copy keeps the working tree free for other builds; no other process builds in the copy.
The cheap runner, which is rerun, kills 32 of 32 mutants: every one compiles and then fails runtime checks.

```sh
node model/mutate/run.mjs --timeout 240 --output /tmp/d1-d6-mutants.json
python3 interop/fuzz/summarize.py mutation /tmp/d1-d6-mutants.json mutations-d1-d6
```

## HISTORICAL Round 2 review-fix snapshot: `8a12ba6`

This run predates D6: its six survivors include the four helper candidates.

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
