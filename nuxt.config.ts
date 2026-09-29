import { readBuildCommit } from './scripts/read-build-commit.mjs';

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
    // STI-542: Nuxt defaults `buildId` to a fresh randomUUID() per build. It is
    // embedded in the app manifest (dist/_nuxt/builds/meta/<buildId>.json), in
    // latest.json and in the built worker chunks, so two builds of ONE commit
    // shipped different bytes for that reason alone — on top of the font layer.
    //
    // Deriving it from the commit makes the artifact a function of the
    // repository: the same commit always produces the same buildId, and the
    // buildId stops being a random token that has to be traced through build
    // logs to identify.
    //
    // The resolver is the SAME module scripts/write-build-id.mjs uses, so the
    // value baked into /__build.json and the value Nuxt embeds can never
    // disagree. When the commit cannot be resolved (a tarball build, a machine
    // with no git) the fallback is a fixed literal, not a random UUID: a build
    // that cannot name itself is already unverified, and making it differ on
    // every run would additionally make it unreproducible.
    buildId: readBuildCommit(process.cwd()).commit ?? 'unresolved',

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
                    // STI-319 / STI-428: mock MUST stay false. The storefront
                    // serves live Shopify data through the public Storefront
                    // token. Do NOT "restore" mock: true to match a document —
                    // that breaks the live data path and the working cart.
                    // See docs/decisions/2026-09-27-data-provenance-baseline.md.
                    mock: false,
                    apiVersion: '2026-04',
                    publicAccessToken: process.env.SHOPIFY_STOREFRONT_TOKEN ?? '',
                },
            },
        },
    },

    routeRules: {
        // TEMPORARY: prerender disabled — pre-existing 500 on Cloudflare Pages worker
        // /': { prerender: true },
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

    // STI-542: the brand face is deliberately NOT registered here.
    //
    // It used to be `provider: 'google'`, which made `pnpm build` download
    // JetBrains Mono from Google's CDN at BUILD TIME and cache it in
    // .nuxt/cache/fonts — a gitignored, machine-local directory. What shipped
    // therefore depended on what the network served and what happened to be
    // cached on that runner: two builds of 9c55c363 published different font
    // files, and neither could be attributed to a commit from outside.
    //
    // The faces are now declared by importing the pinned
    // @fontsource/jetbrains-mono stylesheets in app/assets/css/main.css, which
    // makes the emitted CSS a pure function of the repository.
    //
    // Do not re-add a family entry here with provider 'google' (that is the
    // non-determinism) or with provider 'local' over a glob (that reorders the
    // emitted @font-face blocks between builds, so the entry stylesheet hash
    // still moves for one commit).
    fonts: {
        families: [],
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
