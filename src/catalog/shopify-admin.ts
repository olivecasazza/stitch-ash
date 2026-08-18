import type { CatalogProduct, ProductDiff, ShopifyProduct, ShopifyVariant } from "./schema.js";

export type AdminClient = { domain: string; token: string; source: "static" | "client_credentials" };

let cachedAdminClient: AdminClient | null = null;

function mask(value: string | undefined): string {
  if (!value) return "missing";
  const prefix = value.slice(0, Math.min(value.length, 8));
  return `set prefix=${JSON.stringify(prefix)} len=${value.length}`;
}

export async function mintAdminToken(domain: string, clientId: string, clientSecret: string): Promise<string> {
  const response = await fetch(`https://${domain}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    }).toString(),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Shopify client_credentials mint ${response.status}: ${text}`);
  }

  const json = await response.json() as { access_token?: string; expires_in?: number };
  if (!json.access_token) {
    throw new Error(`Shopify client_credentials mint returned no access_token: ${JSON.stringify(json)}`);
  }
  return json.access_token;
}

export async function buildAdminClient(): Promise<AdminClient> {
  const domain = process.env.SHOPIFY_ADMIN_STORE_DOMAIN ?? process.env.SHOPIFY_STOREFRONT_DOMAIN ?? "stitch-and-ash.myshopify.com";

  const staticToken = process.env.SHOPIFY_ADMIN_TOKEN;
  const clientId = process.env.SHOPIFY_CLIENT_ID;
  const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;

  if (staticToken && !staticToken.startsWith("atkn_")) {
    return { domain, token: staticToken, source: "static" };
  }

  if (clientId && clientSecret) {
    const token = await mintAdminToken(domain, clientId, clientSecret);
    return { domain, token, source: "client_credentials" };
  }

  throw new Error(
    `SHOPIFY_ADMIN_TOKEN missing/invalid and SHOPIFY_CLIENT_ID/SHOPIFY_CLIENT_SECRET not set. ` +
      `Saw: SHOPIFY_ADMIN_TOKEN=${mask(staticToken)}, SHOPIFY_CLIENT_ID=${mask(clientId)}, ` +
      `SHOPIFY_CLIENT_SECRET=${mask(clientSecret)}.`,
  );
}

export async function createShopifyAdminClient(): Promise<AdminClient> {
  if (cachedAdminClient) return cachedAdminClient;
  cachedAdminClient = await buildAdminClient();
  console.log(`shopify-admin: client ready (source=${cachedAdminClient.source}, domain=${cachedAdminClient.domain})`);
  return cachedAdminClient;
}

async function shopifyAdminFetch(client: AdminClient, query: string, variables?: Record<string, unknown>) {
  const response = await fetch(`https://${client.domain}/admin/api/2026-04/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": client.token,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Shopify Admin API ${response.status}: ${text}`);
  }

  const json = await response.json() as { data?: unknown; errors?: unknown[] };
  if (json.errors?.length) {
    throw new Error(`Shopify GraphQL errors: ${JSON.stringify(json.errors)}`);
  }

  return json.data;
}

export async function getProductByHandle(client: AdminClient, handle: string): Promise<ShopifyProduct | null> {
  const query = `
    query getProductByHandle($query: String!) {
      products(first: 1, query: $query) {
        edges {
          node {
            id
            title
            handle
            status
            productType
            vendor
            tags
            descriptionHtml
            options { name values }
            variants(first: 50) {
              edges { node {
                id
                sku
                price
                selectedOptions { name value }
                inventoryPolicy
                inventoryQuantity
              }}
            }
          }
        }
      }
    }
  `;

  const data = await shopifyAdminFetch(client, query, { query: `handle:${handle}` }) as {
    products: {
      edges: {
        node: {
          id: string;
          title: string;
          handle: string;
          status: string;
          productType: string | null;
          vendor: string | null;
          tags: string[];
          descriptionHtml: string;
          options: { name: string; values: string[] }[];
          variants: { edges: { node: ShopifyVariant }[] };
        };
      }[];
    };
  };

  const node = data.products.edges[0]?.node;
  if (!node) return null;

  return {
    id: node.id,
    title: node.title,
    handle: node.handle,
    status: node.status,
    productType: node.productType,
    vendor: node.vendor,
    tags: node.tags,
    bodyHtml: node.descriptionHtml,
    options: node.options,
    variants: node.variants.edges.map(e => e.node),
  };
}

