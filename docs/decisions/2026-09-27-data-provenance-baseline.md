# 2026-09-27 — Data provenance baseline for reporting

Status: Accepted (merged to `main` as `371b629` via
[#39](https://github.com/olivecasazza/stitch-ash/pull/39), 2026-09-27).
Authorizes reporting provenance, not a code change. The companion correction to
the stale `mock = true` parenthetical in the merch-lead agent instructions is
operator-owned and tracked separately in
[STI-398](/STI/issues/STI-398); this record does not self-authorize that edit.

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

Three further facts are easy to conflate and must be kept separate:

1. **The commerce client is live, but most catalog rendering is not.**
   `app/pages/products.vue` imports the static `PRODUCTS` array from
   `app/data/products.ts` — the listing page never calls the Storefront API.
   `app/pages/product/[handle].vue` queries the live API but **falls back to the
   same static array** on failure (`data.value?.product?.title ??
   staticProduct.value?.name`). Only the cart
   (`app/composables/cart.ts` → `useStorefront()`) and
   `app/pages/collection/[handle].vue` are unconditional live reads.
2. **The handles are placeholders, not Shopify ids.** `sku-001`, `sku-002`,
   `sku-003` are local handles defined in `app/data/products.ts`, documented as
   "must match Shopify product handle **when live**", with `imageSrc` still
   `undefined` behind a `TODO (STI-318)`. A `200` from `/products` therefore
   proves the static catalog rendered, **not** that live product data is being
   served. Verified: the preview body contains `185` / `35` and zero
   occurrences of `gid://shopify`.
3. **No customer can reach a checkout.** The production apex
   `https://www.stitch-ash.com` still redirects to `/password`
   (HTTP 200, final URL `.../password`, body "Enter password" / "Protected").

So "not mock", "serves live product data" and "has revenue" are three different
claims. The storefront config points at the live API, most pages still render
in-repo fixtures, and it earns nothing because the apex is walled. Reporting
that distinction wrongly in **any** of the three directions is the failure this
record prevents — including the optimistic direction, which this record
originally made itself before it was corrected on review.

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
"revenue exists" from "the API is live", "serves live product data" from
"the page returned 200", or "the API is mock" from "no revenue exists." The
verified baseline as of 2026-09-27:

| Layer | State | How verified |
|---|---|---|
| Storefront client config | `mock: false` — live API **client configured** | `nuxt.config.ts:32` on `main` (`f3ac83d`) |
| Catalog listing `/products` | **Static in-repo catalog**, not a live-API read | `app/pages/products.vue` imports `PRODUCTS`; no Storefront call in the file |
| PDP `/product/<handle>` | Live query **with static fallback** — a `200` does not prove the live path | `app/pages/product/[handle].vue:22` query, `:70-75` `?? staticProduct…` fallbacks |
| Product handles | **Placeholders**, not Shopify ids | `app/data/products.ts:118+` "must match Shopify product handle when live"; `imageSrc: undefined`, `TODO (STI-318)` |
| Preview `/products` render | `200`, body has `185`/`35`, **zero** `gid://shopify` | `curl -sSL https://preview.stitch-ash.com/products` |
| Cart / `checkoutUrl` | Unconditional live Storefront API read | `app/composables/cart.ts:33,80` `useStorefront()` |
| Live store credential valid | **Unverified** — operator-owned | not readable from the repo; `process.env` wire only, `?? ''` |
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
- A `200` from a storefront URL is evidence the page rendered. It is **not**
  evidence that a live API responded, because the PDP and listing pages fall
  back to in-repo fixtures. Any claim of live-served product data must cite a
  live-specific marker (a `gid://shopify` id, an operator-confirmed credential,
  or a storefront response log) — not an HTTP status.

## Alternatives considered

- **Leave the instruction as written and do nothing.** Rejected: the parenthetical
  is factually wrong and its failure mode is a destructive prod edit, so silence
  is not neutral — it is an unmanaged risk sitting in the instructions.
- **Self-edit the agent instruction to match the repo.** Rejected: an agent
  weakening the honesty gate it was handed, without a human in the loop, is the
  same class of self-serving edit the gate exists to prevent. The correction is
  routed to the operator for authorization instead.
- **Assert "real commerce is live, so revenue data exists."** Rejected: it is
  false twice over. No customer reaches checkout while the apex is walled, and
  the credential is unverified. Separately, most catalog rendering reads
  in-repo fixtures, not the live API, so "the client is live" does not even
  imply "product data comes from Shopify." This is the optimistic error the
  provenance rule exists to prevent, reached from the opposite direction — and
  the first draft of this record made it, which is why the distinction is now a
  table row rather than a sentence.
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
  Shopify Admin export path and a confirmed credential; neither is established
  here.
- The credential check remains operator-owned by design. No secret value was
  read, requested, or referenced in producing this record.
- Prices and handles shown to customers come from `app/data/products.ts`, not
  from Shopify, until the PDP live query succeeds. Price and copy edits
  therefore still have to be made in that file to be visible; a Shopify-side
  change alone will not move the rendered price.
- The static-catalog rows are a finding, not a defect report. Whether the
  catalog should become live-sourced before the apex gate is lifted is a
  commerce decision for the operator, out of scope for this record.
- This record is a reporting baseline, not a commerce change. It edits no
  storefront code and requires no deploy.

## Re-verification log

This record is a snapshot. Re-check it before relying on it; do not treat a row
below as current just because it appears in this file.

| Re-verified | `origin/main` | Result |
|---|---|---|
| 2026-09-27 | `931c178` | **All ten rows above re-verified true, unchanged.** `nuxt.config.ts:32` is still `mock: false,`; `app/pages/products.vue:2,18` still imports and renders the static `PRODUCTS`; `app/pages/product/[handle].vue:22` still runs a `useStorefrontData` query with `:70-75` static fallbacks; `app/data/products.ts:24,116,136` still carries the placeholder-handle comment, the `TODO (STI-318)`, and `imageSrc: undefined`; `app/composables/cart.ts:5` still calls `useStorefront()`. Live: `curl -sSL https://preview.stitch-ash.com/products` → `HTTP 200`, `20907` bytes, `<title>Shop — STITCH AND ASH</title>`, prices `185` and `35` present, `0` occurrences of `gid://shopify`. `curl -sSL https://www.stitch-ash.com` → `HTTP 200`, `103731` bytes, final `https://www.stitch-ash.com/password`. **Observable real revenue is still zero.** |

## Related

- [STI-428](/STI/issues/STI-428) — the record's authoring issue.
- [STI-398](/STI/issues/STI-398) — operator-owned correction of the stale
  `mock = true` parenthetical in the merch-lead agent instructions.
- [STI-327](/STI/issues/STI-327) — production apex password gate; the reason
  revenue is unobservable.
- [STI-319](/STI/issues/STI-319) — the change that set `mock: false`.
- [STI-328](/STI/issues/STI-328) — GTM readiness package; owns the KPI report
  scaffold, which consumes this baseline.
- [2026-07-21 — Shopify as system of record](2026-07-21-shopify-as-system-of-record.md)
  — why live product data comes from Shopify, not from this codebase.
