# strange-loops

Records in, folds and ticks out, lenses back to text. A rewrite from first
principles: the product is **the protocol, its vectors and one implementation**.

Step 1 is in: layer 0, the record, in the model and in a small JS
writer that must agree with it byte for byte.

## Layout

| Path | Holds |
|---|---|
| `model/` | Lean 4: the executable model (`Loops/`), its proofs (`Laws/`), `gen`, which writes the vectors, and `proofs`, which writes the proof graph the laws page draws |
| `vectors/` | written by `gen`, never by hand; every implementation must pass them |
| `protocol/` | the normative prose; [`protocol/record.md`](protocol/record.md) is layer 0, [`protocol/spec.md`](protocol/spec.md) the spec's grammar, [`protocol/laws.md`](protocol/laws.md) indexes each law, its theorem and its vectors |
| `interop/js/` | a small, independent JS writer for layer 0 |
| `design/` | the design pages' source: `rethink/` holds its sections, styles, script and the decision ledger (`ledger.json`); `grammar/` the grammar page's words and walk; `laws/` the laws page's sentences and the proof graph; `build.mjs` renders all three |
| `out/rethink/`, `out/grammar/`, `out/laws/` | the pages, written by `node design/build.mjs`, never by hand |

Planned, filled step by step: the Rust core and CLI (a Cargo workspace, with
`xtask` checking token and surface budgets); more end-to-end scenarios (`vectors/scenario/` holds the first),
`.loops/` (this repo's own decision store).

## Checking

```sh
cd model
lake build --wfail          # every proof checks; a `sorry` fails the build
lake exe gen ../vectors     # rewrite the vectors from the model
git diff --exit-code ../vectors
lake exe proofs ../design/laws/proofs.json   # which theorems each proof uses
git diff --exit-code ../design/laws/proofs.json
```

CI runs the same steps. The vectors are a pure render of the model, and the
proof graph of the proofs: editing either by hand fails CI. Then:

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

Two more pages share a shell (`design/page.mjs`, `design/register.css`) and
read the protocol through `design/protocol.mjs`:

* `design/grammar/`: the protocol's nouns, verbs and layers. Its words are
  data (`words.json`); the build refuses a law name that isn't in
  `protocol/laws.md`, or a set of refusal codes that differs from the ones the
  vectors pin. Its walk is `vectors/scenario/01-decision`, which the model
  writes; `walk.json` holds only its narration and layout.
* `design/laws/`: every law as a sentence and one of six shapes
  (`laws.json`), joined to its row in `protocol/laws.md`, the theorems that
  prove it (each with its statement as Lean prints it), the vectors that pin
  it, and the laws its proof rests on. That last join is
  `design/laws/proofs.json`, written by `lake exe proofs` from the checked
  proofs; CI regenerates it as it does the vectors. The build
  fails on a law without a sentence, a theorem name that resolves to nothing,
  a vector reference to no file, a law name a vector uses that isn't a law,
  or a proof that rests on a layer above its own.

Both load pinned libraries from a CDN (Motion; elkjs for the laws map), so
they are published only on the site, at `/strange-loops/grammar/` and
`/strange-loops/laws/`, with no artifact mirror.

CI rebuilds every page and fails if `out/` differs, as with the vectors. To publish:

* **The site:** in `projects.gruel.world`, `npm run sync:strange-loops`
  snapshots the committed page (it refuses uncommitted output), then push its
  `main`. It is served unlisted, with `noindex`, at
  `https://projects.gruel.world/strange-loops/rethink/`.
* **The claude.ai artifact** is a mirror:
  `node design/build.mjs --fragment <file>` writes the page as the artifact
  takes it (no document wrapper; the host adds its own), and that file is
  republished to the same artifact URL.
