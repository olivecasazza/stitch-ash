<script setup lang="ts">
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
 * used before this component was extracted — `PRODUCTS` from `~/data/products`
 * is deliberately NOT used here. That static array is the pre-launch editorial
 * fallback (STI-579 moved this listing off it for exactly that reason), and
 * re-introducing it here would make these three new routes a second source of
 * truth for which products exist.
 *
 * `sortKey: 'TITLE'` is the ordering the static array already had and is one
 * of the nine values the ROOT `ProductSortKeys` enum accepts. `COLLECTION_DEFAULT`
 * is a `ProductCollectionSortKeys` value and the ROOT schema rejects it.
 */
const props = defineProps<{
  /** Eyebrow line above the grid. */
  eyebrow: string
  /** <title> for this route, e.g. "Shop" or "All products". */
  title: string
}>()

const { shopify: { shopName } } = useAppConfig()
const { locale } = useI18n()

const key = computed(() => `all-products-${locale.value}`)

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

const products = computed(() => flattenConnection(connection.value))
</script>

<template>
  <main class="wrap">
    <section aria-labelledby="shop-h">
      <p class="eyebrow" id="shop-h" style="margin-block-start: clamp(2rem, 4vw, 3rem)">
        {{ eyebrow }}
      </p>
      <div v-if="products.length" class="products">
        <ProductCard
          v-for="p in products"
          :key="p.id"
          :href="`/product/${p.handle}`"
          :name="p.title"
          :price="p.priceRange?.minVariantPrice?.amount ?? ''"
          :image-src="p.featuredImage?.url"
          :image-alt="p.featuredImage?.altText ?? p.title"
          :handle="p.handle"
        />
      </div>
      <p v-else-if="status === 'pending'" class="note" role="status" aria-live="polite">
        Loading the capsule…
      </p>
      <p v-else class="note">
        Nothing in the capsule right now. Check back shortly.
      </p>
    </section>
  </main>
</template>
