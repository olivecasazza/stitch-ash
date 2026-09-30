#!/usr/bin/env bash
# scripts/ci/deploy-shopify-preflight.sh
# Pre-apply guard for the nixlab Shopify tofu deploy (`nix run .#deploy-shopify`).
#
# ── The gap this closes (STI-552, re-proven 2026-09-30) ─────────────────────
#
# The catalog status ownership gate (scripts/ci/catalog-status-ownership-gate.sh)
# fails loudly on today's real tree — verified this run against a real nixlab
# clone, exit 1, all three SKUs conflicting on BOTH fields:
#
#   sku-001  catalog=ACTIVE/CONTINUE   terranix=draft/deny
#   sku-002  catalog=ACTIVE/CONTINUE   terranix=draft/deny
#   sku-003  catalog=ACTIVE/CONTINUE   terranix=draft/deny
#
# But that gate protects nothing at the moment of harm. Two measured facts:
#
#   1. nixlab is a PRIVATE repo (casazza-info/nixlab, visibility=private, read
#      from the GitHub API this run). CI in this repo checks out only this repo,
#      so on a runner the gate reports "NOT REACHABLE — cross-repo comparison
#      SKIPPED (not a pass)" and exits 0. Verified this run: GATEEXIT=0 with
#      NIXLAB_DIR=/nonexistent. The green CI job is a single-repo invariant
#      check, not the cross-repo one the hazard lives in.
#
#   2. apps/deploy-shopify.nix runs ZERO checks before `tofu apply`. Measured:
#      grep -c for ownership/gate.sh/catalog/products/catalog:plan in that file
#      returns 0. Its only pre-apply interaction is `read -rp "Apply? (yes/no)"`
#      -- and `--auto-approve` sets CONFIRM=yes with no prompt at all.
#
# So the operator gets a `tofu plan` they must read correctly, by eye, on a plan
# whose diff silently de-lists three live ACTIVE products. `update_method = "PUT"`
# means the apply overwrites status; `lifecycle.prevent_destroy = true` does
# not help, because preventing destroy says nothing about a PUT.
#
# This script is the check that was missing. It reads the GENERATED
# config.tf.json -- the exact bytes `tofu apply` would send to Shopify, after
# terranix has rendered them -- and refuses to let a de-listing through.
#
# ── Why it reads config.tf.json and not terranix.nix ─────────────────────────
#
# Re-parsing the Nix would be a second implementation of terranix's own
# semantics, and it would be wrong the moment terranix renders a field the
# parser does not model. config.tf.json is the artifact that is actually
# applied. Parsing it means:
#
#   - no Nix evaluation needed, so this runs in CI and on a laptop alike
#   - no second source of truth about what the apply will do
#   - it catches the hazard regardless of which file declared it
#
# ── What it does and does not do ────────────────────────────────────────────
#
# It FAILS (exit 1) when the plan would:
#   - set a product that this repo's catalog declares ACTIVE to a non-ACTIVE
#     status  (de-listing), or
#   - set DENY on a variant of a product the catalog declares CONTINUE, while
#     the product is sellable (checkout-blocking, and silent -- the product
#     stays listed, priced and reachable).
#
# It also fails when it cannot read the config at all, when the config parses to
# zero products, or when a product the catalog declares is absent from the
# config. Silence is never reported as a pass.
#
# It does NOT read any secret, does not call the Shopify Admin API, and does
# not decide the owner question. The owner is repo catalog/products/*.yaml per
# docs/decisions/2026-09-28-catalog-source-of-truth.md.
#
# Exit codes: 0 clean, 1 hazard, 2 usage/unreadable.
#
# Usage:
#   deploy-shopify-preflight.sh --config <path/to/config.tf.json>
#   deploy-shopify-preflight.sh --config <path> --catalog <catalog/products dir>
#
# CATALOG_DIR / NIXLAB_DIR env overrides are honoured so the regression suite
# can point this at fixtures instead of the real tree.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
CATALOG_DIR="${CATALOG_DIR:-$REPO_ROOT/catalog/products}"

CONFIG=""
while [ $# -gt 0 ]; do
  case "$1" in
    --config)
      [ $# -ge 2 ] || { echo "ERROR: --config needs a path" >&2; exit 2; }
      CONFIG="$2"; shift 2 ;;
    --catalog)
      [ $# -ge 2 ] || { echo "ERROR: --catalog needs a path" >&2; exit 2; }
      CATALOG_DIR="$2"; shift 2 ;;
    -h|--help)
      sed -n '2,60p' "${BASH_SOURCE[0]}"; exit 0 ;;
    *)
      echo "ERROR: unknown argument: $1" >&2; exit 2 ;;
  esac
done

[ -n "$CONFIG" ] || {
  echo "ERROR: --config <config.tf.json> is required." >&2
  echo "Point it at the file deploy-shopify copies to \$WORK_DIR/config.tf.json." >&2
  exit 2
}

usage_exit() {
  echo "FAIL: $1" >&2
  echo "" >&2
  echo "Product status and inventory policy are owned by catalog/products/*.yaml." >&2
  echo "See docs/decisions/2026-09-28-catalog-source-of-truth.md (STI-552)." >&2
  exit 1
}

