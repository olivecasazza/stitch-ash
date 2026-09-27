import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";
import type { ShippingPolicy } from "./schema.js";

export async function loadShippingPolicies(dir: string): Promise<ShippingPolicy[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const yamlFiles = entries.filter(e => e.isFile() && e.name.endsWith(".yaml"));

  const policies: ShippingPolicy[] = [];
  for (const entry of yamlFiles) {
    const content = await readFile(join(dir, entry.name), "utf-8");
    const raw = parseYaml(content);
    policies.push(raw as ShippingPolicy);
  }

  return policies;
}

export function planShippingPolicies(policies: ShippingPolicy[]): string[] {
  const lines: string[] = [];
  for (const policy of policies) {
    lines.push(`shipping_policy: ${policy.id} (${policy.policyName})`);
    for (const rule of policy.rules ?? []) {
      lines.push(
        `  - ${rule.serviceName} [${rule.destination}] => ${rule.price} (${rule.estimatedTransitDays?.min ?? "?"}-${rule.estimatedTransitDays?.max ?? "?"} days)`,
      );
    }
  }
  return lines;
}
