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

// ---------------------------------------------------------------- STI-589
//
// The intermittency this pins is measured, not hypothetical. Two builds of
// a19ffaa run with the gate's own command (`rm -rf .nuxt dist` before each)
// produced two different digests, differing ONLY in
// `_worker.js/chunks/nitro/nitro.mjs`; `__build.json` was byte-identical.
// The difference was two private fields of one class in unjs/cacheable:

//   cold-2  ...#j;#C;#k;#E;   static unsafeExposeInternals(e){return{starts:e.#C,ttls:e.#k,...
//   cold-3  ...#j;#k;#C;#E;   static unsafeExposeInternals(e){return{starts:e.#k,ttls:e.#C,...

// `#k` had 11 references in one and 9 in the other, `#C` the reverse, and every
// other private name counted the same: 61 distinct names, 487 references, and
// the same 458462-byte file. esbuild swapped the two short names it handed two
// adjacent fields, which is STI-573's frequency-table mechanism landing on a
// tie close enough to flip.
//
// First-use order CANNOT absorb this, and that is the whole defect: a private
// field's first occurrence is its declaration in the class body, so swapping
// the names swaps the declarations, which swaps the counters, which swaps every
// later use. The placeholder has to be keyed on the declaration SLOT.

/** A class with two adjacent private fields, in the shape esbuild emits. */
const swapPair = (a, b) =>
    minified(`class u{#h;#${a};#${b};#E;static get(e){return{starts:e.#${a},ttls:e.#${b}}}` +
        `m(e){this.#${a}=e;this.#${b}=e}get s(){return this.#${a}}}`)

test('two swapped private field names in a minified class normalise away (STI-589)', () => {
    // The field list, the static accessor and the two assignments all follow the
    // swap, exactly as they did in the real 458KB chunk.
    assert.ok(chunkCollapses(swapPair('C', 'k'), swapPair('k', 'C')))
})

test('a private field rename inside a class normalises away (STI-589)', () => {
    // A swap is the hard case; a plain rename is the easy one and must keep working.
    assert.ok(
        chunkCollapses(
            minified('class u{#a;f(e){this.#a=e}return this.#a}'),
            minified('class u{#z;f(e){this.#z=e}return this.#z}'),
        ),
    )
})

test('the same private name in two classes is not collapsed across them (STI-589)', () => {
    // Private names are class-scoped, so `#a` in one class and `#a` in another
    // are two different slots. Canonicalising them together — as a single global
    // map did — would make a real change to either class invisible.
    const twoClasses = (x, y) => minified(`class u{#a;f(){return this.#${x}}}` +
        `class v{#a;f(){return this.#${y}}}`)
    assert.ok(!chunkCollapses(twoClasses('a', 'a'), twoClasses('a', 'b')))
})

test('a different private field set still moves the digest (STI-589)', () => {
    // Slot assignment must not make the rule blind: adding, removing or moving a
    // field changes the slots, and that has to reach the digest.
    assert.ok(
        !chunkCollapses(
            minified('class u{#a;#b;f(){return this.#a+this.#b}}'),
            minified('class u{#a;#b;#c;f(){return this.#a+this.#b+this.#c}}'),
        ),
    )
    assert.ok(
        !chunkCollapses(
            minified('class u{#a;#b;f(){return this.#a+this.#b}}'),
            minified('class u{#a;f(){return this.#a}}'),
        ),
    )
})

test('a private field ASSIGNMENT value is content, not a name (STI-589)', () => {
    // `this.#a = 1` and `this.#a = 2` differ in behaviour and must not collapse,
    // even though the only thing that moved is on a line that also names a field.
    assert.ok(
        !chunkCollapses(
            minified('class u{#a;f(){this.#a=1;return this.#a}}'),
            minified('class u{#a;f(){this.#a=2;return this.#a}}'),
        ),
    )
})

