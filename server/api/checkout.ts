import { H3Event } from 'h3';

const STOREFRONT_API_VERSION = "2026-04";

const asString = (value: any) => (typeof value === "string" ? value.trim() : "");

// STI-468: a merchandise id that is not a well-formed variant GID makes Shopify
// answer with a top-level GraphQL `errors` array and `data.cartCreate === null`
// rather than a `userErrors` entry. That difference is invisible to the
// userErrors/cart checks below, so the request fell through to the trailing
// error branch and the *shape of the caller's input* decided the status code.
// Validate the shape here so the request never leaves the origin.
const VARIANT_GID = /^gid:\/\/shopify\/ProductVariant\/\d+$/;

// STI-468: never raise 502 from application code on this route. Behind
// Cloudflare Pages the edge replaces the body of any 5xx returned by a Worker
// with its own plain-text `error code: NNN` page, so a 502 raised here is
// indistinguishable from Cloudflare's own bad-gateway response — the Nitro
// error envelope is discarded, the customer sees 16 bytes of text, and the
// response cannot be diagnosed from the outside. 4xx and 503 survive the edge
// with their JSON envelope intact, so upstream/config failure is reported as
// 503 and rejected input is reported as 422.
const UPSTREAM_UNAVAILABLE = 503;
const INVALID_MERCHANDISE = 422;

// Shopify reports a rejected line as a top-level GraphQL error, not a
// userErrors entry. Classify by whether the message names the input variable
// so a caller-visible bad id stays a 422 instead of being reported as an
// upstream outage.
function isInputShapedGraphQLError(errors: any[]): boolean {
  return errors.some((e: any) => {
    const text = `${e?.message ?? ""} ${e?.path ?? ""} ${e?.extensions?.code ?? ""}`;
    return /merchandiseId|ProductVariant|lines\b|CartLineInput|Variable/i.test(text);
  });
}

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

  if (!domain || !token) {
    throw createError({
      statusCode: 503,
      statusMessage: domain
        ? "Storefront API is not configured. Access token is missing."
        : "Storefront API is not configured. Domain is missing.",
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

  // Reject a malformed merchandise id at the origin. Without this the same
  // logical failure reaches Shopify and comes back as an indistinguishable
  // upstream error, and the caller's input shape picks the status code.
  const malformed = lines.filter((line) => !VARIANT_GID.test(line.merchandiseId));
  if (malformed.length > 0) {
    throw createError({
      statusCode: INVALID_MERCHANDISE,
      statusMessage: `Invalid merchandise id: ${malformed
        .map((l) => l.merchandiseId)
        .join(", ")}. Expected gid://shopify/ProductVariant/<id>.`,
    });
  }

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
      statusCode: UPSTREAM_UNAVAILABLE,
      statusMessage: "Could not reach Shopify. Try again shortly.",
    });
  }

  let body: any;
  try {
    body = await resp.json();
  } catch {
    console.error("Storefront API returned a non-JSON body.");
    throw createError({
      statusCode: UPSTREAM_UNAVAILABLE,
      statusMessage: "Unexpected response from Shopify.",
    });
  }

  if (!resp.ok) {
    console.error("Storefront API non-OK status:", resp.status, body);
    throw createError({
      statusCode: UPSTREAM_UNAVAILABLE,
      statusMessage: "Shopify returned an error. Try again.",
    });
  }

  // STI-468: read the top-level GraphQL `errors` array BEFORE the userErrors
  // and cart checks. A GraphQL error is reported here with `data.cartCreate`
  // null, so `userErrors` reads as empty and `cart` as undefined — without
  // this branch the true cause was dropped on the floor and never reached a
  // log or the caller.
  const graphQLErrors: any[] = Array.isArray(body?.errors) ? body.errors : [];
  if (graphQLErrors.length > 0) {
    console.error("Storefront API returned top-level GraphQL errors:", graphQLErrors);
    const detail = graphQLErrors
      .map((e: any) => asString(e?.message))
      .filter(Boolean)
      .join("; ");
    throw createError({
      statusCode: isInputShapedGraphQLError(graphQLErrors)
        ? INVALID_MERCHANDISE
        : UPSTREAM_UNAVAILABLE,
      statusMessage: detail
        ? `Shopify rejected the cart request: ${detail}`
        : "Shopify rejected the cart request.",
    });
  }

  const userErrors = body?.data?.cartCreate?.userErrors ?? [];
  if (userErrors.length > 0) {
    throw createError({
      statusCode: INVALID_MERCHANDISE,
      statusMessage: userErrors.map((e: any) => e.message).join("; "),
    });
  }

  const cart = body?.data?.cartCreate?.cart;
  if (!cart?.checkoutUrl) {
    console.error("cartCreate returned no cart:", body);
    throw createError({
      statusCode: UPSTREAM_UNAVAILABLE,
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
