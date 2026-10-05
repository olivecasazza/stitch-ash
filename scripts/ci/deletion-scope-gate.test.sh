#!/usr/bin/env bash
# scripts/ci/deletion-scope-gate.test.sh
# STI-669: proves deletion-scope-gate.sh actually fails. A guard nobody has
# seen go red is not a guard. Runs offline in a few seconds against real git
# history — including the commit that motivated the gate, f29e7d8.
#
# The headline case is `f29e7d8`: the gate is run against that commit's actual
# diff and must exit non-zero, naming app/pages/account.vue,
# app/utils/customer-account.ts and src/catalog/account-order-history.test.ts.
# If that ever goes green, the gate has stopped working and this file fails.

set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# GATE_UNDER_TEST is the convention every sibling suite in this directory already
# uses (catalog-status-ownership-gate, deploy-freshness-gate,
# deploy-dispatch-dedup) so a gate can be swapped for a stub to prove the suite
# still bites. This suite originally hardcoded the path, which meant the
# negative control could not be run: pointing it at a do-nothing stub still
# reported "25 passed, 0 failed" — the suite was unable to observe a gate that
# had stopped existing. A gate suite that cannot fail for a broken gate is
# decorative, so this is the repo convention restored, not a new feature.
GATE="${GATE_UNDER_TEST:-$HERE/deletion-scope-gate.sh}"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

PASS=0
FAIL=0

if ! git -C "$HERE/../.." rev-parse --git-dir >/dev/null 2>&1; then
  echo "ERROR: must run inside the stitch-ash git repo (the history is the fixture)." >&2
  exit 1
fi

check() { # check <name> <expected: pass|fail> <dir> [extra args...]
  local name="$1" expect="$2" dir="$3"; shift 3
  local out rc
  set +e
  out="$("$GATE" --repo "$dir" --manifest "$dir/manifest.txt" "$@" 2>&1)"; rc=$?
  set -e
  if { [ "$expect" = pass ] && [ "$rc" -eq 0 ]; } || { [ "$expect" = fail ] && [ "$rc" -ne 0 ]; }; then
    echo "  ok   $name (expected $expect, got exit $rc)"
    PASS=$((PASS + 1))
  else
    echo "  FAIL $name (expected $expect, got exit $rc)"
    printf '%s\n' "$out" | sed 's/^/         | /'
    FAIL=$((FAIL + 1))
  fi
  LAST_OUT="$out"
}

expect_out() { # expect_out <needle>
  local needle="$1"
  if printf '%s' "$LAST_OUT" | grep -qF -- "$needle"; then
    echo "  ok   output names '$needle'"
    PASS=$((PASS + 1))
  else
    echo "  FAIL output does not name '$needle'"
    printf '%s\n' "$LAST_OUT" | sed 's/^/         | /'
    FAIL=$((FAIL + 1))
  fi
}

# Build a throwaway repo whose HEAD deletes scoped files, so each case is an
# isolated commit rather than the real history.
mkrepo() { # mkrepo <dir>
  local dir="$1"
  mkdir -p "$dir/app/pages" "$dir/app/utils" "$dir/app/composables" "$dir/app/components" "$dir/src/catalog" "$dir/docs"
  # .gitkeep so the empty directories are not pruned by git's empty-dir handling
  # while still leaving no real source files to trip the gate.
  : > "$dir/app/pages/.gitkeep"
  : > "$dir/app/utils/.gitkeep"
  : > "$dir/app/composables/.gitkeep"
  : > "$dir/app/components/.gitkeep"
  : > "$dir/src/catalog/.gitkeep"
  : > "$dir/docs/.gitkeep"
  git -C "$dir" init -q -b main
  git -C "$dir" config user.email t@example.com
  git -C "$dir" config user.name Test
  echo "start" > "$dir/README.md"
  git -C "$dir" add -A >/dev/null
  git -C "$dir" commit -qm "base"
}

