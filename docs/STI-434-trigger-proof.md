# STI-434 trigger proof

Live observation log for the deploy-trigger fix merged as `ed41d4f0`
([STI-434](/STI/issues/STI-434)).

## Why this file exists

The deploy fix in `ed41d4f0` adds a `pull_request: closed` trigger so a
bot-merge deploys without a manual `workflow_dispatch`. Proving that
trigger works requires a merge performed by GitHub's own auto-merge
service, because a merge made with a personal access token fires
`on: push` as well and therefore cannot isolate the new trigger.

This file is the payload of a documentation-only pull request merged by
GitHub native auto-merge. It changes no build, no component, no token,
and no deploy configuration. It exists so the auto-merge path is
exercised and the resulting deploy run can be observed by head SHA.

## What to look for

A `Deploy to Cloudflare Pages` run whose `event` is `pull_request`,
created within seconds of the bot-merge, with no `workflow_dispatch`
in between and no human redeploy.

## Result of the `ed41d4f0` proof PR

The first attempt to prove the trigger did **not** prove it, and the reason
is worth recording because it is a trap that is easy to fall into twice.

PR #53 merged as `9b0cbdd` at 23:55:37Z with `mergedBy = olivecasazza`.
That is a personal access token, not `GITHUB_TOKEN`, so the merge also
fired `on: push`. Two deploy runs followed, two seconds apart:

    event=push          sha=9b0cbdd  23:55:39Z
    event=pull_request  sha=a5e5e1f  23:55:39Z

The `push` run means GitHub did **not** suppress the event for this merge,
so the run tells you nothing about whether a `GITHUB_TOKEN` merge would
have produced a deploy. The `pull_request` run that would have been the
proof was triggered by the PR head SHA (`a5e5e1f`), not by the merge
commit.

The cause is the arming step. Enabling auto-merge with a PAT records
`autoMergeRequest.enabledBy = olivecasazza`, and the native auto-merge
service then performs the merge as that user. `auto-merge.yml` calling
`enablePullRequestAutoMerge` is idempotent and does not re-own an
already-enabled request. So to exercise the `GITHUB_TOKEN` path, auto-merge
must be armed by the workflow and not by a human or agent beforehand.

A first, inconclusive data point: after the cron was coarsened to `*/30`,
GitHub still has not delivered a single schedule event. Every run this repo
has ever produced, enumerated through the raw API rather than the
`gh run list --event schedule` filter, carries an event that is one of
`push`, `pull_request` or `workflow_dispatch`. The cron is therefore not
load-bearing on this repo and nothing waits on it.

## Outcome: `pull_request: closed` does NOT fire for a GITHUB_TOKEN bot-merge

**Result: the `ed41d4f0` trigger does not cover the case it was written
for.** PR #51 is the controlled experiment, and it is a counter-example.

PR #51 is the first merge performed by GitHub's own auto-merge service
that landed *after* the `pull_request: closed` trigger reached `main` at
23:20:36Z:

```
$ gh pr view 51 --repo olivecasazza/stitch-ash \
    --json number,mergedAt,mergedBy,mergeCommit,headRefOid
{"number":51,
 "mergedAt":"2026-09-27T23:49:51Z",
 "mergedBy":{"login":"app/github-actions","is_bot":true},
 "mergeCommit":{"oid":"9e7083ea724d8c3c8a5953af7aff183638656d8d"},
 "headRefOid":"ac4d24dc4aeb7bca7028ac1283f0a8160c40a604",
 "headRefName":"docs/STI-328-gtm-readiness"}
```

`9e7083ea` is a real ancestor of `main`. Not one workflow run was created
for it, by any workflow, in any event type:

```
$ gh api "repos/olivecasazza/stitch-ash/actions/runs?head_sha=9e7083ea724d8c3c8a5953af7aff183638656d8d" --jq '.total_count'
0
$ gh api "repos/olivecasazza/stitch-ash/actions/workflows/deploy.yml/runs?per_page=100&branch=docs/STI-328-gtm-readiness" --jq '.total_count'
0
```

`0` is not a filter artefact. The four `pull_request` runs that *do*
exist for that branch all carry `head=ac4d24dc` — the pre-merge PR head —
and all four were created at 23:48:13Z, 98 seconds *before* the merge,
for `opened`/`synchronize`:

