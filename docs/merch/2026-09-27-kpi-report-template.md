# 2026-09-27 — Monthly KPI report template

Status: Draft scaffold (merch-lead, STI-328 GTM readiness package). Owner:
merch-lead. Prose/structure only — no data is reported in this document.

> **Read this before filling in any cell.** As of 2026-09-27 the store has
> processed **zero orders**. The production apex is password-walled and no
> payment provider is activated. Every metric below is therefore either
> **empty**, or — where a planning value exists — explicitly an **estimate with
> its source**. Do not convert an estimate into a measurement by writing it into
> a results cell. That is the failure mode the data-provenance rule exists to
> prevent, and the reason it is quoted here rather than paraphrased.

## Provenance rules for this report

These are binding on whoever fills this in, including merch-lead.

1. **Every figure is either measured or labelled.** `MEASURED` requires a
   source that can be re-run (a query, an export file, a curl with a status
   line). `ESTIMATE` requires the basis and the author. `UNKNOWN` is a valid and
   preferred answer over a guess.
2. **Never infer revenue from traffic, or a margin from a price.** A price is
   not a margin. A margin is not a profit.
3. **"Week 0" is a date, not a number.** It is the day the first real order
   completes, and it is recorded when it happens — not when it is forecast.
4. **The 90-day clock has not started.** Do not report a day count against it
   until week 0 has a real date.
5. **Report the gate status in every issue.** A report that omits "customers
   still cannot check out" reads as a launch.

## The 90-day clock

| Field | Value | Source |
| --- | --- | --- |
| Gate-lifted date (week 0) | **NOT YET SET** | Must be the date the first real order completes |
| Day 90 deadline | **NOT YET SET** | week 0 + 90 days |
| Days elapsed | **NOT STARTED** | — |
| GM KPI | $500 gross margin within 90 days | [STI-328](/STI/issues/STI-328) |
| Current gate state | `https://www.stitch-ash.com` → `/password` (HTTP 200, Shopify password template) | `curl -sSL -w "%{url_effective}"`, 2026-09-27 |
| Blocker | Board approval `45b0b09e` (remove storefront password + activate payment provider) | via [STI-327](/STI/issues/STI-327) |

**Why week 0 is "first real order", not "password removed":** removing the gate
makes checkout *possible*; a completed order is the first moment revenue data
exists at all. The KPI is a revenue KPI, so the clock starts when the first
order is real. The date must be pasted from the order record, never estimated.

## Section 1 — Revenue and margin (monthly)

| Metric | Value | Type | Source |
| --- | --- | --- | --- |
| Gross revenue | — | | |
| Orders | — | | |
| COGS (goods) | — | | |
| Payment + platform fees | — | | |
| **Gross margin (USD)** | — | | |
| **Gross margin (%)** | — | | |
| Contribution after fees | — | | |

`Gross margin = revenue − COGS.` Shopify's "gross sales" is **not** gross
margin and must not be reported as such. Platform subscription cost and labour
are excluded from gross margin by definition; if a reader wants contribution
after fixed costs, that is a separate line and a separate argument.

**Per-SKU breakdown** (repeat of the margin model, now with real cost):

| SKU | Units sold | Revenue | COGS | Fees | Gross margin | GM % | vs. estimate |
| --- | --- | --- | --- | --- | --- | --- | --- |
| sku-001 Embroidered Hoodie | | | | | | | |
| sku-002 Embroidered Lanyard | | | | | | | |
| sku-003 Embroidered Sticker | | | | | | | |

The "vs. estimate" column compares actual COGS against the placeholder bands in
`docs/merch/2026-09-27-pricing-margin.md`. The first month of real COGS is what
replaces those estimates — that comparison is the point of the column.

## Section 2 — Traffic

| Metric | Value | Type | Source |
| --- | --- | --- | --- |
| Sessions | — | | |
| Visitors | — | | |
| Sessions by source | — | | |
| Top referrers | — | | |

Traffic while the apex is gated is **preview-environment only** and must be
labelled as such. Preview traffic is not customer traffic: no real customer can
reach preview, so its sessions are QA and agency activity, and it must never be
reported as audience size or demand signal.

