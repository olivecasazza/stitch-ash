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

import assert from "node:assert/strict";
import { test } from "node:test";

import { exclusionReason, normalise } from "./artifact-normalise.mjs";

/** @param {string} s @returns {Buffer} */
const buf = (s) => Buffer.from(s, "utf8");

/** @param {string} path @param {string} s @returns {string} */
const norm = (path, s) => normalise(path, buf(s)).toString("utf8");

// ---------------------------------------------------------------- noise is noise

test("ISO instants in a build manifest normalise away", () => {
  const a = '{"id":"abc","timestamp":1790654959728}';
  const b = '{"id":"abc","timestamp":1790655132604}';
  // The epoch differs as a raw number but is written as a field the normaliser
  // knows about, so both collapse to the same bytes.
  assert.equal(norm("_nuxt/builds/latest.json", a), norm("_nuxt/builds/latest.json", b));
});

test("mtime instants in a JSON payload normalise away", () => {
  const a = '{"mtime":"2026-09-29T04:10:42.925Z","size":137}';
  const b = '{"mtime":"2026-09-29T04:14:05.401Z","size":137}';
  assert.equal(norm("some.json", a), norm("some.json", b));
});

test("nitro.json is excluded, and the exclusion is explained", () => {
  assert.match(exclusionReason("nitro.json"), /wall-clock date/);
  assert.equal(exclusionReason("_nuxt/entry.abc.css"), null);
});

test("sourcemaps are excluded, and the exclusion is explained", () => {
  assert.match(exclusionReason("_worker.js/chunks/build/server.mjs.map"), /sourcemap/);
  assert.equal(exclusionReason("_worker.js/chunks/build/server.mjs"), null);
});

// -------------------------------------------------- key order is order, not content

test("the nitro asset manifest normalises despite reordered keys", () => {
  const entry = (name) =>
    `"/_nuxt/${name}":{type:"text/javascript; charset=utf-8",etag:'"7b6-abc"',` +
    `mtime:"2026-09-29T04:10:42.925Z",size:1974,path:"../_nuxt/${name}"}`;
  const a = `const Hf={${entry("CCUeL1iQ.js")},${entry("BxZ-B2dl.js")}};`;
  const b = `const Hf={${entry("BxZ-B2dl.js")},${entry("CCUeL1iQ.js")}};`;
  assert.equal(
    norm("_worker.js/chunks/nitro/nitro.mjs", a),
    norm("_worker.js/chunks/nitro/nitro.mjs", b),
  );
});

test("asset sizes in exponent notation are matched, not silently skipped", () => {
  // Regression: the pattern used to accept only `size:\\d+`, so the minifier's
  // `size:2e3` did not match, 40 of 51 entries fell out of the sorted run, the
  // run was left unsorted, and two identical builds hashed differently.
  const entry = (name, size) =>
    `"/_nuxt/${name}":{type:"text/javascript; charset=utf-8",etag:'"7b6-abc"',` +
    `mtime:"2026-09-29T04:10:42.925Z",size:${size},path:"../_nuxt/${name}"}`;
  const a = `const Hf={${entry("small.js", "2e3")},${entry("big.js", "28393")}};`;
  const b = `const Hf={${entry("big.js", "28393")},${entry("small.js", "2e3")}};`;
  assert.equal(
    norm("_worker.js/chunks/nitro/nitro.mjs", a),
    norm("_worker.js/chunks/nitro/nitro.mjs", b),
  );
});

test("the nitro asset manifest normalises despite mtime drift", () => {
  const entry = (name, mtime) =>
    `"/_nuxt/${name}":{type:"text/css; charset=utf-8",etag:'"4b-abc"',` +
    `mtime:"${mtime}",size:512,path:"../_nuxt/${name}"}`;
  const a = `const Hf={${entry("a.css", "2026-09-29T04:10:42.925Z")},${entry("b.css", "2026-09-29T04:10:42.925Z")}};`;
  const b = `const Hf={${entry("a.css", "2026-09-29T04:14:05.401Z")},${entry("b.css", "2026-09-29T04:14:05.401Z")}};`;
  assert.equal(
    norm("_worker.js/chunks/nitro/nitro.mjs", a),
    norm("_worker.js/chunks/nitro/nitro.mjs", b),
  );
});

test("the styles import map normalises despite reordered keys", () => {
  const pair = (name, chunk) => `"${name}":()=>import("./${chunk}").then(interopDefault)`;
  const a =
    `const e={${pair("pages/contact.vue", "contact-styles.B1RZc04n.mjs")},` +
    `${pair("components/Badge.vue", "Badge-styles.BbiaCSZP.mjs")}};`;
  const b =
    `const e={${pair("components/Badge.vue", "Badge-styles.BbiaCSZP.mjs")},` +
    `${pair("pages/contact.vue", "contact-styles.B1RZc04n.mjs")}};`;
  assert.equal(
    norm("_worker.js/chunks/build/styles.mjs", a),
    norm("_worker.js/chunks/build/styles.mjs", b),
  );
});

