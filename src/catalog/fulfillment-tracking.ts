import { createShopifyAdminClient } from "./shopify-admin.ts";
import type { ShippingPolicy } from "./shipping.ts";

/* ---------- types ---------- */

export interface TrackingInput {
  orderName: string;
  carrier: string;
  trackingNumber: string;
  trackingUrl?: string;
  notifyCustomer: boolean;
}

export interface OrderFulfillmentTarget {
  orderId: string;
  orderName: string;
  fulfillmentOrderId: string;
  lineItemIds: string[];
}

/* ---------- validator ---------- */

export function validateTrackingInput(input: TrackingInput, policies: ShippingPolicy[]): string[] {
  const errors: string[] = [];

  if (!input.orderName.startsWith("#")) {
    errors.push(`orderName must start with # (got ${input.orderName})`);
  }

  if (input.trackingNumber.length < 6) {
    errors.push(`trackingNumber too short (got ${input.trackingNumber.length} chars, minimum 6)`);
  }

  if (input.trackingUrl && !/^https?:\/\//.test(input.trackingUrl)) {
    errors.push(`trackingUrl must be an HTTP(S) URL (got ${input.trackingUrl})`);
  }

  if (policies.length === 0) {
    errors.push("no shipping policies loaded — cannot validate carrier");
    return errors;
  }

  const allSupported = policies.flatMap((p) => p.tracking.supportedCarriers);
  if (!allSupported.includes(input.carrier)) {
    errors.push(
      `carrier "${input.carrier}" is not supported. Supported carriers: ${allSupported.join(", ")}`
    );
  }

  return errors;
}

/* ---------- order lookup ---------- */

const ORDERS_BY_NAME_QUERY = `#graphql
  query OrdersByName($query: String!) {
    orders(first: 1, query: $query) {
      nodes {
        id
        name
        fulfillmentOrders(first: 10) {
          nodes {
            id
            lineItems(first: 100) {
              nodes {
                id
              }
            }
          }
        }
      }
    }
  }
`;

export async function findOrderFulfillmentTarget(
  orderName: string
): Promise<OrderFulfillmentTarget | null> {
  const client = createShopifyAdminClient();
  const response = await client.request(ORDERS_BY_NAME_QUERY, {
    variables: { query: `name:${orderName}` },
  });

  if (response.errors) {
    throw new Error(`Shopify order query failed: ${JSON.stringify(response.errors)}`);
  }

  const order = response.data?.orders?.nodes?.[0];
  if (!order) return null;

  const fulfillmentOrder = order.fulfillmentOrders?.nodes?.[0];
  if (!fulfillmentOrder) return null;

  return {
    orderId: order.id,
    orderName: order.name,
    fulfillmentOrderId: fulfillmentOrder.id,
    lineItemIds: fulfillmentOrder.lineItems.nodes.map((li: any) => li.id),
  };
}

/* ---------- planner ---------- */

export function renderTrackingPlan(
  input: TrackingInput,
  target: OrderFulfillmentTarget | null
): string[] {
  const lines: string[] = [];

  if (!target) {
    lines.push(`tracking: PLAN (dry-run) — no matching Shopify order ${input.orderName}`);
    lines.push("  → no fulfillment to attach");
    return lines;
  }

  lines.push(`tracking: PLAN (dry-run) for ${target.orderName} (${target.orderId})`);
  lines.push(`  carrier: ${input.carrier}`);
  lines.push(`  tracking: ${input.trackingNumber}`);
  if (input.trackingUrl) lines.push(`  url: ${input.trackingUrl}`);
  lines.push(`  notify customer: ${input.notifyCustomer ? "yes" : "no"}`);
  lines.push(`  line items: ${target.lineItemIds.length}`);

  return lines;
}

/* ---------- apply ---------- */

const FULFILLMENT_CREATE_MUTATION = `#graphql
  mutation FulfillmentCreate($fulfillment: FulfillmentInput!) {
    fulfillmentCreate(fulfillment: $fulfillment) {
      fulfillment {
        id
        status
        trackingInfo {
          company
          number
          url
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export async function applyFulfillmentTracking(
  target: OrderFulfillmentTarget,
  input: TrackingInput
): Promise<string> {
  const client = createShopifyAdminClient();

  const variables = {
    fulfillment: {
      orderId: target.orderId,
      lineItems: target.lineItemIds.map((id) => ({ id, quantity: 1 })),
      trackingInfo: {
        company: input.carrier,
        number: input.trackingNumber,
        ...(input.trackingUrl ? { url: input.trackingUrl } : {}),
      },
      notifyCustomer: input.notifyCustomer,
    },
  };

  const response = await client.request(FULFILLMENT_CREATE_MUTATION, { variables });
  if (response.errors) {
    throw new Error(`Shopify fulfillment mutation failed: ${JSON.stringify(response.errors)}`);
  }

  const result = response.data?.fulfillmentCreate;
  const errors = result?.userErrors ?? [];
  if (errors.length > 0) {
    throw new Error(
      `fulfillmentCreate failed: ${errors.map((e: any) => `${e.field?.join(".")}: ${e.message}`).join("; ")}`
    );
  }

  return result.fulfillment.id;
}
