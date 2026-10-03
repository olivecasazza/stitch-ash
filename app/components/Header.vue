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
      <!-- STI-633: DESIGN.md:564 specifies "Left: wordmark. Right: Shop, Story,
           Account, Cart." Account was never implemented, so the shipped nav had
           three of the four required items.

           It points at /account, which is a real page in this change rather than
           an unwired route. There is no customer-account integration in this
           repo — checkout hands off to Shopify's hosted checkoutUrl
           (app/composables/cart.ts, consumed by app/components/cart/Modal.vue)
           and no order is ever written to a system this app can read back — so
           /account states that plainly and routes order questions to /contact
           instead of faking a sign-in form.

           The Shopify customer-account integration that would make this page
           functional is commerce-eng's, not mine; it is delegated on this issue.

           Placement and treatment are the existing ones by construction: same
           `nav-link` class as the two siblings above, between Story and the cart
           button. No new selector, no background pill — DESIGN.md:524 marks an
           active route with the underline, which is what `.nav-link::after`
           already does for hover/focus. DESIGN.md and tokens.css are untouched
           by this change, so the mirror rule has nothing to sync. -->
      <NuxtLink to="/account" class="nav-link">Account</NuxtLink>

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

/* Cart control — quiet numeric indicator, not a badge box (STI-640).
   `background: var(--bone)` and a `1px solid var(--bone)` border shipped
   here, which made the control a filled light block reading as a large badge
   or primary CTA. DESIGN.md is explicit and says it twice:

     Navigation: "cart indicator as a numeric (\"02\"), no badge box."
     Header:     "Cart indicator should be numeric and quiet, not a large badge."

   Two measured consequences made it a defect rather than a taste call, both
   computed from the shipped values:

     1. `background` and `border` were the same token, so the control had no
        perceivable edge against itself: #E8E8E8 vs #E8E8E8 = 1.00:1. That is
        an SC 1.4.11 failure on the element's own boundary.
     2. The focus ring below sits on that fill. `--focus` is #FFFFFF, so
        white-on-bone measured 1.23:1 — failing SC 1.4.11 3:1 by a wide
        margin, and leaving keyboard users with no visible focus state. The
        STI-608 comment on that rule reasoned as though the pill were
        transparent over ink; on the surface that actually rendered it was not.

   The fix is to stop overriding the nav treatment. `global.css` already
   styles `.site-header nav button` transparent (`background: none`, no
   left/top/right border, `border-bottom: 1px solid transparent`,
   `color: var(--grey-400)`), and these declarations are repeated here
   explicitly because a scoped selector carries a `[data-v-*]` attribute and
   therefore outranks the global one regardless of what global.css says.

   Removed: the bone fill, the bone border, and the `:hover`/`:focus-visible`
   `background: var(--white)` swap. That last one was the more literal breach
   — DESIGN.md's Navigation section says an active nav item is "marked with an
   underline, never a background pill", and a full white fill on hover is
   exactly the background pill the rubric rules out.

   Hover and focus now move to `colors.bone` like `.nav-link`, and the
   underline comes from the same global `border-bottom-color` swap the other
   nav items use, so the cart carries a perceivable state cue without a box.
   Over the `--ink-black` header those measure 17.14:1 (bone) and 7.46:1
   (grey-400), both clear of AA for the 12px uppercase label.

   The `--space-xs` inline padding went with the box: it existed to inset the
   fill from its own border, and with no fill it just made the cart read
   wider than its SHOP/STORY siblings. The vertical padding is unchanged, so
   the WCAG 2.5.8 hit area from `global.css`'s `::before { inset: -8px 0 }`
   pseudo-element — which already applies to `nav button` — is unaffected.

   tokens.css and DESIGN.md are untouched, and need no mirror for this: every
   value here is a token that already existed (`colors.grey-400`,
   `colors.bone`, `typography.text-sm`, `rounded.none`). The change is a
   component no longer misusing tokens, not a new token. The count chip below
   is a separate declared component (`components.cart-pill-count`) and is
   deliberately left exactly as DESIGN.md declares it. */
.cart-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding-block: 4px;
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
   none }` suppressed the focus ring for keyboard users. The white fill was
   left as the only focus affordance, and white-on-bone is ~1.06:1 — invisible
   against the near-black header. That is a WCAG 2.4.7 failure, and 1.4.11
   fails too because the indicator has no perceivable boundary.

   The focus indicator is a declaration taking `components.focus-ring` — 2px
   stroke in `colors.focus` at 4px offset — the same treatment
   `.btn-primary:focus-visible`, `.product-card:focus-visible`,
   `.logo-link:focus-visible` and every `.site-header nav a/button` in
   `global.css` already carry.

   STI-640: the ring's own contrast is now correct on the surface it actually
   renders on. While the control carried `background: var(--bone)`, this
   #FFFFFF ring sat on a #E8E8E8 fill at 1.23:1 and was itself a 1.4.11
   failure — the rule was correct and the surface was wrong. With the fill
   gone (see `.cart-pill` above) the ring sits on the `--ink-black` header,
   where #FFFFFF is 21.0:1. The ring did not change; what it is measured
   against did.

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
