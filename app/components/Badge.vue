<script setup lang="ts">
const props = withDefaults(defineProps<{
  variant?: 'embroidered' | 'limited-run' | 'low-stock' | 'made-to-order'
}>(), {
  variant: 'embroidered'
})

const labels: Record<string, string> = {
  'embroidered':    'Embroidered',
  'limited-run':    'Limited run',
  'low-stock':      'Low stock',
  'made-to-order':  'Made to order',
}

const label = computed(() => labels[props.variant] ?? props.variant)
</script>

<template>
  <span class="badge" :class="`badge--${variant}`">{{ label }}</span>
</template>

<style scoped>
.badge {
  display: inline-block;
  font-size: var(--text-xs);
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  white-space: nowrap;
  padding: 2px 6px;
  line-height: 1.6;
  background: transparent;
  color: var(--grey-400);
  border: 1px solid var(--primary);
}
</style>
