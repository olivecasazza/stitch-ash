import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CatalogProduct, ShopifyProduct, ShopifyVariant } from "./schema.js";
import { diffProduct } from "./shopify-admin.js";

function variant(
  sku: string,
  price: string,
  selectedOptions: { name: string; value: string }[],
  inventoryPolicy: string | null = "CONTINUE",
): ShopifyVariant {
  return {
    id: `gid://shopify/ProductVariant/${sku}`,
    sku,
    price,
    selectedOptions,
    inventoryPolicy,
    inventoryQuantity: null,
  };
}

function remote(partial: Partial<ShopifyProduct> & { variants: ShopifyVariant[]; options: { name: string; values: string[] }[] }): ShopifyProduct {
  return {
    id: "gid://shopify/Product/1",
    title: "Embroidered Hoodie",
    handle: "sku-001",
    status: "ACTIVE",
    productType: "Hoodies",
    vendor: "STITCH AND ASH",
    tags: [],
    bodyHtml: "<p>body</p>",
    ...partial,
  };
}

function catalog(partial: Partial<CatalogProduct> & { variants: CatalogProduct["variants"]; options?: { name: string; values: string[] }[] }): CatalogProduct {
  return {
    id: "stitch-ash.sku-001",
    title: "Embroidered Hoodie",
    handle: "sku-001",
    status: "ACTIVE",
    productType: "Hoodies",
    vendor: "STITCH AND ASH",
    tags: [],
    bodyHtml: "<p>body</p>",
    ...partial,
  };
}

describe("diffProduct variant option resolution (STI-432)", () => {
  it("reports no actions for a named-option product that is already in sync", () => {
    // This is the exact regression: sku-001 declares a `Size` option and every
    // variant's selectedOptions carry {name:"Size"}. The old implementation
    // looked up "Option1"/"Title", got null, and reported 5 phantom updates.
    const product = catalog({
      options: [{ name: "Size", values: ["S", "M", "L", "XL", "XXL"] }],
      variants: ["S", "M", "L", "XL", "XXL"].map(size => ({
        sku: `sku-001-${size}`,
        price: "185.00",
        option1: size,
        inventoryPolicy: "CONTINUE" as const,
      })),
    });

    const result = diffProduct(
      product,
      remote({
        options: [{ name: "Size", values: ["S", "M", "L", "XL", "XXL"] }],
        variants: ["S", "M", "L", "XL", "XXL"].map((size) =>
          variant(`sku-001-${size}`, "185.00", [{ name: "Size", value: size }]),
        ),
      }),
    );

    assert.deepEqual(result.actions, []);
  });

  it("reports no actions for a single-variant product with the default Title option", () => {
    const product = catalog({
      handle: "sku-002",
      options: [{ name: "Title", values: ["Default Title"] }],
      variants: [{ sku: "sku-002", price: "35.00", option1: "Default Title", inventoryPolicy: "CONTINUE" as const }],
    });

    const result = diffProduct(
      product,
      remote({
        handle: "sku-002",
        options: [{ name: "Title", values: ["Default Title"] }],
        variants: [variant("sku-002", "35.00", [{ name: "Title", value: "Default Title" }])],
      }),
    );

    assert.deepEqual(result.actions, []);
  });

  it("still reports a genuine price drift", () => {
    const product = catalog({
      options: [{ name: "Size", values: ["S", "M"] }],
      variants: [
        { sku: "sku-001-S", price: "185.00", option1: "S", inventoryPolicy: "CONTINUE" as const },
        { sku: "sku-001-M", price: "185.00", option1: "M", inventoryPolicy: "CONTINUE" as const },
      ],
    });

    const result = diffProduct(
      product,
      remote({
        options: [{ name: "Size", values: ["S", "M"] }],
        variants: [
          variant("sku-001-S", "185.00", [{ name: "Size", value: "S" }]),
          variant("sku-001-M", "999.00", [{ name: "Size", value: "M" }]),
        ],
      }),
    );

    assert.deepEqual(result.actions, ["update variant sku-001-M price: 999.00 -> 185.00"]);
  });

  it("reads inventoryPolicy off the camelCase GraphQL field", () => {
    // Guards the second STI-432 defect: the interface declared
    // `inventory_policy` while the query selects `inventoryPolicy`, so the
    // value was always undefined and the "CONTINUE" fallback hid a real DENY.
    const product = catalog({
      options: [{ name: "Size", values: ["S"] }],
      variants: [{ sku: "sku-001-S", price: "185.00", option1: "S", inventoryPolicy: "DENY" as const }],
    });

    const result = diffProduct(
      product,
      remote({
        options: [{ name: "Size", values: ["S"] }],
        variants: [variant("sku-001-S", "185.00", [{ name: "Size", value: "S" }], "CONTINUE")],
      }),
    );

    assert.deepEqual(result.actions, [
      "update variant sku-001-S inventoryPolicy: CONTINUE -> DENY",
    ]);
  });

  it("reports a genuine option-value drift", () => {
    const product = catalog({
      options: [{ name: "Size", values: ["S", "M"] }],
      variants: [{ sku: "sku-001-S", price: "185.00", option1: "S", inventoryPolicy: "CONTINUE" as const }],
    });

    const result = diffProduct(
      product,
      remote({
        options: [{ name: "Size", values: ["S", "M"] }],
        variants: [variant("sku-001-S", "185.00", [{ name: "Size", value: "M" }])],
      }),
    );

    assert.equal(result.actions.length, 1);
    assert.match(result.actions[0]!, /^update variant sku-001-S \(normalized mismatch: /);
  });

  it("reports a changed option name rather than mis-attributing variants", () => {
    const product = catalog({
      options: [{ name: "Size", values: ["S"] }],
      variants: [{ sku: "sku-001-S", price: "185.00", option1: "S", inventoryPolicy: "CONTINUE" as const }],
    });

    const result = diffProduct(
      product,
      remote({
        options: [{ name: "Colour", values: ["Red"] }],
        variants: [variant("sku-001-S", "185.00", [{ name: "Colour", value: "Red" }])],
      }),
    );

    assert.ok(result.actions.includes("set options: [Colour] -> [Size]"));
  });

  it("resolves multiple declared options positionally", () => {
    const product = catalog({
      options: [
        { name: "Size", values: ["S"] },
        { name: "Colour", values: ["Black"] },
      ],
      variants: [
        { sku: "sku-001-S", price: "185.00", option1: "S", option2: "Black", inventoryPolicy: "CONTINUE" as const },
      ],
    });

    const result = diffProduct(
      product,
      remote({
        options: [
          { name: "Size", values: ["S"] },
          { name: "Colour", values: ["Black"] },
        ],
        variants: [
          variant("sku-001-S", "185.00", [
            { name: "Size", value: "S" },
            { name: "Colour", value: "Black" },
          ]),
        ],
      }),
    );

    assert.deepEqual(result.actions, []);
  });

  it("reports a missing remote variant as an addition", () => {
    const product = catalog({
      options: [{ name: "Size", values: ["S", "M"] }],
      variants: [
        { sku: "sku-001-S", price: "185.00", option1: "S", inventoryPolicy: "CONTINUE" as const },
        { sku: "sku-001-M", price: "185.00", option1: "M", inventoryPolicy: "CONTINUE" as const },
      ],
    });

    const result = diffProduct(
      product,
      remote({
        options: [{ name: "Size", values: ["S", "M"] }],
        variants: [variant("sku-001-S", "185.00", [{ name: "Size", value: "S" }])],
      }),
    );

    assert.deepEqual(result.actions, ["add variant sku-001-M"]);
  });
});
