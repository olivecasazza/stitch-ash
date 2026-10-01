#!/usr/bin/env bash
# scripts/ci/built-css-radius-gate.sh
# STI-415: fail if the BUILT stylesheet ships a border-radius that is not zero.
#
# Why a built-artifact gate and not a source grep: every `rounded-*` utility we
# can actually edit is already `rounded-none` in app/, yet the deployed entry CSS
# still carried five non-zero literal values. Those come from node_modules —
# @nuxt/ui's own component styles reference `rounded`/`rounded-full`/
# `rounded-[inherit]`, and @tailwindcss/typography hard-codes pre/kbd radii.
# No source-only grep can see them, so a violating stylesheet shipped with both
# STI-402 DoD checks green.
#
# Usage:
#   built-css-radius-gate.sh                     # check dist/**/*.css
#   built-css-radius-gate.sh path/to/entry.css   # check specific files
#   built-css-radius-gate.sh --strict-ratchet ... # unused ratchet entry = fail
#
# Allowlist (always fine):
#   0, 0px, var(--radius-none)      -> literally square
#   var(--ui-radius), calc(var(--ui-radius)*N)  -> "bridge" values: they resolve
#      to 0 only because app/assets/css/tokens.css declares `--ui-radius: 0`
#      unlayered, beating @nuxt/ui's layered `.25rem` default. The gate proves
#      that declaration is actually in the bundle instead of assuming it.
#
# Everything else is a violation, including `inherit`. `inherit` is not literally
# non-zero, but it is an *uncontrolled* radius that can resolve to non-zero, and
# DESIGN.md says zero radius everywhere with no exceptions.
#
# Values listed in scripts/ci/border-radius-ratchet.txt are tolerated but
# reported. That file is a ratchet, not an allowlist: a value that is not in it
# fails, so the tolerated set can only ever shrink. An entry that is no longer
# present is reported so it can be deleted; --strict-ratchet turns that into a
# failure for callers that want the file kept honest.

set -euo pipefail

RATCHET="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/border-radius-ratchet.txt"
STRICT_RATCHET=0
APP_OVERRIDE=""
FILES=()

while [ $# -gt 0 ]; do
  case "$1" in
    --ratchet) RATCHET="$2"; shift 2 ;;
    --strict-ratchet) STRICT_RATCHET=1; shift ;;
    --app-dir) APP_OVERRIDE="$2"; shift 2 ;;
    -h|--help) sed -n '2,32p' "${BASH_SOURCE[0]}"; exit 0 ;;
    -*) echo "unknown option: $1" >&2; exit 2 ;;
    *) FILES+=("$1"); shift ;;
  esac
done

