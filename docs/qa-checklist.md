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
| `https://preview.stitch-ash.com/collection/featured` | `200` | One collection page. The route is **singular** `/collection/[handle]` (`app/pages/collection/[handle].vue`) and `featured` is a real handle in `src/catalog`. |
| `https://preview.stitch-ash.com/products` | `200` | Shop index (`app/pages/products.vue`) |
| `https://preview.stitch-ash.com/product/sku-001` | `200` | PDP (canonical path) |
| `https://preview.stitch-ash.com/products/sku-001` | `301` or `308` → `/product/sku-001` | The `/products/` → `/product/` redirect must resolve before the PDP body loads |
| `https://preview.stitch-ash.com/api/bug-report` | Pages Function responds (any 2xx/4xx JSON, not a CF 5xx) | POST handler reachable |
| `https://preview.stitch-ash.com/api/checkout` | Pages Function responds (any 2xx/4xx JSON, not a CF 5xx) | POST handler reachable |
| `https://preview.stitch-ash.com/<nonexistent-path>` | `404` **and** `content-type: text/html` | Branded `app/error.vue`. See the `Accept` note below before running this one. |

**The collection route is `/collection/<handle>`, singular — and a plural
`/collections/...` 404 is not a defect.** Until the 2026-09-29 cycle this
table said `/collections/<one>`, and a run that trusted it would have filed a
live defect for a route the app never had. Measured on `main` at `b9b9301` on
2026-09-29:

```sh
curl -s -o /dev/null -w '%{http_code} /collections/featured\n'  …  # 404
curl -s -o /dev/null -w '%{http_code} /collection/featured\n'   …  # 200
curl -s -o /dev/null -w '%{http_code} /collections/essentials\n'…  # 404
```

Confirm the real route before probing it — `find app/pages -name '*.vue'` is
the source of truth, and the handles come from `src/catalog`, not from
guessing a name. If the handle set changes, re-derive it; do not leave a
placeholder in this table.

**The 404 probe must send a browser `Accept` header.** A bare `curl` sends
`Accept: */*`, and Nitro/h3 answers *that* with a JSON error object instead of
the rendered error page. The JSON is correct content negotiation, not a broken
404 — reporting it as a live defect is a false positive:

```sh
curl -sS -D - -o e404.html \
  -H 'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' \
  -w '\nSTATUS=%{http_code} CT=%{content_type}\n' \
  https://preview.stitch-ash.com/<nonexistent-path>
```

A correct response is `404` + `text/html` + a body containing `error-page` and
`Back to home` from `app/error.vue`. Measured on `main` at `acb9803` on
2026-09-28 against `/nope-sti444`: the browser-`Accept` probe returns 15978
bytes of branded HTML (header, cart, `404`, `Back to home`, footer), while the
same path with `Accept: */*` returns a 226-byte JSON object. Only the first is
evidence about `app/error.vue`.

Bots and crawlers that send `Accept: text/html` (including Googlebot) get the
branded page, so this is not an SEO or customer-facing regression.

This exact probe error was filed as a live defect on [STI-444](/issues/STI-444)
and turned out to be a false positive; the reproduction is in that issue.

### 2. Deploy provenance

CI green is necessary, never sufficient. Verify the deploy in this order:

1. `git ls-remote origin main` → record the `main` HEAD SHA.
2. `gh run list --workflow deploy.yml --branch main --limit 1 --json databaseId,conclusion,headSha,url` → must show a `success` run whose `headSha` matches the `main` HEAD from step 1. Older successful runs are stale and do not count. Record the run's `createdAt`/`updatedAt` window.
3. Re-fetch the live site (see § 1) and read the build timestamp:

   ```sh
   curl -sS https://preview.stitch-ash.com/_nuxt/builds/latest.json
   # {"id":"<build-uuid>","timestamp":<epoch-ms>}
   ```

   Convert `timestamp` to UTC and confirm it falls **inside the step 2 run's
   window** (`createdAt` → `updatedAt`) and **after** the previous deploy run's
   `createdAt`. That is the whole test.

**There is no commit-SHA signal on the live site — do not go looking for one.**
An earlier revision of this step told the verifier to read the Cloudflare Pages
build SHA from the response headers or a `/_nuxt/builds/meta/...` manifest. That
mechanism does not exist on this deployment. Measured 2026-09-28 on
[STI-482](/issues/STI-482), all live:

| Probe | Result |
| --- | --- |
| `GET /` response headers | no `etag` SHA, no `x-*-commit`, no `x-*-sha`; only `x-powered-by: Nuxt`, `server: cloudflare`, `cf-ray` |
| `GET /_nuxt/builds/meta/e99010a….json` | `404` |
| `GET /_nuxt/builds/meta/b8bd6f2….json` | `404` |
| `GET /_nuxt/builds/meta/fb5fe11….json` | `404` |
| `/` HTML body | 0 occurrences of any known commit SHA |

**Consequence you must write down honestly:** for a commit that changes no
rendered output — a comments- or `docs/`-only commit like `e99010a` — **no live
probe can distinguish "deployed" from "not deployed."** The build timestamp in
step 3 is corroboration that *a* deploy landed in that window, not a proof of
*which* commit it carried. For those commits, steps 1–2 are the entire
provenance guarantee and step 3 cannot be made into a SHA match. Say
"unverified at SHA level" rather than claiming `main == live`; STI-482 proposes
emitting the commit SHA at build time to close that gap properly.

Note that Cloudflare Pages also rewrites this path on any deploy, so the
timestamp is the freshest available signal even when the content is identical.

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
  `#B08D57`, error-ember `#9F3A2F`, ash-silver `#C0C0C0`
- a change to `app/assets/css/tokens.css` without a matching `DESIGN.md`
  change in the same PR
- a `DESIGN.md` change where `npx @google/design.md lint DESIGN.md` is
  not clean

**`#0E0E0E` is not a rejected colour.** An earlier revision of this list
lumped `near-black #0E0E0E` in with the forbidden four. It is wrong and
has been corrected. `charcoal #0E0E0E` *is* the brand ground — DESIGN.md
(`colors.charcoal`) uses it for the page surface, cards, modals and image
framing plates, and `tokens.css` defines it as `--charcoal`. Flagging it
as a STYLE regression would be a false positive on every page in the store.
The forbidden set is exactly four: `#F7F3EC`, `#B08D57`, `#9F3A2F`,
`#C0C0C0`.

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

- STI-511 — 2026-09-29 — **non-visual gates all green at deployed
  `6fa7f88`; three-viewport visual gate UNVERIFIED.** `/` `200`,
  `/products` `200`, `/collection/featured` `200`,
  `/product/sku-001` `200`, `/products/sku-001` `308` →
  `/product/sku-001` (1 hop, final `200`), branded `404` +
  `text/html` on the browser-`Accept` probe. Both Pages Functions
  answer with their own validation bodies (`/api/bug-report`:
  *"Please describe the bug in at least 10 characters."*;
  `/api/checkout`: *"items must be a non-empty array."*). Deploy run
  [36513710435](https://github.com/olivecasazza/stitch-ash/actions/runs/36513710435)
  `success` @ `2026-09-29T02:40:39Z`; `origin/main` `b9b9301` is
  **1 docs-only commit** ahead, ~2 min old — inside the 24 h
  threshold, so **no** freshness defect. Internal-copy scan of all
  three customer pages: one hit, and it is the legitimate
  `placeholder="your@email.com"` attribute on the waitlist input.
  Source-level WCAG AA from the shipped bundle: white/bone/grey-200/
  grey-400 clear **4.5:1** on all three ground surfaces (min 6.19:1,
  grey-400 on `#1A1A1A`); `--outline` (3.29:1) and `--primary`
  (3.14:1) are border/fill only — verified by enumerating every
  `color:` declaration in the bundle, neither is used as a text
  colour. Style sweep clean: no `#F7F3EC`/`#B08D57`/`#9F3A2F`/
  `#C0C0C0`, no Playfair, all radius tokens `0`, every inline
  `border-radius` `0`. **This cycle also fixed a defect in this
  document** — the collection URL above was wrong; see the note under
  the smoke table. Visual gate could not run: `skill("visual-review")`
  returns *"Skill not found"*, `GET /api/skills` → **404**, `GET
  /api/agents/me/skills` → **404**. No screenshots, so layout at
  1440×900 / 820×1180 / 390×844 is **unverified**, not passed.

  **A `/collections/…` 404 is the checklist's bug, not the site's.**
  This file said `/collections/<one>`; the app has only ever had
  `app/pages/collection/[handle].vue`. A run that trusted the old
  table would have filed a defect against a route that does not exist
  — the exact STI-444 false-positive shape, in a different place.

### Method notes worth keeping (learned the hard way this cycle)

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
