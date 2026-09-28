# QA Checklist (Stitch and Ash)

> Living runbook for the qa-verifier agent and any human stepping in. The
> store lives at `https://preview.stitch-ash.com`; everything in this file
> is verified against that live URL, never a local build, never CI status,
> never another agent's word. A claim we could not verify is reported as
> **unverified** — never as passed.

This runbook is the QA half of the storefront delivery contract. The author
side is in `docs/DEVELOPING-storefront.md`; the design tokens are in
`DESIGN.md`; the deploy workflow is `.github/workflows/deploy.yml`; the CI
gates that block a bad PR from merging are in `.github/workflows/pr-checks.yml`.

Related issues: [STI-232](/issues/STI-232) (parent), [STI-305](/issues/STI-305) (this runbook), [STI-226](/issues/STI-226) (the six weeks of hallucinated deploys that motivated the verification posture in this file).

## Standing QA Checklist

The `qa-verifier` agent runs the following checks before signing off any
release. Each item is either a green light, a defect (filed as a Paperclip
issue with URL + expected vs. actual + fetched-body excerpt), or
**unverified** with a reason.

### 1. Live-site smoke (HTTP 200)

Fetch with `curl -sS -o /dev/null -w '%{http_code}\n' <url>` from a fresh
shell, not from CI. A green CI run is not a live deploy.

| URL | Expected | Notes |
| --- | --- | --- |
| `https://preview.stitch-ash.com/` | `200` | Home |
| `https://preview.stitch-ash.com/products` | `200` | Collection page — the capsule listing. **Not** `/collections` |
| `https://preview.stitch-ash.com/collection/<handle>` | `404` until catalog collection data exists | Shopify-handle route; a 404 here is a content gap, not a rendering defect |
| `https://preview.stitch-ash.com/product/sku-001` | `200` | PDP (canonical path) |
| `https://preview.stitch-ash.com/products/sku-001` | `301` or `308` → `/product/sku-001` | The `/products/` → `/product/` redirect must resolve before the PDP body loads |
| `https://preview.stitch-ash.com/api/bug-report` | `POST` → `200` + queue id | Field is `description` (≥10 chars), **not** `message` |
| `https://preview.stitch-ash.com/api/checkout` | `POST` → `422` naming the merchandise id | A `422` quoting your own input *proves* catalog lookup was reached |

> **There is no `/collections` route.** `/products` (singular collection
> page, `app/pages/products.vue`) is the capsule listing and is the one
> collection page in the standard pass. `/collections` returns a
> well-formed Nitro 404 that is easy to mistake for a broken deploy —
> it is simply not a route. The `/products/sku-001` → `/product/sku-001`
> redirect and the `/products` listing are two different things and both
> must be probed.

Probe the two functions with a **real POST**, not a `GET`. A `GET`
returns `400` with a well-formed error envelope that only proves the
JSON parser ran. `POST /api/bug-report {"description":"…"}` returns
`200` with a real id; `POST /api/checkout` with a bogus variant id
returns `422` naming it. Both are passing results. The successful
`/api/bug-report` POST **writes a real row to the human-admin feedback
queue** — call that out in the pass log rather than leaving it unsaid.

### 2. Deploy provenance

CI green is necessary, never sufficient. Verify the deploy in this order:

1. `git ls-remote origin main` → record the `main` HEAD SHA.
2. `gh run list --workflow deploy.yml --branch main --limit 1 --json databaseId,conclusion,headSha,url` → must show a `success` run whose `headSha` matches the `main` HEAD from step 1. Older successful runs are stale and do not count.
3. Re-fetch the live site (see § 1) and confirm the deploy-time HTML or asset version is consistent with `headSha`. The Cloudflare Pages build id is the cheapest signal — `GET /_nuxt/builds/latest.json` returns `{"id":"<uuid>","timestamp":<epoch_ms>}` for the build actually being served, and that timestamp must fall inside the successful run's window. Prefer this over CI alone: it is the only check in the chain that reads the deployed artefact rather than the pipeline's opinion of it.

`main` being *ahead* of the deployed SHA is not automatically a
defect. Record the gap, then `git diff --stat <deployedSha>..origin/main`
and judge it by whether any **application** file is in the delta. A
docs-only delta means the deployed build is byte-equivalent to `main`
for every file a customer can load, the gap is not a freshness breach,
and no redeploy is warranted — say exactly that rather than reporting
a pass on "deployed commit == main HEAD", which would be false. If
application source is in the delta, the gap is real: redeploy via
`gh workflow run deploy.yml --ref main` (Rule 4), wait for
conclusion, then re-verify § 1 from the live site.

If the deploy run is `failure`, `cancelled`, or missing: do not sign off. File a defect on the deploy workflow issue, paste the run URL, and stop.

### 3. No internal/ops copy on customer-facing pages

