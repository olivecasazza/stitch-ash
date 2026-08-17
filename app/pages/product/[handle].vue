<script setup lang="ts">
import { PRODUCTS } from '~/data/products'

definePageMeta({
  validate: route => typeof route.params.handle === 'string',
})

const route = useRoute()
const handle = computed(() => route.params.handle as string)
const staticProduct = computed(() => PRODUCTS.find(p => p.handle === handle.value))

if (!staticProduct.value) {
  throw createError({
    statusCode: 404,
    statusMessage: `Product not found: ${route.fullPath}`,
  })
}

// 1. Attempt Shopify fetch - fallback gracefully on missing env or errors
const { data, error } = await useStorefrontData(`product-${handle.value}`, `#graphql
  query FetchProduct($handle: String!) {
    product(handle: $handle) {
      id
      title
      description
      variants(first: 50) {
        edges {
          node {
            id
            title
            price {
              amount
              currencyCode
            }
            availableForSale
          }
        }
      }
    }
  }
`, {
  variables: computed(() => ({ handle: handle.value })),
  cache: 'long',
})

const productExistsInShopify = computed(() => !!data.value?.product)
const isPreview = computed(() => !productExistsInShopify.value || !!error.value)

// 2. Resolve display values
const displayName = computed(() => data.value?.product?.title ?? staticProduct.value?.name ?? '')
const displayDescription = computed(() => data.value?.product?.description ?? staticProduct.value?.description ?? '')
const displayPrice = computed(() => {
  const shopifyVariants = data.value?.product?.variants?.edges || []
  const firstPrice = shopifyVariants[0]?.node?.price?.amount
  return firstPrice ? parseFloat(firstPrice).toFixed(0) : staticProduct.value?.price ?? 0
})

const resolvedVariants = computed(() => {
  return (data.value?.product?.variants?.edges || []).map((edge: any) => edge.node)
})

const variantId = computed(() => {
  return resolvedVariants.value.find((v: any) => v.availableForSale)?.id ?? null
})

const hasRealSizes = computed(() => (staticProduct.value?.sizes?.length ?? 0) > 1)
const sizeValues = computed(() => (staticProduct.value?.sizes || []).map(s => s.label))
const selectedSize = ref(sizeValues.value[0] || 'One size')

// 3. Cart addition via reactive composable
const { add: addToCart, open: openCart } = useCart()

const handleAddToCart = async () => {
  if (!variantId.value) return
  await addToCart(variantId.value, 1)
  openCart.value = true
}

useSeoMeta({
  title: computed(() => `${displayName.value} — STITCH AND ASH`),
  description: computed(() => displayDescription.value)
})
</script>

