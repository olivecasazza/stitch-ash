#!/usr/bin/env bash
# scripts/ci/deletion-scope-gate.sh
# STI-669: fails a PR that deletes storefront surface (app/pages, app/utils,
# app/composables, src/catalog) or removes/gutts a test without declaring it.
#
# Why this gate exists. PR #207 (f29e7d8, "fix(storefront): facts in the
# expander, wordmark+cart header, no footer, cart on the token ramp") carried
# three deletions that had nothing to do with its stated scope:
#
#   app/pages/account.vue                     165 -----
#   app/utils/customer-account.ts              75 -----
#   src/catalog/account-order-history.test.ts 145 -----
#
# That silently killed two shipped, verified-live features (STI-633, STI-652)
# and CI was green the whole way. Nobody wrote bad code; the diff simply carried
# removals through a large chrome PR and no check asked what was removed. This
# gate is that check.
#
# Why it keys off git, not the PR body (AC2). A title/body mismatch must not be
# able to authorise a deletion, so the sole source of truth is
# `git diff --diff-filter=D --name-only` against the merge base — the actual
# deleted paths. The description is never parsed.
#
# How a deletion becomes legal (AC2, AC3). A deleted path may be declared in
# scripts/ci/deletion-scope-manifest.txt, one path per line, with a required
# `# issue: STI-nnn` and `# sign-off: <name>` line. Without both, the gate
# fails. Test deletions additionally require a replacement assertion: the
# manifest entry must point at a surviving test that covers the same surface
# (`# replacement:`), because deleting a test that has no replacement is a
# silent coverage loss. An empty manifest declares nothing, which is the
# default — so the silent path is closed.
#
# Usage:
#   deletion-scope-gate.sh [--base <ref>] [--head <ref>] [--manifest <path>]
#                          [--repo <dir>] [--name-only]
#
#   --base <ref>     diff against this ref (default: auto-detected merge base
#                    with origin/main, falling back to the CI-provided base sha)
#   --head <ref>     the tip to diff TO (default: HEAD). This exists so the
#                    self-test can replay a historical commit such as f29e7d8
#                    without checking it out — see the note at BASE_SHA below.
#   --manifest <p>   manifest to read (default: scripts/ci/deletion-scope-manifest.txt)
#   --repo <dir>     repository to inspect (default: the repo this script lives
#                    in). The self-test uses it to run the gate against
#                    throwaway fixture repos.
#   --name-only      print only the deleted paths that are in scope, one per
#                    line, and exit 0. Used by the CI job's reporting step and
#                    by callers that want the raw finding, not the verdict.

set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="${HERE}/../.."
BASE=""
HEAD_REF="HEAD"
MANIFEST=""
REPO_ROOT=""
NAME_ONLY=0

while [ $# -gt 0 ]; do
  case "$1" in
    --base) BASE="${2:?--base needs a ref}"; shift 2 ;;
    --head) HEAD_REF="${2:?--head needs a ref}"; shift 2 ;;
    --manifest) MANIFEST="${2:?--manifest needs a path}"; shift 2 ;;
    --repo) REPO="${2:?--repo needs a directory}"; shift 2 ;;
    --name-only) NAME_ONLY=1; shift ;;
    -h|--help) sed -n '2,56p' "$0"; exit 0 ;;
    *) echo "ERROR: unknown argument: $1" >&2; exit 2 ;;
  esac
done

cd "$REPO"
REPO_ROOT="$(pwd)"
git rev-parse --git-dir >/dev/null 2>&1 || {
  echo "ERROR: deletion-scope-gate: not a git repository: $REPO_ROOT" >&2
  exit 1
}
# Default manifest resolves relative to the repo under test, so a fixture repo
# with no manifest of its own still gets this repo's (empty) declaration list.
MANIFEST="${MANIFEST:-$REPO_ROOT/scripts/ci/deletion-scope-manifest.txt}"

# --- The guarded surface. Deleting any of these needs a manifest entry. ---
SCOPE_PREFIXES=(
  "app/pages/"
  "app/utils/"
  "app/composables/"
  "src/catalog/"
)

