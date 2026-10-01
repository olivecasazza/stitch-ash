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
   padding 0px 8px (STI-578: was 2px 6px, off the 4px base grid; block -2px to
   0, inline +2px to 8 because `label` is tracked 0.12em uppercase and 4px
   would crowd the tracked edge into the hairline). Vertical breathing room now
   comes from line-height alone. Shipped 600 / 0.14em / 1.6 (STI-515 F3): 600 is
   a weight the ramp never declares (400 or 500, nothing else) and 0.14em / 1.6
   are on no step. The same rule is duplicated in app/assets/css/global.css, so
   both copies were corrected — see that file for which one wins in the cascade. */
.badge {
  display: inline-block;
  font-size: var(--text-xs);
  font-weight: 500;
  line-height: 1.3;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  white-space: nowrap;
  padding: 0px 8px;
  font-feature-settings: "tnum" 1;
  background: transparent;
  color: var(--grey-400);
  border: 1px solid var(--primary);
  border-radius: .5rem;
}
</style>
