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

# Same, but writing a ratchet file and passing gate flags.
# $1 = fixture dir, $2 = ratchet contents ("" = no ratchet file at all),
# $3 = env prefix, $4 = out file, $5.. = extra gate args
run_gate_r() {
  local fixture="$1" ratchet="$2" envspec="$3" out="$4"
  shift 4
  local dir="$WORK/$(basename "$fixture")-r-$$-RANDOM"
  mkdir -p "$dir"
  cp -R "$FIXTURES/$fixture/." "$dir/"
  mkdir -p "$dir/scripts/ci"
  cp "$GATE" "$dir/scripts/ci/lead-time-claim-gate.sh"
  if [ -n "$ratchet" ]; then
    printf '%s\n' "$ratchet" > "$dir/scripts/ci/lead-time-ratchet.txt"
  else
    rm -f "$dir/scripts/ci/lead-time-ratchet.txt"
  fi

  local -a env_args=()
  [ -n "$envspec" ] && env_args=(env $envspec)

  ( cd "$dir" && "${env_args[@]}" bash scripts/ci/lead-time-claim-gate.sh "$@" ) >"$out" 2>&1
  echo $?
}

# Only for the argument-parsing assertion: run with no ratchet file.
run_gate_args() {
  local fixture="$1" flag="$2" out="$3"
  local dir="$WORK/$(basename "$fixture")-a-$$-RANDOM"
  mkdir -p "$dir"
  cp -R "$FIXTURES/$fixture/." "$dir/"
  mkdir -p "$dir/scripts/ci"
  cp "$GATE" "$dir/scripts/ci/lead-time-claim-gate.sh"
  ( cd "$dir" && bash scripts/ci/lead-time-claim-gate.sh "$flag" ) >"$out" 2>&1
  echo $?
}

# Append one structured "  <key>: <n>" line to a fixture's shipping policy and
# run the gate in strict mode.
#
# Written as a helper rather than as ten copies of a 6-line cp/append/run block
# because the thing it exists to prove is that the gate is run AGAINST THE TREE
# BEING MUTATED. An earlier hand-written probe got that wrong -- it invoked the
# gate by absolute path while sitting in a different tree, and the gate cd's to
# its own repo root, so the probe silently measured the untouched branch clone
# and reported "not caught" for a pattern that does catch. Every assertion in
# 7f/7g below now mutates the tree the gate actually scans.
#
# $1 = fixture dir, $2 = key name, $3 = env prefix, $4 = out file
run_gate_key() {
  local fixture="$1" key="$2" envspec="$3" out="$4"
  local dir="$WORK/$(basename "$fixture")-k-$$-$key"
  mkdir -p "$dir"
  cp -R "$FIXTURES/$fixture/." "$dir/"
  mkdir -p "$dir/scripts/ci" "$dir/catalog/shipping"
  cp "$GATE" "$dir/scripts/ci/lead-time-claim-gate.sh"
  printf '    %s: 30\n' "$key" >>"$dir/catalog/shipping/default.yaml"

  local -a env_args=()
  [ -n "$envspec" ] && env_args=(env $envspec)

  ( cd "$dir" && "${env_args[@]}" bash scripts/ci/lead-time-claim-gate.sh ) >"$out" 2>&1
  echo $?
}

# ── 1. The pin: the real, current defect must be caught ───────────────────
# En dash, exactly as catalog/products/sku-001.yaml has it.
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

# ── 5b. Day-denominated commitments are caught too ────────────────────────
#
# The unit class was weeks|months only, which left a real hole: "Lanyards ship
# in 5-7 days" is exactly as binding as a production lead time and passed the
# gate silently. That is the same false green this gate exists to prevent, found
# by the ratchet work rather than by inspection.
out="$WORK/o5b"
rc="$(run_gate "unsourced-two-lines" "" "$out")"
check "'5-7 days' is caught alongside the weeks claim" "2" \
  "$(grep -c 'unverified production lead time' "$out")"

# ── 6. Verbs that do not commit are not failures ──────────────────────────
# A made-to-order process sentence with no timeframe is the honest fallback
# and must stay shippable, or the gate pressures a team into inventing a number.
out="$WORK/o6"
rc="$(run_gate "made-to-order-no-number" "" "$out")"
check "'Made to order' with no timeframe passes" "0" "$rc"

