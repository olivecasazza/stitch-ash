#!/usr/bin/env bash
# scripts/ci/public-runtime-config-gate.sh
# Fails if the PUBLIC runtime config in nuxt.config.ts carries anything that is
# not a deliberately published, anonymous-capability value.
#
# STI-628. Record:
# docs/decisions/2026-10-03-storefront-token-publish-boundary.md
#
# Why this gate exists.
#
# The served storefront HTML contains
#   window.__NUXT__.config.public._shopify.clients.storefront.publicAccessToken
# handed to every anonymous visitor. qa-verifier filed that as a publish-boundary
# question (STI-628) because the repo had no automated check on that boundary.
# The value IS a Shopify Storefront *public* access token, which is designed to
# reach browsers, so the finding was not a credential leak. That is now recorded
# in the decision doc above.
#
# But "this one value is fine" is a property of the CURRENT config, and nothing
# in the repo asserted it. Two surfaces are genuinely unguarded:
#
#   1. `runtimeConfig.public` is published VERBATIM by Nuxt — no whitelist, no
#      filtering. `@nuxtjs/shopify`'s schema covers only the `shopify` subtree,
#      so a value placed in `runtimeConfig.public` reaches every anonymous
#      visitor exactly as written and no module stops it.
#   2. The schema constrains which KEYS are published, never which VALUE fills
#      them. Repointing `publicAccessToken` at `SHOPIFY_ADMIN_TOKEN` satisfies
#      the schema and publishes an Admin token, with the HTML shape unchanged so
#      no downstream diff would notice.
#
# WHAT THE MODULE ALREADY DOES, so this gate is not credited with work that is
# not its own: `@nuxtjs/shopify` runs every config through a Zod whitelist
# (`publicConfigSchema.parse()`, dist/module.mjs:164) which omits
# `privateAccessToken`, `customerAccount.clientSecret` and the whole `admin`
# client. Those are stripped by the MODULE, verified against the pinned 0.5.4.
# This gate is the second layer, for the two surfaces above that the whitelist
# does not cover.
#
# This gate is static, offline, reads no environment variable and no secret, and
# needs no store.
#
# WHAT THIS GATE IS NOT, stated plainly so nobody over-reads it green:
#   - It does NOT prove the token is valid, or what it is scoped to. That is an
#     operator-owned fact about a live credential (HARD RULE 5: never read it).
#   - It does NOT prove a private token cannot reach the browser by another
#     route (a bundle, a hardcoded literal, a page fetch). It checks the ONE
#     place this repo decides what is public.
#   - It does NOT prove the public token is not over-privileged. That was
#     measured once, out of band: an Admin-API probe with the public token
#     returned HTTP 401. That is evidence in the decision doc, not a gate.
#   - It is NOT the control that strips `admin.accessToken`; the module whitelist
#     is. `package.json` requests `@nuxtjs/shopify@latest`, so an unpinned
#     upgrade that loosens that schema would remove that protection without any
#     check here failing.
#
# Usage: public-runtime-config-gate.sh [path/to/nuxt.config.ts]
# The argument exists so the failure modes are directly testable.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
NUXT_CONFIG="${1:-$REPO_ROOT/nuxt.config.ts}"

if [ ! -f "$NUXT_CONFIG" ]; then
  echo "ERROR: nuxt.config.ts not found at: $NUXT_CONFIG"
  echo "Refusing to pass: a config that cannot be read is not a reviewed config."
  echo ""
  echo "This gate exists so the public runtime config cannot be widened without"
  echo "a deliberate PR. See"
  echo "docs/decisions/2026-10-03-storefront-token-publish-boundary.md (STI-628)."
  exit 1
fi

python3 - "$NUXT_CONFIG" <<'PY'
import re
import sys

path = sys.argv[1]
src = open(path, encoding="utf-8").read()

