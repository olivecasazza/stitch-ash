import { z } from "zod";

export const ProductVariantSchema = z.object({
  sku: z.string(),
  price: z.string(),
  option1: z.string().nullable(),
  option2: z.string().nullable().optional(),
  option3: z.string().nullable().optional(),
  inventoryManagement: z.string().optional(),
  inventoryPolicy: z.enum(["CONTINUE", "DENY"]).optional(),
  inventoryQuantity: z.number().int().nonnegative().optional(),
});

export type ProductVariant = z.infer<typeof ProductVariantSchema>;

export const ProductOptionSchema = z.object({
  name: z.string(),
  values: z.array(z.string()),
});

export type ProductOption = z.infer<typeof ProductOptionSchema>;

export const CatalogProductSchema = z.object({
  id: z.string(),
  title: z.string(),
  handle: z.string(),
  productType: z.string().optional(),
  vendor: z.string().optional(),
  status: z.enum(["ACTIVE", "DRAFT", "ARCHIVED"]),
  tags: z.array(z.string()).optional(),
  bodyHtml: z.string().optional(),
  options: z.array(ProductOptionSchema).optional(),
  variants: z.array(ProductVariantSchema),
});

export type CatalogProduct = z.infer<typeof CatalogProductSchema>;

export const ShippingRuleSchema = z.object({
  id: z.string(),
  title: z.string(),
  destination: z.string(),
  serviceName: z.string(),
  price: z.string(),
  estimatedTransitDays: z
    .object({ min: z.number().int(), max: z.number().int() })
    .optional(),
});

export type ShippingRule = z.infer<typeof ShippingRuleSchema>;

export const ShippingPolicySchema = z.object({
  id: z.string(),
  policyName: z.string(),
  originCountryCode: z.string(),
  currencyCode: z.string(),
  processingTime: z
    .object({
      madeToOrderMinDays: z.number().int(),
      madeToOrderMaxDays: z.number().int(),
    })
    .optional(),
  tracking: z
    .object({
      required: z.boolean(),
      notifyCustomer: z.boolean(),
      supportedCarriers: z.array(z.string()).optional(),
    })
    .optional(),
  fulfillment: z
    .object({
      mode: z.enum(["manual", "auto"]),
      locationPolicy: z.string().optional(),
      autoFulfillPaidOrders: z.boolean().optional(),
    })
    .optional(),
  rules: z.array(ShippingRuleSchema).optional(),
});

export type ShippingPolicy = z.infer<typeof ShippingPolicySchema>;

export interface ProductDiff {
  product: CatalogProduct;
  remote: ShopifyProduct | null;
  actions: string[];
}

export interface ShopifyProduct {
  id: string;
  title: string;
  handle: string;
  status: string;
  productType: string | null;
  vendor: string | null;
  tags: string[];
  bodyHtml: string | null;
  options: { name: string; values: string[] }[];
  variants: ShopifyVariant[];
}

export interface ShopifyVariant {
  id: string;
  sku: string;
  price: string;
  selectedOptions: { name: string; value: string }[];
  inventory_policy: string | null;
  inventory_quantity: number | null;
}

export interface TrackingInput {
  orderName: string;
  carrier: string;
  trackingNumber: string;
  trackingUrl?: string;
  notifyCustomer?: boolean;
}

export interface FulfillmentTarget {
  orderId: string;
  orderName: string;
  lineItemId: string;
  variantId: string;
  quantity: number;
  fulfillmentService: string;
  locationId: string;
}
