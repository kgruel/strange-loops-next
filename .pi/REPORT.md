# Workbench draft

## What exists

- `out/workbench/index.html` is a self-contained page with the shared header, shell, and themes.
- All 21 scenario vectors are presets. Each preset shows its description, law tags, and evidence links.
- Structured controls edit records, times, things, steps, forms, arrival orders, specs, and lenses.
- A raw vector JSON panel stays in sync. Invalid drafts clear results and block save and export.
- Each step shows settled forms, admission, heads, winner, and slots. Arrival orders appear in adjacent lanes.
- Lens results include rendered text, parsed sections, outcomes, and applied sections.
- Stored expectations sit beside live results. Each order shows whether it matches the baseline.
- Six premise switches show results with and without each premise. The page distinguishes live results from model-only evidence.
- Named browser slots, JSON files, and full-vector URL fragments keep drafts. Storage failure does not stop editing or export.
- `design/workbench/README.md` describes the architecture, limits, and checks.

## Design choices

1. Keep the scenario input format unchanged. The vector wrapper retains metadata and `expect` during edits and transfers.
2. Call the existing JS readers. The adapter validates fixture structure; it does not implement another engine.
3. Move pure record helpers into `interop/js/record.mjs`. Keep the Node writer in `loops.mjs`, with its exports intact.
4. Bundle native modules as data URLs through an import map. This avoids a package dependency, a transpiler, and runtime requests.
5. Keep the baseline fixed. An edit can differ from it without disproving a law or creating a new golden vector.
6. Preserve exact large output integers through JSON transfers. Inputs still use binary64 numbers.
7. Keep premise examples separate from the current draft. Invalid-store premises cannot all fit a valid scenario input.
8. Label the duplicate-identity example as a direct fold call. Label duplicate-member evidence as model-only.
9. Keep the supplied lens base editable. Do not silently bind it to the last two winners.
10. Keep arrival lanes locally scrollable. The page itself does not scroll sideways on a phone.
11. Leave the existing Try cards unchanged. They use other vector layers; linking them as exact scenarios would mislabel their inputs.

## Checks

| Check | Result |
| --- | --- |
| `node design/build.mjs` | Pass; all pages and cross-page links build |
| Preset build check | All 21 presets and 162 arrival orders match stored expectations |
| JS vector checks | 5,142 checks pass |
| JS and workbench unit tests | 17 tests pass |
| `node design/mutants.mjs` | 60 of 61 mutants refused; the existing listed survivor remains |
| Chrome CDP behavior checks | Presets, premise switches, editing, transfers, storage failures, and reloads pass |
| Chrome layout checks | Every preset fits 1280 and 390 pixels in light and dark |
| `git diff --check` | Pass |
| `lake build --wfail` | Pass |
| Vector generation | 241 vectors; no generated vector changes |
| `lake exe run --check ../vectors` | 233 of 233 reproduced; this runner skips occurred and standard |
| `lake exe checks ..` | Pass, including 4,000 binary64 patterns |
| Model mutants | All 5 killed |
| Proof and boundary generation | 583 theorems and 6 boundaries; output unchanged |

The portable helpers and remaining writer bodies match their original source exactly.
No file under `model/` changes. Protocol files, vectors, proofs, and boundaries stay unchanged.
CI now runs the workbench unit tests alongside the design build and mutant gate.

Independent review found two defects. Both have fixes and regression checks:

- Large baseline integers could round during import or cloning.
- A stale failed file read could invalidate a newer selection.

The active LSP probe does not confirm every file clean.
Its auxiliary rules flag JSON parsing in helpers and fail-fast tools. Callers already catch editor failures; build and test failures must propagate.
The executable checks above provide the acceptance evidence.

## Screenshots

Chrome 156.0.8078.49 captures twelve images under `.pi/screenshots/`.
Each width and theme has a top, results, and premise view.
The parent inspects all four width-theme combinations. No horizontal page overflow appears.
The browser check recreates these local images; they are not committed.

Examples:

- `screenshots/workbench-1280-light-results.png`
- `screenshots/workbench-1280-dark-top.png`
- `screenshots/workbench-390-light-break.png`
- `screenshots/workbench-390-dark-results.png`

## Open questions

1. Should a later UI bind lens sections to selected heads, or keep the supplied base independent?
2. Should a baseline diff show changed paths, rather than whole expected and live JSON panels?
3. Should premise switches transform a user's draft when the premise fits, or remain fixed examples?
4. Should another fixture format expose duplicate deliveries and conflicting identities? The current scenario format cannot represent both.
5. Should older browsers receive a fallback? This draft requires native import maps and current JSON number APIs.
6. Should shared links use compression? Full-vector fragments are simple, but large payloads can exceed other tools' URL limits.
7. Should the laws page offer related scenario links, separate from its exact Try-card vector links?
8. Should imported metadata receive its own structured editor? The raw panel already exposes it.

These questions do not block the draft. No signing, backend storage, or second engine is added.
