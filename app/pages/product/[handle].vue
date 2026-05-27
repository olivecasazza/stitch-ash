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

// 3. Zoom interactive state
const zoomed = ref(false)
const toggleZoom = () => {
  zoomed.value = !zoomed.value
}

// 4. Cart addition via reactive composable
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
    <!-- Preview notice -->
    <div v-if="isPreview" class="pdp__preview-notice" role="status">
      <span>Preview — commerce not yet wired. No checkout available.</span>
    </div>

    <div class="pdp__layout">
      <!-- LEFT: Image gallery (SVG placeholder with cross-hatch + interactive zoom) -->
      <div class="pdp__gallery">
        <div
          class="pdp__image-placeholder"
          :data-zoomed="zoomed ? '' : undefined"
          @click="toggleZoom"
          role="button"
          :aria-label="zoomed ? 'Collapse image' : 'Zoom image'"
          tabindex="0"
          @keydown.enter="toggleZoom"
        >
          <svg
            viewBox="0 0 600 750"
            xmlns="http://www.w3.org/2000/svg"
            :aria-label="`${displayName} — product image coming soon`"
            role="img"
            class="pdp__placeholder-svg"
            :style="zoomed ? { transform: 'scale(1.6)' } : {}"
          >
            <rect width="600" height="750" fill="#0B0B0B" />
            <rect
              x="1"
              y="1"
              width="598"
              height="748"
              fill="none"
              stroke="#C0C0C0"
              stroke-width="1"
              stroke-dasharray="6 6"
              opacity="0.4"
            />
            <!-- Thread-like cross-hatch to suggest embroidery texture -->
            <g stroke="#1A1A1A" stroke-width="1" opacity="0.6">
              <line v-for="i in 20" :key="`h-${i}`" :x1="0" :y1="(i - 1) * 40" :x2="600" :y2="(i - 1) * 40" />
              <line v-for="i in 15" :key="`v-${i}`" :x1="(i - 1) * 42" :y1="0" :x2="(i - 1) * 42" :y2="750" />
            </g>
            <text
              x="300"
              y="360"
              text-anchor="middle"
              dominant-baseline="middle"
              fill="#C0C0C0"
              font-family="Inter, system-ui, sans-serif"
              font-size="13"
              letter-spacing="0.12em"
              opacity="0.5"
            >
              {{ displayName.toUpperCase() }}
            </text>
            <text
              x="300"
              y="385"
              text-anchor="middle"
              dominant-baseline="middle"
              fill="#C0C0C0"
              font-family="Inter, system-ui, sans-serif"
              font-size="10"
              letter-spacing="0.1em"
              opacity="0.35"
            >
              PHOTOGRAPHY COMING SOON
            </text>
          </svg>
          <!-- Zoom hint button -->
          <button
            class="pdp__zoom-btn"
            :aria-label="zoomed ? 'Collapse image' : 'Zoom image'"
            @click.stop="toggleZoom"
          >
            <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
              <circle cx="8" cy="8" r="5.5" />
              <line x1="12.5" y1="12.5" x2="18" y2="18" />
              <line v-if="!zoomed" x1="8" y1="5.5" x2="8" y2="10.5" />
              <line v-if="!zoomed" x1="5.5" y1="8" x2="10.5" y2="8" />
              <line v-if="zoomed" x1="5.5" y1="8" x2="10.5" y2="8" />
            </svg>
          </button>
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
    padding: 0.6rem 0.9rem;
    border: 1px solid color-mix(in srgb, var(--bone) 20%, transparent);
    background: var(--charcoal);
    color: var(--ash-silver);
    font-size: var(--text-sm);
    letter-spacing: 0.04em;
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

  /* Gallery */
  .pdp__gallery {
    position: sticky;
    top: var(--space-3);
  }

  .pdp__image-placeholder {
    position: relative;
    aspect-ratio: 4 / 5;
    overflow: hidden;
    border: 1px solid color-mix(in srgb, var(--ash-silver) 20%, transparent);
    background: var(--ink-black);
    cursor: zoom-in;
    outline: none;
  }

  .pdp__image-placeholder[data-zoomed] {
    cursor: zoom-out;
  }

  .pdp__placeholder-svg {
    width: 100%;
    height: 100%;
    display: block;
    transition: transform var(--transition-slow);
  }

  .pdp__zoom-btn {
    position: absolute;
    bottom: var(--space-2);
    right: var(--space-2);
    background: color-mix(in srgb, var(--ink-black) 80%, transparent);
    border: 1px solid color-mix(in srgb, var(--ash-silver) 30%, transparent);
    color: var(--ash-silver);
    width: 2rem;
    height: 2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: color var(--transition-base), border-color var(--transition-base);
    border-radius: var(--radius-none);
  }

  .pdp__zoom-btn:hover,
  .pdp__zoom-btn:focus-visible {
    color: var(--bone);
    border-color: var(--ash-silver);
  }

  /* Info panel */
  .pdp__info {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .pdp__badges {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    align-items: center;
  }

  .pdp__preview-badge {
    opacity: 0.7;
  }

  .pdp__name {
    margin: 0;
    font-family: var(--font-display);
    font-size: clamp(1.75rem, 3vw + 0.5rem, 2.75rem);
    font-weight: 500;
    letter-spacing: 0.02em;
    line-height: 1.1;
    color: var(--bone);
  }

  .pdp__price {
    margin: 0;
    font-size: var(--text-xl);
    font-weight: 600;
    color: var(--bone);
    letter-spacing: 0.03em;
  }

  .pdp__description {
    margin: 0;
    color: var(--ash-silver);
    line-height: 1.65;
    font-size: var(--text-base);
  }

  .pdp__embroidery-note {
    margin: 0;
    font-size: var(--text-sm);
    color: var(--ash-silver);
    letter-spacing: 0.04em;
    border-inline-start: 2px solid var(--bone);
    padding-inline-start: 0.75rem;
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
