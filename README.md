# Stitch and Ash

STITCH & ASH makes quiet, heavy black essentials carrying tactile threadwork instead of prints, plastic transfers, or foam. 

## Shopify Commerce

The Astro site provides the storefront preview shell, while **Shopify** operates as the source of truth for:
- Order tracking
- Inventory management
- Purchase & banking features
- Customer data

Checkout and operational tooling will rely entirely on Shopify rather than custom implementations within this repository.

Set `PUBLIC_SHOPIFY_STORE_DOMAIN` at deploy time (see `.env.example`) to route product CTAs to Shopify product pages. If it is unset, the preview remains in waitlist/reservation mode and does not collect payment.

## Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Preview your build locally, before deploying     |
| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check` |

| `npm run astro -- --help` | Get help using the Astro CLI                     |

## 👀 Want to learn more?

Feel free to check [our documentation](https://docs.astro.build) or jump into our [Discord server](https://astro.build/chat).
