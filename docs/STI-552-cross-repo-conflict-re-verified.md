# STI-552 re-verification: the cross-repo conflict is real, armed, and unguarded

Agent `commerce-eng` (`7fe07aa9`), run `0dabc569-c12e-4e16-a711-36120a8cebbf`,
2026-10-01T13:00Z.

**No `catalog:apply` was run. No `tofu apply` was run. No `SHOPIFY_*` value
appears in this file.** Every command below is read-only except the
`git fetch`/`git show` in the nixlab clone, which only reads.

## Why this file exists

STI-552 has sat `in_review` across several runs because a decision card was
believed outstanding. That belief was wrong: the owner was ratified
2026-07-28 (STI-567), the ADR and the guard shipped in PR #149 (`7367c2f`,
merged to main). But a correct guard that nothing calls is not a control.

This run is the first to execute the cross-repo half of the STI-552 checks
for real, because a readable nixlab clone was available on this host. It is
also the first to state plainly which of the three layers holds and which two
do not.

## Layer 1 — repo catalog to live store: AGREES (green)

`catalog:plan` against the live Admin API, `client_credentials` mint, no
secret values printed:

```
catalog: loaded 3 products / 1 collections / 1 shipping policies
catalog: validation passed
shopify-admin: client ready (source=client_credentials, domain=stitch-and-ash.myshopify.com)
stitch-ash.sku-001: no changes
stitch-ash.sku-002: no changes
stitch-ash.sku-003: no changes
stitch-ash.collection.featured: no changes
catalog: plan complete; 0 pending product actions
```

The ratified owner agrees with production. Nothing to fix here.

## Layer 2 — repo catalog to nixlab terranix: CONFLICT (red, armed)

`NIXLAB_DIR=<clone> ./scripts/ci/catalog-status-ownership-gate.sh`

```
    sku-001      ACTIVE   policy=CONTINUE
    sku-002      ACTIVE   policy=CONTINUE
    sku-003      ACTIVE   policy=CONTINUE
  nixlab terranix: <clone>/nix/tofu/shopify/terranix.nix

CONFLICT on sku-001 (product_hoodie):
    status           catalog=ACTIVE  terranix=draft
    inventory_policy catalog=CONTINUE  terranix=deny
... (sku-002, sku-003 identical)
FAIL: 3 product(s) are declared with conflicting status and/or inventory_policy in two repos.
exit 1
```

This is the check that **cannot run in CI**, because `casazza-info/nixlab` is
private and `pr-checks.yml` checks out this repo only. On a runner the same
command prints `NOT REACHABLE ... SKIPPED (not a pass)` and exits 0. Confirmed
by running it here with no `NIXLAB_DIR`:

```
  nixlab terranix: NOT REACHABLE — cross-repo comparison SKIPPED (not a pass)
exit 0
```

The clone used is not stale: `git fetch origin` then
`git diff HEAD origin/main -- nix/tofu/shopify/terranix.nix` is empty, so this
is nixlab main at `79a86037`.

## Layer 3 — the guard itself: WORKS (red as designed)

`terranix-projection-pin.sh --compare <real terranix>`

```
terranix projection pin: MATCH
    sku-001  draft  deny  product_hoodie
    sku-002  draft  deny  product_lanyard
    sku-003  draft  deny  product_sticker
    products 3
    projection-sha256 0230fc408503d64269d74299b504f48aae2bf2a33722061ffd4908a2261b64d2
exit 0
```

The committed fixture still describes the real declaration, so
`deploy-shopify-preflight.test.sh` (21 passed, 0 failed) is testing the right
shape.

Rendering the **real** `terranix.nix` to the JSON `tofu apply` would send
(`render-terranix-fixture.py`) and running the guard on it:

```
  handle       catalog            tofu plan
  sku-001      active/continue    draft/deny
    ^ DE-LISTING: catalog declares sku-001 ACTIVE, this plan sets it to 'draft'.
    ^ CHECKOUT-BLOCKING: catalog declares sku-001 CONTINUE, this plan sets deny.
      The product stays listed and only fails at checkout.
  ... sku-002, sku-003 identical
FAIL: 6 hazard(s) in the generated plan. Not applying.
exit 1
```

So the guard is not theoretical. Against the real declaration it correctly
detects all 6 hazards.

## The gap: nothing calls the guard

`apps/deploy-shopify.nix` at nixlab `origin/main`, lines 110-120:

```bash
    tofu plan -lock=false -out="$WORK_DIR/plan"
    ...
    if [ "$CONFIRM" = "yes" ]; then
      tofu apply -lock=false "$WORK_DIR/plan"
```

```
$ git -C <nixlab> show origin/main:apps/deploy-shopify.nix \
    | grep -iE 'preflight|stitch-ash|catalog-status|ownership'
NO REFERENCE — guard is not wired into the apply path

$ git -C <nixlab> grep -ln 'deploy-shopify' origin/main -- .github/
no .github workflow references deploy-shopify
```

The human `read -rp "Apply?"` prompt is the only thing standing between an
operator and a 6-hazard de-listing. There is no automation, no CI, and no
preflight on that path. This is the residual risk STI-561 describes, and it is
in a repo this agent must not modify: wiring the guard requires either an edit
to `apps/deploy-shopify.nix` (nixlab) or a `tofu state rm` against GCS state
(operator authority, HARD RULE 5).

## What is green vs what is not

| layer | verdict | who owns the fix |
|---|---|---|
| catalog vs live store | green, 0 actions | none needed |
| catalog vs terranix | **red, 3 products** | nixlab (operator) |
| preflight guard logic | green, 6 hazards caught | none needed |
| guard wired into apply path | **absent** | nixlab (operator) |

## Disposition

STI-552's decision question is answered and its guard is on main. This issue
should close as `done`. The remaining work is not a decision and not in this
repo: it is removing the terranix `status`/`inventory_policy` declarations, or
gating `tofu apply`, in nixlab. That is STI-531, operator-assigned and
unowned-assignee, and it must not be closed on the strength of anything here.