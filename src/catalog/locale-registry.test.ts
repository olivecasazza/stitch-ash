import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import test from 'node:test'

import { localeMarket } from '../../app/utils/locale-market'

/**
 * STI-647 regression tests.
 *
 * The defect this pins: `i18n/locales/de.json` was complete, had exact key
 * parity with `en.json`, and was asserted on by
 * `src/catalog/not-found-copy.test.ts` — which reads the file off disk with its
 * own `translate` closure and never touches the Nuxt i18n registry. So the file
 * passed review and CI while `nuxt.config.ts` registered only `en-us` and the
 * build never loaded it. No German string reached the client bundle at all.
 *
 * A locale file that exists, is translated, and is tested is not thereby
 * reachable. These tests read the registry in `nuxt.config.ts` — the only thing
 * that decides what the build actually loads — and assert the two directions:
 * every authored file is registered, and every registered file exists.
 */

/** One entry of the `i18n.locales` array in `nuxt.config.ts`. */
interface RegisteredLocale {
    code: string
    language: string
    file: string
}

const LOCALES_DIR = new URL('../../i18n/locales/', import.meta.url)

function readJson(url: URL): Record<string, Record<string, string>> {
    return JSON.parse(readFileSync(url, 'utf8')) as Record<string, Record<string, string>>
}

/**
 * The locale files actually authored in the repository.
 */
function authoredLocaleFiles(): string[] {
    return readdirSync(LOCALES_DIR).filter(name => name.endsWith('.json')).sort()
}

/**
 * The locales the build actually loads, parsed out of `nuxt.config.ts`.
 *
 * Asserted against the config source rather than by importing it: `nuxt.config`
 * calls `defineNuxtConfig` and pulls in the whole Nuxt runtime, and importing it
 * from a `node --test` unit test is not possible without a Nuxt environment.
 * Source parsing is the same technique `not-found-copy.test.ts` already uses to
 * assert against the not-found routes, and it fails for the right reason: if
 * the array shape changes, the block is no longer found and the test says so.
 */
function registeredLocales(): RegisteredLocale[] {
    const source = readFileSync(new URL('../../nuxt.config.ts', import.meta.url), 'utf8')

    const block = /locales:\s*\[([\s\S]*?)\n {8}\],/.exec(source)
    assert.notEqual(block, null, 'could not find the i18n.locales array in nuxt.config.ts')

    const entries = [...block![1]!.matchAll(/code:\s*'([^']+)',[\s\S]*?language:\s*'([^']+)',[\s\S]*?file:\s*'([^']+)',/g)]

    assert.notEqual(
        entries.length,
        0,
        'no { code, language, file } entries parsed from i18n.locales — the array shape changed',
    )

    return entries.map(([, code, language, file]) => ({ code: code!, language: language!, file: file! }))
}

/** The configured `defaultLocale`, which must itself be registered. */
function defaultLocale(): string {
    const source = readFileSync(new URL('../../nuxt.config.ts', import.meta.url), 'utf8')
    const match = /defaultLocale:\s*'([^']+)'/.exec(source)
    assert.notEqual(match, null, 'could not find defaultLocale in nuxt.config.ts')
    return match![1]!
}

/** Flatten a nested message object to dotted keys. */
function flatKeys(value: Record<string, Record<string, string>>): string[] {
    return Object.entries(value)
        .flatMap(([section, entries]) => Object.keys(entries).map(key => `${section}.${key}`))
        .sort()
}

test('every authored locale file is registered in the build', () => {
    // The STI-647 defect itself. A locale file that is authored, translated and
    // tested but absent from this array is dead copy: it renders nowhere, and
    // nothing in the existing suite notices, because reading a file off disk
    // proves nothing about what the build loads.
    const registeredFiles = new Set(registeredLocales().map(locale => locale.file))

    for (const file of authoredLocaleFiles()) {
        assert.equal(
            registeredFiles.has(file),
            true,
            `i18n/locales/${file} exists but is not in nuxt.config.ts i18n.locales — it can never render`,
        )
    }
})

test('every registered locale file exists', () => {
    // The other direction: a `file:` pointing at a missing JSON is a build-time
    // failure of the i18n module, not a silent fallback.
    for (const locale of registeredLocales()) {
        assert.doesNotThrow(
            () => readJson(new URL(locale.file, LOCALES_DIR)),
            `registered locale ${locale.code} points at a missing file: ${locale.file}`,
        )
    }
})

test('the default locale is one of the registered locales', () => {
    // `prefix_except_default` keys the unprefixed URL off this value; a default
    // outside the array leaves every English URL unrouted.
    const codes = registeredLocales().map(locale => locale.code)
    assert.equal(codes.includes(defaultLocale()), true, `defaultLocale ${defaultLocale()} is not registered`)
})

test('locale codes are unique', () => {
    const codes = registeredLocales().map(locale => locale.code)
    assert.equal(new Set(codes).size, codes.length, `duplicate locale code in i18n.locales: ${codes.join(', ')}`)
})

test('the German locale is registered', () => {
    // Pinned explicitly, not just by the file-parity test above: STI-647 shipped
    // with `de.json` present and passing, so the parity assertion alone is not
    // evidence that German is reachable.
    const german = registeredLocales().find(locale => locale.file === 'de.json')

    assert.notEqual(german, undefined, 'de.json is not registered in i18n.locales')
    assert.equal(german!.language, 'de', 'de.json must declare language: de for <html lang>')
})

test('every registered locale has key parity with the default locale', () => {
    const base = flatKeys(readJson(new URL('en.json', LOCALES_DIR)))
    assert.notEqual(base.length, 0, 'en.json parsed as empty')

    for (const locale of registeredLocales()) {
        assert.deepEqual(
            flatKeys(readJson(new URL(locale.file, LOCALES_DIR))),
            base,
            `${locale.file} does not have the same keys as en.json`,
        )
    }
})

test('no registered locale ships a string identical to the English one', () => {
    // Parity of keys is not parity of translation. A value copied straight
    // across is an untranslated customer-facing string that key-parity cannot
    // see. Brand names and codes are the legitimate exception, and this locale
    // set has none, so the assertion holds as written.
    const en = readJson(new URL('en.json', LOCALES_DIR))

    for (const locale of registeredLocales()) {
        if (locale.file === 'en.json') continue

        const target = readJson(new URL(locale.file, LOCALES_DIR))

        for (const [section, entries] of Object.entries(en)) {
            for (const [key, value] of Object.entries(entries)) {
                assert.notEqual(
                    target[section]?.[key],
                    value,
                    `${locale.file} is still English at ${section}.${key}`,
                )
            }
        }
    }
})

test('every registered locale resolves a non-empty @inContext market', () => {
    // `src/catalog/root-product-sort-keys.test.ts` pins that the market must not
    // go null. That test asserts the schema; this one asserts that every code
    // the board actually ships produces a value for it — which is what `de`
    // failed before `localeCountry` learned to fall back to the language.
    for (const locale of registeredLocales()) {
        const market = localeMarket(locale.code)

        assert.notEqual(market.language, '', `${locale.code} resolves an empty @inContext language`)
        assert.notEqual(market.country, '', `${locale.code} resolves an empty @inContext country`)
    }
})

test('a bare language code resolves to itself as its country', () => {
    assert.deepEqual(localeMarket('de'), { language: 'de', country: 'de' })
})

test('an explicit region is used verbatim and not inferred', () => {
    assert.deepEqual(localeMarket('en-us'), { language: 'en', country: 'us' })
})
