#!/usr/bin/env bash
# scripts/ci/diff-scope-gate.sh
# Fails when a PR deletes tracked files it did not declare it was deleting.
#
# STI-652. Record: docs/STI-652-account-regression-and-diff-scope-gate.md
#
# Why this gate exists. PR #207 (f29e7d8, "fix(storefront): facts in the
# expander, wordmark+cart header, no footer, cart on the token ramp") was
# reviewed and merged as a copy, navigation and chrome change. It also removed
# app/pages/account.vue, app/utils/customer-account.ts and
# src/catalog/account-order-history.test.ts — 385 lines, including the only
# test covering the page. The customer-visible result was a /account route that
# returned 404 on the live site, discovered two hours after STI-652 was closed
# as done.
#
# Nothing in CI noticed, because every gate in pr-checks.yml asserts a property
# OF the repository. The radius gate reads the built stylesheet. The token
# drift gate reads DESIGN.md and tokens.css. The mock gate reads nuxt.config.ts.
# All of them are perfectly green on a repository that has had a feature deleted
# out from under it. A gate that only checks the surviving state cannot detect a
# removal, because the removal is exactly what it cannot see.
#
# So this gate reads the DIFF. It is the only gate in the file that looks at what
# changed rather than what exists.
#
# WHY DECLARATION-BASED AND NOT "NO DELETIONS ALLOWED". Deleting dead code is
# legitimate and this repository does it on purpose — 13a2c70 (#213) removed
# the Configurator component tree, and e758025 (#151) removed a Rust-only
# release workflow. A gate that failed every deletion would be disabled within a
# week, and a disabled gate protects nothing. So the rule is narrower and
# therefore durable: a deleted path is fine when the PR says it is deleting it,
# in the PR body, in a machine-checkable way. The point is not to forbid the
# act; it is to make the act legible to the reviewer, who is the only person who
# can tell an intended deletion from an accident.
#
# WHAT THE DECLARATION IS AND IS NOT. This does not check that the declared
# files were a good idea to remove, that nothing else needed updating when they
# went, or that the deletion was correct. A reviewer who disagrees with a
# declared deletion should block it like any other decision. What this removes
# is the ability for a deletion to arrive unmentioned in a PR whose subject line
# is about something else.
#
# It also cannot detect a deletion that ships in the same PR that adds the file
# and then adds it back — that file is not deleted relative to the base, so
# there is nothing for a diff gate to see. This is a diff gate, and it has the
# reach a diff gate has.
#
# Usage:
#   diff-scope-gate.sh <base-ref> <head-ref> [pr-body-file]
#
# base-ref/head-ref default to the environment this workflow runs in
# (GITHUB_BASE_REF / GITHUB_HEAD_REF via the merge ref, and PR_BODY from
# github.event.pull_request.body). All three are positional so the whole gate is
# testable offline against fixtures.

set -euo pipefail

# Refs are resolved against the CALLER's cwd, not against this script's repo
# root. The self-test points the gate at throwaway repositories with relative
# refs (main/HEAD), and an earlier version cd'd to REPO_ROOT first — which meant
# every one of those tests silently diffed THIS repository instead and reported
# real, unrelated deletions. Four "should pass" tests failed for that reason and
# one "should fail" test failed for the wrong reason. The gate is now cwd-agnostic
# and needs no repository of its own, which also makes it usable as a pre-receive
# or local pre-push check against any checkout.
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

BASE="${1:-${BASE_REF:-}}"
HEAD="${2:-${HEAD_REF:-}}"
PR_BODY_FILE="${3:-${PR_BODY_FILE:-}}"

if [ ! -d "$REPO_ROOT/.git" ] && [ ! -f "$REPO_ROOT/.git" ]; then
  echo "ERROR: diff-scope-gate.sh is not inside a git repository."
  echo "Refusing to pass: there is no diff to read."
  exit 1
fi

if [ -z "$BASE" ] || [ -z "$HEAD" ]; then
  echo "ERROR: diff-scope-gate.sh needs a base ref and a head ref."
  echo ""
  echo "Usage: diff-scope-gate.sh <base-ref> <head-ref> [pr-body-file]"
  echo ""
  echo "In CI these come from the pull_request event. Locally:"
  echo "  ./scripts/ci/diff-scope-gate.sh origin/main HEAD"
  exit 1
fi

if ! git rev-parse --verify --quiet "$BASE^{commit}" >/dev/null; then
  echo "ERROR: base ref '$BASE' does not resolve to a commit in this clone."
  echo "Refusing to pass: an unresolvable base is not a passing base."
  exit 1
fi
if ! git rev-parse --verify --quiet "$HEAD^{commit}" >/dev/null; then
  echo "ERROR: head ref '$HEAD' does not resolve to a commit in this clone."
  echo "Refusing to pass: an unresolvable head is not a passing head."
  exit 1
fi

