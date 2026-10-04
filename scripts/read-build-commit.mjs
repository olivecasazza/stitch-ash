/**
 * Resolve the commit a build is being made from.
 *
 * STI-542: this was duplicated between the build-marker script and nuxt.config
 * in the first cut of this work, which is exactly how the two drift apart and
 * the marker ends up naming a different commit than the artifact. One function,
 * one answer.
 *
 * GITHUB_SHA first because in CI it is the commit that was actually checked out
 * and built. `git rev-parse HEAD` is the local fallback, so a developer's local
 * build names the commit it was built from rather than nothing.
 *
 * `VCS_COMMIT` is accepted as an alias for platforms that set it instead of
 * GITHUB_SHA; it is not a Paperclip or Cloudflare convention, it is simply the
 * other common spelling of the same idea.
 */

import { execFileSync } from "node:child_process";

const SHA_RE = /^[0-9a-f]{40}$/;

/** An ISO-8601 instant, which is the only shape git's %cI emits. */
const ISO_INSTANT_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:[+-]\d{2}:\d{2}|Z)$/;

/**
 * @param {string} rootDir repo root to run git in
 * @returns {{commit: string|null, source: 'env'|'git'|'unknown'}}
 */
export const readBuildCommit = (rootDir) => {
    const fromEnv = (process.env.GITHUB_SHA || process.env.VCS_COMMIT || "").trim();
    if (SHA_RE.test(fromEnv)) return { commit: fromEnv, source: "env" };

    try {
        const head = execFileSync("git", ["rev-parse", "HEAD"], {
            cwd: rootDir,
            encoding: "utf8",
            stdio: ["ignore", "pipe", "ignore"],
        }).trim();
        if (SHA_RE.test(head)) return { commit: head, source: "git" };
    } catch {
        // Not a git checkout (e.g. a tarball build). Fall through to unknown.
    }

    return { commit: null, source: "unknown" };
};

/**
 * STI-625: the COMMITTER date of the commit being built, as an ISO-8601 instant.
 *
 * Why the artifact wants this: Nitro's asset manifest records a per-asset `mtime`
 * read straight off the filesystem, so it carries the wall clock of the build.
 * That is what makes two builds of one commit differ (see
 * scripts/deterministic-asset-manifest.mjs).
 *
 * The replacement has to be a function of the COMMIT, and it also has to stay
 * monotonic across commits. The commit's own date satisfies both: it is a field
 * of the commit object, so the same commit always yields the same string, and
 * commits are authored in order, so a later deploy gets a later `Last-Modified`.
 *
 * That second property is not cosmetic. Nitro's static handler answers
 * `If-Modified-Since` with `new Date(ims) >= mtimeDate -> 304`, so an mtime that
 * is not monotonic can hand a client a "304 Not Modified" for an asset whose
 * bytes DID change, and that client then keeps the stale bytes indefinitely. A
 * hash-of-the-content mtime has exactly that defect, which is why this is the
 * commit date and not one.
 *
 * Returns null when git cannot answer — a tarball build, or a checkout with no
 * git. The caller then falls back to a fixed literal, and documents that it did.
 *
 * @param {string} rootDir repo root to run git in
 * @returns {string|null}
 */
export const readBuildCommitDate = (rootDir) => {
    try {
        const iso = execFileSync("git", ["show", "-s", "--format=%cI", "HEAD"], {
            cwd: rootDir,
            encoding: "utf8",
            stdio: ["ignore", "pipe", "ignore"],
        }).trim();
        return ISO_INSTANT_RE.test(iso) ? iso : null;
    } catch {
        return null;
    }
};

