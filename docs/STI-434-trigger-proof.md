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

## Outcome

_appended after the run completes_
