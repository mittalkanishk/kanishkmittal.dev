#!/usr/bin/env bash
# Tags the current commit as a release and pushes the tag. The pushed tag
# starts the Release workflow, which builds the image and deploys it.
#
# Usage: scripts/tag-release.sh [vX.Y.Z]
# With no argument it shows the latest tag and asks for the new one.

set -euo pipefail

MAIN_BRANCH="${MAIN_BRANCH:-main}"
REMOTE="${REMOTE:-origin}"

die() {
  echo "Refusing to tag a release: $*" >&2
  exit 1
}

branch="$(git rev-parse --abbrev-ref HEAD)"
[ "${branch}" = "${MAIN_BRANCH}" ] || die "on '${branch}', not '${MAIN_BRANCH}'."
[ -z "$(git status --porcelain)" ] || die "there are uncommitted changes."

# The workflow builds what is on the remote, so the tag has to point at a pushed commit.
git fetch --quiet --tags "${REMOTE}" "${MAIN_BRANCH}"
[ "$(git rev-parse HEAD)" = "$(git rev-parse "${REMOTE}/${MAIN_BRANCH}")" ] ||
  die "local ${MAIN_BRANCH} and ${REMOTE}/${MAIN_BRANCH} differ. Push or pull first."

latest="$(git tag -l 'v[0-9]*.[0-9]*.[0-9]*' --sort=-v:refname | head -n 1)"
if [[ "${latest}" =~ ^v([0-9]+)\.([0-9]+)\.([0-9]+)$ ]]; then
  suggestion="v${BASH_REMATCH[1]}.${BASH_REMATCH[2]}.$((BASH_REMATCH[3] + 1))"
else
  suggestion="v1.0.0"
fi
echo "Latest tag: ${latest:-none}"

tag="${1:-}"
if [ -z "${tag}" ]; then
  read -r -p "New release tag [${suggestion}]: " tag
  tag="${tag:-${suggestion}}"
fi

[[ "${tag}" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]] || die "'${tag}' is not a version like v1.2.3."
if git rev-parse -q --verify "refs/tags/${tag}" >/dev/null; then
  die "tag ${tag} already exists."
fi

git tag "${tag}"
git push "${REMOTE}" "${tag}"
echo "Pushed ${tag}. The Release workflow now builds the image and deploys it."
