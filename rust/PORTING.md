# Layers one and two: Lean → Rust

Lean is authoritative. Record primitives, fold families, per-thing state and
the fold/select grammar are implemented. All 37 fold vectors are dispatched,
in addition to layer one's 34 vectors. Full specs/queries, realm settle/admit,
batches, lenses, CLI and storage service remain deferred.

Layer two pulls only the closed where types/parser/evaluation forward from
layer three: fold/select calls parseWhere and Cond.all directly
(model/Gen/Run.lean:112–122), not the complete Spec parser or runner.

## Mapping

All paths below are repository-relative; public Rust items also name their
origin in rustdoc.

| Lean definition and source | Rust surface |
| --- | --- |
| Json, Json.canon, keysDistinct, inRange; model/Loops/Json.lean:12–132 | json::{Json, str_cmp, canon_set, quote}; Json::{canon, keys_distinct, in_range} |
| base32; model/Loops/Base32.lean:13 | base32::base32 |
| Moment, instant?, validEmitted; model/Loops/Time.lean:32–79 | time::{Moment, instant, valid_emitted} |
| Span, occurredSpan?, Stamp.of?, Claim.of?; model/Loops/Occurred.lean:28–145 | occurred::{Span, occurred_span, Stamp, Claim}; private parsed values with accessors |
| Env, Env.toJson, typedRef, recordId, Env.problem; model/Loops/Envelope.lean:15–55 | envelope::{Env, typed_ref, record_id}; Env::{to_json, problem} |
| commitOf, idPreimage, idOf, make, erase, opens, signingInput; model/Loops/Stored.lean:25–133 | stored::{commit_of, id_preimage, id_of, make, opens, signing_input}; Stored::{commit, id, erase} |
| writeProblem, Written, write; model/Loops/Stored.lean:68–123 | stored::{write_problem, Written, write, Error}; exact refusal codes |
| Record, Shown, Val, idDigest, idText, Record.span, Newer; model/Loops/Record.lean:18–77 | record::{Record, Shown, Val, id_digest, id_text}; Record::{span, newer} |
| Record.withhold, erase, get, num, withholding; model/Loops/Record.lean:110–131 | Record::{withhold, erase, get, num}; record::withholding |
| Lean Nat/Int at Json.int and Record.id/n; model/Loops/{Json,Record}.lean | number::{Nat, Int}; private num-bigint representation, decimal ingestion/display |
| Count/Sum/Min/Max.step/fold; model/Loops/Fold.lean:16–18,77–91 | fold::{count_step, count_fold, sum_step, sum_fold, min_step, min_fold, max_step, max_fold} |
| insertId, insertRec, LatestBy, Latest.fold/winner/others; model/Loops/Fold.lean:28–69 | fold::{insert_id, insert_rec, LatestBy, latest_fold}; LatestBy::{step, fold, winner, others}, Default is empty |
| dedup, Tri, Where, Result, Acc.fold/select; model/Loops/Families.lean:26–41,95–129 | families::{dedup, Tri, Where, Result, Acc}; Tri::of_bool; Where::eval; Acc::{fold, select} |
| Count/Sum/Min/Max.acc, Sum/Min/Max.on; model/Loops/Families.lean:43–82 | families::{count_acc, sum_acc, min_acc, max_acc, sum_on, min_on, max_on}; PrimitiveAcc names concrete function-pointer accumulators |
| OverHeads.fold, LatestBy.limit/maxHeads; model/Loops/Families.lean:86–90,132–134 | families::over_heads; LatestBy::{limit, max_heads} |
| Record.things/isAbout, shares, thingsOf, stateIn, perThing; model/Loops/Things.lean:35–42,97–101 | Record::{things, is_about}; things::{shares, things_of, state_in, per_thing} |
| EnvField/FieldType/Field/Item/Arg/Op/Cond, Field.read, Tri.and, Cond.all; model/Loops/Spec.lean:51–208 | where_::{EnvField, FieldType, Field, Item, Arg, Op, Cond}; corresponding methods; families::Tri::and |
| Tests.conds, Refusal, parseArg/Bound/Op/Field/Where; model/Loops/Spec.lean:226–228,333–338,346–396 | where_::{Tests, Refusal, RefusalCode, parse_arg, parse_bound, parse_op, parse_field, parse_where}; typed where-invalid subset only |

## Representations and premises

- Lists remain Vec, including object members, repeated links and reader fields.
  No map or set normalization is applied to stored reader data. get selects the
  first field; value/n built-ins take precedence. num refuses hidden payloads,
  while get deliberately does not consult visibility.
- JSON canonicalization uses stable UTF-16 sorting then first-key deduplication,
  exactly sortBy/insertBy (model/Loops/Json.lean:41–49), even for invalid JSON
  objects. Both validators traverse raw values independently. The
  canon_member_order theorem (model/Laws/Record.lean:291) assumes distinct keys;
  it does not license changing behavior before validation.
- Env.to_json alone sorts/deduplicates envelope set lists. Existing
  canonSet_eq, env_sets and id_sets (model/Laws/Record.lean:249,254,262) justify this wire
  invariance, not replacing every list in the model with a set.
- Nat/Int are unbounded; only Json.in_range enforces the writer's exact-number
  bound. id_text deliberately keeps the low 256 bits as Nat.toUInt8 does.
  id_digest and Newer retain the full Nat, including its unbounded first digit.
  id_order (model/Laws/Order.lean:46) is not a bounded-integer law.
