#!/usr/bin/env bash
# scripts/ci/terranix-projection-pin.sh
#
# Records WHAT the preflight guard is actually pointed at, so "the guard covers
# the real terranix" stops being an assumption.
#
# ── The gap (STI-561) ────────────────────────────────────────────────────────
#
# STI-561 is right about the shape and wrong about both proposed fixes. Its
# option 1 — "add a second checkout of casazza-info/nixlab" — cannot work:
#
#   $ gh repo view casazza-info/nixlab --json isPrivate
#   {"isPrivate":true,...}
#
# The repo is private, so this workflow's GITHUB_TOKEN can never clone it, and
# any workflow that reaches for it will fail in a way that looks like a repo
# problem rather than a visibility one. So the cross-repo comparison in
# catalog-status-ownership-gate.sh is structurally blind in CI, and stays blind.
#
# That leaves deploy-shopify-preflight.sh, which reads the rendered
# config.tf.json and therefore needs no access to the private repo. Verified
# against the REAL declaration on 2026-10-01: rendered the live
# nix/tofu/shopify/terranix.nix (blob 844ce333) to the JSON shape terranix
# hands `tofu apply`, and the guard exited 1 with 6 hazards (3 de-listing,
# 3 checkout-blocking). The guard is real and it works.
#
# What is NOT real is the guarantee that it keeps being pointed at the right
# file. In CI the only terranix that exists is the frozen fixture at
# scripts/ci/fixtures/catalog-status-ownership/nixlab/. That fixture is a
# hand-frozen reduction, and it has already drifted materially from the file it
# stands in for. Measured against the live blob this run:
#
#   field            committed fixture                    live terranix (844ce333)
#   sku-001 variants S, M                                  S, M, L, XL, XXL
#   sku-002 title     "Woven Lanyard"                     "Embroidered Lanyard"
#   sku-002 price     22.00                               35.00
#   sku-002 sku       sku-002-OS                           sku-002
#   sku-003 title     "Logo Sticker"                      "Embroidered Sticker"
#   sku-003 price     6.00                                15.00
#   sku-003 type      Accessories                          Stickers
#
# The drift happened to land on fields the guard does not read, so the guard's
# verdicts are still correct today. That is luck, not a property. The failure
# mode this file exists to prevent is the next drift landing on a field the
# guard DOES read — a renamed handle, a product block the regex stops matching,
# a status that moves to a new default — at which point CI stays green while the
# guard has quietly stopped parsing the real declaration. Silence would be
# indistinguishable from a pass.
#
# ── What this is ────────────────────────────────────────────────────────────
#
# Not a cross-repo gate. It cannot be one; that is the premise above. It is a
# PIN: a committed digest of the exact projection of terranix that the guard
# reads — handle, status, inventory_policy aggregate, and the set of product
# resources found — plus the byte size of the source it was taken from.
#
# Anyone who can read the private repo (the operator, or a run holding a token
# with access) refreshes and compares it with one command:
#
#   gh api repos/casazza-info/nixlab/contents/nix/tofu/shopify/terranix.nix \
#     --jq .content | base64 -d > /tmp/terranix.nix
#   ./scripts/ci/terranix-projection-pin.sh --compare /tmp/terranix.nix
#
# Exit 0 = the real file still projects to exactly what the guard is tested
# against. Exit 1 = it has moved, and the assertions above no longer describe
# reality. Exit 2 = usage error (that is never a pass either).
#
# It reads no secret and calls no Shopify API. It compares declared text only.
#
# Deliberately NOT in pr-checks.yml: a CI job that cannot fetch the file it
# pins would be green by construction, which is the exact defect this repo has
# already shipped twice. The pin is honest because it is checked by the run
# that CAN read the file, and it says so.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PIN_FILE="$REPO_ROOT/scripts/ci/fixtures/catalog-status-ownership/terranix-projection.pin"

MODE="check"
TARGET=""
while [ $# -gt 0 ]; do
  case "$1" in
    --compare) MODE="check"; TARGET="${2:-}"; shift 2 ;;
    --update)  MODE="write"; TARGET="${2:-}"; shift 2 ;;
    --print)   MODE="print"; shift ;;
    -h|--help) sed -n '2,60p' "${BASH_SOURCE[0]}"; exit 0 ;;
    *) echo "ERROR: unknown argument: $1" >&2; exit 2 ;;
  esac
done

# ── The projection ──────────────────────────────────────────────────────────
# This must mirror the handle/status/inventory_policy extraction in
# catalog-status-ownership-gate.sh and the product parsing in
# deploy-shopify-preflight.sh. If one of them starts reading a field this does
# not, the pin stops describing the guard's real inputs and the drift goes
# unnoticed — which is why the test suite asserts the three stay in step.
project() {
  python3 - "$1" <<'PY'
import hashlib, re, sys

path = sys.argv[1]
with open(path, encoding="utf-8") as fh:
    src = fh.read()

m = re.search(r"resource\.restapi_object\s*=\s*\{(.*)\n\s*\};", src, re.S)
body = m.group(1) if m else src

rows = []
for block in re.finditer(r"\n\s{4}(product_\w+)\s*=\s*\{(.*?)\n    \};", body, re.S):
    name, text = block.group(1), block.group(2)
    handle = re.search(r'handle\s*=\s*"([^"]+)"', text)
    if not handle:
        continue
    status = re.search(r'status\s*=\s*"([^"]+)"', text)
    policies = re.findall(r'inventory_policy\s*=\s*"([^"]+)"', text)
    if not policies:
        policy = "NONE"
    elif len(set(policies)) == 1:
        policy = policies[0]
    else:
        policy = "MIXED:" + ",".join(sorted(set(policies)))
    rows.append((
        handle.group(1),
        (status.group(1) if status else "NONE").lower(),
        policy.lower(),
        name,
    ))

rows.sort()
if not rows:
    # A file that yields no rows is not an agreement, and must not be
    # pinnable as one.
    print("ERROR: no product resources parsed out of the terranix file", file=sys.stderr)
    sys.exit(1)

payload = "\n".join("\t".join(r[:3]) for r in rows)
for r in rows:
    print(f"{r[0]}\t{r[1]}\t{r[2]}\t{r[3]}")
print(f"products\t{len(rows)}")
print(f"projection-sha256\t{hashlib.sha256(payload.encode()).hexdigest()}")
print(f"source-bytes\t{len(src.encode())}")
PY
}

