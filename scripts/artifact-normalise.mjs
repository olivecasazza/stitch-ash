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
const MANIFEST_ETAG = /etag:'[^']*'/g;

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
const ISO_INSTANT = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z/g;

/** Epoch milliseconds, as written into Nuxt's build manifest. */
const EPOCH_MS = /"timestamp":\s*\d+/g;

/** `"<route>":()=>import("./chunk-<hash>.mjs")` — Nitro's per-route style map. */
const IMPORT_MAP_PAIR = /"[^"]+":\(\)=>import\("[^"]+"\)(\.then\([A-Za-z_$][\w$]*\))?/g;

/**
 * `"/_nuxt/<hash>.js":{type:...,etag:...,mtime:...,size:...,path:...}`
 *
 * `size` is a NUMBER, and the minifier prints it in JS numeric notation, so
 * small sizes arrive as `2e3` and not as `2000`. Matching `\d+` here silently
 * dropped 40 of the 51 entries, which left the manifest unsorted and made two
 * identical builds hash differently. Hence `[\de.+-]+`.
 */
const ASSET_MANIFEST_PAIR =
  /"[^"]+":\{type:"[^"]*",etag:'[^']*',mtime:"[^"]*",size:[\de.+-]+,path:"[^"]*"\}/g;

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
 * @returns {string}
 */
const sortPairRun = (text, pair) => {
  const matches = [...text.matchAll(pair)];
  if (matches.length < 2) return text;

  // Reject if the pairs are not adjacent: a scattered match means we are
  // rewriting structure we do not understand, and a wrong rewrite here would
  // make two genuinely different builds look identical.
  for (let i = 1; i < matches.length; i++) {
    const between = text.slice(matches[i - 1].index + matches[i - 1][0].length, matches[i].index);
    if (between !== ",") return text;
  }

  const sorted = matches.map((m) => m[0]).sort();
  if (sorted.every((v, i) => v === matches[i][0])) return text;

  return (
    text.slice(0, matches[0].index) +
    sorted.join(",") +
    text.slice(matches[matches.length - 1].index + matches[matches.length - 1][0].length)
  );
};

/** @type {Record<string, (text: string) => string>} keyed by dist-relative path */
const BY_PATH = {
  "_worker.js/chunks/build/styles.mjs": (text) => sortPairRun(text, IMPORT_MAP_PAIR),
  "_worker.js/chunks/nitro/nitro.mjs": (text) =>
    sortPairRun(
      text.replace(ISO_INSTANT, "<ts>").replace(MANIFEST_ETAG, "etag:'<etag>'"),
      ASSET_MANIFEST_PAIR,
    ),
};

/**
 * Which part of the deployable output a file belongs to.
 *
 * STI-542 follow-up: measured on 6901731 by building the same commit twice on
 * one machine, every one of the 50 files under dist/_nuxt/ came out
 * byte-identical (the two App Manifest files differ only in their `timestamp`,
 * which the rules above already normalise). All 17 files the gate rejected
 * were under dist/_worker.js/. That is not a guess about which half "matters" —
 * it is where the bytes actually stopped being reproducible, and it is a
 * different failure from the one this issue was filed about.
 *
 * `browser` is the payload a customer is served: the hashed CSS/JS/fonts in
 * dist/_nuxt/, plus dist/__build.json, which is what makes the live site
 * attributable to a commit. The font non-determinism that shipped two different
 * JetBrains Mono payloads for one commit lived entirely in this half.
 *
 * `worker` is the Cloudflare Worker server bundle. Two builds of one commit
 * produce different bytes here that are semantically equivalent: the first
 * differing byte of _worker.js/chunks/nitro/nitro.mjs is a mangled local
 * identifier (`let j` versus `let R`) at the same offset with identical
 * surrounding code, the file changes size by ~27 kB because module→chunk
 * grouping shifts, and every other differing file differs only in the export
 * aliases it imports from that chunk. See the tracked residue in the PR body;
 * this split is what lets the browser guarantee stay enforced while that is
 * fixed.
 *
 * `all` is the union, and is the default, so nothing silently loses coverage:
 * a caller that asks for `all` still hashes both halves.
 *
 * @type {readonly ["browser", "worker", "all"]}
 */
export const SCOPES = ["browser", "worker", "all"];

/**
 * @param {string} path dist-relative, slash-separated
 * @returns {"browser"|"worker"}
 */
export const scopeOf = (path) => (path.startsWith("_worker.js/") ? "worker" : "browser");

/**
 * @param {string[]} argv e.g. process.argv.slice(2)
 * @returns {"browser"|"worker"|"all"}
 * @throws {Error} when an unknown scope is asked for — a typo must not
 *   silently hash `all` and report a scope the caller did not ask for.
 */
export const parseScope = (argv) => {
  const flag = argv.find((a) => a.startsWith("--scope="));
  if (!flag) return "all";
  const value = flag.slice("--scope=".length);
  if (!SCOPES.includes(value)) {
    throw new Error(`unknown scope '${value}'. Expected one of: ${SCOPES.join(", ")}.`);
  }
  return value;
};

/**
 * @param {string} path dist-relative, slash-separated
 * @param {"browser"|"worker"|"all"} scope
 * @returns {boolean} whether the file is inside the requested scope
 */
export const inScope = (path, scope) => scope === "all" || scopeOf(path) === scope;

/**
 * @param {string} path dist-relative, slash-separated
 * @returns {string|null} the reason to exclude this file, or null to keep it
 */
export const exclusionReason = (path) => {
  // Sourcemaps are derived debug artifacts, never served to a browser, and their
  // `mappings` VLQ encodes the same unstable key order as the chunk they
  // describe. Hashing them would reintroduce the flake through the back door.
  if (path.endsWith(".map")) return "sourcemap (derived, unstable key order)";

  // Nitro's build record. Its only varying field is `date`; nothing reads it at
  // runtime, and the deploy provenance this issue needs is served by
  // /__build.json, which IS hashed.
  if (path === "nitro.json") return "nitro build record (wall-clock date only)";

  return null;
};

/**
 * @param {string} path dist-relative, slash-separated
 * @param {Buffer} buffer raw file bytes
 * @returns {Buffer} bytes to hash; identical inputs give identical output
 */
export const normalise = (path, buffer) => {
  const byPath = BY_PATH[path];
  if (byPath) return Buffer.from(byPath(buffer.toString("utf8")), "utf8");

  const isText = /\.(json|mjs|js|css|html|txt)$/.test(path);
  if (!isText) return buffer;

  return Buffer.from(
    buffer.toString("utf8").replace(ISO_INSTANT, "<ts>").replace(EPOCH_MS, '"timestamp":<ts>'),
    "utf8",
  );
};
