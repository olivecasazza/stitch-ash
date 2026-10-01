#!/usr/bin/env bash
# scripts/ci/built-css-radius-gate.test.sh
# STI-415: proves built-css-radius-gate.sh actually fails. A guard nobody has
# seen go red is not a guard. Runs offline in ~1s; deploy-shopify-preflight.test.sh
# uses the same self-test pattern.

set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GATE="$HERE/built-css-radius-gate.sh"
RATCHET_REAL="$HERE/border-radius-ratchet.txt"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

PASS=0
FAIL=0

# An empty ratchet means "tolerate nothing" — used to prove a rule is enforced by
# the gate itself rather than masked by a pinned baseline.
: > "$TMP/empty-ratchet.txt"

check() { # check <name> <expected: pass|fail> <css-file> [extra args...]
  local name="$1" expect="$2" file="$3"; shift 3
  local out rc
  set +e
  out="$("$GATE" "$@" "$file" 2>&1)"; rc=$?
  set -e
  if { [ "$expect" = pass ] && [ "$rc" -eq 0 ]; } || { [ "$expect" = fail ] && [ "$rc" -ne 0 ]; }; then
    echo "  ok   $name (expected $expect, got exit $rc)"
    PASS=$((PASS + 1))
  else
    echo "  FAIL $name (expected $expect, got exit $rc)"
    echo "$out" | sed 's/^/         | /'
    FAIL=$((FAIL + 1))
  fi
}

# 1. clean bundle passes
cat > "$TMP/clean.css" <<'CSS'
:root { --ui-radius: 0; --radius-none: 0; }
.btn { border-radius: var(--radius-none); }
.rounded-none { border-radius: 0; }
.rounded-md { border-radius: calc(var(--ui-radius)*1.5); }
.rounded { border-radius: .25rem; }
CSS
check "clean bundle passes (zero + bridged + ratcheted .25rem)" pass "$TMP/clean.css"

# 2. a plain rounded-md literal is caught
cat > "$TMP/md.css" <<'CSS'
:root { --ui-radius: 0; }
.card { border-radius: .5rem; }
CSS
check "literal .5rem fails" fail "$TMP/md.css"

# 3. inherit is treated as a violation (uncontrolled radius), not a special case:
#    proven with an empty ratchet so the default ratchet cannot mask the rule.
cat > "$TMP/inherit.css" <<'CSS'
.thing { border-radius: inherit; }
CSS
check "inherit fails (uncontrolled radius)" fail "$TMP/inherit.css" --ratchet "$TMP/empty-ratchet.txt"

# 4. bridge without --ui-radius: 0 fails, because .rounded-md would render 6px
cat > "$TMP/nobridge.css" <<'CSS'
:root { --ui-radius: .25rem; }
.card { border-radius: calc(var(--ui-radius)*1.5); }
CSS
check "bridged value with non-zero --ui-radius fails" fail "$TMP/nobridge.css"

# 5. full-radius literal fails
cat > "$TMP/full.css" <<'CSS'
.rounded-full { border-radius: 3.40282e+39px; }
CSS
check "3.40282e+39px fails (ratchet only pins e+38)" fail "$TMP/full.css"

# 6. no border-radius at all is a refusal, not a pass
echo "body { color: red; }" > "$TMP/nothing.css"
check "artifact with no border-radius is refused" fail "$TMP/nothing.css"

# 7. empty ratchet -> the vendor literals become violations
check "vendor .25rem fails with an empty ratchet" fail "$TMP/clean.css" --ratchet "$TMP/empty-ratchet.txt"

# 8. --strict-ratchet fails on an unused entry
cat > "$TMP/unused-ratchet.txt" <<'TXT'
.25rem
.3125rem
.375rem
3.40282e+38px
inherit
999rem
TXT
check "--strict-ratchet fails on an unused ratchet entry" fail "$TMP/clean.css" \
  --strict-ratchet --ratchet "$TMP/unused-ratchet.txt"

# 9. non-strict only warns on an unused entry
set +e
WARN="$("$GATE" --ratchet "$TMP/unused-ratchet.txt" "$TMP/clean.css" 2>&1)"; WRC=$?
set -e
if [ "$WRC" -eq 0 ] && printf '%s' "$WARN" | grep -q '999rem'; then
  echo "  ok   non-strict warns on unused ratchet entry without failing"
  PASS=$((PASS + 1))
else
  echo "  FAIL non-strict should warn, not fail (exit $WRC)"
  printf '%s\n' "$WARN" | sed 's/^/         | /'
  FAIL=$((FAIL + 1))
fi

# ── Activation check: a ratcheted VALUE is only inert until a component uses the
#    matching utility. `.rounded` compiles to `.25rem`, which the ratchet pins,
#    so the artifact check alone cannot see a component that starts using it.
mkdir -p "$TMP/app/components"

cat > "$TMP/app/components/Good.vue" <<'VUE'
<template>
  <!-- "rounded UP to 25 user units" is prose in a comment and must NOT trip -->
  <div class="absolute top-0 right-0 p-2 rounded-none object-cover" />
</template>
VUE
check "rounded-none and prose in comments pass" pass "$TMP/clean.css" --app-dir "$TMP/app"

cat > "$TMP/app/components/Bad.vue" <<'VUE'
<template>
  <div class="rounded-md" />
  <span :class="hover_class" />
</template>
VUE
set +e
OUT="$("$GATE" --app-dir "$TMP/app" "$TMP/clean.css" 2>&1)"; RC=$?
set -e
if [ "$RC" -ne 0 ] && printf '%s' "$OUT" | grep -q 'Bad.vue:2: rounded-md'; then
  echo "  ok   rounded-md in a component fails and names the line"
  PASS=$((PASS + 1))
else
  echo "  FAIL expected a failure naming Bad.vue:2 (exit $RC)"
  printf '%s\n' "$OUT" | sed 's/^/         | /'
  FAIL=$((FAIL + 1))
fi

# variant-prefixed utilities are caught too
cat > "$TMP/app/components/Variant.vue" <<'VUE'
<template>
  <div class="hover:rounded-full lg:rounded-lg" />
</template>
VUE
set +e
OUT="$("$GATE" --app-dir "$TMP/app" "$TMP/clean.css" 2>&1)"; RC=$?
set -e
if [ "$RC" -ne 0 ] && printf '%s' "$OUT" | grep -q 'hover:rounded-full'; then
  echo "  ok   variant-prefixed rounded-* fails"
  PASS=$((PASS + 1))
else
  echo "  FAIL variant-prefixed rounded-* should fail (exit $RC)"
  FAIL=$((FAIL + 1))
fi

# when the gate is handed an artifact from outside the repo there is no app/,
# and that must not be an error
mkdir -p "$TMP/artifact-only" && cp "$GATE" "$RATCHET_REAL" "$TMP/artifact-only/" && cp "$TMP/clean.css" "$TMP/artifact-only/"
set +e
OUT="$(cd "$TMP/artifact-only" && ./built-css-radius-gate.sh clean.css 2>&1)"; RC=$?
set -e
if [ "$RC" -eq 0 ]; then
  echo "  ok   gate run outside the repo skips the activation check"
  PASS=$((PASS + 1))
else
  echo "  FAIL gate outside the repo should still pass a clean artifact (exit $RC)"
  printf '%s\n' "$OUT" | sed 's/^/         | /'
  FAIL=$((FAIL + 1))
fi

echo ""
echo "built-css-radius-gate self-test: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ] || exit 1
exit 0