function normalizeVariant(v: CatalogProduct["variants"][0]): string {
  return JSON.stringify({
    sku: v.sku,
    price: v.price,
    option1: v.option1 ?? null,
    option2: v.option2 ?? null,
    option3: v.option3 ?? null,
    inventoryPolicy: v.inventoryPolicy ?? "CONTINUE",
  });
}

function normalizeRemoteVariant(v: ShopifyVariant): string {
  const byName: Record<string, string> = {};
  for (const o of v.selectedOptions) byName[o.name] = o.value;
  return JSON.stringify({
    sku: v.sku,
    price: v.price,
    option1: byName["Option1"] ?? byName["Title"] ?? null,
    option2: byName["Option2"] ?? null,
    option3: byName["Option3"] ?? null,
    inventoryPolicy: v.inventory_policy ?? "CONTINUE",
  });
}

export function diffProduct(product: CatalogProduct, remote: ShopifyProduct | null): ProductDiff {
  const actions: string[] = [];

  if (!remote) {
    actions.push(`create product ${product.id} (${product.title})`);
    for (const variant of product.variants) {
      actions.push(`  create variant ${variant.sku} @ ${variant.price}`);
    }
    return { product, remote: null, actions };
  }

  if (product.title !== remote.title) actions.push(`set title: "${remote.title}" -> "${product.title}"`);
  if (product.handle !== remote.handle) actions.push(`set handle: "${remote.handle}" (shopify-id mismatch detected)`);
  if (product.status !== remote.status) actions.push(`set status: ${remote.status} -> ${product.status}`);
  if ((product.bodyHtml ?? "") !== (remote.bodyHtml ?? "")) actions.push(`set bodyHtml (${(product.bodyHtml ?? "").length} chars)`);
  if (product.productType !== (remote.productType ?? "")) actions.push(`set productType: "${remote.productType ?? ""}" -> "${product.productType ?? ""}"`);
  if (product.vendor !== (remote.vendor ?? "")) actions.push(`set vendor: "${remote.vendor ?? ""}" -> "${product.vendor ?? ""}"`);

  const remoteVariants = new Map(remote.variants.map(v => [v.sku, v]));
  for (const variant of product.variants) {
    const rv = remoteVariants.get(variant.sku);
    if (!rv) {
      actions.push(`add variant ${variant.sku}`);
    } else {
      if (variant.price !== rv.price) actions.push(`update variant ${variant.sku} price: ${rv.price} -> ${variant.price}`);
      if (variant.inventoryPolicy !== (rv.inventory_policy ?? "CONTINUE")) actions.push(`update variant ${variant.sku} inventoryPolicy: ${rv.inventory_policy ?? "CONTINUE"} -> ${variant.inventoryPolicy ?? "CONTINUE"}`);
      if (normalizeVariant(variant) !== normalizeRemoteVariant(rv)) actions.push(`update variant ${variant.sku}`);
    }
  }

  return { product, remote, actions };
}

export async function applyProduct(
  client: AdminClient,
  product: CatalogProduct,
  remote: ShopifyProduct | null,
): Promise<string> {
  const mutation = remote
    ? `
      mutation updateProduct($input: ProductInput!) {
        productUpdate(input: $input) { product { id } userErrors { field message } } }
    `
    : `
      mutation createProduct($input: ProductInput!) {
        productCreate(input: $input) { product { id } userErrors { field message } } }
    `;

  const input: Record<string, unknown> = {
    title: product.title,
    handle: product.handle,
    status: product.status,
    productType: product.productType,
    vendor: product.vendor,
    tags: product.tags ?? [],
    descriptionHtml: product.bodyHtml ?? "",
    variants: product.variants.map(v => ({
      sku: v.sku,
      price: v.price,
      option1: v.option1,
      inventoryManagement: v.inventoryManagement ?? "SHOPIFY",
      inventoryPolicy: v.inventoryPolicy ?? "CONTINUE",
    })),
  };

  if (remote) input.id = remote.id;

  const data = await shopifyAdminFetch(client, mutation, { input }) as {
    productCreate?: { product: { id: string }; userErrors: { field: string; message: string }[] };
    productUpdate?: { product: { id: string }; userErrors: { field: string; message: string }[] };
  };

  const result = data.productCreate ?? data.productUpdate;
  if (!result) throw new Error("No response from product mutation");
  if (result.userErrors?.length) {
    throw new Error(`Shopify user errors: ${result.userErrors.map(e => `${e.field}: ${e.message}`).join(", ")}`);
  }

  return result.product.id;
}
