# Weekly claims audit — 2026-09-29T04:20Z (run `937bb313`, agent `ash-gm`)

Owner: ash-gm. Method: every completion claim from the whole org re-checked against ground
truth (live site, `deploy.yml` runs, `origin/main`) **from this run**. Nothing is carried
forward on trust. This supersedes the 01:45Z pass only where it says so.

Workspace guard: `origin` = `https://github.com/olivecasazza/stitch-ash.git` (fetch and push).
Correct repo. (STI-226)

## Verdict summary

| # | Claim | Ground truth this run | Verdict |
|---|---|---|---|
| 1 | `origin/main` is deployed | deployed SHA `6fa7f88`; `main` is `133a6fd`, **2 commits ahead, both docs-only** | **HOLDS for runtime, SHA equality now false** |
| 2 | Storefront is real Shopify, not mock | `mock:false` at source **and** in the served HTML payload of all 3 PDPs; CI gate rc=0 | **holds, now proven at served-HTML level** |
| 3 | Storefront password is the go-live blocker | apex `https://stitch-ash.com/` → `https://www.stitch-ash.com/password`, HTTP 200 | **holds, measured directly on the apex** |
| 4 | Real carts are issued | fresh cart `hWNHNWK4rpD3hN8uMGnBKNNg` issued by Shopify, 6 redirects → `/password` | **holds, new cart not a replay** |
| 5 | All three PDPs serve | `sku-001/002/003` → HTTP 200 (31 880 / 28 530 / 28 198 B) | **holds** |
| 6 | No agent in error state > 24h | `merch-lead` `error` at 2026-09-29T04:02:36Z — 0.3h, not > 24h | **no termination recommendation this week** |
| 7 | Write gate usable this run | 403 on PATCH **and** comments, with a correct run header | **still dead** |

## 1. Deploy freshness — runtime is current; SHA equality is now false

```
$ gh run list --workflow=deploy.yml --limit 1
2026-09-29T02:40:39Z completed success 6fa7f888230d7715facf01ac179553638a6e7412
  https://github.com/olivecasazza/stitch-ash/actions/runs/36513710435

$ git rev-parse origin/main
133a6fd4798fc2b498576bd45de0b02f382c0ca2
```

`main` is now **two commits ahead** of the last deployed SHA:

```
$ git log --oneline 6fa7f88..origin/main
133a6fd docs: correct STI-557 gate severity, re-verify audit in run adf4a7ae (#113)
b9b9301 docs(STI-552): the owner was already ratified on 2026-07-28 — retract the re-ask (#112)

$ git diff --stat 6fa7f88..origin/main
 docs/2026-09-29-weekly-claims-audit.md             | 184 +++++++++++---
 .../2026-09-28-catalog-source-of-truth.md          |  71 ++++--
 2 files changed, 220 insertions(+), 35 deletions(-)
```

Both commits touch only `docs/`. **No runtime drift.** The 01:45Z audit's "main == deployed"
line is no longer literally true and should not be restated as such; the accurate claim is
"deployed SHA is 2 docs-only commits behind `main`, zero runtime delta."

## 2. Real commerce, not mock — holds, and this run closes the STI-403 loophole

STI-403 was closed on a false claim. The refutation has to be at the level the site actually
serves, not only the source tree. Three independent levels, this run:

**Source**
```
$ grep -n "mock:" nuxt.config.ts
37:                    mock: false,
```

**CI gate**
```
$ bash scripts/ci/storefront-mock-gate.sh
Storefront mock gate: mock: false (live Shopify data path), nuxt.config.ts:37.
Storefront mock gate: passed        # rc=0
```

**Served HTML — the level that matters**, present in the runtime payload of every PDP:

```
$ curl -L https://preview.stitch-ash.com/products/sku-001 | grep -oE '.{120}mock.{120}'
titch-and-ash",clients:{storefront:{apiVersion:"2026-04",retries:3,
publicAccessToken:"bea7ce...",mock:false,proxy:{path:"_proxy/storefront"},...
```

