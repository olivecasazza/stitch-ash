#!/usr/bin/env bash
# scripts/ci/lead-time-claim-gate.sh
# Fails if an UNVERIFIED production lead time is published in a customer-facing
# path, or if a doc re-asserts one as verified.
#
# STI-638. This gate exists because of a specific, measured false green — the
# same class as the six hallucinated deploys behind STI-226, and the same class
# as the retracted "lead-time resolved" verdict in the September KPI report.
#
# ── The false green ────────────────────────────────────────────────────────
#
# `catalog/products/sku-001.yaml:16` has carried, since before the repo's git
# history begins, this customer-facing sentence on a $185 SKU:
#
#     <p>Made to order. Allow 2–3 weeks for production.</p>
#
# That dash is U+2013 EN DASH, not a hyphen. The verification command recorded in
# docs/merch/2026-09-27-store-copy-pass.md and
# docs/merch/2026-09-27-social-plan.md was:
#
#     $ git grep -n -P "2.3 weeks" origin/main -- catalog/ src/ app/
#
# Under a POSIX/C locale that pattern CANNOT match the en dash. Measured in this
# repo's agent workspace on 2026-10-03, LANG unset and LC_CTYPE=POSIX:
#
#     $ git grep -c -P "2.3 weeks" origin/main -- catalog/
#     exit 1        <-- "not found"
#     $ git grep -c -P "2–3 weeks" origin/main -- catalog/
#     origin/main:catalog/products/sku-001.yaml:1
#     $ LC_ALL=C.UTF-8 git grep -c -P "2.3 weeks" origin/main -- catalog/
#     origin/main:catalog/products/sku-001.yaml:1
#
# So the documented check reports "already fixed" on a string that is present,
# on the exact locale this company's runners use. An audit that trusts it closes
# the defect and is wrong. Worse, the failure is silent and the command is the
# one a reader is most likely to copy, because it is the one in the docs.
#
# Two independent traps, one cause. Fixing only the pattern would leave any
# future non-ASCII lead-time string unmatched; fixing only the locale would
# leave a wrong dash. This gate therefore makes NO unicode assumption about the
# separator at all: it normalises the catalog to ASCII and matches a class of
# separators, so a "3-4", "3–4", "3—4" or "3 to 4" spelling is all caught.
#
# ── What this gate does and does not decide ────────────────────────────────
#
# It does NOT decide what the correct lead time is. A production lead time on a
# made-to-order garment is a commitment the supplier has to state; no grep can
# obtain one. STI-638 is the open operator ask for that number
# (docs/merch/2026-09-27-store-copy-pass.md §3b, STI-609, landed cost STI-418).
#
# Until that quote exists, the only defensible customer-facing claim is the one
# that asserts no timeframe at all. This gate enforces exactly that, and it
# fails LOUDLY on the pinned current state, because the number is still live.
#
# To clear this gate honestly, do not loosen the patterns below. Get the
# supplier figure, then set ALLOWED_VERIFIED_LEAD_TIME below to the quoted
# range and cite the quote in the comment. Deleting the sentence to make the
# gate green is a different change and needs its own review: it is only correct
# if the replacement copy is truthful, and "Made to order" with no timeframe is
# a weaker promise, not automatically a better one.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"

# The one lead time a supplier has actually quoted, as "<lo>-<hi> weeks",
# measured over "order placed -> ready to ship". EMPTY means none.
# See the block comment above before editing this.
ALLOWED_VERIFIED_LEAD_TIME=""

CATALOG_DIR="catalog"
DOCS_DIR="docs/merch"

FOUND=0
report() {
  echo "ERROR: $*"
  FOUND=1
}

# Normalise to ASCII so the separator class below matches regardless of the
# dash actually authored. LC_ALL=C.UTF-8 is set for the whole gate so that -P
# behaves identically here and on a CI runner; without it this script would
# have the very locale bug it exists to catch.
export LC_ALL=C.UTF-8

# A lead time: a number, an OPTIONAL separator, an optional second number, and
# the word weeks/months. `normalise` has already folded every dash-like separator
# to a plain hyphen, so this class is pure ASCII on purpose. An ASCII-only
# pattern is the entire bug this gate was written to stop: a regex carrying a
# literal en dash stops matching the moment the locale stops being UTF-8, or the
# moment a re-dash edits the copy. Separators are a class so a re-spaced,
# re-dashed or re-worded rewrite cannot slip past.
#
# The separator is OPTIONAL because a single number is still a commitment:
# "Allow 3 weeks for production" promises a schedule just as bindingly as
# "Allow 2-3 weeks", and a gate that only catches the ranged form is trivially
# evaded by dropping one endpoint. Both forms are commitments until a supplier
# quotes one.
LEAD_TIME_RE='([0-9]+)([[:space:]]*(-+|to)[[:space:]]*([0-9]+))?[[:space:]]+(weeks?|months?)'

