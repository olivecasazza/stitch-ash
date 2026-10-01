# STI-601 — the deploy freshness gate was a false green

Status: fixed. The predicate now filters on the `deploy` **job**'s conclusion,
not the run's.

Filed by qa-verifier from the [STI-599](/STI/issues/STI-599) daily live check,
run `53db78b1` on 2026-10-01T05:26Z.

## 1. The defect

`deploy.yml`'s `fresh-check` job existed to answer one question: *is main
already live, so this cron firing can skip the deploy?* Its predicate was:

> "does SOME recent **successful run** of this workflow carry
> `head_sha == main`'s head?"

It read run-level `conclusion` and nothing else. A run whose `deploy` job was
**skipped** still reports run-level `conclusion: success`, so a green no-op
satisfies the predicate permanently — and because the no-op itself is a
successful run carrying the same `head_sha`, every subsequent firing cites the
no-op in turn. The backstop could stop healing drift while staying green
indefinitely.

Measured, 2026-10-01, against run `36803396902`:

```
$ gh api repos/olivecasazza/stitch-ash/actions/runs/36803396902/jobs \
    --jq '.jobs[]|{name,conclusion}'
{"conclusion":"success","name":"fresh-check"}
{"conclusion":"skipped","name":"deploy"}
```

and from that run's own `fresh-check` step log:

```
main head: 7367c2f27d2981e85582d2dd516a199ce7fe2cd2
run 36785970511 already published main 7367c2f... — nothing to deploy.
```

`36785970511` was itself `deploy: skipped`. The chain of citation:

| run | `fresh-check` | `deploy` | published? |
| --- | --- | --- | --- |
| 36803396902 | success | **skipped** | no |
| 36785970511 | success | **skipped** | no |
| 36755982087 | success | **skipped** | no |
| 36713695403 | success | **skipped** | no |
| 36675330287 | success | success | **yes** (2026-09-30T05:51:31Z) |

The old predicate would have been satisfied by any of the top four rows.

## 2. Scope correction, and why this was not an incident

The filing reported live as "23.6h behind main" and named this the cause. The
mechanism was right; that measurement was not. A real deploy of `7367c2f`
existed — run `36675330287` — so live was never behind main. The gate reached
the right verdict (`needed=false`) while citing a run that published nothing:
**right answer, wrong reason.** The defect is latent, not an outage, and it was
narrowed to the predicate accordingly.

Live was and is current. Confirmed at the time of the fix:

```
$ git ls-remote origin refs/heads/main
c5b1bc6a0f308703e5919f14d9ba4a537e6cee97	refs/heads/main
$ curl -sS -w "\nHTTP %{http_code}\n" https://preview.stitch-ash.com/__build.json
{ "commit": "c5b1bc6a0f308703e5919f14d9ba4a537e6cee97", ... }
HTTP 200
```

## 3. The fix

The predicate moved out of the workflow into
**`scripts/ci/deploy-freshness-gate.sh`**, and now requires the cited run's
`deploy` **job** to have concluded `success`:

```
for each successful run carrying main's head, newest first:
    if that run's `deploy` job concluded success -> needed=false
otherwise                                        -> needed=true
```

Three properties are deliberate:

- **It walks candidates rather than testing only the newest.** STI-434
  established that a merge-triggered run records the *pre-merge PR head* in
  `head_sha`, so the newest successful run is not necessarily the one that
  published main. Order-independence is a correctness requirement here.
- **Everything unreadable fails OPEN.** A bad main head, an unreadable run list,
  an unreadable jobs payload, a missing `deploy` job — each prints why and
  returns `needed=true`. A redundant deploy costs minutes; a wrong
  `needed=false` costs correctness. The gate must never be the reason the site
  stays stale.
- **The verdict cannot go missing.** `deploy.yml` wraps the call and appends
  `needed=true` if `$GITHUB_OUTPUT` has no `needed` line, so a missing script or
  an early exit can never become a silent green no-op — the exact failure this
  issue is filed about.

### Two further bugs found while fixing this one

Both were found by running the gate against the real API, not by the test suite,
and both are now covered by it.

**(a) `gh api` inferred POST on the jobs call.** The gate's jobs call was
written as:

```
gh api "repos/$REPO/actions/runs/$id/jobs" -F per_page=100 --jq ...
```

`gh api` infers the HTTP method from its arguments and **defaults to POST as
soon as any `-f`/`-F` field is present** unless `-X GET` is explicit. So this
was `POST .../jobs`, and the API answered `404` for every candidate:

```
  gh: Not Found (HTTP 404)
run 36850122788: jobs unreadable, so it cannot be shown to have published anything.
```

A 404 fails open, so it was *safe* — but it would have disabled the entire
backstop while every run stayed green, which is a worse version of the same
false green. `-X GET` is now explicit on both API calls. The self-test's `gh`
stub models this rule (a field without `-X GET` ⇒ 404), which is what makes the
regression catchable; before that, the stub ignored `-f` and the suite passed a
gate that 404'd on every real run.

**(b) The candidate search window was one page.** `per_page=100` with no
`--paginate` searches a single page of `status=success` runs. This workflow
produces runs on a `*/30` cron **plus** one per merge, so 100 successful runs is
roughly **two days**:

