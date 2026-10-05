import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildVariantBulkInput } from "./shopify-admin.js";
import type { CatalogProduct } from "./schema.js";

/**
 * STI-619 follow-up: the plan told the operator that catalog:apply "does NOT
 * write inventory and does NOT change inventoryPolicy". The second half was
 * false and it was re-asserted to the operator across several runs, which made
 * the oversell on `sku-001-L` look like it had no in-repo remedy at all.
 *
 * `buildVariantBulkInput` has written `inventoryPolicy` on every
 * `productVariantsBulkUpdate` row since the live-schema fix, because
 * `ProductVariantsBulkInput` genuinely accepts it:
 *
 *     ProductVariantsBulkInput: kind=INPUT_OBJECT n=17
 *     ... inventoryPolicy, price, optionValues, inventoryItem ...
 *
 * These tests pin that distinction so the claim cannot drift back:
 *
 *   1. `inventoryPolicy` IS emitted from the catalog declaration (the remedy).
 *   2. Quantity is NOT emitted at all — stock is an inventory-item field, so
 *      there is nowhere on a variant row to put it. This is the half of the
 *      original sentence that was true.
 *
 * Shape only. Nothing here writes to the store.
 */
describe("inventoryPolicy is a writable catalog field; inventory quantity is not (STI-619)", () => {
  const product = {
    id: "stitch-ash.sku-001",
    title: "Embroidered Hoodie",
    handle: "sku-001",
    status: "ACTIVE",
    productType: "Apparel",
    vendor: "Stitch and Ash",
    options: ["Size"],
    variants: [
      { sku: "sku-001-L", price: "185.00", size: "L", inventoryPolicy: "DENY" },
      { sku: "sku-001-M", price: "185.00", size: "M", inventoryPolicy: "CONTINUE" },
    ],
  } as unknown as CatalogProduct;

  it("emits the declared inventoryPolicy on the variant write row", () => {
    const { variants } = buildVariantBulkInput(product, null);
    const bySku = Object.fromEntries(
      variants.map((v) => [(v as { inventoryItem: { sku: string } }).inventoryItem.sku, v]),
    );

    assert.equal(bySku["sku-001-L"].inventoryPolicy, "DENY");
    assert.equal(bySku["sku-001-M"].inventoryPolicy, "CONTINUE");
  });

  it("defaults an undeclared inventoryPolicy to CONTINUE rather than dropping the field", () => {
    const bare = {
      ...product,
      variants: [{ sku: "sku-001-S", price: "185.00", size: "S" }],
    } as unknown as CatalogProduct;

    const { variants } = buildVariantBulkInput(bare, null);

    assert.equal(variants[0].inventoryPolicy, "CONTINUE");
  });

  it("does not emit any inventory quantity field — stock is not a variant field", () => {
    const { variants } = buildVariantBulkInput(product, null);
    const QUANTITY_FIELDS = [
      "inventoryQuantity",
      "quantity",
      "inventoryItem.inventoryQuantity",
      "inventoryLevels",
    ];

    for (const row of variants) {
      for (const field of QUANTITY_FIELDS) {
        assert.equal(
          Object.prototype.hasOwnProperty.call(row, field),
          false,
          `variant row must not carry ${field}`,
        );
      }
    }
  });
});