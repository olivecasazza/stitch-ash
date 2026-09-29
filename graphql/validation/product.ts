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

// STI-579: `COLLECTION_DEFAULT` and `MANUAL` are `ProductCollectionSortKeys`
// members only. Shopify's ROOT `ProductSortKeys` enum is TITLE, PRODUCT_TYPE,
// VENDOR, UPDATED_AT, CREATED_AT, BEST_SELLING, PRICE, ID, RELEVANCE — a
// strictly smaller set. `productSortKeysSchema` above is shared with
// `collection.products(...)`, where the superset is correct, so it stays as it
// is; this is the root-level list enum. Passing `COLLECTION_DEFAULT` to a root
// `products()` query passes zod here and then fails at the API with
// "Variable $sortKey of type ProductSortKeys was provided invalid value".
export const rootProductSortKeysSchema = z.enum([
    'BEST_SELLING',
    'CREATED',
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
