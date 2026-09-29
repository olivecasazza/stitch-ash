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
import { PRODUCTS } from '~/data/products'

// The destination gate is app/pages/product/[handle].vue, which throws a 404
// unless the handle is in PRODUCTS. PRODUCTS is therefore the authoritative
// set of routable handles, and consulting it here makes the entry URL agree
// with the destination instead of redirecting into a guaranteed 404.
const HANDLES = new Set(PRODUCTS.map(p => p.handle))

export default defineEventHandler((event) => {
    const raw = event.path || ''

    // STI-241: match against the PATHNAME only. `event.path` carries the query
    // string, so `[^/]+` swallowed `sku-001?waitlist=ok` as the "handle" —
    // `?` is not `/`, so it matched happily. The destination was then
    // `/product/sku-001?waitlist=ok?waitlist=ok`, because the query string was
    // re-appended to a handle that had already absorbed it. The real 404s this
    // issue reports (`/products/embroidered-hoodie` -> 308 -> 404) are the same
    // bug seen from the other side: the redirect was issued unconditionally.
    const qIndex = raw.indexOf('?')
    const pathname = qIndex === -1 ? raw : raw.slice(0, qIndex)
    const qs = qIndex === -1 ? '' : raw.slice(qIndex)

    // Match /products/<handle> exactly (one non-empty segment, no further
    // path). `/products` (no handle) and `/products/foo/bar` are not
    // contract URLs and fall through to the normal 404.
    const match = /^\/products\/([^/]+)\/?$/.exec(pathname)
    if (!match) return
    // `noUncheckedIndexedAccess` types a capture group as `string | undefined`.
    // The `+` quantifier guarantees a non-empty segment, but the type system
    // does not, so narrow it here rather than asserting.
    const handle = match[1]
    if (!handle) return

    // Unknown handle: no redirect. Falling through lets the router produce the
    // 404 at the URL the customer actually typed — no false 308 in the SEO
    // chain, and no redirect hop spent on a guaranteed dead end.
    if (!HANDLES.has(handle)) return

    // Re-attach the original query string exactly once.
    return sendRedirect(event, `/product/${handle}${qs}`, 308)
})
