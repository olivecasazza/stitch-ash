/**
 * Cloudflare Pages Function: POST /api/checkout
 *
 * Required secrets (set in Cloudflare Pages project settings > Environment variables):
 *   SHOPIFY_STOREFRONT_DOMAIN       e.g. stitch-and-ash.myshopify.com
 *   SHOPIFY_STOREFRONT_ACCESS_TOKEN Storefront API public token (read products + manage cart)
 *
 * Optional KV binding (used for waitlist storage):
 *   STITCH_BUG_REPORTS  KV namespace — reused from bug-report function (waitlist: prefix)
 *
 * Accepts two request shapes:
 *
 *   1. JSON cart intent (future PDP): { items: [{ variantId, quantity }] }
 *      Returns: { checkoutUrl } JSON with 200
 *
 *   2. Form-encoded OR JSON waitlist: intent=waitlist + email (or { intent: "waitlist", email })
 *      Stores entry in KV (if bound) and redirects to /?waitlist=ok (303)
 *      or returns { ok: true } JSON for JSON callers.
 *
 * Does NOT import @shopify/storefront-api-client — Workers runtime cannot resolve
 * npm packages at function runtime. GraphQL is sent via globalThis.fetch instead.
 */

const STOREFRONT_API_VERSION = "2025-04";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const asString = (value) => (typeof value === "string" ? value.trim() : "");

/**
 * Parse request body — handles both JSON and form-encoded content types.
 * Returns a plain object with string values; never throws (returns {} on failure).
 */
async function parseBody(request) {
  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    try {
      return await request.json();
    } catch {
      return null;
    }
  }

  if (
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data")
  ) {
    try {
      const formData = await request.formData();
      const obj = {};
      for (const [key, value] of formData.entries()) {
        obj[key] = value;
      }
      return obj;
    } catch {
      return null;
    }
  }

  // Fallback: try JSON, then form-encoded
  try {
    const text = await request.text();
    try {
      return JSON.parse(text);
    } catch {
      // Try to decode as form-encoded
      const params = new URLSearchParams(text);
      const obj = {};
      for (const [key, value] of params.entries()) {
        obj[key] = value;
      }
      return Object.keys(obj).length > 0 ? obj : null;
    }
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Waitlist handler
// ---------------------------------------------------------------------------

async function handleWaitlist(payload, env, isJsonRequest) {
  const email = asString(payload.email);
  if (!email || !email.includes("@")) {
    if (isJsonRequest) {
      return json({ error: "A valid email address is required." }, 400);
    }
    return Response.redirect("/?waitlist=error", 303);
  }

  const id = `waitlist:${Date.now()}:${crypto.randomUUID()}`;
  const entry = {
    id,
    kind: "waitlist",
    email,
    sku: asString(payload.sku) || null,
    createdAt: new Date().toISOString(),
  };

  // STITCH_BUG_REPORTS KV namespace is reused (waitlist: prefix distinguishes entries).
  // If the binding is absent, log and continue — don't fail the user.
  await env.STITCH_BUG_REPORTS?.put(id, JSON.stringify(entry), {
    metadata: { kind: "waitlist", email },
  });

  if (isJsonRequest) {
    return json({ ok: true, id }, 200);
  }

  // For a native form POST, redirect back with a query param the page can read.
  const redirectBase = payload.sku ? `/products/${asString(payload.sku)}` : "/";
  return Response.redirect(`${redirectBase}?waitlist=ok`, 303);
}

// ---------------------------------------------------------------------------
// Cart handler — calls Storefront API via fetch (no npm imports at runtime)
// ---------------------------------------------------------------------------

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
  const domain = env.SHOPIFY_STOREFRONT_DOMAIN;
  const token = env.SHOPIFY_STOREFRONT_ACCESS_TOKEN;

  if (!domain || !token) {
    return json(
      { error: "Storefront API is not configured. Check server environment variables." },
      503,
    );
  }

  if (!Array.isArray(items) || items.length === 0) {
    return json({ error: "items must be a non-empty array." }, 400);
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
        "X-Shopify-Storefront-Access-Token": token,
      },
      body: JSON.stringify({
        query: CART_CREATE_MUTATION,
        variables: { lines },
      }),
    });
  } catch (err) {
    console.error("Storefront API fetch failed:", err);
    return json({ error: "Could not reach Shopify. Try again shortly." }, 502);
  }

  let body;
  try {
    body = await resp.json();
  } catch {
    return json({ error: "Unexpected response from Shopify." }, 502);
  }

  if (!resp.ok) {
    console.error("Storefront API non-OK status:", resp.status, body);
    return json({ error: "Shopify returned an error. Try again." }, 502);
  }

  const userErrors = body?.data?.cartCreate?.userErrors ?? [];
  if (userErrors.length > 0) {
    return json({ error: userErrors.map((e) => e.message).join("; ") }, 422);
  }

  const cart = body?.data?.cartCreate?.cart;
  if (!cart?.checkoutUrl) {
    console.error("cartCreate returned no cart:", body);
    return json({ error: "Cart creation failed. Try again." }, 502);
  }

  return json({ checkoutUrl: cart.checkoutUrl }, 200);
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

export async function onRequestPost({ request, env }) {
  const contentType = request.headers.get("content-type") || "";
  const isJsonRequest = contentType.includes("application/json");

  const payload = await parseBody(request);
  if (payload === null) {
    return json({ error: "Could not parse request body." }, 400);
  }

  const intent = asString(payload.intent);

  // Explicit waitlist intent (both form-encoded from homepage/PDP and JSON callers).
  if (intent === "waitlist") {
    return handleWaitlist(payload, env, isJsonRequest);
  }

  // Cart intent: JSON body with items array.
  if (Array.isArray(payload.items)) {
    return handleCart(payload.items, env);
  }

  // Implicit waitlist: form POST with an email but no items/explicit intent.
  if (asString(payload.email)) {
    return handleWaitlist(payload, env, isJsonRequest);
  }

  return json(
    {
      error:
        'Provide either { items: [{variantId, quantity}] } for checkout or { intent: "waitlist", email } for the waitlist.',
    },
    400,
  );
}