# commit_add writes files and commits them, so a later commit_del produces a
# real D entry in `git diff --diff-filter=D`.
commit_add() { # commit_add <dir> <message> <path> <contents>
  local dir="$1" msg="$2" path="$3" body="$4"
  mkdir -p "$(dirname "$dir/$path")"
  printf '%s\n' "$body" > "$dir/$path"
  git -C "$dir" add -A >/dev/null
  git -C "$dir" commit -qm "$msg"
}

# commit_del deletes already-committed paths and commits the removal.
commit_del() { # commit_del <dir> <message> <paths...>
  local dir="$1" msg="$2"; shift 2
  local p
  for p in "$@"; do git -C "$dir" rm -q --ignore-unmatch "$p" >/dev/null 2>&1 || rm -f "$dir/$p"; done
  git -C "$dir" commit -qm "$msg" --allow-empty >/dev/null
}

echo "deletion-scope-gate self-test (STI-669)"

# --- 1. A deletion with an empty manifest FAILS. -------------------------
D="$TMP/case1"; mkrepo "$D"; : > "$D/manifest.txt"
commit_add "$D" "ship the account surface" app/pages/account.vue "page"
commit_add "$D" "ship the account util" app/utils/customer-account.ts "util"
commit_del "$D" "delete page and util" app/pages/account.vue app/utils/customer-account.ts
check "undeclared app/pages + app/utils deletion fails" fail "$D" --base HEAD~1
expect_out "app/pages/account.vue"
expect_out "app/utils/customer-account.ts"

# --- 2. AC2: a title/body mismatch cannot authorise anything. -------------
# The same deletion with a PR body that cheerfully describes it in full scope
# must still fail, because the gate never reads the description.
D="$TMP/case2"; mkrepo "$D"; : > "$D/manifest.txt"
commit_add "$D" "ship a composable" app/composables/useThing.ts "composable"
# The commit message describes the deletion in full, in-scope language. The
# gate never reads it, so it must still fail.
commit_del "$D" "fix(storefront): rewrite the account page and its utility" app/composables/useThing.ts
check "in-scope deletion described in the commit title still fails" fail "$D" --base HEAD~1

# --- 3. A declared, signed-off deletion PASSES. ---------------------------
D="$TMP/case3"; mkrepo "$D"
commit_add "$D" "ship both pages" app/pages/old-thing.vue "old"
commit_add "$D" "ship the replacement" app/pages/new-thing.vue "new"
commit_del "$D" "replace old with new" app/pages/old-thing.vue
cat > "$D/manifest.txt" <<'MF'
app/pages/old-thing.vue
# issue: STI-123
# sign-off: storefront-lead
# reason: replaced by app/pages/new-thing.vue
MF
check "declared + signed-off deletion passes" pass "$D" --base HEAD~1

# --- 4. A declaration missing '# sign-off:' FAILS (no silent default). ----
D="$TMP/case4"; mkrepo "$D"
commit_add "$D" "ship a page" app/pages/old-thing.vue "old"
commit_del "$D" "delete page" app/pages/old-thing.vue
cat > "$D/manifest.txt" <<'MF'
app/pages/old-thing.vue
# issue: STI-123
MF
check "declaration without sign-off fails" fail "$D" --base HEAD~1
expect_out "sign-off"

# --- 5. A declaration missing '# issue:' FAILS. ---------------------------
D="$TMP/case5"; mkrepo "$D"
commit_add "$D" "ship a page" app/pages/old-thing.vue "old"
commit_del "$D" "delete page" app/pages/old-thing.vue
cat > "$D/manifest.txt" <<'MF'
app/pages/old-thing.vue
# sign-off: storefront-lead
MF
check "declaration without issue fails" fail "$D" --base HEAD~1
expect_out "issue"

