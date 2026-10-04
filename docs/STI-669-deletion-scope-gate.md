# STI-669 — deletion-scope gate: final state

Authoritative record for the gate that exists because PR #207 (`f29e7d8`) carried
three out-of-scope deletions through a chrome/copy PR with CI green, silently
removing two verified-live features (STI-633, STI-652).

## What is on `main`

| PR | Commit | Contents |
| --- | --- | --- |
| #215 | `398db4e` | `scripts/ci/deletion-scope-gate.sh`, `deletion-scope-manifest.txt`, `deletion-scope-gate.test.sh` |
| #216 | `090349e` | restore of `app/pages/account.vue`, `app/utils/customer-account.ts`, `src/catalog/account-order-history.test.ts` |
| #218 | `fe27fcb` | non-vacuous self-test (`GATE_UNDER_TEST`, both diff ends pinned) |
| #222 | `b85c777` | gutting half of AC3 — assertion-count comparison, `# baseline:` override |
| #223 | `dc5a2ba` | `# baseline:` override actually implemented (squash of `195e44a`) |
| #231 | `643ae06` | **F1 fix** — gutting checked repo-wide, not just the guarded prefixes |

The gate runs in `.github/workflows/pr-checks.yml` as the `deletion-scope-gate`
job: the self-test first, then the gate. `deletion-scope-gate` is a **required**
status check on `main` (added during STI-669 after PR #216 was found merged
with the gate red).

## The contract, precisely

- **Deletion** is checked for four prefixes: `app/pages/`, `app/utils/`,
  `app/composables/`, `src/catalog/`. Keys off
  `git diff --diff-filter=D --name-only --no-renames` — never the PR title or
  body. Fails closed on an unresolvable base or head ref.
- **Test deletion** additionally requires `# replacement:` naming a test that
  survives at HEAD. Deleting a test is never a silent default.
- **Gutting** — the assertions dropped while the path survives, so no deletion
  is emitted and nothing else in CI notices — is checked for **every** test the
  diff touches, repo-wide (F1). An intentional reduction requires
  `# baseline:` plus a valid `# issue: STI-nnn`, a `# sign-off:` and a
  `# reason:`; an incomplete or inflated override fails.
- A deliberate deletion or reduction is legal only via
  `scripts/ci/deletion-scope-manifest.txt`. That file is the surface a reviewer
  has to read.

## Verification

Independently confirmed by qa-verifier on STI-672 (`VERDICT: PASS WITH FINDINGS`,
16-case adversarial harness written from scratch, `GATE_UNDER_TEST` pointed at a
do-nothing `exit 0` stub to prove the suite is not vacuous).

F1 was the one actionable finding and is fixed in #231. Measured A/B on one
identical attack tree — `scripts/deterministic-asset-manifest.test.mjs` emptied
in place, committed, zero deleted paths:

| gate | verdict |
| --- | --- |
| `fb801ec` (before) | `passed …` exit **0** — the gap |
| `643ae06` (after) | `ERROR: … test GUTTED — assertions fell 44 -> 0` exit **1** |

Suite: 48 passed, 0 failed. Repo suites unaffected: `pnpm catalog:test` 232/232,
`node --test scripts/*.test.mjs` 77/77.

## Standing caveats

- **The manifest is the trust surface.** A deletion or reduction declared there
  with an issue, a sign-off and a reason still merges. That is deliberate — dead
  code removal is legitimate in this repo (`13a2c70` removed the Configurator
  tree) — but it means the gate's value is bounded by review discipline on that
  file.
- **`gh pr view --json statusCheckRollup` is not authoritative.** It has
  rendered `deletion-scope-gate` as success on a run whose `gh run view` reports
  `conclusion: failure`. Use `gh run view <id>` and `mergeStateStatus`.
- **Rendered visual evidence for `/account` is still unverified.** qa-verifier
  had no renderer (F2). A static token scan is not a substitute. Needs an agent
  with the visual-review skill at 1440x900, 820x1180, 390x844.
