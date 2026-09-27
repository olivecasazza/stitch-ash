# 2026-09-27 — Per-SKU pricing and margin model

Status: Draft (merch-lead, STI-328 GTM readiness package). Owner: merch-lead.
Companion to [positioning](2026-09-27-positioning.md).

> **Every figure in this document is an estimate, not a measurement.** The
> storefront has processed zero orders (the apex is password-walled and no
> payment provider is activated), so there is no real revenue, COGS, or margin
> data to report. Cost basis in particular is a **planning placeholder with no
> supplier quote behind it** — see "Provenance" below. The structure of the
> model is sound and reusable; the numbers must be replaced with quotes before
> any price change is executed.

## Provenance

| Input | Value used | Source | Confidence |
| --- | --- | --- | --- |
| Selling prices | 185 / 35 / 15 USD | **Verified** — rendered live at `preview.stitch-ash.com/product/sku-00{1,2,3}` and in `app/data/products.ts` | High |
| Platform fee | 2.9% + $0.30 per order | **Assumption** — published Shopify Payments US online-card rate. The store's actual plan and provider are unconfirmed; no payment provider is activated. | Medium |
| Landed cost, hoodie | 75 USD base (band 55–95) | **Estimate, no quote.** Heavyweight blank + chest + sleeve embroidery, made to order. | Low |
| Landed cost, lanyard | 6 USD base (band 4–8.5) | **Estimate, no quote.** Heavy woven lanyard with full-length repeated embroidery. | Low |
| Landed cost, sticker | 2.25 USD base (band 1.5–3.25) | **Estimate, no quote.** 6cm × 6cm embroidered patch, merrowed edge, adhesive backing. | Low |
| FX / duties / packaging | folded into landed cost | Estimate | Low |
| Revenue, sessions, AOV | **none exist** | Apex password-gated; zero orders | n/a |

Recurring platform subscription cost and labour are excluded from the
contribution figures below. Treat contribution margin as gross margin on goods
less transaction fees, **not** as net margin.

## Model

Contribution = price − (2.9% + $0.30) − landed cost.

| SKU | Price | Platform fee | Landed cost (base) | Contribution | CM % | CM % at cost band |
| --- | --- | --- | --- | --- | --- | --- |
| sku-001 Embroidered Hoodie | $185.00 | $5.67 | $75.00 | **$104.33** | 56.4% | 45.6% – 67.2% |
| sku-002 Embroidered Lanyard | $35.00 | $1.32 | $6.00 | **$27.68** | 79.1% | 71.9% – 84.8% |
| sku-003 Embroidered Sticker | $15.00 | $0.73 | $2.25 | **$12.02** | 80.1% | 73.5% – 85.1% |

Contribution is stable against fee changes because a 2.9% fee on a $185 item
is $5.67 — material, but not decision-relevant. Contribution is **not** stable
against landed cost, which is why the next section is framed as breakeven.

## The number that actually matters

Rather than assert a margin from an unquoted cost, invert it: **what is the
most we can pay in landed cost and still hit the GM KPI?**

The GM KPI is $500 gross margin in 90 days of real checkout. Max landed cost at
a 50% contribution margin:

| SKU | Price | Fee | Max landed cost @ 50% CM | Headroom vs base estimate |
| --- | --- | --- | --- | --- |
| sku-001 Hoodie | $185.00 | $5.67 | **$86.83** | $11.83 |
| sku-002 Lanyard | $35.00 | $1.32 | **$16.18** | $10.18 |
| sku-003 Sticker | $15.00 | $0.73 | **$6.77** | $4.52 |

Orders needed to reach $500 contribution, at base estimates: **5 hoodies**, 19
lanyards, or 42 stickers. The hoodie is the only SKU that can reach the KPI in
a credible first-month order count, so the hoodie is the GM lever and the
lanyard/sticker are attach and traffic products.

The hoodie headroom is the number to watch. If a real quote comes back above
**$86.83** landed, the hoodie cannot carry a 50% margin at $185 and the price
has to move — see recommendation 1.

## Recommendations

**1. sku-001 Hoodie — KEEP AS-IS at $185, conditional on a quote ≤ $86.83.**
Do not discount. The price is the anchor the persona has to be taught into
(see positioning), a discount spends the anchor and buys no new customer — the
marginal buyer is not price-sensitive, they are construction-sensitive.
*Action:* get a written supplier quote against the 50% CM ceiling. If the quote
exceeds $86.83, raise to $199–$209 rather than discount; at $209 the same
$95 cost still yields a 50% CM, and it is a smaller brand move than a sale.
*Do not execute any price change until the apex is ungated and a quote exists.*

**2. sku-002 Lanyard — KEEP AS-IS at $35. Do not discount; use it as the bundle
component.** $10.18 of headroom and a 79% base CM mean there is room to give
margin away *inside a bundle* without hurting the SKU's own economics, which a
sitewide sale would.

**3. sku-003 Sticker — KEEP AS-IS at $15, and promote it as the entry
product.** 80% base CM and $4.52 of headroom. At $15 it is the cheapest way for
a hesitant customer to own a piece of the brand, and it is the natural
first-order SKU for someone who is not yet ready for a $185 hoodie. Highest
CM of the three, so the right place to win volume.

**4. Launch bundle: Hoodie + Sticker at $200 (hoodie $185, sticker $15 — no
discount, an addition).** Contribution $116.65 vs $104.33 for the hoodie
alone: **+$12.32 per order at zero incremental acquisition cost**, because the
sticker's own margin is high enough to ride along. This is the single highest
expected-value change available and it does not touch a single list price.
Requires a Shopify bundle/discount code — storefront-lead, post-gate.

**5. Do not run sales. Do not announce a discount. "We do not run sales" is
part of the anti-persona** (positioning doc). Post-gate, the only promotional
lever agreed in this package is the bundle, which adds value rather than
marking down.

## Price-elasticity note

There is **no elasticity data and none can exist** until the apex is ungated
and orders accumulate. Any elasticity statement made today would be fabricated.

What can be said from first principles, stated as a hypothesis to be tested
after ungating, not as a finding:

- The hoodie sits at the top of the custom-embroidered band. Demand at $185 is
  most likely **less** price-elastic than mainstream apparel, because the
  persona buys rarely and substitutes on durability rather than on price.
- The sticker is the elastic SKU: at $15 with no marginal cost of goods, a
  discount buys volume cheaply — but it is a low absolute amount, so it moves
  the order count far more than the margin.
- **Test plan (post-gate, 90 days):** do not A/B the hoodie price. A split test
  at these volumes would produce noise, not signal, and would permanently
  confound the price anchor. Instead, read the sticker attach rate on the
  hoodie as the elasticity proxy, and revisit price only after 30+ hoodie
  orders exist.

## Related

- [STI-328](/STI/issues/STI-328) — GTM readiness package
- [STI-320](/STI/issues/STI-320) — GM audit (data path live, no orders)
- `docs/merch/2026-09-27-kpi-report-template.md` — where these numbers get
  replaced with measured values
