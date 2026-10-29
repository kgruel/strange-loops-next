# Layers one through three: Lean to Rust

Lean defines the behavior of this port.
The port implements record primitives, fold families, per-thing state, specs, and admission.
It checks 70 spec vectors, 37 fold vectors, and 34 record and occurred vectors.
Realm settlement, batches, lenses, the CLI, and storage service remain future work.

Layer two uses the closed where types, parser, and evaluation from layer three.
Fold selection calls `parseWhere` and `Cond.all` directly (`model/Gen/Run.lean:112–122`).
It does not call the full spec parser or runner.
Layer three adds the full spec parser, renderer, and runner.

## API mapping

Paths below start at the repository root. Public Rust docs also identify their Lean definitions.

| Lean definition and source | Rust API |
| --- | --- |
| Json, canon, keysDistinct, inRange; model/Loops/Json.lean:12–132 | json::{Json, str_cmp, canon_set, quote}; Json::{canon, keys_distinct, in_range} |
| base32; model/Loops/Base32.lean:13 | base32::base32 |
| Moment, instant?, validEmitted; model/Loops/Time.lean:32–79 | time::{Moment, instant, valid_emitted} |
| Span, occurredSpan?, Stamp.of?, Claim.of?; model/Loops/Occurred.lean:28–145 | occurred::{Span, occurred_span, Stamp, Claim}; parsed values with private fields and accessors |
| Env, toJson, typedRef, recordId, problem; model/Loops/Envelope.lean:15–55 | envelope::{Env, typed_ref, record_id}; Env::{to_json, problem} |
| commitOf, idPreimage, idOf, make, erase, opens, signingInput; model/Loops/Stored.lean:25–133 | stored::{commit_of, id_preimage, id_of, make, opens, signing_input}; Stored::{commit, id, erase} |
| writeProblem, Written, write; model/Loops/Stored.lean:68–123 | stored::{write_problem, Written, write, Error}; exact refusal codes |
| Record, Shown, Val, idDigest, idText, span, Newer; model/Loops/Record.lean:18–77 | record::{Record, Shown, Val, Digest, id_digest, id_text}; Record::{span, newer} |
| withhold, erase, get, num, withholding; model/Loops/Record.lean:110–131 | Record::{withhold, erase, get, num}; record::withholding |
| Nat counts and limits; Int payloads and state; model/Loops/{Json,Record,Fold,Families}.lean | number::{Nat, Int}; private num-bigint values, decimal parsing and display |
| Count/Sum/Min/Max.step/fold; model/Loops/Fold.lean:16–18,77–91 | fold::{count_step, count_fold, sum_step, sum_fold, min_step, min_fold, max_step, max_fold} |
| insertId, insertRec, LatestBy, Latest.fold/winner/others; model/Loops/Fold.lean:28–69 | fold::{insert_id, insert_rec, LatestBy, latest_fold}; LatestBy::{step, fold, winner, others}; empty Default |
| dedup, Tri, Where, Result, Acc.fold/select; model/Loops/Families.lean:26–41,95–129 | families::{dedup, Tri, Where, Result, Acc}; Tri::of_bool; Where::eval; Acc::{fold, select} |
| Count/Sum/Min/Max.acc, Sum/Min/Max.on; model/Loops/Families.lean:43–82 | families::{count_acc, sum_acc, min_acc, max_acc, sum_on, min_on, max_on}; PrimitiveAcc for function-pointer accumulators |
| OverHeads.fold, LatestBy.limit/maxHeads; model/Loops/Families.lean:86–90,132–134 | families::over_heads; LatestBy::{limit, max_heads} |
| Record.things/isAbout, shares, thingsOf, stateIn, perThing; model/Loops/Things.lean:35–42,97–101 | Record::{things, is_about}; things::{shares, things_of, state_in, per_thing} |
| EnvField/FieldType/Field/Item/Arg/Op/Cond, Field.read, Tri.and, Cond.all; model/Loops/Spec.lean:51–208 | where_::{EnvField, FieldType, Field, Item, Arg, Op, Cond}; their methods; families::Tri::and |
| Tests.conds, Refusal, parseArg/Bound/Op/Field/Where; model/Loops/Spec.lean:226–228,333–338,346–396 | where_::{Tests, Refusal, RefusalCode, parse_arg, parse_bound, parse_op, parse_field, parse_where}; all 14 refusal codes |
| FoldType, Slot, SlotValue; model/Loops/Spec.lean:213–244 | spec::{FoldType, Slot, SlotValue}; ordered lists and full equality |
| Record.unlinked, newestFirst, limitTo, shownIds; model/Loops/Spec.lean:247–257 | Record::unlinked; spec::{newest_first, limit_to, shown_ids} |
| chosen, payTest, latestOf, collectOf, Slot.run; model/Loops/Spec.lean:260–296 | spec::{chosen, pay_test, latest_of, collect_of}; Slot::run |
| Source, Spec, takes, select, run; model/Loops/Spec.lean:301–328 | spec::{Source, Spec}; Source::takes; Spec::{takes, select, run, run_with} |
| idsOf, entitled, admit; model/Loops/Things.lean:47,78–88 | things::{ids_of, entitled, admit}; no settlement |
| memberPath, parser keys and helpers; model/Loops/Spec.lean:376–378,398–500,524–538 | spec::{member_path, FOLD_TYPES, SLOT_KEYS, SOURCE_KEYS, SPEC_KEYS}; matching snake-case parser helpers |
| Json.repeatAt/repeatIn/repeatMember, Spec.ofObject/ofJson; model/Loops/Spec.lean:507–555 | Json::repeat_at; Spec::{of_object, of_json} |
| Val/Arg/Op/Tests/Slot/Source/Spec.toJson; model/Loops/Spec.lean:559–605 | Val/Arg/Op/Tests/Slot/Source/Spec::to_json |

