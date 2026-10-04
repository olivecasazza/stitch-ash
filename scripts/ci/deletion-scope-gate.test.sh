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
GATE="$HERE/deletion-scope-gate.sh"
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
  mkdir -p "$dir/app/pages" "$dir/app/utils" "$dir/app/composables" "$dir/src/catalog" "$dir/docs"
  # .gitkeep so the empty directories are not pruned by git's empty-dir handling
  # while still leaving no real source files to trip the gate.
  : > "$dir/app/pages/.gitkeep"
  : > "$dir/app/utils/.gitkeep"
  : > "$dir/app/composables/.gitkeep"
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
# The head ref is pinned to f29e7d8 itself. Without --head the gate diffs
# f29e7d8~1 against whatever HEAD happens to be, and once the restore commit
# (090349e) re-added the three files that range contains no deletions at all —
# the assertion below then rots into a permanent FAIL that says the gate has
# stopped working, when in fact the gate is fine and the fixture drifted. That
# is exactly what happened on 2026-10-04. Pin both ends of the range so the
# fixture is hermetic.
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

  # 14b. Anti-drift: the headline must fail loudly if the pinned range stops
  # containing the deletions, rather than quietly passing on an empty diff.
  # An empty SCOPED set exits 0 under --name-only, so assert on the content.
  if printf '%s' "$OUT" | grep -q .; then
    echo "  ok   f29e7d8 fixture is hermetic — head pin yields a non-empty diff"
    PASS=$((PASS + 1))
  else
    echo "  FAIL f29e7d8 fixture drifted: pinned range reports no deletions"
    FAIL=$((FAIL + 1))
  fi
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

echo ""
echo "deletion-scope-gate self-test: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ] || exit 1
exit 0