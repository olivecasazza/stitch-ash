<script setup lang="ts">
/**
 * STI-241: /collections/all — Shopify's "everything" pseudo-collection.
 *
 * This is the single highest-value 404 the QA pass found: it is the URL Shopify
 * itself generates and the one pasted into social bios. It lists the full
 * capsule rather than 404ing on the not-yet-migrated `all` collection handle.
 */
</script>

<template>
  <ProductGrid eyebrow="All — the full capsule" title="All products" />
</template>
