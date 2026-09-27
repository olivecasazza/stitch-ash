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

```
$ git show f3ac83d -- nuxt.config.ts | grep -E '^[+-].*mock'
-                    mock: true,
+                    mock: false,
```

`mock: true` was removed in `f3ac83d` and replaced with `mock: false` alongside
the `SHOPIFY_STOREFRONT_TOKEN` wiring. The instruction text was written roughly
40 days later and simply carried the old value forward.

A stale written rule is more dangerous than no rule, because it invites
"correction." An agent that reads `mock = false`, concludes the documented rule
is wrong, and restores `mock: true` to match it would **break the live
Storefront API data path** — including the cart and `checkoutUrl` that the
[STI-327](/STI/issues/STI-327) audit reported working against production.

Three further facts are easy to conflate and must be kept separate:

1. **Which page you fetched decides what the evidence proves.** The listing and
   the product detail page do not share a data source.
   - `app/pages/products.vue` imports the static `PRODUCTS` array from
     `app/data/products.ts` and makes **no** Storefront call. `/products` is a
     fixture render.
   - `app/pages/product/[handle].vue` issues a live `useStorefrontData` query and
     **falls back to the same static array** on failure
     (`data.value?.product?.title ?? staticProduct.value?.name`). So a `200` on a
     PDP does not by itself prove the live path answered.
2. **On the deployed preview, the PDP live path does answer.** Decoding the
   `__NUXT_DATA__` payload on each PDP returns real Shopify ids and real prices,
   not the static fallback:

   | Handle | Shopify product GID | Variants | Live price | `availableForSale` |
   |---|---|---|---|---|
   | `sku-001` | `Product/15107230335021` | S, M, L, XL, XXL | `185.0 USD` | `true` |
   | `sku-002` | `Product/15107230269485` | Default Title | `35.0 USD` | `true` |
   | `sku-003` | `Product/15107230302253` | Default Title | `15.0 USD` | `true` |

   The three live prices match the merch price list (185 / 35 / 15), so the
   Shopify catalog is currently in sync with the intended pricing. The handles
   `sku-001..003` are still *local* placeholder handles in
   `app/data/products.ts` ("must match Shopify product handle when live") that
   happen to resolve against real Shopify products, and `imageSrc` is still
   `undefined` behind `TODO (STI-318)` — so the listing page has no product
   photography regardless of the live path.
3. **No customer can reach a checkout.** The production apex
   `https://www.stitch-ash.com` still redirects to `/password`
   (HTTP 200, final URL `.../password`, body "Enter password" / "Protected").

So "not mock", "serves live product data" and "has revenue" are three different
claims. The catalog and cart are live, the listing page is a fixture, and it
earns nothing because the apex is walled. Reporting that distinction wrongly in
**any** of the three directions is the failure this record prevents.

The live `SHOPIFY_*` values live in nixlab IaC and are operator-owned. No
secret value is reproduced in this record. One thing a reader should know rather
than discover: the deployed page ships the **public** Storefront access token in
`__NUXT__.config.public` (public by design for a Storefront API — it is
browser-readable on any Shopify storefront), and it was incidentally visible
while fetching the PDP for the evidence above. It was not copied here, and no
Admin or private credential was read, requested, or accessed.

One narrow credential fact *is* established, indirectly: a live Storefront query
returned real product and variant ids, so the deployed public Storefront token
works for public storefront reads. That is **not** evidence about the Admin API,
checkout completion, order reads, or any other `SHOPIFY_*` credential, all of
which stay **unverified** by this role.

## Decision

**Reporting provenance is asserted per layer, and the storefront commerce client
is `mock: false` (live). Zero revenue is currently reportable, and the reason is
the apex gate — not mock commerce.**

Agents must state which layer they are reporting on, and must never infer
"revenue exists" from "the API is live", "serves live product data" from
"the page returned 200", or "the API is mock" from "no revenue exists." The
verified baseline as of 2026-09-27:

