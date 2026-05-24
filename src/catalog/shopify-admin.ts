import { createAdminApiClient } from "@shopify/admin-api-client";
import type { CatalogProduct } from "./schema.ts";

export const CATALOG_ID_NAMESPACE = "stitch_ash";
export const CATALOG_ID_KEY = "catalog_id";

export interface ShopifyProductSummary {
  id: string;
  handle: string;
  title: string;
  status: string;
  productType: string;
  vendor: string;
  tags: string[];
  catalogId?: string;
  variants: Array<{
    id: string;
    sku: string | null;
    price: string;
    title: string;
  }>;
}

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable ${name}`);
  return value;
}

export function createShopifyAdminClient() {
  const storeDomain = requiredEnv("SHOPIFY_ADMIN_STORE_DOMAIN");
  const accessToken = requiredEnv("SHOPIFY_ADMIN_ACCESS_TOKEN");
  return createAdminApiClient({
    storeDomain,
    apiVersion: "2025-01",
    accessToken,
  });
}

const PRODUCT_BY_HANDLE_QUERY = `#graphql
  query ProductByHandle($handle: String!) {
    productByHandle(handle: $handle) {
      id
      handle
      title
      status
      productType
      vendor
      tags
      catalogId: metafield(namespace: "${CATALOG_ID_NAMESPACE}", key: "${CATALOG_ID_KEY}") { value }
      variants(first: 100) {
        nodes {
          id
          sku
          price
          title
        }
      }
    }
  }
`;

export async function getProductByHandle(client: ReturnType<typeof createShopifyAdminClient>, handle: string): Promise<ShopifyProductSummary | null> {
  const response = await client.request(PRODUCT_BY_HANDLE_QUERY, { variables: { handle } });
  if (response.errors) throw new Error(`Shopify query failed: ${JSON.stringify(response.errors)}`);
  const product = response.data?.productByHandle;
  if (!product) return null;

  return {
    id: product.id,
    handle: product.handle,
    title: product.title,
    status: product.status,
    productType: product.productType,
    vendor: product.vendor,
    tags: product.tags ?? [],
    catalogId: product.catalogId?.value,
    variants: product.variants.nodes.map((variant: any) => ({
      id: variant.id,
      sku: variant.sku,
      price: variant.price,
      title: variant.title,
    })),
  };
}

export interface ProductDiff {
  product: CatalogProduct;
  remote: ShopifyProductSummary | null;
  actions: string[];
}

export function diffProduct(product: CatalogProduct, remote: ShopifyProductSummary | null): ProductDiff {
  const actions: string[] = [];

  if (!remote) {
    actions.push("create product");
    return { product, remote, actions };
  }

  if (remote.catalogId && remote.catalogId !== product.id) actions.push(`catalog id mismatch remote=${remote.catalogId}`);
  if (!remote.catalogId) actions.push("set catalog identity metafield");
  if (remote.title !== product.title) actions.push(`update title ${JSON.stringify(remote.title)} -> ${JSON.stringify(product.title)}`);
  if (remote.handle !== product.handle) actions.push(`update handle ${remote.handle} -> ${product.handle}`);
  if (remote.status !== product.status) actions.push(`update status ${remote.status} -> ${product.status}`);
  if (remote.productType !== product.productType) actions.push(`update productType ${JSON.stringify(remote.productType)} -> ${JSON.stringify(product.productType)}`);
  if (remote.vendor !== product.vendor) actions.push(`update vendor ${JSON.stringify(remote.vendor)} -> ${JSON.stringify(product.vendor)}`);

  const remoteTags = [...remote.tags].sort().join(",");
  const desiredTags = [...product.tags].sort().join(",");
  if (remoteTags !== desiredTags) actions.push(`update tags ${JSON.stringify(remote.tags)} -> ${JSON.stringify(product.tags)}`);

  const remoteBySku = new Map(remote.variants.filter(v => v.sku).map(v => [v.sku as string, v]));
  for (const variant of product.variants) {
    const current = remoteBySku.get(variant.sku);
    if (!current) {
      actions.push(`create variant ${variant.sku}`);
      continue;
    }
    if (Number(current.price).toFixed(2) !== variant.price) actions.push(`update variant ${variant.sku} price ${current.price} -> ${variant.price}`);
  }

  for (const current of remote.variants) {
    if (current.sku && !product.variants.some(v => v.sku === current.sku)) {
      actions.push(`remote variant ${current.sku} is unmanaged`);
    }
  }

  return { product, remote, actions };
}

const PRODUCT_CREATE_MUTATION = `#graphql
  mutation ProductCreate($input: ProductInput!) {
    productCreate(input: $input) {
      product { id handle title }
      userErrors { field message }
    }
  }
`;

const PRODUCT_UPDATE_MUTATION = `#graphql
  mutation ProductUpdate($input: ProductInput!) {
    productUpdate(input: $input) {
      product { id handle title }
      userErrors { field message }
    }
  }
`;

const METAFIELDS_SET_MUTATION = `#graphql
  mutation MetafieldsSet($metafields: [MetafieldsSetInput!]!) {
    metafieldsSet(metafields: $metafields) {
      metafields { id namespace key value }
      userErrors { field message }
    }
  }
`;

function productInput(product: CatalogProduct, id?: string) {
  return {
    ...(id ? { id } : {}),
    title: product.title,
    handle: product.handle,
    descriptionHtml: product.bodyHtml,
    productType: product.productType,
    vendor: product.vendor,
    status: product.status,
    tags: product.tags,
  };
}

function assertNoUserErrors(operation: string, payload: any) {
  const errors = payload?.userErrors ?? [];
  if (errors.length > 0) {
    throw new Error(`${operation} failed: ${errors.map((e: any) => `${e.field?.join(".")}: ${e.message}`).join("; ")}`);
  }
}

export async function applyProduct(client: ReturnType<typeof createShopifyAdminClient>, product: CatalogProduct, remote: ShopifyProductSummary | null) {
  const mutation = remote ? PRODUCT_UPDATE_MUTATION : PRODUCT_CREATE_MUTATION;
  const variables = { input: productInput(product, remote?.id) };
  const response = await client.request(mutation, { variables });
  if (response.errors) throw new Error(`Shopify mutation failed: ${JSON.stringify(response.errors)}`);
  const result = remote ? response.data?.productUpdate : response.data?.productCreate;
  assertNoUserErrors(remote ? "productUpdate" : "productCreate", result);

  const productId = result.product.id;
  const metafieldsResponse = await client.request(METAFIELDS_SET_MUTATION, {
    variables: {
      metafields: [{
        ownerId: productId,
        namespace: CATALOG_ID_NAMESPACE,
        key: CATALOG_ID_KEY,
        type: "single_line_text_field",
        value: product.id,
      }],
    },
  });
  if (metafieldsResponse.errors) throw new Error(`Shopify metafieldsSet failed: ${JSON.stringify(metafieldsResponse.errors)}`);
  assertNoUserErrors("metafieldsSet", metafieldsResponse.data?.metafieldsSet);

  return productId;
}
