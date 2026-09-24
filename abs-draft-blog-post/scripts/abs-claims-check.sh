#!/usr/bin/env bash
# Run the ABS repo's own claims gate against a draft file.
#
# scripts/check-claims.mjs only scans src/, public/, ads/, video/, videos/, so a
# draft sitting in content-drafts/ is invisible to it. This copies the draft to
# a temp path inside src/, runs the real gate, then removes the copy. No repo
# file is modified and nothing is left behind.
#
# Usage:  bash abs-claims-check.sh <draft.md> [repo_root]
# Default repo_root: $ABS_REPO, else ~/repos/abs-website
# Exit 0 = clean. Exit 1 = retired or unapproved claim found; fix before saving.

set -uo pipefail
DRAFT="${1:?usage: abs-claims-check.sh <draft.md> [repo_root]}"
ROOT="${2:-${ABS_REPO:-$HOME/repos/abs-website}}"

[ -f "$DRAFT" ] || { echo "draft not found: $DRAFT" >&2; exit 2; }

TMP="$ROOT/src/.abs-draft-claims-check.md"
cleanup() { rm -f "$TMP"; }
trap cleanup EXIT

cp "$DRAFT" "$TMP"
cd "$ROOT"
node scripts/check-claims.mjs