# ── Emit the current pin body ───────────────────────────────────────────────
# Only the projection itself is COMPARED. `source-bytes` is informational and
# deliberately excluded from equality: pinning the byte count would make the
# check fire on every cosmetic edit to a private file nobody in CI can read,
# and a signal that cries wolf on copy changes is a signal people learn to
# ignore. That is the failure mode this repo already shipped once — the
# ownership gate reported case-differing statuses as conflicts until STI-557,
# which taught everyone to skim past it. A tripwire has to be quiet unless the
# thing it guards has actually moved.
#
# The projection is the guard-relevant set: handle, status, inventory_policy
# aggregate, resource name, product count. If any of those move, the guard is
# being pointed at a different set of declarations than its assertions describe.
body_of() {
  local f="$1"
  if [ ! -f "$f" ]; then
    echo "ERROR: no terranix file at: $f" >&2
    return 2
  fi
  {
    echo "# terranix projection pin — regenerate, do not hand-edit."
    echo "#"
    echo "# The exact (handle, status, inventory_policy) projection of the nixlab"
    echo "# terranix that scripts/ci/deploy-shopify-preflight.sh is tested against."
    echo "# nixlab is private, so CI cannot fetch it and cannot check this pin"
    echo "# (STI-561). Verify it from a context that can read the repo:"
    echo "#"
    echo "#   gh api repos/casazza-info/nixlab/contents/nix/tofu/shopify/terranix.nix \\"
    echo "#     --jq .content | base64 -d > /tmp/terranix.nix"
    echo "#   ./scripts/ci/terranix-projection-pin.sh --compare /tmp/terranix.nix"
    echo "#"
    echo "# source-bytes is informational and NOT compared: cosmetic edits to the"
    echo "# private file would otherwise turn this into a tripwire that fires on"
    echo "# copy changes and gets ignored. Only the projection decides."
    echo "#"
    echo "# Verified against casazza-info/nixlab blob 844ce33352b12d75b523cdd2042f4a059b2301ea"
    echo "# on 2026-10-01. See docs/decisions/2026-09-28-catalog-source-of-truth.md."
    echo ""
    project "$f"
  }
}

# The lines that decide pass/fail: everything except the `#` header and the
# informational source-bytes row.
compareable() { sed -n '/^[^#]/p' | grep -v '^source-bytes'; }
info_bytes() { sed -n '/^[^#]/p' | grep '^source-bytes' || true; }

case "$MODE" in
  print)
    [ -f "$PIN_FILE" ] || { echo "ERROR: pin file missing: $PIN_FILE" >&2; exit 2; }
    body_of "$PIN_FILE" | sed -n '/^[^#]/p'
    ;;

  write)
    [ -n "$TARGET" ] || { echo "ERROR: --update needs a terranix path" >&2; exit 2; }
    body_of "$TARGET" > "$PIN_FILE.tmp"
    mv "$PIN_FILE.tmp" "$PIN_FILE"
    echo "updated $PIN_FILE"
    body_of "$TARGET" | sed -n '/^[^#]/p'
    ;;

  check)
    if [ -z "$TARGET" ]; then
      [ -f "$PIN_FILE" ] || { echo "ERROR: pin file missing: $PIN_FILE" >&2; exit 2; }
      TARGET="$PIN_FILE"
    fi
    actual="$(body_of "$TARGET" | compareable)"
    expected="$(sed -n '/^[^#]/p' "$PIN_FILE" | compareable)"
    if [ "$actual" = "$expected" ]; then
      echo "terranix projection pin: MATCH"
      printf '%s\n' "$expected" | sed 's/^/    /'
      local_bytes="$(body_of "$TARGET" | info_bytes)"
      [ -n "$local_bytes" ] && printf '    %s  (informational, not compared)\n' "$local_bytes"
      echo ""
      echo "The real terranix still projects to exactly what the preflight guard"
      echo "is tested against. (This compares DECLARED text; it does not read the"
      echo "Shopify Admin API and does not validate any secret.)"
      exit 0
    fi
    echo "terranix projection pin: MISMATCH"
    echo ""
    echo "  pinned:"
    printf '%s\n' "$expected" | sed 's/^/    /'
    echo "  actual:"
    printf '%s\n' "$actual" | sed 's/^/    /'
    echo ""
    echo "The real terranix has moved on a field the preflight guard reads."
    echo "CI cannot see this (nixlab is private), so it stayed green while the"
    echo "guard's inputs drifted. Re-read the file, confirm the hazard is still"
    echo "refused, then refresh the pin:"
    echo "  ./scripts/ci/terranix-projection-pin.sh --update <terranix.nix>"
    exit 1
    ;;
esac