<template>
  <main class="pdp wrap">


    <div class="pdp__layout">
      <!-- LEFT: Image gallery — clean fallback when no Shopify imagery available -->
      <div class="pdp__gallery">
        <div class="pdp__image-fallback">
          <svg
            viewBox="0 0 600 750"
            xmlns="http://www.w3.org/2000/svg"
            :aria-label="`${displayName} — product image coming soon`"
            role="img"
            class="pdp__fallback-svg"
          >
            <rect width="600" height="750" fill="#0B0B0B" />
            <rect x="1" y="1" width="598" height="748" fill="none" stroke="#C0C0C0" stroke-width="1" opacity="0.15" />
          </svg>
        </div>
      </div>

      <!-- RIGHT: Product info + checkout/waitlist -->
      <div class="pdp__info">
        <div class="pdp__badges">
          <Badge variant="made-to-order" />
          <Badge v-if="isPreview" variant="limited-run" class="pdp__preview-badge" />
        </div>

        <h1 class="pdp__name">{{ displayName }}</h1>
        <p class="pdp__price">${{ displayPrice }}</p>

        <p class="pdp__description">{{ displayDescription }}</p>

        <p class="pdp__embroidery-note">{{ staticProduct?.embroideryCopy }}</p>

        <!-- Size configuration swatches -->
        <div class="pdp__size-wrap">
          <SizeSelector v-if="hasRealSizes" :sizes="sizeValues" v-model="selectedSize" />
          <p v-else class="pdp__one-size">
            <span class="pdp__one-size-label">Size</span> One size
          </p>
        </div>

        <!-- Add to cart OR Made to order status CTA -->
        <button
          v-if="variantId"
          class="pdp__atc-btn pdp__atc-btn--primary"
          @click="handleAddToCart"
        >
          Add to cart
        </button>
        <button
          v-else
          class="pdp__atc-btn pdp__atc-btn--disabled"
          disabled
          aria-disabled="true"
        >
          Made to order — coming soon
        </button>

        <!-- Accordions -->
        <div class="pdp__accordion-wrap">
          <DetailsAccordion :sections="staticProduct?.details || []" />
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped>
  .pdp {
    padding-block-start: clamp(2rem, 4vw, 3.5rem);
    padding-block-end: clamp(3rem, 8vw, 6rem);
  }

  .pdp__preview-notice {
    margin-block-end: var(--space-3);
    margin-inline: auto;
    max-width: var(--measure);
    padding: 0.6rem 0.9rem;
    border: 1px solid color-mix(in srgb, var(--bone) 20%, transparent);
    background: var(--charcoal);
    color: var(--ash-silver);
    font-size: var(--text-sm);
    letter-spacing: 0.04em;
    text-align: center;
  }

  .pdp__layout {
    display: grid;
    grid-template-columns: 1fr;
    gap: clamp(2rem, 4vw, 3.5rem);
  }

  @media (min-width: 768px) {
    .pdp__layout {
      grid-template-columns: 1fr 1fr;
      align-items: start;
    }
  }

  /* Gallery — center placeholder within its grid cell on mobile */
  .pdp__gallery {
    position: sticky;
    top: var(--space-3);
    display: flex;
    justify-content: center;
  }

  .pdp__gallery > * {
    width: 100%;
    max-width: 36rem;
  }

  .pdp__image-fallback {
    position: relative;
    aspect-ratio: 4 / 5;
    overflow: hidden;
    background: var(--ink-black);
  }

  .pdp__fallback-svg {
    width: 100%;
    height: 100%;
    display: block;
  }

  /* Info panel — center title and supporting text on mobile,
     switch to left-align on desktop so the price/description read naturally. */
  .pdp__info {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: var(--space-3);
  }

  /* Children that benefit from full width even on mobile (CTAs, accordions) */
  .pdp__size-wrap,
  .pdp__atc-btn,
  .pdp__accordion-wrap {
    align-self: stretch;
    width: 100%;
  }

  @media (min-width: 768px) {
    .pdp__info {
      align-items: stretch;
      text-align: left;
    }
  }

  .pdp__badges {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    align-items: center;
    justify-content: center;
  }

  .pdp__preview-badge {
    opacity: 0.7;
  }

  .pdp__name {
    margin: 0;
    margin-inline: auto;
    max-width: var(--measure);
    font-family: var(--font-display);
    font-size: clamp(1.75rem, 3vw + 0.5rem, 2.75rem);
    font-weight: 500;
    letter-spacing: 0.02em;
    line-height: 1.1;
    color: var(--bone);
    text-align: center;
  }

  .pdp__price {
    margin: 0;
    font-size: var(--text-xl);
    font-weight: 600;
    color: var(--bone);
    letter-spacing: 0.03em;
  }

  .pdp__embroidery-note {
    margin: 0;
    margin-inline: auto;
    max-width: var(--measure);
    font-size: var(--text-sm);
    color: var(--ash-silver);
    letter-spacing: 0.04em;
    border-inline-start: 2px solid var(--bone);
    padding-inline-start: 0.75rem;
    text-align: left;
  }

  .pdp__description {
    margin: 0;
    margin-inline: auto;
    max-width: var(--measure);
    color: var(--ash-silver);
    line-height: 1.65;
    font-size: var(--text-base);
    text-align: left;
  }

  .pdp__one-size {
    margin: 0;
    font-size: var(--text-sm);
    color: var(--bone);
  }

  .pdp__one-size-label {
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--ash-silver);
    margin-inline-end: 0.5ch;
  }

  .pdp__atc-btn {
    width: 100%;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font: inherit;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    padding: 0.8rem 1.5rem;
    cursor: pointer;
    border-radius: var(--radius-none);
    transition: background var(--transition-base), border-color var(--transition-base), color var(--transition-base);
  }

  .pdp__atc-btn--primary {
    background: #000000;
    color: var(--bone);
    border: 1px solid var(--bone);
  }

  .pdp__atc-btn--primary:hover,
  .pdp__atc-btn--primary:focus-visible {
    background: var(--bone);
    color: #000000;
    border-color: var(--bone);
    outline: none;
  }

  .pdp__atc-btn--disabled {
    background: transparent;
    border: 1px solid #222222;
    color: var(--ash-silver);
    opacity: 0.5;
    cursor: not-allowed;
  }

  .pdp__accordion-wrap {
    margin-block-start: var(--space-1);
  }
</style>
