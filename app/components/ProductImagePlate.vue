<script setup lang="ts">
import { resolveProductMark, type ProductMark } from '~/utils/product-mark'

/**
 * Product image plate — the storefront's stand-in for a product photograph.
 *
 * STI-541. This component replaces the per-file fallback plates that shipped
 * in `ProductCard.vue` and `product/[handle].vue`. It exists as one component
 * because the defect was one defect wearing three costumes: the same inline
 * SVG and the same accessibility string were duplicated across the card, the
 * collection grid and the PDP, so a fix scoped to one file left two live
 * routes still shipping placeholder art.
 *
 * THE STRING "not yet available" IS THE DEFECT. Reaching the accessibility tree
 * means a screen reader announces internal pipeline status to a shopper. The
 * accessible name here is the product name, because that is what a plate
 * standing in for a photograph of a product is: an image of that product. The
 * caption is on-plate customer-facing copy — every plate carries the same
 * house line, so a shopper reading three cards is not told three different
 * things about why the image is a plate.
 *
 * When real photography lands, `src` is populated and this component stops
 * rendering at all — the same single place decides, not a check per route.
 *
 * Per product, not one art for all: `mark` picks the silhouette, so a Lanyard
 * card can never picture a hoodie.
 */
const props = withDefaults(defineProps<{
  /** Accessible name. The product name — a plate stands in for a photo of the product. */
  alt: string
  /** Explicit silhouette; derived from name/handle when omitted. */
  mark?: ProductMark
  /** Shopify-fed routes have no mark field, so the product's own words are the input. */
  name?: string
  handle?: string
  /** Set when a real photograph exists; the plate is not rendered at all. */
  src?: string
  /** CSS class for the plate root, so callers keep their own layout hooks. */
  blockClass?: string
}>(), {
  mark: undefined,
  name: '',
  handle: '',
  src: '',
  blockClass: '',
})

const resolvedMark = computed(() => resolveProductMark(props.mark, props.name, props.handle))
</script>

<template>
  <img
    v-if="src"
    :src="src"
    :alt="alt"
    class="product-plate__photo"
    loading="lazy"
    decoding="async"
  />
  <div
    v-else
    :class="['product-plate', blockClass]"
    role="img"
    :aria-label="alt"
  >
    <svg
      viewBox="0 0 600 750"
      xmlns="http://www.w3.org/2000/svg"
      class="product-plate__svg"
      aria-hidden="true"
      focusable="false"
    >
      <rect width="600" height="750" class="product-plate__bg" />
      <rect x="1" y="1" width="598" height="748" class="product-plate__hairline" />

      <!-- HOODIE: hood, body, two sleeves. -->
      <g v-if="resolvedMark === 'hoodie'" class="product-plate__mark">
        <path d="M232 214 L300 178 L368 214 L344 246 L300 222 L256 246 Z" />
        <path d="M232 214 L214 250 L214 566 L386 566 L386 250 L368 214 L344 246 L300 222 L256 246 Z" />
        <path d="M214 300 L140 340 L140 470 L196 452 L196 560 L214 566 Z" />
        <path d="M386 300 L460 340 L460 470 L404 452 L404 560 L386 566 Z" />
      </g>

      <!-- LANYARD: loop, woven strap, breakaway clip. -->
      <g v-else-if="resolvedMark === 'lanyard'" class="product-plate__mark">
        <path d="M262 190 C262 168 338 168 338 190" />
        <path d="M238 190 L362 190 L362 214 L238 214 Z" />
        <path d="M250 214 L250 520 L350 520 L350 214" />
        <path d="M250 300 L350 300 M250 380 L350 380 M250 460 L350 460" class="product-plate__mark-detail" />
        <path d="M268 520 L332 520 L332 566 L268 566 Z" />
        <path d="M282 566 L318 566 L318 604 L282 604 Z" />
      </g>

      <!-- STICKER: merrowed patch square, stitched border, brand mark. -->
      <g v-else-if="resolvedMark === 'sticker'" class="product-plate__mark">
        <path d="M168 190 L432 190 L432 502 L168 502 Z" />
        <path d="M190 212 L410 212 L410 480 L190 480 Z" class="product-plate__mark-detail" />
        <path d="M300 268 L362 346 L300 424 L238 346 Z" />
      </g>

      <!-- EMBLEM: the stitched diamond. True of any embroidered item, so it is
           the honest plate for a product we have no specific silhouette for. -->
      <g v-else class="product-plate__mark">
        <path d="M300 186 L414 346 L300 506 L186 346 Z" />
        <path d="M300 246 L364 346 L300 446 L236 346 Z" class="product-plate__mark-detail" />
      </g>

      <text x="300" y="640" class="product-plate__caption">EMBROIDERY, NOT PRINT</text>
      <text x="300" y="694" class="product-plate__caption product-plate__caption--sub">PHOTOGRAPHY IN PROGRESS</text>
    </svg>
  </div>
</template>

<style scoped>
/* Plate. DESIGN.md grey-950 is the documented "image fallback plate" tone; the
   hairline is border-rule. Values live here rather than as SVG attributes so
   the plate cannot drift off-token. The 4:5 aspect is the product card's
   documented image aspect. */
.product-plate {
  position: relative;
  aspect-ratio: 4 / 5;
  overflow: hidden;
  background: var(--ink-black);
}

.product-plate__svg {
  width: 100%;
  height: 100%;
  display: block;
}

.product-plate__bg {
  fill: var(--grey-950);
}
.product-plate__hairline {
  fill: none;
  stroke: var(--border-rule);
  stroke-width: 1;
}
.product-plate__mark {
  fill: none;
  /* grey-400, not primary (2.60:1 on grey-950): the 2px mark is a meaningful
     glyph and SC 1.4.11 requires 3:1. The aria-hidden SVG is paired with a
     grey-400 caption that already reads at 6.19:1. */
  stroke: var(--grey-400);
  stroke-width: 2;
}
/* The inner line of a silhouette is detail, not the glyph itself, so it is
   drawn at the same 2px weight rather than lighter — an SVG cannot rely on
   the component ramp, and grey-300 is not a declared token. */
.product-plate__mark-detail {
  stroke: var(--grey-400);
  stroke-width: 1;
}
.product-plate__caption {
  fill: var(--grey-400);
  font-family: var(--font-mono);
  font-size: 20px;
  letter-spacing: 0.12em;
  text-anchor: middle;
}
/* components.badge — typography.label (500 / 0.6875rem / 1.3 / 0.12em), so
   the sub-caption is a tracked uppercase label step down from the house line. */
.product-plate__caption--sub {
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.12em;
}
</style>
