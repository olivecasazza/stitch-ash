import { readFile, stat } from "node:fs/promises";
import { basename, extname } from "node:path";
import { buildAdminClient, type AdminClient } from "./shopify-admin.js";

/**
 * STI-632: product media upload.
 *
 * There is no `catalog:image` before this file, so nothing in the repo could put
 * a photo on a product. That is the whole reason sku-001/002/003 render an
 * empty image frame on the live storefront while `featuredImage` is null: the
 * Admin step was unowned, not unfinished.
 *
 * The live 2026-04 schema is NOT what the older examples in Shopify's docs
 * show, and both differences are load-bearing — each one is a silent
 * HTTP-200-with-errors shape rather than a transport failure:
 *
 *   1. There is no `productCreateMedia` mutation. Introspected this run, the
 *      media-ish mutations on Mutation are: deliveryProfile*, file*,
 *      productReorderMedia, productVariant*Media, stagedUploadsCreate,
 *      themeFiles*. Media creation rides on
 *      `productUpdate(product: ProductUpdateInput, media: [CreateMediaInput!])`.
 *      Asking for `productCreateMedia` returns HTTP 200 with
 *      "Field 'productCreateMedia' doesn't exist on type 'Mutation'".
 *
 *   2. `Media` has no `image` field and no `previewImage` field. Its fields are
 *      alt, id, mediaContentType, mediaErrors, mediaWarnings, preview, status
 *      — where `preview: MediaPreviewImage` carries `.image`. Reading
 *      `image { url }` off Media is the same mistake as STI-484's
 *      `order(name:)`: a query the live schema rejects while still returning
 *      HTTP 200, so a naive caller reads "no images" and calls it empty.
 *
 * Everything here is therefore validated against the live schema shape, and
 * the plan is computed from bytes on disk + the remote media list, never from
 * an assumption that the caller passed real images.
 */

/** One image the operator has actually put on disk. */
export type MediaCandidate = {
  /** Repo-relative or absolute path to the image file. */
  path: string;
  /** Handle of the product to attach to, e.g. `sku-001`. */
  handle: string;
  /**
   * Which image this is. The spec (STI-630 `photo-spec`) calls for exactly one
   * primary and one hover per SKU. The primary is the one promoted to
   * `featuredMedia`, which is the exact field ProductGrid.vue binds.
   */
  role: "primary" | "hover";
  alt: string;
  /** Defaults to a basename derived from path. */
  filename?: string;
};

/** What the store currently has, read from the live media connection. */
export type RemoteMedia = {
  id: string;
  status: string;
  mediaContentType: string;
  alt: string | null;
  previewUrl: string | null;
  width: number | null;
  height: number | null;
};

/**
 * Read the live media list for a product.
 *
 * `product(id:)` is the only addressable form; there is no `product(handle:)`
 * (see the note above). The caller resolves the handle to an id first.
 */
export const PRODUCT_MEDIA_QUERY = `
  query productMedia($id: ID!) {
    product(id: $id) {
      id
      handle
      featuredMedia { id }
      media(first: 50) {
        edges {
          node {
            id
            status
            mediaContentType
            alt
            preview { image { url width height } }
          }
        }
      }
    }
  }
`;

export async function getProductMedia(client: AdminClient, productId: string): Promise<{
  featuredMediaId: string | null;
  media: RemoteMedia[];
}> {
  const data = await adminFetch(client, PRODUCT_MEDIA_QUERY, { id: productId }) as {
    product: {
      id: string;
      handle: string;
      featuredMedia: { id: string } | null;
      media: {
        edges: {
          node: {
            id: string;
            status: string;
            mediaContentType: string;
            alt: string | null;
            preview: { image: { url: string; width: number; height: number } | null } | null;
          };
        }[];
      };
    } | null;
  };

  if (!data?.product) {
    throw new Error(
      `No product returned for id ${productId}. The id is stale or the handle matched nothing on the store.`,
    );
  }

  return {
    featuredMediaId: data.product.featuredMedia?.id ?? null,
    media: data.product.media.edges.map(edge => {
      const image = edge.node.preview?.image ?? null;
      return {
        id: edge.node.id,
        status: edge.node.status,
        mediaContentType: edge.node.mediaContentType,
        alt: edge.node.alt,
        previewUrl: image?.url ?? null,
        width: image?.width ?? null,
        height: image?.height ?? null,
      };
    }),
  };
}

