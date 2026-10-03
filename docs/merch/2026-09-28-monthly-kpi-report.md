# September 2026 — Monthly KPI report

**Owner:** merch-lead. **Period:** 2026-09-01 → 2026-09-30 (report written
2026-09-28, i.e. the period is still open; this is the first report of the
period, not a close). **Status:** First report. Prior state: template only, no
filled report existed.

> **Amendment 2026-09-28 (review pass, no metric changed).** Blocker
> *pointers* were corrected after the report was merged. The first draft cited
> [STI-327](/STI/issues/STI-327) as the open revenue blocker; that issue is
> `done`, so the citation sent a reader to a closed ticket. It now points at
> the two open operator asks, and the two reporting dependencies now cite the
> issues that actually track them. **No number, measurement, or attribution in
> this report changed** — every figure below is as originally published.
>
> **Second pointer correction, same day.** The Section 6 `og:image` row labelled
> [STI-439](/STI/issues/STI-439) `closed`; that ticket is `in_progress`. Only its
> `og:image` item is resolved — the same ticket also carries the photography
> and lead-time items, which are open. Again a status label, again no number
> changed. Both corrections are re-fetched against the API on 2026-09-28.
>
> **Third correction, same day.** The Section 6 photography row credited
> design-lead. [STI-309](/STI/issues/STI-309) is assigned to storefront-lead and
> is `blocked` by [STI-318](/STI/issues/STI-318); design-lead owns embroidery
> art direction, not photography. Owner attribution only — no number changed.
>
> **Fourth correction, 2026-09-29 (re-verification pass, no metric changed).**
> The Section 6 `og:image` row still listed the lead-time item as open on
> [STI-439](/STI/issues/STI-439). Re-fetched live this run, that item is
> **resolved**: the hoodie PDP `Shipping & Returns` body now reads
> `Made to order. Ships tracked. Returns accepted within 14 days of delivery if
> unworn and unaltered.` — the catalog no longer restates a lead time, so the
> `2–3 weeks` vs `3–5 weeks` contradiction documented in
> `docs/merch/2026-09-27-store-copy-pass.md` §3 no longer exists on the page.
> The remaining open [STI-439](/STI/issues/STI-439) item is photography only.
> Status label only — no number changed.

> **Fifth correction, 2026-10-01 (period close).** The fourth amendment and the
> re-verification appendix below both state that the hoodie lead-time item was
> resolved because *"the catalog no longer restates a lead time."* **That
> reason is false.** Re-fetched at period close, `product/sku-001` shows
> `2–3 weeks` **three times** — sourced from `catalog/products/sku-001.yaml:16`
> — and `3–5 weeks` zero times. The contradiction was removed by deleting the
> lone `3–5 weeks` occurrence, not by removing the lead time. The *conclusion*
> (no longer self-contradictory) stands; the *stated mechanism* does not, and
> the surviving value is an unconfirmed customer-facing promise. Full correction
> with evidence: `docs/merch/2026-10-01-september-period-close.md` § Correction 1,
> and [STI-609](/STI/issues/STI-609). **No revenue figure changed** — the $0.00
> is a gate fact, independent of copy.

Structure and the binding provenance rules are defined in
`docs/merch/2026-09-27-kpi-report-template.md` and are not restated here.

---

## Data provenance — read before any number below

**This storefront takes no revenue, and the reason is a gate, not a mock flag.**

Three facts, each independently re-fetched **this run** (2026-09-28). The third
is the one that governs this entire report.

| # | Fact | Evidence (this run) |
|---|---|---|
| 1 | The storefront runs **real** commerce. It is **not** mock. | `nuxt.config.ts:37` on `origin/main` `8bacf83` is `mock: false,` (re-verified 2026-09-29) |
| 2 | The commerce path **works end to end up to the last step.** | Real Shopify product, real variant, `cartCreate` returns a real `checkoutUrl` ([STI-327](/STI/issues/STI-327), [STI-545](/STI/issues/STI-545)) |
| 3 | **No customer can complete a purchase.** | `https://www.stitch-ash.com` → `HTTP 200`, final URL `https://www.stitch-ash.com/password`, body `Enter password` / `Protected` |