# --- Blank out comments and string bodies, preserving offsets and newlines. ---
# Same technique storefront-mock-gate.sh uses, for the same reason: the comments
# in nuxt.config.ts literally contain the words this gate forbids ("Do NOT
# restore mock: true", "*_SECRET"), so a naive grep matches the warning about the
# exact thing it forbids. Offsets are preserved so parse errors can be reported
# against real line numbers.
masked = list(src)
newlines = []
i = 0
n = len(src)
while i < n:
    c = src[i]
    if c == "/" and i + 1 < n and src[i + 1] == "/":
        while i < n and src[i] != "\n":
            masked[i] = " "
            i += 1
        continue
    if c == "/" and i + 1 < n and src[i + 1] == "*":
        end = src.find("*/", i + 2)
        end = n if end == -1 else end + 2
        for k in range(i, end):
            if masked[k] != "\n":
                masked[k] = " "
        i = end
        continue
    if c in "\"'`":
        quote = c
        i += 1
        while i < n and src[i] != quote:
            if src[i] == "\\":
                masked[i] = " "
                i += 1
            if i < n:
                if masked[i] != "\n":
                    masked[i] = " "
                i += 1
        if i < n:
            i += 1
        continue
    i += 1
masked = "".join(masked)


def lineno(offset):
    return src.count("\n", 0, offset) + 1


FAILS = (
    "The PUBLIC runtime config is served to every anonymous visitor verbatim.\n"
    "Only anonymous-capability values belong there. An Admin API token, a\n"
    "customer-account secret, or anything named *_SECRET / *_KEY / *_PRIVATE in\n"
    "that island is published to the internet on the next deploy.\n"
    "\n"
    "Two different surfaces, two different rules:\n"
    "\n"
    "  runtimeConfig.shopify  is filtered by @nuxtjs/shopify, which strips\n"
    "    admin, privateAccessToken and customerAccount.clientSecret by name. Do\n"
    "    not rely on that as your control, and do not fight it either.\n"
    "\n"
    "  runtimeConfig.public  has NO filtering at all. Nuxt publishes it as\n"
    "    written. Anything read from the environment there reaches every\n"
    "    visitor, so keep credentials out of it entirely.\n"
    "\n"
    "To pass a private credential to server code, keep it out of runtimeConfig\n"
    "and read it inside a server route (or a Nitro/Nuxt server plugin), where\n"
    "it stays server-only. See\n"
    "docs/decisions/2026-10-03-storefront-token-publish-boundary.md (STI-628)."
)


def fail(reason, offset=None):
    where = ""
    if offset is not None:
        where = f" (nuxt.config.ts:{lineno(offset)})"
    print(f"ERROR: public runtime config gate: {reason}{where}")
    print("")
    print(FAILS)
    sys.exit(1)


# --- 1. Locate the `runtimeConfig` block. -------------------------------------
# `runtimeConfig` at the top level is what Nuxt splits into server `config` and
# client `config.public`. Only that object's contents are published; keys outside
# it are not runtime config at all.
m = re.search(r"\bruntimeConfig\s*:\s*\{", masked)
if not m:
    fail("no `runtimeConfig: {` block found in nuxt.config.ts; there is nothing "
         "to review, but a storefront with no declared runtime config cannot be "
         "cleared by this gate")

depth = 0
close = None
for idx in range(m.end() - 1, n):
    if masked[idx] == "{":
        depth += 1
    elif masked[idx] == "}":
        depth -= 1
        if depth == 0:
            close = idx
            break
if close is None:
    fail("the `runtimeConfig: {` block is never closed; config is unparseable")

block = masked[m.end():close]
base = m.end()

# --- 2. No key that names a private capability may be published. -------------
# Collect every `key: value` pair inside runtimeConfig with the value expression
# as written. Depth-aware, so a nested `clients: { admin: { ... } }` is found by
# its own leaf keys rather than only by its parent.

entries = []


