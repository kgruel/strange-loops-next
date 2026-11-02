# Definition coverage

This inventory records the original `mutants` branch before integration.
Its file headings and exclusions are historical, not a coverage claim for the merged model.
The catalogue now follows moved definitions into `model/Loops/Id.lean` and `model/Loops/Fold.lean`.
Use `node model/mutate/run.mjs --list` for current source paths.
The runner tests check every current replacement site.
The round-two fixes retain 187 original entries and eight guard mutations: 195 entries total.
The raw-reader ordering mutations target library definitions under `Loops`.
The cheap runner uses the same eight replacements and requires runtime failures after successful builds.
This inventory does not claim exhaustive coverage of the changed model.

Retire `finish-occurred-stamp-of`: its extra plus-sign guard is equivalent under R4.
The actual instant parser already rejects every text containing `+`.
Accepted instants use only digits and fixed UTC separators.
Rejected instants still return `none` on either path.
This is a source-based equivalence reason, not an inference from survival.
The six older survivor entries remain unchanged.

The parser no longer calls `stripZeros`.
Its accepted fractions already end with a nonzero digit; `tail_last` proves this property.
The helper and its five lemmas have no users outside their own family.
The exported proof graph confirms this result.
Remove the family and retire `wide-time-094`, which targets only the removed definition.
The UTC parser has no offset helper, offset tuple or normalization step.

A covered definition has at least one catalogue entry.
Exclusions state why the definition has no direct eligible operation.
The catalogue includes existing entries without definition metadata.

## model/Loops/Base32.lean

- `Loops.base32Alphabet`: excluded: It is a fixed alphabet. No direct eligible operation.
- `Loops.base32`: covered by `coverage-base32-bit-order`
- `Loops.unbase32`: covered by `step1-base32-reencode`

## model/Loops/Batch.lean

- `Loops.isLabel`: covered by `wide-batch-003`
- `Loops.subst`: covered by `finish-batch-subst`
- `Loops.substEnv`: excluded: It composes substitutions and constructs an envelope. No direct eligible operation.
- `Loops.Draft.refs`: covered by `wide-batch-004`
- `Loops.Draft.commit`: excluded: It delegates to commitOf. No direct eligible operation.
- `Loops.Draft.ready`: covered by `wide-batch-005`
- `Loops.resolveRounds`: covered by `wide-batch-006`
- `Loops.envThings`: covered by `finish-batch-envthings`
- `Loops.checkPrev`: covered by `finish-batch-checkprev`
- `Loops.resolveBatch`: covered by `wide-batch-007`

## model/Loops/Envelope.lean

- `Loops.Env.toJson`: covered by `finish-envelope-env-tojson`
- `Loops.isLowerAlnum`: covered by `wide-envelope-008`
- `Loops.typedRef`: covered by `wide-envelope-009`
- `Loops.recordId`: covered by `wide-envelope-010`
- `Loops.Env.problem`: covered by `wide-envelope-011`
- `Loops.envelopeKeysProblem`: covered by `step1-envelope-keys-remove`

## model/Loops/Families.lean

- `Loops.dedup`: covered by `wide-families-012`
- `Loops.Acc.fold`: covered by `finish-families-acc-fold`
- `Loops.Count.acc`: covered by `last-families-count-acc`
- `Loops.Sum.acc`: covered by `extra-families-sum-acc`
- `Loops.Max.acc`: covered by `extra-families-max-acc`
- `Loops.Min.acc`: covered by `extra-families-min-acc`
- `Loops.Sum.on`: covered by `wide-families-013`
- `Loops.Max.on`: covered by `wide-families-014`
- `Loops.Min.on`: covered by `wide-families-015`
- `Loops.OverHeads.fold`: excluded: It delegates to LatestBy.fold and answer. No direct eligible operation.
- `Loops.LatestBy.limit`: covered by `wide-families-016`
- `Loops.Tri.ofBool`: covered by `finish-families-tri-ofbool`
- `Loops.Tri.Refines`: covered by `last-families-tri-refines`
- `Loops.Where.eval`: covered by `families-unknown-no`
- `Loops.Acc.select`: covered by `families-drop-readable`, `families-unread-zero`
- `Loops.LatestBy.maxHeads`: covered by `wide-families-017`