## Digest representation

Reader ids and reader links use `Digest([u8; 32])`.
Array conversion keeps all bytes. Slice conversion requires exactly 32 bytes.
`id_digest` exposes the exact bytes, and `id_text` encodes those bytes after `r:`.
No public `Nat` conversion creates an id. Small-id test helpers remain private.

Derived `Ord` compares unsigned bytes from most significant to least significant.
The local `id_order` law relates digest order to numeric order (`model/Laws/Order.lean:46`).
Base32 text order differs from digest order and cannot replace it.

The expected amendment bounds ids below `2^256` and supplies bounded `idText` injectivity and digest roundtrip laws on branch `lean-unread`.
This worktree does not contain or locally verify those expected laws.
The fixed digest representation implements that explicit amendment.
It does not model unrestricted local `Record.id : Nat` values.
Unchecked writer envelopes still retain raw text ids so validation can report invalid text.

## Lists and raw JSON

Lists use `Vec`, including object members, repeated links, and reader fields.
The port does not normalize stored reader data into maps or sets.
`Record.get` reads the first matching payload field after checking built-in `value` and `n` names.
It does not inspect visibility. `Record.num` accepts only integers whose payload is `Here`.

JSON rendering uses stable UTF-16 sorting and keeps the first member with each name.
This matches `sortBy` and `insertBy`, even on invalid objects (`model/Loops/Json.lean:41–49`).
Both validators independently inspect all raw values.
The `canon_member_order` law requires distinct names (`model/Laws/Record.lean:291`).
That law does not change behavior before validation.

Only `Env.to_json` sorts envelope set lists and removes repeats.
The `canonSet_eq`, `env_sets`, and `id_sets` laws justify that wire invariance (`model/Laws/Record.lean:249,254,262`).
They do not turn every model list into a set.

## Numeric representation

`Int` and `Nat` keep arbitrary precision for unchecked input and fold state.
`Json.int` uses Lean `Int` (`model/Loops/Json.lean:12–18`).
`Json.inRange` separately checks ±(2^53 - 1) (`model/Loops/Json.lean:118–132`).
The writer applies that check after envelope, salt, and duplicate checks (`model/Loops/Stored.lean:68–77`).
A checked writer integer fits `i64`, but shared raw types must preserve wider input.

`Gen.Read.number`, reader record fields, `Spec.parseArg`, and unchecked `Json.canon` remain unbounded.
See `model/Gen/Read.lean`, `model/Loops/Spec.lean:346–357`, and `model/Loops/Json.lean:76–89`.
A shared fixed-width type changes refusal order and raw fold results.
Counts, unread totals, and limits also remain unbounded.
The port adds no separate checked numeric type because the writer already defines the required boundary.

## Time representation

`Moment` has private fields and accepts only parser results.
Four-digit years, calendar ends through 10000, and bounded offsets keep seconds within `i64`.
Fraction digits have no precision limit and omit trailing zeros.
This API does not construct every raw Lean `List Int` moment.

