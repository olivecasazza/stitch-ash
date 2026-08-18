// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
    modules: [
        '@nuxtjs/shopify',
        '@nuxtjs/critters',
        '@nuxtjs/i18n',
        '@nuxt/image',
        '@nuxt/ui',
    ],

    // Restrict shopify GraphQL validation to .vue files only — catalog
    // scripts in src/catalog/ use the Admin API (different schema) and
    // must not be validated against the Storefront API.
    shopify: {
        clients: {
            storefront: {
                documents: ['**/*.vue'],
            },
        },
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
                    documents: [
                        '**/*.{gql,graphql,ts,js,vue}',
                        '!**/admin*/**',
                        '!**/admin.{gql,graphql,ts,js,vue}',
                        '!**/admin/**/*.{gql,graphql,ts,js,vue}',
                        '!**/admin/*.{gql,graphql,ts,js,vue}',
                        '!**/(admin)/**/*.{gql,graphql,ts,js,vue}',
                        '!**/(admin)/*.{gql,graphql,ts,js,vue}',
                        '!**/customer-account*/**',
                        '!**/customer-account.{gql,graphql,ts,js,vue}',
                        '!**/customer-account/**/*.{gql,graphql,ts,js,vue}',
                        '!**/customer-account/*.{gql,graphql,ts,js,vue}',
                        '!**/(customer-account)/**/*.{gql,graphql,ts,js,vue}',
                        '!**/(customer-account)/*.{gql,graphql,ts,js,vue}',
                        '!**/customer*/**',
                        '!**/customer.{gql,graphql,ts,js,vue}',
                        '!**/customer/**/*.{gql,graphql,ts,js,vue}',
                        '!**/customer/*.{gql,graphql,ts,js,vue}',
                        '!**/(customer)/**/*.{gql,graphql,ts,js,vue}',
                        '!**/(customer)/*.{gql,graphql,ts,js,vue}',
                        '!**/account*/**',
                        '!**/account.{gql,graphql,ts,js,vue}',
                        '!**/account/**/*.{gql,graphql,ts,js,vue}',
                        '!**/account/*.{gql,graphql,ts,js,vue}',
                        '!**/(account)/**/*.{gql,graphql,ts,js,vue}',
                        '!**/(account)/*.{gql,graphql,ts,js,vue}',
                        '!**/src/catalog/**',
                        '!**/src/catalog/*.{gql,graphql,ts,js,vue}',
                        '!**/src/admin*/**',
                        '!**/src/admin/*.{gql,graphql,ts,js,vue}',
                    ],
                },
            },
        },
    },

    routeRules: {
        '/': { prerender: true },
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
