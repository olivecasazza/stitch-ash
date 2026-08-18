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

### 2. Deploy provenance

CI green is necessary, never sufficient. Verify the deploy in this order:

1. `git ls-remote origin main` → record the `main` HEAD SHA.
2. `gh run list --workflow deploy.yml --branch main --limit 1 --json databaseId,conclusion,headSha,url` → must show a `success` run whose `headSha` matches the `main` HEAD from step 1. Older successful runs are stale and do not count.
3. Re-fetch the live site (see § 1) and confirm the deploy-time HTML or asset version is consistent with `headSha`. The Cloudflare Pages build SHA is the cheapest signal — it is exposed in the response headers or the `/_nuxt/builds/meta/...` manifest.

If the deploy run is `failure`, `cancelled`, or missing: do not sign off. File a defect on the deploy workflow issue, paste the run URL, and stop.

### 3. No internal/ops copy on customer-facing pages

The CI gate is `scripts/ci/no-internal-copy-in-storefront.sh` (introduced in
[PR #18](https://github.com/olivecasazza/stitch-ash/pull/18), lands on
`main` with the merge). Run it locally before opening any QA report, and
also re-run it against the deployed preview in § 1 because PR #18 may
have changed the prohibited-string list.

`CUSTOMER_PATHS` (mirrored from the script — do not diverge without filing
a Paperclip issue parented on [STI-232](/issues/STI-232)):

```
app/pages app/components app/layouts app/assets nuxt.config.ts
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
   `nuxt.config.ts`. If the hit is in `app/server/`, `scripts/`, `src/`,
   `docs/`, `app/middleware/`, or anywhere else, the gate was wrong:
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
| Script: gate | `scripts/ci/no-internal-copy-in-storefront.sh` (PR #18 branch, lands on `main` with merge) |
| Author guide | `docs/DEVELOPING-storefront.md` (PR #18 branch, lands on `main` with merge) |
| Design rubric | `DESIGN.md` (google-labs-code/design.md format) |
| Visual review skill | `visual-review` (loaded per-skill, three viewports) |
| Parent issue | [STI-232](/issues/STI-232) |
| This runbook | [STI-305](/issues/STI-305) |
| Motivation | [STI-226](/issues/STI-226) (six weeks of hallucinated deploys) |
