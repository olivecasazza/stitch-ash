import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  ADMIN_DOMAIN_ENV_NAMES,
  DEFAULT_ADMIN_STORE_DOMAIN,
  isAutomationToken,
  resolveAdminReadiness,
} from "./env-readiness";

/**
 * Regression tests for the readiness/env-name drift.
 *
 * The defect: `scripts/shopify-env.ts` (doctor) and
 * `src/catalog/shopify-admin.ts` (buildAdminClient) each declared their own
 * list of environment variable names, and the lists had drifted. The observed
 * failure in run 8c61c86c was a false red — `shopify:doctor --strict` exited 1
 * in an environment where `catalog:plan` demonstrably reached the live store —
 * plus a guard that could never fire, because the doctor's `atkn_` check tested
 * a variable name the runtime never reads.
 *
 * The last test in this file is the one that matters most: it fails if
 * shopify-admin.ts ever grows a `process.env.X` that env-readiness.ts does not
 * model, which is how the drift came back in the first place.
 */

test("a client-credentials environment is usable even with no domain variable", () => {
  const readiness = resolveAdminReadiness({
    SHOPIFY_CLIENT_ID: "cid",
    SHOPIFY_CLIENT_SECRET: "csecret",
  });

  assert.equal(readiness.usable, true);
  assert.equal(readiness.authSource, "client_credentials");
  assert.equal(readiness.domain, DEFAULT_ADMIN_STORE_DOMAIN);
  assert.equal(readiness.domainSource, "default");
});

test("the runtime's own domain variable is honoured", () => {
  // SHOPIFY_STOREFRONT_DOMAIN is what buildAdminClient falls back to, and it is
  // the variable actually wired in this deployment. The old doctor did not read
  // it, so it reported the domain as missing here.
  const readiness = resolveAdminReadiness({
    SHOPIFY_STOREFRONT_DOMAIN: "stitch-and-ash.myshopify.com",
    SHOPIFY_CLIENT_ID: "cid",
    SHOPIFY_CLIENT_SECRET: "csecret",
  });

  assert.equal(readiness.domain, "stitch-and-ash.myshopify.com");
  assert.equal(readiness.domainSource, "SHOPIFY_STOREFRONT_DOMAIN");
  assert.equal(readiness.usable, true);
});

test("a real admin token is usable", () => {
  const readiness = resolveAdminReadiness({ SHOPIFY_ADMIN_TOKEN: "shpat_real" });
  assert.equal(readiness.usable, true);
  assert.equal(readiness.authSource, "static");
});

test("a Shopify CLI automation token is not usable as an Admin API token", () => {
  // This is the exact hazard the doctor exists to catch. It was set in the run
  // that produced the false red, and the doctor reported a clean bill of health.
  assert.equal(isAutomationToken("atkn_deadbeef"), true);

  const readiness = resolveAdminReadiness({ SHOPIFY_ADMIN_TOKEN: "atkn_deadbeef" });
  assert.equal(readiness.usable, false);
  assert.equal(readiness.authSource, "none");
  assert.equal(readiness.staticTokenIsAutomationToken, true);
  assert.ok(readiness.problems.length > 0);
});

test("an automation token falls through to client credentials when they exist", () => {
  const readiness = resolveAdminReadiness({
    SHOPIFY_ADMIN_TOKEN: "atkn_deadbeef",
    SHOPIFY_CLIENT_ID: "cid",
    SHOPIFY_CLIENT_SECRET: "csecret",
  });

  assert.equal(readiness.usable, true);
  assert.equal(readiness.authSource, "client_credentials");
  // The hazard is still reported even though the run succeeds.
  assert.equal(readiness.staticTokenIsAutomationToken, true);
});

test("no credentials at all is unusable and says why", () => {
  const readiness = resolveAdminReadiness({});
  assert.equal(readiness.usable, false);
  assert.equal(readiness.authSource, "none");
  assert.match(readiness.problems.join(" "), /SHOPIFY_ADMIN_TOKEN/);
  assert.match(readiness.problems.join(" "), /SHOPIFY_CLIENT_ID/);
});

test("the runtime never reads an env var that readiness does not model", () => {
  const source = readFileSync(new URL("./shopify-admin.ts", import.meta.url), "utf8");

  const modelled = new Set<string>([
    ...ADMIN_DOMAIN_ENV_NAMES,
    "SHOPIFY_ADMIN_TOKEN",
    "SHOPIFY_ADMIN_ACCESS_TOKEN",
    "SHOPIFY_CLIENT_ID",
    "SHOPIFY_CLIENT_SECRET",
  ]);

  const referenced = [...source.matchAll(/process\.env\.([A-Z0-9_]+)/g)].map(match => match[1]!);
  assert.ok(referenced.length > 0, "expected shopify-admin.ts to read process.env at all");

  const unmodelled = [...new Set(referenced)].filter(name => !modelled.has(name));
  assert.deepEqual(
    unmodelled,
    [],
    `shopify-admin.ts reads ${unmodelled.join(", ")}, which resolveAdminReadiness does not model. ` +
      "The doctor and the runtime would disagree about this variable again. Add it to env-readiness.ts.",
  );
});

test("the doctor no longer hardcodes its own env var list", () => {
  // The doctor must resolve through the same module. If it restates the names,
  // the two can drift apart silently a second time.
  const source = readFileSync(new URL("../../scripts/shopify-env.ts", import.meta.url), "utf8");

  assert.match(source, /resolveAdminReadiness/, "doctor must resolve through src/catalog/env-readiness.ts");

  const inlineReads = [...source.matchAll(/env\("(SHOPIFY_[A-Z0-9_]+)"\)/g)].map(match => match[1]!);
  assert.deepEqual(
    [...new Set(inlineReads)],
    [],
    "doctor should not read SHOPIFY_* names directly; resolveAdminReadiness owns that list",
  );
});
