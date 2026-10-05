#!/usr/bin/env bash
# scripts/ci/returns-claim-gate.test.sh
# Offline self-test for returns-claim-gate.sh. STI-681.
#
# Run offline, no network, no Shopify credentials:
#   ./scripts/ci/returns-claim-gate.test.sh
#
# The point of this suite is the false-green case. A gate that only ever fails
# is indistinguishable from a gate that is broken, and the STI-226 lesson is
# that a green result which measured nothing is worse than a red one. So every
# negative control below asserts a SPECIFIC exit code, including the controls
# that must PASS when the SKUs agree.

set -uo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
GATE="$REPO_ROOT/scripts/ci/returns-claim-gate.sh"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

pass=0
fail=0

# Locale is pinned deliberately. The lead-time defect survived an audit partly
# because a non-UTF-8 runner locale made a regex match nothing; these tests
# must not depend on the ambient locale either.
export LC_ALL=C.UTF-8
export LANG=C.UTF-8

ok()   { pass=$((pass+1)); printf '  ok   %s\n' "$1"; }
bad()  { fail=$((fail+1)); printf '  FAIL %s\n     expected %s, got %s\n' "$1" "$2" "$3"; }

# expect_exit <want> <label> <gate-args...>
expect_exit() {
  local want="$1" label="$2"; shift 2
  local out; out="$("$GATE" "$@" 2>&1)"; local got=$?
  if [ "$got" -eq "$want" ]; then ok "$label (exit $got)"; else bad "$label" "$want" "$got"; fi
  LAST_OUT="$out"
}

expect_out() {
  local needle="$1" label="$2"
  if printf '%s' "$LAST_OUT" | grep -Fq "$needle"; then
    ok "$label"
  else
    bad "$label" "output containing '$needle'" "$(printf '%s' "$LAST_OUT" | head -3 | tr '\n' ' ')"
  fi
}

catalog() { # catalog <dir> — create an EMPTY catalog tree
  local dir="$1"; shift
  rm -rf "$dir"; mkdir -p "$dir"
}

# write_sku <dir> <handle> <li...>
write_sku() {
  local dir="$1" handle="$2"; shift 2
  { printf 'handle: %s\nbodyHtml: |\n  <ul>\n' "$handle"
    for li in "$@"; do printf '    <li>%s</li>\n' "$li"; done
    printf '  </ul>\n'
  } > "$dir/$handle.yaml"
}

# write_ts <file> <string...>
write_ts() {
  local f="$1"; shift
  { printf 'export const DETAILS = [\n'
    local first=1 s
    for s in "$@"; do
      [ $first -eq 1 ] || printf ',\n'
      printf '  "%s"' "$s"; first=0
    done
    printf ',\n]\n'
  } > "$f"
}

C="$WORK/catalog"; T="$WORK/products.ts"
mkdir -p "$C"

echo "returns-claim-gate self-test"

# ── 1. The exact live defect (STI-681) ──────────────────────────────────────
write_sku "$C" sku-001 "Made to order." "Ships in 2-3 weeks." "Tracked shipping." "Returns within 14 days, unworn."
write_sku "$C" sku-002 "Made to order." "Tracked shipping." "Final sale."
write_sku "$C" sku-003 "Made to order." "Tracked shipping." "Final sale."
write_ts "$T" "Shipping & Returns" "Returns within 14 days, unworn." "Shipping & Returns" "Final sale." "Shipping & Returns" "Final sale."
expect_exit 1 "live sku-001 vs sku-002 contradiction fails" "$C" "$T"
expect_out "CONTRADICTION" "live contradiction is named"
expect_out "sku-001" "live contradiction names the returnable SKU"
expect_out "sku-003" "live contradiction names the final-sale SKU"

# ── 2. Satisfiable: uniform final sale ─────────────────────────────────────
write_sku "$C" sku-001 "Made to order." "Final sale."
write_sku "$C" sku-002 "Made to order." "Tracked shipping." "Final sale."
write_sku "$C" sku-003 "Final sale."
write_ts "$T" "Shipping & Returns" "Final sale."
expect_exit 0 "uniform final sale passes" "$C" "$T"

# ── 3. Satisfiable: uniform returnable, differing windows ──────────────────
# The gate checks DIRECTION agreement, not window equality. A real fix may
# legitimately state different windows per SKU as long as none says final
# sale. Pinning window equality here would fail a correct fix.
write_sku "$C" sku-001 "Returns within 14 days, unworn."
write_sku "$C" sku-002 "Returns within 30 days, unworn."
write_sku "$C" sku-003 "Returns within 21 days."
write_ts "$T" "Returns within 14 days, unworn."
expect_exit 0 "uniform returnable with differing windows passes" "$C" "$T"

# ── 4. Direction must be read from the SKU, not from a global default ──────
write_sku "$C" sku-001 "Final sale."
write_sku "$C" sku-002 "Final sale."
write_sku "$C" sku-003 "Returns within 14 days, unworn."
expect_exit 1 "majority-final-sale plus one returnable still fails" "$C" "$T"
expect_out "CONTRADICTION" "minority direction is not excused by majority"

