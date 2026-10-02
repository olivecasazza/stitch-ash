#!/usr/bin/env bash
# scripts/ci/deploy-dispatch-dedup.test.sh
# STI-620: proves deploy-dispatch-dedup.sh answers `dispatch=false` only for the
# one case it is allowed to — a merge commit whose dispatch ref already exists —
# and answers `dispatch=true` for everything else, including every way the
# GitHub API can fail to tell the two apart.
#
# A guard nobody has seen go red is not a guard. That is the STI-601 lesson and it
# is why this predicate lives in a script with a self-test instead of inline in
# auto-merge.yml.
#
# The DIRECTION of every failure matters more here than in a normal gate. The
# false `dispatch=false` starves a bot-merge of its deploy until the */30 cron
# picks it up; the false `dispatch=true` wastes minutes on an identical build.
# So this suite asserts fail-OPEN on every unreadable-input path, and asserts
# that the ONLY route to `dispatch=false` is a create that failed with the API's
# own "already exists" wording.
#
# The gate's `gh` is a stub reading fixtures from $WORK. It applies the caller's
# `--jq` program with the same jq the real `gh` uses, so the ref filter is under
# test too. No token, no network, no Actions runner; runs in well under a second.
# `jq` ships in the ubuntu-latest image, which is where pr-checks runs it.

set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GATE="${GATE_UNDER_TEST:-$HERE/deploy-dispatch-dedup.sh}"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

command -v jq >/dev/null 2>&1 || {
  echo "jq is required by this self-test and is not on PATH." >&2
  exit 1
}

PASS=0
FAIL=0

# The real merge commit from PR #179, the pair of duplicate dispatches this whole
# issue is about (runs 36985017627 and 36985020457, two seconds apart).
MERGE_SHA="e06f26a26f63f2417fe55bff5bdaed58aa13ec17"
# A second, genuinely-new merge. Nothing has ever dispatched it.
OTHER_SHA="3fa69a041c0f9f0e2b5f0b6e5e2c1d0a9b8c7d6e"
REPO_ARG=(--sha "$MERGE_SHA" --repo olivecasazza/stitch-ash)

# ref-exists.err  — non-empty makes the create call fail with this stderr.
CREATE_ERR="$WORK/create.err"
# ref-exists.json — what the create call returns on success.
CREATE_OUT="$WORK/create.json"

# exists <error-message> — the merge commit's dispatch ref already exists. This
# is the ONLY shape that may produce dispatch=false.
ref_exists() {
  printf 'gh: Unprocessable Entity (HTTP 422)\nValidation Failed: Reference "%s" already exists.\n' \
    "refs/sti/deploy-dispatched/${MERGE_SHA}" > "$CREATE_ERR"
  : > "$CREATE_OUT"
}

# fresh_merge — nobody has dispatched this commit; the create succeeds.
create_ok() {
  : > "$CREATE_ERR"
  printf '{"ref":"refs/sti/deploy-dispatched/%s","node_id":"REF_kwDOAAAA","url":"https://api.github.com/repos/olivecasazza/stitch-ash/git/refs/sti/deploy-dispatched/%s","object":{"sha":"%s","type":"commit"}}\n' \
    "$MERGE_SHA" "$MERGE_SHA" "$MERGE_SHA" > "$CREATE_OUT"
}

# gh_unavailable — the API cannot be reached at all.
gh_down() {
  printf 'gh: could not connect to api.github.com\nerror connecting to api.github.com\n' > "$CREATE_ERR"
  : > "$CREATE_OUT"
}

# forbidden — the token lacks permission to write the ref.
forbidden() {
  printf 'gh: Resource not accessible by integration (HTTP 403)\n' > "$CREATE_ERR"
  : > "$CREATE_OUT"
}

