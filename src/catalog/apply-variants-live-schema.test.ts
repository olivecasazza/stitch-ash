import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CatalogProductSchema, type ShopifyProduct } from "./schema.js";
import { applyProduct, buildProductInput, buildVariantBulkInput } from "./shopify-admin.js";

/**
 * STI-619: `catalog:apply` was 100% non-functional against the live store, and
 * nothing in the repo could tell.
 *
 * `buildProductInput` put `variants` in the `ProductInput` body. That field has
 * never existed. Introspected from the live store's own `2026-04` schema:
 *
 *     ProductInput: kind=INPUT_OBJECT n=21
 *     ... descriptionHtml, handle, seo, productType, tags, title, vendor,
 *         category, id, metafields, productOptions, status, ...
 *     variants=false  inventoryPolicy=false
 *
 * So every product write was rejected by the variable validator:
 *
 *     HTTP 200
 *     errors: [{"message":"Variable $input of type ProductInput! was provided
 *       invalid value for variants (Field is not defined on ProductInput)",
 *       "extensions":{"code":"INVALID_VARIABLE",
 *         "problems":[{"path":["variants"],
 *           "explanation":"Field is not defined on ProductInput"}]}}]
 *     data: null
 *
 * The two properties that made this survivable for months:
 *
 *   1. GraphQL answers HTTP 200 for a variable error, and `shopifyAdminFetch`
 *      only threw on `!response.ok` plus a `json.errors` check that DOES fire
 *      here — so the run stopped with a message, which is good. But the real
 *      hazard is the inverse: the plan reported real actions (price, policy)
 *      that no apply could ever land, and nobody could tell the difference
 *      between "approved and applied" and "rejected at the schema boundary".
 *   2. `diffProduct` reports variant drift as actionable lines, so an operator
 *      approving a plan was approving a mutation the API would reject.
 *
 * These tests pin the payloads against the field names the LIVE schema has, so
 * a future "simplify the apply path" cannot reintroduce a field that does not
 * exist. They assert the shape, not the store: nothing here writes.
 */
