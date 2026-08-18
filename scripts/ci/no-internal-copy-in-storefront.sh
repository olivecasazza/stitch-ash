#!/usr/bin/env bash
# scripts/ci/no-internal-copy-in-storefront.sh
# Fails if any prohibited internal/advisory string appears in customer-visible storefront paths.
# Used by pr-checks.yml on every PR and by authors before opening a PR.

set -euo pipefail

PROHIBITED=(
  "Operations platform recommendation"
  "Why Shopify first"
  "Why Medusa"
  "Alternatives"
  "Buy Buttons or Storefront API can plug into Astro"
)

CUSTOMER_PATHS="app/pages app/components app/layouts app/assets nuxt.config.ts"

FOUND=0
for phrase in "${PROHIBITED[@]}"; do
  if grep -r --exclude-dir=node_modules -l "$phrase" $CUSTOMER_PATHS 2>/dev/null; then
    echo "ERROR: prohibited string found in storefront paths: $phrase"
    FOUND=1
  fi
done

if [ $FOUND -eq 1 ]; then
  echo ""
  echo "Internal/advisory copy detected in customer-visible paths."
  echo "Move this content to doc/decisions/ or source comments."
  exit 1
fi

echo "Internal-copy gate: passed (no prohibited strings found in $CUSTOMER_PATHS)"
exit 0
