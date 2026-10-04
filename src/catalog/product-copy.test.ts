import assert from "node:assert/strict";
import test from "node:test";

import { PRODUCTS } from "../../app/data/products.ts";
import { specSections } from "../../app/utils/product-specs.ts";
import { loadCatalogDirectory } from "./load.ts";
import { loadReturnsPolicies } from "./returns.ts";

/**
 * DESIGN.md "Product copy": product copy is a spec sheet, not prose, and the
 * PDP has no description block — every fact lives in the details expander. So
 * `bodyHtml` is repeated `<h3>Label</h3>` + `<ul><li>` pairs and nothing else.
 * These checks fail CI on copy that drifts back into branding — the 2026-10-03
 * sku-001 description ran five paragraphs, one of them "The kind of
 * construction detail that only matters when everything else fails — these
 * won't."
 */
const MAX_WORDS = 8;
const MAX_LINES_PER_SECTION = 4;
const MAX_SECTIONS = 7;
const LABELS: Record<string, true> = {
  Material: true,
  Fit: true,
  Construction: true,
  Embroidery: true,
  Size: true,
  Application: true,
  Care: true,
  "Shipping & Returns": true,
};
const BODY_STRUCTURE = /^(<h3>[^<]+<\/h3><ul>(<li>[^<]+<\/li>)+<\/ul>)+$/;
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
  test(`${product.handle}: catalog bodyHtml is labelled spec sections`, () => {
    const html = (product.bodyHtml ?? "").trim().replace(/\s+/g, "");
    assert.match(html, BODY_STRUCTURE, "bodyHtml must be <h3>Label</h3><ul><li>line</li></ul> pairs and nothing else");

    const sections = specSections(product.bodyHtml);
    assert.ok(sections.length <= MAX_SECTIONS, `${sections.length} sections (max ${MAX_SECTIONS})`);
    for (const section of sections) {
      assert.ok(LABELS[section.label], `unknown section label "${section.label}"`);
      assert.ok(
        section.lines.length <= MAX_LINES_PER_SECTION,
        `${section.label}: ${section.lines.length} lines (max ${MAX_LINES_PER_SECTION})`,
      );
      assertLines(`${product.handle} ${section.label}`, section.lines);
    }

    const lines = sections.flatMap(s => s.lines).map(l => l.toLowerCase());
    const repeated = lines.filter((l, i) => lines.indexOf(l) !== i);
    assert.deepEqual(repeated, [], "a fact appears once on the page");
  });
}

for (const product of PRODUCTS) {
  test(`${product.handle}: static details mirror the catalog sections`, () => {
    const live = catalog.find(p => p.handle === product.handle);
    assert.ok(live, `no catalog YAML for ${product.handle}`);
    assert.deepEqual(
      product.details,
      specSections(live.bodyHtml),
      "static details must mirror the catalog sections",
    );
    for (const section of product.details) {
      assertLines(`${product.handle} ${section.label}`, section.lines);
    }
  });
}

test("every SKU's returns lines are the declared policy, identically", async () => {
  // STI-681. Before this, sku-001 said "Returns within 14 days, unworn."
  // while sku-002 and sku-003 said "Final sale." — one store, two opposite
  // promises, authored in 79ad80e (#204). The invariant is not "the copy is
  // legal" (every individual string was); it is that no SKU's returns lines
  // may be authored independently of the others at all.
  const [policy, ...extra] = await loadReturnsPolicies("catalog/returns");
  assert.equal(extra.length, 0, "declare exactly one returns policy");
  const declared = policy.lines;

  // The policy direction is the store's decision, not this test's. What the
  // test pins is that every product renders that decision word for word.
  for (const product of catalog) {
    const section = specSections(product.bodyHtml).find(s => s.label === "Shipping & Returns");
    assert.ok(section, `${product.handle}: no Shipping & Returns section`);
    const returns = section.lines.filter(l => l.includes("returns") || l.includes("return"));
    assert.deepEqual(
      returns,
      declared,
      `${product.handle}: returns lines must equal catalog/returns/default.yaml`,
    );
  }

  // The static fallback renders when Shopify has no description, so it is the
  // same invariant on the other code path.
  for (const product of PRODUCTS) {
    const section = product.details.find(s => s.label === "Shipping & Returns");
    assert.ok(section, `${product.handle}: no Shipping & Returns section`);
    const returns = section.lines.filter(l => l.includes("return"));
    assert.deepEqual(returns, declared, `${product.handle}: fallback returns lines`);
  }

  // The policy line itself must stay within the copy rules, or declaring it
  // once would launder an illegal line into every SKU.
  assertLines("catalog/returns/default.yaml", declared);
});

test("the gate rejects the copy it was written against", () => {
  const old = "The kind of construction detail that only matters when everything else fails — these won't.";
  assert.ok(lineProblems(old).length >= 3);
  assert.deepEqual(lineProblems("Double-stitched seams."), []);
});