describe("applyProduct payloads match the live 2026-04 schema (STI-619)", () => {
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
    variants: [
      { sku: "sku-001-S", price: "185.00", option1: "S", inventoryPolicy: "DENY" as const },
      { sku: "sku-001-M", price: "185.00", option1: "M" },
    ],
  };

  const remote: ShopifyProduct = {
    id: "gid://shopify/Product/15107230335021",
    title: productDoc.title,
    handle: productDoc.handle,
    status: "ACTIVE",
    productType: productDoc.productType,
    vendor: productDoc.vendor,
    tags: productDoc.tags,
    bodyHtml: productDoc.bodyHtml,
    options: [{ name: "Size", values: ["S", "M"] }],
    variants: [
      {
        id: "gid://shopify/ProductVariant/66758592790573",
        sku: "sku-001-S",
        price: "185.00",
        selectedOptions: [{ name: "Size", value: "S" }],
        inventoryPolicy: "CONTINUE",
        inventoryQuantity: 0,
      },
      {
        id: "gid://shopify/ProductVariant/66758592823341",
        sku: "sku-001-M",
        price: "185.00",
        selectedOptions: [{ name: "Size", value: "M" }],
        inventoryPolicy: "CONTINUE",
        inventoryQuantity: 0,
      },
    ],
  };

  const product = CatalogProductSchema.parse(productDoc);

  describe("buildProductInput carries only real ProductInput fields", () => {
    it("omits `variants`, the field that does not exist", () => {
      const input = buildProductInput(product, remote);
      assert.equal(
        "variants" in input,
        false,
        "ProductInput has no `variants` field; sending it fails with INVALID_VARIABLE",
      );
    });

    it("uses only fields present in the live 21-field ProductInput", () => {
      // The live field list, captured by introspection. If a field here is not
      // in the set, the write is rejected before it reaches a resolver.
      const liveProductInputFields = new Set([
        "descriptionHtml", "handle", "seo", "productType", "tags", "templateSuffix",
        "giftCardTemplateSuffix", "title", "vendor", "category", "giftCard",
        "redirectNewHandle", "collectionsToJoin", "collectionsToLeave",
        "combinedListingRole", "id", "metafields", "productOptions", "status",
        "requiresSellingPlan", "claimOwnership",
      ]);

      for (const key of Object.keys(buildProductInput(product, remote))) {
        assert.ok(
          liveProductInputFields.has(key),
          `${key} is not a field on the live ProductInput; productUpdate would reject it`,
        );
      }
    });

    it("keeps the remote id on update and omits it on create", () => {
      assert.equal(buildProductInput(product, remote).id, remote.id);
      assert.equal("id" in buildProductInput(product, null), false);
    });
  });

  describe("buildVariantBulkInput matches the live ProductVariantsBulkInput", () => {
    it("carries only fields the live 17-field bulk input has", () => {
      const liveBulkFields = new Set([
        "barcode", "compareAtPrice", "id", "mediaSrc", "inventoryPolicy",
        "inventoryQuantities", "quantityAdjustments", "inventoryItem", "mediaId",
        "metafields", "optionValues", "price", "taxable", "taxCode",
        "unitPriceMeasurement", "showUnitPrice", "requiresComponents",
      ]);

      const { variants } = buildVariantBulkInput(product, remote);
      assert.equal(variants.length, 2);
      for (const variant of variants) {
        for (const key of Object.keys(variant)) {
          assert.ok(
            liveBulkFields.has(key),
            `${key} is not a field on the live ProductVariantsBulkInput; the write would be rejected`,
          );
        }
      }
    });

    it("writes the SKU under inventoryItem, because there is no top-level sku", () => {
      // Verified live: `INVALID_VARIABLE ... 0.sku (Field is not defined on
      // ProductVariantsBulkInput)`. InventoryItemInput has sku.
      const { variants } = buildVariantBulkInput(product, remote);
      assert.deepEqual(variants[0].inventoryItem, { sku: "sku-001-S" });
      assert.equal("sku" in variants[0], false);
    });

    it("translates positional option slots into named optionValues", () => {
      // There is no option1/option2/option3 on the bulk input. VariantOptionValueInput
      // is { id, name, linkedMetafieldValue, optionId, optionName }.
      const { variants } = buildVariantBulkInput(product, remote);
      assert.deepEqual(variants[0].optionValues, [{ optionName: "Size", name: "S" }]);
      assert.deepEqual(variants[1].optionValues, [{ optionName: "Size", name: "M" }]);
      assert.equal("option1" in variants[0], false);
    });

    it("resolves the option NAME from the declared order, not a hardcoded 'Size'", () => {
      // STI-432's lesson applied to the write path: renaming the option in YAML
      // must not need a code change, and must not silently write the value onto
      // the wrong option.
      const renamed = CatalogProductSchema.parse({
        ...productDoc,
        options: [{ name: "Shirt size", values: ["S", "M"] }],
        variants: [
          { sku: "sku-001-S", price: "185.00", option1: "S" },
          { sku: "sku-001-M", price: "185.00", option1: "M" },
        ],
      });
      const renamedRemote: ShopifyProduct = {
        ...remote,
        options: [{ name: "Shirt size", values: ["S", "M"] }],
        variants: remote.variants.map(v => ({
          ...v,
          selectedOptions: [{ name: "Shirt size", value: v.selectedOptions[0].value }],
        })),
      };

      const { variants } = buildVariantBulkInput(renamed, renamedRemote);
      assert.deepEqual(variants[0].optionValues, [{ optionName: "Shirt size", name: "S" }]);
    });

    it("addresses each row by its remote variant id", () => {
      const { variants } = buildVariantBulkInput(product, remote);
      assert.equal(variants[0].id, "gid://shopify/ProductVariant/66758592790573");
      assert.equal(variants[1].id, "gid://shopify/ProductVariant/66758592823341");
    });

    it("defaults inventoryPolicy to CONTINUE, matching diffProduct's fallback", () => {
      const { variants } = buildVariantBulkInput(product, remote);
      assert.equal(variants[0].inventoryPolicy, "DENY");
      assert.equal(variants[1].inventoryPolicy, "CONTINUE");
    });

    it("omits optionValues entirely when no option value is declared", () => {
      // option1 is a required-but-nullable schema field, so "no value declared"
      // is expressed as an explicit null.
      const noOptions = CatalogProductSchema.parse({
        ...productDoc,
        variants: [{ sku: "sku-001-S", price: "185.00", option1: null }],
      });
      const { variants } = buildVariantBulkInput(noOptions, { ...remote, variants: [remote.variants[0]] });
      assert.equal("optionValues" in variants[0], false);
    });

    it("refuses rather than dropping a catalog variant the store does not have", () => {
      // A create is productVariantsBulkCreate, a different mutation with its own
      // variant-position rules. Guessing here risks pricing a real variant wrong.
      const { missingRemoteIds } = buildVariantBulkInput(product, {
        ...remote,
        variants: [remote.variants[0]],
      });
      assert.deepEqual(missingRemoteIds, ["sku-001-M"]);
    });

    it("throws on an option value that has no declared option name", () => {
      const impossible = CatalogProductSchema.parse({
        ...productDoc,
        options: [],
        variants: [{ sku: "sku-001-S", price: "185.00", option1: "S" }],
      });
      // No declared options and no remote options either -> position 1 has no
      // option to attach "S" to.
      assert.throws(
        () => buildVariantBulkInput(impossible, { ...remote, options: [] }),
        /has no declared option name/,
      );
    });
  });

  describe("applyProduct dispatches both writes", () => {
    /** A client that records documents instead of sending them. */
    function recordingClient() {
      const sent: { query: string; variables: Record<string, unknown> }[] = [];
      const client = {
        domain: "invalid.example",
        token: "not-a-real-token",
        source: "static" as const,
      };
      // swap the module-level fetch target by intercepting globalThis.fetch
      const original = globalThis.fetch;
      globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
        const body = JSON.parse(String(init?.body)) as {
          query: string;
          variables: Record<string, unknown>;
        };
        sent.push({ query: body.query, variables: body.variables });
        const productId = "gid://shopify/Product/15107230335021";
        if (body.query.includes("productVariantsBulkUpdate")) {
          return new Response(
            JSON.stringify({
              data: {
                productVariantsBulkUpdate: {
                  product: { id: productId },
                  productVariants: [{ id: "gid://shopify/ProductVariant/66758592790573" }],
                  userErrors: [],
                },
              },
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        }
        if (body.query.includes("productCreate")) {
          return new Response(
            JSON.stringify({ data: { productCreate: { product: { id: productId }, userErrors: [] } } }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        }
        if (body.query.includes("productUpdate")) {
          return new Response(
            JSON.stringify({ data: { productUpdate: { product: { id: productId }, userErrors: [] } } }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        }
      }) as typeof fetch;
      return { sent, client, restore: () => { globalThis.fetch = original; } };
    }

    it("sends productUpdate without variants, then the variant bulk update", async () => {
      const { sent, client, restore } = recordingClient();
      try {
        const id = await applyProduct(client, product, remote);
        assert.equal(id, remote.id);
      } finally {
        restore();
      }

      assert.equal(sent.length, 2, "product fields and variants are two separate mutations");
      assert.match(sent[0].query, /productUpdate/);
      assert.equal("variants" in (sent[0].variables.input as object), false);
      assert.match(sent[1].query, /productVariantsBulkUpdate/);
      assert.equal(sent[1].variables.allowPartialUpdates, true);
      assert.equal(sent[1].variables.productId, remote.id);
    });

    it("does NOT send the invalid variable shape any more", async () => {
      // The exact regression: `variants` inside a ProductInput.
      const { sent, client, restore } = recordingClient();
      try {
        await applyProduct(client, product, remote);
      } finally {
        restore();
      }
      for (const doc of sent) {
        if (doc.query.includes("productUpdate") || doc.query.includes("createProduct")) {
          assert.equal(
            "variants" in (doc.variables.input as object),
            false,
            "productUpdate input must not carry `variants` (INVALID_VARIABLE against the live schema)",
          );
        }
      }
    });

    it("skips the variant write on create, which has no variant rows to update", async () => {
      const { sent, client, restore } = recordingClient();
      try {
        await applyProduct(client, product, null);
      } finally {
        restore();
      }
      assert.equal(sent.length, 1);
      assert.match(sent[0].query, /productCreate/);
    });

    it("throws before sending anything when a catalog variant is unknown to the store", async () => {
      const { sent, client, restore } = recordingClient();
      try {
        await assert.rejects(
          () => applyProduct(client, product, { ...remote, variants: [remote.variants[0]] }),
          /Refusing to apply stitch-ash\.sku-001.*sku-001-M/s,
        );
      } finally {
        restore();
      }
      assert.equal(sent.length, 0, "refusal must precede every write, so no partial apply happens");
    });

    it("says the product fields landed when only the variant write fails", async () => {
      const original = globalThis.fetch;
      globalThis.fetch = (async (_url: string | URL | Request, init?: RequestInit) => {
        const body = JSON.parse(String(init?.body)) as { query: string };
        if (body.query.includes("productVariantsBulkUpdate")) {
          return new Response(
            JSON.stringify({
              data: {
                productVariantsBulkUpdate: {
                  product: null,
                  productVariants: null,
                  userErrors: [{ field: ["variants", "0", "price"], message: "price is invalid" }],
                },
              },
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        }
        return new Response(
          JSON.stringify({
            data: { productUpdate: { product: { id: remote.id }, userErrors: [] } },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }) as typeof fetch;
      try {
        await assert.rejects(
          () => applyProduct({ domain: "x", token: "y", source: "static" }, product, remote),
          /product fields were written to gid:\/\/shopify\/Product\/15107230335021/,
        );
      } finally {
        globalThis.fetch = original;
      }
    });

    it("does not dereference a null product into a TypeError", async () => {
      const original = globalThis.fetch;
      globalThis.fetch = (async () =>
        new Response(
          JSON.stringify({ data: { productUpdate: { product: null, userErrors: [] } } }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        )) as typeof fetch;
      try {
        await assert.rejects(
          () => applyProduct({ domain: "x", token: "y", source: "static" }, product, remote),
          /returned no product for sku-001/,
        );
      } finally {
        globalThis.fetch = original;
      }
    });
  });
});
