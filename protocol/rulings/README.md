# Proposed protocol rulings

All proposals require human approval. This document changes no normative prose or behavior.
Output ids abbreviate canonical `idText` values.
The rank puts architectural boundaries and divergent behavior first, then silent selection and count differences, then wire order and refusals.

## Decision table

| Gap | Recommended decision | Agreement scope |
|---|---|---|
| 7 | Resolve externally for the direct runner | Direct inputs agree; routing is untested |
| 17 | Lean syntax; empty ids allowed; refuse duplicates | Ordinary syntax agrees; id boundaries differ |
| 15 | Per-thing membership and deduplicated whole-reader heads | Membership agrees; helper scopes differ |
| 8 | Layer 0 safe integer values | Unsafe arguments differ; runner limits syntax |
| 10 | Erase before admission | Tested forms agree |
| 6 | Admit before slots | Composed scenarios agree |
| 12 | No wins over unknown | Tested conjunctions agree |
| 13 | Held missing field is known absent | Tested operators agree |
| 14 | Exact integers without coercion | Shared valid domain agrees |
| 4 | Count each unread id once per slot | Tested heads agree |
| 5 | Count unread before limit | Tested collects agree |
| 16 | Latest uses one combined state | Tested input agrees |
| 18 | Match sections by id | Distinct ids agree |
| 11 | Explicit line arrays; separate LF adapter | Core agrees; checker adds a relation |
| 1 | Sort arrays by digest bytes | Tested arrays agree |
| 3 | Check a key before its value | Tested refusal agrees |
| 9 | Missing means absent or empty array | Tested refusals agree |
| 2 | Lone erased form settles withheld | Tested form agrees |

## Lean context and reproduction

For compilation, put the imports and namespace below first, then the helper appendix, then every inline Lean block in section order.
Close the namespace after the last block.
The appendix appears last for reading; Lean requires the helper definitions before their uses.

```lean
import Gen.Main
open Loops Loops.Lens Gen Gen.SpecVectors
namespace ProposedRulings
```

Use `Gen.SpecVectors.parseVector`, `Gen.SpecVectors.runVector`, `Gen.RealmVectors.realmVector`, `foldVector`, and `lensVector` to encode their case types.
Use `scenarioCase` or `mkScenario` for scenario inputs.
Write each encoded value under its matching family directory, then run `lake exe run <file>` from `model/`.
Call the exported `check` functions in `interop/js/check-spec.mjs`, `check-realm.mjs`, `check-fold.mjs`, `check-lens.mjs`, and `check-scenario.mjs` with that vector root.
The existing `lake exe run --check <root>` checks generated inputs as a group.
Do not add these cases to Gen entry lists or generated vectors before approval.

### Verification scope

All inline Lean definitions compile together with the shared helpers.
The encoded cases produce 52 vectors; `lake exe run --check` reproduces all 52 from their inputs.
The JS checker modules pass 120 checks and expose 20 expected differences:

- Eight unsafe spec arguments differ under gap 8.
- Ten fold checks differ under gap 15, across five arrival rotations.
- Two scenario adapter checks differ under gap 11.

Two further lens inputs differ under gap 17: empty ids and repeated ids.
Direct parser calls expose these results because the lens checker crashes on an unexpected null parse.
The main `vectors/` suite remains unchanged by these proposals.
Its checks stay green; the proposed inputs expose behavior that needs a human ruling.

## Gap 7: the role of `from.store`

### Question

Does `from.store` resolve a record set, test each supplied record, or only name the set already supplied to direct spec evaluation?

### Prose shortcoming

`protocol/spec.md:25` requires a nonempty store name “as the realm names it.”
`protocol/spec.md:29-31` defines source matching using only kind and about.
`protocol/laws.md:126-138` explains envelope selection and supersession, but not store resolution or missing-store errors.
Neither page defines a store map for the vector runner.

### Existing behavior

`model/Loops/Spec.lean:299-303` says the realm resolves stores and stores the name in `Source`.
`model/Loops/Spec.lean:315-318` tests kind and about only.
`model/Loops/Spec.lean:325-328` receives a plain record list, not a store map.
`model/Loops/Spec.lean:479-481` refuses an empty or nontext store name.
`model/Loops/Record.lean:34-53` has no record-store field.

`interop/js/spec.mjs:168-178` validates and retains the store name.
`interop/js/spec.mjs:224-225` tests only kind and about.
`interop/js/spec.mjs:274-278` receives a plain record list.
Lean and JS agree on direct evaluation.
Neither implementation proves that a caller supplies records from the correct stores.

### Readings and effects

- Reading A: resolve stores outside direct evaluation. The runner receives records, then tests kind and about.
- Reading B: direct evaluation performs store lookup. An unavailable store must return no records or a defined refusal.
- Reading C: each record carries store provenance, and each source also tests that provenance. This requires information absent from current inputs.

### Recommendation

Choose A for the current executable and vector contract.
It matches Lean without inventing a store resolver.
Keep the wider realm's store-resolution contract explicitly outside these vectors.
Do not call `from.store` globally meaningless.
Do not claim these tests prove per-source routing across several stores.
The human still needs a separate resolver contract before implementing that wider boundary.

### Proposed sentences

> For the current direct-runner contract, resolve store names outside direct spec evaluation.
> The spec runner receives the resolved records and does not perform store lookup.
> On these records, a source tests only `kind` and `about`.
> The current spec and scenario vectors do not test store resolution or missing stores.

### Generator snippet

This uses the existing `Gen.SpecVectors.RunCase` type.
`countSpec` appears in the shared helper appendix.

```lean
def storeCase (store : String) : Gen.SpecVectors.RunCase :=
  ⟨"gap7-" ++ store, [], countSpec store,
    [Gen.RealmVectors.full]⟩

-- Inputs:
-- Gen.SpecVectors.runVector (storeCase "team")
-- Gen.SpecVectors.runVector (storeCase "missing")
```

### Actual results and limit

`gap7-team.json` and `gap7-missing.json`: Lean and JS both return `c = {value: 1, unread: 0}`.
Each JS spec checker passes one check.
Changing only the store name does not change direct evaluation.
The word `missing` is only a test name; no actual store map exists in this test.
A runner that looks up that name in an empty map would give zero or a refusal.
This pair distinguishes that added lookup behavior from today's direct evaluation.
No current Gen case can distinguish correct multi-store routing from incorrect routing without supplying provenance or a store map.
A `store` member added to a fold record is not a valid workaround.
The Lean runner refuses that member; JS direct evaluation ignores it.

Multi-store routing, source-to-provenance pairing, and missing-store errors remain unresolved outside current inputs.
Resolving a union does not prove source-specific store and kind matching.


## Gap 17: missing lens syntax document

**Question:** What exact text syntax must a second lens implementation render, parse, and refuse?

### Prose shortcoming

`protocol/lens.md` does not exist, so it has no line to cite.
`protocol/laws.md:180-191` lists lens laws but does not define the fence syntax or refusal boundary.
`protocol/laws.md:184` mentions escaping without saying which prefixes require it.
`protocol/laws.md:191` says malformed text is refused without defining malformed text.

### Current behavior

Lean reserves lines starting with `:::` or a backslash, in `model/Loops/Lens.lean:25-33`.
Rendering adds one leading backslash to those body lines, in `model/Loops/Lens.lean:46-47`.
Parsing removes that backslash only when the remaining line has a reserved prefix.
Thus an input body line `\plain` stays `\plain`; its normal render starts with two backslashes.

