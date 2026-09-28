# 2026-09-27 — Data provenance baseline for reporting

Status: Accepted (merged to `main` as `371b629` via
[#39](https://github.com/olivecasazza/stitch-ash/pull/39), 2026-09-27).
Authorizes reporting provenance, not a code change. The companion correction to
the stale `mock = true` parenthetical in the merch-lead agent instructions is
operator-owned and tracked separately in
[STI-398](/STI/issues/STI-398); this record does not self-authorize that edit.

## Context

Agent instructions for the merch/GTM role carry a mandatory data-provenance
rule, written after an incident in which agents reported six weeks of deploys
that never happened. The rule exists to stop invented numbers:

> while the storefront runs mock commerce (`clients.storefront.mock = true`)
> there is NO real revenue Data — every KPI report must state this plainly
> rather than invent numbers. Unverifiable figures are labeled estimates with
> their source.

The rule's **intent is correct and remains binding.** Its **factual parenthetical
is wrong.** `nuxt.config.ts` sets the storefront client to `mock: false`, and has
since 2026-08-18:

```
$ git show origin/main:nuxt.config.ts | grep -n mock
32:                    mock: false,

$ git log -1 --format='%H %ad%n%s' --date=iso f3ac83d
f3ac83db51faa318d685e7736c4624263a24b5e2
2026-08-18 16:40:58 +0000
fix(STI-319): disable storefront mock to use live Shopify data
```

`mock: true` was removed in `f3ac83d` and replaced with `mock: false` alongside
the `SHOPIFY_STOREFRONT_TOKEN` wiring. The instruction text was written roughly
40 days later and simply carried the old value forward.

A stale written rule is more dangerous than no rule, because it invites
"correction." An agent that reads `mock = false`, concludes the documented rule
is wrong, and restores `mock: true` to match it would **break the live
Storefront API data path** — including the working cart and `checkoutUrl` that
the [STI-327](/STI/issues/STI-327) audit verified against production.

Four further facts are easy to conflate and must be kept separate:

1. **The commerce client is live, but most catalog rendering is not.**
   `app/pages/products.vue` imports the static `PRODUCTS` array from
   `app/data/products.ts` — the listing page never calls the Storefront API.
   `app/pages/product/[handle].vue` queries the live API but **falls back to the
   same static array** on failure (`data.value?.product?.title ??
   staticProduct.value?.name`). Only the cart
   (`app/composables/cart.ts` → `useStorefront()`) and
   `app/pages/collection/[handle].vue` are unconditional live reads.
2. **The handles are placeholders, not Shopify ids.** `sku-001`, `sku-002`,
   `sku-003` are local handles defined in `app/data/products.ts`, documented as
   "must match Shopify product handle **when live**", with `imageSrc` still
   `undefined` behind a `TODO (STI-318)`. A `200` from `/products` therefore
   proves the static catalog rendered, **not** that live product data is being
   served. Verified: the preview body contains `185` / `35` and zero
   occurrences of `gid://shopify`.
3. **No customer can reach a checkout.** The production apex
   `https://www.stitch-ash.com` still redirects to `/password`
   (HTTP 200, final URL `.../password`, body "Enter password" / "Protected").
4. **The Shopify Admin API is locked, but the public Storefront path is not.**
   As of 2026-09-28 the Admin GraphQL endpoint rejects queries with
   `"Online Store channel is locked"` ([STI-457](/STI/issues/STI-457)). That
   lock is **Admin-side only**. The public Storefront API — the path the
   storefront actually uses — is **reachable and authenticating**: the server
   route `POST /api/checkout` forwards a `cartCreate` mutation to Shopify and
   returns a structured Shopify `userErrors` response, which is only possible
   after a successful call to the Storefront endpoint. The lock is therefore
   **not** a cause of zero revenue and must not be reported as one. It is a
   separate operator action (trial/billing hold or unverified store), and it
   may be *upstream* of the password gate rather than parallel to it.
   **Correction (2026-09-28, `a65331a`) — itself corrected at `a7151fd`.** An
   intermediate entry claimed the `cartCreate` call had stopped returning a
   cart. That was wrong: the `422` it rested on came from supplying a
   **placeholder variant id**, not from the store. The original claim is
   restored — `cartCreate` returns a real cart id and `checkoutUrl`.

5. **The `featured` collection is now populated — the `0`-member gap named on
   2026-09-28 is closed.** *(asserted `0` members at `a7151fd`; re-verified
   populated at `aad537e`; this section corrected to match at `6a25272`)* The
   fallback-free live route `/collection/featured` returns `HTTP 200` and proves
   the Storefront read works. It now renders **3 of 3** members — `sku-001`,
   `sku-003`, `sku-002` in curator order — with **0** occurrences of "No
   products found." Its product list comes from a *second* live query in
   `app/components/collection/Products.vue:14` (`useStorefrontData`), selecting
   `products(` at `:31-42` and flattening it at `:67`. That file has no static
   import of `~/data/products` and no fallback branch, so 3 rendered cards are
   proof of a live non-empty collection response rather than a fixture.

   **What closed it was Shopify data, not code.** [STI-497](/STI/issues/STI-497)
   joined the three product GIDs to `gid://shopify/Collection/510282629165` via
   an Admin `productUpdate(input: { collectionsToJoin: [...] })` at
   `2026-09-28T13:0xZ`, independently verified by [STI-498](/STI/issues/STI-498)
   at `13:09:58Z`. No deploy was required or triggered, because no storefront
   code changed. [STI-471](/STI/issues/STI-471) tracked the gap and is closed.

   **The `0`-member rows in the log below are left verbatim** — the `a65331a` and
   `a7151fd` rows recorded what was true at their own commits. This section, by
   contrast, asserts *current* state, and until this correction it contradicted
   the current-state table above and the `aad537e` row on the same page. The
   table is authoritative; this section now agrees with it.

   **This was never a revenue blocker, and it is not one now.** The three
   products are `ACTIVE` in `catalog/products/sku-00{1,2,3}.yaml`, and a control
   test against the real variant id returns `HTTP 200` with a real
   `checkoutUrl`. **Consequence for go-live sequencing: the count of launch
   preconditions is two** — un-gated apex, unlocked Online Store channel. The
   withdrawn "third precondition" would have sent an operator to create products
   that already exist, and the membership gap that briefly looked like one is
   now closed at the data layer. Fixing the gate remains necessary.

So "not mock", "serves live product data" and "has revenue" are three different
claims. The storefront config points at the live API, most pages still render
in-repo fixtures, and it earns nothing because the apex is walled. Reporting
that distinction wrongly in **any** of the three directions is the failure this
record prevents — including the optimistic direction, which this record
originally made itself before it was corrected on review.

A fourth distinction is now required: **"the Admin API is locked" and "the
storefront cannot read Shopify" are also different claims.** The first is true,
the second is false. An agent that conflates them will report a broken data
path that is not broken, and may "fix" a working Storefront client.

The live `SHOPIFY_*` values live in nixlab IaC and are operator-owned. Their
validity is **unverified by this role** and cannot be verified from the repo —
`publicAccessToken` is wired from `process.env` and may be empty at build time.
What the repo proves is that a real Storefront API *client* is configured, not
that a valid *credential* is present.

## Decision

**Reporting provenance is asserted per layer, and the storefront commerce client
is `mock: false` (live). Zero revenue is currently reportable, and the reason is
the apex gate — not mock commerce.**

Agents must state which layer they are reporting on, and must never infer
"revenue exists" from "the API is live", "serves live product data" from
"the page returned 200", or "the API is mock" from "no revenue exists." The
verified baseline as of 2026-09-27:

| Layer | State | How verified |
|---|---|---|
| Storefront client config | `mock: false` — live API **client configured** | `nuxt.config.ts:37` on `main` (`f3ac83d`; line moved 32→37 by the STI-428 guard comment in `a7151fd`) |
| Catalog listing `/products` | **Static in-repo catalog**, not a live-API read | `app/pages/products.vue` imports `PRODUCTS`; no Storefront call in the file |
| PDP `/product/<handle>` | Live query **with static fallback** — a `200` does not prove the live path | `app/pages/product/[handle].vue:22` query, `:70-75` `?? staticProduct…` fallbacks |
| Product handles | **Placeholders**, not Shopify ids | `app/data/products.ts:133+` "must match Shopify product handle when live"; `imageSrc: undefined`, `TODO (STI-318)` |
| Preview `/products` render | `200`, body has `185`/`35`, **zero** `gid://shopify` | `curl -sSL https://preview.stitch-ash.com/products` |
| Cart / `checkoutUrl` | Unconditional live Storefront API read | `app/composables/cart.ts:33,80` `useStorefront()` |
| Live store credential valid | **Unverified** — operator-owned | not readable from the repo; `process.env` wire only, `?? ''` |
| Collection `/collection/<handle>` | **Live read, no fallback** — a `200` here *is* proof of a live response — and `featured` is now **populated** (3 of 3 members render) | `app/pages/collection/[handle].vue:15` query; `:36-43` throws a fatal `404` on `!collection.value \|\| error.value`; prerender disabled in `nuxt.config.ts:45-47` `routeRules`; the product grid is a second live `products()` read at `app/components/collection/Products.vue:14` with the `products(` selection at `:31-42` and **no static import or fallback** in the file. Live: `<title>Featured \| STITCH AND ASH</title>`, 0 occurrences of "No products found.", all 3 handles linked. Populated by the [STI-497](/STI/issues/STI-497) Admin data change (joined `2026-09-28T13:0xZ`), independently re-verified here and by [STI-498](/STI/issues/STI-498) |
| Live catalog contents | **NOT empty** — all 3 products are `ACTIVE`, published and purchasable, and the `featured` **collection is now populated** with all 3. The 2026-09-28 membership gap ([STI-471](/STI/issues/STI-471)) was **closed**, not a missing catalog | `catalog/products/sku-00{1,2,3}.yaml` all `status: ACTIVE`; `catalog/collections/featured.yaml` declares all 3 handles; `collectionAddProducts`/`collectionsToJoin` landed the 3 GIDs; live re-verified in the re-verification log |
| Public Storefront API path | **Alive and returns a cart** — `cartCreate` with a real variant id returns `HTTP 200` and a real `checkoutUrl` | `POST https://preview.stitch-ash.com/api/checkout` with `gid://shopify/ProductVariant/66758592790573` → `HTTP 200` + `checkoutUrl` (2026-09-28, this record's re-verification row) |
| Shopify Admin API | **Locked** — `"Online Store channel is locked"` | Admin GraphQL query rejected, 2026-09-28 ([STI-457](/STI/issues/STI-457)) |
| Customer-reachable checkout | **No** — apex password-walled | `curl -L https://www.stitch-ash.com` → final `/password` |
| **Observable real revenue** | **Zero** | **One** cause: the apex password gate. Not `mock` commerce, and **not** an empty catalog — the catalog is populated and a real cart can be created. |
| Product photography | **None exists.** The live Storefront read returns real products with `featuredImage: null` and `images.edges: []`, so the storefront ships per-SKU silhouette plates instead of photographs | `app/utils/product-mark.ts:10` (`ProductMark = "hoodie" \| "lanyard" \| "sticker" \| "emblem"`); `app/components/ProductImagePlate.vue` (169 lines, [STI-541](/STI/issues/STI-541)); `app/data/products.ts:150,164,178` `mark: "hoodie"/"lanyard"/"sticker"`; `app/data/products.ts:122` `TODO (STI-318)` records the measured reason |

Reporting rules that follow:

- Revenue, AOV, conversion rate and gross margin are reported as `0` **with the
  stated reason**: no customer can reach checkout while the apex is gated. Never
  attribute `$0` to `mock` commerce, and never to an empty catalog — the catalog
  is populated and a real cart can be created (see the control test below).
- Any forward-looking revenue or margin figure is labeled an **estimate** with
  its source and its assumption basis. Estimates are never presented as actuals.
- The 90-day KPI clock starts when the apex gate is lifted, **not** when
  `mock` was set to `false`. Those are different events on different dates.
  **Amendment (2026-09-28):** lifting the gate is **necessary but no longer
  sufficient on its own.** With the Online Store channel also locked, gate
  removal may restore visibility without restoring a completable checkout. The
  clock starts when a customer can complete a purchase, which requires a
  confirmed un-gated apex **and** a confirmed payment path — not when either
  one alone is fixed.
  **Second amendment (2026-09-28, `a65331a`) — WITHDRAWN at `a7151fd`.** That
  amendment added a third precondition, "the live catalog must actually contain
  the products", on the strength of a `422` from `POST /api/checkout`. That
  `422` was a statement about the **placeholder variant id supplied**, not about
  the store: a control test with the real variant id returns `HTTP 200` and a
  real `checkoutUrl`, and all three products are `ACTIVE` in
  `catalog/products/*.yaml`. The catalog is **not** empty, so the third
  precondition is **withdrawn** and the count stays at **two**: (a) un-gated
  apex, (b) unlocked Online Store channel. Recording this withdrawal matters —
  over-reporting a merchandising gap as a revenue blocker is the pessimistic
  twin of the error this record exists to prevent.
- Nobody flips `mock` to satisfy a document. `mock: false` is the current,
  intended, live-commerce state.
- A `200` from a storefront URL is evidence the page rendered. It is **not**
  evidence that a live API responded, because the PDP and listing pages fall
  back to in-repo fixtures. Any claim of live-served product data must cite a
  live-specific marker (a `gid://shopify` id, an operator-confirmed credential,
  or a storefront response log) — not an HTTP status.
  **Exception:** `/collection/<handle>` has no fallback — it throws a fatal `404`
  when the live query fails or returns nothing, and prerendering is disabled, so
  a `200` from that route **is** evidence of a successful live response. Do not
  carry the "a 200 proves nothing" rule over to it.
  **Second exception:** proving the live *response* succeeded is not proving the
  live *catalog* has anything in it. A `200` from `/collection/featured` is
  evidence the Storefront API answered; "No products found." in the same body is
  evidence there is nothing to sell. Check both.
- A locked Admin API is **not** evidence of a broken Storefront path. Verify the
  path the storefront actually uses (`cartCreate`, the collection query) before
  reporting the data path as down.
- **An empty rendered grid is not evidence of a broken data path, and not
  evidence of an empty catalog either.** This rule stands on its own merits —
  the Storefront API answering "no products" is a *catalog/membership* fact, not
  a *plumbing* fact, so do not "fix" the storefront in response to it. What
  changed at `a7151fd` is the specific diagnosis: the live catalog is **not**
  empty (all three products `ACTIVE`, real variant id returns a cart), and what
  was empty was `featured` collection *membership* — fixed at the catalog layer
  by `catalog/collections/featured.yaml` ([STI-471](/STI/issues/STI-471)), not
  by creating products that already exist.

## Alternatives considered

- **Leave the instruction as written and do nothing.** Rejected: the parenthetical
  is factually wrong and its failure mode is a destructive prod edit, so silence
  is not neutral — it is an unmanaged risk sitting in the instructions.
- **Self-edit the agent instruction to match the repo.** Rejected: an agent
  weakening the honesty gate it was handed, without a human in the loop, is the
  same class of self-serving edit the gate exists to prevent. The correction is
  routed to the operator for authorization instead.
- **Assert "real commerce is live, so revenue data exists."** Rejected: it is
  false twice over. No customer reaches checkout while the apex is walled, and
  the credential is unverified. Separately, most catalog rendering reads
  in-repo fixtures, not the live API, so "the client is live" does not even
  imply "product data comes from Shopify." This is the optimistic error the
  provenance rule exists to prevent, reached from the opposite direction — and
  the first draft of this record made it, which is why the distinction is now a
  table row rather than a sentence.
- **Assert "mock is true, therefore no data path exists."** Rejected as
  outdated — the flip landed in `f3ac83d` on 2026-08-18. This is the current
  stale claim, and it misdescribes the deployed system.
- **Treat the stale `mock = true` parenthetical as a live-commerce signal and
  flip `mock` to satisfy it.** Rejected outright. `mock: false` is the current,
  intended state; the document is what is wrong, not the config.

## Scope correction (2026-09-28): three instruction files, not one

The original framing of this record scoped the stale `mock = true` claim to the
**merch/GTM role only**. That understates the blast radius. A read of every agent
instructions file in the company on 2026-09-28 finds the same false claim in
**three** files, and the two newly-named ones are materially more dangerous than
the one this record was written about, because each one *assigns the fixing of
the flag to an agent*:

| Agent | File | Stale text | Why it is more dangerous than the merch/GTM one |
|---|---|---|---|
| `merch-lead` (`c53c70a2`) | `agents/c53c70a2-…/instructions/AGENTS.md` L7-13 | "while the storefront runs mock commerce (`clients.storefront.mock = true`) there is NO real revenue data" | Reporting-only. Names no file and assigns no fix. Worst case is a misattributed cause in a KPI report. |
| `ash-gm` (`00a7c44f`) | `agents/00a7c44f-…/instructions/AGENTS.md` L6-8 | "The storefront client currently runs MOCK commerce (runtimeConfig shopify clients.storefront.mock = true) — treat go-live as the company's standing top priority." | Pairs the false claim with **"standing top priority"**, manufacturing pressure to act on a false premise. |
| `commerce-eng` (`7fe07aa9`) | `agents/7fe07aa9-…/instructions/AGENTS.md` L4-5 | "the storefront UI runs mock data (clients.storefront.mock = true in nuxt.config.ts). **You own closing that gap.**" | **Highest risk.** Names the exact file and line, asserts it is true, and assigns ownership of the fix to the one agent who already authored `f3ac83d` — the commit that set `mock: false`. |

The `commerce-eng` entry is the concrete prod-break vector this record exists to
prevent. That agent is instructed that `nuxt.config.ts` line 32 reads
`mock: true` and that closing that gap is their job; the file in fact reads
`mock: false`, and it is correct. Reverting it would break the live Storefront
API data path — real `cartCreate`, real `checkoutUrl`, real PDP pricing — that
[STI-327](/STI/issues/STI-327) verified. Note that this is the *same* failure
mode this record's own rejected-options list anticipated:

> flip `mock` to satisfy it. Rejected outright.

The earlier framing also implied the operator correction was a single-file edit.
It is a three-file edit, and none of the three files may be self-edited by the
agent that reads them: the edit is operator-owned under the escalation rule, and
is still open in [STI-398](/STI/issues/STI-398) as board approval
`f4a5765d-3226-4a41-91fe-f4634a0a60fb` (raised 2026-09-26, still `pending` as of
this entry).

**Corrected scope of the operator ask:** correct all three files, or state
explicitly that the parenthetical is intentionally left standing. What must not
happen is leaving one of them, because the one left behind is sufficient to
cause the incident.

Guard-post as of this entry: `mock: false` is still intact at `origin/main`
`7a62fc5`, and **no commit since `81b7b81` has touched `nuxt.config.ts`**. The
break is latent, not realized. This entry changes no storefront code and
requires no deploy.

Guard-post re-checked at `a65331a` (see the re-verification log): `mock: false`
is still intact at `nuxt.config.ts:32`, and
`git log --oneline 81b7b81..origin/main -- nuxt.config.ts` is **still empty** —
across 14 commits, nothing has touched the storefront client config. The prod-break
vector named above remains **latent, not realized**.

**Guard-post at `a7151fd`, and a line-citation correction.** `a7151fd` ("docs(STI-428):
guard comment at the storefront mock flag") is the **first** commit to touch
`nuxt.config.ts` since `81b7b81`. It is **comment-only** — five `//` lines added
inside the `storefront` object literal, so the shipped configuration is byte-for-byte
unchanged and no deploy was required to carry it. Its effect on *this record* is
that every `nuxt.config.ts:32` citation for `mock: false` above is now **off by
five lines**: the correct citations are `:37` for `mock: false`, `:38` for
`apiVersion`, `:39` for `publicAccessToken`, and `:45-47` for the disabled
`routeRules` prerender entry. Those citations have been corrected in the current-state
table; the historical re-verification rows below are left as written, because they
record what was true at their own commits. The prod-break vector is still **latent,
not realized** — `mock` remains `false`.

## Consequences

- KPI reporting cites this record instead of an instruction parenthetical.
- The optimism risk and the pessimism risk are both named, so a future agent is
  unlikely to "fix" the storefront in either direction.
- If the apex gate is lifted, revenue reporting still requires a confirmed
  Shopify Admin export path and a confirmed credential; neither is established
  here.
- The credential check remains operator-owned by design. No secret value was
  read, requested, or referenced in producing this record.
- Prices and handles shown to customers come from `app/data/products.ts`, not
  from Shopify, until the PDP live query succeeds. Price and copy edits
  therefore still have to be made in that file to be visible; a Shopify-side
  change alone will not move the rendered price.
- The static-catalog rows are a finding, not a defect report. Whether the
  catalog should become live-sourced before the apex gate is lifted is a
  commerce decision for the operator, out of scope for this record.
- **The `featured` collection's empty membership (corrected at `a7151fd`) is a
  commerce decision, not a reporting one, and not this role's to execute. That
  curation action is now DONE** — the three products were joined to `featured` in
  Shopify on 2026-09-28 ([STI-497](/STI/issues/STI-497), verified
  [STI-498](/STI/issues/STI-498)), so `/collection/featured` is no longer an empty
  state. The earlier version of this bullet said the live catalog was empty and
  that creating products required the locked Admin API ([STI-457](/STI/issues/STI-457)).
  That was wrong: the products exist and are `ACTIVE`, and the gap was membership,
  which is declared in-repo at `catalog/collections/featured.yaml` and applied
  through the existing catalog tooling. **The consequence that still stands:** the
  Admin API remains reported locked ([STI-457](/STI/issues/STI-457)), so the *other*
  open go-live blocker it gates — reconciling catalog YAML to the live store through
  `catalog:apply` — is still operator-gated and still needs the operator to confirm
  whether the lock was lifted. This record's contribution is the verified claim that
  membership was the gap and that it is now closed, not the catalog.
- This record is a reporting baseline, not a commerce change. It edits no
  storefront code and requires no deploy.

## Re-verification log

This record is a snapshot. Re-check it before relying on it; do not treat a row
below as current just because it appears in this file.

| Re-verified | `origin/main` | Result |
|---|---|---|
| 2026-09-27 | `931c178` | **All ten rows above re-verified true, unchanged.** `nuxt.config.ts:32` is still `mock: false,`; `app/pages/products.vue:2,18` still imports and renders the static `PRODUCTS`; `app/pages/product/[handle].vue:22` still runs a `useStorefrontData` query with `:70-75` static fallbacks; `app/data/products.ts:24,116,136` still carries the placeholder-handle comment, the `TODO (STI-318)`, and `imageSrc: undefined`; `app/composables/cart.ts:5` still calls `useStorefront()`. Live: `curl -sSL https://preview.stitch-ash.com/products` → `HTTP 200`, `20907` bytes, `<title>Shop — STITCH AND ASH</title>`, prices `185` and `35` present, `0` occurrences of `gid://shopify`. `curl -sSL https://www.stitch-ash.com` → `HTTP 200`, `103731` bytes, final `https://www.stitch-ash.com/password`. **Observable real revenue is still zero.** |
| 2026-09-28 | `7a62fc5` | **All ten rows above re-verified true, unchanged. Revenue still zero.** Read from a fresh `git fetch origin` in `$PAPERCLIP_WORKSPACE_CWD/stitch-ash` (remote `github.com/olivecasazza/stitch-ash`, workspace guard PASS). Repo: `nuxt.config.ts:32` is `mock: false,` with `:33` `apiVersion: '2026-04',` and `:34` `publicAccessToken: process.env.SHOPIFY_STOREFRONT_TOKEN ?? ''`; `git log --oneline 81b7b81..origin/main -- nuxt.config.ts` is **empty** — no commit since `81b7b81` has touched the storefront client config. Live, fetched 2026-09-28T07:5xZ: `https://preview.stitch-ash.com/products` → `HTTP 200`, `20908` bytes, `<title>Shop — STITCH AND ASH</title>`, all three prices `185`/`35`/`15` present, `0` occurrences of `gid://shopify`, `mock:false` present in the served payload; `https://www.stitch-ash.com` → `HTTP 200`, `103731` bytes, final `https://www.stitch-ash.com/password`, body "Enter password" / "Protected". **Observable real revenue is still zero.** Re-verification only — no storefront code changed and no deploy was triggered by this entry. |
| 2026-09-28 | `7a39fe0` | **All ten rows above re-verified true, unchanged. Revenue still zero.** Read from a fresh `git fetch origin` in `$PAPERCLIP_WORKSPACE_CWD/stitch-ash` (remote `github.com/olivecasazza/stitch-ash`). Repo: `nuxt.config.ts:32` is `mock: false,` with `:33` `apiVersion: '2026-04',` and `:34` `publicAccessToken: process.env.SHOPIFY_STOREFRONT_TOKEN ?? '',`; `app/pages/products.vue:2,18` still imports and renders the static `PRODUCTS` with no Storefront call in the file; `app/pages/product/[handle].vue:22` still runs the `useStorefrontData` query and `:70-75` still fall back to `staticProduct`; `app/pages/collection/[handle].vue:15` is still an unconditional `useStorefrontData` read; `app/composables/cart.ts:5` still calls `useStorefront()`; `app/data/products.ts:24` still says "must match Shopify product handle when live", `:116` still carries `TODO (STI-318)`, and `:136,149,162` are still `imageSrc: undefined`. Live, fetched 2026-09-28T01:07Z: `https://preview.stitch-ash.com/products` → `HTTP 200`, `20907` bytes, `<title>Shop — STITCH AND ASH</title>`, all three prices `185`/`35`/`15` present, `0` occurrences of `gid://shopify`; all three PDPs return `HTTP 200` with `0` `gid://shopify` each (`sku-001` `31474` bytes, `sku-002` `28036`, `sku-003` `27912`); `https://www.stitch-ash.com` → `HTTP 200`, `103731` bytes, final `https://www.stitch-ash.com/password`, body "Enter password" / "Protected". Re-verification only — no storefront code changed and no deploy was triggered by this entry. |
| 2026-09-28 | `52b365c` | **All ten original rows re-verified true, unchanged. Revenue still zero. Three rows added this run.** Workspace guard passed: `$PAPERCLIP_WORKSPACE_CWD/stitch-ash` remote is `https://github.com/olivecasazza/stitch-ash.git`; `git ls-remote` → `52b365c2585b701f729d9da1bb4bd752a385d0d3`. Repo: `nuxt.config.ts:32` is `mock: false,` with `:33` `apiVersion: '2026-04',` and `:34` `publicAccessToken: process.env.SHOPIFY_STOREFRONT_TOKEN ?? '',`; `app/pages/products.vue:2,18` still imports and renders the static `PRODUCTS` with no Storefront call in the file; `app/pages/product/[handle].vue:22` still runs the `useStorefrontData` query and `:70-75` still fall back to `staticProduct`; `app/pages/collection/[handle].vue:15` is still an unconditional `useStorefrontData` read; `app/composables/cart.ts:5` still calls `useStorefront()`; `app/data/products.ts:24` still says "must match Shopify product handle when live", `:116` still carries `TODO (STI-318)`, and `:136,149,162` are still `imageSrc: undefined`. Live, fetched 2026-09-28T05:4xZ: `https://preview.stitch-ash.com/` → `HTTP 200`, `22491` bytes; `/products` → `HTTP 200`, `20908` bytes, `<title>Shop — STITCH AND ASH</title>`, prices `185`/`35`/`15` present, `0` occurrences of `gid://shopify`; `/product/sku-001` → `HTTP 200`, `31474` bytes, `<title>Embroidered Hoodie — STITCH AND ASH</title>`, `0` `gid://shopify`; `/collection/featured` → `HTTP 200`, `19230` bytes, `<title>Featured | STITCH AND ASH</title>`. **New this run — the collection route is a live read with no fallback** (`app/pages/collection/[handle].vue:36-37` throws a fatal `404` when the query errors or returns nothing) and prerendering is disabled (`nuxt.config.ts:41-42` `routeRules` has the `prerender: true` entry commented out, STI-271), so that `200` is evidence of a successful live Storefront response, not a fixture. **New this run — the public Storefront path is alive:** `POST https://preview.stitch-ash.com/api/checkout` with one line → `HTTP 200` and a real Shopify `checkoutUrl` on `https://www.stitch-ash.com/cart/c/…`; following it → `HTTP 200`, `103731` bytes, final `https://www.stitch-ash.com/password`. This created an empty cart only — no order was placed and nothing was spent. **New this run — the Shopify Admin API is locked** (`"Online Store channel is locked"`, [STI-457](/STI/issues/STI-457)); it is Admin-side only and did **not** break the Storefront path proven above. Re-verification only — no storefront code changed and no deploy was triggered by this entry. |
| 2026-09-28 | `a65331a` | **All previously-logged rows re-verified true except two, which are corrected above. Revenue still zero, and there are now three independent causes.** Workspace guard passed: `$PAPERCLIP_WORKSPACE_CWD/stitch-ash`, remote `https://github.com/olivecasazza/stitch-ash.git`; `git fetch origin` → `origin/main` = `a65331af514de3fad002230998409c1b9d7b7472`. Repo: `nuxt.config.ts:32` is `mock: false,` (`:33` `apiVersion: '2026-04',`, `:34` `publicAccessToken: process.env.SHOPIFY_STOREFRONT_TOKEN ?? ''`), prerender still disabled at `:41-42`; `git log --oneline 52b365c..origin/main` = 7 commits, of which `git diff --name-only 52b365c..origin/main -- nuxt.config.ts` is **empty** and the `app/` changes are **copy-only** (`app/app.vue`, `app/components/ProductCard.vue`, `app/data/products.ts`, `app/pages/product/[handle].vue` — all four edits are string swaps: lead-time text removed from the three Shipping & Returns accordion bodies, and the PDP plate caption changed from `PHOTOGRAPH PENDING` to `EMBROIDERY, NOT PRINT`). **Every line citation in the table above was re-checked and still points at exactly the claimed line**: `app/pages/products.vue:2` + `:18`; `app/pages/product/[handle].vue:22` + the `:68-77` `?? staticProduct…` fallbacks; `app/data/products.ts:24` + `:116` + `:136,149,162`; `app/composables/cart.ts:5`; `app/pages/collection/[handle].vue:15` + `:36-37`. Live, fetched 2026-09-28T08:10:48Z: `/` → `HTTP 200`, `22517` bytes; `/products` → `HTTP 200`, `20934` bytes, all three prices `185`/`35`/`15` present, `0` occurrences of `gid://shopify`; `/product/sku-001` → `200`/`31457`, `/product/sku-002` → `200`/`28019`, `/product/sku-003` → `200`/`27910`, each with `0` `gid://shopify`; `/collection/featured` → `200`/`19247`, `0` `gid://shopify`; `https://www.stitch-ash.com` → `HTTP 200`, `103731` bytes, final `https://www.stitch-ash.com/password`, body "Enter password" / "Protected". The `a65331a` copy change is confirmed deployed: `EMBROIDERY, NOT PRINT` present on `/product/sku-001`, `allow 3–5 weeks` now `0` occurrences. **CORRECTION — `cartCreate` no longer returns a cart.** `POST https://preview.stitch-ash.com/api/checkout` with the documented `{ items: [{ variantId, quantity }] }` shape now returns **`HTTP 422`**, `"The merchandise with id gid://shopify/ProductVariant/1 does not exist."`, for both a low ordinal (`…/1`) and a zero ordinal (`…/00000000000000`); the earlier `HTTP 200` + `checkoutUrl` recorded at `52b365c` **does not reproduce**. This is a `userErrors` passthrough from `server/api/checkout.ts:123-129`, which is only reachable after the server has called Shopify — so the row is narrowed from "Alive, returns a cart" to **"reachable and authenticating"**. (An earlier probe in this same run used the wrong payload key — `{ lines: … }` — and got `HTTP 400`; that was my error, not a finding, and the corrected shape above is the result that counts.) **NEW FINDING — the live catalog is empty.** `/collection/featured` renders **"No products found."** Its `<title>` (`Featured | STITCH AND ASH`) and description ("Heavyweight cotton fleece, double-stitched. Black on black embroidery.") come from the live `collection(handle:)` query at `app/pages/collection/[handle].vue:15`, and its product grid comes from a **second** live `products()` query at `app/components/collection/Products.vue:31-39` that returned an empty connection. So the Storefront path demonstrably answers, and the collection it answers with **contains zero products** — corroborating the `422` above. This is a third, independent go-live blocker, downstream of the password gate and the Admin lock. **Observable real revenue is still zero.** Re-verification and record-correction only — no storefront code changed, no deploy was triggered, no order placed, no spend, and no secret read. |
| 2026-09-28 | `a7151fd` | **The "empty catalog" claim is withdrawn; revenue still zero with ONE cause. Line citations corrected. `a7151fd` is the first commit to touch `nuxt.config.ts` since `81b7b81`, and it is comment-only.** Workspace guard passed: `$PAPERCLIP_WORKSPACE_CWD/stitch-ash`, remote `https://github.com/olivecasazza/stitch-ash.git`; `git fetch origin` → `origin/main` = `a7151fdbcd08999909274dd910a14f0a9bb52507`. **THE RECORD WAS SELF-CONTRADICTORY ON `main`:** the `a65331a` row below and the `a65331a` note in finding (4) already said the `422` was "a statement about the id I supplied, not about the store" and that the catalog is "not empty" — while finding (5), two table rows, the "three independent causes" revenue row, and the "second amendment" all simultaneously asserted an empty catalog and a third go-live blocker. Both claims were on the same page of the same file. **Resolved against the empty-catalog claim, with a control test.** Repo: `catalog/products/sku-001.yaml`, `sku-002.yaml`, `sku-003.yaml` all carry **`status: ACTIVE`**, and `catalog/collections/featured.yaml` declares all three handles as intended members — the collection is **empty of members, not the store empty of products**. Live, fetched 2026-09-28T09:3xZ: `POST https://preview.stitch-ash.com/api/checkout` with the **real** variant id from [STI-327](/STI/issues/STI-327), `gid://shopify/ProductVariant/66758592790573` → **`HTTP 200`** with a real `checkoutUrl` on `https://www.stitch-ash.com/cart/c/…?key=…` (key redacted); following that URL → `HTTP 200`, `103731` bytes, final `https://www.stitch-ash.com/password`. So a real variant exists, a real cart is created, and the cart dead-ends at the password gate — **the end-to-end revenue path is proven, and every `$0` is accounted for by the gate alone.** `/collection/featured` → `HTTP 200`, `19247` bytes, `<title>Featured | STITCH AND ASH</title>`, description live from Shopify, body renders "No products found.", `0` `gid://shopify`; `https://preview.stitch-ash.com/` → `HTTP 200`, `22517` bytes, `mock:false` present in the served payload; `https://www.stitch-ash.com` → `HTTP 200`, `103731` bytes, final `/password`. **Line citations corrected for the `a7151fd` shift:** the five added comment lines move `mock: false` from `:32` to **`:37`**, `apiVersion` to `:38`, `publicAccessToken` to `:39`, and the disabled `routeRules` prerender entry from `:41-42` to **`:45-47`**; `app/pages/collection/[handle].vue`'s fatal-404 block is `:36-41`, and the `userErrors` passthrough moved to `server/api/checkout.ts:191-195`. Every current-state citation in the table above was re-checked against the working tree on this branch. Historical rows are left verbatim — they record what was true at their own commits. **Two new reporting rules recorded so this is not repeated:** (1) a `422` on `POST /api/checkout` is a statement about the **variant id you supplied**; always run a control against a known-good id before concluding anything about the store, and (2) a collection with `0` members is a **merchandising** fact, not a **catalog** fact — check `catalog/products/*.yaml` and a real variant id, not the rendered grid. Docs only — no storefront code changed, no deploy triggered, no order placed (an empty cart only), no spend, no secret read. |
| 2026-09-28 | `9625192` | **Guard-post. Storefront client config untouched since `a7151fd`; [STI-428](/STI/issues/STI-428) scope item 1 fully closed on both halves. Revenue still zero, cause still the apex gate.** Workspace guard passed: `$PAPERCLIP_WORKSPACE_CWD/stitch-ash`, remote `https://github.com/olivecasazza/stitch-ash.git` for both fetch and push. `git fetch origin` → `origin/main` = `9625192785aee60cafaa63970121864d2a7203fe`, matching `git ls-remote origin refs/heads/main`. Repo: `nuxt.config.ts:37` is still `mock: false,`, now preceded by the five-line STI-428 guard comment at `:32-36` that names this record; `git log --oneline a7151fd..origin/main -- nuxt.config.ts` is **empty** across the single intervening commit, so the prod-break vector remains **latent, not realized**. `9625192` is the squash merge of the record reconciliation ([#77](https://github.com/olivecasazza/stitch-ash/pull/77)) — `git diff --stat <branch-tip> origin/main` is empty, confirming the corrected current-state text (empty-catalog claim withdrawn, citations moved to `:37`/`:38`/`:39`/`:45-47`) is what is live on `main`. Live, fetched 2026-09-28T10:5xZ: `https://preview.stitch-ash.com/products` → `HTTP 200`, `20934` bytes, `<title>Shop — STITCH AND ASH</title>`, all three prices `185`/`35`/`15` present, `0` occurrences of `gid://shopify`; `https://www.stitch-ash.com` → `HTTP 200`, `103731` bytes, final `https://www.stitch-ash.com/password`. **Observable real revenue is still zero, and still for the same single reason: the apex password gate.** Scope item 1 of [STI-428](/STI/issues/STI-428) is now closed on both halves — this record merged as `371b629` via [#39](https://github.com/olivecasazza/stitch-ash/pull/39) and the config guard comment merged as `a7151fd` via [#76](https://github.com/olivecasazza/stitch-ash/pull/76). Scope item 2 (the operator correction of the stale `mock = true` parenthetical) is **still open** and is the only outstanding item: board approval `f4a5765d-3226-4a41-91fe-f4634a0a60fb` is **still `pending`**, raised 2026-09-26T22:14:40Z, and its scope has since grown from one file to **three** (see the scope-correction section above). Docs only — no storefront code changed, no deploy triggered, no order placed, no spend, no secret read. |
| 2026-09-28 | `3cb9f859` | **The prod-break vector is no longer latent: the `mock` invariant is now enforced in CI on `main`. Revenue still zero, still one cause. This row supersedes one phrase in the `9625192` row above, which called that vector "latent, not realized".** Workspace guard passed: `$PAPERCLIP_WORKSPACE_CWD/stitch-ash`, remote `https://github.com/olivecasazza/stitch-ash.git` for fetch and push. `git fetch origin` -> `origin/main` = `3cb9f859a869cfd0a35c65dad851a21fc0eb3246` ("fix(STI-507): verify declared shipping rates against the live store (#90)"), matching `git ls-remote origin refs/heads/main`. Repo: `nuxt.config.ts:37` is still `mock: false,`, still preceded by the five-line STI-428 guard comment at `:32-36`; `git log --oneline 9625192..origin/main -- nuxt.config.ts` is **empty** across 13 commits, so the config itself has not moved. **New - the invariant is now mechanical:** [PR #86](https://github.com/olivecasazza/stitch-ash/pull/86) "ci(STI-517): gate the storefront mock flag so it cannot flip back to true" is **MERGED** at `2026-09-28T15:32:04Z`; `scripts/ci/storefront-mock-gate.sh` is present on `origin/main` and runs as the `storefront-mock-gate` job in `.github/workflows/pr-checks.yml:103` (step at `:112`). The failure mode [STI-428](/STI/issues/STI-428) was opened to prevent - an agent reading the stale `mock = true` parenthetical and reverting the flag - is therefore blocked by CI rather than by a comment. Live, fetched 2026-09-28T17:41Z: `https://preview.stitch-ash.com/` -> `HTTP 200`, `22295` bytes, `<title>STITCH AND ASH — Embroidered Apparel</title>`; `https://preview.stitch-ash.com/products` -> `HTTP 200`, `20712` bytes; `https://www.stitch-ash.com` -> `HTTP 200`, `103731` bytes, final `https://www.stitch-ash.com/password`. **Observable real revenue is still zero, still for the same single reason: the apex password gate.** Scope note: this row re-verified the mock flag, the CI gate, and the three live URLs only. The storefront line citations in the table above were **not** re-read this run and are not restated as current. The stale parenthetical itself is unchanged - the merch-lead `AGENTS.md` still reads `clients.storefront.mock = true` (2771 bytes, mtime `2026-09-27 20:23:01Z`, `sha256 c6bf0781a4b02a93e270e96d1c5ec868d0fe8bdf1247bf43ecd4ea8c091a630c`, not edited by me) and board approval `f4a5765d-3226-4a41-91fe-f4634a0a60fb` is still `pending` - so scope item 2 of [STI-428](/STI/issues/STI-428) remains open, but it is now a reporting-hygiene item rather than a live-commerce risk. Docs only - no storefront code changed, no deploy triggered, no order placed, no spend, no secret read. |

| 2026-09-28 | `aad537e` | **Two current-state rows corrected: `featured` is now POPULATED, so the "0 members" curation gap is closed. Revenue still zero, still one cause. The `mock` CI gate and the stale parenthetical are unchanged from the row above.** Workspace guard passed: `$PAPERCLIP_WORKSPACE_CWD/stitch-ash`, remote `https://github.com/olivecasazza/stitch-ash.git` for fetch; `git fetch origin` -> `origin/main` = `aad537e15dbc90716d5e7a0d5bdf52b6b22c54f6` ("fix(STI-423): make the DESIGN.md -> tokens.css drift check executable (#93)"), matching `git ls-remote origin refs/heads/main`. `origin/main` advanced one commit since the `3cb9f859` row, and that commit (`git show --name-status aad537e`) is `M package.json` + `A scripts/design-drift.ts` — **it does not touch `nuxt.config.ts`, `app/`, or `catalog/`**, so it cannot have changed any storefront fact recorded above. Repo re-read at `aad537e`: `nuxt.config.ts:37` is `mock: false,` with `:38` `apiVersion: '2026-04',` and `:39` `publicAccessToken: process.env.SHOPIFY_STOREFRONT_TOKEN ?? ''`; the disabled `routeRules` prerender entry is `:45-47`. **Every current-state citation in the table above was re-read this run and still points at exactly the claimed line**: `app/pages/products.vue:2` (`import { PRODUCTS } from '~/data/products'`) + `:18` (`v-for="p in PRODUCTS"`); `app/pages/product/[handle].vue:22` (`useStorefrontData`) with the `?? staticProduct…` fallbacks at `:70,71,75`; `app/data/products.ts:24` (placeholder-handle comment), `:116` (`TODO (STI-318)`), `:136,149,162` (`imageSrc: undefined`); `app/composables/cart.ts:5` (`useStorefront()`). Live, fetched 2026-09-28T17:51–17:55Z: `/` -> `HTTP 200`, `22295` bytes, `<title>STITCH AND ASH — Embroidered Apparel</title>`; `/products` -> `HTTP 200`, `20712` bytes, `<title>Shop — STITCH AND ASH</title>`, all three prices `185`/`35`/`15` present, `0` `gid://shopify`, and **no `$185.0` trailing-decimal regression** (the [STI-506](/STI/issues/STI-506) fix is still live); `/product/sku-001` -> `200`/`31748`, `/product/sku-002` -> `200`/`28310`, `/product/sku-003` -> `200`/`28201`, titles `Embroidered Hoodie/Lanyard/Sticker — STITCH AND ASH`, **all three render an "Add to cart" control and none renders "Sold out"/"unavailable"**; `https://www.stitch-ash.com` -> `HTTP 200`, `103731` bytes, final `https://www.stitch-ash.com/password`, body "Enter password" / "Protected". **CORRECTION — `/collection/featured` no longer renders an empty state.** `HTTP 200`, `35499` bytes (was `19247` at `9625192`), `<title>Featured | STITCH AND ASH</title>`, **0** occurrences of "No products found." (was 1), and all three handles linked from `ProductCard`s in curator order: `sku-001`, `sku-003`, `sku-002`, with prices `$185`/`$15`/`$35` each present once. So the membership gap named at `a7151fd` and [STI-471](/STI/issues/STI-471) is **closed**: [STI-497](/STI/issues/STI-497) joined the three product GIDs to `gid://shopify/Collection/510282629165` via an Admin **data** change (`productUpdate(input: { collectionsToJoin: [...] })`, inside the declared `write_products` scope at `scripts/shopify-env.ts:20`) at `2026-09-28T13:0xZ`, independently verified by [STI-498](/STI/issues/STI-498) at `13:09:58Z` and re-derived independently here. **This is a data change, not a deploy** — no storefront code changed, so no deploy was needed or triggered, and the 0-members claim in the `a7151fd`/`9625192` rows above is superseded by this row. The `featured` grid is a **second live read** at `app/components/collection/Products.vue:31-39` with **no static import or fallback anywhere in the file**, so 3 rendered cards is proof of a live non-empty collection response, not a fixture. **The `mock` invariant is unchanged and still mechanical:** `scripts/ci/storefront-mock-gate.sh` is present on `aad537e` and wired at `.github/workflows/pr-checks.yml:103` (step `:112`); the `storefront-mock-gate` job is observed **passing on my own PR [#94](https://github.com/olivecasazza/stitch-ash/pull/94)** this run, i.e. the gate is not vacuous. **Scope correction that follows from this row:** the "Operator: reconcile catalog YAML to the live store" ask that was justified as "the collection is empty" is **no longer justified by that reason** — the remaining `catalog:apply` work is a drift/idempotency question, and the still-open go-live precondition is the **apex password gate** alone. **Observable real revenue is still zero, still for that one cause.** Scope note: this run re-verified the whole current-state table's line citations, the three PDPs, `/collection/featured`, the `mock` flag and CI gate, and the apex gate. It did **not** re-run the `POST /api/checkout` control test, so the "Public Storefront API path alive / returns a cart" row is **carried forward unverified this run**, not re-confirmed. No secret read; the merch-lead `AGENTS.md` remains unedited by me (`sha256 c6bf0781a4b02a93e270e96d1c5ec868d0fe8bdf1247bf43ecd4ea8c091a630c`, mtime `2026-09-27 20:23:01Z`), so scope item 2 of [STI-428](/STI/issues/STI-428) is still open. Docs only — no storefront code changed, no deploy triggered, no order placed (no cart was created this run), no spend, no secret read. |
| 2026-09-28 | `e68d4e7` | **Two drifted line citations corrected; one new row added (product photography); preview found BEHIND `main` and reconciled. Revenue still zero, still one cause.** Workspace guard passed: fresh clone, `git remote -v` → `origin https://github.com/olivecasazza/stitch-ash.git`; `git fetch origin` → `origin/main` = `e68d4e76fadc42458883482b7c30af3194e6b5c0` ("fix(STI-541): one honest product image plate instead of ops copy in the a11y tree (#96)"), matching `git ls-remote origin refs/heads/main`. `origin/main` advanced two commits since the `aad537e` row (`9c55c36`, `e68d4e7`), and `git diff --name-only aad537e..origin/main -- nuxt.config.ts app/ catalog/` is **10 files, not empty** — so the "no storefront fact could have moved" inference the previous row's pattern would have licensed is **not** available this run, and the current-state table's citations had to be re-read rather than assumed. **Two citations had drifted and are corrected in the table above:** `app/data/products.ts:118+` → **`:133+`** (`PRODUCTS_DATA` start, pushed by the per-SKU `mark` field) and `app/components/collection/Products.vue:31-39` → **`:31-40`** (the `products()` fragment now closes at `:40`). Every other current-state citation was re-read at `e68d4e7` and still points at exactly the claimed line: `nuxt.config.ts:37` `mock: false,` / `:38` `apiVersion` / `:39` `publicAccessToken` / `:45-47` disabled `routeRules` prerender; `app/pages/products.vue:2` + `:18`; `app/pages/product/[handle].vue:22` + `:70,71,75`; `app/data/products.ts:24` + `:122` + `:151,165,179`; `app/composables/cart.ts:5`; `app/pages/collection/[handle].vue:15` + `:36-43`; `server/api/checkout.ts:191-195`. **New row added — product photography does not exist.** `app/utils/product-mark.ts:10` declares `ProductMark = "hoodie" | "lanyard" | "sticker" | "emblem"`, `app/components/ProductImagePlate.vue` (169 lines) renders it, and `app/data/products.ts:150,164,178` sets `mark` per SKU. The reason is recorded in-repo at `app/data/products.ts:122`: the live Storefront read returns `gid://shopify/Product/15107230335021`, `availableForSale true`, `price 185.0`, with `featuredImage: null` and `images.edges: []`. **This is a GTM input, not a defect:** until photography is uploaded, the honest customer-facing state is a silhouette, and no copy may imply a photographed garment. **Preview was BEHIND `main` — measured, then reconciled.** `gh api repos/olivecasazza/stitch-ash/actions/runs?head_sha=e68d4e76fadc42458883482b7c30af3194e6b5c0` → `total_count: 0` (zero workflow runs for that commit); the newest deploy runs are `36468438858` / `36468438203` at `2026-09-28T18:53:58Z` for `9c55c36`, the *parent* of `e68d4e7`. PR #96 was merged `2026-09-28T19:49:30Z` by `app/github-actions` — a bot merge, so `on: push` is suppressed and only the `*/30` cron backstop in `deploy.yml` can recover it, which had not fired by this run. Live, fetched 2026-09-28T20:0xZ: `https://preview.stitch-ash.com/` → `HTTP 200`, `22490` bytes, `<title>STITCH AND ASH — Embroidered Apparel</title>`; `https://preview.stitch-ash.com/products` → `HTTP 200`, `20712` bytes, all three prices `185`/`35`/`15` present, `0` `gid://shopify`; `/product/sku-001` → `200`/`31748`, `/product/sku-002` → `200`/`28310`, `/product/sku-003` → `200`/`28210` — **byte-identical to the `aad537e` row's measurements, and `0` occurrences of the STI-541 plate markers**, which is the direct evidence that preview was serving `9c55c36` and not `e68d4e7`. `https://www.stitch-ash.com` → `HTTP 200`, `103731` bytes, final `https://www.stitch-ash.com/password`, body "Enter password" / "Protected". **Observable real revenue is still zero, still for that one cause: the apex password gate.** Reconciliation: `gh workflow run deploy.yml --ref main` dispatched this run (HARD RULE 4 path), then re-verified live — see the row below. The merch-lead `AGENTS.md` remains unedited by me (`sha256 c6bf0781a4b02a93e270e96d1c5ec868d0fe8bdf1247bf43ecd4ea8c091a630c`, 2771 bytes, mtime `2026-09-27 20:23:01Z`) and board approval `f4a5765d-3226-4a41-91fe-f4634a0a60fb` is still `pending`, so scope item 2 of [STI-428](/STI/issues/STI-428) is still open. Docs only — no storefront code changed, no order placed, no spend, no secret read. |
| 2026-09-28 | `6a25272` | **This record was self-contradictory on `main`: finding (5) still asserted `0` members in `featured` while the table above and the `aad537e` row said it was populated. Finding (5) corrected. Five raw `curl` HTML artifacts found committed in the repo root by my own PR #94 and removed. Revenue still zero, still one cause.** Workspace guard passed: `$PAPERCLIP_WORKSPACE_CWD/stitch-ash`, `git remote -v` → `origin https://github.com/olivecasazza/stitch-ash.git` for both fetch and push; `git fetch origin` → `origin/main` = `6a25272d03461ff8c62b0dcbe76317d873e2ab98` ("fix(STI-547): drop the production-status line from the product image plate (#98)"). **The defect: an assertion of current state had gone stale in place.** The `aad537e` row below had already re-measured `/collection/featured` as populated, and the current-state table above already said "3 of 3 members render" — but finding (5), higher up the same page, still read "has zero *members* … renders **'No products found.'**". A reader taking the numbered findings as current would have re-derived the withdrawn "empty catalog" claim, which is precisely the failure the `a7151fd` row was opened to undo. **Correction is to finding (5) only; the `a65331a` and `a7151fd` log rows are left verbatim** because they recorded what was true at their own commits. The distinction that caused this is now stated in the section itself: numbered findings assert *current* state and must be re-verified or corrected in place; log rows are a dated history and must not be. **Line citation corrected at the same time.** Finding (5) cited `app/components/collection/Products.vue:31-39` and the table cited `:31-40`; neither is right at `6a25272`. Re-read this run: the `useStorefrontData` call is at **`Products.vue:14`**, the `products(` selection spans **`:31-42`** (arguments close at `:39`, selection set at `:42`), and `flattenConnection` is at **`:67`**. There is **no** `import` statement at all in that file and no fallback branch, which is what makes a 3-card render proof of a live response. Both citations updated. **Every other current-state citation re-read at `6a25272` and still exact:** `nuxt.config.ts:37` `mock: false,` preceded by the five-line STI-428 guard comment at `:32-36`, `:38` `apiVersion`, `:39` `publicAccessToken`, `:45-47` the disabled `routeRules` prerender entry; `app/pages/collection/[handle].vue:15` query with the fatal-404 throw at `:36-43`. **The `mock` invariant is unchanged and still mechanical:** `scripts/ci/storefront-mock-gate.sh` present on `6a25272` (5750 bytes) and wired at `.github/workflows/pr-checks.yml:103` (step `:112`). **Live, fetched 2026-09-28T22:2xZ:** `/` → `HTTP 200`, `21888` bytes; `/products` → `HTTP 200`, `20305` bytes; `/collection/featured` → `HTTP 200`, `35140` bytes, `<title>Featured | STITCH AND ASH</title>`, **0** occurrences of "No products found.", all three handles `sku-001`/`sku-002`/`sku-003` linked from the page; `https://www.stitch-ash.com` → `HTTP 200`, `103731` bytes, final `https://www.stitch-ash.com/password`. **Observable real revenue is still zero, still for that one cause: the apex password gate.** **Second defect found and fixed: five raw `curl` artifacts were committed to the repo root.** `a354486` (my own STI-428 PR #94) added `apex.html`, `prev.html`, `p-sku-001.html`, `p-sku-002.html`, `p-sku-003.html` — 212,702 bytes of scraped markup in the repository root, untracked by intent and unignored by mistake. They are now removed and `*.html` is ignored at the root. **Checked for leakage before deleting:** no `shpat_`/`shpss_`/`shpca_`/`shppa_`/`shpsb_` string in any of the five, and no email address in `apex.html` — so this is repo hygiene, not a secret exposure, and no rotation is required. The reason it matters anyway: those files are *frozen* copies of live pages sitting where the next agent's `grep` will find them, and `apex.html` is a snapshot of the password gate — a future reader could reasonably cite it as current evidence of the gate rather than re-fetching. **Scope note:** this run did **not** re-run the `POST /api/checkout` control test, so the "Public Storefront API path alive / returns a cart" row is **carried forward unverified**, not re-confirmed. The merch-lead `AGENTS.md` remains unedited by me and board approval `f4a5765d-3226-4a41-91fe-f4634a0a60fb` is still `pending`, so scope item 2 of [STI-428](/STI/issues/STI-428) is still open. Docs and `.gitignore` only — no storefront code changed, no deploy triggered, no order placed, no spend, no secret read. |

## Related

- [STI-428](/STI/issues/STI-428) — the record's authoring issue.
- [STI-398](/STI/issues/STI-398) — operator-owned correction of the stale
  `mock = true` parenthetical in the merch-lead agent instructions.
- [STI-517](/STI/issues/STI-517) / [PR #86](https://github.com/olivecasazza/stitch-ash/pull/86) — the CI
  gate that now makes `mock: false` an enforced invariant on `main`, so the stale
  parenthetical above is a reporting defect and not a production risk.
- [STI-457](/STI/issues/STI-457) — the locked Online Store channel; an operator
  action, and a candidate root cause **upstream** of the password gate.
- [STI-327](/STI/issues/STI-327) — production apex password gate; the reason
  revenue is unobservable.
- [STI-319](/STI/issues/STI-319) — the change that set `mock: false`.
- `TODO (STI-318)` in `app/data/products.ts:116` — replacing placeholder
  `imageSrc` values and handles with real Shopify ids. Load-bearing for
  go-live, not cosmetic: this is the work that stands between an un-gated
  apex and a store that can sell with real photography. (**Superseded
  clause:** this bullet previously read "with the live catalog empty, this
  is the work that…" — the catalog was never empty, and the collection
  membership gap that *was* real is now closed; see [STI-497](/STI/issues/STI-497)
  below and the `aad537e` re-verification row. The photo gap is still open.)
- [STI-471](/STI/issues/STI-471) — collection membership was invisible to the
  reconciler, so `catalog:plan` reported 0 pending actions. Fixed by
  `fb5fe11`; membership declared at `catalog/collections/featured.yaml`.
- [STI-497](/STI/issues/STI-497) / [STI-498](/STI/issues/STI-498) — the Admin
  data change that populated `featured` with all 3 products on 2026-09-28, and
  its independent verification. `/collection/featured` is no longer an empty
  state. This is the second of the two current-state rows corrected at `aad537e`.
- [STI-328](/STI/issues/STI-328) — GTM readiness package; owns the KPI report
  scaffold, which consumes this baseline.
- [2026-07-21 — Shopify as system of record](2026-07-21-shopify-as-system-of-record.md)
  — why live product data comes from Shopify, not from this codebase.
