import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";
import { CatalogProductSchema, type CatalogProduct } from "./schema.js";

export async function loadCatalogDirectory(dir: string): Promise<CatalogProduct[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const yamlFiles = entries.filter(e => e.isFile() && e.name.endsWith(".yaml"));

  const products: CatalogProduct[] = [];
  const errors: string[] = [];

  for (const entry of yamlFiles) {
    const content = await readFile(join(dir, entry.name), "utf-8");
    const raw = parseYaml(content);
    const result = CatalogProductSchema.safeParse(raw);
    if (!result.success) {
      errors.push(`${entry.name}: ${result.error.message}`);
      continue;
    }
    products.push(result.data);
  }

  if (errors.length > 0) {
    throw new Error(`Catalog validation errors:\n${errors.join("\n")}`);
  }

  return products;
}