The `instant_canonical`, `point_canonical`, and `moment_lt_iff_scaled` laws describe parser results (`model/Laws/Time.lean:278,287,403`).
Span order compares start, then stop, with an open stop last (`model/Laws/Time.lean:46–57`).
Closed span construction checks its endpoints.
`Stamp` and `Claim` keep matching text and parsed values private.
Their full equality still includes the original text.

`Written` keeps successful writer checks valid through private fields.
`Stored` remains mutable, and `make` remains unchecked, because Lean provides both forms of construction.

## Fold behavior and proof requirements

`Newer` compares records by span, emission time, and digest.
It does not implement `Record::Ord` because different records can share those keys.
`insert_rec` tests `Newer` before full record equality, including `Stamp` and `Claim` spellings.
`LatestBy` keeps public lists that permit unchecked states.
Insertion leaves repeated or unsorted tails unchanged.
The port does not sort eagerly or remove records by order keys alone.

`dedup` keeps the last occurrence of each id (`model/Loops/Families.lean:26–28`).
Raw Count, Sum, Min, and Max process all inputs without duplicate removal or visibility checks (`model/Gen/Run.lean:75–90`).
`Acc.fold` also ignores readability.
`Acc.select` skips `No` and counts each unknown or selected unreadable record once.
It steps only selected readable records (`model/Loops/Families.lean:125–129`).
`GAPS.md` explains JavaScript's different first-wins and signed 128-bit behavior.

Numeric `on` folds use `Record.num`, including first-field lookup, built-in precedence, and `Here` visibility.
Supersession uses only envelopes and precedes `maxHeads` readability checks.
A hidden successor therefore does not revive an older numeric head.
Per-thing state filters by `isAbout` before folding. It does not settle or admit records.
A limit beyond `usize` takes every head. It does not retain only low digits.

Callers must supply pure commuting `Acc` steps and envelope predicates that depend only on `SameEnvelope`.
Rust does not enforce these Lean proofs (`model/Loops/Families.lean:33–39,108–110`).
Order and set laws also require their `Addressed` or `Distinct` premises.
The port does not silently change arbitrary reader lists to satisfy those premises.

## Where grammar

`Field.read` keeps list order and repeats.
It returns `None` for hidden payload data and an empty list for a known absent field.
Time equality compares whole spans; time bounds compare their start moments.
`not` and `absent` remain complements on missing occurred claims.
`No` overrides `Unknown` in conjunctions.

`parse_where` keeps fields, operators, and repeats in written order.
The outer `Spec.ofJson` or selection runner checks recursive duplicate names, not `parseWhere`.
See `model/Loops/Spec.lean:393–396,554–555` and `model/Gen/Run.lean:114–118`.

## Specs and admission

`Spec.of_json` checks recursive duplicate names before every shape or grammar check.
It follows written member order, including ignored metadata and root arrays.
Paths use dots. Arrays keep their parent's path.
An empty parent differs from no parent (`model/Loops/Spec.lean:376–378,507–555`).
`Spec.of_object` and the lower parser helpers do not add recursive duplicate checks.
Source checks follow keys, store, kinds, then about.
Slot checks follow name, shape, keys, fold count, follow, limit, argument, then where.

`Spec.to_json` emits vertex, sources, then slots.
Source and slot lists keep written order.
Fold members use canonical fold, follow, limit, then where order.
Empty where maps disappear. Time arguments keep their original spelling.
Accepted unused keys disappear from the result and gain no runtime meaning.
The header at `model/Loops/Spec.lean:42` says these keys are carried.
The structure and renderer discard them (`model/Loops/Spec.lean:307–311,601–605`).
The port follows that executable behavior, not the header claim.

`Spec.run` admits first, then runs each slot. It permits every replacement by default.
`Spec.run_with` accepts the store's replacement rule.
The caller supplies a pure `EnvOnly` rule that depends only on both envelopes (`model/Loops/Things.lean:73–88`).
Admission checks each record against the original input once.
A missing predecessor passes. Every held form of a matching predecessor must share a thing and pass the rule.
Rust does not enforce the purity or envelope-only proof requirements.
The caller supplies one record per id. The runner does not settle records or remove duplicate ids.
Raw input outside that premise keeps the model's repeat behavior.

