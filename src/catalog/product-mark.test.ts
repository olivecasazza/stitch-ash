import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { resolveProductMark } from "../../app/utils/product-mark";

/** Remove HTML comments and JS/CSS block comments from Vue SFC source. */
function stripComments(src: string): string {
  return src.replace(/<!--[\s\S]*?-->/g, " ").replace(/\/\*[\s\S]*?\*\//g, " ");
}

/**
 * STI-541 regression tests.
 *
 * The defect this pins: the storefront rendered one generic hoodie outline as
 * the fallback for every product, so the Embroidered Lanyard and the
 * Embroidered Sticker both pictured a hoodie — an image contradicting the
 * product name printed directly beneath it. A product's plate must be a
 * silhouette that is true of that product.
 *
 * The second half pins the accessible name. The shipped string was
 * "<product> — product photograph not yet available", which put internal
 * pipeline status into the accessibility tree of a customer page. This module
 * must never be the place that word comes from.
 */
test("explicit mark wins over derivation", () => {
  assert.equal(resolveProductMark("lanyard", "Embroidered Hoodie"), "lanyard");
  assert.equal(resolveProductMark("sticker", "Embroidered Lanyard"), "sticker");
});

test("derives the silhouette from the product's own name and handle", () => {
  assert.equal(resolveProductMark(undefined, "Embroidered Hoodie", "sku-001"), "hoodie");
  assert.equal(resolveProductMark(undefined, "Embroidered Lanyard", "sku-002"), "lanyard");
  assert.equal(resolveProductMark(undefined, "Embroidered Sticker", "sku-003"), "sticker");
});

test("a Shopify product is matched on title, not just handle", () => {
  // The collection route reads live products whose handle is a slug and whose
  // title is the merchandising name; both have to resolve the same way.
  assert.equal(resolveProductMark(undefined, "Embroidered Lanyard", "lanyard-black"), "lanyard");
  assert.equal(resolveProductMark(undefined, "", "sticker-patch"), "sticker");
});

test("no garment is ever claimed for a product we cannot identify", () => {
  // "emblem" is the stitched diamond: true of any embroidered item. A
  // wrong-but-plausible garment is worse than no garment, so an unrecognised
  // product must never fall back to the hoodie.
  assert.equal(resolveProductMark(undefined, "Embroidered Cuff", "sku-009"), "emblem");
  assert.equal(resolveProductMark(undefined, undefined, undefined), "emblem");
  assert.equal(resolveProductMark(undefined, "Embroidered Beanie"), "emblem");
});

test("missing and empty input cannot throw", () => {
  assert.equal(resolveProductMark(undefined, null, undefined, ""), "emblem");
  assert.equal(resolveProductMark(undefined, "   "), "emblem");
});

test("the ops-status string is nowhere in the plate module", () => {
  // The defect that reaches customers, asserted against source text so a
  // future edit cannot reintroduce it quietly.
  const src = readFileSync(
    new URL("../../app/utils/product-mark.ts", import.meta.url),
    "utf8",
  );
  assert.equal(/not yet available/i.test(src), false);
});

test("the ops-status string is nowhere in any shipped plate markup", () => {
  // The component is where the accessible name is actually composed, so the
  // guard has to cover it and not just the resolver. Comments are stripped
  // first: this module's own comment quotes the phrase in order to explain the
  // defect, and prose about the string is not the string reaching a customer.
  const plate = readFileSync(
    new URL("../../app/components/ProductImagePlate.vue", import.meta.url),
    "utf8",
  );
  const rendered = stripComments(plate);
  assert.equal(/not yet available/i.test(rendered), false);
  // And no attribute that reaches the accessibility tree may carry it.
  for (const attribute of rendered.matchAll(/\b(aria-label|alt)="([^"]*)"/g)) {
    assert.equal(/not yet available/i.test(attribute[2]!), false, attribute[0]);
  }
});
