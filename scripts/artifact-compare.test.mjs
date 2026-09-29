/**
 * Tests for scripts/artifact-compare.mjs.
 *
 * STI-542: the determinism gate compares one digest over the whole artifact.
 * When that digest moves, this script is what says WHICH file moved. That
 * makes it part of the gate's correctness, not a convenience: if it names the
 * wrong file, or names files the digest never looked at, it sends whoever
 * reads the red build after a file that is not the cause.
 *
 * The two tests below are regressions for real bugs found while writing it:
 *
 *   - `walk()` resolved paths against the directory it was currently in
 *     rather than the root, so `dist/_nuxt/a.js` indexed as `a.js` and
 *     collided with a same-named file at the dist root.
 *   - the differ filter compared a digest string against a record object,
 *     which is never equal, so EVERY shared file was reported as differing.
 *
 * Both were silent: the script exited 1 and printed plausible output while
 * being wrong in the direction that costs the most time.
 */

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const script = join(dirname(fileURLToPath(import.meta.url)), "artifact-compare.mjs");

/**
 * @param {Record<string,string>} files path -> contents
 * @returns {string} the directory created
 */
const fixture = (files) => {
  const dir = mkdtempSync(join(tmpdir(), "artifact-compare-"));
  for (const [path, body] of Object.entries(files)) {
    const full = join(dir, path);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, body);
  }
  return dir;
};

/** @returns {{status: number, stdout: string}} */
const run = (...args) => {
  try {
    return { status: 0, stdout: execFileSync(process.execPath, [script, ...args], { encoding: "utf8" }) };
  } catch (err) {
    return { status: err.status, stdout: `${err.stdout ?? ""}` };
  }
};

test("a file that is identical on both sides is not reported as differing", () => {
  const a = fixture({ "b.txt": "same", "_nuxt/a.js": "AAA" });
  const b = fixture({ "b.txt": "same", "_nuxt/a.js": "AAA" });
  try {
    const { status, stdout } = run(a, b);
    assert.equal(status, 0, "identical trees must exit 0");
    assert.match(stdout, /agree on all/);
  } finally {
    rmSync(a, { recursive: true, force: true });
    rmSync(b, { recursive: true, force: true });
  }
});

test("a nested file is compared under its real path, not its basename", () => {
  // Same basename at the dist root and under _nuxt/. If walk() resolved paths
  // against the directory it was in, both would index as `a.js` and the
  // unchanged root file would be reported as differing.
  const a = fixture({ "a.js": "ROOT", "_nuxt/a.js": "AAA" });
  const b = fixture({ "a.js": "ROOT", "_nuxt/a.js": "BBB" });
  try {
    const { status, stdout } = run(a, b);
    assert.equal(status, 1);
    assert.match(stdout, /differs: _nuxt\/a\.js/);
    assert.doesNotMatch(stdout, /^ {2}differs: a\.js$/m, "the unchanged root file must not be named");
  } finally {
    rmSync(a, { recursive: true, force: true });
    rmSync(b, { recursive: true, force: true });
  }
});

test("a file present on only one side is named, not silently ignored", () => {
  const a = fixture({ "a.js": "AAA" });
  const b = fixture({ "a.js": "AAA", "only-in-b.js": "BBB" });
  try {
    const { status, stdout } = run(a, b);
    assert.equal(status, 1);
    assert.match(stdout, /only in .*: only-in-b\.js/);
  } finally {
    rmSync(a, { recursive: true, force: true });
    rmSync(b, { recursive: true, force: true });
  }
});

