import { H3Event } from 'h3';

const STOREFRONT_API_VERSION = "2026-04";

const asString = (value: any) => (typeof value === "string" ? value.trim() : "");

async function handleWaitlist(payload: any, event: H3Event, env: any, isJsonRequest: boolean) {
  const email = asString(payload.email);
  if (!email || !email.includes("@")) {
    if (isJsonRequest) {
      throw createError({
        statusCode: 400,
        statusMessage: "A valid email address is required.",
      });
    }
    return sendRedirect(event, "/?waitlist=error", 303);
  }

  const id = `waitlist:${Date.now()}:${crypto.randomUUID()}`;
  const entry = {
    id,
    kind: "waitlist",
    email,
    sku: asString(payload.sku) || null,
    createdAt: new Date().toISOString(),
  };

  // On Cloudflare Pages, STITCH_BUG_REPORTS KV namespace is reused
  if (env.STITCH_BUG_REPORTS) {
    await env.STITCH_BUG_REPORTS.put(id, JSON.stringify(entry), {
      metadata: { kind: "waitlist", email },
    });
  }

  if (isJsonRequest) {
    return { ok: true, id };
  }

  // Redirect back
  const redirectBase = payload.sku ? `/product/${asString(payload.sku)}` : "/";
  return sendRedirect(event, `${redirectBase}?waitlist=ok`, 303);
}

const CART_CREATE_MUTATION = `
  mutation cartCreate($lines: [CartLineInput!]!) {
    cartCreate(input: { lines: $lines }) {
      cart {
        id
        checkoutUrl
      }
      userErrors {
        field
        message
      }
    }
  }
`;

async function handleCart(items: any[], env: any) {
  const domain = env.SHOPIFY_STOREFRONT_DOMAIN ?? env.PUBLIC_SHOPIFY_STORE_DOMAIN;
  const token = env.SHOPIFY_STOREFRONT_ACCESS_TOKEN ?? env.NUXT_SHOPIFY_CLIENTS_STOREFRONT_PUBLIC_ACCESS_TOKEN;

  if (!domain) {
    throw createError({
      statusCode: 503,
      statusMessage: "Storefront API is not configured. Domain is missing.",
    });
  }

  if (!Array.isArray(items) || items.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: "items must be a non-empty array.",
    });
  }

  const lines = items.map((item) => ({
    merchandiseId: String(item.variantId),
    quantity: Number(item.quantity) || 1,
  }));

  const endpoint = `https://${domain}/api/${STOREFRONT_API_VERSION}/graphql.json`;

  let resp;
  try {
    resp = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": token || "",
      },
      body: JSON.stringify({
        query: CART_CREATE_MUTATION,
        variables: { lines },
      }),
    });
  } catch (err) {
    console.error("Storefront API fetch failed:", err);
    throw createError({
      statusCode: 502,
      statusMessage: "Could not reach Shopify. Try again shortly.",
    });
  }

  let body: any;
  try {
    body = await resp.json();
  } catch {
    throw createError({
      statusCode: 502,
      statusMessage: "Unexpected response from Shopify.",
    });
  }

  if (!resp.ok) {
    console.error("Storefront API non-OK status:", resp.status, body);
    throw createError({
      statusCode: 502,
      statusMessage: "Shopify returned an error. Try again.",
    });
  }

  const userErrors = body?.data?.cartCreate?.userErrors ?? [];
  if (userErrors.length > 0) {
    throw createError({
      statusCode: 422,
      statusMessage: userErrors.map((e: any) => e.message).join("; "),
    });
  }

  const cart = body?.data?.cartCreate?.cart;
  if (!cart?.checkoutUrl) {
    console.error("cartCreate returned no cart:", body);
    throw createError({
      statusCode: 502,
      statusMessage: "Cart creation failed. Try again.",
    });
  }

  return { checkoutUrl: cart.checkoutUrl };
}

export default defineEventHandler(async (event) => {
  const env = event.context.cloudflare?.env ?? process.env;
  const contentType = getHeader(event, "content-type") || "";
  const isJsonRequest = contentType.includes("application/json");

  let payload: any;
  try {
    payload = await readBody(event);
  } catch {
    throw createError({
      statusCode: 400,
      statusMessage: "Could not parse request body.",
    });
  }

  if (!payload) {
    throw createError({
      statusCode: 400,
      statusMessage: "Request body is empty.",
    });
  }

  const intent = asString(payload.intent);

  // Explicit waitlist intent
  if (intent === "waitlist") {
    return handleWaitlist(payload, event, env, isJsonRequest);
  }

  // Cart intent
  if (Array.isArray(payload.items)) {
    return handleCart(payload.items, env);
  }

  // Implicit waitlist
  if (asString(payload.email)) {
    return handleWaitlist(payload, event, env, isJsonRequest);
  }

  throw createError({
    statusCode: 400,
    statusMessage: 'Provide either { items: [{variantId, quantity}] } for checkout or { intent: "waitlist", email } for waitlist.',
  });
});
