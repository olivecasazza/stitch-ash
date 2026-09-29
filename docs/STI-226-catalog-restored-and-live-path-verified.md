# STI-226: `src/catalog/` is restored, and the storefront is on the live data path

- **Date:** 2026-09-29
- **Author:** commerce-eng (`7fe07aa9`)
- **Run:** `0a2a0d43-27b-498f-986b-7b2a0b098847`
- **Type:** heartbeat, no assigned issue id (`PAPERCLIP_TASK_ID` unset)

## The brief I was given is stale

My `AGENTS.md` states, as the first engineering deliverable:

> KNOWN-BROKEN AT HEAD: scripts/catalog.ts and scripts/tracking.ts import
> `./src/catalog/*.ts` and `src/` does not exist — catalog validate/plan/apply
> and tracking are ALL non-functional. Restoring or rebuilding
> `src/catalog/` … is your first engineering deliverable.

Both halves of that are false at HEAD, and they are false in the two opposite
directions that matter. Measured this run:

| Claim in AGENTS.md | Measured at HEAD (`f82a731`, branch `fix/STI-570-shopify-env-drift`) |
| --- | --- |
| `src/` does not exist | `src/catalog/` exists, 13 files |
| catalog validate/plan/apply non-functional | all three run; `plan` reaches the live store |
| tracking non-functional | `src/catalog/fulfillment-tracking.ts` present, tested |
| storefront runs `mock = true` | `nuxt.config.ts:37` is `mock: false`, gated in CI |

I am not re-asking anyone to ratify this, and I am not rebuilding working
code. Recording it because the stale sentence is the same class of defect the
repo already has a name for: a confident claim in a document that no one
re-measured. `docs/decisions/2026-09-27-data-provenance-baseline.md` exists
precisely because an unmeasured `mock = true` claim survived for weeks.

## Catalog toolchain: green this run

`pnpm catalog:test` — 71 tests, 71 pass, 0 fail, 8 suites. Suites present at
HEAD: `diffShipping` (STI-507), tracking order lookup (STI-484),
collection membership (STI-471), landed cost, product mark, env readiness
(STI-570), and the shipping name-collision cases (STI-542).

`pnpm catalog:validate`:

```
catalog: loaded 3 products
catalog: loaded 1 collections
catalog: loaded 1 shipping policies
catalog: validation passed
```

`pnpm catalog:plan` — this is the interesting one, because it is a real
read against the live store, not a fixture:

```
shopify-admin: client ready (source=client_credentials, domain=stitch-and-ash.myshopify.com)
stitch-ash.sku-001: no changes
stitch-ash.sku-002: no changes
stitch-ash.sku-003: no changes
stitch-ash.collection.featured: no changes
shipping: remote profile "General profile" (default=true) covering 3 product(s)
catalog: plan complete; 0 pending product actions; 2 shipping difference(s) reported (not applied)
```

Credentials reached the process through the environment (client_credentials).
No secret value is printed above and none is recorded in this document.

## The two shipping differences are open money, not a bug in the tool

`plan` reports, and does not apply:

- `made-to-order-domestic` declares service `Tracked domestic shipping`
  ($0.00, US). Zone `Domestic` offers only `Standard`, `Standard`, `Express`,
  all with `derived/unknown` prices.
- `made-to-order-international` declares `Tracked international shipping`
  ($25.00, `REST_OF_WORLD`). Zone `International` offers `usps` at $0.00 and
  `dhl_express` at $0.00.

`catalog:apply` does not write delivery profiles at all, so this is a declared-
versus-store gap with no automatic path to a fix, and the international rate is
a customer-facing price question. That is STI-539/STI-536 and it is the
operator's decision. Untouched here, deliberately.

## The source-of-truth conflict is decided; what is left is an unexecuted instruction

Repo `catalog/products/*.yaml` says `ACTIVE`/`CONTINUE`. nixlab
`tofu/shopify/terranix.nix` says `status = "draft"`, `inventory_policy = "deny"`.

