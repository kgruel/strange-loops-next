# Scenario workbench

This page is a draft editor, not a record writer or a proof tool.
Build it with `node design/build.mjs`. Open `out/workbench/index.html`, or serve `out/` over HTTP.
Use a current browser with native import maps, `JSON.rawJSON`, and JSON parse source contexts.

## Data and readers

The editor keeps the full scenario vector. Its `input` uses the existing scenario fixture format.
Every file in `vectors/scenario/` supplies a preset. The build compares every arrival order and the lens with `expect`.
The browser runs the same checks through `interop/js/scenario.mjs` and its reader modules.
`runtime.mjs` checks fixture structure and calls those readers. It does not implement folds, settlement, admission, or lens rules.

`render.mjs` bundles the static module graph into an import map of data URLs.
The build rewrites local import paths, not module bodies or exports. The output needs no runtime network request.
The module collector rejects external imports, dynamic imports, side-effect imports, and `import.meta`.
`interop/js/record.mjs` holds the portable helpers. `loops.mjs` retains the Node writer and re-exports those helpers.

Fixture ids stay fixed when a payload changes. New records receive random fixture ids, not hashes or signatures.
Things remain strings in `about`. There is no separate thing store.
Common fields apply on change. JSON panels apply after a short pause or an explicit run.
Invalid drafts clear live results and disable save and export.

## Baselines and limits

Edits never replace `expect`. A difference means a difference from that stored baseline, not a failed law.
Export keeps the baseline. An edited export is not a new golden vector until the model supplies its expected output.
The lens runs over supplied sections. The editor does not require those sections to match the last two scenario winners.
The command-line fixture checker applies that extra relation to its vectors.

Inputs keep binary64 numbers. Large whole output values use exact integer JSON tokens.
The editor preserves those tokens across baselines, files, browser slots, and URLs.
Write a large whole baseline result without a decimal point or exponent. The editor refuses other unsafe numeric spellings.

The six premise examples remain separate from the draft. Four use scenario inputs.
The duplicate-identity example calls the existing LatestBy fold directly, because valid scenarios refuse repeated record ids.
The duplicate-member example shows generated model evidence only. A JSON object cannot retain duplicate member names.
The page labels these limits beside each result.

## Keeping a draft

Named slots use `strange-loops.workbench.slots.v1` in localStorage. Every access runs inside an error handler.
A blocked or full store does not stop editing, file export, or URL sharing.
The URL fragment carries the full valid vector. It can be large and includes payloads.
Do not share private data in a link. Use file export when a browser or another tool limits URL length.

`#preset=scenario%2F01-decision` opens a preset. `#scenario=<encoded-vector-json>` opens a complete draft.
Section navigation preserves the draft fragment.
The laws page's existing Try cards use other vector layers. This draft does not mislabel those fixtures as scenarios.

## Checks

```sh
node design/build.mjs
node --test design/workbench/*.test.mjs
node design/mutants.mjs
node design/workbench/browser-check.mjs
```

The browser check uses Chrome over CDP with no packages. Set `CHROME` to change its executable path.
It checks presets, edits, file transfers, storage failures, share reloads, exact large numbers, and an import race.
It captures top, results, and premise views at 1280 and 390 pixels, in light and dark.
Screenshots go to `.pi/screenshots/`. An optional first argument changes that directory.
The check refuses horizontal page overflow. Result lanes have their own horizontal scroll area.
