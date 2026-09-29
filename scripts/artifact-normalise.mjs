/**
 * The `etag` in Nitro's asset manifest.
 *
 * An etag is a hash OF THE FILE BYTES. The manifest entry for
 * `_nuxt/builds/latest.json` therefore carries a different etag on every build,
 * because that file carries a `timestamp` we are normalising away further up.
 *
 * This is the one place where a content field is dropped rather than
 * normalised, and it is safe for exactly one reason: every one of those files
 * is hashed on its own, in full, elsewhere in this digest. The manifest is a
 * second, derived copy of information already covered. Dropping the derived
 * etag loses no coverage; keeping it would make the digest fail on every build
 * for a value that is not itself what the customer is served.
 */
const MANIFEST_ETAG = /etag:'[^']*'/g

/**
 * Normalise a built file so two builds of ONE commit hash the same.
 *
 * STI-542 established, by building the same commit three times on one machine,
 * that the storefront's *content* is deterministic but its *build metadata* is
 * not. Measured on 6fa7f888 at three consecutive builds:
 *
 *   - every file under dist/_nuxt/ is byte-identical across all three builds
 *     (49 files, same content hashes). The font non-determinism that made two
 *     builds of 9c55c363 ship different JetBrains Mono woff2 payloads is gone
 *     once the face is imported from the pinned @fontsource package instead of
 *     Google's CDN.
 *   - what still moved was wall-clock and object-key ordering:
 *       nitro.json                                  `date`
 *       _nuxt/builds/latest.json                    `timestamp`
 *       _nuxt/builds/meta/<buildId>.json            `timestamp`
 *       _worker.js/chunks/nitro/nitro.mjs           asset-manifest `mtime` + key order
 *       _worker.js/chunks/build/styles.mjs          import-map key order
 *
 * None of those change what a customer is served. All of them change on every
 * build. A digest that does not normalise them is a digest that reports a
 * difference on every single run, which is how a real reproducibility gate gets
 * switched off.
 *
 * The rule this module follows: normalise ONLY values that are derived from the
 * clock or from unordered iteration, and never a value that is content. A
 * content byte that moves still moves the digest. That is the whole point.
 */

/** ISO-8601 instants: nitro's `date`, asset-manifest `mtime`. */
const ISO_INSTANT = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z/g

/** Epoch milliseconds, as written into Nuxt's build manifest. */
const EPOCH_MS = /"timestamp":\s*\d+/g

/** `"<route>":()=>import("./chunk-<hash>.mjs")` — Nitro's per-route style map. */
const IMPORT_MAP_PAIR = /"[^"]+":\(\)=>import\("[^"]+"\)(\.then\([A-Za-z_$][\w$]*\))?/g

/**
 * `"/_nuxt/<hash>.js":{type:...,etag:...,mtime:...,size:...,path:...}`
 *
 * `size` is a NUMBER, and the minifier prints it in JS numeric notation, so
 * small sizes arrive as `2e3` and not as `2000`. Matching `\d+` here silently
 * dropped 40 of the 51 entries, which left the manifest unsorted and made two
 * identical builds hash differently. Hence `[\de.+-]+`.
 */
const ASSET_MANIFEST_PAIR
    = /"[^"]+":\{type:"[^"]*",etag:'[^']*',mtime:"[^"]*",size:[\de.+-]+,path:"[^"]*"\}/g

/**
 * Sort the `<key>:<value>` pairs inside one long run of a minified object
 * literal, leaving the rest of the line untouched.
 *
 * The run is found by matching consecutive pairs separated by exactly `,` and
 * requiring at least two of them: a single pair cannot be "reordered", so a
 * lone match means the pattern did not really match the shape we expect and the
 * file is better left alone than half-rewritten.
 *
 * @param {string} text the file contents
 * @param {RegExp} pair source with the `g` flag, one match per key
 * @returns {string} the run sorted, or `text` unchanged if it was not a run
 */
