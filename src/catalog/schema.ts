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
  /**
   * STI-532: DECLARED BUT NOT APPLIED. Read the comment before using this.
   *
   * `ProductInput` has no inventory field, so `catalog:apply` cannot write it —
   * stock moves only through `inventoryAdjustQuantities` against an
   * `inventoryItemId`, which this reconciler does not resolve. Setting it here
   * used to pass validation and then vanish at apply time, so an operator could
   * approve a diff believing it set stock and it would not.
   *
   * It is kept in the schema (rather than deleted) because it is genuinely
   * readable catalog data, but `applyProduct` now REFUSES any product that
   * declares it instead of dropping it quietly. `normalizeVariant` must also
   * keep omitting it, so a declared quantity never prints a phantom drift
   * action against the live store — same allowlist rule as `landedCost` above.
   */
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

/**
 * STI-618: money is a decimal STRING everywhere in the catalog, for the same
 * STI-421 reason as a product price: "70" and "70.00" and 70 must not be three
 * different amounts.
 */
const ShippingMoneySchema = z
  .string()
  .regex(/^\d+(\.\d{2})$/, "must be a decimal string like 70.00");

/**
 * STI-618: the free-shipping threshold, declared.
 *
 * The live Domestic zone offers "Standard"=8.00 unconditioned and
 * "Standard"=0.00 carrying `TOTAL_PRICE >= 70.00`. Exactly one is offered per
 * cart, so a buyer never sees two prices for one service name -- but a buyer
 * under $70 IS charged 8.00. Before this field existed the catalog could only
 * declare one flat price for a destination, so the flat number it did declare
 * was wrong for every cart on one side of a real revenue boundary, and nothing
 * in CI could see it.
 *
 * `minOrderSubtotal` names the boundary; the free price is the rule's own
 * `price`. Together they declare "this price applies at or above this subtotal".
 */
const RateRangeSchema = z.object({
  minOrderSubtotal: ShippingMoneySchema,
});

/**
 * STI-618: a rate whose price is quoted live by a carrier at checkout.
 *
 * Both live International services are `DeliveryParticipant` rows. The Admin
 * API returns their `fixedFee`, which is the operator's surcharge ON TOP OF the
 * carrier's live quote -- never the price a customer pays. A declared flat
 * price for such a service is therefore unverifiable BY CONSTRUCTION, and the
 * number an operator reads next to it is not the number the customer is
 * charged. That is how "$0.00 international shipping" reached the board once
 * (STI-539, STI-573).
 *
 * Declaring the carrier instead of a price is what makes that honest: the
 * catalog then says "ask the carrier", which is what actually happens, instead
 * of asserting a flat number the store cannot honour.
 */
const CarrierCalculatedSchema = z.object({
  carrier: z.string().min(1),
});

/**
 * STI-618: exactly one of `price` or `carrierCalculated` must be declared.
 *
 * Both is the STI-539 shape -- a flat amount asserted for a carrier-quoted
 * service -- so it is rejected at validate time rather than silently preferred.
 * Neither is rejected too: defaulting to "0.00" here is exactly how an
 * unreadable rate becomes a free rate in a plan line.
 */