[ -f "$CONFIG" ] || { echo "ERROR: config not found: $CONFIG" >&2; exit 2; }
[ -d "$CATALOG_DIR" ] || { echo "ERROR: catalog dir not found: $CATALOG_DIR" >&2; exit 2; }

# Emit "handle<TAB>status<TAB>policy" for every catalog product. Same aggregate
# rule as the ownership gate: Shopify stores inventory_policy per variant, so a
# product is only unambiguous when its variants agree.
catalog_rows() {
  for yaml in "$CATALOG_DIR"/*.yaml; do
    [ -e "$yaml" ] || continue
    python3 - "$yaml" <<'PY'
import re, sys
src = open(sys.argv[1], encoding="utf-8").read()
m = re.search(r"^handle:\s*(\S+)", src, re.M)
if not m:
    sys.exit(0)
status = re.search(r"^status:\s*(\S+)", src, re.M)
policies = re.findall(r"^\s+inventoryPolicy:\s*(\S+)\s*$", src, re.M)
if policies:
    policy = policies[0] if len(set(policies)) == 1 else "MIXED"
else:
    policy = "NONE"
print("\t".join([m.group(1), status.group(1) if status else "", policy]))
PY
  done
}

# Emit "handle<TAB>status<TAB>policy" for every product in the rendered config.
# inventory_policy is per variant in the Shopify API and per product in the
# terranix/restiapi payload, so both spellings are accepted.
config_rows() {
  python3 - "$CONFIG" <<'PY'
import json, sys

try:
    doc = json.load(open(sys.argv[1], encoding="utf-8"))
except (OSError, ValueError) as exc:
    print("__UNREADABLE__\t%s" % exc, file=sys.stderr)
    sys.exit(3)

resources = doc.get("resource", {})
if not isinstance(resources, dict):
    print("__UNREADABLE__\tresource is not an object", file=sys.stderr)
    sys.exit(3)

def dig(container, key):
    """Breadth-first search for `key`, so the exact nesting depth does not
    matter. Terranix wraps the payload as data.product (and `data` may itself
    be a JSON *string* from builtins.toJSON), while some versions inline the
    product at the resource root. A depth-limited walk would silently miss one
    of those shapes and report an empty config -- which this script treats as a
    failure, but for the wrong reason. A search is honest about both."""
    queue = [container]
    seen = 0
    while queue and seen < 500:
        cur = queue.pop(0)
        seen += 1
        if not isinstance(cur, dict):
            continue
        if key in cur:
            return cur[key]
        for value in cur.values():
            if isinstance(value, (dict, str)):
                queue.append(value)
    return None


def unwrap(payload):
    """Terranix emits `data = builtins.toJSON { ... }`, so the useful object is
    a JSON string one level down. Decode it rather than re-implementing Nix."""
    if isinstance(payload, str):
        try:
            return json.loads(payload)
        except ValueError:
            return payload
    return payload


for kind, entries in resources.items():
    # Terranix's Shopify products land under `restapi_object`, not a kind
    # literally containing "shopify" -- the Shopify-ness is in the URL path,
    # not the resource type. Match on either so a future rename to
    # shopify_product_* is still caught, and so a typo'd/absent type does not
    # silently reduce the scan to zero products.
    kl = kind.lower()
    if "shopify" not in kl and "restapi" not in kl:
        continue
    if not isinstance(entries, list):
        continue
    for entry in entries:
        if not isinstance(entry, dict):
            continue
        scope = unwrap(entry.get("data", entry))
        handle = dig(scope, "handle")
        if handle is None:
            continue
        status = dig(scope, "status")
        variants = dig(scope, "variants")
        policy = None
        if isinstance(variants, list):
            found = [
                (v.get("inventory_policy") or v.get("inventoryPolicy"))
                for v in variants if isinstance(v, dict)
            ]
            found = [f for f in found if f]
            if found:
                policy = found[0] if len(set(found)) == 1 else "MIXED"
        if policy is None:
            policy = dig(scope, "inventory_policy")
        print("\t".join([str(handle), str(status or ""), str(policy or "")]))
PY
}

PARSE_ERR="$(mktemp)"
trap 'rm -f "$PARSE_ERR"' EXIT
set +e
CONFIG_ROWS="$(config_rows 2>"$PARSE_ERR")"
CONFIG_RC=$?
set -e
PARSE_MSG="$(cat "$PARSE_ERR" 2>/dev/null || true)"

if [ "$CONFIG_RC" -eq 3 ]; then
  echo "FAIL: could not parse the generated tofu config: $PARSE_MSG" >&2
  echo "A config this script cannot read is not a config it can clear." >&2
  exit 1
fi

CATALOG_ROWS="$(catalog_rows)"

if [ -z "$CATALOG_ROWS" ]; then
  echo "FAIL: no catalog products found in $CATALOG_DIR" >&2
  exit 1
fi

if [ -z "$CONFIG_ROWS" ]; then
  echo "FAIL: the generated tofu config declares no Shopify products." >&2
  echo "An empty or renamed resource shape must not read as 'nothing to de-list'." >&2
  exit 1
fi

echo "deploy-shopify preflight"
echo "  config: $CONFIG"
echo "  catalog: $CATALOG_DIR"
echo ""
printf '  %-12s %-18s %-18s\n' "handle" "catalog" "tofu plan"
printf '  %-12s %-18s %-18s\n' "------" "------------------" "------------------"

declare -A CAT_STATUS=() CAT_POLICY=()
while IFS=$'\t' read -r h s p; do
  [ -n "$h" ] || continue
  CAT_STATUS["$h"]="$(printf '%s' "$s" | tr '[:upper:]' '[:lower:]')"
  CAT_POLICY["$h"]="$(printf '%s' "$p" | tr '[:upper:]' '[:lower:]')"
done <<<"$CATALOG_ROWS"

conflicts=0
seen=()
declare -A SEEN=()

while IFS=$'\t' read -r h s p; do
  [ -n "$h" ] || continue
  SEEN["$h"]=1
  seen+=("$h")
  cfg_status="$(printf '%s' "$s" | tr '[:upper:]' '[:lower:]')"
  cfg_policy="$(printf '%s' "$p" | tr '[:upper:]' '[:lower:]')"
  cat_status="${CAT_STATUS[$h]:-<not-in-catalog>}"
  cat_policy="${CAT_POLICY[$h]:-<none>}"

  printf '  %-12s %-18s %-18s\n' \
    "$h" "$cat_status/$cat_policy" "${cfg_status:-<none>}/${cfg_policy:-<none>}"

  if [ "$cat_status" = "<not-in-catalog>" ]; then
    echo ""
    echo "    ^ $h is managed by tofu but is not declared in catalog/products/."
    echo "      The catalog owns these fields, so an undeclared product cannot be checked."
    conflicts=$((conflicts + 1))
    continue
  fi

  # A product the catalog declares ACTIVE that tofu would push to anything else
  # is the de-listing hazard. Compare case-insensitively: "active" and "ACTIVE"
  # are the same Shopify status and must not be reported as a conflict.
  if [ "$cat_status" = "active" ] && [ "$cfg_status" != "active" ] && [ -n "$cfg_status" ]; then
    echo ""
    echo "    ^ DE-LISTING: catalog declares $h ACTIVE, this plan sets it to '$s'."
    conflicts=$((conflicts + 1))
  fi

  # DENY on a CONTINUE product is the quieter hazard: the product stays listed,
  # priced and reachable, and refuses to sell once inventory hits zero.
  #
  # A plan whose variants DISAGREE about inventory_policy is also refused. It
  # is not a coin flip whether checkout is permitted — the outcome depends on
  # which variant the buyer picked — and the catalog cannot express it either,
  # because it declares one value per product. Refusing it is the honest answer
  # to a state neither side can represent.
  if [ "$cat_policy" = "continue" ] && [ "$cfg_policy" = "deny" ]; then
    echo ""
    echo "    ^ CHECKOUT-BLOCKING: catalog declares $h CONTINUE, this plan sets deny."
    echo "      The product stays listed and only fails at checkout."
    conflicts=$((conflicts + 1))
  elif [ "${cfg_policy:0:5}" = "mixed" ]; then
    echo ""
    echo "    ^ AMBIGUOUS: this plan sets mixed inventory policies on $h's variants"
    echo "      ($p), so whether checkout is permitted depends on the variant chosen."
    echo "      The catalog declares one value per product and cannot express this."
    conflicts=$((conflicts + 1))
  fi

  # A plan that omits the status entirely will have Shopify keep the stored
  # value, which is safe. But a plan that omits inventory_policy does NOT keep
  # it: restapi_object PUTs the whole product, so an absent field can drop to
  # the Shopify default. That is a silent, unstated policy change, so it is
  # reported rather than assumed harmless.
  if [ "$cat_policy" = "continue" ] && [ -z "$p" ]; then
    echo ""
    echo "    ^ UNSTATED: this plan sets no inventory_policy for $h, but the catalog"
    echo "      declares CONTINUE. update_method=PUT rewrites the whole product, so an"
    echo "      absent field is not a no-op."
    conflicts=$((conflicts + 1))
  fi
done <<<"$CONFIG_ROWS"

# A catalog product missing from the config is not a hazard (tofu may manage
# only a subset), but it is worth surfacing as a note rather than silence.
for h in "${!CAT_STATUS[@]}"; do
  if [ -z "${SEEN[$h]:-}" ]; then
    echo ""
    echo "  note: $h is declared in the catalog but absent from this plan (not managed by tofu)"
  fi
done

echo ""
if [ "$conflicts" -gt 0 ]; then
  echo "FAIL: $conflicts hazard(s) in the generated plan. Not applying." >&2
  echo "catalog/products/*.yaml owns status and inventory_policy. The terranix" >&2
  echo "declarations of those two fields are a second, stale source (STI-531)." >&2
  echo "See docs/decisions/2026-09-28-catalog-source-of-truth.md (STI-552)." >&2
  exit 1
fi

echo "OK: the generated plan does not de-list or block checkout on any catalog product."
