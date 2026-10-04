<script setup lang="ts">
import { withoutPlaceholderSizes } from '~/utils/size-labels'

/**
 * One row of the catalogue index.
 *
 * The catalogue has no photography, so a product is a set of facts and the row
 * is where they are read. There is no plate around the row and no placeholder
 * box: an image, when there is one, is a small 4:5 thumbnail at the leading
 * edge and its absence leaves no gap in the columns.
 *
 * Column model, wide (>= 768px) — one row, four aligned columns after the
 * optional thumbnail:
 *
 *     [thumb 44x55]  Name            Sizes    Spec values        Price
 *     min-width      2fr              7rem     2fr, right-aligned  6rem
 *
 * Every column has a fixed min so the values line up down the page like a
 * datasheet rather than reflowing per row. Narrow (< 768px) collapses to one
 * stacked block: thumbnail and name on the first line, then the sizes, then
 * each spec value on its own line, price last. Same facts, same order.
 */
const props = withDefaults(defineProps<{
  href: string
  name: string
  price: number | string
  note?: string
  imageSrc?: string
  imageAlt?: string
  hoverImageSrc?: string
  badge?: 'embroidered' | 'limited-run' | 'low-stock' | 'made-to-order'
  /** Available size labels, in order. Two or more collapse to a range. */
  sizes?: string[]
  /** Headline facts from the spec sections, via `specSummary`. */
  specs?: string[]
}>(), {
  imageAlt: '',
  sizes: () => [],
  specs: () => [],
})

const { locale } = useI18n()

const finalImageAlt = computed(() => props.imageAlt || props.name)

/* STI-506: `price` is a `number | string` union — the static catalogue passes a
 * number, Shopify's `MoneyV2.amount` passes a string. Interpolating it raw
 * printed "$185.0" for the Shopify path while the static path printed "$185"
 * for the same product. Format here instead, and render nothing when the
 * amount is blank so a row never shows a bare "$". */
const formattedPrice = computed(() => formatPriceAmount(props.price, locale.value))

/* "S–XXL" for a ranged option, "One size" for a single-entry one, "" for a
 * product with no size option at all — an empty cell is a gap in the column,
 * so the size column is dropped rather than padded.
 *
 * The placeholder filter runs HERE, at the one point every listing passes
 * through, so no surface can print Shopify's "Default Title" in the size
 * column: `~/utils/size-labels` turns a lone placeholder into "One size". */
const sizeRange = computed(() => {
  const sizes = withoutPlaceholderSizes(props.sizes)
  if (!sizes.length) return ''
  if (sizes.length === 1) return sizes[0]!
  return `${sizes[0]!}–${sizes.at(-1)!}`
})

const specList = computed(() => props.specs.filter(Boolean).slice(0, 3))
</script>

<template>
  <NuxtLink :to="href" class="product-row">
    <div v-if="imageSrc" class="product-row__figure">
      <img
        :class="['product-row__img', 'product-row__img--primary', { 'has-hover': hoverImageSrc }]"
        :src="imageSrc"
        :alt="finalImageAlt"
        loading="lazy"
        decoding="async"
      />
      <img
        v-if="hoverImageSrc"
        class="product-row__img product-row__img--hover"
        :src="hoverImageSrc"
        :alt="`${finalImageAlt} — detail`"
        loading="lazy"
        decoding="async"
        aria-hidden="true"
      />
    </div>

    <div class="product-row__grid">
      <h3 class="product-row__ident">
        <span class="product-row__name">{{ name }}</span>
        <Badge v-if="badge" :variant="badge" />
      </h3>

      <p v-if="sizeRange" class="product-row__cell product-row__sizes">
        {{ sizeRange }}
      </p>

      <ul v-if="specList.length" class="product-row__cell product-row__specs">
        <li v-for="spec in specList" :key="spec" class="product-row__spec">
          {{ spec }}
        </li>
      </ul>

      <!-- components.price: one textColor and one numeric run for the whole
           string. The symbol stays inside the run, so the currency glyph and
           the digits share one tabular box (STI-486 F1). -->
      <p v-if="formattedPrice" class="product-row__cell product-row__price">${{ formattedPrice }}</p>
    </div>

    <p v-if="note" class="product-row__note">{{ note }}</p>
  </NuxtLink>
</template>

<style scoped>
/* The index row: flush left, hairline-ruled, no fill and no box. The rule is
   the only structure between rows — nothing is decoration. */
.product-row {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  min-height: 44px;
  padding-block: var(--space-sm);
  border-block-start: var(--rule);
  color: var(--bone);
  text-decoration: none;
  transition: color var(--transition-fast);
}

.product-row:focus-visible {
  outline: 2px solid var(--focus);
  outline-offset: 4px;
}

.product-row:hover,
.product-row:focus-visible {
  color: var(--white);
}

.product-row__figure {
  position: relative;
  flex: 0 0 auto;
  width: 44px;
  aspect-ratio: 4 / 5;
  overflow: hidden;
  background: var(--charcoal);
}

.product-row__img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.product-row__img--primary.has-hover { opacity: 1; }
.product-row__img--hover { opacity: 0; }

.product-row:hover .product-row__img--primary.has-hover,
.product-row:focus-visible .product-row__img--primary.has-hover {
  opacity: 0;
}

.product-row:hover .product-row__img--hover,
.product-row:focus-visible .product-row__img--hover {
  opacity: 1;
}

.product-row__grid {
  display: grid;
  flex: 1 1 auto;
  min-width: 0;
  gap: 4px var(--space-md);
  align-items: baseline;
}

.product-row__ident {
  display: flex;
  align-items: baseline;
  gap: var(--space-sm);
  min-width: 0;
  margin: 0;
  font-size: var(--text-lg);
  font-weight: 500;
}

.product-row__name {
  /* `anywhere` broke a name one character per line inside a narrow column —
     "Embr / oide / red". `break-word` only breaks when a word genuinely
     cannot fit the column, so a name stays readable at every viewport from
     320px up. */
  overflow-wrap: break-word;
  hyphens: none;
}

.product-row__cell {
  margin: 0;
  color: var(--grey-400);
  font-size: var(--text-sm);
}

.product-row__specs {
  display: flex;
  flex-wrap: wrap;
  gap: 4px var(--space-md);
  padding: 0;
  list-style: none;
}

.product-row__price {
  color: var(--grey-200);
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  font-feature-settings: "tnum" 1;
}

.product-row__note {
  color: var(--grey-400);
  font-size: var(--text-sm);
}

/* Wide: aligned columns. Fixed min-widths on the numeric and spec columns are
   what make the values line up down the page instead of tracking the name.
   Each cell is pinned to its column rather than auto-placed: a row that has no
   sizes or no specs would otherwise slide the cells after it one column left,
   so prices would not line up down the page. */
@media (min-width: 768px) {
  .product-row__grid {
    grid-template-columns: minmax(0, 2fr) 7rem minmax(0, 2fr) 6rem;
  }

  .product-row__ident { grid-column: 1; }
  .product-row__sizes { grid-column: 2; }
  .product-row__specs { grid-column: 3; }
  .product-row__price { grid-column: 4; }

  .product-row__sizes,
  .product-row__price {
    text-align: right;
  }
}

@media (prefers-reduced-motion: reduce) {
  .product-row {
    transition: none;
  }
}
</style>