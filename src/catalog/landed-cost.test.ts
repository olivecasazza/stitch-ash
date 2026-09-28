import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CatalogProductSchema, ProductVariantSchema } from "./schema.js";
import { diffProduct, type ShopifyProduct } from "./shopify-admin.js";

/**
 * STI-421: the regression this file exists to prevent.
 *
 * `ProductVariantSchema` / `CatalogProductSchema` are zod objects, and zod
 * strips unrecognised keys BY DEFAULT. Before `landedCost` was declared, adding
 * a cost to catalog/products/*.yaml was silently discarded during parse:
 *
 *   landedCost survived? : undefined
 *   parse succeeded      : true
 *
 * The dangerous part was not the missing value, it was `parse succeeded: true`.
 * `catalog:validate` — the bot gate flake.nix runs on every apply — stayed
 * GREEN while the cost was gone, so a gross-margin report would have read
 * blank forever with nothing to trace it. These tests are the tripwire: if a
 * future refactor drops the field, or the schema is restored from an older
 * revision, they fail instead of the margin quietly emptying.
 */
describe("landed cost survives the catalog parse (STI-421)", () => {
  const productDoc = {
    id: "stitch-ash.sku-001",
    title: "Embroidered Hoodie",
    handle: "sku-001",
    status: "ACTIVE",
    landedCost: "62.50",
    variants: [
      { sku: "sku-001-S", price: "185.00", option1: "S" },
      { sku: "sku-001-M", price: "185.00", option1: "M", landedCost: "64.00" },
    ],
  };

  it("keeps a product-level landedCost that the raw document carried", () => {
    assert.equal(productDoc.landedCost, "62.50", "precondition: the raw doc has it");

    const parsed = CatalogProductSchema.safeParse(productDoc);
    assert.equal(parsed.success, true, "a declared landedCost must not fail validation");

    // This is the assertion that failed before the field existed.
    assert.equal(
      (parsed.data as { landedCost?: string }).landedCost,
      "62.50",
      "product landedCost was stripped by the schema",
    );
  });

  it("keeps a per-variant landedCost that the raw document carried", () => {
    const parsed = CatalogProductSchema.safeParse(productDoc);
    assert.equal(parsed.success, true);

    const medium = parsed.data?.variants[1];
    assert.equal(medium?.sku, "sku-001-M");
    assert.equal(
      (medium as { landedCost?: string }).landedCost,
      "64.00",
      "variant landedCost was stripped by the schema",
    );
  });

  it("leaves a variant with no declared cost as undefined, not zero", () => {
    const parsed = CatalogProductSchema.safeParse(productDoc);
    assert.equal(parsed.success, true);

    const small = parsed.data?.variants[0];
    assert.equal(
      (small as { landedCost?: string }).landedCost,
      undefined,
      "an absent cost must stay absent — defaulting to '0.00' would report 100% margin",
    );
  });

  it("rejects a non-decimal landedCost instead of coercing it", () => {
    // A number is the exact failure the string type exists to prevent:
    // JSON/YAML would hand back 62.5 and it would compare wrong.
    assert.equal(ProductVariantSchema.safeParse({ sku: "s", price: "1.00", option1: "S", landedCost: 62.5 }).success, false);
    assert.equal(ProductVariantSchema.safeParse({ sku: "s", price: "1.00", option1: "S", landedCost: "62.5" }).success, false);
    assert.equal(ProductVariantSchema.safeParse({ sku: "s", price: "1.00", option1: "S", landedCost: "$62.50" }).success, false);
    // Negative cost is not a real state, and silently accepting it would make
    // margin larger, not louder.
    assert.equal(ProductVariantSchema.safeParse({ sku: "s", price: "1.00", option1: "S", landedCost: "-1.00" }).success, false);
    assert.equal(ProductVariantSchema.safeParse({ sku: "s", price: "1.00", option1: "S", landedCost: "62.50" }).success, true);
  });

  /**
   * The other half of the trap. `diffProduct` ends in a catch-all that compares
   * a normalized catalog variant against the normalized remote variant. If
   * `normalizeVariant` had started spreading the variant instead of allowlisting
   * it, declaring a cost would print a phantom "normalized mismatch" action
   * against a live store that has no cost concept at all — a false-green plan
   * demanding approval for a change that does not exist.
   */
  it("does not turn a declared cost into a plan action against the live store", () => {
    // The catalog side declares every field the remote side declares, so the
    // ONLY difference between the two documents is the landed cost. Anything
    // diffProduct reports here is therefore caused by the cost field.
    const costedProduct = CatalogProductSchema.safeParse({
      ...productDoc,
      productType: "Hoodies",
      vendor: "STITCH AND ASH",
      tags: ["embroidered"],
      options: [{ name: "Size", values: ["S", "M"] }],
    });
    assert.equal(costedProduct.success, true);
    assert.ok(costedProduct.data);

    const remote: ShopifyProduct = {
      id: "gid://shopify/Product/1",
      title: "Embroidered Hoodie",
      handle: "sku-001",
      status: "ACTIVE",
      productType: "Hoodies",
      vendor: "STITCH AND ASH",
      tags: ["embroidered"],
      bodyHtml: null,
      options: [{ name: "Size", values: ["S", "M"] }],
      variants: [
        { id: "gid://shopify/ProductVariant/1", sku: "sku-001-S", price: "185.00", selectedOptions: [{ name: "Size", value: "S" }], inventoryPolicy: "CONTINUE", inventoryQuantity: 0 },
        { id: "gid://shopify/ProductVariant/2", sku: "sku-001-M", price: "185.00", selectedOptions: [{ name: "Size", value: "M" }], inventoryPolicy: "CONTINUE", inventoryQuantity: 0 },
      ],
    };

    // Sanity: the control case with no cost at all is also clean, so a failure
    // below can only come from the landedCost field.
    const controlProduct = CatalogProductSchema.safeParse({
      ...productDoc,
      productType: "Hoodies",
      vendor: "STITCH AND ASH",
      tags: ["embroidered"],
      options: [{ name: "Size", values: ["S", "M"] }],
      landedCost: undefined,
      variants: [
        { sku: "sku-001-S", price: "185.00", option1: "S" },
        { sku: "sku-001-M", price: "185.00", option1: "M" },
      ],
    });
    assert.equal(controlProduct.success, true);
    assert.ok(controlProduct.data);
    assert.deepEqual(diffProduct(controlProduct.data, remote).actions, [], "control case must be clean");

    assert.deepEqual(
      diffProduct(costedProduct.data, remote).actions,
      [],
      "a local margin input must never surface as a store mutation",
    );
  });
});
