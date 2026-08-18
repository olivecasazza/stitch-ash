import type { FulfillmentTarget, ShippingPolicy, TrackingInput } from "./schema.js";

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
  const token = process.env.SHOPIFY_ADMIN_TOKEN;
  const domain = process.env.SHOPIFY_STOREFRONT_DOMAIN ?? "stitch-and-ash.myshopify.com";
  if (!token) throw new Error("SHOPIFY_ADMIN_TOKEN is not set");

  const query = `
    query getOrderByName($name: String!) {
      order(name: $name) {
        id
        name
        fulfillmentStatus
        lineItems(first: 20) {
          edges {
            node {
              id
              variant { id sku }
              quantity
              fulfillmentService { id name }
            }
          }
        }
      }
    }
  `;

  const response = await fetch(`https://${domain}/admin/api/2026-04/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": token,
    },
    body: JSON.stringify({ query, variables: { name: orderName } }),
  });

  if (!response.ok) return null;
  const json = await response.json() as { data?: { order: {
    id: string;
    name: string;
    fulfillmentStatus: string;
    lineItems: { edges: { node: {
      id: string;
      variant: { id: string; sku: string } | null;
      quantity: number;
      fulfillmentService: { id: string; name: string } | null;
    }}[] };
  } | null } };

  const order = json.data?.order;
  if (!order) return null;

  const line = order.lineItems.edges[0]?.node;
  if (!line) return null;

  return {
    orderId: order.id,
    orderName: order.name,
    lineItemId: line.id,
    variantId: line.variant?.id ?? "",
    quantity: line.quantity,
    fulfillmentService: line.fulfillmentService?.name ?? "manual",
    locationId: "",
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
  const token = process.env.SHOPIFY_ADMIN_TOKEN;
  const domain = process.env.SHOPIFY_STOREFRONT_DOMAIN ?? "stitch-and-ash.myshopify.com";
  if (!token) throw new Error("SHOPIFY_ADMIN_TOKEN is not set");

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

  const response = await fetch(`https://${domain}/admin/api/2026-04/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": token,
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
