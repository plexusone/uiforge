#!/usr/bin/env bash
# Publish the UIForge npm packages in dependency order:
#   @plexusone/uiforge-spec → @plexusone/uiforge-renderer → @plexusone/uiforge-renderer-lit
#
# The renderers depend on the spec package via file:../../spec for local
# development. This script temporarily rewrites that dependency to the
# published semver (^<version>) for publishing, then restores package.json
# and package-lock.json — the file: link is never committed as a version dep.
#
# Prerequisites: npm/pnpm login (publish rights on the @plexusone scope),
# a clean git working tree, and all package versions in agreement.
#
# Usage:
#   scripts/npm-publish.sh                       # publish with npm
#   NPM_CLIENT=pnpm scripts/npm-publish.sh       # publish with pnpm
#   scripts/npm-publish.sh --dry-run             # everything except the publish
set -euo pipefail

cd "$(dirname "$0")/.."

CLIENT="${NPM_CLIENT:-npm}"
EXTRA_FLAGS=""
if [[ "$CLIENT" == "pnpm" ]]; then
  # pnpm refuses to publish from a dirty tree; the temporary file:-dep
  # rewrite below is exactly that, so disable its git check.
  EXTRA_FLAGS="--no-git-checks"
fi

DRY_RUN=""
if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN="--dry-run"
fi

if [[ -n "$(git status --porcelain)" ]]; then
  echo "error: working tree is not clean; commit or stash first" >&2
  exit 1
fi

version() { node -p "require('./$1/package.json').version"; }

SPEC_VERSION="$(version spec)"
REACT_VERSION="$(version renderers/react)"
LIT_VERSION="$(version renderers/lit)"

if [[ "$SPEC_VERSION" != "$REACT_VERSION" || "$SPEC_VERSION" != "$LIT_VERSION" ]]; then
  echo "error: package versions disagree (spec=$SPEC_VERSION react=$REACT_VERSION lit=$LIT_VERSION)" >&2
  exit 1
fi

echo "Publishing UIForge packages at v$SPEC_VERSION ${DRY_RUN:+(dry run)}"

restore() {
  git checkout -q -- renderers/react/package.json renderers/react/package-lock.json \
    renderers/lit/package.json renderers/lit/package-lock.json 2>/dev/null || true
}
trap restore EXIT

echo "--- @plexusone/uiforge-spec"
(cd spec && "$CLIENT" publish --access public $EXTRA_FLAGS $DRY_RUN)

for pkg in renderers/react renderers/lit; do
  name="$(node -p "require('./$pkg/package.json').name")"
  echo "--- $name"
  (
    cd "$pkg"
    npm pkg set "dependencies.@plexusone/uiforge-spec=^$SPEC_VERSION"
    # prepublishOnly (build + test) still runs against the locally built
    # spec/dist via the pre-rewrite node_modules symlink.
    "$CLIENT" publish --access public $EXTRA_FLAGS $DRY_RUN
  )
done

restore
echo "Done. Published spec, react, and lit at v$SPEC_VERSION ${DRY_RUN:+(dry run)}"
