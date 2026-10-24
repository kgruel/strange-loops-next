# strange-loops

Records in, folds and ticks out, lenses back to text. A rewrite from first
principles: the product is **the spec, its vectors and one implementation**.

Step 1 is in: layer 0, the record, in the model, in Go and in a small JS
writer that must agree with it byte for byte.

## Layout

| Path | Holds |
|---|---|
| `model/` | Lean 4: the executable model (`Loops/`), its proofs (`Laws/`), and `gen`, which writes the vectors |
| `vectors/` | written by `gen`, never by hand; every implementation must pass them |
| `spec/` | prose; [`spec/record.md`](spec/record.md) is layer 0, [`spec/laws.md`](spec/laws.md) indexes each law, its theorem and its vectors |
| `core/` | the Go core: a module with no requires; package `loops` is its whole public API, everything else is under `internal/` |
| `cli/` | the CLI module; for now only `cmd/budget`, the budget checker |
| `interop/js/` | a small, independent JS writer for layer 0 |
| `budget.json` | token budgets per package and the core's surface budget |

Planned, filled step by step: `cli/cmd/loops`, `scenarios/` (end-to-end
walks), `.loops/` (this repo's own decision store).

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
(cd core && go test ./...)          # the Go core passes every vector
node interop/js/check.mjs vectors   # so does the JS writer
go run ./cli/cmd/budget             # tokens, surface, requires, tests
```