| Layer | State | How verified |
|---|---|---|
| Storefront client config | `mock: false` — live API **client configured** | `nuxt.config.ts:32` on `main` (`f3ac83d`); also `mock:false` in deployed `__NUXT__.config.public._shopify` |
| Catalog listing `/products` | **Static in-repo catalog**, not a live read | `app/pages/products.vue` imports `PRODUCTS`, no Storefront call; listing HTML has no `gid://shopify` |
| PDP `/product/<handle>` | **Live on deployed preview** — real product + variant GIDs, real prices; static fallback exists but is not exercised | `__NUXT_DATA__` payload per handle (see table above) |
| Live catalog price sync | **In sync** — 185 / 35 / 15 USD match the merch price list; all variants `availableForSale: true` | same payload; hoodie has 5 sized variants, lanyard + sticker one variant each |
| Cart / `checkoutUrl` | Unconditional live Storefront API read | `app/composables/cart.ts:33,80` `useStorefront()` |
| Public Storefront token | **Works** for public reads, established indirectly | live query returned real ids; token value never read or reproduced |
| Admin API / order data | **Unverified** — operator-owned | out of scope for this role; no `SHOPIFY_*` value read |
| Product photography | **Absent** — `imageSrc: undefined` behind `TODO (STI-318)` | `app/data/products.ts`; no Shopify CDN URLs in listing HTML |
| Customer-reachable checkout | **No** — apex password-walled | `curl -L https://www.stitch-ash.com` → final `/password` |
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
- A `200` from a storefront URL proves the page rendered. It does **not** prove
  which source answered, because the listing is a fixture and the PDP falls back
  to a fixture. Any claim about live-served data must cite a live-specific
  marker — a `gid://shopify` id decoded from `__NUXT_DATA__`, an
  operator-confirmed credential, or a storefront response log.
- A `gid://shopify` id in a payload proves the public Storefront read worked. It
  does **not** prove the Admin API, checkout completion, or order reporting
  works. Those stay unverified until an operator confirms them.
- The merch price list is currently mirrored exactly in Shopify
  (185 / 35 / 15 USD). Any price or margin change must be made in **both**
  `app/data/products.ts` and Shopify, or the listing and the PDP will disagree.

## Alternatives considered

- **Leave the instruction as written and do nothing.** Rejected: the parenthetical
  is factually wrong and its failure mode is a destructive prod edit, so silence
  is not neutral — it is an unmanaged risk sitting in the instructions.
- **Self-edit the agent instruction to match the repo.** Rejected: an agent
  weakening the honesty gate it was handed, without a human in the loop, is the
  same class of self-serving edit the gate exists to prevent. The correction is
  routed to the operator for authorization instead.
- **Assert "real commerce is live, so revenue data exists."** Rejected: the
  catalog and cart reads are live, but no customer reaches checkout while the
  apex is walled, and the Admin/order side stays unverified. "The client is
  live" never implied "there is revenue" — the two are independent. This is the
  optimistic error the provenance rule exists to prevent, reached from the
  opposite direction.
- **Assert "the storefront is live, so the whole storefront is live."** Rejected
  as imprecise: the listing page is a fixture and the PDP has a fixture fallback,
  so "live" is a per-page property. This was the error in the first draft of this
  record, which generalised a `/products` `200` into a live-data claim before
  being corrected — recorded here because a baseline doc that quietly hid its
  own error is worth less than one that names it.
- **Assert "mock is true, therefore no data path exists."** Rejected as
  outdated — the flip landed in `f3ac83d` on 2026-08-18. This is the current
  stale claim, and it misdescribes the deployed system.
- **Treat the stale `mock = true` parenthetical as a live-commerce signal and
  flip `mock` to satisfy it.** Rejected outright. `mock: false` is the current,
  intended state; the document is what is wrong, not the config.

## Consequences

- KPI reporting cites this record instead of an instruction parenthetical.
- The optimism risk and the pessimism risk are both named, so a future agent is
  unlikely to "fix" the storefront in either direction.
- If the apex gate is lifted, revenue reporting still requires a confirmed
  Shopify Admin export path and a confirmed Admin credential; neither is
  established here. Lifting the gate makes checkout *reachable*, which is a
  precondition for revenue, not evidence of it.
- The credential check remains operator-owned by design. The only credential
  fact established here is that the deployed **public** Storefront token serves
  public reads; its value is not reproduced in this record, and no Admin or
  private credential was read, requested, or accessed.
- Price and copy edits must be made in **both** `app/data/products.ts` and
  Shopify. The listing renders the file, the PDP renders Shopify; a change to
  only one produces a visible disagreement between the two pages.
- Product photography is still absent (`imageSrc: undefined`). That is a
  merchandising gap owned by commerce, not by this record.
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