So the honest one-line provenance statement for September 2026 is:

> Real revenue is **$0.00**, measured, and the cause is the **password-gated
> production apex** — *not* mock commerce, and *not* the Shopify channel lock.
> The storefront's data path is healthy; the door is shut.

**Explicitly not claimed as a revenue blocker:** the Shopify Online Store
channel lock ([STI-457](/STI/issues/STI-457)). It blocks *Admin* reads, which
blocks the reporting pipeline in Section 5. It does not block the Storefront
path a customer uses, and the cart provably builds.

### Amendment 2026-09-29 — the gate is *edge-level and total* (no number changed)

Fact 3 was previously stated only as "the apex is password-gated." Re-fetched this
run, it is stronger and more specific than that, and the specificity is what
makes the $0 attribution airtight. **No revenue figure, unit count, or margin
figure in this report changed.** This adds the *mechanism* behind Fact 3.

The gate intercepts **every path at the edge, before routing**:

| Path | `preview` | `www` (apex) |
|---|---|---|
| `/` | 200 `/` | 200 → `/password` |
| `/products` | 200 `/products` | 200 → `/password` |
| `/cart` | **404** (genuine route miss) | 200 → `/password` |
| `/cart/c/{id}?key=…` | — | 200 → `/password` |
| `/collections/all` | — | 200 → `/password` |
| `/nope-does-not-exist-xyz` | **404** | 200 → `/password` |

The last row is the load-bearing one: preview answers a non-existent path with a
real `404`, and the apex answers the *same* path with `200 /password`. A site
that responds before it routes is gating ahead of the application. The served
body is Shopify's own password template (`password-form`, `shopify` ×68,
`Enter password`).

**Consequence, and it is the correct way to read this report:** a real cart id is
*issued* and then routed to a page no customer can pass. A fresh cart was created
this run to confirm the cart is genuinely live rather than a replay —
`POST /api/checkout` returned `cart/c/hWNHNLHYVcBJo4kdkLoJcqHQ?key=…`, a **new**
id distinct from the one recorded in the 2026-09-28 evidence — and following that
permalink on the apex landed on `/password` after 3 redirects. So "the cart
works" and "a customer can buy" are not two descriptions of one state; on this
deployment they are **mutually exclusive**, and the $0 in Section 1 is fully
accounted for with no second hidden cause.

> **A note on which rule I applied.** My own agent instructions still carry the
> stale `clients.storefront.mock = true` claim ([STI-428](/STI/issues/STI-428),
> operator fix outstanding). The verified facts above are what I used, not the
> text in that file. Every figure in this report attributes the $0 to the apex
> gate, which is the attribution the stale text would have gotten wrong.

**Cell types used below:** `MEASURED` (a source that can be re-run),
`ESTIMATE` (basis + author named), `UNKNOWN` (preferred over a guess). No
estimate has been written into a results cell.

---

## The 90-day clock

| Field | Value | Type | Source |
| --- | --- | --- | --- |
| Gate-lifted date (week 0) | **NOT SET** | — | Set on the date the first real order completes; never estimated |
| Day 90 deadline | **NOT SET** | — | week 0 + 90 |
| Days elapsed | **NOT STARTED** | — | — |
| GM KPI | $500 gross margin within 90 days of week 0 | Target | [STI-328](/STI/issues/STI-328) |
| Gate state | `www.stitch-ash.com` → `/password`, `HTTP 200`, `103731` bytes | MEASURED | `curl -sSL -w '%{url_effective}'`, 2026-09-29 |
| Storefront data path | Working — real product, real variant, real cart URL | MEASURED | [STI-545](/STI/issues/STI-545), 2026-09-28 |
| Shopify Admin API | Locked — no order export available | MEASURED | [STI-457](/STI/issues/STI-457) |
| Blocker A (revenue) | Apex password gate | Open | [STI-492](/STI/issues/STI-492) `todo`, [STI-519](/STI/issues/STI-519) `blocked` — both operator-owned |
| Blocker B (reporting) | Online Store channel lock + no Admin read path — blocks Sections 1 & 3 | Open | [STI-457](/STI/issues/STI-457), [STI-418](/STI/issues/STI-418) `in_review` |

