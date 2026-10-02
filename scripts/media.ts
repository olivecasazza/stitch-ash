#!/usr/bin/env tsx
import { readFile } from "node:fs/promises";
import * as path from "node:path";
import { applyProductMedia, groupByHandle, planMedia, renderMediaPlan, type MediaCandidate } from "../src/catalog/product-media.ts";
import { buildAdminClient } from "../src/catalog/shopify-admin.ts";

/**
 * STI-632: the Admin step that puts photography on a product.
 *
 * Deliberately mirrors scripts/tracking.ts — plan is free, apply writes. The
 * manifest is a JSON array of MediaCandidate, so the alt text and the
 * primary/hover role travel with each file rather than being guessed from a
 * filename.
 *
 *   media:plan  --manifest=photos.json
 *   media:apply --manifest=photos.json
 *
 * Example manifest entry:
 *   { "path": "photos/sku-001-primary.jpg", "handle": "sku-001",
 *     "role": "primary", "alt": "Black embroidered hoodie laid flat, ..." }
 */

const command = process.argv[2] ?? "plan";

function arg(name: string): string | undefined {
  const prefix = `--${name}=`;
  const found = process.argv.find(value => value.startsWith(prefix));
  return found?.slice(prefix.length);
}

function usage(): never {
  console.error("Usage: pnpm media:plan  --manifest=photos.json");
  console.error("       pnpm media:apply --manifest=photos.json");
  process.exit(2);
}

async function loadCandidates(manifestPath: string): Promise<MediaCandidate[]> {
  const absolute = path.resolve(manifestPath);
  const raw = await readFile(absolute, "utf-8");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(`Manifest ${absolute} is not valid JSON: ${error instanceof Error ? error.message : error}`);
  }

  if (!Array.isArray(parsed)) {
    throw new Error(`Manifest ${absolute} must be a JSON array of {path, handle, role, alt} objects.`);
  }

  return parsed.map((entry, index) => {
    const item = entry as Partial<MediaCandidate>;
    if (!item?.path || !item?.handle || !item?.alt) {
      throw new Error(`Manifest ${absolute} entry ${index} is missing path, handle, role, or alt.`);
    }
    if (item.role !== "primary" && item.role !== "hover") {
      throw new Error(`Manifest ${absolute} entry ${index} has role ${JSON.stringify(item.role)}; expected "primary" or "hover".`);
    }
    // Relative manifest paths resolve against the manifest, not process.cwd(),
    // so a manifest checked in beside its photos works from any directory.
    return {
      path: path.isAbsolute(item.path) ? item.path : path.resolve(path.dirname(absolute), item.path),
      handle: item.handle,
      role: item.role,
      alt: item.alt,
      ...(item.filename ? { filename: item.filename } : {}),
    };
  });
}

async function main() {
  if (!["plan", "apply"].includes(command)) usage();

  const manifest = arg("manifest");
  if (!manifest) usage();

  const candidates = await loadCandidates(manifest);
  if (candidates.length === 0) {
    throw new Error(`Manifest ${manifest} declares no images. There is nothing to upload.`);
  }

  const entries = await planMedia(candidates);
  for (const line of renderMediaPlan(entries)) console.log(line);

  const notReady = entries.filter(entry => entry.errors.length > 0);
  if (notReady.length > 0) {
    throw new Error(
      `Refusing to apply: ${notReady.length}/${entries.length} handle(s) are NOT READY (see above). ` +
        `Fix the manifest or the image files first — applyProductMedia re-validates and refuses anyway.`,
    );
  }

  if (command === "plan") return;

  const client = await buildAdminClient();
  for (const entry of entries) {
    const group = groupByHandle(candidates).get(entry.handle) ?? [];
    const result = await applyProductMedia(client, { handle: entry.handle, productId: entry.productId! }, group);
    console.log(`media: ${entry.handle} attached=${result.attached} featuredMedia=${result.featuredMediaId ?? "none"}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});