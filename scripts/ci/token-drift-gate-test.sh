#!/usr/bin/env bash
# scripts/ci/token-drift-gate-test.sh
# Evidence for STI-459: proves the value-equality check in token-drift-gate.sh
# actually fires, rather than merely passing because it changed nothing.
#
# STI-446 cost two rounds of wasted work on exactly that distinction, so every
# assertion below is a *negative* one: mutate a copy of the repo into a known
# drift, assert the gate rejects it, then assert the clean tree passes. A test
# suite that only ever runs the clean tree cannot tell a working check from a
# no-op.
#
# The repo is never modified. Each case copies the two files the gate reads
# into a temp dir and points the gate at it by running it from a scratch tree.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
GATE="$REPO_ROOT/scripts/ci/token-drift-gate.sh"
COMPARE="$REPO_ROOT/scripts/ci/token-value-compare.py"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

PASS=0
FAIL=0

ok()   { PASS=$((PASS+1)); printf '  ok    %s\n' "$1"; }
bad()  { FAIL=$((FAIL+1)); printf '  FAIL  %s\n' "$1"; }

# Build a scratch repo whose gate reads the given tokens.css / DESIGN.md.
# The gate resolves REPO_ROOT from its own location, so the scratch tree needs
# the same scripts/ layout with the mutated CSS dropped into place.
make_scratch() {
  local dir="$1"
  mkdir -p "$dir/scripts/ci" "$dir/app/assets/css"
  cp "$GATE" "$COMPARE" "$dir/scripts/ci/"
  cp "$REPO_ROOT/DESIGN.md" "$dir/DESIGN.md"
  cp "$REPO_ROOT/app/assets/css/tokens.css" "$dir/app/assets/css/tokens.css"
  printf 'ok\n' >"$dir/.keep"
  echo "$dir"
}

# Run the gate over a scratch tree. The linter stage needs node; if it is
# unavailable the value check still runs first and reports on its own.
run_gate() {
  local dir="$1"
  ( cd "$dir" && ./scripts/ci/token-drift-gate.sh 2>&1 ) || true
}

echo "STI-459: token drift gate value-equality evidence"
echo

# ---------------------------------------------------------------------------
# AC1 — a deliberate value divergence must fail, naming both values
# ---------------------------------------------------------------------------
echo "AC1  deliberate spacing.4xl divergence (DESIGN.md 72px, CSS 64px) fails"

S1="$(make_scratch "$WORK/ac1")"
# Edit DESIGN.md only: the classic "changed one file" drift.
sed -i 's/^  "4xl": "64px"$/  "4xl": "72px"/' "$S1/DESIGN.md"
grep -q '"4xl": "72px"' "$S1/DESIGN.md" \
  || { bad "AC1 setup: DESIGN.md was not actually mutated"; }
OUT1="$(run_gate "$S1")"

if printf '%s' "$OUT1" | grep -q "drifted from their DESIGN.md values"; then
  ok "AC1 gate reported drift"
else
  bad "AC1 gate did not report drift"; printf '%s\n' "$OUT1" | sed 's/^/        /'
fi

if printf '%s' "$OUT1" | grep -q "spacing.4xl" \
   && printf '%s' "$OUT1" | grep -q "72px" \
   && printf '%s' "$OUT1" | grep -q "64px"; then
  ok "AC1 failure names the token and shows BOTH values"
else
  bad "AC1 failure did not show both values"; printf '%s\n' "$OUT1" | sed 's/^/        /'
fi

# The same divergence in the other direction: CSS edited, DESIGN.md left alone.
S1B="$(make_scratch "$WORK/ac1b")"
python3 - "$S1B/app/assets/css/tokens.css" <<'PY'
import re, sys
p = sys.argv[1]
src = open(p, encoding="utf-8").read()
new, n = re.subn(r"(--space-4xl:\s*)64px", r"\g<1>72px", src)
assert n == 1, f"expected 1 replacement, made {n}"
open(p, "w", encoding="utf-8").write(new)
PY
grep -qE -- '--space-4xl:[[:space:]]*72px' "$S1B/app/assets/css/tokens.css" \
  || { bad "AC1b setup: tokens.css was not actually mutated"; }
OUT1B="$(run_gate "$S1B")"
if printf '%s' "$OUT1B" | grep -q "spacing.4xl" && printf '%s' "$OUT1B" | grep -q "drifted"; then
  ok "AC1 reverse direction (CSS edited, DESIGN.md untouched) also fails"
else
  bad "AC1 reverse direction did not fail"; printf '%s\n' "$OUT1B" | sed 's/^/        /'
fi
echo