Week 0 remains "first real order", not "password removed": removing the gate
makes checkout *possible*; revenue data does not exist until an order completes.

---

## Section 1 — Revenue and margin (monthly)

| Metric | Value | Type | Source |
| --- | --- | --- | --- |
| Gross revenue | **$0.00** | MEASURED (zero orders) | Apex gated, 2026-09-28 |
| Orders | **0** | MEASURED | as above |
| COGS (goods) | **$0.00** | MEASURED (nothing purchased) | as above |
| Payment + platform fees | **$0.00** | MEASURED | as above |
| **Gross margin (USD)** | **$0.00** | MEASURED | revenue − COGS |
| **Gross margin (%)** | **n/a** | — | Undefined on a zero base; **do not** print `0%` |
| Contribution after fees | **$0.00** | MEASURED | as above |

A `0%` gross margin would be a false precision that reads as a business
performing at a loss. It is a business with no transactions. Those are
different facts and this report keeps them different.

### Per-SKU breakdown

| SKU | Price | Units sold | Revenue | COGS | Gross margin | vs. landed-cost estimate |
| --- | --- | --- | --- | --- | --- | --- |
| sku-001 Embroidered Hoodie | $185.00 | **0** | $0.00 | $0.00 | $0.00 | **No data — quote still outstanding** |
| sku-002 Embroidered Lanyard | $35.00 | **0** | $0.00 | $0.00 | $0.00 | **No data — quote still outstanding** |
| sku-003 Embroidered Sticker | $15.00 | **0** | $0.00 | $0.00 | $0.00 | **No data — quote still outstanding** |

Prices are `MEASURED` — all three render live on
`preview.stitch-ash.com/products` (`$185` / `$35` / `$15`, one match each,
`HTTP 200`, `20304` bytes, re-measured 2026-09-29).

The "vs. estimate" column is `No data` rather than empty because the estimate
it would compare against has never been tested. The bands in
`docs/merch/2026-09-27-pricing-margin.md` (hoodie $75 base / 55–95 band,
lanyard $6 / 4–8.5, sticker $2.25 / 1.5–3.25) are **unquoted planning
estimates, ESTIMATE, author merch-lead, confidence low.** The hoodie carries
the exposure: the 50% contribution-margin ceiling is **$86.83** landed, only
$11.83 above the base estimate, and the top of the cost band ($95) breaks it.
Until a written quote exists, hoodie pricing is provisional and the first
month of real COGS is what replaces these numbers. The quote is tracked on
[STI-418](/STI/issues/STI-418).

---

## Section 2 — Traffic

| Metric | Value | Type | Source |
| --- | --- | --- | --- |
| Sessions | **UNKNOWN** | — | No analytics on the apex — it serves a password page |
| Visitors | **UNKNOWN** | — | as above |
| Sessions by source | **UNKNOWN** | — | as above |
| Top referrers | **UNKNOWN** | — | as above |

Not `0`. **Unknown** — and the distinction matters. Traffic is unknown because
there is no measurement instrument, not because the number is zero. There is
also no analytics tag installed ahead of launch ([STI-419](/STI/issues/STI-419),
open), so this section will be `UNKNOWN` on the first day the gate lifts too.
Installing the tag is a prerequisite for measuring anything in Sections 2 and 3,
and it is currently a queue item rather than a launch blocker being tracked.

Preview-environment traffic is **QA and agency activity only** and is never
reported as audience size or demand signal. No real customer can reach preview.

---

## Section 3 — Conversion and AOV

| Metric | Value | Type | Source |
| --- | --- | --- | --- |
| Sessions (apex) | **UNKNOWN** | — | Section 2 |
| Add-to-cart rate | **UNKNOWN** | — | No apex traffic, no analytics tag |
| **Conversion rate** | **NOT MEANINGFUL** | — | 0 orders ÷ unknown sessions |
| Orders | **0** | MEASURED | Section 1 |
| **AOV** | **n/a** | — | Undefined on a zero-order base |
| Returning-customer rate | **n/a** | — | No customers exist yet |

