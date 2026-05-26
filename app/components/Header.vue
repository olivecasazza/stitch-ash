<script setup lang="ts">
const { quantity, open } = useCart()
</script>

<template>
  <header class="site-header">
    <NuxtLink to="/" aria-label="STITCH AND ASH home">
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
    <nav aria-label="Primary">
      <NuxtLink to="/products/sku-001">Shop</NuxtLink>
      <NuxtLink to="/#statement">Story</NuxtLink>
      <NuxtLink to="/ops-platform">Ops</NuxtLink>
      <a href="#" class="cart-link" @click.prevent="open = true" aria-label="Cart">
        Cart&nbsp;<span class="cart-count" aria-hidden="true">{{ quantity ?? 0 }}</span>
      </a>
    </nav>
  </header>

  <!-- Embed CartModal/Slideover so it is globally accessible via open state -->
  <CartModal />
</template>

<style scoped>
.cart-link {
  display: inline-flex;
  align-items: baseline;
  gap: 0.25em;
  cursor: pointer;
}
.cart-count {
  font-size: 0.72rem;
  letter-spacing: 0;
  text-transform: none;
  color: var(--ash-silver);
  min-width: 1ch;
}
</style>
