#!/usr/bin/env tsx
import * as path from "node:path";
import { loadCatalogDirectory, loadCollectionDirectory } from "../src/catalog/load.ts";
import { diffInventory } from "../src/catalog/inventory.ts";
import { diffShipping, loadShippingPolicies } from "../src/catalog/shipping.ts";
import {
  applyCollection,
  applyProduct,
  createShopifyAdminClient,
  diffCollection,
  diffProduct,
  getCollectionByHandle,
  getDeliveryProfiles,
  getProductByHandle,
} from "../src/catalog/shopify-admin.ts";
import { describeReachability, PROBE_POSTAL_CODES, verdictFor } from "../src/catalog/checkout-rates.ts";
import { probeCheckoutRates, storefrontClientFromEnv } from "../src/catalog/storefront-rates.ts";

/**
 * STI-539: representative countries for a `REST_OF_WORLD` shipping rule.
 *
 * A `REST_OF_WORLD` rule declares a price for every country Shopify does not
 * put in another zone. Probing one country proves nothing about the rest, and
 * probing all of them is a hundred-plus API calls on every plan. This spread is
 * deliberately multi-region: a single-country probe would pass while whole
 * continents stayed unsellable.
 */
const REST_OF_WORLD_PROBES = ["CA", "GB", "DE", "AU", "JP"] as const;

const command = process.argv[2] ?? "validate";
const root = process.cwd();
const catalogDir = path.join(root, "catalog", "products");
const collectionDir = path.join(root, "catalog", "collections");
const shippingDir = path.join(root, "catalog", "shipping");

function printUsage(): never {
  console.error(`Usage: pnpm catalog <validate|plan|apply>`);
  process.exit(2);
}