## model/Loops/Fold.lean

- `Loops.Count.step`: covered by `fold-count-zero`
- `Loops.Count.fold`: covered by `finish-fold-count-fold`
- `Loops.insertId`: covered by `fold-insert-nonstrict`
- `Loops.insertRec`: covered by `finish-fold-insertrec`
- `Loops.LatestBy.step`: covered by `fold-drop-prev-filter`, `fold-drop-named-guard`
- `Loops.LatestBy.empty`: excluded: It constructs an empty state. No direct eligible operation.
- `Loops.LatestBy.fold`: covered by `finish-fold-latestby-fold`
- `Loops.LatestBy.winner`: covered by `fold-winner-last`
- `Loops.LatestBy.others`: covered by `finish-fold-latestby-others`
- `Loops.Latest.fold`: excluded: It delegates to LatestBy.fold. No direct eligible operation.
- `Loops.Latest.winner`: covered by `extra-fold-latest-winner`
- `Loops.Latest.others`: covered by `finish-fold-latest-others`
- `Loops.Sum.step`: excluded: It adds two values. No direct eligible operation.
- `Loops.Sum.fold`: covered by `finish-fold-sum-fold`
- `Loops.Max.step`: covered by `wide-fold-019`
- `Loops.Max.fold`: covered by `finish-fold-max-fold`
- `Loops.Min.step`: covered by `wide-fold-020`
- `Loops.Min.fold`: covered by `finish-fold-min-fold`

## model/Loops/Json.lean

- `Loops.utf16Char`: covered by `wide-json-021`
- `Loops.utf16`: covered by `last-json-utf16`
- `Loops.lexLt`: covered by `wide-json-022`
- `Loops.strLt`: excluded: It delegates to lexLt. No direct eligible operation.
- `Loops.insertBy`: covered by `wide-json-023`
- `Loops.sortBy`: covered by `finish-json-sortby`
- `Loops.canonSet`: excluded: It delegates to sortBy. No direct eligible operation.
- `Loops.hexDigit`: covered by `finish-json-hexdigit`
- `Loops.escapeChar`: covered by `wide-json-025`
- `Loops.quote`: covered by `last-json-quote`
- `Loops.Json.canon`: covered by `wide-json-026`
- `Loops.Json.canonAll`: covered by `finish-json-json-canonall`
- `Loops.Json.canonMembers`: covered by `finish-json-json-canonmembers`
- `Loops.Json.keysDistinct`: covered by `wide-json-027`
- `Loops.Json.allDistinct`: covered by `coverage-json-json-alldistinct`
- `Loops.Json.membersDistinct`: covered by `coverage-json-json-membersdistinct`
- `Loops.maxExact`: excluded: It is a fixed numeric bound. No direct eligible operation.
- `Loops.Json.inRange`: covered by `wide-json-028`
- `Loops.Json.allInRange`: covered by `wide-json-029`
- `Loops.Json.membersInRange`: covered by `wide-json-030`

## model/Loops/Lens.lean

- `Loops.Lens.fence`: excluded: It is a fixed character list. No direct eligible operation.
- `Loops.Lens.reserved`: covered by `wide-lens-031`
- `Loops.Lens.escape`: covered by `wide-lens-032`
- `Loops.Lens.unescape`: covered by `wide-lens-033`
- `Loops.Lens.header`: excluded: It constructs a header. No direct eligible operation.
- `Loops.Lens.headerId?`: covered by `wide-lens-034`
- `Loops.Lens.render`: covered by `extra-lens-render`
- `Loops.Lens.parseGo`: covered by `wide-lens-036`
- `Loops.Lens.parse`: excluded: It delegates to parseGo. No direct eligible operation.
- `Loops.Lens.lookup`: covered by `wide-lens-037`
- `Loops.Lens.diffSection`: covered by `wide-lens-038`
- `Loops.Lens.absentSection`: covered by `wide-lens-039`
- `Loops.Lens.diff`: covered by `extra-lens-diff`
- `Loops.Lens.acceptedBody`: covered by `wide-lens-041`
- `Loops.Lens.apply`: covered by `extra-lens-apply`
- `Loops.Lens.edit`: excluded: It maps parse results through diff. No direct eligible operation.
- `Loops.Lens.normalize`: excluded: It maps parse results through render. No direct eligible operation.

