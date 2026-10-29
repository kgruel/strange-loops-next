# Layer one: Lean → Rust

Lean is authoritative. This workspace implements only record, envelope, integer
JSON, base32, time, occurred and reader-record primitives. No folds, queries,
realms, batches, lenses, CLI or storage service are implemented.

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
- Hashes remain supplied byte-to-byte functions, as Stored.Hash specifies.
  SHA-256 and Ed25519 are vector-test instantiations via sha2/ed25519-dalek,
  not homemade cryptography or a core dependency. Wire signatures/lines follow
  Gen.Records.{storedJson,erasedJson} (model/Gen/Records.lean:41–56).

## Tests and checks

Tests preceded implementation; the initial test run failed because no loops
library existed. tests/vectors.rs reads repository vectors, not copied fixtures.
A family registry checks 26 record + 8 occurred JSON files recursively and
compares every expect field, every envelope×payload variant and every refusal.
This includes public keys, signatures, both wire lines and occurred ordering.
A custom serde visitor retains payload member order and duplicates, including
payload_text; serde_json::Value is only metadata/expected-result plumbing.

Seven characterization tests additionally pin first-wins invalid duplicates
(including a discarded out-of-range value), unbounded reader numbers/ids,
lookup and hidden views, ASCII predicates, unlimited fractional precision,
span validation, all Newer tie breaks, and exact refusal precedence.

The registry accounts for all 184 recursive JSON files: 34 checked, 150
explicitly deferred. Its shrink-only remaining families are
fold, spec, realm, scenario, batch, lens, standard. Unknown root families,
root JSON, missing/stale registrations, count changes in implemented families,
and JSON outside accounted families fail. See GAPS.md for standard data.

Verified locally: cargo fmt --check; cargo clippy --all-targets -- -D warnings;
cargo test; cargo doc --no-deps. CI runs fmt, clippy and test from rust/.
The active LSP probe returned no server answer for twelve Rust paths, so it
does not establish cleanliness; compiler/clippy checks are the evidence.
