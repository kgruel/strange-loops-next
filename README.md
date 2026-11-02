# strange-loops

Records in, folds and ticks out, lenses back to text. A rewrite from first
principles: the product is **the protocol, its vectors and checked implementations**.

The Lean model, independent JS implementation and Rust workspace implement the record and readers.
Readers cover folds, specs, realms, lenses and batches.
JS and Rust check protocol fixtures and external standards.
The theorem files prove the listed model laws; fixture checks do not prove implementation equivalence.

[ROADMAP.md](ROADMAP.md) gives the current state, human decisions, and next work.

## Layout

| Path | Holds |
|---|---|
| `model/` | Lean 4: executable model (`Loops/`) and proofs (`Laws/`). `gen` writes protocol vectors. `proofs` writes the laws page's proof graph. |
| `vectors/` | Model-written protocol fixtures and independent standards data. Every implementation checks all families. |
| `protocol/` | the normative prose; [`protocol/record.md`](protocol/record.md) is layer 0, [`protocol/spec.md`](protocol/spec.md) the spec's grammar, [`protocol/lens.md`](protocol/lens.md) the lens contract, [`protocol/laws.md`](protocol/laws.md) indexes each law, its theorem and its vectors |
| `interop/js/` | Independent JS writer (`loops.mjs`) and readers. Reader modules: `fold`, `where`, `spec`, `realm`, `scenario`, `lens`, `batch`. |
| `design/` | Page sources. `rethink/` holds the design and ledger. `grammar/` holds words and the walk. `laws/` holds law metadata. `evidence/` shows evidence. `build.mjs` renders all four. |
| `out/rethink/`, `out/grammar/`, `out/laws/`, `out/evidence/` | the pages, written by `node design/build.mjs`, never by hand |

`rust/` contains the implemented pure core and fixture evaluator; see [`rust/PORTING.md`](rust/PORTING.md).
The product CLI, storage, budget tooling and the repo's own `.loops/` decision store remain planned.
`vectors/scenario/` already covers reader scenarios, not the future product CLI.

## Checking

```sh
cd model
lake build --wfail          # every proof checks; a `sorry` fails the build
lake exe gen ../vectors     # rewrite the vectors from the model
git diff --exit-code ../vectors
lake exe run --check ../vectors   # recompute every expect from its input alone
lake exe checks ..          # check runtime behavior against the repository
node mutants.mjs            # check that runtime tests reject source mutants
lake exe proofs ../design/laws/proofs.json   # which theorems each proof uses
lake exe boundaries ../design/laws/boundaries.json   # laws without their premises
git diff --exit-code ../design/laws
```

CI runs the same steps. The model writes protocol vectors and premise cases; standards fixtures come from external sources.
The proof graph comes from the checked proofs.
CI rejects manual edits to model-generated files. Then:

```sh
node interop/js/check.mjs vectors   # the JS implementation passes every vector
```

## The design page

The design walk ("Strange Loops Rethink") uses `design/rethink/`.
Each tab has an HTML file under `sections/`; `ledger.json` holds decision records.
Shared files are `styles.css`, `app.js`, `head.html` and `top.html`. Edit those, then:

```sh
node design/build.mjs       # writes out/rethink/index.html; commit it with the source
```

Three more pages share a shell (`design/page.mjs`, `design/register.css`) and
read the protocol through `design/protocol.mjs`:

* `design/grammar/`: the protocol's nouns, verbs and layers. `words.json` holds its words.
  The build refuses unknown law names and refusal codes that differ from vector metadata. Its walk is `vectors/scenario/01-decision`, which the model
  writes; `walk.json` holds only its narration and layout.
* `design/laws/`: `laws.json` assigns each law a sentence, shape and reader question.
  The build refuses missing questions and questions with no laws.
  Demos let readers try selected laws.
  `join.mjs` joins protocol rows, printed theorem statements, cited vectors and proof dependencies. That last join is
  `design/laws/proofs.json`, written by `lake exe proofs` from the checked
  proofs; CI regenerates it as it does the vectors. `lake exe boundaries` writes
  `design/laws/boundaries.json`: some laws asked with their premise and
  without it, the model checking that the premise matters. These aren't
  vectors, since several of their inputs are ones the protocol never
  produces. Each case appears on its law's Try card or a separate card.
  The build refuses cases without cards.
  Try cards label records A, B, C by writing time.
  `shapes.mjs` draws each figure; cards retain the model's answers for the shown variants.
  The build rejects missing sentences, unresolved theorem names, missing vectors and unknown law names.
  It also rejects proof dependencies on higher layers.
  `premises.mjs` reads theorem hypotheses and checks their metadata declarations.
  Premises appear page-wide, under "Holds when", or as the law's subject in the premise vocabulary.
  The build also rejects declared premises absent from the law's theorems. That names the premise; what it
  quantifies over is still wording.
* `design/evidence/`: the same joins for implementers and maintainers.
  Cards show theorems, vectors, implementation coverage and proof dependencies.
  The page also shows a coverage table and proof map, laid out by `design/evidence/layout.mjs`.
  Law cards share anchors (`#law-<name>`) across pages.
  The build rejects links between these pages without matching anchors.

`node design/mutants.mjs` applies plausible wrong edits to source copies.
It requires build refusal except for an explicit, shrink-only survivor list with reasons. CI runs
it.

The grammar and laws pages load Motion, a pinned CDN library.
They publish only at `/strange-loops/grammar/` and `/strange-loops/laws/`, without artifact mirrors.
The evidence page publishes at `/strange-loops/evidence/` when the site sync carries it.

CI rebuilds every page and fails if `out/` differs, as with the vectors. To publish:

* **The site:** in `projects.gruel.world`, `npm run sync:strange-loops`
  snapshots the committed page (it refuses uncommitted output), then push its
  `main`. It is served unlisted, with `noindex`, at
  `https://projects.gruel.world/strange-loops/rethink/`.
* **The claude.ai artifact** is a mirror.
  `node design/build.mjs --fragment <file>` writes the fragment without a document wrapper; the host adds one.
  Republish that file to the same artifact URL.