# --- 6. A bogus issue id FAILS. -----------------------------------------
D="$TMP/case6"; mkrepo "$D"
commit_add "$D" "ship a page" app/pages/old-thing.vue "old"
commit_del "$D" "delete page" app/pages/old-thing.vue
cat > "$D/manifest.txt" <<'MF'
app/pages/old-thing.vue
# issue: probably-fine
# sign-off: storefront-lead
MF
check "non-STI issue id fails" fail "$D" --base HEAD~1

# --- 7. AC3: a test deleted with no replacement FAILS. -------------------
D="$TMP/case7"; mkrepo "$D"
commit_add "$D" "ship a test" src/catalog/thing.test.ts "test"
commit_del "$D" "delete test" src/catalog/thing.test.ts
cat > "$D/manifest.txt" <<'MF'
src/catalog/thing.test.ts
# issue: STI-123
# sign-off: storefront-lead
# reason: no longer needed
MF
check "test deletion with no replacement fails (AC3)" fail "$D" --base HEAD~1
expect_out "replacement"

# --- 8. A test deletion naming a replacement that does NOT exist FAILS. ---
D="$TMP/case8"; mkrepo "$D"
commit_add "$D" "ship a test" src/catalog/thing.test.ts "test"
commit_del "$D" "delete test" src/catalog/thing.test.ts
cat > "$D/manifest.txt" <<'MF'
src/catalog/thing.test.ts
# issue: STI-123
# sign-off: storefront-lead
# replacement: src/catalog/nope.test.ts
MF
check "test deletion with a missing replacement fails" fail "$D" --base HEAD~1
expect_out "does not exist at HEAD"

# --- 9. A test deletion with a real surviving replacement PASSES. ---------
D="$TMP/case9"; mkrepo "$D"
commit_add "$D" "ship the old test" src/catalog/old.test.ts "old"
commit_add "$D" "ship the new test" src/catalog/new.test.ts "new"
commit_del "$D" "delete old test, keep new" src/catalog/old.test.ts
cat > "$D/manifest.txt" <<'MF'
src/catalog/old.test.ts
# issue: STI-123
# sign-off: storefront-lead
# reason: folded into the new test
# replacement: src/catalog/new.test.ts
MF
check "test deletion with a surviving replacement passes" pass "$D" --base HEAD~1

# --- 10. A deletion OUTSIDE the guarded surface does not need a manifest. -
D="$TMP/case10"; mkrepo "$D"
commit_add "$D" "ship a doc" docs/obsolete.md "doc"
commit_del "$D" "drop stale doc" docs/obsolete.md
: > "$D/manifest.txt"
check "deletion outside guarded surface passes undeclared" pass "$D" --base HEAD~1

# --- 11. No deletions at all passes. -------------------------------------
# The base is the fixture's own root commit, so the diff sees one added file
# and zero deletions.
D="$TMP/case11"; mkrepo "$D"
: > "$D/manifest.txt"
check "PR with no deletions passes" pass "$D" --base "$(git -C "$D" rev-list --max-parents=0 HEAD)"

# --- 12. A modified (not deleted) file is not a deletion. ----------------
D="$TMP/case12"; mkrepo "$D"
commit_add "$D" "add page" app/pages/index.vue "x"
commit_add "$D" "edit page" app/pages/index.vue "x edited"
: > "$D/manifest.txt"
check "modified page is not treated as a deletion" pass "$D" --base HEAD~1

# --- 13. A renamed-away page IS a deletion (git sees R, gate sees D). ----
D="$TMP/case13"; mkrepo "$D"
commit_add "$D" "add page" app/pages/index.vue "x"
git -C "$D" mv app/pages/index.vue app/pages/home.vue
git -C "$D" commit -qm "rename page"
: > "$D/manifest.txt"
check "rename away from the guarded surface fails as a deletion" fail "$D" --base HEAD~1

