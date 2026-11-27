# strange-loops

Records in, folds and ticks out, lenses back to text. A rewrite from first
principles: the product is **the protocol, its vectors and checked implementations**.

The Lean model, independent JS implementation and Rust workspace implement the record and readers.
Readers cover folds, specs, realms, lenses and batches.
JS and Rust check protocol fixtures and external standards.
The theorem files prove the listed model laws; fixture checks do not prove implementation equivalence.

[ROADMAP.md](ROADMAP.md) gives what is next, [DECISIONS.md](DECISIONS.md) what waits on the human, and [CHANGELOG.md](CHANGELOG.md) what was built and ruled.
The long design notes are in [notes/](notes/).

**New to `loops`?** Start with [GUIDE.md](GUIDE.md): how to think about it, how to lay out your data, and how to use the command.

## Layout

| Path | Holds |
|---|---|
| `model/` | Lean 4: executable model (`Loops/`) and proofs (`Laws/`). `gen` writes protocol vectors. `proofs` writes the evidence view's proof graph. |
| `vectors/` | Model-written protocol fixtures and independent standards data. Every implementation checks all families. |
| `protocol/` | the normative prose; [`protocol/record.md`](protocol/record.md) is layer 0, [`protocol/spec.md`](protocol/spec.md) the spec's grammar, [`protocol/lens.md`](protocol/lens.md) the lens contract, [`protocol/laws.md`](protocol/laws.md) indexes each law, its theorem and its vectors |
| `interop/js/` | Independent JS writer (`loops.mjs`) and readers. Reader modules: `fold`, `where`, `spec`, `realm`, `scenario`, `lens`, `batch`. |
| `design/` | Page sources. `front/` builds the five views at the site's root, with the walk, law and proof data in `grammar/`, `laws/` and `evidence/`. `rethink/` holds the design and ledger. `decisions/` renders the working documents. |
| `out/index.html`, `out/rethink/`, `out/decisions/` | the pages, written by `node design/build.mjs`, never by hand. They are not kept in the repository: the build writes them when a merge is published |

`rust/` contains the implemented pure core and fixture evaluator; see [`rust/PORTING.md`](rust/PORTING.md).
It also holds the first product slice: a directory place and the `loops` CLI, for one person; see [`rust/PLACE.md`](rust/PLACE.md).
Standing, ticks, sync, budget tooling and the repo's own `.loops/` decision store remain planned.
`vectors/scenario/` already covers reader scenarios, not the future product CLI.

## Installing `loops`

**From a release.** Each [release](https://github.com/kgruel/strange-loops-next/releases) carries the `loops` binary for four machines, each archive with its SHA-256:

| Archive | For |
|---|---|
| `x86_64-unknown-linux-musl` | Linux, x86-64 (static) |
| `aarch64-unknown-linux-musl` | Linux, arm64 (static) |
| `aarch64-apple-darwin` | macOS, Apple silicon |
| `x86_64-apple-darwin` | macOS, Intel |

Download the archive for your machine and its `.sha256` file, check one against the other, unpack it and put `loops` on your PATH:

```sh
shasum -a 256 -c loops-v0.1.1-aarch64-apple-darwin.tar.gz.sha256
tar -xzf loops-v0.1.1-aarch64-apple-darwin.tar.gz
install loops-v0.1.1-aarch64-apple-darwin/loops ~/.local/bin/loops
loops --version
```

A release's name is the version `loops --version` prints. The record format is not frozen yet, so read [CHANGELOG.md](CHANGELOG.md) before moving a store to a newer release.

**From source,** with the Rust release `rust/rust-toolchain.toml` names: `cargo install --locked --path rust/cli`.

**Making a release.** `tools/release.sh` does it in three steps and refuses the usual slips: `bump` raises the version in the merge request that changes the CLI, `tag` tags main and pushes the tag once both copies hold the merge, and `verify` waits for `.github/workflows/release.yml` and checks what it published. When to release, and what to do when a run fails, is in [`.claude/skills/release/SKILL.md`](.claude/skills/release/SKILL.md).

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

## The design pages

The front page opens on the grammar at the site's root, and each view also opens at its own address under `/grammar/`, `/guide/`, `/laws/`, `/evidence/` or `/decisions/`.
The build lists the public pages in `/sitemap.xml` and links to their repository sources in `/llms.txt`.

The design walk ("Strange Loops Rethink") uses `design/rethink/`.
Each tab has an HTML file under `sections/`; `ledger.json` holds decision records.
Shared files are `styles.css`, `app.js`, `head.html` and `top.html`. Edit those, then:

```sh
node design/build.mjs       # writes the pages under out/, which git ignores
```

The front page reads the protocol through `design/protocol.mjs`.

* The grammar view gets its words from `design/front/grammar.json`. The build checks
  the laws they name and the refusal codes the vectors pin. The recipe in
  `design/front/walk.json` tells the story of `vectors/scenario/01-decision`.
  `design/grammar/render.mjs` checks its records and steps against that vector.
  The law chips still read the names cited in `design/grammar/words.json` and
  `design/grammar/walk.json`. The law join reads its layers from `words.json`.
* In `design/laws/`, `laws.json` gives each law a sentence, shape and reader question.
  `join.mjs` joins the protocol rows to theorem statements, vectors and proof dependencies.
  The build refuses a missing sentence, an unanswered question, an unresolved theorem or
  vector, and a proof that rests on a higher layer. The bench lets a reader change a
  rule and run the vectors again.
  `lake exe proofs` writes `proofs.json` from the checked proofs.
  `premises.mjs` reads the theorem hypotheses and checks which premises belong
  to each law. `lake exe boundaries` writes `boundaries.json`. Its cases show
  what the model answers with a premise and what changes when it is taken away.
* The evidence view shows the theorems, vectors and implementations behind each law.
  `design/evidence/layout.mjs` lays out the proof map. Each law has a row at
  `#law-<name>` and an evidence card at `#ev-<name>`.
* The guide reads `GUIDE.md`. The decisions view reads the open questions in
  `DECISIONS.md` and links to the working documents under `/decisions/`.
  `design/decisions/` renders the decisions, roadmap, changelog, guide and every
  Markdown file in `notes/`. The build checks repository paths and links into
  the pages, including the places the front page draws when it opens.

`node design/mutants.mjs` applies plausible wrong edits to source copies.
It requires build refusal except for an explicit, shrink-only survivor list with reasons. CI runs
it.

CI builds every page twice and fails if the two builds differ. The pages are built again from `main` when a merge is published, so a hosted page is the build of a commit and can be made again from it. To publish:

* **The site:** in the `projects.gruel.world` repository, `npm run sync:strange-loops`
  snapshots the pages built from the checked-out commit (run `node design/build.mjs` first), then push its
  `main`. The site is served at
  `https://strangeloops.dev/`. The design walk at `/rethink/` keeps `noindex`. Addresses under
  `projects.gruel.world/strange-loops/` redirect to the walk.
* **The claude.ai artifact** is a mirror.
  `node design/build.mjs --fragment <file>` writes the fragment without a document wrapper; the host adds one.
  Republish that file to the same artifact URL.
