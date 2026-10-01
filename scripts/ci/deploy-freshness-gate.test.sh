#!/usr/bin/env bash
# scripts/ci/deploy-freshness-gate.test.sh
# STI-601: proves deploy-freshness-gate.sh rejects the false-green shape that
# shipped into main. A guard nobody has seen go red is not a guard.
#
# The gate's `gh` and `git` are stubs reading GitHub-API-shaped fixtures from
# $WORK. The stub applies the caller's `--jq` program with the same jq the real
# `gh` uses, so the gate's filter is under test too and not just its shell
# logic. No token, no network, no Actions runner; runs in well under a second.
# `jq` ships in the ubuntu-latest image, which is where pr-checks runs it.
#
# Test 2 pins the exact shape measured on 2026-10-01 in run 36803396902:
# `fresh-check: success`, `deploy: skipped`, run conclusion `success` — and it
# found nothing to do by citing run 36785970511, which was itself
# `deploy: skipped`. The pre-STI-601 predicate returned needed=false there.

set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GATE="${GATE_UNDER_TEST:-$HERE/deploy-freshness-gate.sh}"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

command -v jq >/dev/null 2>&1 || {
  echo "jq is required by this self-test and is not on PATH." >&2
  exit 1
}

PASS=0
FAIL=0

MAIN_SHA="7367c2f27d2981e85582d2dd516a199ce7fe2cd2"
REPO_ARG=(--head-sha "$MAIN_SHA" --repo olivecasazza/stitch-ash)

RUN_LIST="$WORK/runs.json"      # workflow_runs response for the run-list call
RUN_LIST_PAGE2="$WORK/runs-2.json" # second page, appended only when it exists
RUN_LIST_ERR="$WORK/runs.err"   # non-empty => the run-list call fails
JOBS_DIR="$WORK/jobs"           # <run-id>.json => a jobs response
JOBS_ERR_DIR="$WORK/jobs-err"   # <run-id>.err  non-empty => the jobs call fails
mkdir -p "$JOBS_DIR" "$JOBS_ERR_DIR"

# runs <id>... — newest first, as the Actions API returns them. These are the
# only runs the gate's filter can select, since only carries-main heads are
# listed; that is the whole point of the predicate under test.
runs() {
  local id
  {
    echo '{"total_count":0,"workflow_runs":['
    local first=1
    for id in "$@"; do
      [ "$first" -eq 1 ] || echo ','
      first=0
      printf '{"id":%s,"name":"Deploy to Cloudflare Pages","head_sha":"%s","head_branch":"main","status":"completed","conclusion":"success","event":"schedule","created_at":"2026-10-01T01:55:31Z","html_url":"https://github.com/olivecasazza/stitch-ash/actions/runs/%s"}' \
        "$id" "$MAIN_SHA" "$id"
    done
    echo ']}'
  } > "$RUN_LIST"
  : > "$RUN_LIST_PAGE2"
  : > "$RUN_LIST_ERR"
}

# A run that published main but has fallen off page 1 — the state this workflow
# reaches on its own after ~2 days of */30 firings with no deploy.
runs_page2() { # runs_page2 <id>
  printf '{"total_count":0,"workflow_runs":[{"id":%s,"name":"Deploy to Cloudflare Pages","head_sha":"%s","head_branch":"main","status":"completed","conclusion":"success","event":"schedule","created_at":"2026-09-01T01:55:31Z"}]}' \
    "$1" "$MAIN_SHA" > "$RUN_LIST_PAGE2"
}

# jobs <run-id> <name:conclusion>... — a jobs response for that run.
jobs() {
  local id="$1"; shift
  local name
  {
    echo '{"total_count":0,"jobs":['
    local first=1
    for name in "$@"; do
      [ "$first" -eq 1 ] || echo ','
      first=0
      printf '{"id":1,"name":"%s","status":"completed","conclusion":"%s","started_at":"2026-10-01T01:55:35Z","html_url":"https://github.com/olivecasazza/stitch-ash/actions/runs/%s"}' \
        "${name%%:*}" "${name##*:}" "$id"
    done
    echo ']}'
  } > "$JOBS_DIR/${id}.json"
}

jobs_err() { # jobs_err <run-id> <message>
  printf '%s\n' "$2" > "$JOBS_ERR_DIR/${1}.err"
}

