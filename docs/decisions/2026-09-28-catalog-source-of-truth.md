# Catalog source of truth: one owner for product status and inventory policy

- **Date:** 2026-09-28, amended 2026-09-29 (STI-557)
- **Status:** Proposed — needs operator ratification (STI-538, STI-531)
- **Author:** commerce-eng (`7fe07aa9`)
- **Supersedes:** nothing. Narrows `2026-07-21-shopify-as-system-of-record.md` to
  the two fields that are currently declared twice.

## The conflict, read from both files this run

Product status **and inventory policy** are declared in two repos, and they
disagree on both fields.

| handle | `catalog/products/*.yaml` (this repo) | `nix/tofu/shopify/terranix.nix` (nixlab) |
|---|---|---|
| `sku-001` | `status: ACTIVE`, `inventoryPolicy: CONTINUE` | `status = "draft"`, `inventory_policy = "deny"` |
| `sku-002` | `status: ACTIVE`, `inventoryPolicy: CONTINUE` | `status = "draft"`, `inventory_policy = "deny"` |
| `sku-003` | `status: ACTIVE`, `inventoryPolicy: CONTINUE` | `status = "draft"`, `inventory_policy = "deny"` |

Live store, Admin GraphQL, read-only probe, 2026-09-29:

```
sku-001 | status=ACTIVE | totalInventory=-1  | 5 variants, policy=CONTINUE
sku-002 | status=ACTIVE | totalInventory=0   | 1 variant,  policy=CONTINUE
sku-003 | status=ACTIVE | totalInventory=0   | 1 variant,  policy=CONTINUE
```

All three are **live and ACTIVE** right now, on `CONTINUE`. The catalog matches
the store. The nixlab terranix file disagrees with both.

## Why this is a live hazard, not a documentation nit

`nix/tofu/shopify/terranix.nix` sets `update_method = "PUT"` on each
`restapi_object` product. A tofu apply is therefore not a no-op on a populated
store: it PUTs `status: "draft"` over three ACTIVE products and de-lists all of
them in a single run.

That is **STI-531**, and it is the same hazard **STI-269** was cancelled for
attempting by a different route — a `catalog:apply` diff that flipped
`ACTIVE -> DRAFT`. Two independent paths to the same customer-visible outage.
`lifecycle.prevent_destroy = true` does not help here: preventing destroy does
nothing about a PUT that overwrites status.

The failure is also silent in the way that matters. An operator opening
`terranix.nix` reads `status = "draft"` and sees a correct-looking declaration,
because that *is* what the file says. Nothing in either repo points at the other.
The conflict is only visible when both files are read side by side, which is
precisely what a doc comment discourages anyone from doing.

## The two fields fail differently, and the second one is the quieter hazard

STI-557 measured both. They are not the same risk, and only one of them is
obvious.

**`status`** fails loudly. A flipped status is visible immediately: the product
leaves the storefront, the collection loses a member, the URL 404s. Someone
notices within minutes.

**`inventory_policy` fails silently.** A flip from `CONTINUE` to `DENY` leaves
the product listed, named, priced, and reachable — it only refuses to sell once
inventory is at or below zero. On this store that is *every* variant:

```
sku-001-S  qty= 0  policy=CONTINUE  -> sellable
sku-001-M  qty= 0  policy=CONTINUE  -> sellable
sku-001-L  qty=-1  policy=CONTINUE  -> sellable
sku-001-XL qty= 0  policy=CONTINUE  -> sellable
sku-001-XXL qty= 0  policy=CONTINUE  -> sellable
sku-002    qty= 0  policy=CONTINUE  -> sellable
sku-003    qty= 0  policy=CONTINUE  -> sellable

7 of 7 currently-sellable variants sit at or below zero inventory.
A DENY flip blocks checkout on 100% of purchasable stock.
```

That is the worse outcome, because the storefront looks correct. A customer
reaches a product page, picks a size, and is refused at checkout — with no
visible reason. A de-listing at least looks like a de-listing.

## The gate had a false green, and the operator's obvious fix caused it

The gate from PR #106 compared `status` only. The obvious operator response to
it is to make the two files agree by editing the terranix status:

```
status = "draft"   ->   status = "active"
```

Run against that fixture, the shipped gate reported `agree` on all three
handles and **exited 0** — while `inventory_policy = "deny"` stood untouched in
the same product blocks. The gate went green on a state worse than the one it
was written to catch, because the operator had done the one thing the gate
rewarded.