# Read the PR body from disk if given, else from PR_BODY. Empty is a valid
# body — a PR with no body declares nothing, which fails if it deletes.
if [ -n "$PR_BODY_FILE" ]; then
  if [ ! -f "$PR_BODY_FILE" ]; then
    echo "ERROR: PR body file not found: $PR_BODY_FILE"
    echo "Refusing to pass: a missing body is not a body with no deletions."
    exit 1
  fi
  PR_BODY="$(cat "$PR_BODY_FILE")"
else
  PR_BODY="${PR_BODY:-}"
fi

# Deletions and renames-out. --diff-filter=DR covers both: a rename that moves a
# file off the board is a deletion for every purpose this gate cares about.
# numstat is used rather than --name-status so the output is unambiguous about
# paths containing spaces.
DELETED_PATHS="$(
  git diff --no-merges --diff-filter=DR --name-only "$BASE...$HEAD" --
)"

if [ -z "$DELETED_PATHS" ]; then
  echo "Diff scope gate: no tracked files deleted between $BASE and $HEAD."
  echo "Diff scope gate: passed"
  exit 0
fi

# The declaration marker. Deliberately verbose and deliberately ugly: a natural
# sentence in a PR body must not be able to satisfy this by accident, and a
# reviewer scanning the body should be able to see the marker and know a gate is
# reading it.
MARKER='<!-- deletions:'

# Extract the declared paths from every marker line in the body. One path per
# marker line keeps the grammar trivial to parse and trivial to write by hand:
#
#   <!-- deletions: app/pages/account.vue -->
#   <!-- deletions: app/components/Footer.vue, app/components/cart/Add.vue -->
#
# Inline (non-HTML) is important. This is a comment so it does not render in the
# PR body, but it is still visible in the raw source, which is the point: the
# reviewer can see that a gate is reading it, and a deletion cannot be smuggled
# in by a reviewer who did not notice it.
DECLARED="$(
  printf '%s\n' "$PR_BODY" \
    | grep -F "$MARKER" \
    | sed -e "s|^.*${MARKER}[[:space:]]*||" -e 's|[[:space:]]*-->.*$||' \
    | tr ',' '\n' \
    | sed -e 's|^[[:space:]]*||' -e 's|[[:space:]]*$||' \
    | grep -v '^$' || true
)"

UNDECLARED=""
while IFS= read -r path; do
  [ -z "$path" ] && continue
  covered=0
  while IFS= read -r decl; do
    [ -z "$decl" ] && continue
    if [ "$path" = "$decl" ]; then covered=1; break; fi
    # A declared directory covers everything beneath it. Compared as a prefix
    # WITH a trailing slash forced on the declaration, so `app/` covers
    # `app/utils/x.ts` while `app/pages` does NOT cover the sibling
    # `app/pages-old/stray.vue`. An earlier version compared against
    # `dirname "$path"`, which only ever matched a direct parent — so the
    # documented "give the directory instead" form did not actually work for
    # anything nested more than one level deep.
    case "$path" in
      "$decl"/*) covered=1; break ;;
      "${decl%/}"/*) covered=1; break ;;
    esac
  done <<DECLS
$DECLARED
DECLS
  [ "$covered" -eq 1 ] && continue
  UNDECLARED="${UNDECLARED}${UNDECLARED:+
}${path}"
done <<EOF
$DELETED_PATHS
EOF

if [ -z "$UNDECLARED" ]; then
  count="$(printf '%s\n' "$DELETED_PATHS" | grep -c . || true)"
  echo "Diff scope gate: $count deleted file(s) between $BASE and $HEAD, all declared in the PR body."
  echo "Diff scope gate: passed"
  exit 0
fi

COUNT="$(printf '%s\n' "$UNDECLARED" | grep -c . || true)"
echo "::error::This PR deletes $COUNT tracked file(s) without declaring them in the PR body."
echo ""
printf '%s\n' "$UNDECLARED" | sed 's/^/  - /'
echo ""
echo "Every one of these is gone from the repository at HEAD:"
git diff --no-merges --diff-filter=D --stat "$BASE...$HEAD" -- \
  | sed 's/^/  /' || true
echo ""
echo "This PR's subject and body describe a different change. That mismatch is"
echo "how app/pages/account.vue, app/utils/customer-account.ts and"
echo "src/catalog/account-order-history.test.ts were removed in #207 while it"
echo "was described as a copy and chrome change, and the /account route 404ed"
echo "live hours after STI-652 shipped it."
echo ""
echo "If the deletions are intended, declare them in the PR body — one line per"
echo "path, inside an HTML comment so it does not render:"
echo ""
echo "    <!-- deletions: app/pages/account.vue -->"
echo "    <!-- deletions: app/components/Footer.vue, app/components/cart/Add.vue -->"
echo ""
echo "A parent directory may be given instead of its contents"
echo "(<!-- deletions: app/components/ --> covers everything under it)."
echo "This gate does not judge whether a declared deletion was a good idea —"
echo "that is the reviewer's call. It only makes an undeclared one impossible"
echo "to merge without someone seeing it."
echo ""
echo "Gate self-test: ./scripts/ci/diff-scope-gate.test.sh"
exit 1