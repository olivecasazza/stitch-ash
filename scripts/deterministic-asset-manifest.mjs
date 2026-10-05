/**
 * STI-625: keep the BUILD CLOCK out of the bundle, instead of normalising it away.
 *
 * WHAT WAS MEASURED (STI-625, three cold builds of 22f5fa8)
 * ------------------------------------------------------
 * Every raw byte difference between two builds of one commit sat inside the
 * client asset manifest that Nitro embeds in the bundle it then minifies:
 *
 *     48 runs   mtime:"2026-10-02T12:30:50.836Z" -> mtime:"2026-10-02T12:32:07.304Z"
 *      6 runs   manifest key order only
 *
 * So there are two independent clocks to remove, and Nitro creates BOTH in one
 * place. nitropack 2.13.4, dist/rollup/index.mjs ~line 1230:
 *
 *     const etag = createEtag(assetData)
 *     assets[assetId] = { type, encoding, etag, mtime: stat.mtime.toJSON(), size, path }
 *
 *   1. `mtime` is a filesystem mtime of `dist/<asset>`, so it moves on every
 *      build that writes the file.
 *   2. `etag` is a hash OF THE FILE BYTES. For the two app-manifest files the
 *      bytes contain a clock: @nuxt/nitro-server dist/index.mjs ~line 492 does
 *      `const buildTimestamp = Date.now()` and writes it into
 *      `builds/latest.json` and `builds/meta/<buildId>.json`. So those two
 *      entries' etags move on every build even though nothing about them changed.
 *   3. Key ORDER. The same statement fills the object with `runParallel(..., {
 *      concurrency: 25 })` over a globby file list, so the keys land in stat
 *      COMPLETION order. That is not content and not stable.
 *
 * Measured, in order, on this branch (two cold builds of 5b624cd each time):
 *
 *   before   1238 differing bytes, 32 merged runs — mtime + etag + key order
 *   mtime fixed, key order not
 *            1238 differing bytes, 32 merged runs — key order ONLY; all 56
 *            entries present in both, identical as a set; single distinct mtime
 *            in the whole 462KB bundle; trailing export list byte-identical
 *   both fixed
 *            byte-identical raw
 *
 * Why the fix belongs here and not in the digest: `scripts/artifact-normalise.mjs`
 * used to blank both fields. That made the digest stable while leaving the
 * bundle itself unstable, and it was never sufficient anyway — the clock bytes
 * are inside the string esbuild minifies, and esbuild picks generated
 * identifier names from a character-frequency table computed over its input, so
 * moving bytes can flip which equally-frequent character a name gets and rename
 * symbols across the whole flat nitro.mjs scope. The clock is the TRIGGER for
 * STI-573's cascade, so the right place to remove it is the build.
 *
 * NITRO HAS NO OPTION FOR EITHER FIELD
 * ------------------------------------
 * There is no Nitro or Nuxt option to omit, freeze or override `mtime` or
 * `etag`; the virtual module above is generated unconditionally and the only
 * readers of `mtime` are the static handler's conditional-request logic
 * (dist/runtime/internal/static.mjs). So this module does the only two things
 * available:
 *
 *   1. `neutraliseAppManifestClock` rewrites the app-manifest JSON in the
 *      OUTPUT directory so its content stops carrying a wall clock. That is what
 *      makes those two etags functions of the commit again, which turns the etag
 *      into real content.
 *   2. `deterministicAssetManifest` rewrites the manifest's `mtime` to a value
 *      derived from that asset's OWN etag, before the minifier sees it.
 *
 * WHY THE MTIME IS THE COMMIT DATE
 * ---------------------------------
 * A frozen mtime would break conditional requests, and so would a hash of the
 * content. Nitro answers `If-Modified-Since` by comparing against the asset mtime:
 *
 *     const mtimeDate = new Date(asset.mtime)
 *     if (ifModifiedSinceH && asset.mtime && new Date(ifModifiedSinceH) >= mtimeDate) -> 304
 *
 * Two properties are therefore required of whatever replaces the clock:
 *
 *   1. It must be a FUNCTION OF THE COMMIT, or two builds of one commit differ.
 *   2. It must be MONOTONIC ACROSS COMMITS, or a client can be told "304 Not
 *      Modified" for an asset whose bytes DID change — after which it keeps the
 *      stale bytes indefinitely, which is silent and permanent.
 *
 * A constant fails (2). A hash of the content fails (2) as well, and this fix
 * tried it first: spreading a content hash over 2020-2030 makes changed bytes
 * land on a RANDOM instant in that window, so roughly half of all changed assets
 * get an mtime EARLIER than the `If-Modified-Since` a client is already holding,
 * and the `>=` then fires on new bytes. That is a worse bug than the one being
 * fixed, so it is recorded here rather than shipped.
 *
 * The commit's own committer date satisfies both: it is a field of the commit
 * object, so one commit always yields the same string, and commits are authored
 * in order, so a later deploy gets a later `Last-Modified` and clients correctly
 * refetch.
 *
 * Today the field is not even read on this deploy target: `_routes.json`
 * excludes `/_nuxt/*` from the worker, so all 56 manifest entries are served by
 * Cloudflare's asset layer and not by Nitro's static handler. That is why this
 * change is safe to reason about today, and it is also why the reasoning above
 * matters the moment an asset IS routed through the worker.
 */

