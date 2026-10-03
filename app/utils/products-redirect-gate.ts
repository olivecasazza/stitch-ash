/**
 * The `/products/<handle>` -> `/product/<handle>` redirect gate, extracted from
 * `server/middleware/products-redirect.ts` so it can be tested without a browser
 * or a network round trip to Shopify.
 *
 * This mirrors the extraction that `app/utils/pdp-product.ts` already made for
 * the PDP gate (`resolvePdpResolution`), and it closes the same defect class on
 * the other side of the redirect.
 *
 * Record: docs/decisions/2026-09-27-data-provenance-baseline.md (STI-541,
 * STI-579). STI-579 moved `/` and `/products` onto the live Storefront API and
 * moved the PDP's 404 gate off `app/data/products.ts`. The legacy-URL redirect
 * kept importing the static array, so a hardcoded TypeScript file was still the
 * authority on which product URLs the storefront will redirect — the exact
 * defect STI-579 removed from the PDP.
 *
 * Both routes now read the same source (the live store), so they agree by
 * construction rather than by coincidence.
 */

/** What the redirect gate learned about a handle. */
export type RedirectLookup
/** The live store returned this handle. */
    = | 'live'
  /** The live store answered, and it does not have this handle. */
        | 'absent'
  /**
   * The lookup did not complete — no Storefront credentials configured, the
   * network failed, or the API returned an error.
   *
   * This is deliberately distinct from `absent`: a failed lookup is not proof
   * that a product does not exist, and must never be treated as if it were.
   */
        | 'unknown'

export interface RedirectGateInput {
    /** The handle extracted from the legacy URL. Never empty. */
    handle: string
    /** Whether the live store knows this handle. */
    lookup: RedirectLookup
    /**
     * Whether `app/data/products.ts` has an entry for this handle. Preview
     * enrichment only — it is never allowed to create a redirect on its own.
     */
    hasStaticProduct: boolean
}

export type RedirectDecision
/** Issue the 308 to the canonical PDP. */
    = | { redirect: true, target: string }
  /**
   * Send no redirect and let the router 404 at the URL the customer typed —
   * no false 308 in the SEO chain, no hop spent on a dead end. Preserves the
   * STI-241 behaviour.
   */
        | { redirect: false, reason: 'not_a_product' }

/**
 * Split a raw request path into its pathname and query string.
 *
 * STI-241: `event.path` carries the query string, so a naive `[^/]+` capture
 * swallowed `sku-001?waitlist=ok` as the handle. The query string must be
 * stripped at the FIRST `?` and re-attached exactly once, or the destination
 * becomes `/product/sku-001?waitlist=ok?waitlist=ok`.
 *
 * A `#` cannot reach a server request target, so only `?` is handled.
 */
export function splitPathAndQuery(raw: string): { pathname: string, query: string } {
    const qIndex = raw.indexOf('?')
    return qIndex === -1
        ? { pathname: raw, query: '' }
        : { pathname: raw.slice(0, qIndex), query: raw.slice(qIndex) }
}

/**
 * Match the contract URL shape `/products/<handle>`.
 *
 * Exactly one non-empty segment and nothing after it. `/products` (no handle)
 * and `/products/foo/bar` are not contract URLs and must fall through to the
 * normal 404. A trailing slash is accepted so `/products/sku-001/` behaves like
 * `/products/sku-001`.
 */
export function matchLegacyProductPath(pathname: string): string | null {
    const match = /^\/products\/([^/]+)\/?$/.exec(pathname)
    // `noUncheckedIndexedAccess` types a capture group as `string | undefined`.
    // The `+` quantifier guarantees a non-empty segment, but the type system
    // does not, so narrow it here rather than asserting.
    const handle = match?.[1]
    return handle ? decodeURIComponent(handle) : null
}

/**
 * Decide whether the legacy URL should redirect, and to where.
 *
 * The live store is the authority, exactly as it is on the PDP:
 *
 * - `live`     -> redirect. A product Shopify sells is reachable from its
 *                 legacy URL whether or not the static array has ever heard of
 *                 it. This is the false negative this replaces: a product
 *                 created through Admin got no redirect and 404'd on `/products/`
 *                 while serving 200 on `/product/`.
 * - `absent`   -> do not redirect. Shopify does not have it, so the canonical
 *                 PDP cannot render it either. Redirecting would manufacture a
 *                 308 hop into a guaranteed dead end, and the static array must
 *                 not be able to conjure one back. This is the false positive
 *                 this replaces: a product deleted from Shopify but still listed
 *                 in `app/data/products.ts` kept redirecting.
 * - `unknown`  -> do not redirect. A failed lookup is not proof of absence, so
 *                 the honest response is to let the request fall through rather
 *                 than guess in either direction.
 *
 * `hasStaticProduct` is accepted and deliberately unused as a gate: keeping it
 * in the input signature makes it visible to a reader that the static array
 * cannot influence this decision, and keeps the call site honest about what it
 * knows. It remains useful for logging.
 */
export function resolveLegacyRedirectDecision(input: RedirectGateInput): RedirectDecision {
    // `hasStaticProduct` is intentionally not read here. It stays in the input
    // shape so the call site cannot quietly reintroduce the static array as a
    // gate, and so a reader sees at a glance that this decision ignores it.
    void input.hasStaticProduct

    if (input.lookup === 'live') {
        return { redirect: true, target: `/product/${input.handle}` }
    }

    // `absent` and `unknown` both fall through, but for different reasons, and
    // both land on the router's own 404 at the URL the customer typed.
    return { redirect: false, reason: 'not_a_product' }
}

/**
 * Build the final Location value, re-attaching the original query string
 * exactly once. Returns `null` when no redirect should be issued.
 */
export function buildLegacyRedirectLocation(
    rawPath: string,
    input: Omit<RedirectGateInput, 'handle'>,
): string | null {
    const handle = matchLegacyProductPath(splitPathAndQuery(rawPath).pathname)
    if (handle === null) return null

    const decision = resolveLegacyRedirectDecision({ ...input, handle })
    if (!decision.redirect) return null

    return `${decision.target}${splitPathAndQuery(rawPath).query}`
}
