/**
 * Fixture for the app/data/products.ts scan root — the NEGATIVE case.
 *
 * This is what correct copy looks like once the defect is fixed: the shipping
 * facts keep the made-to-order process description and drop the timeframe,
 * because "Made to order" with no number is truthful and a number nobody
 * quoted is not.
 *
 * It also carries the return window on purpose. If the app/ pass did not
 * apply is_non_lead_window, this file would go red on a correct line and the
 * whole scan would get deleted — the mirror image of the false green.
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
          "Tracked shipping.",
          "Returns within 14 days, unworn.",
        ],
      },
    ],
  },
]