# ── 6b. Return windows are NOT lead times ─────────────────────────────────
#
# Found by running the gate against real main, not by inspection. The live
# hoodie catalog says "Returns within 14 days, unworn." A day-denominated
# return window is not a supplier promise: no quote can validate it and it is
# not a delivery promise. Matching it made the gate red on correct copy, and
# because that line is live, --ratchet could never tolerate it and the deploy
# froze on a defect that is not the one STI-638 is about. That is the mirror
# image of the false green this gate exists to kill.
#
# The negative assertions below matter as much as the positive one: a fix that
# simply drops "days" from the unit class would pass the first check and
# reopen the real hole ("Lanyards ship in 5-7 days").
out="$WORK/o6b"
rc="$(run_gate "return-window-not-lead-time" "" "$out")"
check "return/exchange/refund windows with no lead time pass" "0" "$rc"
check "...and are reported as classified, not silently dropped" "3" \
  "$(grep -c 'not a lead time' "$out")"

# A return window must NOT excuse a real claim sitting beside it in one file.
out="$WORK/o6c"
rc="$(run_gate "return-window-beside-real-claim" "" "$out")"
check "a real claim beside a return window still fails" "1" "$rc"
check "...and the return window on that line is excused" "1" \
  "$(grep -c 'not a lead time' "$out")"

# ── 7. The other two SKUs must stay clean ─────────────────────────────────
out="$WORK/o7"
rc="$(run_gate "other-skus-clean" "" "$out")"
check "lanyard + sticker copy with no number passes" "0" "$rc"

# ── 7b. The same claim as structured fields ───────────────────────────────
#
# Found by running the gate against real main on 2026-10-03, not by inspection.
# catalog/shipping/default.yaml declares the identical commitment twice more as
#
#     processingTime:
#       madeToOrderMinDays: 14
#       madeToOrderMaxDays: 35
#
# The unit lives in the KEY, so LEAD_TIME_RE -- which needs a unit WORD after
# the number -- cannot match, and the gate reported a clean catalog while a
# $185 SKU's fulfilment window was declared in three different places in two
# different ranges with no supplier quote behind any of them.
#
# Worse, the two structured numbers CONTRADICT the prose one: 35 days is five
# weeks, while the PDP promises two to three. A customer can be told either.
out="$WORK/o7b"
rc="$(run_gate "structured-madt" "" "$out")"
check "madeToOrderMinDays/MaxDays claims fail the gate" "1" "$rc"
check "...and both structured lines are reported" "2" \
  "$(grep -c 'unverified production lead time' "$out")"
check "...and the report explains the key-carried unit" "2" \
  "$(grep -c 'unit is in the key' "$out")"

# The negative control matters as much: the key match must stay narrow. A
# refundWindow or a return-window field is not a production commitment, and
# widening the pattern to "any key ending in Days" would make the gate red on
# correct data — which is how this gate got a bad name in the first place.
out="$WORK/o7c"
rc="$(run_gate "structured-madt-clean-window" "" "$out")"
check "refund/return window day fields pass" "0" "$rc"

# A structured claim obeys the same ratchet accounting as a prose one, or
# deploy.yml would freeze the moment the pattern learned to see it.
out="$WORK/o7d"
rc="$(run_gate_r "structured-madt" "catalog/shipping/default.yaml:6
catalog/shipping/default.yaml:7" "" "$out" --ratchet)"
check "ratchet tolerates the pinned structured lines" "0" "$rc"
check "...and says so" "3" "$(grep -c 'ratcheted' "$out")"

# One tolerated structured line must not excuse the other: the tolerated set is
# exact file:line, so a partial pin is still a red deploy.
out="$WORK/o7e"
rc="$(run_gate_r "structured-madt" "catalog/shipping/default.yaml:6" "" "$out" --ratchet)"
check "a partial structured pin still fails" "1" "$rc"

# ── 7f. The key match must be a CLASS, not one spelling ───────────────────
#
# The first cut of the structured pattern matched `madeToOrder(Min|Max)Days`
# and nothing else. Verified against real main on 2026-10-03 by appending
# `leadTimeMaxDays: 30` to the shipping policy: the gate still exited 0. So a
# renamed or newly-added key would have been a free pass, and the fix would have
# been a false green that LOOKED like a fix.
#
# asserted structurally below, because a probe you run once is not a test.
for key in madeToOrderMinDays madeToOrderMaxDays productionMinDays \
           processingMaxDays fulfillmentMinDays leadTimeMaxDays \
           lead_time_max_days; do
  out="$WORK/o7f-$key"
  rc="$(run_gate_key "structured-madt" "$key" "" "$out")"
  check "structured key '$key' is caught" "1" "$rc"