# The stub answers the two endpoints the gate calls, applies the caller's --jq
# program, and fails loudly on any third endpoint — so a gate change that starts
# calling something else fails here rather than silently testing nothing.
#
# It also reproduces `gh api`'s method inference, because that rule caused a real
# bug this suite would otherwise have missed: `gh api` defaults to POST as soon
# as any -f/-F field is present unless -X GET is explicit, so
# `gh api .../jobs -f per_page=100` is a POST and the API answers 404. The gate
# shipped that shape during this fix and only the live run caught it, because a
# stub that ignores -f cannot see the difference. The stub therefore REJECTS any
# request carrying a field without an explicit -X GET, exactly as the real
# client behaves.
cat > "$WORK/gh" <<'STUB'
#!/usr/bin/env bash
set -uo pipefail
SELF="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
filter=""
url=""
run=""
want_jq=0
method=""
has_field=0
paginate=0
for a in "$@"; do
  [ "$want_jq" -eq 1 ] && filter="$a" && want_jq=0
  [ "${method:-}" = "PENDING" ] && method="$a"
  case "$a" in
    --jq) want_jq=1 ;;
    --paginate) paginate=1 ;;
    -f|-F|--raw-field|--field) has_field=1 ;;
    -X|--method) method="PENDING" ;;
    -X*) method="${a#-X}" ;;
    */actions/workflows/deploy.yml/runs) url="list" ;;
    */actions/runs/*)
      url="jobs"
      run="${a#*/actions/runs/}"
      run="${run%/jobs}"
      ;;
  esac
done

# The real rule: no explicit method, but a field present => POST => 404.
if [ "$has_field" -eq 1 ] && [ "${method:-}" != "GET" ]; then
  printf 'gh: Not Found (HTTP 404)\n' >&2
  printf 'stub: gh sends %s here because a field was passed without -X GET\n' "${method:-POST}" >&2
  exit 1
fi

emit() { # emit <json-file>
  if [ -n "$filter" ]; then
    jq -r "$filter" < "$1"
  else
    cat "$1"
  fi
}

case "$url" in
  list)
    if [ -s "$SELF/runs.err" ]; then cat "$SELF/runs.err" >&2; exit 1; fi
    emit "$SELF/runs.json"
    # --paginate: gh concatenates the jq output of each page in order.
    if [ "$paginate" -eq 1 ] && [ -s "$SELF/runs-2.json" ]; then
      emit "$SELF/runs-2.json"
    fi
    ;;
  jobs)
    if [ -s "$SELF/jobs-err/${run}.err" ]; then
      cat "$SELF/jobs-err/${run}.err" >&2; exit 1
    fi
    if [ ! -f "$SELF/jobs/${run}.json" ]; then
      printf 'gh: Not Found (stub has no jobs fixture for run %s)\n' "$run" >&2
      exit 1
    fi
    emit "$SELF/jobs/${run}.json"
    ;;
  *)
    printf 'gh: stub does not implement endpoint: %s\n' "$*" >&2
    exit 1
    ;;
esac
STUB

# ls-remote resolves main to $MAIN_SHA unless lsremote.err makes it fail.
cat > "$WORK/git" <<STUB
#!/usr/bin/env bash
set -uo pipefail
SELF="\$(cd "\$(dirname "\${BASH_SOURCE[0]}")" && pwd)"
if [ "\${1:-}" = "ls-remote" ]; then
  if [ -s "\$SELF/lsremote.err" ]; then cat "\$SELF/lsremote.err" >&2; exit 1; fi
  printf '%s\trefs/heads/main\n' "${MAIN_SHA}"
  exit 0
fi
printf 'git: stub does not implement: %s\n' "\$*" >&2
exit 1
STUB

chmod +x "$WORK/gh" "$WORK/git"

record_fail() { # record_fail <name> <detail>
  printf '  FAIL %s\n         %s\n' "$1" "$2"
  FAIL=$((FAIL + 1))
}

run_gate() { # run_gate [extra gate args...] -> stdout, never fails the caller
  DEPLOY_FRESHNESS_GH_BIN="$WORK/gh" DEPLOY_FRESHNESS_GIT_BIN="$WORK/git" \
    "$GATE" "${REPO_ARG[@]}" "$@" 2>&1 || true
}

