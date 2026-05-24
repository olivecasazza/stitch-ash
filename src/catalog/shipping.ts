import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as yaml from "yaml";
import { z } from "zod";

const DecimalMoneySchema = z.string().regex(/^\d+(\.\d{2})$/, "money must be a decimal string like 25.00");
const CarrierSchema = z.enum(["USPS", "UPS", "FedEx", "DHL Express"]);

export const ShippingPolicySchema = z.object({
  id: z.string().regex(/^[a-z0-9][a-z0-9._-]+$/),
  policyName: z.string().min(1),
  originCountryCode: z.string().length(2),
  currencyCode: z.string().length(3),
  processingTime: z.object({
    madeToOrderMinDays: z.number().int().nonnegative(),
    madeToOrderMaxDays: z.number().int().nonnegative(),
  }),
  tracking: z.object({
    required: z.boolean(),
    notifyCustomer: z.boolean(),
    supportedCarriers: z.array(CarrierSchema).min(1),
  }),
  fulfillment: z.object({
    mode: z.enum(["manual"]),
    locationPolicy: z.enum(["primary_shopify_location"]),
    autoFulfillPaidOrders: z.literal(false),
  }),
  rules: z.array(z.object({
    id: z.string().regex(/^[a-z0-9][a-z0-9-]+$/),
    title: z.string().min(1),
    destination: z.union([z.string().length(2), z.literal("REST_OF_WORLD")]),
    serviceName: z.string().min(1),
    price: DecimalMoneySchema,
    estimatedTransitDays: z.object({
      min: z.number().int().nonnegative(),
      max: z.number().int().nonnegative(),
    }),
  })).min(1),
});

export type ShippingPolicy = z.infer<typeof ShippingPolicySchema>;

export async function loadShippingPolicies(dir: string): Promise<ShippingPolicy[]> {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch {
    // mkdir errors are surfaced by readdir below if the path is actually unusable.
  }

  const files = await fs.readdir(dir);
  const policies: ShippingPolicy[] = [];
  const errors: string[] = [];

  for (const file of files) {
    if (!file.endsWith(".yaml") && !file.endsWith(".yml")) continue;
    const filepath = path.join(dir, file);
    try {
      const doc = yaml.parse(await fs.readFile(filepath, "utf8"));
      const parsed = ShippingPolicySchema.safeParse(doc);
      if (!parsed.success) {
        errors.push(`Failed to parse ${file}:\n` + parsed.error.issues.map(i => `  - ${i.path.join(".")}: ${i.message}`).join("\n"));
        continue;
      }
      policies.push(parsed.data);
    } catch (error) {
      errors.push(`Failed to read ${file}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  const ids = new Set<string>();
  for (const policy of policies) {
    if (ids.has(policy.id)) errors.push(`duplicate shipping policy id ${policy.id}`);
    ids.add(policy.id);
    if (policy.processingTime.madeToOrderMinDays > policy.processingTime.madeToOrderMaxDays) {
      errors.push(`${policy.id}: madeToOrderMinDays must be <= madeToOrderMaxDays`);
    }
    for (const rule of policy.rules) {
      if (rule.estimatedTransitDays.min > rule.estimatedTransitDays.max) {
        errors.push(`${policy.id}/${rule.id}: estimatedTransitDays.min must be <= max`);
      }
    }
  }

  if (errors.length > 0) throw new Error("Shipping policy validation failed:\n" + errors.join("\n"));
  return policies;
}

export function planShippingPolicies(policies: ShippingPolicy[]): string[] {
  const actions: string[] = [];
  for (const policy of policies) {
    actions.push(`${policy.id}: validated ${policy.rules.length} shipping rules; tracking required=${policy.tracking.required}; carriers=${policy.tracking.supportedCarriers.join(", ")}`);
    actions.push(`${policy.id}: Shopify shipping profiles/rates remain dashboard/API-limited; policy is enforced as bot contract until GraphQL delivery profile mutations are added`);
  }
  return actions;
}
