import type { CatalogProduct, ProductDiff, ShopifyProduct, ShopifyVariant } from "./schema.js";

function getShopifyAdminClient() {
  const domain = process.env.SHOPIFY_STOREFRONT_DOMAIN ?? "stitch-and-ash.myshopify.com";
  const token = process.env.SHOPIFY_ADMIN_TOKEN;
  if (!token) throw new Error("SHOPIFY_ADMIN_TOKEN is not set in the environment");

  return { domain, token };
}

export function createShopifyAdminClient() {
  return getShopifyAdminClient();
}

async function shopifyAdminFetch(client: ReturnType<typeof getShopifyAdminClient>, query: string, variables?: Record<string, unknown>) {
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

export async function getProductByHandle(client: ReturnType<typeof getShopifyAdminClient>, handle: string): Promise<ShopifyProduct | null> {
  const query = `
    query getProductByHandle($handle: String!) {
      product(handle: $handle) {
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
            option1
            option2
            option3
            inventoryManagement
            inventoryPolicy
            inventoryQuantity
          }}
        }
      }
    }
  `;

  const data = await shopifyAdminFetch(client, query, { handle }) as {
    product: {
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
    } | null;
  };

  if (!data.product) return null;

  return {
    id: data.product.id,
    title: data.product.title,
    handle: data.product.handle,
    status: data.product.status,
    productType: data.product.productType,
    vendor: data.product.vendor,
    tags: data.product.tags,
    bodyHtml: data.product.descriptionHtml,
    options: data.product.options,
    variants: data.product.variants.edges.map(e => e.node),
  };
}

function normalizeVariant(v: CatalogProduct["variants"][0]): string {
  return JSON.stringify({ sku: v.sku, price: v.price, option1: v.option1 ?? null, inventoryPolicy: v.inventoryPolicy ?? "CONTINUE" });
}

function normalizeRemoteVariant(v: ShopifyVariant): string {
  return JSON.stringify({ sku: v.sku, price: v.price, option1: v.option1 ?? null, inventoryPolicy: v.inventory_policy ?? "CONTINUE" });
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
  client: ReturnType<typeof getShopifyAdminClient>,
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
