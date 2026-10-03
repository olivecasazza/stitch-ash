/**
 * STI-652: where a customer's order history actually lives.
 *
 * The `/account` page shipped by STI-633 stated that the storefront "does not
 * yet have accounts" and that there was nothing to sign in to. Both halves of
 * that were wrong, and the reason is worth recording because it is the same
 * class of error the STI-226 honesty gate exists for — a claim made from the
 * absence of code in this repository rather than from the state of the store.
 *
 * What was verified against the live store on 2026-10-03, with the public
 * Storefront token only:
 *
 *   GET https://stitch-and-ash.myshopify.com/.well-known/openid-configuration
 *   -> 200, issuer https://shopify.com/authentication/75579326509,
 *      scopes_supported includes customer-account-api:full,
 *      grant_types_supported includes authorization_code + refresh_token,
 *      code_challenge_methods_supported ["S256"],
 *      redirect_uri host in the authorize response is
 *      shopify.com/75579326509/account/callback
 *
 * That is Shopify's hosted customer-account surface, which is where orders are
 * held and displayed. So accounts exist; this app just could not see them.
 *
 * WHY A LINK AND NOT A SIGN-IN FORM. The Storefront API does expose the legacy
 * classic-customer path — `customerAccessTokenCreate` and a `Customer.orders`
 * field are both still present in the 2026-04 schema on this store — so a local
 * sign-in form was technically reachable with nothing but the token already in
 * `runtimeConfig`. It was not built, for two reasons:
 *
 *   1. docs/decisions/2026-07-21-shopify-as-system-of-record.md is Accepted and
 *      says customer accounts are Shopify's, that the Nuxt site "links to
 *      Shopify's account surface; it does not maintain its own auth", and that
 *      this repo must not grow an internal admin/orders surface. Building local
 *      auth would have quietly contradicted an accepted ADR.
 *   2. This store runs the new customer-account flow, whose whole credential
 *      exchange happens against `shopify.com/authentication/...` with a
 *      redirect URI that has to be registered in Shopify admin. That is an
 *      operator action on a live store, not something a storefront PR may
 *      decide.
 *
 * The legacy mutation is still worth naming: on a store running new customer
 * accounts it answers `Unidentified customer` rather than a schema error, so it
 * looks alive. It is not evidence that classic accounts exist here.
 *
 * This module deliberately exports the one string the page needs, so the
 * regression test can assert the page and this constant cannot drift apart.
 */

/**
 * The customer's order history, on the brand domain.
 *
 * `https://www.stitch-ash.com/account` is verified to redirect into the
 * Shopify-hosted account app (see the module comment). It is used in preference
 * to the `*.myshopify.com` form so the address a customer sees before handing
 * off is the brand domain.
 *
 * Do not "simplify" this to the myshopify host or to a hardcoded
 * `shopify.com/{id}/account` path: the id is a per-store internal, and the
 * `/account` path is the stable one.
 */
export const CUSTOMER_ACCOUNT_URL = 'https://www.stitch-ash.com/account'

/**
 * True when a URL points at the customer's own order history rather than at a
 * storefront page. Used by the regression test, and available to a server route
 * that needs to send someone to their orders.
 */
export function isCustomerAccountUrl(url: string): boolean {
    try {
        const { hostname, pathname } = new URL(url)
        return hostname === 'www.stitch-ash.com' && pathname.startsWith('/account')
    } catch {
        return false
    }
}
