import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CatalogProductSchema } from "./schema.js";
import { applyProduct, buildProductInput, buildVariantBulkInput, diffProduct, type ShopifyProduct } from "./shopify-admin.js";

/**
 * STI-532: the regression this file exists to prevent.
 *
 * `ProductVariantSchema` declares `inventoryQuantity`. That made it writable in
 * catalog/products/*.yaml, and `catalog:validate` — the gate flake.nix runs
 * before every apply — accepted it. But `ProductInput` carries no inventory
 * field: stock moves only through `inventoryAdjustQuantities` against an
 * `inventoryItemId` this reconciler never resolves. So the value was accepted,
 * validated, and then dropped on the floor at apply time.
 *
 * The failure mode is worse than the missing value. Everything reported
 * success: validate green, plan green, apply green, and the store unchanged.
 * Meanwhile every live product sits at zero or below stock (sku-001-L is at
 * -1), so the one number that decides whether a customer can buy was the one
 * number an operator could declare and have it vanish without a trace.
 *
 * Two properties are pinned here, and they pull in opposite directions on
 * purpose:
 *   1. a DECLARED quantity must never be silently dropped — apply refuses;
 *   2. a declared quantity must never print a phantom drift action — the
 *      normalize* allowlists stay blind to it.
 * A future refactor that "fixes" either one alone fails this file.
 */
describe("inventoryQuantity is declared but never silently dropped (STI-532)", () => {
  const productDoc = {
    id: "stitch-ash.sku-001",
    title: "Embroidered Hoodie",
    handle: "sku-001",
    status: "ACTIVE",
    productType: "Hoodies",
    vendor: "STITCH AND ASH",
    tags: ["embroidered"],
    bodyHtml: "<p>Heavy cotton.</p>",
    options: [{ name: "Size", values: ["S", "M"] }],
  };

  const remote: ShopifyProduct = {
    id: "gid://shopify/Product/1",
    title: "Embroidered Hoodie",
    handle: "sku-001",
    status: "ACTIVE",
    productType: "Hoodies",
    vendor: "STITCH AND ASH",
    tags: ["embroidered"],
    bodyHtml: "<p>Heavy cotton.</p>",
    options: [{ name: "Size", values: ["S", "M"] }],
    variants: [
      { id: "gid://shopify/ProductVariant/1", sku: "sku-001-S", price: "185.00", selectedOptions: [{ name: "Size", value: "S" }], inventoryPolicy: "CONTINUE", inventoryQuantity: 0 },
      { id: "gid://shopify/ProductVariant/2", sku: "sku-001-M", price: "185.00", selectedOptions: [{ name: "Size", value: "M" }], inventoryPolicy: "CONTINUE", inventoryQuantity: -1 },
    ],
  };

  function parse(variants: unknown[]) {
    const result = CatalogProductSchema.safeParse({ ...productDoc, variants });
    assert.equal(result.success, true, JSON.stringify(result.error?.issues ?? []));
    assert.ok(result.data);
    return result.data;
  }

  it("parses a declared inventoryQuantity — the field is readable, so validate can stay green", () => {
    const product = parse([
      { sku: "sku-001-S", price: "185.00", option1: "S", inventoryQuantity: 24 },
      { sku: "sku-001-M", price: "185.00", option1: "M", inventoryQuantity: 24 },
    ]);
    assert.equal(product.variants[0].inventoryQuantity, 24);
  });

  it("refuses to apply a product that declares inventoryQuantity, naming the offenders", async () => {
    const product = parse([
      { sku: "sku-001-S", price: "185.00", option1: "S", inventoryQuantity: 24 },
      { sku: "sku-001-M", price: "185.00", option1: "M" },
    ]);

    // A client that must never be reached: the guard throws before any fetch,
    // which is what makes "refuses before a partial write" a testable claim.
    const exploding = {
      domain: "invalid.example",
      token: "not-a-real-token",
      source: "static" as const,
    };

    await assert.rejects(
      () => applyProduct(exploding, product, remote),
      /Refusing to apply stitch-ash\.sku-001.*sku-001-S=24.*inventoryAdjustQuantities/s,
    );
  });

  it("keeps inventoryQuantity out of every mutation body", () => {
    // Belt and braces: even if the guard is removed, neither payload can carry
    // stock. buildProductInput/buildVariantBulkInput are the only things that
    // shape the mutation bodies.
    const product = parse([
      { sku: "sku-001-S", price: "185.00", option1: "S", inventoryQuantity: 24 },
      { sku: "sku-001-M", price: "185.00", option1: "M", inventoryQuantity: 24 },
    ]);
    const input = buildProductInput(product, remote);
    const { variants } = buildVariantBulkInput(product, remote);
    for (const variant of variants) {
      assert.equal("inventoryQuantity" in variant, false);
      assert.equal("inventoryQuantities" in variant, false);
      assert.equal("quantityAdjustments" in variant, false);
      // The live bulk input's inventory-quantity fields are the ones an operator
      // would expect to appear; assert none of them do.
      assert.equal("inventoryQuantities" in (variant.inventoryItem as object), false);
    }
    // ProductInput carries no variants at all (STI-619), and no inventory.
    assert.equal("variants" in input, false);
    assert.equal("inventoryQuantity" in input, false);
  });

  it("does not print a phantom drift action for a declared quantity", () => {
    // The counter-property. If normalizeVariant/normalizeRemoteVariant ever
    // start comparing inventoryQuantity, every product in the catalog would
    // report a drift action against the live store forever — and this store is
    // at zero stock, so it would report drift on every single run.
    const product = parse([
      { sku: "sku-001-S", price: "185.00", option1: "S", inventoryQuantity: 24 },
      { sku: "sku-001-M", price: "185.00", option1: "M", inventoryQuantity: 24 },
    ]);
    const diff = diffProduct(product, remote);
    assert.deepEqual(diff.actions, []);
  });

  it("leaves a stock-free catalog untouched, so the guard cannot block normal applies", async () => {
    const product = parse([
      { sku: "sku-001-S", price: "185.00", option1: "S" },
      { sku: "sku-001-M", price: "185.00", option1: "M" },
    ]);
    assert.deepEqual(diffProduct(product, remote).actions, []);

    const exploding = { domain: "invalid.example", token: "not-a-real-token", source: "static" as const };
    // Reaching the fetch is the proof the guard did not fire — the rejection
    // must be a network/host error, not our refusal.
    await assert.rejects(
      () => applyProduct(exploding, product, remote),
      err => !/Refusing to apply/.test(err instanceof Error ? err.message : String(err)),
    );
  });
});