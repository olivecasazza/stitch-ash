import { z } from "zod";

/**
 * STI-421: money in the catalog is a decimal STRING, never a JS number, so
 * "62.50" cannot be reinterpreted as 62.5 and compared wrong.
 */
const MoneyStringSchema = z
  .string()
  .regex(/^\d+(\.\d{2})$/, "must be a decimal string like 185.00");

export const ProductVariantSchema = z.object({
  sku: z.string(),
  price: z.string(),
  /**
   * STI-421: landed cost (unit cost including inbound freight/duty) is the
   * missing half of the gross-margin KPI, and this file is one of the two
   * destinations STI-418 offers for it.
   *
   * It HAD to be declared here. `ProductVariantSchema` is a zod object, and zod
   * strips unrecognised keys by default — so before this field existed, a
   * `landedCost:` in catalog/products/*.yaml was removed during parse WITHOUT
   * raising an error. `catalog:validate` stayed green, the cost vanished, and
   * the margin report would have read blank forever with nothing to trace.
   * The `landed-cost.test.ts` survival test is what stops that regression.
   *
   * Deliberately NOT sent to Shopify: `unitCost` lives on `inventoryItem`, not
   * on ProductInput, so it cannot ride the productUpdate mutation. It is a
   * local margin input only, which is also why `normalizeVariant` in
   * shopify-admin.ts must stay an allowlist that omits it — otherwise adding a
   * cost would print a phantom drift action against the live store.
   */
  landedCost: MoneyStringSchema.optional(),
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
  /**
   * STI-421: product-level landed cost, for made-to-order lines where every
   * variant is cut from the same bolt and carries one cost. Falls back to this
   * when a variant declares no `landedCost` of its own; the variant value wins.
   */
  landedCost: MoneyStringSchema.optional(),
  options: z.array(ProductOptionSchema).optional(),
  variants: z.array(ProductVariantSchema),
});

export type CatalogProduct = z.infer<typeof CatalogProductSchema>;

/**
 * STI-471: collection membership is part of the storefront, so it belongs in
 * the same declarative catalog as product fields. `products` lists product
 * HANDLES (not ids) so the YAML stays readable and a handle rename surfaces as
 * one diff line instead of an opaque id mismatch.
 */
export const CatalogCollectionSchema = z.object({
  id: z.string(),
  title: z.string(),
  handle: z.string(),
  sortOrder: z.array(z.string()).optional(),
  products: z.array(z.string()),
});

export type CatalogCollection = z.infer<typeof CatalogCollectionSchema>;

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

/**
 * STI-507: the store's live delivery profile, as read from the Admin API.
 *
 * `methods` is the set of delivery options actually offered in a zone. A
 * `null` price means the rate is not a fixed fee the Admin API will report
 * (rate-derived or carrier-calculated); it is NOT the same as "0.00", and
 * diffShipping keeps the two distinguishable so a derived rate can never be
 * mistaken for a free one.
 */
export interface ShopifyShippingZone {
  name: string;
  countryCodes: string[];
  restOfWorld: boolean;
  /**
   * `id` is the delivery profile's own GID, not a diff input. It exists because
   * Shopify does NOT enforce unique service names inside a zone, and the live
   * store proves it: the Domestic zone returns two active rows both named
   * "Standard" with two different GIDs. A name alone therefore does not identify
   * a rate, and a lookup that returns "the one called Standard" picks
   * arbitrarily between the two. Carrying the id makes the collision explicit.
   */
  methods: { id: string; name: string; active: boolean; price: string | null; currency: string | null }[];
}

export interface ShopifyShippingProfile {
  profileName: string;
  isDefault: boolean;
  productHandles: string[];
  zones: ShopifyShippingZone[];
}

export interface ShippingDiff {
  policy: ShippingPolicy;
  remote: ShopifyShippingProfile | null;
  actions: string[];
  /** Human-readable record of what was actually compared, for the plan body. */
  notes: string[];
}

export interface CollectionDiff {
  collection: CatalogCollection;
  remote: ShopifyCollection | null;
  actions: string[];
}

export interface ShopifyCollection {
  id: string;
  title: string;
  handle: string;
  productHandles: string[];
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
  // STI-432: these MUST match the field names selected in
  // getProductByHandle's GraphQL query. They were previously declared
  // snake_case (`inventory_policy` / `inventory_quantity`) while the query
  // asked for camelCase, so every read of them was silently `undefined` and
  // diffProduct's `?? "CONTINUE"` fallback masked it. Naming the interface after
  // the wire format keeps the two in lockstep.
  inventoryPolicy: string | null;
  inventoryQuantity: number | null;
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
  /**
   * STI-571: the store's own `displayFulfillmentStatus` for this order. The
   * lookup query already requested it, but nothing carried it out of the
   * parser, so `tracking:plan` could not tell an unfulfilled order from one
   * that is already `FULFILLED` and reported "ready to apply" for both.
   * Empty string means the field was absent from the response.
   */
  fulfillmentStatus: string;
}
