# STI-469 trigger audit

Measurement taken 2026-09-28T07:33Z against `main` @ `650d11a`, from
`gh run list` / `gh api` against the raw Actions API (not the
`gh run list --event` filter). Companion to
[STI-434-trigger-proof.md](/STI-434-trigger-proof.md); this file records
what the audit in [STI-469](/STI/issues/STI-469) actually found, including
two premises in that audit that the data does not support.

## 1. Every merge by `app/github-actions` produces zero workflow runs

Not zero *deploy* runs — zero runs of **any** workflow, for that commit.
`STI-434` observed this for PR #51 and concluded the `push` trigger is
suppressed. The suppression is total, and the full merge history is now
large enough to see the boundary cleanly:

| PR  | merged (UTC)     | mergedBy           | merge SHA | push run | pull_request run |
| --- | ---------------- | ------------------ | --------- | -------- | ---------------- |
| 40  | 2026-09-27T22:25 | `app/github-actions`| `95e70fd` | none     | none             |
| 41  | 2026-09-27T21:21 | `app/github-actions`| `3183b9a` | none     | none             |
| 44  | 2026-09-27T21:55 | `app/github-actions`| `d1adb3d` | none     | none             |
| 45  | 2026-09-27T22:19 | `olivecasazza`     | `931c178` | `931c178`| none             |
| 47  | 2026-09-28T00:32 | `app/github-actions`| `7a39fe0` | none     | none             |
| 48  | 2026-09-27T23:20 | `olivecasazza`     | `ed41d4f` | `ed41d4f`| `c5b6606`        |
| 49  | 2026-09-27T23:27 | `olivecasazza`     | `c097f63` | `c097f63`| `d13a991`        |
| 50  | 2026-09-27T23:35 | `olivecasazza`     | `950b2c2` | `950b2c2`| `6328cd7`        |
| 51  | 2026-09-27T23:49 | `app/github-actions`| `9e7083e` | none     | none             |
| 53  | 2026-09-27T23:55 | `olivecasazza`     | `9b0cbdd` | `9b0cbdd`| `a5e5e1f`        |
| 54  | 2026-09-28T01:29 | `app/github-actions`| `7e3c263` | none     | none             |
| 55  | 2026-09-28T00:22 | `olivecasazza`     | `a539879` | `a539879`| `6df7e32`        |
| 56  | 2026-09-28T01:09 | `app/github-actions`| `9de00a4` | none     | none             |
| 57  | 2026-09-28T05:03 | `app/github-actions`| `a9a7436` | none     | none             |
| 59  | 2026-09-28T04:34 | `app/github-actions`| `d6b9b88` | none     | none             |
| 60  | 2026-09-28T04:20 | `app/github-actions`| `d2e93b1` | none     | none             |
| 61  | 2026-09-28T05:20 | `app/github-actions`| `52b365c` | none     | none             |
| 62  | 2026-09-28T05:44 | `app/github-actions`| `0defbdd` | none     | none             |
| 63  | 2026-09-28T07:03 | `app/github-actions`| `acb9803` | none     | none             |
| 65  | 2026-09-28T06:06 | `app/github-actions`| `7a62fc5` | none     | none             |
| 66  | 2026-09-28T06:52 | `app/github-actions`| `8ceffe2` | none     | none             |
| 67  | 2026-09-28T07:27 | `app/github-actions`| `650d11a` | none     | none             |

16 bot-merge PRs, 0 runs each. 5 PAT merges, a `push` run each. The split
is total and has no exceptions in this window.

**Correction to the STI-469 audit.** The audit reports
`push a539879 @ 00:22:13Z` as "the only auto coverage today" and describes
the 00:22 deploy as the PAT merge of `a539879`. That is right, but the
audit's framing — that coverage *stopped* at 00:22 — is wrong. `on: push`
has fired for exactly the merges that were never bots, back through
2026-08. It has not regressed, and there is nothing to repair on the
`push` path itself. The bot-merge gap is the whole of the problem, and it
was already fully characterised in `deploy.yml` and on STI-434 before this
audit was filed.

