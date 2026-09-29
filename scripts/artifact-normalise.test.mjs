/**
 * Tests for the artifact normaliser.
 *
 * STI-542: this file is the reason the determinism gate can be trusted. The
 * gate passes when two builds of one commit hash the same, which it only does
 * if the normaliser removes clock and ordering noise — and a gate that passes
 * too readily is worse than no gate, because it converts "unverified" into
 * "verified" for every claim that depends on it.
 *
 * So both directions are asserted here:
 *   1. Real build-metadata noise normalises to the same bytes.
 *   2. Real CONTENT differences survive normalisation and still move the digest.
 *
 * The fixtures below are trimmed from the real artifacts, not invented: the
 * three-way size, the exponent-notation `size:2e3`, and the two object shapes
 * are all things that were actually observed in dist/ on 6fa7f888.
 *
 * Run: node --test scripts/artifact-normalise.test.mjs
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'

import { exclusionReason, normalise } from './artifact-normalise.mjs'

/** @param {string} s @returns {Buffer} */
const buf = s => Buffer.from(s, 'utf8')

/** @param {string} path @param {string} s @returns {string} */
const norm = (path, s) => normalise(path, buf(s)).toString('utf8')

// ---------------------------------------------------------------- noise is noise

test('ISO instants in a build manifest normalise away', () => {
    const a = '{"id":"abc","timestamp":1790654959728}'
    const b = '{"id":"abc","timestamp":1790655132604}'
    // The epoch differs as a raw number but is written as a field the normaliser
    // knows about, so both collapse to the same bytes.
    assert.equal(norm('_nuxt/builds/latest.json', a), norm('_nuxt/builds/latest.json', b))
})

test('mtime instants in a JSON payload normalise away', () => {
    const a = '{"mtime":"2026-09-29T04:10:42.925Z","size":137}'
    const b = '{"mtime":"2026-09-29T04:14:05.401Z","size":137}'
    assert.equal(norm('some.json', a), norm('some.json', b))
})

test('nitro.json is excluded, and the exclusion is explained', () => {
    assert.match(exclusionReason('nitro.json'), /wall-clock date/)
    assert.equal(exclusionReason('_nuxt/entry.abc.css'), null)
})

test('sourcemaps are excluded, and the exclusion is explained', () => {
    assert.match(exclusionReason('_worker.js/chunks/build/server.mjs.map'), /sourcemap/)
    assert.equal(exclusionReason('_worker.js/chunks/build/server.mjs'), null)
})

// -------------------------------------------------- key order is order, not content

test('the nitro asset manifest normalises despite reordered keys', () => {
    const entry = name =>
        `"/_nuxt/${name}":{type:"text/javascript; charset=utf-8",etag:'"7b6-abc"',`
        + `mtime:"2026-09-29T04:10:42.925Z",size:1974,path:"../_nuxt/${name}"}`
    const a = `const Hf={${entry('CCUeL1iQ.js')},${entry('BxZ-B2dl.js')}};`
    const b = `const Hf={${entry('BxZ-B2dl.js')},${entry('CCUeL1iQ.js')}};`
    assert.equal(
        norm('_worker.js/chunks/nitro/nitro.mjs', a),
        norm('_worker.js/chunks/nitro/nitro.mjs', b),
    )
})

test('asset sizes in exponent notation are matched, not silently skipped', () => {
    // Regression: the pattern used to accept only `size:\\d+`, so the minifier's
    // `size:2e3` did not match, 40 of 51 entries fell out of the sorted run, the
    // run was left unsorted, and two identical builds hashed differently.
    const entry = (name, size) =>
        `"/_nuxt/${name}":{type:"text/javascript; charset=utf-8",etag:'"7b6-abc"',`
        + `mtime:"2026-09-29T04:10:42.925Z",size:${size},path:"../_nuxt/${name}"}`
    const a = `const Hf={${entry('small.js', '2e3')},${entry('big.js', '28393')}};`
    const b = `const Hf={${entry('big.js', '28393')},${entry('small.js', '2e3')}};`
    assert.equal(
        norm('_worker.js/chunks/nitro/nitro.mjs', a),
        norm('_worker.js/chunks/nitro/nitro.mjs', b),
    )
})

