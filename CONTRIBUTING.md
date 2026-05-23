# Contributing

## PR-driven flow

All changes go through pull requests. Pushing directly to `main` is blocked except for the Flux/GitOps deploy step (not applicable here — all PRs, always).

### Conventional commit prefixes

Every PR title must start with one of these prefixes. The CI bot reads the title, assigns a `semver:*` label, and decides whether to auto-merge.

| Prefix | Semver bump | Auto-merge? |
|--------|-------------|-------------|
| `feat!:` or `BREAKING CHANGE` in body | major | No — human review required |
| `feat:` | minor | Yes, when all checks pass |
| `fix:` | patch | Yes |
| `perf:` | patch | Yes |
| `refactor:` | patch | Yes |
| `revert:` | patch | Yes |
| `chore:` | patch | Yes |
| `docs:` | patch | Yes |
| `test:` | patch | Yes |
| `ci:` | patch | Yes |
| `build:` | patch | Yes |
| `style:` | patch | Yes |
| *(anything else)* | unknown | No — fix the title |

Scope is optional: `fix(checkout): correct cart total` is valid.

### Auto-merge rules

- Auto-merge (squash) is enabled automatically for `semver:patch` and `semver:minor` once all required checks pass.
- `semver:major` and `semver:unknown` require a human to merge manually.
- Add label `do-not-merge` to any PR to block auto-merge regardless of semver label.
- Draft PRs are never auto-merged — mark as ready for review when done.

### Preview URLs

Cloudflare Pages auto-deploys every non-main branch to:

```
https://<sanitised-branch-name>.stitch-ash-web.pages.dev
```

CF Pages sanitises branch names (slashes → hyphens, lowercased). For example:
- `fix/cart-total` → `fix-cart-total.stitch-ash-web.pages.dev`
- `feat/new-hero` → `feat-new-hero.stitch-ash-web.pages.dev`

**Prerequisite**: the Cloudflare Pages project (`stitch-ash-web`) must have GitHub integration with "Automatic branch deployments" enabled. If this isn't set up, `preview-gate` will time out after 5 minutes.

### If your PR is blocked, check

1. **Missing semver label** — does your title start with a recognised prefix? If `semver:unknown` is applied, look for the bot comment explaining what to fix.
2. **Draft status** — convert to "Ready for review" to allow auto-merge.
3. **Failed preview** — `preview-gate` failed; check the CF Pages deployment logs.
4. **Failed typecheck or build** — `pr-checks` failed; run `pnpm typecheck && pnpm build` locally.
5. **`do-not-merge` label** — remove it if added by mistake.

### Required secrets

| Secret | Purpose |
|--------|---------|
| `CLOUDFLARE_API_TOKEN` | CF Pages deploy (Pages:Edit) |
| `CLOUDFLARE_ACCOUNT_ID` | CF Pages account |

### Branch protection

See [`.github/BRANCH_PROTECTION.md`](.github/BRANCH_PROTECTION.md) for the one-time setup commands (admin only).

Required status checks before merge:
- `typecheck-and-build` (from `pr-checks.yml`)
- `wait-and-check` (from `preview-gate.yml`)
- `label` (from `semver-label.yml`)

### Release flow

On push to `main`, `release-plz` reads the conventional commits since the last tag and opens a release PR (or pushes a tag) automatically. No manual versioning needed.
