/**
 * Spec sections from a product description (DESIGN.md "Product copy").
 *
 * The catalog writes `bodyHtml` as repeated `<h3>Label</h3>` + `<ul><li>` pairs,
 * and that is the whole format — the PDP has no description block, so the
 * expander is the only place product facts live. Shopify's plain-text
 * `description` flattens the pairs into a run-on paragraph, so the PDP reads
 * `descriptionHtml` and rebuilds the sections from it. Labels and lines come
 * back as plain text; the template interpolates them, never `v-html`.
 */
const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": "\"",
  "&#39;": "'",
  "&nbsp;": " ",
}

export interface ProductSpecSection {
  label: string
  lines: string[]
}

function toText(html: string): string {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/&(amp|lt|gt|quot|#39|nbsp);/g, e => ENTITIES[e]!)
    .replace(/\s+/g, " ")
    .trim()
}

export function specSections(html: string | null | undefined): ProductSpecSection[] {
  if (!html) return []
  return [...html.matchAll(/<h3[^>]*>([\s\S]*?)<\/h3>\s*<ul[^>]*>([\s\S]*?)<\/ul>/gi)]
    .map(m => ({
      label: toText(m[1]!),
      lines: [...m[2]!.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)]
        .map(li => toText(li[1]!))
        .filter(Boolean),
    }))
    .filter(section => section.label && section.lines.length > 0)
}
