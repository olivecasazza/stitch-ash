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
# `catalog/products/sku-001.yaml` has carried, since before the repo's git
# history begins, this customer-facing sentence on a $185 SKU:
#
#     <li>Ships in 2–3 weeks.</li>
#
# It is line 41 as of a871f3d; it was line 16 when this gate was authored and
# moved when unrelated storefront work reshaped the catalog. A pin is a
# file:line, so a moved line silently disarms the ratchet. --strict-ratchet is
# what turns that back into a loud failure instead of a silent one.
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

# ── Modes ─────────────────────────────────────────────────────────────────
#
# strict (default)  -> PR CI. Fails on ANY unquoted lead time, including the one
#                      that is live right now. Deliberate: PRs must never be able
#                      to merge a new unquoted claim silently.
# --ratchet          -> deploy.yml. Tolerates exactly the known-bad line, fails
#                      on any additional one.
# --strict-ratchet   -> deploy.yml's second step. Every ratchet entry must still
#                      match something, so the tolerated set can only shrink and
#                      an entry cannot outlive its fix.
#
# Why deploy.yml cannot run the strict form: a step that fails on the
# PRE-EXISTING known defect freezes every deploy on main until a human answers
# an operator question. That converts a governance ask into a self-inflicted
# outage, which is worse than the defect it guards. Ratchet mode keeps the guard
# real (new claims still red the deploy) without letting one unanswered
# question block publishing unrelated work.
#
# The ratchet pins ONE file:line, not a class. The tolerated set is the specific
# defect we already published and are actively asking about; any other SKU, any
# additional line, or any reworded variant still fails the deploy.

RATCHET_FILE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/lead-time-ratchet.txt"
MODE="strict"
STRICT_RATCHET=0

while [ $# -gt 0 ]; do
  case "$1" in
    --ratchet) MODE="ratchet"; shift ;;
    # --strict-ratchet implies --ratchet. The two flags are checks layered on
    # ratchet mode, not alternatives: the stale-entry scan reads the set of
    # entries that were actually TOLERATED, which only exists in ratchet mode.
    # Treating them as independent let `--strict-ratchet` alone scan an empty
    # tolerated set and reject every live entry.
    --strict-ratchet) MODE="ratchet"; STRICT_RATCHET=1; shift ;;
    --ratchet-file) RATCHET_FILE="$2"; shift 2 ;;
    -h|--help)
      echo "usage: $(basename "$0") [--ratchet] [--strict-ratchet] [--ratchet-file PATH]"
      exit 0 ;;
    *) echo "unknown argument: $1" >&2; exit 2 ;;
  esac
done

# "<relpath>:<lineno>", one per line. Blank lines and #-comments are ignored;
# `|| [ -n "$line" ]` is load-bearing, because without it a ratchet file whose
# final line has no newline still silently loses that entry.
ratcheted=()
if [ -f "$RATCHET_FILE" ]; then
  while IFS= read -r line || [ -n "$line" ]; do
    line="${line%%#*}"
    line="$(printf '%s' "$line" | tr -d '[:space:]')"
    [ -n "$line" ] && ratcheted+=("$line")
  done < "$RATCHET_FILE"
fi

# The one lead time a supplier has actually quoted, as "<lo>-<hi> weeks",
# measured over "order placed -> ready to ship". EMPTY means none.
# See the block comment above before editing this.
ALLOWED_VERIFIED_LEAD_TIME=""

CATALOG_DIR="catalog"
DOCS_DIR="docs/merch"