import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { readBuildCommitDate } from './read-build-commit.mjs'

/** The virtual module Nitro generates the client asset manifest into. */
export const ASSET_MANIFEST_ID = 'nitro-internal-virtual/public-assets-data'

/**
 * The `mtime` written into every manifest entry when the commit date cannot be
 * read (a tarball build, a checkout with no git).
 *
 * A fixed instant rather than a fresh `Date`, because the whole point is that two
 * builds of one commit produce the same bytes, and a fallback that reads the
 * clock would reintroduce the defect it is standing in for. It is also the one
 * value here that is NOT monotonic, so the build log says so: with it, every
 * asset looks unchanged to a client holding a real `If-Modified-Since`. That is
 * only reachable on a build that cannot name its own commit, which is already an
 * unverified build (STI-542 makes the same argument for the buildId fallback).
 */
const UNRESOLVED_COMMIT_DATE = '2020-01-01T00:00:00.000Z'

/**
 * The `mtime` for this build's manifest entries.
 *
 * Resolved ONCE per build, so every entry in a manifest agrees — a manifest where
 * entries disagree about the build's date would be a third thing to drift.
 *
 * @param {string} rootDir repo root, for `git show -s --format=%ct HEAD`
 * @returns {{ value: string, resolved: boolean }} ISO-8601 instant, and whether
 *   it came from the commit or from the fallback
 */
export const resolveBuildMtime = (rootDir) => {
    const date = readBuildCommitDate(rootDir)
    if (date) return { value: date, resolved: true }
    console.error(
        '[deterministic-asset-manifest] no git commit date available; using the '
        + `fixed fallback mtime ${UNRESOLVED_COMMIT_DATE}. The build is reproducible, `
        + 'but every asset will look unchanged to a client holding an If-Modified-Since.',
    )
    return { value: UNRESOLVED_COMMIT_DATE, resolved: false }
}

/** An ISO instant, which is the only shape `mtime` has ever had here. */
const ISO_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:[+-]\d{2}:\d{2}|Z)$/

/**
 * Rewrite the generated asset manifest so no entry carries a wall clock.
 *
 * The module body is `export default ${JSON.stringify(assets, null, 2)};`, so
 * this parses the JSON rather than pattern-matching bytes: an unexpected shape
 * is then a loud failure instead of a silent half-rewrite. A silent half-rewrite
 * is the failure mode this whole class of bug has, because it leaves a build
 * that looks clean and is not.
 *
 * @param {string} code the generated module source
 * @param {string} mtime the ISO instant to stamp on every entry
 * @returns {{ code: string, entries: number, changed: number }}
 */
