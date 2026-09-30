import assert from "node:assert/strict";
import test from "node:test";

import { resolvePdpResolution, resolveSizeValues, resolveVariantId } from "../../app/utils/pdp-product";

/**
 * Regression tests for the PDP provenance defect (STI-579 follow-on).
 *
 * The defect this pins: STI-579 moved `/` and `/products` onto the live
 * Storefront API but left the PDP behind. `app/pages/product/[handle].vue`
 * threw
 *
 *     if (!staticProduct.value) throw createError({ statusCode: 404 })
 *
 * BEFORE it ever queried Shopify. So `app/data/products.ts` — a hardcoded
 * TypeScript array — was the authority on which product URLs exist on a live,
 * sellable store.
 *
 * Why that is not a cosmetic bug: the three handles in the static array
 * (`sku-001`, `sku-002`, `sku-003`) happen to match the live store today, so
 * nothing is broken right now. The store's catalog is owned by Shopify Admin,
 * not by this repo. The first product added through Admin — a new SKU, a
 * seasonal drop — would be live, sellable, listed by the Storefront API, and
 * simultaneously 404 on its own product page. The failure would appear at the
 * moment of a launch, from a code path no test covered.
 *
 * Read live during this work (Storefront API, `products(first: 50)`, HTTP 200):
 * the store returned exactly the three handles the static array hardcodes.
 * That equality is a coincidence of history, not an invariant, and nothing in
 * the codebase enforced it.
 */

test("a product Shopify returns is live, even with no static entry", () => {
  assert.equal(
    resolvePdpResolution({ hasShopifyProduct: true, hasStaticProduct: false }),
    "live",
    "Shopify must be able to serve a product the static array has never heard of",
  );
});

test("Shopify wins when both sources have the product", () => {
  assert.equal(resolvePdpResolution({ hasShopifyProduct: true, hasStaticProduct: true }), "live");
});

test("a static-only product still renders as the pre-launch preview", () => {
  assert.equal(
    resolvePdpResolution({ hasShopifyProduct: false, hasStaticProduct: true }),
    "preview",
    "the pre-launch fallback must keep working — this is what backs the mock-era pages",
  );
});

test("only a handle neither source knows is a 404", () => {
  assert.equal(resolvePdpResolution({ hasShopifyProduct: false, hasStaticProduct: false }), "not_found");
});

test("size values come from Shopify variants when there is a real choice", () => {
  assert.deepEqual(resolveSizeValues({ variantTitles: ["S", "M", "L"], staticLabels: ["STALE"] }), ["S", "M", "L"]);
});

test("a single \"Default Title\" variant is not a size choice", () => {
  // Shopify's placeholder for a single-variant product. Counting it would give
  // a one-variant product two "sizes" and render a size picker it does not
  // have.
  assert.deepEqual(resolveSizeValues({ variantTitles: ["Default Title"], staticLabels: [] }), ["One size"]);
});

test("a real single size is preserved rather than flattened", () => {
  assert.deepEqual(resolveSizeValues({ variantTitles: ["One size"], staticLabels: [] }), ["One size"]);
});

test("static labels remain the fallback when Shopify exposes no titles", () => {
  assert.deepEqual(resolveSizeValues({ variantTitles: [], staticLabels: ["S", "M"] }), ["S", "M"]);
});

test("an unreadable size falls back rather than rendering an empty picker", () => {
  assert.deepEqual(resolveSizeValues({ variantTitles: ["  "], staticLabels: [] }), ["One size"]);
});

const SIZED = [
  { id: "gid://variant/1", title: "S", availableForSale: true },
  { id: "gid://variant/2", title: "M", availableForSale: true },
  { id: "gid://variant/3", title: "XXL", availableForSale: false },
];

test("the selected size selects that size's variant, not the first one", () => {
  // The money bug. Taking "first available variant" regardless of the
  // selection means a customer who picks XXL is served S.
  assert.equal(resolveVariantId({ variants: SIZED, selectedSize: "M" }), "gid://variant/2");
});

test("a selected size that is sold out does not silently become another size", () => {
  // Still the customer's chosen variant; the page renders the sold-out state.
  assert.equal(resolveVariantId({ variants: SIZED, selectedSize: "XXL" }), "gid://variant/3");
});

test("no selection falls back to the first purchasable variant", () => {
  assert.equal(resolveVariantId({ variants: SIZED }), "gid://variant/1");
});

test("a size the store does not spell the same way falls back instead of returning nothing", () => {
  assert.equal(resolveVariantId({ variants: SIZED, selectedSize: "2XL" }), "gid://variant/1");
});

test("no variants means no cart id", () => {
  assert.equal(resolveVariantId({ variants: [] }), null);
  assert.equal(resolveVariantId({ variants: [{ id: null, title: "S" }] }), null);
});

test("an entirely sold-out product still resolves so the page can say so", () => {
  const soldOut = [{ id: "gid://variant/9", title: "S", availableForSale: false }];
  assert.equal(resolveVariantId({ variants: soldOut, selectedSize: "S" }), "gid://variant/9");
});
