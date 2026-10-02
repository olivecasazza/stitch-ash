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

/** Inputs for {@link customerVisibleNotFoundMessage}. */
export interface CustomerVisibleNotFoundInput extends NotFoundCopyInput {
    /**
     * The error string arriving from wherever the 404 was raised.
     *
     * Trusted only after {@link embedsRequestPath} clears it. On the four typed
     * routes this is a string built by {@link resolveNotFoundCopy} and is kept;
     * for a URL that matched no route at all it is Nuxt's own catch-all string,
     * which carries the path and is therefore replaced.
     */
    candidate: string | undefined
    /**
     * The path the customer requested, when the caller has it.
     *
     * An exact comparison is stronger than the shape heuristic, so it is worth
     * passing. `NuxtError.url` is not used for this: on a 404 it is the
     * requesting URL, which is what we are trying to keep off the screen.
     */
    requestPath?: string
}

/**
 * Does this error string hand the requester's own URL back to them?
 *
 * Catches both shapes the string can arrive in: the exact request path, and any
 * bare route-shaped token (`/collection/all`, `/blog/x/y?a=1`). A customer
 * sentence never contains one, so a false positive costs at most a plainer
 * message — while a false negative leaks the failing URL to whoever asked for
 * it.
 */
export function embedsRequestPath(text: string, requestPath?: string): boolean {
    if (requestPath) {
        const [pathOnly = ''] = requestPath.split(/[?#]/)
        if (pathOnly.length > 1 && (text.includes(requestPath) || text.includes(pathOnly))) {
            return true
        }
    }

    // A token that starts at a `/` and runs to whitespace is route-shaped. This
    // is what catches Nuxt's ``Page not found: ${to.fullPath}``, where the path
    // is the last token and may carry a query string.
    return /(?:^|\s)\/\S*/.test(text)
}

/**
 * The sentence a customer is shown for a 404, with the URL guaranteed absent.
 *
 * STI-556 removed the path from the four typed routes, but it could not reach
 * the common case: Nuxt raises that 404 from framework code
 * (`nuxt/dist/pages/runtime/plugins/router.js`, ``statusText: `Page not found:
 * ${to.fullPath}` ``) with no app-level hook to intercept it. `app/error.vue` is
 * the one place every 404 passes through regardless of origin, so the last-line
 * scrub lives here.
 *
 * A candidate that is already clean is returned untouched — that is what keeps
 * "Collection not found" and "Product not found" on screen. Only a candidate
 * that leaks the path is replaced, with the generic localized `page` string.
 *
 * Non-404s are returned as-is: this owns the not-found case, and inventing copy
 * for a server fault would hide the operator's text.
 */
export function customerVisibleNotFoundMessage(input: CustomerVisibleNotFoundInput): string {
    const candidate = (input.candidate ?? '').trim()

    if (candidate !== '' && !embedsRequestPath(candidate, input.requestPath)) {
        return candidate
    }

    return resolveNotFoundCopy({ resource: 'page', translate: input.translate }).statusText
}
