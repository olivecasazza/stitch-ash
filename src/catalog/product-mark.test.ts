import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

/**
 * STI-541 / STI-547 guard, kept after the placeholder plate was removed.
 *
 * Two invariants from that work survive the removal and are still worth
 * pinning, because they apply to whatever real art replaces the plate:
 *
 * 1. The resolver's per-product derivation is gone along with the resolver.
 *    That subject no longer exists — there is no drawn silhouette left to get
 *    wrong, so the invariant "a product is never pictured as the wrong
 *    garment" now holds by construction rather than by derivation.
 *
 * 2. The ops-status guard is NOT subject to that argument. Internal pipeline
 *    status must never reach a customer's accessibility tree or their eye,
 *    whichever component renders a product image next. STI-547 removed it from
 *    the plate after it shipped; this asserts it cannot come back anywhere.
 *
 * The guard is deliberately repo-wide over customer-facing markup rather than
 * pointed at one component, because the component it used to name is gone and
 * pointing it at the next one would just recreate the same brittleness.
 */
function stripComments(src: string): string {
  return src.replace(/<!--[\s\S]*?-->/g, " ").replace(/\/\*[\s\S]*?\*\//g, " ");
}

const OPS_STATUS = /not yet available|image pending|coming soon/i;

const SHIPPED_MARKUP = [
  "../../app/components/ProductCard.vue",
  "../../app/pages/product/[handle].vue",
  "../../app/pages/collection/[handle].vue",
  "../../app/pages/index.vue",
];

test("ops-status wording is absent from every shipped product surface", () => {
  for (const path of SHIPPED_MARKUP) {
    const rendered = stripComments(readFileSync(new URL(path, import.meta.url), "utf8"));
    assert.equal(OPS_STATUS.test(rendered), false, `${path} renders pipeline status`);
  }
});

test("ops-status wording is absent from any customer-facing attribute", () => {
  for (const path of SHIPPED_MARKUP) {
    const rendered = stripComments(readFileSync(new URL(path, import.meta.url), "utf8"));
    for (const attribute of rendered.matchAll(/\b(aria-label|alt|title)="([^"]*)"/g)) {
      assert.equal(OPS_STATUS.test(attribute[2]!), false, attribute[0]);
    }
  }
});

test("no placeholder plate component remains to regress", () => {
  // The plate was deleted rather than refined; if a stub ever comes back, the
  // per-product silhouette logic must not return with it.
  assert.throws(
    () => readFileSync(new URL("../../app/components/ProductImagePlate.vue", import.meta.url), "utf8"),
    "ProductImagePlate.vue is back — it needs its per-product silhouette tests too",
  );
});
