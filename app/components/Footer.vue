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
    <span>&copy; STITCH &amp; ASH &mdash; pilot</span>
    <span>Bone &middot; Ember &middot; Ash</span>
  </footer>
</template>

<style scoped>
.foot-mark {
  display: inline-block;
  line-height: 0;
  opacity: 0.6;
  transition: opacity var(--transition-base);
}
.foot-mark:hover,
.foot-mark:focus-visible {
  opacity: 1;
  outline: none;
}
</style>
