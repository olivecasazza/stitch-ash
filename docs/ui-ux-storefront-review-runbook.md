# ui-ux Storefront Review Runbook

> The **reviewer-side** half of the storefront delivery contract. The author-side
> lifecycle is [`docs/DEVELOPING-storefront.md`](./DEVELOPING-storefront.md); the
> verification-side checklist is [`docs/qa-checklist.md`](./qa-checklist.md); the
> canonical style store is [`DESIGN.md`](../DESIGN.md).
>
> A reviewer running this file is doing the work that [STI-226](/issues/STI-226)
> proved cannot be skipped: an internal advisory memo reached the customer
> storefront because no named gate existed to catch it. This runbook is that gate.
>
> **Nothing in this file is a claim about the state of the site.** Every checkbox
> is filled in by the reviewer, in the review, with evidence pasted from that run.
> A box that cannot be evidenced is reported as **unverified**, never as passed
> ([STI-226](/issues/STI-226): six weeks of hallucinated deploys).

Related issues: [STI-232](/issues/STI-232) (parent — full development cycles),
[STI-234](/issues/STI-234) (this runbook), [STI-226](/issues/STI-226) (the leak
and the hallucinated-deploy incident that produced this posture).

## When this runbook applies

Run it on **every** PR that touches any customer-visible path:

| Path | Why it is customer-visible |
| --- | --- |
| `app/pages/` | routes, page copy, metadata |
| `app/components/` | rendered UI, CTAs, labels |
| `app/layouts/` | page chrome, header/footer, nav |
| `app/assets/` | CSS, tokens, images, fonts |
| `nuxt.config.ts` | app-level config, head, global config |
| `app/app.config.ts` | runtime app config surfaced in the UI |
| `app/error.vue` | customer-facing error page |
| `functions/api/` | Pages Functions customers can call |

A PR is **docs-only** (this file, `README.md`, `docs/decisions/`) or
**test-only** when it touches none of the above. Docs-only PRs still run § 3
(6a–6c) and skip § 3 (6d); a docs-only PR can never carry a visual verdict,
and a PR that mixes docs and `app/` changes is **not** docs-only.

## The seven-step lifecycle, as the reviewer checks it

The lifecycle is defined in `docs/DEVELOPING-storefront.md`. The reviewer does
not re-derive it — the reviewer **verifies each step was actually done**, and
fails the PR when a step is claimed but absent.

### Step 1 — Problem framing

- [ ] The PR description states the **user-visible behaviour change**, not an
      internal objective. "Customer cannot tell whether a garment is
      out of stock" — not "clarify inventory semantics".
- [ ] The framing traces to a real customer journey or surface. A change that
      serves no customer journey fails here, even if the code is clean.
- [ ] The PR links its parent issue. No parent link is an automatic bounce:
      the reviewer cannot judge scope without the acceptance criteria.
- [ ] **No internal/advisory prose in the framing.** The STI-226 failure was
      authored in prose first and leaked second. Internal reasoning belongs in
      `docs/decisions/`, never in a customer-facing PR body that gets pasted
      into a page.

### Step 2 — Design / plan, and the copy approval record

- [ ] Visual or token changes reference `DESIGN.md` (canonical) — not
      `UX_FRAMEWORK.md`, which is a non-canonical companion that covers
      positioning, flows, voice and imagery only, and defers to `DESIGN.md`
      for every style value ([STI-438](/STI/issues/STI-438)).
- [ ] `blockedBy` dependencies are identified **before** implementation.
- [ ] **Copy approval record exists.** Every customer-facing string the PR adds
      or changes is traceable to an approved string. An unapproved new string is
      a 6c failure, not a nit.
- [ ] The approved strings are quoted in the PR (or the linked issue) so the
      reviewer can compare exact-string, not paraphrase. "Close enough" copy is
      a 6c failure: the storefront is embroidery-led and the copy carries the
      brand voice.