```
2026-09-27T23:48:13Z  Auto-merge            head=ac4d24dc
2026-09-27T23:48:13Z  PR Checks             head=ac4d24dc
2026-09-27T23:48:13Z  Preview Gate          head=ac4d24dc
2026-09-27T23:48:13Z  Semver Label          head=ac4d24dc
```

The `closed` event at 23:49:51Z — the exact event `deploy.yml` now
subscribes to — produced no run at all. `deploy.yml` had been on `main`
with `types: [closed]` for 29 minutes at that point.

### The controlled comparison

Every merge on `main` after the trigger landed, with the deploy runs it
produced (`gh api .../workflows/deploy.yml/runs`, full run list):

| PR | merged (UTC) | `mergedBy` | `push` run | `pull_request` run |
|----|--------------|------------|-----------|--------------------|
| #48 | 23:20:34 | `olivecasazza` (PAT) | `36358367571` | `36358368384` |
| #49 | 23:27:14 | `olivecasazza` (PAT) | `36358742010` | `36358742266` |
| #50 | 23:35:11 | `olivecasazza` (PAT) | `36359195253` | `36359195453` |
| **#51** | **23:49:51** | **`app/github-actions`** | **none** | **none** |
| #53 | 23:55:37 | `olivecasazza` (PAT) | `36360315984` | `36360315906` |
| #55 | 00:22:11 | `olivecasazza` (PAT) | `36361968799` | `36361969147` |

Five PAT merges, five merge-triggered deploys. One bot-merge, zero runs
of any kind. The correlation is exact.

### Why

GitHub suppresses *all* workflow events originating from a
`GITHUB_TOKEN` action — this is the same recursion guard that made
`on: push` unreliable, and it is not limited to `push`. Enabling
auto-merge with `GITHUB_TOKEN` in `auto-merge.yml` causes the native
auto-merge service to merge the PR as the Actions app, and every event
that merge would produce is suppressed along with it, including
`pull_request: closed`.

So the three mechanisms evaluated across STI-433 and STI-434 are now
all accounted for, and only one survives:

* `on: push` — suppressed for a `GITHUB_TOKEN` merge. (STI-433)
* `on: workflow_run` off Auto-merge — attaches to a run that finishes
  ~91s *before* the merge lands, carrying the pre-merge head.
  (rejected on STI-433)
* `on: pull_request: closed` — suppressed for a `GITHUB_TOKEN` merge.
  (this document)
* `on: repository_dispatch` — **not yet evaluated as the primary
  trigger.** `deploy.yml`'s header currently rejects it on the grounds
  that `auto-merge.yml` exits before the merge exists, so there is
  nothing to dispatch from. That reasoning is right about *where* to
  fire it and wrong about *whether* it can be made to work: the only
  events GitHub does not suppress for a `GITHUB_TOKEN` actor are
  `workflow_dispatch` and `repository_dispatch`. That makes option 2
  in the STI-434 issue the only untested mechanism left, and it needs
  `auto-merge.yml` to perform the merge itself (via the contents API
  rather than by arming native auto-merge) so that a dispatch carrying
  the real merge SHA can be issued afterwards. That is a design change
  to how merges happen on this repo, so it is a reviewer's call, not a
  unilateral edit.

The cron remains undelivered — 0 schedule events across every run this
repo has ever produced — and is correctly not load-bearing.

## Outcome

- [ ] A `GITHUB_TOKEN` bot-merge caused a deploy — **NOT MET. Refuted by
      PR #51** (merge `9e7083ea`, `mergedBy=app/github-actions`, 0 runs).
- [x] `fresh-check` executes rather than reporting `skipped` — **MET**, on
      every event since `9b0cbdd2` landed. Run `36360315984`, job
      `fresh-check` `success`, log:

      ```
      2026-09-27T23:57:05.6996111Z main head: 9b0cbdd27165a91f6b1a57e3d32deedc3867f854
      2026-09-27T23:57:08.1734925Z No recent successful deploy published main 9b0cbdd27165a91f6b1a57e3d32deedc3867f854 — deploying.
      2026-09-27T23:57:08.1920907Z Set output 'needed'
      ```

      It reported `needed=true` correctly: at that moment the newest
      successful deploy was `950b2c2b`, so `9b0cbdd2` was genuinely not
      live yet. The gate's drift signal is now real, and it fails open on
      an unreadable history.
- [ ] A `schedule` run observed — **NOT MET.** 0 firings, all time,
      before and after the coarsening to `*/30`.
