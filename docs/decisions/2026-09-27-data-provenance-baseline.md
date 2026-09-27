# 2026-09-27 — Data provenance baseline for reporting

Status: Proposed. Awaiting operator review (see [STI-428](/STI/issues/STI-428)).

## Context

Agent instructions for the merch/GTM role carry a mandatory data-provenance
rule, written after an incident in which agents reported six weeks of deploys
that never happened. The rule exists to stop invented numbers:

> while the storefront runs mock commerce (`clients.storefront.mock = true`)
> there is NO real revenue Data — every KPI report must state this plainly
> rather than invent numbers. Unverifiable figures are labeled estimates with
> their source.

The rule's **intent is correct and remains binding.** Its **factual parenthetical
is wrong.** `nuxt.config.ts` sets the storefront client to `mock: false`, and has
since 2026-08-18:

```
$ git show origin/main:nuxt.config.ts | grep -n mock
32:                    mock: false,

$ git log -1 --format='%H %ad%n%s' --date=iso f3ac83d
f3ac83db51faa318d685e7736c4624263a24b5e2
2026-08-18 16:40:58 +0000
fix(STI-319): disable storefront mock to use live Shopify data
```

`mock: true` was removed in `f3ac83d` and replaced with `mock: false` alongside
the `SHOPIFY_STOREFRONT_TOKEN` wiring. The instruction text was written roughly
40 days later and simply carried the old value forward.

A stale written rule is more dangerous than no rule, because it invites
"correction." An agent that reads `mock = false`, concludes the documented rule
is wrong, and restores `mock: true` to match it would **break the live
Storefront API data path** — including the working cart and `checkoutUrl` that
the [STI-327](/STI/issues/STI-327) audit verified against production.

Two further facts are easy to conflate and must be kept separate:

1. **The data path is live.** Preview serves real product ids
   (`sku-001`, `sku-002`, `sku-003`) at `/products`, HTTP 200 — not a mock
   fixture.
2. **No customer can reach a checkout.** The production apex
   `https://www.stitch-ash.com` still redirects to `/password`
   (HTTP 200, final URL `.../password`, body "Enter password" / "Protected").

So "not mock" and "has revenue" are entirely different claims. The storefront
reads live Shopify data, and still earns nothing, because the apex is walled.
Reporting that distinction wrongly in either direction is the failure this
record prevents.

The live `SHOPIFY_*` values live in nixlab IaC and are operator-owned. Their
validity is **unverified by this role** and cannot be verified from the repo —
`publicAccessToken` is wired from `process.env` and may be empty at build time.
What the repo proves is that a real Storefront API *client* is configured, not
that a valid *credential* is present.

## Decision

**Reporting provenance is asserted per layer, and the storefront commerce client
is `mock: false` (live). Zero revenue is currently reportable, and the reason is
the apex gate — not mock commerce.**

Agents must state which layer they are reporting on, and must never infer
"revenue exists" from "the API is live" or "the API is mock" from "no revenue
exists." The verified baseline as of 2026-09-27:

| Layer | State | How verified |
|---|---|---|
| Storefront client config | `mock: false` — live API client | `nuxt.config.ts:32` on `main` (`f3ac83d`) |
| Product data path | Live, serves real SKU ids | `curl https://preview.stitch-ash.com/products` → HTTP 200, `sku-001..003` |
| Customer-reachable checkout | **No** — apex password-walled | `curl -L https://www.stitch-ash.com` → final `/password` |
| Live store credential valid | **Unverified** — operator-owned | not readable from the repo; `process.env` wire only |
| **Observable real revenue** | **Zero** | apex gate blocks every customer path |

Reporting rules that follow:

- Revenue, AOV, conversion rate and gross margin are reported as `0` **with the
  stated reason**: no customer can reach checkout while the apex is gated.
- Any forward-looking revenue or margin figure is labeled an **estimate** with
  its source and its assumption basis. Estimates are never presented as actuals.
- The 90-day KPI clock starts when the apex gate is lifted, **not** when
  `mock` was set to `false`. Those are different events on different dates.
- Nobody flips `mock` to satisfy a document. `mock: false` is the current,
  intended, live-commerce state.

## Alternatives considered

- **Leave the instruction as written and do nothing.** Rejected: the parenthetical
  is factually wrong and its failure mode is a destructive prod edit, so silence
  is not neutral — it is an unmanaged risk sitting in the instructions.
- **Self-edit the agent instruction to match the repo.** Rejected: an agent
  weakening the honesty gate it was handed, without a human in the loop, is the
  same class of self-serving edit the gate exists to prevent. The correction is
  routed to the operator for authorization instead.
- **Assert "real commerce is live, so revenue data exists."** Rejected: it is
  false. The apex gate means no customer reaches checkout, and the credential
  is unverified. This is the optimistic error the provenance rule exists to
  prevent, reached from the opposite direction.
- **Assert "mock is true, therefore no data path exists."** Rejected as
  outdated — the flip landed in `f3ac83d` on 2026-08-18. This is the current
  stale claim, and it misdescribes the deployed system.

## Consequences

- KPI reporting cites this record instead of an instruction parenthetical.
- The optimism risk and the pessimism risk are both named, so a future agent is
  unlikely to "fix" the storefront in either direction.
- If the apex gate is lifted, revenue reporting still requires a confirmed
  Shopify Admin export path and a confirmed credential; neither is established
  here.
- The credential check remains operator-owned by design. No secret value was
  read, requested, or referenced in producing this record.
- This record is a reporting baseline, not a commerce change. It edits no
  storefront code and requires no deploy.

## Related

- [STI-428](/STI/issues/STI-428) — this record; authorizing the instruction
  correction.
- [STI-327](/STI/issues/STI-327) — production apex password gate; the reason
  revenue is unobservable.
- [STI-319](/STI/issues/STI-319) — the change that set `mock: false`.
- [STI-328](/STI/issues/STI-328) — GTM readiness package; owns the KPI report
  scaffold, which consumes this baseline.
- [2026-07-21 — Shopify as system of record](2026-07-21-shopify-as-system-of-record.md)
  — why live product data comes from Shopify, not from this codebase.
