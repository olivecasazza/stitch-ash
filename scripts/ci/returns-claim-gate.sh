#!/usr/bin/env bash
# scripts/ci/returns-claim-gate.sh
# Fails if the SKUs make MUTUALLY EXCLUSIVE returns/fulfilment promises to
# customers. STI-681.
#
# Why this gate exists, and why it is not the lead-time gate again.
#
# scripts/ci/lead-time-claim-gate.sh (PR #190, STI-638) answers "did someone
# add a NEW production lead-time claim?" It is a scan for unquoted lead times.
# It cannot answer "do two claims that are already committed to the repo
# contradict each other?", because each individual string is perfectly legal
# and neither one is new.
#
# The live defect it cannot catch, measured on preview.stitch-ash.com
# 2026-10-04:
#
#   /product/sku-001   Made to order. Ships in 2-3 weeks. Tracked shipping.
#                      Returns within 14 days, unworn.        <- returnable
#   /product/sku-002   Made to order. Tracked shipping.
#                      Final sale.                            <- not returnable
#   /product/sku-003   Made to order. Tracked shipping.
#                      Final sale.                            <- not returnable
#
# Same store, same customer, same checkout. One SKU is returnable and two are
# not, and the repo contains no return-policy object that says which is true.
# There is no returns page for the storefront to defer to, so nothing
# customer-facing is authoritative either.
#
# A new-lead-time scan passes this defect cleanly, because it is not a new
# lead time. That is why this is a separate gate with a different invariant:
# CROSS-SKU AGREEMENT rather than NO-NEW-CLAIM.
#
# ── Root cause, recorded because it is the interesting part ────────────────
#
# Before the copy rewrite, NO SKU mentioned returns at all:
#
#   $ git show 79ad80e^:catalog/products/sku-001.yaml | grep -P 'Returns|Final sale'
#   (no matches)
#
# Commit 79ad80e ("product descriptions are spec lines, not brand prose", #204)
# CREATED the contradiction in a single change: it added "Returns within 14
# days, unworn." to the hoodie and "Final sale." to the other two. The split
# was born in a commit whose stated purpose was to strip unverified selling
# language out of the PDP. It authored a specific, quantified, legally
# operative commercial commitment that no supplier, operator, or document had
# ever stated, while removing prose.
#
# DESIGN.md:604 then transcribed the invented string as the exact current copy,
# which is the mechanism by which it became durable: the next agent
# re-authoring from the spec reproduces it faithfully.
#
# ── The structural fix this gate is NOT ───────────────────────────────────
#
# This gate proves the SKUs agree with each other. It does NOT know what the
# right policy IS and cannot make a policy decision. The real fix is to declare
# a returns policy ONCE (a policy object, like catalog/shipping/default.yaml
# already does for shipping) and have all three SKUs render from it, so the
# policy is stated once and cannot drift. That is tracked on STI-681 and is
# blocked on the operator's policy decision.
#
# Until that object exists, this gate is the interim protection: it keeps the
# three SKUs from disagreeing, so the store never tells two customers
# different things about the same company. Today it will FAIL on main, which
# is correct and is the point — a permanent unmissable red for a live
# customer-facing contradiction is the STI-226 shape made visible.
#
# Scope limit, stated honestly:
#   - It compares DECLARED text in catalog/products/*.yaml against the static
#     fallback in app/data/products.ts. It does not call the Shopify API and
#     reads no secret. If Shopify holds a description that overrides both, that
#     is not covered here.
#   - It classifies a line as a RETURNS claim only if it matches the return
#     vocabulary below. A promise worded in a way this script does not
#     recognise passes silently. That is a real limit, not a clean bill.
#
# Regression tests, including the exact sku-001-vs-sku-002 fixture:
#   ./scripts/ci/returns-claim-gate.test.sh
#
# Usage: returns-claim-gate.sh [path/to/catalog/products] [path/to/products.ts]
# The arguments exist so both failure modes are directly testable.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
CATALOG_DIR="${1:-$REPO_ROOT/catalog/products}"
FALLBACK_TS="${2:-$REPO_ROOT/app/data/products.ts}"

