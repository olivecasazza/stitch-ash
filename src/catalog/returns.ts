import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";
import { ReturnsPolicySchema, type ReturnsPolicy } from "./schema.js";

/**
 * STI-681: the returns loader, mirroring `loadShippingPolicies` exactly —
 * same schema-validated parse, same aggregated validation error.
 *
 * DECLARATION-ONLY. There is no `diffReturns`: Shopify's Admin API has no
 * returns-policy object this file could be compared against, so nothing here is
 * ever sent to the store and `catalog:apply` does not touch it. Its whole
 * purpose is to be the single source the product copy is restated from, so the
 * returns promise cannot be authored once per SKU and drift between them.
 */
export async function loadReturnsPolicies(dir: string): Promise<ReturnsPolicy[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const yamlFiles = entries.filter(e => e.isFile() && e.name.endsWith(".yaml"));

  const policies: ReturnsPolicy[] = [];
  const errors: string[] = [];

  for (const entry of yamlFiles) {
    const content = await readFile(join(dir, entry.name), "utf-8");
    const raw = parseYaml(content);
    const result = ReturnsPolicySchema.safeParse(raw);
    if (!result.success) {
      errors.push(`${entry.name}: ${result.error.message}`);
      continue;
    }
    policies.push(result.data);
  }

  if (errors.length > 0) {
    throw new Error(`Catalog validation errors:\n${errors.join("\n")}`);
  }

  return policies;
}