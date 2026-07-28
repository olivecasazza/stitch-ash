import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as yaml from "yaml";
import { CatalogProductSchema, type CatalogProduct, validateCatalogInvariants } from "./schema.ts";

export async function loadCatalogDirectory(dir: string): Promise<CatalogProduct[]> {
  const files = await fs.readdir(dir);
  const products: CatalogProduct[] = [];
  const parseErrors: string[] = [];

  for (const file of files) {
    if (!file.endsWith(".yaml") && !file.endsWith(".yml")) continue;
    
    const filepath = path.join(dir, file);
    const text = await fs.readFile(filepath, "utf8");
    
    try {
      const doc = yaml.parse(text);
      const parsed = CatalogProductSchema.safeParse(doc);
      if (!parsed.success) {
        parseErrors.push(`Failed to parse ${file}:\\n` + parsed.error.issues.map(i => `  - ${i.path.join(".")}: ${i.message}`).join("\\n"));
        continue;
      }
      products.push(parsed.data);
    } catch (e) {
      parseErrors.push(`Failed to read YAML in ${file}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  if (parseErrors.length > 0) {
    throw new Error("Catalog validation failed:\\n" + parseErrors.join("\\n"));
  }

  const invariants = validateCatalogInvariants(products);
  if (invariants.length > 0) {
    throw new Error("Catalog integrity failed:\\n" + invariants.map(i => `  - ${i}`).join("\\n"));
  }

  return products;
}
