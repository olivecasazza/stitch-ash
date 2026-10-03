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
  /** Spec lines shown on the PDP when Shopify has no description. Mirrors
   *  the catalog YAML `bodyHtml` list. DESIGN.md "Product copy". */
  specs: string[];
  /** Available sizes. Single-entry ["One size"] for non-sized items. */
  sizes: ProductSize[];
  /** Badge variant for ProductCard + PDP. Optional — only set when a card
   *  warrants one (per UX_FRAMEWORK: "use sparingly"). Not set on every card. */
  badge?: "made-to-order";
  /** PDP accordion: Care and Shipping & Returns only. */
  details: ProductAccordionSection[];
  /** Optional product image URL for ProductCard. */
  imageSrc?: string;
  /** Optional alt text for product image. */
  imageAlt?: string;
  /** Silhouette for the product image plate, per SKU. STI-541: the storefront
   *  shipped one generic hoodie outline for every product, so the Lanyard and
   *  Sticker cards pictured a hoodie. Declared per SKU so this cannot recur. */
}

const FINAL_SALE: ProductAccordionSection = {
  label: "Shipping & Returns",
  lines: ["Tracked shipping.", "Final sale."],
};

const HOODIE_DETAILS: ProductAccordionSection[] = [
  {
    label: "Care",
    lines: ["Cold wash, inside out.", "Tumble dry low or hang.", "Do not dry-clean."],
  },
  {
    label: "Shipping & Returns",
    lines: ["Tracked shipping.", "Returns within 14 days, unworn."],
  },
];

const LANYARD_DETAILS: ProductAccordionSection[] = [
  { label: "Care", lines: ["Spot clean only."] },
  FINAL_SALE,
];

const STICKER_DETAILS: ProductAccordionSection[] = [
  {
    label: "Care",
    lines: ["On fabric: cold wash inside out, hang dry.", "Loose: keep dry."],
  },
  FINAL_SALE,
];


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
    specs: [
      "Cotton fleece. Brushed interior.",
      "Oversized fit. Dropped shoulder.",
      "Double-stitched seams.",
      "Embroidered chest. Mark on left sleeve.",
      "Black thread on black.",
      "Made to order. Ships in 2–3 weeks.",
    ],
    sizes: [
      { label: "S", value: "S" },
      { label: "M", value: "M" },
      { label: "L", value: "L" },
      { label: "XL", value: "XL" },
      { label: "XXL", value: "XXL" },
    ],
    details: HOODIE_DETAILS,
    imageSrc: undefined,
    imageAlt: "Embroidered Hoodie — flat lay on black surface",
  },
  {
    handle: "sku-002",
    name: "Embroidered Lanyard",
    price: 35,
    specs: [
      "Woven black fabric. 90 cm.",
      "Breakaway clip.",
      "Double-stitched edges.",
      "Mark embroidered full length.",
      "Black thread on black.",
      "Made to order.",
    ],
    sizes: [{ label: "One size", value: "one-size" }],
    details: LANYARD_DETAILS,
    imageSrc: undefined,
    imageAlt: "Embroidered Lanyard — hanging with breakaway clip",
  },
  {
    handle: "sku-003",
    name: "Embroidered Sticker",
    price: 15,
    specs: [
      "Embroidered patch. Merrowed border.",
      "6 × 6 cm design area.",
      "Adhesive back. Heat-press onto fabric.",
      "Black thread on black.",
      "Made to order.",
    ],
    sizes: [{ label: "One size", value: "one-size" }],
    details: STICKER_DETAILS,
    imageSrc: undefined,
    imageAlt: "Embroidered Sticker patch on black fabric",
  },
];

export { PRODUCTS_DATA as PRODUCTS };
