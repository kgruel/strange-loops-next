# strange-loops

Records in, folds and ticks out, lenses back to text. A rewrite from first
principles: the product is **the protocol, its vectors and one implementation**.

Step 1 is in: layer 0, the record, in the model and in a small JS
writer that must agree with it byte for byte.

## Layout

| Path | Holds |
|---|---|
| `model/` | Lean 4: the executable model (`Loops/`), its proofs (`Laws/`), and `gen`, which writes the vectors |
| `vectors/` | written by `gen`, never by hand; every implementation must pass them |
| `protocol/` | the normative prose; [`protocol/record.md`](protocol/record.md) is layer 0, [`protocol/laws.md`](protocol/laws.md) indexes each law, its theorem and its vectors |
| `interop/js/` | a small, independent JS writer for layer 0 |

Planned, filled step by step: the Rust core and CLI (a Cargo workspace, with
`xtask` checking token and surface budgets); `scenarios/` (end-to-end walks),
`.loops/` (this repo's own decision store).

## Checking

```sh
cd model
lake build --wfail          # every proof checks; a `sorry` fails the build
lake exe gen ../vectors     # rewrite the vectors from the model
git diff --exit-code ../vectors
```

CI runs the same three steps. The vectors are a pure render of the model:
editing one by hand fails CI. Then:

```sh
node interop/js/check.mjs vectors   # the JS writer passes every vector
```
