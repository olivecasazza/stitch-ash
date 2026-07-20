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
          font-weight="600"
        >STITCH &amp; ASH</text>
      </svg>
    </NuxtLink>

    <nav class="nav-menu" aria-label="Primary">
      <NuxtLink to="/products/sku-001" class="nav-link">Shop</NuxtLink>
      <NuxtLink to="/#statement" class="nav-link">Story</NuxtLink>
      <NuxtLink to="/ops-platform" class="nav-link">Ops</NuxtLink>

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

/* Cart pill button */
.cart-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.3rem 0.75rem;
  background: var(--charcoal);
  border: 1px solid var(--grey-600);
  border-radius: var(--radius-tight);
  color: var(--grey-300);
  font-family: var(--font-body);
  font-size: var(--text-sm);
  font-weight: 500;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  transition:
    border-color var(--transition-base),
    color var(--transition-base);
  cursor: pointer;
}

.cart-pill:hover,
.cart-pill:focus-visible {
  border-color: var(--bone);
  color: var(--bone);
  outline: none;
}

.cart-pill__count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.4em;
  height: 1.4em;
  padding-inline: 0.25em;
  font-size: 0.7rem;
  font-weight: 600;
  background: var(--grey-600);
  color: var(--bone);
  border-radius: var(--radius-tight);
  line-height: 1;
}
</style>