const sortPairRun = (text, pair) => {
    const matches = [...text.matchAll(pair)]
    if (matches.length < 2) return text

    // Reject if the pairs are not adjacent: a scattered match means we are
    // rewriting structure we do not understand, and a wrong rewrite here would
    // make two genuinely different builds look identical.
    for (let i = 1; i < matches.length; i++) {
        const between = text.slice(matches[i - 1].index + matches[i - 1][0].length, matches[i].index)
        if (between !== ',') return text
    }

    const sorted = matches.map(m => m[0]).sort()
    if (sorted.every((v, i) => v === matches[i][0])) return text

    return (
        text.slice(0, matches[0].index)
        + sorted.join(',')
        + text.slice(matches[matches.length - 1].index + matches[matches.length - 1][0].length)
    )
}

// ------------------------------------------------------ mangled names in generated chunks

/**
 * Generated, minified chunks. Everything under here is produced by the bundler
 * from dependency source; none of it is authored in this repository.
 */
const GENERATED_CHUNK = /^_worker\.js\/chunks\/.+\.mjs$/

/**
 * A file is only treated as minified when its average line is long. This is the
 * guard that keeps the rule off authored code: in a hand-written file `a`, `b`
 * and `c` are CONTENT, and renaming them in the digest would blind the gate to a
 * real change. In a minified chunk they are not.
 */
const MINIFIED_AVERAGE_LINE = 1000

/**
 * Names esbuild never mangles, so their bytes are never renamed by a tie-break
 * and must not be canonicalised. Keywords are load-bearing syntax; the globals
 * are the ones that appear as bare identifiers in minified output.
 */
const NEVER_MANGLED = new Set([
    // keywords
    'await', 'break', 'case', 'catch', 'class', 'const', 'continue', 'debugger',
    'default', 'delete', 'do', 'else', 'enum', 'export', 'extends', 'false',
    'finally', 'for', 'function', 'if', 'import', 'in', 'instanceof', 'new',
    'null', 'return', 'super', 'switch', 'this', 'throw', 'true', 'try',
    'typeof', 'var', 'void', 'while', 'with', 'yield', 'let', 'static', 'async',
    'get', 'set', 'of', 'from', 'as',
    // literals and bare globals that survive minification
    'arguments', 'eval', 'undefined', 'NaN', 'Infinity', 'globalThis',
])

/** esbuild's name alphabet tops out at 3 characters for a file this size. */
const MANGLED_NAME = /^[A-Z_$][\w$]{0,2}$/i

const isIdentStart = c => c !== undefined && /[A-Z_$]/i.test(c)
const isIdentPart = c => c !== undefined && /[\w$]/.test(c)