# The stub answers the one endpoint this gate calls, applies the caller's --jq
# program, and fails loudly on any other endpoint — so a gate change that starts
# calling something else fails here rather than silently testing nothing.
#
# It records the request it saw so the assertions below can prove the gate sends
# the CREATE it claims to send, rather than a get-then-set pair.
cat > "$WORK/gh" <<'STUB'
#!/usr/bin/env bash
set -uo pipefail
SELF="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
filter=""
url=""
method=""
want_method=0
want_jq=0
fields=""
for a in "$@"; do
  [ "$want_method" -eq 1 ] && method="$a" && want_method=0
  [ "$want_jq" -eq 1 ] && filter="$a" && want_jq=0
  case "$a" in
    --jq) want_jq=1 ;;
    -X|--method) want_method=1 ;;
    -X*) method="${a#-X}" ;;
    -f|-F|--raw-field|--field) fields="$fields $a" ;;
    -*) ;;
    *) fields="$fields $a" ;;
  esac
  case "$a" in
    */git/refs) url="create-ref" ;;
  esac
done

# A create that omits the method is a POST by inference here, so record what was
# actually sent; the caller asserts on it.
printf 'method=%s fields=%s\n' "${method:-<none>}" "$fields" >> "$SELF/calls.log"

if [ -s "$SELF/create.err" ]; then
  cat "$SELF/create.err" >&2
  exit 1
fi

case "$url" in
  create-ref)
    if [ -n "$filter" ]; then jq -r "$filter" < "$SELF/create.json"; else cat "$SELF/create.json"; fi
    ;;
  *)
    printf 'gh: stub does not implement endpoint: %s\n' "$*" >&2
    exit 1
    ;;
esac
STUB

chmod +x "$WORK/gh"

record_fail() { # record_fail <name> <detail>
  printf '  FAIL %s\n         %s\n' "$1" "$2"
  FAIL=$((FAIL + 1))
}

# check <name> <expected-verdict> [expected-substring] [extra gate args...]
check() {
  local name="$1" expect="$2" want="${3:-}"
  shift 3 2>/dev/null || shift 2
  local out rc verdict
  : > "$WORK/calls.log"
  set +e
  out="$(DEPLOY_DEDUP_GH_BIN="$WORK/gh" "$GATE" "${REPO_ARG[@]}" "$@" 2>&1)"
  rc=$?
  set -e
  verdict="$(printf '%s\n' "$out" | grep -E '^dispatch=' | tail -1 || true)"

  if [ "$rc" -ne 0 ]; then
    record_fail "$name" "gate exited ${rc}; a fail-open gate must exit 0"
    printf '%s\n' "$out" | sed 's/^/         | /'
    return
  fi
  if [ "$verdict" != "dispatch=${expect}" ]; then
    record_fail "$name" "expected dispatch=${expect}, got '${verdict:-<no verdict line>}'"
    printf '%s\n' "$out" | sed 's/^/         | /'
    return
  fi
  if [ -n "$want" ] && ! printf '%s' "$out" | grep -qF -- "$want"; then
    record_fail "$name" "verdict was right but never said \"${want}\""
    printf '%s\n' "$out" | sed 's/^/         | /'
    return
  fi
  printf '  ok   %s (%s)\n' "$name" "$verdict"
  PASS=$((PASS + 1))
}

echo "STI-620 deploy dispatch dedup"

# 1. THE FIX. The ref for this merge commit already exists because an earlier
#    invocation of this job created it and dispatched. This is the duplicate
#    dispatch being suppressed — the whole point of the change.
ref_exists
check "already-dispatched merge is not dispatched again" false "already exists"

# 2. A genuinely new merge has no ref, so the create succeeds and this
#    invocation owns the deploy. This is the assertion that keeps the fix from
#    becoming "never deploy a bot-merge", which is the failure mode any
#    hand-rolled dedup is one ref typo away from.
create_ok
check "first dispatch of a new merge proceeds" true "owns the dispatch"