/**
 * STI-630 `photo-spec` §2, enforced in code rather than trusted.
 *
 * These are the acceptance numbers a reviewer would otherwise check by eye
 * after the fact, at which point a wrong image is already live. Anything that
 * fails here is reported, never silently uploaded and never silently dropped.
 */
export const PHOTO_SPEC = {
  minWidth: 1200,
  minHeight: 1500,
  maxBytes: 2 * 1024 * 1024,
  allowedExtensions: [".jpg", ".jpeg", ".png"],
};

type ImageFacts = { bytes: number; width: number | null; height: number | null };

/**
 * Read PNG/JPEG dimensions straight from the file header.
 *
 * A width/height check that needs an image library would make the photo upload
 * depend on a native dep the rest of this repo does not have; the header parse
 * is ~30 lines and covers the two formats the spec allows.
 */
export async function readImageFacts(path: string): Promise<ImageFacts> {
  const handle = await readFile(path);

  if (handle.length < 24) {
    throw new Error(`Refusing ${basename(path)}: file is too small to be a ${PHOTO_SPEC.allowedExtensions.join("/")} image (${handle.length} bytes)`);
  }

  // PNG: 8-byte signature, then an IHDR chunk whose width/height are uint32 BE.
  const isPng = handle.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (isPng) {
    return { bytes: handle.length, width: handle.readUInt32BE(16), height: handle.readUInt32BE(20) };
  }

  // JPEG: walk the segment markers to the SOFn frame header, which carries the
  // real dimensions. SOF0/1/2 are baseline/extended/progressive; 3..15 are
  // excluded because they are not frame headers (DHT/DQT/JDAPP etc).
  const isJpeg = handle[0] === 0xff && handle[1] === 0xd8;
  if (isJpeg) {
    let offset = 2;
    while (offset + 9 < handle.length) {
      if (handle[offset] !== 0xff) {
        offset += 1;
        continue;
      }
      const marker = handle[offset + 1];
      // Standalone markers carry no length field.
      if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
        offset += 2;
        continue;
      }
      const length = handle.readUInt16BE(offset + 2);
      const isSofn = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
      if (isSofn) {
        return { bytes: handle.length, height: handle.readUInt16BE(offset + 5), width: handle.readUInt16BE(offset + 7) };
      }
      offset += 2 + length;
    }
    throw new Error(`Refusing ${basename(path)}: JPEG has no SOFn frame header, so its dimensions cannot be read`);
  }

  throw new Error(
    `Refusing ${basename(path)}: unsupported image format. The spec allows ` +
      `${PHOTO_SPEC.allowedExtensions.join(", ")} only — generated SVG/wireframe stand-ins are the exact ` +
      `defect this upload path exists to close.`,
  );
}

/** Validate one candidate against the spec. Returns human-readable failures. */
export async function validateCandidate(candidate: MediaCandidate): Promise<string[]> {
  const errors: string[] = [];
  const name = candidate.filename ?? basename(candidate.path);

  const ext = extname(name).toLowerCase();
  if (!PHOTO_SPEC.allowedExtensions.includes(ext)) {
    errors.push(`${candidate.handle}/${name}: extension ${ext || "(none)"} is not one of ${PHOTO_SPEC.allowedExtensions.join(", ")}`);
    return errors;
  }

  let facts: ImageFacts;
  try {
    facts = await readImageFacts(candidate.path);
  } catch (error) {
    errors.push(`${candidate.handle}/${name}: ${error instanceof Error ? error.message : String(error)}`);
    return errors;
  }

  if (facts.bytes >= PHOTO_SPEC.maxBytes) {
    errors.push(`${candidate.handle}/${name}: ${(facts.bytes / 1024 / 1024).toFixed(2)} MB exceeds the ${PHOTO_SPEC.maxBytes / 1024 / 1024} MB limit`);
  }
  if (facts.width === null || facts.height === null || facts.width < PHOTO_SPEC.minWidth || facts.height < PHOTO_SPEC.minHeight) {
    errors.push(`${candidate.handle}/${name}: ${facts.width}x${facts.height} is below the required ${PHOTO_SPEC.minWidth}x${PHOTO_SPEC.minHeight}`);
  }
  if (!candidate.alt.trim()) {
    errors.push(`${candidate.handle}/${name}: alt text is required (STI-630 photo-spec supplies it per image)`);
  }

  return errors;
}

