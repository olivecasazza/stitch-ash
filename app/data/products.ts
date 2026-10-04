/**
 * Product lineup — single source of truth for static product data.
 *
 * Used for:
 *   - Homepage ProductCard render
 *   - PDP fallback when Shopify Storefront API has no matching product (pre-launch)
 *   - getStaticPaths pre-render list
 *
 * All three pieces are embroidered black-on-black. Each carries two embroidered
 * elements: a ComfyUI-generated design and a small brand-name mark.
 */

export interface ProductSize {
  label: string;
  value: string;
}

export interface ProductAccordionSection {
  label: string;
  /** One fact per line, DESIGN.md "Product copy". */
  lines: string[];
}

export interface StaticProduct {
  /** Shopify handle / URL slug — must match Shopify product handle when live. */
  handle: string;
  /** Human-readable product name. */
  name: string;
  /** Price in USD (whole dollars). */
  price: number;
  /** Available sizes. Single-entry ["One size"] for non-sized items. */
  sizes: ProductSize[];
  /** Badge variant for ProductCard + PDP. Optional — only set when a card
   *  warrants one (per UX_FRAMEWORK: "use sparingly"). Not set on every card. */
  badge?: "made-to-order";
  /** Every product fact, as expander sections. Static mirror of the catalog
   *  YAML `bodyHtml` pairs, used when Shopify returns no description.
   *  DESIGN.md "Product copy". */
  details: ProductAccordionSection[];
  /** Optional product image URL for ProductCard. */
  imageSrc?: string;
  /** Optional alt text for product image. */
  imageAlt?: string;
  /** Silhouette for the product image plate, per SKU. STI-541: the storefront
   *  shipped one generic hoodie outline for every product, so the Lanyard and
   *  Sticker cards pictured a hoodie. Declared per SKU so this cannot recur. */
}

// TODO (STI-318): Replace imageSrc values with real Shopify CDN URLs once commerce-eng
// uploads product photography. Expected format:
// https://cdn.shopify.com/s/files/{product-id}/{image-id}.{ext}
//
// STI-541 measured this on the live storefront rather than assuming it. The
// Storefront read behind /collection/featured returns real products —
// gid://shopify/Product/15107230335021, availableForSale true, price 185.0 —
// with `featuredImage: null` and `images.edges: []`. The catalog has no
// photography to serve, so the image plate is the honest customer-facing state
// until commerce-eng uploads it. Do not read `imageSrc: undefined` as a bug
// local to this file: it mirrors the catalog.
const PRODUCTS_DATA: StaticProduct[] = [
  {
    handle: "sku-001",
    name: "Embroidered Hoodie",
    price: 185,
    details: [
      { label: "Material", lines: ["Cotton fleece.", "Brushed interior."] },
      { label: "Fit", lines: ["Oversized.", "Dropped shoulder."] },
      { label: "Construction", lines: ["Double-stitched seams."] },
      {
        label: "Embroidery",
        lines: ["Black thread on black.", "Design on chest.", "Mark on left sleeve."],
      },
      {
        label: "Care",
        lines: ["Cold wash, inside out.", "Tumble dry low or hang.", "Do not dry-clean."],
      },
      {
        label: "Shipping & Returns",
        lines: [
          "Made to order.",
          "Ships in 2–3 weeks.",
          "Tracked shipping.",
          "No returns. Faulty or wrong items replaced.",
        ],
      },
    ],
    sizes: [
      { label: "S", value: "S" },
      { label: "M", value: "M" },
      { label: "L", value: "L" },
      { label: "XL", value: "XL" },
      { label: "XXL", value: "XXL" },
    ],
    imageSrc: undefined,
    imageAlt: "Embroidered Hoodie — flat lay on black surface",
  },
  {
    handle: "sku-002",
    name: "Embroidered Lanyard",
    price: 35,
    details: [
      {
        label: "Material",
        lines: ["Woven black fabric.", "Double-stitched edges.", "Breakaway clip."],
      },
      { label: "Size", lines: ["90 cm."] },
      {
        label: "Embroidery",
        lines: ["Black thread on black.", "Mark repeated full length."],
      },
      { label: "Care", lines: ["Spot clean only."] },
      {
        label: "Shipping & Returns",
        lines: ["Made to order.", "Tracked shipping.", "No returns. Faulty or wrong items replaced."],
      },
    ],
    sizes: [{ label: "One size", value: "one-size" }],
    imageSrc: undefined,
    imageAlt: "Embroidered Lanyard — hanging with breakaway clip",
  },
  {
    handle: "sku-003",
    name: "Embroidered Sticker",
    price: 15,
    details: [
      { label: "Material", lines: ["Embroidered patch.", "Merrowed border."] },
      { label: "Size", lines: ["6 × 6 cm design area."] },
      { label: "Embroidery", lines: ["Black thread on black."] },
      { label: "Application", lines: ["Adhesive back.", "Heat-press onto fabric."] },
      {
        label: "Care",
        lines: ["On fabric: cold wash inside out, hang dry.", "Loose: keep dry."],
      },
      {
        label: "Shipping & Returns",
        lines: ["Made to order.", "Tracked shipping.", "No returns. Faulty or wrong items replaced."],
      },
    ],
    sizes: [{ label: "One size", value: "one-size" }],
    imageSrc: undefined,
    imageAlt: "Embroidered Sticker patch on black fabric",
  },
];

export { PRODUCTS_DATA as PRODUCTS };
