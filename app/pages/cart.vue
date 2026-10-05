<script setup lang="ts">
/**
 * STI-653: /cart — the addressable cart route.
 *
 * Before this page the cart existed only as `app/components/cart/Modal.vue`,
 * a slideover mounted from the header. There was no URL for it: the header
 * control was a `<button>` that set `open = true`, so the cart could not be
 * bookmarked, shared, opened in a second tab, or recovered after a session
 * drop. The GM ground-truth audit on STI-492 measured four 404s for every cart
 * URL a buyer would guess, and closed STI-624 on a surface it could not
 * reproduce — which is the concrete cost of a modal-only cart.
 *
 * The data is not duplicated here. `app.vue` already runs
 * `watch(id, ... init().then(get) : get(), { immediate: true })` on every
 * route, so the `useCart()` refs this page reads are the same ones the slideover
 * reads, hydrated from the same `shopify-cart-id` cookie. Reload, deep link,
 * new tab and back-button all resolve to the same Shopify cart because the
 * cookie is the only persistence the composable has ever had.
 *
 * Footer totals are deliberately the same shape as the slideover's, and for the
 * same reason: `subtotal` is a `MoneyV2 | undefined` that is TRUTHY at $0.00, so
 * every gate here is on `lines.length` (the footer as a whole) and on `subtotal`
 * (the narrower gate that also narrows the type for `ProductPrice`).
 */

const { loading, lines, quantity, subtotal, checkoutUrl } = useCart()

useSeoMeta({
    title: 'Cart — STITCH AND ASH',
    description: 'Your cart. Selected items and your subtotal.',
})

const localePath = useLocalePath()

// Checkout is a link to the `checkoutUrl` Shopify minted for THIS cart, so it
// is only a link when there is somewhere to go and nothing in flight. When a
// mutation is open the target is a stale URL, so the control becomes a real
// (aria-disabled) <button> instead — `:disabled` on an <a> is inert. Same
// two-branch shape the slideover footer uses, for the same reason.
const checkoutReady = computed(() => !loading.value && lines.value.length > 0)

const hasLines = computed(() => lines.value.length > 0)
</script>

<template>
    <main class="cart wrap">
        <h1 class="cart__title">
            {{ $t('cart.title') }}
        </h1>

        <!-- A count needs vue-i18n's plural forms, not bare `{count}`
         interpolation — the latter renders "1 items". Passing the number (not
         `{ count: n }`) is what selects the plural branch. -->
        <p
            v-if="quantity"
            class="cart__count"
        >
            {{ $t('cart.itemCount', quantity) }}
        </p>

        <!-- Empty state. A real page, not a 404: the route exists whether or not
         there is anything in it, so a shared or reloaded /cart always has
         somewhere to land. -->
        <section
            v-if="!hasLines"
            class="cart__empty"
            aria-labelledby="cart-empty-h"
        >
            <h2
                id="cart-empty-h"
                class="cart__empty-title"
            >
                {{ $t('cart.emptyTitle') }}
            </h2>
            <p class="cart__empty-note">
                {{ $t('cart.emptyNote') }}
            </p>
            <NuxtLink
                :to="localePath('/products')"
                class="btn-primary cart__empty-cta"
            >
                {{ $t('cart.emptyAction') }}
            </NuxtLink>
        </section>

        <section
            v-else
            class="cart__panel"
            aria-labelledby="cart-lines-h"
        >
            <h2
                id="cart-lines-h"
                class="cart__sub"
            >
                {{ $t('cart.items') }}
            </h2>

            <ul class="cart__lines">
                <li
                    v-for="line in lines"
                    :key="line.id"
                    class="cart__line"
                >
                    <CartLineItem :line="line" />
                </li>
            </ul>

            <!-- Footer. Gated on lines first and subtotal second — see the header of
           this file; a money object is truthy at $0.00. -->
            <div class="cart__footer">
                <div class="cart__totals">
                    <p class="cart__totals-label">
                        {{ $t('cart.subtotal') }}
                    </p>

                    <div class="cart__totals-value">
                        <ProductPrice
                            v-if="subtotal"
                            :price="subtotal"
                            class="cart__totals-amount"
                        />
                        <span
                            v-else
                            class="cart__totals-amount"
                        >—</span>

                        <Icon
                            v-if="loading"
                            name="i-lucide-loader-circle"
                            class="cart__spinner"
                        />
                    </div>
                </div>

                <p class="cart__note">
                    {{ $t('cart.note') }}
                </p>

                <a
                    v-if="checkoutReady && checkoutUrl"
                    :href="checkoutUrl"
                    class="btn-primary cart__checkout"
                >
                    {{ $t('cart.checkout') }}
                    <Icon
                        name="i-lucide-arrow-right"
                        class="cart__checkout-icon"
                    />
                </a>
                <button
                    v-else
                    type="button"
                    class="btn-primary cart__checkout"
                    aria-disabled="true"
                    :disabled="true"
                >
                    {{ $t('cart.checkout') }}
                </button>
            </div>
        </section>
    </main>
</template>

