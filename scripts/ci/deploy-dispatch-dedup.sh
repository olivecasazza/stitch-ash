#!/usr/bin/env bash
# scripts/ci/deploy-dispatch-dedup.sh
# STI-620: decide whether auto-merge.yml should dispatch deploy-main for a merge
# commit it has already dispatched.
#
# THE DEFECT THIS FIXES
#
# auto-merge.yml arms GitHub native auto-merge and then waits for the merge to
# land so it can dispatch the post-merge commit. That job re-enters on
# pull_request, workflow_run (Semver Label completed), check_suite and status
# events, and every re-entry that happens AFTER the merge takes this fast path:
#
#   const alreadyMergedSha = await readMergedSha();
#   if (alreadyMergedSha) {
#     await dispatchDeploy(alreadyMergedSha);
#     return;
#   }
#
# readMergedSha is deterministic — for a given merged PR it always returns the
# same merge commit — but dispatchDeploy was called UNCONDITIONALLY on every
# re-entry. deploy.yml's freshness gate only short-circuits `schedule`, so a
# duplicate repository_dispatch is never skipped: it rebuilds and republishes
# the identical commit.
#
# Measured 2026-10-02 (deploy.yml runs, repository_dispatch, created >
# 2026-10-01T12:00:00Z, grouped by head_sha): 25 dispatch runs for 12 merges.
# The sharpest case is PR #179, merged 2026-10-02T08:36:29Z as e06f26a2 by
# app/github-actions: runs 36985017627 (08:36:39Z) and 36985020457 (08:36:41Z)
# are TWO SECONDS apart, both `success`, both publishing the same commit.
#
# WHY THE OBVIOUS FIX IS WRONG
#
# The tempting change is to skip a repository_dispatch in deploy.yml whenever
# the freshness gate says the commit is already live. That is a false green and
# it is exactly what STI-601 was filed for: the gate cites run history, so the
# FIRST dispatch of a genuinely new merge could be skipped as "already live" by
# an older no-op, and the merge would never deploy. Do not widen
# deploy-freshness-gate.sh for this. STI-601's gate is correct and stays as it is.
#
# WHY THIS IS NOT A RUN-HISTORY CHECK EITHER
#
# The obvious dedup is "has deploy.yml already got a run for this SHA?". It
# does not hold, and the reason is measurable from the data above: the duplicate
# dispatches land TWO SECONDS apart. GitHub creates the workflow run when the
# dispatch event is accepted, but the reads the dedup would perform and the
# write the winner performs are not ordered with respect to each other. Two
# invocations starting 2s apart can both read "no run for this SHA yet" and both
# dispatch. That converts 2-4 duplicates into a coin-flip 1-or-2, which is not
# the acceptance criterion (n = 1) and would silently vary run to run.
#
# WHAT THIS DOES INSTEAD
#
# A compare-and-swap on a git ref, which IS a real mutex. `POST /git/refs`
# creates the ref or fails with 422 Unprocessable Entity if it already exists.
# There is no read-then-write window, so of N simultaneous invocations exactly
# one wins the create and dispatches; the rest are told it was already dispatched
# and return. Ordering is irrelevant and simultaneity is safe.
#
# The ref namespace is refs/sti/deploy-dispatched/<merge-sha>. Writing a ref
# here cannot start a workflow:
#   * no workflow in this repo triggers on a tag or on an arbitrary ref (the
#     only `push` trigger is deploy.yml's `branches: [main]`), and
#   * refs written with GITHUB_TOKEN do not create workflow runs at all.
# So this is inert plumbing, invisible to the trigger set STI-433 established.
#
# FAIL-OPEN CONTRACT: anything this script cannot interpret — no SHA, a
# malformed SHA, an unreadable dispatch, an unexpected status — answers
# `dispatch=true`. A missed merge is healed by deploy.yml's */30 cron within one
# window; a deploy the site did not need costs minutes. Skipping a dispatch that
# should have happened is the expensive direction and must never be the default.
#
# Usage:
#   deploy-dispatch-dedup.sh --sha SHA [--repo OWNER/NAME] [--namespace NS]
#                           [--github-output PATH]
#
# Writes a human-readable log and ends with exactly one verdict line,
# `dispatch=true` or `dispatch=false`. With --github-output it also appends the
# same `dispatch=` line to that file ($GITHUB_OUTPUT). The verdict is emitted
# through a single function so stdout and $GITHUB_OUTPUT can never disagree.
#
# The dispatch itself stays in auto-merge.yml. This script only owns the
# "has this merge commit already been dispatched?" question, which is the part
# with a subtle failure mode, and the part that has to be testable offline.

set -uo pipefail

REPO="${DEPLOY_DEDUP_REPO:-${GITHUB_REPOSITORY:-}}"
NAMESPACE="${DEPLOY_DEDUP_NAMESPACE:-sti/deploy-dispatched}"
SHA=""
GITHUB_OUTPUT_PATH=""

# Overridable so deploy-dispatch-dedup.test.sh can drive this offline with a
# stub binary instead of reaching the real GitHub API. Same shape as
# deploy-freshness-gate.sh, and deliberately the same env var naming convention.
GH_BIN="${DEPLOY_DEDUP_GH_BIN:-gh}"

