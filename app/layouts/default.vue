<script setup lang="ts">
// STI-223-3: centered max-width dark shell
</script>

<template>
  <div class="page-shell">
    <a href="#main-content" class="skip-link">
      Skip to content
    </a>

    <Header />

    <UMain id="main-content" class="page-main">
      <slot />
    </UMain>

    <Footer />
  </div>
</template>

<style>
/* page-shell wraps everything in near-black with centered layout */
.page-shell {
  background: var(--ink-black);
  color: var(--bone);
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.page-main {
  flex: 1;
  background: var(--ink-black);
}

/* Skip to content — visible on focus for keyboard users */
.skip-link {
  position: absolute;
  top: -100%;
  left: var(--space-xl);
  z-index: 100;
  padding: var(--space-sm) var(--space-xl);
  background: var(--bone);
  color: var(--ink-black);
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  text-decoration: none;
  transition: top var(--transition-fast);
}

.skip-link:focus {
  top: var(--space-lg);
  outline: 2px solid var(--bone);
  outline-offset: 2px;
}
</style>