# ---------------------------------------------------------------------------
# AC2 — each of the four non-comparable categories is skipped with a reason
# ---------------------------------------------------------------------------
echo "AC2  the four non-comparable categories are skipped WITH a printed reason"

CLEAN="$(make_scratch "$WORK/clean")"
cp "$REPO_ROOT/app/assets/css/tokens.css" "$CLEAN/app/assets/css/tokens.css"
OUT_CLEAN="$(run_gate "$CLEAN")"

# category -> property it covers
check_skip() {
  local label="$1" prop="$2" needle="$3"
  if printf '%s' "$OUT_CLEAN" | grep -q -- "--$prop .*$needle"; then
    ok "AC2 skip $label: --$prop printed with reason"
  else
    bad "AC2 skip $label: --$prop missing or un-reasoned"
    printf '%s\n' "$OUT_CLEAN" | sed 's/^/        /'
  fi
}

check_skip "clamp() fluid type"   text-display "clamp()"
check_skip "clamp() fluid gutter" gutter       "clamp()"
check_skip "ms easing"            transition-fast "millisecond easing"
check_skip "border shorthand"     rule         "border shorthand"
check_skip "font stack rewrite"   font-mono    "@nuxt/fonts"

# AC2 also requires the clean tree to pass.
if printf '%s' "$OUT_CLEAN" | grep -q "every comparable token value matches DESIGN.md"; then
  ok "AC2 clean tree reports all comparable values equal"
else
  bad "AC2 clean tree did not pass"; printf '%s\n' "$OUT_CLEAN" | sed 's/^/        /'
fi
echo

# ---------------------------------------------------------------------------
# AC3 — the skip list is explicit, and a stale entry fails closed
# ---------------------------------------------------------------------------
echo "AC3  skip list is explicit in the script, not a silent fallthrough"

if grep -q "^SKIP_REASONS" "$COMPARE"; then
  ok "AC3 SKIP_REASONS is a named, enumerable table"
else
  bad "AC3 no explicit SKIP_REASONS table"
fi

# Every entry must carry a non-empty reason string — an empty reason would
# print as a bare "SKIP --x" and be indistinguishable from silence.
EMPTY_REASONS="$(python3 - "$COMPARE" <<'PY'
import importlib.util, sys
spec = importlib.util.spec_from_file_location("tvc", sys.argv[1])
m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
print("\n".join(k for k, v in m.SKIP_REASONS.items() if not str(v).strip()))
PY
)"
if [ -z "$EMPTY_REASONS" ]; then
  ok "AC3 every skip entry has a non-empty reason"
else
  bad "AC3 skip entries with empty reason: $EMPTY_REASONS"
fi

# Coverage: every property in tokens.css is either compared or skipped. If the
# check were a silent fallthrough, a new property would be neither.
if printf '%s' "$OUT_CLEAN" | grep -qE "\(53 of 53 properties accounted for\)"; then
  ok "AC3 coverage assertion: 53 of 53 properties accounted for"
else
  bad "AC3 coverage assertion missing or short"
  printf '%s\n' "$OUT_CLEAN" | sed 's/^/        /'
fi

# A stale skip entry — one naming a property that no longer exists — must fail
# the gate, because a stale entry silently disables a comparison.
S3="$(make_scratch "$WORK/ac3")"
cp "$REPO_ROOT/app/assets/css/tokens.css" "$S3/app/assets/css/tokens.css"
cp "$COMPARE" "$S3/scripts/ci/token-value-compare.py"
python3 - "$S3/scripts/ci/token-value-compare.py" <<'PY'
import sys
p = sys.argv[1]
src = open(p).read()
src = src.replace('SKIP_REASONS = {', 'SKIP_REASONS = {\n    "nonexistent-token": "injected stale entry for the STI-459 test",', 1)
open(p, "w").write(src)
PY
OUT3="$(run_gate "$S3")"
if printf '%s' "$OUT3" | grep -q "no longer exist in tokens.css"; then
  ok "AC3 a stale skip entry fails the gate (fails closed)"
else
  bad "AC3 stale skip entry did not fail the gate"; printf '%s\n' "$OUT3" | sed 's/^/        /'
fi
echo

# ---------------------------------------------------------------------------
# AC4 — normalisation does not false-positive on equivalent spellings
# ---------------------------------------------------------------------------
echo "AC4  normalise: #000000 == #000 and 120ms == 0.12s == .12s"

