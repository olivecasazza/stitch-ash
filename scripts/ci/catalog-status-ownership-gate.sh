#!/usr/bin/env bash
# scripts/ci/catalog-status-ownership-gate.sh
# Fails if this repo declares a Shopify product status in one place while a
# second, adjacent declaration disagrees — the exact shape of a silent
# de-listing hazard.
#
# STI-538 / STI-531 / STI-269. Record:
# docs/decisions/2026-09-28-catalog-source-of-truth.md
#
# Why this gate exists. Product status is declared TWICE, in two repos:
#
#   this repo      catalog/products/*.yaml   -> status: ACTIVE
#   nixlab         nix/tofu/shopify/terranix.nix -> status = "draft";
#                                              inventory_policy = "deny"
#
# The live store is ACTIVE on all three SKUs (verified 2026-09-28). So running
# `nix run .#deploy-shopify` — the tofu apply — would PUT status "draft" over
# three live ACTIVE products and de-list all of them in one action. That is
# STI-531, and it is the same hazard that STI-269's cancelled
# `catalog:apply ACTIVE -> DRAFT` diff was trying to execute by another route.
#
# A comment in either repo cannot stop this: an operator reading
# `status = "draft"` concludes it is correct, because that IS what the file
# says. The conflict is only visible when the two files are read side by side,
# which is exactly what a doc comment prevents anyone from doing.
#
# So the invariant is made mechanical here. This gate reads the statuses this
# repo owns and compares them against the adjacent nixlab declaration, and it
# FAILS LOUD on disagreement instead of letting the tofu apply stand as the
# only unexamined word.
#
# Scope limit, stated honestly:
#   - It compares DECLARED text. It does not call the Shopify Admin API, and it
#     does not read any secret. Live store state is verified by `catalog:plan`
#     under operator-supplied credentials, not here.
#   - When the nixlab tree is not reachable (CI, a fresh clone), the gate
#     verifies the single-repo invariant and reports SKIPPED for the cross-repo
#     comparison. It never reports a cross-repo PASS it did not perform.
#
# Usage: catalog-status-ownership-gate.sh [path/to/catalog/products] [path/to/terranix.nix]
# The arguments exist so both failure modes are directly testable.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
CATALOG_DIR="${1:-$REPO_ROOT/catalog/products}"

# Adjacent nixlab, per flake.nix's own NIXLAB_DIR convention.
NIXLAB_DIR="${NIXLAB_DIR:-$REPO_ROOT/../nixlab}"
TERRANIX="${2:-}"
if [ -z "$TERRANIX" ]; then
  for candidate in \
    "$NIXLAB_DIR/nix/tofu/shopify/terranix.nix" \
    "$REPO_ROOT/nix/tofu/shopify/terranix.nix"; do
    if [ -f "$candidate" ]; then TERRANIX="$candidate"; break; fi
  done
fi

fail() {
  echo "FAIL: $1"
  echo ""
  echo "Product status must have exactly one owner. See"
  echo "docs/decisions/2026-09-28-catalog-source-of-truth.md (STI-538)."
  exit 1
}

[ -d "$CATALOG_DIR" ] || fail "catalog products directory not found: $CATALOG_DIR"