// ------------------------------------------------------------ content is content

test("a different stylesheet byte still changes the normalised bytes", () => {
  // The regression this whole gate exists for. A font that resolves to different
  // bytes at build time is a CONTENT difference and must never be normalised.
  const a = '@font-face{font-family:"JetBrains Mono Fallback: Courier New";src:url(a.woff2)}';
  const b = '@font-face{font-family:"JetBrains Mono Fallback: Roboto Mono";src:url(b.woff2)}';
  assert.notEqual(norm("_nuxt/entry.abc.css", a), norm("_nuxt/entry.abc.css", b));
});

test("a different etag in the manifest does not survive as content", () => {
  // Documented, deliberate: the manifest is a derived second copy of files that
  // are hashed in full elsewhere, and the etag of a timestamp-bearing file
  // changes on every build. This asserts the behaviour so that a future edit
  // has to change this test on purpose, not by accident.
  const entry = (etag) =>
    `"/_nuxt/builds/latest.json":{type:"application/json",etag:'"${etag}"',` +
    `mtime:"2026-09-29T04:10:42.925Z",size:75,path:"../_nuxt/builds/latest.json"}`;
  const other = `"/_nuxt/a.js":{type:"text/javascript",etag:'"1-abc"',mtime:"2026-09-29T04:10:42.925Z",size:10,path:"../_nuxt/a.js"}`;
  const a = `const Hf={${entry("4b-kz1")},${other}};`;
  const b = `const Hf={${entry("4b-kz2")},${other}};`;
  assert.equal(
    norm("_worker.js/chunks/nitro/nitro.mjs", a),
    norm("_worker.js/chunks/nitro/nitro.mjs", b),
  );
});

test("a different asset size in the manifest survives normalisation", () => {
  const entry = (size) =>
    `"/_nuxt/a.js":{type:"text/javascript",etag:'"1-abc"',` +
    `mtime:"2026-09-29T04:10:42.925Z",size:${size},path:"../_nuxt/a.js"}`;
  const other = `"/_nuxt/b.js":{type:"text/javascript",etag:'"2-def"',mtime:"2026-09-29T04:10:42.925Z",size:20,path:"../_nuxt/b.js"}`;
  assert.notEqual(
    norm("_worker.js/chunks/nitro/nitro.mjs", `const Hf={${entry(10)},${other}};`),
    norm("_worker.js/chunks/nitro/nitro.mjs", `const Hf={${entry(11)},${other}};`),
  );
});

test("a different asset path in the manifest survives normalisation", () => {
  const entry = (name) =>
    `"/_nuxt/${name}":{type:"text/javascript",etag:'"1-abc"',` +
    `mtime:"2026-09-29T04:10:42.925Z",size:10,path:"../_nuxt/${name}"}`;
  const other = `"/_nuxt/z.js":{type:"text/javascript",etag:'"2-def"',mtime:"2026-09-29T04:10:42.925Z",size:20,path:"../_nuxt/z.js"}`;
  assert.notEqual(
    norm("_worker.js/chunks/nitro/nitro.mjs", `const Hf={${entry("a.js")},${other}};`),
    norm("_worker.js/chunks/nitro/nitro.mjs", `const Hf={${entry("b.js")},${other}};`),
  );
});

test("a changed import target in the styles map survives normalisation", () => {
  const a = `const e={"pages/contact.vue":()=>import("./contact-styles.B1RZc04n.mjs").then(interopDefault),"x.vue":()=>import("./x.AAAA.mjs").then(interopDefault)};`;
  const b = `const e={"pages/contact.vue":()=>import("./contact-styles.CCCCCCCC.mjs").then(interopDefault),"x.vue":()=>import("./x.AAAA.mjs").then(interopDefault)};`;
  assert.notEqual(norm("_worker.js/chunks/build/styles.mjs", a), norm("_worker.js/chunks/build/styles.mjs", b));
});

test("binary files are passed through untouched", () => {
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0xff]);
  assert.deepEqual(normalise("og-brand-card.png", png), png);
});

test("a file that does not match the manifest shape is left alone", () => {
  // Guards the bail-out in sortPairRun: a half-applied rewrite would make two
  // different builds look identical, which is worse than a false failure.
  const a = `const e={"a":1,"b":2};"unrelated":()=>import("./x.mjs")`;
  assert.equal(norm("_worker.js/chunks/build/styles.mjs", a), a);
});
