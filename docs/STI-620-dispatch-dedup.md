# STI-620 — every bot-merge published the same commit 2–4 times

Status: fixed. The duplicate `repository_dispatch` is suppressed at the source
in `auto-merge.yml` by a compare-and-swap on a git ref.

A non-blocking efficiency defect in the plumbing [STI-433](/STI/issues/STI-433)
added. Found while verifying STI-433 on 2026-10-02.

## 1. The defect

STI-433 closed the bot-merge deploy gap by having `auto-merge.yml` wait for the
merge to land and then send `deploy-main` to `deploy.yml` as a
`repository_dispatch`. That fix works. What it left behind is a trigger that
over-fires.

`auto-merge.yml` re-enters many times per PR:

```yaml
on:
  pull_request: [labeled, unlabeled, opened, synchronize, reopened, ready_for_review]
  workflow_run: [Semver Label completed]
  check_suite: [completed]
  status: {}
```

Its own comment says so: *"This job re-enters on every check_suite/status/
synchronize event and on the Semver Label workflow_run, so this block runs many
times per PR."* Most of those re-entries land **after** the merge, and each took
the fast path:

```js
const alreadyMergedSha = await readMergedSha();
if (alreadyMergedSha) {
  await dispatchDeploy(alreadyMergedSha);
  return;
}
```

Correct for *not missing* a merge, wrong for not repeating one.
`readMergedSha` is deterministic — a merged PR always returns the same commit —
and `dispatchDeploy` was called unconditionally. Meanwhile `deploy.yml`'s
freshness gate short-circuits only `schedule`:

```yaml
if: >-
  ${{ always()
      && (github.event_name != 'schedule' || needs.fresh-check.outputs.needed == 'true')
      && (github.event_name != 'pull_request' || github.event.pull_request.merged) }}
```

so a duplicate `repository_dispatch` is never skipped. It rebuilds and
republishes.

## 2. Before-state measurement

`deploy.yml` runs, event `repository_dispatch`, `created > 2026-10-01T12:00:00Z`,
grouped by `head_sha`:

```
$ gh run list --workflow deploy.yml --limit 100 \
    --json databaseId,headSha,conclusion,event,createdAt \
    -q '.[] | select(.event=="repository_dispatch") | "\(.createdAt) \(.headSha[0:8]) \(.conclusion) run=\(.databaseId)"'
2026-10-02T08:36:41Z e06f26a2 success run=36985020457
2026-10-02T08:36:39Z e06f26a2 success run=36985017627
2026-10-02T08:15:06Z 3fa69a04 success run=36982980404
2026-10-02T08:15:04Z 3fa69a04 success run=36982976036
...
```

Every SHA appears twice or four times. The sharpest case is PR #179:

```
$ gh pr view 179 --json mergedAt,mergeCommit,mergedBy
mergedAt 2026-10-02T08:36:29Z
mergeCommit.oid e06f26a26f63f2417fe55bff5bdaed58aa13ec17
mergedBy {"login":"app/github-actions","is_bot":true}
```

The merge landed at 08:36:29Z. Runs `36985017627` (08:36:39Z) and `36985020457`
(08:36:41Z) are **two seconds apart**, both `success`, both building and
publishing `e06f26a2`. Full counts since STI-433 landed: 25 `repository_dispatch`
runs for 12 merges.

Every duplicate publishes the **same** commit, so there is no drift risk and no
ordering hazard — the earliest successful run is already correct. The cost is
Actions minutes and redundant Cloudflare deployment churn. That is why this is
`medium` and not urgent.

## 3. What was NOT done, and why

**Widening `deploy-freshness-gate.sh` to cover `repository_dispatch` is wrong and
would reintroduce STI-601.** The gate's job is to answer "is this commit already
live" by citing run history. Applied to a dispatch event, the *first* dispatch of
a genuinely new merge can be skipped as "already live" by a green no-op that
cited an older SHA — precisely the false green STI-601 was filed for. The file is
untouched by this change, and
`deploy-dispatch-dedup.test.sh` asserts that `deploy.yml`'s freshness clause is
still scoped to `schedule` so this cannot be reintroduced later.

**Deduplicating on `deploy.yml` run history is racy.** The obvious alternative —
"has deploy.yml already got a run for this SHA?" — cannot reach n=1, and the
measurement says why: the duplicate dispatches land **two seconds apart**. The
read the dedup performs and the write the winner performs are not ordered with
respect to each other, so two invocations starting 2s apart can both observe "no
run for this SHA yet" and both dispatch. That converts 2–4 duplicates into a
coin-flip 1-or-2 and would vary run to run.

