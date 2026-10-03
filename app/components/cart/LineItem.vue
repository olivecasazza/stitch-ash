<script setup lang="ts">
import type { CartLineFieldsFragment } from '#shopify/storefront'

const props = defineProps<{
    line: CartLineFieldsFragment
}>()

const MIN_QUANTITY = 1
const MAX_QUANTITY = 10

const { update, remove } = useCart()
const localePath = useLocalePath()

const variant = computed(() => props.line.merchandise)
const to = computed(() => localePath(`/product/${variant.value.product.handle}`))

const imageUrl = computed(() => variant.value.image?.url)

// Shopify names the option of a single-variant product "Default Title". It is
// a placeholder, not a choice, so it never reaches the row.
const optionLabel = computed(() => (variant.value.selectedOptions ?? [])
    .map(option => option.value)
    .filter(value => value && value !== 'Default Title')
    .join(' / '))

const quantity = ref(clamp(props.line.quantity))
// One request in flight per row: a stepper click while the previous update is
// still open must not read a half-written value back.
const pending = ref(false)

function clamp(value: number) {
    if (!Number.isFinite(value)) return MIN_QUANTITY

    return Math.min(MAX_QUANTITY, Math.max(MIN_QUANTITY, Math.trunc(value)))
}

// `commit` receives a raw candidate (typed text or stepper delta) and sends it
// only once it resolves to a whole number inside 1-10. A half-typed "1" on the
// way to "10" is left on screen rather than pushed to the server.
async function commit(candidate: number) {
    if (pending.value) return

    const next = Number(candidate)

    if (!Number.isFinite(next)) {
        quantity.value = clamp(props.line.quantity)

        return
    }

    const normalised = clamp(next)

    quantity.value = normalised

    if (normalised === props.line.quantity) return

    pending.value = true

    // `update` resolves with the server's quantity: the requested one on
    // success, the previous one when the mutation failed.
    quantity.value = await update(props.line.id, normalised)

    pending.value = false
}

const onInput = (event: Event) => {
    const raw = (event.target as HTMLInputElement).value

    quantity.value = raw === '' ? MIN_QUANTITY : clamp(Number(raw))
}

// Shares the row's one-request lock: a second click while the removal is in
// flight would remove a line that is already gone and raise an error toast
// over the undo row the first click produces. On success the row unmounts.
async function onRemove() {
    if (pending.value) return

    pending.value = true

    await remove(props.line.id)

    pending.value = false
}
</script>

<template>
    <div class="line-item">
        <NuxtLink
            :to="to"
            class="line-item__media"
            :aria-label="`${$t('product.view')}: '${variant.product.title}'`"
        >
            <div
                v-if="imageUrl"
                class="line-item__frame"
            >
                <NuxtImg
                    provider="shopify"
                    :src="imageUrl"
                    :alt="variant.image?.altText ?? variant.product.title"
                    width="160"
                    height="200"
                    class="line-item__image"
                />
            </div>
            <div
                v-else
                class="line-item__plate"
                aria-hidden="true"
            />
        </NuxtLink>

        <div class="line-item__body">
            <NuxtLink
                :to="to"
                class="line-item__title"
            >
                {{ variant.product.title }}
            </NuxtLink>

            <p
                v-if="optionLabel"
                class="line-item__options"
            >
                {{ optionLabel }}
            </p>

            <div class="line-item__foot">
                <div class="line-item__stepper">
                    <button
                        type="button"
                        class="line-item__step"
                        :disabled="pending || quantity <= MIN_QUANTITY"
                        aria-label="Decrease quantity"
                        @click="commit(quantity - 1)"
                    >
                        <Icon
                            name="i-lucide-minus"
                            class="size-4"
                        />
                    </button>

                    <input
                        :value="quantity"
                        type="text"
                        inputmode="numeric"
                        autocomplete="off"
                        class="line-item__qty"
                        aria-label="Quantity"
                        :disabled="pending"
                        @input="onInput"
                        @change="commit(quantity)"
                        @blur="commit(quantity)"
                    >

                    <button
                        type="button"
                        class="line-item__step"
                        :disabled="pending || quantity >= MAX_QUANTITY"
                        aria-label="Increase quantity"
                        @click="commit(quantity + 1)"
                    >
                        <Icon
                            name="i-lucide-plus"
                            class="size-4"
                        />
                    </button>
                </div>

                <ProductPrice
                    :price="variant.price"
                    class="line-item__price"
                />
            </div>
        </div>

        <button
            type="button"
            class="line-item__remove"
            :aria-label="`Remove ${variant.product.title} from cart.`"
            :disabled="pending"
            @click="onRemove"
        >
            <Icon
                name="i-lucide-x"
                class="size-4"
            />
        </button>
    </div>
</template>

<style scoped>
.line-item {
    position: relative;
    display: flex;
    gap: 16px;
    padding: 16px 0;
    border-bottom: var(--rule);
}

.line-item__media {
    flex: none;
    display: block;
}

/* 4:5 with `object-fit: cover`. The box holds the aspect; the image fills it
   without stretching, which the previous square `fill` box did. */
.line-item__frame,
.line-item__plate {
    width: 96px;
    aspect-ratio: 4 / 5;
    background: var(--grey-950);
}

.line-item__frame {
    overflow: hidden;
}

.line-item__image {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.line-item__body {
    flex: 1 1 auto;
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding-top: 12px;
}

.line-item__title {
    color: var(--bone);
    font-size: var(--text-base);
    font-weight: 500;
    line-height: 1.4;
}

.line-item__options {
    color: var(--grey-400);
    font-size: var(--text-sm);
    line-height: 1.4;
}

.line-item__foot {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin-top: auto;
    padding-top: 12px;
}

.line-item__stepper {
    display: flex;
    align-items: center;
    border: var(--rule-control);
    background: var(--charcoal);
}

/* 44px hit area either side of the number (WCAG SC 2.5.8). */
.line-item__step {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    color: var(--bone);
    transition: background var(--transition-fast);
}

.line-item__step:hover:not(:disabled) {
    background: var(--grey-950);
}

.line-item__step:disabled {
    color: var(--grey-400);
}

.line-item__qty {
    width: 48px;
    height: 44px;
    border: none;
    background: transparent;
    color: var(--bone);
    font-family: var(--font-body);
    font-size: var(--text-base);
    font-weight: 500;
    font-feature-settings: "tnum" 1;
    text-align: center;
}

.line-item__qty:focus-visible {
    outline: none;
}

.line-item__price {
    color: var(--grey-200);
    font-size: var(--text-base);
    line-height: 1;
}

.line-item__remove {
    position: absolute;
    top: 8px;
    right: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    color: var(--grey-400);
    transition: color var(--transition-fast);
}

.line-item__remove:hover:not(:disabled) {
    color: var(--bone);
}

.line-item__media:focus-visible,
.line-item__title:focus-visible,
.line-item__step:focus-visible,
.line-item__qty:focus-visible,
.line-item__remove:focus-visible {
    outline: 2px solid var(--focus);
    outline-offset: 4px;
}
</style>