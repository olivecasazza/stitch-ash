import type { FulfillmentTarget, ShippingPolicy, TrackingInput } from "./schema.js";
import { buildAdminClient } from "./shopify-admin.js";

export function validateTrackingInput(
  input: TrackingInput,
  policies: ShippingPolicy[],
): string[] {
  const errors: string[] = [];

  if (!input.orderName) errors.push("orderName is required");
  if (!input.carrier) errors.push("carrier is required");
  if (!input.trackingNumber) errors.push("trackingNumber is required");

  const supported = policies.flatMap(p => p.tracking?.supportedCarriers ?? []);
  if (supported.length > 0 && !supported.includes(input.carrier)) {
    errors.push(`carrier "${input.carrier}" is not in supported carriers: ${supported.join(", ")}`);
  }

  return errors;
}

export async function findOrderFulfillmentTarget(orderName: string): Promise<FulfillmentTarget | null> {
  const client = await buildAdminClient();

  const response = await fetch(`https://${client.domain}/admin/api/2026-04/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": client.token,
    },
    body: JSON.stringify({ query: buildOrderLookupQuery(), variables: { query: buildOrderSearchFilter(orderName) } }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Order lookup failed (HTTP ${response.status}) for ${orderName}: ${text}`);
  }

  return parseOrderFulfillmentTarget(await response.json(), orderName);
}

/**
 * STI-484: the Admin API has no `order(name:)` field — an order is addressed by
 * id, or found by name through the `orders` search. The old query asked for
 * `order(name:)`, `Order.fulfillmentStatus` and `FulfillmentService.name`, none
 * of which exist. GraphQL answers all of that with HTTP 200 plus an `errors`
 * payload, so the old `if (!response.ok) return null` guard never fired and a
 * real order looked permanently absent. These are the fields the live
 * 2026-04 schema actually accepts.
 */
export function buildOrderLookupQuery(): string {
  return `
    query getOrderByName($query: String!) {
      orders(first: 1, query: $query) {
        edges {
          node {
            id
            name
            displayFulfillmentStatus
            retailLocation { id }
            lineItems(first: 20) {
              edges {
                node {
                  id
                  quantity
                  variant { id sku }
                  fulfillmentService { id handle }
                }
              }
            }
          }
        }
      }
    }
  `;
}

/** A bare `#1001` is valid search syntax; anything with spaces or quotes is quoted. */
export function buildOrderSearchFilter(orderName: string): string {
  return /^#[A-Za-z0-9_-]+$/.test(orderName) ? `name:${orderName}` : `name:"${orderName.replace(/"/g, '\\"')}"`;
}

interface OrderLookupNode {
  id: string;
  name: string;
  displayFulfillmentStatus?: string | null;
  retailLocation?: { id: string } | null;
  lineItems: {
    edges: {
      node: {
        id: string;
        variant: { id: string; sku: string } | null;
        quantity: number;
        fulfillmentService: { id: string; handle: string } | null;
      };
    }[];
  };
}

export function parseOrderFulfillmentTarget(payload: unknown, orderName: string): FulfillmentTarget | null {
  const errors = (payload as { errors?: { message: string }[] }).errors;
  if (errors?.length) {
    throw new Error(
      `Shopify GraphQL rejected the order lookup for ${orderName}: ${errors.map(e => e.message).join("; ")}`,
    );
  }

  const order = (payload as { data?: { orders?: { edges: { node: OrderLookupNode }[] } } }).data?.orders?.edges?.[0]
    ?.node;

  if (!order) return null;

  const line = order.lineItems.edges[0]?.node;
  if (!line) return null;

  return {
    orderId: order.id,
    orderName: order.name,
    lineItemId: line.id,
    variantId: line.variant?.id ?? "",
    quantity: line.quantity,
    fulfillmentService: line.fulfillmentService?.handle ?? "manual",
    // STI-484: previously hardcoded "", so a fulfillment could never be bound
    // to a location even though the policy is primary_shopify_location.
    locationId: order.retailLocation?.id ?? "",
    // STI-571: requested by the query and then dropped on the floor.
    fulfillmentStatus: order.displayFulfillmentStatus ?? "",
  };
}

/**
 * STI-571: statuses that mean the order already has fulfillment recorded
 * against it. A new `fulfillmentCreate` here is a duplicate fulfillment, not an
 * update, so both the plan and the apply refuse rather than reporting "ready".
 *
 * `UNFULFILLED` and `PARTIALLY_FULFILLED` are deliberately not in this set: a
 * partially fulfilled order is exactly the case where a human still has to
 * decide which line item the new tracking belongs to, and that decision is
 * reported rather than blocked.
 */