Conversion is reported as *not meaningful* rather than `0%`. Even once orders
exist, the order count must be printed next to the percentage every time — at
this KPI's scale (~5 hoodie orders) a 100% rate on one order is noise, not a
signal.

---

## Section 4 — Organic social

| Channel | Followers | Posts | Engagement | Link clicks | Attributed orders |
| --- | --- | --- | --- | --- | --- |
| Instagram | UNKNOWN | **0** | UNKNOWN | UNKNOWN | **0** |
| TikTok | UNKNOWN | **0** | UNKNOWN | UNKNOWN | **0** |
| r/embroidery | n/a (no follower metric exists) | **0** | UNKNOWN | UNKNOWN | **0** |
| r/goth | n/a (no follower metric exists) | **0** | UNKNOWN | UNKNOWN | **0** |
| **Total** | — | **0** | UNKNOWN | UNKNOWN | **0** |

`Posts = 0` is `MEASURED` and is a deliberate pre-launch position, not an
omission: the plan in `docs/merch/2026-09-27-social-plan.md` sequences posting
*after* the storefront is purchasable, because links that dead-end at a
password page burn the first-impression window the brand cannot replace.
`Attributed orders = 0` follows from Section 1, not from tracking.

**Attribution is structurally impossible this month even if a post existed.**
No UTMs are configured and no analytics tag is installed
([STI-419](/STI/issues/STI-419)). Organic social is the largest *planned*
acquisition channel and it currently has **zero measurement** — that is the
real finding in this section, and it should be fixed before the first post, not
after.

---

## Section 5 — Data source: Shopify Admin export

**Status: the authoritative revenue source is unavailable to me.**

Commercial figures must come from the Shopify **Admin** API. merch-lead cannot
run that export: it needs `SHOPIFY_*` credentials that live in nixlab IaC and
are operator-owned (HARD RULE 5 — escalate, never improvise, never paste a
secret value into an issue). Independently, the Online Store channel is
**locked**, so Admin reads return `"Online Store channel is locked"`
([STI-457](/STI/issues/STI-457)).

**Where this dependency is tracked:** [STI-418](/STI/issues/STI-418) —
`[OPERATOR] Landed cost per SKU + working Shopify Admin read — gross-margin KPI
has no data path`, `in_review` with the GM for escalation. It was raised by the
prior monthly report ([STI-417](/STI/issues/STI-417)) and covers both halves of
this dependency: the Admin read path **and** the landed cost per SKU that the
per-SKU "No data" column above is waiting on. It is not re-raised here; this
report cites it so the dependency is traceable to its owner.

Consequence, stated plainly: **Sections 1 and 3 stay `UNKNOWN`-by-construction
the moment the gate lifts**, until an operator-run snapshot or a provisioned
read-only token exists. This is a reporting-infrastructure dependency and it
should be closed *before* week 0, otherwise the first month with real revenue
will be the first month whose revenue cannot be measured from source.

The Storefront API is the **wrong** source for any of this and is not a
workaround: it is customer-facing and returns no order or revenue data.

---

## Section 6 — Standing risks and gate status

Verified state as of 2026-09-29 (Section 6 re-fetched this run; all other
sections as published 2026-09-28).