Latest-by and following collect resolve per-thing heads before source, envelope, or payload tests.
A successor outside the selected kind can still remove an older head.
`newest_first` clears links on clones before applying the latest fold.
Its duplicate check uses full records after link removal, not ids alone.
Latest-by counts distinct unknown ids across things.
Collect counts unknown raw heads before the limit.
Its limit applies only to known matches, including hidden heads when no payload tests exist.
Numeric slots use `Cond.all` and `Acc.select`; they do not add settlement or duplicate removal.

## Hashes and signatures

Hash functions remain supplied byte-to-byte functions, as `Stored.Hash` specifies.
Vector tests use `sha2` and `ed25519-dalek` for SHA-256 and Ed25519.
The core adds no crypto dependency or custom crypto implementation.
Wire signatures and lines follow `Gen.Records.storedJson` and `erasedJson` (`model/Gen/Records.lean:41–56`).

## Test mapping and checks

Tests precede the original implementation. The initial run fails because the `loops` library does not yet exist.
`tests/vectors.rs` reads repository vectors through `CARGO_MANIFEST_DIR/../../vectors`, not copied fixtures.
The registry compares every `expect` member, envelope and payload variant, refusal, and fold arrival order independently.
Checks include public keys, signatures, both wire lines, and occurred ordering.

| Vector source | Rust tests |
| --- | --- |
| vectors/record: 26; vectors/occurred: eight | tests/vectors.rs: every_registered_vector_and_every_expect |
| vectors/fold/count: three; sum: three; extrema: four; latest: four | Same registry and tests/support/fold.rs; raw primitive folds |
| vectors/fold/latest-by: 13; heads: three; view: four; select: three | Same registry; per_thing, max_heads, limit, Cond.all, and Acc.select |
| vectors/spec/parse: 61; run: nine | Same registry and tests/support/spec.rs; every refusal, parsed result, and arrival order |

The test reader follows `Gen.Read.record`, `recordId`, and `fieldsOf` (`model/Gen/Read.lean:238–248,286–331`).
It requires payload fields for `Here` and refuses payload fields on hidden forms.
It preserves exact defaults and ordered fields, decodes canonical 32-byte ids, and applies no writer-only kind or reference checks.
The serde reader captures integer text before parsing `Int` and refuses fractions and exponent notation.
Objects keep member order and repeats, including `payload_text`.
Fold and spec answers and expectations remain integer JSON without a floating-point conversion.
Spec inputs reach core JSON before any serde value conversion.
The harness uses raw `spec_text` when supplied, so repeated names reach the spec parser.
Each successful parse also passes a parse-render-parse equality check.

Seven record, ten fold, and five where tests cover behavior outside the vectors.
They check raw insertion, full equality, spelling, last-wins duplicate removal, raw repeats, readability, unknown counts, and numeric fields.
They also check per-thing anchors, every batching split, huge limits, and sums beyond 128 bits.
Where tests cover each envelope field, absence, hidden payloads, time equality, start bounds, every conjunction pair, and parser domains.
They retain written refusal order and unchecked duplicate members.
Three digest tests check zero, maximum, every bit position, byte order, exact bytes, lengths, and all link consumers.
Two reader tests check digest text roundtrips, link ingestion, byte lengths, and canonical padding.
Three fold harness tests check strict fixture shapes, unbounded input and answers, unknown fold layers, and missing arrival orders.
One spec harness test checks unknown layers, strict input shapes, missing fields, and missing arrival orders.
Nine spec tests check refusal precedence, lower parser domains, roundtrips, admission, supersession, hidden heads, raw repeats, and unbounded numbers.
They also check empty-key paths, hidden duplicate metadata, original-input admission, and distinct unknown ids across things.
The registry test also checks vector accounting.
The suite runs 47 tests. Six shared helper tests run in each of two integration test binaries.

The registry accounts for 184 recursive JSON files: 141 checked and 43 explicitly deferred.
The remaining allowlist stays `realm`, `scenario`, `batch`, `lens`, and `standard`.
Layer two removes `fold` from the earlier allowlist. Layer three removes `spec`.
Unknown families, root JSON, missing or stale registrations, count changes, and files outside accounted families fail.
`GAPS.md` explains each deferred family and the external standard limits.

The local checks use `cargo fmt --check`, `cargo clippy --all-targets -- -D warnings`, `cargo test`, and `cargo doc --no-deps`.
`git diff --check` also checks whitespace.
CI runs formatting, Clippy, and tests.
Compiler checks and the vector registry provide evidence; an empty LSP cache does not prove correctness.
