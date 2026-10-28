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
| `protocol/` | the normative prose; [`protocol/record.md`](protocol/record.md) is layer 0, [`protocol/spec.md`](protocol/spec.md) the spec's grammar, [`protocol/laws.md`](protocol/laws.md) indexes each law, its theorem and its vectors |
| `interop/js/` | a small, independent JS writer for layer 0 |
| `design/` | the design pages' source: `rethink/` holds its sections, styles, script and the decision ledger (`ledger.json`); `grammar/` the grammar page's words and walk; `build.mjs` renders both |
| `out/rethink/`, `out/grammar/` | the pages, written by `node design/build.mjs`, never by hand |

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

## The design page

The design walk ("Strange Loops Rethink") is built from `design/rethink/`:
one HTML file per tab under `sections/`, the decision ledger as records in
`ledger.json`, and the shared `styles.css`, `app.js`, `head.html` and
`top.html`. Edit those, then:

```sh
node design/build.mjs       # writes out/rethink/index.html; commit it with the source
```

`design/grammar/` is a second page, the protocol's nouns, verbs and layers:
its words are data (`words.json`, and `walk.json` for the stepped walk), and
the build refuses a law name that isn't in `protocol/laws.md` or a set of
refusal codes that differs from the ones the vectors pin. It is written to
`out/grammar/index.html` by the same command. It loads Motion from a CDN, so
it is published only on the site (`/strange-loops/grammar/`), with no
artifact mirror.

CI rebuilds both and fails if `out/` differs, as with the vectors. To publish:

* **The site:** in `projects.gruel.world`, `npm run sync:strange-loops`
  snapshots the committed page (it refuses uncommitted output), then push its
  `main`. It is served unlisted, with `noindex`, at
  `https://projects.gruel.world/strange-loops/rethink/`.
* **The claude.ai artifact** is a mirror:
  `node design/build.mjs --fragment <file>` writes the page as the artifact
  takes it (no document wrapper; the host adds its own), and that file is
  republished to the same artifact URL.
