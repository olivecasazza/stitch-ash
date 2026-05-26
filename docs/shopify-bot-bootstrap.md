# Shopify bot bootstrap

This repository is set up for bot-safe Shopify work: Git-owned YAML is the source of truth, Shopify Admin writes are explicit plan/apply operations, and secrets stay outside the repo.

## What bots may edit

- `catalog/products/*.yaml` for product copy, handles, tags, draft status, options, and variants.
- `catalog/shipping/*.yaml` for declared shipping and fulfillment policy text.
- Storefront code and documentation.
- `.hermes/skills/shopify-bot-ops/SKILL.md` when the safe operating procedure changes.

Bots must not commit customer PII, Shopify Admin tokens, order names, fulfillment IDs, or tracking numbers.

## Bootstrap checks

```sh
nix develop
pnpm install
pnpm shopify:doctor
pnpm catalog:validate
pnpm typecheck
pnpm build
```

For a Nix-only path:

```sh
nix run .#shopify-doctor
nix run .#catalog-validate
nix run .#build-pages
```

`pnpm shopify:doctor` checks repository structure, Node/pnpm availability, and redacted Shopify env readiness. Use `pnpm shopify:doctor -- --strict` when a task requires live Shopify access.

## Shopify custom app scopes

Print the current scope list:

```sh
pnpm shopify:scopes
```

Required for current repo-owned operations:

- `read_products`
- `write_products`
- `read_orders`
- `write_fulfillments`
- `read_fulfillments`

Optional for future expansion:

- `read_webhooks`
- `write_webhooks`
- `read_redirects`
- `write_redirects`
- `read_inventory`
- `write_inventory`

## Local env template

Generate a non-committed template:

```sh
pnpm shopify:env > .env.shopify.local
```

Expected variables:

```sh
SHOPIFY_ADMIN_STORE_DOMAIN=stitch-and-ash.myshopify.com
SHOPIFY_STORE_DOMAIN=stitch-and-ash.myshopify.com
SHOPIFY_CLIENT_ID=
SHOPIFY_CLIENT_SECRET=
SHOPIFY_ADMIN_ACCESS_TOKEN=
SHOPIFY_STOREFRONT_ACCESS_TOKEN=
```

Prefer `SHOPIFY_CLIENT_ID` + `SHOPIFY_CLIENT_SECRET` for wrappers that mint short-lived Admin API tokens. `SHOPIFY_ADMIN_ACCESS_TOKEN` is acceptable for local one-off testing if it comes from a Shopify store custom app. Never use an `atkn_` Shopify CLI automation token for Admin API calls.

## Hermes MCP setup

Print the command for the current env:

```sh
pnpm shopify:mcp
```

Preferred pattern:

```sh
hermes mcp add shopify --command "npx -y shopify-mcp --clientId \"$SHOPIFY_CLIENT_ID\" --clientSecret \"$SHOPIFY_CLIENT_SECRET\" --domain stitch-and-ash.myshopify.com"
```

Fallback static-token pattern:

```sh
hermes mcp add shopify --command "npx -y shopify-mcp --accessToken \"$SHOPIFY_ADMIN_ACCESS_TOKEN\" --domain stitch-and-ash.myshopify.com"
```

After adding the MCP server, restart Hermes or run `/reload-mcp` in an interactive session.

## Catalog workflow

```sh
pnpm catalog:validate
pnpm catalog:plan
pnpm catalog:apply
```

The Nix wrappers mint a short-lived Admin API token from SOPS credentials in the adjacent nixlab repo:

```sh
nix run .#catalog-plan
nix run .#catalog-apply
```

Set `NIXLAB_DIR` or `SHOPIFY_SECRET_FILE` if your checkout layout differs.

The reconciler uses `stitch_ash.catalog_id` as stable product identity and refuses to apply when a remote product has a mismatched catalog id.

## Fulfillment/tracking workflow

Tracking is runtime state, not Git state. Validate a tracking operation with:

```sh
nix run .#tracking-plan -- -- --order='#1001' --carrier=USPS --tracking-number=REDACTED
```

Only run `tracking-apply` after verifying the plan and ensuring no PII is copied into Git artifacts.

## Human gates

Require explicit human review before merge/apply for:

- Product status `DRAFT -> ACTIVE`.
- Price changes.
- Variant or SKU deletion.
- Shipping price changes.
- Fulfillment/tracking policy changes.
- Any destructive delete/tombstone behavior.

## PR checklist for bots

- [ ] Loaded `.hermes/skills/shopify-bot-ops/SKILL.md` or used the equivalent workflow.
- [ ] Ran `pnpm shopify:doctor`.
- [ ] Ran `pnpm catalog:validate`.
- [ ] Ran `pnpm typecheck` and `pnpm build` for storefront-impacting changes.
- [ ] Ran `pnpm catalog:plan` or `nix run .#catalog-plan` for Shopify-connected changes.
- [ ] Did not commit secrets, PII, tracking numbers, or runtime order identifiers.
- [ ] Called out human-gated commerce changes in the PR body.