# 3. The gate must be a CREATE, not a get-then-set pair. A read-then-write
#    dedup has a window between the two calls and cannot hold against
#    invocations that start seconds apart, which is the measured shape of the
#    duplicate: runs 36985017627 and 36985020457 landed 2s apart.
create_ok
check "dedup is a single create, never a read-then-write" true
calls="$(cat "$WORK/calls.log")"
if printf '%s' "$calls" | grep -q 'method=GET'; then
  record_fail "no GET precedes the create" "the gate issued a GET: $calls"
else
  printf '  ok   no GET precedes the create\n'
  PASS=$((PASS + 1))
fi
if ! printf '%s' "$calls" | grep -q 'method=POST'; then
  record_fail "create is an explicit POST" "the gate did not send POST: $calls"
else
  printf '  ok   create is an explicit POST\n'
  PASS=$((PASS + 1))
fi
if ! printf '%s' "$calls" | grep -q "refs/sti/deploy-dispatched/${MERGE_SHA}"; then
  record_fail "ref name carries the merge sha" "unexpected ref: $calls"
else
  printf '  ok   ref name carries the merge sha\n'
  PASS=$((PASS + 1))
fi

# 4. A different merge commit is a different ref. Keying the dedup on anything
#    coarser than the merge SHA would suppress a real later merge — for example
#    by storing only "the last dispatched SHA" in one ref, which goes stale the
#    moment two merges land close together.
create_ok
check "a different merge sha is a different ref" true \
  "refs/sti/deploy-dispatched/${OTHER_SHA}" \
  --sha "$OTHER_SHA"

# 5. FAIL-OPEN on an unreachable API. This is the assertion with teeth: if the
#    gate could not read the API it must not conclude "already dispatched",
#    because that would silently stop every bot-merge deploy in the repo. The
#    pre-fix behaviour dispatched unconditionally, so this path is no worse than
#    shipping no dedup at all.
gh_down
check "unreachable api fails open" true "Failing OPEN"

# 6. FAIL-OPEN when the token cannot write the ref. A 403 is the shape a missing
#    permission takes, and reading it as "already dispatched" would turn a
#    permissions mistake into a permanently silent deploy gap.
forbidden
check "forbidden ref write fails open" true "Failing OPEN"

# 7. The verdict shape. A malformed SHA must never be treated as "first time
#    seeing this" on every invocation — that is a gate that never dedupes while
#    appearing to work.
check "implausible sha fails open" true "Failing OPEN" --sha "not-a-sha"
check "short sha fails open" true "Failing OPEN" --sha "e06f26a2"
check "uppercase sha fails open" true "Failing OPEN" --sha "E06F26A26F63F2417FE55BFF5BDAED58AA13EC17"

# 8. A ref namespace GitHub would reject must not be silently read as a
#    duplicate. If the namespace is malformed the create fails for a reason that
#    has nothing to do with dedup, and treating that as "already dispatched"
#    disables every dispatch.
check "malicious namespace fails open" true "Failing OPEN" \
  --namespace "../../../etc"
check "namespace with empty segment fails open" true "Failing OPEN" \
  --namespace "sti//deploy"
check "namespace ending in a slash fails open" true "Failing OPEN" \
  --namespace "sti/deploy/"

# 9. Missing repo: same reasoning, one more input the gate interpolates.
out="$(DEPLOY_DEDUP_GH_BIN="$WORK/gh" "$GATE" --sha "$MERGE_SHA" 2>&1 || true)"
if printf '%s' "$out" | grep -q '^dispatch=true$'; then
  printf '  ok   missing repo fails open (dispatch=true)\n'
  PASS=$((PASS + 1))
else
  record_fail "missing repo fails open" "got: $(printf '%s' "$out" | tail -1)"
fi

# 10. --github-output carries the same verdict. stdout and the step output
#     disagreeing is how a gate silently stops being consulted at all.
create_ok
out_file="$WORK/github-output"
DEPLOY_DEDUP_GH_BIN="$WORK/gh" "$GATE" "${REPO_ARG[@]}" \
  --github-output "$out_file" >/dev/null 2>&1 || true
