import type { CatalogProduct, ShopifyProduct, ShopifyVariant } from "./schema.js";

/**
 * STI-605: inventory is reported, never planned.
 *
 * `diffProduct` compares `price`, `inventoryPolicy` and the `normalize*`
 * allowlist. It has never compared `inventoryQuantity`, and it must not: the
 * catalog can DECLARE a quantity, but `ProductInput` carries no inventory
 * field. Stock moves only through `inventoryAdjustQuantities` against an
 * `inventoryItemId` this reconciler never resolves (see
 * `applyProduct`'s refusal in shopify-admin.ts and the survival test in
 * inventory-quantity-not-applied.test.ts). Putting a stock difference in
 * `actions` would therefore make the plan lie in the worst possible way — an
 * approver would read `set inventory: 0 -> 24` and apply would change nothing.
 *
 * So this module mirrors `diffShipping`: it returns NOTES, and
 * `scripts/catalog.ts` prints them under an explicit "reported only" header
 * that is deliberately kept out of `changeCount`.
 *
 * The blind spot this closes is real and was measured, not hypothesised: on
 * the live store all 7 sellable variants sit at or below zero, one of them at
 * -1, and `catalog:plan` reported `no changes` for every product while saying
 * nothing at all about stock. Stock is the one number that decides whether a
 * customer can buy, and it was the one number the reconciler could not see.
 */
export type InventoryVerdict =
  /** Store quantity is below zero: the store has already sold past its stock. */
  | "oversold"
  /** Zero stock while `inventoryPolicy` still lets the store sell. */
  | "empty_sellable"
  /** Zero stock and the store correctly refuses to sell it. A stockout, not a defect. */
  | "empty_blocked"
  /** The store does not track stock for this variant, so no count can be verified. */
  | "untracked"
  /** The catalog declares a quantity the store disagrees with. */
  | "declared_mismatch"
  /** The catalog declares this variant but the store has no variant with that SKU. */
  | "absent";

export interface InventoryFinding {
  sku: string;
  verdict: InventoryVerdict;
  /** The store's own `inventoryQuantity`, or null when it is absent/untracked. */
  storeQuantity: number | null;
  /** The catalog's declared `inventoryQuantity`, when the YAML sets one. */
  declaredQuantity?: number;
  inventoryPolicy: string;
  note: string;
}

export interface InventoryDiff {
  product: CatalogProduct;
  remote: ShopifyProduct | null;
  /**
   * Reported-only lines. There is deliberately no `actions` field on this
   * type: `catalog:apply` cannot write inventory, so there is no action an
   * approver could authorise and no way for these lines to inflate the
   * pending-action count.
   */
  notes: string[];
  findings: InventoryFinding[];
  /** The subset a customer can already be harmed by. */
  oversold: InventoryFinding[];
}

function policyOf(variant: ShopifyVariant): string {
  return variant.inventoryPolicy ?? "CONTINUE";
}

function note(productId: string, sku: string, rest: string): string {
  return `${productId}: variant ${sku} ${rest}`;
}

/**
 * One variant's stock, judged. Split out so the live-remote and undeclared
 * paths cannot drift into reading the same row two different ways.
 */
