<script setup lang="ts">

// STI-579: the capsule grid rendered `PRODUCTS` from `app/data/products.ts`.
// It now reads the Storefront API, the same way `/product/[handle]` and
// `/collection/[handle]` already do, so a catalog change in Shopify is what
// changes this page. Capped at 4 so the homepage stays a capsule preview and
// `/products` stays the full listing; `PRODUCTS` is still the pre-launch
// fallback on the PDP and is intentionally not deleted.
//
// `sortKey: 'TITLE'` reproduces the order the static array rendered in. See the
// longer note in `app/pages/products.vue` on why the root `products()` field
// rejects `COLLECTION_DEFAULT`.
const { locale } = useI18n()

const key = computed(() => `home-products-${locale.value}`)

const { data: connection, status } = await useStorefrontData(key, `#graphql
  query FetchHomeProducts(
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
    first: 4,
    sortKey: 'TITLE',
    reverse: false,
  })),
  transform: data => data?.products,
  cache: 'long',
})

const products = computed(() => flattenConnection(connection.value))

useSeoMeta({
  title: 'STITCH AND ASH — Embroidered Apparel',
  description: 'Minimal, embroidered, and black on black. Heavyweight cotton fleece hoodies, double-stitched to last.'
})
</script>

<template>
  <main>
    <!-- HERO -->
    <section class="hero wrap">
      <h1>
        <svg
          class="mark mark--hero"
          viewBox="0 0 700 100"
          preserveAspectRatio="xMidYMid meet"
          style="width: 100%; max-width: 43.75rem;"
          role="img"
          aria-label="STITCH AND ASH"
        >
          <text
            x="350"
            y="72"
            text-anchor="middle"
            font-family="'JetBrains Mono', monospace"
            font-size="76"
            letter-spacing="4"
            font-weight="500"
          >STITCH &amp; ASH</text>
        </svg>
      </h1>
      <p class="tag">
        Minimal, embroidered, and black on black. Heavyweight cotton fleece, double-stitched.
      </p>
    </section>

    <!-- PRODUCTS -->
    <section class="wrap" aria-labelledby="prod-h">
      <h2 class="eyebrow" id="prod-h" style="margin-block-start: clamp(3rem, 6vw, 5rem); margin-block-end: 0">
        The first capsule — embroidered black on black
      </h2>
      <div v-if="products.length" class="products">
        <ProductCard
          v-for="p in products"
          :key="p.id"
          :href="`/product/${p.handle}`"
          :name="p.title"
          :price="p.priceRange?.minVariantPrice?.amount ?? ''"
          :image-src="p.featuredImage?.url"
          :image-alt="p.featuredImage?.altText ?? p.title"
        />
      </div>
      <p v-else-if="status === 'pending'" class="note" role="status" aria-live="polite">
        Loading the capsule…
      </p>
      <p v-else class="note">
        The capsule is being restocked. Check back shortly.
      </p>
    </section>

    <!-- BRAND STATEMENT -->
    <section id="statement" class="statement">
      <div class="wrap measure stack">
        <p class="eyebrow">Brand</p>
        <p>Olive Casazza. Black-on-black embroidery, made to order.</p>
      </div>
    </section>

  </main>
</template>
