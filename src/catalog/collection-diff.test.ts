import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CatalogCollection, ShopifyCollection } from "./schema.js";
import { diffCollection } from "./shopify-admin.js";

function catalog(partial: Partial<CatalogCollection> = {}): CatalogCollection {
  return {
    id: "stitch-ash.collection.featured",
    title: "Featured",
    handle: "featured",
    products: ["sku-001", "sku-002", "sku-003"],
    ...partial,
  };
}

function remote(partial: Partial<ShopifyCollection> = {}): ShopifyCollection {
  return {
    id: "gid://shopify/Collection/1",
    title: "Featured",
    handle: "featured",
    productHandles: ["sku-001", "sku-002", "sku-003"],
    ...partial,
  };
}

describe("diffCollection membership (STI-471)", () => {
  it("reports no actions when membership already matches", () => {
    assert.deepEqual(diffCollection(catalog(), remote()).actions, []);
  });

  it("reports the exact add when a live collection is empty", () => {
    // This is the regression: the live `featured` collection held 0 products
    // while every product was ACTIVE, and the reconciler reported nothing.
    const actions = diffCollection(catalog(), remote({ productHandles: [] })).actions;
    assert.deepEqual(actions, [
      "add sku-001 to featured",
      "add sku-002 to featured",
      "add sku-003 to featured",
    ]);
  });

  it("reports removals and additions as separate lines", () => {
    const actions = diffCollection(
      catalog({ products: ["sku-001", "sku-004"] }),
      remote({ productHandles: ["sku-001", "sku-002"] }),
    ).actions;
    assert.deepEqual(actions, ["remove sku-002 from featured", "add sku-004 to featured"]);
  });

  it("does not report a curator reordering as drift", () => {
    // getCollectionByHandle sorts the remote handles because Shopify returns
    // them in curator order; a positional compare would fire on every reorder.
    const actions = diffCollection(
      catalog({ products: ["sku-001", "sku-002", "sku-003"] }),
      remote({ productHandles: ["sku-003", "sku-001", "sku-002"] }),
    ).actions;
    assert.deepEqual(actions, []);
  });

  it("reports a title change", () => {
    const actions = diffCollection(catalog({ title: "Featured now" }), remote()).actions;
    assert.deepEqual(actions, ['set title: "Featured" -> "Featured now"']);
  });

  it("reports creation with full membership when the collection is absent", () => {
    const actions = diffCollection(catalog(), null).actions;
    assert.deepEqual(actions, [
      "create collection stitch-ash.collection.featured (featured)",
      "  add sku-001 to featured",
      "  add sku-002 to featured",
      "  add sku-003 to featured",
    ]);
  });
});
