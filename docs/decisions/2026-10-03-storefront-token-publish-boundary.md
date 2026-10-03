# Storefront public access token: publish boundary

Date: 2026-10-03
Issue: STI-628
Status: accepted — the published value is a Storefront **public** token, and the
boundary is now gated.

## The question

`https://preview.stitch-ash.com/` serves the storefront's public access token to
every anonymous visitor, inside the Nuxt public runtime config island:

```
window.__NUXT__.config.public._shopify.clients.storefront.publicAccessToken
```

qa-verifier filed this as a publish-boundary question rather than a leak, and
that framing is right. The question this record answers is the one that was
actually open: **is publishing this value intended, and what stops the island
from widening silently?**

## Where the value comes from

One line, and it was already correct when the ticket was filed:

```ts
// nuxt.config.ts
publicAccessToken: process.env.SHOPIFY_STOREFRONT_TOKEN ?? '',
```

Read from the environment, never hardcoded, with a `?? ''` fallback so a missing
secret cannot break the build. `SHOPIFY_*` values live in nixlab IaC and are
operator-owned; no value was read, printed or rotated while resolving this
(HARD RULE 5).

## Why publishing it is intended

A Shopify **Storefront** access token is a *public* credential by design. It is
the anonymous read token the storefront client uses in every shopper's browser;
Shopify's own storefront clients ship it to the client. It cannot be kept
server-side and still serve a client-rendered catalog, so inlining it is not a
mistake to be fixed — it is how a Storefront API integration works.

That is a claim about Shopify's token *model*, so it was verified rather than
assumed. The published value was used as an **Admin API** token against the shop
domain:

```
POST https://stitch-and-ash.myshopify.com/admin/api/2026-04/graphql.json
X-Shopify-Admin-Token: <the published value>
{"query":"{ shop { name } }"}

-> HTTP 401
   {"errors":"[API] Invalid API key or access token
              (unrecognized login or wrong password)"}
```

**401.** The published token cannot read the Admin API, so it cannot read orders,
customer records, or write anything. Its capability is Storefront-API catalog
read plus cart create — the anonymous surface a shopper's browser already holds
before any of this code existed.

So: **not a credential leak, not an incident, nothing to rotate.** The GM triage
asked for exactly this evidence before reclassifying, and it is what
`bea7ce6c…` (the 32-hex value in the served HTML, sitting beside `mock:false`) is.

Note this probe used the *public* token to test a *private* surface and was
refused. It did not require reading a private secret, which is why it was in
lane at all.

## What was actually missing, and is now fixed

> **Correction, 2026-10-03, later the same day.** An earlier revision of this
> record claimed that adding `admin: { accessToken: … }` to this config would
> publish a private credential to every anonymous visitor, and that the repo was
> one refactor away from a breach. **That was wrong, and it was asserted rather
> than verified.** `@nuxtjs/shopify` already strips those values; see "What the
> module already does" below. The claim is corrected here rather than quietly
> deleted, because a security record that overstates its own risk is worse than
> no record — it teaches the next reader to trust a mechanism that does not
> exist. The gate is still worth having, but for a narrower and correctly-stated
> reason.

Nothing held the *repo's own* property. The module holds part of it; the repo
asserted none of it. Two things were genuinely unguarded:

1. **The published surface outside the `shopify` subtree.** Nuxt publishes
   `runtimeConfig.public` **verbatim** — no filtering, no whitelist. The module's
   schema covers only `runtimeConfig.shopify`. So a value added to
   `runtimeConfig.public` is handed to every anonymous visitor exactly as
   written, and the first version of this gate passed a config containing
   `public: { databaseUrl: process.env.DATABASE_URL }`. That is a real hole, and
   it is the one the gate now closes.

2. **The env var behind the one deliberate publication.** The module whitelist
   says which *keys* may be published. It says nothing about which *value* fills
   `publicAccessToken`. Repointing it at `SHOPIFY_ADMIN_TOKEN` satisfies the
   schema perfectly and publishes an Admin token — the module will not stop
   that, and no HTML diff would notice, because the shape is unchanged.

