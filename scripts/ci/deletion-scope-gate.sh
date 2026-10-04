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
#   --head <ref>     the right-hand side of the diff (default: HEAD). Needed
#                    because the gate's own self-test runs it against a
#                    historical commit: diffing f29e7d8~1 against current HEAD
#                    is not the same diff, and once the deleted files were
#                    restored it finds nothing and the assertion silently rots.
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
HEAD_REF=""
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
    -h|--help) sed -n '2,58p' "$0"; exit 0 ;;
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

# HEAD_REF is the right-hand side of the diff. In CI that is HEAD (the PR
# merge commit); the self-test overrides it to replay a historical commit. The
# merge base must be taken against the same ref the diff uses, or the two
# disagree and the gate reports on a range nobody asked about.
HEAD_REF="${HEAD_REF:-HEAD}"
if ! git rev-parse --verify --quiet "$HEAD_REF^{commit}" >/dev/null 2>&1; then
  echo "ERROR: deletion-scope-gate: cannot resolve head ref '$HEAD_REF'."
  exit 1
fi

BASE_SHA="$(git merge-base "$BASE" "$HEAD_REF" 2>/dev/null || git rev-parse "$BASE")"

# --- The actual deleted paths. This is the only input that matters (AC2). ---
# --no-renames: a git rename out of the guarded surface is a removal of a
# shipped page as much as an unlink is. Without this, `git mv app/pages/x.vue
# app/pages/../x.vue` would report as R and sail through the gate. With it,
# the rename reads as D(old) + A(new), and the old path must be declared.
DELETED="$(git diff --diff-filter=D --name-only --no-renames "$BASE_SHA" "$HEAD_REF" || true)"

in_scope() {
  local path="$1" prefix
  for prefix in "${SCOPE_PREFIXES[@]}"; do
    case "$path" in
      "$prefix"*) return 0 ;;
    esac
  done
  return 1
}

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
  echo "Deletion-scope gate: passed (no deletions under ${SCOPE_PREFIXES[*]} vs $BASE_SHA)"
  exit 0
fi

if [ "$NAME_ONLY" -eq 1 ]; then
  printf '%s' "$SCOPED"
  exit 0
fi

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

is_test_path() {
  case "$1" in
    *.test.ts|*.test.tsx|*.test.js|*.test.mjs|*.spec.ts|*.spec.tsx|*.spec.js|*.spec.mjs) return 0 ;;
    # Any file under a __tests__/ directory is a test regardless of suffix.
    */__tests__/*) return 0 ;;
    *) return 1 ;;
  esac
}

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
      BAD_TEST_REPLACEMENT+=("$path: '# replacement: $replacement' does not exist at HEAD")
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
MSG
  exit 1
fi

n_scoped="$(printf '%s' "$SCOPED" | grep -c . || true)"
echo "Deletion-scope gate: passed ($n_scoped declared deletion(s) vs $BASE_SHA):"
printf '%s' "$SCOPED" | sed 's/^/  - /'
exit 0