/**
 * Typed Shopify Storefront API client wrapper.
 *
 * Reads SHOPIFY_STOREFRONT_DOMAIN and SHOPIFY_STOREFRONT_ACCESS_TOKEN from env.
 * Both are required at runtime; missing values throw immediately.
 *
 * Used server-side only (Astro SSR or Cloudflare Pages Functions).
 * The Pages Function (functions/api/checkout.js) does NOT import this module —
 * it calls the Storefront API directly via fetch (Workers runtime constraint).
 * This file exists for Astro server routes and future build-time PDP data fetching.
 */

import { createStorefrontApiClient } from "@shopify/storefront-api-client";

const STOREFRONT_API_VERSION = "2026-04";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LineItem {
  variantId: string;
  quantity: number;
}

export interface CartResult {
  checkoutUrl: string;
  cartId: string;
}

export interface ProductVariant {
  id: string;
  title: string;
  price: {
    amount: string;
    currencyCode: string;
  };
  availableForSale: boolean;
}

export interface Product {
  id: string;
  handle: string;
  title: string;
  description: string;
  variants: ProductVariant[];
}

// ---------------------------------------------------------------------------
// Internal: typed response shapes for cartCreate
// ---------------------------------------------------------------------------

interface CartCreateResponse {
  cartCreate: {
    cart: {
      id: string;
      checkoutUrl: string;
    } | null;
    userErrors: Array<{ field: string[]; message: string }>;
  };
}

interface ProductQueryResponse {
  product: {
    id: string;
    handle: string;
    title: string;
    description: string;
    variants: {
      edges: Array<{
        node: {
          id: string;
          title: string;
          price: {
            amount: string;
            currencyCode: string;
          };
          availableForSale: boolean;
        };
      }>;
    };
  } | null;
}

// ---------------------------------------------------------------------------
// Client factory
// ---------------------------------------------------------------------------

function getRequiredEnv(key: string): string {
  const value = import.meta.env[key] as string | undefined;
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function buildClient() {
  const storeDomain = getRequiredEnv("SHOPIFY_STOREFRONT_DOMAIN");
  const publicAccessToken = getRequiredEnv("SHOPIFY_STOREFRONT_ACCESS_TOKEN");

  return createStorefrontApiClient({
    storeDomain,
    apiVersion: STOREFRONT_API_VERSION,
    publicAccessToken,
  });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Creates a Shopify cart with the given line items and returns the hosted
 * checkout URL plus the opaque cart ID.
 */
export async function createCart(lineItems: LineItem[]): Promise<CartResult> {
  const client = buildClient();

  const mutation = `#graphql
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

  const lines = lineItems.map((item) => ({
    merchandiseId: item.variantId,
    quantity: item.quantity,
  }));

  const { data, errors } = await client.request<CartCreateResponse>(mutation, {
    variables: { lines },
  });

  if (errors) {
    throw new Error(`Storefront API errors: ${JSON.stringify(errors)}`);
  }

  const userErrors = data?.cartCreate?.userErrors ?? [];
  if (userErrors.length > 0) {
    throw new Error(`Cart creation failed: ${userErrors.map((e) => e.message).join(", ")}`);
  }

  const cart = data?.cartCreate?.cart;
  if (!cart) {
    throw new Error("Cart creation returned no cart object");
  }

  return {
    checkoutUrl: cart.checkoutUrl,
    cartId: cart.id,
  };
}

/**
 * Fetches a product by its URL handle for PDP use.
 * Returns null if the product does not exist.
 */
export async function getProduct(handle: string): Promise<Product | null> {
  const client = buildClient();

  const query = `#graphql
    query getProduct($handle: String!) {
      product(handle: $handle) {
        id
        handle
        title
        description
        variants(first: 50) {
          edges {
            node {
              id
              title
              price {
                amount
                currencyCode
              }
              availableForSale
            }
          }
        }
      }
    }
  `;

  const { data, errors } = await client.request<ProductQueryResponse>(query, {
    variables: { handle },
  });

  if (errors) {
    throw new Error(`Storefront API errors: ${JSON.stringify(errors)}`);
  }

  const product = data?.product;
  if (!product) return null;

  return {
    id: product.id,
    handle: product.handle,
    title: product.title,
    description: product.description,
    variants: product.variants.edges.map((e) => ({
      id: e.node.id,
      title: e.node.title,
      price: e.node.price,
      availableForSale: e.node.availableForSale,
    })),
  };
}