**The drift is real, and its cause is unambiguous:** every merge on this
repo now happens through `app/github-actions`, so `on: push` and
`on: pull_request: closed` are both dead, and only a hand-dispatched
`workflow_dispatch` deploys. Auto coverage today is 0 of 10, not 1 of 10 —
the `01:55:20Z` schedule run deployed `7e3c263`, which was 6 commits
behind `main` at the time, so it healed nothing.

## 2. The `*/30` cron is not broken, and the GM's "scheduler is fine" inference is unsound

The audit argues the `schedule` trigger is being ignored while "the
Actions scheduler ran ~20 other workflows normally" in the same window,
so GitHub is up and the trigger specifically is broken. Both halves of
that inference fail.

**No other workflow in this repo has a `schedule` at all.** Across all
eleven files in `.github/workflows/`, `deploy.yml` is the only one
declaring `on: schedule`. There is no control group. The ~20 runs the audit
cites were `pull_request` and `workflow_run` events, which is what those
workflows trigger on:

```
pr-checks      05:41:03  05:43:27  05:46:03  05:47:42  07:00:45  pull_request
preview-gate   05:41:03  05:43:27  05:46:03  05:47:42  07:00:45  pull_request
semver-label   05:41:03  05:43:27  05:46:03  05:47:42  07:30:24  pull_request
auto-merge     06:05:02  06:06:45  06:51:01  07:00:45             workflow_run / pull_request
```

"Other workflows ran" is therefore not evidence that the cron scheduler
is healthy — it is evidence that PR-driven events fire, which was never in
question.

**`deploy.yml` has only had a `schedule` for 9.5 hours.** It was added by
`d1adb3d` at `2026-09-27T21:55:58Z` and coarsened to `*/30` by `7e3c263` at
`2026-09-28T01:29:20Z`. Expected firings since then are ~12. Observed: 1.
That is a real miss rate — 1 in 12, not "1 in 7 days" and not "all time
zero" — but the honest characterisation is that the mechanism is *under-
observed on a sample too small to separate "GitHub dropped the crons" from
"crons are firing and `fresh-check` is doing its job"*.

**It may in fact be doing its job.** The `01:55:20Z` firing exists and the
`*/30` cadence is quiet afterwards. The `fresh-check` job skips the deploy
when the most recent successful run already published main's head, so
crons that find nothing to do still leave a run in history. A cron run
absent from `gh run list` is not proof of non-delivery. Distinguishing
"not delivered" from "delivered and skipped" needs the run-count
over a longer window, which is a measurement, not a conclusion.

**Correction to the in-file comment.** `deploy.yml` asserts
"`on: schedule` — 0 firings, all time". That is now false: there is one, at
`2026-09-28T01:55:20Z`, run `36367814346`. Both the number and the
"all time" framing are corrected in `deploy.yml` by this PR.

## 2a. Second firing: the backstop is load-bearing, measured

Re-measured 2026-09-28T08:53Z, after §2 above was first written. A second
schedule event has since been delivered, and it is the one that settles the
question this file was written to leave open.

```
$ gh api "repos/olivecasazza/stitch-ash/actions/workflows/deploy.yml/runs?event=schedule" \
    --jq '.workflow_runs[] | "\(.created_at) \(.conclusion) \(.head_sha[0:7]) run=\(.id)"'
2026-09-28T08:31:30Z success fb5fe11 run=36397871109
2026-09-28T01:55:20Z success 7e3c263 run=36367814346
```

Both are successful **deploys**, not no-op firings. The second one is
attributable to no human or agent:

```
$ gh pr view 72 --json mergedAt,mergedBy,mergeCommit
merged 2026-09-28T08:31:19Z by app/github-actions -> fb5fe11

$ gh api "repos/olivecasazza/stitch-ash/actions/runs?head_sha=fb5fe1158..." \
    --jq '.workflow_runs[] | "\(.created_at) \(.event) \(.name)"'
2026-09-28T08:31:30Z schedule         Deploy to Cloudflare Pages
2026-09-28T08:44:10Z workflow_run      Auto-merge
```

