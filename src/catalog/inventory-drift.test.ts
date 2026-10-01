import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CatalogProductSchema } from "./schema.js";
import { diffInventory, diffProduct, type ShopifyProduct } from "./shopify-admin.js";

/**
 * STI-605: the other half of the inventory gap PR #157 left open.
 *
 * The live store, read through the Admin API on the commit this test was
 * written against, is:
 *
 *   sku-001-S  qty=0    sku-002  qty=0
 *   sku-001-M  qty=0    sku-003  qty=0
 *   sku-001-L  qty=-1   <- oversold
 *   sku-001-XL qty=0
 *   sku-001-XXL qty=0
 *
 * and `catalog:plan` printed `no changes` for all three products, because no
 * `ProductInput` field carries `inventoryQuantity` and so `diffProduct` has no
 * branch that could ever see it. A reconciler that reports green while the
 * store sells past zero is the same false-green class as the tags blind spot
 * (PR #65), collection membership (PR #72), and the shipping restatement
 * (PR #82).
 *
 * The properties pinned here pull against each other on purpose:
 *
 *   1. zero and negative stock are VISIBLE, and are NOT the same fact;
 *   2. those notes are never a pending action, because `catalog:apply` cannot
 *      write inventory.
 *
 * A refactor that satisfies only (1) makes the plan promise an apply it cannot
 * perform. One that satisfies only (2) keeps the false green. Both fail here.
 */
describe("diffInventory reports stock the reconciler cannot write (STI-605)", () => {
  const productDoc = {
    id: "stitch-ash.sku-001",
    title: "Embroidered Hoodie",
    handle: "sku-001",
    status: "ACTIVE",
    productType: "Hoodies",
    vendor: "STITCH AND ASH",
    tags: ["embroidered"],
    bodyHtml: "<p>Heavy cotton.</p>",
    options: [{ name: "Size", values: ["S", "M", "L"] }],
  };

  function remoteWith(quantities: Record<string, number | null>): ShopifyProduct {
    return {
      id: "gid://shopify/Product/1",
      title: "Embroidered Hoodie",
      handle: "sku-001",
      status: "ACTIVE",
      productType: "Hoodies",
      vendor: "STITCH AND ASH",
      tags: ["embroidered"],
      bodyHtml: "<p>Heavy cotton.</p>",
      options: [{ name: "Size", values: ["S", "M", "L"] }],
      variants: Object.entries(quantities).map(([sku, qty], i) => ({
        id: `gid://shopify/ProductVariant/${i + 1}`,
        sku,
        price: "185.00",
        // The Size option each SKU selects, so this fixture differs from the
        // catalog in stock ONLY. An empty selectedOptions here would make
        // diffProduct report a normalized-mismatch action for an unrelated
        // reason and quietly invalidate the counter-property test below.
        selectedOptions: [{ name: "Size", value: sku.replace("sku-001-", "") }],
        inventoryPolicy: "CONTINUE",
        inventoryQuantity: qty,
      })),
    };
  }

  function parse(variants: unknown[]) {
    const result = CatalogProductSchema.safeParse({ ...productDoc, variants });
    assert.equal(result.success, true, JSON.stringify(result.error?.issues ?? []));
    assert.ok(result.data);
    return result.data;
  }

  const healthy = parse([
    { sku: "sku-001-S", price: "185.00", option1: "S" },
    { sku: "sku-001-M", price: "185.00", option1: "M" },
    { sku: "sku-001-L", price: "185.00", option1: "L" },
  ]);

  it("is silent when every variant has stock", () => {
    const diff = diffInventory(
      healthy,
      remoteWith({ "sku-001-S": 12, "sku-001-M": 3, "sku-001-L": 1 }),
    );
    assert.deepEqual(diff.actions, []);
    assert.equal(diff.notes.length > 0, true, "must still record what it compared");
  });

  it("reports zero stock, the live state of all 7 variants", () => {
    const diff = diffInventory(
      healthy,
      remoteWith({ "sku-001-S": 0, "sku-001-M": 0, "sku-001-L": 0 }),
    );
    assert.equal(diff.actions.length, 1);
    assert.match(diff.actions[0], /3 variant\(s\) are at zero stock/);
    for (const sku of ["sku-001-S", "sku-001-M", "sku-001-L"]) {
      assert.ok(diff.actions[0].includes(sku), `expected ${sku} named in: ${diff.actions[0]}`);
    }
    assert.doesNotMatch(diff.actions[0], /NEGATIVE/);
  });

  it("distinguishes a NEGATIVE oversell from an empty shelf", () => {
    // sku-001-L is at -1 on the live store: the store has already sold stock
    // it does not have. Reading that the same way as a zero row would hide the
    // only row that can harm a customer today.
    const diff = diffInventory(
      healthy,
      remoteWith({ "sku-001-S": 0, "sku-001-M": 0, "sku-001-L": -1 }),
    );

    const oversell = diff.actions.find(a => /NEGATIVE/.test(a));
    assert.ok(oversell, `expected an oversell note, got: ${JSON.stringify(diff.actions)}`);
    assert.match(oversell, /ALREADY oversold/);
    assert.match(oversell, /sku-001-L=-1/);

    // The two empty variants are still reported as empty, not folded into the
    // oversell line.
    const empty = diff.actions.find(a => /zero stock/.test(a));
    assert.ok(empty);
    assert.doesNotMatch(empty, /sku-001-L/);
  });

  it("never turns stock drift into a pending action", () => {
    // The counter-property. `catalog:plan` sums ProductDiff.actions into
    // `changeCount`, which an approver reads as "this many edits apply will
    // make". No ProductInput field carries inventoryQuantity, so counting it
    // would promise a write that cannot happen.
    const remote = remoteWith({ "sku-001-S": 0, "sku-001-M": -1, "sku-001-L": 0 });
    assert.notEqual(diffInventory(healthy, remote).actions.length, 0);

    // diffProduct — the thing that actually feeds changeCount — stays blind.
    assert.deepEqual(diffProduct(healthy, remote).actions, []);
  });

  it("reports a declared quantity that disagrees with the store", () => {
    const declaring = parse([
      { sku: "sku-001-S", price: "185.00", option1: "S", inventoryQuantity: 24 },
      { sku: "sku-001-M", price: "185.00", option1: "M" },
      { sku: "sku-001-L", price: "185.00", option1: "L" },
    ]);
    const diff = diffInventory(
      declaring,
      remoteWith({ "sku-001-S": 5, "sku-001-M": 0, "sku-001-L": 0 }),
    );

    const declared = diff.actions.find(a => /declares 24, store has 5/.test(a));
    assert.ok(declared, `expected a declared-quantity note, got: ${JSON.stringify(diff.actions)}`);
  });

  it("does not invent an outage for an untracked (null) quantity", () => {
    // Shopify returning null means "not tracked", which is a different fact
    // from zero. Reporting it as zero would manufacture a stockout.
    const diff = diffInventory(
      healthy,
      remoteWith({ "sku-001-S": null, "sku-001-M": null, "sku-001-L": null }),
    );
    assert.deepEqual(diff.actions, []);
    assert.match(diff.notes.join("\n"), /untracked/);
  });

  it("records a note rather than a defect when the product is absent from the store", () => {
    const diff = diffInventory(healthy, null);
    assert.deepEqual(diff.actions, []);
    assert.match(diff.notes.join("\n"), /not on the store/);
  });
});