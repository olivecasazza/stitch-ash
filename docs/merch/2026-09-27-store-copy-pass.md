# 2026-09-27 — Store copy pass (PR description for storefront-lead)

Status: Draft proposal, ready for storefront-lead to ship (STI-328).
Author: merch-lead. Nothing here is merged or live. Do not ship before the
apex is ungated ([STI-327](/STI/issues/STI-327)).

## How this audit was done

Read every customer-visible string from **rendered live HTML** fetched from
`https://preview.stitch-ash.com` on 2026-09-27 (home, `/products`, `/contact`,
and all three PDPs), then cross-checked each against source
(`app/pages/`, `app/components/`, `app/data/products.ts`, `i18n/locales/en.json`)
at `main@c097f63`.

Surfaces covered: home, shop, PDP ×3, contact, header, footer, error states,
cart, and social preview metadata.

## Summary of findings

| # | Finding | Severity | Customer-visible today? |
| --- | --- | --- | --- |
| 1 | `og:image` / `twitter:image` is the **Nuxt Shopify demo logo** on every page | High | Yes — every link share |
| 2 | `PHOTOGRAPH PENDING` placeholder on all 3 product cards + PDPs | High | Yes |
| 3 | Hoodie lead time contradicts itself: Shopify **2–3 weeks** vs catalog **3–5 weeks** | High | Yes — contradiction **fixed 2026-10-02 (STI-609)**; the surviving `2–3 weeks` is still **unsourced** (§3b) |
| 4 | Latent demo-store strings in `i18n/locales/en.json` | Medium | Not currently — see note |
| 5 | Contact email is Cloudflare-obfuscated; mailto rewritten | Medium | Yes, degraded |
| 6 | `Collection not found` / no collections exist; `/collections` is 404 | Low | Partially |

**Note on #4 — do not over-fix this.** `home.title` ("Nuxt Shopify Demo Store"),
`home.description`, and `seo.description` ("Welcome to our demo store!") are
**not rendered on any live customer page** — verified by grepping the fetched
HTML. `home.*` is shadowed by `useSeoMeta` in `app/pages/index.vue`, and
`seo.description` is only a `$t` *fallback* for collection/blog pages that
don't exist yet. Every live page returns correct meta. Rewriting them is
housekeeping, not a customer-facing fix, and should be scoped as such so it
doesn't crowd the real fixes.

---

## 1. Social preview images are the Nuxt demo logo — HIGH

Every page serves a third-party demo brand's logo as its share image:

```
$ grep -o -E '<meta (property|name)="og:image" content="[^"]*"' home.html
<meta property="og:image" content="https://shopify.nuxtjs.org/logo-readme.jpg"
<meta name="twitter:image" content="https://shopify.nuxtjs.org/logo-readme.jpg"
<meta name="twitter:image:src" content="https://shopify.nuxtjs.org/logo-readme.jpg"
```

Source: `app/app.vue:20,23,24`. Same on `/products`, `/contact`, and all PDPs.

**Why this blocks GTM specifically:** every organic post in the social plan
points at a storefront URL. Every one of those links will unfurl to a stranger's
demo logo. This is the single highest-priority fix in this document — it is the
difference between a post that looks like a brand and a post that looks like a
template.

**Fix:** generate one 1200×600 brand card (JetBrains Mono wordmark, `--bone` on
`--ink-black`, per `DESIGN.md`), host it on the Shopify CDN, replace the three
tag values. Leave width/height as-is so the existing `summary_large_image`
card keeps working. Then add per-page `og:image` from the product's Shopify
image on PDP once photography exists.

## 2. `PHOTOGRAPH PENDING` is customer-visible on every product — HIGH

```
$ grep -c "PHOTOGRAPH PENDING" home.html page-products.html pdp-sku-001.html
home.html:1  page-products.html:1  pdp-sku-001.html:1
```

Source: `app/components/ProductCard.vue:49` and
`app/pages/product/[handle].vue:147`, inside the image-fallback SVG.

The fallback plate itself is a good design decision — a branded mark on a
hairline plate beats a broken image. The problem is the **caption**. It tells a
prospective customer, in the largest type on the card, that the product has not
been photographed yet, and it does so next to a $185 price.

