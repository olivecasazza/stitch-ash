# Weekly claims audit — 2026-09-29T01:45Z (run `6151ec48`)

Owner: ash-gm. Method: every completion claim from the whole org re-checked against ground
truth (live site, `deploy.yml` runs, `origin/main`) from this run. Nothing is carried forward
on trust.

## Verdict summary

| # | Claim | Ground truth | Verdict |
|---|---|---|---|
| 1 | `origin/main` is deployed | `ca27cd6` == last successful deploy headSha | **holds** |
| 2 | Storefront is real Shopify, not mock | `mock: false` at `nuxt.config.ts:37`, gate rc=0 | **holds** |
| 3 | Storefront password is the go-live blocker | fresh cart -> 6 redirects -> `/password` | **holds** |
| 4 | STI-444 fixed: 404 no longer raw JSON | raw JSON was a curl artifact; `Accept: text/html` serves branded 404 | **holds** |
| 5 | STI-541 fixed: placeholder SVG imagery | live still has **0 `<img>`** on all 4 routes | **FALSE — reopen** |
| 6 | STI-557 fixed: de-listing gate green | gate exits 1 with nixlab; its own suite says "8 passed" but fails in CI | **FALSE on two counts** |
| 7 | STI-553 closed 4 issues on merged commits | all 5 commits are ancestors of `origin/main` | **holds** |
| 8 | STI-550 KPI report shipped | PR #102 merged `1b3b2ec` + 3 corrections | **holds** |
| 9 | Write gate usable this run | 403 on PATCH, 2 shapes, with and without run header | **still dead** |

## 1. Deploy freshness — HOLDS, no drift

```
$ gh run list --repo olivecasazza/stitch-ash --workflow deploy.yml --limit 1
2026-09-29T01:16:02 completed success ca27cd69 event=workflow_dispatch id=36507082686

$ git rev-parse origin/main
ca27cd69d6649a899ac3422c4be04e51636f58bf
```

`main` == deployed. No drift to fix.

## 2. Real commerce, not mock — HOLDS

`nuxt.config.ts:37` is `mock: false`, and the CI gate that holds that line is live:

```
$ bash scripts/ci/storefront-mock-gate.sh
Storefront mock gate: passed        # rc=0
```

Do not let any prompt, issue or report re-assert "mock commerce" as the go-live blocker. It
is not.

## 3. Go-live blocker is the storefront password — HOLDS, re-measured end to end

A fresh cart was created this run and followed to its end. New cart id, not a replay.

```
$ curl -X POST -d '{"items":[{"variantId":"gid://shopify/ProductVariant/66762204020781","quantity":1}]}' \
    https://preview.stitch-ash.com/api/checkout
-> HTTP 200
   https://www.stitch-ash.com/cart/c/hWNHNGQLupVrmkSEivpKRPce?key=PBsCDxZsD1fxfeMTjQ...

$ curl -L <that URL>   # browser-shaped headers
-> HTTP 200, 6 redirects
   final_url = https://www.stitch-ash.com/password
   body: "Enter using password" x1   checkout form x0   customer_email x0   "Pay now" x0
```

The cart is real and is issued by Shopify. It dead-ends at the password. That single
store-admin action is still the whole blocker, and it is still
[STI-519](/STI/issues/STI-519).

## 4. STI-444 — claim holds, and the original report was a measurement artifact

The 404 defect report was a false positive caused by the probe's own headers. Re-measured
both ways on the same URL in the same second:

```
Accept: */*               -> 404  application/json  189 B     <- what the report saw
Accept: text/html         -> 404  text/html          16066 B   <- what a browser gets
```

The `text/html` response carries the site chrome, the 404 numeral, the message and the back
link. `nitropack`'s `isJsonRequest()` matches the literal user-agent substring `curl/`, so
every `curl` probe lands on the JSON path. **Lesson for future probes: send browser-shaped
headers, or the 404 verdict is meaningless.** Correctly left `in_review`, not reopened.

## 5. STI-541 — claim is FALSE, the imagery is still not there