test('the nitro asset manifest normalises despite mtime drift', () => {
    const entry = (name, mtime) =>
        `"/_nuxt/${name}":{type:"text/css; charset=utf-8",etag:'"4b-abc"',`
        + `mtime:"${mtime}",size:512,path:"../_nuxt/${name}"}`
    const a = `const Hf={${entry('a.css', '2026-09-29T04:10:42.925Z')},${entry('b.css', '2026-09-29T04:10:42.925Z')}};`
    const b = `const Hf={${entry('a.css', '2026-09-29T04:14:05.401Z')},${entry('b.css', '2026-09-29T04:14:05.401Z')}};`
    assert.equal(
        norm('_worker.js/chunks/nitro/nitro.mjs', a),
        norm('_worker.js/chunks/nitro/nitro.mjs', b),
    )
})

test('the styles import map normalises despite reordered keys', () => {
    const pair = (name, chunk) => `"${name}":()=>import("./${chunk}").then(interopDefault)`
    const a
        = `const e={${pair('pages/contact.vue', 'contact-styles.B1RZc04n.mjs')},`
            + `${pair('components/Badge.vue', 'Badge-styles.BbiaCSZP.mjs')}};`
    const b
        = `const e={${pair('components/Badge.vue', 'Badge-styles.BbiaCSZP.mjs')},`
            + `${pair('pages/contact.vue', 'contact-styles.B1RZc04n.mjs')}};`
    assert.equal(
        norm('_worker.js/chunks/build/styles.mjs', a),
        norm('_worker.js/chunks/build/styles.mjs', b),
    )
})

// ------------------------------------------------------------ content is content

test('a different stylesheet byte still changes the normalised bytes', () => {
    // The regression this whole gate exists for. A font that resolves to different
    // bytes at build time is a CONTENT difference and must never be normalised.
    const a = '@font-face{font-family:"JetBrains Mono Fallback: Courier New";src:url(a.woff2)}'
    const b = '@font-face{font-family:"JetBrains Mono Fallback: Roboto Mono";src:url(b.woff2)}'
    assert.notEqual(norm('_nuxt/entry.abc.css', a), norm('_nuxt/entry.abc.css', b))
})

test('a different etag in the manifest does not survive as content', () => {
    // Documented, deliberate: the manifest is a derived second copy of files that
    // are hashed in full elsewhere, and the etag of a timestamp-bearing file
    // changes on every build. This asserts the behaviour so that a future edit
    // has to change this test on purpose, not by accident.
    const entry = etag =>
        `"/_nuxt/builds/latest.json":{type:"application/json",etag:'"${etag}"',`
        + `mtime:"2026-09-29T04:10:42.925Z",size:75,path:"../_nuxt/builds/latest.json"}`
    const other = `"/_nuxt/a.js":{type:"text/javascript",etag:'"1-abc"',mtime:"2026-09-29T04:10:42.925Z",size:10,path:"../_nuxt/a.js"}`
    const a = `const Hf={${entry('4b-kz1')},${other}};`
    const b = `const Hf={${entry('4b-kz2')},${other}};`
    assert.equal(
        norm('_worker.js/chunks/nitro/nitro.mjs', a),
        norm('_worker.js/chunks/nitro/nitro.mjs', b),
    )
})

test('a different asset size in the manifest survives normalisation', () => {
    const entry = size =>
        `"/_nuxt/a.js":{type:"text/javascript",etag:'"1-abc"',`
        + `mtime:"2026-09-29T04:10:42.925Z",size:${size},path:"../_nuxt/a.js"}`
    const other = `"/_nuxt/b.js":{type:"text/javascript",etag:'"2-def"',mtime:"2026-09-29T04:10:42.925Z",size:20,path:"../_nuxt/b.js"}`
    assert.notEqual(
        norm('_worker.js/chunks/nitro/nitro.mjs', `const Hf={${entry(10)},${other}};`),
        norm('_worker.js/chunks/nitro/nitro.mjs', `const Hf={${entry(11)},${other}};`),
    )
})

