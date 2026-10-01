#!/usr/bin/env bash
# scripts/ci/deploy-shopify-preflight.test.sh
# Regression tests for the deploy-shopify preflight guard (STI-552).
#
# Why this guard exists. The catalog status ownership gate fails loudly on
# today's real tree, but it protects nothing at the moment of harm. Measured
# 2026-09-30:
#
#   - nixlab is a PRIVATE repo, so CI checks out only this repo and the gate
#     reports "NOT REACHABLE — cross-repo comparison SKIPPED (not a pass)",
#     exiting 0. The green CI job is a single-repo check, not the cross-repo
#     one the hazard lives in.
#   - apps/deploy-shopify.nix runs zero checks before `tofu apply`; its only
#     pre-apply interaction is a y/n prompt that --auto-approve bypasses.
#
# So the preflight guard reads the GENERATED config.tf.json -- the exact bytes
# the apply would send -- and refuses the de-listing apply.
#
# ── The false green this suite must never reproduce ──────────────────────────
#
# The obvious operator fix for the status conflict is to edit terranix so the
# two files agree:
#
#     status = "draft"  ->  status = "active"
#
# The v1 gate compared only `status`, so that edit turned it green and exited 0
# while `inventory_policy = "deny"` stood untouched in the same blocks. The
# live store runs CONTINUE on all 7 variants with inventory at or below zero,
# so a DENY flip blocks checkout on 100% of purchasable stock: products stay
# listed, priced and reachable, and refuse to sell at the last step. A green
# gate on a state worse than the one it was written to catch.
#
# Test 5 below is exactly that fixture, and it must FAIL.

set -euo pipefail

REPO_ROOT="${REPO_ROOT_OVERRIDE:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
PREFLIGHT="${PREFLIGHT_UNDER_TEST:-$REPO_ROOT/scripts/ci/deploy-shopify-preflight.sh}"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

pass=0
fail=0

ok()   { printf '  ok   %s\n' "$1"; pass=$((pass + 1)); }
bad()  { printf '  FAIL %s\n' "$1"; fail=$((fail + 1)); }

# run <name> <expected-exit> <expected-substring> -- <config-json> [catalog-dir]
run() {
  local name="$1" want_exit="$2" want_txt="$3" cfg="$4" cat="${5:-}"
  local out rc
  if [ -n "$cat" ]; then
    out="$("$PREFLIGHT" --config "$cfg" --catalog "$cat" 2>&1)" && rc=0 || rc=$?
  else
    out="$("$PREFLIGHT" --config "$cfg" 2>&1)" && rc=0 || rc=$?
  fi
  if [ "$rc" -ne "$want_exit" ]; then
    bad "$name (exit $rc, wanted $want_exit)"
    printf '       %s\n' "$out" | head -12
    return
  fi
  if [ -n "$want_txt" ] && ! printf '%s' "$out" | grep -qF "$want_txt"; then
    bad "$name (output did not mention '$want_txt')"
    printf '       %s\n' "$out" | head -12
    return
  fi
  ok "$name"
}

# Emit a terranix-shaped config: data is a JSON STRING, as builtins.toJSON
# produces. Written with python so the escaping is unambiguous.
mkcfg() {
  local path="$1"; shift
  python3 - "$path" "$@" <<'PY'
import json, sys
path = sys.argv[1]
entries = []
for spec in sys.argv[2:]:
    handle, status, policy = spec.split(",")
    variants = [{"sku": handle, "inventory_policy": policy}] if policy else []
    product = {"handle": handle, "title": handle}
    if status:
        product["status"] = status
    if variants:
        product["variants"] = variants
    entries.append({
        "type": "restapi_object",
        "name": "product_" + handle.replace("-", "_"),
        "data": json.dumps({"product": product}),
    })
json.dump({"resource": {"restapi_object": entries}}, open(path, "w"), indent=2)
PY
}

# A catalog dir with the given handle:status:policy triples.
mkcat() {
  local dir="$1"; shift
  mkdir -p "$dir"
  for spec in "$@"; do
    IFS=: read -r h s p <<<"$spec"
    {
      echo "id: test.$h"
      echo "handle: $h"
      echo "title: $h"
      [ -n "$s" ] && echo "status: $s"
      echo "variants:"
      echo "  - sku: $h"
      echo "    price: \"1.00\""
      [ -n "$p" ] && echo "    inventoryPolicy: $p"
    } > "$dir/$h.yaml"
  done
}

echo "deploy-shopify preflight — regression tests"
echo ""

