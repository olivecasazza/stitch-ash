# Storefront Development Guide

> All changes touching customer-visible paths (`app/pages/`, `app/components/`, `app/layouts/`, `app/assets/`, `app/nuxt.config.ts`, `app/app.config.ts`, `app/error.vue`) must follow this lifecycle. Internal-analysis and ops prose never belongs in those paths.

This guide is the canonical storefront development cycle referenced from [STI-232](/STI/issues/STI-232) and adopted as the standing ui-ux review checklist by [STI-234](/STI/issues/STI-234). The seven-step lifecycle below doubles as both the author's lifecycle and the ui-ux reviewer's checklist.

## Mandatory Development Lifecycle

### 1. Problem Framing

Before writing any code, document:
- What user-visible behaviour changes and why
- Which customer journey or surface is affected
- Link to the parent plan or issue

### 2. Design / Plan

- Keep the plan short and scoped (no more than a few sentences)
- Reference the parent plan or `DESIGN.md` for any visual/token changes
- Identify `blockedBy` dependencies before starting implementation

### 3. Issue Creation

Open a GitHub issue (or Paperclip issue) with:
- Parent issue reference
- Work mode (`standard`)
- Priority (`high` for customer-visible, `medium` otherwise)
- Any `blockedBy` dependencies
- Acceptance criteria

### 4. Implementation

- Create a feature branch from `main`; never commit directly to `main`
- Follow the commit convention in `CONTRIBUTING.md`
- All customer-visible paths are subject to the internal-copy gate (see § Internal Copy Prohibition)

### 5. Self-Review Checklist

Before requesting review, verify:
- [ ] Preview URL renders correctly
- [ ] `pnpm typecheck` passes with zero errors
- [ ] `pnpm build` succeeds
- [ ] No leaked internal copy (run `scripts/ci/no-internal-copy-in-storefront.sh`)
- [ ] No debug strings (`console.log`, `TODO`, `FIXME` in production paths)
- [ ] Design tokens trace to `DESIGN.md` (run `npx @google/design.md lint DESIGN.md`)

### 6. Reviewer Sign-off

- Reviewer must be `ui-ux` (primary) or `cto` (escalation)
- Sign-off required before deploy; no exceptions for customer-visible changes
- Re-review required if the diff grows beyond the original scope

**Reviewer sub-gates (ui-ux must check every one):**

- [ ] **6a — No-leaked-internal-copy gate.** `internal-copy-gate` CI job on the PR is green (`scripts/ci/no-internal-copy-in-storefront.sh` exits 0). If the job is missing or red, request changes.
- [ ] **6b — Token-system integrity.** Any visual change references `DESIGN.md` / `UX_FRAMEWORK.md` tokens; no raw colour, spacing, font or radius values that bypass the token system. Run `npx @google/design.md lint DESIGN.md` locally if unsure.
- [ ] **6c — Copy fidelity.** Every customer-facing string on the PR matches the exact strings approved in Step 2 (design / plan). New copy not in the approved design is a request-changes, not a "we'll fix later".
- [ ] **6d — Visual sanity.** Screenshots at 1440×900 (desktop), 820×1180 (tablet), 390×844 (mobile) are attached to the PR description when the change affects layout, spacing, type scale or contrast. Compare against `DESIGN.md`; flag any divergence.

If any sub-gate fails, post a "Request changes" review on GitHub naming the failed sub-gate letter.

### 7. Deploy

1. Open a PR targeting `main`
2. CI runs `pr-checks.yml` (typecheck + build + internal-copy gate)
3. `preview-gate.yml` validates the preview URL
4. Reviewer approves and merges
5. Promote from preview to production

## Internal Copy Prohibition

**Rule**: AI / advisory / internal-decision prose MUST NOT appear in customer-visible routes.

Internal analysis belongs in:
- `doc/decisions/`
- Source code comments (non-rendered)

Prohibited strings include but are not limited to:
- "Operations platform recommendation"
- "Why Shopify first"
- "Why Medusa"
- "Alternatives"
- "Buy Buttons or Storefront API can plug into Astro"

A CI gate runs `scripts/ci/no-internal-copy-in-storefront.sh` on every PR. A PR that fails this gate cannot be merged.

## Quick Reference

| Step | Who | Where |
|------|-----|-------|
| Problem framing | Author | Issue body |
| Design / plan | Author | Issue or `doc/decisions/` |
| Issue with blockedBy | Author | GitHub / Paperclip |
| Feature branch | Author | Local |
| Self-review | Author | Local + preview |
| Sign-off | ui-ux or cto | PR review |
| Deploy | CI → Author | `main` merge |
