#!/usr/bin/env tsx
import * as fs from "node:fs";
import * as path from "node:path";
import { execFileSync } from "node:child_process";

const command = process.argv[2] ?? "doctor";
const args = new Set(process.argv.slice(3));
const root = process.cwd();

const requiredCatalogPaths = [
  "catalog/products",
  "catalog/shipping",
  "src/catalog/schema.ts",
  "src/catalog/shopify-admin.ts",
  "scripts/catalog.ts",
  "scripts/tracking.ts",
  "docs/declarative-business.md",
];

const requiredAdminScopes = [
  "read_products",
  "write_products",
  "read_orders",
  "write_fulfillments",
  "read_fulfillments",
];

const optionalAdminScopes = [
  "read_webhooks",
  "write_webhooks",
  "read_redirects",
  "write_redirects",
  "read_inventory",
  "write_inventory",
];

function exists(rel: string): boolean {
  return fs.existsSync(path.join(root, rel));
}

function mask(value: string | undefined): string {
  if (!value) return "missing";
  const prefix = value.slice(0, Math.min(value.length, 8));
  return `set prefix=${JSON.stringify(prefix)} len=${value.length}`;
}

function env(name: string): string | undefined {
  const value = process.env[name];
  return value && value.length > 0 ? value : undefined;
}

function printUsage(): never {
  console.error(`Usage: pnpm shopify:<doctor|mcp-command|scopes|env-template>

Commands:
  doctor       Check repo structure and Shopify env readiness without printing secrets
  mcp-command  Print the Hermes MCP registration command for shopify-mcp
  scopes       Print required Shopify Custom App scopes for this repo
  env-template Print a safe .env template for local bootstrap

Flags:
  --strict     doctor exits non-zero if Shopify credentials are missing
`);
  process.exit(2);
}

function readPackageVersion(): string {
  try {
    const raw = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
    const packageJson = raw as { dependencies?: Record<string, string> };
    return packageJson?.dependencies?.["@shopify/admin-api-client"] ?? "unknown";
  } catch {
    return "unknown";
  }
}

function runDoctor(): void {
  let failures = 0;
  let warnings = 0;
  const strict = args.has("--strict");

  console.log("shopify: repo readiness");
  for (const rel of requiredCatalogPaths) {
    if (exists(rel)) {
      console.log(`  ok   ${rel}`);
    } else {
      failures += 1;
      console.log(`  FAIL ${rel}`);
    }
  }

  console.log("shopify: node tooling");
  try {
    const nodeVersion = execFileSync("node", ["--version"], { encoding: "utf8" }).trim();
    console.log(`  ok   node ${nodeVersion}`);
  } catch {
    failures += 1;
    console.log("  FAIL node not found");
  }

  try {
    const pnpmVersion = execFileSync("pnpm", ["--version"], { encoding: "utf8" }).trim();
    console.log(`  ok   pnpm ${pnpmVersion}`);
  } catch {
    failures += 1;
    console.log("  FAIL pnpm not found");
  }

  console.log("shopify: package dependencies");
  console.log(`  ok   @shopify/admin-api-client ${readPackageVersion()}`);

  const storeDomain = env("SHOPIFY_ADMIN_STORE_DOMAIN") ?? env("SHOPIFY_STORE_DOMAIN");
  const accessToken = env("SHOPIFY_ADMIN_ACCESS_TOKEN");
  const clientId = env("SHOPIFY_CLIENT_ID");
  const clientSecret = env("SHOPIFY_CLIENT_SECRET");
  const storefrontToken = env("SHOPIFY_STOREFRONT_ACCESS_TOKEN");

  console.log("shopify: environment (redacted)");
  console.log(`  ${storeDomain ? "ok  " : "WARN"} SHOPIFY_ADMIN_STORE_DOMAIN ${storeDomain ? storeDomain : "missing"}`);
  console.log(`  ${accessToken ? "ok  " : "WARN"} SHOPIFY_ADMIN_ACCESS_TOKEN ${mask(accessToken)}`);
  console.log(`  ${clientId ? "ok  " : "WARN"} SHOPIFY_CLIENT_ID ${mask(clientId)}`);
  console.log(`  ${clientSecret ? "ok  " : "WARN"} SHOPIFY_CLIENT_SECRET ${mask(clientSecret)}`);
  console.log(`  ${storefrontToken ? "ok  " : "WARN"} SHOPIFY_STOREFRONT_ACCESS_TOKEN ${mask(storefrontToken)}`);

  if (!storeDomain) warnings += 1;
  if (!accessToken && !(clientId && clientSecret)) warnings += 1;
  if (!storefrontToken) warnings += 1;

  if (accessToken?.startsWith("atkn_")) {
    failures += 1;
    console.log("  FAIL SHOPIFY_ADMIN_ACCESS_TOKEN looks like a Shopify CLI automation token, not an Admin API token");
  }

  if (strict && warnings > 0) failures += warnings;

  if (failures > 0) {
    console.error(`shopify: doctor failed with ${failures} blocking issue(s)`);
    process.exit(1);
  }

  if (warnings > 0) {
    console.log(`shopify: doctor passed with ${warnings} env warning(s); use --strict for live Shopify operations`);
    return;
  }

  console.log("shopify: doctor passed");
}

function printScopes(): void {
  console.log("Required Shopify Custom App Admin API scopes for repo-owned bot operations:");
  for (const scope of requiredAdminScopes) console.log(`  - ${scope}`);
  console.log("");
  console.log("Optional scopes for future declarative settings/inventory expansion:");
  for (const scope of optionalAdminScopes) console.log(`  - ${scope}`);
}

function printMcpCommand(): void {
  const domain = env("SHOPIFY_ADMIN_STORE_DOMAIN") ?? env("SHOPIFY_STORE_DOMAIN") ?? "stitch-and-ash.myshopify.com";
  console.log("# Preferred: OAuth client credentials from the Shopify Dev Dashboard custom app");
  console.log(`hermes mcp add shopify --command "npx -y shopify-mcp --clientId \"$SHOPIFY_CLIENT_ID\" --clientSecret \"$SHOPIFY_CLIENT_SECRET\" --domain ${domain}"`);
  console.log("");
  console.log("# Legacy fallback: static Admin API access token if one was generated by a store custom app");
  console.log(`hermes mcp add shopify --command "npx -y shopify-mcp --accessToken \"$SHOPIFY_ADMIN_ACCESS_TOKEN\" --domain ${domain}"`);
  console.log("");
  console.log("# After adding, restart Hermes or run /reload-mcp in an interactive session.");
}

function printEnvTemplate(): void {
  console.log(`# Shopify bot bootstrap env template. Do not commit real values.
SHOPIFY_ADMIN_STORE_DOMAIN=stitch-and-ash.myshopify.com
SHOPIFY_STORE_DOMAIN=stitch-and-ash.myshopify.com

# Preferred for repo Nix wrappers and MCP: Shopify custom app OAuth client credentials.
SHOPIFY_CLIENT_ID=
SHOPIFY_CLIENT_SECRET=

# Optional local-only static Admin API token. Never use a Shopify CLI atkn_ token here.
SHOPIFY_ADMIN_ACCESS_TOKEN=

# Public Storefront API token for storefront/cart reads.
SHOPIFY_STOREFRONT_ACCESS_TOKEN=
`);
}

switch (command) {
  case "doctor":
    runDoctor();
    break;
  case "scopes":
    printScopes();
    break;
  case "mcp-command":
    printMcpCommand();
    break;
  case "env-template":
    printEnvTemplate();
    break;
  default:
    printUsage();
}
