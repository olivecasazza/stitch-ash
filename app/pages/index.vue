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
    <!-- HERO — the sheet's title block. Flush left, page-sized wordmark. -->
    <section class="hero wrap">
      <h1 class="hero__mark">
        <svg
          class="mark"
          viewBox="0 0 700 100"
          preserveAspectRatio="xMinYMid meet"
          role="img"
          aria-label="STITCH AND ASH"
        >
          <text
            x="0"
            y="72"
            text-anchor="start"
            font-family="'JetBrains Mono', monospace"
            font-size="73"
            letter-spacing="4"
            font-weight="500"
          >STITCH &amp; ASH</text>
        </svg>
      </h1>
      <ul class="hero__facts">
        <li>Black on black.</li>
        <li>Embroidered.</li>
        <li>Heavyweight cotton fleece.</li>
        <li>Double-stitched.</li>
        <li>Made to order.</li>
      </ul>
    </section>

    <!-- PRODUCTS — the index itself. Heading is sr-only: the grid is the
         heading, and no label line sits above it. -->
    <section class="wrap products-section" aria-labelledby="prod-h">
      <h2 id="prod-h" class="sr-only">The first capsule</h2>
      <div v-if="products.length" class="index-rows">
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
        Loading the capsule.
      </p>
      <p v-else class="note">
        Capsule restocking. Check back shortly.
      </p>
    </section>

    <!-- BRAND STATEMENT — approved copy, set flush left in the measure.
         The hairline and the space above it do the separating; no band. -->
    <section id="statement" class="statement">
      <div class="wrap measure">
        <p>Black cotton, black thread, one pair of hands. Embroidery is the point.</p>
      </div>
    </section>
  </main>
</template>

<style scoped>
/* ─── Title block ──────────────────────────────────────────────────────── */

/* `.hero` is centred globally; the sheet's opening is flush left. */
.hero {
  padding-block: var(--space-4xl) var(--section-lg);
  border-block-end: var(--rule);
  text-align: start;
}

.hero__mark {
  margin: 0;
  font-weight: 500;
}

/* The SVG viewBox is `0 0 700 100`, so the shopper sees
   `font-size x (renderedWidth / 700)`. `font-size` here is a presentation
   attribute in user units, never a CSS declaration, so it cannot resolve
   through tokens.css: 73 user units at a 24rem (384px) box renders at
   73 x (384 / 700) ~= 40px, the `text-3xl` page-heading step. Declared
   width is capped so the size cannot drift under the type floor. */
.hero__mark svg {
  display: block;
  width: 24rem;
  max-width: 100%;
  height: auto;
}

/* The old tagline was a ragged three-line sentence. It is now five fact
   lines, one per row, flush left, no ragged wrap and nothing invented. */
.hero__facts {
  margin: var(--space-xl) 0 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: var(--space-xs);
  font-size: var(--text-lg);
  line-height: 1.5;
  color: var(--grey-200);
}

/* ─── The index ────────────────────────────────────────────────────────── */

.products-section {
  padding-block: var(--section-lg) var(--section-md);
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
}

.note {
  font-size: var(--text-base);
  color: var(--grey-400);
}

/* ─── Statement ────────────────────────────────────────────────────────── */

/* Hairline on top, space below the grid; the filled band and the `.eyebrow`
   label are gone, so nothing here is decoration. */
.statement {
  border-block-start: var(--rule);
  padding-block: var(--section-lg) var(--section-xl);
  text-align: start;
}

.statement p {
  margin: 0;
  font-size: var(--text-2xl);
  line-height: 1.4;
  letter-spacing: -0.01em;
  color: var(--bone);
}
</style>
