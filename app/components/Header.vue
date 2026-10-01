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
}

/* STI-614. `:hover, :focus-visible { outline: none }` left the keyboard focus
   state with nothing but `opacity: 0.8` as its affordance, and hover already
   sets that same 0.8 — so focusing the link after hovering produced no visible
   change whatsoever. A wordmark is a link, so SC 2.4.7 applies, and the
   indicator had no perceivable boundary (SC 1.4.11).

   The focus indicator becomes its own declaration consuming the canonical
   `components.focus-ring` — 2px stroke in `colors.focus` at 4px offset — the
   same treatment `.btn-primary:focus-visible`, `.product-card:focus-visible`
   and `.cart-pill:focus-visible` already carry. `--focus: #FFFFFF` on the
   near-black header is 21.0:1.

   DESIGN.md and tokens.css are untouched: `focus (#FFFFFF)` and
   `components.focus-ring` already exist and already declare exactly this, so
   the link was failing to consume the canonical token rather than missing one.
   No new custom property, so the top-down rule holds with nothing to mirror. */
.logo-link:focus-visible {
  outline: 2px solid var(--focus);
  outline-offset: 4px;
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
}

/* STI-608: the cart pill is a real button, so `:hover, :focus-visible { outline:
   none }` suppressed the focus ring for keyboard users. The white fill was
   left as the only focus affordance, and white-on-bone is ~1.06:1 — invisible
   against the near-black header. That is a WCAG 2.4.7 failure, and 1.4.11
   fails too because the indicator has no perceivable boundary.

   The hover fill swap stays above; the focus indicator becomes its own
   declaration taking `components.focus-ring` — 2px stroke in `colors.focus`
   at 4px offset — the same treatment `.btn-primary:focus-visible` and
   `.product-card:focus-visible` already carry.

   DESIGN.md and tokens.css are untouched: `focus (#FFFFFF)` and
   `components.focus-ring` already exist and already declare exactly this, so
   the pill was failing to consume the canonical token rather than missing one.
   No new custom property, so the top-down rule holds with nothing to mirror.

   The nav links above are left alone, and this time it is checked rather than
   assumed. `.nav-link:focus-visible::after` scales the bone underline to full
   width, so the link does have a real indicator of its own — verified in the
   shipped bundle, not inferred. STI-614 re-checked all four `outline: none`
   call sites; the nav links were the only survivors. */
.cart-pill:focus-visible {
  outline: 2px solid var(--focus);
  outline-offset: 4px;
}

  /* typography.numeric — tabular figures on every count. Shipped 0.7rem (a
     literal that traces to no type step) and 600 (a weight the ramp never
     declares). Stepped down to --text-xs (11px) so the numeral stays on the
     ramp: --text-base (13px, the token's own size) is taller than the 1.4em
     box it sits in. DESIGN.md declares no components: token for this count
     chip and the class is not minted in tokens.css, so no mirror ships here;
     design-lead's token decision is tracked on STI-521. */
  .cart-pill__count {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 1.4em;
    height: 1.4em;
    padding-inline: 4px;
    font-size: var(--text-xs);
    font-weight: 500;
    font-feature-settings: "tnum" 1;
    background: var(--ink-black);
    color: var(--bone);
    border-radius: 0;
    line-height: 1;
  }
</style>