def walk(seg, seg_base, path):
    """Yield (key, value_text, abs_offset, key_path) for every `key: value`."""
    for km in re.finditer(r"\b([A-Za-z_$][\w$]*)\s*:", seg):
        key = km.group(1)
        # value runs to the next comma or closing brace at this level
        vstart = km.end()
        v = vstart
        nest = 0
        while v < len(seg):
            ch = seg[v]
            if ch in "{[(":
                nest += 1
            elif ch in "}])":
                if nest == 0:
                    break
                nest -= 1
            elif ch == "," and nest == 0:
                break
            v += 1
        value = seg[vstart:v]
        here = path + (key,)
        entries.append((key, value, seg_base + km.start(), here))
        if value.strip().startswith("{"):
            walk(value, seg_base + vstart, here)


walk(block, base, ())

# Anything whose NAME asserts privacy. Checked against the key itself and the
# env-var / function name in its value, because `accessToken:
# process.env.SHOPIFY_ADMIN_TOKEN` is the real accident and the key alone does
# not describe it.
PRIVATE_NAME = re.compile(
    r"(admin|secret|private|credential|password|passwd|appkey|app_key|apikey|api_key"
    r"|accessKey|access_key|sessionSecret|webhookSecret)",
    re.IGNORECASE,
)

# A value that reads a private env var. `SHOPIFY_STOREFRONT_TOKEN` is the one
# permitted source for the public token; anything else named *_SECRET / *_KEY /
# *_PRIVATE / containing ADMIN is refused wherever it appears.
PRIVATE_ENV = re.compile(
    r"process\.env(?:\.([A-Za-z_$][\w$]*)|\[['\"]([^'\"]+)['\"]\])"
    r"|\bimport\.meta\.env(?:\.([A-Za-z_$][\w$]*)|\[['\"]([^'\"]+)['\"]\])",
)

ALLOWED_ENV_SOURCES = {"SHOPIFY_STOREFRONT_TOKEN"}

# `runtimeConfig.public` is published VERBATIM by Nuxt: no schema, no filtering,
# no module in between. Anything under it goes to every anonymous visitor
# exactly as written, so the rule there is stricter than the name-based checks
# above — an env read under `public` is a finding on the strength of being an
# env read, regardless of what the variable is called. `DATABASE_URL` is the
# case that motivated this: its name asserts nothing private, so a name-based
# check cannot see it, and the first version of this gate passed it.
def under_public(key_path):
    return bool(key_path) and key_path[0].lower() == "public"


findings = []

for key, value, off, key_path in entries:
    key_l = key.lower()

    # --- 2a. A key that asserts a private capability. ---
    if PRIVATE_NAME.search(key) and key_l != "privateaccesstoken":
        findings.append(
            f"`{key}` is a private-capability key inside the public runtime config"
        )

    # --- 2b. An unqualified private token key. ---
    # `accessToken` and `refreshToken` are not forbidden in themselves: the
    # Storefront client legitimately declares `publicAccessToken`, and the
    # substring test in 2a does not match those names. Only an UNQUALIFIED one
    # is a finding.
    if key_l in ("accesstoken", "refreshtoken", "clientsecret", "token"):
        findings.append(
            f"`{key}` is an unqualified token key; `publicAccessToken` is the "
            f"only token key allowed in the public runtime config"
        )

    # --- 2c. A value that reads a private env var. ---
    for em in PRIVATE_ENV.finditer(value):
        var = next((g for g in em.groups() if g), None)
        if var is None:
            continue
        # --- 2d. Anything under `runtimeConfig.public`. ---
        # Checked before the allowance below, because this surface has no
        # whitelist behind it: nothing downstream will strip a bad value here,
        # so the gate does not get to reason about which vars are "probably
        # fine". The one deliberate publication lives under `shopify`, not here.
        #
        # Only the leaf is reported. A container key's value text spans its whole
        # subtree, so `public: { databaseUrl: ... }` would otherwise be reported
        # twice — once as `public` and once as `public.databaseUrl` — and two
        # findings for one mistake trains people to skim the output.
        if under_public(key_path) and not value.strip().startswith(("{", "[")):
            findings.append(
                f"`{'.'.join(key_path)}` reads ${{{var}}} — `runtimeConfig.public` "
                f"is published to every anonymous visitor verbatim, with no "
                f"schema and no filtering. Publish a literal or a build-time "
                f"constant there, never a credential"
            )
            continue
        if var in ALLOWED_ENV_SOURCES:
            continue
        if PRIVATE_NAME.search(var):
            findings.append(
                f"`{'.'.join(key_path)}` reads ${{{var}}} — that env var name "
                f"asserts a private credential"
            )
        elif var.startswith("SHOPIFY_"):
            findings.append(
                f"`{'.'.join(key_path)}` reads ${{{var}}} — only "
                f"SHOPIFY_STOREFRONT_TOKEN may be published; other SHOPIFY_* vars "
                f"are operator-owned secrets"
            )

