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
                    mock: true,
                    apiVersion: '2026-04',
                },
            },
        },
    },

    routeRules: {
        '/': { prerender: true },
        // Legacy /products/<handle> alias -> canonical /product/<handle>.
        // /products/<handle> is a contract URL: it's still emitted by
        // functions/api/checkout.js:121 as the waitlist redirectBase, and
        // docs/test-purchase-handoff.md:6 documents it as the URL to
        // navigate to. External links (paid social, email, Shopify-mirror
        // sync, blog references) hit this path and previously 404'd.
        // STI-271 fix: 308 keeps the request method/body on the canonical PDP.
        '/products/:handle': { redirect: '/product/:handle', statusCode: 308 },
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
                weights: [300, 400, 500, 600, 700],
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