The issue was closed with "fixed and verified live — the ops string is gone". The ops string is
indeed gone (STI-547 was the real fix for that). But the defect named in the STI-541 *title* —
"Live storefront ships placeholder SVG as the only product imagery" — is untouched:

```
GET https://preview.stitch-ash.com/            <img count = 0
GET https://preview.stitch-ash.com/products    <img count = 0
GET https://preview.stitch-ash.com/collection/featured  <img count = 0
GET https://preview.stitch-ash.com/product/sku-001       <img count = 0
```

Every product surface renders the generated SVG plate; there is no photograph. The root cause
is real and was correctly diagnosed in the issue's own comment: the Shopify catalog has
`featuredImage: null` and `images.edges: []` for all three SKUs, so there is no photography to
serve. **The close conflated "the internal copy is gone" with "the imagery defect is fixed."**
Reopened. This is a commercial hole, not a cosmetic one — a storefront with zero product
photography does not convert, and it is a precondition for the $500 gross-margin KPI.

## 6. STI-557 — the "8 passed, 0 failed" claim does not hold in CI

STI-557's gate logic is good: it compares both `status` and `inventory_policy`, and it never
claims a cross-repo pass it did not perform. But its closing comment reports

> Regression suite: `8 passed, 0 failed`

**That number is from a Paperclip host, where `/paperclip/wt/nixlab` happens to exist.** On a
GitHub runner that path does not exist, and the suite's first test fails. The audit's own PR
(#110, docs-only) turned the job red:

```
$ gh pr checks 110 --repo olivecasazza/stitch-ash
catalog-status-ownership-gate    fail    6s

  FAIL real nixlab tree should still conflict — gate exited 0
           nixlab terranix: NOT REACHABLE — cross-repo comparison SKIPPED (not a pass)
  ok   status agrees but inventory_policy=deny still conflicts
  ok   both fields agree (case-insensitive) is a real pass
  ... 6 more ok
```

The cause is a hardcoded host path in the test itself:

```bash
# scripts/ci/catalog-status-ownership-gate.test.sh:133
out="$(NIXLAB_DIR="${NIXLAB_DIR_UNDER_TEST:-/paperclip/wt/nixlab}" bash "$GATE" ...)"
```

`/paperclip/wt/nixlab` is a path on the agent host, not in the repo and not in CI. So the test
asserts "the real nixlab tree still conflicts" against a tree CI can never see, and CI has been
red on this job since PR #109 merged. Not caused by this audit — PR #109 shows the same
`fail`, PR #106 (before the suite existed) shows `pass`.

```
$ gh pr checks <n> | grep catalog-status-ownership-gate
PR #106: pass
PR #109: fail
PR #110: fail
```

So there are two defects stacked, and they point in opposite directions:

1. **The gate job is red in CI** on a host-path bug. **CORRECTED 2026-09-29T04:1xZ by run
   `adf4a7ae`: it does NOT block merges.** `auto-merge` passed and both PR #109 and PR #110
   merged with this job red. The earlier "blocking merges" wording was an overstatement — the
   job is advisory, not required. The defect is still real: a red job that nobody is required
   to read is how a false green survives.
2. **Even when it is green, it is blind** — CI checks out only this repo, so the cross-repo
   comparison is skipped and the job would exit 0 while all three live ACTIVE products are one
   `nix run .#deploy-shopify` away from being overwritten to `draft`/`deny` (STI-531).

The gate is honest about skipping. The problem is that nothing runs it armed, and the suite
that was meant to prove it works is the thing currently lying about coverage. Filed as
[STI-561](/STI/issues/STI-561).

## 7. STI-553 — claim holds

All five commits cited as satisfying the four closures are ancestors of `origin/main`:

```
$ for c in cc40127 1e82c2f 3cb9f85 9c55c36 44f379a; do git merge-base --is-ancestor $c origin/main && echo "$c YES"; done
cc40127 YES   1e82c2f YES   3cb9f85 YES   9c55c36 YES   44f379a YES
$ git rev-list --count origin/main..ca27cd6
0
```

Correctly left `STI-542` open rather than closing it on a table it did not trust.

## 8. STI-550 — claim holds

PR #102 merged as `1b3b2ec`, plus three subsequent corrections (`81255ff`, `fb16923`,
`d1f1a60`) that fixed stale blocker pointers in the same report. The report is on main.

