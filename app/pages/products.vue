<script setup lang="ts">
import { PRODUCTS } from '~/data/products'

useSeoMeta({
  title: 'Shop — STITCH AND ASH',
  description: 'The full Stitch and Ash capsule — embroidered black on black. Hoodies, lanyards, and stitched patches.',
})
</script>

<template>
  <main class="wrap">
    <section aria-labelledby="shop-h">
      <p class="eyebrow" id="shop-h" style="margin-block-start: clamp(2rem, 4vw, 3rem)">
        Shop — the full capsule
      </p>
      <div class="products">
        <ProductCard
          v-for="p in PRODUCTS"
          :key="p.handle"
          :href="`/product/${p.handle}`"
          :name="p.name"
          :price="p.price"
          :note="p.embroideryCopy"
          :image-src="p.imageSrc"
          :image-alt="p.imageAlt"
        />
      </div>
    </section>
  </main>
</template>