# ── 5. Drift: catalog says one thing, fallback the other ──────────────────
# products.ts renders when Shopify returns no description, so this is the
# same contradiction reached through a different code path.
write_sku "$C" sku-001 "Final sale."
write_sku "$C" sku-002 "Final sale."
write_sku "$C" sku-003 "Final sale."
write_ts "$T" "Returns within 14 days, unworn."
expect_exit 1 "catalog/fallback drift fails" "$C" "$T"
expect_out "drift" "drift is named"

# ── 6. The fallback contradicting ITSELF, with no catalog involvement ──────
rm -rf "$C"; mkdir -p "$C"
write_sku "$C" sku-001 "Cotton fleece."
write_ts "$T" "Final sale." "Returns within 14 days, unworn."
expect_exit 1 "self-contradicting fallback fails" "$C" "$T"
expect_out "two directions" "fallback's own split is named"

# ── 7. Headings are labels, not promises ───────────────────────────────────
# "Shipping & Returns" contains the word "Returns". Classifying it as a
# RETURNABLE claim is precisely the non-fact that makes a gate lie.
write_sku "$C" sku-001 "Cold wash, inside out." "Shipping & Returns"
write_sku "$C" sku-002 "Spot clean only." "Returns"
write_sku "$C" sku-003 "Keep dry." "Shipping & Returns"
write_ts "$T" "Shipping & Returns"
expect_exit 0 "panel headings alone do not become claims" "$C" "$T"
expect_out "no returns claim" "headings are ignored as claims"

# ── 8. No returns vocabulary anywhere is a pass, not a vacuous pass ─────────
write_sku "$C" sku-001 "Cotton fleece." "Brushed interior."
write_sku "$C" sku-002 "Woven black fabric." "90 cm."
write_sku "$C" sku-003 "Embroidered patch." "6 x 6 cm."
write_ts "$T" "Cotton fleece."
expect_exit 0 "catalog with no returns claim passes" "$C" "$T"

# ── 9. Ambiguous direction is refused, not guessed ─────────────────────────
# Guessing here is how the live contradiction was created.
write_sku "$C" sku-001 "Our return policy applies."
write_sku "$C" sku-002 "Our return policy applies."
write_sku "$C" sku-003 "Our return policy applies."
expect_exit 1 "ambiguous returns line is not guessed" "$C" "$T"
expect_out "AMBIGUOUS" "ambiguity is named"
expect_out "Refusing to guess" "refusal to guess is explained"

# ── 10. Reformatted claims classify identically ───────────────────────────
# The gate normalises case and punctuation, so restyling a line cannot be used
# to slip a contradiction past it. The direction itself is unchanged from
# test 1; only the FORM of the final-sale line differs, so it must still
# contradict the returnable SKU.
write_sku "$C" sku-001 "Returns within 14 days, unworn."
write_sku "$C" sku-002 "FINAL   SALE."
write_sku "$C" sku-003 "Made to order."
write_ts "$T" "Returns within 14 days, unworn." "FINAL   SALE."
expect_exit 1 "uppercase/extra-space final sale still contradicts" "$C" "$T"
expect_out "CONTRADICTION" "reformatted contradiction is still caught"

# ── 11. Exchange-only is returnable in substance ───────────────────────────
# "Exchanges only" still requires the customer to send the item back, so it
# contradicts "final sale".
write_sku "$C" sku-001 "Exchanges only, unworn."
write_sku "$C" sku-002 "Final sale."
write_sku "$C" sku-003 "Final sale."
expect_exit 1 "exchange-only contradicts final sale" "$C" "$T"

write_sku "$C" sku-001 "Exchanges only, unworn."
write_sku "$C" sku-002 "Exchanges only."
write_sku "$C" sku-003 "Exchange welcome."
# The fallback MUST be rewritten to agree. Leaving test 10's "Final sale."
# here would test catalog/fallback drift again instead of the invariant this
# case is for, and would pass/fail for the wrong reason.
write_ts "$T" "Exchanges only, unworn." "Exchange welcome."
expect_exit 0 "uniform exchange-only passes" "$C" "$T"

# ── 12. Missing catalog is a hard error, never a pass ──────────────────────
# The worst failure mode for this gate would be exiting 0 because it could
# not find anything to check.
expect_exit 2 "missing catalog dir exits 2, never 0" "$WORK/definitely-absent" "$T"

# ── 13. Missing fallback is reported, not silently passed ──────────────────
write_sku "$C" sku-001 "Final sale."
write_sku "$C" sku-002 "Final sale."
write_sku "$C" sku-003 "Final sale."
expect_exit 0 "missing fallback does not fail the catalog invariant" "$C" "$WORK/absent.ts"
expect_out "not found" "missing fallback is reported"

printf '\nreturns-claim-gate.test.sh: %d passed, %d failed\n' "$pass" "$fail"
[ "$fail" -eq 0 ] || exit 1
echo "-> 0"
exit 0