function judge(
  productId: string,
  variant: ShopifyVariant,
  declaredQuantity: number | undefined,
): InventoryFinding[] {
  const findings: InventoryFinding[] = [];
  const policy = policyOf(variant);
  const quantity = variant.inventoryQuantity;
  const sku = variant.sku;
  const base = { sku, storeQuantity: quantity, declaredQuantity, inventoryPolicy: policy };

  if (quantity === null || quantity === undefined) {
    // Shopify returns null for a variant whose inventory is not tracked. That
    // is emphatically NOT zero, and reporting it as an empty shelf would be a
    // fabricated finding. It is unmeasured, and says so.
    findings.push({
      ...base,
      verdict: "untracked",
      note: note(
        productId,
        sku,
        "is NOT tracked for inventory on the store (inventoryQuantity is null), so its sellable count " +
          "cannot be verified here — UNVERIFIED, not a pass and not an empty shelf",
      ),
    });
    return findings;
  }

  if (quantity < 0) {
    // The one row a customer can already be harmed by. Deliberately distinct
    // from zero: zero is an empty shelf, negative is an order accepted for
    // stock the store does not have, and it reads differently in the output.
    findings.push({
      ...base,
      verdict: "oversold",
      note: note(
        productId,
        sku,
        `is at ${quantity} — NEGATIVE stock, so the store has already accepted orders it does not have ` +
          `units to fill, and inventoryPolicy=${policy} lets it keep selling. This is an oversell a ` +
          `customer can already be harmed by, not an empty shelf`,
      ),
    });
  } else if (quantity === 0) {
    const sellable = policy !== "DENY";
    findings.push({
      ...base,
      verdict: sellable ? "empty_sellable" : "empty_blocked",
      note: note(
        productId,
        sku,
        `is at 0 with inventoryPolicy=${policy}, so ` +
          (sellable
            ? "the next order is accepted and drives the count negative — an oversell waiting to happen, not a stockout"
            : "the store correctly refuses to sell it; a stockout, reported for visibility only"),
      ),
    });
  }

  if (declaredQuantity !== undefined && declaredQuantity !== quantity) {
    findings.push({
      ...base,
      verdict: "declared_mismatch",
      note: note(
        productId,
        sku,
        `declares inventoryQuantity ${declaredQuantity} in the catalog but the store holds ${quantity}. ` +
          "catalog:apply CANNOT write stock (ProductInput has no inventory field; it requires " +
          `inventoryAdjustQuantities against an inventoryItemId), so this difference is reported, never applied` +
          (policy !== "DENY" && quantity === 0
            ? ", and the declared figure is the one an operator would read as stock that exists"
            : ""),
      ),
    });
  }

  return findings;
}

export function diffInventory(product: CatalogProduct, remote: ShopifyProduct | null): InventoryDiff {
  const findings: InventoryFinding[] = [];

  if (!remote) {
    // Not a pass. Without the remote product there is no stock to read, and
    // printing nothing here would let a missing product look like a measured
    // one.
    return {
      product,
      remote,
      notes: [
        `${product.id}: no remote product was returned by the Admin API, so no live stock could be read ` +
          `for ${product.variants.length} declared variant(s) — UNVERIFIED, not a pass`,
      ],
      findings,
      oversold: [],
    };
  }

  const remoteBySku = new Map(remote.variants.map(v => [v.sku, v]));

  for (const variant of product.variants) {
    const live = remoteBySku.get(variant.sku);
    if (!live) {
      findings.push({
        sku: variant.sku,
        verdict: "absent",
        storeQuantity: null,
        declaredQuantity: variant.inventoryQuantity,
        inventoryPolicy: "unknown",
        note: note(
          product.id,
          variant.sku,
          "is declared in the catalog but the store has no variant with that SKU, so its stock is " +
            "unmeasurable here. diffProduct reports the missing variant as an action; the quantity is " +
            "reported only",
        ),
      });
      continue;
    }
    findings.push(...judge(product.id, live, variant.inventoryQuantity));
  }

  // A live variant the catalog does not declare is still sellable, and at zero
  // or below it is exactly the "invisible to the reconciler" case this module
  // exists for. Only non-positive rows are reported: a positive count on an
  // undeclared variant is a catalog-coverage question, not a stock question,
  // and reporting it here would bury the rows that can be harmed.
  const declaredSkus = new Set(product.variants.map(v => v.sku));
  for (const live of remote.variants) {
    if (declaredSkus.has(live.sku)) continue;
    const quantity = live.inventoryQuantity;
    if (quantity === null || quantity === undefined || quantity > 0) continue;
    const policy = policyOf(live);
    findings.push({
      sku: live.sku,
      verdict: quantity < 0 ? "oversold" : policy === "DENY" ? "empty_blocked" : "empty_sellable",
      storeQuantity: quantity,
      inventoryPolicy: policy,
      note: note(
        product.id,
        live.sku,
        `is a LIVE variant the catalog does not declare, so nothing in the catalog measures its stock, ` +
          `and the store holds ${quantity} with inventoryPolicy=${policy}` +
          (quantity < 0
            ? " — NEGATIVE, so the store has already oversold it"
            : policy === "DENY"
              ? " — the store refuses to sell it, so this is a stockout rather than a live oversell"
              : " — the store will keep selling past zero"),
      ),
    });
  }

  const oversold = findings.filter(f => f.verdict === "oversold");
  return { product, remote, notes: findings.map(f => f.note), findings, oversold };
}