# --- 14. THE HEADLINE: f29e7d8's real diff must fail. --------------------
if git -C "$HERE/../.." cat-file -e f29e7d8^{commit} 2>/dev/null; then
  ROOT="$HERE/../.."
  set +e
  OUT="$("$GATE" --manifest "$ROOT/scripts/ci/deletion-scope-manifest.txt" \
        --base f29e7d8~1 --head f29e7d8 --name-only 2>&1)"
  RC=$?
  set -e
  # --name-only on that base lists the deletions in the real commit.
  if printf '%s' "$OUT" | grep -qx "app/pages/account.vue" \
     && printf '%s' "$OUT" | grep -qx "app/utils/customer-account.ts" \
     && printf '%s' "$OUT" | grep -qx "src/catalog/account-order-history.test.ts"; then
    echo "  ok   f29e7d8's diff reports all three out-of-scope deletions"
    PASS=$((PASS + 1))
  else
    echo "  FAIL f29e7d8's diff did not report all three deletions"
    printf '%s\n' "$OUT" | sed 's/^/         | /'
    FAIL=$((FAIL + 1))
  fi

  # And the verdict on that same diff must be non-zero.
  set +e
  OUT2="$("$GATE" --manifest "$ROOT/scripts/ci/deletion-scope-manifest.txt" \
         --base f29e7d8~1 --head f29e7d8 2>&1)"; RC2=$?
  set -e
  if [ "$RC2" -ne 0 ]; then
    echo "  ok   gate FAILS on f29e7d8's diff (exit $RC2)"
    PASS=$((PASS + 1))
  else
    echo "  FAIL gate passed on f29e7d8's diff — the gate has stopped working"
    printf '%s\n' "$OUT2" | sed 's/^/         | /'
    FAIL=$((FAIL + 1))
  fi
  LAST_OUT="$OUT2"
  expect_out "app/pages/account.vue"
  expect_out "app/utils/customer-account.ts"
  expect_out "src/catalog/account-order-history.test.ts"
else
  echo "  skip f29e7d8 not present in this clone (shallow or partial history)"
fi

# --- 15. The real manifest must declare nothing (safe default). ----------
# Fails if any line is a real path declaration rather than a comment or blank.
ROOT="$(cd "$HERE/../.." && pwd)"
if grep -qE '^[[:space:]]*[A-Za-z0-9]' "$ROOT/scripts/ci/deletion-scope-manifest.txt"; then
  echo "  FAIL committed manifest declares a deletion — the safe default is gone"
  grep -nE '^[[:space:]]*[A-Za-z0-9]' "$ROOT/scripts/ci/deletion-scope-manifest.txt" | sed 's/^/         | /'
  FAIL=$((FAIL + 1))
else
  echo "  ok   committed manifest declares no deletions"
  PASS=$((PASS + 1))
fi

# --- 16. AC3, second half: GUTTING a test fails. ------------------------
# Deleting a test is caught by the --diff-filter=D path. Emptying one while
# leaving the file is not: the path still exists, so no deletion is reported
# and the gate used to pass. Measured against this repo's own history at
# fe27fcb, replacing src/catalog/account-order-history.test.ts's body with a
# single `assert.ok(true)`:
#
#   src/catalog/account-order-history.test.ts | 146 +---------------
#   4 insertions(+), 143 deletions(-)
#   pnpm catalog:test -> tests 220, pass 220, fail 0  (was 227)
#   deletion-scope-gate.sh -> exit 0                 (passed, wrongly)
#
# These cases keep that from coming back silently.
commit_gut() { # commit_gut <dir> <message> <path> <keep-body>
  local dir="$1" msg="$2" path="$3" body="$4"
  printf '%s\n' "$body" > "$dir/$path"
  git -C "$dir" add -A >/dev/null
  git -C "$dir" commit -qm "$msg"
}

RICH_TEST="import { test } from 'node:test'
import assert from 'node:assert/strict'
test('a', () => { assert.equal(1, 1) })
test('b', () => { assert.equal(2, 2) })
test('c', () => { assert.equal(3, 3) })"

D="$TMP/case16"; mkrepo "$D"; : > "$D/manifest.txt"
commit_add "$D" "ship a real test" src/catalog/thing.test.ts "$RICH_TEST"
commit_gut "$D" "refactor(tests): tidy the setup" src/catalog/thing.test.ts \
  "import { test } from 'node:test'
