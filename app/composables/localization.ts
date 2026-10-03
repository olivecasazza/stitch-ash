import type { Locale } from '#i18n'

import { localeCountry, localeLanguage } from '~/utils/locale-market'

/**
 * The Shopify market for the active locale.
 *
 * STI-647: the derivation itself now lives in `app/utils/locale-market.ts` so
 * it can be unit-tested without a Nuxt runtime, and so the reasoning about a
 * bare-language code like `de` sits next to the function that depends on it
 * rather than inside a composable nobody can call from a test.
 *
 * The previous local `Split<S, D>` type helper turned `split('en-us', '-')`
 * into the tuple `['en', 'us']` so `getCountry` could index `[1]` and keep the
 * `string` type. That holds only while every registered code contains a `-`;
 * registering `de` made the index a type error and, once compiled, an
 * `undefined` country bound into every `@inContext` directive on the site.
 *
 * The types stay literal on purpose. `app/app.vue` and `app/error.vue` index
 * `@nuxt/ui/locale` with `language`, and that index is only sound while the key
 * is a union of real locale module names — which is also what makes a locale
 * with no `@nuxt/ui` translation a build failure rather than a blank page.
 */
export const useLocalization = () => {
    const { locale } = useI18n()

    const getLanguage = <S extends Locale>(locale: S) => localeLanguage(locale)

    /** `en-us` -> `us`; a bare `de` -> `de`. Never empty. */
    const getCountry = <S extends Locale>(locale: S) => localeCountry(locale)

    const language = computed(() => getLanguage(locale.value))
    const country = computed(() => getCountry(locale.value))

    return {
        language,
        country,

        getLanguage,
        getCountry,
    }
}