/**
 * Replace every mangled local binding with a stable placeholder derived from
 * FIRST-USE ORDER, leaving every other byte exactly as it was.
 *
 * WHY THIS EXISTS (STI-573). Nitro embeds the public asset manifest — 52 entries
 * carrying a per-file `mtime` and a content `etag` — inside the same bundle it
 * then hands to esbuild's `renderChunk` minifier (nitropack 2.13.4,
 * dist/rollup/index.mjs: `transform(code, {loader:"js", minify:true})`).
 *
 * The `mtime` values are wall-clock and the `etag` of the two build-manifest
 * files is a hash of a file that contains a `timestamp`, so those bytes differ on
 * every build. esbuild picks generated identifier names from a character-
 * frequency table computed over its input, so those differing bytes perturb the
 * table and flip which equally-frequent character a name gets. Because
 * `nitro.mjs` is ONE flat minified scope, a single flip renames symbols across
 * the whole file and rewrites the trailing `export{...}` list — with the byte
 * length unchanged and the semantics identical.
 *
 * WHAT IS PROVEN, and what is not, so the next reader does not have to guess:
 *   - The drift CI reports is real and the two versions are the same length with
 *     identical semantics, differing in generated local names and the trailing
 *     `export{...}` list. That is measured, in this issue's description.
 *   - That esbuild's name choice is a function of its input is not in doubt —
 *     `transform(code, {minify: true})` is handed a bundle whose bytes move every
 *     build, and the name table is computed over those bytes.
 *   - The cascade is INTERMITTENT. Two builds of one commit on one machine have
 *     also been observed agreeing after normalisation, and re-minifying the real
 *     458KB chunk with one manifest character changed moved 1 byte, not a
 *     cascade. So a single green local two-build pass is NOT evidence this rule
 *     is unnecessary, and a single red one is not proof it is this rule's fault.
 *     The gate on CI, over repeated runs, is the only real arbiter.
 *   - Both directions are pinned by unit tests: a renamed binding collapses, and
 *     a changed string, number, property, key, regex, template text or comment
 *     still moves the digest (scripts/artifact-normalise.test.mjs).
 *
 * WHY IT IS SAFE, stated plainly because this rule deliberately weakens what the
 * gate measures:
 *   - It only runs on generated minified chunks, never on authored source.
 *   - It only renames BINDINGS. Property accesses (`x.a`), object-literal keys
 *     (`{a:1}`), string literals, template text, numbers and comments are
 *     emitted byte-for-byte, because a rename cannot alter a string or a key.
 *   - First-use order is stable under a rename: a rename is a bijection over
 *     names, so the token at position N keeps its position. That is what makes
 *     the placeholder sequence identical for both builds.
 *   - Across chunks, the coupling is covered too: a chunk that imports
 *     `import{Gl as e}` reads the name at the same position as one that imports
 *     `import{Jl as e}`, so both canonicalise to the same token.
 *
 * KNOWN LIMIT, recorded here rather than discovered later: the digest also
 * covers each chunk's PATH, and Vite bakes a content hash into the filename
 * (`Badge-DM92lylC.mjs`). If a future rename ever changes bytes in a chunk whose
 * name carries a hash, the file's path moves and this rule cannot follow it.
 * Closing that needs the clock kept out of the bundler's input altogether, which
 * is a change to what Nitro is told to record — deliberately not done here.
 */
