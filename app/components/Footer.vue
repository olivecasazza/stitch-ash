<template>
  <footer class="site-foot wrap--wide">
    <NuxtLink to="/" aria-label="STITCH AND ASH home" class="foot-mark">
      <svg class="mark" viewBox="0 0 260 32" role="img" aria-label="STITCH AND ASH">
        <text
          x="0"
          y="24"
          font-family="'JetBrains Mono', monospace"
          font-size="18"
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

.foot-mark {
  display: inline-block;
  line-height: 0;
  opacity: 0.5;
  transition: opacity var(--transition-base);
}

.foot-mark:hover,
.foot-mark:focus-visible {
  opacity: 0.8;
  outline: none;
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
  color: var(--grey-400);
  text-decoration: none;
  transition: color var(--transition-base);
}

.footer-link:hover,
.footer-link:focus-visible {
  color: var(--bone);
  outline: none;
}
</style>
