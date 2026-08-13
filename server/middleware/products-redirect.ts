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
// behaviour. The middleware only matches `/products/<anything>` (one
// path segment, no trailing slash) and issues a 308, preserving the
// request method and body so probes/mutations against the legacy URL are
// not dropped.
//
// The waitlist flow emits `https://...products/<handle>` as the
// redirectBase in functions/api/checkout.js:121, so fixing this also
// unblocks the "complete my waitlist signup" landing experience.
export default defineEventHandler((event) => {
    const path = event.path || ''
    // Match /products/<handle> exactly (one non-empty segment, no further
    // path). `/products` (no handle) and `/products/foo/bar` are not
    // contract URLs and fall through to the normal 404.
    const match = /^\/products\/([^/]+)\/?$/.exec(path)
    if (!match) return
    const handle = match[1]
    // Preserve query string if present.
    const qs = event.path.includes('?') ? event.path.slice(event.path.indexOf('?')) : ''
    return sendRedirect(event, `/product/${handle}${qs}`, 308)
})
