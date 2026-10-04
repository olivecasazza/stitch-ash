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

/** Seconds since the epoch, which is the only shape git's %ct emits. */
const EPOCH_SECONDS_RE = /^\d{1,15}$/;

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
 * `%ct` (epoch seconds) rather than `%cI` (ISO string), and the reason is not
 * cosmetic. `%cI` renders the instant in the *build machine's* timezone: on the
 * GitHub runner (git 2.55.0, TZ -07:00) the same commit that reads
 * `2026-10-04T13:43:00Z` on a UTC box came back as `2026-10-04T07:06:58-07:00`.
 * That is the same defect this whole module exists to remove — a value that is a
 * function of the machine instead of the commit — reintroduced one layer down,
 * and it would have made two builds of one commit differ across runner images
 * while every local build agreed. `%ct` is a bare integer with no timezone in it
 * at all, so it is the same number on every git version and every host.
 *
 * @param {string} rootDir repo root to run git in
 * @returns {string|null} a canonical UTC ISO-8601 instant (`...Z`)
 */
export const readBuildCommitDate = (rootDir) => {
    try {
        const seconds = execFileSync("git", ["show", "-s", "--format=%ct", "HEAD"], {
            cwd: rootDir,
            encoding: "utf8",
            stdio: ["ignore", "pipe", "ignore"],
        }).trim();
        if (!EPOCH_SECONDS_RE.test(seconds)) return null;
        // toISOString() is always UTC with a `Z`, by definition — never the host's
        // offset — so the string is a function of the commit alone.
        return new Date(Number(seconds) * 1000).toISOString();
    } catch {
        return null;
    }
};

