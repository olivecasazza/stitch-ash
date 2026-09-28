#!/usr/bin/env tsx
import * as path from "node:path";
import { loadCatalogDirectory, loadCollectionDirectory } from "../src/catalog/load.ts";
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

  for (const product of products) {
    const remote = await getProductByHandle(client, product.handle);
    if (remote) productIdsByHandle.set(product.handle, remote.id);
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

  if (command === "plan") {
    const shippingNote =
      shippingDrift.length > 0
        ? `; ${shippingDrift.length} shipping difference(s) reported (not applied)`
        : "";
    console.log(`catalog: plan complete; ${changeCount} pending product actions${shippingNote}`);
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
