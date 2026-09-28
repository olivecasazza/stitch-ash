<script setup lang="ts">
const { quantity, open } = useCart()
</script>

<template>
  <header class="site-header wrap--wide">
    <NuxtLink to="/" aria-label="STITCH AND ASH home" class="logo-link">
      <svg class="mark" viewBox="0 0 260 32" role="img" aria-label="STITCH AND ASH">
        <text
          x="0"
          y="24"
          font-family="'JetBrains Mono', monospace"
          font-size="22"
          letter-spacing="2"
          font-weight="500"
        >STITCH &amp; ASH</text>
      </svg>
    </NuxtLink>

    <nav class="nav-menu" aria-label="Primary">
      <NuxtLink to="/products" class="nav-link">Shop</NuxtLink>
      <NuxtLink to="/#statement" class="nav-link">Story</NuxtLink>

      <button class="cart-pill" @click.prevent="open = true" aria-label="Open cart">
        <span class="cart-pill__label">Cart</span>
        <ClientOnly>
          <span v-if="quantity" class="cart-pill__count">{{ quantity }}</span>
          <span v-else class="cart-pill__count">0</span>
        </ClientOnly>
      </button>
    </nav>
  </header>

  <!-- Global cart slideover -->
  <CartModal />
</template>

<style scoped>
.logo-link {
  display: inline-flex;
  transition: opacity var(--transition-base);
}

.logo-link:hover,
.logo-link:focus-visible {
  opacity: 0.8;
  outline: none;
}

.nav-menu {
  display: flex;
  align-items: center;
  gap: clamp(0.75rem, 2vw, 1.5rem);
  font-family: var(--font-body);
}

.nav-link {
  position: relative;
  color: var(--grey-400);
  text-decoration: none;
  font-size: var(--text-sm);
  font-weight: 500;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding-block: 4px;
  transition: color var(--transition-base);
}

.nav-link:hover,
.nav-link:focus-visible {
  color: var(--bone);
  outline: none;
}

/* Micro-animating underline */
.nav-link::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 1px;
  background: var(--bone);
  transform: scaleX(0);
  transform-origin: right;
  transition: transform var(--transition-base);
}

.nav-link:hover::after,
.nav-link:focus-visible::after {
  transform: scaleX(1);
  transform-origin: left;
}

/* Cart pill button — white fill on dark surface (UX_FRAMEWORK) */
.cart-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: var(--space-xs) var(--space-md);
  background: var(--bone);
  border: 1px solid var(--bone);
  border-radius: 0;
  color: var(--ink-black);
  font-family: var(--font-body);
  font-size: var(--text-sm);
  font-weight: 500;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  transition:
    background-color var(--transition-base),
    color var(--transition-base);
  cursor: pointer;
}

.cart-pill:hover,
.cart-pill:focus-visible {
  background: var(--white);
  color: var(--ink-black);
  outline: none;
}

  /* components.cart-pill-count — backgroundColor colors.ink, textColor
     colors.bone, typography.numeric (500 / 0.8125rem / 1.4 / 0em / 'tnum' 1),
     rounded.none (STI-521).

     `numeric` and not `label` because a bare integer must be tabular or the
     digit jitters as it changes between 9 and 10.

     The full 13px step is used here, NOT the 11px STI-515 shipped. That
     change stepped the size DOWN to fit `min-width: 1.4em` / `height: 1.4em`,
     which is not a fixed box: `em` resolves against the chip's own font-size,
     so the box scales with the type and stays valid at any step. The step down
     was solving a non-problem, and it had the side effect of putting the
     numeral on `label`'s size while keeping `numeric`'s tabular figures —
     the worst of both. `--text-base` is the size `typography.numeric` actually
     declares.

     Shipped before either: a `0.7rem` literal tracing to no type step at all,
     and a weight of 600, which the ramp never declares (400 or 500, nothing
     else). Deliberately described in prose rather than as a property/value
     pair: STI-515's definition of done asks for a raw grep of app/ for
     off-ramp weight literals to return zero hits, and a comment that quotes
     the old declaration would read as a live violation to anyone running that
     sweep by hand. */
  .cart-pill__count {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 1.4em;
    height: 1.4em;
    padding-inline: 4px;
    font-size: var(--text-base);
    font-weight: 500;
    font-feature-settings: "tnum" 1;
    background: var(--ink-black);
    color: var(--bone);
    border-radius: 0;
    line-height: 1;
  }
</style>
