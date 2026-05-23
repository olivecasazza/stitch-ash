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
  body: string;
}

export interface StaticProduct {
  /** Shopify handle / URL slug — must match Shopify product handle when live. */
  handle: string;
  /** Human-readable product name. */
  name: string;
  /** Price in USD (whole dollars). */
  price: number;
  /** Short editorial description shown on cards and PDP. */
  description: string;
  /** Embroidery technique callout shown on PDP. */
  embroideryCopy: string;
  /** Available sizes. Single-entry ["One size"] for non-sized items. */
  sizes: ProductSize[];
  /** Badge variant for ProductCard + PDP. */
  badge: "made-to-order";
  /** PDP accordion content. */
  details: ProductAccordionSection[];
}

const HOODIE_DETAILS: ProductAccordionSection[] = [
  {
    label: "Fabric",
    body: "High-quality black cotton fleece. Fuzzy interior, smooth exterior. Substantial hand feel — built to take repeated wash without pilling.",
  },
  {
    label: "Embroidery",
    body: "Black thread on black cotton. Design embroidered on chest panel; small brand mark on left sleeve. Two-pass construction — design layer first, mark layer second.",
  },
  {
    label: "Fit",
    body: "Baggy, oversized silhouette. Size up if you want a more relaxed drop-shoulder. Double-stitched seams throughout.",
  },
  {
    label: "Care",
    body: "Cold wash, inside out. Tumble dry low or hang flat. Do not dry-clean — heat damages the embroidery thread tension.",
  },
  {
    label: "Shipping & Returns",
    body: "Made to order — allow 3–5 weeks for production. Ships tracked. Returns accepted within 14 days of delivery if unworn and unaltered.",
  },
];

const LANYARD_DETAILS: ProductAccordionSection[] = [
  {
    label: "Fabric",
    body: "Heavy woven black fabric. Dense weave holds the embroidery without puckering. Double-stitched edges at clip and loop ends.",
  },
  {
    label: "Embroidery",
    body: "Black thread on black weave. Repeated brand-mark pattern along full length — visible in raking light, near-invisible face on.",
  },
  {
    label: "Fit",
    body: "Standard lanyard length, 90cm total. Hardware breakaway clip. One size.",
  },
  {
    label: "Care",
    body: "Spot-clean only. Do not machine wash — breakaway hardware and embroidery tension are both sensitive to extended soak.",
  },
  {
    label: "Shipping & Returns",
    body: "Made to order — allow 2–4 weeks for production. Ships tracked. All sales final on accessories.",
  },
];

const STICKER_DETAILS: ProductAccordionSection[] = [
  {
    label: "Material",
    body: "Embroidered black-on-black patch with adhesive backing. Merrowed border finish. Not a printed sticker — fully stitched.",
  },
  {
    label: "Embroidery",
    body: "Black thread on black backing. Single design with embedded brand mark — the two read as one composition. 6cm × 6cm working area.",
  },
  {
    label: "Application",
    body: "Peel and press. Works on most fabric surfaces; use a heat press or iron for permanent bond on garments. Cold peel backing.",
  },
  {
    label: "Care",
    body: "If heat-pressed onto fabric: cold wash inside out, hang dry. As a standalone patch: keep away from moisture.",
  },
  {
    label: "Shipping & Returns",
    body: "Made to order — allow 1–3 weeks. Ships tracked. All sales final.",
  },
];

export const PRODUCTS: StaticProduct[] = [
  {
    handle: "sku-001",
    name: "Embroidered Hoodie",
    price: 185,
    description:
      "Baggy, oversized, and completely black. The design sits on the chest panel; the brand mark anchors the left sleeve. Two embroidered elements, one piece. Built for the long haul.",
    embroideryCopy:
      "Black thread on black cotton. Design embroidered on chest panel; small brand mark on left sleeve.",
    sizes: [
      { label: "S", value: "S" },
      { label: "M", value: "M" },
      { label: "L", value: "L" },
      { label: "XL", value: "XL" },
      { label: "XXL", value: "XXL" },
    ],
    badge: "made-to-order",
    details: HOODIE_DETAILS,
  },
  {
    handle: "sku-002",
    name: "Embroidered Lanyard",
    price: 35,
    description:
      "Heavy woven black fabric. The brand mark runs the full length — repeated, tight, only visible when the light catches. One size. Breakaway clip.",
    embroideryCopy:
      "Black thread on black weave. Repeated brand-mark pattern along length.",
    sizes: [{ label: "One size", value: "one-size" }],
    badge: "made-to-order",
    details: LANYARD_DETAILS,
  },
  {
    handle: "sku-003",
    name: "Embroidered Sticker",
    price: 15,
    description:
      "Not a print. Fully stitched, black thread on black backing. A single composition — design and brand mark merged. Adhesive backing for flat surfaces or heat press for fabric.",
    embroideryCopy:
      "Black thread on black backing. Single design with embedded brand mark.",
    sizes: [{ label: "One size", value: "one-size" }],
    badge: "made-to-order",
    details: STICKER_DETAILS,
  },
];