| Risk | State | Evidence (this run) | Owner |
|---|---|---|---|
| **Customers cannot purchase** | **OPEN — the only revenue blocker** | Edge-level, site-wide gate: `www.stitch-ash.com` → `/password` on **every** path incl. `/nope-does-not-exist-xyz`, where preview returns a real `404`; a fresh real cart permalink dead-ends there in 3 redirects | operator — [STI-492](/STI/issues/STI-492) `todo`, [STI-519](/STI/issues/STI-519) `blocked` |
| Admin channel lock (blocks reporting) | OPEN | [STI-457](/STI/issues/STI-457) | operator |
| No Admin read path for the KPI (blocks reporting) | OPEN | [STI-418](/STI/issues/STI-418) `in_review` | operator, via GM |
| **Product photography missing, all 3 SKUs** | **OPEN** | `featuredImage` absent from live Storefront data; PDP renders an SVG mark (`aria-label="Embroidered Hoodie"`), **zero `<img>` elements** | storefront-lead — [STI-309](/STI/issues/STI-309) `blocked` by [STI-318](/STI/issues/STI-318) |
| Hoodie landed-cost quote outstanding | OPEN — hoodie pricing provisional | ceiling $86.83 vs $75 base estimate | supplier via operator ask — [STI-418](/STI/issues/STI-418) |
| No analytics tag before launch traffic | OPEN | [STI-419](/STI/issues/STI-419) | storefront-lead |
| ~~`og:image` served a third-party demo logo~~ | **RESOLVED this period** | `og:image` → `https://preview.stitch-ash.com/og-brand-card.png` on `/` and on PDP; asset fetches `HTTP 200`, `20987` bytes, `image/png` | og:image item resolved. **Lead-time item is NOT resolved** — retracted 2026-10-01, see fifth correction; operator quote outstanding at [STI-638](/STI/issues/STI-638). [STI-439](/STI/issues/STI-439) open for photography **and** lead time |
| Hoodie PDP states an unquoted production lead time | **OPEN** | `catalog/products/sku-001.yaml:16` ships `Allow 2–3 weeks for production`, sourced once and rendered 3× per PDP view via `app/pages/product/[handle].vue:155`; re-verified live 2026-10-03: `2–3 weeks` ×3, `3–5 weeks` ×0 | operator — supplier quote [STI-638](/STI/issues/STI-638), tracked from [STI-609](/STI/issues/STI-609) |

Photography is worth restating as a **conversion** risk rather than a
cosmetic one. A brand selling a $185 garment that has never been photographed
cannot convert on it, independent of traffic quality. Combined with the gate,
September's conversion outlook is structurally zero, not merely low.

---

## Section 7 — Month-over-month narrative

First report, so there is no prior month to compare against — and the honest
framing is that **there is no trend to report**.

- **Orders: 0.** Stated as a raw count. No growth percentage is computable off
  a zero base and none is offered.
- **What was learned:** the revenue path is **proved working up to the gate**.
  A real product, a real variant, and a real cart URL were all observed; the
  cart dead-ends at the password page. So the $0 is fully attributed and there
  is no hidden second cause. That is a materially better position than
  "zero, cause unknown" — when the gate lifts, the first order should flow
  without a further integration unknown.
- **COGS did not land in any band, because COGS has never been incurred.** The
  hoodie quote remains the single largest unpriced risk in the margin model.
- **Two things changed that make October non-comparable if they are not fixed
  first:** the analytics tag ([STI-419](/STI/issues/STI-419)) and the Admin
  read path ([STI-457](/STI/issues/STI-457)). If the gate lifts without either,
  October's first real revenue will exist but will not be measurable from
  source. **Comparability breaks are more expensive than a bad month**, and
  this is the cheapest possible moment to prevent one — before any data exists.
- **Positioning work shipped without a storefront to point at.** The
  `og:image` defect is closed and verified live this period, which removes a
  real organic-unfurl problem — but it is invisible until the apex serves
  traffic, so it will not show up in any metric in this report.

---

## Appendix — re-verification pass, 2026-09-29

Every live claim in this report re-measured this run. **No revenue, unit, or
margin figure changed** — the $0.00 attribution is unchanged, because the gate
is unchanged. What changed is one status label (lead-time) and three byte
counts.

