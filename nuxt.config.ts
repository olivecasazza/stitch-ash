// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
    modules: [
        '@nuxtjs/shopify',
        '@nuxtjs/critters',
        '@nuxtjs/i18n',
        '@nuxt/image',
        '@nuxt/ui',
    ],

    // Deploy target is Cloudflare Pages (see wrangler.toml + .github/workflows/deploy.yml).
    // The preset makes `nuxt build` emit dist/ with a _worker.js, which the deploy
    // step uploads via `directory: dist`. Without it, the default node-server preset
    // writes .output/public and the deploy step's `dist` upload fails (was broken since
    // the Hydrogen->Nuxt switch on 2026-06-14).
    nitro: {
        preset: 'cloudflare_pages',
    },

    css: ['~/assets/css/main.css'],

    ui: {
        colorMode: false,
    },

    runtimeConfig: {
        shopify: {
            name: 'stitch-and-ash',

            clients: {
                storefront: {
                    mock: false,
                    apiVersion: '2026-04',
                },
            },
        },
    },

    routeRules: {
        '/': { prerender: true },
        // STI-271: legacy /products/<handle> -> canonical /product/<handle>
        // is handled by server/middleware/products-redirect.ts. Neither a
        // routeRule (Nitro does not substitute `:handle` into the Location
        // header) nor a Cloudflare _redirects file (the `cloudflare_pages`
        // Nitro preset puts a `_worker.js` at the deployment root, which
        // overrides the Pages edge-layer redirect processing) work for
        // this in our current setup. The middleware runs in the Nitro
        // worker and issues a 308 with the actual handle interpolated.
    },

    compatibilityDate: '2026-03-15',

    vite: {
        server: {
            allowedHosts: [
                '.vercel.app',
            ],
        },
    },

    fonts: {
        families: [
            {
                name: 'JetBrains Mono',
                provider: 'google',
                weights: [400, 500],
            },
        ],
    },

    i18n: {
        strategy: 'prefix_except_default',

        defaultLocale: 'en-us',

        locales: [
            {
                code: 'en-us',
                language: 'en',
                file: 'en.json',
            },
        ],
    },

    image: {
        provider: 'shopify',
    },
})
