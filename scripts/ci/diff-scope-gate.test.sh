#!/usr/bin/env bash
# scripts/ci/diff-scope-gate.test.sh
# Self-tests for diff-scope-gate.sh.
#
# STI-652. A gate that cannot detect the violation it exists for is not a gate.
# This suite exists so that diff-scope-gate.sh cannot be "fixed" into a
# permanent green by weakening it, and so the claim "this gate would have
# caught #207" is a fact rather than a comment.
#
# The load-bearing test is the last one: it runs the real gate against the real
# commit f29e7d8 with f29e7d8^ as the base and the real #207 PR body, and
# requires the gate to fail. #207 is in this repository's history, so the
# regression is replayed rather than simulated — nothing here is a hand-built
# stand-in that could drift from the shape of the actual mistake.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
GATE="${GATE_UNDER_TEST:-$REPO_ROOT/scripts/ci/diff-scope-gate.sh}"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

pass=0
fail=0

# ok <name> — expected exit 0.
ok() {
  printf '  ok   %s\n' "$1"
  pass=$((pass + 1))
}

# bad <name> <expected-substring> <output> <exit code> — expected non-zero, and
# the output had to NAME the substring, so a test cannot pass by failing for an
# unrelated reason.
bad() {
  local name="$1" want="$2" out="$3" code="$4"
  if [ "$code" -eq 0 ]; then
    printf '  FAIL %s — expected non-zero exit, got 0\n' "$name"
    printf '%s\n' "$out" | sed 's/^/         /'
    fail=$((fail + 1))
    return
  fi
  if ! printf '%s' "$out" | grep -qF -- "$want"; then
    printf '  FAIL %s — exited %s but never said %s\n' "$name" "$code" "$want"
    printf '%s\n' "$out" | sed 's/^/         /'
    fail=$((fail + 1))
    return
  fi
  printf '  ok   %s (exit %s, said %s)\n' "$name" "$code" "$want"
  pass=$((pass + 1))
}

# A throwaway repo so the git plumbing is exercised for real, not mocked.
mk_repo() {
  local dir="$1"
  mkdir -p "$dir"
  git -C "$dir" init -q -b main
  git -C "$dir" config user.email t@example.com
  git -C "$dir" config user.name Test
}

commit_all() {
  git -C "$1" add -A
  git -C "$1" commit -q -m "$2"
}

# Begin the "the PR" side of the diff. Without this, HEAD and main are the SAME
# commit, main...HEAD diffs to nothing, and every test below passes or fails
# against an empty file list — which is how this suite's first draft reported
# twelve green while proving nothing. `branch_out` is called once per repo,
# after the seed commit and before the change under test.
branch_out() {
  git -C "$1" checkout -q -b pr
}

# run <dir> <args...> — invoke the gate from inside <dir>, so relative refs
# (main/HEAD) resolve against that scratch repository and not against this one.
run() {
  local dir="$1"; shift
  ( cd "$dir" && "$GATE" "$@" )
}

echo "diff-scope-gate self-test"

# ── 1. No deletions, no declaration: passes. ──────────────────────────────────
R="$WORK/r1"; mk_repo "$R"
mkdir -p "$R/app/pages"
echo '<template><p>hi</p></template>' > "$R/app/pages/index.vue"
commit_all "$R" "seed"
echo '<template><p>bye</p></template>' > "$R/app/pages/index.vue"
branch_out "$R"
commit_all "$R" "edit in place"

out="$(run "$R" main HEAD 2>&1)" && code=0 || code=$?
if [ "$code" -eq 0 ]; then ok "a PR that deletes nothing passes"; else
  printf '  FAIL a PR that deletes nothing passes\n'; printf '%s\n' "$out" | sed 's/^/         /'; fail=$((fail + 1))
fi

# ── 2. Undeclared deletion: fails, and NAMES the path. ───────────────────────
R="$WORK/r2"; mk_repo "$R"
mkdir -p "$R/app/pages"
echo 'page' > "$R/app/pages/account.vue"
echo 'keep' > "$R/app/pages/index.vue"
commit_all "$R" "seed"
git -C "$R" rm -q -r app/pages/account.vue
branch_out "$R"
commit_all "$R" "silently drop the account page"

out="$(run "$R" main HEAD 2>&1)" && code=0 || code=$?
bad "an undeclared deletion fails and names the path" "app/pages/account.vue" "$out" "$code"

