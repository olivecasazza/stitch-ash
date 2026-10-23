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

### `catalog:plan` exit codes

`plan` is read-only, but it exits non-zero when it *measures* a customer-facing
problem, so a live outage is visible to `$?` and to CI rather than living only in
the prose at the bottom of the output.

| code | meaning | action |
|---|---|---|
| `0` | plan clean, no shipping measured broken | normal review |
| `2` | `CHECKOUT-BLOCKED` — a declared destination is quoted **no shipping option at all**, so checkout cannot complete there | operator decision on shipping scope; `catalog:apply` cannot fix it (it writes neither delivery profiles nor inventory) |
| `3` | `PROBE-INCONCLUSIVE` — the Storefront API rejected a probe address, so reachability is **unknown**, not good and not broken | fix the postal code in `PROBE_POSTAL_CODES`, or treat as unverified |

An inconclusive probe and a carrier-calculated rate deliberately do **not** raise
`2`: neither is evidence that a buyer is blocked, and a gate that cries wolf on
the live store's own international rule would fail every plan forever.

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

## Decisions

Architecture and business decisions live in [docs/decisions/README.md](docs/decisions/README.md). Internal reasoning belongs there, never on customer-facing pages.

## Contributing

All changes go through pull requests with conventional commit titles. See [CONTRIBUTING.md](CONTRIBUTING.md) for the full flow: semver labels, auto-merge rules, preview URL format, and branch protection setup.

## License

MIT
