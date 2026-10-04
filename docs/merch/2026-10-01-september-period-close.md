# September 2026 — period close

**Owner:** merch-lead. **Period:** 2026-09-01 → 2026-09-30, now **closed**.
**Companion report:** `docs/merch/2026-09-28-monthly-kpi-report.md` (the
mid-period first report). This document does not restate that report's numbers.
It closes the period, and it records **one correction to that report's stated
reasoning** — see [Correction 1](#correction-1-the-hoodie-lead-time-claim-was-falsified).

**Every provenance fact below was re-fetched 2026-10-01** (this run). The live
site served SHA `b69c73edcdbca2b166eccdca23e96696a69e5d57`, which equals local
`origin/main`. No figure is carried over unre-verified.

---

## Provenance statement for the closed period

> **September 2026 closed at $0.00 gross revenue, measured.** The storefront's
> commerce data path is real and verified working; the cause of the zero is a
> **password gate at the edge of the production apex**, which intercepts every
> path before routing. It is **not** mock commerce and **not** the Shopify
> channel lock. No customer completed a purchase at any point in the period.

Three governing facts, each re-verified this run:

| # | Fact | Evidence, 2026-10-01 |
|---|---|---|
| 1 | Commerce is **real**, not mock. | `nuxt.config.ts:57` on `origin/main` `b69c73e` reads `mock: false,` |
| 2 | The data path **works end to end** up to the last step. | `POST /api/checkout` → `HTTP 200` with a real `checkoutUrl` (`cart/c/hWNHSyWQN4DHWQYTdYCZlvvU`), variant `gid://shopify/ProductVariant/66758592790573` |
| 3 | **No customer can complete a purchase.** | `https://www.stitch-ash.com` → `HTTP 200`, final `https://www.stitch-ash.com/password`, body `Enter password` / `Protected`; and that fresh cart permalink redirects to the same `/password` |

Fact 2 against fact 3 is the load-bearing pair: a genuine Shopify cart is
*minted* and then routed to a page nobody can pass. A `200` from this storefront
is not evidence of a working store, and a working cart is not evidence of
revenue.

**Not claimed as a revenue blocker:** the Shopify Online Store channel lock
([STI-457](/STI/issues/STI-457)). It blocks *Admin* reads, which blocks the
Section 5 reporting pipeline. It does not block the Storefront path a customer
uses.

---

## Correction 1 — the hoodie lead-time claim was falsified

The September report resolved a store-copy item and **stated the mechanism
wrong**. The conclusion (resolved) holds. The reason given does not, and it was
checked and published twice.

**What the report claimed**, in the fourth amendment and again in the
re-verification appendix:

> "the hoodie PDP `Shipping & Returns` body now reads `Made to order. Ships
> tracked. Returns accepted within 14 days…` — **the catalog no longer restates
> a lead time**, so the `2–3 weeks` vs `3–5 weeks` contradiction … no longer
> exists on the page."

**What the live site actually shows**, 2026-10-01, `https://preview.stitch-ash.com/product/sku-001`:

```
Shipping & Returns body:  "Made to order. Ships tracked. Returns accepted within 14 days…"
Product description:      "Made to order. Allow 2–3 weeks for production."
Occurrences "2–3 weeks":  3
Occurrences "3–5 weeks":  0
```

The lead time was **not** removed from the catalog. It was moved out of the
`Shipping & Returns` accordion — where it contradicted itself — and into the
product description, where it now appears **three times**, sourced from
`catalog/products/sku-001.yaml:16`:

```
<p>Made to order. Allow 2–3 weeks for production.</p>
```

**Both halves of the original claim were wrong:**

1. *"the catalog no longer restates a lead time"* — **false**. The catalog
   states it, and still does at `origin/main` `b69c73e`. It was asserted from
   the absence of a string in one accordion body, and the string was found
   elsewhere on the same page.
2. *"the contradiction no longer exists"* — **true, but partly by luck**. The
   contradiction was `2–3 weeks` ×3 against `3–5 weeks` ×1. Deleting the single
   `3–5 weeks` occurrence removed it without anyone confirming the surviving
   value. The number a customer now reads three times is an unverified promise.

**Why this is worth a correction and not a footnote.** This report's whole
purpose is that a reader can trust an attribution. Here the *conclusion* was
right and the *evidence* was a partial page match — the exact failure shape of
the hallucinated-delivery pattern STI-226 exists to prevent, arriving via a
different door: not an invented claim, but an unverified one stated with the
confidence of a measured one. The commercial fact a customer now sees three
times on a $185 garment is a lead time that **no supplier has confirmed**.
Nothing in the repo or on the live site ties `2–3 weeks` to a real production
schedule, and [STI-418](/STI/issues/STI-418) shows landed cost is still
unquoted.

**Correct position:** the `Shipping & Returns` contradiction is genuinely fixed.
The hoodie carries a **single, consistent, unconfirmed** lead-time claim. That
is better than September 1 and worse than "no lead time", and it must not be
reported as verified. It is filed as [STI-609](/STI/issues/STI-609).

**No revenue figure changed.** The $0.00 is a gate fact, untouched by copy.

---

## Closed-period scorecard

No metric is new here; this is the period's final state with sources.

| Metric | September 2026 | Type | Source |
| --- | --- | --- | --- |
| Gross revenue | **$0.00** | MEASURED | apex gated all period |
| Orders | **0** | MEASURED | as above |
| Gross margin (USD) | **$0.00** | MEASURED | revenue − COGS |
| Gross margin (%) | **n/a** | — | undefined on a zero base; **not** `0%` |
| Sessions / visitors | **UNKNOWN** | — | no analytics tag, no apex traffic |
| Conversion rate | **NOT MEANINGFUL** | — | 0 orders ÷ unknown sessions |
| AOV | **n/a** | — | undefined on a zero-order base |
| Organic posts | **0** | MEASURED | deliberate pre-launch hold, per the social plan |
| Hoodie landed-cost quote | **OUTSTANDING** | — | [STI-418](/STI/issues/STI-418) |

`UNKNOWN` and `n/a` are kept distinct from `0` throughout. A business with no
transactions and a business performing at a loss are different facts, and so is
a metric with no instrument.

### The 90-day clock

| Field | Value |
| --- | --- |
| Week 0 (first real order) | **NOT SET** — the clock has not started |
| Day 90 deadline | **NOT SET** |
| Days elapsed | **NOT STARTED** |
| KPI | $500 gross margin within 90 days of week 0 ([STI-328](/STI/issues/STI-328)) |

The clock has never started, so no day count is reported against it. Week 0 is
the date a real order completes — not the date the password is removed, which
makes checkout *possible* rather than real.

---

## What must be true before October is measurable

September produced no data. That is recoverable. What is **not** recoverable is
October's first revenue landing with no instrument to record it — a
comparability break is permanently invisible once the data is gone.

| Prerequisite | Status 2026-10-01 | Tracking |
| --- | --- | --- |
| Apex password removed | **OPEN** — operator | [STI-492](/STI/issues/STI-492), [STI-519](/STI/issues/STI-519) |
| Analytics tag installed | **OPEN** | [STI-419](/STI/issues/STI-419) |
| Admin read path for revenue export | **OPEN** — channel locked | [STI-457](/STI/issues/STI-457), [STI-418](/STI/issues/STI-418) |
| Landed cost per SKU quoted | **OPEN** — hoodie is the exposure | [STI-418](/STI/issues/STI-418) |
| Product photography, all 3 SKUs | **OPEN** | [STI-309](/STI/issues/STI-309) |
| Hoodie lead time confirmed by supplier | **OPEN** — new this run | [STI-609](/STI/issues/STI-609) |

The photography item is a **conversion** blocker, not a cosmetic one: a $185
garment that has never been photographed cannot convert on it, whatever the
traffic quality.

---

## Evidence appendix — every command run, this run

Run 2026-10-01 against `origin/main` `b69c73e`. Live SHA confirmed by the
build marker embedded in the served HTML, not inferred.

| Claim | Command | Result |
| --- | --- | --- |
| Live SHA == main | `curl -sS https://preview.stitch-ash.com/` | `b69c73edcdbca2b166eccdca23e96696a69e5d57`, `200` |
| Commerce not mock | `git show origin/main:nuxt.config.ts` | line 57 `mock: false,` |
| Apex gated | `curl -sSL -w '%{url_effective}' https://www.stitch-ash.com` | `200`, final `…/password`, body `Enter password` / `Protected` |
| Gate is edge-level | `curl -sS https://preview.stitch-ash.com/products/nonexistent-stitch-ash-check` | `404` — preview serves real 404s; the apex answers the same class of path with `200 /password` |
| Cart genuinely live | `POST /api/checkout` (real variant gid) | `200`, `checkoutUrl` → `www.stitch-ash.com/cart/c/hWNHSyWQN4DHWQYTdYCZlvvU` |
| Cart dead-ends at gate | `curl -sSL "<that checkoutUrl>"` | `200`, final `https://www.stitch-ash.com/password` |
| Cart is fresh, not replayed | two calls, different ids | `…hWNHSyWQN4DHWQYTdYCZlvvU` vs `…hWNHSyXirFXCQrb6IyRBsvAO` |
| All 3 SKUs purchasable on preview | `GET /product/sku-00{1,2,3}` | `200` each; `Add to cart` present on all three |
| `og:image` brand asset | `GET /` | `og:image` → `https://preview.stitch-ash.com/og-brand-card.png` (`1200×600`, `image/png`) |
| **Hoodie lead time still present** | `GET /product/sku-001` | `2–3 weeks` ×3 (description), `3–5 weeks` ×0 → **Correction 1** |
| Lead time source | `grep -rn 'weeks' catalog/products/*.yaml` | single hit: `catalog/products/sku-001.yaml:16` |
| Photography still absent | `GET /product/sku-00{1,2,3}` | `PHOTOGRAPH PENDING` ×0 on all three; PDPs render SVG marks |

**Two notes on method, recorded so they are not mistaken for findings.** The
checkout endpoint validates its request body before anything else — an
unshaped first call returns `HTTP 400` with a message naming the required
`items[].variantId` shape, which is a contract error, not a broken cart. The
real variant gid was then read out of the PDP's own SSR payload. And
`/products/<handle>` is not the PDP route; `/product/<handle>` is, and it
answers `200`. Both are recorded so a later reader does not re-derive them.

**Not verified this run, stated as such:** Shopify Admin API state, inventory
levels, order history, supplier lead times, and anything requiring `SHOPIFY_*`
credentials. Those are operator-owned (HARD RULE 5) and no value was pasted,
guessed, or inferred from a public surface.

---

## Correction 2 — the quoted string moved; the "×3" evidence was never a render count

Logged 2026-10-04 (STI-638), after the fact. **Correction 1 above is not affected
by this** — the lead-time claim was still unsourced and still falsified, and it
still is. Two claims in this document's evidence appendix are stale and must not
be cited.

1. **The quoted strings are historical, not current.** This document quotes
   `<p>Made to order. Allow 2–3 weeks for production.</p>` at
   `catalog/products/sku-001.yaml:16`. #204 (`79ad80e`, 2026-10-03) reworded and
   moved it to `catalog/products/sku-001.yaml:41` as `Ships in 2–3 weeks.`
   The reword is **not a fix** — same unquoted 2–3 weeks, still live, still
   blocking on [STI-638](/STI/issues/STI-638).
2. **"Occurrences `2–3 weeks`: 3" and "`2–3 weeks` ×3 (description)" in the
   appendix were a raw substring count on the page source, mis-labelled as a
   render count.** Re-measured 2026-10-04 against `buildId dd64f5c114`:
   **2 occurrences in source, of which 1 is visible** (the description `<li>`)
   and 1 is inside the serialized Nuxt payload. The `<meta description>` copy
   asserted in Correction 1 does not reproduce on the current build. The
   appendix rows stand as a record of what was measured on 2026-10-01 and are
   annotated rather than rewritten, because altering a closed-period record to
   match later knowledge is its own falsification.

Separately, and still true: `catalog/shipping/default.yaml:6-7` states
`madeToOrderMinDays: 14` / `madeToOrderMaxDays: 35` = **2–5 weeks**,
contradicting the PDP's 2–3 weeks. Neither is quoted.

---

## Related

- `docs/merch/2026-09-28-monthly-kpi-report.md` — the mid-period report, with Correction 1 now logged against it
- `docs/merch/2026-09-27-kpi-report-template.md` — the binding provenance rules
- `docs/merch/2026-09-27-store-copy-pass.md` — the copy audit that found the original lead-time contradiction
- `docs/merch/2026-09-27-pricing-margin.md` — unquoted cost bands and the 50% CM ceilings
- [STI-609](/STI/issues/STI-609) — hoodie lead time is a single unconfirmed claim (new, this run)