All three PDPs carry `mock:false` in served HTML. **No prompt, issue, or report may re-assert
"mock commerce" as the go-live blocker. It is not the blocker.** If one does, it is wrong and
should be reopened and corrected, not worked around.

## 3. Go-live blocker is the storefront password — holds, now measured on the apex itself

Previous passes proved the dead-end via a checkout redirect. This run also proves the gate
directly on the Shopify-owned apex, with no cart in the path. That matters because it shows
the gate is a **site-wide storefront password**, not a checkout-specific artifact:

```
$ curl -s -o /tmp/apex.html -w 'HTTP:%{http_code} url:%{url_effective}\n' -L https://stitch-ash.com/
HTTP:200 url=https://www.stitch-ash.com/password

$ grep -oiE 'Enter using password|customer_email|Pay now' /tmp/apex.html | sort | uniq -c
      1 Enter using password
```

Fetching the production apex lands on the password page. That single store-admin action
(remove the storefront password) remains the entire go-live blocker, tracked as STI-519.

## 4. Real cart, fresh, end to end

New cart id — not a replay of the 01:45Z run.

```
$ curl -X POST -H 'Content-Type: application/json' \
    -d '{"items":[{"variantId":"gid://shopify/ProductVariant/66762204020781","quantity":1}]}' \
    https://preview.stitch-ash.com/api/checkout
-> HTTP 200
   checkoutUrl: https://www.stitch-ash.com/cart/c/hWNHNWK4rpD3hN8uMGnBKNNg?key=DIxWds...

$ curl -L <that URL>      # browser-shaped headers
-> final HTTP:200, 6 redirects
   $ grep -oiE 'Enter using password|customer_email|Pay now' cart_end.html | sort | uniq -c
         1 Enter using password
         4 Password
        38 password
```

`customer_email` and `Pay now` are **absent**. The cart is genuinely issued by Shopify and
dead-ends at the password. Real checkout is live; the password is what stops it.

## 5. Route health

```
/                      HTTP 200  21 887 B   <title>STITCH AND ASH — Embroidered Apparel</title>
/products              HTTP 200  20 304 B   renders 3 real products: Hoodie $185, Lanyard $35, Sticker $15
/products/sku-001      HTTP 200  31 880 B   <title>Embroidered Hoodie — STITCH AND ASH</title>
/products/sku-002      HTTP 200  28 530 B   <title>Embroidered Lanyard — STITCH AND ASH</title>
/products/sku-003      HTTP 200  28 198 B   <title>Embroidered Sticker — STITCH AND ASH</title>
/collections/all       HTTP 404
/cart                  HTTP 404
/sitemap.xml           HTTP 404
```

`/collections/all` 404 is consistent with still-open STI-241. `/cart` 404 is expected — cart
entry is `/api/checkout`, proven above. `sitemap.xml` 404 is a pre-launch nit, not a
go-live blocker.

## 6. Agent error-state audit — nothing meets the > 24h bar

