import assert from "node:assert/strict";
import { test } from "node:test";
import { diffProduct } from "../src/catalog/shopify-admin.ts";
import type { CatalogProduct, ShopifyProduct, ShopifyVariant } from "../src/catalog/schema.ts";

// STI-432 regression: the diff used to resolve remote option values by the
// hardcoded names "Option1"/"Title", so any product whose option was named
// something else (catalog/products/sku-001.yaml declares `Size`) reported every
// variant as changed. `catalog:plan` then emitted 5 phantom `update variant`
// actions and `catalog:apply` would have pushed 5 pointless productUpdate
// mutations at a live store. These tests pin the positional resolution.

function remoteVariant(
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
    inventory_policy: inventoryPolicy,
    inventory_quantity: 0,
  };
}

function remoteProduct(options: string[], variants: ShopifyVariant[]): ShopifyProduct {
  const values = variants.map(v => v.selectedOptions[0]?.value ?? "");
  return {
    id: "gid://shopify/Product/1",
    title: "Embroidered Hoodie",
    handle: "sku-001",
    status: "ACTIVE",
    productType: "Hoodies",
    vendor: "STITCH AND ASH",
    tags: ["embroidered"],
    bodyHtml: "<p>Heavy cotton.</p>",
    options: options.map(name => ({ name, values })),
    variants,
  };
}

function catalogProduct(
  options: { name: string; values: string[] }[],
  variants: { sku: string; price: string; option1?: string; option2?: string; inventoryPolicy?: string }[],
): CatalogProduct {
  return {
    id: "stitch-ash.sku-001",
    title: "Embroidered Hoodie",
    handle: "sku-001",
    productType: "Hoodies",
    vendor: "STITCH AND ASH",
    status: "ACTIVE",
    tags: ["embroidered"],
    bodyHtml: "<p>Heavy cotton.</p>",
    options,
    variants: variants.map(v => ({
      sku: v.sku,
      price: v.price,
      option1: v.option1 ?? null,
      option2: v.option2 ?? null,
      inventoryPolicy: (v.inventoryPolicy ?? "CONTINUE") as "CONTINUE" | "DENY",
    })),
  };
}

test("named option (Size) product with matching values reports no actions", () => {
  const sizes = ["S", "M", "L", "XL", "XXL"];
  const product = catalogProduct(
    [{ name: "Size", values: sizes }],
    sizes.map(size => ({ sku: `sku-001-${size}`, price: "185.00", option1: size })),
  );
  const remote = remoteProduct(
    ["Size"],
    sizes.map(size => remoteVariant(`sku-001-${size}`, "185.00", [{ name: "Size", value: size }])),
  );

  assert.deepEqual(diffProduct(product, remote).actions, []);
});

test("option position is taken from the declared option order, not the option name", () => {
  // Remote declares Color first, Size second. Neither is named Option1/Option2.
  const product = catalogProduct(
    [{ name: "Color", values: ["Black"] }, { name: "Size", values: ["S"] }],
    [{ sku: "sku-001-BLK-S", price: "185.00", option1: "Black", option2: "S" }],
  );
  const remote = remoteProduct(
    ["Color", "Size"],
    [remoteVariant("sku-001-BLK-S", "185.00", [{ name: "Color", value: "Black" }, { name: "Size", value: "S" }])],
  );

  assert.deepEqual(diffProduct(product, remote).actions, []);
});

test("option-less Title product still reports no actions", () => {
  const product = catalogProduct(
    [{ name: "Title", values: ["Default Title"] }],
    [{ sku: "sku-002", price: "35.00", option1: "Default Title" }],
  );
  const remote = remoteProduct(
    ["Title"],
    [remoteVariant("sku-002", "35.00", [{ name: "Title", value: "Default Title" }])],
  );

  assert.deepEqual(diffProduct(product, remote).actions, []);
});

test("a real price change on a named option is reported once, with the price prefix", () => {
  const product = catalogProduct(
    [{ name: "Size", values: ["S", "M"] }],
    [
      { sku: "sku-001-S", price: "185.00", option1: "S" },
      { sku: "sku-001-M", price: "190.00", option1: "M" },
    ],
  );
  const remote = remoteProduct(
    ["Size"],
    [
      remoteVariant("sku-001-S", "185.00", [{ name: "Size", value: "S" }]),
      remoteVariant("sku-001-M", "185.00", [{ name: "Size", value: "M" }]),
    ],
  );

  assert.deepEqual(diffProduct(product, remote).actions, [
    "update variant sku-001-M price: 185.00 -> 190.00",
  ]);
});

test("price and option drift on one variant are each reported", () => {
  const product = catalogProduct(
    [{ name: "Size", values: ["S", "M"] }],
    [
      { sku: "sku-001-S", price: "185.00", option1: "S" },
      { sku: "sku-001-M", price: "190.00", option1: "L" },
    ],
  );
  const remote = remoteProduct(
    ["Size"],
    [
      remoteVariant("sku-001-S", "185.00", [{ name: "Size", value: "S" }]),
      remoteVariant("sku-001-M", "185.00", [{ name: "Size", value: "M" }]),
    ],
  );

  assert.deepEqual(diffProduct(product, remote).actions, [
    "update variant sku-001-M price: 185.00 -> 190.00",
    "update variant sku-001-M option1: M -> L",
  ]);
});

test("a real option-value change on a named option is still reported", () => {
  const product = catalogProduct(
    [{ name: "Size", values: ["S", "M"] }],
    [
      { sku: "sku-001-S", price: "185.00", option1: "S" },
      { sku: "sku-001-M", price: "185.00", option1: "M" },
    ],
  );
  const remote = remoteProduct(
    ["Size"],
    [
      remoteVariant("sku-001-S", "185.00", [{ name: "Size", value: "S" }]),
      remoteVariant("sku-001-M", "185.00", [{ name: "Size", value: "L" }]),
    ],
  );

  assert.deepEqual(diffProduct(product, remote).actions, [
    "update variant sku-001-M option1: L -> M",
  ]);
});

test("a real inventory policy change is still reported", () => {
  const product = catalogProduct(
    [{ name: "Size", values: ["S"] }],
    [{ sku: "sku-001-S", price: "185.00", option1: "S", inventoryPolicy: "DENY" }],
  );
  const remote = remoteProduct(
    ["Size"],
    [remoteVariant("sku-001-S", "185.00", [{ name: "Size", value: "S" }], "CONTINUE")],
  );

  assert.deepEqual(diffProduct(product, remote).actions, [
    "update variant sku-001-S inventoryPolicy: CONTINUE -> DENY",
  ]);
});
