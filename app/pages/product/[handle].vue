<script setup lang="ts">
import { PRODUCTS } from '~/data/products'
import { resolveNotFoundCopy } from '~/utils/not-found'
import { resolvePdpResolution, resolveSizeValues, resolveVariantId } from '~/utils/pdp-product'

definePageMeta({
  validate: route => typeof route.params.handle === 'string',
})

const route = useRoute()
const handle = computed(() => route.params.handle as string)
const staticProduct = computed(() => PRODUCTS.find(p => p.handle === handle.value))

const { t } = useI18n()
const notFoundCopy = resolveNotFoundCopy({ resource: 'product', translate: t })

const carousel = useTemplateRef('carousel')

// 1. Attempt Shopify fetch - fallback gracefully on missing env or errors
const { data, error } = await useStorefrontData(`product-${handle.value}`, `#graphql
  query FetchProduct($handle: String!) {
    product(handle: $handle) {
      id
      title
      description
      images(first: 20) {
        edges {
          node {
            id
            url
            altText
            width
            height
          }
        }
      }
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
            image {
              id
              url
              altText
              width
              height
            }
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

// STI-579 follow-on: this gate used to sit ABOVE the Shopify query, which made
// the hardcoded `PRODUCTS` array the authority on which product URLs exist. A
// product added through Shopify Admin — a new SKU, a seasonal drop — would be
// live and sellable everywhere else and 404 on its own PDP. Shopify answers
// first; the static array is enrichment/preview only, never the gate.
// A store error is NOT proof of absence, so it cannot 404 — it falls through to
// the preview badge and whatever data we have.
// See app/utils/pdp-product.ts and src/catalog/pdp-provenance.test.ts.
const resolution = resolvePdpResolution({
  hasShopifyProduct: productExistsInShopify.value,
  hasStaticProduct: Boolean(staticProduct.value),
})

if (resolution === 'not_found') {
  // STI-444: no `fatal: true`, matching the sibling collection/blog routes —
  // it makes nitro's prod handler replace the real message with "Server Error".
  //
  // STI-556: this route also hardcoded the English "Product not found" instead
  // of the `error.product` key the other three routes translate, and it
  // interpolated `route.fullPath` into what the customer reads. Both are fixed
  // by resolving the string through the shared not-found copy.
  throw createError({
    statusCode: 404,
    statusMessage: notFoundCopy.statusText,
    message: notFoundCopy.statusText,
  })
}

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

const sizeValues = computed(() =>
  resolveSizeValues({
    variantTitles: resolvedVariants.value.map((v: any) => v?.title),
    staticLabels: (staticProduct.value?.sizes || []).map(s => s.label),
  }),
)

const hasRealSizes = computed(() => sizeValues.value.length > 1)

const selectedSize = ref(sizeValues.value[0] || 'One size')

// Keep the selection valid when the option list changes under it.
watch(sizeValues, sizes => {
  if (!sizes.includes(selectedSize.value)) selectedSize.value = sizes[0] || 'One size'
})

// The selected size must select THAT variant. Taking the first purchasable
// variant regardless of the selection silently served the wrong size — a
// customer picking XXL was sent the S. See resolveVariantId's test.
const variantId = computed(() =>
  resolveVariantId({
    variants: resolvedVariants.value,
    selectedSize: hasRealSizes.value ? selectedSize.value : null,
  }),
)

const productImages = computed(() => {
  if (!data.value?.product?.images?.edges?.length) return []
  return data.value.product.images.edges.map((edge: any) => edge.node)
})

const selectedVariant = computed(() => {
  if (!resolvedVariants.value.length) return null
  return resolvedVariants.value.find((v: any) => v.availableForSale) ?? resolvedVariants.value[0]
})

watch(selectedVariant, () => (carousel.value as any)?.emblaApi?.scrollTo(0))

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
      <!-- LEFT: Image gallery -->
      <div class="pdp__gallery">
        <ProductGallery
          v-if="productImages.length"
          ref="carousel"
          :product="({ images: { edges: productImages.map((img: any) => ({ node: img })) } }) as any"
          :selected-variant="selectedVariant"
          :thumbnails="true"
        />
      </div>

      <!-- RIGHT: Product info + checkout -->
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

        <!-- Add to cart OR notify-me CTA -->
        <button
          v-if="variantId"
          class="pdp__atc-btn pdp__atc-btn--primary"
          @click="handleAddToCart"
        >
          Add to cart
        </button>
        <NotifyMeBtn v-else :handle="handle" />

        <!-- The page had a single H1 and no subheads, so the accordion read as
             orphaned content to a screen reader. A visually-hidden H2 gives the
             detail panels a place in the outline without moving a pixel. -->
        <h2 class="pdp__section-heading">Details</h2>
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
    margin-block-end: var(--space-xl);
    margin-inline: auto;
    max-width: var(--measure);
    padding: var(--space-md) var(--space-lg);
    border: 1px solid color-mix(in srgb, var(--bone) 20%, transparent);
    background: var(--charcoal);
    color: var(--grey-400);
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
    top: var(--space-xl);
    display: flex;
    justify-content: center;
  }

  .pdp__gallery > * {
    width: 100%;
    max-width: 36rem;
  }

  /* STI-541: `.pdp__image-fallback`, `.pdp__fallback-svg` and the
     `.pdp__plate-*` rules were this page's private copy of the product image
     no longer ship different art from the product card beside it. */

  /* Info panel — center title and supporting text on mobile,
     switch to left-align on desktop so the price/description read naturally. */
  .pdp__info {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: var(--space-xl);
  }

  /* Screen-reader-only: gives the accordion panels a heading level in the
     document outline without occupying layout. */
  .pdp__section-heading {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
    border: 0;
  }

  /* Children that benefit from full width even on mobile (CTAs, accordions) */
  .pdp__size-wrap,
  .pdp__atc-btn,
  .pdp__accordion-wrap {
    align-self: stretch;
    width: 100%;
  }

  .pdp__badges {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-xs);
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
    text-wrap: balance;
  }

  /* components.price — textColor colors.grey-200, typography.numeric
     (500 / 0.8125rem / 1.4 / 0em / 'tnum' 1) with the --text-xl step (500 /
     1.25rem / 1.15 / 0em) for the PDP's display-sized price. Shipped 600,
     --bone and 0.03em: 600 is a weight the ramp never declares (400 or 500,
     nothing else), --bone is components.card.textColor, and 0.03em is on no
     step (STI-515 F1). STI-486 recorded this selector as card-only; the split
     "$" span was the only card defect that happened not to be a defect here,
     so the token drift on this element was never fixed. */
  .pdp__price {
    margin: 0;
    font-size: var(--text-xl);
    line-height: 1.15;
    font-weight: 500;
    color: var(--grey-200);
    letter-spacing: 0em;
    font-feature-settings: "tnum" 1;
  }

  .pdp__embroidery-note {
    margin: 0;
    margin-inline: auto;
    max-width: var(--measure);
    font-size: var(--text-sm);
    color: var(--grey-400);
    letter-spacing: 0.04em;
    border-inline-start: 2px solid var(--bone);
    padding-inline-start: var(--space-md);
    text-align: left;
  }

  .pdp__description {
    margin: 0;
    margin-inline: auto;
    max-width: var(--measure);
    color: var(--grey-400);
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
    color: var(--grey-400);
    margin-inline-end: 0.5ch;
  }

  /* components.button-primary / components.button-disabled — white fill, ink
     text, typography.label (500 / 0.6875rem / 1.3 / 0.12em), rounded.none,
     padding 12px 16px. Shipped 600 / 0.08em, the same pair STI-486 fixed on
     .btn-primary and .signup button; this button was missed because the
     primary-CTA style is not in global.css (STI-515 F2). The page's body
     stylesheet sets `font: inherit`, so without the label step the button
     inherited the PDP's base weight and size — both off-token. */
  .pdp__atc-btn {
    width: 100%;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font: inherit;
    font-family: var(--font-body);
    font-size: var(--text-xs);
    font-weight: 500;
    line-height: 1.3;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    padding: var(--space-md) var(--space-lg);
    cursor: pointer;
    border-radius: 0;
    transition: background var(--transition-base), border-color var(--transition-base), color var(--transition-base);
  }

  /* DESIGN.md button-primary: white fill, ink text, square, 12px 16px padding.
     Rest state was ink-black fill with a bone hairline — the hover colors.
     Swap is 21:1 (ink #000 on white #FFF), passing WCAG AA. */
  .pdp__atc-btn--primary {
    background: var(--white);
    color: var(--ink-black);
    border: 1px solid var(--white);
  }

  /* DESIGN.md: 100ms background swap to grey-200 on hover. No fill inversion. */
  .pdp__atc-btn--primary:hover {
    background: var(--grey-200);
    color: var(--ink-black);
    border-color: var(--grey-200);
  }

  /* components.focus-ring — 2px stroke, 4px offset (STI-578). */
  .pdp__atc-btn--primary:focus-visible {
    background: var(--white);
    color: var(--ink-black);
    border-color: var(--white);
    outline: 2px solid var(--focus);
    outline-offset: 4px;
  }

  /* DESIGN.md button-disabled: primary border, grey-400 text, no fill.
     Rest state was a solid white fill — indistinguishable from the primary CTA. */
  .pdp__atc-btn--disabled {
    background: transparent;
    color: var(--grey-400);
    border: 1px solid var(--primary);
    cursor: not-allowed;
  }

  .pdp__accordion-wrap {
    margin-block-start: var(--space-sm);
  }

  /* Info panel at >=768px — left-align the whole column, so the price and
     description read naturally, as the comment above `.pdp__info` states.

     STI-501: this media query must stay LAST in this style block. It resets
     `.pdp__info`, `.pdp__name` and `.pdp__badges`, but a media query adds no
     specificity — `[data-v-*]` on all three rules is identical, so a base rule
     for the same property that appears LATER in source order wins. The base
     `.pdp__name` (margin-inline: auto, text-align: center) and `.pdp__badges`
     (justify-content: center) rules are declared further up, so an override
     placed beside `.pdp__info` was silently clobbered by them: the title and
     badge row stayed centre-aligned at 1440x900 and 820x1180 while everything
     else inherited `text-align: left`. Keep the overrides after every base
     rule for the properties they set.

     Mobile (<768px) is deliberately untouched: centring remains the intended
     treatment there. */
  @media (min-width: 768px) {
    .pdp__info {
      align-items: stretch;
      text-align: left;
    }

    .pdp__name {
      margin-inline: 0;
      text-align: left;
    }

    .pdp__badges {
      justify-content: flex-start;
    }
  }
</style>
