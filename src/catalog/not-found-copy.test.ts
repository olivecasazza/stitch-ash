import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import {
    customerVisibleNotFoundMessage,
    embedsRequestPath,
    notFoundI18nKey,
    resolveNotFoundCopy,
    type NotFoundResource,
} from '../../app/utils/not-found'

/**
 * STI-556 regression tests.
 *
 * The defect this pins: all four not-found routes built their customer-visible
 * error string as an i18n key plus the raw request path —
 *
 *     statusText: `${$t('error.notFound')}: ${route.fullPath}`,
 *
 * and `app/error.vue` renders `statusMessage` ahead of `message`, so every bad
 * URL told the requester exactly which URL had failed while saying nothing a
 * shopper could act on. The PDP was worse: it skipped i18n entirely and
 * hardcoded English.
 *
 * The wording is not asserted here — design-lead owns that, and it already
 * exists in `i18n/locales/*.json` under `error.*`. What is asserted is the two
 * things that made this a defect: the right key is chosen per resource, and no
 * request path can reach the customer from these routes again.
 */

/** Every route that can render a customer-facing 404. */
const NOT_FOUND_ROUTES = [
    'app/pages/collection/[handle].vue',
    'app/pages/product/[handle].vue',
    'app/pages/blog/[handle]/index.vue',
    'app/pages/blog/[handle]/[article].vue',
] as const

/**
 * Remove HTML comments and JS/CSS block comments from Vue SFC source.
 *
 * `//` line comments are stripped too, and `://` is preserved so a URL inside a
 * string is not truncated mid-token.
 */