/** Group candidates by handle so a plan reads per-SKU, like catalog:plan. */
export function groupByHandle(candidates: MediaCandidate[]): Map<string, MediaCandidate[]> {
  const grouped = new Map<string, MediaCandidate[]>();
  for (const candidate of candidates) {
    const list = grouped.get(candidate.handle) ?? [];
    list.push(candidate);
    grouped.set(candidate.handle, list);
  }
  return grouped;
}

/**
 * One planned action per product: attach N images, then promote the primary.
 *
 * Promotion is a separate productUpdate because `featuredMedia` is not part of
 * CreateMediaInput, and it must happen AFTER the media write — a featured id
 * that does not exist yet is rejected.
 */
export type MediaPlanEntry = {
  handle: string;
  productId: string | null;
  /** Actions that would run, e.g. `attach 2 images`, `promote sku-001-primary.jpg`. */
  actions: string[];
  /** Human-readable refusals. A non-empty list means this SKU will not be written. */
  errors: string[];
  /** True when the store already has the media AND the right featured image. */
  noop: boolean;
};

export async function planMedia(candidates: MediaCandidate[]): Promise<MediaPlanEntry[]> {
  const client = await buildAdminClient();
  const grouped = groupByHandle(candidates);
  const entries: MediaPlanEntry[] = [];

  for (const [handle, group] of grouped) {
    const entry: MediaPlanEntry = { handle, productId: null, actions: [], errors: [], noop: false };

    const remote = await getProductByHandleId(client, handle);
    if (!remote) {
      entry.errors.push(`${handle}: no product with this handle exists on the store, so there is nothing to attach media to`);
      entries.push(entry);
      continue;
    }
    entry.productId = remote.id;

    for (const candidate of group) {
      entry.errors.push(...(await validateCandidate(candidate)));
    }

    const primaries = group.filter(c => c.role === "primary");
    if (primaries.length === 0) entry.errors.push(`${handle}: no primary image declared; a product needs a featured image`);
    if (primaries.length > 1) {
      entry.errors.push(`${handle}: ${primaries.length} primary images declared (${primaries.map(p => basename(p.filename ?? p.path)).join(", ")}); exactly one may be featured`);
    }

    if (entry.errors.length === 0) {
      const existing = await getProductMedia(client, remote.id);
      const primary = primaries[0];
      const existingAlts = new Set(existing.media.map(m => m.alt));
      const newFiles = group.filter(c => !existingAlts.has(c.alt));

      if (newFiles.length === 0 && existing.featuredMediaId !== null) {
        entry.noop = true;
        entry.actions.push("no change: every declared image is already attached and the product has a featured image");
      } else {
        for (const candidate of newFiles) {
          entry.actions.push(`attach ${basename(candidate.filename ?? candidate.path)} as ${candidate.role}${candidate.role === "primary" ? " (will become featured)" : ""}`);
        }
        if (existing.featuredMediaId === null) {
          entry.actions.push(`promote the primary to featuredMedia`);
        } else {
          entry.actions.push("leave the existing featuredMedia in place (a promotion would replace a live image)");
        }
        if (newFiles.length === 0) {
          entry.actions.push("attach 0 images");
        }
      }
    }

    entries.push(entry);
  }

  return entries;
}

/** Human-readable plan, in the shape catalog:plan/tracking:plan print. */
export function renderMediaPlan(entries: MediaPlanEntry[]): string[] {
  const lines: string[] = [];
  for (const entry of entries) {
    lines.push(`${entry.handle}${entry.productId ? ` (${entry.productId})` : ""}:`);
    for (const action of entry.actions) lines.push(`  ${action}`);
    for (const error of entry.errors) lines.push(`  NOT READY: ${error}`);
    if (entry.noop) lines.push("  status: no change required");
  }
  return lines;
}

async function getProductByHandleId(client: AdminClient, handle: string): Promise<{ id: string } | null> {
  const query = `
    query findProductByHandle($query: String!) {
      products(first: 1, query: $query) {
        edges { node { id handle } }
      }
    }
  `;
  const data = await adminFetch(client, query, { query: `handle:${handle}` }) as {
    products: { edges: { node: { id: string; handle: string } }[] };
  };
  return data.products.edges[0]?.node ?? null;
}

/**
 * Introspected live 2026-04 this run. `stagedTargets` has `url`, `resourceUrl`
 * and `parameters` — there is NO `resource` field (asking for one is another
 * HTTP-200-with-errors shape), and `resourceUrl` is the opaque value
 * `CreateMediaInput.originalSource` wants, NOT the bucket `url`.
 */
