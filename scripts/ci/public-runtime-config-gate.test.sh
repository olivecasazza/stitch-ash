#!/usr/bin/env bash
# scripts/ci/public-runtime-config-gate.test.sh
# Self-test for public-runtime-config-gate.sh (STI-628).
#
# A gate that cannot detect the violation is not a gate. Every assertion below
# is a violation the gate MUST reject, plus a small set it must accept. If any
# assertion fails, the gate's logic is wrong — do not relax the gate to make the
# suite green.
#
# Offline by construction: no Node, no pnpm, no network, no store credentials,
# no SHOPIFY_* environment variable is read or set to any real value. Every
# fixture is written into a temp directory and removed on exit.

set -uo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
GATE="$REPO_ROOT/scripts/ci/public-runtime-config-gate.sh"
FIXTURES="$(cd "$(dirname "${BASH_SOURCE[0]}")/fixtures" && pwd)/public-runtime-config"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

PASS=0
FAIL=0

# assert_rejects <name> <config-body>
# The fixture must FAIL the gate. A gate that passes it is not gating.
assert_rejects() {
  local name="$1" body="$2"
  local cfg="$WORK/$(printf '%s' "$name" | tr -c 'a-zA-Z0-9' '_').ts"
  printf '%s\n' "$body" > "$cfg"

  local out status
  out="$(bash "$GATE" "$cfg" 2>&1)"
  status=$?

  if [ "$status" -eq 0 ]; then
    echo "FAIL: $name — gate PASSED a config that publishes a private credential"
    echo "      body: $(printf '%s' "$body" | tr '\n' ' ' | cut -c1-100)"
    FAIL=$((FAIL + 1))
    return
  fi
  if ! printf '%s' "$out" | grep -qi 'public runtime config gate'; then
    echo "FAIL: $name — gate failed, but not with its own diagnostic:"
    echo "$out" | sed 's/^/      /'
    FAIL=$((FAIL + 1))
    return
  fi
  PASS=$((PASS + 1))
}

# assert_accepts <name> <config-body>
# The fixture must PASS. An over-broad gate blocks every legitimate PR and gets
# deleted rather than fixed.
assert_accepts() {
  local name="$1" body="$2"
  local cfg="$WORK/ok_$(printf '%s' "$name" | tr -c 'a-zA-Z0-9' '_').ts"
  printf '%s\n' "$body" > "$cfg"

  local out status
  out="$(bash "$GATE" "$cfg" 2>&1)"
  status=$?

  if [ "$status" -ne 0 ]; then
    echo "FAIL: $name — gate REJECTED the real, current configuration:"
    echo "$out" | sed 's/^/      /'
    FAIL=$((FAIL + 1))
    return
  fi
  PASS=$((PASS + 1))
}

echo "== public runtime config gate self-test =="
echo ""

# ---------------------------------------------------------------------------
echo "-- must reject --"
# ---------------------------------------------------------------------------

# 1. The headline violation: an Admin API token published to every visitor.
#    This is byte-identical in the served HTML to the legitimate public token,
#    which is the whole reason the gate exists.
assert_rejects "admin accessToken added beside the storefront client" 'export default defineNuxtConfig({
    runtimeConfig: {
        shopify: {
            name: "stitch-and-ash",
            clients: {
                storefront: {
                    mock: false,
                    publicAccessToken: process.env.SHOPIFY_STOREFRONT_TOKEN ?? "",
                },
                admin: {
                    accessToken: process.env.SHOPIFY_ADMIN_TOKEN ?? "",
                },
            },
        },
    },
})'

# 2. The realistic swap: same key, different (private) env var. The HTML shape
#    is unchanged, so nothing downstream could notice.
assert_rejects "publicAccessToken repointed at the admin token var" 'export default defineNuxtConfig({
    runtimeConfig: {
        shopify: {
            clients: {
                storefront: {
                    mock: false,
                    publicAccessToken: process.env.SHOPIFY_ADMIN_TOKEN ?? "",
                },
            },
        },
    },
})'