check() { # check <name> <expected-needed> [expected-substring] [extra gate args...]
  local name="$1" expect="$2" want="${3:-}"
  shift 3 2>/dev/null || shift 2
  local out rc verdict
  set +e
  out="$(DEPLOY_FRESHNESS_GH_BIN="$WORK/gh" DEPLOY_FRESHNESS_GIT_BIN="$WORK/git" \
    "$GATE" "${REPO_ARG[@]}" "$@" 2>&1)"
  rc=$?
  set -e
  verdict="$(printf '%s\n' "$out" | grep -E '^needed=' | tail -1 || true)"

  if [ "$rc" -ne 0 ]; then
    record_fail "$name" "gate exited ${rc}; a fail-open gate must exit 0"
    printf '%s\n' "$out" | sed 's/^/         | /'
    return
  fi
  if [ "$verdict" != "needed=${expect}" ]; then
    record_fail "$name" "expected needed=${expect}, got '${verdict:-<no verdict line>}'"
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

echo "STI-601 deploy freshness gate"

# 1. A real deploy of main exists -> nothing to do. The steady state.
runs 36675330287
jobs 36675330287 fresh-check:success deploy:success
check "real deploy of main needs nothing" false "36675330287 published main"

# 2. THE REGRESSION. A green no-op: run conclusion success, deploy job skipped.
#    The pre-STI-601 predicate returned needed=false here. That is the false
#    green qa-verifier measured on 2026-10-01.
runs 36803396902
jobs 36803396902 fresh-check:success deploy:skipped
check "STI-601 green no-op is NOT a publish" true "concluded 'skipped'"

# 3. The exact measured chain: a no-op that found nothing to do by citing an
#    earlier no-op. Three green no-ops, zero deploys. Old predicate: needed=false.
runs 36803396902 36785970511 36755982087
jobs 36803396902 fresh-check:success deploy:skipped
jobs 36785970511 fresh-check:success deploy:skipped
jobs 36755982087 fresh-check:success deploy:skipped
check "chain of green no-ops is not a publish" true

# 4. A real deploy EARLIER than the no-ops still counts. Order-independence is
#    what STI-434 forced: a merge-triggered run records the pre-merge PR head,
#    so the newest successful run is not necessarily the one that published.
runs 36803396902 36675330287
jobs 36803396902 fresh-check:success deploy:skipped
jobs 36675330287 fresh-check:success deploy:success
check "real deploy behind a no-op still counts" false "36675330287"

# 5. A FAILED deploy job is not a publish. The run's conclusion can still be
#    success here because fresh-check passed and only the deploy job failed.
runs 37000000001
jobs 37000000001 fresh-check:success deploy:failure
check "failed deploy job is NOT a publish" true "concluded 'failure'"

# 6. A cancelled deploy job is not a publish.
runs 37000000002
jobs 37000000002 fresh-check:success deploy:cancelled
check "cancelled deploy job is NOT a publish" true "concluded 'cancelled'"

# 7. No job named deploy at all -> cannot be shown to have published. Renaming
#    the job must fail the gate open, not silently disable the backstop.
runs 37000000003
jobs 37000000003 fresh-check:success publish:success
check "missing deploy job fails open" true "absent"

# 8. Unreadable jobs -> cannot be shown to have published.
runs 37000000004
jobs_err 37000000004 "gh: API rate limit exceeded"
check "unreadable jobs fail open" true "jobs unreadable"

# 9. Unreadable run list -> fail open on the API error, never on an empty list.
#    The distinction matters: an empty list means drift, an unreadable list means
#    we do not know, and only one of those is allowed to skip a deploy.
runs 36803396902
jobs 36803396902 fresh-check:success deploy:success
printf 'gh: API rate limit exceeded\n' > "$RUN_LIST_ERR"
check "unreadable run list fails open" true "Could not read the deploy.yml run list"

# 10. No successful run carries main -> plain drift, deploy.
runs
jobs 36675330287 fresh-check:success deploy:success
check "no run carries main -> deploy" true "No recent successful run"

# 11. --max-candidates bounds the jobs API calls without inverting the verdict:
#     with only a no-op inside the window it must still deploy.
runs 36803396902 36675330287
jobs 36803396902 fresh-check:success deploy:skipped
jobs 36675330287 fresh-check:success deploy:success
check "max-candidates=1 stops at the no-op and deploys" true "Stopped after 1 candidate" --max-candidates 1

# 12. The run-list search is paginated. Unpaginated, it reads one page of
#     `status=success` runs — about two days at this workflow's */30 cadence
#     plus one per merge. Once the publishing run falls off page 1 the gate
#     reports drift on every firing and redeploys an identical artifact forever,
#     which is the STI-433 waste the gate exists to prevent.
runs 36803396902
jobs 36803396902 fresh-check:success deploy:skipped
runs_page2 36675330287
jobs 36675330287 fresh-check:success deploy:success
check "publish found on a later page" false "36675330287"

# 13. Every gh call the gate makes carries an explicit -X GET, so `gh api` cannot
#     infer POST from the presence of a -f/-F field. Measured live on 2026-10-01:
#     the jobs call shipped without it and every candidate 404'd, which fails
#     open and would silently disable the entire backstop while staying green.
#     A 404 and a missing run are the same shape to the gate, so nothing else in
#     this suite can tell the difference — only a live call, or a stub that
#     models the client's method inference, exposes it.
runs 36675330287
jobs 36675330287 fresh-check:success deploy:success
missing_x=""
while IFS= read -r call; do
  case "$call" in
    *-X\ GET*) ;;
    *) missing_x="${missing_x}${call}"$'\n' ;;
  esac