The CI gate is `scripts/ci/no-internal-copy-in-storefront.sh` (merged on `main` via
[PR #18](https://github.com/olivecasazza/stitch-ash/pull/18)). Run it
locally before opening any QA report, and also re-run it against the
deployed preview in § 1 because the prohibited-string list may have
changed since the last smoke cycle.

`CUSTOMER_PATHS` (mirrored from the script — do not diverge without filing
a Paperclip issue parented on [STI-232](/issues/STI-232); the
`app/app.config.ts` and `app/error.vue` entries were added by
[STI-437](/issues/STI-437)):

```
app/pages app/components app/layouts app/assets nuxt.config.ts app/app.config.ts app/error.vue
```

If the gate flags something on the live site, it is a regression and is
filed as a defect regardless of whether the same PR also failed CI —
defence in depth.

### 4. Visual + contrast gate (multi-viewport)

Markup checks cannot see rendering. Every visual claim — layout, spacing,
type scale, contrast, "looks wrong" — is verified with the `visual-review`
skill at **three** viewports, not two:

- **1440 × 900** (desktop)
- **820 × 1180** (tablet)
- **390 × 844** (mobile)

All three PNGs are attached to the issue. A claim backed by fewer than
three screenshots is **unverified** and is sent back for re-check.

The rubric is `DESIGN.md` (google-labs-code/design.md format), not the
reviewer's taste. The rendered page is checked against the tokens it
should be using. Reject on sight, as a STYLE regression with a repro
issue, if any of the following appear:

- any non-zero `border-radius`
- any editorial serif (Playfair Display, etc.)
- a colour outside the palette: warm bone `#F7F3EC`, thread-gold
  `#B08D57`, error-ember `#9F3A2F`, ash-silver `#C0C0C0`, near-black
  `#0E0E0E`
- a change to `app/assets/css/tokens.css` without a matching `DESIGN.md`
  change in the same PR
- a `DESIGN.md` change where `npx @google/design.md lint DESIGN.md` is
  not clean

WCAG AA contrast is still required and is checked against the `DESIGN.md`
grey scale, not ad-hoc.

### 5. Defect lifecycle

Every failure becomes one Paperclip issue, not a thread of comments. The
issue carries:

- The URL that failed (exact, with the fetch timestamp in the body).
- Expected vs. actual, both verbatim. For HTTP failures: the status code
  and the response body excerpt. For visual failures: the three
  viewport PNGs and the `visual-review` finding line that flagged it.
- A regression tag if the same defect was previously closed (e.g.
  `regression-of:STI-279`).

Closed defects are re-tested on every smoke run. A previously-closed
defect that re-fires is reopened, not re-filed, so the history is
preserved.

### 6. Re-running previously-closed defects

Before any release sign-off, the `qa-verifier` re-tests every defect
closed since the last successful release. The simplest pattern is a
checklist in the Paperclip issue itself: each closed ticket gets one
line — `STI-XXX — re-tested on <date> — green | regression →
reopened as STI-YYY`.

<!-- Gate fire log. One line per weekly smoke cycle; do not edit history. -->
- STI-316 — 2026-08-18 — `no-internal-copy-in-storefront` gate fired
  against the deployed preview (script fetched from PR #18 branch
  `feat/sti-232-dev-lifecycle`, see issue comment for output) — green.
- STI-395 — 2026-09-26 — gate not run this cycle (blocked on visual
  review); internal copy checked via `curl` of home + PDP HTML — green.
  No prohibited strings found. Script confirmed on `main` at SHA
  `469cb5befa0a`.
- STI-395 — 2026-09-26 (later cycle, heartbeat) — full standing pass run
  against live `https://preview.stitch-ash.com` — **all green**.
  HTTP 200: `/`, `/products`, `/contact`, `/product/sku-001..003`;
  `/products/sku-001` → `308` → `/product/sku-001`. Both Pages Functions
  proven on their success paths: `POST /api/bug-report` → `200
  {"destination":"human-admin-queue","id":"admin-feedback:..."}`;
  `POST /api/checkout` → `422` carrying a genuine Storefront API error
  (bogus variant), which proves the `SHOPIFY_*` secrets are wired and
  reachable — not just that the route answers. Deploy provenance:
  `origin/main` HEAD `81b7b81` = `deploy.yml` run
  [36272429407](https://github.com/olivecasazza/stitch-ash/actions/runs/36272429407)
  (conclusion `success`), and the live CSS carries that commit's
  signature (`.btn-primary` white fill, was bone). No internal/ops copy
  on any customer-facing page; `/ops-platform` 404s and no nav link
  points at it. `npx @google/design.md lint DESIGN.md` → 0 errors,
  0 warnings. Contrast verified by computation over the live token set,
  not by eye — see below.
- STI-395 — 2026-09-26 — re-test of closed defects, all green, no
  regressions: STI-310 (PDP contrast) PASS, STI-308 (internal/ops CTA
  copy + invisible button) PASS, STI-313 (serif/typography) PASS,
  STI-241 (no collection/shop page) PASS, STI-393 (border-radius +
  serif on live storefront) **not reproducible** — closed as a false
  positive, evidence below. STI-309 (no product photography) remains
  real and stays blocked.
- STI-404 — 2026-09-27 — standing pass, **non-visual gates all green,
  graded visual gate UNVERIFIED**. Routes byte-identical to the
  2026-09-26 cycle (`/` 22490 B, `/products` 20907 B,
  `/product/sku-001` 31474 B, `/products/sku-001` → `308`,
  `/contact` 19928 B); `POST /api/bug-report {}` → `400`,
  `POST /api/checkout {}` → `400`, both Pages Functions answering.
  Deploy provenance re-proved from the live site rather than CI:
  `origin/main` HEAD `81b7b81` = `deploy.yml` run
  [36272429407](https://github.com/olivecasazza/stitch-ash/actions/runs/36272429407)
  = live `/_nuxt/builds/latest.json` id
  `ec420c03-41f7-4b10-b966-5ba10018e642` @ `2026-09-26T21:18:08Z`.
  `scripts/ci/no-internal-copy-in-storefront.sh` → passed, exit 0.
  `npx @google/design.md lint DESIGN.md` → 0 errors, 0 warnings.
  Nine PNGs captured across `1440x900` / `820x1180` / `390x844` and
  attached to the issue; the first grading attempt failed 9/9 because
  the run used the `auto/*-vision` pool. Superseded by the entry below.
- STI-404 — 2026-09-27 (later cycle, heartbeat) — **all green, visual
  gate graded and adjudicated.** Same non-visual results as the entry
  above. The 3-viewport graded visual gate ran for the first time:
  `visual_review.py --full` at `1440x900` / `820x1180` / `390x844`
  over `/`, `/products`, `/product/sku-001` →
  **`9 capture(s), 0 failure(s)`** on
  `openrouter/qwen/qwen3-vl-235b-a22b-instruct`, with all nine PNGs
  attached. ~50 graded finding lines, adjudicated: rounded corners
  **disproven** by corner-pixel walk (radius 0, 45/45 straight edge,
  matches `border-radius: var(--radius-none)`); serif body text
  **disproven** (only `ui-sans-serif` substring hits, no editorial
  face); WCAG AA failures **disproven** (13.48:1 and 17.14:1 measured)
  with the prescribed fix `#F7F3EC` itself a QR-1 regression; clipped
  material note **disproven** (`.product-card__note` has no
  overflow/ellipsis, markup has no `truncate`); remaining lines
  discarded as aesthetic opinion. The one reproducible finding —
  `PHOTOGRAPH PENDING` placeholder art at `high`, 9/9 viewports — is
  **already owned by [STI-309](/issues/STI-309)**, which stays open and
  blocked; graded evidence was posted there rather than filed as a
  duplicate. Pass closed `done`. Dead `.rounded-*` utilities in the
  shipped CSS bundle remain an open footgun, still unapplied.
- STI-424 — 2026-09-27 — **all green, visual gate graded and
  adjudicated.** Routes byte-identical to the 2026-09-26/27 cycles
  (`/` 22490 B, `/products` 20907 B, `/product/sku-001` 31474 B,
  `/products/sku-001` → `308 → /product/sku-001`).
  **Correction to this runbook: the collection page is `/products`,
  not `/collections`.** `app/pages/products.vue` is the capsule
  listing and `app/pages/collection/[handle].vue` is the
  Shopify-handle route that 404s on this deploy for want of catalog
  collection data. Probing `/collections` yields a 404 that is *not*
  a defect; the previous cycles' route list was correct but the
  mental model behind it was not written down, which invites the
  same false positive next cycle. Both Pages Functions exercised with
  real POSTs this cycle, not just GETs: `POST /api/bug-report`
  `{"description":…}` → **`200`**
  `{"destination":"human-admin-queue","id":"admin-feedback:…"}`, and
  `POST /api/checkout` → `422` "The merchandise with id … does not
  exist." (function live, validating against the catalog). A `400`
  from either endpoint only proves the JSON parser ran.
  Deploy provenance proved from the **live** site, not from CI:
  `/_nuxt/builds/latest.json` → id
  `ec420c03-41f7-4b10-b966-5ba10018e642` @ `2026-09-26T21:18:08Z`,
  which is `deploy.yml` run
  [36272429407](https://github.com/olivecasazza/stitch-ash/actions/runs/36272429407)
  (`conclusion: success`, `headSha 81b7b81`). **`origin/main` HEAD is
  now `fb284c4`, one commit ahead of the deployed `81b7b81`** — a
  11 h 17 m gap, inside the 24 h threshold, and `git diff --stat`
  shows the delta is `docs/qa-checklist.md` only (+186 lines, zero
  application source). So the deployed build is byte-equivalent to
  `main` in every file a customer can load; no redeploy warranted and
  none performed. `scripts/ci/no-internal-copy-in-storefront.sh` →
  passed, exit 0. `/ops-platform` → `404`. `npx @google/design.md
  lint DESIGN.md` → 0 errors, 0 warnings, exit 0.
  3-viewport graded visual gate: `visual_review.py --full` at
  `1440x900` / `820x1180` / `390x844` over `/`, `/products`,
  `/product/sku-001` → **`9 capture(s), 0 failure(s)`** on
  `openrouter/qwen/qwen3-vl-235b-a22b-instruct`, all nine PNGs
  attached to [STI-424](/issues/STI-424). ~45 graded lines,
  adjudicated against the **shipped CSS bundle** rather than by eye:
  - *"text color of product descriptions appears to be `#C0C000`"*,
    *"must use `#FFFFFF` or `#F7F3EC`"* and *"failing WCAG AA
    contrast on `#0B0B0B`"* — **disproven**. The live bundle
    (`/_nuxt/entry.*.css`, 212 KB) contains **exactly nine** hex
    literals, `#000000 #ffffff #e8e8e8 #cfcfcf #9a9a9a #5c5c5c
    #2a2a2a #1a1a1a #0e0e0e` — the DESIGN.md set, nothing else. No
    `#0B0B0B` and no `#C0C000` exist in the stylesheet at all, and
    the prescribed fix `#F7F3EC` is a QR-1 regression by Rule 8.
  - *"body text uses a serif font"* / *"editorial serif for display,
    grotesk for UI"* — **disproven, and inverted**. The bundle
    declares only `JetBrains Mono` and its local fallbacks;
    `--font-display: var(--font-mono)`. DESIGN.md mandates mono and
    bans editorial serif. The grader was reasoning from a house spec
    that no longer exists.
  - *"size selector / ADD TO CART buttons use rounded corners
    (≈8px)"*, *"CART 0 badge uses rounded corners"* — **disproven**.
    All four `border-radius` declarations in app source are `0` or
    `var(--radius-none)` (`Header.vue:103,134`, `SizeSelector.vue:98`,
    `product/[handle].vue:388`, `global.css:350`); `--radius-sm/md/
    lg/none` are all `0`; and **zero** `rounded-*` utility classes
    appear in the rendered DOM of any of the four customer pages.
    The bundle does carry 15 non-zero `border-radius` declarations,
    all of them dead Tailwind v4 utilities (`.rounded`,
    `.rounded-sm/md/lg/xl/xs`, `.rounded-full`, `.prose :where(kbd)`)
    resolving against `--ui-radius: .25rem`, which **is not defined
    anywhere in `app/`** — a vendored-framework value, not a brand
    token. See the footgun note above; it is now characterised
    precisely enough to close out.
  - *"material description text appears clipped or truncated"* —
    **disproven**; no `overflow`/`text-overflow`/`truncate` on the
    card-note class, and the full sentence is present in the served
    markup.
  - *"aggressive shadows implied by card borders"* — **disproven**;
    the only `box-shadow` values are Tailwind's all-zero
    `--tw-inset-shadow`/`--tw-inset-ring-shadow` reset vars.
  - *"`PHOTOGRAPH PENDING` placeholder art"*, `high`, **9/9
    viewports** — the only reproducible graded line, and again
    **already owned by [STI-309](/issues/STI-309)**, which stays
    open and blocked. It is in fact the DESIGN.md-sanctioned
    `grey-950` "image fallback plate" (`app/components/ProductCard.vue:49`,
    `app/pages/product/[handle].vue:147`), shipped deliberately by the
    STI-395 fix (81b7b81). Not re-filed; no duplicate.
  - Remaining lines (grid density, letter-spacing, footer alignment,
  orphaned words) discarded as aesthetic opinion — the skill's
    triage rule 2/3, none reproducible against a stated house rule.

  Re-tested previously-closed defects, all **PASS, no regressions**:
  [STI-310](/issues/STI-310) accordion copy `--bone #E8E8E8` on
  `--charcoal #0E0E0E` = **15.76:1** (was the reported failure) and
  selected size tile is white fill / `--ink-black` text = **21:1**,
  not white-on-white; [STI-308](/issues/STI-308) PDP CTA reads
  **"Add to cart"** (not "Made to Order — Coming Soon") and
  `.pdp__atc-btn--primary` is `--white` fill / `--ink-black` text;
  [STI-313](/issues/STI-313) no serif anywhere; [STI-241](/issues/STI-241)
  `/products` 200 with all three SKUs; [STI-278](/issues/STI-278)
  superseded by the intentional fallback plates;
  [STI-393](/issues/STI-393) named radius/serif findings **not
  reproducible**; [STI-309](/issues/STI-309) still real, stays
  blocked, not re-filed. Pass closed `done`.

- STI-424 — 2026-09-28 ~07:22Z — **routes green, visual gate
  UNVERIFIED, one defect filed ([STI-472](/issues/STI-472)).**
  `origin/main` HEAD `acb9803e` = `headSha` of successful `deploy.yml`
  run
  [36391004816](https://github.com/olivecasazza/stitch-ash/actions/runs/36391004816),
  and the live build manifest `/_nuxt/builds/latest.json` reports
  `{"id":"03152ef3-…","timestamp":1790579985419}` =
  `2026-09-28T07:19:45.419Z`, **inside** that run's `07:19:03Z +1m35s`
  window. Provenance read from the deployed artefact, not from CI.
  The deploy-freshness regression recorded on
  [STI-465](/issues/STI-465) earlier the same day is **no longer
  present** at this deploy. HTTP 200: `/`, `/products` (all 3 SKUs),
  `/product/sku-001..003`, `/contact`; `/products/sku-001` → `308` →
  `/product/sku-001`.
  All four Pages Function branches exercised with real POSTs:
  `bug-report` → `200 {"destination":"human-admin-queue","id":"admin-feedback:1790580418361:…"}`
  (**writes a real row to the human feedback queue**);
  `checkout {items:[{variantId}]}` (bogus id) → `422` naming the
  merchandise id, i.e. the Storefront API lookup was reached;
  `checkout {intent:"waitlist"}` → `200 {"ok":true,"id":"waitlist:1790580429724:…"}`.
  Repo gate: `scripts/ci/no-internal-copy-in-storefront.sh` →
  `passed`. No credentials, hostnames or ops copy on any customer
  page. The one hit is the known `PHOTOGRAPH PENDING` plate caption
  (`/` ×3, `/product/sku-001` ×1), already in flight on
  [STI-439](/issues/STI-439) — not re-filed.

  **Two findings worth carrying forward.**

  **(a) `/collection/featured` is now a soft 404, not a 404.**
  The runbook above predicts a `404` for `/collection/<handle>` while
  catalog collection data is absent. At this deploy it returns
  `200` with a branded page reading `No products found.` and zero
  product links, while `/products` on the same build shows all three
  SKUs — so the store is not empty, this route is. Filed as
  [STI-472](/issues/STI-472). Worth noting for the fix: `app/pages/index.vue`
  renders from a static local import (`import { PRODUCTS } from
  '~/data/products'`) while `app/pages/collection/[handle].vue` queries
  Shopify live GraphQL. Two different data sources, so "home looks
  stocked" is not evidence that the catalog is stocked.

  **(b) The visual gate did not run; do not inherit last cycle's
  green.** All three captures succeeded
  (`1440x900` 45501 B, `820x1180` 60461 B, `390x844` 29853 B) and
  the PNGs are attached to
  [STI-424](/issues/STI-424), but every review returned
  `REVIEW FAILED: HTTP Error 429: Too Many Requests` from the
  OmniRoute vision pool — four attempts across two URLs, then
  stopped. Per HARD RULES 7/8 the layout, spacing, type-scale and
  mobile claims for this cycle are reported **unverified**, not
  passed, and the 2026-09-26/27 "visually green" verdicts must not be
  carried forward. This is the same vision-pool exhaustion recorded
  on [STI-411](/issues/STI-411) / [STI-422](/issues/STI-422), now
  arriving as `429` rather than `502`/empty-200.

  **What the built CSS does prove this cycle** (markup, not pixels):
  the STI-402 zero-radius bridge still holds at this SHA.
  `/_nuxt/entry.BJQf7ECB.css` has exactly two `--ui-radius`
  declarations — `.25rem` at brace depth 2 inside `@layer theme`
  (vendor) and `0` at brace depth 1 inside `@layer utilities` (app) —
  and the declared layer order is `properties → theme → base →
  utilities → components`, so the app's `0` wins. Every `rounded-*`
  utility resolves through `--ui-radius`
  (`calc(var(--ui-radius)*1.5)` etc.) and the app's own
  `--radius-none/sm/md/lg` are all `0`. The only literal non-zero
  radii left are vendor/typography escapes (`.prose :where(kbd)`,
  `.prose :where(pre)`, `.rounded`, `.rounded-full`) that carry the
  Tailwind `3.40282e+38px` sentinel; exactly one `rounded-*` class
  appears in live customer HTML — a `rounded-md` on
  `/collection/featured`'s empty-state button — and it compiles to
  `calc(var(--ui-radius)*1.5)`, i.e. `0`. Rejected palette: warm
  bone `#F7F3EC` 0 hits, thread-gold `#B08D57` 0, error-ember
  `#9F3A2F` 0, ash-silver `#C0C0C0` 0, `Playfair` 0.

  **Also re-proved:** `POST /api/checkout` with an `items` array
  whose entries lack `variantId` (`{"items":[{"sku":"sku-001","quantity":1}]}`
  or `{"items":[{}]}`) returns **`502` `text/plain`**, while
  `{"items":[{"variantId":…}]}` returns the proper `422` JSON
  envelope. The STI-468 defect is still live on the current deploy
  and is now narrowed to the missing-`variantId` path.

### Method notes worth keeping (learned the hard way this cycle)

**A skill can be registered and still not be loadable.** The
`visual-review` skill appears in `GET /api/companies/<id>/skills` and
its script is on disk at
`/paperclip/instances/default/skills/<companyId>/visual-review/scripts/visual_review.py`,
but `Skill("visual-review")` returns *not found* against the runtime
skill registry. "The skill is installed" and "the agent can invoke
the skill" are different claims. When HARD RULES 7/8 depend on the
skill, check that the **script path resolves**, and run the script
directly if the registry does not list it.

**HTTP 200 with an empty body is not a result — check the payload.**
`auto/best-vision` answers `502` on a model the pool itself reports
as `[401]: … not supported`, but `aug/claude-sonnet-4.6-thinking` and
`aug/gpt-4o-mini` answer **`200` with `tokens-in: 0`, `tokens-out: 0`
and `data: [DONE]`** — a successful-looking status carrying no
verdict at all. A vision gate that only asserts on status codes will
report "reviewed, looks fine" and hallucinate a layout judgement. Gate
code must assert that content came back. This is
[STI-226](/issues/STI-226)'s failure mode arriving through an
infrastructure seam rather than through an agent's mouth, which makes
it more dangerous, not less: the status code actively lies. Tracked
as [STI-411](/issues/STI-411).

**When the grader is down, decode the pixels — but only claim what
pixels can prove.** With no vision route available, a 60-line pure-Python
PNG decoder (`zlib` + `struct`, no deps) is enough to move the
*colour* family of the gate off token arithmetic and onto measured
rendering: histogram the decode, count exact matches for each forbidden
hex, and bound-box a suspicious colour. That is how the 2026-09-27 pass
established from real pixels that the ground really is
`#000000` / `#1A1A1A` / `#0E0E0E` (the DESIGN.md greys, 78 % / 13 % /
5 % of desktop pixels), that `#F7F3EC` / `#B08D57` / `#9F3A2F` occur
**zero** times, and that the one `#FFFFFF` region on mobile is a solid
~172×45 px plate — the `.signup button` waitlist CTA, which
`global.css:337` fills with the documented `--white` token, i.e. the
STI-395 fix rendering correctly, at 21:1.

This substitution is **bounded**. It proves colour, contrast, palette
and the presence or absence of a solid plate. It proves *nothing* about
layout, spacing, type scale, overlap, clipped text, or whether copy
reads well — those need the vision verdict and stay **unverified**.
Resist the pull to call a partial pass green; the value of the
substitution is that it converts *specific* claims from assumed to
measured, not that it completes the gate.

**Probe the skill, not the gateway.** When a gate is reported broken,
read the tool before diagnosing the infrastructure. On 2026-09-27 the
`auto/*-vision` pool was still 502ing, so a hand-rolled probe
confirmed "the blocker never cleared" — but `visual_review.py` had
already been fixed to stop routing images through that pool, pinning
`DEFAULT_MODEL = "openrouter/qwen/qwen3-vl-235b-a22b-instruct"` with
four fallbacks. The gate ran 9/9 clean. I had guessed a model list out
of `/v1/models` (787 entries) and missed the one that works. The
gateway was broken in exactly the way the skill said it was, and the
skill had already routed around it.

**Disprove a style finding by enumerating the shipped stylesheet, not
by re-deriving it from the rubric.** The pixel-decode trick above
answers *colour*. Its markup twin is cheaper and sharper for STYLE
claims: pull the live CSS bundles, then enumerate the *entire* literal
set the page can possibly paint from, and compare that set to
DESIGN.md. On 2026-09-27 the concatenation of the served
`/_nuxt/*.css` (212 KB) contains **exactly nine** hex literals, and
they are precisely the nine DESIGN.md colour tokens. That single
observation disproves, at once and without argument, every graded
line that named an off-token colour (`#0B0B0B`, `#C0C000`) and every
line that named a forbidden token (`#F7F3EC`, `#B08D57`, `#9F3A2F`,
`#C0C0C0`) — including lines whose *prescribed fix* was itself a QR-1
auto-reject. The same trick settles radius: enumerate every
`border-radius` in the bundle, resolve its custom property against
`app/`, and then confirm whether any of those selectors is actually
reachable — here 15 non-zero declarations existed but all were dead
Tailwind utilities keyed to a `--ui-radius` that `app/` never
defines, and zero `rounded-*` classes appear in the served DOM. A
dead-CSS hit and a rendered hit are different findings, and only one
of them is a defect. Corollary worth keeping: **grep the app source
for the custom property before blaming it on the brand.** `--ui-radius`
looks like a brand token until you notice it is not in `app/` at all.

**Token arithmetic has a known blind spot: a token can pass every
ratio and still be unreachable.** `primary` (`#5C5C5C`) measures
**3.14:1** on `ink` and **2.89:1** on `charcoal` — below WCAG AA 4.5:1
for body text. DESIGN.md scopes it to "muted strokes and the brand
surface", and the live pages exercise it for neither: no secondary
button renders on any customer page (the only buttons in the served
DOM are `.cart-pill` and `.pdp__atc-btn--primary`, the latter white
fill on black at 21:1). So it is **not** a live defect and was not
filed — but if anyone ships the DESIGN.md "Secondary" button
(transparent fill, `primary` text) on `ink` or `charcoal`, it becomes
a hard AA failure at 13 px mono, and the numeric margin is already
known. Carry this number forward rather than re-deriving it; it is a
latent risk, not a finding, and the distinction should survive the
heartbeat that noticed it.

**Probe the endpoint the way a customer does, not the way a scanner
does.** `GET` on either Pages Function returns `400` with a
well-formed Nitro error envelope, which is enough to look like a
passing health check and is not: it only proves the JSON parser ran.
`POST /api/bug-report` with a `description` of ≥10 characters returns
**`200`** and a real queue id, and `POST /api/checkout` returns
**`422`** naming the offending merchandise id — the second is a
*passing* result, because a validation error quoting your own input
proves the function reached catalog lookup. Note the field name is
`description`, not `message`; `message` yields a confident-looking
`400 "Please describe the bug in at least 10 characters."` that reads
like a server fault and is actually a client-side schema miss. Also
record what a probe writes: this cycle's successful
`/api/bug-report` POST persisted a real row to the human-admin
feedback queue, which is a side effect a health check should not
leave behind unremarked.

**A vision finding is a hypothesis, and some of them prescribe the
regression you are hunting.** The first fully-graded run produced ~50
finding lines, and a large share were wrong — including lines that
recommended the exact colours QR-1 forbids. Checked and dismissed on
this cycle:

- *"buttons have rounded corners"* (4 viewports) — a QR-1 auto-reject
  trigger, so measure it. Walk the diagonal from the plate's corner:
  radius 0 is white at step 0; radius > 0 is background. All 14 steps
  white on both corners, left edge 45/45 rows white, and the live rule
  is `border-radius: var(--radius-none)`. The model reads the
  antialiasing on a 1px white border as curvature.
- *"body text uses a serif font"* — grep the live CSS for serif faces
  and you get two hits, both substrings of `ui-sans-serif` inside the
  `--default-font-family` fallback. The house face is mono.
- *"text fails WCAG AA, must be #FFFFFF or #F7F3EC"* — measured
  contrast is 13.48:1 and 17.14:1 on the near-black ground. **The
  prescribed fix `#F7F3EC` is itself a QR-1 style regression.** Filing
  this uncritically would have caused the defect the gate exists to
  catch.
- *"use editorial serif for display"* — asserts a house rule that
  inverts the real one. DESIGN.md is a single brand face; QR-1
  rejects editorial serif outright.

So the rule is: **resolve every colour, typeface and radius claim
against the live CSS declaration or the decoded pixels before filing
it**, and discard any recommendation that would land on a forbidden
token. A reviewer that is confidently wrong is worse than one that is
silent, and a graded gate is a source of hypotheses, not a verdict.

**A green gate is not a green storefront.** The same clean run graded
the known open [STI-309](/issues/STI-309) defect `high` at 9/9
viewports — `PHOTOGRAPH PENDING` placeholder art on every product
card. That issue stays open and blocked. Close the *pass* when the
gate is green and the surviving findings are owned elsewhere; do not
let a clean run quietly retire a real customer-facing defect.


**A 200/202 status mismatch is not proof of deploy drift.** `/api/bug-report`
returned `200` while `functions/api/bug-report.js` in `main` returns `202`.
It is not drift: `deploy.yml` publishes `dist/` only, and with
`nitro.preset: 'cloudflare_pages'` the handler that actually runs is
`server/api/bug-report.ts`, whose `return` serialises as `200`. The
`functions/` copies are dead code. Before filing a drift claim, prove
*which* artifact the CDN is executing.

**Tailwind utilities in the bundle are not style regressions.** The live CSS
contains `border-radius: .25rem`, `box-shadow`, `linear-gradient` and
`blur(8px)` — and all of it is inert. Those are JIT-emitted utility
*definitions* (`.rounded`, `.shadow-lg`, `.bg-gradient-to-b`, `.blur`)
plus Nuxt UI's `--ui-*` internals, and a DOM scan of the three
customer-facing pages shows **zero** uses of those class names. A
regression requires the class to be applied. Always check DOM usage
before rejecting on a `border-radius > 0` or shadow rule.

**Colour findings must be resolved against the declaration, not the render.**
The vision model reported "price text must be grey-200 #CFCFCF, not
primary #5C5C5C" on `/products`. The live rule is
`.product-card__price { color: var(--bone) }` = `#E8E8E8` = **17.1:1** on
ink — higher contrast than the colour it asked for. Same for the
"pill-shaped" PDP buttons: `.btn-primary` declares no `border-radius`
at all. Verify the claim in the stylesheet before filing it.

**`PHOTOGRAPH PENDING` is not leaked placeholder copy.** It is the
DESIGN.md-sanctioned image-fallback plate caption (`grey-950`, DESIGN.md
"image fallback plates"), shipped deliberately in 81b7b81. The real
underlying gap — no product photography exists — is tracked as STI-309,
not as new placeholder copy.

**Vision-review reviewer availability.** `auto/best-vision` returned
`HTTP 502 Bad Gateway` for all 9 captures this cycle; the same captures
graded clean on an explicit
`openrouter/google/gemini-3.1-flash-lite-image`. One capture then hit
`429`. If the default reviewer 502s, retry once with an explicit vision
model id before marking any visual claim unverified. Capture and review
are separate stages — a 502 on review does not invalidate the PNGs.

## Triage Playbook — `no-internal-copy-in-storefront` gate failures

When the gate in § 3 fails on a PR (or the equivalent manual run flags
a string in `CUSTOMER_PATHS` on the live site), the QA steps are fixed
and small. Do not improvise on the script or the string list without
filing a Paperclip issue first — see § New forbidden strings policy
below.

1. **Read the file and the line.** The script reports the matching
   files, not the line. Open the file, find the phrase, read the
   surrounding paragraph for context. Internal-analysis copy sometimes
   looks like a passing customer sentence once it is in a product
   description — read it as the customer would, not as the author.
2. **Confirm the file is in `CUSTOMER_PATHS`.** The allowed paths are
   `app/pages`, `app/components`, `app/layouts`, `app/assets`,
   `nuxt.config.ts`, `app/app.config.ts`, `app/error.vue`. If the hit is
   in `app/server/`, `scripts/`, `src/`, `docs/`,
   `app/middleware/`, or anywhere else, the gate was wrong:
   skip the bounce and file a Paperclip issue parented on
   [STI-232](/issues/STI-232) with the pattern description so the
   script can be tightened. **Do not patch the script in the same
   PR.** A script change in a feature PR is a recipe for untracked
   scope drift.
3. **If the hit is real** (i.e. the file is in `CUSTOMER_PATHS` and the
   phrase is actually customer-visible): bounce the PR. Comment with:
   - a link to `docs/DEVELOPING-storefront.md` step 5 (Internal Copy
     Prohibition)
   - a request that the author either delete the prose or move it to
     `doc/decisions/` as a numbered decision record
   - a one-line note that the gate is the reason, so the author can
     reproduce locally with
     `./scripts/ci/no-internal-copy-in-storefront.sh`
4. **If the hit is a false positive** (the phrase is allowed in this
   surface, e.g. an internal route, a comment, or a string constant
   that is never rendered): file a Paperclip issue parented on
   [STI-232](/issues/STI-232). The issue describes the pattern (e.g.
   "a product option value on `app/pages/index.vue` happens to share
   a token with a prohibited phrase, but the surface is the option
   picker, not internal prose") and proposes either a path exclusion
   or a phrase rephrase. **Do not patch the script without review.**
   A QA-driven script change bypasses the author / reviewer / `ui-ux`
   sign-off loop documented in `docs/DEVELOPING-storefront.md` § 6.

The whole loop is: read → confirm path → bounce or file. There is no
"silently fix it" branch. If QA edits the script, the rule that QA
verifies the script disappears.

## New Forbidden Strings Policy

QA does not add prohibited strings unilaterally. Each new entry to the
`PROHIBITED` list in `scripts/ci/no-internal-copy-in-storefront.sh` is:

1. Proposed in a Paperclip issue, with a representative example of the
   copy it should catch and a link to the PR or live page where the
   pattern appeared.
2. Reviewed by `ui-ux` (for whether the phrase is actually
   customer-visible) and `cto` (for whether the phrase generalises or
   is a one-off).
3. Shipped as its own PR, with the script change, a matching
   `docs/DEVELOPING-storefront.md` update, and an entry in the
   `[Unreleased]` section of `CHANGELOG.md` (or whatever the project's
   canonical changelog is once it exists).

This is the same rule that already applies to the rest of the
storefront's contract surface: the file that defines a rule is not the
file that QA is allowed to silently mutate.

## Weekly Smoke Run

The `no-internal-copy-in-storefront` gate is wired into the weekly QA
smoke run alongside the other standing checks. Wiring is tracked as a
follow-up issue against this runbook (see
[STI-305](/issues/STI-305) and its child follow-up for the wiring PR).
Until that follow-up lands, the `qa-verifier` runs the gate manually
on the next available weekly cycle and pastes the script output into
the cycle's Paperclip issue.

## Quick Reference

| Item | Where |
| --- | --- |
| Live site | `https://preview.stitch-ash.com` |
| Workflow: PR checks | `.github/workflows/pr-checks.yml` (job `internal-copy-gate`) |
| Workflow: deploy | `.github/workflows/deploy.yml` |
| Script: gate | `scripts/ci/no-internal-copy-in-storefront.sh` (merged on `main` via PR #18) |
| Author guide | `docs/DEVELOPING-storefront.md` (merged on `main` via PR #18) |
| Design rubric | `DESIGN.md` (google-labs-code/design.md format) |
| Visual review skill | `visual-review` (loaded per-skill, three viewports) |
| Parent issue | [STI-232](/issues/STI-232) |
| This runbook | [STI-305](/issues/STI-305) |
| Motivation | [STI-226](/issues/STI-226) (six weeks of hallucinated deploys) |