import assert from 'node:assert/strict'
test('placeholder', () => { assert.ok(true) })"
check "gutted test (path survives, assertions gone) fails" fail "$D" --base HEAD~1
expect_out "GUTTED"

# The gutting check must not be reachable only via the deletion path: this is
# the same case with an empty manifest and no deletions anywhere at all.
D="$TMP/case17"; mkrepo "$D"; : > "$D/manifest.txt"
commit_add "$D" "ship two real tests" src/catalog/thing.test.ts "$RICH_TEST"
commit_gut "$D" "chore: drop assertions" src/catalog/thing.test.ts \
  "import { test } from 'node:test'
import assert from 'node:assert/strict'
test('placeholder', () => { assert.ok(true) })"
check "gutted test with zero deletions anywhere still fails" fail "$D" --base HEAD~1
expect_out "assertions fell 3 -> 1"

# --- 17. Strengthening a test PASSES. ------------------------------------
# The check must be "assertions went down", not "the file changed", or every
# honest coverage improvement would be blocked.
D="$TMP/case18"; mkrepo "$D"; : > "$D/manifest.txt"
commit_add "$D" "ship a test" src/catalog/thing.test.ts "$RICH_TEST"
commit_gut "$D" "test: cover another case" src/catalog/thing.test.ts "$RICH_TEST
test('d', () => { assert.equal(4, 4) })"
check "test with MORE assertions passes" pass "$D" --base HEAD~1

# --- 18. A pure refactor inside a test PASSES. ---------------------------
# Reformatting, renaming locals and rewording titles change no assertion count,
# so they must not trip the gate. This is the false-positive guard.
D="$TMP/case19"; mkrepo "$D"; : > "$D/manifest.txt"
commit_add "$D" "ship a test" src/catalog/thing.test.ts "$RICH_TEST"
commit_gut "$D" "refactor(test): reword titles and rename locals" src/catalog/thing.test.ts \
  "import { test } from 'node:test'
import assert from 'node:assert/strict'
test('first case', () => { assert.equal(1, 1) })
test('second case', () => { assert.equal(2, 2) })
test('third case', () => { assert.equal(3, 3) })"
check "test refactor that keeps every assertion passes" pass "$D" --base HEAD~1

# --- 19. A NEW test file is not a gutting. ------------------------------
# Adding coverage must never fail the gate.
D="$TMP/case20"; mkrepo "$D"; : > "$D/manifest.txt"
commit_add "$D" "ship a test" src/catalog/thing.test.ts "$RICH_TEST"
commit_add "$D" "test: add another suite" src/catalog/extra.test.ts \
  "import { test } from 'node:test'
import assert from 'node:assert/strict'
test('new', () => { assert.equal(9, 9) })"
check "newly added test file passes" pass "$D" --base HEAD~1

# --- 20. Gutting is checked repo-wide, NOT just the guarded prefixes. -------
#
# This row used to read the opposite -- "gutted test outside the guarded
# surface passes this gate". It was the specification of the bug, not of the
# contract. The gate's header comment promised to fail a PR that
# "removes/gutts a test", while gutting_failures() filtered on `in_scope` --
# so a test outside app/pages, app/utils, app/composables and src/catalog
# could be emptied without the gate noticing. qa-verifier raised that as F1 on
# STI-672 and measured scripts/deterministic-asset-manifest.test.mjs going
# 46 -> 0 assertions with an exit code of 0.
#
# Losing the assertions is the loss. Deleting a test out there is still not
# this gate's business, which is why only the gutting half widened.
D="$TMP/case21"; mkrepo "$D"; : > "$D/manifest.txt"
commit_add "$D" "ship a test outside the guarded surface" docs/notes.test.ts "$RICH_TEST"
commit_gut "$D" "chore: trim it" docs/notes.test.ts \
  "import { test } from 'node:test'
