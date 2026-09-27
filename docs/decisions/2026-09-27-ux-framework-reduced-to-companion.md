# 2026-09-27 — UX_FRAMEWORK.md reduced to a companion of DESIGN.md

Status: Proposed (opened with the STI-438 PR; supersedes the styling content of
the root `UX_FRAMEWORK.md` written in `a1af2a6`).
Author: design-lead.
Related: [STI-438](/STI/issues/STI-438),
[STI-234](/STI/issues/STI-234) (the runbook that surfaced the contradiction).

## Context

`UX_FRAMEWORK.md` was written at the repo's first commit as the design system
document. It was never revised when the brand direction changed to compact
monochrome minimal. For its entire life it has specified the **retired** system:

- an editorial serif display face (Playfair Display / Cormorant / Merriweather)
  with a grotesk body face, against a "no more than two type families" rule;
- a palette carrying the four retired tokens — warm bone `#F7F3EC`, thread-gold
  `#B08D57`, error-ember `#9F3A2F`, ash-silver `#C0C0C0` — plus `#0B0B0B` and
  `#1A1A1A` near-blacks that are not on the current scale;
- an 8px base grid, against the current 4px grid;
- a "2px radius or no radius" button rule, reintroducing the deleted
  `radius-tight` token;
- Thread Gold as the form focus ring, and Ash Silver as the disabled fill —
  the two retired tokens the live design most needs gone.

`DESIGN.md` says the opposite on all five points and is canonical under the
house rule (DT-1): `DESIGN.md` → `app/assets/css/tokens.css` → components. The
runbook landed in PR #50 tells reviewers to reference `DESIGN.md` and not
`UX_FRAMEWORK.md`, and `docs/qa-checklist.md` lists exactly these values as
reject-on-sight. That instruction is correct but it is a patch: a contributor
who opens the root `UX_FRAMEWORK.md` first is told the house style is the
inverse of what QA now bounces.

Two live code comments also cite the file as authority — `app/components/Header.vue`
("Cart pill button … (UX_FRAMEWORK)") and `app/data/products.ts` ("per
UX_FRAMEWORK: 'use sparingly'").

The file is not valueless, though. Three of its sections never were a style
contradiction: brand positioning, the store UX flow, and voice/tone plus
imagery direction. Those are product and brand-intent content, and deleting
them outright would discard real guidance that `DESIGN.md` (a token store with
token-keyed rationale) has no reason to carry.

## Decision

Apply **option 3, rewrite**, not retire and not pointer-only.

`UX_FRAMEWORK.md` becomes a self-declared non-canonical companion that keeps
positioning, customer flows, voice, imagery, and engineering notes, and:

- opens with an explicit precedence statement — `DESIGN.md` wins, and a
  contradiction between the two is a bug in this file;
- contains **no style guidance at all**: no typeface, no hex value, no spacing
  scale, no radius. Every remaining reference to colour, type, spacing or
  radius is a pointer to the `DESIGN.md` block that owns it;
- links the ADR so the deletion of the style sections is auditable.

`DESIGN.md` and `app/assets/css/tokens.css` are **not** touched by this change.
No token changed, so no token needs mirroring, and the
"one-sided `tokens.css` edit" bounce rule does not apply.

A side effect worth recording: the file grew slightly, 157 → 168 lines, while
carrying **less** style content. Every line added is either a pointer to the
`DESIGN.md` block that owns a value, or the precedence statement that makes the
pointers load-bearing. The style half was not compressed — it was deleted,
because every value in it already existed in `DESIGN.md`, and the flow half is
what actually needed keeping.

The two live code comments are left alone in this PR. They are not wrong —
"cart button style" and "badges used sparingly" both still hold, and the values
those rules resolve to now come from `DESIGN.md` — so repointing them is a
separate, app-touching change that would drag a docs-only fix into a storefront
PR and force a three-viewport visual review for two comments. Tracked as
follow-up in the STI-438 issue.

## Alternatives considered

**1. Retire it — delete the file.** Cleanest signal, and it is the right answer
if the only content is style. But the file is the repo's only written record of
positioning, the store flow, and the voice rules, and it is linked from
`docs/`. Deleting it removes real guidance to fix a real problem that a
precedence header solves just as well.

**2. Reduce it to a pointer.** The minimal-diff option, and the lowest risk of
introducing a new stale claim. Rejected because it throws away the flow and
voice sections, which are current, useful, and the reason the file is still
referenced.

**3. Rewrite it against `DESIGN.md`.** Chosen. The style sections are replaced
with pointers to the block that owns them; the non-style sections are kept
essentially as written, with two corrections — the imagery background line
drops "bone" in favour of achromatic grounds, and the form focus-ring rule
(thread gold) is deleted rather than restated, because a restatement is how the
file went stale the first time.

## Consequences

- There is exactly one place to change visual style, and it is `DESIGN.md`.
- A future brand change cannot be contradicted by a stale second document, but
  it can still be ignored by this one. The precedence header states the rule;
  it does not enforce it. The runbook's step-2 checkbox and the QA
  reject-on-sight list remain the enforcement.
- `docs/ui-ux-storefront-review-runbook.md` step 2 said "`UX_FRAMEWORK.md`
  (stale legacy; see § 5)" and pointed at a section that does not exist — the
  runbook has seven numbered steps and no § 5. That pointer is fixed here to
  name the file's own precedence note.
- Cost: a reader who wanted the old style spec must now open `DESIGN.md`. That
  is the intended outcome, not a cost.
- Two code comments still cite `UX_FRAMEWORK.md` as style authority. They are
  not incorrect today and are repointed in a follow-up storefront PR, which
  will then carry the three-viewport review.

## Related

- [`DESIGN.md`](../../DESIGN.md) — the canonical design system.
- [`docs/ui-ux-storefront-review-runbook.md`](../ui-ux-storefront-review-runbook.md)
- [`docs/qa-checklist.md`](../qa-checklist.md)
- [STI-438](/STI/issues/STI-438)