| Claim | Command | Result this run | Verdict |
|---|---|---|---|
| Apex is password-gated | `curl -sSL -w '%{http_code} %{url_effective} %{size_download}' https://www.stitch-ash.com` | `200`, final `https://www.stitch-ash.com/password`, `103731` bytes | **Unchanged** — gate still shut |
| Gate is edge-level and total | `https://www.stitch-ash.com/nope-does-not-exist-xyz` | `200` → `/password` | **Unchanged** — gated, not a 404 |
| Control: preview serves real 404s | `https://preview.stitch-ash.com/nope-does-not-exist-xyz` | `404` | **Unchanged** — confirms the apex gate is a gate, not a routing artifact |
| Storefront is **not** mock | `git show origin/main:nuxt.config.ts` | line 37 `mock: false,` | **Unchanged** |
| Three SKUs price live | `https://preview.stitch-ash.com/products` | `200`, `20304` bytes, `$185`/`$35`/`$15` one match each | **Unchanged** |
| No product photography | `https://preview.stitch-ash.com/product/sku-00{1,2,3}` | all `200`, **0** `<img>` elements on all three; 8 `<svg>` marks on the hoodie PDP | **Unchanged — still OPEN** |
| `og:image` fixed | `https://preview.stitch-ash.com` | `og:image` → `.../og-brand-card.png`; asset `200`, `20987` bytes, `image/png` | **Unchanged — resolved** |
| Hoodie lead-time contradiction | `https://preview.stitch-ash.com/product/sku-001` | ⚠️ **The observation in this row was wrong and has been re-measured.** As written it claimed `no 2–3 weeks / 3–5 weeks on the page`. Re-fetched 2026-10-03 at `origin/main` = `04a35dc6`: `2–3 weeks` ×**3**, `3–5 weeks` ×0. The page is no longer self-contradictory, but the lead time is **present**, not absent | **REOPENED — not resolved** |
| Latent demo strings | `i18n/locales/en.json` | no `Nuxt Shopify Demo` / `Welcome to our demo store`; `home` block empty, `seo.description` is brand copy | **Unchanged — resolved** |

**Correction logged:** the lead-time row was stale (fourth amendment, above).
The store-copy pass §3 documented a real `2–3 weeks` vs `3–5 weeks`
contradiction; the shipped fix removed the catalog's restatement of a
commercial fact Shopify owns, and the live PDP now defers to Shopify. The page
no longer contradicts itself.

> **This row's *stated reason* was later falsified — see the fifth correction at
> the top of this document and `2026-10-01-september-period-close.md` §
> Correction 1.** The check below asserted "no `2–3 weeks` / `3–5 weeks` on the
> page" from the `Shipping & Returns` accordion alone. The lead time was not
> removed from the catalog; it survives in the product description three times.
> The "no contradiction" conclusion happens to hold, but it was not established
> by this evidence. Do not cite this row as proof the lead time is gone.

**Note on the product URL used for the photography check:** the PDP route is
`/product/<handle>` (`sku-001`), not `/products/<handle>`. An initial probe of
`/products/embroidered-hoodie` returned `404` — that is a wrong URL, not a
missing product, and it is recorded here so a future reader does not mistake it
for a finding. The `<img>` count of 0 is from the real route.

**Still unmeasured, and still honestly so:** Sections 2, 3, 4 and the Admin
export in Section 5 are `UNKNOWN` by construction, not by omission. The
gate-shut state is the only thing re-measurable while the apex is closed.

---

## Related

- `docs/merch/2026-09-27-kpi-report-template.md` — structure and the binding provenance rules
- `docs/merch/2026-09-27-pricing-margin.md` — the unquoted cost bands and the 50% CM ceilings
- `docs/merch/2026-09-27-social-plan.md` — the post-gate posting sequence
- `docs/decisions/2026-09-27-data-provenance-baseline.md` — per-layer data-path provenance
- [STI-328](/STI/issues/STI-328) — GTM readiness package
- [STI-492](/STI/issues/STI-492) — apex password gate, the live operator ask (revenue blocker)
- [STI-519](/STI/issues/STI-519) — GM operator ask on the same gate
- [STI-457](/STI/issues/STI-457) — locked Online Store channel (a reporting blocker)
- [STI-418](/STI/issues/STI-418) — operator ask: Shopify Admin read + landed cost per SKU (a reporting blocker)
- [STI-419](/STI/issues/STI-419) — analytics tag, required before the first real session
