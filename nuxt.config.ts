import { join } from 'node:path';
import type { Nitro } from 'nitropack';
import { readBuildCommit } from './scripts/read-build-commit.mjs';
import {
    ASSET_MANIFEST_ID,
    assetManifestPlugin,
    manifestRewriteStats,
    neutraliseAppManifestClock,
    resolveBuildMtime,
} from './scripts/deterministic-asset-manifest.mjs';

// One mtime for the whole build, resolved once. Every manifest entry agrees, and
// the plugin cannot see two different values for one build.
const buildMtime = resolveBuildMtime(process.cwd());

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

        // STI-625: two builds of ONE commit differed by ~54 byte-runs, all of them
        // inside the client asset manifest Nitro embeds in the bundle it minifies:
        // the per-asset `mtime` is a real filesystem mtime, and the `etag` of
        // `_nuxt/builds/*.json` is a content hash of a file carrying `Date.now()`.
        //
        // Those clock bytes were the TRIGGER for STI-573's identifier cascade, not
        // just noise the digest had to absorb: esbuild picks names from a
        // frequency table over its input, so a moving input can rename symbols
        // across the whole flat nitro.mjs scope. Removing the clock here, before
        // the minifier sees it, is what actually makes the artifact a function of
        // the commit.
        //
        // `rollupConfig.plugins` is merged AHEAD of nitro's own plugins (defu puts
        // the config's array first, and nitro then pushes its built-ins), so this
        // transform runs before esbuild's. It only matches the one virtual module
        // and refuses to guess if that module's shape ever changes.
        // The commit date, not the wall clock and not a hash of the content: see
        // the header of scripts/deterministic-asset-manifest.mjs for why a
        // non-monotonic value would hand clients a false 304 on changed bytes.
        rollupConfig: {
            plugins: [assetManifestPlugin(buildMtime.value)],
        },
    },

    hooks: {
        // STI-625, second clock: Nuxt writes `_nuxt/builds/latest.json` and
        // `_nuxt/builds/meta/<buildId>.json` with `Date.now()` inside
        // `rollup:before` (@nuxt/nitro-server), Nitro copies them into
        // `dist/_nuxt/builds/`, and their content-derived etag is what lands in
        // the manifest. Nothing reads that `timestamp` — the outdated-build check
        // compares `id`, not `timestamp` — so it is rewritten here to a constant.
        //
        // `nitro:build:public-assets` is the one hook guaranteed to run after
        // that copy and before rollup resolves the asset manifest, so this
        // rewrites the bytes the etag is computed from.
        'nitro:build:public-assets': (nitro: Nitro) => {
            // `serveStatic` is `boolean | 'node' | 'deno' | 'inline'` and is
            // always set, so this is a real check on the resolved config, not on
            // an optional field: when Nitro is told not to serve static assets it
            // never writes `dist/`, and the directory read below would throw.
            if (!nitro.options.serveStatic) return;
            const publicDir = nitro.options.output.publicDir;
            neutraliseAppManifestClock(publicDir, join(publicDir, '_nuxt', 'builds'));
        },

        // The plugin above is keyed on a Nitro-internal virtual module id. If a
        // Nitro upgrade renames it, the rewrite silently stops running and the
        // build clock goes straight back into the bundle — the exact regression
        // STI-625 exists to prevent, and the one the normaliser used to hide. So
        // the build FAILS when the rewrite did not run.
        //
        // This rides Nitro's OWN `compiled` hook, not Nuxt's `build:done`:
        // @nuxt/nitro-server registers its own `build:done` to run the whole Nitro
        // build, so a config-level `build:done` fires BEFORE Nitro has built
        // anything and would assert against a bundle that does not exist yet.
        // `compiled` fires once the rollup output has been written, which is
        // exactly the point where the question "did the rewrite run?" has an
        // answer.
        'nitro:init': (nitro: Nitro) => {
            nitro.hooks.hook('compiled', () => {
                if (nitro.options.dev) return;
                const { transforms, entries } = manifestRewriteStats();
                if (transforms === 0) {
                    throw new Error(
                        'STI-625: no client asset manifest was rewritten during this '
                        + `build. The rollup plugin matches "${ASSET_MANIFEST_ID}", which `
                        + 'Nitro appears to have renamed. Failing rather than shipping a '
                        + 'bundle that carries the build clock again.',
                    );
                }
                console.error(
                    `[deterministic-asset-manifest] build-verified: ${transforms} manifest `
                    + `transform(s), ${entries} asset entries, zero wall-clock mtime in bundle`,
                );
            });
        },
    },

    css: ['~/assets/css/main.css'],

    ui: {
        // No colour mode: the storefront is one fixed dark ground, so
        // @nuxt/ui must not emit a `.dark`/`.light` flip and must not ship
        // the light semantic ramp as the default for `:root`.
        //
        // That ramp is still emitted — `.light,:host,:root` in
        // @nuxt/ui 4.8 sets `--ui-bg:#fff`, `--ui-text:var(--ui-color-neutral-700)`
        // and `--ui-border:var(--ui-color-neutral-200)`, with the neutral
        // shades resolved from Tailwind `slate` (see `ui.colors` in
        // app/app.config.ts). Every one of those is re-pointed at the
        // DESIGN.md ramp in app/assets/css/tokens.css, in the block
        // commented "Vendor semantic bridge" — that file is already the home
        // of the `--ui-radius: 0` bridge, and an unlayered `:root` declaration
        // there beats `@layer theme` without `!important`. No duplicate
        // bridge belongs in this block.
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
            // STI-647: `de.json` has been authored and maintained here since
            // before the storefront shipped, and `src/catalog/not-found-copy.test.ts`
            // reads it off disk, so it read as supported copy. It was never in
            // this array, so the build never loaded it and no German URL could
            // resolve: the file passed review and CI while being unreachable.
            //
            // `code` is the URL prefix and the value of `locale.value` under
            // `prefix_except_default`, so German is served at `/de/...` and
            // stays unprefixed for the default locale. `language` is the ISO
            // tag for `<html lang>` and is NOT the code.
            //
            // `code` is deliberately `de` and not `de-de`: `useLocalization`
            // splits the code on `-` to derive the Shopify `@inContext` market,
            // and a bare `de` is the German market itself. See
            // `app/composables/localization.ts`.
            {
                code: 'de',
                language: 'de',
                file: 'de.json',
            },
        ],
    },

    image: {
        provider: 'shopify',
    },
})
