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
const classes = computed(() => ['badge', `badge--${props.variant}`])
</script>

<template>
  <span :class="classes">{{ label }}</span>
</template>

<style scoped>
.badge {
  display: inline-block;
  font-size: 0.65rem;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  padding: 0.2em 0.55em;
  border-radius: var(--radius-none);
  line-height: 1.6;
  background: var(--charcoal);
  color: var(--ash-silver);
  border: 1px solid color-mix(in srgb, var(--ash-silver) 20%, transparent);
}
</style>
