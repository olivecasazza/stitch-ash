<script setup lang="ts">
const { quantity, open } = useCart()
</script>

<template>
  <header class="site-header">
    <NuxtLink to="/" aria-label="STITCH AND ASH home" class="logo-link">
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
    <nav class="nav-menu" aria-label="Primary">
      <NuxtLink to="/products/sku-001" class="nav-link">Shop</NuxtLink>
      <NuxtLink to="/#statement" class="nav-link">Story</NuxtLink>
      <NuxtLink to="/ops-platform" class="nav-link">Ops</NuxtLink>
      
      <button class="cart-pill" @click.prevent="open = true" aria-label="Cart">
        <span>Cart</span>
        <ClientOnly>
          <span v-if="quantity" class="cart-badge">{{ quantity }}</span>
          <span v-else class="cart-badge">0</span>
        </ClientOnly>
      </button>
    </nav>
  </header>

  <!-- Embed CartModal/Slideover so it is globally accessible via open state -->
  <CartModal />
</template>

<style scoped>
.logo-link {
  display: inline-flex;
  transition: opacity var(--transition-base), transform var(--transition-base);
}

.logo-link:hover,
.logo-link:focus-visible {
  opacity: 0.85;
  transform: translateY(-0.5px);
  outline: none;
}

.nav-menu {
  display: flex;
  align-items: center;
  gap: clamp(1rem, 2vw, 2rem);
  font-family: var(--font-body);
}

.nav-link {
  position: relative;
  color: var(--ash-silver);
  text-decoration: none;
  font-size: 0.82rem;
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
  background: var(--thread-gold);
  transform: scaleX(0);
  transform-origin: right;
  transition: transform var(--transition-base);
}

.nav-link:hover::after,
.nav-link:focus-visible::after {
  transform: scaleX(1);
  transform-origin: left;
}

/* Premium Cart Pill Button */
.cart-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.35rem 0.85rem;
  background: var(--charcoal);
  border: 1px solid color-mix(in srgb, var(--ash-silver) 20%, transparent);
  border-radius: 9999px;
  color: var(--bone);
  font-family: var(--font-body);
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  transition: border-color var(--transition-base), background-color var(--transition-base), transform var(--transition-base);
  cursor: pointer;
}

.cart-pill:hover,
.cart-pill:focus-visible {
  border-color: var(--thread-gold);
  background: color-mix(in srgb, var(--thread-gold) 6%, transparent);
  transform: translateY(-0.5px);
  outline: none;
}

.cart-pill:active {
  transform: translateY(0.5px);
}

.cart-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.6em;
  height: 1.6em;
  padding-inline: 0.35em;
  font-size: 0.68rem;
  font-weight: 700;
  font-family: var(--font-mono);
  background: var(--thread-gold);
  color: var(--ink-black);
  border-radius: 9999px;
  line-height: 1;
  transition: transform var(--transition-base);
}

.cart-pill:hover .cart-badge {
  transform: scale(1.05);
}
</style>