# The PDP's pre-launch fallback copy. app/data/products.ts is a hand-authored
# second copy of the same shipping facts, NOT generated from catalog/ — nothing
# writes it (verified: no script references it as an output; it was last touched
# by hand in #204/#207). It renders whenever the Storefront API has no matching
# product, which is the normal case for this store pre-launch.
#
# It was outside this gate's scan roots for the whole of its life, which made it
# invisible: the unquoted "Ships in 2-3 weeks." sat at app/data/products.ts:81
# on main while the gate reported a clean catalog. That is the same false green
# this gate exists to kill, one directory over — and it is the more dangerous of
# the two, because the YAML copy is what the docs and the ratchet talk about,
# so every audit that only looked at catalog/ confirmed the "known" copy and
# missed the one that renders.
#
# Only the specific hand-authored copy files are scanned. The whole of app/
# would be far too broad: it contains code comments, changelog prose and
# unrelated "within a few days" support copy that are not fulfilment promises,
# and a gate that is red for the wrong reason gets deleted. This file is the
# product-data mirror of catalog/, so it carries the same customer-facing
# strings and belongs in scope. Add a path here if a second authored copy is
# ever added, and let the fixture tests prove the scope is what you think.
APP_COPY_FILES=("app/data/products.ts")

# The design spec's verbatim transcript of the rendered PDP copy. DESIGN.md:604
# reproduces the Shipping & Returns block line for line:
#
#     Shipping & Returns - Made to order. / Ships in 2-3 weeks. / Tracked
#     shipping. / Returns within 14 days, unworn.
#
# It was outside this gate's scan roots too, and measured on the real merged
# tree it is a live false green in the DEPLOY path, not just in pr-checks: a
# fresh unquoted claim appended to DESIGN.md left `--ratchet --strict-ratchet`
# exiting 0, because the scan never looks at the file.
#
# This one matters more than a missed duplicate. DESIGN.md is the document the
# next agent trusts to re-author the copy. It states the unquoted number as the
# exact current string, with no note that it is unquoted — so an agent that
# copies the spec faithfully reproduces the defect, and an agent that reads the
# spec as the record of what customers see has been shown a clean bill of
# health. That is precisely how the number survived six weeks of "resolved"
# claims: every audit that grepped catalog/ or docs/merch confirmed the copy it
# expected and never read the one place the whole block is written down.
#
# The file is scanned as prose with the same patterns, ratchet accounting and
# return-window exemption as the other copy surfaces. A return window is still
# not a lead time here: line 605's "Returns within 14 days, unworn." is the
# same correct line it is in the catalog, and is excused rather than tolerated.
#
# Only the one spec file is scanned, not all of docs/ — see the APP_COPY_FILES
# note above for why breadth is what gets this gate deleted. Add a path here if
# a second document starts transcribing rendered copy verbatim.
SPEC_COPY_FILES=("DESIGN.md")

FOUND=0
RATCHETED_HITS=()
report() {
  echo "ERROR: $*"
  FOUND=1
}

# Is "<relpath>:<lineno>" in the ratchet set? Exact match on both halves.
# $1 = file path, $2 = line number.
is_ratcheted() {
  local want="$1:$2" have
  for have in ${ratcheted[@]+"${ratcheted[@]}"}; do
    [ "$have" = "$want" ] && return 0
  done
  return 1
}

# Is this hit a return/cancellation window rather than a fulfilment promise?
#
# $1 = the matched line. Days are ambiguous on their own, so a day-denominated
# number is only excused when a window NOUN governs it in the same sentence.
# "Returns within 14 days, unworn." is excused. "Ships in 5-7 days" is not.
#
# Weeks and months are never excused here: no return window in this catalog is
# denominated in them, so keeping them unconditional costs no true negative and
# removes a whole class of "I softened the regex" false green.
is_non_lead_window() {
  local hit="$1" sentence

  # Only "N days" can be a window; anything else is always a commitment.
  printf '%s' "$hit" | grep -Eq '[0-9]+[[:space:]]+(business[[:space:]]+days|days?)\b' || return 1

  # Look at the sentence the number sits in. HTML <li>/<p> boundaries do not
  # end a sentence, so also split on them; that is what keeps "Returns within
  # 14 days" from seeing a "ships" that lives in a neighbouring element.
  while IFS= read -r sentence; do
    if printf '%s' "$sentence" \
      | grep -Eiq "$NON_LEAD_WINDOW_RE" \
      && printf '%s' "$sentence" | grep -Eiq "$NON_LEAD_SENTENCE_RE$NON_LEAD_WINDOW_RE"
    then
      return 0
    fi
  done < <(printf '%s' "$hit" | sed -e 's/<\/\?[a-zA-Z][^>]*>/\n/g' -e 's/[.!?]/\n/g')

  return 1
}

