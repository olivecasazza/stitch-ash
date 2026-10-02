import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  applyProductMedia,
  groupByHandle,
  PHOTO_SPEC,
  readImageFacts,
  renderMediaPlan,
  validateCandidate,
  type MediaCandidate,
} from "./product-media.js";

/**
 * STI-632 guards.
 *
 * The upload path was missing entirely, and the live 2026-04 schema differs
 * from the shape the older Shopify examples show in three ways that all fail
 * the same dangerous way: HTTP 200 with an `errors` payload. Those are pinned
 * here so a future refactor cannot reintroduce them and still look green.
 */

async function writePng(width: number, height: number): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "stitch-ash-media-"));
  const path = join(dir, `png-${width}x${height}.png`);
  const buffer = Buffer.alloc(64);
  buffer.writeUInt32BE(width, 16);
  buffer.writeUInt32BE(height, 20);
  buffer.writeUInt32BE(0x89504e47, 0); // PNG magic as read back by readUInt32BE
  buffer[0] = 0x89; buffer[1] = 0x50; buffer[2] = 0x4e; buffer[3] = 0x47;
  buffer[4] = 0x0d; buffer[5] = 0x0a; buffer[6] = 0x1a; buffer[7] = 0x0a;
  await writeFile(path, buffer);
  return path;
}

function candidate(path: string, overrides: Partial<MediaCandidate> = {}): MediaCandidate {
  return { path, handle: "sku-001", role: "primary", alt: "Black embroidered hoodie laid flat", ...overrides };
}

test("readImageFacts reports PNG dimensions from the IHDR header", async () => {
  const path = await writePng(1200, 1500);
  const facts = await readImageFacts(path);
  assert.equal(facts.width, 1200);
  assert.equal(facts.height, 1500);
  assert.ok(facts.bytes > 0);
});

test("validateCandidate accepts a spec-conforming primary", async () => {
  const path = await writePng(1200, 1500);
  assert.deepEqual(await validateCandidate(candidate(path)), []);
});

test("validateCandidate rejects an undersized image by real pixels, not by claim", async () => {
  const path = await writePng(800, 800);
  const errors = await validateCandidate(candidate(path));
  assert.equal(errors.length, 1);
  assert.match(errors[0], /800x800 is below the required 1200x1500/);
});

test("validateCandidate rejects a generated stand-in with the spec's own reason", async () => {
  const dir = await mkdtemp(join(tmpdir(), "stitch-ash-svg-"));
  const path = join(dir, "sku-001-primary.svg");
  await writeFile(path, "<svg xmlns='http://www.w3.org/2000/svg' width='1200' height='1500'/>");
  const errors = await validateCandidate(candidate(path));
  assert.equal(errors.length, 1);
  assert.match(errors[0], /not one of/);
  assert.match(errors[0], /unsupported image format|extension/);
});

test("validateCandidate requires alt text", async () => {
  const path = await writePng(1200, 1500);
  const errors = await validateCandidate(candidate(path, { alt: "   " }));
  assert.equal(errors.length, 1);
  assert.match(errors[0], /alt text is required/);
});

test("PHOTO_SPEC matches the STI-630 photo-spec numbers", () => {
  assert.equal(PHOTO_SPEC.minWidth, 1200);
  assert.equal(PHOTO_SPEC.minHeight, 1500);
  assert.equal(PHOTO_SPEC.maxBytes, 2 * 1024 * 1024);
  assert.deepEqual(PHOTO_SPEC.allowedExtensions, [".jpg", ".jpeg", ".png"]);
});

test("groupByHandle keeps a plan readable per SKU", () => {
  const grouped = groupByHandle([
    candidate("/tmp/a.jpg", { handle: "sku-001" }),
    candidate("/tmp/b.jpg", { handle: "sku-001", role: "hover" }),
    candidate("/tmp/c.jpg", { handle: "sku-002" }),
  ]);
  assert.deepEqual([...grouped.keys()], ["sku-001", "sku-002"]);
  assert.equal(grouped.get("sku-001")?.length, 2);
});

