<script setup lang="ts">
const { open, loading, quantity, lines, subtotal, checkoutUrl } = useCart()
const route = useRoute()

watch(() => route.path, () => open.value = false)

// The checkout target is a link, so it is only a link when there is somewhere
// to go and nothing in flight. `loading` renders a real (aria-disabled)
// <button> instead: UButton with `:to` emits an <a>, and `:disabled` on an
// <a> is inert — the old markup shipped a live link to a stale cart URL while
// the mutation was still running.
const checkoutReady = computed(() => !loading.value && lines.value.length > 0)
</script>
<template>
  <USlideover
    v-model:open="open"
    :title="$t('cart.title')"
    :description="$t('cart.description')"
    :ui="{
      // Panel is charcoal end to end — the body and footer used to paint
      // --ink-black under a charcoal header, which put a black seam across
      // the panel.
      body: 'flex flex-col gap-y-6 bg-[var(--charcoal)]',
      footer: 'bg-[var(--charcoal)]',
      description: 'sr-only',
      // The slideover title is a control-face label, not a heading: 11px /
      // 500 / 0.12em / uppercase on bone (14.3:1 on charcoal).
      title: 'text-[var(--bone)] text-[var(--text-xs)] font-medium tracking-[0.12em] uppercase',
      content: 'cart-panel',
    }"
  >
    <template #body>
      <TransitionGroup
        enter-to-class="opacity-100"
        leave-to-class="opacity-0"
        leave-from-class="opacity-100"
        enter-from-class="opacity-0"
      >
        <CartLineItem
          v-for="line in lines"
          :key="line.id"
          :line="line"
          class="shrink-0 duration-200"
        />
      </TransitionGroup>

      <!-- Empty cart: one fragment, in label voice. No price, no action. -->
      <p
        v-if="lines.length === 0"
        class="my-auto text-center text-[var(--grey-400)] text-[var(--text-xs)] font-medium tracking-[0.12em] uppercase"
      >
        {{ $t('cart.empty') }}
      </p>
    </template>

    <template #footer>
      <!-- Gated on lines, not on `subtotal`: a money object is truthy at
           $0.00, so the old `v-if="subtotal"` shipped a $0.00 row and a
           Checkout link over an empty cart. -->
      <div
        v-if="lines.length > 0"
        class="flex flex-col gap-4 w-full"
      >
        <!-- The row is gated on `subtotal` as well as on the lines above: the
             footer as a whole stays gated on `lines.length`, which is what
             keeps $0.00 and Checkout off an empty cart, while this narrower
             gate is what narrows `subtotal` (a `MoneyV2 | undefined`) to the
             `PriceFieldsFragment` ProductPrice requires. An empty cart has
             no price to render; a cart with lines always has one. -->
        <div
          v-if="subtotal"
          class="flex items-center justify-between gap-3 w-full"
        >
          <p class="text-[var(--grey-400)] text-[var(--text-xs)] font-medium tracking-[0.12em] uppercase">
            {{ $t('cart.subtotal') }}
          </p>

          <div class="flex items-center gap-2">
            <ProductPrice
              :price="subtotal"
              class="text-[var(--grey-200)] text-[var(--text-base)] font-medium tabular-nums"
            />

            <Icon
              v-if="loading"
              name="i-lucide-loader-circle"
              class="animate-spin text-[var(--grey-400)]"
            />
          </div>
        </div>

        <!-- components.button-primary: white fill, ink text, `label`
             typography, 12px/16px padding, square, full width, 44px tall. -->
        <UButton
          v-if="checkoutReady"
          :to="checkoutUrl"
          :label="$t('cart.checkout')"
          trailing-icon="i-lucide-arrow-right"
          :ui="{
            base: 'w-full justify-center min-h-11 rounded-none shadow-none ring-0 bg-[var(--white)] text-[var(--ink-black)] hover:bg-[var(--white)] active:bg-[var(--white)] px-4 py-3 text-[var(--text-xs)] font-medium tracking-[0.12em] uppercase',
            trailingIcon: 'size-4',
          }"
        />

        <UButton
          v-else
          aria-disabled="true"
          disabled
          :label="$t('cart.checkout')"
          :ui="{
            base: 'w-full justify-center min-h-11 rounded-none shadow-none ring-0 bg-[var(--white)] text-[var(--ink-black)] px-4 py-3 text-[var(--text-xs)] font-medium tracking-[0.12em] uppercase',
          }"
        />
      </div>
    </template>
  </USlideover>
</template>

<style>
/* The canonical focus ring, scoped to the cart panel so it cannot leak onto
   the storefront: one rule for every focusable the slideover owns — the close
   button, the line-item links and controls, and the checkout link — instead
   of per-component overrides.

   4px offset throughout. Nothing inside the panel needs the 2px fallback:
   the close button sits `top-4 end-4` (16px) inside the panel and the line
   items are inset by the body's own padding, so a 4px offset has room in
   every direction and never clips against the panel edge.

   The block is intentionally unlayered (no `scoped`, no `@layer`): a Vue SFC
   style block without `scoped` is emitted outside any cascade layer, so it
   wins over @nuxt/ui's `focus:outline-none` without `!important`. */
.cart-panel :is(a, button, input):focus-visible {
  outline: 2px solid var(--focus);
  outline-offset: 4px;
}

/* The vendor sets `focus:outline-none` on the slideover content and relies on
   per-control ring utilities; this keeps a keyboard user from seeing the panel
   itself take focus. */
.cart-panel:focus {
  outline: none;
}
</style>