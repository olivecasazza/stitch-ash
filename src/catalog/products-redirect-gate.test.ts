import assert from 'node:assert/strict'
import test from 'node:test'

import {
    buildLegacyRedirectLocation,
    matchLegacyProductPath,
    resolveLegacyRedirectDecision,
    splitPathAndQuery,
} from '../../app/utils/products-redirect-gate'

/**
 * Regression tests for the redirect-gate provenance defect (STI-639).
 *
 * The defect this pins: STI-579 moved the PDP's 404 gate off
 * `app/data/products.ts` and onto the live Storefront API, but
 * `server/middleware/products-redirect.ts` kept
 *
 *     import { PRODUCTS } from '~/data/products'
 *     const HANDLES = new Set(PRODUCTS.map(p => p.handle))
 *     if (!HANDLES.has(handle)) return
 *
 * So a hardcoded TypeScript array remained the authority on which legacy
 * product URLs the storefront would redirect — the exact defect class STI-579
 * removed from the destination route.
 *
 * The three handles in the static array (`sku-001`, `sku-002`, `sku-003`)
 * happen to match the live store today, so no redirect is currently wrong.
 * That coincidence is what makes this a latent defect worth pinning now: the
 * next product created through Shopify Admin, or the first one deleted, breaks
 * the redirect with no test and no signal.
 */

const LIVE = 'live' as const

test('a handle the live store knows always redirects, static array or not', () => {
    // This is the false negative. A product created through Shopify Admin that
    // the static array has never heard of got NO redirect, so /products/<handle>
    // 404'd while /product/<handle> served 200.
    const decision = resolveLegacyRedirectDecision({
        handle: 'autumn-2026-hoodie',
        lookup: LIVE,
        hasStaticProduct: false,
    })

    assert.deepEqual(decision, { redirect: true, target: '/product/autumn-2026-hoodie' })
})

test('the static array cannot conjure a redirect for a deleted product', () => {
    // This is the false positive, and it is the worse of the two: a product
    // deleted from Shopify but still listed in app/data/products.ts used to keep
    // issuing a 308 into a PDP that would then 404.
    const decision = resolveLegacyRedirectDecision({
        handle: 'sku-001',
        lookup: 'absent',
        hasStaticProduct: true,
    })

    assert.deepEqual(decision, { redirect: false, reason: 'not_a_product' })
})

test('a failed lookup is not treated as proof of absence or of presence', () => {
    // No credentials, a network failure, or an API error must not silently
    // redirect a handle that does not exist. Letting the router 404 is the
    // honest outcome, and it is the same outcome as a genuine `absent`.
    const decision = resolveLegacyRedirectDecision({
        handle: 'sku-002',
        lookup: 'unknown',
        hasStaticProduct: true,
    })

    assert.deepEqual(decision, { redirect: false, reason: 'not_a_product' })
})

test('every live handle in the static array still redirects to the same target', () => {
    // Guards the no-regression case: the three handles that are live today must
    // keep working exactly as before this change.
    for (const handle of ['sku-001', 'sku-002', 'sku-003']) {
        const decision = resolveLegacyRedirectDecision({ handle, lookup: LIVE, hasStaticProduct: true })
        assert.deepEqual(decision, { redirect: true, target: `/product/${handle}` })
    }
})

test('splitPathAndQuery strips at the first ? and keeps the rest', () => {
    // STI-241: `event.path` carries the query string, so a naive `[^/]+` capture
    // swallowed `sku-001?waitlist=ok` as the handle and produced
    // `/product/sku-001?waitlist=ok?waitlist=ok`.
    assert.deepEqual(splitPathAndQuery('/products/sku-001?waitlist=ok'), {
        pathname: '/products/sku-001',
        query: '?waitlist=ok',
    })
    assert.deepEqual(splitPathAndQuery('/products/sku-001'), {
        pathname: '/products/sku-001',
        query: '',
    })
})

test('matchLegacyProductPath accepts exactly one handle segment', () => {
    assert.equal(matchLegacyProductPath('/products/sku-001'), 'sku-001')
    assert.equal(matchLegacyProductPath('/products/sku-001/'), 'sku-001')
    // Not contract URLs: these must fall through to the normal 404 rather than
    // being redirected into a shape that cannot exist.
    assert.equal(matchLegacyProductPath('/products'), null)
    assert.equal(matchLegacyProductPath('/products/foo/bar'), null)
    assert.equal(matchLegacyProductPath('/product/sku-001'), null)
    assert.equal(matchLegacyProductPath('/products/'), null)
})

test('the waitlist redirect target survives intact', () => {
    // functions/api/checkout.js:121 emits `https://.../products/<handle>?waitlist=ok`
    // and that landing experience is load-bearing.
    const location = buildLegacyRedirectLocation('/products/sku-001?waitlist=ok', {
        lookup: LIVE,
        hasStaticProduct: true,
    })

    assert.equal(location, '/product/sku-001?waitlist=ok')
    assert.equal(location?.match(/\?/g)?.length, 1, 'query string must be attached exactly once')
})

test('a non-product legacy path produces no Location header at all', () => {
    assert.equal(
        buildLegacyRedirectLocation('/products/embroidered-hoodie?waitlist=ok', {
            lookup: 'absent',
            hasStaticProduct: false,
        }),
        null,
    )
    assert.equal(buildLegacyRedirectLocation('/collections/all', { lookup: LIVE, hasStaticProduct: true }), null)
})

test('a percent-encoded handle is decoded before it becomes a redirect target', () => {
    // A handle is a URL path segment; it must not be double-encoded into the
    // Location header, and it must not be able to smuggle a path separator.
    assert.equal(matchLegacyProductPath('/products/sku%2D001'), 'sku-001')
})
