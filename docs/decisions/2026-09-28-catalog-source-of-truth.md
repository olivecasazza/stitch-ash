# Catalog source of truth: one owner for product status

- **Date:** 2026-09-28
- **Status:** Proposed — needs operator ratification (STI-538, STI-531)
- **Author:** commerce-eng (`7fe07aa9`)
- **Supersedes:** nothing. Narrows `2026-07-21-shopify-as-system-of-record.md` to
  the one field that is currently declared twice.

## The conflict, read from both files this run

Product status is declared in two repos, and they disagree.

| handle | `catalog/products/*.yaml` (this repo) | `nix/tofu/shopify/terranix.nix` (nixlab) |
|---|---|---|
| `sku-001` | `status: ACTIVE` | `status = "draft"`, `inventory_policy = "deny"` |
| `sku-002` | `status: ACTIVE` | `status = "draft"`, `inventory_policy = "deny"` |
| `sku-003` | `status: ACTIVE` | `status = "draft"`, `inventory_policy = "deny"` |

Live store, Admin GraphQL, HTTP 200 this run:

```
sku-001 | status=ACTIVE | totalInventory=-1
sku-002 | status=ACTIVE | totalInventory=0
sku-003 | status=ACTIVE | totalInventory=0
```

All three are **live and ACTIVE** right now. The catalog matches the store. The
nixlab terranix file does not.

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

## The decision

**`catalog/products/*.yaml` in this repo is the single owner of product status.**

`nix run .#deploy-shopify` must not manage product status. The terranix
declarations should drop `status` (and the `inventory_policy` values that ship
with them) rather than be kept as a second, stale source.

Why this repo wins:

1. **It matches the live store.** The store is the ground truth for what a
   customer can buy, and the catalog agrees with it today.
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

- **Changed here:** this ADR, and a CI gate that makes the conflict visible
  (`scripts/ci/catalog-status-ownership-gate.sh`).
- **NOT changed:** the nixlab terranix file. Editing another repo's IaC is not
  commerce-eng's to do unilaterally, and the edit is destructive-adjacent
  (it changes what a deploy does to a live store). It is the operator's call.
- **NOT done:** no `catalog:apply` was run. The live plan is 0 pending product
  actions, so there is no product diff to approve anyway. The one open money
  decision is the international shipping rate, tracked on STI-539/STI-536 and
  deliberately not touched here.

## The gate

`scripts/ci/catalog-status-ownership-gate.sh` compares this repo's declared
statuses against the adjacent nixlab terranix declaration and **fails loudly on
disagreement**. It is the mechanical form of this ADR: the conflict is no longer
something a reader has to notice.

Scope, stated honestly:

- It compares **declared text**. It does not call the Shopify Admin API and reads
  no secret. Live state is verified by `catalog:plan` under operator-supplied
  credentials.
- In CI the nixlab tree is not checked out, so the cross-repo comparison reports
  **SKIPPED (not a pass)** and the single-repo invariant is enforced. Running it
  with `NIXLAB_DIR` pointed at a nixlab clone performs the full comparison.
- It is designed to fail on today's real tree. If it passes in your checkout,
  you are not pointed at a nixlab clone — check the `NOT REACHABLE` line.

## Operator decisions this ADR asks for

1. **Ratify this owner** — `catalog/products/*.yaml` owns product status, and
   the nixlab terranix product resources stop declaring it.
2. **STI-531** — confirm the terranix `status`/`inventory_policy` fields are
   removed from `nix/tofu/shopify/terranix.nix` so `deploy-shopify` can no
   longer de-list live merchandise.
3. **STI-539 / STI-536** — the international rate direction ($0.00 live vs
   $25.00 declared). Still unowned, still a customer-facing money decision.
   This ADR does not touch it.
