#!/usr/bin/env tsx
import * as path from "node:path";
import { loadShippingPolicies } from "../src/catalog/shipping.ts";
import { findOrderFulfillmentTarget, renderTrackingPlan, validateTrackingInput } from "../src/catalog/fulfillment-tracking.ts";

function arg(name: string): string | undefined {
  const prefix = `--${name}=`;
  const found = process.argv.find(value => value.startsWith(prefix));
  return found?.slice(prefix.length);
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function usage(): never {
  console.error("Usage: pnpm tracking:plan --order=#1001 --carrier=USPS --tracking=9400... [--url=https://...] [--notify] [--dry-run]");
  process.exit(2);
}

async function main() {
  const orderName = arg("order");
  const carrier = arg("carrier");
  const trackingNumber = arg("tracking");
  if (!orderName || !carrier || !trackingNumber) usage();

  const root = process.cwd();
  const policies = await loadShippingPolicies(path.join(root, "catalog", "shipping"));
  const input = {
    orderName,
    carrier,
    trackingNumber,
    trackingUrl: arg("url"),
    notifyCustomer: hasFlag("notify"),
    dryRun: true,
  };

  const errors = validateTrackingInput(input, policies);
  if (errors.length > 0) {
    throw new Error("Tracking validation failed:\n" + errors.map(error => `  - ${error}`).join("\n"));
  }

  const target = await findOrderFulfillmentTarget(orderName);
  for (const line of renderTrackingPlan(input, target)) console.log(line);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