**Fix (shipping now, photography pending):** change the caption to something
that reads as intent rather than as a TODO. Recommended: `MADE TO ORDER —
NO TWO ALIKE` for the hoodie (true: made-to-order is a real differentiator) and
`STITCHED, NOT PRINTED` for the sticker. Keep the plate art. When design-lead's
photography lands, the fallback stops rendering at all and this becomes moot —
so the copy change is a stopgap that costs one string per component, not a
design change.

## 3. Hoodie lead time contradicts itself on the PDP — HIGH

> **STATUS 2026-10-02 (STI-609): the contradiction is FIXED; the underlying
> provenance problem is NOT.** Re-measured at `origin/main` `5b624cd4`:
> - `catalog/products/sku-001.yaml:16` = **"Made to order. Allow 2–3 weeks for production."** (was `3–5 weeks`)
> - `app/data/products.ts` `HOODIE_DETAILS.Shipping & Returns` = **"Made to order. Ships tracked. Returns accepted within 14 days of delivery if unworn and unaltered."** — the lead time is **gone from the fallback**, not changed to match.
> - Live `GET /product/sku-001` → HTTP 200, `2–3 weeks` ×3, `3–5 weeks` ×0. (Use an en-dash-aware grep; ASCII `2-3` matches nothing.)
>
> So the two-sources-disagree defect below is closed. **What remains open is that
> `2–3 weeks` itself has no supplier quote behind it** — see the note at the end
> of this section. Do not read the fix as validation of the number.

The hoodie PDP renders **"Allow 2–3 weeks for production"** (from Shopify,
system of record per
[ADR 2026-07-21](2026-07-21-shopify-as-system-of-record.md)), but the repo
catalog `HOODIE_DETAILS.Shipping & Returns` says **"allow 3–5 weeks"**
(`app/data/products.ts`). The lanyard and sticker agree with Shopify
(2–4 and 1–3 respectively), so the hoodie is the sole inconsistency.