# Report a hit as fatal, tolerated, or (strict-ratchet) stale.
handle_hit() {
  local file="$1" line_no="$2" hit="$3"

  if is_non_lead_window "$hit"; then
    printf 'not a lead time (return/cancellation window, not a supplier promise): %s:%s\n' \
      "$file" "$line_no"
    echo "    $hit"
    return 0
  fi

  if [ "$MODE" = "ratchet" ] && is_ratcheted "$file" "$line_no"; then
    RATCHETED_HITS+=("$file:$line_no")
    printf 'ratcheted (known unquoted claim, tolerated, STI-638 open): %s:%s\n' \
      "$file" "$line_no"
    echo "    $hit"
    return 0
  fi
  report "unverified production lead time in customer-facing catalog file: $file:$line_no"
  echo "    $hit"
}

# Report a structured (key: value) production lead-time claim. Same ratchet
# accounting and same fatal-report shape as a prose hit, deliberately: a claim
# is a claim however it is written down. Only the return-window exemption is
# skipped, because "madeToOrderMinDays" has no return-window reading.
handle_structured_hit() {
  local file="$1" line_no="$2" hit="$3"

  if [ "$MODE" = "ratchet" ] && is_ratcheted "$file" "$line_no"; then
    RATCHETED_HITS+=("$file:$line_no")
    printf 'ratcheted (known unquoted claim, tolerated, STI-638 open): %s:%s\n' \
      "$file" "$line_no"
    echo "    $hit"
    return 0
  fi

  report "unverified production lead time in customer-facing catalog file: $file:$line_no"
  echo "    $hit"
  echo "    The unit is in the key, so the prose lead-time pattern cannot see this line."
  echo "    It is still a customer-visible fulfilment commitment with no supplier quote."
}

# Scan a list of authored-copy files with the prose pattern only.
# $1 = name of an array variable holding the paths, $2 = human label for the
#      progress line.
#
# Every surface that states the promise in prose goes through here, so "the app
# fallback copy is scanned" and "the design spec is scanned" are the same claim
# about the same code. The structured key pass is catalog-only by construction:
# madeToOrderMinDays is a shipping-policy key, and neither copy surface can
# contain one.
scan_copy_files() {
  local -n _files="$1"
  local label="$2" file normalised matches hit line_no

  for file in "${_files[@]}"; do
    [ -f "$file" ] || continue
    normalised="$(normalise < "$file")"
    # shellcheck disable=SC2086  # LEAD_TIME_RE is intentionally unquoted.
    if matches="$(printf '%s' "$normalised" | grep -En "$LEAD_TIME_RE")"; then
      while IFS= read -r hit; do
        line_no="${hit%%:*}"
        handle_hit "$file" "$line_no" "$hit"
      done <<< "$matches"
    fi
  done
  echo "lead-time-claim-gate: scanned ${#_files[@]} $label ..."
}

# Normalise to ASCII so the separator class below matches regardless of the
# dash actually authored. LC_ALL=C.UTF-8 is set for the whole gate so that -P
# behaves identically here and on a CI runner; without it this script would
# have the very locale bug it exists to catch.
export LC_ALL=C.UTF-8

# A lead time: a number, an OPTIONAL separator, an optional second number, and
# the word weeks/months/days/business days. `normalise` has already folded every
# dash-like separator to a plain hyphen, so this class is pure ASCII on purpose.
# An ASCII-only pattern is the entire bug this gate was written to stop: a regex
# carrying a literal en dash stops matching the moment the locale stops being
# UTF-8, or the moment a re-dash edits the copy. Separators are a class so a
# re-spaced, re-dashed or re-worded rewrite cannot slip past.
#
# The separator is OPTIONAL because a single number is still a commitment:
# "Allow 3 weeks for production" promises a schedule just as bindingly as
# "Allow 2-3 weeks", and a gate that only catches the ranged form is trivially
# evaded by dropping one endpoint. Both forms are commitments until a supplier
# quotes one.
#
# "days" is in the unit class on purpose. A weeks-only pattern left a real hole:
# "Lanyards ship in 5-7 days once embroidered" is exactly as binding as a
# production lead time and passed the gate silently, which is the false green
# this whole file exists to prevent. "business days" is matched ahead of "days"
# so the longer unit wins at the same position.
LEAD_TIME_RE='([0-9]+)([[:space:]]*(-+|to)[[:space:]]*([0-9]+))?[[:space:]]+(business[[:space:]]+days|weeks?|months?|days?)'