Headers start with exactly `::: `, and closers equal `:::`.
Lean refuses other text outside sections, unfinished sections, and unescaped `:::` prefixes inside sections.
See `model/Loops/Lens.lean:35-64`.
JS matches these ordinary rules in `interop/js/lens.mjs:10-41`.

Lean also accepts empty ids and repeated ids.
JS rejects empty ids at `interop/js/lens.mjs:29` and repeated ids at `interop/js/lens.mjs:41`.
These differences are not merely JSON decoder differences.

### Readings and effects

1. Use Lean's exact line rules. Only reserved prefixes lose an escape; malformed fence placement refuses the whole text.
2. Remove every leading backslash. Literal `\plain` loses data, and repeated renders can change its meaning.
3. Guess around bad fence placement. Broken sections can silently become body text or partial edits.

### Recommendation

Choose reading 1 for rendering, escaping, and ordinary refusal.
It preserves body text, matches existing proofs, and agrees with JS on well-formed ids.
Allow empty opaque ids and explicitly refuse repeated ids.
The current readers do not agree on these boundaries.

For repeated ids, require distinct ids in the document contract.
This is already a premise of Lean's no-op law, at `model/Laws/Lens.lean:133-143`.
The validity rule alone does not change parser behavior.
Explicit refusal narrows Lean's current parser and requires human approval.
Lean currently accepts duplicates, and the first accepted body wins.
JS refuses duplicates.

### Proposed protocol sentences

> Treat text as a list of lines.
> Start each section with `::: ` followed by its id.
> End each section with a line equal to `:::`.
> A section id is opaque text and can be empty.
> Each document must have distinct section ids.
> When rendering a body line, add one backslash if it starts with `:::` or a backslash.
> When parsing, remove one leading backslash only if the remaining line starts with `:::` or a backslash.
> Keep any other leading backslash.
> Outside a section, accept only a section header.
> Inside a section, refuse an unescaped line that starts with `:::` unless it is the closing line.
> Refuse the entire text if a section has no closing line.
> Accept an empty list of lines as an empty document.

> Refuse the entire text if two sections have the same id.

### Distinguishing cases and actual results

The following case uses the shared Lean context.
The ordinary cases include fences, fence prefixes, backslashes, indented fences, and empty body lines.
Both readers preserve every body line in `gap17`.
Both preserve the raw single backslash in `gap17Raw`, then normalize it to a doubled backslash.
Both refuse an unfinished section, `:::x` inside a body, and stray text outside a section.

The boundaries disagree:

```text
text = ["::: ","body",":::"]
Lean: parsed [{id:"",body:["body"]}], unknown "", applied []
JS:   refused

base = [{id:"a",body:["old"]}]
text = ["::: a","first",":::","::: a","second",":::"]
Lean: parsed both; accepted both; applied body ["first"]
JS:   refused
```

This evidence prevents a false claim that all malformed inputs already agree.

```lean
def gap17 : LensCase :=
  let doc := [S "notes" [":::", "::: task:a", ":::x", "\\", "\\:::", "\\plain", "  ::: x", "::", ""]]
  ⟨"gap17-escaping", ["lens.escaping"], doc, render doc⟩

def gap17Raw : LensCase :=
  ⟨"gap17-raw-backslash", ["lens.escaping"], [S "notes" ["old"]],
    [L "::: notes", L "\\plain", L ":::"]⟩

def malformedLens : List LensCase := [
  ⟨"boundary-empty-id", [], [], [L "::: ", L "body", L ":::"]⟩,
  ⟨"boundary-duplicate-id", [], [S "a" ["old"]], render [S "a" ["first"], S "a" ["second"]]⟩,
  ⟨"boundary-unclosed", ["lens.refuse"], [], [L "::: a", L "body"]⟩,
  ⟨"boundary-fence-in-body", ["lens.refuse"], [], [L "::: a", L ":::x", L ":::"]⟩,
  ⟨"boundary-outside", ["lens.refuse"], [], [L "stray"]⟩
]
```

## Gap 15: records about several things or none

**Question:** Where does each record belong, and which fold inputs must remain distinct?

### Prose shortcoming

`protocol/laws.md:90-93` already defines multi-thing membership and own-id anchoring.
This is mainly missing coverage, not a missing membership rule.
`protocol/laws.md:43-61` describes folds over heads without clearly separating single-state helpers from whole-reader heads.
`protocol/laws.md:132-139` gives the whole-reader scope for spec slots over heads.

### Current behavior

Lean membership is explicit in `model/Loops/Things.lean:35` and `model/Loops/Things.lean:97-101`.
JS agrees in `interop/js/fold.mjs:109-132`.
A multi-thing record belongs to every named thing.
A no-about record belongs to its own id's thing.
A successor about only one shared thing removes its predecessor only from that thing's heads.

However, `model/Gen/Run.lean:82-83` computes heads and views with one global `LatestBy` state.
The generator does the same in `model/Gen/Main.lean:320-322`.
JS helpers merge each thing's heads instead, in `interop/js/fold.mjs:142-152`.
These are different questions on multi-thing input.

### Readings and effects

1. Use per-thing membership. Partial succession leaves the old record current in its other thing.
2. Use one global state. Any successor hides the old record everywhere in that state.
3. Use only the first `about` member, and drop empty lists. Other memberships and own-id roots disappear.

### Recommendation

Choose reading 1 for per-thing folds and whole-reader views.
It matches Lean's `perThing`, JS, and the explicit existing protocol rule.
Keep one-state helpers scoped to one state; do not describe their outputs as whole-reader views.
The current fold/heads and fold/view fixtures query one-state helpers, not whole-reader state.
A later helper scope change needs a human ruling; this document changes no behavior.
Count, sum, and extrema still process each input record once, regardless of its number of memberships.

### Proposed protocol sentences

> A record belongs to each thing in its `about` set.
> If that set is empty, the record belongs to the thing named by its own id.
> Compute each thing's heads using only records that belong to that thing.
> A record can remain a head in one thing after a successor replaces it in another thing.
> For a whole-reader view, combine the heads from all things and keep each record id once.
> Count, sum, min, and max do not copy a record for each thing it names.

### Distinguishing case and actual result

The following case uses the shared Lean context.
It contains a record about two things, a partial successor, two no-about roots, and one root's revision.
Hexadecimal ids below abbreviate the model's canonical digest ids; the JSON files contain canonical ids.

Lean and JS agree:

```text
count = 5
sum = 109
extrema = {min:1,max:99}
task:a heads = [0xc2]
task:b heads = [0xc1]
r:0xc3 heads = [0xc5]
r:0xc4 heads = [0xc4]
```

The existing helper calls differ in scope; they do not query the same whole-reader contract:

```text
fold/heads: Lean max = 4; JS max = 99
fold/view: Lean ids = [0xc5,0xc4,0xc2]
fold/view: JS ids   = [0xc5,0xc4,0xc2,0xc1]
both limit-2       = [0xc5,0xc4]
```

All five rotations reproduce the disagreement.
The inputs satisfy the relevant shared-thing rule: each successor shares a thing with its predecessor.
These are abstract fold records, not cryptographically written layer-0 envelopes.

