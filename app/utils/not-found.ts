/**
 * Customer-facing copy for a 404 — one place, so no route can invent its own.
 *
 * Record: STI-556. The defect this replaces: all four not-found routes built
 * `statusText` as an i18n key plus the raw request path —
 *
 *     statusText: `${$t('error.notFound')}: ${route.fullPath}`,
 *
 * and `app/error.vue` renders `statusMessage` ahead of `message`, so the
 * customer read `Page not found: /collection/all` on every bad URL. The path is
 * ops-voiced, tells a shopper nothing, and confirms the exact URL that failed,
 * which is worth more to someone probing the site than to someone who mistyped
 * a link.
 *
 * The wording is not invented here. `i18n/locales/{en,de}.json` already carry
 * purpose-written per-resource strings under `error.*` ("Collection not found",
 * "Produkt nicht gefunden", ...); they were simply never used for this case.
 * What this module owns is the CHOICE of string and the rule that no request
 * path reaches the customer — both are testable without a browser.
 *
 * Operational detail is not lost: the path is still on `error.url` and in the
 * server log. It is simply no longer rendered to the requester.
 */

/** The kinds of resource that can 404 on this storefront. */
export type NotFoundResource = 'collection' | 'product' | 'blog' | 'article' | 'page'

/** A `useI18n()` translator, narrowed to the shape this module needs. */
export type Translate = (key: string) => string

/**
 * The `error.*` i18n key for a resource.
 *
 * `page` is the honest fallback for a URL that is not one of the four typed
 * routes; it maps to the generic `error.notFound` string.
 */
export function notFoundI18nKey(resource: NotFoundResource): string {
    return resource === 'page' ? 'error.notFound' : `error.${resource}`
}

export interface NotFoundCopyInput {
    resource: NotFoundResource
    translate: Translate
}

export interface NotFoundCopy {
    /** Goes in `statusText` / `statusMessage`. Never contains a request path. */
    statusText: string
}

/**
 * The one customer-visible sentence a 404 shows.
 *
 * Both `statusText` and `message` carry this string on every not-found route,
 * so the answer does not depend on which field `app/error.vue` reaches for
 * first. A caller that passes an empty translation gets the resource name
 * rather than an empty paragraph — a blank error page is worse than a plain
 * one.
 */
export function resolveNotFoundCopy(input: NotFoundCopyInput): NotFoundCopy {
    const translated = (input.translate(notFoundI18nKey(input.resource)) ?? '').trim()
    return { statusText: translated === '' ? 'Not found' : translated }
}