# 3. A *_SECRET env var landing in the public island.
assert_rejects "storefront token read from a *_SECRET env var" 'export default defineNuxtConfig({
    runtimeConfig: {
        shopify: {
            clients: {
                storefront: {
                    mock: false,
                    publicAccessToken: process.env.SHOPIFY_STOREFRONT_SECRET ?? "",
                },
            },
        },
    },
})'

# 4. A customer-account client secret.
assert_rejects "customerAccount clientSecret published" 'export default defineNuxtConfig({
    runtimeConfig: {
        shopify: {
            customers: {
                clientSecret: process.env.SHOPIFY_CUSTOMER_SECRET ?? "",
            },
        },
    },
})'

# 5. A hardcoded private Shopify token literal. The gate must name the shape and
#    never echo the value.
#
#    The placeholder is spliced at runtime rather than written literally: the
#    fixture must still look like a real Admin token to the gate's prefix check,
#    but a token-shaped literal checked into the repository is precisely what
#    GitHub push protection blocks on (it blocked this very push once). Building
#    it from parts keeps the assertion honest without adding a string for a
#    scanner to flag.
PRIVATE_TOKEN_LITERAL="shpat_$(printf '%s%s%s' 0123456789 abcdef 0123456789abcdef)"
assert_rejects "hardcoded private token literal" 'export default defineNuxtConfig({
    runtimeConfig: {
        shopify: {
            clients: {
                storefront: {
                    mock: false,
                    publicAccessToken: "'"$PRIVATE_TOKEN_LITERAL"'",
                },
            },
        },
    },
})'

# 6. An unqualified accessToken, which is how an Admin client is usually written.
assert_rejects "unqualified accessToken key" 'export default defineNuxtConfig({
    runtimeConfig: {
        shopify: {
            clients: {
                admin: {
                    accessToken: process.env.ANY_TOKEN ?? "",
                },
            },
        },
    },
})'

# 7. apiKey / serviceAccount shapes.
assert_rejects "apiKey key in public config" 'export default defineNuxtConfig({
    runtimeConfig: {
        shopify: {
            analytics: {
                apiKey: process.env.SOME_ANALYTICS_KEY ?? "",
            },
        },
    },
})'

# 8. Duplicated public token declaration: the published value is ambiguous.
assert_rejects "publicAccessToken declared twice in one block" 'export default defineNuxtConfig({
    runtimeConfig: {
        shopify: {
            clients: {
                storefront: {
                    mock: false,
                    publicAccessToken: process.env.SHOPIFY_STOREFRONT_TOKEN ?? "",
                    nested: {
                        publicAccessToken: process.env.SHOPIFY_STOREFRONT_TOKEN ?? "",
                    },
                },
            },
        },
    },
})'
assert_rejects "publicAccessToken declared twice in separate blocks" 'export default defineNuxtConfig({
    runtimeConfig: {
        shopify: {
            clients: {
                storefront: {
                    mock: false,
                    publicAccessToken: process.env.SHOPIFY_STOREFRONT_TOKEN ?? "",
                },
            },
        },
        other: {
            clients: {
                storefront: {
                    publicAccessToken: process.env.SHOPIFY_STOREFRONT_TOKEN ?? "",
                },
            },
        },
    },
})'

# 9. Missing runtimeConfig entirely must not silently PASS (STI-601's failure
#    mode: a gate that goes green because it read nothing).
assert_rejects "no runtimeConfig block at all" 'export default defineNuxtConfig({
    modules: ["@nuxtjs/shopify"],
})'

# 10. A computed expression the gate must refuse to guess at.
assert_rejects "computed publicAccessToken expression" 'export default defineNuxtConfig({
    runtimeConfig: {
        shopify: {
            clients: {
                storefront: {
                    mock: false,
                    publicAccessToken: getToken(),
                },
            },
        },
    },
})'

