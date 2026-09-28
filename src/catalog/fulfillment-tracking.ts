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
  };
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
  lines.push(`  status: ${target.orderId ? "ready to apply" : "no fulfillment target"}`);
  return lines;
}

export async function applyFulfillmentTracking(
  target: FulfillmentTarget,
  input: TrackingInput,
): Promise<string> {
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
