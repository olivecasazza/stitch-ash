/**
 * Tests for the BUILD-TIME clock removal, scripts/deterministic-asset-manifest.mjs.
 *
 * STI-542 established the rule this repo follows for the digest: normalise only
 * what is derived from the clock or from unordered iteration, never content. But
 * STI-625 showed that a normaliser is the wrong place to stop a clock that the
 * BUILD was in a position to simply not write. The digest normalised the clock
 * away, the gate went green, and the bundle still moved — and a moving bundle is
 * what makes esbuild flip a name tie-break and rename symbols across the whole
 * flat nitro.mjs scope.
 *
 * So the clock is removed at the source and these tests pin THAT, in both
 * directions, for the same reason scripts/artifact-normalise.test.mjs pins its
 * own: a rule that only ever fires in the absorbing direction is not verified.
 *
 *   1. Two builds of one commit produce the SAME module — key order aside, the
 *      wall clock is gone and nothing else moved.
 *   2. A CONTENT change still moves the module: a different asset, etag, size or
 *      path, an added or removed entry. A rule that collapses those would be
 *      reproducing the very defect it exists to remove.
 *
 * Run: node --test scripts/deterministic-asset-manifest.test.mjs
 */

import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'

import {
    APP_MANIFEST_TIMESTAMP,
    ASSET_MANIFEST_ID,
    assetManifestPlugin,
    manifestRewriteStats,
    neutraliseAppManifestClock,
    resolveBuildMtime,
    rewriteAssetManifest,
} from './deterministic-asset-manifest.mjs'

/** The `mtime` a rewrite stamps; any fixed ISO instant does here. */
const BUILD_MTIME = '2026-10-02T13:28:41Z'

/**
 * A manifest in the exact shape nitropack 2.13.4 emits:
 * `export default ${JSON.stringify(assets, null, 2)};`
 *
 * An entry is either an id, or `[id, overrides]` — the overrides are how a test
 * says "this asset's etag/size/path is different", which is the direction that
 * must still move the output.
 *
 * @param {Array<string | [string, {size?: number, etag?: string, path?: string}]>} entries
 * @param {string} mtime the wall clock Nitro would have written
 * @returns {string}
 */
const manifestModule = (entries, mtime = '2026-10-02T12:30:50.836Z') => {
    const assets = {}
    for (const entry of entries) {
        const [id, opts = {}] = typeof entry === 'string' ? [entry] : entry
        assets[id] = {
            type: 'text/javascript; charset=utf-8',
            etag: opts.etag ?? '"1-abcdefghijklmnop"',
            mtime,
            size: opts.size ?? 1234,
            path: opts.path ?? `../_nuxt/${id.replace(/^\//, '')}`,
        }
    }
    return `export default ${JSON.stringify(assets, null, 2)};`
}

/** The keys of the rewritten manifest, in the order they were emitted. */
const idsOf = (code) => Object.keys(JSON.parse(code.slice('export default '.length, -1)))

// ------------------------------------------------------- the wall clock is gone

test('a wall-clock mtime is replaced, so two builds of one commit agree', () => {
    // The measured defect, in the shape it was measured: two builds of one
    // commit, 76 seconds apart, 48 runs of differing mtime bytes.
    const d1 = manifestModule([['/_nuxt/a.js'], ['/_nuxt/b.js']], '2026-10-02T12:30:50.836Z')
    const d2 = manifestModule([['/_nuxt/a.js'], ['/_nuxt/b.js']], '2026-10-02T12:32:07.304Z')
    assert.notEqual(d1, d2, 'the fixture must actually differ before the rewrite')
    assert.equal(
        rewriteAssetManifest(d1, BUILD_MTIME).code,
        rewriteAssetManifest(d2, BUILD_MTIME).code,
    )
})

test('every entry gets the SAME mtime, not a per-entry one', () => {
    // A manifest where entries disagreed about the build's date would be a third
    // thing to drift, and it would be invisible in a single-entry fixture.
    const out = rewriteAssetManifest(
        manifestModule([['/_nuxt/a.js'], ['/_nuxt/b.js'], ['/_nuxt/c.js']]),
        BUILD_MTIME,
    )
    const assets = JSON.parse(out.code.slice('export default '.length, -1))
    const mtimes = new Set(Object.values(assets).map(e => e.mtime))
    assert.deepEqual([...mtimes], [BUILD_MTIME])
    assert.equal(out.entries, 3)
})

