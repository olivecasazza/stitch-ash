import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { notFoundI18nKey, resolveNotFoundCopy, type NotFoundResource } from '../../app/utils/not-found'

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