```lean
def gap15 : FoldCase :=
  let multi := { rec 0xc1 "task:a" 100 with about := ["task:a", "task:b"], n := 99 }
  let successor := { rec 0xc2 "task:a" 200 (prev := [0xc1]) with n := 1 }
  let root := { rec 0xc3 "task:unused" 250 with about := [], n := 2 }
  let other := { rec 0xc4 "task:unused" 300 with about := [], n := 3 }
  let revision := { rec 0xc5 (idText 0xc3) 350 (prev := [0xc3]) with n := 4 }
  ⟨"gap15-things", ["latest-by.set"], _root_.rotations [multi, successor, root, other, revision]⟩
```

## Gap 8: whole numbers in where values and bounds

### Question

Does “whole number” mean an integer value after JSON number reading, a decimal integer spelling, or any unbounded model integer?

### Prose shortcoming

`protocol/spec.md:73-84` permits whole numbers but gives no range or number-reading rule.
`protocol/spec.md:75-76` also requires values that layer 0 accepts.
`protocol/record.md:111-118` defines double reading and the inclusive range ±(2^53 − 1) for payload numbers.
The connection between these rules remains implicit for spec arguments.

### Existing behavior

Lean: `model/Loops/Spec.lean:346-363` accepts every payload `.int` in equality tests and numeric bounds.
It performs no range check there.
`model/Loops/Json.lean:12-18` has no fraction or exponent number constructor.
`model/Gen/Read.lean:103-118` refuses fraction and exponent spellings before semantic parsing.

JS: `interop/js/spec.mjs:93-95` uses `Number.isSafeInteger` for payload values.
`interop/js/spec.mjs:127-134` uses the same rule for payload bounds.
Its JSON reader uses normal JS number values.
Thus `1.0` becomes 1, and `1e2` becomes 100.

Actual results, for `is`, `not`, `at-least`, and `below`:

| Input | Lean | JS |
|---|---|---|
| −9007199254740991 | accepted | accepted |
| 9007199254740991 | accepted | accepted |
| −9007199254740992 | accepted | `where-invalid`, path `fold.c.where.est` |
| 9007199254740992 | accepted | `where-invalid`, path `fold.c.where.est` |

Additional raw-text tests use `is` and `at-least`:

| Spelling | Lean runner | JS |
|---|---|---|
| `1.0` | decoding error | accepted as 1 |
| `1e2` | decoding error | accepted as 100 |
| `1.5` | decoding error | `where-invalid` |

The exact Lean error is `a fraction or exponent: the model's numbers are integers`.
This is a runner limitation, not a model `where-invalid` refusal.

### Readings and effects

1. Use integer values after layer 0 number reading, within its range.
   This accepts `1.0` and `1e2`, but refuses both ±2^53 and `1.5`.
2. Require a decimal integer spelling.
   This refuses `1.0` and `1e2`, although they name whole values.
3. Permit every exact mathematical integer.
   This accepts both ±2^53 and larger integers, but conflicts with the stated layer 0 value rule.

### Recommendation

Choose reading 1.
It gives the layer 0 cross-reference a precise meaning and avoids spellings changing the meaning of a value.
Prefer Lean within its shared domain, but do not extend its unbounded integer abstraction into the wire contract.
The unsafe spec arguments expose a real parser difference.
The decimal tests expose the runner's narrower input language.

### Proposed protocol sentences

> For payload tests, read JSON numbers by the layer 0 number rule.
> A whole number has no fractional part after that reading and lies within ±(2^53 − 1), inclusive.
> This rule applies to `is`, `not`, `at-least`, and `below`.
> Thus `1.0` and `1e2` name whole numbers, but `1.5` and ±2^53 do not.

### Existing Gen case snippet

This snippet distinguishes unbounded integers from the proposed bounded reading.
All 16 combinations below compile and execute in the tested source.

```lean
def gap08Pins : List (String × Json) :=
  [(-9007199254740992 : Int), -9007199254740991,
    9007199254740991, 9007199254740992].flatMap fun i =>
    ["is", "not", "at-least", "below"].map fun op =>
      (s!"gap08-{op}-{i}", whereOn "est" (op, .int i))
```

The generator cannot express fractional or exponent number spellings with `.int`.
The separate `input.spec_text` tests preserve those spellings.
For example, this is the exact spec text for one boundary test:

```json
{"vertex":"x","from":[{"store":"."}],"fold":{"c":{"count":true,"where":{"est":{"is":1.0}}}}}
```

Its vector uses layer `spec/parse` and places this text in `input.spec_text`.

## Gap 10: refused erasers and withheld eraser payloads

### Question

Does a held eraser still erase when admission refuses its `prev`, or when the reader does not hold its payload?

### Prose shortcoming

`protocol/record.md:42-46` already requires erasure from the envelope, with or without the payload.
The withheld case lacks a distinguishing vector, not a prose rule.
`protocol/laws.md:76-90` orders settlement before admission, but does not explicitly preserve erasure from a record refused for `prev`.
`protocol/laws.md:99` says a held erasing record erases its target.
An implementer could wrongly read “held” as “admitted.”

### Existing behavior

`model/Loops/Things.lean:49-60` scans `erases` across all input forms.
`model/Loops/Things.lean:63` settles these forms before admission.
`model/Loops/Things.lean:87-92` filters admitted records only after settlement.
`model/Gen/Realm.lean:70-79` folds the admitted records without undoing settlement.
`model/Loops/Record.lean:110-114` removes the payload when withheld, but preserves `erases`.

`interop/js/realm.mjs:20-29` builds the erased-id set from all forms before admission.
`interop/js/realm.mjs:39-48` then refuses unrelated `prev` links.
`interop/js/realm.mjs:56-59` folds the admitted records with the settled erasure state.
Lean and JS agree.

### Readings and effects

- Reading A: every held envelope can erase before admission. A refused eraser still hides its target's payload.
- Reading B: only admitted erasers erase. A refused eraser leaves its target readable.
- Reading C: only readable erasers erase. A withheld eraser leaves its target readable.

### Recommendation

Choose A.
It follows Lean and the existing envelope rule.
Admission checks succession, not the effect of every envelope field.
This ruling covers refusal for `prev`, not an invalid layer-0 record or a failed signature check.
Step 2 does not check signatures or standing, as `protocol/laws.md:238-239` explains.
Do not claim this rule establishes an eraser's authority.

### Proposed sentences

> Settle the forms before admission checks `prev`.
> A record held by the reader applies `erases` even when admission refuses its `prev`.
> The reader applies `erases` without reading the eraser's payload.

### Generator snippets

These definitions use the common generator context in the shared helper appendix.
Each value has the existing `Gen.RealmVectors.Case` type.

```lean
def refusedEraser : Gen.RealmVectors.Case :=
  ⟨"gap10-refused-eraser", [], [Gen.RealmVectors.full,
    { Gen.RealmVectors.r 0x52 "note" ["host:b"] 110 [0x51]
      with erases := [0x51] }]⟩

def withheldEraser : Gen.RealmVectors.Case :=
  ⟨"gap10-withheld-eraser", [],
    [Gen.RealmVectors.full, Gen.RealmVectors.eraseRec.withhold]⟩
```

### Actual results

`gap10-refused-eraser.json`: both return target 0x51 as erased and refuse 0x52 with `prev-unrelated`.
Both return `sum = {value: 0, unread: 1}`.
Reading B instead leaves the target readable and gives `{value: 40, unread: 0}`.
The JS realm checker passes both rotations: two checks.

