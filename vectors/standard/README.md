# Standard test data

Test data from the standards and their reference implementations, kept
verbatim. Every implementation runs these alongside the model's vectors.

| File | Source | Licence |
|---|---|---|
| `jcs/input/*.json`, `jcs/output/*.json` | RFC 8785's reference test data, [cyberphone/json-canonicalization](https://github.com/cyberphone/json-canonicalization/tree/master/testdata) | Apache-2.0 |
| `es6-numbers.txt` | the first 4,000 lines of RFC 8785's ECMAScript number test file (`es6testfile100m.txt.gz`, same repository's release): `hex-ieee,expected` | Apache-2.0 |
| `kdl/input/*.kdl`, `kdl/expected_kdl/*.kdl` | the official KDL v2 test suite, [kdl-org/kdl](https://github.com/kdl-org/kdl/tree/main/tests/test_cases) at `89c1087` (31 Aug 2026): inputs ending `_fail` must be refused; the rest must parse and print as their `expected_kdl` file | CC BY-SA 4.0 |
| `ed25519.input.gz` | the SUPERCOP Ed25519 test set as shipped in Go's `crypto/ed25519/testdata`: `sk‖pk:pk:msg:sig‖msg:` per line | public domain (SUPERCOP), via Go (BSD-3-Clause) |