## Section 3 — Conversion and AOV

| Metric | Value | Type | Source |
| --- | --- | --- | --- |
| Sessions | — | | |
| Add-to-cart rate | — | | |
| **Conversion rate** | — | | |
| Orders | — | | |
| **AOV** | — | | |
| Returning-customer rate | — | | |

`AOV = revenue ÷ orders.` Conversion rate needs a denominator that means
something: sessions → orders on the **apex**, not on preview. If the numerator
is small (this KPI is ~5 hoodie orders), state the order count next to the
percentage every time — a 100% conversion rate on 1 order is not a signal and
must not be presented as one.

## Section 4 — Organic social

| Channel | Followers | Posts | Engagement | Link clicks | Notes |
| --- | --- | --- | --- | --- | --- |
| Instagram | | | | | |
| TikTok | | | | | |
| r/embroidery | n/a | | | | |
| r/goth | n/a | | | | |
| **Attributed orders** | | | | | |

Reddit follower counts do not exist; report post count and removals instead.
"Attributed orders" means an order with a matching UTMs/referrer. Without UTMs
set up pre-launch, this cell is `UNKNOWN` — see the follow-up below.

## Section 5 — Data source: Shopify Admin export

The commercial figures come from the **Shopify Admin API**, not the Storefront
API. The Storefront API is customer-facing and returns no revenue data at all.
The storefront's own wiring (`server/api/checkout.ts`) hits the Storefront
GraphQL endpoint and is the wrong source for anything in Section 1.

**Export path, as documented (`docs/shopify-bot-bootstrap.md`):**

- Shopify Admin → **Analytics → Reports** → *Marketing*, *Sales*, and
  *Products* views, or the equivalent Admin API resources
  (`orders`, `order_items`, `products`, `line_items`).
- Admin API version in use by the storefront: `2026-04` (see
  `server/api/checkout.ts` — keep the KPI report on the same version so the
  figures are reconcilable against checkout behaviour).
- Minimum fields per order: created_at, line items, SKU/handle, gross price,
  discounts, refunds, total.

**merch-lead cannot execute this export.** Admin access requires
`SHOPIFY_*` credentials which live in nixlab IaC and are operator-owned
(hard rule 5: escalate, do not improvise; never paste secret values into
issues). The weekly/monthly export therefore needs either an operator-run
snapshot or a token provisioned for merch-lead. **This is an open dependency,
tracked as a follow-up issue** — until it is resolved, Sections 1 and 3 stay
`UNKNOWN` and are reported as such.

## Section 6 — Standing risks and gate status

Repeat every month, every issue. Currently open:

- [STI-327](/STI/issues/STI-327) → board approval `45b0b09e`: apex
  password-gated, no payment provider. **Customers cannot complete a purchase.**
- Product photography missing on all 3 SKUs (`PHOTOGRAPH PENDING`) —
  design-lead. Suppresses conversion regardless of traffic.
- `og:image` serves a third-party demo logo (store copy pass finding #1) —
  every organic link unfurls wrong. storefront-lead.
- Hoodie landed-cost quote outstanding — the 50% CM ceiling is $86.83 and the
  placeholder estimate is $75. Pricing is provisional until quoted.

## Section 7 — Month-over-month narrative

Free text, 3–5 bullets. Must include:

- Order count, stated as a raw number, never as a growth percentage off a zero
  or one-order base.
- What was *learned*, not what was *shipped*. "4 hoodie orders, all from one
  Instagram post" is a learning; "shipped the PDP fix" is not.
- Whether COGS landed inside the estimated band, and what that does to the
  margin model.
- Anything that would make the next month's number non-comparable (a promo, a
  bundle, a price change, a tracking change) — comparability breaks are more
  expensive than a bad month.

## Related

- [STI-328](/STI/issues/STI-328) — GTM readiness package
- [STI-320](/STI/issues/STI-320) — GM audit (data path live, zero orders)
- `docs/merch/2026-09-27-pricing-margin.md` — the estimate bands this report replaces
- `docs/merch/2026-09-27-social-plan.md` — Section 4's measurement plan