Shopify renders, so the catalog copy is the one that is currently hidden — but
it is the fallback used "when Shopify Storefront API has no matching product"
(per the file's own header comment), so during any Storefront-API wobble a
customer is told a different lead time than the one they were quoted. For a
made-to-order product, lead time is a purchase-blocking fact, not a detail.

> **Measured 2026-10-02 — the "hidden fallback" assumption above is wrong, and
> that is worth knowing.** `app/pages/product/[handle].vue` imports `PRODUCTS`
> from `~/data/products` and `resolvePdpResolution()`
> (`app/utils/pdp-product.ts`) returns `"live"` when Shopify answers. On the live
> PDP today, Shopify supplies the **description** while the **accordion bodies
> still come from the static array** — fallback-only strings such as
> `"Fuzzy interior, smooth exterior"` and `"Size up if you want a more relaxed
> drop-shoulder"` are present in the live HTML. So the static file is not inert:
> it is live-wired enrichment, and deleting a string from it removes copy from
> the production page. Treat `app/data/products.ts` as customer-facing.

### 3b. The remaining defect: `2–3 weeks` is unsourced (STI-609, OPEN — operator)

Removing the `3–5 weeks` string removed the *contradiction* without anyone
confirming the *surviving value*. `2–3 weeks` is a production commitment on a
**$185** flagship, and it currently has no provenance:

```
$ git grep -n -F "2–3 weeks" origin/main -- catalog/ app/
origin/main:catalog/products/sku-001.yaml:41    <-- the only customer-facing source
origin/main:app/data/products.ts:81             <-- the PDP fallback restates it
```

> **CORRECTED 2026-10-04 (STI-609 audit): the command above used to be
> `git grep -n -P "2.3 weeks"`, and it returned NOTHING.** Do not re-run that
> form — it is a false green, and it is the reason this defect survived an
> audit. Under a non-UTF-8 locale (this container runs `LC_CTYPE=POSIX`; `LANG`
> is unset) `grep -P`'s `.` is **byte-wise**, and the en dash in `2–3 weeks` is
> three bytes (`E2 80 93`). `.` cannot span three bytes, so the pattern matches
> nothing while the string is plainly present:
>
> ```
> $ git grep -c -P "2.3 weeks" origin/main -- catalog/products/sku-001.yaml   # POSIX
> (no output — 0 matches)
> $ LC_ALL=C.UTF-8 git grep -c -P "2.3 weeks" origin/main -- catalog/products/sku-001.yaml
> origin/main:catalog/products/sku-001.yaml:1
> ```
>
> **Use `-F` with the literal character.** `-F` is locale-independent and is
> verified to match under both locales. Two further traps in this repo's copy:
> the range dash is U+2013, so an ASCII-only grep for `2-3 weeks` also matches
> nothing; and the storefront's customer-facing copy lives in `catalog/` and
> `app/`, not `src/` (`src/` is the `catalog:test` suite) — so a pathspec naming
> only `src/` silently narrows a search you think is repo-wide, and git grep
> reports no error for a pathspec that matches nothing. Guarded by
> `scripts/ci/audit-locale-gate.sh`.

The live PDP shows it **three times** from that one source: `<meta
name="description">` (via `useSeoMeta` at `app/pages/product/[handle].vue:155`),
the visible description paragraph, and the Nuxt payload blob. It is authored
**once** and fanned out three ways — so this cannot be de-duplicated by editing
copy. Any "show it once" fix is a template change owned by storefront-lead, and
only makes sense once a real figure exists.

**Owner split:** the *number* needs a supplier quote → operator (tracked on
[STI-609](/STI/issues/STI-609), with landed cost on STI-418). The *doc* claims
that assert the number as verified are mine → fixed in
[2026-09-27-social-plan.md](2026-09-27-social-plan.md). Neither half is closed by
CI going green, and no lead time may be deleted without a replacement —
"Made to order" with no timeframe is a worse promise than a loose one.

**Fix:** `app/data/products.ts` is the wrong place to restate a commercial fact
Shopify owns. Recommend deleting the lead-time sentence from all three
`Shipping & Returns` bodies and letting the accordion defer to the Shopify
value, keeping only the returns policy (which Shopify does not hold). Short of
that, at minimum change the hoodie string to `2–3 weeks` to match.

> **This fix was executed** (verified at `origin/main` `5b624cd4`, 2026-10-02):
> all three `Shipping & Returns` bodies now carry returns/shipping wording only,
> and the hoodie lead time lives solely in `catalog/products/sku-001.yaml:16`.
> Do not re-file finding #3 as "catalog and Shopify disagree" — that is closed.
> See §3b for what is still open (provenance of the number itself).

**Do not "fix" this by editing Shopify copy** — Shopify is the system of
record and changing merchandising copy there is a commerce/operator action, not
a merch-copy action. Flagging for storefront-lead/operator.

## 4. Demo-store strings in `i18n/locales/en.json` — MEDIUM (latent)

`"home.title": "Nuxt Shopify Demo Store"`, `"home.description": "This is a demo
store built with Nuxt 4 and the Shopify Storefront API..."`,
`"seo.description": "Welcome to our demo store!..."`, and
`"footer.message": "Published under the MIT License."` / `"footer.github":
"View on GitHub"`.

None of these render on live customer pages today (verified). They are
boilerplate inherited from the starter template and they are **landmines**: the
first time a collection or blog page is created without a real description, it
will render "Welcome to our demo store!" to a customer.

**Fix:** delete the unused `home.*`, `seo.*`, `footer.message`, `footer.github`,
`footer.country`, and `account.*` keys, or replace them with brand copy. Cheapest
correct move is deletion — the referenced-key list is
`cart.*`, `search.*`, `error.*`, `collection.products.*`, `filters.*`,
`pagination.*`, `price.*`, `product.add|choose|view`, and `seo.description`
only. Note `de.json` needs the same treatment or the two locales drift.

## 5. Contact email is obfuscated and the `mailto:` is rewritten — MEDIUM

```
$ python3 -c "decode data-cfemail"   # from live /contact
630b060f0f0c2310170a17000b4e020d074e02100b4d000c0e  ->  hello@stitch-and-ash.com
```

Source intends `<a href="mailto:hello@stitch-and-ash.com">`
(`app/pages/contact.vue:149`). Cloudflare Email Address Obfuscation rewrote the
`href` to `/cdn-cgi/l/email-protection#...` and wrapped the text in
`<span class="__cf_email__">`, injecting `/cdn-cgi/scripts/.../email-decode.min.js`.

It works with JS, so this is **degraded, not broken** — but the rendered text
before JS executes is literally `[email protected]`, and the page claims "We
read every message by hand" while hiding the one channel a customer might
prefer. Non-JS / crawler / screenshot contexts show the bracket text.

**Fix (frontmatter, cheapest):** add an `email-decode` exclusion in
Cloudflare Pages settings for `/contact`, or set the address in a way the
obfuscator skips. Alternative: keep the address as visible text and drop the
`mailto:` expectation. Needs an operator/infra decision — flagging, not doing.

**Related flag, `UNVERIFIED — do not act on this without an MX check.** The
address is `hello@stitch-and-ash.com`, on the **`stitch-and-ash`** spelling,
while the deployed apex is **`stitch-ash.com`**. Verified in this run with
`getent hosts` and `curl`:

```
$ getent hosts www.stitch-ash.com
2620:127:f00f:e:: shops.myshopify.com www.stitch-ash.com
$ getent hosts stitch-and-ash.com          # no output — no A record
$ curl -sSL https://www.stitch-and-ash.com
curl: (6) Could not resolve host: www.stitch-and-ash.com
```

Mail delivery depends on **MX** records, not A records, and this workspace has
no `dig`/`host` available — so I **cannot** say the mailbox is broken and this
is **not** a finding. It is a spelling divergence between the brand's email
domain and its web domain, and someone with DNS visibility should confirm which
one is intended before any social or launch copy is written around either
address. Raised to the operator, not to storefront-lead, because it is a mail
routing / domain question.

## 6. No collections; nav has no collection link — LOW

`/collections` → 404, `/collection/all` → 404. The storefront has exactly one
flat capsule. The nav's "Story" link is `/#statement`, an in-page anchor on
home — **not** broken (I probed `/story` directly, which 404s, but no link
points there). The `i18n` `collection.featured` / `collection.unisex` /
`collection.all` keys reference collections that do not exist.

**Fix:** none required. When a second capsule ships, add the collection route
and only then populate those keys. Noting it so nobody reports it as a
regression later.

---

## Proposed change set for storefront-lead

Ordered by GTM impact:

1. `app/app.vue` — brand `og:image` (unblocks all social link previews). **Do first.**
2. `app/components/ProductCard.vue:49` + `app/pages/product/[handle].vue:147` — replace the `PHOTOGRAPH PENDING` caption.
3. `app/data/products.ts` — resolve the hoodie 2–3 / 3–5 week contradiction (defer to Shopify).
4. `i18n/locales/en.json` + `de.json` — delete unused demo-boilerplate keys.
5. Cloudflare email obfuscation exclusion for `/contact` (operator/infra).

Items 1–4 are copy/config and carry no design risk. Item 3's correct form
deletes duplicated commercial copy rather than adding any. Item 5 is operator
work.

**Explicitly out of scope for this pass:** photography (design-lead), pricing
changes (blocked on a supplier quote, see the margin model), the bundle
mechanism, and anything that would put promotional copy on a site that cannot
yet take an order.

## Verification requirement for whoever ships this

Do not report this pass complete on a green CI run. Per the storefront's own
honesty rules, verify with a fresh fetch of the live site after the deploy
concludes:

```
curl -sSL https://preview.stitch-ash.com | grep -c "shopify.nuxtjs.org"   # expect 0
curl -sSL https://preview.stitch-ash.com | grep -c "PHOTOGRAPH PENDING"  # expect 0
```

## Related

- [STI-328](/STI/issues/STI-328) — GTM readiness package
- `docs/decisions/2026-09-27-positioning.md` — the voice this copy is written in
- `docs/merch/2026-09-27-social-plan.md` — why finding #1 is the priority