# ── 1. The live hazard: draft/deny over ACTIVE/CONTINUE ──────────────────────
mkcfg "$WORK/danger.json" "sku-001,draft,deny" "sku-002,draft,deny" "sku-003,draft,deny"
mkcat "$WORK/cat" "sku-001:ACTIVE:CONTINUE" "sku-002:ACTIVE:CONTINUE" "sku-003:ACTIVE:CONTINUE"
run "live terranix shape (draft/deny vs ACTIVE/CONTINUE) is refused" 1 "DE-LISTING" \
  "$WORK/danger.json" "$WORK/cat"
run "  ... and names the checkout hazard too" 1 "CHECKOUT-BLOCKING" \
  "$WORK/danger.json" "$WORK/cat"

# ── 2. The false green: status edited to agree, policy left at deny ─────────
# This is the edit the operator is most likely to make, and the one that made
# the v1 gate report a pass. It must still be refused.
mkcfg "$WORK/falsegreen.json" "sku-001,active,deny" "sku-002,active,deny" "sku-003,active,deny"
run "status-only fix to 'active' is still refused on inventory_policy" 1 \
  "CHECKOUT-BLOCKING" "$WORK/falsegreen.json" "$WORK/cat"

# ── 3. A clean plan passes ───────────────────────────────────────────────────
mkcfg "$WORK/clean.json" "sku-001,active,continue" "sku-002,active,continue" "sku-003,active,continue"
run "a plan that agrees with the catalog is allowed" 0 "does not de-list" \
  "$WORK/clean.json" "$WORK/cat"

# ── 4. Case differences are not conflicts ────────────────────────────────────
# Shopify statuses are lowercase in the API and uppercase in the catalog YAML.
# Reporting 'active' vs 'ACTIVE' as a conflict would make the guard useless.
mkcfg "$WORK/case.json" "sku-001,active,continue" "sku-002,active,continue" "sku-003,active,continue"
run "case-differing status/policy is a pass, not a false alarm" 0 "does not de-list" \
  "$WORK/case.json" "$WORK/cat"

# ── 5. Mixed inventory_policy across variants is not silently passed ─────────
mkcat "$WORK/mixedcat" "sku-001:ACTIVE:CONTINUE" "sku-002:ACTIVE:CONTINUE" "sku-003:ACTIVE:CONTINUE"
python3 - "$WORK/mixed.json" <<'PY'
import json, sys
entries = [{
    "type": "restapi_object",
    "name": "product_sku-001",
    "data": json.dumps({"product": {
        "handle": "sku-001", "status": "active",
        "variants": [{"sku": "a", "inventory_policy": "continue"},
                     {"sku": "b", "inventory_policy": "deny"}],
    }}),
}]
json.dump({"resource": {"restapi_object": entries}}, open(sys.argv[1], "w"))
PY
run "variants disagreeing on inventory_policy is reported, not averaged" 1 \
  "AMBIGUOUS" "$WORK/mixed.json" "$WORK/mixedcat"

# ── 5b. A plan that omits inventory_policy is a silent policy change ────────
# restapi_object uses update_method=PUT, which rewrites the whole product, so
# an absent field is not a no-op. A guard that assumed "absent = keep current"
# would pass a plan that quietly rewrites the policy field.
mkcfg "$WORK/nopolicy.json" "sku-001,active," "sku-002,active," "sku-003,active,"
run "a plan that omits inventory_policy is reported, not assumed harmless" 1 \
  "UNSTATED" "$WORK/nopolicy.json" "$WORK/cat"

# ── 6. Silence is never a pass ───────────────────────────────────────────────
echo '{"resource": {"restapi_object": []}}' > "$WORK/empty.json"
run "a config with zero products fails rather than passing" 1 \
  "no Shopify products" "$WORK/empty.json" "$WORK/cat"

echo '{"resource": {"restapi_object": ' > "$WORK/broken.json"
run "an unparseable config fails rather than passing" 1 \
  "could not parse" "$WORK/broken.json" "$WORK/cat"

mkcat "$WORK/emptycat" "sku-001:ACTIVE:CONTINUE" "sku-002:ACTIVE:CONTINUE" "sku-003:ACTIVE:CONTINUE"
echo '{"resource": {}}' > "$WORK/nores.json"
run "a config with no resource block fails" 1 "no Shopify products" \
  "$WORK/nores.json" "$WORK/emptycat"

# ── 7. A product tofu manages but the catalog does not declare ───────────────
# The catalog owns these fields, so an undeclared product cannot be checked.
# It must be surfaced, not skipped in silence.
mkcfg "$WORK/undeclared.json" "sku-001,active,continue" "sku-999,active,continue"
run "a tofu-managed product absent from the catalog is surfaced" 1 \
  "not declared in catalog/products" "$WORK/undeclared.json" "$WORK/cat"

