# Catalog source-of-truth conflict: repo YAML vs nixlab tofu

Status: **Open — awaiting an operator decision.** No `catalog:apply` should be run
until the operator picks one owner. This document exists to make that decision a
one-liner, not to pre-empt it.

Owner of the decision: **operator** (board). Proposed by commerce-eng.

## Summary

Two files declare the same three products with *conflicting* publish and
inventory intent:

| Source | `status` | `inventory_policy` | Scope |
|---|---|---|---|
| `catalog/products/*.yaml` (this repo) | `ACTIVE` | `CONTINUE` | `sku-001`, `sku-002`, `sku-003` |
| `nixlab/nix/tofu/shopify/terranix.nix` | `draft` | `deny` | `product_hoodie`, `product_lanyard`, `product_sticker` |

Everything else (title, handle, body copy, product type, option names, SKUs,
prices) agrees. The conflict is confined to **two fields per product**, and it is
therefore cheap to resolve — but it is *not* cosmetic, because those two fields
control whether a customer can buy anything at all.

## Which one actually won (measured, this run)

**The repo YAML is what the live store currently reflects.** Read-only probe
against `stitch-and-ash.myshopify.com` on 2026-09-28:

```
{"handle":"sku-001","yaml_status":"ACTIVE","yaml_inventoryPolicy":"CONTINUE","remote_status":"ACTIVE","remote_inventoryPolicy":"CONTINUE","remote_optionNames":["Size"],"variant_count_remote":5}
{"handle":"sku-002","yaml_status":"ACTIVE","yaml_inventoryPolicy":"CONTINUE","remote_status":"ACTIVE","remote_inventoryPolicy":"CONTINUE","remote_optionNames":["Title"],"variant_count_remote":1}
{"handle":"sku-003","yaml_status":"ACTIVE","yaml_inventoryPolicy":"CONTINUE","remote_status":"ACTIVE","remote_inventoryPolicy":"CONTINUE","remote_optionNames":["Title"],"variant_count_remote":1}
```

Live `status` and live `inventoryPolicy` match `catalog/products/*.yaml` on all
three products, and diverge from tofu on all three. Equivalently: `pnpm
catalog:plan` reports **0 pending product actions**, which is only possible if the
live store already agrees with the repo YAML.

So the store is *de facto* the repo's reading. nixlab is stale, not competing.

## Why nixlab disagrees — it is not a random drift

Two independent reasons, both deliberate, both pointing the same way:

1. **The repo deliberately overrode the live store to enable test purchases.**
   `docs/test-purchase-handoff.md` line 13 records that `inventoryPolicy` was set
   to `CONTINUE` specifically to bypass the `0` stock limit at the Portland
   location so a purchase could complete immediately, and that Shopify records the
   result as inventory `-1`. Tofu still carries the pre-override `deny`.
2. **Tofu's own comment states its intent.**
   `terranix.nix` line 81: *"All products created as drafts. Publish via Shopify
   Admin when ready."* Tofu models a **bootstrap** state, not a steady state. It
   is scaffolding that was never unwound.

Tofu also cannot currently be a real second owner, on its own terms. Its own
header comments flag two unresolved defects — a broken REST path
(`path = "/products.json"` composes to `/products.json/12345`, which Shopify's
REST API rejects; the webhook resource has the same latent bug) and the
`prevent_destroy` / `tofu import` escape hatch needed to adopt products that were
created by hand. A reconciler that cannot read a product back and that must be
hand-imported into state is not in a position to own the catalog.

## Existing decision record already points at an owner

`docs/decisions/2026-07-21-shopify-as-system-of-record.md` (Accepted) says:

> The repo's `catalog/products/*.yaml` is a declarative mirror that the
> reconciler pushes through Shopify Admin; Shopify is the live authority.

and, as an operational rule:

> Bot-driven Shopify writes must go through the catalog reconciler (`pnpm
> catalog:validate`, `pnpm catalog:plan`, `pnpm catalog:apply`); they must not
> bypass it with raw Admin API calls from a one-off script.

By that accepted ADR, `nix/tofu/shopify` is a **second, parallel writer** to the
commerce system of record. That is the real problem to fix — not which of
`ACTIVE`/`draft` is correct.

## Proposal to the operator — one owner, two options

**Option A (recommended): the repo reconciler owns the catalog; nixlab's product
blocks are retired.**

- Set `lifecycle.prevent_destroy = true` (already present) and formally mark
  `product_hoodie` / `product_lanyard` / `product_sticker` as retired in nixlab
  rather than leaving them to drift.
- `nixlab` keeps the parts it legitimately owns: shop/app config and the SOPS
  secret plumbing. It stops declaring products.
- `catalog/products/*.yaml` becomes the single declared source, with Shopify live
  authority behind it, exactly as the accepted ADR already describes.
- Cost: nixlab loses declarative product intent. The upside is that a second
  writer to a live store is removed, and `catalog:plan` becomes trustworthy as
  the single reviewable diff.

**Option B: nixlab tofu owns the catalog; the repo reconciler is deprecated.**

- Move the `ACTIVE`/`CONTINUE` test-purchase override into tofu, delete
  `catalog/products/*.yaml` and `scripts/catalog.ts`, and fix the REST path bug
  plus the import/ownership problem first.
- Cost: this **regresses the documented test-purchase capability** unless the
  override is carried over, and it requires repairing a known-broken IaC path
  before the reconciler can be retired. Higher risk, and it would leave the
  storefront's `catalog:validate`/`plan` tooling pointing at nothing.

## Why nothing was applied

`ACTIVE` + `CONTINUE` is a **live test-purchase capability**: it is the reason a
customer can buy right now with zero tracked stock. Re-applying tofu's
`draft`/`deny` would unpublish all three products and re-block checkout. Per the
rules of engagement, `catalog:apply` runs only after the operator approves an
exact plan diff, and this conflict is exactly the case that rule exists for.

Additionally, `CONTINUE` with stock `-1` is a *test* posture, not a production
posture. Whatever owner is chosen, the eventual move to `ACTIVE` + `DENY` with
real stock levels should be its own reviewed change — not an accident of
reconciling two files.

## Verification performed (2026-09-28, commerce-eng)

- `pnpm catalog:validate` — passes, 3 products loaded.
- `pnpm catalog:plan` — 0 pending product actions against the live store.
- Read-only `getProductByHandle` probe for all three handles — live `status` and
  `inventoryPolicy` captured above. No mutation was issued; the probe used only
  the read path and the temporary script was removed (workspace left clean).
- `nix/tofu/shopify/terranix.nix` read directly for the `draft`/`deny` values and
  the line 81 intent comment.

## Related

- [docs/decisions/2026-07-21-shopify-as-system-of-record.md](decisions/2026-07-21-shopify-as-system-of-record.md)
- [docs/test-purchase-handoff.md](test-purchase-handoff.md)
