<template>
  <footer class="site-foot">
    <NuxtLink to="/" aria-label="STITCH AND ASH home" class="foot-mark">
      <svg class="mark" viewBox="0 0 260 32" role="img" aria-label="STITCH AND ASH">
        <text
          x="0"
          y="24"
          font-family='"UnifrakturMaguntia", "Old English Text MT", "Cambria", serif'
          font-size="26"
          letter-spacing="1.5"
          font-weight="400"
        >STITCH &amp; ASH</text>
      </svg>
    </NuxtLink>
    <div class="footer-meta">
      <span>&copy; STITCH &amp; ASH &mdash; pilot</span>
      <span class="trilogy">Bone &middot; Ember &middot; Ash</span>
    </div>
  </footer>
</template>

<style scoped>
.site-foot {
  padding: clamp(2rem, 5vw, 4rem) var(--gutter);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rem;
  border-top: var(--rule);
  color: var(--ash-silver);
  font-family: var(--font-body);
  font-size: 0.76rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

@media (min-width: 768px) {
  .site-foot {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
  }
}

.foot-mark {
  display: inline-block;
  line-height: 0;
  opacity: 0.65;
  transition: opacity var(--transition-base), transform var(--transition-base);
}

.foot-mark:hover,
.foot-mark:focus-visible {
  opacity: 1;
  outline: none;
  transform: translateY(-0.5px);
}

.footer-meta {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

@media (min-width: 768px) {
  .footer-meta {
    flex-direction: row;
    gap: 2rem;
  }
}

.footer-meta span {
  font-weight: 400;
  color: color-mix(in srgb, var(--ash-silver) 65%, transparent);
}

.trilogy {
  color: color-mix(in srgb, var(--thread-gold) 60%, transparent) !important;
}
</style>
