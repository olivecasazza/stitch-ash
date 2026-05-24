#!/usr/bin/env tsx
import * as path from "node:path";
import { loadCatalogDirectory } from "../src/catalog/load.ts";
import { applyProduct, createShopifyAdminClient, diffProduct, getProductByHandle } from "../src/catalog/shopify-admin.ts";

const command = process.argv[2] ?? "validate";
const root = process.cwd();
const catalogDir = path.join(root, "catalog", "products");

function printUsage(): never {
  console.error(`Usage: pnpm catalog <validate|plan|apply>`);
  process.exit(2);
}

async function main() {
  if (!["validate", "plan", "apply"].includes(command)) printUsage();

  const products = await loadCatalogDirectory(catalogDir);
  console.log(`catalog: loaded ${products.length} products`);

  if (command === "validate") {
    console.log("catalog: validation passed");
    return;
  }

  const client = createShopifyAdminClient();
  const diffs = [];

  for (const product of products) {
    const remote = await getProductByHandle(client, product.handle);
    diffs.push(diffProduct(product, remote));
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

  if (command === "plan") {
    console.log(`catalog: plan complete; ${changeCount} pending actions`);
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

  console.log("catalog: apply complete");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