# --- 3. The storefront public token must come from the one allowed source. ----
# This is the assertion that would catch a real swap: the key is still named
# publicAccessToken, the HTML is unchanged in shape, but the value is now an
# Admin token read from a different var.
pat_list = list(re.finditer(r"\bpublicAccessToken\s*:", masked))
if not pat_list:
    fail("no `publicAccessToken:` in the runtime config. The storefront must "
         "state its public credential explicitly — an absent key is not an "
         "implicit 'no token', and this gate cannot clear a config it cannot read")
if len(pat_list) > 1:
    findings.append(
        f"`publicAccessToken:` is declared {len(pat_list)} times; the intended "
        f"published credential is ambiguous"
    )

for pm in pat_list:
    vstart = pm.end()
    v = vstart
    nest = 0
    while v < n:
        ch = masked[v]
        if ch in "{[(":
            nest += 1
        elif ch in "}])":
            if nest == 0:
                break
            nest -= 1
        elif ch in ",\n" and nest == 0:
            break
        v += 1
    raw = src[vstart:v].strip()

    if raw == "process.env.SHOPIFY_STOREFRONT_TOKEN ?? ''" or \
       raw == "process.env.SHOPIFY_STOREFRONT_TOKEN ?? \"\"":
        continue

    # Report what was found with the value's shape, never the value: this gate
    # must be safe to run in CI logs.
    srcs = [g for g in next(
        (m.groups() for m in PRIVATE_ENV.finditer(masked[vstart:v])), ()) if g]
    if srcs:
        findings.append(
            f"`publicAccessToken:` reads ${{{srcs[0]}}} — the published storefront "
            f"credential must be exactly process.env.SHOPIFY_STOREFRONT_TOKEN"
        )
    elif re.search(r"['\"]\s*(shpat_|shpss_|shpca_|shppa_)", masked[vstart:v]):
        findings.append(
            "`publicAccessToken:` is a hardcoded literal that looks like a "
            "private Shopify credential (shpat_/shpca_/shpss_ prefix)"
        )
    else:
        findings.append(
            f"`publicAccessToken:` is `{raw}` — refusing to guess what an "
            f"expression resolves to; the published value must be exactly "
            f"process.env.SHOPIFY_STOREFRONT_TOKEN"
        )

# --- 4. Report. --------------------------------------------------------------
if findings:
    print(f"ERROR: public runtime config gate: {len(findings)} finding(s) in the "
          f"config Nuxt publishes to every anonymous visitor:")
    print("")
    seen = set()
    for f in findings:
        if f in seen:
            continue
        seen.add(f)
        print(f"  - {f}")
    print("")
    print(FAILS)
    sys.exit(1)

print("Public runtime config gate: checked runtimeConfig keys and env sources;")
print("only SHOPIFY_STOREFRONT_TOKEN is read into the published config, and no")
print("private-capability key is present (STI-628).")
print("Public runtime config gate: passed")
sys.exit(0)
PY
