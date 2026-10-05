<script setup lang="ts">
const { quantity } = useCart()
const localePath = useLocalePath()

const cartLabel = computed(() => `Open cart, ${quantity.value ?? 0} items`)

// STI-653: the cart control is a LINK to /cart, not a button that opens the
// slideover. The slideover was the only cart surface, so the cart had no URL —
// it could not be bookmarked, shared, opened in a second tab, or recovered
// after a session drop, and the GM audit on STI-492 measured 404s for every
// cart URL a buyer would guess.
//
// An anchor is also the only way this control keeps the affordances the
// button had lost: middle-click, ctrl/cmd-click, "open in new tab" and a
// real href to copy. `useLocalePath` rather than a literal `to`, because every
// internal link in this repo goes through it and `prefix_except_default` needs
// it to produce /de/cart.
//
// The slideover stays mounted for the in-flow case: `add`/`update`/`remove`
// still `toast.add({ actions: [{ label: 'View cart', onClick: () => open = true }] })`
// in app/composables/cart.ts, and that is a pointer to a panel, not a route.
const cartTo = computed(() => localePath('/cart'))
</script>

<template>
    <header class="site-header wrap--wide">
        <NuxtLink
            to="/"
            aria-label="STITCH AND ASH home"
            class="logo-link"
        >
            <svg
                class="mark"
                viewBox="0 0 260 32"
                role="img"
                aria-label="STITCH AND ASH"
            >
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

        <NuxtLink
            :to="cartTo"
            class="cart-pill"
            :aria-label="cartLabel"
        >
            <span class="cart-pill__label">Cart</span>
            <ClientOnly>
                <span
                    v-if="quantity"
                    class="cart-pill__count"
                >{{ quantity }}</span>
                <span
                    v-else
                    class="cart-pill__count"
                >0</span>
            </ClientOnly>
        </NuxtLink>
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
   `flex: 0 0 auto` keeps the count from being compressed.

   STI-653: the control is now an `<a>`, because the cart has a URL. Three
   things change and nothing else may:

   1. `text-decoration: none` — a UA underline under the label and the count
      would be a second, unruled state cue competing with the hairline below,
      and DESIGN.md's tertiary-link rule is "no underline at rest, underline on
      hover", which the hairline already expresses.
   2. `cursor: pointer` stays, because an anchor over a real route should say
      so.
   3. `border: none` plus `border-bottom` cannot both be stated on an anchor
      without the shorthand resetting the bottom edge, so `border-top/left/right`
      are cleared explicitly and the bottom edge is declared after them. On a
      `<button>` the UA `border` is `border-style` only and the shorthand was
      harmless; here it would wipe the hairline the active-route rule needs. */
.cart-pill {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 0.4rem;
  min-height: 44px;
  padding-inline: var(--space-xs);
  padding-block: 0;
  background: transparent;
  border-top: none;
  border-left: none;
  border-right: none;
  border-bottom: 1px solid transparent;
  border-radius: 0;
  color: var(--grey-400);
  font-family: var(--font-body);
  font-size: var(--text-sm);
  font-weight: 500;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  text-decoration: none;
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

/* STI-608: the cart pill is a real link, so `:hover, :focus-visible { outline:
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

/* STI-653: the active route is marked with the hairline, per DESIGN.md
   Navigation — "Active route marked with an underline, never a background
   pill". The hover/focus rule above moves the same edge to `bone`, and an
   active route on its own must not read as hovered, so this sits after it and
   is scoped to the `.router-link-active` the router sets on the current
   route. `aria-current="page"` is what NuxtLink renders alongside it, so the
   state is in the a11y tree too and not only in a border colour. */
.cart-pill.router-link-active {
  color: var(--bone);
  border-bottom-color: var(--bone);
}

/* components.cart-pill-count declares `typography.numeric` — 13px /
   500 / tnum 1. The chip had stepped DOWN to --text-xs (11px) to fit a
   `1.4em` box, but that box is expressed in em of the chip's own
   font-size, so it scales with the type and was never a fixed constraint
   (STI-515). At the token's own 13px the count sits on the ramp and the
   box grows with it. `tnum` is the reason this is `numeric` and not
   `label`: a bare integer must be tabular or the digit jitters between 9
   and 10 (STI-521). The chip is 1.4em ≈ 18px, inset in a 44px-tall button
   beside a fixed-width label in a `flex: 0 0 auto` pill, so the wider
   numeral cannot overflow at 320px. */
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
  line-height: 1;
  background: var(--ink-black);
  color: var(--bone);
  border-radius: 0;
}
</style>