async function main() {
  if (!["validate", "plan", "apply"].includes(command)) printUsage();

  const products = await loadCatalogDirectory(catalogDir);
  const collections = await loadCollectionDirectory(collectionDir);
  const shippingPolicies = await loadShippingPolicies(shippingDir);
  console.log(`catalog: loaded ${products.length} products`);
  console.log(`catalog: loaded ${collections.length} collections`);
  console.log(`catalog: loaded ${shippingPolicies.length} shipping policies`);

  // STI-471: a collection may only name a product handle this catalog defines.
  // Catching it at validate time keeps `apply` from ever sending a membership
  // list containing an unresolvable id.
  const knownHandles = new Set(products.map(p => p.handle));
  const unknownRefs = collections.flatMap(c =>
    c.products.filter(handle => !knownHandles.has(handle)).map(handle => `${c.id}: unknown product handle "${handle}"`),
  );
  if (unknownRefs.length > 0) {
    throw new Error(`Catalog validation errors:\n${unknownRefs.join("\n")}`);
  }

  if (command === "validate") {
    console.log("catalog: validation passed");
    return;
  }

  const client = await createShopifyAdminClient();
  const diffs = [];
  const productIdsByHandle = new Map<string, string>();
  // STI-605: kept so the inventory pass below reuses the product already read
  // above instead of paying for a second `getProductByHandle` per product.
  const remoteByHandle = new Map<string, Awaited<ReturnType<typeof getProductByHandle>>>();
  const inventoryDrift: string[] = [];
  const oversoldVariants: string[] = [];

  for (const product of products) {
    const remote = await getProductByHandle(client, product.handle);
    if (remote) productIdsByHandle.set(product.handle, remote.id);
    remoteByHandle.set(product.handle, remote);
    diffs.push(diffProduct(product, remote));
  }

  const collectionDiffs = [];
  for (const collection of collections) {
    const remote = await getCollectionByHandle(client, collection.handle);
    collectionDiffs.push(diffCollection(collection, remote));
  }

  let changeCount = 0;
  for (const diff of diffs) {
    if (diff.actions.length === 0) {
      console.log(`${diff.product.id}: no changes`);
      continue;
    }

    changeCount += diff.actions.length;
    console.log(`${diff.product.id}:`);
    for (const action of diff.actions) console.log(`  - ${action}`);
  }

  // STI-471: collection membership is storefront state, so it is planned and
  // approved alongside product fields rather than silently drifting.
  for (const diff of collectionDiffs) {
    if (diff.actions.length === 0) {
      console.log(`${diff.collection.id}: no changes`);
      continue;
    }

    changeCount += diff.actions.length;
    console.log(`${diff.collection.id}:`);
    for (const action of diff.actions) console.log(`  - ${action}`);
  }

  // STI-605: stock is REPORTED, never planned — the same shape shipping already
  // uses, and for the same reason.
  //
  // `diffProduct` compares price, inventoryPolicy and the `normalize*`
  // allowlist, and never `inventoryQuantity`, because `catalog:apply` cannot
  // write inventory: `ProductInput` has no inventory field, so stock moves only
  // through `inventoryAdjustQuantities` against an `inventoryItemId` this
  // reconciler never resolves. An inventory difference therefore CANNOT go in
  // `actions` — an approver would read `set inventory: 0 -> 24` and apply would
  // change nothing, which is the plan lying in the worst possible way.
  //
  // What it was doing instead was printing `no changes` for every product while
  // all 7 sellable variants sat at or below zero. That is false green: a clean
  // run that reads as "this catalog is reconciled" while the store sells past
  // zero. So this block is reported-only, sits outside `changeCount`, and says
  // on every line that apply does not write it.
  for (const product of products) {
    const diff = diffInventory(product, remoteByHandle.get(product.handle) ?? null);
    inventoryDrift.push(...diff.notes.map(note => `inventory: ${note}`));
    for (const finding of diff.oversold) {
      oversoldVariants.push(`${product.id}/${finding.sku} (${finding.storeQuantity})`);
    }
  }

  if (inventoryDrift.length > 0) {
    console.log("");
    console.log(
      `inventory: ${inventoryDrift.length} declared-vs-store difference(s) found (reported only — catalog:apply does NOT write inventory):`,
    );
    for (const line of inventoryDrift) console.log(`  - ${line}`);
  }

  // The negative rows are called out on their own. Zero is an empty shelf;
  // negative is an order the store has already accepted for stock it does not
  // have, and it is the only stock state a customer can already be harmed by.
  // It is owed to the operator rather than to a code change: writing stock, or
  // flipping inventoryPolicy to DENY at zero, is a spend/policy decision
  // (HARD RULE 5, and STI-532).
  if (oversoldVariants.length > 0) {
    console.log("");
    console.log(
      `inventory: OVERSELL - ${oversoldVariants.length} variant(s) are at NEGATIVE stock, so the store has ` +
        `already accepted orders it cannot fill: ${oversoldVariants.join(", ")}. That is a customer-visible ` +
        `harm, not a price drift. Reported for operator decision (HARD RULE 5); catalog:apply does NOT write ` +
        `inventory and does NOT change inventoryPolicy.`,
    );
  }

  // Shipping is declared-only, and PR #82 stopped restating it inside the
  // action block. STI-507 goes one step further and actually COMPARES the
  // declared rules against the store's live delivery profile, because an
  // unverified fact printed next to an approved action is how the tags blind
  // spot (PR #65) and collection membership (PR #72) hid real drift.
  //
  // These actions are reported but never applied: `catalog:apply` does not
  // write delivery profiles, so shipping drift is surfaced for an operator
  // decision rather than silently reconciled. That keeps a customer-visible
  // price change out of a run that was only ever approved for catalog edits.
  const shippingDrift: string[] = [];
  if (shippingPolicies.length > 0) {
    const profiles = await getDeliveryProfiles(client);
    const liveProfile = profiles.find(p => p.isDefault) ?? profiles[0] ?? null;

    if (profiles.length === 0) {
      shippingDrift.push("shipping: store returned no delivery profiles");
    } else {
      for (const policy of shippingPolicies) {
        // The catalog's own handles are passed in so a product that is in no
        // delivery profile is reported. Comparing only the profile's zones
        // cannot see that gap, and an unbuyable product is worse drift than a
        // mispriced rate.
        const diff = diffShipping(policy, liveProfile, products.map(p => p.handle));
        for (const note of diff.notes) console.log(`shipping: ${note}`);
        if (diff.actions.length === 0) {
          console.log(`shipping: ${policy.id}: no changes`);
          continue;
        }
        shippingDrift.push(...diff.actions.map(action => `shipping: ${action}`));
      }
    }
  }

  if (shippingDrift.length > 0) {
    console.log("");
    console.log(
      `shipping: ${shippingDrift.length} declared-vs-store difference(s) found (reported only — catalog:apply does NOT write delivery profiles):`,
    );
    for (const line of shippingDrift) console.log(`  - ${line}`);
  }

  // STI-539: the Admin-side diff above is structurally incapable of seeing
  // whether a buyer can actually complete checkout. The live store lists
  // services in its International zone that are all `DeliveryParticipant` with
  // `fixedFee=0.0`, so the zone reads as configured and Admin reports no drift
  // for it -- while a buyer in any of those countries is quoted NOTHING.
  //
  // This block is the only one that measures the customer outcome, so it is
  // reported from the Storefront API with a real cart. It is strictly additive:
  // it never contributes to `changeCount` and never becomes an action, because
  // `catalog:apply` does not write delivery profiles and a shipping rate change
  // is operator authority regardless (HARD RULE 5).
  const blockedDestinations: string[] = [];
  const storefront = storefrontClientFromEnv();
  if (command === "plan" && storefront && shippingPolicies.length > 0 && products.length > 0) {
    // Probe one real sellable variant: shipping reachability is a property of
    // the delivery profile and the destination, not of a particular variant.
    const probeProduct = products.find(p => p.variants.some(v => v.sku));
    const probeVariant = probeProduct?.variants.find(v => v.sku);
    if (!probeProduct || !probeVariant) {
      console.log("shipping: no variant available to probe checkout reachability; SKIPPED (not a pass)");
    } else {
      // The Storefront API takes a merchant GID, not a SKU, so the live variant
      // is resolved through Admin. Going via the catalog's own product keeps the
      // probe pinned to a variant the catalog actually declares.
      const remote = await getProductByHandle(client, probeProduct.handle);
      const variantGid = remote?.variants?.find(v => v.sku === probeVariant.sku)?.id;
      if (!variantGid) {
        console.log(
          `shipping: could not resolve a live variant GID for ${probeVariant.sku}; checkout reachability SKIPPED (not a pass)`,
        );
      } else {
        // The catalog declares destinations as `US` and `REST_OF_WORLD`, and
        // `REST_OF_WORLD` is not a country code. Probing US alone would be
        // exactly the blind spot this block exists to close, so REST_OF_WORLD
        // is probed as a representative multi-region spread. US is always
        // included as the control: without a destination known to work, an
        // all-blocked result is indistinguishable from a broken probe.
        const declared = new Set<string>();
        let declaresRestOfWorld = false;
        for (const policy of shippingPolicies) {
          for (const rule of policy.rules) {
            if (rule.destination === "US") continue;
            if (rule.destination === "REST_OF_WORLD") declaresRestOfWorld = true;
            else declared.add(rule.destination);
          }
        }
        const countries = ["US", ...(declaresRestOfWorld ? REST_OF_WORLD_PROBES : []), ...declared];
        console.log("");
        console.log(`shipping: probing real checkout rates for ${countries.join(", ")} (via ${probeVariant.sku}) ...`);
        for (const countryCode of countries) {
          try {
            const result = await probeCheckoutRates(storefront, variantGid, countryCode, PROBE_POSTAL_CODES[countryCode] ?? "");
            console.log(`shipping: ${describeReachability(result)}`);
            if (verdictFor(result) === "no_options") blockedDestinations.push(`${countryCode} ${result.postalCode}`);
          } catch (error) {
            // A probe that could not run is reported as unverified, never as a
            // pass and never as a defect.
            console.log(
              `shipping: checkout reachability ${countryCode}: UNVERIFIED - ${(error as Error).message.slice(0, 200)}`,
            );
          }
        }
      }
    }
  }

  if (blockedDestinations.length > 0) {
    console.log("");
    console.log(
      `shipping: CHECKOUT-BLOCKING - ${blockedDestinations.length} destination(s) are quoted NO shipping option ` +
        `at all, so checkout cannot complete there: ${blockedDestinations.join(", ")}. ` +
        `That is a customer-visible outage, not a price drift: the catalog declares prices these buyers can never be charged. ` +
        `Reported for operator decision (HARD RULE 5); catalog:apply does NOT write delivery profiles.`,
    );
  }

  if (command === "plan") {
    const shippingNote =
      shippingDrift.length > 0
        ? `; ${shippingDrift.length} shipping difference(s) reported (not applied)`
        : "";
    const inventoryNote =
      inventoryDrift.length > 0
        ? `; ${inventoryDrift.length} inventory difference(s) reported (not applied)` +
          (oversoldVariants.length > 0 ? `, ${oversoldVariants.length} at NEGATIVE stock (oversold)` : "")
        : "";
    console.log(`catalog: plan complete; ${changeCount} pending product actions${shippingNote}${inventoryNote}`);
    return;
  }

  for (const diff of diffs) {
    if (diff.actions.length === 0) continue;
    if (diff.actions.some(action => action.includes("catalog id mismatch"))) {
      throw new Error(`Refusing to apply ${diff.product.id}: catalog id mismatch`);
    }
    const productId = await applyProduct(client, diff.product, diff.remote);
    console.log(`${diff.product.id}: applied ${productId}`);
  }

  // Applied after products so every referenced handle resolves to a fresh id
  // even on a run that created them.
  for (const diff of collectionDiffs) {
    if (diff.actions.length === 0) continue;
    const collectionId = await applyCollection(client, diff.collection, diff.remote, productIdsByHandle);
    console.log(`${diff.collection.id}: applied ${collectionId}`);
  }

  console.log("catalog: apply complete");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