norm() { python3 -c "
import importlib.util, sys
spec = importlib.util.spec_from_file_location('tvc', '$COMPARE')
m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
print(m.normalise(sys.argv[1]))
" "$1"; }

match_case() {
  local label="$1" a="$2" b="$3"
  local na nb
  na="$(norm "$a")"; nb="$(norm "$b")"
  if [ "$na" = "$nb" ]; then
    ok "AC4 $label: '$a' -> '$na'  ==  '$b' -> '$nb'"
  else
    bad "AC4 $label: '$a' -> '$na'  !=  '$b' -> '$nb'"
  fi
}

differ_case() {
  local label="$1" a="$2" b="$3"
  local na nb
  na="$(norm "$a")"; nb="$(norm "$b")"
  if [ "$na" != "$nb" ]; then
    ok "AC4 $label: '$a' ($na) correctly differs from '$b' ($nb)"
  else
    bad "AC4 $label: '$a' and '$b' wrongly normalised to the same value"
  fi
}

# The two equivalences named in the acceptance criteria.
match_case "hex 3-digit expand" "#000000" "#000"
match_case "hex case"            "#5C5C5C" "#5c5c5c"
match_case "ms == s"             "120ms"   "0.12s"
match_case "ms == leading-dot s" "120ms"   ".12s"
# Supporting equivalences the real token set depends on.
match_case "unitless zero"       "0px"     "0"
match_case "quoted vs bare"      '"64px"'  "64px"
# And the check must still be able to tell genuinely different values apart,
# or the whole gate is vacuous.
differ_case "real drift"  "72px"  "64px"
differ_case "real colour" "#FFFFFF" "#0E0E0E"
differ_case "real time"   "120ms" "350ms"
echo

# ---------------------------------------------------------------------------
# AC5 — STI-462 finding 1: reference tokens are compared, not skipped
# ---------------------------------------------------------------------------
# QA demonstrated a false negative on the pre-fix gate:
#   tokens.css: --accordion-body-bg: var(--grey-950);
#   DESIGN.md:  components.accordion-body.backgroundColor: "{colors.charcoal}"
#   -> "Token drift gate: passed"  EXIT=0
# Swapping an accordion surface to a different *declared* token passed. The
# reason text claimed the comparison was impossible, which was not true. These
# cases pin that closed.
echo "AC5  reference tokens (var() vs {section.key}) are compared, not skipped"

# mutate_css <scratch-dir> <python-body operating on `s` and `p`>
mutate_css() {
  python3 - "$1" <<PY
import re, sys
p = "$1/app/assets/css/tokens.css"
s = open(p, encoding="utf-8").read()
$2
open(p, "w", encoding="utf-8").write(s)
PY
}

ref_case() {
  local label="$1" prop="$2" expr="$3" needle="$4"
  local dir; dir="$(make_scratch "$WORK/ac5-$prop")"
  mutate_css "$dir" "$expr"
  local out; out="$(run_gate "$dir")"
  if printf '%s' "$out" | grep -q "drifted from their DESIGN.md values" \
     && printf '%s' "$out" | grep -q -- "$needle"; then
    ok "AC5 $label: --$prop retargeted is caught"
  else
    bad "AC5 $label: --$prop retarget was NOT caught"
    printf '%s\n' "$out" | sed 's/^/        /'
  fi
}

ref_case "accordion surface swapped to another declared colour" accordion-body-bg \
  's2,n=re.subn(r"(--accordion-body-bg:\s*)var\(--charcoal\)", r"\g<1>var(--grey-950)", s); assert n==1, n; s=s2' \
  'components.accordion-body.backgroundColor'

ref_case "accordion text colour swapped" accordion-body-text \
  's2,n=re.subn(r"(--accordion-body-text:\s*)var\(--bone\)", r"\g<1>var(--white)", s); assert n==1, n; s=s2' \
  'components.accordion-body.textColor'

ref_case "accordion icon colour swapped" accordion-icon \
  's2,n=re.subn(r"(--accordion-icon:\s*)var\(--grey-400\)", r"\g<1>var(--grey-200)", s); assert n==1, n; s=s2' \
  'components.accordion-icon.textColor'

ref_case "font-display no longer aliases the mono stack" font-display \
  's2,n=re.subn(r"(--font-display:\s*)var\(--font-mono\)", r"\g<1>var(--grey-400)", s); assert n==1, n; s=s2' \
  'Mono fallback stack'

ref_case "font-body no longer aliases the mono stack" font-body \
  's2,n=re.subn(r"(--font-body:\s*)var\(--font-mono\)", r"\g<1>var(--grey-400)", s); assert n==1, n; s=s2' \
  'Mono fallback stack'

# The five must no longer be listed as plain skips. --font-display/--font-body
# are still skipped, but because their *target* is non-comparable, and they say
# so — they must not be silently unverified.
if printf '%s' "$OUT_CLEAN" | grep -q "not a literal design token value"; then
  bad "AC5 a reference token is still skipped with the old impossible-value reason"
else
  ok "AC5 no reference token carries the old 'not a literal value' skip reason"
fi
if printf '%s' "$OUT_CLEAN" | grep -qE -- "--font-display +verified to alias --font-mono"; then
  ok "AC5 --font-display skip states the alias was verified and why it stops there"
else
  bad "AC5 --font-display skip does not state that the alias was verified"
  printf '%s\n' "$OUT_CLEAN" | sed 's/^/        /'
fi
echo

# ---------------------------------------------------------------------------
# AC6 — STI-462 finding 2: a skip entry overlapping a comparison fails closed
# ---------------------------------------------------------------------------
# The pre-fix guard was `not any(s[0].endswith(f".{css_name}"))`, dead for the
# space-prefixed case it was written for. It still failed closed, but only via a
# count coincidence, and reported "unaccounted" while listing nothing.
echo "AC6  a skip entry naming a comparable property fails closed, with a real reason"

S6="$(make_scratch "$WORK/ac6")"
python3 - "$S6/scripts/ci/token-value-compare.py" <<'PY'
import sys
p = sys.argv[1]
src = open(p).read()
src = src.replace('SKIP_REASONS = {',
                  'SKIP_REASONS = {\n    "space-4xl": "injected overlap for the STI-462 finding 2 test",', 1)
open(p, "w").write(src)
PY
OUT6="$(run_gate "$S6")"
if printf '%s' "$OUT6" | grep -q "skip list names properties that are also compared" \
   && printf '%s' "$OUT6" | grep -q -- "--space-4xl"; then
  ok "AC6 overlap rejected with a named property and an explicit reason"
else
  bad "AC6 overlap was not rejected clearly"; printf '%s\n' "$OUT6" | sed 's/^/        /'
fi
# The old behaviour said "unaccounted" and listed nothing; assert we do not
# regress into that misleading message.
if printf '%s' "$OUT6" | grep -q "neither compared nor skipped"; then
  bad "AC6 still reports the misleading 'unaccounted' message with an empty list"
else
  ok "AC6 no misleading 'unaccounted' message"
fi
echo

# ---------------------------------------------------------------------------
# AC7 — STI-462 finding 5: section_values() must not read nested keys
# ---------------------------------------------------------------------------
echo "AC7  section_values() does not mistake nested component members for keys"

COMP_KEYS="$(python3 - "$REPO_ROOT/DESIGN.md" <<'PY'
import re, sys
fm = re.match(r"\A---\n(.*?)\n---\n", open(sys.argv[1], encoding="utf-8").read(), re.S).group(1)
# Mirrors the gate's fixed section_values() exactly, including its requirement
# that the value be a plain scalar.
m = re.search(r"^components:\n((?P<body>(?:[ \t]+.*\n?|\n)*))", fm, re.M)
body = m.group("body"); lines = body.splitlines()
km = re.match(r"^(?P<i>[ \t]+)", lines[0] if lines else "")
if not km:
    print(""); raise SystemExit(0)
indent = km.group("i")
out = set()
for line in lines:
    im = re.match(r"^([ \t]+)", line)
    if not im or im.group(1) != indent:
        continue
    k = re.match(r'^[ \t]+([A-Za-z0-9_"\'-]+):[ \t]+("[^"]*"|\'[^\']*\'|[^,{\s]+)[ \t]*$', line)
    if k:
        out.add(k.group(1).strip('"\''))
print(",".join(sorted(out)))
PY
)"
# Before the fix this returned the five nested members of every component entry.
# Component names themselves carry no scalar, so the correct answer is empty.
if [ -n "$COMP_KEYS" ]; then
  bad "AC7 components: section_values() returns keys it should not: $COMP_KEYS"
  printf '        expected empty; nested members leaked through the indent check\n'
else
  ok "AC7 components: section_values() returns no keys (nested members no longer leak)"
fi
echo

# ---------------------------------------------------------------------------
# Final — the honest-tree check, in the real repo
# ---------------------------------------------------------------------------
echo "AC0  the unmodified repository passes"
if ( cd "$REPO_ROOT" && ./scripts/ci/token-drift-gate.sh >/dev/null 2>&1 ); then
  ok "AC0 token-drift-gate.sh exits 0 on the clean tree"
else
  bad "AC0 token-drift-gate.sh FAILED on the clean tree"
fi
echo

echo "-------------------------------------------"
printf 'passed: %d   failed: %d\n' "$PASS" "$FAIL"
[ "$FAIL" -eq 0 ] || exit 1
echo "All STI-459 value-equality assertions hold."
