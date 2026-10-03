/**
 * Locale code -> Shopify market (`@inContext` language/country pair).
 *
 * Extracted from `app/composables/localization.ts` for the same reason
 * `app/utils/not-found.ts` and `app/utils/products-redirect-gate.ts` were
 * extracted: the decision is pure, it is easy to get wrong, and it cannot be
 * reached from a `node --test` unit test while it lives inside a composable
 * that calls `useI18n()`.
 *
 * STI-647: registering the `de` locale is what made this load-bearing. Every
 * storefront query passes this pair straight into `@inContext(language:,
 * country:)`, and `de` has no region subtag to take a country from. A missing
 * country is not "Germany" — it is "no market", which makes Shopify serve the
 * shop default and the German storefront quote the wrong market's money.
 *
 * The return types are computed, not `string`. `app/app.vue` and
 * `app/error.vue` index `@nuxt/ui/locale` with the derived language
 * (`locales[language.value]`), and that index only typechecks while the key is
 * a literal union of real module names. Widening it to `string` breaks the
 * storefront build, and narrowing it by hand in two call sites would let a
 * locale be registered that `@nuxt/ui` has no translation for.
 */

/**
 * The first subtag of a locale code: `'en-us'` -> `'en'`, `'de'` -> `'de'`.
 *
 * A code with no `-` is its own language, which is what a bare `de` is.
 */
export type LocaleLanguage<S extends string>
    = S extends `${infer Language}-${string}` ? Language : S

/**
 * The country subtag of a locale code, falling back to the language:
 * `'en-us'` -> `'us'`, `'de'` -> `'de'`.
 */
export type LocaleCountry<S extends string>
    = S extends `${string}-${infer Country}` ? Country : LocaleLanguage<S>

/** The subtags a locale code carries, e.g. `['en', 'us']` for `en-us`. */
function subtags(code: string): string[] {
    return code.split('-')
}

/**
 * The language subtag, falling back to the whole code.
 *
 * A code that somehow has no first subtag cannot happen for `String#split`, but
 * the `|| code` keeps an empty code from producing an empty
 * `@inContext(language:)`, which is a worse failure than the code itself.
 */
export function localeLanguage<S extends string>(code: S): LocaleLanguage<S> {
    return (subtags(code)[0] || code) as LocaleLanguage<S>
}

/**
 * The country subtag, falling back to the language.
 *
 * `en-us` -> `us`. `de` -> `de`, which is the German market and the region a
 * bare-language code names. Never empty: see {@link localeLanguage} for why a
 * missing value is worse than a guess.
 */
export function localeCountry<S extends string>(code: S): LocaleCountry<S> {
    return (subtags(code)[1] || localeLanguage(code)) as LocaleCountry<S>
}

/** Both halves of an `@inContext` directive, in the shape the queries bind. */
export interface LocaleMarket {
    language: string
    country: string
}

export function localeMarket<S extends string>(code: S): { language: LocaleLanguage<S>, country: LocaleCountry<S> } {
    return { language: localeLanguage(code), country: localeCountry(code) }
}