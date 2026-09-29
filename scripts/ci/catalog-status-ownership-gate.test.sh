#!/usr/bin/env bash
# scripts/ci/catalog-status-ownership-gate.test.sh
# Regression tests for catalog-status-ownership-gate.sh.
#
# STI-557. The gate shipped 2026-09-29 (PR #106) and went green on a fixture
# that still carried a live customer-facing hazard, because it compared
# exactly one field -- `status` -- and ignored `inventory_policy`.
#
# The failure it missed. The obvious operator response to the gate is to edit
# the terranix status so the two files agree:
#
#     status = "draft"   ->   status = "active"
#
# The gate then reports "agree" on all three handles and exits 0. But the same
# product blocks still declare `inventory_policy = "deny"`, and the live store
# runs CONTINUE on all seven variants with inventory at or below zero. A
# `tofu apply` after that edit leaves the products listed under their own names
# and then blocks checkout on 100% of purchasable stock. The gate went green on
# a state worse than the one it was written to catch, because the operator had
# done the one thing the gate rewarded.
#
# A gate that only fails on disagreement is a gate that passes on the cheapest
# possible edit. These tests pin the two-field invariant, and pin that a
# not-reachable nixlab tree is reported as SKIPPED rather than as a pass.
#
# ── STI-569: the conflicting nixlab is a file in this repo ─────────────────
#
# Test 1 used to point NIXLAB_DIR at an agent-host path that exists nowhere but
# the machine that wrote it, so on a GitHub runner the gate reported
# `SKIPPED (not a pass)`, exited 0, and the assertion that a conflicting
# terranix must fail the gate failed for a reason that had nothing to do with
# the gate. The job was red on every PR and meant nothing, which is how a real
# regression in it would go unnoticed.
#
# The conflict shape now lives at
# scripts/ci/fixtures/catalog-status-ownership/nixlab/ — a frozen, reduced copy
# of the nixlab terranix carrying status = "draft" / inventory_policy = "deny".
# Pointed at this repo's real catalog/products, it reproduces the live hazard
# on any machine, including a fresh clone. The other 7 assertions are unchanged
# and still generated into $WORK; only the machine-dependence is gone.

set -euo pipefail

# REPO_ROOT is overridable so this suite can be pointed at a scratch copy of the
# gate (to prove a test fails before a fix and passes after) without also needing
# a scratch copy of the catalog.
REPO_ROOT="${REPO_ROOT_OVERRIDE:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
GATE="${GATE_UNDER_TEST:-$REPO_ROOT/scripts/ci/catalog-status-ownership-gate.sh}"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

pass=0
fail=0

# ok <name> — the last run was expected to pass.
ok() {
  printf '  ok   %s\n' "$1"
  pass=$((pass + 1))
}

# bad <name> <expected-substring> — the last run was expected to fail, and its
# output had to name <expected-substring> so a test cannot pass by failing for
# an unrelated reason.
bad() {
  local name="$1" want="$2" out="$3" code="$4"
  if [ "$code" -eq 0 ]; then
    printf '  FAIL %s — expected non-zero exit, got 0\n' "$name"
    printf '%s\n' "$out" | sed 's/^/         /'
    fail=$((fail + 1))
    return
  fi
  if ! printf '%s' "$out" | grep -qF -- "$want"; then
    printf '  FAIL %s — exited %s but never said %s\n' "$name" "$code" "$want"
    printf '%s\n' "$out" | sed 's/^/         /'
    fail=$((fail + 1))
    return
  fi
  printf '  ok   %s (exit %s, said %s)\n' "$name" "$code" "$want"
  pass=$((pass + 1))
}

# A catalog dir whose three products all declare the given status and policy.
make_catalog() {
  local dir="$1" status="$2" policy="$3"
  mkdir -p "$dir"
  local sku
  for sku in 001 002 003; do
    cat > "$dir/sku-$sku.yaml" <<YAML
id: stitch-ash.sku-$sku
handle: sku-$sku
title: Product $sku
status: $status
variants:
  - sku: sku-$sku
    price: "10.00"
    inventoryManagement: SHOPIFY
    inventoryPolicy: $policy
YAML
  done
}