# ── Step 1: this repo's declared statuses ────────────────────────────────
# Emit "handle<TAB>status" per product.
declared_statuses() {
  for yaml in "$CATALOG_DIR"/*.yaml; do
    [ -e "$yaml" ] || continue
    handle="$(python3 -c 'import sys,re;src=open(sys.argv[1]).read();m=re.search(r"^handle:\s*(\S+)",src,re.M);print(m.group(1) if m else "")' "$yaml")"
    status="$(python3 -c 'import sys,re;src=open(sys.argv[1]).read();m=re.search(r"^status:\s*(\S+)",src,re.M);print(m.group(1) if m else "")' "$yaml")"
    [ -n "$handle" ] || continue
    if [ -z "$status" ]; then
      printf 'MISSING-STATUS\t%s\n' "$handle"
      continue
    fi
    printf '%s\t%s\n' "$handle" "$status"
  done
}

mapfile -t ROWS < <(declared_statuses)

if [ "${#ROWS[@]}" -eq 0 ]; then
  fail "no catalog products with a 'handle:' were found in $CATALOG_DIR"
fi

echo "catalog status ownership gate"
echo "  repo catalog: $CATALOG_DIR"
missing=0
for row in "${ROWS[@]}"; do
  case "$row" in
    MISSING-STATUS$'\t'*)
      missing=$((missing + 1))
      ;;
    *)
      printf '    %-12s %s\n' "${row%%$'\t'*}" "${row##*$'\t'}"
      ;;
  esac
done
if [ "$missing" -gt 0 ]; then
  for row in "${ROWS[@]}"; do
    case "$row" in
      MISSING-STATUS$'\t'*) printf '    %-12s <-- NO status: field\n' "$(printf '%s' "$row" | cut -f2)" ;;
    esac
  done
  fail "$missing catalog product(s) have no 'status:' — status must be declared, not implied"
fi

# ── Step 2: the second declaration ────────────────────────────────────────
if [ -z "$TERRANIX" ] || [ ! -f "$TERRANIX" ]; then
  echo "  nixlab terranix: NOT REACHABLE — cross-repo comparison SKIPPED (not a pass)"
  echo ""
  echo "Single-repo invariant held: every catalog product declares a status."
  echo "The cross-repo check runs when the nixlab tree is present:"
  echo "  NIXLAB_DIR=/path/to/nixlab ./scripts/ci/catalog-status-ownership-gate.sh"
  exit 0
fi

echo "  nixlab terranix: $TERRANIX"

# Extract each restapi_object product block's handle + status from the Nix.
# Blocks look like: product_hoodie = { ... handle = "sku-001"; ... status = "draft"; ... }
nix_statuses() {
  python3 - "$TERRANIX" <<'PY'
import re, sys

src = open(sys.argv[1], encoding="utf-8").read()
# Isolate the restapi_object products block, then each product_* resource.
m = re.search(r"resource\.restapi_object\s*=\s*\{(.*)\n\s*\};", src, re.S)
body = m.group(1) if m else src
for block in re.finditer(r"\n\s{4}(product_\w+)\s*=\s*\{(.*?)\n    \};", body, re.S):
    name, text = block.group(1), block.group(2)
    handle = re.search(r'handle\s*=\s*"([^"]+)"', text)
    status = re.search(r'status\s*=\s*"([^"]+)"', text)
    policy = re.search(r'inventory_policy\s*=\s*"([^"]+)"', text)
    if handle:
        print(f"{name}\t{handle.group(1)}\t{status.group(1) if status else 'NONE'}\t{policy.group(1) if policy else 'NONE'}")
PY
}

mapfile -t NIX_ROWS < <(nix_statuses)
if [ "${#NIX_ROWS[@]}" -eq 0 ]; then
  echo "  no product resources parsed out of terranix.nix — nothing to compare"
  echo ""
  echo "Single-repo invariant held. Cross-repo comparison produced no rows; review manually."
  exit 0
fi

conflicts=0
for row in "${ROWS[@]}"; do
  repo_handle="${row%%$'\t'*}"; repo_status="${row##*$'\t'}"
  for nrow in "${NIX_ROWS[@]}"; do
    n_name="$(printf '%s' "$nrow" | cut -f1)"
    n_handle="$(printf '%s' "$nrow" | cut -f2)"
    n_status="$(printf '%s' "$nrow" | cut -f3)"
    n_policy="$(printf '%s' "$nrow" | cut -f4)"
    [ "$n_handle" = "$repo_handle" ] || continue
    # Shopify status values are case-insensitive ("active"/"ACTIVE" are the
    # same status), so a case difference is agreement, not drift. Reporting it
    # as a conflict would train people to ignore this gate.
    if [ "$(printf '%s' "$n_status" | tr '[:upper:]' '[:lower:]')" = "$(printf '%s' "$repo_status" | tr '[:upper:]' '[:lower:]')" ]; then
      printf '    %-12s agree (%s, policy %s)\n' "$repo_handle" "$repo_status" "$n_policy"
    else
      conflicts=$((conflicts + 1))
      echo ""
      echo "CONFLICT on $repo_handle ($n_name):"
      echo "    catalog/products  : $repo_status"
      echo "    nixlab terranix  : status=$n_status inventory_policy=$n_policy"
    fi
  done
done

if [ "$conflicts" -gt 0 ]; then
  fail "$conflicts product(s) are declared with conflicting status in two repos. Applying the nixlab tofu would de-list them. Decide the single owner first."
fi

echo ""
echo "OK: catalog/products and nixlab terranix agree on status for every shared handle."