# ── 8. A missing --config is a usage error, not a silent pass ────────────────
out="$("$PREFLIGHT" 2>&1)" && rc=0 || rc=$?
if [ "$rc" -eq 2 ] && printf '%s' "$out" | grep -qF -- "--config"; then
  ok "no --config is a usage error (exit 2), not a pass"
else
  bad "no --config should exit 2 and say so (got $rc)"
fi

# ── 9. A missing config file is a usage error ────────────────────────────────
out="$("$PREFLIGHT" --config "$WORK/does-not-exist.json" 2>&1)" && rc=0 || rc=$?
if [ "$rc" -eq 2 ]; then
  ok "a missing config file is a usage error (exit 2)"
else
  bad "a missing config file should exit 2 (got $rc)"
fi

# ── 10. The committed terranix fixture, rendered to a real config ───────────
# Tests 1-9 use small configs this suite builds itself. That proves the
# comparison logic, not the parser. So the last test renders the ACTUAL
# committed terranix fixture -- the frozen copy of the conflict measured on
# 2026-09-28 -- into the JSON shape terranix hands `tofu apply`, and requires
# the guard to refuse that.
#
# If the parser ever stops understanding the real file's shape, this test is
# what notices, instead of the guard going quiet in production.
FIXTURE_TERRANIX="$REPO_ROOT/scripts/ci/fixtures/catalog-status-ownership/nixlab/nix/tofu/shopify/terranix.nix"
RENDER="$REPO_ROOT/scripts/ci/render-terranix-fixture.py"
if [ -f "$FIXTURE_TERRANIX" ] && [ -f "$RENDER" ]; then
  if python3 "$RENDER" "$FIXTURE_TERRANIX" "$WORK/real.config.tf.json" >/dev/null 2>&1; then
    run "the real committed terranix fixture is refused" 1 "DE-LISTING" \
      "$WORK/real.config.tf.json" "$REPO_ROOT/catalog/products"
    # And the same file with the operator's status-only fix still fails.
    python3 - "$WORK/real.config.tf.json" "$WORK/real-statusfixed.tf.json" <<'PY'
import json, sys
doc = json.load(open(sys.argv[1]))
for entry in doc["resource"]["restapi_object"]:
    data = json.loads(entry["data"])
    data["product"]["status"] = "active"   # the edit the v1 gate rewarded
    entry["data"] = json.dumps(data)
json.dump(doc, open(sys.argv[2], "w"))
PY
    run "  ... and is still refused after the status-only 'fix'" 1 \
      "CHECKOUT-BLOCKING" "$WORK/real-statusfixed.tf.json" "$REPO_ROOT/catalog/products"
  else
    bad "could not render the committed terranix fixture (parser regression?)"
  fi
else
  bad "terranix fixture or renderer missing from the repo"
fi

# ── 11. A real nixlab clone, when one is reachable ──────────────────────────
# The committed fixture is a frozen reduction. When an actual clone is on disk
# the guard should be run against it too. This is reported as SKIPPED when
# absent — never as a pass.
NIXLAB_DIR="${NIXLAB_DIR:-}"
if [ -n "$NIXLAB_DIR" ] && [ -f "$NIXLAB_DIR/nix/tofu/shopify/terranix.nix" ] && [ -f "$RENDER" ]; then
  if python3 "$RENDER" "$NIXLAB_DIR/nix/tofu/shopify/terranix.nix" "$WORK/live.tf.json" >/dev/null 2>&1; then
    run "the live nixlab terranix is refused" 1 "DE-LISTING" \
      "$WORK/live.tf.json" "$REPO_ROOT/catalog/products"
  else
    bad "could not render the live nixlab terranix"
  fi
else
  echo "  --   (no live nixlab clone: real-config check SKIPPED, not passed)"
fi

# ── 12. The projection pin: drift must be a signal, not silence (STI-561) ────
# Everything above is hermetic. It proves the guard compares correctly, and it
# renders the committed FIXTURE — a hand-frozen reduction of a file in a private
# repo that CI cannot fetch. So the one thing no test here can prove is that the
# guard still describes the REAL declaration.
#
# The fixture has already drifted from the live file it stands in for (sku-002
# price 22.00 -> 35.00, sku-003 type Accessories -> Stickers, sku-001 gaining
# L/XL/XXL variants, and so on). That drift happened to miss every field the
# guard reads, so today's verdicts are still right. Nothing enforced that.
#
# terranix-projection-pin.sh is what makes it enforced going forward: it pins
# the exact (handle, status, inventory_policy) projection of the real file, so
# the next drift onto a guard-relevant field is a reported mismatch instead of a
# green job that quietly stopped parsing reality.
#
# These assertions pin the pin itself. A drift detector that cannot fail is
# worse than none, because it is trusted.
PIN="$REPO_ROOT/scripts/ci/terranix-projection-pin.sh"
PINNED_FIXTURE="$REPO_ROOT/scripts/ci/fixtures/catalog-status-ownership/nixlab/nix/tofu/shopify/terranix.nix"
PIN_FILE="$REPO_ROOT/scripts/ci/fixtures/catalog-status-ownership/terranix-projection.pin"