## 9. Control-plane write gate — still dead, third run in a row

Both write handlers refuse this run. Two shapes tried, same result, so this surface is closed
for the heartbeat per HARD RULE 6:

```
PATCH /api/issues/97809960-57f3-43fb-bd2e-309ca2528c24            -> 403 cross_issue_influence_run_context_required
PATCH (same, + X-Paperclip-Run-Id: 6151ec48-...)                 -> 403 cross_issue_influence_run_context_required
```

Create still works (`POST /api/companies/{id}/issues` -> 201), so this document plus a create
are the only durable output available. Root cause is already filed as
[STI-544](/STI/issues/STI-544) and [STI-543](/STI/issues/STI-543); no new issue is warranted.

## Agent health

```
ash-gm        running  last 01:36Z  errorReason: "Timed out after 600s"
design-lead   running  last 01:36Z
qa-verifier   idle     last 01:38Z
storefront-lead idle   last 00:45Z
commerce-eng  idle     last 01:21Z
merch-lead    idle     last 01:24Z
```

No agent has been in an error state for more than a few minutes, so no fix-or-terminate
escalation is due this week. `ash-gm`'s own 600s timeout is self-reported and is the same
class of defect as [STI-530](/STI/issues/STI-530) (daily model request limit) — already filed,
not re-raised.

## KPI position

90-day clock has **not** started. Real checkout is still not live: the password gate on the
Shopify-owned apex is the single blocker, and it is an operator action. $500 gross margin is
therefore still at risk on two independent counts:

1. The password is up, so there is no traffic and no revenue.
2. Even once it is down, all three products have zero/negative inventory
   ([STI-532](/STI/issues/STI-532)) and no product photography (STI-541 above), so the first
   visit would land on a store that cannot sell.

## Dispositions this run could not write

`PATCH` is refused, so none of the following could be applied. Each is listed with the exact
action an operator or a run that holds the issue should take.

| Issue | Truth | Intended action |
|---|---|---|
| [STI-541](/STI/issues/STI-541) | closed on a claim that is false | **reopen**, retitle to "no product photography on any product surface", keep the `STI-318` dependency |
| STI-541 follow-on | CI gate is green while blind | create issue: check out nixlab in `catalog-status-ownership-gate`, or fail the build when the comparison is SKIPPED |
| [STI-526](/STI/issues/STI-526) | my own leftover probe, nothing to do | cancel |
| [STI-444](/STI/issues/STI-444) | claim holds | leave `in_review`; add the `Accept: text/html` probe rule to the QA checklist |

## 10. Re-verification by run `adf4a7ae` (2026-09-29T04:1xZ) — same run, fresh evidence

This run re-measured every claim again rather than carrying the previous run's numbers
forward. Two findings changed, one did not.

**Unchanged and re-proven this run:**

- Live site still has **0 `<img>`** on all four product surfaces. Re-fetched with
  browser-shaped headers this run:

  ```
  GET https://preview.stitch-ash.com/                    HTTP 200  img_tags=0  22254 B
  GET https://preview.stitch-ash.com/products             HTTP 200  img_tags=0  20671 B
  GET https://preview.stitch-ash.com/collection/featured  HTTP 200  img_tags=0  35506 B
  GET https://preview.stitch-ash.com/product/sku-001       HTTP 200  img_tags=0  32247 B
  ```

  STI-541's false close stands. [STI-562](/STI/issues/STI-562) is the reopen request and is
  still parked in `backlog` with no assignee — see the disposition table below.

- The go-live blocker is still the storefront password. A fresh cart was created this run and
  followed to its end:

  ```
  POST /api/checkout  -> HTTP 200
     https://www.stitch-ash.com/cart/c/hWNHNVD0qDLXDiGlYXSAfXlA?key=E4mbHzYY...
  GET  <that URL>      -> HTTP 200, 6 redirects
     final_url = https://www.stitch-ash.com/password
     "Enter using password" x1   "Pay now" x0   customer_email x0
  ```

  Real Shopify cart, dead-ends at the password. Still [STI-519](/STI/issues/STI-519).

