# Catalog source of truth: one owner for product status and inventory policy

- **Date:** 2026-09-28, amended 2026-09-29 (STI-557), amended 2026-09-29 and
  2026-09-30 (STI-552 — the pre-apply guard)
- **Status:** **Owner decision already settled** — see "The owner was already
  ratified" below. What remains open is execution of the terranix removal
  (STI-531), not the choice of owner.
- **Author:** commerce-eng (`7fe07aa9`)
- **Supersedes:** nothing. Narrows `2026-07-21-shopify-as-system-of-record.md` to
  the two fields that are currently declared twice.

## The owner was already ratified (2026-09-29, STI-552)

An earlier version of this document asked the operator to ratify the owner. That
question was already answered, and this document was wrong to re-open it.

On **2026-07-28** the operator signed off on [STI-239](/STI/issues/STI-239)
verbatim:

> OPERATOR SIGN-OFF: Option A approved — repo catalog/products/*.yaml is the
> single source of truth. … main YAML is ACTIVE/CONTINUE (conflict confirmed).

That is the same owner this ADR proposes. It is not a new proposal; it is a
restatement of a decision already on the record, made 63 days earlier. Anyone
reading the "needs operator ratification" line above would reasonably conclude
the question was open, and could spend a review cycle re-deciding it.

Two consequences worth stating separately, because they are genuinely open and
were not decided on 2026-07-28:

1. **The terranix side was never done.** Step 4 of that sign-off assigned the
   `tofu state rm` and the nixlab PR to the operator. It has not happened. That
   is [STI-531](/STI/issues/STI-531), and it is the part that still carries the
   de-listing risk. It is an unexecuted instruction, not an unmade decision.
2. **`inventory_policy` is a scope extension.** The 2026-07-28 sign-off reasoned
   about `status` in its body. It predates the `inventory_policy` half of this
   ADR, which was added by STI-557. The owner is settled; the *second field* is
   a new observation about a field that was already ratified as repo-owned under
   the same rule.

## The conflict, read from both files this run

Product status **and inventory policy** are declared in two repos, and they
disagree on both fields.

| handle | `catalog/products/*.yaml` (this repo) | `nix/tofu/shopify/terranix.nix` (nixlab) |
|---|---|---|
| `sku-001` | `status: ACTIVE`, `inventoryPolicy: CONTINUE` | `status = "draft"`, `inventory_policy = "deny"` |
| `sku-002` | `status: ACTIVE`, `inventoryPolicy: CONTINUE` | `status = "draft"`, `inventory_policy = "deny"` |
| `sku-003` | `status: ACTIVE`, `inventoryPolicy: CONTINUE` | `status = "draft"`, `inventory_policy = "deny"` |

Live store, Admin GraphQL, read-only probe, 2026-09-29:

```
sku-001 | status=ACTIVE | totalInventory=-1  | 5 variants, policy=CONTINUE
sku-002 | status=ACTIVE | totalInventory=0   | 1 variant,  policy=CONTINUE
sku-003 | status=ACTIVE | totalInventory=0   | 1 variant,  policy=CONTINUE
```

All three are **live and ACTIVE** right now, on `CONTINUE`. The catalog matches
the store. The nixlab terranix file disagrees with both.

## Why this is a live hazard, not a documentation nit

`nix/tofu/shopify/terranix.nix` sets `update_method = "PUT"` on each
`restapi_object` product. A tofu apply is therefore not a no-op on a populated
store: it PUTs `status: "draft"` over three ACTIVE products and de-lists all of
them in a single run.

That is **STI-531**, and it is the same hazard **STI-269** was cancelled for
attempting by a different route — a `catalog:apply` diff that flipped
`ACTIVE -> DRAFT`. Two independent paths to the same customer-visible outage.
`lifecycle.prevent_destroy = true` does not help here: preventing destroy does
nothing about a PUT that overwrites status.

The failure is also silent in the way that matters. An operator opening
`terranix.nix` reads `status = "draft"` and sees a correct-looking declaration,
because that *is* what the file says. Nothing in either repo points at the other.
The conflict is only visible when both files are read side by side, which is
precisely what a doc comment discourages anyone from doing.

## The two fields fail differently, and the second one is the quieter hazard

STI-557 measured both. They are not the same risk, and only one of them is
obvious.

**`status`** fails loudly. A flipped status is visible immediately: the product
leaves the storefront, the collection loses a member, the URL 404s. Someone
notices within minutes.

**`inventory_policy` fails silently.** A flip from `CONTINUE` to `DENY` leaves
the product listed, named, priced, and reachable — it only refuses to sell once
inventory is at or below zero. On this store that is *every* variant:

```
sku-001-S  qty= 0  policy=CONTINUE  -> sellable
sku-001-M  qty= 0  policy=CONTINUE  -> sellable
sku-001-L  qty=-1  policy=CONTINUE  -> sellable
sku-001-XL qty= 0  policy=CONTINUE  -> sellable
sku-001-XXL qty= 0  policy=CONTINUE  -> sellable
sku-002    qty= 0  policy=CONTINUE  -> sellable
sku-003    qty= 0  policy=CONTINUE  -> sellable

7 of 7 currently-sellable variants sit at or below zero inventory.
A DENY flip blocks checkout on 100% of purchasable stock.
```

That is the worse outcome, because the storefront looks correct. A customer
reaches a product page, picks a size, and is refused at checkout — with no
visible reason. A de-listing at least looks like a de-listing.

## The gate had a false green, and the operator's obvious fix caused it

The gate from PR #106 compared `status` only. The obvious operator response to
it is to make the two files agree by editing the terranix status:

```
status = "draft"   ->   status = "active"
```

Run against that fixture, the shipped gate reported `agree` on all three
handles and **exited 0** — while `inventory_policy = "deny"` stood untouched in
the same product blocks. The gate went green on a state worse than the one it
was written to catch, because the operator had done the one thing the gate
rewarded.

A gate that only fails on disagreement is a gate that passes on the cheapest
available edit.

Two changes, both in `scripts/ci/catalog-status-ownership-gate.sh`:

1. `inventory_policy` is compared alongside `status`, aggregated across each
   product's variants on both sides. A field declared on one side and absent on
   the other counts as a conflict, because "tofu will not PUT this field" and
   "tofu will PUT `deny`" are different deploy behaviours.
2. A terranix file that parses to zero comparable rows now **exits 1**. It used
   to print `nothing to compare` and exit 0. A file that yields no rows is not a
   file that agrees with this one, and a syntax change in a sibling repo must not
   be able to turn a cross-repo gate green.

`scripts/ci/catalog-status-ownership-gate.test.sh` pins all of it, including the
exact status-only-edit fixture, and both run in CI. 8 tests, no Node, no
secrets.

## The decision

**`catalog/products/*.yaml` in this repo is the single owner of product status
and of product inventory policy.**

`nix run .#deploy-shopify` must not manage either field. The terranix
declarations should drop `status` and `inventory_policy` rather than be kept as
a second, stale source.

Why this repo wins:

1. **It matches the live store.** The store is the ground truth for what a
   customer can buy, and the catalog agrees with it today on both fields.
2. **It is where the reviewable diff lives.** `catalog:plan` produces a
   human-readable per-product diff and `catalog:apply` is gated behind operator
   approval of that exact diff. The terranix path has neither — a tofu apply is
   a raw PUT with no plan step.
3. **It is under the gates.** `catalog:test` and `catalog:validate` run on every
   PR. A terranix product status is checked by nothing.

What nixlab keeps: it remains the owner of infrastructure — domains, DNS
verification, webhook path, and the `SHOPIFY_*` secret material in SOPS. Those
are not duplicated here and are not in conflict. This ADR scopes to product
status and product inventory policy only.

## What is being changed, and what is not

- **Changed here:** this ADR, the widened gate, and the new gate test suite.
- **NOT changed:** the nixlab terranix file. Editing another repo's IaC is not
  commerce-eng's to do unilaterally, and the edit is destructive-adjacent
  (it changes what a deploy does to a live store). It is the operator's call.
- **NOT done:** no `catalog:apply` was run. The live plan is 0 pending product
  actions, so there is no product diff to approve anyway. The one open money
  decision is the international shipping rate, tracked on STI-539/STI-536 and
  deliberately not touched here.

## The gate

`scripts/ci/catalog-status-ownership-gate.sh` compares this repo's declared
statuses **and inventory policies** against the adjacent nixlab terranix
declaration and **fails loudly on disagreement**. It is the mechanical form of
this ADR: the conflict is no longer something a reader has to notice.

Scope, stated honestly:

- It compares **declared text**. It does not call the Shopify Admin API and reads
  no secret. Live state is verified by `catalog:plan` under operator-supplied
  credentials.
- In CI the nixlab tree is not checked out, so the cross-repo comparison reports
  **SKIPPED (not a pass)** and the single-repo invariant is enforced. Running it
  with `NIXLAB_DIR` pointed at a nixlab clone performs the full comparison.
- It is designed to fail on today's real tree. If it passes in your checkout,
  you are not pointed at a nixlab clone — check the `NOT REACHABLE` line.

Against the real clone (`casazza-info/nixlab` @ `a9364483`), 2026-09-29:

```
CONFLICT on sku-001 (product_hoodie):
    status           catalog=ACTIVE  terranix=draft
    inventory_policy catalog=CONTINUE  terranix=deny
... same for sku-002, sku-003
FAIL: 3 product(s) are declared with conflicting status and/or inventory_policy in two repos.
exit 1
```

## Operator decisions this ADR asks for

The first is **retracted** — it was already decided on 2026-07-28.

1. ~~**Ratify this owner**~~ — **already ratified 2026-07-28 (Option A,
   [STI-239](/STI/issues/STI-239))**: repo `catalog/products/*.yaml` is the single
   source of truth. No further ratification is needed for the owner. This ADR
   documents the existing decision and extends it to `inventory_policy`.
2. **[STI-531](/STI/issues/STI-531) — execute, not decide.** The 2026-07-28
   sign-off already assigned this: `tofu state rm` the product resources first
   (`prevent_destroy` makes a config-removal plan error otherwise), then a nixlab
   PR removes `status` and `inventory_policy` from
   `nix/tofu/shopify/terranix.nix`. Do not delete the GCS state path. Until this
   runs, a tofu apply still PUTs `draft`/`deny` over three live ACTIVE products.
3. **[STI-539](/STI/issues/STI-539) / [STI-536](/STI/issues/STI-536) — still
   open.** The international rate direction ($0.00 live vs $25.00 declared) is a
   customer-facing money decision with no owner. Untouched here.

Do **not** resolve the status conflict by editing the terranix `status` alone.
That is the edit the previous gate rewarded, and it leaves `inventory_policy =
"deny"` in place — see the false green above. Remove both fields, or neither.

## One thing this ADR deliberately does not do

It does not revisit the `ACTIVE`/`CONTINUE` values themselves. Step 5 of the
2026-07-28 sign-off deferred the ACTIVE/CONTINUE flip to "a separate, later,
operator-approved plan diff — it is the go-live decision, not part of adoption."
[STI-269](/STI/issues/STI-269) was that diff, and it was **cancelled** as a stale
artifact precisely so the flip would not run. The live store has served
`ACTIVE`/`CONTINUE` since, and a completed test purchase depends on it
(`docs/test-purchase-handoff.md`). Settling the owner does not settle the values;
if the values should ever change, that is a fresh `catalog:plan` diff put to the
operator as its own decision.

## The gate was red and still protected nothing (added 2026-09-30, STI-552)

Re-verified this run, on `main` at `9d598a7`:

```
$ NIXLAB_DIR=<real nixlab clone> ./scripts/ci/catalog-status-ownership-gate.sh
CONFLICT on sku-001/002/003:  status catalog=ACTIVE terranix=draft
                             inventory_policy catalog=CONTINUE terranix=deny
FAIL: 3 product(s) ...          exit 1
```

So the gate is red on the real tree, exactly as intended. The problem is that a
red gate in the wrong repo stops nobody. Two measured facts:

1. **CI can never evaluate this gate's cross-repo half.** nixlab is a private
   repo (`casazza-info/nixlab`, `visibility=private`, read from the GitHub API
   on 2026-09-30). `pr-checks.yml` checks out only this repo, so on a runner the
   gate prints `NOT REACHABLE — cross-repo comparison SKIPPED (not a pass)` and
   exits 0. Verified: `NIXLAB_DIR=/nonexistent ./…-gate.sh` → `exit 0`. The green
   CI job is a single-repo invariant check wearing the name of the cross-repo
   one.
2. **Nothing runs a check between `tofu plan` and `tofu apply`.**
   `apps/deploy-shopify.nix` has zero references to this repo's catalog, gate, or
   `catalog:plan` (`grep -c` → `0`). Its only pre-apply interaction is
   `read -rp "Apply? (yes/no)"`, and `--auto-approve` sets `CONFIRM=yes` with no
   prompt at all.

Between them: the hazard is detected in a repo that cannot see it, and enforced
nowhere at the point where it would land. That is the gap this ADR's remaining
section closes.

## The pre-apply guard: `scripts/ci/deploy-shopify-preflight.sh`

A guard that runs **inside the deploy**, against the artifact the deploy would
actually send. It reads the **generated `config.tf.json`** — the exact bytes
`tofu apply` would PUT to Shopify, after terranix has rendered them — and exits
non-zero when the plan would:

- set a catalog-`ACTIVE` product to any other status (**de-listing**), or
- set `deny` on a catalog-`CONTINUE` product (**checkout-blocking**, and silent
  — the product stays listed, priced and reachable), or
- set `mixed` inventory policies across a product's variants (the outcome then
  depends on which variant the buyer picks, and neither side can represent it), or
- omit `inventory_policy` entirely, which under `update_method = "PUT"` is a
  whole-product rewrite and therefore a silent policy change, not a no-op, or
- manage a product the catalog does not declare at all.

It also fails, rather than passing, when it cannot read the config, when the
config declares zero products, and when a terranix shape change leaves it
unable to find any product. **Silence is never reported as a pass** — the same
invariant the ownership gate was widened for in STI-557.

### Why it reads `config.tf.json` and not `terranix.nix`

Re-parsing the Nix would be a second implementation of terranix's own semantics,
and it would be wrong the moment terranix renders a field the parser does not
model. `config.tf.json` is the artifact that is actually applied, so this needs
no Nix evaluation, needs no access to the private repo, and catches the hazard
regardless of which file declared it. That is what makes it usable in CI, where
the ownership gate is structurally blind.

### Wiring

`scripts/ci/deploy-shopify-preflight.test.sh` — **16 assertions**, runs in
`pr-checks.yml` on every PR, no Node and no secrets. It includes the
status-only "fix" fixture, so the false green that STI-557 had to correct
cannot come back through this door either. `scripts/ci/render-terranix-fixture.py`
renders the committed terranix fixture into the JSON shape the real deploy
produces, so the suite tests the **real** declaration rather than a hand-typed
reduction; the last assertion runs against a live nixlab clone when
`NIXLAB_DIR` is set, and reports **SKIPPED (not a pass)** when it is not.

**What it does not do:** it does not remove the terranix fields, and it does not
decide the owner. The hazard is now *blocked* rather than *fixed*; the fix is
still [STI-531](/STI/issues/STI-531), still operator-side, still not done. A
guard that turns a loud silent-failure into a loud refusal is not a reason to
leave the declaration in place.
