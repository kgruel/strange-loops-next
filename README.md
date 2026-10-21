# strange-loops

Records in, folds and ticks out, lenses back to text. A rewrite from first
principles: the product is **the spec, its vectors and one implementation**.

This is step 0: the Lean model and its first vectors. There is no Go yet.

## Layout

| Path | Holds |
|---|---|
| `model/` | Lean 4: the executable model (`Loops/`), its proofs (`Laws/`), and `gen`, which writes the vectors |
| `vectors/` | written by `gen`, never by hand; every implementation must pass them |
| `spec/` | prose; [`spec/laws.md`](spec/laws.md) indexes each law, its theorem and its vectors |

Planned, filled step by step: `core/` (a Go module with no requires),
`cli/` (the CLI module), `scenarios/` (end-to-end walks), `interop/js/`,
`.loops/` (this repo's own decision store).

## Checking

```sh
cd model
lake build --wfail          # every proof checks; a `sorry` fails the build
lake exe gen ../vectors     # rewrite the vectors from the model
git diff --exit-code ../vectors
```

CI runs the same three steps. The vectors are a pure render of the model:
editing one by hand fails CI.