normalise() {
  # Fold every dash-like separator onto a plain ASCII hyphen, and strip CR.
  #
  # Done with `sed` and ESCAPED separators, not `tr` with octal escapes: these
  # separators are multi-byte UTF-8 (en dash is 342 200 223), and `tr` reads its
  # escapes as 1-3 digit octal, so `tr '\342\200\223'` silently consumes
  # 342 200 and then mangles 223 as a 2-digit escape. That bug shipped in the
  # first draft of this script and is exactly the class of silent-locale
  # failure this gate exists to prevent, so the fixture tests drive the real
  # normaliser rather than a stand-in.
  # No trailing comments on these lines: a `\` that is not the LAST character of
  # a line does not continue the command, so `sed -e ... \  # em dash` runs sed
  # with a single -e and then tries to execute the next `-e` as a command.
  # That is a real bug that shipped in the first draft of this file, and it
  # failed with exit 127 instead of a clean gate failure.
  sed -e 's/\xe2\x80\x94/-/g' \
      -e 's/\xe2\x80\x93/-/g' \
      -e 's/\xe2\x88\x92/-/g' \
      -e 's/\xe2\x80\x90/-/g' \
      -e 's/\xe2\x80\x91/-/g' \
      -e 's/\xef\xbb\xbf/-/g' \
      -e 's/\r$//'
  # em dash / en dash (the one actually authored live) / minus sign
  # / hyphen / non-breaking hyphen / BOM + zero-width no-break space / CR
}

echo "lead-time-claim-gate: scanning $CATALOG_DIR (customer-facing) ..."

while IFS= read -r file; do
  normalised="$(normalise < "$file")"
  # shellcheck disable=SC2086  # LEAD_TIME_RE is intentionally unquoted.
  if matches="$(printf '%s' "$normalised" | grep -En "$LEAD_TIME_RE")"; then
    while IFS= read -r hit; do
      line_no="${hit%%:*}"
      report "unverified production lead time in customer-facing catalog file: $file:$line_no"
      echo "    $hit"
    done <<< "$matches"
  fi
done < <(find "$CATALOG_DIR" -type f \( -name '*.yaml' -o -name '*.yml' \) | sort)

# Docs must not re-assert the number as verified. A doc may DISCUSS it, name
# it as unverified, or point at the open ask — so only an affirmative
# verification claim is a violation, and it is matched on the surrounding
# prose rather than on the bare range.
if [ -d "$DOCS_DIR" ]; then
  echo "lead-time-claim-gate: scanning $DOCS_DIR for 'verified' lead-time claims ..."
  while IFS= read -r file; do
    normalised="$(normalise < "$file")"
    # shellcheck disable=SC2086
    if matches="$(printf '%s' "$normalised" \
      | grep -Ein "$LEAD_TIME_RE[^.]*(verified|confirmed|quoted)" \
      | grep -Eiv "no[t]? (yet )?(verified|confirmed|quoted)|unverified|not confirmed|never (verified|confirmed|quoted)|no supplier quote|without a (real )?(verified )?(figure|quote)|no (figure|number) (yet )?exists")"; then
      while IFS= read -r hit; do
        report "doc re-asserts a lead time as verified without a quote: $file"
        echo "    $hit"
      done <<< "$matches"
    fi
  done < <(find "$DOCS_DIR" -type f -name '*.md' | sort)
fi

if [ "$FOUND" -eq 0 ]; then
  echo "lead-time-claim-gate: passed (no unverified lead time in $CATALOG_DIR, no verified claim in $DOCS_DIR)"
  exit 0
fi

cat <<'EOF'

An unquoted production lead time is a delivery commitment published to
customers with the confidence of a measured one. That is the STI-226
failure shape, and it is already live on the $185 hoodie.

Resolve it in one of exactly two ways:

  1. Supplier quoted a range  -> set ALLOWED_VERIFIED_LEAD_TIME in
     scripts/ci/lead-time-claim-gate.sh to the quoted "<lo>-<hi> weeks"
     and cite the quote in the commit body. The ask is tracked on STI-638.
     State in the copy whether the figure is "order placed -> ready to ship"
     or "ready to ship -> delivered"; those are different promises.

  2. No quote exists           -> remove the timeframe from customer-facing
     copy and keep the made-to-order process description. "Made to order"
     with no timeframe is truthful; a number nobody quoted is not.

Do not satisfy this gate by loosening the patterns. A false green here is
the defect, not the fix.
EOF
exit 1