`gap10-withheld-eraser.json`: both return target 0x51 as erased and eraser 0x52 as withheld.
Neither refuses a record.
Both return `sum = {value: 0, unread: 2}`.
Reading C instead gives `{value: 40, unread: 1}`.
The JS realm checker passes both rotations: two checks.

## Gap 6: scenario slots over settled or admitted records

### Question

Do scenario slots include settled records whose `prev` admission refuses?

### Prose shortcoming

`vectors/README.md:119-122` says slots run “over the settled records.”
`protocol/laws.md:76-79` instead describes refusing records before a vertex asks its question.
`protocol/spec.md:4-7` delegates slot meaning to the laws without identifying this admission boundary.
The README names an API input, but it sounds like the final fold population.

### Existing behavior

`model/Gen/Scenario.lean:86-97` passes settled records to `sp.run`.
`model/Loops/Spec.lean:322-328` admits those records before running any slot.
`model/Gen/Run.lean:217-228` uses the same call boundary.
Thus Lean slots exclude refused records.

`interop/js/scenario.mjs:24-32` passes `r.admitted` to `runSpec`.
`interop/js/spec.mjs:274-278` runs slots directly over that list.
JS has no admission step inside `runSpec`.
The composed scenario behavior agrees with Lean.
Calling JS `runSpec` directly on unadmitted records does not reproduce Lean `Spec.run`.

### Readings and effects

- Reading A: settle, admit, then run slots. A refused record contributes neither a count nor a head.
- Reading B: use admitted records for heads, but use all settled records for slots. The same refused record can affect a count.

### Recommendation

Choose A.
It follows Lean and the protocol's read-path order.
Explain the composed behavior rather than requiring both implementations to use the same function boundary.

### Proposed sentences

> A scenario settles its forms, then admits the settled records.
> Its heads and all spec slots read only the admitted records.
> The model's spec runner performs this admission when it receives the settled records.

### Generator snippet

Use the shared helper appendix's `scenarioCase` helper with these records.
The generated scenario has two unchanged steps and a valid lens input.

```lean
def gap6Records : List Record := [
  Gen.RealmVectors.r 0 "note" ["thing:A"] 100,
  Gen.RealmVectors.r 1 "note" ["thing:B"] 200 [0]]

-- Input constructor:
-- scenarioCase "gap6-scenario" gap6Records
```

### Actual results

`gap6-scenario.json`: both settle ids `[0, 1]` and admit only `[0]` at each step.
Both return slot `c = {value: 1, unread: 0}`.
Reading B gives `c.value = 2` instead.
The JS scenario checker passes seven checks, including both arrival rotations.

## Gap 12: no and unknown in a where conjunction

### Question

When one test answers no and another answers unknown, does the whole map answer no or unknown?

### Prose shortcoming

`protocol/spec.md:86-88` says every test must hold.
`protocol/laws.md:114-117` introduces three answers but gives no rule for combining no with unknown.

### Existing behavior

Lean: `model/Loops/Spec.lean:198-208` gives `no` priority over `unknown`, independent of test order.
`model/Loops/Spec.lean:285-295` uses this combined answer for accumulating slots.
`model/Loops/Families.lean:125-128` counts unknown records as unread, but does not count records that answer no.

JS: `interop/js/where.mjs:93-104` returns no when any test answers no.
It remembers unknown only if no test answers no.

Actual results use a withheld task payload and a false `env.kind is note` test:

| Tests | Lean count result | JS count result |
|---|---|---|
| payload unknown, then envelope no | `value:0, unread:0` | same |
| envelope no, then payload unknown | `value:0, unread:0` | same |
| payload unknown, envelope yes | `value:0, unread:1` | same |

Direct JS `answer` calls also return `no` in both orders.

### Readings and effects

1. No wins over unknown.
   A known exclusion does not add unread records.
2. Unknown wins over no.
   An already excluded record still adds unread records.
3. Return the first answer that is not yes.
   Reordering equivalent tests changes unread counts.

### Recommendation

Choose reading 1, as Lean does.
A definite failed condition settles a conjunction without reading the missing payload.
This keeps member order from changing selection or unread counts.

### Proposed protocol sentences

> A `where` map answers no if any test answers no.
> Otherwise, it answers unknown if any test answers unknown.
> Otherwise, it answers yes.
> The result does not depend on test order.

### Existing Gen case snippet

```lean
def gap12Pin : RunCase :=
  ⟨"gap12-no-and-unknown", ["where.set", "result.unread"],
    slotOf (o [("count", .bool true), ("where", o [
      ("status", o [("is", s "open")]),
      ("env.kind", o [("is", s "note")])])]), [Gen.SpecVectors.t4]⟩
```

Lean and JS return `{"c":{"value":0,"unread":0}}`.
Reading 2 returns unread 1.
Reading 3 returns unread 1 for this order, but unread 0 for the reversed order.
The tested source includes the reversed order and the envelope-yes control.

## Gap 13: a held payload lacks the tested field

### Question

What do `is`, `not`, `present`, `absent`, and numeric bounds answer when a held payload lacks the named field?

### Prose shortcoming

`protocol/laws.md:114-124` states the rule for an unavailable payload.
It does not state whether a missing field in an available payload means absence or unknown.
It also leaves the missing-field complement rules implicit.

### Existing behavior

Lean: `model/Loops/Spec.lean:152-161` reads a missing field in a held payload as an empty item list.
An unavailable payload instead produces `none`.
`model/Loops/Spec.lean:185-196` evaluates the empty list as known absence, not unknown.

JS: `interop/js/where.mjs:53-88` distinguishes `held:false` from an absent property in a held payload.
Its operator results agree with Lean.

Actual results for one held task without field `missing`:

| Test | Answer | Count value | Unread |
|---|---|---:|---:|
| `is: "open"` | no | 0 | 0 |
| `not: "open"` | yes | 1 | 0 |
| `present: true` | no | 0 | 0 |
| `absent: true` | yes | 1 | 0 |
| `at-least: 1` | no | 0 | 0 |
| `below: 1` | no | 0 | 0 |

Lean and JS produce every listed result.
With the same payload withheld, every test answers unknown and returns count value 0, unread 1.

### Readings and effects

1. Treat a missing field as known absence when the payload is held.
   `not` and `absent` pass; equality, presence, and both bounds fail.
2. Treat a missing field as unknown.
   All operators add unread records, even though the reader holds the payload.
3. Require a field for `not`, but let `absent` test absence.
   Missing fields fail both `is` and `not`, which breaks their complement rule.

### Recommendation

Choose reading 1, as Lean does.
A held payload lets the reader determine that a field does not exist.
Do not conflate that fact with a payload the reader cannot inspect.

### Proposed protocol sentences

> A missing field in a held payload is known to be absent.
> On that field, `is` and `present` answer no; `not` and `absent` answer yes.
> Both `at-least` and `below` answer no.
> A payload field test answers unknown only when the reader does not hold the payload.

### Existing Gen case snippet

```lean
def gap13Pin : RunCase :=
  ⟨"gap13-held-missing", ["where.total", "where.complements"],
    o [("vertex", s "x"), ("from", a [o [("store", s ".")]]),
      ("fold", o (
        [("is", s "open"), ("not", s "open"),
         ("present", .bool true), ("absent", .bool true),
         ("at-least", .int 1), ("below", .int 1)].map fun test =>
          (test.1, o [("count", .bool true),
            ("where", o [("missing", o [test])])]) ))],
    [task 0x81 "task:missing" 100 []]⟩
```

