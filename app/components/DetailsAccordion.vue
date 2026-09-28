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

  /* components.accordion-summary — textColor colors.bone, typography.label
     (JetBrains Mono 500 / 0.6875rem / 1.3 / 0.12em), rounded.none (STI-521).

     The <summary> is a DISCLOSURE CONTROL, not body copy, and is deliberately
     NOT covered by components.accordion-body. The panel it opens is body-sm at
     400; a 400-weight trigger under a 400-weight panel means the panel
     outweighs its own trigger, so the trigger has to be the heavier of the
     two. That is the same control-voice step badges, buttons and form labels
     use.

     Supersedes STI-515, which landed this on typography.body-sm (400 /
     0.75rem / 0.02em) as a temporary nearest-step landing while DESIGN.md had
     no token for the element at all. That guess was wrong on both axes —
     weight and size — and design-lead declared the real one.

     `font-size` therefore narrows from --text-sm (12px) to --text-xs (11px).
     That is intended: controls are 11px tracked uppercase in this system. It
     is still a visible change, so it is called out for the three-viewport
     visual review rather than left to be noticed later.

     `color: var(--bone)` is now on-token via accordion-summary.textColor;
     it was already correct and only gained a citation.

     Shipped before both: 600 / 0.08em — 600 is a weight the ramp never
     declares (400 or 500, nothing else). */
  .accordion__summary {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-md);
    padding-block: var(--space-md);
    cursor: pointer;
    list-style: none;
    font-size: var(--text-xs);
    line-height: 1.3;
    font-weight: 500;
    letter-spacing: 0.12em;
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

  .accordion__summary:focus-visible {
    outline: 2px solid var(--bone);
    outline-offset: 2px;
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