- Moment construction is private and restricted to instant?/date? results:
  four-digit years, calendar ends through 10000, bounded numeric offsets.
  Seconds therefore fit i64; fraction digits have no precision limit and
  strip trailing zeros. This is not a replacement for every raw Lean List Int.
  instant_canonical, point_canonical and moment_lt_iff_scaled
  (model/Laws/Time.lean:278,287,403) describe the canonical parser-produced
  moments. Span order uses start, then closed stop, with open last, matching
  Span.Before and its order laws (model/Laws/Time.lean:46–57).
- Span checks closed endpoints. Stamp/Claim keep text and its parsed value
  private. Written keeps successful write premises private; mutable Stored and
  unchecked make remain available because Lean has both checked and unchecked
  construction.
- Newer is a relation method, not Record::Ord: distinct records can share
  ordering keys. The Newer order laws do not equate their entire payloads.
  insert_rec tests Newer first, then FULL record equality, including written
  Stamp/Claim spellings. LatestBy's public Vec fields deliberately admit
  unchecked states: insertion preserves untouched malformed tails. No eager
  sorting, set normalization or order-key-only deduplication is substituted.
- dedup keeps the LAST occurrence of each id (model/Loops/Families.lean:26–28).
  Raw foldAnswer Count/Sum/Min/Max operate on all inputs without dedup or
  visibility checks (model/Gen/Run.lean:75–90); Acc.fold also ignores readable.
  Acc.select alone excludes No, counts Unknown or selected-unreadable once,
  and steps selected-readable records (model/Loops/Families.lean:125–129).
  See GAPS.md for the distinct JS first-wins/128-bit behavior.
- Numeric .on uses Record.num (first payload field, builtin precedence,
  Here only). Supersession is envelope-only and precedes maxHeads/readability;
  a hidden successor never revives an old numeric head. Per-thing state filters
  by isAbout before folding; it does not settle/admit records.
- Limit accepts arbitrary Nat. A checked usize conversion falling outside the
  addressable domain means take every head; it never truncates low digits.
- Field.read preserves list order/repeats; hidden payload is None, known absent
  is Some(empty). Time equality uses the whole span, bounds its START; not and
  absent complement their tests even on missing occurred. No dominates Unknown.
  parse_where preserves fields/operators/repeats in written order. Recursive
  duplicate detection belongs to the outer Spec.ofJson/selectRun boundary,
  not parseWhere (model/Loops/Spec.lean:393–396,554–555;
  model/Gen/Run.lean:114–118).
- Generic Acc steps must be pure and commuting; Where::Envelope predicates
  must depend only on SameEnvelope. Rust types do not enforce Lean's proofs
  (model/Loops/Families.lean:33–39,108–110). Addressed/Distinct premises on
  order/set laws likewise remain caller obligations; arbitrary reader lists
  must not be silently repaired into satisfying them.
- Hashes remain supplied byte-to-byte functions, as Stored.Hash specifies.
  SHA-256 and Ed25519 are vector-test instantiations via sha2/ed25519-dalek,
  not homemade cryptography or a core dependency. Wire signatures/lines follow
  Gen.Records.{storedJson,erasedJson} (model/Gen/Records.lean:41–56).

## Tests and checks

Tests preceded implementation; the initial test run failed because no loops
library existed. tests/vectors.rs reads repository vectors, not copied fixtures.
A family registry checks 26 record + 8 occurred + 37 fold JSON files
recursively and compares every expect field, every record envelope×payload
variant/refusal, and every fold arrival order independently. This includes
public keys, signatures, both wire lines and occurred ordering.

| Vector source | Rust coverage |
| --- | --- |
| vectors/record (26), vectors/occurred (8) | tests/vectors.rs, every_registered_vector_and_every_expect |
| vectors/fold/count (3), sum (3), extrema (4), latest (4) | Same registry, tests/support/fold.rs; raw primitive folds |
| vectors/fold/latest-by (13), heads (3), view (4), select (3) | Same registry, per_thing/max_heads/limit/Cond.all + Acc.select |

tests/support/reader.rs follows Gen.Read.record, recordId and fieldsOf
(model/Gen/Read.lean:238–248,286–331): required Here payloads, explicit hidden
forms with NO payload, exact optional defaults, ordered fields, canonical
32-byte id decoding, no writer-only kind/ref validation. The raw serde reader
captures number lexemes before parsing unbounded Int, refusing fraction and
exponent spellings; objects retain member order/repeats, including payload_text.
Fold answers and expectations remain integer Json end-to-end (no f64 fallback).

Seven layer-one + ten fold + five where characterization tests pin unchecked
insertion, full equality/spelling, last-wins dedup versus raw repeats,
readability and unknown counts, numeric-on fields, per-thing anchoring,
batching at every split, huge Nat limits and sums beyond 128 bits. Where
tests cover every envelope field, hidden/absent distinctions, time span
equality/start bounds, all Tri conjunction pairs, closed parser domains,
written error order/paths and intentionally unchecked duplicate members.
Three harness tests cover strict fixture shapes, unbounded integer ingestion
AND answers, and refusal of unknown fold layers or missing arrival orders.

The registry accounts for all 184 recursive JSON files: 71 checked, 113
explicitly deferred. Its shrink-only remaining families are spec, realm,
scenario, batch, lens, standard. ONLY fold was removed from the allowlist.
Unknown root families, root JSON, missing/stale registrations, count changes in
implemented families, and JSON outside accounted families fail. See GAPS.md.

Verified locally from rust/: cargo fmt --check; cargo check;
cargo clippy --all-targets -- -D warnings; cargo test; cargo doc --no-deps.
CI runs fmt, clippy and test. LSP availability is not relied on as evidence;
compiler/clippy and the explicit vector registry establish these checks.