## model/Loops/Occurred.lean

- `Loops.Span.point`: excluded: It constructs a span with its proof. No direct eligible operation.
- `Loops.StopBefore`: covered by `occurred-open-stop`
- `Loops.Span.Before`: covered by `extra-occurred-span-before`
- `Loops.isQualifier`: covered by `occurred-qualifier-and`
- `Loops.dateDays?`: covered by `occurred-month-end`
- `Loops.date?`: excluded: It maps a parsed date to moments. No direct eligible operation.
- `Loops.point?`: covered by `wide-occurred-042`
- `Loops.Span.closed?`: covered by `coverage-occurred-span-closed-`
- `Loops.halves`: covered by `finish-occurred-halves`
- `Loops.single`: excluded: It binds a parsed point to Span.closed?. No direct eligible operation.
- `Loops.openFrom`: excluded: It maps a point to an open span. No direct eligible operation.
- `Loops.between`: covered by `coverage-occurred-between`
- `Loops.spanOf`: covered by `wide-occurred-043`
- `Loops.occurredSpanOf`: excluded: It delegates to halves and spanOf. No direct eligible operation.
- `Loops.occurredSpan?`: excluded: It delegates to occurredSpanOf. No direct eligible operation.
- `Loops.Stamp.of?`: excluded: It delegates acceptance to `instant?`; the old plus-sign mutation is equivalent under R4, as explained above.
- `Loops.Claim.of?`: covered by `finish-occurred-claim-of`

## model/Loops/Record.lean

- `Loops.digestDigits`: covered by `finish-record-digestdigits`
- `Loops.idDigest`: excluded: It delegates to digestDigits. No direct eligible operation.
- `Loops.idText`: covered by `wide-record-044`
- `Loops.Record.span`: covered by `finish-record-record-span`
- `Loops.Newer`: covered by `record-newer-id-flip`
- `Loops.Addressed`: covered by `extra-record-addressed`
- `Loops.Distinct`: excluded: It states Nodup on record ids. No direct eligible operation.
- `Loops.Record.withhold`: excluded: It constructs a withheld view. No direct eligible operation.
- `Loops.Record.erase`: excluded: It constructs an erased view. No direct eligible operation.
- `Loops.Record.get`: covered by `wide-record-049`
- `Loops.Record.num`: covered by `record-num-hidden`, `record-num-drop-int`
- `Loops.withholding`: covered by `wide-record-050`

## model/Loops/Spec.lean

