<script setup lang="ts">
const { quantity, open } = useCart()

const cartLabel = computed(() => `Open cart, ${quantity.value ?? 0} items`)
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

    <button class="cart-pill" @click.prevent="open = true" :aria-label="cartLabel">
      <span class="cart-pill__label">Cart</span>
      <ClientOnly>
        <span v-if="quantity" class="cart-pill__count">{{ quantity }}</span>
        <span v-else class="cart-pill__count">0</span>
      </ClientOnly>
    </button>

  </header>

  <!-- Global cart slideover -->
  <CartModal />
</template>

<style scoped>
.logo-link {
  display: inline-flex;
  min-width: 0;
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

/* Cart control — quiet numeric indicator, not a badge box (STI-640).
   The control shipped a `background: var(--bone)` fill and a
   `1px solid var(--bone)` border, which made it a filled light block reading
   as a large badge or primary CTA, and gave it no perceivable edge against
   itself (#E8E8E8 vs #E8E8E8 = 1.00:1, SC 1.4.11). The focus ring then sat on
   that fill: `--focus` is #FFFFFF, white-on-bone 1.23:1. Both the fill and
   the border are gone; hover and focus move to `colors.bone` and the
   underline is a `border-bottom-color` swap, so the cart carries a state cue
   without a box. Over the `--ink-black` header those measure 17.14:1 (bone)
   and 7.46:1 (grey-400), clear of AA for the 12px uppercase label.

   `min-height: 44px` is the WCAG 2.5.8 hit area, which used to come from a
   `::before { inset: -8px 0 }` pseudo-element scoped to `.site-header nav
   button`. The cart button is no longer inside a `<nav>`, so the target is
   the element's own height rather than an overflow onto a neighbour that no
   longer exists. The row has to fit a 320px viewport without horizontal
   overflow, so the control cannot claim width it does not need:
   `flex: 0 0 auto` keeps the count from being compressed. */
.cart-pill {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 0.4rem;
  min-height: 44px;
  padding-inline: var(--space-xs);
  padding-block: 0;
  background: transparent;
  border: none;
  border-bottom: 1px solid transparent;
  border-radius: 0;
  color: var(--grey-400);
  font-family: var(--font-body);
  font-size: var(--text-sm);
  font-weight: 500;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  transition:
    color var(--transition-base),
    border-color var(--transition-base);
  cursor: pointer;
}

.cart-pill:hover,
.cart-pill:focus-visible {
  color: var(--bone);
  border-bottom-color: var(--bone);
}

/* STI-608: the cart pill is a real button, so `:hover, :focus-visible { outline:
   none }` suppressed the focus ring for keyboard users. That is a WCAG 2.4.7
   failure, and 1.4.11 fails too because the indicator has no perceivable
   boundary. The focus indicator is a declaration taking
   `components.focus-ring` — 2px stroke in `colors.focus` at 4px offset — the
   same treatment `.btn-primary:focus-visible`, `.product-card:focus-visible`
   and `.logo-link:focus-visible` already carry. The ring sits on the
   `--ink-black` header, where #FFFFFF is 21.0:1. */
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