# Resolve the base. CI sets GITHUB_BASE_REF on pull_request; locally origin/main
# is the honest comparison. If neither resolves, refuse to pass: a gate that
# cannot see the diff is not a green gate.
if [ -z "$BASE" ]; then
  BASE="${GITHUB_BASE_REF:-}"
fi
if [ -z "$BASE" ] || ! git rev-parse --verify --quiet "$BASE^{commit}" >/dev/null 2>&1; then
  if git rev-parse --verify --quiet origin/main >/dev/null 2>&1; then
    BASE="origin/main"
  elif [ -n "${GITHUB_EVENT_PATH:-}" ] && [ -f "${GITHUB_EVENT_PATH}" ]; then
    BASE="$(python3 -c 'import json,os,sys
try:
    d=json.load(open(os.environ["GITHUB_EVENT_PATH"]))
    print(d.get("pull_request",{}).get("base",{}).get("sha",""))
except Exception:
    print("")' 2>/dev/null || true)"
  fi
fi

if [ -z "$BASE" ] || ! git rev-parse --verify --quiet "$BASE^{commit}" >/dev/null 2>&1; then
  echo "ERROR: deletion-scope-gate: cannot resolve a base ref to diff against."
  echo "Tried: --base, GITHUB_BASE_REF, origin/main, the pull_request base sha."
  echo "Refusing to pass: a gate that cannot see the diff is not a passing gate."
  exit 1
fi

# The head must resolve too, for the same reason: an unresolvable tip means the
# diff would silently compare against something other than what was asked for.
if ! git rev-parse --verify --quiet "$HEAD_REF^{commit}" >/dev/null 2>&1; then
  echo "ERROR: deletion-scope-gate: cannot resolve head ref '$HEAD_REF'."
  echo "Refusing to pass: a gate that cannot see the diff is not a passing gate."
  exit 1
fi

BASE_SHA="$(git merge-base "$BASE" "$HEAD_REF" 2>/dev/null || git rev-parse "$BASE")"

# --- The actual deleted paths. This is the only input that matters (AC2). ---
# --no-renames: a git rename out of the guarded surface is a removal of a
# shipped page as much as an unlink is. Without this, `git mv app/pages/x.vue
# app/pages/../x.vue` would report as R and sail through the gate. With it,
# the rename reads as D(old) + A(new), and the old path must be declared.
#
# $HEAD_REF, not a hardcoded HEAD. The self-test replays f29e7d8 — the commit
# that motivated this gate — with --head, because checking out a 385-line
# deletion just to prove the gate catches it would dirty the working tree. When
# this was hardcoded to HEAD the replay diffed f29e7d8's base against whatever
# branch happened to be checked out instead, reported zero deletions, and the
# gate's own headline test PASSED a gate that had stopped working.
DELETED="$(git diff --diff-filter=D --name-only --no-renames "$BASE_SHA" "$HEAD_REF" || true)"

# Every test file this diff touches at all — added, modified, deleted or
# renamed. Gutting is invisible to --diff-filter=D (the path still exists), so
# the gutting check needs its own, wider view of the diff.
GUTTED_TESTS="$(git diff --name-only --no-renames "$BASE_SHA" "$HEAD_REF" -- \
  '*.test.ts' '*.test.tsx' '*.test.js' '*.test.mjs' \
  '*.spec.ts' '*.spec.tsx' '*.spec.js' '*.spec.mjs' \
  ':(glob)**/__tests__/**' 2>/dev/null || true)"

in_scope() {
  local path="$1" prefix
  for prefix in "${SCOPE_PREFIXES[@]}"; do
    case "$path" in
      "$prefix"*) return 0 ;;
    esac
  done
  return 1
}