if [ ${#FILES[@]} -eq 0 ]; then
  if [ ! -d dist ]; then
    echo "ERROR: no CSS given and no dist/ directory — nothing to check."
    echo "       Pass a CSS file, or run this after a build."
    exit 1
  fi
  while IFS= read -r f; do FILES+=("$f"); done < <(find dist -name '*.css' -type f | sort)
fi

if [ ${#FILES[@]} -eq 0 ]; then
  echo "ERROR: no .css files found — a build that emitted no stylesheet is not a pass."
  exit 1
fi

ratcheted=()
if [ -f "$RATCHET" ]; then
  # Strip comments and blanks; keep the literal CSS value.
  # `|| [ -n "$line" ]` is load-bearing: without it a ratchet file that does not
  # end in a newline silently loses its LAST entry, and that value then fails the
  # gate for a reason nobody can reproduce. Found by running the gate against the
  # live stylesheet on 2026-10-01.
  while IFS= read -r line || [ -n "$line" ]; do
    line="${line%%#*}"
    line="$(echo "$line" | tr -d '[:space:]')"
    [ -n "$line" ] && ratcheted+=("$line")
  done < "$RATCHET"
fi

# ── Check 2: is any ratcheted value actually ACTIVATED from our own source? ──
#
# The ratchet pins values, not selectors, and that is a real hole. `.rounded`
# compiles to the literal `.25rem`, which is ratcheted because @nuxt/ui already
# asks for the utility. Adding `class="rounded"` to a component would therefore
# activate 4px corners on the live site while the built-CSS check above stayed
# green — the rule already exists either way, so no new byte appears in the CSS
# for the artifact check to notice. The activation lives in app/, so check there.
#
# Only run when we are in the repo (a gate pointed at a downloaded artifact has
# no app/ to read), and only over source, never dist/.
#
# Tailwind classes only ever appear inside a quoted string, so only quoted
# strings are scanned. A naive text grep for \brounded\b reports prose — the
# comments in Footer.vue and ProductImagePlate.vue literally contain the words
# "rounded UP to 25 user units", and tokens.css says "rounded.none" — and a gate
# that cries wolf on its own comments gets disabled.
ACTIVATED=""
APP_DIRS=""
if [ -n "$APP_OVERRIDE" ]; then
  APP_DIRS="$APP_OVERRIDE"
elif [ -d app ]; then
  APP_DIRS="app"
fi
if [ -n "$APP_DIRS" ]; then
  ACTIVATED=$(find $APP_DIRS -type f \( -name '*.vue' -o -name '*.ts' -o -name '*.js' \) -print0 2>/dev/null \
    | xargs -0 awk '
        function flag(t,   base) {
          if (t == "" || t == "rounded-none") return ""
          base = t
          sub(/^[a-z0-9_-]+:/, "", base)          # hover:, md:, dark: …
          if (base == "rounded") return t
          if (base ~ /^rounded-(sm|md|lg|xl|2xl|3xl|full)$/) return t
          return ""
        }
        {
          line = $0
          # Drop HTML comments first: they may contain quotes ("rounded UP to 25
          # user units" is a real comment in this repo) and a comment can never
          # carry a class onto a rendered element.
          gsub(/<!--[^>]*-->/, " ", line)
          n = split(line, q, /["'"'"'`]/)
          for (i = 2; i <= n; i += 2) {
            m = split(q[i], tok, /[ \t]+/)
            for (j = 1; j <= m; j++) {
              t = flag(tok[j])
              if (t != "") { printf "%s:%d: %s\n", FILENAME, FNR, t; found = 1 }
            }
          }
        }
        END { exit(found ? 0 : 1) }
      ' 2>/dev/null || true)
fi

in_ratchet() {
  local want="$1" have
  for have in ${ratcheted[@]+"${ratcheted[@]}"}; do
    [ "$have" = "$want" ] && return 0
  done
  return 1
}

# every distinct border-radius value across every checked file
values=$(grep -hoE 'border-radius:[[:space:]]*[^;}]{1,40}' "${FILES[@]}" 2>/dev/null \
  | sed 's/^border-radius:[[:space:]]*//' \
  | sed 's/[[:space:]]*$//' \
  | sort -u || true)

if [ -z "$values" ]; then
  echo "ERROR: no border-radius declaration found in:"
  printf '       %s\n' "${FILES[@]}"
  echo "       That means the artifact was not parsed as CSS. Refusing to pass."
  exit 1
fi

VIOLATIONS=()
BRIDGED=()
RATCHET_HITS=()
UNUSED=()

for v in $values; do
  case "$v" in
    0|0px|var\(--radius-none\))
      : # literally square
      ;;
    var\(--ui-radius\)|calc\(var\(--ui-radius\)\*[0-9.e+-]*\))
      BRIDGED+=("$v")
      ;;
    *)
      if in_ratchet "$v"; then
        RATCHET_HITS+=("$v")
      else
        VIOLATIONS+=("$v")
      fi
      ;;
  esac
done

# A bridge value is only square because tokens.css zeroes --ui-radius. Prove it.
if [ ${#BRIDGED[@]} -gt 0 ]; then
  if grep -qhE -- '--ui-radius:[[:space:]]*0([[:space:]]|;|})' "${FILES[@]}"; then
    echo "radius-gate: --ui-radius: 0 is present, so ${#BRIDGED[@]} bridged value(s) resolve to 0."
  else
    VIOLATIONS+=("--ui-radius is not zero; bridged rounded-* utilities would render non-zero")
  fi
fi

for v in ${ratcheted[@]+"${ratcheted[@]}"}; do
  seen=0
  for h in ${RATCHET_HITS[@]+"${RATCHET_HITS[@]}"}; do [ "$h" = "$v" ] && seen=1; done
  [ "$seen" -eq 0 ] && UNUSED+=("$v")
done

echo "radius-gate: checked ${#FILES[@]} stylesheet(s)"

if [ -n "$ACTIVATED" ]; then
  VIOLATIONS+=("a rounded-* utility is used in $APP_DIRS (activates a ratcheted non-zero radius)")
fi

if [ ${#BRIDGED[@]} -gt 0 ]; then
  printf '  bridged (resolve to 0 via --ui-radius: 0): %s\n' "${BRIDGED[*]}"
fi
if [ ${#RATCHET_HITS[@]} -gt 0 ]; then
  printf '  ratcheted (known vendor literals, tolerated): %s\n' "${RATCHET_HITS[*]}"
fi

if [ ${#UNUSED[@]} -gt 0 ]; then
  if [ "$STRICT_RATCHET" -eq 1 ]; then
    echo ""
    echo "ERROR: --strict-ratchet: these ratchet entries no longer occur:"
    printf '       %s\n' "${UNUSED[@]}"
    echo "       Delete them from $(basename "$RATCHET") — the tolerated set must only shrink."
    exit 1
  fi
  echo "  WARNING: ratchet entries no longer present, delete them to tighten:"
  printf '           %s\n' "${UNUSED[@]}"
fi

if [ ${#VIOLATIONS[@]} -gt 0 ]; then
  echo ""
  echo "ERROR: non-zero border-radius shipped in the built CSS:"
  for v in "${VIOLATIONS[@]}"; do
    echo ""
    echo "  value: $v"
    if [ "$v" = "--ui-radius is not zero; bridged rounded-* utilities would render non-zero" ]; then
      echo "  declare '--ui-radius: 0' unlayered in app/assets/css/tokens.css"
      continue
    fi
    if [ "$v" = "a rounded-* utility is used in $APP_DIRS (activates a ratcheted non-zero radius)" ]; then
      echo "  these rounded-* call sites compile to non-zero radius. Use rounded-none:"
      printf '%s\n' "$ACTIVATED" | sed 's/^/    /'
      continue
    fi
    # Print the offending selectors so the failure is actionable.
    for f in "${FILES[@]}"; do
      tr '}' '\n' < "$f" \
        | grep -F "border-radius:$v" 2>/dev/null \
        | head -10 \
        | sed "s|^|    $(basename "$f"): |"
      # tolerate the spaced form "border-radius: <v>"
      tr '}' '\n' < "$f" \
        | grep -E "border-radius:[[:space:]]+$(printf '%s' "$v" | sed 's/[.[\*^$+?(){}|]/\\&/g')([[:space:]]|;|$)" 2>/dev/null \
        | head -10 \
        | sed "s|^|    $(basename "$f"): |"
    done
  done
  echo ""
  echo "DESIGN.md sets radius to zero everywhere with no exceptions. Fix the source"
  echo "rule that emitted this, or pin the literal in"
  echo "scripts/ci/border-radius-ratchet.txt with a justification."
  exit 1
fi

echo "radius-gate: passed (every border-radius in the built CSS is zero)"
exit 0