The tested source uses an equivalent `countWhere` helper.
It also tests the same record after `.withhold`.

### Boundary limit

`model/Loops/Record.lean:116-120` always supplies reserved fields `n` and `value`.
Use an ordinary payload field, such as `missing`, for this pin.
The Lean runner requires the model record's `n` member.
A raw fixture without `n` exits 1 with `input.orders[0][0]: is missing "n"`.
JS still evaluates that malformed model fixture.
That result does not establish missing-`n` semantics for a valid model record.

## Gap 14: numeric folds read a number or an integer

### Question

Do sum, min, and max read every JSON number, or only exact integer values?

### Prose shortcoming

`protocol/laws.md:30-33` explicitly says the numeric field is an exact integer.
`protocol/laws.md:130-132` later says only “as a number”.
The later wording can make a reader admit fractional JSON values.

### Existing behavior

Lean: `model/Loops/Record.lean:123-128` accepts only a held `.int` value as numeric.
`model/Loops/Families.lean:60-81` uses that rule for sum, min, and max.
The model has no fractional payload constructor: `model/Loops/Record.lean:25-29`.

JS: `interop/js/fold.mjs:74-82` accepts only `Number.isSafeInteger` values.
`interop/js/fold.mjs:89-102` folds those values and increments unread for other selected values.
It neither converts text nor converts booleans.

Actual shared-domain test:

- Held fields: integer 2, integer −3, text `"1.5"`, boolean true, and a missing field.
- One more record has a withheld integer field.
- Lean and JS return sum −1, min −3, max 2.
- All three slots report unread 4.

A separate raw fixture puts actual JSON number `1.5` in the held field.
JS returns sum value 0, min value null, max value null, and unread 1 for each slot.
The Lean runner exits 1 before evaluation with `a fraction or exponent: the model's numbers are integers`.

### Readings and effects

1. Read only exact integer values.
   Fractions, text, booleans, missing fields, and unavailable payloads do not contribute.
2. Read every JSON number.
   A held field `1.5` contributes 1.5 and does not add unread.
   Floating-point sums can then break the order law stated earlier.
3. Convert values that look numeric.
   Text `"1.5"` contributes, contrary to the explicit rule against numeric text.

### Recommendation

Choose reading 1, as Lean does.
Replace the loose later word “number” with “integer” rather than add a new decimal system.
Keep the layer 0 input range separate from the wider sum accumulator range.
This ruling does not constrain a sum result to the payload input range.

### Proposed protocol sentences

> Sum, min, and max read only exact integer values from the named field.
> They do not read fractional values, text, or booleans as integers.
> Each selected record adds one to unread if its payload is unavailable or the named field is missing or not an integer.
> Read each input number by the layer 0 number rule before this test.

### Existing Gen case snippet

```lean
def gap14Pin : RunCase :=
  ⟨"gap14-field-types", ["result.unread"],
    o [("vertex", s "x"), ("from", a [o [("store", s ".")]]),
      ("fold", o [("sum", o [("sum", s "est")]),
        ("min", o [("min", s "est")]),
        ("max", o [("max", s "est")])])],
    [task 0x91 "task:1" 100 [("est", .int 2)],
     task 0x92 "task:2" 110 [("est", .int (-3))],
     task 0x93 "task:3" 120 [("est", .str "1.5")],
     task 0x94 "task:4" 130 [("est", .bool true)],
     task 0x95 "task:5" 140 [],
     (task 0x96 "task:6" 150 [("est", .int 7)]).withhold]⟩
```

This valid snippet distinguishes integer reading from conversion of numeric text or booleans.
It cannot distinguish reading 1 from reading 2 on a true fractional value.
No existing `RunCase` can make that distinction: the closed `Val` type has no fractional constructor.
An `.int 1.5` or a new `.float` constructor would not compile.
The raw `1.5` test above supplies that distinction for JS and records Lean's input limitation honestly.

### Unsafe-input boundary

The tested source also uses a held `.int 9007199254740992` field.
Lean returns that value for sum, min, and max, with unread 0.
JS returns sum 0, min null, and max null, with unread 1.
This record violates the layer 0 payload range in `protocol/record.md:111-118`.
It does not establish a disagreement on valid layer 0 input.
The model deliberately uses unbounded integers, as `protocol/laws.md:35-38` states.

## Gap 4: unread for a head of several things

### Question

Does one unread head count once per record id or once per thing that it heads?

### Prose shortcoming

`protocol/laws.md:61` counts unread covered records, but does not say how repeated head membership contributes.
`protocol/laws.md:90-93` allows a record to belong to several things.
The combination lacks an explicit counting unit.

### Current behavior

Lean collects unknown heads across things and counts distinct record ids.
See `model/Loops/Spec.lean:267-274`.
JS uses a set of unread ids, at `interop/js/spec.mjs:250-257`.
Collect also removes repeated head ids before counting unknown records.
See `model/Loops/Spec.lean:278-283` and `interop/js/spec.mjs:241-244`.

### Readings and effects

1. Count distinct unread record ids. One unavailable record contributes one, even when it is current in several things.
2. Count thing-head pairs. The same unavailable record contributes once for each thing.

### Recommendation

Choose reading 1, matching Lean and JS.
The result describes unread records, not the number of places where their absence affects an answer.
Apply this rule separately to each result slot, not across the whole result object.

### Proposed protocol sentences

> Count each unread record id once in a result, even if that record is a head of several things.
> Count unread ids separately for each result slot.

### Distinguishing case and actual result

The following case uses the shared Lean context.
One withheld record is a head of two things. A payload test makes its answer unknown.
Both readers return:

```text
by      = {things:{},unread:1}
collect = {heads:[],unread:1}
```

Counting per thing would return unread 2.
No test here claims that every withheld record is unread for every query.
An envelope-only query can still answer without its payload.

```lean
def gap4 : Gen.SpecVectors.RunCase :=
  let w := Json.obj [("status", .obj [("is", .str "open")])]
  let spec := Json.obj [
    ("vertex", .str "x"),
    ("from", .arr [.obj [("store", .str ".")]]),
    ("fold", .obj [
      ("by", .obj [("latest-by", .str "about"), ("follow", .str "prev"), ("where", w)]),
      ("collect", .obj [("collect", .bool true), ("follow", .str "prev"), ("where", w)])])]
  let r := { Gen.SpecVectors.task 0xa1 "task:a" 100 [("status", .str "open")] with
    about := ["task:a", "task:b"] }
  ⟨"gap04-unread-one-id", ["result.unread"], spec, [r.withhold]⟩
```

## Gap 5: collect unread before or after limit

### Question

Does collect count unread candidates before applying its limit or only within the limited output?

### Prose shortcoming

`protocol/spec.md:55` permits a positive whole-number limit but does not define its place in the evaluation sequence.
`protocol/laws.md:61` defines unread broadly, without limiting its covered input to returned rows.
`protocol/laws.md:132-139` separates head selection from payload filtering, but does not settle the limit's effect on unread.

### Current behavior

Lean counts all unknown candidates, then limits only the known matching answers.
See `model/Loops/Spec.lean:278-283`.
JS does the same in `interop/js/spec.mjs:241-244`.
The limit changes the returned head list, not the unread count.

### Readings and effects

1. Count unknown candidates before the limit. Unread remains 2 even when the returned list is already full.
2. Count only candidates within the limited window. Older unread candidates disappear from the count.
3. Limit successful matches and report unread as zero. The result hides uncertainty outside its returned rows.