const canonicaliseMangledNames = (text) => {
    const lines = text.length / (text.split('\n').length)
    if (lines < MINIFIED_AVERAGE_LINE) return text

    let out = ''
    const names = new Map()
    let i = 0
    const n = text.length

    /**
     * Last non-whitespace character emitted, used to read the token context.
     *
     * Tracked in a variable rather than read back off `out`. Indexing a rope
     * flattens it, so scanning `out` backwards for every identifier in the file
     * is quadratic: it cost 32s on the 458KB nitro chunk, against 0.4s for the
     * whole digest without this rule. `emit` keeps the two in step.
     */
    let lastNonSpace = ''

    const emit = (s) => {
        out += s
        if (s.length === 0) return
        const tail = s[s.length - 1]
        if (!/\s/.test(tail)) lastNonSpace = tail
    }

    const lastChar = () => lastNonSpace

    // Context stack. "code" parses JS; "template" scans template-literal text;
    // "subst" parses the code inside a `${...}` and is closed by the matching `}`.
    //
    // A frame opened by a CLASS BODY additionally carries `priv`, the private
    // names declared directly in that class, and `next`, the slot counter that
    // keys them. See the STI-589 note on canonicaliseMangledNames for why a
    // private name must not be canonicalised by global first use.
    const stack = [{ kind: 'code', depth: 0, priv: null, next: 0 }]
    const top = () => stack[stack.length - 1]

    /** The innermost enclosing class body, or null outside any class. */
    const classFrame = () => {
        for (let k = stack.length - 1; k >= 0; k--) if (stack[k].priv) return stack[k]
        return null
    }

    // Set by a `class` keyword, consumed by the `{` that opens its body. Cleared
    // by anything else that intervenes, so `x.class` and `{class:1}` cannot open
    // a scope (those are filtered as member/key reads before this is set).
    let pendingClass = false

    while (i < n) {
        const c = text[i]

        if (top().kind === 'template') {
            if (c === '\\') {
                emit(text.slice(i, i + 2))
                i += 2
                continue
            }
            if (c === '`') {
                emit(c)
                i++
                stack.pop()
                continue
            }
            if (c === '$' && text[i + 1] === '{') {
                emit('${')
                i += 2
                stack.push({ kind: 'subst', depth: 0 })
                continue
            }
            emit(c)
            i++
            continue
        }

        // --- code context ---
        if (c === '/' && text[i + 1] === '/') {
            const end = text.indexOf('\n', i)
            const stop = end === -1 ? n : end
            emit(text.slice(i, stop))
            i = stop
            continue
        }
        if (c === '/' && text[i + 1] === '*') {
            const end = text.indexOf('*/', i + 2)
            const stop = end === -1 ? n : end + 2
            emit(text.slice(i, stop))
            i = stop
            continue
        }
        if (c === '"' || c === '\'') {
            let j = i + 1
            while (j < n) {
                if (text[j] === '\\') j += 2
                else if (text[j] === c) break
                else j++
            }
            emit(text.slice(i, j + 1))
            i = j + 1
            continue
        }
        if (c === '`') {
            emit(c)
            i++
            stack.push({ kind: 'template' })
            continue
        }
        if (c === '/' && REGEX_CAN_PRECEDE.test(lastChar())) {
            // A `/` here starts a regex literal, not a division. Scan it, then its
            // flags, and emit the whole thing verbatim.
            let j = i + 1
            let inClass = false
            let closed = false
            while (j < n) {
                if (text[j] === '\\') {
                    j += 2
                }
                else if (text[j] === '\n') {
                    break
                }
                else if (text[j] === '[') {
                    inClass = true
                    j++
                }
                else if (text[j] === ']') {
                    inClass = false
                    j++
                }
                else if (text[j] === '/' && !inClass) {
                    closed = true
                    break
                }
                else {
                    j++
                }
            }
            if (closed) {
                j++
                while (j < n && /[a-z]/.test(text[j])) j++
                emit(text.slice(i, j))
                i = j
                continue
            }
        }
        if (c === '{') {
            top().depth++
            emit(c)
            i++
            stack.push({ kind: 'code', depth: 0, priv: pendingClass ? new Map() : null, next: 0 })
            pendingClass = false
            continue
        }
        if (c === '}') {
            if (top().kind === 'subst' && top().depth === 0) {
                emit(c)
                i++
                stack.pop()
                continue
            }
            top().depth--
            emit(c)
            i++
            if (stack.length > 1) stack.pop()
            pendingClass = false
            continue
        }
        // --- STI-589: private names are canonicalised by DECLARATION SLOT ---
        //
        // A private field's first textual occurrence is its declaration in the
        // class body, so the global first-use counter assigns slots by that
        // order. When esbuild swaps the two short names it hands two adjacent
        // fields, the declarations swap WITH them, the counters swap, and every
        // later use swaps. The whole file then fails to collapse even though the
        // two builds are the same program. Keying the placeholder on the slot
        // position instead makes both builds agree, because the slot is a
        // property of the class, not of the name it was handed.
        if (c === '#') {
            const name = /^[A-Za-z_$][\w$]*/.exec(text.slice(i + 1))
            if (!name) {
                emit(c)
                i++
                continue
            }
            const end = i + 1 + name[0].length
            const frame = classFrame()
            // `x.#a` is a read; a bare `#a` followed by `;`, `=` or the closing
            // brace of the class body is a declaration.
            const declares = lastChar() !== '.' && /^[ \t]*[;=}]/.test(text.slice(end))
            if (!frame) {
                emit(text.slice(i, end))
            }
            else if (declares) {
                if (!frame.priv.has(name[0])) frame.priv.set(name[0], `\u0000c${frame.next++}\u0000`)
                emit(frame.priv.get(name[0]))
            }
            else {
                emit(frame.priv.has(name[0]) ? frame.priv.get(name[0]) : text.slice(i, end))
            }
            i = end
            continue
        }
        if (isIdentStart(c)) {
            let j = i
            while (j < n && isIdentPart(text[j])) j++
            const word = text.slice(i, j)

            // What follows, skipping whitespace: a `:` here means the token may be an
            // object-literal key, and a key is content, not a binding.
            let k = j
            while (k < n && /\s/.test(text[k])) k++
            const isMember = lastChar() === '.'
            const isKey = text[k] === ':' && (lastChar() === '{' || lastChar() === ',')

            if (MANGLED_NAME.test(word) && !NEVER_MANGLED.has(word) && !isMember && !isKey) {
                if (!names.has(word)) names.set(word, `\u0000${names.size}\u0000`)
                emit(names.get(word))
            }
            else {
                // `class` is the one keyword whose body opens a private-name
                // scope. Read as a member (`x.class`) or a key (`{class:1}`) it
                // does not, so it must not arm the flag in those positions.
                if (word === 'class' && !isMember && !isKey) pendingClass = true
                emit(word)
            }
            i = j
            continue
        }
        emit(c)
        i++
    }

    return out
}

