<script setup lang="ts">

const props = withDefaults(defineProps<{
  href: string
  name: string
  price: number | string
  note?: string
  imageSrc?: string
  imageAlt?: string
  hoverImageSrc?: string
  badge?: 'embroidered' | 'limited-run' | 'low-stock' | 'made-to-order'
}>(), {
  imageAlt: ''
})

const { locale } = useI18n()

const finalImageAlt = computed(() => props.imageAlt || props.name)

/* STI-506: `price` is a `number | string` union — the static catalogue passes a
 * number, Shopify's `MoneyV2.amount` passes a string. Interpolating it raw
 * printed "$185.0" for the Shopify path while the static path printed "$185"
 * for the same product. Format here instead, and render nothing when the
 * amount is blank so a card never shows a bare "$". */
const formattedPrice = computed(() => formatPriceAmount(props.price, locale.value))
</script>

<template>
  <NuxtLink :to="href" class="product-card">
    <div class="product-card__image-wrap">
      <template v-if="imageSrc">
        <img
          :class="['product-card__img', 'product-card__img--primary', { 'has-hover': hoverImageSrc }]"
          :src="imageSrc"
          :alt="finalImageAlt"
          loading="lazy"
          decoding="async"
        />
        <img
          v-if="hoverImageSrc"
          class="product-card__img product-card__img--hover"
          :src="hoverImageSrc"
          :alt="`${finalImageAlt} — detail`"
          loading="lazy"
          decoding="async"
          aria-hidden="true"
        />
      </template>
    </div>

    <div class="product-card__body">
      <!-- STI-648: DESIGN.md (Product card) requires the name and the price on
           a single row below the image at a 12px gap. They were siblings in the
           column-flex body, so the price always fell to its own line. The row is
           now [identity cell, price]; the identity cell keeps the name and the
           Badge glued together so the pair still reads as one unit on the left
           and the price can sit at the trailing edge. -->
      <div class="product-card__row">
        <div class="product-card__ident">
          <h3 class="product-card__name">{{ name }}</h3>
          <Badge v-if="badge" :variant="badge" />
        </div>
        <!-- components.price: one textColor (colors.grey-200) and one numeric run
             for the whole string. The symbol stays inside the run, so the
             currency glyph and the digits share one tabular box (STI-486 F1). -->
        <p v-if="formattedPrice" class="product-card__price">${{ formattedPrice }}</p>
      </div>
      <!-- The note is supporting copy, not part of the name+price pair, so it
           sits under the row rather than between the name and the price. -->
      <p v-if="note" class="product-card__note">{{ note }}</p>
    </div>
  </NuxtLink>
</template>
