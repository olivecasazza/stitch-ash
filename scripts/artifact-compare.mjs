/**
 * Name the files that differ between two builds of one commit.
 *
 * STI-542: the reproducibility gate compares one digest over the whole
 * artifact. When that digest moves, the run log used to say only "two builds
 * produced different content" and print two hex strings. That is true and it
 * is unactionable: it does not say WHICH file moved, so the next person has to
 * rebuild the world to find out. This script is what turns that failure into a
 * one-line answer.
 *
 * It compares two directories through the SAME normaliser
 * (scripts/artifact-normalise.mjs) the digest uses, so a file it reports is a
 * file the gate actually rejects, and a file it does not report is a file the
 * gate already treats as equivalent. Running a different normalisation here
 * would make this a second, disagreeing opinion about what differs.
 *
 * For each differing file it prints the normalised SHA-256 of both sides, so
 * the two bytes can be recovered and diffed directly:
 *
 *   node scripts/artifact-compare.mjs dist-a dist-b
 *   node scripts/artifact-compare.mjs dist-a dist-b --scope=browser
 *   node scripts/artifact-compare.mjs dist-a dist-b --dump
 *
 * `--scope` narrows the report to one half of the artifact, using the same
 * partition scripts/artifact-hash.mjs hashes with, so a file this reports is
 * a file that scope's digest would reject.
 *
 * `--dump` also writes each side's normalised bytes to .artifact-compare/ so
 * they can be inspected with an ordinary diff tool.
 *
 * Exit codes: 0 when the two directories agree, 1 when they do not, 2 when a
 * directory is missing or unreadable.
 */

import { createHash } from "node:crypto";
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { exclusionReason, inScope, normalise, parseScope } from "./artifact-normalise.mjs";

/**
 * @param {string} dir absolute path to a build output
 * @returns {string[]} every file path, relative to `dir`, slash-normalised, sorted
 */
const walk = (dir, root = dir) => {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full, root));
    // `relative` is taken against `root`, not against the `dir` being walked.
    // Resolving it against the walking `dir` would return a path relative to
    // the subdirectory just entered, so dist/_nuxt/a.js would index as `a.js`
    // and collide with a same-named file at the dist root.
    else out.push(relative(root, full).split(sep).join("/"));
  }
  return out;
};

const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");

/**
 * @param {string} dir
 * @param {"browser"|"worker"|"all"} scope
 * @returns {Map<string, {path: string, reason: string|null, digest: string, bytes: Buffer}>}
 */
const index = (dir, scope) => {
  const map = new Map();
  for (const path of walk(dir)) {
    if (!inScope(path, scope)) continue;
    const reason = exclusionReason(path);
    const bytes = normalise(path, readFileSync(join(dir, path)));
    map.set(path, { path, reason, digest: sha256(bytes), bytes });
  }
  return map;
};

const [, , aArg, bArg, ...rest] = process.argv;

if (!aArg || !bArg) {
  console.error(
    "usage: node scripts/artifact-compare.mjs <dist-a> <dist-b> [--scope=browser|worker|all] [--dump]",
  );
  process.exit(2);
}

const dirA = resolve(aArg);
const dirB = resolve(bArg);
const dump = rest.includes("--dump");

let scope;
try {
  scope = parseScope(rest);
} catch (err) {
  console.error(`[artifact-compare] ${err.message}`);
  process.exit(2);
}

let a;
let b;
try {
  a = index(dirA, scope);
  b = index(dirB, scope);
} catch (err) {
  console.error(`[artifact-compare] could not read a build directory: ${err.message}`);
  process.exit(2);
}

const onlyIn = (from, other, label) =>
  [...from.keys()].filter((p) => !other.has(p)).sort().map((p) => `${label}: ${p}`);

// Only files the digest actually covers can be the reason the digest moved.
// scripts/artifact-hash.mjs skips every file exclusionReason() names, so
// reporting those as differences here would send the next person chasing
// sourcemap noise that the gate never looked at. Anything excluded is reported
// separately and labelled as not-a-cause.
const covered = (p) => a.get(p).reason === null && b.get(p).reason === null;

const differing = [...a.keys()].filter((p) => b.has(p) && covered(p) && a.get(p).digest !== b.get(p).digest).sort();

const excludedButDiffering = [...a.keys()]
  .filter((p) => b.has(p) && !covered(p) && a.get(p).digest !== b.get(p).digest)
  .sort();

const lines = [
  ...onlyIn(a, b, `only in ${aArg}`),
  ...onlyIn(b, a, `only in ${bArg}`),
  ...differing.map((p) => `differs: ${p}`),
];

if (lines.length === 0 && excludedButDiffering.length > 0) {
  console.log(
    `[artifact-compare] ${aArg} and ${bArg} agree on all ${a.size} hashed files (scope: ${scope}).\n` +
      "These files differ but are excluded from the digest, so it would not move:",
  );
  for (const p of excludedButDiffering) console.log(`  ${p} — ${a.get(p).reason}`);
  process.exit(0);
}

if (lines.length === 0) {
  console.log(`[artifact-compare] ${aArg} and ${bArg} agree on all ${a.size} hashed files (scope: ${scope}).`);
  process.exit(0);
}

console.log(`[artifact-compare] ${lines.length} difference(s) the ${scope} digest would catch:`);
for (const line of lines) console.log(`  ${line}`);

if (differing.length > 0) {
  console.log("\nnormalised sha256 per differing file:");
  for (const p of differing) {
    console.log(`  ${p}`);
    console.log(`    ${aArg}: ${a.get(p).digest}`);
    console.log(`    ${bArg}: ${b.get(p).digest}`);
  }
}

if (excludedButDiffering.length > 0) {
  console.log(
    `\n${excludedButDiffering.length} file(s) also differ, but scripts/artifact-normalise.mjs\n` +
      "excludes them, so they are NOT a cause of the digest moving:",
  );
  for (const p of excludedButDiffering) console.log(`  ${p} — ${a.get(p).reason}`);
}

if (dump) {
  const outRoot = join(dirname(fileURLToPath(import.meta.url)), "..", ".artifact-compare");
  for (const p of differing) {
    for (const [side, map] of [["a", a], ["b", b]]) {
      const target = join(outRoot, side, p);
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, map.get(p).bytes);
    }
  }
  console.log(`\nnormalised bytes written to ${outRoot}/{a,b}/`);
}

process.exit(1);
