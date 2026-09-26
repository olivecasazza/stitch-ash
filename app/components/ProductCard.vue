<script setup lang="ts">
const props = withDefaults(defineProps<{
  href: string
  name: string
  price: number | string
  note?: string
  imageSrc?: string
  imageAlt?: string
  hoverImageSrc?: string
  badge?: 'embroidered' | 'limited-run' | 'low-stock' | 'made-to-order'
}>(), {
  imageAlt: ''
})

const finalImageAlt = computed(() => props.imageAlt || props.name)
</script>

<template>
  <NuxtLink :to="href" class="product-card">
    <div class="product-card__image-wrap">
      <template v-if="imageSrc">
        <img
          :class="['product-card__img', 'product-card__img--primary', { 'has-hover': hoverImageSrc }]"
          :src="imageSrc"
          :alt="finalImageAlt"
          loading="lazy"
          decoding="async"
        />
        <img
          v-if="hoverImageSrc"
          class="product-card__img product-card__img--hover"
          :src="hoverImageSrc"
          :alt="`${finalImageAlt} — detail`"
          loading="lazy"
          decoding="async"
          aria-hidden="true"
        />
      </template>
      <div v-else class="product-card__image-fallback" role="img" :aria-label="`${finalImageAlt} — product photograph not yet available`">
        <svg viewBox="0 0 600 750" xmlns="http://www.w3.org/2000/svg" class="product-card__fallback-svg" aria-hidden="true">
          <rect width="600" height="750" class="product-card__plate-bg" />
          <rect x="1" y="1" width="598" height="748" class="product-card__plate-hairline" />
          <g class="product-card__plate-mark">
            <path d="M232 214 L300 178 L368 214 L344 246 L300 222 L256 246 Z" />
            <path d="M232 214 L214 250 L214 566 L386 566 L386 250 L368 214 L344 246 L300 222 L256 246 Z" />
            <path d="M214 300 L140 340 L140 470 L196 452 L196 560 L214 566 Z" />
            <path d="M386 300 L460 340 L460 470 L404 452 L404 560 L386 566 Z" />
          </g>
          <text x="300" y="640" class="product-card__plate-caption">PHOTOGRAPH PENDING</text>
        </svg>
      </div>
    </div>

    <div class="product-card__body">
      <div class="product-card__row">
        <h3 class="product-card__name">{{ name }}</h3>
        <Badge v-if="badge" :variant="badge" />
      </div>
      <p v-if="note" class="product-card__note">{{ note }}</p>
      <p class="product-card__price">
        <span class="product-card__currency">$</span>{{ price }}
      </p>
    </div>
  </NuxtLink>
</template>

<style scoped>
.product-card__currency {
  color: var(--grey-400);
  margin-right: 0.05em;
}

/* Fallback plate. DESIGN.md grey-950 is the documented "image fallback plate"
   tone; the hairline is border-rule. Values live here rather than as SVG
   attributes so the plate cannot drift off-token. */
.product-card__plate-bg {
  fill: var(--grey-950);
}
.product-card__plate-hairline {
  fill: none;
  stroke: var(--border-rule);
  stroke-width: 1;
}
.product-card__plate-mark {
  fill: none;
  stroke: var(--primary);
  stroke-width: 2;
}
.product-card__plate-caption {
  fill: var(--grey-400);
  font-family: var(--font-mono);
  font-size: 20px;
  letter-spacing: 0.12em;
  text-anchor: middle;
}
</style>
