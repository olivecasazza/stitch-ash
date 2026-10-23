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
#
# ── STI-667: a skipped comparison is no longer allowed to exit 0 ─────────────
#
# STI-561 is right that this gate was structurally blind in CI and wrong about
# the consequence. The blind part was real: no workflow checks out the private
# nixlab repo, so the cross-repo comparison never ran on a runner, and the gate
# printed SKIPPED and then exited 0. A green build on a check that never
# happened is the same failure this repo already shipped twice.
#
# The previous response to that — "exit 0 but say SKIPPED (not a pass)" — fixed
# the message and left the defect. The message is now accurate and CI is still
# green on it, because the exit code is what CI reads.
#
# So there are now three outcomes instead of two:
#
#   1. A real nixlab tree is reachable  -> compare it. Unchanged.
#   2. Only the committed fixture      -> compare THAT, and name it. This is
#      the new default: scripts/ci/fixtures/catalog-status-ownership/nixlab/
#      holds the conflict shape as a file in THIS repo, so a fresh clone and a
#      GitHub runner can both perform the comparison instead of skipping it.
#   3. Neither is reachable            -> exit 2. Not 0.
#
# Why the fixture is safe to compare against, and why it is still not the real
# file. The fixture is a hand-frozen reduction that has already drifted from the
# blob it stands in for, so comparing against it is not the same claim as
# comparing against nixlab. It is a DIFFERENT claim: that this repo's catalog
# and its committed record of the adjacent declaration agree. That is worth
# having automatically, and it is what CI can actually obtain.
#
# What keeps the fixture honest is terranix-projection-pin.sh, which pins the
# exact (handle, status, inventory_policy) projection of the real terranix and
# is verified by whoever can read the private repo. If someone edits the fixture
# to turn this gate green, that pin mismatches. The two files together mean
# "the comparison ran" and "the thing compared is still what nixlab says" are
# separate, individually checkable statements rather than one hopeful one.
#
# The honest limit, stated: CI cannot prove the fixture still matches nixlab.
# Anyone reading a green run knows the comparison happened and knows it ran
# against a frozen projection; they do NOT get a fresh reading of nixlab. The
# pin comparison is the separate step that establishes that, and it requires
# private-repo access. Do not let a green gate imply more than that.

# ── STI-557: the invariant is TWO fields, not one ──────────────────────────
#
# ── STI-557: the invariant is TWO fields, not one ──────────────────────────
#
# The first version of this gate compared `status` only. That version could be
# satisfied by the cheapest possible operator response — editing the terranix
# status from "draft" to "active" — while `inventory_policy = "deny"` sat
# untouched in the same product blocks. Proven against a fixture: the status-only
# edit produced "agree" on all three handles and exit 0.
#
# That is a false green, and it is worse than the conflict it was written to
# catch. The live store runs inventory_policy=CONTINUE on all 7 variants with
# inventory at or below zero (STI-557 measurement, 2026-09-29). A tofu apply
# after the status-only edit would leave all three products ACTIVE and named,
# then block checkout on 100% of purchasable stock. A customer would see
# merchandise they can no longer buy.
#
# So both fields are compared, and a field present in one declaration and
# absent in the other is a conflict rather than a shrug. An operator cannot make
# this gate pass by editing the cheaper field.
#
# Regression tests, including the exact status-only-edit fixture:
#   ./scripts/ci/catalog-status-ownership-gate.test.sh
#
# Usage: catalog-status-ownership-gate.sh [path/to/catalog/products] [path/to/terranix.nix]
# The arguments exist so both failure modes are directly testable.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
CATALOG_DIR="${1:-$REPO_ROOT/catalog/products}"

# The nixlab tree to compare against, if a real one is supplied.
NIXLAB_DIR="${NIXLAB_DIR:-$REPO_ROOT/../nixlab}"
TERRANIX="${2:-}"
if [ -z "$TERRANIX" ]; then
  for candidate in \
    "$NIXLAB_DIR/nix/tofu/shopify/terranix.nix" \
    "$REPO_ROOT/nix/tofu/shopify/terranix.nix"; do
    if [ -f "$candidate" ]; then TERRANIX="$candidate"; break; fi
  done
fi

