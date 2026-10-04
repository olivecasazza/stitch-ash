/**
 * Fixture for the app/data/products.ts scan root.
 *
 * Mirrors the shape of the real file at app/data/products.ts: the PDP's
 * pre-launch fallback copy, hand-authored, with the shipping facts as prose
 * string literals in a `lines: [...]` array.
 *
 * The claim in the array below is the defect this fixture exists to pin: the
 * same unquoted production lead time as the catalog copy, in the file that
 * renders on the fallback path. The catalog copy here is deliberately CLEAN, so
 * a gate that only scans catalog/ reports a clean run on this fixture — which
 * is exactly the false green that let this occurrence sit in main untouched.
 *
 * Note that this header deliberately does NOT quote the claim. The gate scans
 * the whole file, comments included, and an earlier draft of this fixture put
 * the string in its own doc comment — which the gate then flagged at line 9.
 * That was the fixture's fault, not the gate's: a file that mentions a claim
 * has not been scanned correctly. Keep the number out of the prose here so the
 * fixture fails only for the copy it is actually asserting.
 */

export interface ProductAccordionSection {
  label: string
  lines: string[]
}

export interface StaticProduct {
  handle: string
  title: string
  price: number
  sections: ProductAccordionSection[]
}

export const products: StaticProduct[] = [
  {
    handle: "sku-001",
    title: "Embroidered Hoodie",
    price: 185,
    sections: [
      {
        label: "Shipping & Returns",
        lines: [
          "Made to order.",
          "Ships in 2–3 weeks.",
          "Tracked shipping.",
          "Returns within 14 days, unworn.",
        ],
      },
    ],
  },
]