test("renderMediaPlan prints NOT READY rather than a bare failure line", () => {
  const lines = renderMediaPlan([
    { handle: "sku-001", productId: "gid://shopify/Product/1", actions: [], errors: ["sku-001: alt text is required"], noop: false },
  ]);
  assert.ok(lines.some(line => line.includes("NOT READY: sku-001: alt text is required")));
});

test("applyProductMedia refuses an invalid image before any network write", async () => {
  const path = await writePng(10, 10);
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = (async () => { calls += 1; throw new Error("should never be reached"); }) as typeof fetch;
  try {
    await assert.rejects(
      () => applyProductMedia(
        { domain: "invalid.example", token: "not-a-real-token", source: "static" },
        { handle: "sku-001", productId: "gid://shopify/Product/1" },
        [candidate(path)],
      ),
      /Refusing to apply sku-001/,
    );
  } finally {
    globalThis.fetch = original;
  }
  assert.equal(calls, 0, "validation must fail closed, before stagedUploadsCreate is asked for a URL");
});

test("the upload uses resourceUrl for originalSource, not the bucket url", async () => {
  const path = await writePng(1200, 1500);
  const original = globalThis.fetch;
  const sent: { url: string; body: any }[] = [];
  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    // The byte upload is a multipart POST to the signed bucket URL, not GraphQL.
    if (init?.body instanceof FormData) {
      return new Response("", { status: 201 });
    }
    const body = JSON.parse(String(init?.body)) as { query: string; variables: Record<string, unknown> };
    sent.push({ url: String(url), body });
    if (body.query.includes("stagedUploadsCreate")) {
      return new Response(
        JSON.stringify({
          data: {
            stagedUploadsCreate: {
              stagedTargets: [{
                url: "https://shopify-staged-uploads.storage.googleapis.com/",
                resourceUrl: "https://shopify-staged-uploads.storage.googleapis.com/tmp/abc/sku-001-primary.png",
                parameters: [{ name: "Content-Type", value: "image/png" }],
              }],
              userErrors: [],
            },
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }
    if (body.query.includes("productReorderMedia")) {
      return new Response(
        JSON.stringify({ data: { productReorderMedia: { job: { id: "gid://shopify/Job/1" }, mediaUserErrors: [] } } }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }
    if (body.query.includes("product(id: $id)")) {
      return new Response(
        JSON.stringify({
          data: {
            product: {
              id: "gid://shopify/Product/1",
              featuredMedia: { id: "gid://shopify/ProductMedia/7" },
              media: { edges: [{ node: { id: "gid://shopify/ProductMedia/7", status: "READY", mediaContentType: "IMAGE", alt: "Black embroidered hoodie laid flat", preview: { image: { url: "https://cdn/x.png", width: 1200, height: 1500 } } } }] },
            },
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }
    return new Response(
      JSON.stringify({
        data: {
          productUpdate: {
            product: {
              id: "gid://shopify/Product/1",
              featuredMedia: null,
              media: { edges: [{ node: { id: "gid://shopify/ProductMedia/7", alt: "Black embroidered hoodie laid flat", status: "READY" } }] },
            },
            userErrors: [],
          },
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }) as typeof fetch;
  try {
    const result = await applyProductMedia(
      { domain: "invalid.example", token: "not-a-real-token", source: "static" },
      { handle: "sku-001", productId: "gid://shopify/Product/1" },
      [candidate(path)],
    );
    assert.equal(result.attached, 1);
    assert.equal(result.featuredMediaId, "gid://shopify/ProductMedia/7");
  } finally {
    globalThis.fetch = original;
  }

  const attach = sent.find(entry => entry.body.query.includes("productUpdate"));
  const media = (attach!.body.variables.media as { originalSource: string }[])[0];
  assert.match(
    media.originalSource,
    /\/tmp\/abc\/sku-001-primary\.png$/,
    "originalSource must be the staged resourceUrl — the bare bucket url cannot be attached",
  );
  assert.equal(
    sent.some(entry => entry.body.query.includes("productCreateMedia")),
    false,
    "productCreateMedia does not exist on live 2026-04; media rides on productUpdate(media:)",
  );
});

test("promotion sends productReorderMedia with newPosition 0 and no featuredMediaId field", async () => {
  const path = await writePng(1200, 1500);
  const original = globalThis.fetch;
  const sent: { query: string; variables: Record<string, unknown> }[] = [];
  globalThis.fetch = (async (_url: string | URL | Request, init?: RequestInit) => {
    if (init?.body instanceof FormData) return new Response("", { status: 201 });
    const body = JSON.parse(String(init?.body)) as { query: string; variables: Record<string, unknown> };
    sent.push(body);
    if (body.query.includes("stagedUploadsCreate")) {
      return new Response(
        JSON.stringify({
          data: {
            stagedUploadsCreate: {
              stagedTargets: [{
                url: "https://shopify-staged-uploads.storage.googleapis.com/",
                resourceUrl: "https://shopify-staged-uploads.storage.googleapis.com/tmp/abc/x.png",
                parameters: [{ name: "Content-Type", value: "image/png" }],
              }],
              userErrors: [],
            },
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }
    if (body.query.includes("productReorderMedia")) {
      return new Response(
        JSON.stringify({ data: { productReorderMedia: { job: { id: "gid://shopify/Job/1" }, mediaUserErrors: [] } } }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }
    if (body.query.includes("product(id: $id)")) {
      return new Response(
        JSON.stringify({
          data: {
            product: {
              id: "gid://shopify/Product/1",
              featuredMedia: { id: "gid://shopify/ProductMedia/7" },
              media: { edges: [{ node: { id: "gid://shopify/ProductMedia/7", alt: "Black embroidered hoodie laid flat", status: "READY", mediaContentType: "IMAGE", preview: { image: { url: "https://cdn/x.png", width: 1200, height: 1500 } } } }] },
            },
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }
    return new Response(
      JSON.stringify({
        data: {
          productUpdate: {
            product: {
              id: "gid://shopify/Product/1",
              featuredMedia: null,
              media: { edges: [{ node: { id: "gid://shopify/ProductMedia/7", alt: "Black embroidered hoodie laid flat", status: "READY" } }] },
            },
            userErrors: [],
          },
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }) as typeof fetch;
  try {
    await applyProductMedia(
      { domain: "invalid.example", token: "not-a-real-token", source: "static" },
      { handle: "sku-001", productId: "gid://shopify/Product/1" },
      [candidate(path)],
    );
  } finally {
    globalThis.fetch = original;
  }

  const reorder = sent.find(entry => entry.query.includes("productReorderMedia"));
  assert.ok(reorder, "featured image must be set via productReorderMedia");
  assert.deepEqual(reorder!.variables.moves, [{ id: "gid://shopify/ProductMedia/7", newPosition: 0 }]);
  for (const entry of sent) {
    assert.doesNotMatch(
      JSON.stringify(entry.variables),
      /featuredMediaId/,
      "no product input on live 2026-04 accepts featuredMediaId; sending it is a silent error",
    );
  }
});

test("a userErrors payload from the media write throws instead of reporting success", async () => {
  const path = await writePng(1200, 1500);
  const original = globalThis.fetch;
  globalThis.fetch = (async (_url: string | URL | Request, init?: RequestInit) => {
    if (init?.body instanceof FormData) return new Response("", { status: 201 });
    const body = JSON.parse(String(init?.body)) as { query: string };
    if (body.query.includes("stagedUploadsCreate")) {
      return new Response(
        JSON.stringify({
          data: {
            stagedUploadsCreate: {
              stagedTargets: [{
                url: "https://shopify-staged-uploads.storage.googleapis.com/",
                resourceUrl: "https://shopify-staged-uploads.storage.googleapis.com/tmp/abc/x.png",
                parameters: [{ name: "Content-Type", value: "image/png" }],
              }],
              userErrors: [],
            },
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }
    return new Response(
      JSON.stringify({
        data: { productUpdate: { product: null, userErrors: [{ field: ["media"], message: "IMAGE_LOAD_ERROR" }] } },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }) as typeof fetch;
  try {
    await assert.rejects(
      () => applyProductMedia(
        { domain: "invalid.example", token: "not-a-real-token", source: "static" },
        { handle: "sku-001", productId: "gid://shopify/Product/1" },
        [candidate(path)],
      ),
      /Media write failed for sku-001.*IMAGE_LOAD_ERROR/s,
    );
  } finally {
    globalThis.fetch = original;
  }
});