### Recommendation

Choose reading 1, matching Lean and JS.
A display limit does not remove uncertainty about unread candidates.

### Proposed protocol sentences

> Count unread candidates before applying `limit`.
> Apply `limit` only to the ordered list of records that pass every test.
> The limit does not change the unread count.

### Distinguishing case and actual result

The following case uses the shared Lean context.
The newest record is readable and matches. Two older records lack their payloads.
Both plain collect and following collect use limit 1.
An unlimited slot supplies a control result.
Both readers return:

```text
plain  = {heads:[{id:0xb1,shown:"here"}],unread:2}
follow = {heads:[{id:0xb1,shown:"here"}],unread:2}
all    = {heads:[{id:0xb1,shown:"here"}],unread:2}
```

A limit-first window would count zero unread records here.
The case does not count records rejected by source or envelope selection as unread candidates.

```lean
def gap5 : Gen.SpecVectors.RunCase :=
  let w := Json.obj [("status", .obj [("is", .str "open")])]
  let limited := [("collect", Json.bool true), ("limit", .int 1), ("where", w)]
  let spec := Json.obj [
    ("vertex", .str "x"),
    ("from", .arr [.obj [("store", .str ".")]]),
    ("fold", .obj [
      ("plain", .obj limited),
      ("follow", .obj (("follow", .str "prev") :: limited)),
      ("all", .obj [("collect", .bool true), ("where", w)])])]
  ⟨"gap05-unread-before-limit", ["result.unread"], spec,
    [Gen.SpecVectors.task 0xb1 "task:a" 300 [("status", .str "open")],
     (Gen.SpecVectors.task 0xb2 "task:b" 200 []).withhold,
     (Gen.SpecVectors.task 0xb3 "task:c" 100 []).withhold]⟩
```

## Gap 16: latest treats all input as one thing

**Question:** Does `latest` group records by `about`, require one membership, or ignore memberships?

### Prose shortcoming

`protocol/laws.md:20` says Latest is LatestBy over one thing.
It does not say whether callers must supply one thing, or the fold creates one combined state.
`protocol/laws.md:90-93` could otherwise suggest automatic per-thing grouping.

### Current behavior

Lean builds one `LatestBy` state from the complete input, at `model/Loops/Fold.lean:62-66`.
It does not inspect `about` to partition that input.
JS agrees at `interop/js/fold.mjs:136-139`.
`model/Gen/Run.lean:73-86` exposes this behavior through `fold/latest`.

### Readings and effects

1. Treat all supplied records as one state. Return one winner and the other heads, regardless of memberships.
2. Group by thing first. Return several winners, changing the result shape.
3. Require a single thing. Refuse mixed input instead of producing a winner.

### Recommendation

Choose reading 1, matching Lean and JS.
Use `latest-by` when the caller needs independent thing states.
Keep this fold contract separate from admission, which can reject unrelated `prev` links before folding.

### Proposed protocol sentences

> `latest` treats all input records as one thing, regardless of their `about` fields.
> It returns one winner and the other heads from that combined state.
> Use `latest-by` to compute a separate state for each thing.

### Distinguishing case and actual result

The following case uses the shared Lean context.
It contains records about A, about B, and about nothing, with no succession links.
Both readers return:

```text
winner = 0xd1
others = [0xd3,0xd2]
```

Grouping would produce three independent winners. A one-membership precondition would refuse this input.

```lean
def gap16 : FoldCase :=
  let a := rec 0xd1 "task:a" 300
  let b := rec 0xd2 "task:b" 100
  let root := { rec 0xd3 "task:unused" 200 with about := [] }
  ⟨"gap16-global-latest", ["latest.set"], _root_.rotations [a, b, root]⟩
```

## Gap 18: pair sections by id or position

**Question:** Does moving a section change which base section receives its body?

### Prose shortcoming

`protocol/laws.md:180` says keyed sections, but it does not define the key lookup.
`protocol/laws.md:187` describes only edits that keep sections in order.
That restriction does not say that reordered text is refused or matched by position.

### Current behavior

Lean looks up each edited section's id in the base, at `model/Loops/Lens.lean:78-91`.
Lean applies accepted bodies to the base in base order, at `model/Loops/Lens.lean:93-101`.
JS does the same for distinct ids, at `interop/js/lens.mjs:50-66`.
A moved section with an unchanged body produces no outcome.

### Readings and effects

1. Match by id. Moving a section does not redirect its edit; applied state keeps base order.
2. Match by position. Moving a section can edit the wrong base section.
3. Require matching positions and ids. Reordered text is refused, although its keys remain clear.

### Recommendation

Choose reading 1, matching Lean and JS.
A section's identity should not depend on its current position in an editor.
The stronger put-get theorem requires unchanged id order; general keyed matching does not.
See `model/Laws/Lens.lean:250-255` for that theorem's exact premises.

### Proposed protocol sentences

> Match an edited section to a base section by id, not by position.
> Moving an unchanged section produces no outcome.
> Apply accepted body changes in the base document's order.
> Report an unknown id, and do not add that section to the base.
> Report a missing base section, and keep its old body.

### Distinguishing case and actual result

The following case uses the shared Lean context.
The base order is A then B. The edited order is B then changed A.
Both readers return exactly:

```text
outcomes = [{accepted:"task:a",body:["A2"]}]
applied = [{id:"task:a",body:["A2"]},{id:"task:b",body:["B"]}]
```

Position matching would edit both bodies. Order-required matching would refuse the text.
Repeated ids remain outside this agreed case; their boundary is recorded under gap 17.

```lean
def gap18 : LensCase :=
  ⟨"gap18-reordered", ["lens.no-op"],
    [S "task:a" ["A"], S "task:b" ["B"]],
    render [S "task:b" ["B"], S "task:a" ["A2"]]⟩
```

## Gap 11: scenario lens lines and the edited text

### Question

How does a head's string value become body lines, and where does a scenario carry the text after an edit?

### Prose shortcoming

`protocol/laws.md:254` explicitly leaves file-to-line splitting outside the model.
`protocol/laws.md:180-191` gives lens laws, but no scenario string-to-body adapter.
`vectors/README.md:122-124` mentions `input.lens` and `expect.lens`, then describes edited text without locating it.
This can imply that `expect.lens` carries the edited text.

### Existing behavior

`model/Loops/Lens.lean:20` defines a line as a character list.
`model/Loops/Lens.lean:46-67` renders and parses lists of lines without splitting strings.
`model/Gen/Scenario.lean:65-66` places each fixture's entire value into one body element.
The current fixture values have no newline, so this does not establish multiline splitting.
`model/Gen/Scenario.lean:133` writes edited text at `input.lens.text`.
`model/Gen/Scenario.lean:136-137` writes rendered text, outcomes, and applied sections under `expect.lens`.
`model/Gen/Run.lean:264-269` accepts explicit body and text arrays without comparing them with record values.

`interop/js/scenario.mjs:37-40` also uses the explicit arrays without splitting their elements.
`interop/js/scenario.mjs:44` adds `String(head.value).split("\n")` in `sectionOf`.
`interop/js/check-scenario.mjs:42-46` uses that adapter to compare the final two heads with lens sections.
The core lens behavior agrees.
The JS checker imposes an extra relation that the Lean runner does not check.

### Readings and effects