done < <(awk '/_BIN.*" api/ {print NR": "$0}' "${GATE}" | grep -E '\-f |\-F ')
if [ -n "$missing_x" ]; then
  record_fail "every api call sends an explicit -X GET" "these pass a field without -X GET:
${missing_x}"
else
  printf '  ok   every api call sends an explicit -X GET\n'
  PASS=$((PASS + 1))
fi

# 14. The run-list call paginates. See test 12 for why.
if awk '/workflows\/deploy.yml\/runs/ {print; exit}' "${GATE}" | grep -q -- '--paginate'; then
  printf '  ok   run-list call is paginated\n'
  PASS=$((PASS + 1))
else
  record_fail "run-list call is paginated" "the deploy.yml run-list call has no --paginate"
fi

# 15. The gate resolves a real publish through the real --jq program, not just
#     through shell string matching: a candidate whose deploy job succeeded must
#     be selected out of a mixed list by job conclusion alone.
runs 36803396902 36785970511 36675330287
jobs 36803396902 fresh-check:success deploy:skipped
jobs 36785970511 fresh-check:success deploy:skipped
jobs 36675330287 fresh-check:success deploy:success
check "publish is found past two no-ops" false "36675330287"

# 16. --github-output carries the same verdict the script printed. If those
#     could disagree, the gate would be reading a stale `needed`.
OUT="$WORK/gh-output"
: > "$OUT"
runs 36803396902
jobs 36803396902 fresh-check:success deploy:skipped
DEPLOY_FRESHNESS_GH_BIN="$WORK/gh" DEPLOY_FRESHNESS_GIT_BIN="$WORK/git" \
  "$GATE" "${REPO_ARG[@]}" --github-output "$OUT" >/dev/null 2>&1 || true
if grep -qx 'needed=true' "$OUT"; then
  printf '  ok   --github-output carries the verdict\n'
  PASS=$((PASS + 1))
else
  record_fail "--github-output carries the verdict" "file contained: $(cat "$OUT")"
fi

# 17. An implausible --head-sha fails open rather than building a jq filter
#     that matches nothing and reads as permanent drift.
out="$("$GATE" --head-sha 'not-a-sha' --repo olivecasazza/stitch-ash 2>&1 || true)"
if printf '%s\n' "$out" | grep -qx 'needed=true'; then
  printf '  ok   implausible head sha fails open\n'
  PASS=$((PASS + 1))
else
  record_fail "implausible head sha fails open" "output: ${out}"
fi

# 18. No --repo and no GITHUB_REPOSITORY fails open.
out="$(env -u GITHUB_REPOSITORY DEPLOY_FRESHNESS_GH_BIN="$WORK/gh" \
  DEPLOY_FRESHNESS_GIT_BIN="$WORK/git" "$GATE" 2>&1 || true)"
if printf '%s\n' "$out" | grep -qx 'needed=true'; then
  printf '  ok   missing repo fails open\n'
  PASS=$((PASS + 1))
else
  record_fail "missing repo fails open" "output: ${out}"
fi

# 19. ls-remote failing fails open. The old inline gate had this arm; a rewrite
#     that dropped it would turn a network blip into a wrong no-op.
printf 'fatal: unable to access remote\n' > "$WORK/lsremote.err"
out="$(run_gate --repo olivecasazza/stitch-ash --head-sha '')"
if printf '%s\n' "$out" | grep -qx 'needed=true'; then
  printf '  ok   unreachable remote fails open\n'
  PASS=$((PASS + 1))
else
  record_fail "unreachable remote fails open" "output: ${out}"
fi

echo
printf '  %d passed, %d failed\n' "$PASS" "$FAIL"
[ "$FAIL" -eq 0 ] || exit 1