# STI-667: what a given terranix file actually IS, decided once, so the gate can
# be honest about which claim it is making instead of implying they are the same.
#   real     — a real nixlab checkout was supplied
#   fixture  — the committed reduction in this repo, a fresh reading of a frozen
#              projection rather than of nixlab
TERRANIX_ORIGIN="real"
FIXTURE_TERRANIX="$REPO_ROOT/scripts/ci/fixtures/catalog-status-ownership/nixlab/nix/tofu/shopify/terranix.nix"
if [ -z "$TERRANIX" ] || [ ! -f "$TERRANIX" ]; then
  if [ -f "$FIXTURE_TERRANIX" ]; then
    TERRANIX="$FIXTURE_TERRANIX"
    TERRANIX_ORIGIN="fixture"
  else
    TERRANIX=""
  fi
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
# Emit "handle<TAB>status<TAB>policy" per product.
#
# The policy column is the aggregate over the product's variants: Shopify stores
# inventory_policy per variant, so a product is only unambiguous when every
# variant agrees. Variants that disagree report MIXED, which is itself a
# conflict against any single-valued declaration.
declared_statuses() {
  for yaml in "$CATALOG_DIR"/*.yaml; do
    [ -e "$yaml" ] || continue
    handle="$(python3 -c 'import sys,re;src=open(sys.argv[1]).read();m=re.search(r"^handle:\s*(\S+)",src,re.M);print(m.group(1) if m else "")' "$yaml")"
    status="$(python3 -c 'import sys,re;src=open(sys.argv[1]).read();m=re.search(r"^status:\s*(\S+)",src,re.M);print(m.group(1) if m else "")' "$yaml")"
    [ -n "$handle" ] || continue
    if [ -z "$status" ]; then
      printf 'MISSING-STATUS\t%s\t%s\n' "$handle" ""
      continue
    fi
    policy="$(python3 - "$yaml" <<'PY'
import re, sys
src = open(sys.argv[1], encoding="utf-8").read()
found = re.findall(r"^\s+inventoryPolicy:\s*(\S+)\s*$", src, re.M)
if not found:
    print("NONE")
elif len(set(found)) == 1:
    print(found[0])
else:
    print("MIXED:" + ",".join(sorted(set(found))))
PY
)"
    printf '%s\t%s\t%s\n' "$handle" "$status" "$policy"
  done
}

mapfile -t ROWS < <(declared_statuses)

if [ "${#ROWS[@]}" -eq 0 ]; then
  fail "no catalog products with a 'handle:' were found in $CATALOG_DIR"
fi

echo "catalog status ownership gate"
echo "  repo catalog: $CATALOG_DIR"
missing=0
missing_policy=0
for row in "${ROWS[@]}"; do
  case "$row" in
    MISSING-STATUS$'\t'*)
      missing=$((missing + 1))
      ;;
    *)
      printf '    %-12s %-8s policy=%s\n' \
        "${row%%$'\t'*}" \
        "$(printf '%s' "$row" | cut -f2)" \
        "$(printf '%s' "$row" | cut -f3)"
      case "$row" in
        *$'\tNONE' | *$'\tMIXED:'*) missing_policy=$((missing_policy + 1)) ;;
      esac
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
if [ "$missing_policy" -gt 0 ]; then
  for row in "${ROWS[@]}"; do
    case "$row" in
      *$'\tNONE')
        printf '    %-12s <-- NO inventoryPolicy on any variant\n' "$(printf '%s' "$row" | cut -f1)"
        ;;
      *$'\tMIXED:'*)
        printf '    %-12s <-- MIXED inventoryPolicy across variants: %s\n' \
          "$(printf '%s' "$row" | cut -f1)" "$(printf '%s' "$row" | cut -f3)"
        ;;
    esac
  done
  fail "$missing_policy catalog product(s) do not declare one unambiguous inventoryPolicy. That field decides whether checkout is permitted at zero inventory, so it is a second source of truth and must be declared exactly once."
fi

# ── Step 2: the second declaration ────────────────────────────────────────
if [ -z "$TERRANIX" ]; then
  # STI-667: this is the case that used to exit 0. It is now reachable only when
  # BOTH a real nixlab tree and this repo's committed fixture are absent, which
  # means someone deleted the fixture or is running a partial checkout. Neither
  # is a state this gate can pass in, because there is nothing to compare
  # against and a gate with nothing to compare must not report success.
  #
  # Exit 2, distinct from 1: exit 1 means "the two declarations actively
  # disagree", which is a finding about the catalog. Exit 2 means "the check
  # could not be performed", which is a finding about the checkout. Collapsing
  # them would hide a broken runner behind a catalog finding.
  echo "  nixlab terranix: NOT REACHABLE, and no committed fixture at"
  echo "    $FIXTURE_TERRANIX"
  echo ""
  echo "Refusing to pass: the cross-repo comparison could not be performed at all."
  echo "There is no second declaration to compare against, so there is no evidence"
  echo "that this repo's catalog and the adjacent declaration agree."
  echo ""
  echo "To perform the comparison, supply a real nixlab tree:"
  echo "  NIXLAB_DIR=/path/to/nixlab ./scripts/ci/catalog-status-ownership-gate.sh"
  echo "or restore the committed fixture:"
  echo "  scripts/ci/fixtures/catalog-status-ownership/nixlab/"
  exit 2
fi

if [ "$TERRANIX_ORIGIN" = "fixture" ]; then
  echo "  nixlab terranix: $TERRANIX"
  echo "  origin: COMMITTED FIXTURE — a frozen projection of nixlab, not a fresh"
  echo "          reading of it. This comparison DID run. Whether that projection"
  echo "          still matches casazza-info/nixlab is a separate question, answered"
  echo "          by ./scripts/ci/terranix-projection-pin.sh --compare <terranix.nix>"
  echo "          from a context that can read the private repo."
else
  echo "  nixlab terranix: $TERRANIX"
  echo "  origin: real nixlab checkout (NIXLAB_DIR)"
fi

# Extract each restapi_object product block's handle + status + policy from the
# Nix. Blocks look like:
#   product_hoodie = { ... handle = "sku-001"; ... status = "draft";
#                      ... inventory_policy = "deny"; ... }
# The policy is aggregated across the block's variants for the same reason the
# catalog side is: a product is only unambiguous when its variants agree.
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
    policies = re.findall(r'inventory_policy\s*=\s*"([^"]+)"', text)
    if not policies:
        policy = "NONE"
    elif len(set(policies)) == 1:
        policy = policies[0]
    else:
        policy = "MIXED:" + ",".join(sorted(set(policies)))
    if handle:
        print(f"{name}\t{handle.group(1)}\t{status.group(1) if status else 'NONE'}\t{policy}")
PY
}

mapfile -t NIX_ROWS < <(nix_statuses)
if [ "${#NIX_ROWS[@]}" -eq 0 ]; then
  echo "  no product resources parsed out of terranix.nix — nothing to compare"
  echo ""
  echo "Single-repo invariant held. Cross-repo comparison produced no rows."
  echo "Refusing to pass: a file that yields no comparable rows is not a file"
  echo "that agrees with this one. Review the terranix path by hand."
  exit 1
fi

lower() { printf '%s' "$1" | tr '[:upper:]' '[:lower:]'; }

conflicts=0
for row in "${ROWS[@]}"; do
  repo_handle="$(printf '%s' "$row" | cut -f1)"
  repo_status="$(printf '%s' "$row" | cut -f2)"
  repo_policy="$(printf '%s' "$row" | cut -f3)"
  for nrow in "${NIX_ROWS[@]}"; do
    n_name="$(printf '%s' "$nrow" | cut -f1)"
    n_handle="$(printf '%s' "$nrow" | cut -f2)"
    n_status="$(printf '%s' "$nrow" | cut -f3)"
    n_policy="$(printf '%s' "$nrow" | cut -f4)"
    [ "$n_handle" = "$repo_handle" ] || continue

    status_conflict=0
    policy_conflict=0

    # Shopify status values are case-insensitive ("active"/"ACTIVE" are the
    # same status), so a case difference is agreement, not drift. Reporting it
    # as a conflict would train people to ignore this gate.
    [ "$(lower "$n_status")" = "$(lower "$repo_status")" ] || status_conflict=1

    # inventory_policy is compared the same way. STI-557: the shipped gate
    # compared status only, so the cheapest operator edit — status "draft" ->
    # "active" — turned the gate green while `inventory_policy = "deny"` stood
    # in the same block. On the live store that flip blocks checkout on every
    # variant, because all 7 sit at or below zero inventory.
    #
    # A field declared on one side and absent on the other is a conflict, not a
    # shrug: an absent declaration means "tofu will not PUT this field", which
    # is a different deploy behaviour from "tofu will PUT deny".
    if [ "$n_policy" = "NONE" ] || [ "$repo_policy" = "NONE" ]; then
      [ "$n_policy" = "$repo_policy" ] || policy_conflict=1
    else
      [ "$(lower "$n_policy")" = "$(lower "$repo_policy")" ] || policy_conflict=1
    fi

    if [ "$status_conflict" -eq 0 ] && [ "$policy_conflict" -eq 0 ]; then
      printf '    %-12s agree (status %s, inventory_policy %s)\n' "$repo_handle" "$repo_status" "$repo_policy"
      continue
    fi

    conflicts=$((conflicts + 1))
    echo ""
    echo "CONFLICT on $repo_handle ($n_name):"
    if [ "$status_conflict" -eq 1 ]; then
      echo "    status           catalog=$repo_status  terranix=$n_status"
    fi
    if [ "$policy_conflict" -eq 1 ]; then
      echo "    inventory_policy catalog=$repo_policy  terranix=$n_policy"
    fi
  done
done

if [ "$conflicts" -gt 0 ]; then
  fail "$conflicts product(s) are declared with conflicting status and/or inventory_policy in two repos. Applying the nixlab tofu would de-list them or block checkout. Decide the single owner first."
fi

echo ""
echo "OK: catalog/products and nixlab terranix agree on status AND inventory_policy for every shared handle."
