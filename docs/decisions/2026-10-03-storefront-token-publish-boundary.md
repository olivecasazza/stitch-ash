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

Nothing held the property. "This one value is fine" was true of the config *at
that commit* and nothing stopped the next commit from publishing a different
one. The realistic accident is small and the blast radius is total:

- `@nuxtjs/shopify` reads `admin.accessToken`, `privateAccessToken` and
  `customers.clientSecret` in the **same** `runtimeConfig` family, one line away
  from where `publicAccessToken` sits.
- A one-line edit adding `admin: { accessToken: … }` publishes a private
  credential to every anonymous visitor.
- In the served HTML that looks **byte-identical** to today's page. A
  downstream HTML diff, a size check, or a smoke test would not notice.

`scripts/ci/public-runtime-config-gate.sh` is that missing check. It is static
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

## Reproducing

```bash
./scripts/ci/public-runtime-config-gate.sh          # the gate
./scripts/ci/public-runtime-config-gate.test.sh     # the self-test
```