#!/usr/bin/env bash
# Repository-scoped GHCR names prevent separate checkouts from overwriting the same main tag.
set -euo pipefail
case "${1:-}" in
  backend|frontend) app="$1" ;;
  *) echo "usage: image-name.sh backend|frontend" >&2; exit 2 ;;
esac
repository=$(printf '%s' "${GITHUB_REPOSITORY:?GITHUB_REPOSITORY is required}" | tr '[:upper:]' '[:lower:]')
if [[ ! "$repository" =~ ^[a-z0-9][a-z0-9_.-]*/[a-z0-9][a-z0-9_.-]*$ ]]; then
  echo "GITHUB_REPOSITORY must be owner/repository" >&2
  exit 2
fi
printf '%s/%s-%s\n' "${REGISTRY:-ghcr.io}" "$repository" "$app"