test("a file the normaliser excludes is not blamed for the digest moving", () => {
  // artifact-hash.mjs skips sourcemaps and nitro.json outright. Reporting them
  // here as differences would point the reader at noise the gate never hashed.
  const a = fixture({ "x.mjs": "same", "x.mjs.map": '{"version":1,"names":[]}' });
  const b = fixture({ "x.mjs": "same", "x.mjs.map": '{"version":3,"names":[]}' });
  try {
    const { status, stdout } = run(a, b);
    assert.equal(status, 0, "an excluded file differing must not fail the comparison");
    assert.match(stdout, /agree on all 2 hashed files/);
    assert.match(stdout, /excluded from the digest, so it would not move/);
    assert.match(stdout, /x\.mjs\.map/);
  } finally {
    rmSync(a, { recursive: true, force: true });
    rmSync(b, { recursive: true, force: true });
  }
});

test("a build-clock field inside a covered file is normalised away", () => {
  const a = fixture({ "a.json": '{"date":"2026-01-01T00:00:00.000Z","x":1}' });
  const b = fixture({ "a.json": '{"date":"2026-06-06T12:00:00.000Z","x":1}' });
  try {
    const { status } = run(a, b);
    assert.equal(status, 0, "only the timestamp moved, so the builds agree");
  } finally {
    rmSync(a, { recursive: true, force: true });
    rmSync(b, { recursive: true, force: true });
  }
});

test("a missing directory is an error, not an empty success", () => {
  const a = fixture({ "a.js": "AAA" });
  try {
    const { status } = run(a, join(a, "does-not-exist"));
    assert.equal(status, 2);
  } finally {
    rmSync(a, { recursive: true, force: true });
  }
});

test("a worker-only difference is invisible when the browser scope is asked for", () => {
  // STI-542 follow-up. The two halves of dist/ are not equally reproducible:
  // dist/_worker.js/ picks up minifier alias drift and module->chunk regrouping
  // between builds of ONE commit, while dist/_nuxt/ is byte-identical. If
  // `--scope=browser` still reported worker churn, the gate would be red for a
  // difference the browser digest cannot see — and a gate that ignores its own
  // scope is worse than no gate.
  const a = fixture({ "_nuxt/a.js": "AAA", "_worker.js/chunks/nitro/nitro.mjs": "AAA" });
  const b = fixture({ "_nuxt/a.js": "AAA", "_worker.js/chunks/nitro/nitro.mjs": "BBB" });
  try {
    const browser = run(a, b, "--scope=browser");
    assert.equal(browser.status, 0, "the browser payload is identical, so the browser digest must not move");
    assert.doesNotMatch(browser.stdout, /nitro\.mjs/);

    const worker = run(a, b, "--scope=worker");
    assert.equal(worker.status, 1, "the worker digest did move and must be reported");
    assert.match(worker.stdout, /nitro\.mjs/);
  } finally {
    rmSync(a, { recursive: true, force: true });
    rmSync(b, { recursive: true, force: true });
  }
});

test("a browser difference is still reported when the worker scope is asked for", () => {
  // The mirror of the test above, and the one that would catch a scope filter
  // written as a blocklist instead of an allowlist.
  const a = fixture({ "_nuxt/a.js": "AAA", "_worker.js/index.js": "AAA" });
  const b = fixture({ "_nuxt/a.js": "BBB", "_worker.js/index.js": "AAA" });
  try {
    const browser = run(a, b, "--scope=browser");
    assert.equal(browser.status, 1);
    assert.match(browser.stdout, /_nuxt\/a\.js/);

    const worker = run(a, b, "--scope=worker");
    assert.equal(worker.status, 0);
  } finally {
    rmSync(a, { recursive: true, force: true });
    rmSync(b, { recursive: true, force: true });
  }
});

test("an unknown scope is an error, not a silent fall back to hashing everything", () => {
  const a = fixture({ "_nuxt/a.js": "AAA" });
  const b = fixture({ "_nuxt/a.js": "BBB" });
  try {
    const { status } = run(a, b, "--scope=brwoser");
    assert.equal(status, 2, "a typo must not report a scope nobody asked for");
  } finally {
    rmSync(a, { recursive: true, force: true });
    rmSync(b, { recursive: true, force: true });
  }
});
