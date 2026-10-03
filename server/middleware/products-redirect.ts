// STI-271: server-side 308 redirect from the legacy /products/<handle> URL
// to the canonical /product/<handle> PDP.
//
// Why a server middleware (not a routeRule + not a `_redirects` file):
//   - Nitro's `routeRules['/products/:handle'].redirect.to` is treated as a
//     literal string at runtime. The `:handle` placeholder is NOT
//     substituted into the Location header, so the redirect always points at
//     `/product/:handle` regardless of the actual SKU. (Confirmed in
//     node_modules/.pnpm/nitropack@2.13.4_.../runtime/internal/route-rules.mjs:24-41
//     — the only substitution Nitro performs is the trailing `/**` join.)
//   - Cloudflare Pages `_redirects` files are processed by the edge layer
//     BEFORE the worker, but `nitro.preset: 'cloudflare_pages'` emits a
//     `_worker.js` directory at the deployment root, which puts the project
//     into "advanced mode" and makes the worker handle every request. In
//     that mode the `_redirects` file is served as a static asset (we saw
//     `GET /_redirects` return 200 with the Nuxt SPA HTML body on preview)
//     and the redirect entries are silently ignored.
//
// A request middleware runs inside the same Nitro worker that serves the
// rest of the app, so it works regardless of the CF Pages edge-layer
// behaviour.
//
// The waitlist flow emits `https://...products/<handle>?waitlist=ok` as the
// redirect target in functions/api/checkout.js:121, so this path is
// load-bearing for the "complete my waitlist signup" landing experience.
//
// STI-639: this gate used to be
//
//     const HANDLES = new Set(PRODUCTS.map(p => p.handle))
//     if (!HANDLES.has(handle)) return
//
// which left `app/data/products.ts` — a hardcoded TypeScript array — as the
// authority on which product URLs the storefront would redirect. That is the
// exact defect STI-579 removed from the destination route: a product created
// through Shopify Admin got no redirect and 404'd on `/products/<handle>` while
// serving 200 on `/product/<handle>`, and a product deleted from Shopify but
// still listed in the array kept 308-ing into a dead end.
//
// The gate now asks the live Storefront API, the same source the PDP reads, so
// the two routes agree by construction. The decision itself lives in
// app/utils/products-redirect-gate.ts and is unit-tested in
// src/catalog/products-redirect-gate.test.ts.
import {
    buildLegacyRedirectLocation,
    matchLegacyProductPath,
    splitPathAndQuery,
    type RedirectLookup,
} from '~/utils/products-redirect-gate'

const PRODUCT_EXISTS_QUERY = `#graphql
  query LegacyProductHandle($handle: String!) {
    product(handle: $handle) { id }
  }
`

/**
 * Ask the live store whether it sells this handle.
 *
 * Every failure mode — no credentials, a non-OK HTTP status, a GraphQL
 * `errors` block, a transport throw — returns `"unknown"` rather than
 * `"absent"`. That distinction is the whole point: an unknown answer is not
 * evidence that the product does not exist, and it must not be allowed to
 * suppress a redirect that is correct.
 */
async function lookupHandleLive(handle: string): Promise<RedirectLookup> {
    const env = useRuntimeConfig()
    const storefront = (env as { shopify?: { clients?: { storefront?: { publicAccessToken?: string } } } })
        .shopify?.clients?.storefront

    const domain = process.env.SHOPIFY_STOREFRONT_DOMAIN ?? process.env.SHOPIFY_ADMIN_STORE_DOMAIN
    // The runtime config token is populated from SHOPIFY_STOREFRONT_TOKEN in
    // nuxt.config.ts, and is the value that also reaches the browser-side
    // @nuxtjs/shopify client, so it is the same credential the PDP uses.
    const token
        = process.env.SHOPIFY_STOREFRONT_TOKEN
            ?? process.env.NUXT_SHOPIFY_CLIENTS_STOREFRONT_PUBLIC_ACCESS_TOKEN
            ?? storefront?.publicAccessToken

    if (!domain || !token) return 'unknown'

    try {
        const response = await fetch(`https://${domain}/api/2026-04/graphql.json`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Shopify-Storefront-Access-Token': token,
            },
            body: JSON.stringify({ query: PRODUCT_EXISTS_QUERY, variables: { handle } }),
        })
        if (!response.ok) return 'unknown'

        const payload = (await response.json()) as {
            data?: { product?: { id?: string } | null } | null
            errors?: unknown
        }
        if (payload.errors) return 'unknown'

        return payload.data?.product?.id ? 'live' : 'absent'
    }
    catch {
        return 'unknown'
    }
}

export default defineEventHandler(async (event) => {
    const raw = event.path || ''

    // STI-241: match against the PATHNAME only. `event.path` carries the query
    // string, so `[^/]+` swallowed `sku-001?waitlist=ok` as the "handle" —
    // `?` is not `/`, so it matched happily. The destination was then
    // `/product/sku-001?waitlist=ok?waitlist=ok`, because the query string was
    // re-appended to a handle that had already absorbed it. The real 404s this
    // issue reports (`/products/embroidered-hoodie` -> 308 -> 404) are the same
    // bug seen from the other side: the redirect was issued unconditionally.
    //
    // The path shape and the query-string re-attachment are handled in
    // buildLegacyRedirectLocation; this early return just avoids spending a
    // Storefront round trip on URLs that are not contract URLs at all.
    const handle = matchLegacyProductPath(splitPathAndQuery(raw).pathname)
    if (handle === null) return

    const lookup = await lookupHandleLive(handle)
    const location = buildLegacyRedirectLocation(raw, { lookup, hasStaticProduct: false })

    // Unknown handle: no redirect. Falling through lets the router produce the
    // 404 at the URL the customer actually typed — no false 308 in the SEO
    // chain, and no redirect hop spent on a guaranteed dead end.
    if (location === null) return

    // Re-attach the original query string exactly once.
    return sendRedirect(event, location, 308)
})
