# STI-570 run record — readiness/env-name drift, and three stale claims measured

- **Run:** `8c61c86c` · **Date:** 2026-09-29 · **Agent:** commerce-eng (`7fe07aa9`)
- **Branch / PR:** `fix/STI-570-shopify-env-drift` @ `a615c9c` · PR #120
- **Shipped:** a false-red readiness check fixed, plus a drift guard that fails
  if the two env-var lists are ever restated apart again.

This file is the durable copy of a run whose Paperclip write path was unavailable
— `https://paperclip.casazza.io/api/*` returned HTTP 502 on every attempt across
10+ retries. **The issue comment and status update for this run are still
outstanding.** The repo work below is complete and independently verifiable.

## Three claims in the assignment were false at HEAD

Recorded because each one, acted on, causes damage. This is the second occurrence
of the third (see [STI-517](/STI/issues/STI-517) and the `storefront-mock-gate.sh`
that exists to stop it recurring).

| claim | measured |
|---|---|
| "`src/catalog/` does not exist; catalog validate/plan/apply and tracking are ALL non-functional" | All five modules exist. `catalog:validate` exit 0; `catalog:test` 63 pass; `catalog:plan` reaches the live store. |
| "`clients.storefront.mock = true` in Nuxt.config.ts" | `mock: false` at `nuxt.config.ts:37` and on origin/main. Live preview payload reports `mock:false`. |
| "`nix/tofu/shopify/`" inside this repo | That path is in the **nixlab** repo, not stitch-ash. Here the tree is simply absent. |

## The defect that was real

`shopify:doctor` and `buildAdminClient` each declared their own environment
variable list, and the lists had drifted:

| variable | `buildAdminClient` | `doctor` (before) |
|---|---|---|
| `SHOPIFY_ADMIN_STORE_DOMAIN` | yes | yes |
| `SHOPIFY_STOREFRONT_DOMAIN` | yes (fallback) | **no** |
| `SHOPIFY_ADMIN_TOKEN` | yes | **no** |
| `SHOPIFY_CLIENT_ID` | yes | yes |
| `SHOPIFY_CLIENT_SECRET` | yes | yes |

**False red.** The runtime resolves `SHOPIFY_STOREFRONT_DOMAIN` and mints a token
from `SHOPIFY_CLIENT_ID`/`SHOPIFY_CLIENT_SECRET`. The doctor resolved none of
those names, so `shopify:doctor --strict` exited **1** in an environment where
`catalog:plan` had just diffed three products and a collection against Shopify.
A readiness check that blocks a working checkout teaches operators to ignore it —
which is worse than having no check at all.

**Dead guard.** The doctor's `atkn_` automation-token check tested
`SHOPIFY_ADMIN_ACCESS_TOKEN`, which the runtime never reads. The runtime's guard
is on `SHOPIFY_ADMIN_TOKEN`, and that variable held an `atkn_…` value in the very
run that produced the false red. The hazard the doctor exists to catch was
present, correctly named, and reported as healthy.

Both now resolve through `src/catalog/env-readiness.ts`.

## Verification

| check | before | after |
|---|---|---|
| `pnpm shopify:doctor --strict` | **exit 1 (false red)** | exit 0 |
| `pnpm catalog:plan` (live store) | exit 0 | exit 0, 0 pending actions |
| `pnpm tracking:plan` (live store) | exit 0 | exit 0, order #1001 resolved |
| `pnpm catalog:test` | 63 pass | **71 pass / 0 fail** |
| `pnpm typecheck` | exit 0 | exit 0 |
| `pnpm build` | exit 0 | exit 0 |
| `scripts/ci/*.sh` (4 gates) | PASS | PASS |

The drift guard was proven by deliberately breaking it: adding an unmodelled
`process.env` read to `shopify-admin.ts` took the suite from 71 pass to 7 pass /
1 fail, then green again on revert.

## Live evidence, fetched this run

    $ pnpm catalog:plan
    shopify-admin: client ready (source=client_credentials, domain=stitch-and-ash.myshopify.com)
    stitch-ash.sku-001/002/003: no changes
    stitch-ash.collection.featured: no changes
    shipping: remote profile "General profile" (default=true) covering 3 product(s)
    catalog: plan complete; 0 pending product actions

    $ pnpm tracking:plan --order='#1001' --carrier=USPS --tracking=9400...
    order #1001 (gid://shopify/Order/18667225808941): status: ready to apply

    $ curl -s -o /dev/null -w '%{http_code}' https://preview.stitch-ash.com
    200
    # /product/sku-003 payload: gid://shopify/Product/15107230302253,
    #   "Embroidered Sticker", price {"amount":"15.0","currencyCode":"USD"}, availableForSale true

    $ git ls-remote origin refs/heads/fix/STI-570-shopify-env-drift
    a615c9c01d974458a719d9be8099f74eef6a0849	refs/heads/fix/STI-570-shopify-env-drift

## Still open, and not mine to decide

**STI-531** — `nix/tofu/shopify/terranix.nix` (nixlab) still sets `status = "draft"`
with `update_method = "PUT"`. A `nix run .#deploy-shopify` would de-list three live
ACTIVE products. Owner: operator, per step 4 of the 2026-07-28 sign-off.

**STI-539 / STI-536** — `catalog:plan` reports two declared-vs-store shipping
differences, customer-visible money. `catalog:apply` does not write delivery
profiles, so this is reported-only by design. Operator-owned.

**Catalog source of truth** — already ratified 2026-07-28 ([STI-239](/STI/issues/STI-239)):
repo `catalog/products/*.yaml` owns `status` and `inventory_policy`. Not re-opened
here; see [the ADR](/STI/issues/STI-538) and STI-552.

## Not claimed

No deploy was dispatched this run and no live change was made. No `catalog:apply`
(the live plan is 0 pending actions, so it would be a no-op). No secret values
appear in any commit or in this file — the only `atkn_` strings are the synthetic
`atkn_deadbeef` test fixture.
