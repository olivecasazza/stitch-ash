/**
 * Which line-art silhouette a product image plate carries.
 *
 * STI-541: the storefront shipped one generic hoodie outline as the fallback
 * for every product, so the Lanyard and the Sticker cards both pictured a
 * hoodie — an image that contradicts the product name next to it. Silhouettes
 * are chosen here so no card can ever show a garment it is not selling.
 */

export type ProductMark = "hoodie" | "lanyard" | "sticker" | "emblem";

/**
 * Ordered most-specific first. The nouns are distinct, but "emblem" is the
 * deliberate catch-all: an unrecognised product gets the stitched-diamond
 * mark, which is the one silhouette that is true of any embroidered item. A
 * wrong-but-plausible garment is worse than no garment.
 */
const MARK_KEYWORDS: ReadonlyArray<readonly [ProductMark, readonly string[]]> = [
  ["lanyard", ["lanyard", "lanyards", "strap", "clip", "keychain"]],
  ["hoodie", ["hoodie", "hooded", "hoody", "crew", "crewneck", "sweat", "sweatshirt", "jumper"]],
  ["sticker", ["sticker", "stickers", "patch", "patches", "badge", "decal", "woventag"]],
];

/**
 * Resolve the plate mark for a product.
 *
 * `explicit` wins when a caller already knows the mark — the static catalogue
 * in `app/data/products.ts` declares one per SKU, so home, /products and the
 * PDPs resolve exactly. The Shopify-fed routes (collection grids and sliders)
 * have no such field, so they derive it from the product's own name and
 * handle. Derivation is a display concern only: it decides which line drawing
 * to stroke, never what the product is or whether it is in stock.
 */
export function resolveProductMark(
  explicit: ProductMark | undefined,
  ...haystacks: Array<string | undefined | null>
): ProductMark {
  if (explicit) return explicit;

  const haystack = haystacks
    .filter((value): value is string => typeof value === "string" && value.length > 0)
    .join(" ")
    .toLowerCase();

  for (const [mark, keywords] of MARK_KEYWORDS) {
    if (keywords.some((keyword) => haystack.includes(keyword))) return mark;
  }

  return "emblem";
}
