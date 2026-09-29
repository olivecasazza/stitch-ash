/**
 * Single source of truth for "is this checkout able to talk to the Admin API?".
 *
 * `scripts/shopify-env.ts` (doctor) and `src/catalog/shopify-admin.ts`
 * (buildAdminClient) previously each declared their own list of environment
 * variable names, and the two lists had drifted apart:
 *
 *   | variable                        | buildAdminClient | doctor (before) |
 *   |---------------------------------|------------------|-----------------|
 *   | SHOPIFY_ADMIN_STORE_DOMAIN      | yes              | yes             |
 *   | SHOPIFY_STOREFRONT_DOMAIN       | yes (fallback)   | NO              |
 *   | SHOPIFY_ADMIN_TOKEN             | yes              | NO              |
 *   | SHOPIFY_CLIENT_ID               | yes              | yes             |
 *   | SHOPIFY_CLIENT_SECRET           | yes              | yes             |
 *
 * Two real failures came out of that drift, both observed in run 8c61c86c:
 *
 * 1. A false red. The runtime resolves `SHOPIFY_STOREFRONT_DOMAIN` and mints a
 *    token from `SHOPIFY_CLIENT_ID`/`SHOPIFY_CLIENT_SECRET`, so `catalog:plan`
 *    reaches the live store. The doctor resolved none of those names, reported
 *    `SHOPIFY_ADMIN_STORE_DOMAIN missing` and `SHOPIFY_ADMIN_ACCESS_TOKEN
 *    missing`, and `shopify:doctor --strict` exited 1 — a blocking failure in
 *    an environment that demonstrably works. A readiness check that blocks a
 *    working checkout trains operators to ignore it.
 *
 * 2. A dead guard. The doctor's one check for a Shopify CLI automation token
 *    (`atkn_`) tested `SHOPIFY_ADMIN_ACCESS_TOKEN`, a name the runtime never
 *    reads. The runtime's own guard is on `SHOPIFY_ADMIN_TOKEN` — and that
 *    variable was set to an `atkn_…` value in the very run that hit the false
 *    red. So the hazard the doctor exists to catch was present, named
 *    correctly, and reported as a clean bill of health.
 *
 * The fix is to stop restating the names twice. `buildAdminClient` and the
 * doctor both resolve through `resolveAdminReadiness`, and
 * `env-readiness.test.ts` fails if `shopify-admin.ts` ever grows an
 * `process.env.X` this module does not know about.
 */

export type AdminAuthSource = "static" | "client_credentials" | "none";

export interface AdminReadinessEnv {
  SHOPIFY_ADMIN_STORE_DOMAIN?: string;
  SHOPIFY_STORE_DOMAIN?: string;
  SHOPIFY_STOREFRONT_DOMAIN?: string;
  SHOPIFY_ADMIN_TOKEN?: string;
  SHOPIFY_ADMIN_ACCESS_TOKEN?: string;
  SHOPIFY_CLIENT_ID?: string;
  SHOPIFY_CLIENT_SECRET?: string;
}

export interface AdminReadiness {
  /** Resolved store domain, including the hardcoded fallback. */
  domain: string;
  /** Name of the variable that supplied `domain`, or "default". */
  domainSource: string;
  /** How an Admin API token will actually be obtained. */
  authSource: AdminAuthSource;
  /**
   * True when the token variable holds a Shopify CLI automation token
   * (`atkn_…`). Those cannot call the Admin API; the runtime skips them and
   * falls through to the OAuth client-credentials path.
   */
  staticTokenIsAutomationToken: boolean;
  /** True when this checkout can actually mint or present an Admin token. */
  usable: boolean;
  /** Human-readable reasons `usable` is false. Empty when usable. */
  problems: string[];
}

/** Shopify CLI automation tokens are `atkn_`-prefixed and are not Admin API tokens. */
export function isAutomationToken(token: string | undefined): boolean {
  return Boolean(token && token.startsWith("atkn_"));
}

function firstSet(
  env: AdminReadinessEnv,
  names: readonly string[],
): { value: string | undefined; source: string } {
  for (const name of names) {
    const value = env[name as keyof AdminReadinessEnv];
    if (value && value.length > 0) return { value, source: name };
  }
  return { value: undefined, source: "none" };
}

/** Kept in sync with buildAdminClient's domain precedence. */
export const ADMIN_DOMAIN_ENV_NAMES = [
  "SHOPIFY_ADMIN_STORE_DOMAIN",
  "SHOPIFY_STOREFRONT_DOMAIN",
  "SHOPIFY_STORE_DOMAIN",
] as const;

export const DEFAULT_ADMIN_STORE_DOMAIN = "stitch-and-ash.myshopify.com";

export function resolveAdminReadiness(env: AdminReadinessEnv): AdminReadiness {
  const domain = firstSet(env, ADMIN_DOMAIN_ENV_NAMES);
  const staticToken = firstSet(env, ["SHOPIFY_ADMIN_TOKEN", "SHOPIFY_ADMIN_ACCESS_TOKEN"]);
  const clientId = env.SHOPIFY_CLIENT_ID;
  const clientSecret = env.SHOPIFY_CLIENT_SECRET;

  const hasStaticToken = Boolean(staticToken.value) && !isAutomationToken(staticToken.value);
  const hasClientCredentials = Boolean(clientId && clientSecret);

  let authSource: AdminAuthSource = "none";
  const problems: string[] = [];

  if (hasStaticToken) {
    authSource = "static";
  } else if (hasClientCredentials) {
    authSource = "client_credentials";
  } else {
    problems.push(
      "no usable Admin API credentials: set SHOPIFY_ADMIN_TOKEN to a real Admin API token " +
        "(never a Shopify CLI atkn_ token), or set SHOPIFY_CLIENT_ID and SHOPIFY_CLIENT_SECRET " +
        "to mint one via client credentials",
    );
  }

  return {
    domain: domain.value ?? DEFAULT_ADMIN_STORE_DOMAIN,
    domainSource: domain.source === "none" ? "default" : domain.source,
    authSource,
    staticTokenIsAutomationToken: Boolean(staticToken.value) && isAutomationToken(staticToken.value),
    usable: authSource !== "none",
    problems,
  };
}
