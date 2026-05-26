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
      <div v-else class="product-card__placeholder" aria-hidden="true">
        {{ name.toLowerCase() }}
      </div>
    </div>

    <div class="product-card__body">
      <div class="product-card__row">
        <h3 class="product-card__name">{{ name }}</h3>
        <Badge v-if="badge" :variant="badge" />
      </div>
      <p v-if="note" class="product-card__note">{{ note }}</p>
      <p class="product-card__price">${{ price }}</p>
    </div>
  </NuxtLink>
</template>

<style scoped>
.product-card {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  text-decoration: none;
  color: inherit;
  border: var(--rule);
  background: color-mix(in srgb, var(--bone) 3%, transparent);
  transition:
    border-color var(--transition-base),
    transform var(--transition-base);
}

.product-card:hover,
.product-card:focus-visible {
  border-color: var(--error-ember);
  outline: none;
  transform: translateY(-2px);
}

.product-card__image-wrap {
  position: relative;
  aspect-ratio: 4 / 5;
  overflow: hidden;
  background: var(--ink-black);
}

.product-card__img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: opacity var(--transition-base);
}

.product-card__img--primary.has-hover {
  opacity: 1;
}

.product-card__img--hover {
  opacity: 0;
}

.product-card:hover .product-card__img--primary.has-hover,
.product-card:focus-visible .product-card__img--primary.has-hover {
  opacity: 0;
}

.product-card:hover .product-card__img--hover,
.product-card:focus-visible .product-card__img--hover {
  opacity: 1;
}

.product-card__placeholder {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  border: 1px dashed color-mix(in srgb, var(--ash-silver) 40%, transparent);
  color: var(--ash-silver);
  font-family: var(--font-display);
  font-style: italic;
}

.product-card__body {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  padding: 0.75rem 1rem 1rem;
}

.product-card__row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.5rem;
}

.product-card__name {
  margin: 0;
  font-family: var(--font-display);
  font-weight: 500;
  font-size: var(--text-xl);
  letter-spacing: 0.02em;
}

.product-card__note {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--ash-silver);
  line-height: 1.4;
}

.product-card__price {
  margin: 0;
  font-size: var(--text-lg);
  color: var(--bone);
  font-weight: 500;
}
</style>