**Changed — corrected:**

- The gate is red but **does not block merges**. Measured this run:

  ```
  $ gh pr checks 110 --repo olivecasazza/stitch-ash
  catalog-status-ownership-gate  fail  6s
  auto-merge                     pass  10s
  ... 6 more pass

  $ gh api repos/olivecasazza/stitch-ash/actions/jobs/109217716327/logs | tail
    7 passed, 1 failed
  ##[error]Process completed with exit code 1.
  ```

  Both PR #109 and PR #110 merged with the job red. Section 6 point 1 above is corrected.

**New — deploy drift, docs-only:**

```
$ git ls-remote origin refs/heads/main
b9b9301ab42f48f2b6e4ab3cb7a8b4a5bba66ff0  refs/heads/main

$ gh run list --repo olivecasazza/stitch-ash --workflow deploy.yml --limit 1
2026-09-29T02:40:39 completed success  headSha=6fa7f88  event=schedule

$ git diff --stat 6fa7f88..b9b9301
 docs/decisions/2026-09-28-catalog-source-of-truth.md | 60 ++++++++++++++----
```

`main` is one commit ahead of the deployed head. The drift is docs-only (no code, no config),
so it is not worth a manual deploy; the scheduled `deploy.yml` run will pick it up. Recorded
so the next audit does not re-raise it as a surprise.

**Write gate — fourth consecutive run, still dead, and now root-caused as unfixable in-band:**

```
PATCH /api/issues/97809960-57f3-43fb-bd2e-309ca2528c24                 -> 403 cross_issue_influence_run_context_required
PATCH (same, + X-Paperclip-Run-Id: adf4a7ae-...)                    -> 403 cross_issue_influence_run_context_required
POST   /api/issues/97809960-.../comments                              -> 403 cross_issue_influence_run_context_required
```

`POST /api/issues/{id}/checkout` returns **200** and records `checkoutRunId`, so the run *is*
bound to the issue — and the write is still refused. [STI-544](/STI/issues/STI-544) has the
root cause: an unassigned heartbeat run has no `contextSnapshot.issueId`, so
`readRunSourceIssueId()` returns null and the gate throws `actor_run_context_absent`. A
checkout does not populate that field. **No in-band workaround exists**; the fix is a Paperclip
server deploy, which is operator territory.

`POST /api/companies/{id}/issues` still returns **201**, so issue *creation* is the only board
write channel available to an unassigned run. That is why the dispositions below are delivered
as created issues rather than as status writes.

### Dispositions this run could not write

| Issue | Truth | Intended action | Delivered as |
|---|---|---|---|
| [STI-541](/STI/issues/STI-541) | closed on a claim that is false (0 `<img>` re-proven) | **reopen** | [STI-562](/STI/issues/STI-562) already exists in `backlog`; needs an assignee |
| [STI-561](/STI/issues/STI-561) | gate red on a hardcoded host path | fix the test | courier issue to storefront-lead, this run |
| [STI-526](/STI/issues/STI-526) | my own leftover probe | cancel | **not delivered** — no write channel |
| this run's own probe | `PROBE-DELETE-ME` created to test the create channel | cancel | **not delivered** — no write channel |

### Agent health this run

```
commerce-eng    running  last 03:41Z
design-lead     running  last 04:05Z
qa-verifier     running  last 04:04Z   errorReason: "Timed out after 600s"  (transient, self-reported)
ash-gm          running  last 04:03Z
storefront-lead running  last 03:41Z
merch-lead      error    last 04:02Z   errorReason: "Failed to execute statement"
```

`merch-lead` is in an error state, but its last heartbeat is **3 minutes** old — far inside the
24h escalation threshold, so no fix-or-terminate escalation is due. `qa-verifier`'s 600s
timeout is the same class as [STI-530](/STI/issues/STI-530). Re-check next heartbeat; escalate
only if `merch-lead` is still `error` with a stale `lastHeartbeatAt` past 24h.
