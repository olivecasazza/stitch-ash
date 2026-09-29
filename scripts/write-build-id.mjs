/**
 * Write the build marker that ships inside the artifact.
 *
 * STI-542: until this existed, nothing the live site served identified which
 * commit was deployed. Every "verified live" claim rested on fetching a page
 * and inferring the build from asset filenames — which cannot distinguish "a
 * build of main is live" from "the build of main I reviewed is live". Two
 * builds of 9c55c363 shipped different font files and were indistinguishable
 * from outside.
 *
 * This runs as a `prebuild` step, so public/__build.json is part of the
 * deployed artifact itself. A marker injected at runtime could drift from what
 * was actually published; a file in the artifact cannot.
 *
 * The commit comes from the shared resolver, which reads GITHUB_SHA in CI and
 * falls back to `git rev-parse HEAD` locally. nuxt.config imports the SAME
 * function to derive Nuxt's `buildId`, so the marker and the artifact can never
 * name different commits.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { readBuildCommit } from "./read-build-commit.mjs";

const rootDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const outFile = join(rootDir, "public", "__build.json");

const { commit, source } = readBuildCommit(rootDir);

// A short is only a convenience for humans reading a log line; it is
// deliberately NOT the identity field, because 7 chars is not enough to
// attribute a claim to a commit.
const short = commit ? commit.slice(0, 7) : null;

const marker = {
    // Null is a real, honest value: it means "this build could not determine its
    // commit". Omitting the field would let a consumer assume it was never asked.
    commit,
    short,
    source,
    repo: "olivecasazza/stitch-ash",
    // Intentionally no timestamp. A build timestamp would make the artifact
    // differ between two builds of the same commit, which is the exact
    // non-determinism this work exists to remove (see the double-build gate in
    // .github/workflows/pr-checks.yml).
};

mkdirSync(dirname(outFile), { recursive: true });
writeFileSync(outFile, `${JSON.stringify(marker, null, 2)}\n`, "utf8");

// stderr, not stdout: several CI steps pipe `pnpm build` output around, and a
// log line must not be able to corrupt a machine-read stream.
console.error(
    `[build-marker] ${outFile} -> ${commit ?? `commit unknown (${source})`}`,
);