test('no ISO instant other than the build mtime survives the rewrite', () => {
    const out = rewriteAssetManifest(
        manifestModule([['/_nuxt/a.js'], ['/_nuxt/b.js']]),
        BUILD_MTIME,
    )
    const instants = [...out.code.matchAll(/\d{4}-\d{2}-\d{2}T[\d:.]+Z/g)].map(m => m[0])
    assert.deepEqual([...new Set(instants)], [BUILD_MTIME])
})

test('the app-manifest timestamp is zero, so those two etags stop moving', () => {
    // The second clock. `_nuxt/builds/latest.json` and `builds/meta/<id>.json`
    // carry `Date.now()`, their content hash is their etag, and that etag is a
    // manifest entry — so the etag moved on every build even though nothing
    // about those files changed.
    assert.equal(APP_MANIFEST_TIMESTAMP, 0)
})

// ------------------------------------------------------ the key order is gone

test('manifest key order does not survive the rewrite', () => {
    // The measured residual after the mtime fix: two cold builds of one commit,
    // all 56 entries present in both and identical as a set, differing only in
    // the order they appeared. Nitro fills the object in stat-COMPLETION order
    // (`runParallel(..., {concurrency: 25})`).
    const a = manifestModule([['/_nuxt/zz.js'], ['/_nuxt/aa.js'], ['/_nuxt/mm.js']])
    const b = manifestModule([['/_nuxt/mm.js'], ['/_nuxt/zz.js'], ['/_nuxt/aa.js']])
    assert.notEqual(a, b, 'the fixture must actually order differently before the rewrite')
    const ra = rewriteAssetManifest(a, BUILD_MTIME)
    const rb = rewriteAssetManifest(b, BUILD_MTIME)
    assert.equal(ra.code, rb.code)
    assert.deepEqual(idsOf(ra.code), ['/_nuxt/aa.js', '/_nuxt/mm.js', '/_nuxt/zz.js'])
})

test('sorting the keys is a no-op on an already-sorted manifest', () => {
    // The rewrite must not be reshuffling bytes for its own sake: a manifest
    // Nitro already emitted in sorted order has to come out unchanged, or the
    // minifier sees a differently-shaped input for no reason.
    const sorted = manifestModule([['/_nuxt/a.js'], ['/_nuxt/b.js'], ['/_nuxt/c.js']])
    const out = rewriteAssetManifest(sorted, BUILD_MTIME)
    assert.deepEqual(idsOf(out.code), ['/_nuxt/a.js', '/_nuxt/b.js', '/_nuxt/c.js'])

    // Only the mtime may change when the build is already stamped. Feeding it a
    // manifest already carrying the build mtime must be a total no-op, byte for
    // byte — otherwise the rewrite is doing something beyond removing the clock,
    // and this is the test that would say so.
    const already = manifestModule([['/_nuxt/a.js'], ['/_nuxt/b.js'], ['/_nuxt/c.js']], BUILD_MTIME)
    const noop = rewriteAssetManifest(already, BUILD_MTIME)
    assert.equal(noop.code, already)
    assert.equal(noop.changed, 0)
})

// --------------------------------------------- content is still content (AC4)

test('a different asset id still changes the rewritten manifest', () => {
    const a = rewriteAssetManifest(manifestModule([['/_nuxt/a.js']]), BUILD_MTIME).code
    const b = rewriteAssetManifest(manifestModule([['/_nuxt/b.js']]), BUILD_MTIME).code
    assert.notEqual(a, b)
})

test('an added entry still changes the rewritten manifest', () => {
    const a = rewriteAssetManifest(manifestModule([['/_nuxt/a.js']]), BUILD_MTIME)
    const b = rewriteAssetManifest(manifestModule([['/_nuxt/a.js'], ['/_nuxt/b.js']]), BUILD_MTIME)
    assert.notEqual(a.code, b.code)
    assert.equal(a.entries, 1)
    assert.equal(b.entries, 2)
})

test('a removed entry still changes the rewritten manifest', () => {
    const a = rewriteAssetManifest(manifestModule([['/_nuxt/a.js'], ['/_nuxt/b.js']]), BUILD_MTIME)
    const b = rewriteAssetManifest(manifestModule([['/_nuxt/a.js']]), BUILD_MTIME)
    assert.notEqual(a.code, b.code)
})