The owner question is **not open** and I am not re-opening it. The operator
signed off on 2026-07-28 (STI-239, Option A): repo `catalog/` is the single
source of truth. PR #112 retracted my earlier re-ask after that surfaced.

What remains is STI-531, and it is execution, not a decision: `tofu state rm`
the product resources, then a nixlab PR drops `status` and `inventory_policy`
from the terranix file. Until that runs, a tofu apply still PUTs `draft`/`deny`
over three live ACTIVE products. That is another repo's IaC and a
destructive-adjacent edit, so it is the operator's to run. Not mine to improvise.

Enforcement is live in CI: `scripts/ci/catalog-status-ownership-gate.sh` compares
both fields across both repos, and `…-gate.test.sh` pins it (8 tests). One
consequence worth keeping: do not resolve this by editing the terranix `status`
alone. The previous status-only gate passed on that fixture while `deny` stood
untouched — a gate that only fails on disagreement passes on the cheapest edit.

## Live verification: the storefront is on the real Storefront API

Fresh fetch of `https://preview.stitch-ash.com`, 2026-09-29 ~07:35Z.

`GET /` → `HTTP 200`, 21887 bytes, 0.357s.

Routing measured, following redirects:

| URL | Status | Note |
| --- | --- | --- |
| `/products/sku-003/` | 308 → 200 | redirects to `/product/sku-003` |
| `/collection/featured` | 200 | singular route is the real one |
| `/collections/featured` | 404 | **never existed**; this is the STI-511 doc bug |
| `/product/does-not-exist-xyz` | 404 | genuine not-found |

Titles match `catalog/products/*.yaml` exactly: `Embroidered Hoodie`,
`Embroidered Lanyard`, `Embroidered Sticker`.

The part that actually proves the data path. Extracted from the
`__NUXT_DATA__` payload of the live response — not from source, not from a
fixture:

```
sku-001  5 variants  gid://shopify/ProductVariant/66758592790573 …
         title S/M/L/XL/XXL  price {"amount":185.0,"currencyCode":"USD"}
         availableForSale: true
sku-002  1 variant   gid://shopify/ProductVariant/66762204020781
sku-003  1 variant   gid://shopify/ProductVariant/66762204643373
```

Real Shopify GIDs, real money, real availability, five size variants on the
hoodie. Mock data cannot produce those IDs. The storefront serves the live API.

## Two corrections to docs that are costing real time

1. `docs/test-purchase-handoff.md` step 1 says
   `https://preview.stitch-ash.com/products/sku-003/`. That path 308s; the
   real URL is `/product/sku-003`. The flow behind it works — I did not run a
   purchase, because that spends money and the rule is escalate, not improvise —
   but the URL as written sends the next operator through a redirect they do
   not need.
2. `docs/qa-checklist.md` points QA at `/collections/<one>`, which 404s. PR
   #114 is open with the fix. Confirmed independently this run.

Both are the STI-444 false-positive shape: a document confidently naming a
route the app never had, which files a defect against correct behaviour.

## What I did not do, stated plainly

- **No `catalog:apply`.** Not approved, and there is nothing to approve — the
  live plan is 0 pending product actions.
- **No deploy.** PR #120 is open with auto-merge on and all 8 checks green;
  `main` already deployed at `c38a152` via run 36533941248
  (`conclusion: success`). Merging is the operator's or the bot's move, and
  I am not claiming anything is deployed from this run.
- **No secrets.** Credentials were read from the environment only. No
  `SHOPIFY_*` value appears in this document, in a comment, or in any issue.
- **Unverified:** the Paperclip control plane returned `HTTP 502` on
  `paperclip.casazza.io` for every route including `/`, on 5 attempts this
  heartbeat. I stopped retrying per protocol. This run has no issue comment
  and no status change; the durable record is this file.
