<script setup lang="ts">
/**
 * STI-241: canonical full-capsule listing. The header nav "Shop" points here.
 *
 * The grid itself lives in `app/components/ProductGrid.vue` so that /shop,
 * /collections and /collections/all render the same listing from the same
 * Storefront API query instead of each re-implementing (or, as before, simply
 * not existing as) its own copy.
 */
</script>

<template>
  <ProductGrid title="Shop" />
</template>