test('a different etag still changes the rewritten manifest', () => {
    // The rewrite only replaces `mtime`. The etag is a CONTENT hash and this
    // module does not touch it, so a changed asset must still be visible here.
    const a = rewriteAssetManifest(manifestModule([['/_nuxt/a.js', { etag: '"1-aaaaaaaaaaaaa"' }]]), BUILD_MTIME)
    const b = rewriteAssetManifest(manifestModule([['/_nuxt/a.js', { etag: '"1-bbbbbbbbbbbbb"' }]]), BUILD_MTIME)
    assert.notEqual(a.code, b.code)
})

test('a different size still changes the rewritten manifest', () => {
    const a = rewriteAssetManifest(manifestModule([['/_nuxt/a.js', { size: 100 }]]), BUILD_MTIME)
    const b = rewriteAssetManifest(manifestModule([['/_nuxt/a.js', { size: 200 }]]), BUILD_MTIME)
    assert.notEqual(a.code, b.code)
})

test('a different path still changes the rewritten manifest', () => {
    const a = rewriteAssetManifest(manifestModule([['/_nuxt/a.js', { path: '../_nuxt/a.js' }]]), BUILD_MTIME)
    const b = rewriteAssetManifest(manifestModule([['/_nuxt/a.js', { path: '../_nuxt/other.js' }]]), BUILD_MTIME)
    assert.notEqual(a.code, b.code)
})

// -------------------------------------------------- refusing to guess (STI-589's lesson)

test('a module Nitro renamed or reshaped is a loud failure, not a silent pass', () => {
    // The silent half-rewrite is the failure mode this whole class of bug has:
    // it leaves a build that looks clean and is not. Each of these shapes would
    // otherwise be passed through with the clock still in it.
    assert.throws(
        () => rewriteAssetManifest('const assets = {}', BUILD_MTIME),
        /Refusing to guess/,
    )
    assert.throws(
        () => rewriteAssetManifest('export default not json;', BUILD_MTIME),
        /is not JSON/,
    )
    assert.throws(
        () => rewriteAssetManifest('export default [1,2,3];', BUILD_MTIME),
        /did not export an object/,
    )
})

test('an entry with no etag or a non-ISO mtime is a loud failure', () => {
    // Both mean Nitro changed the manifest shape. `mtime` is the field this
    // module exists to replace; a value that is not an ISO instant means it is
    // no longer the field it was written for.
    const noEtag = `export default ${JSON.stringify({
        '/_nuxt/a.js': { type: 't', mtime: '2026-10-02T12:30:50.836Z', size: 1, path: 'p' },
    })};`
    assert.throws(() => rewriteAssetManifest(noEtag, BUILD_MTIME), /no string etag/)

    const oddMtime = manifestModule([['/_nuxt/a.js']]).replace(
        /"mtime": "[^"]*"/,
        '"mtime": "1750000000"',
    )
    assert.throws(() => rewriteAssetManifest(oddMtime, BUILD_MTIME), /not an ISO instant/)
})

test('the error names the module it keys on', () => {
    // nuxt.config.ts fails the build when the rewrite does not run, so the
    // message has to say which virtual module stopped matching — otherwise the
    // only clue is that Nitro renamed something.
    try {
        rewriteAssetManifest('const x = 1', BUILD_MTIME)
        assert.fail('expected a throw')
    }
    catch (error) {
        assert.match(error.message, new RegExp(ASSET_MANIFEST_ID))
    }
})

// ------------------------------------------------------------------ the plugin

test('the plugin fires on the manifest module and counts what it rewrote', () => {
    const before = manifestRewriteStats()
    const plugin = assetManifestPlugin(BUILD_MTIME)

    // A module that is not the manifest must be left completely alone — the
    // plugin runs ahead of every other transform in the bundle.
    assert.equal(plugin.transform('const x = 1', '/other/module.mjs'), null)

    const result = plugin.transform(
        manifestModule([['/_nuxt/a.js'], ['/_nuxt/b.js']]),
        `/rollup/.nitro/dev/${ASSET_MANIFEST_ID}?nitroRollup`,
    )
    assert.equal(result.map, null, 'no sourcemap: the manifest is generated, not authored')
    assert.equal(idsOf(result.code).length, 2)

    const after = manifestRewriteStats()
    assert.equal(after.transforms - before.transforms, 1)
    assert.equal(after.entries - before.entries, 2)
})

// --------------------------------------------------- the app-manifest rewrite