# ── 3. The same deletion, declared: passes. ──────────────────────────────────
printf 'copy and chrome only\n\n<!-- deletions: app/pages/account.vue -->\n' > "$WORK/body3"
out="$(run "$R" main HEAD "$WORK/body3" 2>&1)" && code=0 || code=$?
if [ "$code" -eq 0 ]; then ok "the same deletion, declared in the body, passes"; else
  printf '  FAIL the same deletion, declared in the body, passes\n'; printf '%s\n' "$out" | sed 's/^/         /'; fail=$((fail + 1))
fi

# ── 4. Declaring one file does NOT cover a different one. ───────────────────
# This is the loophole that would make the gate decorative: a PR that mentions
# one deletion in its body must not thereby license any other deletion.
R="$WORK/r4"; mk_repo "$R"
mkdir -p "$R/app/pages" "$R/app/utils"
echo 'page' > "$R/app/pages/account.vue"
echo 'util' > "$R/app/utils/customer-account.ts"
echo 'test' > "$R/app/utils/account.test.ts"
commit_all "$R" "seed"
git -C "$R" rm -q app/pages/account.vue app/utils/customer-account.ts
branch_out "$R"
commit_all "$R" "drop two files, declare one"

printf '<!-- deletions: app/pages/account.vue -->\n' > "$WORK/body4"
out="$(run "$R" main HEAD "$WORK/body4" 2>&1)" && code=0 || code=$?
bad "declaring one file does not cover another" "app/utils/customer-account.ts" "$out" "$code"

# ── 5. A directory declaration covers its contents. ──────────────────────────
printf '<!-- deletions: app/ -->\n' > "$WORK/body5"
out="$(run "$R" main HEAD "$WORK/body5" 2>&1)" && code=0 || code=$?
if [ "$code" -eq 0 ]; then ok "a directory declaration covers everything under it"; else
  printf '  FAIL a directory declaration covers everything under it\n'; printf '%s\n' "$out" | sed 's/^/         /'; fail=$((fail + 1))
fi

# ── 6. A comma-separated list on one marker line. ────────────────────────────
printf '<!-- deletions: app/pages/account.vue, app/utils/customer-account.ts -->\n' > "$WORK/body6"
out="$(run "$R" main HEAD "$WORK/body6" 2>&1)" && code=0 || code=$?
if [ "$code" -eq 0 ]; then ok "a comma-separated declaration list is parsed"; else
  printf '  FAIL a comma-separated declaration list is parsed\n'; printf '%s\n' "$out" | sed 's/^/         /'; fail=$((fail + 1))
fi

# ── 7. Prose that merely mentions a filename does NOT declare it. ────────────
# The gate must key on the marker, not on the substring, or a PR body that
# discusses the deletion (as #207's audit comment would) would satisfy it
# without ever declaring anything.
printf 'This PR removes app/pages/account.vue as part of a redesign.\n' > "$WORK/body7"
out="$(run "$R" main HEAD "$WORK/body7" 2>&1)" && code=0 || code=$?
bad "prose mentioning a filename is not a declaration" "app/pages/account.vue" "$out" "$code"

# ── 8. An empty PR body with a deletion fails. ───────────────────────────────
: > "$WORK/body8"
out="$(run "$R" main HEAD "$WORK/body8" 2>&1)" && code=0 || code=$?
bad "an empty PR body with an undeclared deletion fails" "::error::" "$out" "$code"

# ── 9. A missing PR body file is a failure, not a pass. ──────────────────────
out="$(run "$R" main HEAD "$WORK/no-such-body-file" 2>&1)" && code=0 || code=$?
bad "a missing PR body file fails rather than passing" "not found" "$out" "$code"

# ── 10. Unresolvable refs fail rather than silently passing. ─────────────────
out="$("$GATE" "$WORK/not-a-ref" HEAD 2>&1)" && code=0 || code=$?
bad "an unresolvable base ref fails" "does not resolve" "$out" "$code"

out="$("$GATE" main 2>&1)" && code=0 || code=$?
bad "a missing head ref fails with usage" "usage" "$(printf '%s' "$out" | tr 'A-Z' 'a-z')" "$code"