export const rewriteAssetManifest = (code, mtime) => {
    const prefix = 'export default '
    const trimmed = code.trimEnd()
    if (!code.startsWith(prefix) || !trimmed.endsWith(';')) {
        throw new Error(
            `[deterministic-asset-manifest] ${ASSET_MANIFEST_ID} no longer has the `
            + '`export default <json>;` shape this module rewrites. Refusing to '
            + 'guess: a build clock would go straight back into the bundle.',
        )
    }

    const body = trimmed.slice(prefix.length, -1)
    let assets
    try {
        assets = JSON.parse(body)
    } catch (error) {
        throw new Error(
            `[deterministic-asset-manifest] ${ASSET_MANIFEST_ID} is not JSON after `
            + `\`export default \`: ${error.message}. Refusing to guess.`,
        )
    }

    if (!assets || typeof assets !== 'object' || Array.isArray(assets)) {
        throw new Error(
            `[deterministic-asset-manifest] ${ASSET_MANIFEST_ID} did not export an `
            + 'object. Refusing to guess.',
        )
    }

    // Sorted by asset id. The second of the two clocks, and the one that
    // outlives the first fix: Nitro fills this object with `runParallel(..., {
    // concurrency: 25 })` over a globby file list, so the key order is the
    // completion order of 25 concurrent stat calls over a directory — it is not
    // sorted, and it is not stable between two builds of one commit. Measured
    // here after removing the wall clock: two cold builds of 5b624cd still
    // differed by 1238 bytes in 32 runs, all of it this reordering, with all 56
    // entries present in both and identical as a SET.
    //
    // Sorting is safe because nothing reads the order. Every consumer in
    // nitropack 2.13.4 looks an entry UP by key (`assets[id]`,
    // getPublicAssetMeta`, `isPublicAssetURL`); the single `for (const key in
    // assets)` at dist/rollup/index.mjs:1275 is the gzip/br encoding fixup,
    // which mutates `assets[originalKey]` and reaches the same fixed point in
    // any order. `Object.entries(assets)` at :1525 is over a different object
    // (serverAssets, not the public manifest).
    //
    // This is the RIGHT place for it, not in the digest. scripts/
    // artifact-normalise.mjs already sorts these pairs for hashing purposes, so
    // the gate was green while the bundle itself was not byte-identical — which
    // is STI-573's exact failure mode: a normaliser absorbing something the
    // build could simply have been told to do.
    const ids = Object.keys(assets).sort()

    let changed = 0
    for (const id of ids) {
        const entry = assets[id]
        if (!entry || typeof entry !== 'object' || typeof entry.etag !== 'string') {
            throw new Error(
                `[deterministic-asset-manifest] manifest entry ${id} has no string `
                + 'etag. This module only rewrites `mtime`, so an entry without one '
                + 'means Nitro changed the manifest shape; refuse rather than guess.',
            )
        }
        if (typeof entry.mtime !== 'string' || !ISO_INSTANT.test(entry.mtime)) {
            throw new Error(
                `[deterministic-asset-manifest] manifest entry ${id} carries mtime `
                + `${JSON.stringify(entry.mtime)}, which is not an ISO instant. The `
                + 'value this module replaces is no longer the field it was written '
                + 'for; update it deliberately rather than letting it through.',
            )
        }
        const next = mtime
        if (next !== entry.mtime) changed++
        entry.mtime = next
    }

    // Same formatting Nitro emits, so the minifier sees a file shaped exactly as
    // it always has apart from the mtime values and the key order.
    const sorted = {}
    for (const id of ids) sorted[id] = assets[id]

    return {
        code: `${prefix}${JSON.stringify(sorted, null, 2)};`,
        entries: ids.length,
        changed,
    }
}

/**
 * How many times the rewrite ran in THIS build.
 *
 * nuxt.config.ts reads this in a `close`-time assertion to fail the build when
 * the plugin did not fire — the only way to notice that Nitro renamed the module
 * this keys on, which is the one regression that would otherwise be invisible: a
 * bundle that carries the build clock again, hashed green by a normaliser that
 * is a backstop and not the fix.
 *
 * @returns {{ transforms: number, entries: number }}
 */
export const manifestRewriteStats = () => ({ ...STATS })

const STATS = { transforms: 0, entries: 0 }

const APP_MANIFEST_STATS = { calls: 0, targets: 0 }

/**
 * What `neutraliseAppManifestClock` has actually seen this build.
 *
 * This exists because the first version of the hook was wired to a guard that is
 * false for the `cloudflare_pages` preset, so it returned early and rewrote
 * nothing — while every unit test passed, because they call the function directly
 * and never the wiring. The live site's `/_nuxt/builds/latest.json` still carried
 * the deploy clock after that shipped. The `compiled` hook asserts on this, so
 * "the hook did not run" is a failed build instead of a silent regression.
 */
export const appManifestClockStats = () => ({ ...APP_MANIFEST_STATS })

