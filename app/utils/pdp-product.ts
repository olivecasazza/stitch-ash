/**
 * PDP product resolution — the rules that decide what a product detail page is
 * allowed to render, extracted from `app/pages/product/[handle].vue` so they
 * can be tested without a browser.
 *
 * Record: docs/decisions/2026-09-27-data-provenance-baseline.md (STI-541,
 * STI-579). The lineage matters: `/` and `/products` were moved onto the live
 * Storefront API in STI-579, but the PDP was left behind, so the two routes
 * disagreed about where a product comes from.
 */

/**
 * How a product detail page should resolve.
 *
 * - `live`     — Shopify returned the product. The store is the source of truth
 *                and the static array, if it has an entry, is enrichment only.
 * - `preview`  — Shopify did not return it, but a static entry exists. This is
 *                the pre-launch fallback and it must keep working.
 * - `not_found` — neither source has it. Only this may produce a 404.
 */
export type PdpResolution = "live" | "preview" | "not_found";

export interface PdpResolutionInput {
  /** Whether the Storefront API returned a product for this handle. */
  hasShopifyProduct: boolean;
  /** Whether `app/data/products.ts` has an entry for this handle. */
  hasStaticProduct: boolean;
}

/**
 * Decide what a PDP renders, or whether it 404s.
 *
 * The defect this replaces: `app/pages/product/[handle].vue` threw a 404 for
 * any handle missing from the static array BEFORE it ever queried Shopify. That
 * made a hardcoded TypeScript file the authority on which product URLs exist on
 * a live store — so the first product added through Shopify Admin would 404 on
 * its own storefront while being live and sellable everywhere else.
 *
 * `hasShopifyProduct` wins outright. A store that has the product always
 * renders, even when no static entry exists.
 */
export function resolvePdpResolution(input: PdpResolutionInput): PdpResolution {
  if (input.hasShopifyProduct) return "live";
  if (input.hasStaticProduct) return "preview";
  return "not_found";
}

export interface PdpVariant {
  id?: string | null;
  title?: string | null;
  availableForSale?: boolean | null;
}

export interface ResolveSizeValuesInput {
  /** Variant titles as returned by the Storefront API, in store order. */
  variantTitles: string[];
  /** Labels from the static array's `sizes`, e.g. `["S","M","L"]`. */
  staticLabels: string[];
}

/**
 * The size options a PDP offers.
 *
 * Shopify's titles are authoritative when there is a real choice to make.
 * "Default Title" is Shopify's placeholder for a single-variant product and is
 * never a size, so it is filtered out before the multi-option test — otherwise
 * a one-variant product reads as two options and shows a size picker it does
 * not have. The static list is the pre-launch fallback; "One size" is the
 * honest last resort.
 */
export function resolveSizeValues(input: ResolveSizeValuesInput): string[] {
  const variantTitles = input.variantTitles
    .map(title => (title ?? "").trim())
    .filter(title => title !== "" && title !== "Default Title");

  if (variantTitles.length > 1) return variantTitles;

  const staticLabels = input.staticLabels.map(label => (label ?? "").trim()).filter(label => label !== "");
  if (staticLabels.length > 0) return staticLabels;

  return variantTitles.length === 1 ? variantTitles : ["One size"];
}

export interface ResolveVariantIdInput {
  variants: PdpVariant[];
  /** The size the customer has selected, when the page offers a choice. */
  selectedSize?: string | null;
}

/**
 * Which variant id goes in the cart.
 *
 * The selected size must select that size's variant. Picking "the first
 * available variant" regardless of the selection means a customer who chooses
 * XXL is served whatever the store happened to list first — a silent wrong
 * order, which is the most expensive kind of bug on a storefront.
 *
 * Falls back to the first purchasable variant when there is no usable
 * selection (single-variant product, or a size label the store does not
 * spell the same way), and to the first variant at all when nothing is
 * purchasable, so the page can still render the sold-out state honestly
 * instead of hiding itself.
 */
export function resolveVariantId(input: ResolveVariantIdInput): string | null {
  const variants = input.variants.filter((variant): variant is PdpVariant & { id: string } => Boolean(variant?.id));

  if (variants.length === 0) return null;

  const selectedSize = (input.selectedSize ?? "").trim();
  if (selectedSize !== "") {
    const byTitle = variants.find(variant => (variant.title ?? "").trim() === selectedSize);
    if (byTitle?.id) return byTitle.id;
  }

  const purchasable = variants.find(variant => variant.availableForSale);
  return (purchasable ?? variants[0]!).id;
}