# ── Return and cancellation windows are NOT lead times ────────────────────
#
# A bare day-denominated range is ambiguous, and the real catalog is full of
# honest ones that have nothing to do with production:
#
#     <li>Returns within 14 days, unworn.</li>
#
# That is a return WINDOW. It is not a promise about when an order arrives, it
# is not a supplier commitment, and no supplier quote can validate or invalidate
# it. Matching it made the gate fail on the correct copy, and because that line
# is in the LIVE hoodie catalog it meant --ratchet could never tolerate it and
# the deploy was frozen on a defect that is not the one we are chasing. That is
# the mirror image of the false green this gate exists to kill: a gate that is
# red for the wrong reason trains people to delete the gate.
#
# So a day-denominated claim is only a LEAD TIME when it is about fulfilment.
# These classes were measured against the live catalog and both are required
# context, not decoration:
#
#   FULFILMENT_RE  past/present-tense fulfilment verbs and the word "ship"
#                  -> "ships in 5-7 days", "ready to ship within 3 days",
#                     "dispatched in 5-7 days", "ships in 3 weeks"
#   LEAD_WINDOW_RE the noun the window applies to, i.e. the thing arriving
#                  -> "delivery in 5-7 days", "dispatch in 5-7 days"
#
# A WINDOW_RE word appearing ANYWHERE in the file line is not enough: the
# current false positive is exactly that case, so the class is deliberately
# narrow and every case is asserted in the fixture tests. Weeks and months
# stay ungated by this rule, because nothing in this catalog states a
# weeks/months return window and "Ships in 2-3 weeks" is unambiguous.
FULFILMENT_RE='(ship|ships|shipped|shipping|dispatch|dispatched|dispatching|ready|produced|fulfil|fulfill|deliver|delivers|delivered|delivery)'
LEAD_WINDOW_RE='(delivery|dispatch|lead[[:space:]]+time|processing|turnaround)'
# A return/cancellation/refund window. If the number belongs to one of these,
# it is not a lead time and is not this gate's business.
NON_LEAD_WINDOW_RE='(return|returns|returning|refund|refunds|exchange|exchanges|cancel|cancellation|cancellations|withdraw|withdrawn)'
# "Returns within 14 days" must be classified by its noun ("returns"), so the
# non-lead test only excuses a number when a window NOUN governs it. Bounded to
# the sentence so an unrelated "returns" later in the line cannot excuse a real
# claim; normalised copy puts each sentence's text before its terminator.
NON_LEAD_SENTENCE_RE='[^.!?]*'

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
      handle_hit "$file" "$line_no" "$hit"
    done <<< "$matches"
  fi

  # ── The same claim, written as machine-readable fields ──────────────────
  #
  # LEAD_TIME_RE only sees a number that is followed by a UNIT WORD. The
  # shipping policy declares the identical commitment as two structured keys:
  #
  #     processingTime:
  #       madeToOrderMinDays: 14
  #       madeToOrderMaxDays: 35
  #
  # The unit is in the KEY, not after the number, so the prose pattern above
  # cannot see it and the gate reported a clean catalog while a $185 SKU's
  # fulfilment window was declared twice, in two different ranges, with neither
  # number quoted by anyone.
  #
  # This is a real false green, not a theoretical one: it shipped because the
  # gate is only ever exercised against the file where the claim is prose.
  # Matching the key names as a CLASS rather than pinning one spelling keeps a
  # renamed or newly-added key from being a free pass: a leadTimeMaxDays or
  # productionMinDays key carries the same commitment and must be caught the
  # same way. The values are matched through the same normalise path so a
  # quoted/unquoted or spaced form still lands.
  #
  # These are keys, not prose, so is_non_lead_window does not apply: a
  # madeToOrderMinDays key is a production commitment by construction, and
  # there is no return-window reading of "made to order minimum days".
  #
  # The negative cases are asserted in the fixture tests, so the class cannot
  # quietly widen into refund/return windows, transit estimates or stock counts
  # and turn the gate red on correct data.
  if s_matches="$(printf '%s' "$normalised" \
    | grep -En '^[[:space:]]*[A-Za-z_]*(madeToOrder|production|processing|fulfillment|fulfilment|leadTime|lead_time)[A-Za-z_]*(Min|Max|Window)?[A-Za-z_]*Days[[:space:]]*:[[:space:]]*[0-9]+')"; then
    while IFS= read -r hit; do
      line_no="${hit%%:*}"
      handle_structured_hit "$file" "$line_no" "$hit"
    done <<< "$s_matches"
  fi
