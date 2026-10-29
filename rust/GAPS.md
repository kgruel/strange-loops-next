# Boundaries and remaining work

The Rust crates implement executable behavior and the accepted rulings, not
runtime enforcement of every Lean theorem premise. This document records
those boundaries, not new protocol decisions. Standards, bounded digest ids,
binary64 input, per-thing head composition, and edited-id rejection are no
longer deferred design questions; their implementations have explicit tests.

## External services and source routing

The evaluator is an input-only fixture/JSONL process, not a storage service.
Source path routing, filesystem/network record retrieval, observer key
management, and production persistence remain outside it. A spec source's
store string is preserved but does not cause I/O during pure execution.

## Raw domains and theorem premises

- Accumulator commutativity/purity and envelope-only predicates are caller
  obligations. Rust closures do not encode Lean proofs such as `Acc.comm`
  or `EnvOnly`; arbitrary closures gain no unconditional order/view law.
- Latest permutation/repeat/convergence laws require addressed records.
  Raw Count/Sum keep repeats; low-level `LatestBy::fold` keeps unchecked
  global state behavior. Whole-view heads/latest compose per-thing heads
  instead. Raw insertion uses full record equality after ordering tests,
  so unchecked equal-order/different-payload records are not collapsed.
- Realm form-independence requires compatible forms: equal envelopes for
  equal ids and equal records for two visible forms. Raw settlement does not
  refuse incompatible forms; its first visible form can depend on input
  order. It checks erasures against original forms, including discarded and
  subsequently refused ones, then admits once against original held records.
- Spec execution does not silently settle or globally deduplicate arbitrary
  input. Latest-by's unread count deduplicates ids across things; raw
  following collect counts unknown forms after newest-first processing.
  The distinct-id theorem interpretation requires its stated addressed-input
  premise. Limits restrict known matches, not unread totals.
- Spec's outer recursive duplicate check includes ignored metadata before
  shape/grammar checks. Lower raw helpers retain their wider domains.
  Accepted unused metadata is discarded by the executable renderer.
- Batch meaning uniqueness requires acyclicity and meaning proofs. Resolution
  retains previous-round mappings, first label/held lookup, raw labels,
  mapping/draft order, and the model's global refusal rank. The adapter does
  not claim unique meaning for arbitrary raw drafts.
- Lens roundtrip/no-op/put-get properties retain their stated premises,
  including unique base ids where required. Edited duplicate/empty ids are
  refused; duplicate base ids retain first-match behavior. Absent and unknown
  outcomes leave the base unchanged.

## Numeric and canonical boundaries

`Number` admits only finite binary64 bits. All RFC 8259 **input** lexemes round
once through binary64, then safe-whole values normalize to `Int`. Non-whole
and unsafe-whole numeric payloads are retained but unread by integer folds.
Raw core `Int` and `Nat` still allow exact unbounded construction. Writers
require magnitude at most 2^53 − 1 for every `Number`, whole or not.
Raw `Json::Int` obeys the same bound; refusal priority is unchanged.
Canonical formatting covers all finite binary64 values, independently of writing. Exact accumulated integer outputs are not
rounded through the input decoder.

Rust's native shortest formatter is converted to ECMAScript notation, with
the external 4,000-case corpus deciding compatibility. A Lean roundtrip/
shortest proof is roadmap work, not a reason to skip the standards.
Canonicalization remains defined on repeated object names: first equal-key
value wins after UTF-16 sorting, but validators inspect the full raw object.

The test suite consumes every merged JSON fixture, all six JCS byte pairs,
4,000 IEEE-hex number rows and 128 SUPERCOP signing rows. There is no
`standard` allowlist. This is bounded fixture/standard evidence, not a proof of
all RFC inputs or a claim that raw core constructors satisfy writer premises.

## Digests, time, characters, and diagnostics

Reader ids and links use exact bounded 32-byte digests, bytewise ordering and
canonical base32 roundtrips. No pending unrestricted-Nat-id interpretation
remains. Writer links intentionally remain text until writer validation.

Parsed moments have private bounded seconds and arbitrary-length fraction
digits; the port does not expose arbitrary raw Lean moment construction.
Time parsing keeps the model's second-60 and offset policies rather than a
general date library's policy. Typed references and character checks retain
Lean's ASCII rules. Explicit lens lines preserve carriage returns and empty
strings; text-to-line LF splitting must not discard a trailing empty line.

Fixture diagnostic wording is Rust-specific; it does not claim byte-identical
Lean diagnostics. Protocol refusals retain their wire codes and spec paths.
JSON decoder refusals become per-file error rows, while process I/O failures
are fatal. Expected fixture answers never participate in evaluator decoding
or execution.