test('`class` as a member or a key does not open a private-name scope (STI-589)', () => {
    // The scope is armed by the `class` KEYWORD. Read as `o.class` or written as
    // an object key it is an ordinary name, and arming on those would hand a
    // `#a` outside any class the same slot as a `#a` inside one.
    const normalised = norm(CHUNK, minified('const o={class:1};f(o.class,x.class,y.#a);'))
    assert.ok(
        normalised.includes('.#a)'),
        'a private name with no enclosing class must be emitted verbatim, not slotted',
    )
})

// ------------------------------------------------------- STI-589, round two
//
// The first STI-589 fix closed the private-FIELD transposition. It did not
// close the two shapes the first real dump actually contained, captured from
// CI run 36630363851 (job 109629666602, the first run whose artifact upload
// worked) — two normalised copies of `_worker.js/chunks/nitro/nitro.mjs`, both
// 525577 bytes, differing in 9 places and NOTHING else:
//
//   [replace] ...moveToTail:1=>0.#I(1),indexes:1=>0.#P(1),rindexes:1=>0.#z(1),...
//   [replace] *#P({allowStale:0=this.allowStale}={}){if(this...
//   [replace] ...727=Object.freeze({...$f,...If});Object.freeze({...Pf,body:"",hidden:!1})...
//
// Both transpositions are the same letters, `I` and `P`, and both are the
// mechanism STI-573 identified landing on a tie close enough to flip.
//
// HOLE A — private METHODS were never slotted. `declares` only matched a
// private name followed by `;`, `=` or `}`, which is the shape of a field. A
// method is followed by `(`, so it was never registered in the class frame and
// every reference to it was emitted raw. Measured on the dump: build a held
// 8 raw `#P` and 5 raw `#I`, build b held 5 and 8, and the whole 525KB file
// emitted ZERO `\0c<n>` slot placeholders — the rule never fired once.
//
// HOLE B — `...` is indistinguishable from `.` by a last-character test. The
// names in `{...$f,...If}` and `{...Pf,...}` each occur EXACTLY ONCE in the
// whole chunk, both immediately after a spread, and `isMember` read the `.` as
// a member access, so they were never entered into the first-use map either.
// Their first uses are transposed, so their placeholders are transposed.

/** A class whose two private METHODS are adjacent, in the shape esbuild emits. */
const swapMethodPair = (a, b) =>
    minified(`class u{#h;*#${a}(e={}){if(this.m)for(let t of this.#${a}())return t}` +
        `#${b}(e){return this.m=e}static get(e){return{indexes:t=>t.#${a}(1),moveToTail:t=>t.#${b}(1)}}` +
        `keys(){for(let t of this.#${a}())return t}}`)

test('two swapped private METHOD names in a minified class normalise away (STI-589)', () => {
    // Hole A. The declarations stay in place and only the NAMES swap, which is
    // exactly the `#P`/`#I` pair in the real dump.
    assert.ok(chunkCollapses(swapMethodPair('P', 'I'), swapMethodPair('I', 'P')))
})

test('a private method rename inside a class normalises away (STI-589)', () => {
    assert.ok(
        chunkCollapses(
            minified('class u{#a;*f(e={}){return this.#a}e(){return this.#a(1)}g(){return this.#a}}'),
            minified('class u{#z;*f(e={}){return this.#z}e(){return this.#z(1)}g(){return this.#z}}'),
        ),
    )
})

test('a different private method set still moves the digest (STI-589)', () => {
    // Slot assignment must not make the rule blind. Same contract as the field
    // case above: adding, removing or moving a member changes the slots, and
    // that has to reach the digest. Renaming a member is NOT this test -- a
    // rename is a bijection over names, so it is meant to collapse.
    assert.ok(
        !chunkCollapses(
            minified('class u{*#a(){}#b(){}}'),
            minified('class u{*#a(){}#b(){}#c(){}}'),
        ),
    )
    assert.ok(
        !chunkCollapses(
            minified('class u{*#a(){}#b(){}}'),
            minified('class u{*#a(){}}'),
        ),
    )
    // DELIBERATELY NOT ASSERTED: `*#a(){}#b(){}` against `*#b(){}#a(){}` collapses.
    // Absorbing an adjacent swap and detecting one are mutually exclusive, and
    // this rule is on the absorb side -- the same trade the shipped field rule
    // already makes, verified against origin/main before this branch was cut.
    // What is asserted above is the part that is recoverable: a change in how
    // MANY members a class has still moves the digest.
})