import assert from 'node:assert/strict'
test('placeholder', () => { assert.ok(true) })"
check "gutted test outside the guarded surface FAILS (F1)" fail "$D" --base HEAD~1
expect_out "docs/notes.test.ts"
expect_out "GUTTED"

# ...but DELETING a test outside the guarded surface still passes undeclared.
# Widening the gutting half must not quietly widen the deletion half.
D="$TMP/case21b"; mkrepo "$D"; : > "$D/manifest.txt"
commit_add "$D" "ship a test outside the guarded surface" docs/notes.test.ts "$RICH_TEST"
commit_del "$D" "chore: drop it" docs/notes.test.ts
check "deleted test outside the guarded surface still passes undeclared" pass "$D" --base HEAD~1

# An out-of-scope test that GAINS assertions is still not a failure.
D="$TMP/case21c"; mkrepo "$D"; : > "$D/manifest.txt"
commit_add "$D" "ship a test outside the guarded surface" docs/notes.test.ts "$RICH_TEST"
commit_add "$D" "test: more" docs/notes.test.ts \
  "$RICH_TEST
import assert from 'node:assert/strict'
test('extra', () => { assert.equal(1, 1); assert.equal(2, 2) })"
check "out-of-scope test with more assertions passes" pass "$D" --base HEAD~1

# A declared '# baseline:' override works outside the guarded surface too,
# otherwise a legitimate reduction under scripts/ has no honest route to land.
D="$TMP/case21d"; mkrepo "$D"
printf '%s\n' \
  'docs/notes.test.ts' \
  '# issue: STI-669' \
  '# sign-off: storefront-lead' \
  '# reason: intentional reduction outside the guarded surface' \
  '# baseline: 1' > "$D/manifest.txt"
commit_add "$D" "ship a test outside the guarded surface" docs/notes.test.ts "$RICH_TEST"
commit_gut "$D" "chore: trim it" docs/notes.test.ts \
  "import { test } from 'node:test'
import assert from 'node:assert/strict'
test('placeholder', () => { assert.ok(true) })"
check "out-of-scope reduction with a declared baseline passes" pass "$D" --base HEAD~1

# --- 21. The '# baseline:' override HONOURS an intentional reduction. -----
# The gate's own failure message instructs an author to declare a deliberate
# reduction with a '# baseline:' override. An override that is documented but
# unimplemented is worse than none: the only ways left to land a legitimate
# reduction are to lie to the test suite or to weaken the gate, and this issue
# exists because coverage was lost silently. It must actually work.
GUTTED_TEST="import { test } from 'node:test'
import assert from 'node:assert/strict'
test('placeholder', () => { assert.ok(true) })"

D="$TMP/case22"; mkrepo "$D"
commit_add "$D" "ship a real test" src/catalog/thing.test.ts "$RICH_TEST"
commit_gut "$D" "refactor(tests): fold three cases into one" src/catalog/thing.test.ts "$GUTTED_TEST"
cat > "$D/manifest.txt" <<'MANIFEST'
src/catalog/thing.test.ts
# issue: STI-669
# sign-off: storefront-lead
# reason: three overlapping cases collapse into one equivalent case
# baseline: 1
MANIFEST
git -C "$D" add -A >/dev/null && git -C "$D" commit -qm "test: declare the reduction"
check "declared '# baseline:' override honours an intentional reduction" pass "$D" --base HEAD~2

# The override must still be a real gate, not a rubber stamp: it is compared
# against the tree, so a baseline that understates the surviving count passes,
# and one that overstates it fails.
D="$TMP/case23"; mkrepo "$D"
commit_add "$D" "ship a real test" src/catalog/thing.test.ts "$RICH_TEST"
commit_gut "$D" "refactor(tests): fold three cases into one" src/catalog/thing.test.ts "$GUTTED_TEST"
cat > "$D/manifest.txt" <<'MANIFEST'
src/catalog/thing.test.ts
# issue: STI-669
# sign-off: storefront-lead
# reason: three overlapping cases collapse into one equivalent case
# baseline: 40
MANIFEST
git -C "$D" add -A >/dev/null && git -C "$D" commit -qm "test: declare an overstated reduction"
check "baseline above the surviving assertion count still fails" fail "$D" --base HEAD~2
expect_out "claims at least 40 assertions"

