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
| `design/` | the design pages' source: `rethink/` holds its sections, styles, script and the decision ledger (`ledger.json`); `grammar/` the grammar page's words and walk; `laws/` the laws page's sentences, questions and the proof graph; `evidence/` the evidence page; `build.mjs` renders all four |
| `out/rethink/`, `out/grammar/`, `out/laws/`, `out/evidence/` | the pages, written by `node design/build.mjs`, never by hand |

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
lake exe boundaries ../design/laws/boundaries.json   # laws without their premises
git diff --exit-code ../design/laws
```

CI runs the same steps. The vectors and the premise cases are a pure render
of the model, and the proof graph of the proofs: editing any of them by hand
fails CI. Then:

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

Three more pages share a shell (`design/page.mjs`, `design/register.css`) and
read the protocol through `design/protocol.mjs`:

* `design/grammar/`: the protocol's nouns, verbs and layers. Its words are
  data (`words.json`); the build refuses a law name that isn't in
  `protocol/laws.md`, or a set of refusal codes that differs from the ones the
  vectors pin. Its walk is `vectors/scenario/01-decision`, which the model
  writes; `walk.json` holds only its narration and layout.
* `design/laws/`: every law as a sentence and one of six shapes
  (`laws.json`), under the one reader's question it answers (a closed list in
  `laws.json`; the build refuses a law without one, or a question no law
  answers), with the demos that let a reader try it. `join.mjs` joins each law
  to its row in `protocol/laws.md`, the theorems that prove it (each with its
  statement as Lean prints it), the vectors that pin it, and the laws its
  proof rests on. That last join is
  `design/laws/proofs.json`, written by `lake exe proofs` from the checked
  proofs; CI regenerates it as it does the vectors. `lake exe boundaries` writes
  `design/laws/boundaries.json`: some laws asked with their premise and
  without it, the model checking that the premise matters. These aren't
  vectors, since several of their inputs are ones the protocol never
  produces. Each is a card on the laws page, on its law's Try card when the
  law has a demo and on a card of its own when not, and the build refuses a
  case no card shows. A Try card letters its records A, B, C by when they were
  written (`shapes.mjs` draws the card's figure, one per shape), and keeps a
  trail of the answer the model gave to each variant shown. The build
  fails on a law without a sentence, a theorem name that resolves to nothing,
  a vector reference to no file, a law name a vector uses that isn't a law,
  or a proof that rests on a layer above its own. It also reads the
  hypotheses off each theorem's statement (`premises.mjs`) and fails when a
  law's sentence leaves one out (`Addressed`, `EnvOnly`, ...): each is said
  page-wide, on the law (`premises`, shown as "Holds when"), or listed as the
  law's subject in `laws.json`'s `premises` vocabulary, and a premise a law
  lists that no theorem of it takes fails too. That names the premise; what it
  quantifies over is still wording.
* `design/evidence/`: the same joins, for an implementer or maintainer: each
  law's card with its theorems, vectors and who runs them, what it rests on
  and carries; the coverage table; and the proof map, laid out when the page
  is built (`design/evidence/layout.mjs`). A law's sentence on the laws page
  and its card here share an anchor (`#law-<name>`), and the build fails on
  any link between the pages that lands on no anchor.

`node design/mutants.mjs` holds those checks to account: it applies plausible
wrong edits to a copy of the sources and fails unless the build refuses each
one, apart from an explicit, shrink-only list of survivors with why. CI runs
it.

The grammar and laws pages load a pinned library from a CDN (Motion), so
they are published only on the site, at `/strange-loops/grammar/` and
`/strange-loops/laws/`, with no artifact mirror; the evidence page is built
for the site too, at `/strange-loops/evidence/` once the site's sync carries it.

CI rebuilds every page and fails if `out/` differs, as with the vectors. To publish:

* **The site:** in `projects.gruel.world`, `npm run sync:strange-loops`
  snapshots the committed page (it refuses uncommitted output), then push its
  `main`. It is served unlisted, with `noindex`, at
  `https://projects.gruel.world/strange-loops/rethink/`.
* **The claude.ai artifact** is a mirror:
  `node design/build.mjs --fragment <file>` writes the page as the artifact
  takes it (no document wrapper; the host adds its own), and that file is
  republished to the same artifact URL.
