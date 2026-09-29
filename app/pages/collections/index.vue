<script setup lang="ts">
/**
 * STI-241: /collections — Shopify's plural collection index.
 *
 * Shopify's canonical collection URL shape is plural. A customer arriving from
 * Google, an Instagram bio, an ad, or any Shopify-generated link lands here, so
 * it must not 404. `/collection/<handle>` (singular) remains the per-collection
 * detail route; this is the index above it.
 *
 * Until the catalog has more than one customer-facing collection, the index and
 * the "all products" listing are the same page, so both render the full capsule.
 * When a second collection is published, this becomes a real list of
 * `/collection/<handle>` links and stops sharing ProductGrid.
 */
</script>

<template>
  <ProductGrid eyebrow="Collections" title="Collections" />
</template>
