# Horizon cases and model limits

The source is `design/rethink/sections/14-horizons.html`.
This map covers the six walks and the 19 ideas under "The rest".
The model checks only the steps in the middle column.
The last column lists steps outside that check.

A scenario step describes held forms. It is not a tick.
A source name in a spec does not fetch a store.
An `about` key does not prove ownership or resolve an external identity.
A fixture admission rule does not check grants or signatures.

## The six walks

| Case | What the model shows today | What it needs |
|---|---|---|
| Editable lenses | Find heads. Render keyed sections. Parse edits. Match sections by id. Keep absent sections. Report unknown sections. See `scenario/02-editable-lenses`. | Connect edits to record writes. Bind the base to a tick, lens hash, and audience. Check rights. Apply files atomically. Define promotion and stale-base checks. |
| The LSP | Attach records to a supplied code key. Keep revisions and forks under that key. See `scenario/03-lsp-context`. | Find birth keys through each Git branch. Resolve `same-as`. Check seen versions. Build hover output. Close Git segments. Repair merge and squash histories. |
| Web annotation | Join annotation and thread records by a supplied URL key. Refuse unrelated replacements. See `scenario/04-web-annotation`. | Normalize URLs. Locate and repair selectors. Add browser tools, public places, discovery, bridges, key bindings, static indexes, and an aggregator. |
| Context by tick | Read held, withheld, and erased forms. Keep hidden heads visible. See `scenario/05-context-forms`. | Define ticks, coverage, witnesses, pins, and retirement cuts. Define bundle carry, envelope, and omit rules. Add fetchable and unreachable states, grants, borrowed places, and return sync. |
| Selective disclosure | Share envelopes. Withhold payloads. Preserve heads. Count unknown payload tests as unread. See `scenario/06-selective-disclosure`. | Bind records to covered ticks. Define disclosure policy, grants, promotion, bundle filtering, and requests to open payloads. Check stored commitments at the sharing boundary. |
| Knowledge as a build | Run one spec over the same forms in different orders. Get the same slots. See `scenario/07-knowledge-build`. | Define input keys, result hashes, dependency keys, witness ticks, pinned roots, and as-of inputs. Add cache lookup, signed cache places, and render caching. |

## The rest

| Case | What the model shows today | What it needs |
|---|---|---|
| Bitemporal questions | Test `env.emitted` and `env.occurred` together. Compare current heads with historical record selection. See `scenario/08-bitemporal-questions`. | Define as-of folds that cut inputs before supersession. A `where` test on current heads does not reconstruct past heads. |
| Two ticks give a changelog | No tick or tick difference exists in the model. | Define covered sets and tick comparison. Render the changes between those sets. |
| Fuzzy historical dates | Read coarse and open `occurred` spans. Order records by span meaning, not text spelling. See `scenario/09-fuzzy-dates`. | Add historical data adapters and user interfaces. The model does not infer uncertain dates from prose. |
| Belief time and store-held time | Filter records by `emitted`. Keep `occurred` separate. See `scenario/08-bitemporal-questions`. | Define past-head queries and witness ticks. An emitted time does not prove when a store holds a record. |
| Knowledge about X across stores | Join supplied records by shared `about` keys. Keep each thing's heads separate. See `scenario/10-cross-store-query`. | Discover and fetch readable stores. Resolve keys. Check access and provenance. Store names alone do not perform these steps. |
| Code blame and hover | Read records about a supplied code key. See `scenario/03-lsp-context`. | Add Git-history birth-key discovery, blame, hover rendering, and version checks. |
| Web and Discord annotation | Join records from different kinds under the same URL key. See `scenario/04-web-annotation`. | Add browser and Discord collectors, URL normalization, selectors, public discovery, places, and bridges. |
| Stores that travel with things | Keep a stable thing key across a stated owner change. Keep the preceding records. See `scenario/11-store-transfer`. | Define steward authority, key transfer, place ownership, and verifiable handoff. An owner field is only a claim. |
| Conflict-free file sync | Combine supplied record sets. Settle them before counting. Compare arrival orders. See `scenario/12-file-sync`. | Define immutable file layout, file transport, and read verification. The scenario does not test a filesystem or a sync service. |
| Static hosting as a read place | Compose supplied records and apply realm admission. See `scenario/10-cross-store-query` and `scenario/15-contradiction-queue`. | Define public places, static indexes, HTTP reads, subscriptions, key discovery, and verification on read. |
| Bundles by email | Read the forms that a bundle could carry. See `scenario/05-context-forms`. | Define bundle encoding, covered-set binding, bridge rules, signatures, attachment transport, and verification on arrival. |
| External proof of existence | No tick hash or external timestamp proof exists in the model. | Define tick hashes and receipts. Verify RFC 3161 or OpenTimestamps anchors. |
| Logs for disputes | Keep event claims and revisions. Sum readable values. Preserve disputed heads. See `scenario/13-dispute-log`. | Define witness ticks, signing authority, external anchors, and evidence export. The model does not prove an event occurs. |
| Spaced review | Select old records with time tests. Add a later review record. See `scenario/14-stale-review`. | Define review schedules, affirmation policy, reminders, and a clock-driven stale view. |
| Contradiction queue | Keep fork heads. Show refused replacements under an explicit envelope rule. See `scenario/15-contradiction-queue`. | Define dispute policy, queue presentation, rights, and resolution workflow. A fixture rule is not a grant evaluator. |
| Agent tools | Add records and run a query over successive held sets. See `scenario/16-agent-tools`. | Add MCP transport, tool calls, sessions, tick operations, and grant enforcement. |
| `CLAUDE.md` as lens output | Show forks in a spec result. Render a supplied keyed document. See `scenario/17-agent-lens`. | Define the agent document renderer, dispute presentation, audience policy, and file integration. |
| Context by tick id between agents | Preserve hidden heads across supplied reader forms. See `scenario/05-context-forms`. | Define context and witness ticks, coverage, bundles, stage lenses, borrowed places, and a verifiable session trace. |
| Collectors in any language | Combine supplied records from distinct observers. Fold the resulting set. See `scenario/18-collectors`. | Add stdin framing, importer adapters, source identity, validation at ingress, and retry handling. |

## Erasure across the walks

`scenario/19-erasure` checks held erasers, withheld targets, and later full target forms.
A held eraser keeps its target erased.
This check does not prove deletion from an external place or backup.

## Existing definitions

- `model/Loops/Record.lean` defines envelopes, reader forms, withholding, and erasure.
- `model/Loops/Stored.lean` defines commitments and checks payload openings.
- `model/Loops/Occurred.lean` defines time claims and spans.
- `model/Loops/Fold.lean` defines heads and content order.
- `model/Loops/Things.lean` defines settlement and parameterized admission.
- `model/Loops/Spec.lean` defines selection and slots over supplied records.
- `model/Loops/Lens.lean` defines section parsing, differences, application, and normalization.
- `model/Loops/Batch.lean` checks record batches. It does not apply edits across files.

The model has no tick, place, bridge, or key-binding workflow.
It has cryptographic keys and record signatures. These do not define sharing authority.
Spec keys such as `ticks` and `window` remain carried data. The model does not evaluate them.

## Scenario format changes

A scenario can omit `lens` when the case has no document edit.
This removes a false document dependency from record-only cases.

An optional `mayReplace` list names allowed pairs of record ids.
Each pair names the new record and its predecessor, in that order.
An absent list keeps the existing allow-all rule.
An empty list permits no replacement of a held predecessor.
The rule reads ids only. It does not evaluate grants.
Cases with this list also report refusal codes.
This exposes the existing admission parameter. It adds no protocol primitive.
