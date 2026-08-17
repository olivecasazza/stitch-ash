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
      <div v-else class="product-card__image-fallback" aria-hidden="true">
        <svg viewBox="0 0 600 750" xmlns="http://www.w3.org/2000/svg" class="product-card__fallback-svg">
          <rect width="600" height="750" fill="#0B0B0B" />
          <rect x="1" y="1" width="598" height="748" fill="none" stroke="#C0C0C0" stroke-width="1" opacity="0.15" />
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
  color: var(--grey-500);
  margin-right: 0.05em;
}
</style>
