# Hydrogen migration plan

The current deployed preview stack is complete for declarative Shopify business
operations, but the storefront is still Astro. This plan captures the next
migration to Shopify Hydrogen/React Router while preserving the declarative
catalog and Nix-native bot operations already shipped.

## Target stack

- Hydrogen (`@shopify/hydrogen`) + React Router 7
- Tailwind v4
- Shopify Storefront API for product/cart/customer-facing reads
- Existing `catalog/*.yaml` + Nix flake apps for declarative Admin-side writes
- Cloudflare Pages/Workers or Oxygen-compatible runtime, chosen after a build
  spike against Cloudflare Pages compatibility

## Preserve from the current site

- Product handles: `sku-001`, `sku-002`, `sku-003`
- Visual direction: black, sharp, gothic/metal editorial storefront
- Product copy and PDP details from existing Astro pages/data
- Waitlist behavior until real checkout/orders are enabled
- Nix flake apps:
  - `catalog-validate`
  - `catalog-plan`
  - `catalog-apply`
  - `tracking-plan`
  - `tracking-apply`
  - `build-pages` or successor `build-storefront`

## Migration steps

1. Create `hydrogen/` as a parallel app from the Shopify Hydrogen template.
2. Port the homepage, product cards, PDP, cart, and waitlist UI into React routes.
3. Wire Hydrogen Storefront client to `stitch-and-ash.myshopify.com` using
   `SHOPIFY_STOREFRONT_ACCESS_TOKEN`.
4. Replace static fallback product data with Storefront API queries backed by the
   already-declarative Shopify catalog.
5. Add a Nix app `build-hydrogen` that runs dependency install and the Hydrogen build.
6. Update Cloudflare Pages deployment to build the Hydrogen app if Cloudflare
   Pages compatibility is clean; otherwise use Oxygen/GitHub integration and keep
   `preview.stitch-ash.com` pointed at the Hydrogen deployment.
7. Only after successful live verification, remove the Astro app.

## Acceptance criteria

- `nix run .#catalog-validate` passes.
- `nix run .#catalog-plan` returns no drift against Shopify products.
- `nix run .#tracking-plan -- -- --order=<test> ...` validates policy and queries
  Shopify order/fulfillment state without leaking secrets.
- Hydrogen build succeeds through Nix.
- Preview URL returns HTTP 200 and renders the Hydrogen storefront.
- Product pages load from Shopify Storefront API, not local static product data.

## Important constraints

- Do not remove the current Astro deployment until the Hydrogen preview is live
  and verified. Keeping both during migration avoids downtime.
- Do not put customer/order/tracking PII in Git. Tracking updates remain runtime
  operations driven by the Nix CLI.
- Keep Shopify Admin mutations behind SOPS-backed client-credentials token minting.