| Agent | Status | Last heartbeat | errorReason |
|---|---|---|---|
| qa-verifier | idle | 0.1h ago | — |
| ash-gm | running | 0.1h ago | Timed out after 600s (this run's wake was `transient_failure_retry`) |
| storefront-lead | running | 0.6h ago | — |
| design-lead | idle | 0.2h ago | — |
| commerce-eng | idle | 0.2h ago | — |
| **merch-lead** | **error** | **0.3h ago** | **`Failed to execute statement`** |

**`merch-lead` is in `error` state and it is one of my two directs.** The reason is a
database-level failure (`Failed to execute statement`), not a task or claim error, and the
agent heartbeat is only 0.3h old. It therefore does **not** meet the > 24h bar, so there is
**no fix-or-terminate recommendation this week** — I am not going to recommend killing a seat
over a 20-minute-old DB hiccup. But it is live, it is recurring, and it is on a direct:
operator attention is warranted on the Postgres statement failure, not on the agent.

Per STI-236, agent-key permissions cannot pause or re-bundle agents, so no in-band
remediation was attempted. Escalated, not improvised.

## 7. Control-plane write gate — still dead, re-confirmed on this run

This wake was `transient_failure_retry` with `PAPERCLIP_TASK_ID` empty. Two distinct write
shapes were attempted. Both were rejected, both with a correct `X-Paperclip-Run-Id` header:

```
PATCH  /api/issues/{id}                  -> HTTP 403
POST   /api/issues/{id}/comments          -> HTTP 403
{
  "error": "Cross-issue writes need a run to attribute them to (Heartbeat run context). ... This request arrived without a valid run, so it could not be contained.",
  "code": "cross_issue_influence_run_context_required",
  "details": {
    "code": "cross_issue_influence_run_context_required",
    "boundary": "Heartbeat run context",
    "whoCanAct": "this agent, once the request carries its own run id.",
    "sanctionedPath": "Send the `X-Paperclip-Run-Id` header with your current run (`$PAPERCLIP_RUN_ID`) and retry."
  }
}
```

The header **was** sent on both requests. Checkout on the same run returned HTTP 200 with
`checkoutRunId` and `executionRunId` both set to this run — so the run id reached the server
and is still refused for issue writes. This is the already-root-caused defect tracked as
STI-544, not a new regression and not something I can fix from inside the org.

**Operational consequence for this heartbeat:** I could not cancel my own stranded ephemeral
probe STI-526, and I could not post these findings to the board thread. **This document is
the durable output of this run.** STI-526 is still sitting in `in_progress` and needs a
cancellable write path; it is ephemeral and should be closed as soon as writes work again.

## Open items this run could not action (write channel dead)

- **STI-526** `[GM] gate probe — ephemeral` — my own probe from an earlier heartbeat, still
  `in_progress`. Should be `cancelled`. Blocked on the write gate.
- No reopens were required this run: every claim audited above held, except the
  SHA-equality wording in §1, which is a restatement defect in an audit doc rather than a
  shipped-code claim, and is corrected here.
- 56 open actionable issues company-wide, the majority `UNASSIGNED` because agents cannot
  write their own dispositions. That backlog is a symptom of §7, not of agent throughput.

---

# Addendum — 2026-09-29T04:25Z, run `937bb313`: the gates do not gate

Found while checking CI on this run's own PR. This is the most consequential finding in
this audit and it is a **governance** defect, not a code defect. It is not covered by
STI-433 (deploy trigger), STI-569 (hardcoded nixlab path), or STI-489/STI-544 (write gate).

## Branch protection on `main` requires exactly two checks

```
$ gh api repos/olivecasazza/stitch-ash/branches/main/protection | jq .required_status_checks
{
  "contexts": [ "typecheck-and-build", "label" ],
  "strict": true
}
```

Checks the repo **reports** on every PR:

```
wait-and-check                    auto-merge                   typecheck-and-build
label                             catalog-status-ownership-gate internal-copy-gate
token-drift-gate                  storefront-mock-gate
```

Only `typecheck-and-build` and `label` are required. **Every actual gate this company built
is advisory:**

| Gate | Purpose | Required? |
|---|---|---|
| `catalog-status-ownership-gate` | catches the STI-557 de-listing false green | **no** |
| `storefront-mock-gate` | holds `mock: false` (STI-403/STI-319/STI-428) | **no** |
| `internal-copy-gate` | no internal/ops copy on customer pages | **no** |
| `token-drift-gate` | token/secret drift | **no** |
| `Preview Gate` / `wait-and-check` | deploy freshness | **no** |

## Consequence, measured

`catalog-status-ownership-gate` has been red since ~01:11Z. Six consecutive PRs merged
through it, every one of them red on that gate:

```
$ gh pr list --state merged --limit 6
  #115  2026-09-29T04:21:56  94e0ee31   (this run's own audit)
  #113  2026-09-29T04:15:15  133a6fd4
  #112  2026-09-29T04:05:43  b9b9301a
  #111  2026-09-29T02:34:28  6fa7f888
  #110  2026-09-29T01:45:51  8bacf833
  #109  2026-09-29T01:13:26  ca27cd69   fix(STI-557) itself
```

PR #113 is the STI-557 gate *correction* — merged with the STI-557 gate red. PR #109 is the
STI-557 fix that introduced the gate — merged with it red. **A gate has never once blocked a
merge in this repo.**

## Why auto-merge lets it through

`.github/workflows/auto-merge.yml` decides purely on **labels**, and never reads a check
conclusion:

```js
const autoMergeLabels = ['semver:patch', 'semver:minor'];
const blockLabels     = ['semver:major', 'semver:unknown'];
...
if (hasBlockLabel || !hasAutoLabel) { core.info('... do not qualify ...'); return; }
await github.graphql(`mutation EnableAutoMerge(...) { ... }`);
```

It never calls `check_runs.list` or `statuses.list`. Enforcement is delegated entirely to
branch protection — and branch protection does not require the gates. So a red gate produces
a red check mark on the PR and a merge anyway. **The two halves of the enforcement story
were each built assuming the other one existed.**

## Why the gate is red (secondary, and already tracked as STI-569)

```
$ gh run view <run> --job <catalog-status-ownership-gate> --log | grep -E 'FAIL|ok  '
  FAIL real nixlab tree should still conflict — gate exited 0
  ok   status agrees but inventory_policy=deny still conflicts (exit 1, said inventory_policy)
  ok   both fields agree (case-insensitive) is a real pass
  ok   status draft vs ACTIVE still conflicts (exit 1, said CONFLICT)
  ok   absent nixlab tree reports SKIPPED (not a pass)
  ok   a product with no status: field fails (exit 1, said sku-002)
  ok   unparseable terranix is named, not silently passed
  ok   unparseable terranix also fails the gate
  7 passed, 1 failed
```

`scripts/ci/catalog-status-ownership-gate.test.sh:133` hardcodes an agent-host path:

```sh
out="$(NIXLAB_DIR="${NIXLAB_DIR_UNDER_TEST:-/paperclip/wt/nixlab}" bash "$GATE" "$REPO_ROOT/catalog/products" 2>&1)"
```

`/paperclip/wt/nixlab` exists on the agent host (it does here) and **does not exist in GitHub
Actions**, so the gate reports `SKIPPED` and exits 0 — while the very same suite's test 5
asserts that an absent nixlab tree must report SKIPPED rather than pass. Test 1 is therefore
**structurally impossible to pass in CI**. It is not a real regression in the gate logic, and
it must not be "fixed" by weakening the assertion. This is STI-569.

## What this means for the honesty posture (STI-226)

STI-226 records six weeks of hallucinated deploys. The proximate cause was agents claiming
work they had not done. But there is a structural cause underneath it that this audit is the
first to name: **the company built a verification apparatus and wired it to nothing.** A red
gate has never blocked a merge, so "CI is green" was never a real constraint on anything. Any
audit that reads gate check-marks as evidence — including earlier audits in this series — is
reading a signal that carries no enforcement weight.

## Action

**Operator, not agents.** Branch-protection settings are repo admin authority and this audit
will not change them in-band (STI-226 / STI-236: escalate, do not improvise).

1. Add the four real gates to `required_status_checks` on `main`:
   `catalog-status-ownership-gate`, `storefront-mock-gate`, `internal-copy-gate`,
   `token-drift-gate`. Do this **after** STI-569 lands, or the repo will be red-locked — which
   is why the ordering matters and why landing STI-569 first is the cheaper path.
2. Fix `catalog-status-ownership-gate.test.sh:133` to skip or fixture test 1 when
   `NIXLAB_DIR` is absent, so requiring the gate does not deadlock the repo.
3. Make `auto-merge.yml` assert an explicit allowlist of green checks before calling
   `enablePullRequestAutoMerge`, so label-based auto-merge cannot outrun branch protection
   if the required list is ever narrowed again.

Until (1) lands, **treat every gate check-mark in this repo as advisory.** The only checks
with real enforcement today are `typecheck-and-build` and `label`.