<style scoped>
/* Page shell. Same padding rhythm as app/pages/contact.vue: the h1 on the
   display step, then content. */
.cart {
  padding-block-start: var(--space-2xl);
  padding-block-end: var(--space-5xl);
}

.cart__title {
  font-family: var(--font-display);
  font-size: var(--text-3xl);
  font-weight: 500;
  letter-spacing: -0.02em;
  line-height: 1.05;
  margin: 0;
  color: var(--bone);
}

/* components.numeric — typography.numeric is 13px / 500 / tnum. A count is a
   bare integer, so it is tabular or the digit jitters between 9 and 10
   (STI-521). Grey-400 because it is a secondary voice; `bone` is reserved for
   copy the reader is expected to read. */
.cart__count {
  margin: var(--space-sm) 0 0;
  color: var(--grey-400);
  font-size: var(--text-base);
  font-weight: 500;
  font-feature-settings: "tnum" 1;
  line-height: 1.4;
}

.cart__sub {
  font-family: var(--font-body);
  font-size: var(--text-xs);
  font-weight: 500;
  line-height: 1.3;
  letter-spacing: 0.12em;
  font-feature-settings: "tnum" 1;
  text-transform: uppercase;
  color: var(--grey-400);
  margin: 0 0 var(--space-lg);
}

.cart__lines {
  list-style: none;
  margin: 0;
  padding: 0;
  border-top: var(--rule-light);
}

/* CartLineItem owns the row's own geometry (its `border-bottom` hairline, its
   4:5 media box, its stepper). This rule only removes the list marker gutter
   and makes the page ground legible for the stepper's own hover, which was
   tuned for the charcoal slideover: `--grey-950` on `--ink-black` is 1.19:1,
   so the hover step needs the charcoal it was designed against. The page gives
   it one. */
.cart__line {
  margin: 0;
  padding: 0;
  background: var(--charcoal);
  padding-inline: var(--space-lg);
}

.cart__line + .cart__line {
  border-top: var(--rule-light);
}

.cart__footer {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
  margin-block-start: var(--space-2xl);
  padding-block-start: var(--space-xl);
  border-block-start: var(--rule-light);
}

.cart__totals {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-md);
}

.cart__totals-label {
  margin: 0;
  color: var(--grey-400);
  font-size: var(--text-xs);
  font-weight: 500;
  line-height: 1.3;
  letter-spacing: 0.12em;
  font-feature-settings: "tnum" 1;
  text-transform: uppercase;
}

/* components.price — typography.numeric, grey-200. The em dash while a
   subtotal is genuinely absent keeps the row's height stable instead of
   collapsing; it is not a money value and is never read as one. */
.cart__totals-amount {
  color: var(--grey-200);
  font-size: var(--text-base);
  font-weight: 500;
  font-feature-settings: "tnum" 1;
  line-height: 1.4;
}

.cart__totals-value {
  display: inline-flex;
  align-items: center;
  gap: var(--space-sm);
}

.cart__spinner {
  color: var(--grey-400);
}

.cart__note {
  margin: 0;
  color: var(--grey-400);
  font-size: var(--text-sm);
  line-height: 1.4;
}

.cart__checkout {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-sm);
  align-self: flex-start;
  min-height: 44px;
  text-decoration: none;
}

.cart__checkout-icon {
  width: var(--space-lg);
  height: var(--space-lg);
}

/* components.button-disabled — DESIGN.md declares the disabled state as
   `primary` border, `grey-400` text, no fill. `.btn-primary` is the primary
   token, so the disabled override is stated here rather than inherited from a
   component that does not exist yet. */
.cart__checkout:disabled,
.cart__checkout[aria-disabled="true"] {
  background: transparent;
  border-color: var(--primary);
  color: var(--grey-400);
  cursor: not-allowed;
}

/* Empty state. No plate, no fill: DESIGN.md has no card for "nothing here", so
   it reads as type on the page ground with a hairline above it, the same
   way `.contact__panel` marks a section boundary. */
.cart__empty {
  margin-block-start: var(--space-xl);
  padding-block-start: var(--space-2xl);
  border-block-start: var(--rule-light);
}

.cart__empty-title {
  margin: 0;
  font-family: var(--font-display);
  font-size: var(--text-xl);
  font-weight: 500;
  line-height: 1.15;
  letter-spacing: 0em;
  color: var(--bone);
}

.cart__empty-note {
  margin: var(--space-md) 0 0;
  max-width: var(--measure);
  color: var(--grey-400);
  font-size: var(--text-base);
  line-height: 1.55;
}

.cart__empty-cta {
  display: inline-flex;
  align-items: center;
  margin-block-start: var(--space-xl);
  min-height: 44px;
  text-decoration: none;
}

/* components.focus-ring — 2px stroke in `colors.focus`, 4px offset. The base
   rule in global.css is a 1px `--bone` hairline at the same offset; every
   focusable this page owns declares the ring itself, so the cart is readable
   by keyboard at the token's own weight (STI-578 / STI-608 lineage). */
.cart :is(a, button):focus-visible {
  outline: 2px solid var(--focus);
  outline-offset: 4px;
}
</style>