# --- 22. An INCOMPLETE '# baseline:' entry is not an override. -------------
# An override anyone can write, for any number, with no review trail, is just
# a deletion of the check. Each of these must stay a failure rather than
# quietly becoming a free pass.
for bad_case in "no-signoff:# issue: STI-669
# reason: because
# baseline: 1" \
              "no-issue:# sign-off: storefront-lead
# reason: because
# baseline: 1" \
              "no-reason:# issue: STI-669
# sign-off: storefront-lead
# baseline: 1" \
              "not-a-number:# issue: STI-669
# sign-off: storefront-lead
# reason: because
# baseline: lots"; do
  label="${bad_case%%:*}"
  body="${bad_case#*:}"
  D="$TMP/case24-$label"; mkrepo "$D"
  commit_add "$D" "ship a real test" src/catalog/thing.test.ts "$RICH_TEST"
  commit_gut "$D" "refactor(tests): fold three cases into one" src/catalog/thing.test.ts "$GUTTED_TEST"
  printf 'src/catalog/thing.test.ts\n%s\n' "$body" > "$D/manifest.txt"
  git -C "$D" add -A >/dev/null && git -C "$D" commit -qm "test: declare the reduction"
  check "incomplete '# baseline:' override ($label) still fails" fail "$D" --base HEAD~2
done

# The override rows assert only the exit code, so assert the reason is named
# too: a bare failure would leave an author unable to tell which half of the
# signature to fix.
D="$TMP/case24-echo"; mkrepo "$D"
commit_add "$D" "ship a real test" src/catalog/thing.test.ts "$RICH_TEST"
commit_gut "$D" "refactor(tests): fold three cases into one" src/catalog/thing.test.ts "$GUTTED_TEST"
printf 'src/catalog/thing.test.ts\n# issue: STI-669\n# reason: because\n# baseline: 1\n' > "$D/manifest.txt"
git -C "$D" add -A >/dev/null && git -C "$D" commit -qm "test: declare the reduction"
check "incomplete '# baseline:' override (no-signoff) still fails" fail "$D" --base HEAD~2
expect_out "'# sign-off:"
expect_out "'# baseline:' override needs"

# --- 23. STI-682: app/components/ is inside the guarded surface. ----------
#
# The gate was written for a 385-line diff that deleted three files. It stopped
# one directory short of the chrome: `git rm app/components/Header.vue` — the
# component that carries the nav — reported nothing and exited 0, so the
# deletion-scope check that was supposed to make the STI-633 class of loss
# impossible could not see a header being removed outright. app/components is
# where customer-facing chrome lives (header nav, footer, cart, product card),
# so it is guarded on the same terms as the rest of the surface.
HEADER_FULL="<template>
  <header>
    <NuxtLink to=\"/\">Stitch and Ash</NuxtLink>
    <NuxtLink to=\"/products\">Shop</NuxtLink>
    <NuxtLink to=\"/#statement\">Story</NuxtLink>
    <NuxtLink to=\"/account\">Account</NuxtLink>
    <span class=\"cart-count\">02</span>
  </header>
</template>"

D="$TMP/case25"; mkrepo "$D"; : > "$D/manifest.txt"
commit_add "$D" "ship the header" app/components/Header.vue "$HEADER_FULL"
commit_del "$D" "drop the header" app/components/Header.vue
check "undeclared app/components deletion fails" fail "$D" --base HEAD~1
expect_out "app/components/Header.vue"

