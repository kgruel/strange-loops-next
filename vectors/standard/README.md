# Standard test data

Test data from the standards and their reference implementations, kept
verbatim. Every implementation runs these alongside the model's vectors.

The number corpus checks canonicalization of finite binary64 values.
It does not define the record writer's accepted domain.
The writer refuses magnitudes above 2^53 − 1, including fractions.
Numeric folds read only safe whole values.
NaN and infinities are refused; negative zero canonicalizes to zero.

Rust uses native shortest formatting with exact midpoint tie-to-even correction.
Its standards tests cover 4,000 numbers, six JCS pairs and 128 SUPERCOP rows.
Ed25519 uses the vetted `ed25519-dalek` implementation.
These samples are evidence, not a proof for every input.
Lean roundtrip and shortest proofs remain nonblocking roadmap work.

| File | Source | Licence |
|---|---|---|
| `jcs/input/*.json`, `jcs/output/*.json` | RFC 8785's reference test data, [cyberphone/json-canonicalization](https://github.com/cyberphone/json-canonicalization/tree/master/testdata) | Apache-2.0 |
| `es6-numbers.txt` | the first 4,000 lines of RFC 8785's ECMAScript number test file (`es6testfile100m.txt.gz`, same repository's release): `hex-ieee,expected` | Apache-2.0 |
| `ed25519.input.gz` | the SUPERCOP Ed25519 test set as shipped in Go's `crypto/ed25519/testdata`: `sk‖pk:pk:msg:sig‖msg:` per line | public domain (SUPERCOP), via Go (BSD-3-Clause) |