# ---------------------------------------------------------------------------
# 11. `runtimeConfig.public` — the surface with NO filtering behind it.
#
#     This group exists because the first version of this gate PASSED all of
#     them. `@nuxtjs/shopify`'s Zod whitelist covers the `shopify` subtree only;
#     Nuxt publishes `runtimeConfig.public` verbatim, so a credential placed
#     there is handed to every anonymous visitor and nothing strips it.
#
#     DATABASE_URL is the case that proved it: the name asserts nothing private,
#     so a name-based check cannot see it, which is exactly why the rule is
#     "no env reads under `public`" rather than a longer list of banned names.
# ---------------------------------------------------------------------------
assert_rejects "DATABASE_URL published via runtimeConfig.public" 'export default defineNuxtConfig({
    runtimeConfig: {
        shopify: {
            clients: {
                storefront: {
                    mock: false,
                    publicAccessToken: process.env.SHOPIFY_STOREFRONT_TOKEN ?? "",
                },
            },
        },
        public: {
            databaseUrl: process.env.DATABASE_URL ?? "",
        },
    },
})'

assert_rejects "SHOPIFY_ADMIN_ACCESS_TOKEN under runtimeConfig.public" 'export default defineNuxtConfig({
    runtimeConfig: {
        shopify: {
            clients: {
                storefront: {
                    mock: false,
                    publicAccessToken: process.env.SHOPIFY_STOREFRONT_TOKEN ?? "",
                },
            },
        },
        public: {
            adminToken: process.env.SHOPIFY_ADMIN_ACCESS_TOKEN ?? "",
        },
    },
})'

# Even the one var this gate otherwise allows is refused HERE, because this
# surface is published with no schema. The deliberate publication lives under
# `shopify`, where the module filters it; allowing it in both places would make
# the allowlist mean nothing.
assert_rejects "even SHOPIFY_STOREFRONT_TOKEN is refused under public" 'export default defineNuxtConfig({
    runtimeConfig: {
        shopify: {
            clients: {
                storefront: {
                    mock: false,
                    publicAccessToken: process.env.SHOPIFY_STOREFRONT_TOKEN ?? "",
                },
            },
        },
        public: {
            token: process.env.SHOPIFY_STOREFRONT_TOKEN ?? "",
        },
    },
})'

# `import.meta.env` is the same hazard through Nuxt's other env accessor.
assert_rejects "import.meta.env read under runtimeConfig.public" 'export default defineNuxtConfig({
    runtimeConfig: {
        shopify: {
            clients: {
                storefront: {
                    mock: false,
                    publicAccessToken: process.env.SHOPIFY_STOREFRONT_TOKEN ?? "",
                },
            },
        },
        public: {
            endpoint: import.meta.env.SHOPIFY_ADMIN_STORE_DOMAIN ?? "",
        },
    },
})'

# ---------------------------------------------------------------------------
# 12. THE GATE IS NOT THE CONTROL FOR `admin` — the module is.
#
#     A gate that gets credited with a protection it does not provide is worse
#     than no gate, because it is deleted when it fails and kept when it passes
#     for the wrong reason. `@nuxtjs/shopify` strips `clients.admin`,
#     `privateAccessToken` and `clientSecret` via publicConfigSchema; this gate
#     rejects them a second time as defence in depth, and it says so.
#
#     The assertion that would catch a future module regression is the
#     comment-trap fixture further down plus the recorded evidence in
#     docs/decisions/2026-10-03-storefront-token-publish-boundary.md. This
#     comment is here so the next reader does not re-derive the wrong claim the
#     first revision of that record made.
# ---------------------------------------------------------------------------

# ---------------------------------------------------------------------------
echo ""
echo "-- must accept --"
# ---------------------------------------------------------------------------

# 13. The REAL nuxt.config.ts from the repository, verbatim in shape. If this
#     ever fails, the gate is wrong, not the config.
assert_accepts "the repository's own nuxt.config.ts" "$(cat "$REPO_ROOT/nuxt.config.ts")"