- `Loops.EnvField.all`: excluded: It is a fixed list of fields. No direct eligible operation.
- `Loops.EnvField.name`: covered by `wide-spec-051`
- `Loops.EnvField.type`: covered by `wide-spec-052`
- `Loops.envPrefix`: excluded: It is a fixed prefix. No direct eligible operation.
- `Loops.Field.ofName`: covered by `wide-spec-053`
- `Loops.Field.name`: covered by `finish-spec-field-name`
- `Loops.Field.onEnvelope`: covered by `finish-spec-field-onenvelope`
- `Loops.Field.type`: covered by `wide-spec-054`
- `Loops.Field.read`: covered by `wide-spec-055`
- `Loops.Arg.matches`: covered by `finish-spec-arg-matches`
- `Loops.Item.atLeast`: covered by `spec-atleast-time-strict`
- `Loops.Item.below`: covered by `spec-below-time-inclusive`, `spec-below-number-inclusive`
- `Loops.Op.test`: covered by `wide-spec-056`
- `Loops.Cond.eval`: covered by `finish-spec-cond-eval`
- `Loops.Tri.and`: covered by `wide-spec-057`
- `Loops.Cond.all`: covered by `finish-spec-cond-all`
- `Loops.Tests.conds`: covered by `last-spec-tests-conds`
- `Loops.Record.unlinked`: excluded: It clears a record field. No direct eligible operation.
- `Loops.newestFirst`: excluded: It delegates ordering to LatestBy.fold. No direct eligible operation.
- `Loops.limitTo`: covered by `wide-spec-059`
- `Loops.shownIds`: covered by `extra-spec-shownids`
- `Loops.chosen`: covered by `finish-spec-chosen`
- `Loops.payTest`: covered by `wide-spec-061`
- `Loops.latestOf`: covered by `spec-unread-duplicates`, `spec-drop-head-choice`
- `Loops.collectOf`: covered by `spec-drop-collect-choice`, `spec-collect-unknown-yes`
- `Loops.Slot.run`: covered by `wide-spec-062`
- `Loops.Source.takes`: covered by `spec-source-all-any`
- `Loops.Spec.takes`: covered by `wide-spec-063`
- `Loops.Spec.select`: covered by `wide-spec-064`
- `Loops.Spec.run`: covered by `extra-spec-spec-run`
- `Loops.refuse`: excluded: It constructs a refusal. No direct eligible operation.
- `Loops.parseArg`: covered by `coverage-spec-parsearg`
- `Loops.parseBound`: covered by `coverage-spec-parsebound`
- `Loops.parseOp`: covered by `coverage-spec-parseop`
- `Loops.memberPath`: covered by `finish-spec-memberpath`
- `Loops.parseField`: covered by `extra-spec-parsefield`
- `Loops.parseWhere`: covered by `coverage-spec-parsewhere`
- `Loops.foldTypes`: excluded: It is a fixed list of fold names. No direct eligible operation.
- `Loops.slotKeys`: excluded: It constructs a list of allowed keys. No direct eligible operation.
- `Loops.sourceKeys`: excluded: It is a fixed list of allowed keys. No direct eligible operation.
- `Loops.specKeys`: excluded: It is a fixed list of allowed keys. No direct eligible operation.
- `Loops.checkKeys`: covered by `wide-spec-066`
- `Loops.fieldArg`: covered by `wide-spec-067`
- `Loops.slotType`: covered by `finish-spec-slottype`
- `Loops.slotFollow`: covered by `coverage-spec-slotfollow`
- `Loops.slotLimit`: covered by `wide-spec-068`
- `Loops.foldType`: covered by `wide-spec-069`
- `Loops.slotTests`: covered by `coverage-spec-slottests`
- `Loops.parseSlot`: covered by `coverage-spec-parseslot`
- `Loops.parseKinds`: covered by `coverage-spec-parsekinds`
- `Loops.sourceStore`: covered by `coverage-spec-sourcestore`
- `Loops.sourceKinds`: covered by `coverage-spec-sourcekinds`
- `Loops.sourceAbout`: covered by `wide-spec-070`
- `Loops.parseSource`: covered by `finish-spec-parsesource`
- `Loops.Json.repeatAt`: covered by `finish-spec-json-repeatat`
- `Loops.Json.repeatIn`: covered by `coverage-spec-json-repeatin`
- `Loops.Json.repeatMember`: covered by `coverage-spec-json-repeatmember`
- `Loops.specVertex`: covered by `finish-spec-specvertex`
- `Loops.specSources`: covered by `finish-spec-specsources`
- `Loops.specSlots`: covered by `coverage-spec-specslots`
- `Loops.Spec.ofObject`: covered by `finish-spec-spec-ofobject`
- `Loops.Spec.ofJson`: covered by `wide-spec-073`
- `Loops.Val.toJson`: covered by `wide-spec-074`
- `Loops.Arg.toJson`: covered by `finish-spec-arg-tojson`
- `Loops.Op.toJson`: covered by `wide-spec-076`
- `Loops.Tests.toJson`: covered by `extra-spec-tests-tojson`
- `Loops.Slot.toJson`: covered by `finish-spec-slot-tojson`
- `Loops.Source.toJson`: covered by `finish-spec-source-tojson`
- `Loops.Spec.toJson`: covered by `extra-spec-spec-tojson`

