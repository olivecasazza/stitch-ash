/* STI-506: price display normalisation.
 *
 * Shopify `MoneyV2.amount` arrives as a STRING ("185.0", "34.95") while the
 * static catalogue in `app/data/products.ts` uses a JS number (185). Any site
 * that interpolates the raw value therefore prints "$185.0" on the Shopify
 * path and "$185" on the static one, for the same product.
 *
 * `minimumFractionDigits: 0` is what drops the trailing ".0" — a
 * `maximumFractionDigits`-style slice of the string would corrupt real
 * cents ("34.95" -> "34.9"), so the number is parsed and re-formatted
 * instead, which also picks up the locale's thousands grouping.
 *
 * NOTE this is deliberately NOT the same as `app/components/product/Price.vue`,
 * which uses `style: 'currency'` and therefore pins two decimals ("$185.00").
 * Cart lines and totals are the right place for that; the product card is not
 * the right place, and the two must not be conflated (STI-506).
 *
 * Returns '' for a missing/blank/unparseable amount so a caller can omit the
 * price entirely. `Number('')` is 0, so a blank Shopify amount must never be
 * allowed to reach the formatter — it would print "$0" and advertise a
 * free product that does not exist.
 */
export const formatPriceAmount = (amount: number | string | null | undefined, locale?: string) => {
    if (amount === null || amount === undefined) return ''

    const raw = typeof amount === 'string' ? amount.trim() : amount

    if (raw === '') return ''

    const value = Number(raw)

    if (!Number.isFinite(value)) return ''

    return new Intl.NumberFormat(locale, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(value)
}
