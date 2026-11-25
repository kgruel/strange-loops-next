#!/bin/sh
# Make a release of the loops CLI. See .claude/skills/release/SKILL.md for
# when to make one; this script is the how, and refuses the usual slips.
#
#   tools/release.sh bump [<version>]   in the merge request that changes the CLI:
#                                       raise the crate version (next patch by default)
#   tools/release.sh tag                on main, after the merge has reached both copies:
#                                       tag v<version> and push the tag to both
#   tools/release.sh verify             wait for the release workflow, then check the
#                                       published release and this machine's archive
#
# The two copies are the remotes PRIMARY (default origin) and PUBLIC (default
# github). The tag pushed to PUBLIC starts .github/workflows/release.yml.
set -eu

PRIMARY=${PRIMARY:-origin}
PUBLIC=${PUBLIC:-github}
root=$(git rev-parse --show-toplevel)
cd "$root"
manifest=rust/cli/Cargo.toml
lock=rust/Cargo.lock

die() {
  echo "release: $*" >&2
  exit 1
}

version() {
  sed -n 's/^version = "\(.*\)"$/\1/p' "$manifest" | head -n 1
}

public_repo() {
  git remote get-url "$PUBLIC" | sed -e 's#^git@github\.com:##' -e 's#^https://github\.com/##' -e 's#\.git$##'
}

cmd=${1:-}
case "$cmd" in
bump)
  old=$(version)
  if [ $# -ge 2 ]; then
    new=$2
  else
    new="${old%.*}.$((${old##*.} + 1))"
  fi
  printf '%s' "$new" | grep -Eq '^[0-9]+\.[0-9]+\.[0-9]+$' || die "$new is not <major>.<minor>.<patch>"
  [ "$new" != "$old" ] || die "the version is already $old"
  git ls-remote --exit-code "$PUBLIC" "refs/tags/v$new" >/dev/null 2>&1 && die "v$new is already released"
  # The crate's own version line, and its entry in the lock file.
  sed -i.bak "s/^version = \"$old\"\$/version = \"$new\"/" "$manifest" && rm "$manifest.bak"
  awk -v old="$old" -v new="$new" '
    prev == "name = \"loops-cli\"" && $0 == "version = \"" old "\"" { $0 = "version = \"" new "\"" }
    { print; prev = $0 }' "$lock" >"$lock.new" && mv "$lock.new" "$lock"
  [ "$(version)" = "$new" ] || die "$manifest still says $(version)"
  grep -A1 '^name = "loops-cli"$' "$lock" | grep -q "^version = \"$new\"\$" || die "$lock was not updated"
  echo "loops-cli $old -> $new. Commit both files in the merge request; add a line to CHANGELOG.md."
  ;;
tag)
  [ "$(git rev-parse --abbrev-ref HEAD)" = main ] || die "not on main"
  [ -z "$(git status --porcelain)" ] || die "the working tree is not clean"
  git fetch -q "$PRIMARY"
  git fetch -q "$PUBLIC"
  head=$(git rev-parse HEAD)
  [ "$head" = "$(git rev-parse "$PRIMARY/main")" ] || die "HEAD is not $PRIMARY/main"
  [ "$head" = "$(git rev-parse "$PUBLIC/main")" ] || die "$PUBLIC/main does not have this commit yet"
  tag="v$(version)"
  for remote in "$PRIMARY" "$PUBLIC"; do
    git ls-remote --exit-code "$remote" "refs/tags/$tag" >/dev/null 2>&1 &&
      die "$tag is already on $remote: bump the version in a merge request first"
  done
  git rev-parse -q --verify "refs/tags/$tag" >/dev/null && die "$tag already exists here"
  git tag -a "$tag" -m "loops ${tag#v}"
  git push -q "$PRIMARY" "$tag"
  git push -q "$PUBLIC" "$tag"
  echo "pushed $tag at $(git rev-parse --short HEAD). The release workflow is running:"
  echo "  https://github.com/$(public_repo)/actions/workflows/release.yml"
  echo "next: tools/release.sh verify"
  ;;
verify)
  tag="v$(version)"
  repo=$(public_repo)
  # The run for this tag; the API can fail for a moment, so ask again.
  run=""
  tries=0
  while [ -z "$run" ]; do
    run=$(gh run list --repo "$repo" --workflow release.yml --branch "$tag" --event push --limit 1 \
      --json databaseId --jq '.[0].databaseId // empty' 2>/dev/null || true)
    [ -n "$run" ] && break
    tries=$((tries + 1))
    [ "$tries" -lt 12 ] || die "no release run for $tag on $repo"
    sleep 10
  done
  echo "run $run"
  until [ "$(gh run view "$run" --repo "$repo" --json status --jq .status 2>/dev/null || true)" = completed ]; do
    sleep 20
  done
  conclusion=$(gh run view "$run" --repo "$repo" --json conclusion --jq .conclusion)
  [ "$conclusion" = success ] || die "run $run ended $conclusion: https://github.com/$repo/actions/runs/$run"
  state=$(gh release view "$tag" --repo "$repo" --json isDraft,assets --jq '"\(.isDraft) \(.assets | length)"')
  [ "$state" = "false 8" ] || die "release $tag is not published with 8 files (draft and count: $state)"
  # This machine's archive: its checksum, and the version the binary prints.
  case "$(uname -s)-$(uname -m)" in
  Linux-x86_64) target=x86_64-unknown-linux-musl ;;
  Linux-aarch64) target=aarch64-unknown-linux-musl ;;
  Darwin-arm64) target=aarch64-apple-darwin ;;
  Darwin-x86_64) target=x86_64-apple-darwin ;;
  *) die "no archive for $(uname -s)-$(uname -m)" ;;
  esac
  dir=$(mktemp -d)
  trap 'rm -rf "$dir"' EXIT
  name="loops-$tag-$target"
  gh release download "$tag" --repo "$repo" --dir "$dir" --pattern "$name.tar.gz*"
  (cd "$dir" && shasum -a 256 -c "$name.tar.gz.sha256" && tar -xzf "$name.tar.gz")
  printed=$("$dir/$name/loops" --version)
  [ "$printed" = "strange-loops-next ${tag#v}" ] || die "the binary prints: $printed"
  echo "$tag is published: https://github.com/$repo/releases/tag/$tag"
  echo "checked here: $name.tar.gz matches its checksum and prints \"$printed\""
  ;;
*)
  sed -n '2,13p' "$0" | sed 's/^# \{0,1\}//'
  exit 2
  ;;
esac
