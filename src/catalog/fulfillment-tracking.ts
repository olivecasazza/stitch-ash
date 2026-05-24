import type { ShippingPolicy } from "./shipping.ts";
import { createShopifyAdminClient } from "./shopify-admin.ts";

export interface TrackingInput {
  orderName: string;
  carrier: string;
  trackingNumber: string;
  trackingUrl?: string;
  notifyCustomer: boolean;
  dryRun: boolean;
}

export interface OrderFulfillmentTarget {
  orderId: string;
  orderName: string;
  displayFulfillmentStatus: string;
  fulfillmentOrderIds: string[];
}

export function validateTrackingInput(input: TrackingInput, policies: ShippingPolicy[]): string[] {
  const errors: string[] = [];
  const supportedCarriers = new Set(policies.flatMap(policy => policy.tracking.supportedCarriers));
  const trackingRequired = policies.some(policy => policy.tracking.required);

  if (!input.orderName.trim()) errors.push("orderName is required");
  if (!input.carrier.trim()) errors.push("carrier is required");
  if (!supportedCarriers.has(input.carrier as any)) {
    errors.push(`carrier ${JSON.stringify(input.carrier)} is not declared in catalog/shipping/*.yaml`);
  }
  if (trackingRequired && !input.trackingNumber.trim()) errors.push("trackingNumber is required by shipping policy");
  if (input.trackingUrl && !/^https:\/\//.test(input.trackingUrl)) errors.push("trackingUrl must be https:// when provided");

  return errors;
}

const ORDER_BY_NAME_QUERY = `#graphql
  query OrderByName($query: String!) {
    orders(first: 1, query: $query) {
      nodes {
        id
        name
        displayFulfillmentStatus
        fulfillmentOrders(first: 10) {
          nodes {
            id
            status
            requestStatus
          }
        }
      }
    }
  }
`;

export async function findOrderFulfillmentTarget(
  client: ReturnType<typeof createShopifyAdminClient>,
  orderName: string,
): Promise<OrderFulfillmentTarget | null> {
  const normalized = orderName.startsWith("#") ? orderName : `#${orderName}`;
  const response = await client.request(ORDER_BY_NAME_QUERY, { variables: { query: `name:${normalized}` } });
  if (response.errors) throw new Error(`Shopify order query failed: ${JSON.stringify(response.errors)}`);

  const order = response.data?.orders?.nodes?.[0];
  if (!order) return null;

  return {
    orderId: order.id,
    orderName: order.name,
    displayFulfillmentStatus: order.displayFulfillmentStatus,
    fulfillmentOrderIds: (order.fulfillmentOrders?.nodes ?? []).map((node: any) => node.id),
  };
}

export function renderTrackingPlan(input: TrackingInput, target: OrderFulfillmentTarget | null): string[] {
  const lines: string[] = [];
  lines.push(`tracking: order=${input.orderName} carrier=${input.carrier} notifyCustomer=${input.notifyCustomer}`);
  if (input.trackingUrl) lines.push(`tracking: url=${input.trackingUrl}`);

  if (!target) {
    lines.push("tracking: no matching Shopify order found; no mutation will be attempted");
    return lines;
  }

  lines.push(`tracking: matched Shopify order ${target.orderName} (${target.orderId}) status=${target.displayFulfillmentStatus}`);
  lines.push(`tracking: fulfillment orders=${target.fulfillmentOrderIds.length}`);
  lines.push("tracking: mutation intentionally not enabled yet; this command is a policy-gated dry-run foundation");
  return lines;
}
