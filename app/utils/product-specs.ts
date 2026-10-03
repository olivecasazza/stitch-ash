/**
 * Spec lines from a product description (DESIGN.md "Product copy").
 *
 * The catalog writes `bodyHtml` as one `<ul>` of `<li>` facts. Shopify's
 * plain-text `description` joins them into one run-on paragraph, so the PDP
 * reads `descriptionHtml` and renders each `<li>` as its own line. Lines come
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

export function specLines(html: string | null | undefined): string[] {
  if (!html) return []
  return [...html.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)]
    .map(m => m[1]!
      .replace(/<[^>]+>/g, "")
      .replace(/&(amp|lt|gt|quot|#39|nbsp);/g, e => ENTITIES[e]!)
      .replace(/\s+/g, " ")
      .trim())
    .filter(Boolean)
}
