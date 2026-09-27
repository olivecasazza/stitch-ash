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

## Outcome

_appended after the run completes_
