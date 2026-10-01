import type {
  CatalogCollection,
  CatalogProduct,
  CollectionDiff,
  ProductDiff,
  ShopifyCollection,
  ShopifyProduct,
  ShopifyShippingProfile,
  ShopifyShippingZone,
  ShopifyVariant,
  DeliveryMethodCondition,
} from "./schema.js";

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

/**
 * Resolve a remote variant's option values by the product's DECLARED option
 * order, not by a hardcoded option name.
 *
 * STI-432: this used to read `byName["Option1"] ?? byName["Title"]`, which
 * only ever matched Shopify's default "Title" option. A product with a named
 * option (`Size`) resolved every slot to `null`, so `"S" !== null` and the
 * diff reported a change for every variant of an already-correct product —
 * five phantom actions on a live store. The declared order comes from the
 * remote product's own `options` list, so renaming an option in the catalog
 * YAML needs no code change.
 */
function normalizeRemoteVariant(v: ShopifyVariant, optionNames: string[]): string {
  const byName = new Map(v.selectedOptions.map(o => [o.name, o.value]));
  const slot = (index: number): string | null => {
    const name = optionNames[index];
    // A slot with no declared option is null even when the payload carries a
    // value there. An undeclared option is real drift, and diffProduct reports
    // it explicitly as an option-shape change rather than hiding it.
    if (!name) return null;
    return byName.get(name) ?? null;
  };

  return JSON.stringify({
    sku: v.sku,
    price: v.price,
    option1: slot(0),
    option2: slot(1),
    option3: slot(2),
    inventoryPolicy: v.inventoryPolicy ?? "CONTINUE",
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

  // applyProduct always sends `tags`, so tags are in scope for the plan/apply
  // gate. A tag that is missing on either side is real drift: apply would
  // overwrite store-side tags nobody declared, and storefront filtering reads
  // these. Compared as a set because Shopify returns them in its own order.
  const catalogTags = [...(product.tags ?? [])].sort();
  const remoteTags = [...remote.tags].sort();
  if (catalogTags.join(",") !== remoteTags.join(",")) {
    actions.push(`set tags: [${remoteTags.join(",") || "(none)"}] -> [${catalogTags.join(",") || "(none)"}]`);
  }

  // STI-432: option values are compared positionally, so the two sides must
  // agree on the declared option order. Surface a mismatch explicitly instead
  // of letting the positional compare silently mis-attribute every variant.
  const remoteOptionNames = remote.options.map(o => o.name);
  const catalogOptionNames = (product.options ?? []).map(o => o.name);
  if (remoteOptionNames.join(" ") !== catalogOptionNames.join(" ")) {
    actions.push(
      `set options: [${remoteOptionNames.join(", ") || "(none)"}] -> [${catalogOptionNames.join(", ") || "(none)"}]`,
    );
  }

  const remoteVariants = new Map(remote.variants.map(v => [v.sku, v]));
  for (const variant of product.variants) {
    const rv = remoteVariants.get(variant.sku);
    if (!rv) {
      actions.push(`add variant ${variant.sku}`);
      continue;
    }

    const before = actions.length;
    if (variant.price !== rv.price) actions.push(`update variant ${variant.sku} price: ${rv.price} -> ${variant.price}`);
    if ((variant.inventoryPolicy ?? "CONTINUE") !== (rv.inventoryPolicy ?? "CONTINUE")) {
      actions.push(
        `update variant ${variant.sku} inventoryPolicy: ${rv.inventoryPolicy ?? "CONTINUE"} -> ${variant.inventoryPolicy ?? "CONTINUE"}`,
      );
    }

    // Catch-all for any field not covered above. It is labelled with the
    // normalized values so an approver can see WHY it fired instead of
    // getting a bare, unverifiable "update variant <sku>".
    if (actions.length === before && normalizeVariant(variant) !== normalizeRemoteVariant(rv, remoteOptionNames)) {
      actions.push(
        `update variant ${variant.sku} (normalized mismatch: ${normalizeVariant(variant)} vs ${normalizeRemoteVariant(rv, remoteOptionNames)})`,
      );
    }
  }

  return { product, remote, actions };
}

/**
 * Build the `ProductInput` payload for productCreate / productUpdate.
 *
 * Exported so the tests can assert on the exact mutation body without a live
 * store. Anything `ProductInput` cannot carry MUST stay out of this object —
 * see `inventoryQuantity` below, which is a schema field but not a ProductInput
 * field.
 */
export function buildProductInput(product: CatalogProduct, remote: ShopifyProduct | null): Record<string, unknown> {
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
  return input;
}

/**
 * STI-532: refuse, loudly, a catalog that declares stock it cannot apply.
 *
 * `ProductVariantSchema` declares `inventoryQuantity`, so a YAML author can
 * write `inventoryQuantity: 24` and `catalog:validate` will pass it. But
 * `ProductInput` has no inventory field — stock is written through
 * `inventoryAdjustQuantities` against an `inventoryItemId`, which this
 * reconciler does not resolve. Before this guard the value was accepted,
 * validated, and then silently discarded by `buildProductInput`.
 *
 * That is the STI-421 shape one layer down: the dangerous part was not the
 * missing value, it was that everything reported success. An operator could
 * approve a catalog:apply believing the diff set stock, and the store would
 * keep selling from whatever it already had — while all three live products
 * sit at zero or below it. A loud refusal is strictly safer than a silent drop,
 * so this throws BEFORE any mutation is sent: a partial write is worse than a
 * stopped run.
 */
function assertNoDeclaredInventoryQuantity(product: CatalogProduct): void {
  const declared = product.variants
    .filter(v => v.inventoryQuantity !== undefined)
    .map(v => `${v.sku}=${v.inventoryQuantity}`);
  if (declared.length === 0) return;

  throw new Error(
    `Refusing to apply ${product.id}: catalog declares inventoryQuantity for ${declared.join(", ")}, ` +
      `but catalog:apply cannot write inventory (ProductInput has no inventory field; it requires ` +
      `inventoryAdjustQuantities against an inventoryItemId). Remove the declared quantities, or ` +
      `restock the store by hand and keep the catalog stock-free so the diff stays honest.`,
  );
}

export async function applyProduct(
  client: AdminClient,
  product: CatalogProduct,
  remote: ShopifyProduct | null,
): Promise<string> {
  assertNoDeclaredInventoryQuantity(product);

  const mutation = remote
    ? `
      mutation updateProduct($input: ProductInput!) {
        productUpdate(input: $input) { product { id } userErrors { field message } } }
    `
    : `
      mutation createProduct($input: ProductInput!) {
        productCreate(input: $input) { product { id } userErrors { field message } } }
    `;

  const input = buildProductInput(product, remote);

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

/**
 * STI-471: collection read/diff/apply.
 *
 * Collections were previously invisible to the reconciler, so an empty
 * `featured` collection on a live store produced a plan of "0 pending product
 * actions" — the same false-green class as the tags blind spot (PR #65), one
 * level up. The storefront queries collection(handle:...) and renders whatever
 * the collection contains, so membership IS storefront state and belongs in
 * the plan/apply approval gate.
 */
export async function getCollectionByHandle(client: AdminClient, handle: string): Promise<ShopifyCollection | null> {
  // The Admin API's `collection` root field takes an `id`, not a `handle`
  // (unlike the Storefront API), so membership is read via the searchable
  // `collections(query:)` connection instead.
  const query = `
    query getCollectionByHandle($query: String!) {
      collections(first: 1, query: $query) {
        nodes {
          id
          title
          handle
          products(first: 100) { nodes { handle } }
        }
      }
    }
  `;

  const data = await shopifyAdminFetch(client, query, { query: `handle:${handle}` }) as {
    collections: {
      nodes: { id: string; title: string; handle: string; products: { nodes: { handle: string }[] } }[];
    };
  };

  const node = data.collections.nodes[0];
  if (!node || node.handle !== handle) return null;

  return {
    id: node.id,
    title: node.title,
    handle: node.handle,
    // Sorted because Shopify returns collection membership in curator order and
    // a positional compare would report drift on every manual reorder.
    productHandles: node.products.nodes.map(p => p.handle).sort(),
  };
}

export function diffCollection(collection: CatalogCollection, remote: ShopifyCollection | null): CollectionDiff {
  const actions: string[] = [];

  if (!remote) {
    actions.push(`create collection ${collection.id} (${collection.handle})`);
    for (const handle of collection.products) actions.push(`  add ${handle} to ${collection.handle}`);
    return { collection, remote: null, actions };
  }

  if (collection.title !== remote.title) actions.push(`set title: "${remote.title}" -> "${collection.title}"`);

  const wanted = [...collection.products].sort();
  const have = remote.productHandles;

  // Symmetric set difference, reported as explicit add/remove lines so an
  // approver sees exactly which SKUs move in each direction. Never a blind
  // overwrite of the whole list: a collection emptied by an over-broad write is
  // exactly the failure this issue is about.
  const toAdd = wanted.filter(h => !have.includes(h));
  const toRemove = have.filter(h => !wanted.includes(h));
  for (const handle of toRemove) actions.push(`remove ${handle} from ${collection.handle}`);
  for (const handle of toAdd) actions.push(`add ${handle} to ${collection.handle}`);

  return { collection, remote, actions };
}

export async function applyCollection(
  client: AdminClient,
  collection: CatalogCollection,
  remote: ShopifyCollection | null,
  productIdsByHandle: Map<string, string>,
): Promise<string> {
  const resolve = (handle: string): string => {
    const id = productIdsByHandle.get(handle);
    if (!id) throw new Error(`Collection ${collection.id} references unknown product handle "${handle}"`);
    return id;
  };

  const wantedIds = collection.products.map(resolve);
  const mutation = remote
    ? `
      mutation updateCollection($input: CollectionInput!) {
        collectionUpdate(input: $input) { collection { id } userErrors { field message } }
      }
    `
    : `
      mutation createCollection($input: CollectionInput!) {
        collectionCreate(input: $input) { collection { id } userErrors { field message } }
      }
    `;

  const input: Record<string, unknown> = {
    title: collection.title,
    handle: collection.handle,
  };
  if (remote) input.id = remote.id;
  else input.products = wantedIds;

  if (remote) {
    // Only send membership when the plan found a difference, so a no-op apply
    // cannot reorder or drop curator-positioned items.
    const have = new Set(remote.productHandles);
    const haveIds = remote.productHandles.map(h => productIdsByHandle.get(h)).filter((v): v is string => Boolean(v));
    const changed =
      wantedIds.length !== have.size || wantedIds.some(id => !haveIds.includes(id));
    if (changed) input.products = wantedIds;
  }

  const data = await shopifyAdminFetch(client, mutation, { input }) as {
    collectionCreate?: { collection: { id: string } | null; userErrors: { field: string; message: string }[] };
    collectionUpdate?: { collection: { id: string } | null; userErrors: { field: string; message: string }[] };
  };

  const result = data.collectionCreate ?? data.collectionUpdate;
  if (!result) throw new Error("No response from collection mutation");
  if (result.userErrors?.length) {
    throw new Error(`Shopify user errors: ${result.userErrors.map(e => `${e.field}: ${e.message}`).join(", ")}`);
  }
  if (!result.collection) throw new Error("Shopify collection mutation returned no collection");

  return result.collection.id;
}

/**
 * STI-507: read the store's live delivery profile.
 *
 * Field shapes here were discovered from the 2026-04 schema rather than
 * assumed, because the obvious guess is wrong in four separate ways:
 * `DeliveryProfile` has no `active` field, `profileItems` is a connection
 * rather than a list, `DeliveryCountryCodeOrRestOfWorld` has no scalar `code`,
 * and the fixed fee lives on the `DeliveryRateProvider` union under the
 * `DeliveryParticipant` member (selections cannot be made directly on the
 * union). A wrong guess here returns HTTP 200 with a GraphQL `errors` payload
 * — which is exactly the silent-failure shape that STI-484 fixed for orders.
 *
 * A rate with no fixed fee (rate-derived or carrier-calculated) is reported as
 * `price: null`. It is deliberately NOT reported as "0.00".
 */
export const DELIVERY_PROFILE_QUERY = `
  query getDeliveryProfiles {
    deliveryProfiles(first: 10) {
      nodes {
        id
        name
        default
        profileItems(first: 50) { nodes { product { handle } } }
        profileLocationGroups {
          locationGroup { id }
          locationGroupZones(first: 50) {
            nodes {
              zone {
                name
                countries { code { countryCode restOfWorld } }
              }
              methodDefinitions(first: 20) {
                nodes {
                  id
                  name
                  active
                  rateProvider {
                    __typename
                    ... on DeliveryParticipant {
                      fixedFee { amount currencyCode }
                      percentageOfRateFee
                    }
                    ... on DeliveryRateDefinition {
                      price { amount currencyCode }
                    }
                  }
                  methodConditions {
                    id
                    field
                    operator
                    conditionCriteria {
                      __typename
                      ... on MoneyV2 { amount currencyCode }
                      ... on Weight { value unit }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`;

/**
 * STI-597: reduce a method's `methodConditions` to the shape the reconciler
 * reasons about.
 *
 * The criteria is a union — `MoneyV2` for a price condition, `Weight` for a
 * weight one — so the two members are read off whichever `__typename` came
 * back rather than assuming money. Reading `amount` off a weight condition
 * would yield `undefined` and quietly drop the condition, which is the one
 * thing that must not be lost: without it a rate range is indistinguishable
 * from a duplicate service name.
 *
 * A row with no conditions returns `[]`, never undefined, so "unconditioned" is
 * a value the caller can test rather than an absence it has to guard.
 */
function normalizeMethodConditions(
  conditions:
    | { id?: string | null; field?: string | null; operator?: string | null; conditionCriteria?: { __typename?: string | null; amount?: string | null; currencyCode?: string | null; value?: number | null; unit?: string | null } | null }[]
    | null
    | undefined,
): DeliveryMethodCondition[] {
  if (!conditions || conditions.length === 0) return [];
  const out: DeliveryMethodCondition[] = [];
  for (const condition of conditions) {
    // A condition with no field cannot decide anything. Dropping it silently
    // would make the row look unconditioned, so it is kept with empty strings
    // and reported as unknown by the caller.
    if (!condition?.field) continue;
    const criteria = condition.conditionCriteria;
    out.push({
      field: condition.field,
      operator: condition.operator ?? "",
      amount: criteria?.amount ?? null,
      currency: criteria?.currencyCode ?? null,
      value: criteria?.value ?? null,
      unit: criteria?.unit ?? null,
    });
  }
  return out;
}

export async function getDeliveryProfiles(client: AdminClient): Promise<ShopifyShippingProfile[]> {  const data = await shopifyAdminFetch(client, DELIVERY_PROFILE_QUERY) as {
    deliveryProfiles: {
      nodes: {
        id: string;
        name: string;
        default: boolean;
        profileItems: { nodes: { product: { handle: string } }[] };
        profileLocationGroups: {
          locationGroup: { id: string };
          locationGroupZones: {
            nodes: {
              zone: { name: string; countries: { code: { countryCode: string | null; restOfWorld: boolean } }[] };
              methodDefinitions: {
                nodes: {
                  id: string;
                  name: string;
                  active: boolean;
                  rateProvider?: {
                    __typename?: string;
                    fixedFee?: { amount: string; currencyCode: string } | null;
                    price?: { amount: string; currencyCode: string } | null;
                  } | null;
                  /**
                   * STI-597: the rate conditions on this row. Required to tell
                   * a free-shipping threshold apart from two services that
                   * happen to share a name. Absent from the response for an
                   * unconditioned row, which is the ordinary case.
                   */
                  methodConditions?: {
                    id?: string | null;
                    field?: string | null;
                    operator?: string | null;
                    conditionCriteria?: {
                      __typename?: string | null;
                      amount?: string | null;
                      currencyCode?: string | null;
                      value?: number | null;
                      unit?: string | null;
                    } | null;
                  }[] | null;
                }[];
              };
            }[];
          };
        }[];
      }[];
    };
  };

  return data.deliveryProfiles.nodes.map(node => {
    const zones: ShopifyShippingZone[] = [];
    for (const group of node.profileLocationGroups) {
      for (const zoneNode of group.locationGroupZones.nodes) {
        const countryCodes: string[] = [];
        let restOfWorld = false;
        for (const country of zoneNode.zone.countries) {
          if (country.code.countryCode) countryCodes.push(country.code.countryCode);
          if (country.code.restOfWorld) restOfWorld = true;
        }
        zones.push({
          name: zoneNode.zone.name,
          countryCodes,
          restOfWorld,
          methods: zoneNode.methodDefinitions.nodes.map(method => {
            // `fixedFee` is NOT a price on its own. It means "a flat price"
            // only on DeliveryRateDefinition (where the real amount is in
            // `price`); on DeliveryParticipant it is the operator's surcharge
            // ON TOP of a carrier-calculated rate the Admin API never returns.
            // Reading the surcharge as the price reported "0.0 USD" for both
            // live international services, i.e. free international shipping
            // that the store does not charge. So the total price is only ever
            // read from the shape that actually carries it.
            //
            // The rate conditions are attached here (STI-597) and are what make
            // a rate range readable as a rate range. They apply to the row
            // whatever shape carries its rate, so they are computed once and
            // spread onto each branch rather than repeated.
            const conditions = normalizeMethodConditions(method.methodConditions);
            const rp = method.rateProvider;
            if (rp?.__typename === "DeliveryRateDefinition" && rp.price) {
              return {
                id: method.id,
                name: method.name,
                active: method.active,
                price: rp.price.amount,
                currency: rp.price.currencyCode,
                rateKind: "fixed_rate" as const,
                conditions,
              };
            }
            if (rp?.__typename === "DeliveryParticipant") {
              return {
                id: method.id,
                name: method.name,
                active: method.active,
                // Not derivable from the API: fixedFee + percentageOfRateFee
                // applied to a live carrier quote, computed at checkout.
                price: null,
                currency: null,
                rateKind: "carrier_calculated" as const,
                carrierSurcharge: rp.fixedFee?.amount ?? null,
                conditions,
              };
            }
            return {
              id: method.id,
              name: method.name,
              active: method.active,
              // A derived/carrier-calculated rate has no fixedFee. Reporting
              // null keeps "unknown" distinguishable from "free".
              price: null,
              currency: null,
              conditions,
            };
          }),
        });
      }
    }

    return {
      profileName: node.name,
      isDefault: node.default,
      productHandles: node.profileItems.nodes.map(item => item.product.handle).sort(),
      zones,
    };
  });
}
