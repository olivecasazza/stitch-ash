<script setup lang="ts">
import { PRODUCTS } from '~/data/products'
import { specSections, specSummary } from '~/utils/product-specs'
import { withoutPlaceholderSizes } from '~/utils/size-labels'

/**
 * STI-241: the full-capsule listing, shared by every URL that means
 * "show me everything we sell".
 *
 * One component, four routes:
 *   /products          — the canonical listing (header nav "Shop")
 *   /collections       — Shopify's plural collection index
 *   /collections/all   — Shopify's "all products" pseudo-collection
 *   /shop              — the word a human types
 *
 * Before this component existed each route had to re-implement the grid, and
 * the three that did not exist 404'd. The GM review on STI-241 caught
 * /collections/all and /shop still returning 404 after /products shipped.
 *
 * The data source is the Storefront API, the same query `app/pages/products.vue`
 * used before this component was extracted. `PRODUCTS` from `~/data/products`
 * is not a second source of truth for which products exist (STI-579 moved
 * this listing off it for exactly that reason) — it is consulted only for the
 * fact sections of a handle Shopify has no `descriptionHtml` for, so a
 * pre-launch row still states facts instead of only a name.
 *
 * `sortKey: 'TITLE'` is the ordering the static array already had and is one
 * of the nine values the ROOT `ProductSortKeys` enum accepts. `COLLECTION_DEFAULT`
 * is a `ProductCollectionSortKeys` value and the ROOT schema rejects it.
 *
 * There is no photography, so the listing is an index: hairline-ruled rows of
 * name, price, size range and spec values. No card grid, no label line above
 * the heading — the route's `title` is the visible flush-left <h2>.
 */
const props = defineProps<{
  /** <title> for this route, e.g. "Shop" or "All products". Also the visible
   *  flush-left <h2> above the index — the listing names itself. */
  title: string
}>()

const { shopify: { shopName } } = useAppConfig()
const { locale } = useI18n()

const key = computed(() => `all-products-${locale.value}`)

/* `nodes` is selected alongside the shared connection fragment rather than by
 * editing it — `graphql/fragments/product.ts` is used by four other
 * listings, and this query needs one field they do not. */

const { data: connection, status } = await useStorefrontData(key, `#graphql
  query FetchAllProducts(
      $first: Int,
      $sortKey: ProductSortKeys,
      $reverse: Boolean,
      $language: LanguageCode,
      $country: CountryCode
  )
  @inContext(language: $language, country: $country) {
    products(first: $first, sortKey: $sortKey, reverse: $reverse) {
      nodes {
        ...ProductFields
        descriptionHtml
      }
      ...ProductConnectionFields
    }
  }
  ${PRODUCT_CONNECTION_FRAGMENT}
  ${IMAGE_FRAGMENT}
  ${PRICE_FRAGMENT}
`, {
  variables: computed(() => productListInputSchema.parse({
    first: 50,
    sortKey: 'TITLE',
    reverse: false,
  })),
  transform: data => data?.products,
  cache: 'long',
})

useSeoMeta({
  title: `${props.title} | ${shopName}`,
  description: 'The full Stitch and Ash capsule — embroidered black on black. Hoodies, lanyards, and stitched patches.',
})

/* The sections a row quotes, in column order: what it is made of, how big it
 * is, what is stitched on it. `specSummary` skips any a product lacks. */
const SPEC_LABELS = ['Material', 'Size', 'Embroidery']

type ProductListItem = NonNullable<NonNullable<typeof connection.value>['nodes']>[number]

/* Sizes come from the size option, because that is what the range in a row's
 * size column states. The placeholder filter lives in `~/utils/size-labels`
 * so every surface that derives a sizes string shares it: Shopify's single
 * `Title` option carries the literal "Default Title", which is a placeholder
 * and would otherwise be printed in the size column. */
function sizeLabels(p: ProductListItem): string[] {
  const option = p.options?.find(o => /size|title/i.test(o.name))
  const values = option?.optionValues?.map(v => v.name) ?? []
  if (values.length) return withoutPlaceholderSizes(values)
  return option?.name ? withoutPlaceholderSizes([option.name]) : []
}

/* Live `descriptionHtml` is the source; when Shopify has none, fall back to the
 * static mirror's sections for the same handle. Both are the same facts, so a
 * pre-launch row reads identically to a live one. */
function rowSpecs(handle: string, html: string | null | undefined): string[] {
  const live = specSections(html)
  const sections = live.length
    ? live
    : (PRODUCTS.find(p => p.handle === handle)?.details ?? [])
  return specSummary(sections, SPEC_LABELS)
}

const products = computed(() => (connection.value?.nodes ?? []).map(p => ({
  ...p,
  sizeLabels: sizeLabels(p),
  specs: rowSpecs(p.handle, p.descriptionHtml),
})))
</script>

<template>
  <main class="wrap">
    <section aria-labelledby="index-h" class="index">
      <h2 id="index-h" class="index__title">{{ title }}</h2>
      <div v-if="products.length" class="index-rows">
        <ProductCard
          v-for="p in products"
          :key="p.id"
          :href="`/product/${p.handle}`"
          :name="p.title"
          :price="p.priceRange?.minVariantPrice?.amount ?? ''"
          :image-src="p.featuredImage?.url"
          :image-alt="p.featuredImage?.altText ?? p.title"
          :sizes="p.sizeLabels"
          :specs="p.specs"
        />
      </div>
      <p v-else-if="status === 'pending'" class="note" role="status" aria-live="polite">
        Loading.
      </p>
      <p v-else class="note">
        Nothing listed yet.
      </p>
    </section>
  </main>
</template>

<style scoped>
/* The index, not a card grid: one column, flush left, hairline-ruled. The
   shared `.index-rows` container in global.css carries the row treatment both
   this listing and the homepage capsule use — a datasheet is one column of
   rows, so there is exactly one of that treatment. */
.index {
  padding-block: var(--space-2xl);
}

.index__title {
  margin: 0 0 var(--space-xl);
  font-size: var(--text-2xl);
  font-weight: 500;
}

</style>
