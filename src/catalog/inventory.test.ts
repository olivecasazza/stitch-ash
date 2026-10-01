import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { diffInventory } from "./inventory.js";
import { CatalogProductSchema, type ShopifyProduct, type ShopifyVariant } from "./schema.js";
import { diffProduct } from "./shopify-admin.js";

/**
 * STI-605: the blind spot these tests exist to prevent.
 *
 * `catalog:plan` reported `no changes` for every product on a live store where
 * all 7 sellable variants sit at or below zero and one is at -1. The plan was
 * not wrong about anything it checked — it simply never checked stock, and
 * printed no hint that it had not. That is the worst shape of false green: a
 * clean run that reads as "this catalog is reconciled".
 *
 * The properties pinned here:
 *   1. zero and negative are DIFFERENT findings. Zero is an empty shelf;
 *      negative is an order already accepted for stock the store does not have,
 *      and only the second can already have harmed a customer.
 *   2. `null` is not zero. An untracked variant must never print "empty".
 *   3. A stock difference NEVER becomes an action. `catalog:apply` cannot write
 *      inventory, so an action here would be a plan that promises a write it
 *      cannot perform. This is the property the whole reported-only design
 *      exists to hold, and it is the one the issue's out-of-scope section
 *      demands.
 */
describe("inventory is reported, never planned (STI-605)", () => {
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

  function live(sku: string, quantity: number | null, policy = "CONTINUE"): ShopifyVariant {
    return {
      id: `gid://shopify/ProductVariant/${sku}`,
      sku,
      price: "185.00",
      selectedOptions: [{ name: "Size", value: sku.slice(-1) }],
      inventoryPolicy: policy,
      inventoryQuantity: quantity,
    };
  }

  function remoteWith(variants: ShopifyVariant[]): ShopifyProduct {
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
      variants,
    };
  }

  function product(variants: unknown[]) {
    const parsed = CatalogProductSchema.safeParse({ ...productDoc, variants });
    assert.equal(parsed.success, true, JSON.stringify(parsed.error?.issues ?? []));
    assert.ok(parsed.data);
    return parsed.data;
  }

  const declared = product([
    { sku: "sku-001-S", price: "185.00", option1: "S" },
    { sku: "sku-001-M", price: "185.00", option1: "M" },
    { sku: "sku-001-L", price: "185.00", option1: "L" },
  ]);

  it("reports the live store's shape: every variant at or below zero, one oversold", () => {
    // The measured live state this issue was filed from.
    const diff = diffInventory(
      declared,
      remoteWith([live("sku-001-S", 0), live("sku-001-M", 0), live("sku-001-L", -1)]),
    );

    assert.equal(diff.findings.filter(f => f.verdict === "empty_sellable").length, 2);
    assert.equal(diff.findings.length, 3);
    assert.deepEqual(
      diff.oversold.map(f => f.sku),
      ["sku-001-L"],
    );
    assert.match(diff.notes.join("\n"), /sku-001-L is at -1/);
    assert.match(diff.notes.join("\n"), /oversell a customer can already be harmed by/);
  });

  it("keeps negative distinct from zero in the printed text", () => {
    // If these ever read the same, an operator scanning the plan cannot tell a
    // stockout from an oversell — which is the exact confusion the issue's
    // scope item 3 exists to prevent.
    const diff = diffInventory(declared, remoteWith([live("sku-001-S", 0), live("sku-001-L", -1)]));
    const zero = diff.findings.find(f => f.verdict === "empty_sellable")!;
    const negative = diff.findings.find(f => f.verdict === "oversold")!;

    assert.equal(zero.verdict, "empty_sellable");
    assert.equal(negative.verdict, "oversold");
    assert.notEqual(zero.note, negative.note);
    assert.doesNotMatch(zero.note, /NEGATIVE|oversell a customer can already be harmed/);
    assert.doesNotMatch(negative.note, /is at 0 with inventoryPolicy/);
  });

  it("distinguishes a stockout the store already blocks from one it will keep selling", () => {
    const blocked = diffInventory(declared, remoteWith([live("sku-001-S", 0, "DENY")]));
    assert.equal(blocked.findings[0].verdict, "empty_blocked");
    assert.match(blocked.findings[0].note, /correctly refuses to sell/);
    // A DENY variant is not an oversell and must never be reported as one.
    assert.deepEqual(blocked.oversold, []);
  });

  it("never calls an untracked variant an empty shelf", () => {
    // Shopify returns null when inventory is not tracked. Reporting that as 0
    // would be a fabricated finding, and reporting it as a pass would be the
    // false green this whole issue is about.
    const diff = diffInventory(declared, remoteWith([live("sku-001-S", null)]));
    assert.equal(diff.findings[0].verdict, "untracked");
    assert.equal(diff.findings[0].storeQuantity, null);
    assert.match(diff.findings[0].note, /UNVERIFIED, not a pass and not an empty shelf/);
    assert.deepEqual(diff.oversold, []);
  });

  it("reports a declared quantity the store disagrees with, as a note and not an action", () => {
    const withStock = product([
      { sku: "sku-001-S", price: "185.00", option1: "S", inventoryQuantity: 24 },
      { sku: "sku-001-M", price: "185.00", option1: "M" },
      { sku: "sku-001-L", price: "185.00", option1: "L" },
    ]);
    const diff = diffInventory(withStock, remoteWith([live("sku-001-S", 3), live("sku-001-M", 9), live("sku-001-L", 4)]));

    const mismatch = diff.findings.filter(f => f.verdict === "declared_mismatch");
    assert.deepEqual(mismatch.map(f => [f.sku, f.declaredQuantity, f.storeQuantity]), [["sku-001-S", 24, 3]]);
    assert.match(mismatch[0].note, /catalog:apply CANNOT write stock/);
    // Healthy stock reports nothing at all — this channel is not a noise source.
    assert.equal(diff.notes.length, 1);
  });

  it("never produces an action: apply cannot write inventory, so the plan must not offer to", () => {
    // The property the whole reported-only design exists to hold. `changeCount`
    // in scripts/catalog.ts is accumulated from `diff.actions.length`, so a
    // type with no `actions` field cannot inflate the approved-action total.
    const diff = diffInventory(declared, remoteWith([live("sku-001-S", 0), live("sku-001-M", -4), live("sku-001-L", -1)]));
    assert.equal("actions" in diff, false);
    assert.ok(diff.notes.length >= 3, "stock rows must still be reported");

    // And the counter-property, from the other module: the same catalog and
    // the same remote still plan as clean, so a drift note can never be read
    // as a pending action and a run can never look "actionable" because of
    // stock alone.
    assert.deepEqual(diffProduct(declared, remoteWith([live("sku-001-S", 0), live("sku-001-M", -4), live("sku-001-L", -1)])).actions, []);
  });

  it("flags a live variant the catalog does not declare when it is at or below zero", () => {
    const diff = diffInventory(
      declared,
      remoteWith([live("sku-001-S", 5), live("sku-001-M", 0), live("sku-001-L", -2), live("sku-001-XL", -3)]),
    );
    const undeclared = diff.findings.filter(f => f.sku === "sku-001-XL");
    assert.equal(undeclared.length, 1);
    assert.equal(undeclared[0].verdict, "oversold");
    assert.match(undeclared[0].note, /LIVE variant the catalog does not declare/);
    // sku-001-M is declared and empty, sku-001-L is declared and already
    // oversold, and sku-001-S is declared and in stock. A POSITIVE count on an
    // undeclared variant is deliberately not reported by this channel.
    assert.deepEqual(diff.findings.map(f => f.sku).sort(), ["sku-001-L", "sku-001-M", "sku-001-XL"]);
    assert.deepEqual(diff.oversold.map(f => f.sku).sort(), ["sku-001-L", "sku-001-XL"]);
  });

  it("reports a declared variant the store does not have, without claiming zero stock", () => {
    const diff = diffInventory(declared, remoteWith([live("sku-001-S", 4)]));
    const missing = diff.findings.filter(f => f.verdict === "absent");
    assert.deepEqual(missing.map(f => f.sku), ["sku-001-M", "sku-001-L"]);
    assert.match(missing[0].note, /no variant with that SKU/);
    assert.deepEqual(diff.oversold, []);
  });

  it("calls a missing remote product UNVERIFIED rather than reporting no stock findings", () => {
    // A product that cannot be read must not print the same as a product that
    // was read and found healthy.
    const diff = diffInventory(declared, null);
    assert.equal(diff.findings.length, 0);
    assert.equal(diff.notes.length, 1);
    assert.match(diff.notes[0], /UNVERIFIED, not a pass/);
  });

  it("prints nothing for a fully stocked, fully declared product", () => {
    const diff = diffInventory(declared, remoteWith([live("sku-001-S", 4), live("sku-001-M", 4), live("sku-001-L", 4)]));
    assert.deepEqual(diff.notes, []);
    assert.deepEqual(diff.oversold, []);
  });
});