There is no `workflow_dispatch` run carrying `fb5fe11`, and the only deploy
runs in 08:20Z–08:50Z are that cron and a later hand-dispatch of a different
SHA (`b8bd6f2`). The cron picked up a GITHUB_TOKEN merge 11 seconds after it
landed and published it unattended. That is precisely the case the backstop
was added for, working.

**What this changes, and what it does not.** The GM audit's claim that `on:
schedule` is not honoured is falsified for the second time, with a stronger
counter-example than the first. It does not establish a delivery *rate* — two
observed firings against roughly twenty expected on the `*/30` cadence is still
a small sample, and the un-attributable-cause caveat in §2 stands. What is no
longer open is whether the mechanism works. It does.

**Correction to §1's "auto coverage is 0 of 10".** Still true as measured at
07:33Z, because every one of those deploys was hand-dispatched or deployed a
SHA already 6 commits stale. It is no longer a statement about the pipeline's
capability. The 08:31:30Z firing is the first deploy in the window that was
neither hand-dispatched nor wasted, and it is the first datapoint for a
coverage rate that will only become meaningful over the next day or two.

## 3. Answer to the question actually asked: do not plumb `repository_dispatch`

The audit offers two routes. Both are declined, and a third is chosen.

**`repository_dispatch` — declined.** The audit's own precondition is
correct: native auto-merge does not emit a dispatch, so `auto-merge.yml`
would have to perform the squash merge itself via the contents API and then
dispatch. That trades a working, GitHub-native merge for a hand-rolled one
that must reproduce the merge message, rebase onto a moving `main`, handle
`base`-branch races, and stay correct across every future repo setting — to
buy a trigger that fires a workflow nobody can stop from firing. It is the
most complex change available for the least reliable gain.

**`push` coverage via PAT — declined.** This is the cheap route and it
works, but it is not a pipeline fix. It removes the only automatic
mechanism the pipeline has and makes every merge a manual act by a human
credential, which is the same babysitting the issue is trying to remove,
moved one layer down. The gap is "auto-merge is more autonomous than
deploy" and cutting auto-merge to fix a deploy is backwards.

**Chosen: `auto-merge` dispatches the deploy itself.** `auto-merge.yml`
already runs on every one of these merges. Rather than change *how* the
merge happens, keep the native auto-merge exactly as it is and have the
workflow issue a `repository_dispatch` carrying the post-merge SHA after
the merge lands. `deploy.yml` gains `repository_dispatch` and checks out
the dispatched SHA rather than `main`. The native merge stays, the token
stays `GITHUB_TOKEN`, and the dispatch is not suppressed for
`GITHUB_TOKEN` actors — the one mechanism that has never been suppressed
for a `GITHUB_TOKEN` actor. Nothing that currently works is touched.

This PR carries the comment and audit corrections, which are
documentation-only and reviewable on their own merits. The
`auto-merge.yml` → `repository_dispatch` plumbing is **not** in this PR:
it changes merge automation for the whole repo and needs the reviewer's
decision that STI-434 deliberately left open, so it is filed separately
rather than landed unilaterally.

## Reproduce

```sh
# 1. bot merges produce no runs at all; PAT merges do
gh pr view 51 --json mergedBy,mergeCommit
gh api "repos/olivecasazza/stitch-ash/actions/runs?head_sha=9e7083e..." -q .total_count   # 0
gh api "repos/olivecasazza/stitch-ash/actions/workflows/deploy.yml/runs?event=schedule" \
  --jq '.workflow_runs[] | "\(.created_at) \(.head_sha[0:7]) \(.conclusion)"'            # 1 row

# 2. deploy.yml is the only workflow here with a schedule
grep -l 'schedule:' .github/workflows/*.yml                                                # deploy.yml only

# 3. the schedule itself is 9.5h old
git log -S'schedule:' --format='%cI %h %s' origin/main -- .github/workflows/deploy.yml     # d1adb3d 2026-09-27T21:55:58Z
git log -S'*/30'      --format='%cI %h %s' origin/main -- .github/workflows/deploy.yml     # 7e3c263 2026-09-28T01:29:20Z
```
