import * as fs from "node:fs/promises";
import * as path from "node:path";
import { z } from "zod";

/* ---------- schema ---------- */

export const ShippingRuleSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  destination: z.string().min(1),
  serviceName: z.string().min(1),
  price: z.string().regex(/^\d+(\.\d{2})?$/, "price must be a decimal string"),
  estimatedTransitDays: z.object({
    min: z.number().int().min(0),
    max: z.number().int().min(0),
  }),
});

export const ShippingPolicySchema = z.object({
  id: z.string().min(1),
  policyName: z.string().min(1),
  originCountryCode: z.string().length(2),
  currencyCode: z.string().length(3),
  processingTime: z.object({
    madeToOrderMinDays: z.number().int().min(0),
    madeToOrderMaxDays: z.number().int().min(0),
  }),
  tracking: z.object({
    required: z.boolean(),
    notifyCustomer: z.boolean(),
    supportedCarriers: z.array(z.string().min(1)).min(1),
  }),
  fulfillment: z.object({
    mode: z.enum(["manual", "automatic"]),
    locationPolicy: z.string().min(1),
    autoFulfillPaidOrders: z.boolean(),
  }),
  rules: z.array(ShippingRuleSchema).min(1),
});

export type ShippingPolicy = z.infer<typeof ShippingPolicySchema>;

/* ---------- loader ---------- */

export async function loadShippingPolicies(dir: string): Promise<ShippingPolicy[]> {
  let files: string[];
  try {
    files = await fs.readdir(dir);
  } catch (err: any) {
    if (err.code === "ENOENT") return [];
    throw err;
  }

  const yaml = await import("yaml");
  const policies: ShippingPolicy[] = [];
  const errors: string[] = [];

  for (const file of files) {
    if (!file.endsWith(".yaml") && !file.endsWith(".yml")) continue;

    const filepath = path.join(dir, file);
    const text = await fs.readFile(filepath, "utf8");

    try {
      const doc = yaml.parse(text);
      const parsed = ShippingPolicySchema.safeParse(doc);
      if (!parsed.success) {
        errors.push(
          `Failed to parse ${file}:\n` +
            parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n")
        );
        continue;
      }
      policies.push(parsed.data);
    } catch (e) {
      errors.push(`Failed to read YAML in ${file}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  if (errors.length > 0) {
    throw new Error("Shipping validation failed:\n" + errors.join("\n"));
  }

  return policies;
}

/* ---------- planner ---------- */

export function planShippingPolicies(policies: ShippingPolicy[]): string[] {
  const actions: string[] = [];

  for (const policy of policies) {
    actions.push(
      `shipping: ${policy.id} — ${policy.policyName} (${policy.rules.length} rules, tracking ${policy.tracking.required ? "required" : "optional"})`
    );

    for (const rule of policy.rules) {
      actions.push(`  rule ${rule.id}: ${rule.destination} ${rule.serviceName} ${policy.currencyCode} ${rule.price} (${rule.estimatedTransitDays.min}–${rule.estimatedTransitDays.max}d)`);
    }
  }

  return actions;
}
