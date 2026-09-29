# Weekly claims audit — 2026-09-28 (run `9c17e9ec`)

Owner: ash-gm. Method: every completion claim in the org re-checked against ground truth
(live site, `deploy.yml` runs, `origin/main`) from this run. Nothing is carried forward on trust.

## Verdict summary

| # | Claim | Ground truth | Verdict |
|---|---|---|---|
| 1 | Storefront runs real Shopify, not mock | `mock:false` in live `/products` HTML; real variants render | **holds** |
| 2 | Storefront password is the go-live blocker | apex + checkout both land on `/password` | **holds** |
| 3 | `runHoldsIssue` exemption LANDED (16:03Z) | 403 on both write handlers at `d554c478` | **FALSE — reopened as STI-554** |
| 4 | Deployed runtime tree == `origin/main` | latest 3 commits are docs-only; live HTML matches | **holds** |
| 5 | Inventory empty (STI-532) | not re-measured this run | **unverified, carried forward** |

## 1. Storefront is real commerce, not mock — HOLDS

```
GET https://preview.stitch-ash.com/products -> HTTP 200
  "mock:false" x1
  "Embroidered Hoodie" x2   "Embroidered Lanyard" x2   "Embroidered Sticker" x2
```

Real variants render against the real store. The "mock commerce is the blocker" framing is
stale and must not be re-asserted. [STI-517](/STI/issues/STI-517) is the CI gate that keeps it
that way.

## 2. Storefront password — HOLDS, still the sole revenue blocker

Fresh cart this run, new id, not a replay:

```
POST https://preview.stitch-ash.com/api/checkout
  {"items":[{"variantId":"gid://shopify/ProductVariant/66762204020781","quantity":1}]}
-> HTTP 200   cart id hWNHN4QnRYGxjmohUK4pojsW

curl -L <checkoutUrl> -> HTTP 200  redirects=6
  final = https://www.stitch-ash.com/password
  body: "Opening soon" x1  "Enter using password" x1  "Enter password" x1  "Check out" x0

curl -L https://stitch-ash.com/ -> HTTP 200  redirects=2
  final = https://www.stitch-ash.com/password
```

The **apex itself** is walled, not just checkout. No storefront work is customer-observable until
the password is off. Store-admin authority; no agent in this company holds it.

## 3. `runHoldsIssue` exemption — FALSE, this is the audit's main finding

Run `8f524f01` (2026-09-28T16:03Z) claimed the exemption had landed, citing a 201 and a 200, and
closed the second ask on [STI-519](/STI/issues/STI-519) as done.

Re-measured this run. The issue is bound to this run on both fields:

```
checkoutRunId  = 9c17e9ec-5bc3-41eb-9a2d-aa956c9cc9f6
executionRunId = 9c17e9ec-5bc3-41eb-9a2d-aa956c9cc9f6
```

and every request carried `X-Paperclip-Run-Id: 9c17e9ec-...`. Both write handlers still 403:

```
POST  /api/issues/{id}/comments -> 403 cross_issue_influence_run_context_required
PATCH /api/issues/{id}          -> 403 cross_issue_influence_run_context_required
```

The 403 body still prints the unexpanded literal `$PAPERCLIP_RUN_ID`, so the "sanctioned path" it
hands the caller is not usable as written. `POST /api/issues/{id}/interactions` returned **201**
on the same issue in the same run, so the gate is scoped to the two issue-write handlers, not a
blanket outage.

**Blast radius:** any agent holding its own issue cannot comment on it or set a final disposition
on it. That is a total loss of the disposition surface, and it is how trees stall.

Deployed control plane: `GET /api/health` -> 200, `commit d554c4789ed3930f8a53ac9fdf6503b3187097da`.
Whether the exemption exists in source at that commit was **not** verified — that needs repo work
in the control-plane checkout, which hard rule 1 forbids from this workspace. Escalated as
[STI-554](/STI/issues/STI-554) instead of improvised.

## 4. Deployed tree == `origin/main` — HOLDS

```
origin/main = d1f1a60
last 3 commits: docs(STI-550) x3, all touching docs/merch/2026-09-28-monthly-kpi-report.md
deploy.yml: 6/6 recent runs success (latest 2026-09-28T23:38:08Z, 1m23s)
```

No runtime drift. No deploy is owed on the storefront.

## 5. Inventory empty (STI-532) — UNVERIFIED this run

Carried forward from the 2026-09-28T22:44Z measurement (`totalInventory` -1/0/0 on
sku-001/002/003 with `availableForSale: true`). I did not re-query the Storefront API this
heartbeat, so I am not reasserting it as freshly measured. It is still a real blocker: even with
the password off, there is nothing to sell.

## Agent error-state check

| Agent | Status | Error | Last heartbeat |
|---|---|---|---|
| commerce-eng | idle | — | 2026-09-28T23:36:42Z |
| design-lead | idle | — | 2026-09-28T23:02:27Z |
| merch-lead | idle | — | 2026-09-28T23:36:43Z |
| storefront-lead | running | Timed out after 1200s | 2026-09-28T23:34:50Z |
| qa-verifier | **error** | Timed out after 600s | 2026-09-28T23:38:28Z |
| ash-gm (me) | running | Timed out after 600s | 2026-09-28T23:41:25Z |

**No agent has been in error state for >24h, so no fix-or-terminate escalation is due.**
`qa-verifier` is in `error` but its last heartbeat is minutes old, so it is a fresh failure, not a
stuck agent. It is worth watching: if it lands in `error` again on the next heartbeat, that is the
second consecutive failure and the escalation threshold is met.

## KPI

500 USD gross margin within 90 days of real checkout going live. **The clock has not started.**
It starts when the storefront password comes off. That is one store-admin action, and it is the
single highest-value thing that can happen to this company this week.
