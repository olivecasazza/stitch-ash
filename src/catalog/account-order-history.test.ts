import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { CUSTOMER_ACCOUNT_URL, isCustomerAccountUrl } from '../../app/utils/customer-account'

/**
 * STI-652 regression tests.
 *
 * The defect this pins: STI-633 shipped `/account` telling customers the
 * storefront "does not yet have accounts" and that there was no order history
 * to sign in to. That sentence was inferred from the absence of account code in
 * THIS repository, and it was false. The live store runs Shopify's hosted
 * customer accounts — the OIDC discovery document on the shop domain advertises
 * `customer-account-api:full` and an `authorization_code` grant against
 * `shopify.com/authentication/<shop-id>`, and `/account` on the brand domain
 * redirects into it. So customers had a real order history the page refused to
 * point them at.
 *
 * Two things have to hold, and they fail independently:
 *
 *   1. the page must offer a way through to that order history, and
 *   2. the page must not tell a customer there is nothing to see.
 *
 * A test for only (1) would have passed against the original page as soon as
 * anyone added a link; a test for only (2) would pass against a page that
 * deleted the claim and linked nowhere. Both are asserted here.
 *
 * These are source assertions, not live-store assertions. This suite runs in
 * `pr-checks.yml` with no store credentials, so it cannot re-probe the shop. It
 * pins the storefront half of the contract. The store half is a fact about
 * Shopify's account surface that changes only if an operator changes it, and
 * the live evidence for it is recorded in `app/utils/customer-account.ts`.
 */

const ACCOUNT_PAGE = '../../app/pages/account.vue'

/**
 * Remove HTML comments and JS/CSS block comments from Vue SFC source.
 *
 * `//` line comments are stripped too, and `://` is preserved so a URL inside a
 * string is not truncated mid-token. Both the page and the util explain this
 * defect in prose that necessarily quotes the old wording, and prose about a
 * string is not the string reaching a customer.
 */
function stripComments(src: string): string {
    return src
        .replace(/<!--[\s\S]*?-->/g, ' ')
        .replace(/\/\*[\s\S]*?\*\//g, ' ')
        .replace(/(^|[^:"'`\\])\/\/.*$/gm, '$1')
}

const page = readFileSync(new URL(ACCOUNT_PAGE, import.meta.url), 'utf8')
const rendered = stripComments(page)

test('the customer account URL is the brand-domain /account path', () => {
    // The `shopify.com/<numeric-shop-id>/account` form would embed a per-store
    // internal in customer-visible markup; the `*.myshopify.com` form would put
    // a non-brand host in front of the customer. `/account` on the brand domain
    // redirects into the same place and shows the brand until handoff.
    assert.equal(CUSTOMER_ACCOUNT_URL, 'https://www.stitch-ash.com/account')
    assert.equal(isCustomerAccountUrl(CUSTOMER_ACCOUNT_URL), true)
})

test('the account URL classifier rejects anything that is not that path', () => {
    // A classifier that accepted everything would make the assertion above
    // vacuous, which is the usual way a guard like this quietly dies.
    for (const url of [
        'https://stitch-and-ash.myshopify.com/account',
        'https://shopify.com/75579326509/account',
        'https://www.stitch-ash.com/products',
        'https://evil.example.com/account',
        'not a url',
        '',
    ]) {
        assert.equal(isCustomerAccountUrl(url), false, `${url} was classified as the account surface`)
    }
})

test('the page renders a link to the customer account surface', () => {
    // The template must bind the constant rather than hardcode a host, so the
    // URL has exactly one owner and the two cannot drift apart.
    assert.match(rendered, /CUSTOMER_ACCOUNT_URL/, `${ACCOUNT_PAGE} does not use app/utils/customer-account`)
    assert.match(page, /import\s*\{\s*CUSTOMER_ACCOUNT_URL\s*\}/, 'the constant is bound but never imported')

    const anchor = rendered.match(/<a\b[^>]*:href="CUSTOMER_ACCOUNT_URL"[^>]*>/)
    assert.notEqual(anchor, null, `${ACCOUNT_PAGE} has no anchor bound to CUSTOMER_ACCOUNT_URL`)
})

test('the account link is a real navigation, not a dead control', () => {
    // An anchor with `href` is what actually reaches the account surface. The
    // defect STI-633 warned about was a control that looked live and did
    // nothing, so the call to action has to carry a real destination.
    const anchor = rendered.match(/<a\b[^>]*:href="CUSTOMER_ACCOUNT_URL"[^>]*>/)![0]
    assert.match(anchor, /:href="CUSTOMER_ACCOUNT_URL"/, 'the call to action has no destination')

    // And it must be inside an element with visible text, so it is not an
    // unlabelled box.
    assert.match(rendered, /btn-primary[^>]*>\s*[^<{\s]\S+/, 'the call to action has no visible label')
})

test('the page no longer tells a customer there are no accounts to see', () => {
    // The specific false claims from STI-633, asserted on the rendered source
    // with comments stripped so the page can still explain why they were false.
    for (const claim of [
        /does not yet have account/i,
        /no order history/i,
        /not built a sign-in form/i,
        /nothing here to sign in to/i,
    ]) {
        assert.equal(claim.test(rendered), false, `${ACCOUNT_PAGE} still tells a customer ${claim}`)
    }
})

test('the page points at order history rather than only at a human', () => {
    // The page kept its "we will find the order for you" fallback, which is
    // good service copy. But if that is all it offers, the customer still
    // cannot see their own orders, which is the whole of STI-652. Both have to
    // be present: the self-service link AND the human fallback.
    assert.match(rendered, /orders/i, `${ACCOUNT_PAGE} no longer mentions orders at all`)
    assert.match(rendered, /status/i, `${ACCOUNT_PAGE} no longer says what the account shows`)
    assert.match(rendered, /NuxtLink[^>]*to="\/contact"/, `${ACCOUNT_PAGE} dropped the human fallback`)
})

test('the page does not collect credentials on this domain', () => {
    // The Accepted ADR (docs/decisions/2026-07-21-shopify-as-system-of-record.md:20)
    // says this site links to Shopify's account surface and does not maintain
    // its own auth. A password or email field here would mean local auth had
    // been added after all — and on a store running the new customer-account
    // flow it could not authenticate against anything anyway.
    for (const control of [/<input\b/i, /type="password"/i, /v-model/i, /<form\b/i]) {
        assert.equal(control.test(rendered), false, `${ACCOUNT_PAGE} renders a credential control (${control})`)
    }
})

test('the account link is not the storefront pretending to be the account page', () => {
    // Guards a specific plausible future edit: rendering order rows on /account
    // from a query that cannot authenticate anyone. If someone wires a
    // `customer` query here, this fires before that ships a dead panel.
    assert.equal(
        /customerAccessToken(Create|Delete|Renew)/.test(rendered),
        false,
        `${ACCOUNT_PAGE} starts handling classic customer tokens; the ADR puts auth in Shopify`,
    )
})