# Declarative STITCH AND ASH business stack

This repo is the bot-editable source of truth for the customer-facing storefront
and the Shopify business objects that are safe to reconcile automatically.

## Current declarative surface

- `catalog/products/*.yaml` — product placeholders, handles, copy, prices, SKUs,
  options, product status, and Shopify identity metafields.
- `catalog/shipping/*.yaml` — bot contract for processing windows, shipping rules,
  supported tracking carriers, and fulfillment/tracking policy.
- `nix run .#catalog-validate` — schema and invariant validation.
- `nix run .#catalog-plan` — mint a short-lived Shopify Admin API token from SOPS
  and diff declared products against Shopify.
- `nix run .#catalog-apply` — apply safe product-level changes and identity
  metafields to Shopify.
- `nix run .#build-pages` — build the preview storefront through the Nix toolchain.

## Bot contract

Bots may open PRs that edit product copy, draft placeholders, tags, and shipping
policy text. The required validation gate is:

```sh
nix run .#catalog-validate
nix run .#catalog-plan
nix run .#build-pages
```

High-risk changes require human approval before merge/apply:

- Product status `DRAFT -> ACTIVE`
- Price changes
- Variant/SKU deletion
- Shipping price changes
- Fulfillment/tracking policy changes
- Any future destructive tombstone

## Shopify tracking model

Tracking is not product state. It belongs to order fulfillment. Declarative
shipping policy in this repo defines the allowed carriers, whether tracking is
required, and whether customers are notified. The next reconciler layer should
add order/fulfillment commands that:

1. Find an order by Shopify order ID/name.
2. Validate carrier and tracking URL against `catalog/shipping/*.yaml`.
3. Call Shopify Admin GraphQL fulfillment mutations.
4. Write a status/audit result without committing customer PII to Git.

Do not commit customer addresses, order names, tracking numbers, emails, or
fulfillment identifiers to catalog YAML. Those are runtime operations, not source
configuration.