test('a private method body that changes still moves the digest (STI-589)', () => {
    assert.ok(
        !chunkCollapses(
            minified('class u{*#a(){return this.m=1}#b(){return 2}}'),
            minified('class u{*#a(){return this.m=2}#b(){return 2}}'),
        ),
    )
})

test('a private name in a brand check is not a declaration (STI-589)', () => {
    // `#a in o` tests a brand. It must not consume a declaration slot, or the
    // slot counter would depend on how many brand checks a class happens to use.
    const brand = (x) => minified(`class u{*#${x}(){}f(o){return #${x} in o}}`)
    assert.ok(chunkCollapses(brand('a'), brand('a')))
    const normalised = norm(CHUNK, brand('a'))
    assert.ok(
        !normalised.includes('\u0000c0\u0000 in o'),
        'the brand check must keep its own name rather than take a slot',
    )
})

test('two swapped bindings that occur only after a spread normalise away (STI-589)', () => {
    // Hole B, in the exact shape the dump had: neither name is declared or
    // referenced anywhere else in the chunk, so their ONLY first use is the
    // spread position — and that position is transposed.
    const frozen = (a, b) => minified(`const o=Object.freeze({...$f,...${a}});Object.freeze({...${b},body:"",hidden:!1});`)
    assert.ok(chunkCollapses(frozen('If', 'Pf'), frozen('Pf', 'If')))
})

test('a renamed binding used only after a spread normalises away (STI-589)', () => {
    assert.ok(
        chunkCollapses(
            minified('const o=Object.freeze({...$f,...Gl});'),
            minified('const o=Object.freeze({...$f,...Jl});'),
        ),
    )
})

test('content after a spread still moves the digest (STI-589)', () => {
    // The direction that matters for hole B: the spread fix classifies a NAME,
    // so a changed property, value or key alongside it must still be visible.
    assert.ok(
        !chunkCollapses(
            minified('const o=Object.freeze({...$f,...If});'),
            minified('const o=Object.freeze({...$f,...If,extra:1});'),
        ),
    )
    assert.ok(
        !chunkCollapses(
            minified('const o=Object.freeze({...$f,...If});Object.freeze({...Pf,body:"",hidden:!1});'),
            minified('const o=Object.freeze({...$f,...If});Object.freeze({...Pf,body:"",hidden:!0});'),
        ),
    )
    // A member reached THROUGH a spread argument is still a member.
    assert.ok(
        !chunkCollapses(
            minified('const o=f(...a.b);'),
            minified('const o=f(...a.c);'),
        ),
    )
})

test('a member access after a member access is still a member (STI-589)', () => {
    // The `...` test must key on the dot RUN, not on having seen a dot: `a.b.c`
    // ends in a member access, and only the last one is the binding.
    const normalised = norm(CHUNK, minified('const o=f(a.b.c);'))
    assert.ok(normalised.includes('.b.'), 'a middle member must survive verbatim')
})

// ------------------------------------------------- STI-589, round three: QA on #146
//
// qa-verifier, on PR #146, found the opposite defect to the one that fix closed:
// it absorbed CONTENT. The placeholders are NUL-delimited sentinels, and
// `out.replace(/\0d(\d+)\0/g, ...)` ran over the whole finished output — so a real
// string literal whose bytes happened to be the sentinel had its text rewritten:
//
//   in   class A{m(){this.#x();return "\0d0\0"}#x(){return 1}}
//   out  ...return "\0c0\0"...
//
// A rule that edits a string literal is the exact failure the two negative
// controls exist to prevent: the digest no longer describes the artifact it is
// supposed to be hashing. The same whole-output path also reached template text
// and regex bodies.
//
// The fix is NOT to narrow which markers the regex accepts — the marker set has
// to stay collision-free against the WHOLE output, and any NUL-delimited choice
// can collide. The fix is to decline the file: `canonicaliseMangledNames` now
// returns its input untouched when the source already contains a NUL, so the
// substitution pass can only ever see sentinels it emitted itself.
//
// This is the safe direction to fail. A chunk left uncanonicalised can report
// drift; it can never hide it. The 12 local builds of a19ffaa that pin this
// behaviour contained zero raw NUL bytes, so the guard does not weaken anything
// that is actually in the digest today.