## model/Loops/Stored.lean

- `Loops.utf8`: excluded: It converts a string to bytes. No direct eligible operation.
- `Loops.commitOf`: covered by `stored-commit-order`
- `Loops.idPreimage`: excluded: It builds and canonicalizes JSON. No direct eligible operation.
- `Loops.idOf`: excluded: It composes hash, encoding and text. No direct eligible operation.
- `Loops.Stored.commit`: covered by `finish-stored-stored-commit`
- `Loops.Stored.id`: excluded: It delegates to idOf. No direct eligible operation.
- `Loops.make`: excluded: It constructs a stored record. No direct eligible operation.
- `Loops.erase`: excluded: It constructs an erased stored record. No direct eligible operation.
- `Loops.writeProblem`: covered by `stored-salt-check`
- `Loops.Written.stored`: excluded: It delegates to make. No direct eligible operation.
- `Loops.writeCodes`: excluded: It is a fixed list of refusal codes. No direct eligible operation.
- `Loops.firstRefusal`: covered by `stored-refusal-last`
- `Loops.write`: covered by `finish-stored-write`
- `Loops.opens`: covered by `wide-stored-081`
- `Loops.signingInput`: excluded: It concatenates and encodes text. No direct eligible operation.

## model/Loops/Things.lean

- `Loops.Record.things`: covered by `things-no-self-anchor`
- `Loops.Record.isAbout`: covered by `wide-things-083`
- `Loops.shares`: covered by `wide-things-084`
- `Loops.thingsOf`: covered by `extra-things-thingsof`
- `Loops.idsOf`: covered by `finish-things-idsof`
- `Loops.erasedIn`: covered by `things-negate-erases`
- `Loops.baseForm`: covered by `things-here-last`
- `Loops.pick`: covered by `things-drop-erasure`
- `Loops.settle`: covered by `extra-things-settle`
- `Loops.Forms`: covered by `last-things-forms`
- `Loops.EnvOnly`: covered by `last-things-envonly`
- `Loops.entitled`: covered by `things-prev-or`, `things-drop-may`
- `Loops.refusalOf`: covered by `finish-things-refusalof`
- `Loops.admit`: covered by `finish-things-admit`
- `Loops.realm`: excluded: It composes settle and admit. No direct eligible operation.
- `Loops.stateIn`: covered by `finish-things-statein`
- `Loops.perThing`: covered by `extra-things-perthing`

## model/Loops/Time.lean

- `Loops.digitsVal`: covered by `wide-time-091`
- `Loops.leap`: covered by `wide-time-092`
- `Loops.daysIn`: covered by `wide-time-093`
- `Loops.leapsBefore`: excluded: It computes an arithmetic expression. No direct eligible operation.
- `Loops.dayNumber`: excluded: Its mapped month lengths are summed; order has no effect. No direct eligible operation.
- `Loops.tail`: covered by `wide-time-095`, `wide-time-096`, `step1-fraction-final-zero`, `step1-zone-only-z`
- `Loops.instantParts?`: covered by `coverage-time-instant-`, `step1-seconds-bound`
- `Loops.validEmitted`: covered by `wide-time-097`

## model/Gen/Read.lean

- `Gen.Read.env`: covered by `step1-envelope-keys-after-value`
- `Gen.Read.drafts`: covered by `step1-draft-keys-after-values`
- `Gen.Read.envs`: covered by `step1-record-keys-after-values`
