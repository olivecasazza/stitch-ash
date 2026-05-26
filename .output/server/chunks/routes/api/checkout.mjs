import { n as defineEventHandler, x as getHeader, Q as readBody, l as createError, S as sendRedirect } from '../../nitro/nitro.mjs';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'lru-cache';
import 'node:fs';
import 'node:path';
import 'node:crypto';
import 'vue-router';
import 'node:url';
import 'zod';
import '@iconify/utils';
import 'consola';

const STOREFRONT_API_VERSION = "2026-04";
const asString = (value) => typeof value === "string" ? value.trim() : "";
async function handleWaitlist(payload, event, env, isJsonRequest) {
  const email = asString(payload.email);
  if (!email || !email.includes("@")) {
    if (isJsonRequest) {
      throw createError({
        statusCode: 400,
        statusMessage: "A valid email address is required."
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
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  if (env.STITCH_BUG_REPORTS) {
    await env.STITCH_BUG_REPORTS.put(id, JSON.stringify(entry), {
      metadata: { kind: "waitlist", email }
    });
  }
  if (isJsonRequest) {
    return { ok: true, id };
  }
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
async function handleCart(items, env) {
  var _a, _b, _c, _d, _e, _f, _g;
  const domain = (_a = env.SHOPIFY_STOREFRONT_DOMAIN) != null ? _a : env.PUBLIC_SHOPIFY_STORE_DOMAIN;
  const token = (_b = env.SHOPIFY_STOREFRONT_ACCESS_TOKEN) != null ? _b : env.NUXT_SHOPIFY_CLIENTS_STOREFRONT_PUBLIC_ACCESS_TOKEN;
  if (!domain) {
    throw createError({
      statusCode: 503,
      statusMessage: "Storefront API is not configured. Domain is missing."
    });
  }
  if (!Array.isArray(items) || items.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: "items must be a non-empty array."
    });
  }
  const lines = items.map((item) => ({
    merchandiseId: String(item.variantId),
    quantity: Number(item.quantity) || 1
  }));
  const endpoint = `https://${domain}/api/${STOREFRONT_API_VERSION}/graphql.json`;
  let resp;
  try {
    resp = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": token || ""
      },
      body: JSON.stringify({
        query: CART_CREATE_MUTATION,
        variables: { lines }
      })
    });
  } catch (err) {
    console.error("Storefront API fetch failed:", err);
    throw createError({
      statusCode: 502,
      statusMessage: "Could not reach Shopify. Try again shortly."
    });
  }
  let body;
  try {
    body = await resp.json();
  } catch {
    throw createError({
      statusCode: 502,
      statusMessage: "Unexpected response from Shopify."
    });
  }
  if (!resp.ok) {
    console.error("Storefront API non-OK status:", resp.status, body);
    throw createError({
      statusCode: 502,
      statusMessage: "Shopify returned an error. Try again."
    });
  }
  const userErrors = (_e = (_d = (_c = body == null ? void 0 : body.data) == null ? void 0 : _c.cartCreate) == null ? void 0 : _d.userErrors) != null ? _e : [];
  if (userErrors.length > 0) {
    throw createError({
      statusCode: 422,
      statusMessage: userErrors.map((e) => e.message).join("; ")
    });
  }
  const cart = (_g = (_f = body == null ? void 0 : body.data) == null ? void 0 : _f.cartCreate) == null ? void 0 : _g.cart;
  if (!(cart == null ? void 0 : cart.checkoutUrl)) {
    console.error("cartCreate returned no cart:", body);
    throw createError({
      statusCode: 502,
      statusMessage: "Cart creation failed. Try again."
    });
  }
  return { checkoutUrl: cart.checkoutUrl };
}
const checkout = defineEventHandler(async (event) => {
  var _a, _b;
  const env = (_b = (_a = event.context.cloudflare) == null ? void 0 : _a.env) != null ? _b : process.env;
  const contentType = getHeader(event, "content-type") || "";
  const isJsonRequest = contentType.includes("application/json");
  let payload;
  try {
    payload = await readBody(event);
  } catch {
    throw createError({
      statusCode: 400,
      statusMessage: "Could not parse request body."
    });
  }
  if (!payload) {
    throw createError({
      statusCode: 400,
      statusMessage: "Request body is empty."
    });
  }
  const intent = asString(payload.intent);
  if (intent === "waitlist") {
    return handleWaitlist(payload, event, env, isJsonRequest);
  }
  if (Array.isArray(payload.items)) {
    return handleCart(payload.items, env);
  }
  if (asString(payload.email)) {
    return handleWaitlist(payload, event, env, isJsonRequest);
  }
  throw createError({
    statusCode: 400,
    statusMessage: 'Provide either { items: [{variantId, quantity}] } for checkout or { intent: "waitlist", email } for waitlist.'
  });
});

export { checkout as default };
//# sourceMappingURL=checkout.mjs.map
