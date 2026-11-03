# Rust port and fixture boundary

The workspace separates the executable model from fixture/process adapters.
No protocol rule is selected here; the accepted rulings in `ROADMAP.md`
and the immutable model/vector snapshot determine behavior.

## Crates and public boundary

- `loops` (`core`) contains the pure model: JSON canonicalization, numbers,
  envelopes/stored records, time/occurred, folds, where/spec, things, lens,
  and batch. Its only normal dependency is arbitrary-precision integers.
  Its existing batch unit characterization additionally uses SHA-256 as a
  **dev-dependency**, not part of the core API.
- `loops-eval` (`eval`) owns the moved fixture readers and family adapters.
  Serde/serde_json RawValue, SHA-256, and ed25519-dalek live here. There is no
  core-to-evaluator dependency or duplicated adapter tree.
  Gzip and hex dependencies are test-only external-standard readers.

The evaluator exports a small, fallible API:

```rust,ignore
parse_json(text: &str) -> Result<loops::json::Json, loops_eval::Error>
answers(layer: &str, input: &loops::json::Json)
    -> Result<Vec<loops::json::Json>, loops_eval::Error>
evaluate(text: &str) -> Result<loops::json::Json, loops_eval::Error>
```

`Error` is a concrete error implementing `Display` and `std::error::Error`.
Family helpers are private. `answers` retains every order/variant answer;
`evaluate` refuses empty or differing answer sets instead of choosing one.
Writer refusals are successful answers containing `refused`; JSON and fixture
decoding refusals are errors.

`loops-eval --batch DIR` recursively sorts `.json` paths and emits one JSONL
object per file, with `file` and exactly one of `expect` or `error`.
The CLI accepts only the input contract, not an expected-answer oracle.
Metadata remains raw; even a numerically overflowing `expect` cannot affect
evaluation. JSON syntax still has to be valid. Directory/file/process I/O
failures exit nonzero, whereas decoding errors are per-file `error` rows.

## Representation and reader boundaries

Every input numeric lexeme is parsed directly once as finite binary64.
Safe-whole values (including `1.0`) normalize to `Json::Int`; other finite
values remain `Json::Number`. NaN, infinities, overflow to infinity, invalid
RFC 8259 grammar, and unpaired Unicode surrogates are refused. Canonical zero
has no minus sign. Number formatting uses native Rust shortest printing with
ECMAScript notation; the 4,000-row external standard is the compatibility gate.

Raw model `Int`/`Nat` and fold results remain arbitrary precision. In
particular, exact integer output sums must not be reparsed through binary64.
The test-only expectation decoder preserves integral output lexemes exactly.
Writers require every `Number` to have magnitude at most 2^53 − 1, whole or
not. Unchecked raw `Json::Int` obeys the same writer-range bound. Canonical
formatting remains defined for all finite binary64 values. Numeric folds read
safe-whole payload integers; other numeric payloads count as unread. Raw
`Val::Number` is not made readable by inspecting its bits.

Object input retains member order and duplicate names. Canonical rendering
sorts names by UTF-16 and keeps the first equal-key value, matching the model's
raw domain; validation still inspects every original member. Spec duplicate
metadata checks precede shape/grammar checks. Lower core parser helpers do not
silently acquire those outer-boundary checks.

Reader ids and links are canonical 32-byte `Digest` values; writer envelopes
retain raw text so writer refusals remain observable. Reader `about` entries
must be typed references. Numeric `n` and fields retain finite non-whole values
without pretending they are readable integers. Successful record signing
requires a canonical base32hex encoding of exactly 32 seed bytes.
Byte text uses lowercase base32hex without padding. The decoder checks the
encoded image and decoded byte count. Instants use UTC `Z`, seconds 00–59,
and optional fractions of one to nine digits without a trailing zero.

## Composition rulings

Per-thing heads are composed by a distinct-id union for `fold/heads`,
`fold/view`, and whole-view latest. The low-level `LatestBy::fold` retains its
unchecked raw behavior. Spec/realm/scenario adapters keep their separate
settlement and admission boundaries. Scenarios use `things::state_in` on
admitted records, folding only the target thing without repeating admission.
Whole-view head unions retain records superseded on one thing but current on another.
The generated `scenario/phase2-thing-state` pin distinguishes both heads and winner
from whole-view state across every rotation.

Lens edited sections reject repeated and empty ids and pair by id. Duplicate
base ids retain the model's first-match behavior. Explicit line arrays are
not resplit or newline-normalized: carriage returns and trailing empty
strings are meaningful. LF splitting at a text-to-lines boundary retains both.

## Fixture and standards accounting

`eval/tests/vectors.rs` checks an exact recursive family/file registry.
There is no deferred-family or skipped-file allowlist:

| Family | JSON files |
| --- | ---: |
| record | 82 |
| occurred | 9 |
| byte-text | 5 |
| fold | 48 |
| spec | 110 |
| realm | 15 |
| scenario | 5 |
| lens | 16 |
| batch | 13 |
| standard | 12 |
| **Total** | **315** |

All seven evaluator families are checked against immutable fixture answers,
including every listed arrival order or Cartesian variant. Occurred fixtures
are tested separately. Standards consume all six JCS input/output pairs,
comparing canonical **bytes**, plus every one of 4,000 IEEE-hex/canonical
number rows and 128 gzip SUPERCOP rows. Number roundtrips retain bits except
the intentional zero-sign erasure. SUPERCOP checks derive public keys, sign,
verify, and validate both embedded public-key and message-tail fields.

Moved helper tests and nine core/spec characterization tests remain alongside
the evaluator rather than introducing a core dev-dependency on the evaluator.
CLI subprocess tests distinguish per-file decoder errors from fatal I/O and
check deterministic recursive JSONL, ignored metadata, and usage.

## Gates

Run from `rust`:

```sh
cargo fmt --check
cargo clippy --all-targets --all-features -- -D warnings
cargo test
cargo doc --no-deps
cargo build -p loops-eval --bin loops-eval
```

CI preserves the Lean proofs/generator/runtime/mutant checks, JS checks, and
fixed JS/Lean fuzz prefix while adding these workspace-wide Rust gates.
Parent integration adds Rust to fuzz separately. Test coverage is not a claim that every
unchecked model value satisfies a theorem's premises. See `GAPS.md`.
