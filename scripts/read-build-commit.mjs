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