usage() { sed -n '2,83p' "${BASH_SOURCE[0]}"; }

while [ $# -gt 0 ]; do
  case "$1" in
    --sha) SHA="$2"; shift 2 ;;
    --repo) REPO="$2"; shift 2 ;;
    --namespace) NAMESPACE="$2"; shift 2 ;;
    --github-output) GITHUB_OUTPUT_PATH="$2"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "unknown option: $1" >&2; exit 2 ;;
  esac
done

ERR_FILE="$(mktemp)"
trap 'rm -f "$ERR_FILE"' EXIT

# Every verdict goes through here so stdout and $GITHUB_OUTPUT cannot disagree.
# This is the same shape as deploy-freshness-gate.sh's verdict(): a future edit
# that adds a second `echo dispatch=` on some path would be a bug the tests
# below are shaped to catch.
verdict() {
  echo "dispatch=$1"
  if [ -n "${GITHUB_OUTPUT_PATH}" ]; then
    echo "dispatch=$1" >> "${GITHUB_OUTPUT_PATH}"
  fi
  exit 0
}

fail_open() {
  echo "$1"
  echo "Failing OPEN — dispatching."
  verdict true
}

# NAMESPACE is interpolated into a ref path, so validate rather than trust. A
# ref path that GitHub would reject would make the create fail, and a naive
# implementation would read that failure as "already dispatched" — i.e. a
# malformed namespace would silently disable every bot-merge deploy, the one
# failure mode this script exists to remove.
if ! [[ "${NAMESPACE}" =~ ^[A-Za-z0-9._/-]+$ ]]; then
  fail_open "Refusing to interpolate an implausible ref namespace: '${NAMESPACE}'."
fi
# A trailing slash or an empty segment makes an invalid ref; catch it here so
# it cannot be mistaken for a duplicate below.
case "${NAMESPACE}" in
  */|/*|*/./*|*/../*|*/..|*/.)
    fail_open "Refusing to interpolate a ref namespace with an empty or relative segment: '${NAMESPACE}'."
    ;;
esac

if [ -z "${SHA}" ]; then
  fail_open "No --sha given; a dedup decision needs the merge commit it is deciding about."
fi

# GitHub commit SHAs are 40 lowercase hex characters. A SHA that does not match
# cannot be a real merge commit, and building a ref out of it would either be
# rejected outright or — worse — be treated as "first time seeing this" on every
# invocation. Refusing here is the difference between a loud no-op and a dedup
# gate that never dedupes.
if ! [[ "${SHA}" =~ ^[0-9a-f]{40}$ ]]; then
  fail_open "Merge commit is not a 40-char lowercase sha: '${SHA}'."
fi

if [ -z "${REPO}" ]; then
  fail_open "No --repo given and GITHUB_REPOSITORY is unset — cannot record the dispatch."
fi

REF="refs/${NAMESPACE}/${SHA}"

echo "merge commit: ${SHA}"
echo "dedup ref:    ${REF}"
echo "rule: create-ref-if-absent. 201 = nobody has dispatched this commit yet, 422 = somebody already has."

# The create must succeed or fail ATOMICALLY, which is why this is a create and
# not a get-then-set. `-X POST` is explicit because `gh api` infers POST from the
# presence of any -f field anyway, and stating it keeps the request readable and
# keeps it stable if that inference ever changes.
#
# The ref must point at a commit that exists, so the merge SHA itself is the
# natural target: it is reachable (readMergedSha already confirmed it with a
# getCommit call before dispatching) and it makes the ref self-describing — the
# ref name and the ref target are the same commit.
: > "${ERR_FILE}"
if created="$("${GH_BIN}" api -X POST "repos/${REPO}/git/refs" \
  -f ref="${REF}" \
  -f sha="${SHA}" \
  --jq '.ref' 2>"${ERR_FILE}")"; then

  if [ "${created}" = "${REF}" ]; then
    echo "Created ${REF} — this invocation owns the dispatch for ${SHA}."
    verdict true
  fi

  # A 2xx that did not echo back the ref we asked for means we cannot prove the
  # CAS took effect. Guessing "created" here could dispatch twice, which is the
  # exact waste this script exists to remove; guessing "already dispatched" could
  # skip a merge. Fail open and let the cron backstop cover it.
  fail_open "Ref create returned 2xx but not the requested ref ('${created:-<empty>}'); cannot prove the CAS took effect."
fi

# The create failed. This is the interesting case, and it is NOT automatically
# "already dispatched" — it is only that if the API said the ref already exists.
# Everything else (403, 422 for a malformed ref, 500, a network error, gh not
# installed) must dispatch, or a permission problem would silently stop every
# bot-merge deploy from ever being requested.
if grep -qiE 'already exists|Unprocessable Entity|HTTP 422' "${ERR_FILE}"; then
  echo "Ref ${REF} already exists — ${SHA} was dispatched by an earlier invocation of this job."
  verdict false
fi

sed 's/^/  /' "${ERR_FILE}"
fail_open "Could not record the dispatch for ${SHA}, and the API did not report the ref as existing."