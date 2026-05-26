---
name: shopify-bot-ops
description: Use when editing Shopify catalog, shipping, tracking, or storefront operations in this repository. Enforces Git-owned YAML, plan-before-apply, secret hygiene, MCP setup, and human gates for high-risk commerce changes.
version: 1.0.0
author: Hermes Agent
license: MIT
metadata:
  hermes:
    tags: [shopify, ecommerce, bots, catalog, gitops, stitch-ash]
    related_skills: [shopify-declarative-management, hermes-agent]
---

# Shopify Bot Operations for STITCH AND ASH

## Overview

This repository is the bot-editable source of truth for safe Shopify operations:

- Catalog products live in `catalog/products/*.yaml`.
- Shipping and fulfillment policy lives in `catalog/shipping/*.yaml`.
- The storefront is code-owned and deployed through Cloudflare Pages.
- Shopify Admin writes happen only through explicit plan/apply commands.

Bots should make structured PRs against Git, not click around in Shopify Admin as the source of truth.

## Required Safety Model

1. Validate before any remote read/write:
   - `pnpm catalog:validate`
   - or `nix run .#catalog-validate`
2. Plan before applying:
   - `pnpm catalog:plan` for local env credentials
   - or `nix run .#catalog-plan` to mint a short-lived token from SOPS client credentials
3. Only apply after the plan is understood:
   - `nix run .#catalog-apply`
4. Never commit secrets, order PII, tracking numbers, customer emails, fulfillment IDs, or Admin API tokens.
5. Treat `DRAFT -> ACTIVE`, price changes, SKU/variant removal, shipping price changes, and fulfillment policy changes as human-gated.

## Commands

Repository readiness and bootstrap:

```sh
pnpm shopify:doctor
pnpm shopify:scopes
pnpm shopify:env
pnpm shopify:mcp
```

Catalog operations:

```sh
pnpm catalog:validate
pnpm catalog:plan
pnpm catalog:apply
```

Nix wrapped operations:

```sh
nix run .#shopify-doctor
nix run .#catalog-validate
nix run .#catalog-plan
nix run .#catalog-apply
nix run .#tracking-plan -- -- --order='#1001' --carrier=USPS --tracking-number=REDACTED
```

Storefront checks:

```sh
pnpm typecheck
pnpm build
```

## Environment

Local bot sessions may use a non-committed env file. Generate the template:

```sh
pnpm shopify:env > .env.shopify.local
```

Required variables for direct local API calls:

- `SHOPIFY_ADMIN_STORE_DOMAIN=stitch-and-ash.myshopify.com`
- `SHOPIFY_ADMIN_ACCESS_TOKEN` for static local use, or:
- `SHOPIFY_CLIENT_ID` + `SHOPIFY_CLIENT_SECRET` for OAuth client credentials wrappers
- `SHOPIFY_STOREFRONT_ACCESS_TOKEN` for storefront reads

Do not use `atkn_` Shopify CLI automation tokens for Admin API calls. They are not Admin API tokens.

## Hermes MCP Setup

Print the exact local command:

```sh
pnpm shopify:mcp
```

Then run the printed `hermes mcp add shopify ...` command. Prefer OAuth client credentials from the Shopify Dev Dashboard custom app. After adding the MCP server, restart Hermes or run `/reload-mcp` in an interactive session.

## Product YAML Rules

Each product must have:

- Stable `id` like `stitch-ash.sku-001`.
- Lowercase kebab-case `handle`.
- `status` as `DRAFT`, `ACTIVE`, or `ARCHIVED`.
- Unique SKUs across the repo.
- Options and variants that match exactly.
- Price strings like `185.00`.

The reconciler writes Shopify identity as metafield `stitch_ash.catalog_id` and refuses to apply if the remote product has a different catalog id.

## Common Pitfalls

1. Running `catalog:apply` without a reviewed plan. Always plan first.
2. Putting Shopify Admin tokens in commits or chat. Report only prefix/length when debugging.
3. Using the stale Cloudflare Pages project name. The active Pages project is `stitch-ash-web`.
4. Treating tracking as Git state. Tracking is runtime order fulfillment and must not be committed.
5. Using Shopify Admin as source of truth for bot-edited products. If Admin differs, update YAML or reconcile intentionally.

## Verification Checklist

- [ ] `pnpm shopify:doctor` passes for repo structure.
- [ ] `pnpm catalog:validate` passes.
- [ ] For Shopify-connected work, `pnpm catalog:plan` or `nix run .#catalog-plan` completed without token-class errors.
- [ ] For storefront work, `pnpm typecheck` and `pnpm build` pass.
- [ ] No secrets, PII, tracking numbers, or order IDs were committed.
- [ ] High-risk commerce changes were explicitly called out for human review.