/** Positions after which a `/` opens a regex literal rather than a division. */
const REGEX_CAN_PRECEDE = /[({[,;:=!&|?+\-*%~^<>]/

/** @type {Record<string, (text: string) => string>} keyed by dist-relative path */
const BY_PATH = {
    '_worker.js/chunks/build/styles.mjs': text => sortPairRun(text, IMPORT_MAP_PAIR),
    '_worker.js/chunks/nitro/nitro.mjs': text =>
        sortPairRun(
            text.replace(ISO_INSTANT, '<ts>').replace(MANIFEST_ETAG, 'etag:\'<etag>\''),
            ASSET_MANIFEST_PAIR,
        ),
}

/**
 * @param {string} path dist-relative, slash-separated
 * @returns {string|null} the reason to exclude this file, or null to keep it
 */
export const exclusionReason = (path) => {
    // Sourcemaps are derived debug artifacts, never served to a browser, and their
    // `mappings` VLQ encodes the same unstable key order as the chunk they
    // describe. Hashing them would reintroduce the flake through the back door.
    if (path.endsWith('.map')) return 'sourcemap (derived, unstable key order)'

    // Nitro's build record. Its only varying field is `date`; nothing reads it at
    // runtime, and the deploy provenance this issue needs is served by
    // /__build.json, which IS hashed.
    if (path === 'nitro.json') return 'nitro build record (wall-clock date only)'

    return null
}

/**
 * @param {string} path dist-relative, slash-separated
 * @param {Buffer} buffer raw file bytes
 * @returns {Buffer} bytes to hash; identical inputs give identical output
 */
export const normalise = (path, buffer) => {
    // Binary files are returned untouched. Routing them through a utf8 round-trip
    // would corrupt them, and scripts/artifact-normalise.test.mjs pins that.
    if (!/\.(?:json|mjs|js|css|html|txt)$/.test(path)) return buffer

    const text = buffer.toString('utf8')
    const byPath = BY_PATH[path]
    const base = byPath ? byPath(text) : text.replace(ISO_INSTANT, '<ts>').replace(EPOCH_MS, '"timestamp":<ts>')

    // Applied LAST, on top of the rules above, so the placeholder ordering is
    // computed over the already-normalised text — otherwise the two builds would
    // agree on the clock fields and still disagree on first-use order.
    if (GENERATED_CHUNK.test(path)) return Buffer.from(canonicaliseMangledNames(base), 'utf8')
    return Buffer.from(base, 'utf8')
}
