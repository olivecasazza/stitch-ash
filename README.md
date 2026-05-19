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

## Build

```sh
nix develop -c pnpm build
```

## Deploy

Automatic via GitHub Actions on push to `main` or any `design/draft-*` branch.

Requires repo secrets:
- `CLOUDFLARE_API_TOKEN` — CF API token with Pages:Edit permission
- `CLOUDFLARE_ACCOUNT_ID` — CF account ID

## Design Branches

Three branches for the design competition:
- `design/draft-artist` — artist agent draft
- `design/draft-swe` — swe agent draft
- `design/draft-development` — development agent draft

Design agents should edit `src/pages/index.astro`, `src/pages/products/stitch.astro`, and `public/styles/global.css`.

## License

MIT
