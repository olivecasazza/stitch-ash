/**
 * Hash the built artifact so two builds of one commit can be compared.
 *
 * STI-542: two builds of 9c55c363 published different font files, so "CI is
 * green" could not mean "the artifact is the one I reviewed". This prints a
 * single stable digest over the deployable output so CI can build twice and
 * fail when the digests differ.
 *
 * The digest covers every file's PATH and CONTENT, sorted by path, so a rename
 * counts as a change. Paths are normalised to forward slashes so the digest
 * does not depend on the platform's separator.
 *
 * Contents go through scripts/artifact-normalise.mjs first, which removes build
 * CLOCK and ORDER noise — the `date` in nitro.json, the `timestamp` in Nuxt's
 * build manifest, the `mtime` of every entry in Nitro's asset manifest, and the
 * two object literals whose key order Vite does not fix. It does not remove
 * content. That split matters: without it this digest changes on every build
 * and the gate is worthless; with a normaliser that was too eager, the gate
 * would pass on two genuinely different artifacts. The normaliser's own
 * comments name every rule and why it is safe.
 *
 * Usage:
 *   node scripts/artifact-hash.mjs            # print the digest
 *   node scripts/artifact-hash.mjs --json     # print {commit, digest, ...}
 *
 * Exit codes: 0 on success, 1 if dist/ is missing, empty or unreadable.
 */

import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { exclusionReason, normalise } from "./artifact-normalise.mjs";
import { readBuildCommit } from "./read-build-commit.mjs";

const rootDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const distDir = join(rootDir, "dist");

/** @returns {string[]} every file path under `dist/`, relative and slash-normalised */
const walk = (dir) => {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    // statSync follows symlinks; a build output with a symlink loop would
    // otherwise recurse forever. A broken link should fail the hash loudly
    // rather than be silently skipped, so there is no try/catch here.
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else out.push(relative(distDir, full).split(sep).join("/"));
  }
  return out;
};

let files;
try {
  files = walk(distDir).sort();
} catch (err) {
  console.error(
    `[artifact-hash] could not read ${distDir}: ${err.message}\n` +
      "  Run `pnpm build` first.",
  );
  process.exit(1);
}

if (files.length === 0) {
  console.error(`[artifact-hash] ${distDir} is empty — the build produced nothing.`);
  process.exit(1);
}

const hash = createHash("sha256");
// NUL-terminate the path before the bytes so a file rename cannot collide with
// a content change.
const excluded = new Map();
for (const file of files) {
  const reason = exclusionReason(file);
  if (reason) {
    excluded.set(file, reason);
    continue;
  }
  hash.update(`${file}\0`);
  hash.update(normalise(file, readFileSync(join(distDir, file))));
  hash.update("\0");
}
const digest = hash.digest("hex");

// Read the commit from the same resolver the build used, so the digest is
// always reported alongside the commit it belongs to. `public/__build.json` is
// NOT read here: it is itself part of dist/ and is written by prebuild, so
// preferring it would mean trusting a file that the hash is supposed to cover.
const { commit } = readBuildCommit(rootDir);

if (process.argv.includes("--json")) {
  console.log(
    JSON.stringify(
      {
        commit,
        digest,
        hashed: files.length - excluded.size,
        total: files.length,
        excluded: Object.fromEntries(excluded),
      },
      null,
      2,
    ),
  );
} else {
  console.log(
    `${digest}  ${files.length - excluded.size} hashed ` +
      `(${excluded.size} excluded)  ${commit ?? "commit unknown"}`,
  );
}