# ── Claim classification ──────────────────────────────────────────────────
#
# A line is a RETURNS claim if it names a return, refund, exchange, or sale
# policy. Matching is on a normalised (lower-cased, non-alnum collapsed to
# single spaces) copy so "Returns within 14 days", "returns within 14 days,"
# and "Final  sale." all classify the same way. The normalisation also means
# the gate cannot be defeated by reformatting the line.
#
# Direction is what actually matters, and there are only two coherent ones:
#
#   RETURNABLE  the customer may send it back
#   FINAL_SALE  the customer may not
#
# An EXCHANGE promise is returnable in substance: it requires the customer to
# send the item back. It is classified RETURNABLE, because "exchanges only"
# with no refund path still contradicts "final sale".

RETURNS_RE='(return|refund|exchange|restock|final[[:space:]]+sale)'

# A line that states a window/policy but no direction is AMBIGUOUS and is
# reported as such rather than guessed at. Guessing here would recreate the
# exact defect the gate exists to catch.
classify_line() {
  local line="$1" norm
  norm="$(printf '%s' "$line" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/ /g' | tr -s ' ')"
  [ -z "$norm" ] && return 0

  # Not a returns/fulfilment line at all -> not our business.
  printf '%s' "$norm" | grep -Eq "$RETURNS_RE" || return 0

  # A section/panel HEADING is a label, not a promise. "Shipping & Returns"
  # contains the word "Returns" and would otherwise classify as a RETURNABLE
  # claim, which is exactly the kind of non-fact that makes a gate lie.
  if printf '%s' "$norm" | grep -Eq '^(shipping[[:space:]]*(&[[:space:]]*)?)?returns?$'; then
    return 0
  fi

  # Direction first. "final sale" is terminal even if the rest of the line
  # hedges, because a final-sale item cannot also be returnable.
  if printf '%s' "$norm" | grep -Eq 'final[[:space:]]+sale'; then
    printf 'FINAL_SALE\t%s\n' "$line"
    return 0
  fi
  if printf '%s' "$norm" | grep -Eq 'no[[:space:]]+(refund|return|exchange)|non[[:space:]]+refundable|cannot[[:space:]]+be[[:space:]]+returned'; then
    printf 'FINAL_SALE\t%s\n' "$line"
    return 0
  fi
  # An exchange-only line is still a send-back promise.
  if printf '%s' "$norm" | grep -Eq 'exchange'; then
    printf 'RETURNABLE\t%s\n' "$line"
    return 0
  fi
  # Direction-bearing wording ONLY. The bare words "return"/"refund" are NOT
  # enough: "Our return policy applies" names no direction, and a gate that
  # guesses RETURNABLE there would invent the very commitment this gate exists
  # to catch. Unrecognised direction falls through to AMBIGUOUS below.
  if printf '%s' "$norm" | grep -Eq 'returnable|refunds?[[:space:]]+(are|are[[:space:]]+)?(given|issued|processed|available|within)|returns?[[:space:]]+(are[[:space:]]+)?(accepted|allowed|permitted)|returns?[[:space:]]+within|accept(s|ed)?[[:space:]]+returns?'; then
    printf 'RETURNABLE\t%s\n' "$line"
    return 0
  fi
  printf 'AMBIGUOUS\t%s\n' "$line"
}

fail=0
declare -a FINDINGS=()

# ── Collect claims from the catalog (the source of truth) ─────────────────
if [ ! -d "$CATALOG_DIR" ]; then
  echo "returns-claim-gate: catalog dir not found: $CATALOG_DIR" >&2
  exit 2
fi

catalog_claims=""
for yaml in "$CATALOG_DIR"/*.yaml; do
  [ -e "$yaml" ] || continue
  handle="$(grep -m1 '^handle:' "$yaml" | sed 's/^handle:[[:space:]]*//' | tr -d '"'"'"'')"
  [ -n "$handle" ] || continue
  while IFS= read -r line; do
    verdict="$(classify_line "$line")"
    [ -n "$verdict" ] || continue
    FINDINGS+=("catalog  $handle  $verdict")
    catalog_claims="${catalog_claims}${verdict}"$'\n'
  done < <(grep -o '<li>[^<]*</li>' "$yaml" | sed -e 's/<li>//' -e 's|</li>||')