export function isAlreadyFulfilled(fulfillmentStatus: string): boolean {
  return fulfillmentStatus.trim().toUpperCase() === "FULFILLED";
}


export function renderTrackingPlan(input: TrackingInput, target: FulfillmentTarget | null): string[] {
  const lines: string[] = [];
  if (!target) {
    lines.push(`order ${input.orderName}: not found in Shopify — cannot plan`);
    return lines;
  }
  lines.push(`order ${target.orderName} (${target.orderId}):`);
  lines.push(`  carrier: ${input.carrier}`);
  lines.push(`  tracking: ${input.trackingNumber}${input.trackingUrl ? ` (${input.trackingUrl})` : ""}`);
  lines.push(`  notify: ${input.notifyCustomer ? "yes" : "no"}`);
  lines.push(`  fulfillment_service: ${target.fulfillmentService}`);
  // STI-571: this line used to be `target.orderId ? "ready to apply" : ...`,
  // which is a constant — the only falsy path was handled by the early return
  // above. An order that was already FULFILLED on the store printed exactly the
  // same "ready to apply" as an unfulfilled one, so the plan could not warn
  // that fulfillmentCreate would add a second fulfillment rather than record
  // tracking on the existing one.
  lines.push(`  store_fulfillment_status: ${target.fulfillmentStatus || "NOT_REPORTED_BY_STORE"}`);
  lines.push(
    isAlreadyFulfilled(target.fulfillmentStatus)
      ? "  status: NOT READY — order is already FULFILLED on the store; applying creates a duplicate fulfillment"
      : `  status: ${target.orderId ? "ready to apply" : "no fulfillment target"}`,
  );
  if (target.fulfillmentStatus.trim().toUpperCase() === "PARTIALLY_FULFILLED") {
    // The parser targets lineItems.edges[0] only. On a multi-line order that is
    // not necessarily the line the operator means, so this is surfaced instead
    // of assumed.
    lines.push("  warning: order is PARTIALLY_FULFILLED and this plan targets the FIRST line item only; confirm it is the right one");
  }
  return lines;
}

export async function applyFulfillmentTracking(
  target: FulfillmentTarget,
  input: TrackingInput,
): Promise<string> {
  // STI-571: fulfillmentCreate adds a fulfillment; it does not attach tracking
  // to an existing one. Running it against an order the store already reports
  // as FULFILLED would double-fulfill a real customer order, so this refuses
  // before any write rather than relying on the operator having read the plan.
  if (isAlreadyFulfilled(target.fulfillmentStatus)) {
    throw new Error(
      `Refusing to apply tracking to ${target.orderName}: the store reports it as ` +
        `${target.fulfillmentStatus}, so fulfillmentCreate would create a second fulfillment. ` +
        `Update tracking on the existing fulfillment in Shopify Admin instead.`,
    );
  }

  const client = await buildAdminClient();

  const mutation = `
    mutation createFulfillment($orderId: ID!, $input: FulfillmentInput!) {
      fulfillmentCreate(orderId: $orderId, input: $input) {
        fulfillment { id status }
        userErrors { field message }
      }
    }
  `;

  const fulfillmentInput: Record<string, unknown> = {
    lineItemsBy: [
      {
        orderLineItemId: target.lineItemId,
        quantity: target.quantity,
      },
    ],
    trackingInfo: {
      company: input.carrier,
      number: input.trackingNumber,
      url: input.trackingUrl,
    },
    notifyCustomer: input.notifyCustomer ?? false,
  };

  const response = await fetch(`https://${client.domain}/admin/api/2026-04/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": client.token,
    },
    body: JSON.stringify({ query: mutation, variables: { orderId: target.orderId, input: fulfillmentInput } }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Fulfillment API ${response.status}: ${text}`);
  }

  const json = await response.json() as { data?: {
    fulfillmentCreate?: {
      fulfillment?: { id: string; status: string };
      userErrors: { field: string; message: string }[];
    };
  } };

  const result = json.data?.fulfillmentCreate;
  if (!result) throw new Error("No fulfillmentCreate response");
  if (result.userErrors?.length) {
    throw new Error(`Fulfillment user errors: ${result.userErrors.map(e => `${e.field}: ${e.message}`).join(", ")}`);
  }

  return result.fulfillment?.id ?? "unknown";
}