## 4. The fix

Suppressed at the source, per this issue's preference order, with a
**compare-and-swap on a git ref**:

```
refs/sti/deploy-dispatched/<merge-sha>  ->  <merge-sha>
```

`POST /git/refs` creates the ref or fails with `422 Reference already exists`.
That is a true mutex: of N simultaneous invocations exactly one wins the create
and dispatches, the rest are told it was already dispatched and return. There is
no read-then-write window, so simultaneity is safe and ordering is irrelevant.

`dispatchDeploy` in `auto-merge.yml` calls
`scripts/ci/deploy-dispatch-dedup.sh` first and only sends `deploy-main` when the
gate answers `dispatch=true`. Both call sites — the fast path and the wait path
— route through it, so one guard covers both.

### Why writing a ref here is inert

* The only `push` trigger in the repo is `deploy.yml`'s `branches: [main]`. No
  workflow triggers on a tag or on an arbitrary ref.
* Refs written with `GITHUB_TOKEN` do not create workflow runs at all.

So this adds nothing to the trigger set STI-433 established, and the
`permissions:` block is unchanged — `contents: write` was already there.

### Fail-open, everywhere

No script, no token, an unreachable API, a 403, a malformed SHA, an
implausible namespace, a `2xx` that did not echo back the requested ref — all
answer `dispatch=true`.

The direction matters. A missed dispatch is healed by `deploy.yml`'s `*/30` cron
within one window; a redundant deploy costs minutes. A dedup gate that could
report "already dispatched" when it simply failed to find out would turn a
permission mistake into a permanently silent deploy gap, which is a far worse
failure than the one being fixed.

The claim is written *before* the dispatch, deliberately. Claiming after would
reopen the race this fixes: two invocations would both see an unclaimed ref and
both dispatch.

## 5. Tests

`scripts/ci/deploy-dispatch-dedup.test.sh` — offline, stubbed `gh`, no token, no
Node, sub-second. Run by `pr-checks.yml` alongside the STI-601 gate, because
both guard the publish path.

```
$ ./scripts/ci/deploy-dispatch-dedup.test.sh
STI-620 deploy dispatch dedup
  ok   already-dispatched merge is not dispatched again (dispatch=false)
  ok   first dispatch of a new merge proceeds (dispatch=true)
  ok   dedup is a single create, never a read-then-write (dispatch=true)
  ok   no GET precedes the create
  ok   create is an explicit POST
  ok   ref name carries the merge sha
  ok   a different merge sha is a different ref (dispatch=true)
  ok   unreachable api fails open (dispatch=true)
  ok   forbidden ref write fails open (dispatch=true)
  ok   implausible sha fails open (dispatch=true)
  ok   short sha fails open (dispatch=true)
  ok   uppercase sha fails open (dispatch=true)
  ok   malicious namespace fails open (dispatch=true)
  ok   namespace with empty segment fails open (dispatch=true)
  ok   namespace ending in a slash fails open (dispatch=true)
  ok   missing repo fails open (dispatch=true)
  ok   --github-output carries the verdict
  ok   --github-output carries the suppressed verdict
  ok   exactly one verdict line (dispatch=false)
  ok   exactly one verdict line (dispatch=true)
  ok   gate does not dispatch
  ok   gate does not read deploy.yml run history
  ok   deploy.yml freshness clause still scoped to schedule

23 passed, 0 failed
```

The suite goes RED against a gate that does not dedup, and against the rejected
run-history alternative. A test that passes against a broken gate is not a test:

```
$ GATE_UNDER_TEST=<always-dispatches> ./scripts/ci/deploy-dispatch-dedup.test.sh
8 passed, 15 failed

$ GATE_UNDER_TEST=<run-history-gate> ./scripts/ci/deploy-dispatch-dedup.test.sh
3 passed, 20 failed
```

The STI-601 gate is untouched and still green:

```
$ ./scripts/ci/deploy-freshness-gate.test.sh
19 passed, 0 failed
```

## 6. Scope

Changed: `.github/workflows/auto-merge.yml`, `.github/workflows/pr-checks.yml`,
`scripts/ci/deploy-dispatch-dedup.sh` (new),
`scripts/ci/deploy-dispatch-dedup.test.sh` (new), this file.

Not changed: `scripts/ci/deploy-freshness-gate.sh`, `deploy.yml`, any secret,
any credential. The `SHOPIFY_*` values stay in nixlab IaC and were neither read
nor written.