done

# ...and the class must not widen into data that is not a production promise.
for key in refundWindowDays restockDays estimatedTransitDays; do
  out="$WORK/o7g-$key"
  rc="$(run_gate_key "structured-madt-clean-window" "$key" "" "$out")"
  check "non-lead-time key '$key' is not flagged" "0" "$rc"
done

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

# ── 10. Ratchet mode: the deploy must not freeze, but must still bite ─────
#
# deploy.yml runs --ratchet. If that mode failed on the pre-existing line,
# every deploy on main would be blocked until a human answered STI-638, which
# is a self-inflicted outage. So ratchet mode MUST tolerate the pinned line.
#
# But tolerating one line must not become tolerating the defect class: any
# ADDITIONAL unquoted claim, or a claim on another line or another SKU, must
# still fail the deploy.
out="$WORK/o10r-posix"
rc="$(run_gate_r "unsourced-en-dash" "catalog/products/sku-001.yaml:16" "" "$out" --ratchet)"
check "ratchet mode tolerates the pinned line" "0" "$rc"
check "...and says the tolerated line is line 16" "1" "$(grep -c 'sku-001.yaml:16' "$out")"

out="$WORK/o10r-utf8"
rc="$(run_gate_r "unsourced-en-dash" "catalog/products/sku-001.yaml:16" "LC_ALL=C.UTF-8" "$out" --ratchet)"
check "ratchet mode tolerates it under C.UTF-8 too" "0" "$rc"

# A different line number on the same file is NOT the pinned defect.
out="$WORK/o10r-wrongline"
rc="$(run_gate_r "unsourced-en-dash" "catalog/products/sku-001.yaml:17" "" "$out" --ratchet)"
check "ratchet does not tolerate a different line" "1" "$rc"

# A different file is not the pinned defect either: no allowlist wildcard.
out="$WORK/o10r-other"
rc="$(run_gate_r "unsourced-other-sku" "catalog/products/sku-001.yaml:16" "" "$out" --ratchet)"
check "ratchet does not tolerate another SKU's claim" "1" "$rc"

# Two claims, only one pinned -> the unpinned one must still fail.
out="$WORK/o10r-extra"
rc="$(run_gate_r "unsourced-two-lines" "catalog/products/sku-001.yaml:16" "" "$out" --ratchet)"
check "ratchet still fails when a second claim appears" "1" "$rc"

# A reworded variant on the pinned line: the value is the same promise, so the
# pin is by line, not by text. Still tolerated — the pinned defect is still the
# one we are asking about.
out="$WORK/o10r-reworded"
rc="$(run_gate_r "single-number-months" "catalog/products/sku-001.yaml:16" "" "$out" --ratchet)"
check "ratchet tolerates the pinned line whatever it says" "0" "$rc"

# An EMPTY ratchet in deploy mode must behave like strict, so the guard cannot
# be disarmed by emptying the ratchet file without noticing.
out="$WORK/o10r-empty"
rc="$(run_gate_r "unsourced-en-dash" "" "" "$out" --ratchet)"
check "ratchet mode with empty ratchet still fails" "1" "$rc"

# ── 11. --strict-ratchet: the tolerated set may only shrink ────────────────
# A stale entry means the defect was fixed and nobody tightened the gate, so the
# next unquoted claim would pass silently. That must fail.
out="$WORK/o11stale"
rc="$(run_gate_r "no-lead-time" "catalog/products/sku-001.yaml:16" "" "$out" --ratchet --strict-ratchet)"
check "stale ratchet entry fails under --strict-ratchet" "1" "$rc"
check "...and names the stale entry" "1" "$(grep -c 'ratchet entry no longer occurs' "$out")"

# Live entry + --strict-ratchet -> clean.
out="$WORK/o11live"
rc="$(run_gate_r "unsourced-en-dash" "catalog/products/sku-001.yaml:16" "" "$out" --strict-ratchet)"
check "live ratchet entry passes --strict-ratchet" "0" "$rc"

# --strict-ratchet must not mask a real new claim either.
out="$WORK/o11extra"
rc="$(run_gate_r "unsourced-two-lines" "catalog/products/sku-001.yaml:16" "" "$out" --strict-ratchet)"
check "--strict-ratchet still fails on a second claim" "1" "$rc"