# ── 11. A declared path does not license a path merely sharing its prefix. ───
# Guards the mirror of test 5: `app/pages` must not cover `app/pages-old/x`.
R="$WORK/r11"; mk_repo "$R"
mkdir -p "$R/app/pages" "$R/app/pages-old"
echo a > "$R/app/pages/index.vue"
echo b > "$R/app/pages-old/stray.vue"
commit_all "$R" "seed"
git -C "$R" rm -q app/pages-old/stray.vue
branch_out "$R"
commit_all "$R" "drop the stray file"
printf '<!-- deletions: app/pages -->\n' > "$WORK/body11"
out="$(run "$R" main HEAD "$WORK/body11" 2>&1)" && code=0 || code=$?
bad "a sibling directory sharing a prefix is not covered" "app/pages-old/stray.vue" "$out" "$code"

# ── 12. THE REAL REGRESSION: the gate fails on the real #207. ────────────────
# f29e7d8 is in this repository's history. Replayed rather than simulated, so
# this cannot drift from the shape of the actual mistake.
if git -C "$REPO_ROOT" cat-file -e f29e7d8^{commit} 2>/dev/null; then
  body207="$WORK/body207"
  # #207's subject line, verbatim, and a body describing a copy/chrome change.
  printf 'fix(storefront): facts in the expander, wordmark+cart header, no footer, cart on the token ramp\n\nMove the PDP facts into the expander, rebuild the header as wordmark + cart, drop the footer.\n' > "$body207"

  out="$("$GATE" f29e7d8^ f29e7d8 "$body207" 2>&1)" && code=0 || code=$?
  bad "the real #207 (f29e7d8) fails the gate" "app/pages/account.vue" "$out" "$code"

  # And it must name all three files of STI-652, not just the first.
  bad "the real #207 names the util too" "app/utils/customer-account.ts" "$out" "$code"
  bad "the real #207 names the deleted test too" "src/catalog/account-order-history.test.ts" "$out" "$code"

  # Sanity in the other direction: #213 (13a2c70) DID delete files and DID
  # discuss them, and its deletion set is reported rather than silently ignored.
  if git -C "$REPO_ROOT" cat-file -e 13a2c70^{commit} 2>/dev/null; then
    printf 'delete dead Configurator\n' > "$WORK/body213"
    out="$("$GATE" 13a2c70^ 13a2c70 "$WORK/body213" 2>&1)" && code=0 || code=$?
    bad "the real #213 (13a2c70) is caught too" "Configurator.vue" "$out" "$code"
  fi
else
  printf '  SKIP real-#207 replay — f29e7d8 not in this clone\n'
fi

# ── 13. A restored file is not a deletion. ───────────────────────────────────
# The fix for STI-652 is additive on top of main. If the gate could not tell an
# addition from a deletion it would block the repair of the very thing it was
# written to protect, which would be a self-inflicted deadlock.
R="$WORK/r13"; mk_repo "$R"
mkdir -p "$R/app/pages"
echo 'page' > "$R/app/pages/index.vue"
commit_all "$R" "seed"
mkdir -p "$R/app/pages" "$R/app/utils"
echo 'restored' > "$R/app/pages/account.vue"
echo 'restored' > "$R/app/utils/customer-account.ts"
branch_out "$R"
commit_all "$R" "restore the deleted files"

out="$(run "$R" main HEAD 2>&1)" && code=0 || code=$?
if [ "$code" -eq 0 ]; then ok "restoring deleted files is not a deletion"; else
  printf '  FAIL restoring deleted files is not a deletion\n'; printf '%s\n' "$out" | sed 's/^/         /'; fail=$((fail + 1))
fi

# ── 14. A rename out of the tree counts as a deletion. ───────────────────────
R="$WORK/r14"; mk_repo "$R"
mkdir -p "$R/app/pages"
echo 'page' > "$R/app/pages/account.vue"
commit_all "$R" "seed"
mkdir -p "$R/attic"
git -C "$R" mv app/pages/account.vue attic/account.vue
branch_out "$R"
commit_all "$R" "move it to the attic"

out="$(run "$R" main HEAD 2>&1)" && code=0 || code=$?
bad "a rename out of app/ counts as a deletion" "app/pages/account.vue" "$out" "$code"

echo
printf 'diff-scope-gate self-test: %d passed, %d failed\n' "$pass" "$fail"
[ "$fail" -eq 0 ] || exit 1