function stripComments(src: string): string {
    return src
        .replace(/<!--[\s\S]*?-->/g, ' ')
        .replace(/\/\*[\s\S]*?\*\//g, ' ')
        .replace(/(^|[^:"'`\\])\/\/.*$/gm, '$1')
}

/** A translator that returns the key's real value from the shipped en.json. */
function enTranslate(key: string): string {
    const messages = JSON.parse(
        readFileSync(new URL('../../i18n/locales/en.json', import.meta.url), 'utf8'),
    ) as Record<string, Record<string, string>>
    return messages[key.split('.')[0]!]?.[key.split('.')[1]!] ?? ''
}

test('each resource resolves to its own purpose-written key', () => {
    assert.equal(notFoundI18nKey('collection'), 'error.collection')
    assert.equal(notFoundI18nKey('product'), 'error.product')
    assert.equal(notFoundI18nKey('blog'), 'error.blog')
    assert.equal(notFoundI18nKey('article'), 'error.article')
    assert.equal(notFoundI18nKey('page'), 'error.notFound')
})

test('the shipped en.json strings are the ones a customer is shown', () => {
    // This pins the copy end of the chain: the keys above must actually exist, so
    // a locale rename cannot silently leave the storefront with no sentence.
    assert.equal(resolveNotFoundCopy({ resource: 'collection', translate: enTranslate }).statusText, 'Collection not found')
    assert.equal(resolveNotFoundCopy({ resource: 'product', translate: enTranslate }).statusText, 'Product not found')
    assert.equal(resolveNotFoundCopy({ resource: 'blog', translate: enTranslate }).statusText, 'Blog not found')
    assert.equal(resolveNotFoundCopy({ resource: 'article', translate: enTranslate }).statusText, 'Article not found')
    assert.equal(resolveNotFoundCopy({ resource: 'page', translate: enTranslate }).statusText, 'Page not found')
})

test('the de locale resolves for every resource too', () => {
    // The PDP's 404 was hardcoded English, so a German shopper saw English there
    // and translated copy everywhere else. Every key must exist in every locale.
    const deTranslate = (key: string): string => {
        const messages = JSON.parse(
            readFileSync(new URL('../../i18n/locales/de.json', import.meta.url), 'utf8'),
        ) as Record<string, Record<string, string>>
        return messages[key.split('.')[0]!]?.[key.split('.')[1]!] ?? ''
    }

    for (const resource of ['collection', 'product', 'blog', 'article', 'page'] as NotFoundResource[]) {
        const { statusText } = resolveNotFoundCopy({ resource, translate: deTranslate })
        assert.notEqual(statusText, '', `error.${resource} is missing from de.json`)
        assert.equal(/not found/i.test(statusText), false, `de error.${resource} is still English`)
    }
})

test('a missing translation degrades to a plain sentence, not a blank page', () => {
    const { statusText } = resolveNotFoundCopy({ resource: 'collection', translate: () => '' })
    assert.equal(statusText, 'Not found')

    const whitespace = resolveNotFoundCopy({ resource: 'product', translate: () => '   ' })
    assert.equal(whitespace.statusText, 'Not found')
})

test('no not-found route interpolates a request path into customer copy', () => {
    // The defect itself, asserted against source so a future edit cannot
    // reintroduce it quietly. Comments are stripped first: each route explains
    // this defect in a comment that necessarily quotes the old string, and prose
    // about the string is not the string reaching a customer.
    for (const route of NOT_FOUND_ROUTES) {
        const rendered = stripComments(readFileSync(new URL(`../../${route}`, import.meta.url), 'utf8'))

        assert.equal(
            /statusText|statusMessage/.test(rendered),
            true,
            `${route} no longer sets a customer-facing status string — re-check STI-556`,
        )
        assert.equal(
            /route\.fullPath|\$route\.fullPath|route\.path\b/.test(rendered),
            false,
            `${route} puts a request path into customer-visible copy again`,
        )
    }
})

test('no not-found route falls back to an upstream error message', () => {
    // `error.value?.message` is the Storefront API's own error text. It reached
    // the customer through the field error.vue falls through to, which is the
    // same leak by a different route.
    for (const route of NOT_FOUND_ROUTES) {
        const rendered = stripComments(readFileSync(new URL(`../../${route}`, import.meta.url), 'utf8'))
        assert.equal(
            /error\.value\?\.message/.test(rendered),
            false,
            `${route} can surface an upstream API message to a customer again`,
        )
    }
})

test('every not-found route routes its string through the shared copy', () => {
    // Without this, a fifth route could hardcode its own sentence and pass the
    // two checks above by never mentioning a path at all.
    for (const route of NOT_FOUND_ROUTES) {
        const src = readFileSync(new URL(`../../${route}`, import.meta.url), 'utf8')
        assert.match(src, /resolveNotFoundCopy/, `${route} does not use app/utils/not-found`)
    }
})

/*
 * ---------------------------------------------------------------------------
 * STI-444 regression tests.
 *
 * STI-556 fixed the four typed not-found routes and the audit that reopened
 * STI-444 found the catch-all still leaking: a URL matching no route at all is
 * a 404 raised inside Nuxt itself —
 *
 *   nuxt/dist/pages/runtime/plugins/router.js
 *     statusText: `Page not found: ${to.fullPath}`
 *
 * There is no app-level throw to edit, so STI-556's page-level fix could never
 * have covered it. `app/error.vue` is the single point every 404 renders
 * through, and that is where the last-line scrub lives.
 *
 * The shape these pin is the one that matters: whatever string arrives, if it
 * carries the requester's own URL the customer must not see it.
 */

/** A request path, and the string Nuxt builds around it for a no-route 404. */
const BOGUS_PATH = '/totally-bogus-route'
const NUXT_CATCH_ALL = `Page not found: ${BOGUS_PATH}`

test('the Nuxt catch-all 404 string is recognised as leaking the request path', () => {
    // This is the exact string observed live at the deployed SHA. If Nuxt ever
    // stops formatting it this way the test must fail loudly, not quietly pass
    // on a shape that no longer occurs.
    assert.equal(embedsRequestPath(NUXT_CATCH_ALL, BOGUS_PATH), true)
    assert.equal(embedsRequestPath(NUXT_CATCH_ALL), true)
})

test('a catch-all 404 shows the localized sentence, never the request path', () => {
    const shown = customerVisibleNotFoundMessage({
        resource: 'page',
        translate: enTranslate,
        candidate: NUXT_CATCH_ALL,
        requestPath: BOGUS_PATH,
    })

    assert.equal(shown, 'Page not found')
    assert.equal(shown.includes(BOGUS_PATH), false)
    assert.equal(shown.includes('/'), false, 'the message still contains a route-shaped token')
})

test('a clean sentence from a typed route survives the scrub untouched', () => {
    // The four typed routes already send purpose-written copy. They must pass
    // through byte-for-byte — STI-556's fix has to keep working, and a scrub
    // that flattened every 404 to "Page not found" would be a regression in
    // its own right.
    const kept = [
        ['collection', 'Collection not found'],
        ['product', 'Product not found'],
        ['blog', 'Blog not found'],
        ['article', 'Article not found'],
    ] as const

    for (const [resource, expected] of kept) {
        assert.equal(
            customerVisibleNotFoundMessage({
                resource,
                translate: enTranslate,
                candidate: expected,
                requestPath: `/some/${resource}/handle`,
            }),
            expected,
            `${resource} copy was rewritten by the scrub`,
        )
    }
})

test('the scrub drops the path however it was encoded', () => {
    // Query strings and fragments are still the URL the requester typed, so
    // they are still a leak. Nuxt interpolates `to.fullPath`, which carries
    // both.
    for (const path of [
        '/products/no-such-handle?sort=price',
        '/collection/all#top',
        '/blog/nope?a=1&b=2',
    ]) {
        const shown = customerVisibleNotFoundMessage({
            resource: 'page',
            translate: enTranslate,
            candidate: `Page not found: ${path}`,
            requestPath: path,
        })

        assert.equal(shown.includes(path), false, `${path} leaked into customer copy`)
        assert.equal(shown.includes('/'), false, `${path} leaked a route-shaped token`)
    }
})

test('an empty or absent status string still yields a sentence', () => {
    // A 404 with no message at all must not render an empty paragraph.
    assert.equal(
        customerVisibleNotFoundMessage({ resource: 'page', translate: enTranslate, candidate: '' }),
        'Page not found',
    )
    assert.equal(
        customerVisibleNotFoundMessage({ resource: 'page', translate: enTranslate, candidate: undefined }),
        'Page not found',
    )
    assert.equal(
        customerVisibleNotFoundMessage({ resource: 'page', translate: () => '', candidate: NUXT_CATCH_ALL }),
        'Not found',
    )
})

test('non-404 copy is never rewritten by the not-found scrub', () => {
    // The function owns 404s only. Server-fault text must reach the operator
    // untouched, so a 500's message is not quietly relabelled.
    assert.equal(embedsRequestPath('Server Error'), false)
    assert.equal(
        customerVisibleNotFoundMessage({
            resource: 'page',
            translate: enTranslate,
            candidate: 'Something went wrong on our end',
            requestPath: BOGUS_PATH,
        }),
        'Something went wrong on our end',
    )
})

test('the shipped error page routes every 404 through the scrub', () => {
    // Structural guard: `app/error.vue` is the only place a framework-raised
    // 404 can be caught, so if it stops calling the scrub the leak returns with
    // no other failing test.
    //
    // It asserts on what the TEMPLATE renders, not merely on the presence of the
    // helper. An earlier version of this test only checked that the import and
    // the call existed; a mutant that restored
    // `{{ props.error.statusMessage || props.error.message }}` in the markup
    // passed it while leaving the computed dead. The binding and the call have
    // to be connected for the scrub to mean anything.
    const errorPage = stripComments(readFileSync(new URL('../../app/error.vue', import.meta.url), 'utf8'))

    assert.match(
        errorPage,
        /customerVisibleNotFoundMessage/,
        'app/error.vue no longer scrubs the 404 message',
    )
    assert.match(
        errorPage,
        /statusCode\s*!==\s*404/,
        'app/error.vue must scope the scrub to 404s so 500s are not rewritten',
    )

    // The rendered element must be the scrubbed value.
    const messageElement = errorPage.match(/<p[^>]*class="error-message"[^>]*>([\s\S]*?)<\/p>/)
    assert.notEqual(messageElement, null, 'app/error.vue no longer renders an .error-message element')
    assert.match(
        messageElement![1]!.trim(),
        /^\{\{\s*errorMessage\s*\}\}$/,
        'the rendered 404 sentence is not the scrubbed computed — the path can still reach the customer',
    )

    // ...and the computed must exist, so the binding is not dangling.
    assert.match(
        errorPage,
        /const\s+errorMessage\s*=\s*computed\(/,
        'app/error.vue renders errorMessage but never defines it',
    )
})
