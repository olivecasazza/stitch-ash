import assert from "node:assert/strict";
import test from "node:test";

import * as validationUtils from "../../graphql/validation/utils";

/**
 * `graphql/validation/*.ts` are compiled by Nuxt, which injects the sibling
 * exports as auto-imports; under bare `node --test` they are just unbound
 * identifiers and importing the module throws `ReferenceError`. Publish the
 * same names globally first, then import the module under test dynamically —
 * a static import would be hoisted above these assignments. This exercises the
 * real zod schemas rather than re-parsing the source text.
 */
for (const [name, value] of Object.entries(validationUtils)) {
  (globalThis as Record<string, unknown>)[name] = value;
}

const {
  productSortKeysSchema,
  productListInputSchema,
  rootProductSortKeysSchema,
} = await import("../../graphql/validation/product");

/**
 * STI-579 regression tests.
 *
 * The defect this pins: `/` and `/products` read the whole catalog with the
 * ROOT `products(first:)` field, which takes `ProductSortKeys`. The collection
 * enum is a DIFFERENT set that happens to look like a superset, so reusing it
 * lets a value zod accepts reach the API, where it fails with
 * "Variable $sortKey of type ProductSortKeys was provided invalid value" —
 * an error that only exists once the request reaches Shopify.
 *
 * `CREATED` is the trap. It is a real member of `ProductCollectionSortKeys`,
 * and it is NOT a member of the root `ProductSortKeys`, which spells the same
 * idea `CREATED_AT`. Copying the collection list and adding the three root-only
 * members therefore looks right, passes review, and is wrong by exactly one
 * value.
 *
 * Both sets below were read from the live Storefront API by introspection on
 * 2026-09-29, not copied from a schema file:
 *
 *   { __type(name: "ProductSortKeys")            { enumValues { name } } }
 *   { __type(name: "ProductCollectionSortKeys") { enumValues { name } } }
 */

const ROOT_SORT_KEYS = [
  "BEST_SELLING",
  "CREATED_AT",
  "ID",
  "PRICE",
  "PRODUCT_TYPE",
  "RELEVANCE",
  "TITLE",
  "UPDATED_AT",
  "VENDOR",
];

const COLLECTION_ONLY_SORT_KEYS = ["COLLECTION_DEFAULT", "MANUAL", "CREATED"];

test("the root sort-key enum is exactly what the live API accepts", () => {
  assert.deepEqual([...rootProductSortKeysSchema.options].sort(), [...ROOT_SORT_KEYS].sort());
});

test("the collection-only members are rejected before the request is sent", () => {
  // This is the assertion the STI-579 change first got wrong: it listed
  // CREATED, which zod accepted and Shopify rejected.
  for (const key of COLLECTION_ONLY_SORT_KEYS) {
    assert.equal(
      rootProductSortKeysSchema.safeParse(key).success,
      false,
      `${key} is a ProductCollectionSortKeys member, not a root ProductSortKeys member`,
    );
  }
});

test("the root-only members are rejected by the collection enum", () => {
  // The two enums are not nested. Guarding only one direction would let a
  // future edit collapse them in the other.
  for (const key of ["CREATED_AT", "PRODUCT_TYPE", "VENDOR"]) {
    assert.equal(
      productSortKeysSchema.safeParse(key).success,
      false,
      `${key} is a root ProductSortKeys member, not a ProductCollectionSortKeys member`,
    );
  }
});

test("the collection enum still accepts its own members", () => {
  // The collection route already works in production; the fix must not narrow
  // the enum it depends on.
  for (const key of [...COLLECTION_ONLY_SORT_KEYS, "BEST_SELLING", "PRICE", "TITLE", "ID", "RELEVANCE", "UPDATED_AT"]) {
    assert.equal(productSortKeysSchema.safeParse(key).success, true, key);
  }
});

test("the root list input carries localization, so @inContext is not handed nulls", () => {
  // `collectionInputSchema` extends `localizationParamsSchema` for exactly
  // this. Without it the `@inContext(language:, country:)` directive on the
  // `/` and `/products` queries would bind null and quietly serve the wrong
  // market's money.
  const parsed = productListInputSchema.parse({
    first: 4,
    sortKey: "TITLE",
    reverse: false,
    language: "EN",
    country: "US",
  });
  assert.equal(parsed.language, "EN");
  assert.equal(parsed.country, "US");
  assert.equal(parsed.sortKey, "TITLE");
});

test("a collection-only sort key cannot reach the root list input", () => {
  assert.equal(
    productListInputSchema.safeParse({ first: 4, sortKey: "COLLECTION_DEFAULT" }).success,
    false,
  );
});
