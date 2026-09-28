import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";
import { CatalogCollectionSchema, CatalogProductSchema, type CatalogCollection, type CatalogProduct } from "./schema.js";

async function loadYamlDir<T>(dir: string, schema: { safeParse: (raw: unknown) => { success: true; data: T } | { success: false; error: { message: string } } }): Promise<T[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const yamlFiles = entries.filter(e => e.isFile() && e.name.endsWith(".yaml"));

  const parsed: T[] = [];
  const errors: string[] = [];

  for (const entry of yamlFiles) {
    const content = await readFile(join(dir, entry.name), "utf-8");
    const raw = parseYaml(content);
    const result = schema.safeParse(raw);
    if (!result.success) {
      errors.push(`${entry.name}: ${result.error.message}`);
      continue;
    }
    parsed.push(result.data);
  }

  if (errors.length > 0) {
    throw new Error(`Catalog validation errors:\n${errors.join("\n")}`);
  }

  return parsed;
}

export async function loadCatalogDirectory(dir: string): Promise<CatalogProduct[]> {
  return loadYamlDir<CatalogProduct>(dir, CatalogProductSchema);
}

/**
 * STI-471: collections live in their own directory. They are optional: a repo
 * with no catalog/collections/ still loads products exactly as before, so this
 * is additive rather than a new required input.
 */
export async function loadCollectionDirectory(dir: string): Promise<CatalogCollection[]> {
  try {
    return await loadYamlDir<CatalogCollection>(dir, CatalogCollectionSchema);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}