if grep -qx 'dispatch=true' "$out_file"; then
  printf '  ok   --github-output carries the verdict\n'
  PASS=$((PASS + 1))
else
  record_fail "--github-output carries the verdict" "file contained: $(cat "$out_file" 2>/dev/null)"
fi

ref_exists
out_file2="$WORK/github-output-2"
DEPLOY_DEDUP_GH_BIN="$WORK/gh" "$GATE" "${REPO_ARG[@]}" \
  --github-output "$out_file2" >/dev/null 2>&1 || true
if grep -qx 'dispatch=false' "$out_file2"; then
  printf '  ok   --github-output carries the suppressed verdict\n'
  PASS=$((PASS + 1))
else
  record_fail "--github-output carries the suppressed verdict" \
    "file contained: $(cat "$out_file2" 2>/dev/null)"
fi

# 11. Exactly one verdict line, ever. Two `dispatch=` lines with different
#     values would leave the caller reading whichever one it happened to parse.
ref_exists
lines="$(DEPLOY_DEDUP_GH_BIN="$WORK/gh" "$GATE" "${REPO_ARG[@]}" 2>&1 |
  grep -cE '^dispatch=' || true)"
if [ "$lines" = "1" ]; then
  printf '  ok   exactly one verdict line (dispatch=false)\n'
  PASS=$((PASS + 1))
else
  record_fail "exactly one verdict line" "saw ${lines} dispatch= lines, expected 1"
fi

create_ok
lines="$(DEPLOY_DEDUP_GH_BIN="$WORK/gh" "$GATE" "${REPO_ARG[@]}" 2>&1 |
  grep -cE '^dispatch=' || true)"
if [ "$lines" = "1" ]; then
  printf '  ok   exactly one verdict line (dispatch=true)\n'
  PASS=$((PASS + 1))
else
  record_fail "exactly one verdict line" "saw ${lines} dispatch= lines, expected 1"
fi

# 12. The gate never dispatches anything itself. auto-merge.yml owns the dispatch
#     and the */30 cron owns the backstop; a gate that also sent the event would
#     be a second dispatch path nobody would find by reading deploy.yml.
if grep -qE 'createDispatchEvent|hooks\.dispatch|/dispatches' "$GATE"; then
  record_fail "gate does not dispatch" "the gate itself creates a dispatch event"
else
  printf '  ok   gate does not dispatch\n'
  PASS=$((PASS + 1))
fi

# 13. The gate must not read deploy.yml's run history. That was the rejected
#     alternative and it is racy: the duplicate dispatches land 2s apart, so two
#     invocations can both observe "no run yet". If a future edit reintroduces
#     it, the run-history read comes back and this fails.
if grep -qE 'actions/workflows|actions/runs' "$GATE"; then
  record_fail "gate does not read deploy.yml run history" \
    "the gate queries workflow runs, which is the racy alternative"
else
  printf '  ok   gate does not read deploy.yml run history\n'
  PASS=$((PASS + 1))
fi

# 14. STI-601 must not be undone by a future edit here. deploy-freshness-gate.sh
#     is load-bearing and is corrected in a different issue; if this change ever
#     widens the schedule path to cover repository_dispatch, the first dispatch
#     of a real merge can be skipped as "already live" and the merge never
#     deploys. Assert the schedule clause still mentions schedule only.
gate_yaml="$HERE/../../.github/workflows/deploy.yml"
if [ -f "$gate_yaml" ]; then
  if grep -q "github.event_name != 'schedule'" "$gate_yaml"; then
    printf '  ok   deploy.yml freshness clause still scoped to schedule\n'
    PASS=$((PASS + 1))
  else
    record_fail "deploy.yml freshness clause still scoped to schedule" \
      "the deploy gate no longer names schedule"
  fi
else
  printf '  skip deploy.yml freshness clause (workflow not present)\n'
fi

echo
printf '%d passed, %d failed\n' "$PASS" "$FAIL"
[ "$FAIL" -eq 0 ] || exit 1