test('a timestamp-bearing app manifest loses its clock in the OUTPUT directory', () => {
    // The copy that matters is the output copy: Nuxt copies .nuxt/manifest/**
    // into dist/_nuxt/builds/**, and the etag that reaches the bundle is
    // computed from the copied bytes afterwards.
    const dir = mkdtempSync(join(tmpdir(), 'st625-'))
    const builds = join(dir, '_nuxt', 'builds')
    const meta = join(builds, 'meta')
    mkdirSync(meta, { recursive: true })
    writeFileSync(
        join(builds, 'latest.json'),
        '{"id":"abc123","timestamp":1790944443562}',
    )
    writeFileSync(
        join(meta, 'abc123.json'),
        '{"id":"abc123","timestamp":1790944443562,"prerendered":[]}',
    )

    const out = neutraliseAppManifestClock(dir, builds)
    assert.equal(out.files.length, 2)

    for (const file of [join(builds, 'latest.json'), join(meta, 'abc123.json')]) {
        const parsed = JSON.parse(readFileSync(file, 'utf8'))
        assert.equal(parsed.timestamp, APP_MANIFEST_TIMESTAMP)
        assert.equal(parsed.id, 'abc123', 'nothing but the timestamp may change')
    }
})

test('an app manifest Nuxt reshaped is a loud failure', () => {
    const dir = mkdtempSync(join(tmpdir(), 'st625-'))
    const builds = join(dir, '_nuxt', 'builds')
    const meta = join(builds, 'meta')
    mkdirSync(meta, { recursive: true })
    writeFileSync(join(builds, 'latest.json'), '{"id":"abc123"}')
    writeFileSync(join(meta, 'abc123.json'), '{"id":"abc123","timestamp":1}')

    assert.throws(
        () => neutraliseAppManifestClock(dir, builds),
        /no numeric `timestamp`/,
    )
})

// ------------------------------------------------------------- the mtime source

test('the build mtime is a function of the commit, not of the clock', () => {
    // Resolved from git, so the same commit always yields the same instant. This
    // is the property that makes two builds of one commit agree; a fallback that
    // read the wall clock would reintroduce the defect it stands in for.
    const resolved = resolveBuildMtime(process.cwd())
    assert.equal(resolved.resolved, true)
    // Canonical UTC `Z` form. Milliseconds are allowed because that is the shape
    // Nitro's own manifest mtimes have — this value replaces one of them.
    assert.match(resolved.value, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/)

    // Two calls, one value — including across a deliberate delay, which is what
    // the clock would fail.
    assert.equal(resolveBuildMtime(process.cwd()).value, resolved.value)
})

test('the build mtime is the commit epoch in UTC, not a timezone-dependent rendering', () => {
    // This is the shape GitHub's runner caught: `git show --format=%cI` rendered
    // the same commit as `...Z` on a UTC box and `...-07:00` on the runner, which
    // would have made two builds of one commit differ across runner images while
    // every local build agreed. The value must come from `%ct` and be formatted
    // by us, so it is the same string on every git version and every host.
    const seconds = execFileSync('git', ['show', '-s', '--format=%ct', 'HEAD'], {
        cwd: process.cwd(),
        encoding: 'utf8',
    }).trim()
    assert.equal(
        resolveBuildMtime(process.cwd()).value,
        new Date(Number(seconds) * 1000).toISOString(),
        'the mtime must be exactly the commit epoch rendered in UTC',
    )

    // And the same answer under a hostile local timezone.
    const expected = new Date(Number(seconds) * 1000).toISOString()
    const original = process.env.TZ
    try {
        for (const tz of ['America/Los_Angeles', 'Asia/Kolkata']) {
            process.env.TZ = tz
            assert.equal(resolveBuildMtime(process.cwd()).value, expected)
        }
    } finally {
        if (original === undefined) delete process.env.TZ
        else process.env.TZ = original
    }
})

test('a checkout with no git falls back to a FIXED instant, and says so', () => {
    const empty = mkdtempSync(join(tmpdir(), 'st625-'))
    const resolved = resolveBuildMtime(empty)
    assert.equal(resolved.resolved, false)
    // Fixed, not fresh: a fallback reading the clock would be the original bug.
    assert.equal(resolved.value, resolveBuildMtime(empty).value)
    assert.match(resolved.value, /^\d{4}-\d{2}-\d{2}T/)
})