```
$ gh api -X GET "repos/.../workflows/deploy.yml/runs" -f status=success -f per_page=100 \
    --jq '.workflow_runs | length as $n | "\($n)  newest=\(.[0].created_at)  oldest=\(.[-1].created_at)"'
100  newest=2026-10-01T10:35:49Z  oldest=2026-08-24T16:54:51Z
```

Once the site is stable longer than that window, the run that published main
falls off page 1, the gate reports drift, and **every** subsequent firing
redeploys an identical artifact forever. That is precisely the waste STI-433
added the gate to prevent, reintroduced through the window rather than through
the predicate. `--paginate` fixes it.

## 4. Verification

The self-test, `scripts/ci/deploy-freshness-gate.test.sh`, runs offline in
under a second: stub `gh` and `git` read GitHub-API-shaped fixtures, and the stub
applies the caller's `--jq` program with real `jq`, so the gate's filter is under
test too.

```
$ ./scripts/ci/deploy-freshness-gate.test.sh
STI-601 deploy freshness gate
  ok   real deploy of main needs nothing (needed=false)
  ok   STI-601 green no-op is NOT a publish (needed=true)
  ok   chain of green no-ops is not a publish (needed=true)
  ok   real deploy behind a no-op still counts (needed=false)
  ok   failed deploy job is NOT a publish (needed=true)
  ok   cancelled deploy job is NOT a publish (needed=true)
  ok   missing deploy job fails open (needed=true)
  ok   unreadable jobs fail open (needed=true)
  ok   unreadable run list fails open (needed=true)
  ok   no run carries main -> deploy (needed=true)
  ok   max-candidates=1 stops at the no-op and deploys (needed=true)
  ok   publish found on a later page (needed=false)
  ok   every api call sends an explicit -X GET
  ok   run-list call is paginated
  ok   publish is found past two no-ops (needed=false)
  ok   --github-output carries the verdict
  ok   implausible head sha fails open
  ok   missing repo fails open
  ok   unreachable remote fails open

  19 passed, 0 failed
```

### The suite is proven to see red

A guard nobody has seen fail is not a guard. Three separate regressions were
reintroduced and the same suite run against each:

| Gate under test | Result |
| --- | --- |
| **This PR** (the fix) | **19 passed, 0 failed** |
| Pre-[STI-601](/STI/issues/STI-601) predicate, extracted verbatim from `origin/main` | 4 passed, **15 failed** |
| `-X GET` removed from the jobs call (bug (a)) | 10 passed, **9 failed** |
| `--paginate` removed (bug (b)) | 17 passed, **2 failed** |

The pre-fix failures include the two assertions that matter most —
`STI-601 green no-op is NOT a publish` and `chain of green no-ops is not a
publish` — both of which report `needed=false` against the old predicate, which
is the false green this issue is filed about.

### Against real production data

Not fixtures. Pointed at the head the bug was measured on, the fixed gate walks
past every false-green no-op and finds the run that actually published:

```
$ ./scripts/ci/deploy-freshness-gate.sh --repo olivecasazza/stitch-ash \
    --head-sha 7367c2f27d2981e85582d2dd516a199ce7fe2cd2
main head: 7367c2f27d2981e85582d2dd516a199ce7fe2cd2
gate: a run counts as published only if its 'deploy' job concluded success.
5 successful run(s) carry main 7367c2f...; checking the 'deploy' job of each.
run 36803396902: deploy job concluded 'skipped' — it published nothing.
run 36785970511: deploy job concluded 'skipped' — it published nothing.
run 36755982087: deploy job concluded 'skipped' — it published nothing.
run 36713695403: deploy job concluded 'skipped' — it published nothing.
run 36675330287 published main 7367c2f... (deploy job: success) — nothing to deploy.
needed=false
```

`36675330287` is the same run the filing identified as the last one that
actually deployed. The verdict is unchanged — which is the point: the gate now
gets there on evidence rather than on a citation chain of no-ops.

And on current main:

```
$ ./scripts/ci/deploy-freshness-gate.sh --repo olivecasazza/stitch-ash
main head: c5b1bc6a0f308703e5919f14d9ba4a537e6cee97
2 successful run(s) carry main c5b1bc6...; checking the 'deploy' job of each.
run 36850122788 published main c5b1bc6... (deploy job: success) — nothing to deploy.
needed=false
```

## 5. Regression protection

`pr-checks.yml` gains a `deploy-freshness-gate` job running the self-test on
every PR. It runs the **self-test, not the gate**: the gate answers "is live
behind main?", a live-environment question that would fail every PR by design.
The self-test is the part that can regress silently, and it is the part this PR
makes testable.

`deploy.yml`'s `fresh-check` job now checks out `scripts/ci/` (sparse) and calls
the gate. The checkout is `continue-on-error` on purpose: a checkout failure
cannot strand the run, because the wrapper then finds no script and fails OPEN.

## 6. Not done here

The checkout note in the filing stays unfiled, as the filing itself proposed:
`functions/api/checkout.js` reads `variantId`, and `sku` is a correctly
rejected 4xx. Worth confirming which surface is meant to drive checkout —
that is a commerce-eng question about catalog wiring, not a defect in the
function.
