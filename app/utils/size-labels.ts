/**
 * Size labels for an index row, with Shopify's placeholder removed.
 *
 * A product with more than one variant carries a real option ("Size", "Colour"
 * …) and its labels are used as-is. A single-variant product instead gets
 * Shopify's synthetic `Title` option whose only value is the literal
 * `Default Title` — a placeholder, not a size, and one that must never reach a
 * customer. It reads "One size", which is what the product actually is.
 *
 * The filter lives here so every surface that derives a sizes string shares
 * one implementation: the `/products` listing, the per-collection listing and
 * any future index. The PDP does not use this — `resolveSizeValues` in
 * `pdp-product.ts` needs the placeholder dropped *before* it decides whether a
 * product offers a size choice at all, which is a different question from what
 * an index row prints.
 */

/** Shopify's placeholder value for the synthetic `Title` option. */
export const SHOPIFY_PLACEHOLDER_TITLE = 'Default Title'

/** The only size an unsized product has. */
export const ONE_SIZE_LABEL = 'One size'

/**
 * Drop the placeholder from a list of labels.
 *
 * When the placeholder was the only label, the product has no size choice and
 * the honest answer is "One size" rather than an empty column.
 */
export function withoutPlaceholderSizes(labels: readonly string[]): string[] {
  const values = labels.map(label => (label ?? '').trim()).filter(Boolean)
  if (!values.length) return []
  const real = values.filter(label => label !== SHOPIFY_PLACEHOLDER_TITLE)
  return real.length ? real : [ONE_SIZE_LABEL]
}