is_test_path() {
  case "$1" in
    *.test.ts|*.test.tsx|*.test.js|*.test.mjs|*.spec.ts|*.spec.tsx|*.spec.js|*.spec.mjs) return 0 ;;
    */__tests__/*) return 0 ;;
    *) return 1 ;;
  esac
}

# --- The gutting check (STI-669 AC3, second half). ---------------------------
#
# AC3 says "deleting OR GUTTING a test". The first half is the D-entry path
# above. This is the other half, and it was missing: a PR that opens a test
# file and leaves one trivial assertion in it reports NO deletion, so every
# deletion check reports "no deletions" and the gate passes green.
#
# That is not hypothetical. Measured on this branch's base commit
# (fe27fcb, STI-669 #218), replacing
# src/catalog/account-order-history.test.ts's body with a single
# `assert.ok(true)` placeholder:
#
#   src/catalog/account-order-history.test.ts | 146 +-----------------
#   4 insertions(+), 143 deletions(-)
#   pnpm catalog:test  -> tests 220, pass 220, fail 0   (was tests 227)
#   ./scripts/ci/deletion-scope-gate.sh -> exit 0       (passed)
#
# So 14 real assertions became 1, the suite stayed green, and the gate stayed
# green. The one honest signal is that the assertion count collapsed, so that
# is what is compared.
#
# Counted per test file, over its whole body, the occurrences of the assertion
# and test-case forms the suites actually use. Matching on the *call* is what
# makes this resistant to reformatting: renaming a variable or rewording a
# title does not change the number of assertions, but removing them does.
#
# A reduction is reported as a failure. Legitimate shrinkage is not silent:
# declare it in the manifest under the test path with a '# baseline:'
# override, which is an explicit, reviewable, issue-linked record.
assertions_at() { # assertions_at <ref>:<path>  -> count, or -1 if unreadable
  local spec="$1" blob
  blob="$(git show "$spec" 2>/dev/null)" || { echo -1; return; }
  printf '%s' "$blob" | grep -c -E \
    '(^|[^A-Za-z0-9_$])(assert|expect|should|verify)\s*[.(]|assert\.|t\.(throws|rejects|doesNotThrow)|assertions?\s*=|expect\(' \
    || true
}

# Emit a line per gutted test file. Returns 0 when at least one was gutted
# (i.e. "a gutting was found"), so callers read
# `if gutting_failures; then FAILED=1; fi`. The polarity matches `grep`.
# The first draft of this check returned 1 for "nothing found", which inverted
# the verdict and silently failed every legitimate declared deletion — caught
# by the suite's own "declared + signed-off deletion passes" case, not by
# inspection.
# Names the test file imports or requires, relative to its own directory,
# restricted to the guarded surface. Used only to decide whether an assertion
# drop is a gutting or the honest consequence of the subject being removed.
test_local_imports() { # test_local_imports <ref>:<test-path>
  local spec="$1" blob
  blob="$(git show "$spec" 2>/dev/null)" || return 0
  printf '%s' "$blob" | grep -oE "(from|require\()[[:space:]]*['\"][^'\"]+['\"]" \
    | grep -oE "['\"][^'\"]+['\"]" | tr -d "'\"" \
    | grep -vE '^(\.|/)' || true
}

# Every guarded-surface path the diff deletes. When a test's own subject is
# removed in the same diff, losing its assertions is the correct outcome and
# not a gutting — that is what a real removal looks like.
diff_deletes_in_scope() { # diff_deletes_in_scope
  printf '%s' "$DELETED" | while IFS= read -r p; do
    [ -n "$p" ] || continue
    in_scope "$p" && printf '%s\n' "$p"
  done
}

# A '# baseline:' entry is only honoured when it carries a complete signature:
# a valid STI issue, a sign-off and a reason, plus a non-negative integer
# count. Anything less is reported as a failure rather than ignored, so a
# half-written override can never quietly become a free pass.
#
# Returns 0 (honoured) when the override is complete and head_count is at or
# above the declared baseline. Returns 1 with the reason already printed when
# an override was attempted but is unusable.
declared_baseline() { # declared_baseline <path> -> 0 honoured
  local path="$1" raw issue signoff reason baseline
  raw="${M_BASELINE[$path]:-}"
  [ -n "$raw" ] || return 1
  issue="${M_ISSUE[$path]:-}"
  signoff="${M_SIGNOFF[$path]:-}"
  reason="${M_REASON[$path]:-}"
  if [ -z "$issue" ] || [ -z "$signoff" ]; then
    echo "ERROR: $path: '# baseline:' override needs both a '# issue: STI-nnn' and a '# sign-off: <name>'" >&2
    return 1
  fi
  if ! [[ "$issue" =~ ^STI-[0-9]+$ ]]; then
    echo "ERROR: $path: '# issue:' must be an STI issue id, got '$issue'" >&2
    return 1
  fi
  if [ -z "$reason" ]; then
    echo "ERROR: $path: '# baseline:' override needs a '# reason:' explaining the reduction" >&2
    return 1
  fi
  if ! [[ "$raw" =~ ^[0-9]+$ ]]; then
    echo "ERROR: $path: '# baseline:' must be a non-negative assertion count, got '$raw'" >&2
    return 1
  fi
  baseline="$raw"
  local head_count
  head_count="$(assertions_at "$HEAD_REF:$path")"
  if [ "$head_count" -lt 0 ] 2>/dev/null; then
    return 1
  fi
  if [ "$head_count" -lt "$baseline" ]; then
    echo "ERROR: $path: '# baseline: $baseline' claims at least $baseline assertions, but HEAD has $head_count" >&2
    return 1
  fi
  echo "NOTE: $path: assertion reduction to $head_count accepted by declared '# baseline: $baseline' ($issue, sign-off: $signoff)" >&2
  return 0
}

# Distinguishes "no override attempted" from "override attempted and rejected",
# so the caller can pass an untouched test through silently while a broken
# override still fails. declared_baseline() has already printed the reason.
baseline_declared_but_unusable() { # -> 0 when an override was present
  [ -n "${M_BASELINE[$1]:-}" ]
}

gutting_failures() {
  local path base_count head_count spec deleted_in_scope="" subject_gone=0
  local found=0
  while IFS= read -r path; do
    [ -n "$path" ] || continue
    is_test_path "$path" || continue
    # Same guarded surface as the deletion checks. A test elsewhere in the
    # repo is not this gate's business, and silently failing one would make
    # the gate cry wolf on commits that changed nothing it protects.
    in_scope "$path" || continue
    base_count="$(assertions_at "$BASE_SHA:$path")"
    head_count="$(assertions_at "$HEAD_REF:$path")"
    # An unreadable side is not evidence of a gutting; the deletion path above
    # is what catches added/removed files.
    [ "$base_count" -ge 0 ] 2>/dev/null || continue
    [ "$head_count" -ge 0 ] 2>/dev/null || continue
    [ "$head_count" -lt "$base_count" ] || continue

    # --- The '# baseline:' override (STI-669 AC3). ---------------------------
    # The failure message tells an author to declare an intentional reduction
    # with an explicit '# baseline:' override. If that override is documented
    # but not honoured, the only ways left to land a legitimate reduction are
    # to lie to the test suite or to weaken the gate — and this issue exists
    # because coverage was lost silently. A working override is what keeps the
    # check trustworthy enough to stay on.
    #
    # It is deliberately as strict as a deletion declaration: a valid STI
    # issue, a sign-off, a reason and a non-negative integer. An override that
    # can be written by anyone, for any number, is just a deletion of the check.
    if declared_baseline "$path"; then
      continue
    fi
    if baseline_declared_but_unusable "$path"; then
      found=1
      continue
    fi

    # Did this diff delete the module the test exercised? If so the assertions
    # had nothing left to assert on. Skipped when the removal is already
    # declared, because that path has its own review trail.
    if [ -z "$deleted_in_scope" ]; then
      deleted_in_scope="$(diff_deletes_in_scope)"
    fi
    subject_gone=0
    if [ -n "$deleted_in_scope" ]; then
      spec="${BASE_SHA%:*}/$(dirname "$path")"
      while IFS= read -r imported; do
        [ -n "$imported" ] || continue
        if printf '%s\n' "$deleted_in_scope" | grep -qxF "$spec/$imported"; then
          subject_gone=1
          break
        fi
      done <<< "$(test_local_imports "$BASE_SHA:$path")"
    fi
    if [ "$subject_gone" -eq 1 ]; then
      continue
    fi

    echo "ERROR: $path: test GUTTED — assertions fell $base_count -> $head_count vs $BASE_SHA" >&2
    echo "       Gutting a test emits no deletion, so the checks above see nothing." >&2
    echo "       Restore the assertions, or declare the reduction in" >&2
    echo "       $MANIFEST under this path with an explicit '# baseline:' override." >&2
    found=1
  done <<< "$GUTTED_TESTS"
  # An explicit `if` on the variable, not a bare `[ ]`: under `set -e` a final
  # `[ "$found" -eq 1 ]` returning 1 aborts the whole script, which showed up
  # as the gate failing a legitimate, correctly declared deletion.
  if [ "$found" -eq 1 ]; then
    return 0
  fi
  return 1
}

# --- Parse the manifest. Every declared path needs an issue and a sign-off. ---
#
# Format: a path on its own line, then any number of `# key: value` attribute
# lines belonging to that path. Attribute patterns are matched BEFORE the
# generic "skip comments" case — skipping every `#` line first silently
# discards the attributes and makes every declaration look undeclared.
declare -A M_ISSUE=()
declare -A M_SIGNOFF=()
declare -A M_REPLACEMENT=()
declare -A M_REASON=()
declare -A M_BASELINE=()
declare -A M_DECLARED=()

# Trim leading/trailing whitespace without a subshell per line.
trim() {
  local s="$1"
  s="${s#"${s%%[![:space:]]*}"}"
  s="${s%"${s##*[![:space:]]}"}"
  printf '%s' "$s"
}

set_attr() { # set_attr <assoc-array-name> <key> <value>
  local -n _arr="$1"
  _arr["$2"]="$3"
}

if [ -f "$MANIFEST" ]; then
  cur_path=""
  while IFS= read -r raw || [ -n "$raw" ]; do
    # Strip trailing CR so a CRLF manifest cannot smuggle a path past a match.
    line="${raw%$'\r'}"
    [ -n "$line" ] || continue
    if [[ "$line" =~ ^[[:space:]]*#[[:space:]]*issue:[[:space:]]*(.+)$ ]]; then
      if [ -n "$cur_path" ]; then set_attr M_ISSUE "$cur_path" "${BASH_REMATCH[1]}"; fi
      continue
    fi
    if [[ "$line" =~ ^[[:space:]]*#[[:space:]]*sign-off:[[:space:]]*(.+)$ ]]; then
      if [ -n "$cur_path" ]; then set_attr M_SIGNOFF "$cur_path" "${BASH_REMATCH[1]}"; fi
      continue
    fi
    if [[ "$line" =~ ^[[:space:]]*#[[:space:]]*replacement:[[:space:]]*(.+)$ ]]; then
      if [ -n "$cur_path" ]; then set_attr M_REPLACEMENT "$cur_path" "${BASH_REMATCH[1]}"; fi
      continue
    fi
    if [[ "$line" =~ ^[[:space:]]*#[[:space:]]*reason:[[:space:]]*(.+)$ ]]; then
      if [ -n "$cur_path" ]; then set_attr M_REASON "$cur_path" "${BASH_REMATCH[1]}"; fi
      continue
    fi
    if [[ "$line" =~ ^[[:space:]]*#[[:space:]]*baseline:[[:space:]]*(.+)$ ]]; then
      if [ -n "$cur_path" ]; then set_attr M_BASELINE "$cur_path" "$(trim "${BASH_REMATCH[1]}")"; fi
      continue
    fi
    case "$line" in
      \#*) continue ;;
    esac
    # A non-comment, non-empty line is a declared path.
    cur_path="$(trim "$line")"
    [ -n "$cur_path" ] || continue
    M_DECLARED["$cur_path"]=1
  done < "$MANIFEST"
else
  echo "NOTE: no manifest at $MANIFEST — every scoped deletion is undeclared."
fi

SCOPED=""
while IFS= read -r line; do
  [ -n "$line" ] || continue
  if in_scope "$line"; then
    SCOPED="${SCOPED}${line}"$'\n'
  fi
done <<< "$DELETED"

if [ -z "$SCOPED" ]; then
  if [ "$NAME_ONLY" -eq 1 ]; then
    exit 0
  fi
  # No deletions is NOT automatically a pass: a test can also be emptied in
  # place, which produces no D entry at all. Run the gutting check either way.
  if ! gutting_failures; then
    echo "Deletion-scope gate: passed (no deletions or gutted tests under ${SCOPE_PREFIXES[*]} vs $BASE_SHA)"
    exit 0
  fi
  exit 1
fi

if [ "$NAME_ONLY" -eq 1 ]; then
  printf '%s' "$SCOPED"
  exit 0
fi

UNDECLARED=""
BAD_SIGNATURE=()
BAD_TEST_REPLACEMENT=()

while IFS= read -r path; do
  [ -n "$path" ] || continue
  issue="${M_ISSUE[$path]:-}"
  signoff="${M_SIGNOFF[$path]:-}"
  replacement="${M_REPLACEMENT[$path]:-}"

  if [ -z "$issue" ] && [ -z "$signoff" ]; then
    UNDECLARED="${UNDECLARED}${path}"$'\n'
    continue
  fi
  # A path listed with no issue or no sign-off is not a declaration.
  if [ -z "$issue" ] || [ -z "$signoff" ]; then
    if [ -z "$issue" ]; then
      BAD_SIGNATURE+=("$path: manifest entry has no '# issue: STI-nnn'")
    fi
    if [ -z "$signoff" ]; then
      BAD_SIGNATURE+=("$path: manifest entry has no '# sign-off: <name>'")
    fi
    continue
  fi
  if ! [[ "$issue" =~ ^STI-[0-9]+$ ]]; then
    BAD_SIGNATURE+=("$path: '# issue:' must be an STI issue id, got '$issue'")
    continue
  fi
  # AC3: a test deletion with no replacement assertion is always a failure,
  # and it is never a silent default.
  if is_test_path "$path"; then
    if [ -z "$replacement" ]; then
      BAD_TEST_REPLACEMENT+=("$path: test deleted with no '# replacement:' assertion")
    elif ! git cat-file -e "$HEAD_REF:$replacement" 2>/dev/null; then
      BAD_TEST_REPLACEMENT+=("$path: '# replacement: $replacement' does not exist at $HEAD_REF")
    fi
  fi
done <<< "$SCOPED"

FAILED=0
if [ -n "$UNDECLARED" ]; then
  FAILED=1
  echo "ERROR: undeclared deletion(s) in guarded surface — ${SCOPE_PREFIXES[*]}:"
  printf '%s' "$UNDECLARED" | sed 's/^/  - /'
fi
if [ "${#BAD_SIGNATURE[@]}" -gt 0 ]; then
  FAILED=1
  for line in "${BAD_SIGNATURE[@]}"; do echo "ERROR: $line"; done
fi
if [ "${#BAD_TEST_REPLACEMENT[@]}" -gt 0 ]; then
  FAILED=1
  for line in "${BAD_TEST_REPLACEMENT[@]}"; do echo "ERROR: $line"; done
fi
# AC3, second half: a test can lose its assertions without being deleted.
if gutting_failures; then
  FAILED=1
fi

if [ "$FAILED" -eq 1 ]; then
  cat <<'MSG'

Deletion-scope gate (STI-669).

PR #207 (f29e7d8) deleted app/pages/account.vue,
app/utils/customer-account.ts and
src/catalog/account-order-history.test.ts as a side effect of a chrome/copy PR,
and CI stayed green. That silently removed two shipped, verified-live features
(STI-633, STI-652).

This gate reads the real deleted paths (`git diff --diff-filter=D --name-only`)
and never parses the PR title or body, so it cannot be satisfied by a
description that does not match the diff.

To land an intentional deletion, declare it in
scripts/ci/deletion-scope-manifest.txt:

    app/pages/old-thing.vue
    # issue: STI-123
    # sign-off: storefront-lead
    # reason: replaced by app/pages/new-thing.vue

A deleted test additionally needs a '# replacement:' line naming a test that
survives at HEAD. Deleting a test with no replacement is always a failure and
is never a silent default.

Gutting a test is the same failure wearing a different hat: the path still
exists, so no deletion check sees anything, but the coverage is gone. The gate
compares each touched test's assertion count against the base and fails when it
drops. To land an intentional reduction, declare the path in the manifest with
an explicit '# baseline:' override and a reason.
MSG
  exit 1
fi

n_scoped="$(printf '%s' "$SCOPED" | grep -c . || true)"
echo "Deletion-scope gate: passed ($n_scoped declared deletion(s) vs $BASE_SHA):"
printf '%s' "$SCOPED" | sed 's/^/  - /'
exit 0