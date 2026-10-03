<script setup lang="ts">
import type { PriceFieldsFragment } from '#shopify/storefront'

const props = defineProps<{
    price: PriceFieldsFragment
}>()

const { locale } = useI18n()

const price = computed(() => {
    const currencyCode = props.price?.currencyCode

    if (!currencyCode) return ''

    const rawPrice = Number(props.price.amount)

    const formatter = new Intl.NumberFormat(locale.value, {
        style: 'currency',
        currency: currencyCode,
    })

    return formatter.format(rawPrice)
})
</script>

<template>
    <span class="price">
        {{ price }}
    </span>
</template>

<style scoped>
/* components.price — typography.numeric: JetBrains Mono 500, tabular
   figures, 13px. The bold weight was a display weight the scale does not
   have, and without `tnum` the digits jitter as a price changes (STI-521).
   Colour stays grey-200 by default and is overridden only where a caller
   sets its own; every rule below is a default, never an override. */
.price {
    color: var(--grey-200);
    font-size: var(--text-base);
    font-weight: 500;
    font-feature-settings: "tnum" 1;
    line-height: 1.4;
    white-space: nowrap;
}
</style>