# ── 12. Bad arguments fail loudly rather than defaulting to a mode ─────────
out="$WORK/o12"
rc="$(run_gate_args "unsourced-en-dash" "--nonsense" "$out")"
check "unknown argument is rejected" "2" "$rc"

# ── 13. The app/ PDP fallback copy is in scope ─────────────────────────────
#
# app/data/products.ts is a second, hand-authored copy of the same shipping
# facts. It renders on the PDP's pre-launch fallback path (app/utils/
# pdp-product.ts), and it was OUTSIDE this gate's scan roots for the whole life
# of the gate. That made it invisible: an unquoted "Ships in 2-3 weeks." sat at
# app/data/products.ts:81 on main while the gate reported a clean catalog.
#
# The fixture's catalog copy is deliberately CLEAN, so these tests fail if the
# app/ scan root is ever removed — which is the point. A test that only asserts
# "the gate is red on a red fixture" would still pass after someone deleted the
# app/ pass and added a claim to the catalog fixture; this one asserts the
# catalog is clean AND the app copy is caught, so the two cannot drift apart.

out="$WORK/o13claim"
rc="$(run_gate "app-fallback-claim" "" "$out")"
check "unquoted claim in the app/ fallback copy fails the gate" "1" "$rc"
check "...and names app/data/products.ts" "1" \
  "$(grep -c 'ERROR: unverified production lead time in customer-facing catalog file: app/data/products.ts:44' "$out")"

# The return window in the same file must NOT be what fails it. If the app/
# pass skipped is_non_lead_window this would go red on a correct line, and a
# gate that is red for the wrong reason gets deleted.
check "...but the return window beside it is excused" "1" \
  "$(grep -c 'not a lead time (return/cancellation window.*app/data/products.ts' "$out")"

out="$WORK/o13clean"
rc="$(run_gate "app-fallback-clean" "" "$out")"
check "clean app/ fallback copy passes" "0" "$rc"

# The negative control: the catalog copy in this fixture has no claim, so if
# this ever reports a catalog hit the fixture itself drifted.
check "clean fixture reports no catalog CLAIM" "0" \
  "$(grep -c 'ERROR.*catalog/products/sku-001.yaml' "$out")"

# ── 14. The app/ copy participates in the ratchet ──────────────────────────
#
# Same accounting as the catalog copy, for the same reason: adding the scan
# root without a pin would have frozen every deploy on main, because the
# app/ occurrence is live right now.

out="$WORK/o14ratchet"
rc="$(run_gate_r "app-fallback-claim" "app/data/products.ts:44" "" "$out" --ratchet)"
check "ratchet tolerates the pinned app/ line" "0" "$rc"

# No pin at all -> deploy mode must fail, not silently pass. This is the
# freeze-the-deploy guard: the tolerated set is explicit, never inferred.
out="$WORK/o14nopin"
rc="$(run_gate_r "app-fallback-claim" "" "" "$out" --ratchet)"
check "ratchet with no app/ pin still fails" "1" "$rc"

# A stale app/ pin must fail under --strict-ratchet, so an entry cannot
# outlive its own fix.
out="$WORK/o14stale"
rc="$(run_gate_r "app-fallback-clean" "app/data/products.ts:44" "" "$out" --ratchet --strict-ratchet)"
check "stale app/ ratchet entry fails --strict-ratchet" "1" "$rc"
check "...and names the stale entry" "1" \
  "$(grep -c 'ratchet entry no longer occurs: app/data/products.ts' "$out")"

# A catalog pin must not tolerate the app/ copy. The ratchet is by exact
# file:line, never a directory or a wildcard, so fixing one copy and leaving
# the other is still a failure.
out="$WORK/o14crossfile"
rc="$(run_gate_r "app-fallback-claim" "catalog/products/sku-001.yaml:9" "" "$out" --ratchet)"
check "a catalog pin does not tolerate the app/ copy" "1" "$rc"

# ── 15. The design spec's verbatim copy transcript is in scope ─────────────
#
# DESIGN.md:604 reproduces the rendered PDP expander block line for line. It was
# outside the scan roots too, and measured on the real tree it was the one copy
# that produced a false green in the DEPLOY path: a fresh unquoted claim
# appended to DESIGN.md left --ratchet --strict-ratchet exiting 0.
#
# Like the app/ fixtures above, the catalog copy in these fixtures is
# deliberately CLEAN, so these tests fail if the spec scan root is ever removed.
# Asserting only "the gate is red on a red fixture" would keep passing after
# someone deleted the spec pass and moved the claim into the catalog fixture;
# asserting the catalog is clean AND the spec is caught is what pins the scope.

