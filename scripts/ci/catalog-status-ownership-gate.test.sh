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
# comparison which cannot be performed never reports a pass.
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
# STI-569. This pointed at an absolute nixlab path on one agent host, outside
# this repo and outside any runner. On a GitHub runner that directory does not
# exist, so the gate reported SKIPPED, exited 0, and this assertion failed with a
# message that pointed at the machine rather than at the gate. The conflicting
# declaration is now a checked-in fixture, so this assertion is reproducible
# everywhere and a failure here means the gate genuinely stopped catching a
# conflicting terranix.
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

# ── 5. A missing nixlab tree still cannot read as a pass (STI-667) ──────────
#
# This assertion used to require exit 0 with `SKIPPED (not a pass)` in the
# output. STI-667 reversed the exit code while keeping the intent: the gate
# must never report a cross-repo pass it did not perform.
#
# What changed is WHERE the comparison comes from, not whether it happens. The
# committed fixture (STI-569) is now the default second declaration, so an
# absent NIXLAB_DIR means the gate compares the fixture and can genuinely
# disagree with the catalog — instead of skipping. So the absent-tree case is
# now a real FAIL on the conflict shape, not a skip.
#
# The un-skippable cases are covered separately in tests 8 and 9: with the
# fixture removed too, the gate exits 2 rather than 0.
out="$(NIXLAB_DIR="$WORK/does-not-exist" bash "$GATE" "$WORK/t3/catalog" 2>&1)" && code=0 || code=$?
if printf '%s' "$out" | grep -q 'origin: COMMITTED FIXTURE'; then
  ok "absent nixlab tree falls back to the committed fixture and says so"
else
  printf '  FAIL absent nixlab tree did not report the fixture origin\n'
  printf '%s\n' "$out" | sed 's/^/         /'
  fail=$((fail + 1))
fi
if [ "$code" -ne 0 ]; then
  ok "the fixture comparison actually ran (conflict shape fails the gate)"
else
  printf '  FAIL fixture fallback exited 0 — that is the STI-561 false green again\n'
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

# ── 8. With no second declaration at all, the gate exits 2, not 0 ──────────
#
# STI-667. This is the exact shape STI-561 reported: no real nixlab checkout,
# and here no committed fixture either, so there is nothing to compare against.
# The old gate printed `SKIPPED (not a pass)` and exited 0, and CI went green on
# a comparison that never happened.
#
# It is built in a scratch repo root rather than by deleting the real fixture, so
# this suite cannot destroy the file it depends on to run at all.
SCRATCH_REPO="$WORK/t8/repo"
mkdir -p "$SCRATCH_REPO/scripts/ci"
cp "$GATE" "$SCRATCH_REPO/scripts/ci/catalog-status-ownership-gate.sh"
make_catalog "$SCRATCH_REPO/catalog" ACTIVE CONTINUE
out="$(NIXLAB_DIR="$WORK/does-not-exist" bash "$SCRATCH_REPO/scripts/ci/catalog-status-ownership-gate.sh" \
         "$SCRATCH_REPO/catalog" 2>&1)" && code=0 || code=$?
if [ "$code" -eq 2 ]; then
  ok "no second declaration at all exits 2, distinct from a conflict"
else
  printf '  FAIL no second declaration: exit %s, expected 2 (0 is the STI-561 false green)\n' "$code"
  printf '%s\n' "$out" | sed 's/^/         /'
  fail=$((fail + 1))
fi
if printf '%s' "$out" | grep -q 'Refusing to pass'; then
  ok "the un-comparable case refuses to pass in words as well as exit code"
else
  printf '  FAIL un-comparable case did not say it refuses to pass\n'
  printf '%s\n' "$out" | sed 's/^/         /'
  fail=$((fail + 1))
fi

# ── 9. A real nixlab tree takes precedence over the fixture ───────────────
#
# The fixture is the fallback, not the default. If a real tree is supplied, the
# gate must compare THAT and must not quietly fall back to the frozen copy,
# because the whole value of a real checkout is that it is the current truth.
make_catalog "$WORK/t9/catalog" ACTIVE CONTINUE
make_terranix "$WORK/t9/nixlab/nix/tofu/shopify/terranix.nix" active continue
out="$(NIXLAB_DIR="$WORK/t9/nixlab" bash "$GATE" "$WORK/t9/catalog" 2>&1)" && code=0 || code=$?
if printf '%s' "$out" | grep -q 'origin: real nixlab checkout'; then
  ok "a real nixlab tree is compared in preference to the fixture"
else
  printf '  FAIL real nixlab tree was not preferred over the fixture\n'
  printf '%s\n' "$out" | sed 's/^/         /'
  fail=$((fail + 1))
fi
if [ "$code" -eq 0 ]; then
  ok "agreeing declarations still pass with a real tree (exit 0)"
else
  printf '  FAIL agreeing declarations exited %s with a real nixlab tree\n' "$code"
  printf '%s\n' "$out" | sed 's/^/         /'
  fail=$((fail + 1))
fi

# ── 10. The CI shape itself must not be a silent pass ──────────────────────
#
# This is the invocation CI runs: no NIXLAB_DIR, this repo's real catalog. It
# must reach a comparison and report which origin it used. Whatever it decides
# about draft-vs-ACTIVE, it must never report a cross-repo pass it did not
# perform, and it must never claim to have read nixlab.
out="$(env -u NIXLAB_DIR bash "$GATE" 2>&1)" && code=0 || code=$?
if printf '%s' "$out" | grep -qE 'origin: (COMMITTED FIXTURE|real nixlab checkout)'; then
  ok "the CI invocation names which declaration it compared against"
else
  printf '  FAIL CI invocation did not report a comparison origin\n'
  printf '%s\n' "$out" | sed 's/^/         /'
  fail=$((fail + 1))
fi
if printf '%s' "$out" | grep -q 'NOT REACHABLE'; then
  printf '  FAIL CI invocation still skips the comparison\n'
  fail=$((fail + 1))
else
  ok "the CI invocation performs the comparison instead of skipping it"
fi

echo ""
echo "$pass passed, $fail failed"
[ "$fail" -eq 0 ]