# A component renamed out of app/components/ is the same removal, so
# --no-renames must keep reporting it as a deletion here too. Without this the
# new prefix would only catch `git rm`, and `git mv` would walk straight
# through it.
D="$TMP/case26"; mkrepo "$D"; : > "$D/manifest.txt"
commit_add "$D" "ship the header" app/components/Header.vue "$HEADER_FULL"
git -C "$D" mv app/components/Header.vue app/components/SiteHeader.vue
git -C "$D" commit -qm "rename the header out of the chrome dir"
check "rename within app/components fails on the old path" fail "$D" --base HEAD~1
expect_out "app/components/Header.vue"

# And the declaration path must work here too, or the new prefix is a gate
# nobody can ever satisfy.
D="$TMP/case27"; mkrepo "$D"
commit_add "$D" "ship the header" app/components/Header.vue "$HEADER_FULL"
commit_add "$D" "ship its replacement" app/components/SiteHeader.vue "$HEADER_FULL"
commit_del "$D" "rename the header" app/components/Header.vue
cat > "$D/manifest.txt" <<'MF'
app/components/Header.vue
# issue: STI-123
# sign-off: storefront-lead
# reason: renamed to app/components/SiteHeader.vue
MF
check "declared + signed-off app/components deletion passes" pass "$D" --base HEAD~1

# --- 24. STI-682: the boundary is asserted, not assumed. ------------------
#
# The honest case from the issue: a diff that strips ONE line out of a
# component that still exists. `--diff-filter=D` emits nothing, so the gate
# cannot see it, and no prefix list ever will — the file was never deleted.
# This is the STI-633 nav loss in miniature: remove <NuxtLink to="/account">
# from Header.vue and CI stays green.
#
# The temptation is to write a fixture that asserts the gate CATCHES it. That
# fixture would fail today and pass only if the gate gained a different kind of
# check, so it would either encode a check the gate does not perform or be
# deleted the first time someone got tired of a red suite. Neither is a guard.
#
# So this case asserts the truth instead: the gate passes, and the pass is only
# acceptable while the script NAMES the gap. Case 1 as originally posed cannot
# be represented by a fixture the gate can see; what can be represented is the
# boundary statement, and that is what is asserted here. Deleting the
# COVERAGE BOUNDARY note without adding a check fails this suite.
D="$TMP/case28"; mkrepo "$D"; : > "$D/manifest.txt"
commit_add "$D" "ship the header" app/components/Header.vue "$HEADER_FULL"
commit_gut "$D" "refactor(header): drop the account link" app/components/Header.vue \
  "<template>
  <header>
    <NuxtLink to=\"/\">Stitch and Ash</NuxtLink>
    <NuxtLink to=\"/products\">Shop</NuxtLink>
    <NuxtLink to=\"/#statement\">Story</NuxtLink>
    <span class=\"cart-count\">02</span>
  </header>
</template>"
check "in-place removal from a surviving component is NOT a deletion (documented boundary)" pass "$D" --base HEAD~1

if grep -q "COVERAGE BOUNDARY (STI-682)" "$GATE"; then
  echo "  ok   gate still declares its app/components coverage boundary"
  PASS=$((PASS + 1))
else
  echo "  FAIL gate lost its 'COVERAGE BOUNDARY (STI-682)' note without gaining a check"
  echo "         Either keep the honest boundary, or add the in-place check this case"
  echo "         stands in for, and replace this assertion with one that exercises it."
  FAIL=$((FAIL + 1))
fi

# The same boundary has to be in the failure message, not only the header: an
# author who trips the gate has to learn what the gate cannot see from the same
# place they are told how to fix it.
D="$TMP/case29"; mkrepo "$D"; : > "$D/manifest.txt"
commit_add "$D" "ship the header" app/components/Header.vue "$HEADER_FULL"
commit_del "$D" "drop the header" app/components/Header.vue
check "boundary restated for the failing author" fail "$D" --base HEAD~1
expect_out "KNOWN BOUNDARY (STI-682)"

echo ""
echo "deletion-scope-gate self-test: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ] || exit 1
exit 0