if [ -f "$PIN" ] && [ -f "$PIN_FILE" ] && [ -f "$PINNED_FIXTURE" ]; then
  # The pin must describe the same file the guard is tested against, or it is
  # pinning nothing at all.
  out="$("$PIN" --compare "$PINNED_FIXTURE" 2>&1)" && rc=0 || rc=$?
  if [ "$rc" -eq 0 ] && printf '%s' "$out" | grep -q "MATCH"; then
    ok "the projection pin matches the committed terranix fixture"
  else
    bad "pin should MATCH the committed fixture (got $rc)"
  fi

  # Cosmetic drift must NOT fire. A tripwire that cries wolf on copy edits gets
  # ignored, and an ignored tripwire is the defect it was built to catch. This
  # is the real drift already present between the fixture and the live file.
  cp "$PINNED_FIXTURE" "$WORK/cosmetic.nix"
  python3 - "$WORK/cosmetic.nix" <<'PY'
import re, sys
p = sys.argv[1]
src = open(p, encoding="utf-8").read()
src = src.replace('price = "22.00"', 'price = "35.00"')
src = src.replace('product_type = "Accessories"', 'product_type = "Stickers"')
open(p, "w", encoding="utf-8").write(src)
PY
  out="$("$PIN" --compare "$WORK/cosmetic.nix" 2>&1)" && rc=0 || rc=$?
  if [ "$rc" -eq 0 ]; then
    ok "cosmetic drift (price, product_type) does not fire the pin"
  else
    bad "cosmetic drift should not fire the pin (got $rc): $out"
  fi

  # A renamed handle IS guard-relevant: the guard joins config handles against
  # catalog handles, so a rename silently drops a product from the comparison.
  cp "$PINNED_FIXTURE" "$WORK/renamed.nix"
  sed -i.bak 's/handle = "sku-001"/handle = "sku-001-renamed"/' "$WORK/renamed.nix"
  rm -f "$WORK/renamed.nix.bak"
  out="$("$PIN" --compare "$WORK/renamed.nix" 2>&1)" && rc=0 || rc=$?
  if [ "$rc" -eq 1 ] && printf '%s' "$out" | grep -q "MISMATCH"; then
    ok "a renamed handle fires the pin (a product dropping out of the comparison)"
  else
    bad "renamed handle should MISMATCH (got $rc): $out"
  fi

  # So must a status that moves, and a policy that moves — the two fields whose
  # divergence is the whole hazard (STI-557).
  cp "$PINNED_FIXTURE" "$WORK/status.nix"
  sed -i.bak 's/status = "draft"/status = "active"/' "$WORK/status.nix"
  rm -f "$WORK/status.nix.bak"
  out="$("$PIN" --compare "$WORK/status.nix" 2>&1)" && rc=0 || rc=$?
  if [ "$rc" -eq 1 ]; then
    ok "a status change fires the pin"
  else
    bad "status change should MISMATCH (got $rc)"
  fi

  cp "$PINNED_FIXTURE" "$WORK/policy.nix"
  sed -i.bak 's/inventory_policy = "deny"/inventory_policy = "continue"/' "$WORK/policy.nix"
  rm -f "$WORK/policy.nix.bak"
  out="$("$PIN" --compare "$WORK/policy.nix" 2>&1)" && rc=0 || rc=$?
  if [ "$rc" -eq 1 ]; then
    ok "an inventory_policy change fires the pin"
  else
    bad "inventory_policy change should MISMATCH (got $rc)"
  fi

  # An empty/unparseable file must not pin as an agreement.
  echo '# nothing here' > "$WORK/empty.nix"
  out="$("$PIN" --compare "$WORK/empty.nix" 2>&1)" && rc=0 || rc=$?
  if [ "$rc" -ne 0 ]; then
    ok "a terranix file with no products is an error, not a match"
  else
    bad "an empty terranix must not MATCH (got $rc)"
  fi
else
  bad "terranix projection pin or its fixture is missing from the repo"
fi

echo ""
echo "$pass passed, $fail failed"
[ "$fail" -eq 0 ]
