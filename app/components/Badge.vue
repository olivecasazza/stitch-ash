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
/* components.badge — the ONE declaration site (STI-521, STI-524).
   textColor colors.grey-400, typography.label (JetBrains Mono 500 /
   0.6875rem / 1.3 / 0.12em / 'tnum' 1), rounded.none, padding 2px 6px,
   backgroundColor "transparent".

   `background: transparent` was previously inferred from the cascade rather
   than declared anywhere. DESIGN.md now declares it as a key, so the fill is
   stated rather than being the residual of which copy won — which is what
   let the global.css duplicate drift unnoticed in the first place.

   The `border: 1px solid var(--primary)` hairline is stated in DESIGN.md's
   Badges prose, not as a key: `borderColor` is not a valid component
   sub-token and lints as a broken-ref warning. The prose is the source of
   truth for it, exactly as the frontmatter note in DESIGN.md records.

   History: shipped 600 / 0.14em / 1.6 (STI-515 F3) — 600 is a weight the
   ramp never declares (400 or 500, nothing else) and 0.14em / 1.6 are on no
   step. The identical rule also existed unlayered in app/assets/css/global.css;
   STI-515 corrected both so the cascade could not decide the weight, and
   STI-524 deleted the global copy as the stale one. */
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
