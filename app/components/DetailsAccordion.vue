<script setup lang="ts">
defineProps<{
  sections: { label: string; lines: string[]; link?: { to: string; text: string } }[]
}>()
</script>

<template>
  <div v-if="sections.length" class="accordion">
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
        <ul class="accordion__lines">
          <li v-for="(line, j) in section.lines" :key="j">{{ line }}</li>
        </ul>
        <NuxtLink v-if="section.link" :to="section.link.to" class="accordion__link">
          {{ section.link.text }}
        </NuxtLink>
      </div>
    </details>
  </div>
</template>

<style scoped>
  .accordion {
    border-top: var(--rule);
    /* Height is animated between 0 and auto, which needs keyword interpolation.
       Scoped to .accordion so no other disclosure in the app inherits it. */
    interpolate-size: allow-keywords;
  }

  /* Animate the panel open/closed so the chevron's
     rotation (--transition-base) and the panel share one duration. Browsers
     without ::details-content ignore this and snap. */
  .accordion__item::details-content {
    height: 0;
    overflow: clip;
    transition:
      height var(--transition-base),
      content-visibility var(--transition-base) allow-discrete;
  }

  .accordion__item[open]::details-content {
    height: auto;
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
    /* 16px + 16px + 11px * 1.3 = 46.3px hit height, clearing the 44px
       minimum tap target. */
    padding-block: var(--space-lg);
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
  }

  /* Remove default marker in Webkit */
  .accordion__summary::-webkit-details-marker { display: none; }

  /* Hover is a colour nudge only. The ring is reserved for keyboard focus, so a
     mouse user does not get a focus affordance they did not ask for. */
  .accordion__summary:hover {
    color: var(--grey-400);
  }

  /* components.focus-ring — 2px stroke, 4px offset (STI-578). The ring draws
     outside the summary box, which is flush with the column edge and one
     hairline below `.accordion`'s top border, so nothing clips it: no
     overflow on the accordion, and the offset is kept at the token's 4px.
     Focus keeps the label at `bone` — dimming the label on focus read as a
     disabled state. */
  .accordion__summary:focus-visible {
    color: var(--bone);
    outline: 2px solid var(--focus);
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
    /* Transparent and flush with the summary's left edge: the column must have
       one left edge, and six open sections must not stack into slabs. */
    padding-block: 0 var(--space-lg);
    padding-inline: 0;
  }

  .accordion__lines {
    margin: 0;
    padding: 0;
    list-style: none;
    font-size: var(--text-base);
    color: var(--accordion-body-text);
    line-height: 1.6;
  }

  /* components.accordion-link — underlined text link, same treatment as
     .contact__link / .account__link. */
  .accordion__link {
    display: inline-block;
    margin-top: var(--space-sm);
    font-size: var(--text-sm);
    color: var(--bone);
    text-decoration: underline;
    text-decoration-color: var(--border-rule);
    text-underline-offset: 0.2em;
  }

  .accordion__link:hover {
    text-decoration-color: var(--bone);
  }

  /* Same rule as the summary's focus-visible — a link inside the expander
     must not ring differently from one outside it. */
  .accordion__link:focus-visible {
    text-decoration-color: var(--bone);
    /* components.focus-ring — 2px stroke, 4px offset (STI-578). */
    outline: 2px solid var(--focus);
    outline-offset: 4px;
  }

  @media (prefers-reduced-motion: reduce) {
    .accordion__item::details-content,
    .accordion__item[open]::details-content {
      transition: none;
    }

    .accordion__summary,
    .accordion__icon {
      transition: none;
    }
  }
</style>
