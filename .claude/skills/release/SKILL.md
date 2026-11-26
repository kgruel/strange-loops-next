---
name: release
description: Publish a GitHub release of the loops CLI binary. Use after a merge to main that changes what the `loops` command does, or when asked to cut, make or publish a release. Covers the version bump, the tag, the release workflow and the check afterwards.
---

# Releasing `loops`

A release is a tag `v<version>` on main. The tag starts `.github/workflows/release.yml` on the GitHub copy, which builds `loops` for four machines and publishes the archives with their SHA-256 files. The release's name is the version `loops --version` prints.

Kyle's standing leave (2026-11-25): a release follows each merge that changes the CLI, without asking first. Tell him afterwards.

## When

- **Release** after a merge that changes what `loops` does: anything under `rust/` that changes a command's behaviour, output, help or exit code.
- **No release** for a merge that leaves the binary's behaviour as it was: notes, `DECISIONS.md`, the model, vectors, the design pages, tests alone.
- When several CLI merges land close together, one release after the last is enough.

## Steps

1. **In the merge request that changes the CLI, raise the version.**

   ```sh
   tools/release.sh bump          # next patch: 0.1.1 -> 0.1.2
   tools/release.sh bump 0.2.0    # or name it
   ```

   It edits `rust/cli/Cargo.toml` and the crate's entry in `rust/Cargo.lock`. Commit both with the change. Use a patch bump unless Kyle says otherwise. If a CLI change was merged without a bump, make a small merge request that only bumps. If the change alters anything `GUIDE.md` shows (a command, a flag, an output, the wording of a stop), update the guide in the same merge request.

2. **Merge as usual, and wait until the GitHub copy has the merge.** The tag must point at a commit both copies hold.

3. **Tag and push,** from the main checkout:

   ```sh
   tools/release.sh tag
   ```

   It refuses unless the checkout is clean, on main, and equal to main on both remotes, and unless `v<version>` is new. It pushes the tag to both.

4. **Wait and check:**

   ```sh
   tools/release.sh verify
   ```

   It waits for the workflow run, requires the release to be published with eight files, downloads this machine's archive, checks it against its SHA-256 and requires the binary to print the release's version. The run takes about three minutes. Run it in the background if you have other work.

5. **Record and tell.** Add one line to `CHANGELOG.md` under the day's date, in the same merge request as the bump where you can, naming the version and what a user gets. Tell Kyle the version, the link and what changed.

## Rules

- **Never move, delete or reuse a published tag.** A release that is wrong is followed by the next version.
- **Only from main,** and only a commit both copies hold. Never from a branch.
- **Nothing private in the release notes.** The workflow writes them; do not add to them by hand.
- A record's bytes do not depend on the version. If a release ever changes what an accepted command signs, that is a ruling for Kyle before it is a release.

## When the run fails

- **A build job failed for a passing reason** (a runner fault, a network error): rerun the failed jobs from the run's page, or `gh run rerun <id> --failed`. The draft the first job opened is still there, and the build jobs attach to it.
- **The first job failed** because the tag does not match the crate version: the tag was pushed by hand. Leave it, bump the version through a merge request, and release that.
- **The code does not build for a target:** fix it through a merge request, bump again, and release the next version. An unpublished draft may be deleted (`gh release delete <tag> --yes`); a published release may not.

## Trying the workflow without publishing

A manual run leaves a draft, which only the repository's owner sees and which creates no tag:

```sh
gh workflow run release.yml --ref main -f tag=v<version>-dryrun
```

Delete the draft afterwards: `gh release delete v<version>-dryrun --yes`. Use this after changing the workflow itself.
