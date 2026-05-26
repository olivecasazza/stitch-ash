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

  .accordion__summary {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    padding-block: 0.85rem;
    cursor: pointer;
    list-style: none;
    font-size: var(--text-sm);
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--bone);
    transition: color var(--transition-base);
    user-select: none;
  }

  /* Remove default marker in Webkit */
  .accordion__summary::-webkit-details-marker { display: none; }

  .accordion__summary:hover,
  .accordion__summary:focus-visible {
    color: var(--ash-silver);
    outline: none;
  }

  .accordion__summary:focus-visible {
    outline: 2px solid var(--thread-gold);
    outline-offset: 2px;
  }

  .accordion__icon {
    flex-shrink: 0;
    transition: transform var(--transition-base);
  }

  details[open] .accordion__icon {
    transform: rotate(180deg);
  }

  .accordion__body {
    padding-block: 0.4rem 1.1rem;
  }

  .accordion__body p {
    margin: 0;
    font-size: var(--text-sm);
    color: var(--ash-silver);
    line-height: 1.6;
  }
</style>
