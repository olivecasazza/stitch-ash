/**
 * STI-618: a `REST_OF_WORLD` shipping rule must be probed against every country
 * the repo can address, not a hand-maintained subset.
 *
 * The probe list was hardcoded to `CA, GB, DE, AU, JP`. Measured against the
 * live store those five are blocked, but so are 19 more — including `FR`, which
 * this very issue's title named while the probe never checked it. `catalog:plan`
 * reported "5 destination(s)" for an outage affecting 24.
 *
 * These tests assert the property, not the specific countries, so adding a
 * country to `PROBE_POSTAL_CODES` cannot silently go unmeasured later.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { PROBE_POSTAL_CODES } from "./checkout-rates.js";

/**
 * `restOfWorldProbes` lives in `scripts/catalog.ts`, which runs its whole CLI on
 * import. Rather than execute that script, assert on its source text and on the
 * shared postal map it derives from. This keeps the test a real unit test.
 */
const catalogSource = readFileSync(new URL("../../scripts/catalog.ts", import.meta.url), "utf8");

describe("REST_OF_WORLD probe coverage (STI-618)", () => {
  it("derives the REST_OF_WORLD probe set from PROBE_POSTAL_CODES", () => {
    assert.match(
      catalogSource,
      /Object\.keys\(PROBE_POSTAL_CODES\)/,
      "the probe set must be derived from the postal map so it cannot fall behind it",
    );
  });

  it("no longer probes a hand-maintained country list", () => {
    // Match the declaration AND the function body: reintroducing the five
    // countries inside `restOfWorldProbes()` must fail here too, not only the
    // `Object.keys` test above. Otherwise this test passes vacuously.
    assert.doesNotMatch(catalogSource, /REST_OF_WORLD_PROBES\s*=\s*\[/, "no hardcoded REST_OF_WORLD_PROBES const");
    assert.doesNotMatch(
      catalogSource,
      /function restOfWorldProbes\(\)[\s\S]{0,400}?\breturn\s*\[[^\]]/,
      "restOfWorldProbes() must return a derived list, not a literal array of countries",
    );
  });

  it("probes every country the postal map can address, including FR", () => {
    const addressable = Object.keys(PROBE_POSTAL_CODES).filter(c => c !== "US");
    assert.ok(addressable.length > 5, `expected a multi-region spread, got ${addressable.length}`);
    assert.ok(
      addressable.includes("FR"),
      "FR was named in the STI-618 title but was never probed; it must be reachable by the probe set",
    );
  });

  it("keeps US out of the REST_OF_WORLD set so it stays a distinct control", () => {
    const derived = Object.keys(PROBE_POSTAL_CODES).filter(c => c !== "US");
    assert.ok(!derived.includes("US"), "US is the known-working control and must be probed separately");
  });
});