# A terranix module declaring the given status and policy for the three handles.
make_terranix() {
  local path="$1" status="$2" policy="$3"
  mkdir -p "$(dirname "$path")"
  {
    echo '{ ... }:'
    echo 'let'
    echo '  in'
    echo '{'
    echo '  terraform = { required_providers = { restapi = { source = "Mastercard/restapi"; version = "~> 1.18.0"; } }; };'
    echo '  variable.SHOPIFY_ADMIN_TOKEN = { type = "string"; sensitive = true; };'
    echo '  resource.restapi_object = {'
    local idx=1 name
    for name in hoodie lanyard sticker; do
      echo ''
      echo "    product_$name = {"
      echo "      path = \"/products.json\";"
      echo "      update_method = \"PUT\";"
      echo "      id_attribute = \"product/id\";"
      echo "      lifecycle.prevent_destroy = true;"
      echo "      data = builtins.toJSON {"
      echo "        product = {"
      echo "          handle = \"sku-00$idx\";"
      echo "          status = \"$status\";"
      echo "          variants = ["
      echo "            {"
      echo "              sku = \"sku-00$idx\";"
      echo "              inventory_management = \"shopify\";"
      echo "              inventory_policy = \"$policy\";"
      echo "            }"
      echo "          ];"
      echo "        };"
      echo "      };"
      echo '    };'
      idx=$((idx + 1))
    done
    echo '  };'
    echo '}'
  } > "$path"
}

echo "catalog status ownership gate — regression tests"
echo ""

# ── 1. A conflicting nixlab declaration still fails, and the gate still
#      catches it ───────────────────────────────────────────────────────────
# STI-569. This pointed at /paperclip/wt/nixlab, an agent-host path. On a GitHub
# runner that directory does not exist, so the gate reported SKIPPED, exited 0,
# and this assertion failed with a message that pointed at the machine rather
# than at the gate. The conflicting declaration is now a checked-in fixture, so
# this assertion is reproducible everywhere and a failure here means the gate
# genuinely stopped catching a conflicting terranix.
#
# Pass the catalog dir explicitly: when the gate runs from a scratch copy its
# own REPO_ROOT default would not point at this repo's catalog.
#
# NIXLAB_DIR_UNDER_TEST still wins, so an operator with the real nixlab tree
# beside them can run the cross-repo shape instead. Its absence is a hard error
# rather than a silent skip, because a missing input is not a pass.
CONFLICTING_NIXLAB="${NIXLAB_DIR_UNDER_TEST:-$REPO_ROOT/scripts/ci/fixtures/catalog-status-ownership/nixlab}"
if [ ! -f "$CONFLICTING_NIXLAB/nix/tofu/shopify/terranix.nix" ]; then
  echo "  FAIL no terranix to compare against: $CONFLICTING_NIXLAB/nix/tofu/shopify/terranix.nix"
  echo "         The checked-in fixture is missing or NIXLAB_DIR_UNDER_TEST points nowhere."
  echo "         A missing input must not read as a pass."
  fail=$((fail + 1))
  out=""
  code=0
else
  out="$(NIXLAB_DIR="$CONFLICTING_NIXLAB" bash "$GATE" "$REPO_ROOT/catalog/products" 2>&1)" && code=0 || code=$?
  if [ "$code" -eq 0 ]; then
    printf '  FAIL conflicting nixlab should still conflict — gate exited 0\n'
    printf '%s\n' "$out" | sed 's/^/         /'
    fail=$((fail + 1))
  elif printf '%s' "$out" | grep -q 'CONFLICT on sku-001'; then
    printf '  ok   conflicting nixlab still fails, naming sku-001 (exit %s)\n' "$code"
    pass=$((pass + 1))
  else
    printf '  FAIL conflicting nixlab exited %s without naming sku-001\n' "$code"
    printf '%s\n' "$out" | sed 's/^/         /'
    fail=$((fail + 1))
  fi
fi

