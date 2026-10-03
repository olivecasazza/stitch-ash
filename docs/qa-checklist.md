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
| `https://preview.stitch-ash.com/collections/<one>` | `200` | One collection page (pick a real handle) |
| `https://preview.stitch-ash.com/product/sku-001` | `200` | PDP (canonical path) |
| `https://preview.stitch-ash.com/products/sku-001` | `301` or `308` → `/product/sku-001` | The `/products/` → `/product/` redirect must resolve before the PDP body loads |
| `https://preview.stitch-ash.com/api/bug-report` | Pages Function responds (any 2xx/4xx JSON, not a CF 5xx) | POST handler reachable |
| `https://preview.stitch-ash.com/api/checkout` | Pages Function responds (any 2xx/4xx JSON, not a CF 5xx) | POST handler reachable |
| `https://preview.stitch-ash.com/<nonexistent-path>` | `404` **and** `content-type: text/html` | Branded `app/error.vue`. See the `Accept` note below before running this one. |

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
2b. **A `success` run conclusion is NOT proof the deploy ran.** Check the
   `deploy` job's own conclusion before you call anything deployed:

   ```sh
   gh api "repos/olivecasazza/stitch-ash/actions/runs/<runId>/jobs" \
     --jq '.jobs[]|{name,conclusion}'
   # fresh-check: success
   # deploy:      skipped      <-- the run published NOTHING, and still reports success
   ```

   `deploy.yml` has a `fresh-check` gate that returns `needed=false` when main is
   already live, which **skips** the `deploy` job while the run as a whole still
   reports `conclusion: success`. `gh run list` calls such a run a success and
   names it the latest successful deploy. It is a green no-op.

   Measured 2026-10-01T05:26Z on run [36803396902](https://github.com/olivecasazza/stitch-ash/actions/runs/36803396902):
   run = `success`, `fresh-check` = `success`, `deploy` = **`skipped`**. Runs
   36785970511, 36755982087 and 36713695403 are the same shape. The last run
   whose `deploy` job actually concluded `success` was
   [36675330287](https://github.com/olivecasazza/stitch-ash/actions/runs/36675330287)
   at `2026-09-30T05:51:31Z`.

   So "the latest successful deploy.yml run" is ambiguous and you must resolve
   it. Quote the **job** conclusion, not the run conclusion. Filed as
   [STI-601](/STI/issues/STI-601): the `fresh-check` predicate asks "does a green
   run exist for main's HEAD" when it should ask "did a run actually deploy
   main's HEAD", which makes the self-healing backstop a green no-op.
3. Read the build marker the artifact itself carries:

   ```sh
   curl -sS https://preview.stitch-ash.com/__build.json
   # {"commit":"<full-40-sha>","short":"<7>","source":"env|git","repo":"olivecasazza/stitch-ash"}
   ```

   The `commit` field **must equal** the `main` HEAD SHA from step 1. Equality
   of the full 40 characters is the whole test — the `short` field is a human
   convenience and is deliberately not the identity field, because 7 characters
   is not enough to attribute a claim to a commit.

   If `commit` is `null`, or the marker 404s, the build could not determine its
   commit. That is a deploy-pipeline defect, not a stale site: do not fall back
   to the timestamp below, report "unverified at SHA level", and file it.

4. Only if the marker is unavailable, fall back to the build timestamp:

   ```sh
   curl -sS https://preview.stitch-ash.com/_nuxt/builds/latest.json
   # {"id":"<build-id>","timestamp":<epoch-ms>}
   ```

   Convert `timestamp` to UTC and confirm it falls **inside the step 2 run's
   window** (`createdAt` → `updatedAt`) and **after** the previous deploy run's
   `createdAt`. Note that Cloudflare Pages also rewrites this path on any deploy,
   so the timestamp is the freshest available signal even when the content is
   identical. It is still **not** a commit match — see below.

**The `id` in that manifest is the full 40-character commit, not a random UUID,
and `/_nuxt/builds/meta/<commit>.json` is now reachable.** Nuxt's default
`buildId` is a fresh `randomUUID()` per build, which is what made two builds of
one commit ship different bytes; it is now derived from the commit by the same
resolver that writes the marker (`nuxt.config` imports
`scripts/read-build-commit.mjs`, as does `scripts/write-build-id.mjs`), so the
manifest and `__build.json` cannot name different commits. Both probes agreeing
is worth a glance, but `/__build.json` in step 3 is the one to quote — it is the
marker that ships *inside* the artifact, and a marker injected at deploy time
could drift from what was actually published.

### Historical note — what this step used to say

Before [STI-542](/issues/STI-542) this step read the timestamp only, and told you
flatly that no live probe could name the deployed commit. That was true on
2026-09-28 and was measured, not assumed:

| Probe | Result (2026-09-28) |
| --- | --- |
| `GET /` response headers | no `etag` SHA, no `x-*-commit`, no `x-*-sha`; only `x-powered-by: Nuxt`, `server: cloudflare`, `cf-ray` |
| `GET /_nuxt/builds/meta/e99010a….json` | `404` |
| `GET /_nuxt/builds/meta/b8bd6f2….json` | `404` |
| `GET /_nuxt/builds/meta/fb5fe11….json` | `404` |
| `/` HTML body | 0 occurrences of any known commit SHA |

All five were re-probed live on 2026-09-29 against `892ff25`: `/__build.json`
returns its commit, and `/_nuxt/builds/meta/892ff255….json` went `404` → `200`.

The consequence recorded then — "for a commit that changes no rendered output, no
live probe can distinguish *deployed* from *not deployed*" — **no longer holds.**
`/__build.json` distinguishes them for every commit, including `docs/`-only
ones, because the marker lives in the published artifact rather than in the
rendered page.

The reason `__build.json` exists is [STI-542](/issues/STI-542): two builds of
`9c55c363` published different font files, so "a build of main is live" was all
the site could prove and no observation could be attributed to the commit it was
reported against. That is also what made [STI-405](/issues/STI-405) possible —
a deployed-SHA attribution the pipeline could not support. Do not reintroduce a
build-time network font fetch or a per-build random `buildId`; the
`build-determinism-gate` job in `pr-checks.yml` builds the same commit twice and
fails on any digest difference, and it only means anything while the marker and
the manifest keep agreeing.

If the deploy run is `failure`, `cancelled`, or missing: do not sign off. File a defect on the deploy workflow issue, paste the run URL, and stop.

**Sort the freshness mismatch before you call it a defect.** A `commit`
in step 3 that is an *ancestor* of `main` HEAD is a lag, not a broken
pipeline, and the two deserve opposite responses. Get the direction:

```sh
git fetch origin main -q
git rev-parse origin/main                                  # step-1 HEAD
git merge-base --is-ancestor <marker commit> origin/main \
  && echo "marker is an ancestor of main -> main AHEAD (lag)"
git log --oneline <marker commit>..origin/main             # exactly what is un-deployed
```

Then read the two clocks. If every commit in that range was authored
*after* the step-2 run finished, the deploy did nothing wrong — `main`
simply moved on afterwards, and the next deploy picks it up. That is the
normal steady state between dispatches and is **not** a defect to file.
If instead a commit in the range predates the run, or the marker's build
timestamp falls outside the run window, the deploy ran and failed to ship
what it should have: that *is* a defect, and file it.

Under [STI-226](/issues/STI-226) the accusation is far more expensive
than the lag, so prove the direction with the commands above and quote
them. Measured 2026-09-30 (run `533b0537`): marker
`9d598a77d8188e5d10d0147f85565d58fdac2da4` == the `headSha` of green run
`36659308351`, build timestamp `02:20:10Z` inside that run's
`02:19:26Z`+1m24s window, and the single un-deployed commit
`7367c2f` (STI-552) was authored `03:18:17Z` — ~57 min *after* that deploy
completed. That is a clean 1-commit lag with positive proof of what is
live, not a hallucinated deploy.

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

**`#0E0E0E` is NOT forbidden — it is `charcoal`, an in-palette token.**
An earlier revision of the bullet above named `near-black #0E0E0E` as a
forbidden colour. That was wrong, and it is a live false-positive
generator: `DESIGN.md` defines `charcoal: "#0E0E0E"` as the elevated
surface for cards and modals, and the shipped CSS uses `--charcoal` for
exactly that. Rejecting a page for using `#0E0E0E` would fail every
correct render. The forbidden set is the four warm/accent hexes above
plus any editorial serif and any non-zero `border-radius`; the neutral
grey ramp `#000000` → `#FFFFFF` *is* the palette, not a violation of it.
Confirmed 2026-09-30 against the live stylesheet: the served custom
properties are exactly `DESIGN.md`'s eleven, and `#0E0E0E` appears as
`--charcoal`, never as a stray warm black.

WCAG AA contrast is still required and is checked against the `DESIGN.md`
grey scale, not ad-hoc.

#### When the grader leg is down, measure contrast yourself

`visual_review.py` has two legs: **render** (browserless/chrome, in-cluster) and
**grade** (OmniRoute vision model). They fail independently. When only the
grade leg is dead you can still produce machine evidence instead of guessing —
and a machine measurement of rendered pixels is stronger than a vision
model's opinion, because it is reproducible.

Run the capture with `--no-review` to get all nine PNGs:

```sh
python3 "$VQA" --full --no-review \
  --viewport 1440x900 --viewport 820x1180 --viewport 390x844 \
  https://preview.stitch-ash.com/ \
  https://preview.stitch-ash.com/collections/all \
  https://preview.stitch-ash.com/product/sku-001
```

Then take the modal colour as the page ground and cluster the high-count
colours far from it; antialiased edges form a gradient between the two, so the
purest high-count cluster is the declared text colour. Compute the WCAG ratio
per cluster:

```python
def lum(rgb):
    out = []
    for c in rgb:
        c /= 255
        out.append(c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4)
    return 0.2126 * out[0] + 0.7152 * out[1] + 0.0722 * out[2]

def ratio(a, b):
    hi, lo = sorted((lum(a), lum(b)), reverse=True)
    return (hi + 0.05) / (lo + 0.05)
```

This measures what the user actually sees. It does **not** replace the graded
review for layout, spacing, type scale or "looks wrong" — those stay
**unverified** while the grader is down, and saying so is the honest call.
Contrast and palette are the two checks this substitutes for cleanly.

**Grader outage log** (the error changes; re-measure, do not assume):

| Date | Error | Meaning |
| --- | --- | --- |
| 2026-09-29 | `401 Unauthorized` | first report; key looked dead |
| 2026-09-30 | `402 Payment Required`, then `429` on the retries | OpenRouter credit exhausted; one 402 tripped the only credential into cooldown |
| 2026-10-01 | `403 Forbidden`, `{"code":"insufficient_quota","type":"permission_error"}`, message: `OpenCode's free tier can only be used from within OpenCode` | Different error again. Text completions still succeed (`HTTP 200`, `Pong`); only the `image_url` block is refused. |

Tracked on [STI-575](/STI/issues/STI-575). This is credential/spend authority, so
it goes to the operator under HARD RULE 5 — do not retry it into cooldown and do
not paste key material into an issue.

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

**Never test the vision leg with a toy image — a 1×1 probe reports a
false recovery.** [STI-575](/issues/STI-575) tracked the reviewer leg
as auth-dead (OpenRouter connection credit exhausted). On 2026-09-30 I
probed the reviewer with a hand-rolled 70-byte 1×1 PNG before trusting
the skill, and it came back **`HTTP 200`** with the model's reasoning
naming "a plain pink square" — which read as the blocker being fixed.
It was not. Running the real gate immediately after, against real
112 KB screenshots, gave `402 Payment Required` on the first call and
`429` (with `retry-after: 98`, code `model_cooldown`, body
`All credentials for model anthropic/claude-opus-5.5 are cooling down`)
on the remaining eight. A 1×1 image is small enough to be free, so it
never reaches the exhausted-credit path; a real screenshot does.

The lesson generalises past this gateway: **a liveness probe that is
much cheaper than the real workload will pass exactly when the real
workload cannot be paid for.** Always probe with a payload shaped like
the one that actually fails. If you must probe cheaply, treat the
result as evidence about the *gateway*, never as evidence that the
*blocker cleared* — only a real capture-and-grade run can reopen a
blocked visual gate. Under [STI-226](/issues/STI-226) the costly error
is the optimistic one, so default to blocked and let real evidence lift it.

**Grep the rendered HTML for component CSS, not just `/_nuxt/*.css`.**
Nuxt inlines scoped component CSS into `<style>` blocks in `<head>`, so
the header/footer/component rules are **absent from the external
stylesheet**. Verified 2026-10-01 against the live site at `5da181f`:
`/_nuxt/entry.s4YYOZRg.css` (225 KB) contains **zero** occurrences of
`nav-link`, `logo-link`, `foot-mark`, `footer-link` or `cart-pill` —
every one of those rules lives only in the served HTML.

This nearly produced a false regression report. The STI-614 focus-ring
fix was live and correct, and a check that fetched only the stylesheet
would have found none of those selectors and concluded the work never
shipped. It also means `grep <selector> entry.css` returning nothing is
**not** evidence of absence on this site. Fetch the page with a browser
`Accept` header and grep the body.

**A 200 on a text probe does not mean the vision leg is alive.** The
1×1-PNG lesson above has a text-shaped twin, and both were live at once on
2026-10-01. Same endpoint, same bearer key, seconds apart:

```
model=auto/best-vision, text only   -> HTTP 200 {"model":"anthropic/claude-opus-5.5","content":"ok"}
model=auto/best-vision, + real PNG  -> HTTP 429 model_cooldown (openai/gpt-5.6-sol, reset_seconds=73)
...after the 73s cooldown, same image -> HTTP 401 invalid_api_key ("You need to sign in to use this model")
```

Three lessons, in order of how much damage they do:

1. `invalid_api_key` was **misleading**. The same key authenticated the
   text call, so the key is not the problem and rotating it is wasted
   work. An auth error that appears only on one payload type is a routing
   or entitlement fault, not a credential fault.
2. `auto/best-vision` **was not routing to vision** for image input — the
   cooldown error names `openai/gpt-5.6-sol`, a text model. The alias
   looks healthy on a text probe, which is exactly why this presents as
   intermittent rather than dead.
3. Any monitoring built on a text-only health check **reports this gateway
   healthy** while every visual gate is down.

So: probe the reviewer with a **real screenshot payload**, never a toy
image and never text, and treat a passing text probe as evidence about
the endpoint only — never as evidence that a blocked visual gate reopened.
Under [STI-226](/issues/STI-226) the optimistic error is the expensive
one, so the default stays *unverified*.

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

**Update 2026-10-02 — the same pool now fails `403`, and only a real
image finds it.** `auto/best-vision` returned `403` on all 6 captures
of the 2026-10-02T11:06Z pass:

```
[403]: Error from provider (Console): OpenCode's free tier can only be
used from within OpenCode
code: insufficient_quota
```

The isolating sequence, in the order that costs least:

1. Text-only call to the same endpoint — `200`. So the gateway and the
   key are fine; the failure is image-specific.
2. The **real captured PNG** pasted into a hand-rolled request — `200`.
   So the screenshot leg is healthy and the provider is refusing.
   (Do this step with the real PNG, not a 1×1 toy: the
   [STI-575](/issues/STI-575) note above is a 1×1 false recovery.)
3. Sibling model ids against the same base64: `google/gemini-2.5-flash`
   `200`, `anthropic/claude-sonnet-5` and `openai/gpt-4o-mini` both
   `401 invalid_api_key`. Pin the one that answers.

**Why this matters more than a 502:** a 502 is an obvious infra smell
and the previous two passes correctly reported the visual gate as
unverified and stopped. A `403` from a *paid-quota* provider is quieter —
the six PNGs are sitting on disk and look like completed evidence, so
the next reader sees six screenshots and infers a graded gate. The
runbook's own `6 capture(s), 6 failure(s)` summary line is the only
thing preventing that false green. Pin the model in the run and record
it in the pass doc; do not rely on the skill's default staying healthy.

`google/gemini-2.5-flash` is the working vision route as of this run.

**Re-triaging against `DESIGN.md` first beats filing first.** The same
6-capture run returned 7 findings demanding "editorial serif" for the
wordmark, nav links, section title, body copy, product names, badges and
accordion titles, plus 2 demanding a `border-radius` above 0 on buttons
that already have 0. `DESIGN.md` says grotesk is the UI face and QR-1
rejects non-zero radius, so a majority of the batch inverted the rubric
it was given. That is the "green gate is not a green storefront"
section above recurring in the other direction: a graded gate is a
source of hypotheses. Check each finding against the DESIGN.md tokens
before it becomes an issue.

**Re-test closed defects before filing, or you will duplicate them.**
The surviving home-page missing-image finding in that run was filed
fresh as [STI-623](/issues/STI-623) before the checklist's own
`STI-309` reference was read — [STI-309](/issues/STI-309) had tracked
the same defect since 2026-08-18 and was still open. Cancelled as a
duplicate. The batch still paid for itself: STI-309's original capture
asserted the defect on home **and** PDP, and the PDP half no longer
reproduces, which narrows the remaining defect to the home grid. Always
grep the runbook and the open-issue list for the finding before creating
one.

**Attachments to another agent's issue return `403`, by design.** Putting
the PNGs on the real owner ([STI-309](/issues/STI-309)) failed `403` on
every one of six uploads: run-scoped writes are subtree-scoped, and
STI-309 is assigned to another agent. Attach to the issue you own and
say in the comment which issue and which viewports the fixer needs to
pull from here.

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

## `origin/main` can move while you are mid-gate — re-check before you report

Verified 2026-10-02 (`5884ae8` superseding `5da181f`). The heartbeat opened with
live at `5da181f` and every check was green. Before the pass could be written up,
`origin/main` had advanced to `5884ae8` and two deploy runs for it were already
in flight. Reporting the first result would have meant certifying a build that was
no longer live.

The order that catches this:

1. Record the live build id **first**, and the `git ls-remote` HEAD **second**,
   and compare them explicitly.
2. If a deploy run you were waiting on has a SHA newer than the one you measured,
   wait for it to conclude, re-fetch the live build id, and re-run the gate.
3. Only then write the verdict, and say which SHA the verdict is *about*.

Corollary on the deploy path: check `gh run list --workflow=deploy.yml` for the
SHA you are verifying rather than assuming one run means one deploy. This run
showed two `repository_dispatch` runs for the same SHA, one `success` and one
still `queued`. The successful one is what moved live bytes; the queued one is a
duplicate and is reported as queued/unverified, never as green.

And record who caused the deploy. Both runs here predate the first command of
the run and arrived as `repository_dispatch`, so they were triggered outside the
QA run. The correct claim is "the deploy happened and the bytes match", not "I
deployed it".

## A computed-token contrast check is not a rendered contrast check

`app/assets/css/tokens.css` values trace to `DESIGN.md` `colors.*`, so contrast
can be computed offline and it is worth doing every pass. It caught the real
relationships on `5884ae8`: `outline` 3.29:1 on ink / 3.02:1 on charcoal clears
SC 1.4.11, `primary` is sub-AA on charcoal and grey-950, and `border-rule` is
sub-3:1 everywhere as a boundary.

Two things keep that from producing false defects and false reassurances:

- **Confirm the failing combination is actually shipped before filing.**
  `primary` at 2.89:1 looks like an AA failure until you check
  `grep -c 'color:var(--primary)'` — it is `0`. It is never painted as text, and
  `DESIGN.md` documents the exclusion by name. A token that is never used in the
  shipped combination is not a shipped contrast failure.
- **It cannot see a colour set anywhere the tokens do not describe.** This is the
  part that matters for a11y commits. `5884ae8` is
  `fix(a11y): finish the focus-ring sweep, tap targets, outline hierarchy, cart
  recovery (#176)`. Every one of those claims is a rendering question: the rule
  exists in the CSS, and whether the ring is *visible on the painted surface* is
  something only a graded screenshot can answer. So an a11y commit that passes
  the computed check is **more** unverified, not less.

State it that way in the issue: computed check green, rendered check
unverified, commit is a11y work.

## `HTTP 403 error code: 1010` from the Paperclip API is a user-agent block

Hit on 2026-10-02 posting a comment with `python3 urllib`. The identical payload
sent with `curl` returned `201`. It is Cloudflare refusing the client, not an
agent boundary and not a permission denial — the same write to the same issue
succeeded immediately after via curl.

Do not report it as "I am not allowed to comment there" and do not treat it as
proof of a company boundary. Retry once with `curl` before drawing any
conclusion about permissions. A genuine cross-agent denial looks different and
should be reported as such.

## A screenshot nobody looked at is not evidence

The render leg and the reviewer leg are separate services with separate failure
modes, and they can fail independently in the same heartbeat. On `5884ae8` the
render leg produced all six PNGs at all three viewports without complaint while
the reviewer leg failed every single one of them.

So when the gate is blocked, attach the captures anyway and label them honestly.
Six PNGs on the issue is real progress: the render work is done and a human can
look. But write "captured, not graded" rather than "verified at three
viewports". A claim of three-viewport coverage that no vision model ever read is
strictly weaker than one graded finding line, and under
[STI-226](/issues/STI-226) it must be reported as unverified.

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

## A green route can still be a broken page

`e06f26a` (2026-10-02, run `a339c7a6`). Every customer route returned 200, both
Pages Functions answered correctly, and the deployed SHA matched `origin/main`.
The pages were still wrong: PR #178 removed the product image plate, so every
product surface shipped an empty near-black frame above its price, on all three
QR-1 viewports.

Three lessons, all of them about what a check that only looks at a status code
cannot see.

### Assert on the body, not just the status

```
curl -sS https://preview.stitch-ash.com/ | grep -c '<img'
0
```

A `200` on a page whose whole purpose is to show a product is not evidence the
product shows. Fetch the body and assert the thing you expect is in it. For a
product surface that means the image region is not `<!---->`.

### When the bundle contradicts the source, believe the bundle

`git show origin/main:app/components/ProductCard.vue` at `e06f26a` still had the
plate import and the `v-if="!imageSrc"` branch. It looked fine. The deployed
chunk `/_nuxt/es01bH2s.js` compiled the else branch to `n("",!0)` — an empty
string — and carried no plate reference at all. Source at HEAD and source in the
bundle were not the same code. Grep the shipped chunks
(`product-plate`, `EMBROIDERY`, `resolveProductMark`) before believing a source
read when the question is what is actually live.

### A design change that does not edit DESIGN.md is a defect

The PR argued the placeholder art had had four passes and deserved to go. That
may be the right call. But `DESIGN.md` at that same SHA still specified the plate
twice — `grey-950 ... image fallback plates` at line 211, and
`Square charcoal plate, hairline border, 4:5 image aspect` at line 513 — and the
PR touched neither. The code and the spec were left disagreeing, which is how a
judgement call silently becomes a rendering regression. When a PR removes a
documented pattern, the document changes in the same PR or the site stops
matching its own rubric.

### The reviewer leg was up the whole time

The same 9-capture run that caught this returned graded findings on 9 of 9
captures, at production screenshot sizes, with no 401/402/429. Every QA issue
had been parked on a blocker describing an exhausted-credit 401 that no longer
reproduced. Re-measure a blocker before inheriting its conclusion — and when
re-measuring, use a payload the size of the real one. A 1x1 probe passes while a
real screenshot still fails, and that has already produced one false "recovered"
on this board. Filed [STI-621](/STI/issues/STI-621); blocker evidence on
[STI-575](/STI/issues/STI-575).

### Known blind spot in the internal-copy lint

`scripts/ci/no-internal-copy-in-storefront.sh` scans
`app/pages app/components app/layouts app/assets nuxt.config.ts app/app.config.ts app/error.vue`.
It does not read the built output, and it did not catch this regression because
the defect is a *missing* element rather than a prohibited string — a lint for
"no ops copy" cannot see "no product art at all". Passing this gate is not
evidence a page is complete; it is evidence no banned word shipped.

### `auto/best-vision` is down far more often than up — pin the reviewer

The 2026-10-03T00:28Z daily pass hit four distinct reviewer failures in nine
captures on a perfectly healthy site, and the failure changed identity *between
attempts inside a single run*:

| attempt | model | result |
| --- | --- | --- |
| 1 | `auto/best-vision` | `402 Payment Required` |
| 2 | `auto/best-vision` | `429 Too Many Requests` (cooldown tripped by the 402) |
| after 120s | `auto/best-vision` | `401 Unauthorized` — `You need to sign in to use this model` |
| pinned | `openrouter/anthropic/claude-opus-5.5` | **200, 9 of 9 graded** |

`auto/best-vision` is a router alias, so its 401 is ambiguous: the credential may
be dead, or the alias may have resolved to a model the pool has no active
connection for. In one sweep `openai/gpt-4o` and `anthropic/claude-sonnet-4-5`
both returned `401 No active credentials for provider`, while the pinned
OpenRouter Claude route returned `200` on the identical 148 KB image payload.
The alias is the variable, not the key.

**Pass `--model openrouter/anthropic/claude-opus-5.5` by default.** It is the
one route that has actually graded captures on this board; do not spend a run
rediscovering that the alias is down.

Two script defects bite the moment the reviewer *does* return, and both surface
as a Python traceback rather than a review result:

1. `AttributeError: 'NoneType' object has no attribute 'strip'` at
   `visual_review.py:365` — the model replied `finish_reason: stop` with
   `message.content: null`. Transient and unrelated to the request; the same
   prompt and image graded fine on retry. Retry it, never file it.
2. One invocation aborts the whole run on the first such traceback, so captures
   2..N never get graded. Drive the viewports in a loop with per-call retry
   (75s backoff, 4 attempts) instead of trusting a single 9-shot run.

Isolate the reviewer the same way every time — text leg, then the same call with
a real production-size PNG, then the pinned model:

| `auto/best-vision` text | `auto/best-vision` + real PNG | pinned OpenRouter Claude | conclusion |
| --- | --- | --- | --- |
| 200 | 401/402/429 | 200 | alias down, key fine — pin the model and the gate passes |
| 200 | 429 `model_cooldown` | 429 `model_cooldown` | whole vision pool cooling — wait out `reset_seconds` |
| 401 | 401 | 401 | key genuinely rejected — escalate |

A 200 on the text leg proves the key and the endpoint are fine, which is the one
thing a bare "review failed" line cannot tell you. Re-measure a blocker before
inheriting its conclusion: [STI-575](/issues/STI-575) has sat on an
exhausted-credit 401 for four days while the reviewer was in fact usable.

### The cart pill is a filled button: a real DESIGN.md violation the lints cannot see

The graded gate's most useful output on 2026-10-03 was not a crash — it was a
`medium` finding the reviewer raised independently at **9 of 9 captures**: the
header cart renders as a filled button rather than the quiet numeric indicator
`DESIGN.md` specifies, and that fill breaks the focus ring the code relies on.

`DESIGN.md` is unambiguous in two places (lines 522-525 "Navigation", 563-566
"Header"): *"cart indicator as a numeric (\"02\"), no badge box"* and *"Cart
indicator should be numeric and quiet, not a large badge."* The shipped
declaration at `app/components/Header.vue:115-124` is `background: var(--bone)`
with `border: 1px solid var(--bone)`.

The part worth keeping is **how to prove it without arguing about taste**:

- `--bone` is `#E8E8E8`, a legitimate greyscale token. It is **not** the
  forbidden warm bone `#F7F3EC` (0 occurrences in the served CSS), so this is
  not a palette regression and filing it as one would be wrong.
- The objective failure is arithmetic: `background` and `border` are the same
  token, so the control's boundary against itself is **1.00:1**.
- `Header.vue:162` sets `outline: 2px solid var(--focus)`, and `--focus` is
  `#FFFFFF`. Against the `#E8E8E8` fill it actually renders on, that is
  **1.23:1** — failing SC 1.4.11 3:1. The STI-608 comment above that rule
  reasons as though the pill were transparent over ink; once the bone fill
  ships, that reasoning no longer describes the surface a user sees.
- The **text** leg is fine: `#E8E8E8` on `#000000` is 17.14:1. State that in the
  issue. Over-claiming a defect you did not measure costs more credibility
  than the defect does.

**Token existence is not token conformance.** Every gate in `scripts/ci/` passed
on this commit — `no-internal-copy-in-storefront.sh` exited 0, `DESIGN.md`
linted clean (0 errors, 0 warnings), the radius bridge held at `--radius-*` and
`--ui-radius` all `0`. None of them check that a component *uses* a declared
token the way `DESIGN.md` says it should. A green lint suite is evidence no
banned thing shipped; it is not evidence the page matches its design system.
Only the graded visual gate catches the second class.

### When a graded finding names a rule, read the rule before filing it

Vision findings are graded against `DESIGN.md`, so the rubric text is in the
repo. Two patterns from the same run:

- **"Account is missing from the nav"** fired at 7 of 9 captures. Before filing,
  `grep -rniE 'account' app/components/Header.vue app/layouts/*.vue` returned
  nothing — Account is not implemented *anywhere*, not hidden at a breakpoint.
  That reclassifies it from "rendering regression" to "declared feature not
  built", which is a different owner and a different urgency.
- **"Prose block is too long"** and **"type scale skips a step"** fired on some
  captures with a *pixel estimate* attached ("about 17-18px", "roughly 20px").
  The reviewer is estimating off rendered pixels against a type scale it only
  read as text. Do not file a measured-sounding claim off an unmeasured
  estimate, and do not dismiss the underlying copy question either — report it
  as unverified.

Filter every graded line through: (1) is it visible in the screenshot *I*
captured, (2) does it break a rule I have *read* in `DESIGN.md` rather than
remembered, (3) does it reproduce at all three viewports. Lines failing (2) are
candidates, not defects.
