import assert from "node:assert/strict";
import test from "node:test";

import { PRODUCTS } from "../../app/data/products.ts";
import { specLines } from "../../app/utils/product-specs.ts";
import { loadCatalogDirectory } from "./load.ts";

/**
 * DESIGN.md "Product copy": product copy is a spec sheet, not prose. These
 * checks fail CI on copy that drifts back into branding — the 2026-10-03
 * sku-001 description ran five paragraphs, one of them "The kind of
 * construction detail that only matters when everything else fails — these
 * won't."
 */
const MAX_LINES = 6;
const MAX_WORDS = 8;
const DETAIL_LABELS: Record<string, true> = { Care: true, "Shipping & Returns": true };
const BANNED: [RegExp, string][] = [
  [/—/, "em-dash aside"],
  [/\b(you|your|yours|we|our|us)\b/i, "second person / we"],
  [/\b(premium|precise|intentional|substantial|high-quality|luxury|crafted|timeless|perfect)\b/i, "judgement adjective"],
  [/\bbuilt (for|to)\b|\bthe kind of\b|\bthe point\b|\bdesigned for\b/i, "selling, not stating"],
];

function lineProblems(line: string): string[] {
  const problems: string[] = [];
  const words = line.split(/\s+/).filter(Boolean).length;
  if (words > MAX_WORDS) problems.push(`${words} words (max ${MAX_WORDS})`);
  if (!line.endsWith(".")) problems.push("not a fragment ending in '.'");
  for (const [re, why] of BANNED) if (re.test(line)) problems.push(why);
  return problems;
}

function assertLines(where: string, lines: string[]) {
  const bad = lines
    .map(line => ({ line, problems: lineProblems(line) }))
    .filter(r => r.problems.length);
  assert.deepEqual(bad, [], `${where}: copy breaks DESIGN.md "Product copy"`);
}

const catalog = await loadCatalogDirectory("catalog/products");

for (const product of catalog) {
  test(`${product.handle}: catalog bodyHtml is a spec list`, () => {
    const html = (product.bodyHtml ?? "").trim();
    assert.match(html, /^<ul>\s*(<li>[^<]+<\/li>\s*)+<\/ul>$/, "bodyHtml must be one <ul> of <li> lines");
    const lines = specLines(html);
    assert.ok(lines.length <= MAX_LINES, `${lines.length} lines (max ${MAX_LINES})`);
    assertLines(`${product.handle} bodyHtml`, lines);
  });
}

for (const product of PRODUCTS) {
  test(`${product.handle}: static PDP copy is a spec sheet`, () => {
    const live = catalog.find(p => p.handle === product.handle);
    assert.ok(live, `no catalog YAML for ${product.handle}`);
    assert.deepEqual(product.specs, specLines(live.bodyHtml), "static specs must mirror the catalog list");
    assertLines(`${product.handle} specs`, product.specs);
    for (const section of product.details) {
      assert.ok(DETAIL_LABELS[section.label], `detail panel "${section.label}" repeats the description`);
      assertLines(`${product.handle} ${section.label}`, section.lines);
    }

    const fragments = [...product.specs, ...product.details.flatMap(s => s.lines)]
      .flatMap(line => line.split(/(?<=\.)\s+/))
      .map(f => f.toLowerCase());
    const repeated = fragments.filter((f, i) => fragments.indexOf(f) !== i);
    assert.deepEqual(repeated, [], "a fact appears once on the page");
  });
}

test("the gate rejects the copy it was written against", () => {
  const old = "The kind of construction detail that only matters when everything else fails — these won't.";
  assert.ok(lineProblems(old).length >= 3);
  assert.deepEqual(lineProblems("Double-stitched seams."), []);
});
