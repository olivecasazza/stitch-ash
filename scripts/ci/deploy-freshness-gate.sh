#!/usr/bin/env bash
# scripts/ci/deploy-freshness-gate.sh
# STI-601: decide whether the cron backstop still needs to deploy main.
#
# The predicate this replaces asked one question:
#
#   "does SOME recent SUCCESSFUL run of deploy.yml carry head_sha == main's head?"
#
# Run conclusion was the only signal it read. But a run whose `deploy` JOB was
# SKIPPED still reports run-level `conclusion: success`, so one green no-op
# satisfies the predicate permanently, and every later firing cites that no-op in
# turn. The backstop could therefore stop healing drift while staying green
# forever — a false green on delivery, the STI-226 class.
#
# Measured on STI-601 (2026-10-01, run 36803396902):
#
#   $ gh api repos/olivecasazza/stitch-ash/actions/runs/36803396902/jobs \
#       --jq '.jobs[]|{name,conclusion}'
#   {"conclusion":"success","name":"fresh-check"}
#   {"conclusion":"skipped","name":"deploy"}
#
# and, from that run's own fresh-check log:
#
#   main head: 7367c2f27d2981e85582d2dd516a199ce7fe2cd2
#   run 36785970511 already published main 7367c2f... — nothing to deploy.
#
# 36785970511 was ITSELF a skipped-deploy no-op. It published nothing, and the
# run citing it published nothing either.
#
# The gate now requires the cited run's `deploy` JOB to have concluded
# `success`. That combination — run succeeded AND the job that publishes ran and
# succeeded — is the only reading of the API that means "this commit was built
# and published". Everything else, including a run whose jobs cannot be read,
# fails OPEN.
#
# It still walks the candidate list rather than testing only the newest run,
# because of the shape the gate has always had to handle: a merge-triggered run
# records the PRE-merge PR head in head_sha (STI-434), so the newest successful
# run need not be the one that published main. Order-independence is a
# correctness property here, not a nicety.
#
# Usage:
#   deploy-freshness-gate.sh [--head-sha SHA] [--repo OWNER/NAME]
#                            [--deploy-job NAME] [--max-candidates N]
#                            [--github-output PATH]
#
# Writes a human-readable log and ends with exactly one verdict line,
# `needed=true` or `needed=false`. With --github-output it also appends the same
# `needed=` line to that file (the workflow's $GITHUB_OUTPUT).
#
# FAIL-OPEN CONTRACT: an unreadable main head, an unreadable run list, an
# unreadable jobs payload or a missing deploy job all print why and return
# needed=true. This gate must never be the reason the site stays stale — a
# redundant deploy costs minutes, a wrong needed=false costs correctness. The
# caller is responsible for defaulting to needed=true if this script cannot run
# at all; deploy.yml does that with an explicit guard.

set -uo pipefail

REPO="${DEPLOY_FRESHNESS_REPO:-${GITHUB_REPOSITORY:-}}"
DEPLOY_JOB="${DEPLOY_FRESHNESS_JOB_NAME:-deploy}"
MAX_CANDIDATES="${DEPLOY_FRESHNESS_MAX_CANDIDATES:-10}"
HEAD_SHA=""
GITHUB_OUTPUT_PATH=""

# Overridable so deploy-freshness-gate.test.sh can drive the gate offline with
# stub binaries instead of reaching the real GitHub API.
GH_BIN="${DEPLOY_FRESHNESS_GH_BIN:-gh}"
GIT_BIN="${DEPLOY_FRESHNESS_GIT_BIN:-git}"

usage() { sed -n '2,53p' "${BASH_SOURCE[0]}"; }

while [ $# -gt 0 ]; do
  case "$1" in
    --head-sha) HEAD_SHA="$2"; shift 2 ;;
    --repo) REPO="$2"; shift 2 ;;
    --deploy-job) DEPLOY_JOB="$2"; shift 2 ;;
    --max-candidates) MAX_CANDIDATES="$2"; shift 2 ;;
    --github-output) GITHUB_OUTPUT_PATH="$2"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "unknown option: $1" >&2; exit 2 ;;
  esac
done

ERR_FILE="$(mktemp)"
trap 'rm -f "$ERR_FILE"' EXIT

# Every verdict goes through here so the stdout line and $GITHUB_OUTPUT can
# never disagree.
verdict() {
  echo "needed=$1"
  if [ -n "${GITHUB_OUTPUT_PATH}" ]; then
    echo "needed=$1" >> "${GITHUB_OUTPUT_PATH}"
  fi
  exit 0
}

fail_open() {
  echo "$1"
  echo "Failing OPEN — deploying."
  verdict true
}

# Values below are interpolated into jq programs and into a git URL, so validate
# rather than trust. Anything unexpected fails OPEN rather than building a
# filter that matches nothing and reads as drift forever.
if ! [[ "${DEPLOY_JOB}" =~ ^[A-Za-z0-9_.:-]+$ ]]; then
  fail_open "Refusing to interpolate an implausible deploy job name: '${DEPLOY_JOB}'."
fi
if ! [[ "${MAX_CANDIDATES}" =~ ^[0-9]+$ ]] || [ "${MAX_CANDIDATES}" -lt 1 ]; then
  fail_open "Refusing to use a non-positive --max-candidates: '${MAX_CANDIDATES}'."
fi

