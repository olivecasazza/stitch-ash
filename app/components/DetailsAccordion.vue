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

  /* components.accordion-summary — the <summary> is a DISCLOSURE CONTROL, not
     body copy, and is deliberately NOT covered by components.accordion-body.
     typography.label (JetBrains Mono 500 / 0.6875rem / 1.3 / 0.12em / 'tnum' 1),
     rounded.none, textColor colors.bone (STI-521, DESIGN.md:147).

     STI-634 closes this rule's long-standing drift. The comment it replaces said
     DESIGN.md "gives it no token of its own" and deferred the question to
     STI-521. STI-521 was closed on 2026-09-28 by DESIGN.md commit 7bc9b26
     ("docs(STI-521): decide accordion-summary, cart-pill-count, badge
     tokens"), which is an ancestor of main and which states the answer
     outright: "STI-515 shipped it on `body-sm` (400) as a temporary landing
     on the nearest declared step; that is superseded here." The decision was
     made and written down; only this mirror never followed. So the four
     properties below were not an unresolved choice — they were an
     unreconciled CSS mirror of a decision that already exists upstream, and
     Option B in STI-634 is the answer DESIGN.md already gave.

     Rendered size narrows 12px -> 11px by design: controls are 11px tracked
     uppercase in this system. */
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
    font-feature-settings: "tnum" 1;
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
    /* components.focus-ring — 2px stroke, 4px offset (STI-578). This control
         carried `outline: none` on :focus-visible, leaving a colour shift as its
         whole focus affordance; same defect STI-608 and STI-614 ruled on. */
    outline: 2px solid var(--focus);
    outline-offset: 4px;
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
