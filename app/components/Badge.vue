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
}

.badge--embroidered {
  background: color-mix(in srgb, var(--thread-gold) 15%, transparent);
  color: var(--thread-gold);
  border: 1px solid color-mix(in srgb, var(--thread-gold) 40%, transparent);
}

.badge--limited-run {
  background: color-mix(in srgb, var(--bone) 8%, transparent);
  color: var(--bone);
  border: 1px solid color-mix(in srgb, var(--bone) 30%, transparent);
}

.badge--low-stock {
  background: color-mix(in srgb, var(--error-ember) 15%, transparent);
  color: #e06050;
  border: 1px solid color-mix(in srgb, var(--error-ember) 40%, transparent);
}

.badge--made-to-order {
  background: color-mix(in srgb, var(--ash-silver) 10%, transparent);
  color: var(--ash-silver);
  border: 1px solid color-mix(in srgb, var(--ash-silver) 30%, transparent);
}
</style>