if [ -z "${HEAD_SHA}" ]; then
  if [ -z "${REPO}" ]; then
    fail_open "No --repo given and GITHUB_REPOSITORY is unset — cannot resolve main's head."
  fi
  HEAD_SHA="$("${GIT_BIN}" ls-remote "https://github.com/${REPO}.git" refs/heads/main 2>"${ERR_FILE}" | cut -f1)" \
    || HEAD_SHA=""
  if [ -z "${HEAD_SHA}" ]; then
    sed 's/^/  /' "${ERR_FILE}"
    fail_open "Could not read main's head from https://github.com/${REPO}.git."
  fi
fi

if ! [[ "${HEAD_SHA}" =~ ^[0-9a-f]{40}$ ]]; then
  fail_open "Main's head is not a 40-char lowercase sha: '${HEAD_SHA}'."
fi

echo "main head: ${HEAD_SHA}"
echo "gate: a run counts as published only if its '${DEPLOY_JOB}' job concluded success."

# Candidate runs: successful runs of THIS workflow carrying exactly main's head.
#
# --paginate is load-bearing, not an optimisation. Without it the search window
# is one page of `status=success` runs, and this workflow produces runs on a
# */30 cron plus one per merge: 100 successful runs is roughly two days. Once
# the site has been stable longer than that, the run that actually published
# main falls off page 1, the gate finds nothing, and every subsequent firing
# redeploys an identical artifact forever. That is the STI-433 problem the gate
# exists to prevent, reintroduced through the window rather than the predicate.
#
# Ordering across pages is preserved by the API (created_at desc), so walking
# the concatenated result is still newest-first.
#
# -X GET is required here for the same reason it is required on the jobs call:
# `gh api` infers POST as soon as a -f/-F field is present without it.
CANDIDATES_RAW="$("${GH_BIN}" api -X GET --paginate "repos/${REPO}/actions/workflows/deploy.yml/runs" \
  -f status=success -f per_page=100 \
  --jq "[.workflow_runs[] | select(.head_sha == \"${HEAD_SHA}\") | .id] | .[]" 2>"${ERR_FILE}")" \
  || CANDIDATES_RAW=""

if [ ! -s "${ERR_FILE}" ] && [ -z "${CANDIDATES_RAW}" ]; then
  # Not an error, and no candidates: nothing has ever published this commit.
  echo "No recent successful run of deploy.yml carries main ${HEAD_SHA} — deploying."
  verdict true
fi

if [ -s "${ERR_FILE}" ]; then
  sed 's/^/  /' "${ERR_FILE}"
  fail_open "Could not read the deploy.yml run list for ${REPO}."
fi

# Guard against anything that is not a bare run id reaching the jobs URL.
candidates=()
for id in ${CANDIDATES_RAW}; do
  if [[ "${id}" =~ ^[0-9]+$ ]]; then
    candidates+=("${id}")
  else
    echo "Ignoring implausible run id from the API: '${id}'."
  fi
done

if [ ${#candidates[@]} -eq 0 ]; then
  echo "No recent successful run of deploy.yml carries main ${HEAD_SHA} — deploying."
  verdict true
fi

echo "${#candidates[@]} successful run(s) carry main ${HEAD_SHA}; checking the '${DEPLOY_JOB}' job of each."

checked=0
for id in "${candidates[@]}"; do
  if [ "${checked}" -ge "${MAX_CANDIDATES}" ]; then
    echo "Stopped after ${checked} candidate(s) (--max-candidates)."
    break
  fi
  checked=$((checked + 1))

  : > "${ERR_FILE}"
  # -X GET is REQUIRED, not decoration. `gh api` infers the method from the
  # arguments and defaults to POST as soon as any -f/-F field is present, which
  # turns this into `POST .../jobs` -> HTTP 404. That was measured live against
  # the real API on 2026-10-01 while fixing STI-601: the run list call carries
  # `-X GET` and worked, the jobs call did not and 404'd on every candidate.
  # A 404 is indistinguishable from "no such run" unless you read it, so the
  # gate fails OPEN — which is safe but silently disables the whole backstop.
  deploy_conclusion="$("${GH_BIN}" api -X GET "repos/${REPO}/actions/runs/${id}/jobs" \
    -F per_page=100 \
    --jq "[.jobs[] | select(.name == \"${DEPLOY_JOB}\") | .conclusion][0] // \"absent\"" 2>"${ERR_FILE}")" \
    || deploy_conclusion=""

  if [ "${deploy_conclusion}" = "success" ]; then
    echo "run ${id} published main ${HEAD_SHA} (${DEPLOY_JOB} job: success) — nothing to deploy."
    verdict false
  fi

  if [ -s "${ERR_FILE}" ]; then
    sed 's/^/  /' "${ERR_FILE}"
    echo "run ${id}: jobs unreadable, so it cannot be shown to have published anything."
  elif [ -z "${deploy_conclusion}" ]; then
    echo "run ${id}: jobs query returned nothing, so it cannot be shown to have published anything."
  else
    echo "run ${id}: ${DEPLOY_JOB} job concluded '${deploy_conclusion}' — it published nothing."
  fi
done

# Every candidate was a green no-op or unreadable. Deploying is the safe answer:
# the site may be fine (STI-601 measured it fine) but the gate has no evidence
# that it is, and a redundant deploy costs minutes.
echo "No candidate run actually published main ${HEAD_SHA} — deploying."
verdict true
