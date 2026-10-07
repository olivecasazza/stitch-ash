# STI-433 bot-merge deploy gap — live closure proof

Recorded 2026-10-02. Companion to `STI-434-trigger-proof.md` (which proved the gap
was real) and `STI-469-trigger-audit.md` (which corrected the schedule-audit
claims). This file records the first *positive* proof that a GITHUB_TOKEN
squash-merge produced a deploy with no human or agent dispatching anything.

## The gap, restated

`on: push` fires only for non-`GITHUB_TOKEN` pushes. GitHub suppresses **all**
workflow events originating from a `GITHUB_TOKEN` actor, so a squash-merge
performed by `app/github-actions` landed on `main` without a deploy run and the
site silently drifted behind `main`.

The counter-example that proved it, from `STI-434-trigger-proof.md`:

```
$ gh api "repos/olivecasazza/stitch-ash/actions/runs?head_sha=9e7083ea..." -q .total_count
0
```

PR #51, `mergedBy={"login":"app/github-actions","is_bot":true}` — a real
ancestor of `main`, and **zero** workflow runs of any kind.

## The fix

`auto-merge.yml` waits (bounded) for the merge commit to actually exist, then
issues `repository_dispatch` with `client_payload.sha` set to that commit.
`deploy.yml` treats `client_payload.sha` as authoritative and falls back to
`main` when absent.

This is the one GitHub-documented escape from the recursion guard:

> With the exception of `workflow_dispatch` and `repository_dispatch`, other
> `GITHUB_TOKEN`-triggered events do not create workflow runs at all.

No new secret is required — the dispatch is created with the same
`GITHUB_TOKEN` that performed the merge.

## The proof

PR #179, `fix(STI-618): make the catalog able to declare the live shipping rates`.

```
$ gh pr view 179 --json mergedAt,mergedBy,mergeCommit,headRefOid
mergedAt=2026-10-02T08:36:29Z
mergedBy={"login":"app/github-actions","is_bot":true}
mergeCommit=e06f26a26f63f2417fe55bff5bdaed58aa13ec17
head=706bacbc
```

The merge was performed by the Actions app — the exact actor that produced zero
runs for PR #51. The dispatch that followed:

```
$ gh api "repos/olivecasazza/stitch-ash/actions/runs/36985017627"
actor: github-actions[bot] | event: repository_dispatch | head: e06f26a2 | success
```

`actor` is `github-actions[bot]`, confirming the dispatch was created by a
`GITHUB_TOKEN` and not by a human or an agent. `head_sha` is the **post-merge**
commit `e06f26a2`, not the pre-merge head `706bacbc` — so this is the correct
commit, and it is read from the API after the merge landed rather than taken
from a workflow payload.

Timing, which is the property that disqualified the `workflow_run` alternative:

| event                        | time (UTC) |
| ---------------------------- | ---------- |
| commit committer date        | 08:36:28Z  |
| PR merged (`app/github-actions`) | 08:36:29Z  |
| `repository_dispatch` created | 08:36:39Z  |
| deploy run created            | 08:36:41Z  |

The dispatch lands **10 seconds after** the merge, and carries the commit that
the merge created. The rejected `workflow_run` design completed 91s *before*
the merge landed on PR #41 and carried the pre-merge head; this design has the
opposite ordering on both counts.

### The deploy actually deployed

Run-level `conclusion` is not sufficient evidence. A run whose `deploy` job was
`skipped` still reports run conclusion `success` — that is precisely the
`STI-601` defect. So the job-level conclusion was read directly:

```
$ gh api "repos/olivecasazza/stitch-ash/actions/runs/36985020457/jobs" \
    -q '.jobs[] | "\(.name) \(.conclusion)"'
fresh-check success
deploy success
```

`deploy success`, not `skipped`. The artifact was built and published.

### main == live, at a commit SHA

```
$ git ls-remote origin refs/heads/main
e06f26a26f63f2417fe55bff5bdaed58aa13ec17	refs/heads/main
```

```
$ curl -sS -o /dev/null -w '%{http_code}\n' https://preview.stitch-ash.com/
200
```

The Nuxt payload embedded in the live HTML pins the build to that exact commit:

```js
app:{baseURL:"/",buildId:"e06f26a26f63f2417fe55bff5bdaed58aa13ec17",
     buildAssetsDir:"/_nuxt/",cdnURL:""}
```

`buildId` is byte-identical to remote `main`. The live site is serving the
bot-merge commit, which closes both STI-433 (bot-merge deploy gap) and the
`STI-589`/`STI-542` family of "live cannot be pinned to a SHA" complaints for
this commit.

### Corroborating merges

The same pattern holds for the preceding two bot-merges, which are what makes
this a mechanism and not a single lucky run:

| commit    | merged by            | deploy run           | conclusion |
| --------- | -------------------- | -------------------- | ---------- |
| `e06f26a` | `app/github-actions` | 36985020457 (dispatch) | success |
| `3fa69a0` | `app/github-actions` | 36982980404 (dispatch) | success |
| `5884ae8` | `app/github-actions` | 36974230527 (dispatch) | success |

All three landed as squash-merges and all three were deployed by
`repository_dispatch` with no human dispatch.

## Why PR #51 got zero runs and PR #179 got a deploy

The difference is not the trigger set on `deploy.yml`. It is that the
`repository_dispatch` step did not exist on `main` when PR #51 merged — it
shipped afterwards, under STI-433. GitHub's suppression behaviour is unchanged;
the dispatch is the documented exception to it.

## Residual risk (unchanged, and not claimed closed by this file)

- **Cron delivery is still unproven.** The `*/30` backstop's observed firing
  rate remains below its nominal cadence. `STI-469-trigger-audit.md` §2 has the
  measurement. This file proves the *dispatch* path works; it says nothing about
  cron delivery.
- **The dispatch step can fail and degrade silently.** `auto-merge.yml` catches
  dispatch failures and relies on the cron backstop. If cron delivery is in fact
  unreliable, a dispatch failure has no real second line of defence yet.
- **Live verification covers the home page only.** `buildId` was read from the
  home page's HTML; per-route rendering was not separately exercised in this run.

## Reproduce

```sh
gh pr view 179 --json mergedAt,mergedBy,mergeCommit,headRefOid
gh api "repos/olivecasazza/stitch-ash/actions/runs/36985017627" \
    -q '"actor: \(.actor.login) | \(.event) | \(.head_sha[0:8]) | \(.conclusion)"'
gh api "repos/olivecasazza/stitch-ash/actions/runs/36985020457/jobs" \
    -q '.jobs[] | "\(.name) \(.conclusion)"'
git ls-remote origin refs/heads/main
curl -sS https://preview.stitch-ash.com/ | grep -o 'buildId:"[a-f0-9]*"'
```