- Reading A: each full value is one body element, even when it contains LF. This follows the current fixture construction literally.
- Reading B: the scenario adapter splits at LF and keeps empty parts. A trailing LF produces a final empty body line.
- Reading C: the adapter normalizes line endings and removes a final empty part. Some original string information is lost.

### Recommendation

Keep Lean's explicit line-list boundary.
Choose B for the separate scenario adapter, not as a new rule inside the lens parser.
Lean does not define that adapter today, so this does not reverse a model rule.
This choice matches JS and keeps a final newline visible.
Keep CR unchanged; do not silently add CRLF normalization.
Keep `input.lens.base` and `input.lens.text` explicit.
Correct the README's field locations.

### Proposed sentences

> Lens bodies and edited text are arrays of lines; the lens does not split their elements.
> The scenario adapter splits a head's value at each LF character and keeps every part, including empty parts.
> The adapter leaves CR characters unchanged.
> `input.lens.base` holds the base sections, and `input.lens.text` holds the edited text.
> `expect.lens` holds the rendered base, the edit outcomes, and the applied sections.

### Generator snippet

The common helper builds a complete scenario input in the current Gen context.
Both variants compile without any change to Gen.
The `false` variant tests the literal fixture construction.
The `true` variant tests the recommended adapter.

```lean
def gap11 (split : Bool) : Except String J :=
  let before : Record :=
    { Gen.RealmVectors.r 0 "note" ["thing:A"] 100
      with value := "one\ntwo\n" }
  let after : Record :=
    { Gen.RealmVectors.r 1 "note" ["thing:A"] 200 [0]
      with value := "new\nend\n" }
  let body (v : String) : List Line :=
    if split then (v.splitOn "\n").map String.toList else [v.toList]
  let base : List Section := [⟨"thing:A".toList, body before.value⟩]
  let text := render [⟨"thing:A".toList, body after.value⟩]
  mkScenario (if split then "gap11-split" else "gap11-single")
    "thing:A" (countSpec ".") [before, after]
    [("before", [before]), ("after", [before, after])] base text
```

### Actual results

`gap11-single.json`: Lean and JS `lensEdit` both preserve `body = ["one\ntwo\n"]`.
Both accept the edited body `["new\nend\n"]`.
The JS scenario checker passes four checks and fails two head-to-section comparisons.
Its base adapter instead produces `["one", "two", ""]`.
Its next-head adapter produces `["new", "end", ""]`.

`gap11-split.json`: Lean and JS both render `["::: thing:A", "one", "two", "", ":::"]`.
Both accept `body = ["new", "end", ""]` and apply that body.
The JS scenario checker passes all six checks.
Reading C instead removes the final empty body line.

The JS adapter also returns `[""]` for an empty value.
For `"a\r\nb"`, it returns `["a\r", "b"]`.
These last two observations come from direct adapter calls, not separate Lean vector runs.

The Lean lens does not define string splitting.
The checker adds a head-to-section relation that the Lean runner does not prove.


## Gap 1: order of settled, refused, and admitted arrays

### Question

Do these serialized arrays use ascending digest-byte order, content order, or no fixed order?

### Prose shortcoming

`protocol/record.md:80-90` defines content order for records, not the serialization order of these arrays.
`protocol/laws.md:76-103` defines settlement and admission as set operations without their output array order.
`vectors/README.md:106-110` describes settled and refused arrays without naming their order.
`vectors/README.md:119-122` adds admitted records without naming their order.

### Existing behavior

`model/Loops/Things.lean:47-63` sorts unique numeric ids and settles in that order.
`model/Loops/Record.lean:7-9` identifies numeric id order with unsigned digest-byte order.
`model/Loops/Things.lean:87-88` preserves input order while filtering admitted records.
`model/Gen/Realm.lean:72-77` filters refusals from the sorted settled list.
`model/Gen/Scenario.lean:87-92` serializes the filtered admitted list.

`interop/js/realm.mjs:14-29` sorts settled forms using `F.idOrder`.
`interop/js/fold.mjs:33` compares digest bytes, not id text.
`interop/js/realm.mjs:39-48` preserves that order for admitted and refused records.
Lean and JS agree.

### Readings and effects

- Reading A: ascending unsigned digest bytes. All implementations produce the same array bytes.
- Reading B: newest content first. Times change the array order even when the ids stay fixed.
- Reading C: set order only. Implementations agree on membership but can fail byte-for-byte vector comparisons.

### Recommendation

Choose A.
It follows Lean and avoids mixing serialization order with head ranking.
Heads keep their existing newest-first order.

### Proposed sentences

> Write `settled`, `refused`, and `admitted` arrays in ascending record-id order.
> Compare ids by their unsigned digest bytes, first byte first, not by their text.
> This array order does not change the content order used for heads.

### Generator snippet

The existing realm case and the common scenario helper test all three arrays.
The ids 52 and 53 also distinguish byte order from text order.

```lean
def orderForms : List Record := [
  Gen.RealmVectors.r 53 "note" ["thing:D"] 400 [52],
  Gen.RealmVectors.r 52 "note" ["thing:C"] 200,
  Gen.RealmVectors.r 1 "note" ["thing:B"] 300 [0],
  Gen.RealmVectors.r 0 "note" ["thing:A"] 100]

def orderRealm : Gen.RealmVectors.Case :=
  ⟨"gap1-order", [], orderForms⟩

-- Scenario input constructor:
-- scenarioCase "gap1-scenario" orderForms
```

### Actual results

Here, each number names the full id produced by `idText`.
Both implementations return `settled = [0, 1, 52, 53]`.
Both return `refused = [1, 53]`, each with `prev-unrelated`.
Both scenario steps return `admitted = [0, 52]`.
Newest-first content order instead gives settled `[53, 1, 52, 0]`, refused `[53, 1]`, and admitted `[52, 0]`.
Ascending text order gives settled `[52, 53, 0, 1]`.
Id 52 ends in `2a`; id 0 ends in `aa`.
The JS realm checker passes four rotations.
The JS scenario checker passes eleven checks.

## Gap 3: repeat search checks a key before its value

### Question

When a repeated member also contains a repeated key in its value, which repeat determines the refusal path?

### Prose shortcoming

`protocol/spec.md:100-103` defines depth-first member order and searches a value before later members.
It does not explicitly compare a member's own key with repeats inside that member's value.

### Existing behavior

Lean: `model/Loops/Spec.lean:516-521` checks the key against earlier keys before it searches the value.
JS: `interop/js/spec.mjs:71-80` performs the same checks in the same order.
Both stop at the repeated member's own key.

Actual result for the snippet below:

```json
{"refused":"member-duplicate","path":"note"}
```

### Readings and effects

1. Check the member key first.
   The second `note` determines the path `note`.
2. Search its value first.
   The repeated `inner` determines the path `note.inner`.

### Recommendation

Choose reading 1, as Lean does.
A member starts with its key, so this follows the order of the written input.
It also avoids descending into a member that already fails.

### Proposed protocol sentences

> For each object member, check whether its key repeats an earlier key before searching its value.
> If the key repeats, refuse at that member's path without searching its value.

### Existing Gen case snippet

```lean
def gap03Pin : String × Json :=
  ("gap03-key-first", o [
    ("vertex", s "x"), ("from", a [o [("store", s ".")]]),
    ("note", .int 0),
    ("note", o [("inner", .int 1), ("inner", .int 2)])])
```