done

# ── Cross-SKU agreement within the catalog ────────────────────────────────
#
# This is the invariant. Every SKU must resolve to ONE direction. It does not
# matter which direction: final-sale-everywhere and returnable-everywhere both
# pass. Only the store contradicting itself fails.
catalog_direction="$(printf '%s' "$catalog_claims" | cut -f1 | sort -u | grep -v '^$' || true)"

if printf '%s\n' "$catalog_direction" | grep -q 'RETURNABLE' && printf '%s\n' "$catalog_direction" | grep -q 'FINAL_SALE'; then
  fail=1
  echo "returns-claim-gate: CONTRADICTION in catalog/products"
  echo "  The SKUs make mutually exclusive returns promises."
  for f in "${FINDINGS[@]}"; do echo "  $f"; done
  echo
  echo "  This is a live customer-facing contradiction, not a style issue."
  echo "  A customer can be told two opposite things by one store."
  echo "  Fix: declare ONE returns policy and apply it to every SKU (STI-681)."
elif printf '%s\n' "$catalog_direction" | grep -q '^AMBIGUOUS$'; then
  fail=1
  echo "returns-claim-gate: AMBIGUOUS returns claim in catalog/products"
  for f in "${FINDINGS[@]}"; do echo "  $f"; done
  echo
  echo "  A returns line states no direction. Refusing to guess: guessing is"
  echo "  how the current contradiction was created (STI-681)."
elif [ -n "$catalog_direction" ]; then
  echo "returns-claim-gate: catalog agrees on $(printf '%s' "$catalog_direction" | tr '\n' ' ')"
else
  echo "returns-claim-gate: no returns claim found in catalog (nothing to contradict)"
fi

# ── Fallback drift: app/data/products.ts ──────────────────────────────────
#
# products.ts is a static fallback used when Shopify returns no description
# (see its own header). If it disagrees with the catalog, the storefront can
# show one policy to a customer whose Shopify data is present and the opposite
# to one whose is not. That is the same contradiction via a different code
# path, and it is invisible to a catalog-only gate.
if [ -f "$FALLBACK_TS" ]; then
  fb_claims="$(grep -o '"[^"]*"' "$FALLBACK_TS" | tr -d '"' | while IFS= read -r line; do classify_line "$line"; done)"
  fb_direction="$(printf '%s' "$fb_claims" | cut -f1 | sort -u | grep -v '^$' || true)"
  cat_count="$(printf '%s\n' "$catalog_direction" | grep -c . || true)"
  fb_count="$(printf '%s\n' "$fb_direction" | grep -c . || true)"

  if [ "$fb_count" -gt 1 ]; then
    fail=1
    echo
    echo "returns-claim-gate: the fallback itself states two directions"
    printf '%s\n' "$fb_claims" | sed 's/^/  fallback  /'
    echo
    echo "  app/data/products.ts renders when Shopify has no description, so"
    echo "  this contradiction is customer-visible with no catalog involved."
  elif [ "$cat_count" -gt 0 ] && [ "$fb_count" -gt 0 ]; then
    cat_all="$(printf '%s' "$catalog_direction" | tr '\n' ' ')"
    fb_all="$(printf '%s' "$fb_direction" | tr '\n' ' ')"
    if [ "$(echo "$cat_all" | tr -d ' ')" != "$(echo "$fb_all" | tr -d ' ')" ]; then
      fail=1
      echo
      echo "returns-claim-gate: catalog/fallback drift"
      echo "  catalog  says: $cat_all"
      echo "  fallback says: $fb_all"
      echo "  The static fallback renders when Shopify has no description, so a"
      echo "  customer could be shown a different policy by data state alone."
    else
      echo "returns-claim-gate: catalog and fallback agree on $fb_all"
    fi
  else
    echo "returns-claim-gate: no fallback returns claim; skipped drift check"
  fi
else
  echo "returns-claim-gate: fallback $FALLBACK_TS not found; skipped fallback check"
fi

if [ "$fail" -ne 0 ]; then
  echo
  echo "returns-claim-gate: FAIL"
  exit 1
fi
echo "returns-claim-gate: PASS"
exit 0