export const ShippingRuleSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    destination: z.string(),
    serviceName: z.string(),
    price: ShippingMoneySchema.optional(),
    carrierCalculated: CarrierCalculatedSchema.optional(),
    rateRange: RateRangeSchema.optional(),
    estimatedTransitDays: z
      .object({ min: z.number().int(), max: z.number().int() })
      .optional(),
  })
  .refine(rule => (rule.price === undefined) !== (rule.carrierCalculated === undefined), {
    message:
      "a shipping rule must declare exactly one of `price` or `carrierCalculated` — " +
      "declaring both asserts a flat amount for a carrier-quoted service, and declaring neither " +
      "would have to be read as 0.00",
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

/**
 * STI-681: the returns policy, declared once and rendered onto every product.
 * DECLARATION-ONLY, like `ShippingPolicySchema` — no Admin API call reads or
 * writes it; it exists so the copy can be restated from a single source
 * instead of being authored per SKU.
 */
export const ReturnsPolicySchema = z.object({
  id: z.string(),
  policyName: z.string(),
  /**
   * Which direction the policy takes. The gate
   * (scripts/ci/returns-claim-gate.sh) recognises exactly two, and every
   * product must agree on one.
   */
  direction: z.enum(["final_sale", "returnable"]),
  /** The exact customer-facing copy, rendered verbatim on every product. */
  lines: z.array(z.string().min(1)).min(1),
});

export type ReturnsPolicy = z.infer<typeof ReturnsPolicySchema>;

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
  /**
   * `rateKind` records WHICH Admin API shape carried the rate, because
   * `fixedFee` means two different things depending on the shape and reading
   * it as a price is a money bug in both directions.
   *
   *   fixed_rate  — DeliveryRateDefinition: a genuine flat price, returned in
   *                 `price`. Verifiable against a declared amount.
   *   carrier_calculated — DeliveryParticipant: a carrier-calculated rate.
   *                 `fixedFee` here is only the operator's surcharge ON TOP of
   *                 the carrier's live quote, never the price charged. The
   *                 total is computed at checkout from `carrierService` plus
   *                 `percentageOfRateFee`, and the Admin API never returns it.
   *
   * The live store proves the split: Domestic "Standard"/"Express" are
   * fixed_rate, while both International services are carrier_calculated with
   * `fixedFee = 0.0` and `percentageOfRateFee = 0`. Reading that 0.0 as the
   * price reported "0.0 USD" for both international services — declaring free
   * international shipping that the store does not actually charge. Only a
   * `fixed_rate` may set `price`; a `carrier_calculated` rate stays `null`,
   * which diffShipping already reports as "cannot be verified".
   */
  methods: {
    id: string;
    name: string;
    active: boolean;
    price: string | null;
    currency: string | null;
    rateKind?: "fixed_rate" | "carrier_calculated";
    /** The operator's surcharge on a carrier-calculated rate. Never the total. */
    carrierSurcharge?: string | null;
    /**
     * STI-597: the conditions under which THIS row is the one that applies.
     *
     * Two active rows sharing a name are only a customer-visible defect if both
     * can be offered at once. A rate range is not that: the live store's
     * Domestic zone has two active rows both named "Standard", and the second
     * carries `TOTAL_PRICE >= 70.00` while the first carries no condition. That
     * is a free-shipping threshold, not a duplicate — exactly one row is
     * offered per cart, and which one is decided by the cart total. Verified
     * against the live Storefront API this run: a $35 cart is offered
     * "Standard"=8.00 and a $70 cart is offered "Standard"=0.00, never both.
     *
     * Without this field the reconciler could only see two names and two
     * prices, so it reported "customers are charged different rates for the
     * same service name, and a buyer is shown one label for 2 differently-priced
     * options with nothing to tell them apart" — an overclaim that describes a
     * defect the store does not have and sends the operator to fix a working
     * offer. `undefined` means the Admin API returned no conditions for the row.
     */
    conditions?: DeliveryMethodCondition[];
  }[];
}

/**
 * A `DeliveryCondition` from the Admin API, reduced to what decides whether a
 * row is offered. `criteria` is a union (`MoneyV2` for TOTAL_PRICE, `Weight`
 * for TOTAL_WEIGHT), so both members are carried rather than coerced to one.
 */
export interface DeliveryMethodCondition {
  field: "TOTAL_PRICE" | "TOTAL_WEIGHT" | string;
  operator: string;
  /** Present for a money criteria; absent for a weight one. */
  amount?: string | null;
  currency?: string | null;
  /** Present for a weight criteria; absent for a money one. */
  value?: number | null;
  unit?: string | null;
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
