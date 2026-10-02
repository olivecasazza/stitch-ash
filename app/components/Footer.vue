<template>
  <footer class="site-foot wrap--wide">
    <NuxtLink to="/" aria-label="STITCH AND ASH home" class="foot-mark">
      <!-- STI-549 (DESIGN.md -> "Scaled SVG text (the `viewBox` trap)").
           `font-size` here is a presentation attribute, so it is in viewBox user
           units and never resolves through tokens.css — the declared 18 landed
           at 8.04px on the shopper's screen.

           It is sized, not moved, because the rule permits an attribute for
           text with no reading obligation and this wordmark is one on both
           counts: it is the logo lockup, and the footer renders the same string
           as text in `© STITCH & ASH` below it, so this SVG is never the only
           copy of the string on the page. A CSS `font-size` here would be in
           user units too, so the token would not help; the arithmetic is the
           whole fix.

           `.mark` is sized by `height: 1.3em` with `width: auto`
           (global.css), and this footer is `font-size: var(--text-xs)` (11px),
           so the box is 14.3px tall and 116.2px wide at every viewport — a
           constant 0.4468 scale. Target the `text-xs` step (11px):
           11 / 0.4468 = 24.6, rounded UP to 25 user units, which renders
           11.17px. The old 18 rendered 8.04px, under the 11px floor. -->
      <svg class="mark" viewBox="0 0 260 32" role="img" aria-label="STITCH AND ASH">
        <text
          x="0"
          y="24"
          font-family="'JetBrains Mono', monospace"
          font-size="25"
          letter-spacing="2"
          font-weight="500"
        >STITCH &amp; ASH</text>
      </svg>
    </NuxtLink>

    <div class="footer-meta">
      <span class="footer-copy">&copy; STITCH &amp; ASH</span>
    </div>

    <nav class="footer-links" aria-label="Footer">
      <NuxtLink to="/#statement" class="footer-link">Story</NuxtLink>
      <NuxtLink to="/contact" class="footer-link">Contact</NuxtLink>
    </nav>
  </footer>
</template>

<style scoped>
.site-foot {
  width: min(100%, var(--content-wide));
  margin-inline: auto;
  padding-block: var(--space-3xl);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-xl);
  border-top: var(--rule-light);
  color: var(--grey-400);
  font-family: var(--font-body);
  font-size: var(--text-xs);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

@media (min-width: 640px) {
  .site-foot {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    gap: var(--space-lg);
  }
}

/* STI-549. The 0.5 this used to carry was inherited, not chosen, and it fails
   SC 1.4.11: the wordmark is a meaningful brand graphic, and grey-400
   (#9A9A9A) at 0.5 over black composites to #4D4D4D — 2.48:1, under the 3:1
   minimum. 0.8 composites to #7B7B7B for 4.96:1, which still reads as the
   subdued lockup the monochrome style wants while clearing the bar; hover and
   focus go to full 7.46:1. */
.foot-mark {
  display: inline-block;
  line-height: 0;
  opacity: 0.8;
  transition: opacity var(--transition-base);
}

.foot-mark:hover,
.foot-mark:focus-visible {
  opacity: 1;
}

/* STI-614. Same defect as `.logo-link` in the header: `outline: none` left the
   opacity nudge as the whole focus affordance, and `opacity: 1` is only a half
   step from the resting 0.8 — no shape change, no boundary, so SC 2.4.7 fails
   and so does SC 1.4.11. Consumes the canonical `components.focus-ring` token
   (2px `colors.focus` at 4px offset), matching `.btn-primary:focus-visible`,
   `.product-card:focus-visible` and `.cart-pill:focus-visible`. The opacity
   hover treatment above stays; only the suppression is removed. */
.foot-mark:focus-visible {
  outline: 2px solid var(--focus);
  outline-offset: 4px;
}

.footer-meta {
  display: flex;
  align-items: center;
  gap: var(--space-xl);
}

.footer-copy {
  color: var(--grey-400);
}

.footer-trilogy {
  color: var(--grey-400);
}

.footer-links {
  display: flex;
  align-items: center;
  gap: var(--space-xl);
}

.footer-link {
  /* Tap target — WCAG 2.5.8. Measured at 390x844: footer links render 37x17.
     Real padding rather than a pseudo-element: on a flex item the absolute
     pseudo produced no hit-testable area. The negative margin cancels the added
     height, so the footer's layout and link positions do not move. */
  padding-block: 14px;
  margin-block: -14px;
  color: var(--grey-400);
  text-decoration: none;
  transition: color var(--transition-base);
}

.footer-link:hover,
.footer-link:focus-visible {
  color: var(--bone);
}

/* STI-614. The footer's counterpart to the header's nav links, minus the
   underline: `.footer-link` has no `::after` at all, so unlike `.nav-link` its
   only focus affordance was a grey-400 -> bone colour shift on an identically
   shaped, identically positioned control. That is not a focus indicator under
   SC 2.4.7. Gives it the canonical `components.focus-ring` token (2px
   `colors.focus` at 4px offset). `bone` #E8E8E8 stays as the hover tint, so
   hover is visually unchanged and keyboard focus gains a ring. */
.footer-link:focus-visible {
  outline: 2px solid var(--focus);
  outline-offset: 4px;
}
</style>