done < <(find "$CATALOG_DIR" -type f \( -name '*.yaml' -o -name '*.yml' \) | sort)

# ── The PDP pre-launch fallback copy ──────────────────────────────────────
#
# Same patterns, same ratchet accounting, same fatal-report shape as the
# catalog pass. The only difference is that these are TypeScript string
# literals rather than YAML/HTML, so the structured key pattern below does not
# apply — app/data/products.ts states the promise as prose in a `lines: [...]`
# array, which LEAD_TIME_RE already catches.
#
# is_non_lead_window still applies and matters here: "Returns within 14 days,
# unworn." is authored at app/data/products.ts:83 and is a return window, not a
# fulfilment promise. Exempting it by class rather than by file is what keeps
# this pass from being red for a correct line and getting the whole scan
# deleted.
if [ "${#APP_COPY_FILES[@]}" -gt 0 ]; then
  scan_copy_files APP_COPY_FILES "PDP fallback cop(y|ies) under app/"
fi

# ── The design spec's verbatim copy transcript ────────────────────────────
#
# Same pass as the app/ fallback copy above, over SPEC_COPY_FILES. The two
# lists are scanned by the same helper rather than by two copies of this block,
# because a duplicated scan block is how the two lists drift apart again — the
# next person adds a file to one array and never notices the other loop is not
# reading it.
#
# The structured key pattern is deliberately not applied to either list: these
# are prose transcriptions of rendered copy, not the machine-readable shipping
# policy, and a madeToOrderMinDays key cannot appear in them by construction.
if [ "${#SPEC_COPY_FILES[@]}" -gt 0 ]; then
  scan_copy_files SPEC_COPY_FILES "verbatim cop(y|ies) in the design spec"
fi

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

# ── Ratchet accounting ────────────────────────────────────────────────────
#
# In ratchet mode a tolerated entry that no longer matches anything is STALE,
# not harmless: it means the defect was fixed and nobody tightened the gate, so
# the next unquoted claim would pass silently. Fail on that, exactly as
# built-css-radius-gate.sh --strict-ratchet does for unused radius entries.
if [ "$STRICT_RATCHET" -eq 1 ]; then
  for v in ${ratcheted[@]+"${ratcheted[@]}"}; do
    seen=0
    for h in ${RATCHETED_HITS[@]+"${RATCHETED_HITS[@]}"}; do [ "$h" = "$v" ] && seen=1; done
    if [ "$seen" -eq 0 ]; then
      echo "ERROR: --strict-ratchet: ratchet entry no longer occurs: $v"
      echo "       Delete it from $(basename "$RATCHET_FILE") — the tolerated set must only shrink."
      FOUND=1
    fi
  done
fi

if [ "$FOUND" -eq 0 ]; then
  if [ "${#RATCHETED_HITS[@]}" -gt 0 ]; then
    echo "lead-time-claim-gate: passed (no unquoted lead time in $CATALOG_DIR or the app/ PDP fallback copy besides"
    echo "  the ${#RATCHETED_HITS[@]} ratcheted line(s) above; no verified claim in $DOCS_DIR)"
  else
    echo "lead-time-claim-gate: passed (no unverified lead time in $CATALOG_DIR or the app/ PDP fallback copy, no verified claim in $DOCS_DIR)"
  fi
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
