<script setup lang="ts">
// STI-579: this page rendered `PRODUCTS` from `app/data/products.ts`, a static
// array that happened to hold the same three handles as the live catalog. It
// now reads the Storefront API, the same way `/product/[handle]` and
// `/collection/[handle]` already do, so a catalog change in Shopify is what
// changes this page.
//
// `PRODUCTS` is deliberately NOT deleted: `/product/[handle]` still uses it as
// the pre-launch fallback for editorial copy and accordions that Shopify does
// not model. This page just stops being a second source of truth for which
// products exist.
//
// `sortKey: 'TITLE'` is the ordering the static array already had (Hoodie,
// Lanyard, Sticker) and is one of the nine values the ROOT `ProductSortKeys`
// enum accepts. Shopify's unsorted default returns the products in id order
// (sku-002, sku-003, sku-001), which is a different page than the one this
// route replaced. STI-579: `COLLECTION_DEFAULT` is a `ProductCollectionSortKeys`
// value and is rejected here — see `rootProductSortKeysSchema` in
// graphql/validation/product.ts.
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
  title: 'Shop — STITCH AND ASH',
  description: 'The full Stitch and Ash capsule — embroidered black on black. Hoodies, lanyards, and stitched patches.',
})

const products = computed(() => flattenConnection(connection.value))
</script>

<template>
  <main class="wrap">
    <section aria-labelledby="shop-h">
      <p class="eyebrow" id="shop-h" style="margin-block-start: clamp(2rem, 4vw, 3rem)">
        Shop — the full capsule
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