test('a different asset path in the manifest survives normalisation', () => {
    const entry = name =>
        `"/_nuxt/${name}":{type:"text/javascript",etag:'"1-abc"',`
        + `mtime:"2026-09-29T04:10:42.925Z",size:10,path:"../_nuxt/${name}"}`
    const other = `"/_nuxt/z.js":{type:"text/javascript",etag:'"2-def"',mtime:"2026-09-29T04:10:42.925Z",size:20,path:"../_nuxt/z.js"}`
    assert.notEqual(
        norm('_worker.js/chunks/nitro/nitro.mjs', `const Hf={${entry('a.js')},${other}};`),
        norm('_worker.js/chunks/nitro/nitro.mjs', `const Hf={${entry('b.js')},${other}};`),
    )
})

test('a changed import target in the styles map survives normalisation', () => {
    const a = `const e={"pages/contact.vue":()=>import("./contact-styles.B1RZc04n.mjs").then(interopDefault),"x.vue":()=>import("./x.AAAA.mjs").then(interopDefault)};`
    const b = `const e={"pages/contact.vue":()=>import("./contact-styles.CCCCCCCC.mjs").then(interopDefault),"x.vue":()=>import("./x.AAAA.mjs").then(interopDefault)};`
    assert.notEqual(norm('_worker.js/chunks/build/styles.mjs', a), norm('_worker.js/chunks/build/styles.mjs', b))
})

test('binary files are passed through untouched', () => {
    const png = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0xFF])
    assert.deepEqual(normalise('og-brand-card.png', png), png)
})

test('a file that does not match the manifest shape is left alone', () => {
    // Guards the bail-out in sortPairRun: a half-applied rewrite would make two
    // different builds look identical, which is worse than a false failure.
    const a = `const e={"a":1,"b":2};"unrelated":()=>import("./x.mjs")`
    assert.equal(norm('_worker.js/chunks/build/styles.mjs', a), a)
})

// ------------------------------------------- mangled names in generated chunks

/**
 * The rule that canonicalises minified local names only fires above an average
 * line length, so a fixture has to be long to be recognised as minified. The
 * padding is trailing spaces, which contribute length and no content.
 */
const MINIFIED_PAD = ' '.repeat(1500)

/** @param {string} body @returns {string} a fixture long enough to look minified */
const minified = body => body + MINIFIED_PAD

/** The path the rule applies to. */
const CHUNK = '_worker.js/chunks/nitro/nitro.mjs'

/** @param {string} a @param {string} b @returns {boolean} true if the pair collapses */
const chunkCollapses = (a, b) => norm(CHUNK, a) === norm(CHUNK, b)

test('a renamed local binding in a minified chunk normalises away', () => {
    // The actual STI-573 cause: esbuild assigns the same binding a different
    // short name between two builds of one commit because the differing manifest
    // bytes perturb its character-frequency table. Same length, same semantics,
    // different identifiers — and the digest must not move for that.
    assert.ok(
        chunkCollapses(
            minified('const o={};function f(){const Gl=1;return Gl}export{f};'),
            minified('const o={};function f(){const Jl=1;return Jl}export{f};'),
        ),
    )
})

test('the trailing export list does not defeat the rule', () => {
    // The rename rewrites the whole `export{...}` tail, which is the part of the
    // file a customer-facing diff would most obviously show. It must collapse too.
    assert.ok(
        chunkCollapses(
            minified('var Gl=1,Jl=2;export{Gl as a,Jl as p};'),
            minified('var Jl=1,Gl=2;export{Jl as a,Gl as p};'),
        ),
    )
})