/** The sentinel the deferred-read path emits for its first marker, as source bytes. */
const SENTINEL = '\u0000d0\u0000'

test('a string literal holding the marker bytes is not rewritten (STI-589)', () => {
    // The regression, exactly as qa-verifier reported it. Before the fix this
    // returned the class slot (`\0c0\0`) in place of the literal's own bytes.
    const out = norm(CHUNK, minified(`class A{m(){this.#x();return "${SENTINEL}"}#x(){return 1}}`))
    assert.ok(
        out.includes(`"${SENTINEL}"`),
        `the literal's bytes must survive verbatim; got ${JSON.stringify(out.slice(-90))}`,
    )
    assert.ok(!out.includes('\u0000c0\u0000"'), 'a slot placeholder must not be written into a string')
})

test('template text holding the marker bytes is not rewritten (STI-589)', () => {
    const out = norm(CHUNK, minified('class A{m(){return `' + SENTINEL + '`}#x(){return 1}}m2(){this.#x()}'))
    assert.ok(out.includes(SENTINEL), 'template text must survive verbatim')
})

test('a regex holding the marker bytes is not rewritten (STI-589)', () => {
    const out = norm(CHUNK, minified(`class A{m(){return/${SENTINEL}/}#x(){return 1}}m2(){this.#x()}`))
    assert.ok(out.includes(SENTINEL), 'a regex body must survive verbatim')
})

test('two chunks differing only in marker bytes inside a string do not collapse (STI-589)', () => {
    // The digest-level statement of the finding: with the rule applied, a change
    // in string CONTENT must still move the digest. Before the fix these two
    // hashed the same, because both were rewritten to the same slot placeholder.
    assert.ok(
        !chunkCollapses(
            minified(`class A{m(){this.#x();return "${SENTINEL}"}#x(){return 1}}`),
            minified(`class A{m(){this.#x();return "${SENTINEL.replace('0', '1')}"}#x(){return 1}}`),
        ),
        'a changed string literal must not collapse',
    )
})

test('a genuine deferred private read is still resolved when no NUL is present (STI-589)', () => {
    // The guard must not be a blanket "rule off": the read-before-declare shape it
    // exists for still has to collapse, or #146's own fix regresses.
    const readFirst = (a, b) =>
        minified(`class u{static unsafeExposeInternals(e){return{starts:e.#${a},ttls:e.#${b}}}`
            + `#${a}=0;#${b}=0;m(){return this.#${a}+this.#${b}}}`)
    assert.ok(chunkCollapses(readFirst('C', 'k'), readFirst('k', 'C')))

    // And a real difference in that shape must still move the digest.
    assert.ok(
        !chunkCollapses(
            readFirst('C', 'k'),
            minified('class u{static unsafeExposeInternals(e){return{starts:e.#C,ttls:e.#k}}'
                + '#C=0;#k=0;m(){return this.#C*this.#k}}'),
        ),
        'a changed operator in a deferred-read class must not collapse',
    )
})

test('a chunk carrying NUL bytes is left entirely alone (STI-589)', () => {
    // The guard is all-or-nothing on purpose: a file the rule cannot describe
    // unambiguously is reported as-is rather than half-rewritten.
    const source = minified(`const s="${SENTINEL}";class u{#a;f(e){return this.#a+e}}`)
    assert.equal(norm(CHUNK, source), source)
})
