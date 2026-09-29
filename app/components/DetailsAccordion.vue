<script setup lang="ts">
defineProps<{
  sections: { label: string; body: string }[]
}>()
</script>

<template>
  <div class="accordion">
    <details
      v-for="(section, i) in sections"
      :key="i"
      class="accordion__item"
      :open="i === 0"
    >
      <summary class="accordion__summary">
        <span>{{ section.label }}</span>
        <svg class="accordion__icon" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5">
          <polyline points="4 6 8 10 12 6" />
        </svg>
      </summary>
      <div class="accordion__body">
        <p v-html="section.body"></p>
      </div>
    </details>
  </div>
</template>

<style scoped>
  .accordion {
    border-top: var(--rule);
  }

  .accordion__item {
    border-bottom: var(--rule);
  }

  .accordion__item + .accordion__item {
    margin-top: 0;
  }

  /* components.accordion-body declares typography.body-sm for the panel; the
     <summary> is a different element and DESIGN.md gives it no token of its
     own. typography.body-sm is used here — the nearest declared ramp step
     for 12px tracked copy — rather than editing DESIGN.md from the component
     side (STI-515 F4). Shipped 600 / 0.08em: 600 is a weight the ramp never
     declares (400 or 500, nothing else). design-lead owns the question of
     whether the summary wants its own components: entry or is covered by
     accordion-body; tracked on STI-521. */
  .accordion__summary {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-md);
    padding-block: var(--space-md);
    cursor: pointer;
    list-style: none;
    font-size: var(--text-sm);
    line-height: 1.5;
    font-weight: 400;
    letter-spacing: 0.02em;
    text-transform: uppercase;
    color: var(--bone);
    transition: color var(--transition-base);
    user-select: none;
  }

  /* Remove default marker in Webkit */
  .accordion__summary::-webkit-details-marker { display: none; }

  .accordion__summary:hover,
  .accordion__summary:focus-visible {
    color: var(--grey-400);
    outline: none;
  }

  /* components.focus-ring — 2px stroke, 4px offset (STI-578). DESIGN.md
     names this "the standard 2px bone square"; the offset is the token's. */
  .accordion__summary:focus-visible {
    outline: 2px solid var(--bone);
    outline-offset: 4px;
  }

  .accordion__icon {
    flex-shrink: 0;
    transition: transform var(--transition-base);
    color: var(--accordion-icon);
  }

  details[open] .accordion__icon {
    transform: rotate(180deg);
  }

  .accordion__body {
    background: var(--accordion-body-bg);
    padding-block: var(--space-xs) var(--space-lg);
    padding-inline: var(--space-md);
  }

  .accordion__body p {
    margin: 0;
    font-size: var(--text-sm);
    color: var(--accordion-body-text);
    line-height: 1.6;
  }
</style>
