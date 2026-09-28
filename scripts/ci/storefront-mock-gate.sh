#!/usr/bin/env bash
# scripts/ci/storefront-mock-gate.sh
# Fails if the Shopify storefront client is not explicitly configured with
# `mock: false`, or if that value cannot be resolved at all.
#
# STI-517 (split out of STI-428). Record:
# docs/decisions/2026-09-27-data-provenance-baseline.md
#
# Why this gate exists. Three agents' AGENTS.md files asserted, for weeks, that
# the storefront ran `clients.storefront.mock = true`. That claim was false —
# the flag was set to `false` in f3ac83d (STI-319) and the parenthetical was
# simply never corrected. The documented failure mode was then exactly this: an
# agent trusting the stale sentence reads `mock: false`, concludes the file is
# wrong, and "restores compliance" by flipping it to `true` — breaking the live
# Storefront data path and the working cart.
#
# A comment in nuxt.config.ts cannot stop that; the comment is what a
# well-meaning agent argues past. So the invariant is enforced here instead, and
# enforced in the place that runs on every PR.
#
# Scope limit, stated honestly: this gate proves the *configured value*. It does
# not prove the Storefront token is valid (that secret is operator-owned and is
# never read here), and it does not prove a purchase can complete. Customer-
# reachable revenue is a separate question tracked by the operator go-live work;
# this gate only guarantees the data path stays wired to the real API.
#
# Usage: storefront-mock-gate.sh [path/to/nuxt.config.ts]
# The argument exists so the failure modes are directly testable.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
NUXT_CONFIG="${1:-$REPO_ROOT/nuxt.config.ts}"

if [ ! -f "$NUXT_CONFIG" ]; then
  echo "ERROR: nuxt.config.ts not found at: $NUXT_CONFIG"
  echo "Refusing to pass: a missing config is not a passing config."
  echo ""
  echo "The storefront MUST stay on the live Shopify data path. See"
  echo "docs/decisions/2026-09-27-data-provenance-baseline.md (STI-517)."
  exit 1
fi

python3 - "$NUXT_CONFIG" <<'PY'
import re
import sys

path = sys.argv[1]
src = open(path, encoding="utf-8").read()

# --- Blank out comments and string bodies, preserving offsets and newlines. ---
# Necessary, not cosmetic: the guard comment above the flag reads
# `Do NOT "restore" mock: true to match a document`, so a naive grep for
# `mock: true` matches the warning about the exact thing it forbids.
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
                if src[i] != "\n":
                    masked[i] = " "
                i += 1
        if i < n:
            i += 1
        continue
    i += 1
masked = "".join(masked)

FAILS = (
    "The storefront MUST stay on the live Shopify data path (mock: false).\n"
    "Flipping it to true serves fixtures instead of Shopify and breaks the cart\n"
    "and checkoutUrl. If a document or instruction file tells you mock is true,\n"
    "that document is wrong — see\n"
    "docs/decisions/2026-09-27-data-provenance-baseline.md (STI-428, STI-517)."
)


def fail(reason):
    print(f"ERROR: storefront mock gate: {reason}")
    print("")
    print(FAILS)
    sys.exit(1)


# --- Locate the `storefront:` object by brace matching. ---
m = re.search(r"\bstorefront\s*:\s*\{", masked)
if not m:
    fail("no `storefront: {` block found in nuxt.config.ts")

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
    fail("the `storefront: {` block is never closed; config is unparseable")

block = masked[m.end():close]

# --- Resolve every `mock:` key inside that block. ---
entries = list(re.finditer(r"\bmock\s*:\s*([^,\n}]+)", block))
if not entries:
    fail(
        "no `mock:` key inside the storefront client block. The storefront must "
        "state its mode explicitly — an absent key is not an implicit `false`"
    )
if len(entries) > 1:
    vals = [e.group(1).strip() for e in entries]
    fail(f"the storefront block declares `mock:` {len(entries)} times ({vals}); "
         "the intended mode is ambiguous")

# Report the value as written in the source, not the comment/string-masked
# copy used for parsing — otherwise a computed expression is echoed back with
# its string literals blanked out and the message is misleading.
raw_value = src[m.end() + entries[0].start(1):m.end() + entries[0].end(1)].strip()
value = entries[0].group(1).strip()
if value in ("false", "false as const", "falseasconst"):
    line = src.count("\n", 0, m.end() + entries[0].start()) + 1
    print(f"Storefront mock gate: mock: false (live Shopify data path), "
          f"nuxt.config.ts:{line}.")
    print("Storefront mock gate: passed")
    sys.exit(0)

if value == "true":
    fail("the storefront is in MOCK mode (`mock: true`) — the live Shopify data "
         "path is disabled on this branch")

fail(f"the storefront `mock:` value is {raw_value!r}, which is not the literal "
     "`false`; refusing to guess what a computed expression resolves to")
PY
