# STI-669 — deletion scope gate: CI evidence

Captured from GitHub Actions run 37175393366, job 111356839466
(`deletion-scope-gate`, head commit 1866ab0), run on PR #215.
Conclusion: `success`.

This file exists so the gate's proof that it catches the defect is a durable
artifact rather than a claim in a comment that scrolls away. The lines below
are the raw `deletion-scope-gate` job log, verbatim, with the timestamp prefix
stripped.

What it shows:

- **AC1, failing direction** — the self-test runs the gate against the real
  `f29e7d8` diff and asserts a non-zero exit naming all three out-of-scope
  deletions.
- **AC1, passing direction** — the gate itself passes on `main`
  (`13a2c704`), the same commit it is compared against.
- **AC3** — the self-test asserts a deleted test with no surviving
  replacement is a failure.

Re-verify with:

    gh run view --repo olivecasazza/stitch-ash --job 111356839466 --log

---

##[group]Run ./scripts/ci/deletion-scope-gate.test.sh
./scripts/ci/deletion-scope-gate.test.sh
shell: /usr/bin/bash -e {0}
##[endgroup]
deletion-scope-gate self-test (STI-669)
ok   undeclared app/pages + app/utils deletion fails (expected fail, got exit 1)
ok   output names 'app/pages/account.vue'
ok   output names 'app/utils/customer-account.ts'
ok   in-scope deletion described in the commit title still fails (expected fail, got exit 1)
ok   declared + signed-off deletion passes (expected pass, got exit 0)
ok   declaration without sign-off fails (expected fail, got exit 1)
ok   output names 'sign-off'
ok   declaration without issue fails (expected fail, got exit 1)
ok   output names 'issue'
ok   non-STI issue id fails (expected fail, got exit 1)
ok   test deletion with no replacement fails (AC3) (expected fail, got exit 1)
ok   output names 'replacement'
ok   test deletion with a missing replacement fails (expected fail, got exit 1)
ok   output names 'does not exist at HEAD'
ok   test deletion with a surviving replacement passes (expected pass, got exit 0)
ok   deletion outside guarded surface passes undeclared (expected pass, got exit 0)
ok   PR with no deletions passes (expected pass, got exit 0)
ok   modified page is not treated as a deletion (expected pass, got exit 0)
ok   rename away from the guarded surface fails as a deletion (expected fail, got exit 1)
ok   f29e7d8's diff reports all three out-of-scope deletions
ok   gate FAILS on f29e7d8's diff (exit 1)
ok   output names 'app/pages/account.vue'
ok   output names 'app/utils/customer-account.ts'
ok   output names 'src/catalog/account-order-history.test.ts'
ok   committed manifest declares no deletions

deletion-scope-gate self-test: 25 passed, 0 failed
##[group]Run ./scripts/ci/deletion-scope-gate.sh
./scripts/ci/deletion-scope-gate.sh
shell: /usr/bin/bash -e {0}
##[endgroup]
Deletion-scope gate: passed (no deletions under app/pages/ app/utils/ app/composables/ src/catalog/ vs 13a2c7043a84d1701e8c90c8de8ac305b1d605bb)