# ── 2. The STI-557 false green: status agrees, inventory_policy does not ───
# This is the regression. The status-only edit that the old gate rewarded.
make_catalog "$WORK/t2/catalog" ACTIVE CONTINUE
make_terranix "$WORK/t2/nixlab/nix/tofu/shopify/terranix.nix" active deny
out="$(NIXLAB_DIR="$WORK/t2/nixlab" bash "$GATE" "$WORK/t2/catalog" 2>&1)" && code=0 || code=$?
bad "status agrees but inventory_policy=deny still conflicts" "inventory_policy" "$out" "$code"

# ── 3. Genuine two-field agreement passes ─────────────────────────────────
make_catalog "$WORK/t3/catalog" ACTIVE CONTINUE
make_terranix "$WORK/t3/nixlab/nix/tofu/shopify/terranix.nix" active continue
out="$(NIXLAB_DIR="$WORK/t3/nixlab" bash "$GATE" "$WORK/t3/catalog" 2>&1)" && code=0 || code=$?
if [ "$code" -eq 0 ]; then
  ok "both fields agree (case-insensitive) is a real pass"
else
  printf '  FAIL both fields agree but gate exited %s\n' "$code"
  printf '%s\n' "$out" | sed 's/^/         /'
  fail=$((fail + 1))
fi

# ── 4. The original conflict shape still fails on status alone ─────────────
make_catalog "$WORK/t4/catalog" ACTIVE CONTINUE
make_terranix "$WORK/t4/nixlab/nix/tofu/shopify/terranix.nix" draft continue
out="$(NIXLAB_DIR="$WORK/t4/nixlab" bash "$GATE" "$WORK/t4/catalog" 2>&1)" && code=0 || code=$?
bad "status draft vs ACTIVE still conflicts" "CONFLICT" "$out" "$code"

# ── 5. A missing nixlab tree is SKIPPED, never reported as a pass ─────────
out="$(NIXLAB_DIR="$WORK/does-not-exist" bash "$GATE" "$WORK/t3/catalog" 2>&1)" && code=0 || code=$?
if [ "$code" -eq 0 ] && printf '%s' "$out" | grep -q 'SKIPPED (not a pass)'; then
  ok "absent nixlab tree reports SKIPPED (not a pass)"
else
  printf '  FAIL absent nixlab tree: exit %s, output did not say SKIPPED (not a pass)\n' "$code"
  printf '%s\n' "$out" | sed 's/^/         /'
  fail=$((fail + 1))
fi

# ── 6. A catalog product with no status field is a failure ────────────────
make_catalog "$WORK/t6/catalog" ACTIVE CONTINUE
sed -i '/^status:/d' "$WORK/t6/catalog/sku-002.yaml"
make_terranix "$WORK/t6/nixlab/nix/tofu/shopify/terranix.nix" active continue
out="$(NIXLAB_DIR="$WORK/t6/nixlab" bash "$GATE" "$WORK/t6/catalog" 2>&1)" && code=0 || code=$?
bad "a product with no status: field fails" "sku-002" "$out" "$code"

# ── 7. An unparseable terranix must not read as a cross-repo pass ─────────
make_catalog "$WORK/t7/catalog" ACTIVE CONTINUE
mkdir -p "$WORK/t7/nixlab/nix/tofu/shopify"
echo 'this is not a terranix module' > "$WORK/t7/nixlab/nix/tofu/shopify/terranix.nix"
out="$(NIXLAB_DIR="$WORK/t7/nixlab" bash "$GATE" "$WORK/t7/catalog" 2>&1)" && code=0 || code=$?
if printf '%s' "$out" | grep -q 'nothing to compare'; then
  ok "unparseable terranix is named, not silently passed"
  if [ "$code" -ne 0 ]; then
    ok "unparseable terranix also fails the gate"
  else
    printf '  FAIL unparseable terranix exited 0\n'
    fail=$((fail + 1))
  fi
else
  printf '  FAIL unparseable terranix did not report "nothing to compare"\n'
  printf '%s\n' "$out" | sed 's/^/         /'
  fail=$((fail + 1))
fi

echo ""
echo "$pass passed, $fail failed"
[ "$fail" -eq 0 ]
