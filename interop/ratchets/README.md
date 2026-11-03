# Refusal and adapter ratchets

Run these checks from the repository root with Node 22:

```sh
node --test interop/ratchets/*.test.mjs
node interop/ratchets/adapters.mjs
node interop/ratchets/refusal-coverage.mjs
```

The coverage check builds the Lean and Rust replay programs in sequence.
It reads every refusal code in `design/grammar/words.json`.
It counts refusal fields in vector `expect` values, including nested refusal codes.
It also compares 448 generated cases across JS, Lean, and Rust.
Seed `refusal-coverage-1` covers all 64 scheduled slots in each of seven families.
Only shared answers count; decoder refusals and input labels do not count.
Any mismatch fails the check.

Each coverage allowance names a code and gives a reason.
Only `prev-not-permitted` and `sum-overflow` remain; neither has an implementation.
An unknown code, missing reason, missing coverage, or stale allowance fails.
The campaign summary records the same shared-answer histogram.
Counts measure refusal occurrences, not distinct cases.

## Adapter scope

`adapters.mjs` enumerates all source files in these groups:

- `interop/js/check*.mjs`: seven vector comparators.
- `interop/fuzz/evaluate.mjs`: the JS fuzz answer adapter.
- `rust/eval/src/*.rs`: all twelve replay and evaluation files.
- `model/Gen/Read.lean` and `model/Gen/Run.lean`: input decoding and replay.

Rust `cfg(test)` modules contain tests, so the scanner excludes their bodies.
The other fuzz files generate, transport, shrink, run, or test cases.
The other Lean Gen files write expected answers, check boundaries, or support generation.
The source lists name each excluded file and explain its role.
A new file in an enumerated directory fails until its scope is classified.

The scanner rejects refusal string literals and references to named internal checking functions.
The check is lexical, not semantic static analysis.
It does not prove that every possible adapter operation belongs to a library.
Four file-and-literal allowances cover existing decoder mappings.
Unused allowances fail; their removal needs no replacement.

A temporary `L.checkEnvelopeKeys(envs)` call before `writeRecord` in `interop/js/check.mjs` fails with:

```text
interop/js/check.mjs:51: forbidden identifier checkEnvelopeKeys
```

The test restores the file after this probe.
Library entry points own envelope shape checks, including repeated raw batch envelope members.

## Lens order

`model/lens-order.mjs` checks the approved Lean edit declaration after removing comments.
It checks source shape, not observable refusal priority.
Untyped lens outputs cannot distinguish base-before-parse from parse-before-base.
Both mutation runners use this guard; the full runner records `killed-by-guard` separately.
The cheap runner also executes runtime refusal checks.