`parseVector` preserves duplicate keys through `input.spec_text` at `model/Gen/Spec.lean:158-161`.
The JS checker uses that text at `interop/js/check-spec.mjs:22-24`.
Parsing the object through ordinary `JSON.parse` first would erase the evidence.
This pin is valid model JSON, but it is intentionally an invalid spec.

## Gap 9: empty from has a narrow meaning

### Question

Do `from: ""` and `from: {}` fail as missing sources or as an invalid source-list type?

### Prose shortcoming

`protocol/spec.md:108-109` says an empty `from` is missing, then says a non-array `from` is invalid.
An empty string or object fits a broad reading of both descriptions.
The prose does not define empty as an empty array there.

### Existing behavior

Lean: `model/Loops/Spec.lean:529-532` assigns `from-missing` only to an absent member or `.arr []`.
JS: `interop/js/spec.mjs:191-194` uses the same rule.

Actual results from both implementations:

| Input | Refusal | Path |
|---|---|---|
| absent `from` | `from-missing` | `from` |
| `from: []` | `from-missing` | `from` |
| `from: ""` | `from-invalid` | `from` |
| `from: {}` | `from-invalid` | `from` |
| `from: null` | `from-invalid` | `from` |

### Readings and effects

1. Empty means only an empty source array.
   Empty strings and objects fail the array type rule.
2. Empty means any empty container or empty text.
   Empty strings and objects receive `from-missing` instead.

### Recommendation

Choose reading 1, as Lean does.
The grammar already requires an array.
The missing code should describe an absent source list, not erase a type error.

### Proposed protocol sentences

> Refuse `from-missing` at `from` only when the member is absent or its value is an empty array.
> Refuse `from-invalid` at `from` for every non-array value, including an empty string, an empty object, and null.

### Existing Gen case snippet

```lean
def gap09Pins : List (String × Json) := [
  ("gap09-empty-text", o [("vertex", s "x"), ("from", s "")]),
  ("gap09-empty-object", o [("vertex", s "x"), ("from", o [])]),
  ("gap09-empty-array", o [("vertex", s "x"), ("from", a [])]),
  ("gap09-missing", o [("vertex", s "x")]),
  ("gap09-null", o [("vertex", s "x"), ("from", .null)])
]
```

## Gap 2: a lone erased form

### Question

What does settlement keep when the only held form says erased, but no held record names its id in `erases`?

### Prose shortcoming

`protocol/laws.md:82-85` already says that this form counts as withheld.
`protocol/laws.md:97-99` links settlement laws to vectors, but no realm vector isolates the lone form.
This is a missing distinguishing case, not an unresolved prose rule.

### Existing behavior

`model/Loops/Things.lean:53-56` converts the first unreadable form to withheld when no readable form exists.
`model/Loops/Things.lean:59-60` marks it erased only when a held envelope names it in `erases`.
`interop/js/realm.mjs:23-28` applies the same priority.
Lean and JS agree.

### Readings and effects

- Reading A: keep the record as withheld. Its envelope still gives a head, but its payload is unreadable.
- Reading B: trust the erased label. The serialized status says erased without a held erasing record.
- Reading C: drop the record. Its envelope disappears, which can incorrectly restore an older head.

### Recommendation

Choose A and add the missing case.
This preserves the existing prose and Lean behavior.
A place cannot establish erasure merely by naming a form erased.

### Proposed sentences

> A lone erased form settles as withheld unless a held record names its id in `erases`.
> The reader keeps its envelope and does not restore its payload.

### Generator snippet

```lean
def lone : Gen.RealmVectors.Case :=
  ⟨"gap2-lone-erased", [], [Gen.RealmVectors.full.erase]⟩
```

### Actual results

`gap2-lone-erased.json`: both settle id 0x51 as withheld and refuse nothing.
Both keep 0x51 as the head and winner of `host:a`.
Both return `sum = {value: 0, unread: 1}`.
Reading B changes `settled[0].shown` to erased.
Reading C removes the head and gives `unread = 0`.
The JS realm checker passes its one rotation.

## Additional findings

The Lean decoder checks canonical ids and record shape, but does not establish full layer 0 validity.
It accepts untyped `about` text and rejects fraction or exponent spellings before evaluation.
The JS exported readers generally expect decoded objects, not validated layer 0 records.
The JS lens checker crashes on an unexpected parse null: `TypeError: Cannot read properties of null (reading 'flatMap')`.
Direct JS `runSpec` does not perform the admission that Lean `Spec.run` performs; scenario composition supplies admitted records.
The known main gates reproduce 164/164 Lean inputs and pass 4891 JS checks.
The design mutant gate refuses 51/52 mutants; one existing survivor is allowed.

## Shared helper appendix

Place these definitions before the inline cases when compiling.

```lean
def mkScenario (name thing : String) (spj : Json) (pool : List Record)
    (steps : List (String × List Record)) (base : List Section)
    (text : List Line) : Except String J := do
  let sp ← match Spec.ofJson spj with
    | .ok sp => pure sp
    | .error r => throw s!"{r.code}: {r.path}"
  let some os := edit base text | throw "lens edit does not parse"
  let jl (ls : List Line) : J :=
    .arr (ls.map fun l => .str (String.ofList l))
  let js (ss : List Section) : J := .arr (ss.map fun s => .obj [
    ("id", .str (String.ofList s.id)), ("body", jl s.body)])
  let jo : Outcome → J
    | .accepted i b => .obj [
        ("accepted", .str (String.ofList i)), ("body", jl b)]
    | .unknown i => .obj [("unknown", .str (String.ofList i))]
    | .absent i => .obj [("absent", .str (String.ofList i))]
  let st (forms : List Record) : J :=
    let settled := settle forms
    let admitted := admit (fun _ _ => true) settled
    let state := stateIn thing admitted
    .obj [("settled", Gen.ScenarioVectors.jShownIds settled),
      ("admitted", .arr (admitted.map (.str ∘ idText ∘ (·.id)))),
      ("heads", .arr (state.heads.map (.str ∘ idText ∘ (·.id)))),
      ("winner", state.winner.map (fun r => J.str (idText r.id))
        |>.getD .null),
      ("slots", .obj ((sp.run settled).map fun (n, v) =>
        (n, Gen.ScenarioVectors.jSlot v)))]
  let input : J := .obj [
    ("spec", Gen.Records.ofJson spj), ("thing", .str thing),
    ("records", .arr (pool.map jRecord)),
    ("steps", .arr (steps.map fun (name, forms) => .obj [
      ("name", .str name),
      ("forms", Gen.ScenarioVectors.jShownIds forms),
      ("orders", .arr ((Gen.ScenarioVectors.rotations forms).map fun rs =>
        .arr (rs.map (.str ∘ idText ∘ (·.id)))))])),
    ("lens", .obj [("base", js base), ("text", jl text)])]
  let expect : J := .obj [
    ("steps", .arr (steps.map fun (_, rs) => st rs)),
    ("lens", .obj [("rendered", jl (render base)),
      ("outcomes", .arr (os.map jo)),
      ("applied", js (apply base os))])]
  pure (vector name "scenario" [] input expect)

def countSpec (store : String) : Json :=
  Gen.SpecVectors.fromOf (.obj [("store", .str store)])

def scenarioCase (name : String) (rs : List Record) : Except String J :=
  let base : List Section := [⟨"thing:A".toList, ["".toList]⟩]
  mkScenario name "thing:A" (countSpec ".") rs
    [("before", rs), ("after", rs)] base (render base)

```

Close the combined file with `end ProposedRulings`.
