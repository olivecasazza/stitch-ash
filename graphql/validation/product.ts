import { z } from 'zod'

export const productFilterSchema = z.object({
    available: z.boolean().optional(),
    category: categoryFilterSchema.optional(),
    price: priceRangeFilterSchema.optional(),
    productMetafield: metafieldFilterSchema.optional(),
    productType: z.string().optional(),
    productVendor: z.string().optional(),
    tag: z.string().optional(),
    taxonomyMetafield: taxonomyMetafieldFilterSchema.optional(),
    variantMetafield: metafieldFilterSchema.optional(),
    variantOption: variantOptionFilterSchema.optional(),
}).array()

export const productSortKeysSchema = z.enum([
    'BEST_SELLING',
    'COLLECTION_DEFAULT',
    'CREATED',
    'ID',
    'MANUAL',
    'PRICE',
    'RELEVANCE',
    'TITLE',
    'UPDATED_AT',
])

// STI-579: the two enums are different sets, and using the wrong one fails at
// the API rather than here. The ROOT `ProductSortKeys` and the
// `ProductCollectionSortKeys` on `collection.products(...)` share only six
// members; each also has members the other does not.
//
// `productSortKeysSchema` above is the collection enum, so its
// `COLLECTION_DEFAULT` / `MANUAL` / `CREATED` members are correct there and
// stay. This is the root enum used by `/` and `/products`.
//
// Verified by introspection against the live Storefront API rather than by
// reading a schema file (2026-09-29):
//
//   { __type(name: "ProductSortKeys")            { enumValues { name } } }
//   { __type(name: "ProductCollectionSortKeys") { enumValues { name } } }
//
//   ProductSortKeys:            BEST_SELLING CREATED_AT ID PRICE PRODUCT_TYPE
//                              RELEVANCE TITLE UPDATED_AT VENDOR
//   ProductCollectionSortKeys:  BEST_SELLING COLLECTION_DEFAULT CREATED ID
//                              MANUAL PRICE RELEVANCE TITLE
//
// `CREATED` is the member that most looks like a typo but is not: it is real,
// on the COLLECTION enum only. The root enum spells the same idea
// `CREATED_AT`. Shipping the collection set here would let zod pass
// `COLLECTION_DEFAULT` and then fail at the API with "Variable $sortKey of type
// ProductSortKeys was provided invalid value" — a request that only errors once
// it reaches Shopify, and only for the value nobody tried until someone did.
export const rootProductSortKeysSchema = z.enum([
    'BEST_SELLING',
    'CREATED_AT',
    'ID',
    'PRICE',
    'PRODUCT_TYPE',
    'RELEVANCE',
    'TITLE',
    'UPDATED_AT',
    'VENDOR',
])

export const productConnectionParamsSchema = connectionParamsSchema.extend({
    sortKey: productSortKeysSchema.optional(),
    reverse: z.boolean().optional(),
    filters: z.array(productFilterSchema).optional(),
})

export const productInputSchema = z.object({
    handle: z.string(),
    selectedOptions: z.array(z.object({
        name: z.string(),
        value: z.string(),
    })).optional(),
}).extend(localizationParamsSchema.shape)

// STI-579: `/` and `/products` query the whole catalog with the ROOT
// `products(first:)` field, which takes `ProductSortKeys` and no `filters`.
// `productConnectionParamsSchema` alone has no language/country, so the
// `@inContext` directive on those queries would silently receive null — the
// localization half mirrors `collectionInputSchema` in ./collection.ts.
export const productListInputSchema = connectionParamsSchema.extend({
    sortKey: rootProductSortKeysSchema.optional(),
    reverse: z.boolean().optional(),
}).extend(localizationParamsSchema.shape)
