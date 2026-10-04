<script setup lang="ts">
const { open, loading, quantity, lines, rows, recentlyRemoved, subtotal, checkoutUrl, undo, dismissRemoved, clearRemoved } = useCart()
const route = useRoute()
const { t } = useI18n()

watch(() => route.path, () => open.value = false)

// How long a removed line stays undoable in the open panel.
const UNDO_WINDOW = 6000

// One timer per pending undo row, keyed by the removed line's id.
const undoTimers = new Map<string, ReturnType<typeof setTimeout>>()

// The live region exists before anything is removed — a region inserted
// together with its text is not reliably announced. It is emptied first so the
// same fragment twice in a row is still read out.
const announcement = ref('')

const announce = (text: string) => {
    announcement.value = ''
    void nextTick(() => announcement.value = text)
}

// Reconciles timers with the pending undo rows: a new row starts its window
// and is announced; a row that left early (undone, re-added, panel closed)
// takes its timer with it.
watch(() => recentlyRemoved.value.map(removed => removed.lineId), (ids) => {
    for (const [lineId, timer] of undoTimers) {
        if (ids.includes(lineId)) continue

        clearTimeout(timer)
        undoTimers.delete(lineId)
    }

    // The live region holds "<title> removed." until something replaces it, so
    // a screen reader walking the panel later reads a removal that has already
    // been undone or expired. Clear it once no row is pending.
    if (!ids.length) announcement.value = ''

    for (const removed of recentlyRemoved.value) {
        if (undoTimers.has(removed.lineId)) continue

        undoTimers.set(removed.lineId, setTimeout(() => {
            undoTimers.delete(removed.lineId)
            dismissRemoved(removed.lineId)
        }, UNDO_WINDOW))

        announce(t('cart.removed', { title: removed.title }))
    }
})

// Undo is a property of the open panel: closing it ends every window.
watch(open, (value) => {
    if (!value) clearRemoved()
})

onBeforeUnmount(() => {
    for (const timer of undoTimers.values()) clearTimeout(timer)

    undoTimers.clear()
    clearRemoved()
})

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
      title: 'text-[var(--bone)] text-[length:var(--text-xs)] font-medium tracking-[0.12em] uppercase',
      content: 'cart-panel',
    }"
  >
    <template #body>
      <!-- One wrapper per row, keyed by line id. A removed line's undo row
           renders inside the same wrapper, so it takes the line's slot in
           place instead of fading in next to a fading-out line. -->
      <TransitionGroup
        enter-to-class="opacity-100"
        leave-to-class="opacity-0"
        leave-from-class="opacity-100"
        enter-from-class="opacity-0"
      >
        <div
          v-for="row in rows"
          :key="row.id"
          class="shrink-0 duration-200"
        >
          <CartLineItem
            v-if="row.line"
            :line="row.line"
          />

          <!-- Same 16px inset and hairline as a line row; 153px is the line
               row's own height (16 + 120px 4:5 media + 16 + 1px rule), so
               nothing below moves when the row turns over. -->
          <div
            v-else
            class="flex items-center justify-between gap-4 min-h-[153px] py-4 [border-bottom:var(--rule)]"
          >
            <p class="min-w-0 text-[var(--grey-400)] text-[length:var(--text-base)] leading-[1.4]">
              {{ $t('cart.removed', { title: row.removed.title }) }}
            </p>

            <!-- DESIGN.md tertiary button: text only, label typography,
                 underline on hover. 44px hit area; the panel's ring rule
                 below supplies the focus outline. -->
            <button
              type="button"
              class="shrink-0 inline-flex items-center justify-center min-h-11 min-w-11 px-2 text-[var(--bone)] text-[length:var(--text-xs)] font-medium tracking-[0.12em] uppercase underline-offset-4 enabled:hover:underline disabled:text-[var(--grey-400)]"
              :disabled="row.removed.undoing"
              @click="undo(row.id)"
            >
              {{ $t('cart.undo') }}
            </button>
          </div>
        </div>
      </TransitionGroup>

      <!-- Empty cart: one fragment, in label voice. No price, no action.
           Pending undo rows hold it off until they expire. -->
      <p
        v-if="rows.length === 0"
        class="my-auto text-center text-[var(--grey-400)] text-[length:var(--text-xs)] font-medium tracking-[0.12em] uppercase"
      >
        {{ $t('cart.empty') }}
      </p>

      <p
        class="sr-only"
        aria-live="polite"
        aria-atomic="true"
      >
        {{ announcement }}
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
          <p class="text-[var(--grey-400)] text-[length:var(--text-xs)] font-medium tracking-[0.12em] uppercase">
            {{ $t('cart.subtotal') }}
          </p>

          <div class="flex items-center gap-2">
            <ProductPrice
              :price="subtotal"
              class="text-[var(--grey-200)] text-[length:var(--text-base)] font-medium tabular-nums"
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
            base: 'w-full justify-center min-h-11 rounded-none shadow-none ring-0 bg-[var(--white)] text-[var(--ink-black)] hover:bg-[var(--white)] hover:text-[var(--ink-black)] active:bg-[var(--white)] active:text-[var(--ink-black)] px-4 py-3 text-[length:var(--text-xs)] font-medium tracking-[0.12em] uppercase',
            trailingIcon: 'size-4',
          }"
        />

        <UButton
          v-else
          aria-disabled="true"
          disabled
          :label="$t('cart.checkout')"
          :ui="{
            base: 'w-full justify-center min-h-11 rounded-none shadow-none ring-0 bg-[var(--white)] text-[var(--ink-black)] hover:bg-[var(--white)] hover:text-[var(--ink-black)] active:bg-[var(--white)] active:text-[var(--ink-black)] px-4 py-3 text-[length:var(--text-xs)] font-medium tracking-[0.12em] uppercase',
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