const STAGED_UPLOADS_CREATE = `
  mutation stagedUploadsCreate($input: [StagedUploadInput!]!) {
    stagedUploadsCreate(input: $input) {
      stagedTargets {
        url
        resourceUrl
        parameters { name value }
      }
      userErrors { field message }
    }
  }
`;

const PRODUCT_UPDATE_MEDIA = `
  mutation attachProductMedia($product: ProductUpdateInput!, $media: [CreateMediaInput!]) {
    productUpdate(product: $product, media: $media) {
      product {
        id
        featuredMedia { id }
        media(first: 50) { edges { node { id status mediaContentType alt preview { image { url width height } } } } }
      }
      userErrors { field message }
    }
  }
`;

/**
 * Setting the featured image is NOT a field on any product input.
 *
 * Introspected live 2026-04: `ProductUpdateInput`, `ProductInput` and
 * `ProductSetInput` all lack `featuredMediaId`, and there is no
 * `productUpdateFeaturedMedia`-style mutation. The only supported route is
 * `productReorderMedia(id, moves: [MoveInput!]!)` — the featured image is
 * media at position 0. Sending `featuredMediaId` on productUpdate is another
 * silent HTTP-200-with-errors shape, which is how "the image uploaded but the
 * storefront still shows nothing" would have shipped.
 */
const PRODUCT_REORDER_MEDIA = `
  mutation reorderProductMedia($id: ID!, $moves: [MoveInput!]!) {
    productReorderMedia(id: $id, moves: $moves) {
      job { id }
      mediaUserErrors { field message }
    }
  }
`;

type StagedTarget = { url: string; resourceUrl: string; parameters: { name: string; value: string }[] };

/**
 * PUT the bytes at the signed URL.
 *
 * The target is a Google-Cloud signed POST policy: every `parameters` entry is
 * a required form field and the policy pins Content-Type, so the file goes up
 * as multipart form data with the Content-Type exactly as returned. Posting the
 * raw body instead fails with a signature mismatch that looks nothing like the
 * real cause.
 */
