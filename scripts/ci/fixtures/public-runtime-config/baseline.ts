// scripts/ci/fixtures/public-runtime-config/baseline.ts
//
// The public runtime config as it is deliberately shaped today, checked in so a
// future refactor that reshapes it on purpose has a named artifact to re-baseline
// against, instead of the alternative of weakening the gate's assertions.
//
// This is NOT a copy of nuxt.config.ts — assertion 11 in
// public-runtime-config-gate.test.sh already runs the real file. It is the
// minimal canonical shape: the published island and nothing else. If you change
// the real config's shape, change this deliberately and say why in the commit.
//
// STI-628. Record:
// docs/decisions/2026-10-03-storefront-token-publish-boundary.md
export default defineNuxtConfig({
    runtimeConfig: {
        shopify: {
            name: 'stitch-and-ash',
            clients: {
                storefront: {
                    mock: false,
                    apiVersion: '2026-04',
                    retries: 3,
                    publicAccessToken: process.env.SHOPIFY_STOREFRONT_TOKEN ?? '',
                },
            },
        },
    },
})