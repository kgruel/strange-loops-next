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
| `design/` | the design page's source: `rethink/` holds its sections, styles, script and the decision ledger (`ledger.json`); `build.mjs` renders it |
| `out/rethink/` | the design page, written by `node design/build.mjs`, never by hand |

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

## The design page

The design walk ("Strange Loops Rethink") is built from `design/rethink/`:
one HTML file per tab under `sections/`, the decision ledger as records in
`ledger.json`, and the shared `styles.css`, `app.js`, `head.html` and
`top.html`. Edit those, then:

```sh
node design/build.mjs       # writes out/rethink/index.html; commit it with the source
```

CI rebuilds it and fails if `out/` differs, as with the vectors. To publish:

* **The site:** in `projects.gruel.world`, `npm run sync:strange-loops`
  snapshots the committed page (it refuses uncommitted output), then push its
  `main`. It is served unlisted, with `noindex`, at
  `https://projects.gruel.world/strange-loops/rethink/`.
* **The claude.ai artifact** is a mirror:
  `node design/build.mjs --fragment <file>` writes the page as the artifact
  takes it (no document wrapper; the host adds its own), and that file is
  republished to the same artifact URL.