test('a real string literal in a minified chunk still moves the digest', () => {
    // Direction 2, the one that matters. A rename is not a string change, so a
    // string must survive byte-for-byte.
    assert.ok(
        !chunkCollapses(minified('f("alpha");'), minified('f("bravo");')),
    )
})

test('a real numeric literal in a minified chunk still moves the digest', () => {
    assert.ok(!chunkCollapses(minified('f(2047);'), minified('f(2048);')))
})

test('a property name is content, not a binding', () => {
    // `x.a` and `x.b` reach the customer as different behaviour. Only BINDINGS are
    // renamed; a property access is emitted byte-for-byte.
    assert.ok(!chunkCollapses(minified('x.a+1;'), minified('x.b+1;')))
})

test('an object-literal key is content, not a binding', () => {
    // `{a:1}` and `{b:1}` are different data. The rule has to tell a key from a
    // binding by what follows the token, since both are bare identifiers.
    assert.ok(!chunkCollapses(minified('const o={a:1};'), minified('const o={b:1};')))
})

test('a nested object-literal key is content, not a binding', () => {
    assert.ok(
        !chunkCollapses(minified('const o={p:{a:1}};'), minified('const o={p:{b:1}};')),
    )
})

test('an object-literal key after whitespace is content, not a binding', () => {
    // The key is not always flush against the brace, so the rule cannot decide on
    // the preceding character alone.
    assert.ok(!chunkCollapses(minified('const o={ a:1};'), minified('const o={ b:1};')))
    assert.ok(
        !chunkCollapses(minified('const o={p:1, a:1};'), minified('const o={p:1, b:1};')),
    )
})

test('template literal text is content, and a substitution inside one is a binding', () => {
    // Both halves of a template: the text is bytes, the `${}` is parsed as code.
    assert.ok(!chunkCollapses(minified('f(`alpha`);'), minified('f(`bravo`);')))
    assert.ok(
        chunkCollapses(minified('f(`${Gl}`);'), minified('f(`${Jl}`);')),
    )
})

test('a regex literal is content, not a division', () => {
    // A `/` after `(` opens a regex, not a division. If the rule misread it as
    // division it would rename inside the pattern and merge genuinely different
    // regular expressions.
    assert.ok(!chunkCollapses(minified('f(/ab+/);'), minified('f(/cd+/);')))
})

test('a comment is content', () => {
    assert.ok(
        !chunkCollapses(minified('//alpha\nf(1);'), minified('//bravo\nf(1);')),
    )
})

test('authored, non-minified code is never rewritten', () => {
    // The guard that keeps this rule off source files. In a hand-written module
    // `a`, `b` and `c` are content and a rename must stay visible, however short
    // the file is.
    assert.ok(!chunkCollapses('const a=1,b=2;f(a,b);', 'const a=1,b=3;f(a,b);'))
    assert.ok(
        !chunkCollapses('function f(){const Gl=1;return Gl}', 'function f(){const Gl=2;return Gl}'),
    )
})

test('a comment is content (the mutation the CI chunk control makes)', () => {
    // This is the exact byte the second negative control in pr-checks.yml
    // appends to a real chunk in dist/. If appending it did NOT move the
    // digest, that control would fail on every run and the gate would be
    // un-runnable; if it moved the digest for the wrong reason, the control
    // would be proving nothing. Pinned here so the two stay in step.
    const before = norm(CHUNK, minified('f(1);'))
    const after = norm(CHUNK, `${minified('f(1);')}\n//sti573-negative-control\n`)
    assert.ok(before !== after, 'appending a comment to a chunk must move the digest')
})

test('a path outside the generated chunks is never rewritten', () => {
    // Same guarantee from the other side: the rule is scoped by path, so even a
    // long, minified-looking file elsewhere in dist/ keeps its identifiers.
    const long = 'const Gl=1;f(Gl);' + MINIFIED_PAD
    assert.equal(norm('_nuxt/entry.abc.js', long), long)
    assert.equal(norm('some/other/long.mjs', long), long)
})
