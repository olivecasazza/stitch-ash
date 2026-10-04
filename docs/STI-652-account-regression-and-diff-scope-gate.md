# STI-652 — /account was deleted out from under a closed issue, and every CI gate stayed green

## The customer-visible defect

`https://preview.stitch-ash.com/account` returns **HTTP 404**.

STI-652 was merged (PR #195, then #198), verified live, and closed as `done`
at 15:11Z on 2026-10-03. Three and a half hours later the route was gone from
the deployed site. The issue was closed on evidence that was true when it was
written and then stopped being true, with nothing on the board to say so.

## The exact mechanism

All three STI-652 files were deleted by **PR #207**, and PR #207's own
subject line does not mention them:

```
f29e7d8 fix(storefront): facts in the expander, wordmark+cart header, no footer, cart on the token ramp (#207)

 app/pages/account.vue                     | 165 ------------------------------ app/utils/customer-account.ts             |  75 --------------
 src/catalog/account-order-history.test.ts | 145 --------------------------
 3 files changed, 385 deletions(-)
```

`f29e7d8` is a **squash** merge — it has exactly one parent, `d654f06` (PR
#206). #206 merged at 17:32Z, after STI-652's 15:07Z merge. So the sequence is:

| time (2026-10-03) | event |
| --- | --- |
| 14:29Z | PR #195 merged — `/account` wired to live Shopify customer accounts |
| 15:07Z | PR #198 merged — indentation and EOF newline fixes |
| 15:11Z | STI-652 verified live, closed `done` |
| 17:32Z | PR #206 merges; `d654f06` still **has** `app/pages/account.vue` |
| 17:52Z | PR #207 opened |
| 18:31Z | PR #207 squashed to `f29e7d8`, deleting all three files |

The STI-652 merge commit `908f6ee` **is still an ancestor of `main`**. Nothing
reverted it. The files were carried forward in history and then deleted on top
of it, so `git log` shows the work landing and the log never shows it leaving.

**This was not design intent.** DESIGN.md:612 says there is "no other
navigation anywhere in the chrome — no Shop, Story or Account links — and
there is no site footer." That constrains the *header and footer*, and it is
correctly implemented by the absence of a nav link. It says nothing about the
`/account` route existing. The route existing while the chrome does not link it
is exactly how `/contact` already works: `app/pages/contact.vue` is on `main`
and is not in the chrome either. The author of #207 additionally left
`.contact__link / .account__link` referenced in
`app/components/DetailsAccordion.vue:152`, so the account link class was
still expected to exist. A declared removal of `/account` would have been a
defensible decision to make; an undeclared one, made by a PR about the PDP
expander, is the defect.

## Why every existing gate stayed green

Each gate in `pr-checks.yml` asserts a property **of the surviving
repository**:

- the radius gate reads the built stylesheet
- the token-drift gate reads DESIGN.md and tokens.css
- the storefront-mock gate reads nuxt.config.ts
- the catalog gates read catalog/products and the live store

All of them are perfectly green on a repo that has had a feature deleted out
from under it. **A gate that only checks the surviving state cannot detect a
removal, because the removal is exactly what it cannot see.** And deleting
`account-order-history.test.ts` removed the only test that referenced
`customer-account.ts`, so the test suite lost its own coverage of the deletion
in the same commit.

## The gate

`scripts/ci/diff-scope-gate.sh` is the only gate here that reads the **diff**
rather than the surviving tree. It fails a PR that deletes tracked files it did
not declare it was deleting.

**Declaration-based, not "no deletions allowed".** Deleting dead code is
legitimate and this repo does it on purpose — `13a2c70` (#213) removed the
Configurator component tree and `e758025` (#151) removed a Rust-only release
workflow. A gate that failed every deletion would be disabled within a week,
and a disabled gate protects nothing. So a deleted path is fine when the PR
says it is deleting it in a machine-checkable way. The point is not to forbid
the act; it is to make it legible to the reviewer, who is the only person who
can distinguish an intended deletion from an accident.

**What the declaration is not.** The gate does not judge whether the declared
files were a good idea to remove, or whether anything else needed updating.
A reviewer who disagrees with a declared deletion should block it like any
other decision. What this removes is the ability for a deletion to arrive
unmentioned in a PR whose subject line is about something else.

`scripts/ci/diff-scope-gate.test.sh` self-tests 18 cases, including replaying
the real #207 (`f29e7d8`) and the real #213 (`13a2c70`) — both are caught, and
restoring the files is correctly not a deletion.

## What this PR restores

- `app/pages/account.vue` — byte-identical to the merged #198 version
- `app/utils/customer-account.ts` — byte-identical
- `src/catalog/account-order-history.test.ts` — byte-identical, so the coverage
  the deletion removed comes back with it

No header or footer nav link is added, so DESIGN.md:612 still holds.
