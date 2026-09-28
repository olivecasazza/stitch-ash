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
/* components.badge — textColor colors.grey-400, typography.label
   (JetBrains Mono 500 / 0.6875rem / 1.3 / 0.12em / 'tnum' 1), rounded.none,
   padding 2px 6px. Shipped 600 / 0.14em / 1.6 (STI-515 F3): 600 is a weight
   the ramp never declares (400 or 500, nothing else) and 0.14em / 1.6 are on
   no step. The same rule is duplicated in app/assets/css/global.css, so both
   copies were corrected — see that file for which one wins in the cascade. */
.badge {
  display: inline-block;
  font-size: var(--text-xs);
  font-weight: 500;
  line-height: 1.3;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  white-space: nowrap;
  padding: 2px 6px;
  font-feature-settings: "tnum" 1;
  background: transparent;
  color: var(--grey-400);
  border: 1px solid var(--primary);
}
</style>
