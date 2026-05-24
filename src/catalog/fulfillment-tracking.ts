import type { ShippingPolicy } from "./shipping.ts";

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
        fulfillmentOrders(first: 10, query: "status:OPEN") {
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

export async function findOrderFulfillmentTarget(orderName: string): Promise<OrderFulfillmentTarget | null> {
  const token = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
  const storeDomain = process.env.SHOPIFY_ADMIN_STORE_DOMAIN;
  if (!token) throw new Error("Missing required environment variable SHOPIFY_ADMIN_ACCESS_TOKEN");
  if (!storeDomain) throw new Error("Missing required environment variable SHOPIFY_ADMIN_STORE_DOMAIN");

  const normalized = orderName.startsWith("#") ? orderName : `#${orderName}`;
  const response = await fetch(`https://${storeDomain}/admin/api/2026-04/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": token,
    },
    body: JSON.stringify({
      query: ORDER_BY_NAME_QUERY,
      variables: { query: `name:${normalized}` },
    }),
  });

  const body = await response.json() as any;
  if (!response.ok || body.errors) {
    throw new Error(`Shopify order query failed: ${JSON.stringify(body.errors ?? body)}`);
  }

  const order = body.data?.orders?.nodes?.[0];
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
  lines.push(`tracking: found ${target.fulfillmentOrderIds.length} open fulfillment orders`);
  if (target.fulfillmentOrderIds.length === 0) {
    lines.push("tracking: WARNING: no open fulfillment orders found. Order may already be fulfilled.");
  }
  return lines;
}

const FULFILLMENT_CREATE_MUTATION = `#graphql
  mutation fulfillmentCreate($fulfillment: FulfillmentV2Input!) {
    fulfillmentCreate(fulfillment: $fulfillment) {
      fulfillment {
        id
        status
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export async function applyFulfillmentTracking(target: OrderFulfillmentTarget, input: TrackingInput): Promise<string> {
  if (target.fulfillmentOrderIds.length === 0) {
    throw new Error(`Order ${target.orderName} has no open fulfillment orders to fulfill.`);
  }

  const token = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
  const storeDomain = process.env.SHOPIFY_ADMIN_STORE_DOMAIN;

  const fulfillmentInput = {
    lineItemsByFulfillmentOrder: target.fulfillmentOrderIds.map(id => ({ fulfillmentOrderId: id })),
    notifyCustomer: input.notifyCustomer,
    trackingInfo: {
      company: input.carrier,
      number: input.trackingNumber,
      url: input.trackingUrl || null,
    }
  };

  const response = await fetch(`https://${storeDomain}/admin/api/2026-04/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": token!,
    },
    body: JSON.stringify({
      query: FULFILLMENT_CREATE_MUTATION,
      variables: { fulfillment: fulfillmentInput },
    }),
  });

  const body = await response.json() as any;
  if (!response.ok || body.errors) {
    throw new Error(`Shopify fulfillment mutation failed: ${JSON.stringify(body.errors ?? body)}`);
  }

  const userErrors = body.data?.fulfillmentCreate?.userErrors ?? [];
  if (userErrors.length > 0) {
    throw new Error(`Fulfillment failed: ${userErrors.map((e: any) => e.message).join("; ")}`);
  }

  const fulfillmentId = body.data?.fulfillmentCreate?.fulfillment?.id;
  if (!fulfillmentId) throw new Error("Fulfillment created but no ID returned.");

  return fulfillmentId;
}
