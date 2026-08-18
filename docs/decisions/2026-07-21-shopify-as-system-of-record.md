# 2026-07-21 — Shopify as system of record

Status: Accepted.

## Context

STITCH AND ASH is a single-brand goth/metal embroidered-apparel company. The storefront must ship fast, look right, and let a real customer buy something today. Early in the build the AI-assisted /ops-platform page exposed an internal comparison of commerce backends (Shopify vs. Medusa vs. Saleor vs. WooCommerce vs. Square) directly to customers. The reasoning was a legitimate business decision; the mistake was putting it on a customer surface.

This document records the decision so future operators and bots can find it without rediscovering it in a leak. The /ops-platform page itself has been removed (see [STI-230](/STI/issues/STI-230)).

## Decision

**STITCH AND ASH uses Shopify as the system of record for products, inventory, checkout, orders, shipping, tax, refunds, discounts, fulfillment, and customer accounts.** The Stitch and Ash Nuxt site is the brand front-end only. Buy Buttons or Storefront API may be embedded where the brand experience needs it, but no admin / sales / orders / shipping / inventory dashboard is built on this codebase.

In practice:

- Shopify owns the product, variant, inventory, and order models. The repo's `catalog/products/*.yaml` is a declarative mirror that the reconciler pushes through Shopify Admin; Shopify is the live authority.
- Checkout happens on Shopify. The Nuxt storefront hands the cart over to Shopify-hosted checkout via the Storefront API or Buy Button — it does not run its own checkout.
- Fulfillment, tracking, refunds, and tax live in Shopify Admin (or Shopify-compiled apps). Bots may script against the Admin API, but the source of truth for orders is Shopify.
- Customer accounts are Shopify accounts. The Nuxt site links to Shopify's account surface; it does not maintain its own auth.
- The Nuxt repo contains the brand front-end, marketing pages, copy, and the bot-safe reconciler. It does not contain an internal admin UI.

## Alternatives considered

- **Medusa.** Open-source Node commerce with strong customization and a headless API. Rejected for now: self-hosted, requires running Postgres + Redis + a worker in production, and the team is two direct-reports deep. Operational burden is too high for a brand front-end shop that ships once.
- **Saleor.** GraphQL-first Python commerce. Rejected for now: same operational-burden argument as Medusa, plus a smaller community of pre-built apps/payment/shipping integrations than Shopify. Worth revisiting only if Shopify pricing or platform lock-in becomes a structural problem.
- **WooCommerce.** WordPress plugin commerce. Rejected: WordPress is a second CMS to keep alive, the plugin update treadmill is high, and the brand front-end still has to live somewhere else anyway — there is no integration upside over Shopify for a single-Python-or-JS-shop with two direct reports.
- **Square.** Solid for in-person + simple online, but Square Online's storefront theming is rigid and the brand front-end would still live elsewhere. Rejected for the same reason as WooCommerce with a weaker custom-checkout story.

## Consequences

Positive:

- One platform owns checkout, payments, taxes, fraud, shipping labels, and basic customer accounts out of the box. The two direct reports can focus on brand + catalog, not infrastructure.
- Shopify Admin + Storefront API + Admin GraphQL are sufficient for everything in the product brief; no parallel admin UI needs to exist in this repo.
- The reconciler in `catalog/products/*.yaml` + `scripts/catalog.ts` has a single authoritative backend to diff against.

Negative / accepted costs:

- We pay Shopify subscription + transaction fees. Acceptable at the order volume the company plans to support in year one.
- Brand customisation at checkout is constrained to what Shopify exposes. Any "this looks like Stitch and Ash at the payment step" work has to use Shopify's checkout extensibility (Shopify Functions, Checkout UI Extensions, Shop Pay branding), not the Nuxt repo.
- Switching cost is real. If we ever leave Shopify, we have to rebuild the reconciler against the new admin API and the new customer-account model. This is the price of every "use the platform" decision.

Operational rules that follow from this decision:

- No customer-visible route in `app/pages` may describe the choice of commerce backend to shoppers. Internal reasoning lives here or in comments, never on the storefront.
- Bot-driven Shopify writes must go through the catalog reconciler (`pnpm catalog:validate`, `pnpm catalog:plan`, `pnpm catalog:apply`); they must not bypass it with raw Admin API calls from a one-off script.
- Customer PII (addresses, order names, tracking numbers, emails) never lands in catalog YAML. See [docs/declarative-business.md](declarative-business.md) for the bot contract.
- Test purchases and admin-UI handoffs use Shopify's Bogus Gateway + the Portland location's `CONTINUE` inventory override documented in [docs/test-purchase-handoff.md](test-purchase-handoff.md).

## Related

- [STI-230 — Remove /ops-platform page and "Ops" nav link from storefront](/STI/issues/STI-230) (done)
- [STI-226 — Replace storefront page shell with dark theme and centered layout](/STI/issues/STI-226) (done)
- [STI-232 — Adopt full development cycles for all storefront changes](/STI/issues/STI-232) (in review)
- [docs/declarative-business.md](declarative-business.md)
- [docs/test-purchase-handoff.md](test-purchase-handoff.md)