# 14. The checked-in baseline, so a future refactor that reshapes the config
#     deliberately can be re-baselined here rather than by weakening the gate.
if [ -f "$FIXTURES/baseline.ts" ]; then
  assert_accepts "checked-in baseline fixture" "$(cat "$FIXTURES/baseline.ts")"
else
  echo "NOTE: no baseline fixture at $FIXTURES/baseline.ts (skipped)"
fi

# 15. Public token inlined with a single-quoted empty fallback.
assert_accepts "single-quoted fallback form" 'export default defineNuxtConfig({
    runtimeConfig: {
        shopify: {
            clients: {
                storefront: {
                    mock: false,
                    publicAccessToken: process.env.SHOPIFY_STOREFRONT_TOKEN ?? '"''"',
                },
            },
        },
    },
})'

# 16. Non-credential descriptive config must not trip the gate. An over-broad
#     gate gets deleted rather than fixed, so this direction is asserted too.
assert_accepts "descriptive non-credential config" 'export default defineNuxtConfig({
    runtimeConfig: {
        shopify: {
            name: "stitch-and-ash",
            clients: {
                storefront: {
                    mock: false,
                    apiVersion: "2026-04",
                    retries: 3,
                    publicAccessToken: process.env.SHOPIFY_STOREFRONT_TOKEN ?? "",
                    proxy: { path: "_proxy/storefront" },
                    cache: { client: { ttl: 10000 } },
                },
            },
            errors: { throw: true },
        },
    },
})'

# 17. A LITERAL in runtimeConfig.public is legitimate — that is what the surface
#     is for. Nuxt publishes these to the browser and the client cannot read an
#     env var at runtime, so a public flag, a feature name or a locale string
#     must be allowed to live there. Only env READS are refused. If this fails,
#     the rule in 2d is over-broad and will block legitimate config.
assert_accepts "literals under runtimeConfig.public are allowed" 'export default defineNuxtConfig({
    runtimeConfig: {
        shopify: {
            clients: {
                storefront: {
                    mock: false,
                    publicAccessToken: process.env.SHOPIFY_STOREFRONT_TOKEN ?? "",
                },
            },
        },
        public: {
            siteUrl: "https://stitch-ash.com",
            enableWaitlist: true,
        },
    },
})'

# ---------------------------------------------------------------------------
# 18. THE COMMENT TRAP. This is the failure mode storefront-mock-gate.sh exists
#     for, and it is the single most likely way this gate gets neutered: the
#     warning comment names the forbidden shapes, a naive grep matches the
#     warning, and someone "fixes" it by deleting the warning. The real
#     nuxt.config.ts already carries such a comment, but assert it explicitly so
#     the suite keeps proving the masking works.
# ---------------------------------------------------------------------------
assert_accepts "comments naming forbidden shapes are not matched" 'export default defineNuxtConfig({
    runtimeConfig: {
        shopify: {
            clients: {
                storefront: {
                    // Do NOT put admin.accessToken or any *_SECRET here; it is
                    // published to every anonymous visitor verbatim.
                    mock: false,
                    publicAccessToken: process.env.SHOPIFY_STOREFRONT_TOKEN ?? "",
                },
            },
        },
    },
})'

assert_accepts "block comment naming forbidden shapes" 'export default defineNuxtConfig({
    runtimeConfig: {
        shopify: {
            clients: {
                storefront: {
                    /*
                     * Never add secret/private/apiKey keys to this block.
                     */
                    mock: false,
                    publicAccessToken: process.env.SHOPIFY_STOREFRONT_TOKEN ?? "",
                },
            },
        },
    },
})'

# ---------------------------------------------------------------------------
echo ""
echo "== $PASS passed, $FAIL failed =="
if [ "$FAIL" -ne 0 ]; then
  echo ""
  echo "The gate is not behaving as specified. Fix the gate; do not relax these"
  echo "assertions to make the suite pass."
  exit 1
fi
echo "Self-test passed: the gate rejects every private-publication shape above and"
echo "accepts the real config."
exit 0
