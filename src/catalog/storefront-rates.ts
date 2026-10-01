/**
 * STI-539: probe real checkout rates through the Storefront API.
 *
 * The Admin API cannot see the live shipping defect (see ./checkout-rates.ts
 * for why). This module is the only transport that can: it builds a real cart
 * with one line item and asks the Storefront API what it quotes a buyer at a
 * given destination.
 *
 * The request shape is pinned here because it is easy to get subtly wrong, and
 * a wrong shape does not fail loudly -- it returns HTTP 200 with an empty
 * `deliveryGroups`, which is indistinguishable from the defect being measured.
 * That exact ambiguity is what produced STI-539's incorrect "$0.00 international"
 * reading. The nesting is:
 *
 *     CartInput.delivery.addresses[].address.deliveryAddress.countryCode / .zip
 *
 * and `lines[].merchandiseId` must be present, or no delivery group is ever
 * computed. Each of those was verified against the live schema this run via
 * __type introspection (CartInput -> CartDeliveryInput -> CartSelectableAddressInput
 * -> CartAddressInput -> CartDeliveryAddressInput).
 */

import { parseDeliveryGroups, PROBE_POSTAL_CODES } from "./checkout-rates.js";
import type { CheckoutRateProbe, CheckoutReachability } from "./checkout-rates.js";

export type StorefrontClient = { domain: string; token: string };

const CART_CREATE_MUTATION = `mutation ($c: CartInput!) {
  cartCreate(input: $c) {
    cart {
      id
      deliveryGroups(first: 5) {
        nodes {
          deliveryOptions {
            title
            deliveryMethodType
            estimatedCost { amount currencyCode }
          }
        }
      }
    }
    userErrors { field message }
  }
}`;

export function storefrontClientFromEnv(env: NodeJS.ProcessEnv = process.env): StorefrontClient | null {
  const domain = env.SHOPIFY_STOREFRONT_DOMAIN ?? env.SHOPIFY_ADMIN_STORE_DOMAIN;
  const token = env.SHOPIFY_STOREFRONT_TOKEN;
  if (!domain || !token) return null;
  return { domain, token };
}

async function storefrontFetch(client: StorefrontClient, body: unknown): Promise<unknown> {
  const response = await fetch(`https://${client.domain}/api/2024-10/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": client.token,
    },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Storefront API HTTP ${response.status}: ${text.slice(0, 300)}`);
  }
  return JSON.parse(text);
}

/**
 * Quote one destination for one variant.
 *
 * `addressAccepted` is the honesty guard: if the API reports `userErrors`, the
 * probe proved nothing about shipping and must be reported as inconclusive
 * rather than as a blocked destination.
 */
export async function probeCheckoutRates(
  client: StorefrontClient,
  variantGid: string,
  countryCode: string,
  postalCode: string,
): Promise<CheckoutReachability> {
  const payload = await storefrontFetch(client, {
    query: CART_CREATE_MUTATION,
    variables: {
      c: {
        lines: [{ merchandiseId: variantGid, quantity: 1 }],
        delivery: {
          addresses: [
            {
              address: { deliveryAddress: { countryCode, zip: postalCode } },
              selected: true,
            },
          ],
        },
      },
    },
  });

  const envelope = payload as {
    errors?: { message: string }[];
    data?: { cartCreate?: { cart?: unknown; userErrors?: { field?: string | null; message: string }[] } };
  };

  if (envelope.errors?.length) {
    throw new Error(
      `Storefront API rejected the probe request (a malformed probe must not be reported as a shipping defect): ${envelope.errors
        .map(e => e.message)
        .join("; ")
        .slice(0, 300)}`,
    );
  }

  const cartCreate = envelope.data?.cartCreate;
  const userErrors = cartCreate?.userErrors ?? [];

  return {
    countryCode,
    postalCode,
    probes: parseDeliveryGroups({ data: { cart: cartCreate?.cart } }) as CheckoutRateProbe[],
    addressAccepted: userErrors.length === 0,
  };
}

/** Probe every destination the catalog declares a shipping rule for. */
export async function probeDeclaredDestinations(
  client: StorefrontClient,
  variantGid: string,
  countryCodes: readonly string[],
): Promise<CheckoutReachability[]> {
  const results: CheckoutReachability[] = [];
  for (const countryCode of countryCodes) {
    const postalCode = PROBE_POSTAL_CODES[countryCode];
    if (!postalCode) {
      throw new Error(
        `No probe postal code is defined for ${countryCode}. Add one to PROBE_POSTAL_CODES; ` +
          `guessing an invalid postal code makes the Storefront API reject the address, which would ` +
          `turn an unknown destination into a false "no_options" verdict.`,
      );
    }
    results.push(await probeCheckoutRates(client, variantGid, countryCode, postalCode));
  }
  return results;
}