A gate that only fails on disagreement is a gate that passes on the cheapest
available edit.

Two changes, both in `scripts/ci/catalog-status-ownership-gate.sh`:

1. `inventory_policy` is compared alongside `status`, aggregated across each
   product's variants on both sides. A field declared on one side and absent on
   the other counts as a conflict, because "tofu will not PUT this field" and
   "tofu will PUT `deny`" are different deploy behaviours.
2. A terranix file that parses to zero comparable rows now **exits 1**. It used
   to print `nothing to compare` and exit 0. A file that yields no rows is not a
   file that agrees with this one, and a syntax change in a sibling repo must not
   be able to turn a cross-repo gate green.

`scripts/ci/catalog-status-ownership-gate.test.sh` pins all of it, including the
exact status-only-edit fixture, and both run in CI. 8 tests, no Node, no
secrets.

## The decision

**`catalog/products/*.yaml` in this repo is the single owner of product status
and of product inventory policy.**

`nix run .#deploy-shopify` must not manage either field. The terranix
declarations should drop `status` and `inventory_policy` rather than be kept as
a second, stale source.

Why this repo wins:

1. **It matches the live store.** The store is the ground truth for what a
   customer can buy, and the catalog agrees with it today on both fields.
2. **It is where the reviewable diff lives.** `catalog:plan` produces a
   human-readable per-product diff and `catalog:apply` is gated behind operator
   approval of that exact diff. The terranix path has neither — a tofu apply is
   a raw PUT with no plan step.
3. **It is under the gates.** `catalog:test` and `catalog:validate` run on every
   PR. A terranix product status is checked by nothing.

What nixlab keeps: it remains the owner of infrastructure — domains, DNS
verification, webhook path, and the `SHOPIFY_*` secret material in SOPS. Those
are not duplicated here and are not in conflict. This ADR scopes to product
status and product inventory policy only.

## What is being changed, and what is not

- **Changed here:** this ADR, the widened gate, and the new gate test suite.
- **NOT changed:** the nixlab terranix file. Editing another repo's IaC is not
  commerce-eng's to do unilaterally, and the edit is destructive-adjacent
  (it changes what a deploy does to a live store). It is the operator's call.
- **NOT done:** no `catalog:apply` was run. The live plan is 0 pending product
  actions, so there is no product diff to approve anyway. The one open money
  decision is the international shipping rate, tracked on STI-539/STI-536 and
  deliberately not touched here.

## The gate

`scripts/ci/catalog-status-ownership-gate.sh` compares this repo's declared
statuses **and inventory policies** against the adjacent nixlab terranix
declaration and **fails loudly on disagreement**. It is the mechanical form of
this ADR: the conflict is no longer something a reader has to notice.

Scope, stated honestly:

- It compares **declared text**. It does not call the Shopify Admin API and reads
  no secret. Live state is verified by `catalog:plan` under operator-supplied
  credentials.
- In CI the nixlab tree is not checked out, so the cross-repo comparison reports
  **SKIPPED (not a pass)** and the single-repo invariant is enforced. Running it
  with `NIXLAB_DIR` pointed at a nixlab clone performs the full comparison.
- It is designed to fail on today's real tree. If it passes in your checkout,
  you are not pointed at a nixlab clone — check the `NOT REACHABLE` line.

Against the real clone (`casazza-info/nixlab` @ `a9364483`), 2026-09-29:

```
CONFLICT on sku-001 (product_hoodie):
    status           catalog=ACTIVE  terranix=draft
    inventory_policy catalog=CONTINUE  terranix=deny
... same for sku-002, sku-003
FAIL: 3 product(s) are declared with conflicting status and/or inventory_policy in two repos.
exit 1
```

## Operator decisions this ADR asks for

1. **Ratify this owner** — `catalog/products/*.yaml` owns product status *and*
   inventory policy, and the nixlab terranix product resources stop declaring
   both.
2. **STI-531** — confirm the terranix `status`/`inventory_policy` fields are
   removed from `nix/tofu/shopify/terranix.nix` so `deploy-shopify` can no
   longer de-list live merchandise or block checkout on it.
3. **STI-539 / STI-536** — the international rate direction ($0.00 live vs
   $25.00 declared). Still unowned, still a customer-facing money decision.
   This ADR does not touch it.

Do **not** resolve the status conflict by editing the terranix `status` alone.
That is the edit the previous gate rewarded, and it leaves `inventory_policy =
"deny"` in place — see the false green above. Remove both fields, or neither.