async function uploadBytes(candidate: MediaCandidate, target: StagedTarget): Promise<void> {
  const form = new FormData();
  for (const parameter of target.parameters) {
    form.append(parameter.name, parameter.value);
  }
  const bytes = await readFile(candidate.path);
  form.append("file", new Blob([new Uint8Array(bytes)], { type: mimeTypeFor(candidate) }), candidate.filename ?? basename(candidate.path));

  const response = await fetch(target.url, { method: "POST", body: form });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Staged upload of ${candidate.filename ?? basename(candidate.path)} failed: HTTP ${response.status} ${text}`,
    );
  }
}

function mimeTypeFor(candidate: MediaCandidate): string {
  const ext = extname(candidate.filename ?? candidate.path).toLowerCase();
  return ext === ".png" ? "image/png" : "image/jpeg";
}

/**
 * Attach images to one product and promote its primary.
 *
 * Ordering is not cosmetic. The media must exist before `featuredMediaId` can
 * point at it, so the promotion is a second call that reads the id back from
 * the media write rather than predicting it.
 */
export async function applyProductMedia(
  client: AdminClient,
  entry: { handle: string; productId: string },
  candidates: MediaCandidate[],
): Promise<{ attached: number; featuredMediaId: string | null }> {
  if (candidates.length === 0) return { attached: 0, featuredMediaId: null };

  for (const candidate of candidates) {
    const errors = await validateCandidate(candidate);
    if (errors.length) {
      throw new Error(`Refusing to apply ${entry.handle}: ${errors.join("; ")}`);
    }
  }

  const name = (candidate: MediaCandidate) => candidate.filename ?? basename(candidate.path);

  const sizes: string[] = [];
  for (const candidate of candidates) sizes.push(String((await stat(candidate.path)).size));

  const stagedData = await adminFetch(client, STAGED_UPLOADS_CREATE, {
    input: candidates.map((candidate, index) => ({
      resource: "IMAGE",
      filename: name(candidate),
      mimeType: mimeTypeFor(candidate),
      httpMethod: "POST",
      fileSize: sizes[index],
    })),
  }) as {
    stagedUploadsCreate: {
      stagedTargets: StagedTarget[] | null;
      userErrors: { field: string[] | string; message: string }[];
    } | null;
  };

  const created = stagedData?.stagedUploadsCreate;
  if (!created) throw new Error(`No response from stagedUploadsCreate for ${entry.handle}`);
  if (created.userErrors?.length) {
    throw new Error(
      `stagedUploadsCreate failed for ${entry.handle}: ` +
        created.userErrors.map(e => `${e.field ?? "(none)"}: ${e.message}`).join(", "),
    );
  }
  if (!created.stagedTargets || created.stagedTargets.length !== candidates.length) {
    throw new Error(
      `stagedUploadsCreate returned ${created.stagedTargets?.length ?? 0} targets for ` +
        `${candidates.length} image(s); refusing to attach a mismatched set.`,
    );
  }

  for (const [index, candidate] of candidates.entries()) {
    await uploadBytes(candidate, created.stagedTargets[index]);
  }

  // `originalSource` is the staged `resourceUrl` returned above, in the SAME
  // order as the input array — pairing them by index is what keeps each alt
  // text on the right image.
  const mediaData = await adminFetch(client, PRODUCT_UPDATE_MEDIA, {
    product: { id: entry.productId },
    media: candidates.map((candidate, index) => ({
      originalSource: created.stagedTargets![index].resourceUrl,
      alt: candidate.alt,
      mediaContentType: "IMAGE",
    })),
  }) as {
    productUpdate: {
      product: {
        id: string;
        featuredMedia: { id: string } | null;
        media: { edges: { node: { id: string; alt: string | null; status: string } }[] };
      } | null;
      userErrors: { field: string[] | string; message: string }[];
    } | null;
  };

  const attached = mediaData?.productUpdate;
  if (!attached) throw new Error(`No response from productUpdate(media:) for ${entry.handle}`);
  if (attached.userErrors?.length) {
    throw new Error(
      `Media write failed for ${entry.handle}: ` +
        attached.userErrors.map(e => `${e.field ?? "(none)"}: ${e.message}`).join(", "),
    );
  }
  if (!attached.product) {
    throw new Error(
      `Shopify returned no product for ${entry.handle} after the media write (null product, no userErrors). ` +
        `The id ${entry.productId} is stale or matches nothing.`,
    );
  }

  // Promote the primary only now that its media id exists. It is resolved by
  // alt text, which the STI-630 spec makes unique per image; guessing by
  // position would risk featuring the hover shot.
  const primary = candidates.find(candidate => candidate.role === "primary");
  let featuredMediaId: string | null = attached.product.featuredMedia?.id ?? null;

  if (primary) {
    const primaryNode = attached.product.media.edges.find(edge => edge.node.alt === primary.alt)?.node;
    if (!primaryNode) {
      throw new Error(
        `Uploaded ${candidates.length} image(s) to ${entry.handle} but none came back with the primary's alt ` +
          `text, so the featured image cannot be set. The media write landed; read it back before retrying.`,
      );
    }
    featuredMediaId = primaryNode.id;

    // Position 0 is the featured image on this schema. Send ONLY the moved
    // entry: MoveInput's own description says "do not send inputs for the
    // entire set", so this is a move, not a full reorder.
    const promoteData = await adminFetch(client, PRODUCT_REORDER_MEDIA, {
      id: entry.productId,
      moves: [{ id: primaryNode.id, newPosition: 0 }],
    }) as {
      productReorderMedia: {
        job: { id: string } | null;
        mediaUserErrors: { field: string[] | string; message: string }[];
      } | null;
    };

    const reordered = promoteData?.productReorderMedia;
    if (reordered?.mediaUserErrors?.length) {
      throw new Error(
        `Featured-image promotion failed for ${entry.handle} (the ${candidates.length} image(s) are attached): ` +
          reordered.mediaUserErrors.map(e => `${e.field ?? "(none)"}: ${e.message}`).join(", "),
      );
    }
    if (!reordered) {
      throw new Error(
        `Shopify accepted the media write for ${entry.handle} but returned nothing for the featured-image move. ` +
          `The images are live; the featured image is not.`,
      );
    }

    // The reorder is an async job, so read the media back rather than assuming
    // the first position already settled.
    const settled = await getProductMedia(client, entry.productId);
    if (settled.featuredMediaId !== primaryNode.id) {
      throw new Error(
        `Featured-image promotion for ${entry.handle} did not take effect: expected ` +
          `${primaryNode.id} at position 0, store reports ${settled.featuredMediaId ?? "none"}. ` +
          `The images are attached; promotion needs a manual retry.`,
      );
    }
    featuredMediaId = settled.featuredMediaId;
  }

  return { attached: candidates.length, featuredMediaId };
}

async function adminFetch(client: AdminClient, query: string, variables?: Record<string, unknown>) {
  const response = await fetch(`https://${client.domain}/admin/api/2026-04/graphql.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": client.token },
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