out="$WORK/o15claim"
rc="$(run_gate "spec-copy-claim" "" "$out")"
check "unquoted claim in the design spec fails the gate" "1" "$rc"
check "...and names DESIGN.md at the transcript line" "1" \
  "$(grep -c 'ERROR: unverified production lead time in customer-facing catalog file: DESIGN.md:29' "$out")"

# The return window in the same transcript must NOT be what fails it, for the
# same reason as the app/ pass: a gate red on a correct line gets deleted.
check "...but the return window beside it is excused" "1" \
  "$(grep -c 'not a lead time (return/cancellation window.*DESIGN.md' "$out")"

out="$WORK/o15clean"
rc="$(run_gate "spec-copy-clean" "" "$out")"
check "clean design-spec transcript passes" "0" "$rc"

# The negative control, and the assertion that the spec pass does not simply
# red every file that mentions shipping. Without it a too-broad scan root would
# still pass the previous check on a fixture that has no claim at all.
check "clean spec fixture reports no catalog CLAIM" "0" \
  "$(grep -c 'ERROR.*catalog/products/sku-001.yaml' "$out")"

# The spec copy is scanned in BOTH locales. A transcript is read by humans and
# by agents on whatever machine they happen to be on, which is the same
# locale trap that made the documented git grep a false green.
out="$WORK/o15posix"
rc="$(run_gate_r "spec-copy-claim" "" "LC_ALL=POSIX" "$out")"
check "spec claim fails under POSIX locale" "1" "$rc"
out="$WORK/o15utf8"
rc="$(run_gate_r "spec-copy-claim" "" "LC_ALL=C.UTF-8" "$out")"
check "spec claim fails under C.UTF-8 locale" "1" "$rc"

# ── 16. The spec copy participates in the ratchet ──────────────────────────
#
# Without a pin, adding this scan root would have failed every deploy on main,
# because the DESIGN.md occurrence is live right now. That is the freeze the
# ratchet exists to prevent, and it is why this root could not ship without an
# entry in lead-time-ratchet.txt in the same commit.

out="$WORK/o16ratchet"
rc="$(run_gate_r "spec-copy-claim" "DESIGN.md:29" "" "$out" --ratchet)"
check "ratchet tolerates the pinned spec line" "0" "$rc"

# No pin -> deploy mode must fail rather than silently pass. The tolerated set
# is explicit, never inferred.
out="$WORK/o16nopin"
rc="$(run_gate_r "spec-copy-claim" "" "" "$out" --ratchet)"
check "ratchet with no spec pin still fails" "1" "$rc"

# A stale pin must fail under --strict-ratchet, so an entry cannot outlive its
# own fix.
out="$WORK/o16stale"
rc="$(run_gate_r "spec-copy-clean" "DESIGN.md:29" "" "$out" --ratchet --strict-ratchet)"
check "stale spec ratchet entry fails --strict-ratchet" "1" "$rc"
check "...and names the stale entry" "1" \
  "$(grep -c 'ratchet entry no longer occurs: DESIGN.md' "$out")"

# A catalog pin must not tolerate the spec copy, and a spec pin must not
# tolerate the catalog copy. The ratchet is by exact file:line, so fixing one
# copy and leaving the other is still a failure — which is what forces the five
# ranges to land in one pass.
out="$WORK/o16crossfile"
rc="$(run_gate_r "spec-copy-claim" "catalog/products/sku-001.yaml:9" "" "$out" --ratchet)"
check "a catalog pin does not tolerate the spec copy" "1" "$rc"

out="$WORK/o16reverse"
rc="$(run_gate_r "spec-copy-claim" "app/data/products.ts:44" "" "$out" --ratchet)"
check "an app/ pin does not tolerate the spec copy" "1" "$rc"

# The pin must tolerate its own line on the DEPLOY path, under both locales,
# because that is the exact combination deploy.yml runs.
out="$WORK/o16utf8ok"
rc="$(run_gate_r "spec-copy-claim" "DESIGN.md:29" "LC_ALL=C.UTF-8" "$out" --ratchet --strict-ratchet)"
check "spec pin holds under --strict-ratchet in C.UTF-8" "0" "$rc"

echo
echo "lead-time-claim-gate.test.sh: $pass_count passed, $fail_count failed"
[ "$fail_count" -eq 0 ] || exit 1
echo "All lead-time-claim-gate tests passed."
