#!/usr/bin/env bash
# Build the internal link inventory for ABS from the repo itself.
#
# This replaces the internal_urls.csv the old pipeline expected. The source of
# truth is the same set of data files src/app/sitemap.ts spreads, so the
# inventory matches what the site actually routes.
#
# Usage:  bash abs-url-inventory.sh [repo_root] > urls.txt
# Default repo_root: $ABS_REPO, else ~/repos/abs-website
#
# Note: the inventory reflects the CURRENTLY CHECKED-OUT BRANCH. Pages that
# live on a preview branch (the near-me hubs on preview/abs-34-near-me-hubs,
# for example) will not appear. Check the branch before trusting a "no such
# page" result.

set -euo pipefail
ROOT="${1:-${ABS_REPO:-$HOME/repos/abs-website}}"
cd "$ROOT"

slugs() { grep -hoE '"?slug"?:[[:space:]]*"[a-z0-9-]+"' "$@" | grep -oE '"[a-z0-9-]+"$' | tr -d '"'; }

{
  # Static routes (mirrors the staticPaths array in src/app/sitemap.ts)
  printf '%s\n' \
    / \
    /commercial-cleaning-company-austin-tx \
    /services \
    /facilities \
    /blog \
    /careers \
    /privacy-policy \
    /industries-we-serve \
    /get-a-quote-commercial-cleaning-free-quote-texas \
    /contact-commercial-cleaning-texas

  # cityServicePages: literal slug fields in servicePages.ts.
  slugs src/data/servicePages.ts | sed 's|^|/services/|'

  # newServicePages: src/data/services/index.ts builds these as
  # `${svc.base}-${citySlug}`, so the slug never appears as a literal anywhere.
  # Grepping for slug fields misses all of them. Expand base x city instead.
  for base in $(grep -h '^  base: "' src/data/services/*.ts | grep -oE '"[a-z0-9-]+"' | tr -d '"'); do
    for city in $(sed -n '/^export const CITY_NAMES/,/^};/p' src/data/services/shared.ts \
                  | grep -oE '^\s+"?[a-z-]+"?:' | tr -d ' ":'); do
      echo "/services/${base}-${city}"
    done
  done
  slugs src/data/facilities.ts                          | sed 's|^|/facilities/|'
  # allFacilities in facilities.ts spreads the city and near-me variants from
  # src/data/*Cities.ts (churchCities.ts, medicalCities.ts, ...). They route
  # under /facilities/ too, and outnumber the nine hubs six to one.
  shopt -s nullglob
  city_files=(src/data/*Cities.ts)
  shopt -u nullglob
  if [ ${#city_files[@]} -gt 0 ]; then
    slugs "${city_files[@]}"                            | sed 's|^|/facilities/|'
  fi
  slugs src/data/locations.ts                           | sed 's|^|/commercial-cleaning-|'
  slugs src/data/posts.ts                               | sed 's|^|/|'
  slugs src/data/blogPosts.ts                           | sed 's|^|/blog/|'
} | sort -u