/**
 * The rollup plugin that applies the rewrite before the minifier does.
 *
 * It has to run before esbuild's transform. Nitro builds its rollup config with
 * `defu(nitro.options.rollupConfig, { ... plugins: [] })` and then PUSHES its own
 * plugins on to the end, so a plugin registered from config is first in the array
 * and rollup runs `transform` hooks in array order. Nitro's esbuild plugin
 * registers both `transform` (loader-by-loader, no minify) and `renderChunk`
 * (minify), so transforming the manifest here happens before either sees it.
 *
 * @returns {{ name: string, transform: (code: string, id: string) => ({ code: string, map: null })|null }}
 */
export const assetManifestPlugin = (mtime) => ({
    name: 'stitch-ash:deterministic-asset-manifest',
    transform(code, id) {
        if (!id.includes(ASSET_MANIFEST_ID)) return null
        const result = rewriteAssetManifest(code, mtime)
        STATS.transforms++
        STATS.entries += result.entries
        console.error(
            `[deterministic-asset-manifest] rewrote ${result.changed} wall-clock mtime `
            + `value(s) across ${result.entries} asset entries`,
        )
        return { code: result.code, map: null }
    },
})

/**
 * The value written into the app manifest's `timestamp` field.
 *
 * Nuxt writes `Date.now()` there. Nothing reads it: the outdated-build check
 * compares `meta.id` against the current build id
 * (nuxt/dist/app/plugins/check-outdated-build.client.js, `meta.id !== current
 * ?.id`), and the server inlines only the manifest's `prerendered` list. So the
 * field costs reproducibility and buys nothing.
 *
 * 0 rather than a plausible recent date, so it reads as "not a build clock"
 * rather than as a believable wrong value.
 */
export const APP_MANIFEST_TIMESTAMP = 0

/**
 * Rewrite `timestamp` in Nuxt's app-manifest JSON, in the OUTPUT directory.
 *
 * The output copy is the one that matters: Nuxt copies `.nuxt/manifest/**` into
 * `dist/_nuxt/builds/**` inside `copyPublicAssets`, and the etag that reaches the
 * bundle is computed from the copied bytes afterwards.
 *
 * @param {string} publicDir Nitro's resolved output public dir, for the log
 * @param {string} buildsDir absolute path of `_nuxt/builds` inside it
 * @returns {{ files: string[] }} the files rewritten, for the build log
 */
export const neutraliseAppManifestClock = (publicDir, buildsDir) => {
    // `latest.json` and every `meta/<buildId>.json`.
    //
    // A directory that is not there is a LOUD failure, not an empty result: this
    // function is reached from a hook, so "nothing to do" and "the hook never
    // reached the files" look identical from the outside, and the first version
    // of this shipped that ambiguity to production.
    const metaDir = join(buildsDir, 'meta')
    if (!existsSync(join(buildsDir, 'latest.json')) || !existsSync(metaDir)) {
        throw new Error(
            `[deterministic-asset-manifest] no app manifest under ${buildsDir}. `
            + 'The nuxt `nitro:build:public-assets` hook runs before Nitro writes '
            + '_nuxt/builds/, or Nuxt moved them. Fail rather than ship a bundle '
            + 'whose _nuxt/builds/*.json etag is a hash of the build clock.',
        )
    }
    const targets = [
        join(buildsDir, 'latest.json'),
        ...readdirSync(metaDir).map(name => join(metaDir, name)),
    ]
    APP_MANIFEST_STATS.calls += 1
    APP_MANIFEST_STATS.targets += targets.length

    const rewritten = []
    for (const file of targets) {
        const manifest = JSON.parse(readFileSync(file, 'utf8'))
        if (typeof manifest.timestamp !== 'number') {
            throw new Error(
                `[deterministic-asset-manifest] ${file} has no numeric \`timestamp\`. `
                + 'Nuxt changed the app manifest; update this rather than assuming it.',
            )
        }
        if (manifest.timestamp === APP_MANIFEST_TIMESTAMP) continue
        manifest.timestamp = APP_MANIFEST_TIMESTAMP
        // JSON.stringify, not a regex: key order and spacing come out as Nuxt
        // wrote them, and a shape Nuxt did not write fails here instead of
        // producing a file that parses and means something else.
        writeFileSync(file, JSON.stringify(manifest), 'utf8')
        rewritten.push(file)
    }

    console.error(
        `[deterministic-asset-manifest] rewrote timestamp in ${rewritten.length} of `
        + `${targets.length} app-manifest file(s) under ${publicDir}`,
    )
    return { files: rewritten }
}
