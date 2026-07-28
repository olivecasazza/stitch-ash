import { z } from "zod";

export const ProductStatusSchema = z.enum(["ACTIVE", "ARCHIVED", "DRAFT"]);
export const InventoryManagementSchema = z.enum(["SHOPIFY", "NOT_MANAGED"]);
export const InventoryPolicySchema = z.enum(["CONTINUE", "DENY"]);

export const CatalogOptionSchema = z.object({
  name: z.string().min(1),
  values: z.array(z.string().min(1)).min(1),
});

export const CatalogVariantSchema = z.object({
  sku: z.string().min(1),
  price: z.string().regex(/^\d+(\.\d{2})$/, "price must be a decimal string like 185.00"),
  option1: z.string().min(1),
  option2: z.string().min(1).optional(),
  option3: z.string().min(1).optional(),
  inventoryManagement: InventoryManagementSchema.default("SHOPIFY"),
  inventoryPolicy: InventoryPolicySchema.default("DENY"),
});

export const CatalogProductSchema = z.object({
  id: z.string().regex(/^[a-z0-9][a-z0-9._-]+$/, "id must be a stable lowercase catalog id"),
  title: z.string().min(1),
  handle: z.string().regex(/^[a-z0-9][a-z0-9-]*$/, "handle must be lowercase kebab-case"),
  productType: z.string().min(1),
  vendor: z.string().min(1),
  status: ProductStatusSchema.default("DRAFT"),
  tags: z.array(z.string().min(1)).default([]),
  bodyHtml: z.string().min(1),
  options: z.array(CatalogOptionSchema).min(1).max(3),
  variants: z.array(CatalogVariantSchema).min(1).max(100),
  delete: z.literal(true).optional(),
  deleteAfter: z.string().date().optional(),
});

export type CatalogProduct = z.infer<typeof CatalogProductSchema>;

export interface CatalogValidationIssue {
  file: string;
  message: string;
}

export function validateCatalogInvariants(products: CatalogProduct[]): string[] {
  const issues: string[] = [];
  const ids = new Map<string, string>();
  const handles = new Map<string, string>();
  const skus = new Map<string, string>();

  for (const product of products) {
    const priorId = ids.get(product.id);
    if (priorId) issues.push(`duplicate product id ${product.id} in ${product.handle} and ${priorId}`);
    ids.set(product.id, product.handle);

    const priorHandle = handles.get(product.handle);
    if (priorHandle) issues.push(`duplicate handle ${product.handle} in ${product.id} and ${priorHandle}`);
    handles.set(product.handle, product.id);

    for (const variant of product.variants) {
      const priorSku = skus.get(variant.sku);
      if (priorSku) issues.push(`duplicate SKU ${variant.sku} in ${product.id} and ${priorSku}`);
      skus.set(variant.sku, product.id);

      const optionValues = [variant.option1, variant.option2, variant.option3].filter(Boolean) as string[];
      if (optionValues.length !== product.options.length) {
        issues.push(`${product.id}/${variant.sku} has ${optionValues.length} option values but product defines ${product.options.length} options`);
      }

      optionValues.forEach((value, index) => {
        const option = product.options[index];
        if (option && !option.values.includes(value)) {
          issues.push(`${product.id}/${variant.sku} option ${option.name} value ${value} is not declared in product options`);
        }
      });
    }
  }

  return issues;
}
