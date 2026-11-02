# Lean mutation runner

Run `node model/mutate/run.mjs --list` to inspect the catalogue.
Listing validates every replacement against the current source without changing files.
The runner tests check all 196 entries and their unique source sites.
The catalogue retains 188 original entries, retires one equivalent mutation, and adds eight guard mutations.
The source paths may name the Loops or Gen root; flat filenames still name Loops sources.
Run `node model/mutate/run.mjs --only things-prev-or,things-drop-may` to select mutations.
Use `--output path` to choose the JSON result path.
Use `--timeout seconds` to set each command timeout.
The default timeout is 180 seconds.
The default result path is `model/mutate/results.json`.
Run `node --test model/mutate/run.test.mjs` to check the runner.
See [REPORT.md](REPORT.md) for audited outcomes and the known generator assertion.

The runner requires clean candidate source files in the index and worktree.
It checks the baseline build and compares freshly generated vectors with `vectors/`.
It stops if the baseline differs.
Each mutation uses a separate generation directory with a copy of `vectors/`.
Gen replaces its generated directories and leaves the standard fixtures and README files unchanged.
It restores the source after each mutation and rebuilds the baseline at the end.
The runner uses a lock directory at `model/.mutation-run.lock`.
If a crash leaves the lock, inspect the source and processes before removing it.

Results are saved after each mutation.
Command logs are in the output path plus `.logs`.
A nonzero build is `rejected-by-build`, with `buildRejectionNeedsAudit` set.
Inspect its log to locate the rejection; the status makes no semantic-proof claim.
A timeout, spawn failure, or generator failure is an error, not a kill.
Survivors do not cause a nonzero exit.
Signals stop the active process group and return a signal-specific exit code.
This runner needs POSIX process groups, Git, Node, and Lake.
