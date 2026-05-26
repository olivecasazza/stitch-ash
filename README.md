# STITCH AND ASH Web

Preview site for STITCH AND ASH — goth/metal embroidered apparel.

Hosted via Cloudflare Pages:

- Production: [stitch-ash.com](https://stitch-ash.com)
- Staging/preview: [preview.stitch-ash.com](https://preview.stitch-ash.com)

The underlying Pages project is `stitch-ash-web`; do not deploy the production build to the similarly named stale project `stitch-and-ash-web`.

## Stack

- [Astro 5](https://astro.build) — static site generator, TypeScript strict
- [Cloudflare Pages](https://pages.cloudflare.com) — hosting
- [Nix flake](https://nixos.org) — reproducible dev shell + CI build

## Development

```sh
nix develop
pnpm install
pnpm dev
```

## Shopify bot operations

This repo includes a bot-safe Shopify workflow: Git-owned catalog YAML, explicit plan/apply commands, redacted env diagnostics, and an in-repo Hermes skill.

```sh
pnpm shopify:doctor
pnpm catalog:validate
pnpm catalog:plan
```

See [docs/shopify-bot-bootstrap.md](docs/shopify-bot-bootstrap.md) and `.hermes/skills/shopify-bot-ops/SKILL.md`.

## Build

```sh
nix develop -c pnpm build
```

## Deploy

Pushes to `main` deploy to [preview.stitch-ash.com](https://preview.stitch-ash.com) via Cloudflare Pages.

PRs deploy automatically to `<branch>.stitch-ash-web.pages.dev` for review (Cloudflare Pages native preview deployments — requires "Automatic branch deployments" enabled in the Pages project settings).

Requires repo secrets:
- `CLOUDFLARE_API_TOKEN` — CF API token with Pages:Edit permission
- `CLOUDFLARE_ACCOUNT_ID` — CF account ID

## Contributing

All changes go through pull requests with conventional commit titles. See [CONTRIBUTING.md](CONTRIBUTING.md) for the full flow: semver labels, auto-merge rules, preview URL format, and branch protection setup.

## License

MIT