`scripts/ci/public-runtime-config-gate.sh` checks those two things. It is static
and offline: it reads no environment variable, no secret, and needs no store.
It fails when

1. any key in the published `runtimeConfig` asserts a private capability
   (`admin`, `secret`, `private`, `apiKey`, `accessKey`, …), or is an
   unqualified `accessToken`/`refreshToken`/`token`;
2. any published value reads an env var other than `SHOPIFY_STOREFRONT_TOKEN`;
3. `publicAccessToken:` is missing, duplicated, hardcoded, or resolves to
   anything but that one env read.

It runs in `pr-checks.yml` with its self-test, alongside `storefront-mock-gate`.

### Why the check is trustworthy rather than decorative

A gate that cannot detect the violation is not a gate, so
`public-runtime-config-gate.test.sh` asserts ten violation shapes are **rejected**
— including the Admin-token-beside-storefront case and the same-key-different-env
swap that leaves the HTML shape unchanged — and five shapes are **accepted**,
including the real `nuxt.config.ts`. The acceptance direction matters as much as
the rejection one: an over-broad gate blocks every legitimate PR and gets deleted
rather than fixed.

One specific trap is asserted explicitly. The warning comment in
`nuxt.config.ts` literally names the forbidden shapes (`admin.accessToken`,
`*_SECRET`), so a naive `grep` matches the warning about the thing it forbids and
someone "fixes" it by deleting the warning. The gate masks comments and string
bodies before scanning, and the suite proves it.

## What the module already does

`@nuxtjs/shopify` publishes its config through a **Zod whitelist**, not by
copying whatever it was given. Every config passes
`publicConfigSchema.parse(config)` (`dist/module.mjs:164`), and the schema omits
the private keys by name (`dist/runtime/utils/config.js:212`):

```js
export const publicConfigSchema = configObjectSchema
  .omit({ clients: true, fragments: true, webhooks: true })
  .extend({
    clients: z.object({
      storefront: storefrontClientSchema.omit({
        privateAccessToken: true,   // <- stripped
        ...
      }),
      customerAccount: customerAccountClientSchema.omit({
        clientSecret: true,         // <- stripped
        ...
      }),
    }),
  })
```

Zod strips keys the schema does not declare, so `clients.admin` is dropped
entirely (the published `clients` object has only `storefront`). Measured, not
inferred, by feeding a config with private values at every layer through the
pinned module's own schema:

```
PUBLISHED  PUBLIC storefront token (expected present)
STRIPPED   PRIVATE storefront token
STRIPPED   ADMIN accessToken
STRIPPED   WEBHOOK secret
--- published keys under clients: [ 'storefront' ]
```

The deployed artifact agrees — none of the stripped names appear in the served
HTML. **The module is the first line of defence, and it is a real one.** The gate
exists for the two things it does not cover: the unfiltered `runtimeConfig.public`
surface, and which env var fills the one key the schema does allow.

## What this gate does NOT prove

Stated plainly so nobody over-reads it green:

- It does not prove the token is valid, or what it is scoped to. That is an
  operator-owned fact about a live credential (HARD RULE 5).
- It does not prove a private token cannot reach the browser by another route —
  a bundle, a hardcoded literal, a page fetch. It checks the one place this
  repo decides what is public.
- It does not prove the public token is not over-privileged. The Admin-API 401
  above was measured once, out of band. It is evidence in this record, not a
  recurring check.
- **It is not what stops `admin.accessToken` from being published** — the module
  whitelist is. If a future `@nuxtjs/shopify` release drops or loosens that
  schema, this gate would not notice, because it never claimed to be the control
  for that. The module is pinned in `pnpm-lock.yaml` (`0.5.4`) and `package.json`
  requests `latest`, so an unpinned upgrade is the way that protection would go
  away quietly. That is the real residual risk on this boundary, and it is not
  addressed here.

## Reproducing

```bash
./scripts/ci/public-runtime-config-gate.sh          # the gate
./scripts/ci/public-runtime-config-gate.test.sh     # the self-test
```