### Step 3 — Issue hygiene

- [ ] Parent issue referenced, work mode set, priority set
      (`high` for customer-visible, `medium` otherwise).
- [ ] `blockedBy` links are real issues that exist — not aspirational.
- [ ] Acceptance criteria are written such that a reviewer can decide pass/fail
      without asking a question. If the reviewer must ask, the PR is not ready.

### Step 4 — Implementation

- [ ] Work is on a **feature branch**, never a direct commit to `main`.
- [ ] Commit messages follow `CONTRIBUTING.md` (conventional commits; the repo
      runs `commitlint`).
- [ ] No new dependencies smuggled in; a dependency change is called out in the
      PR body because it changes the customer-visible attack surface.
- [ ] **No new prohibited strings were added to the lint by the author.**
      The catalog is CTO-owned. An author who finds a leak adds a Paperclip
      comment — never a line in `scripts/ci/no-internal-copy-in-storefront.sh`.
      A PR that edits that script's `PROHIBITED` array is bounced on sight.

### Step 5 — Self-review

- [ ] `PR Checks / typecheck-and-build` is green (typecheck + build).
- [ ] `PR Checks / internal-copy-gate` is green.
- [ ] The author ran `./scripts/ci/no-internal-copy-in-storefront.sh` locally
      and pasted the output.
- [ ] No `console.log`, `TODO`, or `FIXME` in production paths.
- [ ] A preview URL is in the PR body and was actually opened by the author.
- [ ] If `app/assets/css/tokens.css` changed, the **same PR** changes
      `DESIGN.md` in the matching way. `tokens.css` is a build-time mirror of
      `DESIGN.md` and nothing more; a one-sided change is an automatic bounce.
- [ ] `npx @google/design.md lint DESIGN.md` is clean — **0 errors and 0
      warnings**. Any error blocks the merge; warnings must be resolved or
      explicitly accepted in the PR body with a reason.

### Step 6 — Reviewer sign-off (the ui-ux gate)

Sign-off is four sub-gates. **All four must pass.** A sub-gate that cannot be
evaluated is recorded as *unverified* and blocks sign-off — it is never
silently passed.

- [ ] **6a — No leaked internal copy.**
      CI `internal-copy-gate` is green, and the reviewer has independently run
      `./scripts/ci/no-internal-copy-in-storefront.sh`. The reviewer also greps
      the **diff** for advisory phrasing that the literal string list would miss
      (see § 4).
- [ ] **6b — Token-system integrity.**
      `DESIGN.md` is the style store; `app/assets/css/tokens.css` is its mirror.
      Every `--*` custom property in `tokens.css` traces to a `DESIGN.md` token,
      and every component token reference (`{colors.*}`, `{typography.*}`,
      `{rounded.*}`) resolves. `npx @google/design.md lint DESIGN.md` → 0
      errors / 0 warnings.
- [ ] **6c — Copy fidelity.**
      Customer-facing strings match the step-2 approved strings **exactly**.
      Reviewers compare literal text, including punctuation, casing, and
      spacing. Em-dashes, en-dashes, and smart quotes introduced silently are
      failures.
- [ ] **6d — Visual sanity.**
      Any change that can alter rendering is checked at **three** viewports via
      the `visual-review` skill: **1440×900**, **820×1180**, **390×844**. Fewer
      than three viewports is *unverified*. N/A is only valid for a genuinely
      non-rendering change, and the reviewer must state why it is non-rendering.

#### 6d — the house style, graded not eyeballed

`DESIGN.md` is the rubric, not the reviewer's taste. Compact monochrome
minimal: grey-on-black, **JetBrains Mono** as the single brand face, tabular
figures (`fontFeature: 'tnum'`) on all numerics, a 4px spacing grid, and **zero
border-radius**. Reject on sight, with a repro, on any of:

- any non-zero `border-radius` (including dead `.rounded-*` utilities that are
  still shipped in the CSS bundle — a dormant footgun is still a footgun);
- any editorial serif (Playfair Display or similar);
- any colour outside the `DESIGN.md` grey scale: warm bone `#F7F3EC`,
  thread-gold `#B08D57`, error-ember `#9F3A2F`, ash-silver `#C0C0C0`;
- a `tokens.css` edit without its matching `DESIGN.md` edit in the same PR;
- a `DESIGN.md` edit where the lint is not clean.

WCAG AA contrast is still required, checked against the `DESIGN.md` grey scale —
and by computation, not by eye. A previous cycle disproved a "contrast failure"
whose prescribed fix was itself a QR-1 regression.

### Step 7 — Deploy / promote

- [ ] Merge to `main` is what triggers the deploy; CI green is **never** "deployed".
- [ ] A `deploy.yml` run for the merged `main` SHA concluded `success`, and its
      `headSha` matches `git ls-remote origin main`.
- [ ] The affected page was re-fetched from `https://preview.stitch-ash.com`
      after the deploy, and the change was observed in the served body.
- [ ] Production promotion is confirmed by the reviewer/owner, not assumed.

## Lint-failure triage

`internal-copy-gate` fails for exactly two reasons. Classify before acting.

1. **Real leak.** A prohibited string genuinely reached a customer-visible path.
   - Do not merge. Bounce with the file, the line, and the exact string.
   - File or update a Paperclip issue with a live-site repro attempt.
   - The fix is to move the content to `docs/decisions/` or a non-rendered
     source comment — never to delete the gate or the string.
2. **False positive / scope gap.** The string is legitimate customer copy, or the
   path is not actually customer-visible.
   - Do **not** edit the script yourself. Comment on the owning issue with the
     exact phrase and the justification; the CTO owns the catalog.
   - Bounce the PR until the CTO rules.

> **Verified gap, 2026-09-27.** `scripts/ci/no-internal-copy-in-storefront.sh`
> sets `CUSTOMER_PATHS="app/pages app/components app/layouts app/assets
> nuxt.config.ts"`. It does **not** cover `app/app.config.ts` or `app/error.vue`,
> both of which are customer-visible and both of which are in this runbook's
> trigger list. The `DEVELOPING-storefront.md` scope line and the gate's actual
> surface have therefore drifted. A fix PR is filed as a follow-up; until it
> lands, the reviewer greps those two paths by hand during 6a.

## Quick-reference decision tree

```
PR touches app/, functions/, or app/assets/?
├─ no  → docs/test-only. Run 6a–6c. Skip 6d (state "docs-only, no render path").
└─ yes → storefront PR. Run all of the following.
    ├─ parent issue linked, user-visible change stated?      → no: BOUNCE (step 1)
    ├─ new/changed copy matches approved strings exactly?    → no: BOUNCE (6c)
    ├─ internal-copy-gate green + local script run?          → no: triage (§ lint)
    ├─ tokens.css changed?  → DESIGN.md changed in same PR? → no: BOUNCE (5/6b)
    ├─ design.md lint 0 errors / 0 warnings?                 → no: BOUNCE (6b)
    ├─ renders?  → 3 viewports via visual-review             → no: BOUNCE (6d)
    └─ all pass → sign off; deploy per step 7 and re-verify live.
```

## Recording the verdict

Post the verdict on the PR **and** on the Paperclip issue, as a comment with:

- the four sub-gates (6a–6d) each marked pass / fail / **unverified**;
- the commands actually run, with their real output pasted;
- for 6d, the three viewport PNGs attached;
- the deploy run URL and conclusion, plus the `git ls-remote` SHA;
- the live-site fetch: URL, HTTP status, and the body excerpt that shows the
  change rendered.

A verdict without pasted evidence is not a verdict. If a check could not be
run, say **unverified** and name the reason — an evidence-free green is the
exact failure this runbook exists to prevent.
