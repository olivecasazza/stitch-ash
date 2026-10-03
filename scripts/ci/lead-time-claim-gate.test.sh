#!/usr/bin/env bash
# scripts/ci/lead-time-claim-gate.test.sh
# Regression tests for lead-time-claim-gate.sh.
#
# STI-638. The gate is pinned by the false green it was written to kill: the
# documented verification command for the hoodie lead time,
#
#     git grep -n -P "2.3 weeks" origin/main -- catalog/ src/ app/
#
# returns exit 1 ("not found") under the POSIX locale these runners use, on a
# string that is present, because the authored dash is U+2013 EN DASH. An audit
# copying that command concludes the defect is fixed. The gate therefore must
# FAIL on the current real catalog, and must keep failing for the current real
# reason (an unquoted number) rather than for an incidental one.
#
# The trap is also locale-dependent, so these tests pin the gate's own
# locale-independence: a verification command that only works in a UTF-8
# locale is the STI-226 failure shape reproduced inside the tool meant to catch
# it, which is exactly what happened with git grep.
#
# Fixtures live in scripts/ci/fixtures/lead-time-claim/ so every assertion runs
# on any machine from a fresh clone, with no dependency on this agent workspace
# or on the live site.

set -uo pipefail

GATE="scripts/ci/lead-time-claim-gate.sh"
FIXTURES="scripts/ci/fixtures/lead-time-claim"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

pass_count=0
fail_count=0

check() {
  local desc="$1" expected="$2" actual="$3"
  if [ "$expected" = "$actual" ]; then
    printf 'ok   %-64s %s\n' "$desc" "$actual"
    pass_count=$((pass_count + 1))
  else
    printf 'FAIL %-64s expected=%s actual=%s\n' "$desc" "$expected" "$actual"
    fail_count=$((fail_count + 1))
  fi
}

# Run the real gate against a scratch repo seeded from a fixture directory.
# $1 = fixture dir, $2 = env prefix (e.g. "LC_ALL=POSIX"), $3 = out file
run_gate() {
  local fixture="$1" envspec="${2:-}" out="$3"
  local dir="$WORK/$(basename "$fixture")-$$-RANDOM"
  mkdir -p "$dir"
  cp -R "$FIXTURES/$fixture/." "$dir/"
  mkdir -p "$dir/scripts/ci"
  cp "$GATE" "$dir/scripts/ci/lead-time-claim-gate.sh"

  local -a env_args=()
  [ -n "$envspec" ] && env_args=(env $envspec)

  ( cd "$dir" && "${env_args[@]}" bash scripts/ci/lead-time-claim-gate.sh ) >"$out" 2>&1
  echo $?
}

# ── 1. The pin: the real, current defect must be caught ───────────────────
# En dash, exactly as catalog/products/sku-001.yaml:16 has it.
out="$WORK/o1"
rc="$(run_gate "unsourced-en-dash" "" "$out")"
check "unsourced en-dash range fails the gate" "1" "$rc"
check "...and names the file and line" "1" \
  "$(grep -c 'catalog/products/sku-001.yaml:16' "$out")"

# ── 2. The exact string from the live site ────────────────────────────────
out="$WORK/o2"
rc="$(run_gate "unsourced-live-string" "" "$out")"
check "the live PDP sentence fails the gate" "1" "$rc"
check "...and the reported line is 16" "1" \
  "$(grep -c 'sku-001.yaml:16' "$out")"

# ── 3. Locale independence — the STI-226 shape, pinned ───────────────────
# The documented git grep is false-negative under POSIX. The gate must reach the
# SAME verdict under POSIX and under a UTF-8 locale, or it is only correct on
# the machine that wrote it.
out="$WORK/o3-posix"; rc_posix="$(run_gate "unsourced-en-dash" "LC_ALL=POSIX LANG= LC_CTYPE=POSIX" "$out")"
out="$WORK/o3-utf8";   rc_utf8="$(run_gate "unsourced-en-dash" "LC_ALL=C.UTF-8 LANG=C.UTF-8" "$out")"
check "en-dash range fails under POSIX locale" "1" "$rc_posix"
check "en-dash range fails under C.UTF-8 locale" "1" "$rc_utf8"

# And the negative control, same two locales.
out="$WORK/o3b-posix"; rc_posix="$(run_gate "no-lead-time" "LC_ALL=POSIX LANG= LC_CTYPE=POSIX" "$out")"
out="$WORK/o3b-utf8";   rc_utf8="$(run_gate "no-lead-time" "LC_ALL=C.UTF-8 LANG=C.UTF-8" "$out")"
check "clean catalog passes under POSIX locale" "0" "$rc_posix"
check "clean catalog passes under C.UTF-8 locale" "0" "$rc_utf8"

# ── 4. Separator class: a re-spaced or re-dashed rewrite cannot slip past ──
for fx in hyphen-separated spaced-range to-range em-dash-range; do
  out="$WORK/o4-$fx"
  rc="$(run_gate "$fx" "" "$out")"
  check "separator variant '$fx' is caught" "1" "$rc"
done

# ── 5. Single-number lead times are commitments too ──────────────────────
out="$WORK/o5"
rc="$(run_gate "single-number-months" "" "$out")"
check "'Allow 3 weeks' is caught" "1" "$rc"

# ── 6. Verbs that do not commit are not failures ──────────────────────────
# A made-to-order process sentence with no timeframe is the honest fallback
# and must stay shippable, or the gate pressures a team into inventing a number.
out="$WORK/o6"
rc="$(run_gate "made-to-order-no-number" "" "$out")"
check "'Made to order' with no timeframe passes" "0" "$rc"

# ── 7. The other two SKUs must stay clean ─────────────────────────────────
out="$WORK/o7"
rc="$(run_gate "other-skus-clean" "" "$out")"
check "lanyard + sticker copy with no number passes" "0" "$rc"

# ── 8. Docs: a verified claim is a violation, a disclaimer is not ─────────
out="$WORK/o8"
rc="$(run_gate "doc-asserts-verified" "" "$out")"
check "doc re-asserting the number as verified fails" "1" "$rc"

out="$WORK/o9"
rc="$(run_gate "doc-disclaims" "" "$out")"
check "doc that discloses it is unquoted passes" "0" "$rc"

# ── 10. The gate must not be satisfiable by deleting the evidence ─────────
# A gate whose failure output is the only record is a gate that gets silenced.
# The remediation instructions must name both legitimate exits and forbid
# loosening the patterns.
out="$WORK/o10"
rc="$(run_gate "unsourced-en-dash" "" "$out")"
check "failure output names the operator ask" "1" "$(grep -c 'STI-638' "$out")"
check "failure output forbids loosening the patterns" "1" \
  "$(grep -c 'not satisfy this gate by loosening\|Do not satisfy this gate by loosening' "$out")"

echo
echo "lead-time-claim-gate.test.sh: $pass_count passed, $fail_count failed"
[ "$fail_count" -eq 0 ] || exit 1
echo "All lead-time-claim-gate tests passed."
