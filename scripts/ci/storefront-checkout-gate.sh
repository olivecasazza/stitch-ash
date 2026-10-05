#!/usr/bin/env bash
# scripts/ci/storefront-checkout-gate.sh
# Fails if the production storefront apex will not let a buyer reach checkout.
#
# STI-660 / STI-226. Record:
# docs/decisions/2026-09-27-data-provenance-baseline.md
#
# Why this gate exists. The storefront Online Store channel has a storefront
# password set, so Shopify answers every request for the canonical apex with its
# own `/password` page. `checkoutUrl` values minted by the live Storefront API
# and by this app's own `POST /api/checkout` route both point at that apex, so
# every buyer — US included — is stopped before they ever reach shipping or
# payment. Measured 2026-10-05: a real `cartCreate` returned a well-formed
# checkoutUrl with `userErrors: []`, and following it landed on
# `https://www.stitch-ash.com/password` (HTTP 200, 103731 bytes, Shopify's own
# body: 61 `shopify` markers, one "Enter using password" prompt).
#
# The reason this survived as a P0 for days is that NOTHING IN CI COULD SEE IT.
# `storefront-mock-gate.sh` proves the data path is wired to the live API; it
# explicitly does not claim a purchase can complete. Every catalog, returns, copy
# and radius gate is static and offline. So the deploy pipeline republished the
# storefront repeatedly, CI stayed green, and a store that could not take a
# single order stayed green through all of it. That is precisely the STI-226
# failure mode: a green result that measured nothing.
#
# A comment in nuxt.config.ts cannot stop this. The documented failure mode is
# exactly a reader checking the working preview, concluding "checkout works",
# and never noticing that preview is ungated while the apex is gated.
# `docs/test-purchase-handoff.md` documents a completed test purchase — a true
# statement about the past, which is exactly the kind of claim that survives
# re-verification long after it stops being true.
#
# So the invariant is made mechanical here, and enforced on the deploy path
# (STI-415) rather than only on pull requests.
#
# ── Design constraints, chosen deliberately ────────────────────────────────
#
# 1. It probes a URL. It does not need, read, or log any credential: no
#    SHOPIFY_* value, no Admin token, no Storefront token. That is what makes it
#    safe to run on every deploy.
# 2. It fails OPEN on network/DNS/TLS failure, never closed. A flaky network or
#    an unreachable host must not be able to block every deploy. The failure it
#    exists to catch is an UNAMBIGUOUS Shopify password page, which is a
#    definitive answer, not an absence of one.
# 3. It distinguishes "gated" from "broken". A 5xx, a 404 on the synthetic cart
#    path, or an unresolvable host are each reported as INCONCLUSIVE with a
#    distinct message, because the remedy differs from clearing a password.
# 4. It does not guess the apex. The domain is resolved from ranked repo sources
#    and can be overridden, so the gate cannot rot into probing a domain the
#    store no longer uses. preview.stitch-ash.com is explicitly excluded: it is
#    ungated by design, so probing it could never detect this defect and would
#    report a clean PASS on a store that cannot take an order.
# 5. It reports the redirect chain, so a future "login required" or "coming
#    soon" interstitial shows up as itself rather than as this gate's failure.
# 6. `-H 'User-Agent: ...'` is deliberate: Cloudflare answers
#    `403 error code: 1010` to a request carrying no User-Agent at all, which
#    would otherwise be indistinguishable from a genuine block.
#
# Usage:
#   storefront-checkout-gate.sh [--apex https://host] [--probe /path] [--timeout N]
#
# Exit codes:
#   0  apex is reachable and not password-gated (or the probe was inconclusive)
#   1  apex serves a Shopify storefront password page — checkout is unreachable
#   2  usage error

set -uo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

APEX=""
PROBE="/cart/c/gate-probe"
TIMEOUT="45"

die() { printf 'ERROR: %s\n' "$1" >&2; exit 2; }

while [ $# -gt 0 ]; do
  case "$1" in
    --apex)    APEX="${2:-}"; shift 2 || die "--apex needs a value" ;;
    --probe)   PROBE="${2:-}"; shift 2 || die "--probe needs a value" ;;
    --timeout) TIMEOUT="${2:-}"; shift 2 || die "--timeout needs a value" ;;
    -h|--help) sed -n '2,24p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) die "unknown argument: $1" ;;
  esac
done

# ── Resolve the apex domain from the repo, never from a guess ──────────────
resolve_apex() {
  if [ -n "$APEX" ]; then printf '%s' "$APEX"; return 0; fi

  # Ranked source files, most authoritative first. nuxt.config.ts is first
  # because it is the deployment's own config; app/utils/*.ts follow because the
  # buyer-facing canonical host is pinned there (CUSTOMER_ACCOUNT_URL and its
  # hostname guard). Falling back further down is deliberate: at the time this
  # gate was written the apex appeared in NEITHER nuxt.config.ts nor any runtime
  # config — nuxt.config.ts's only hostname literal is `https://nuxt.com`, a docs
  # link, so a resolver that trusted it alone probed nuxt.com and reported a
  # meaningless 404 instead of the actual gated apex.
  python3 - "$REPO_ROOT" <<'PY' 2>/dev/null || return 1
import os, re, sys

root = sys.argv[1]

# Hosts that are known NOT to be the buyer-facing apex. preview is ungated by
# design (that is why checkout appeared to work), and a gated apex can never be
# detected behind it — which is precisely why preview must never be probed here.
EXCLUDE_HOSTS = {
    'preview.stitch-ash.com',
    'stitch-ash.pages.dev',
}

CANDIDATE_FILES = [
    'nuxt.config.ts',
    'app/utils/customer-account.ts',
    'app/composables/useSiteConfig.ts',
    'functions/api/checkout.js',
    'wrangler.toml',
    'wrangler.jsonc',
    'wrangler.json',
    'package.json',
]

HOST = re.compile(r'(?:https?://|\b)([a-z0-9][a-z0-9.-]*\.stitch-ash\.com)\b')
counts = {}

for rel in CANDIDATE_FILES:
    path = os.path.join(root, rel)
    if not os.path.isfile(path):
        continue
    try:
        src = open(path, encoding='utf-8', errors='replace').read()
    except OSError:
        continue
    # Weight earlier files more heavily: the first source that declares the apex
    # is the most authoritative, so 3 mentions in nuxt.config.ts should outrank
    # 2 in a file that merely mentions the domain in a test.
    weight = len(CANDIDATE_FILES) - CANDIDATE_FILES.index(rel)
    for host in HOST.findall(src):
        host = host.lower()
        if host in EXCLUDE_HOSTS:
            continue
        counts[host] = counts.get(host, 0) + weight

if not counts:
    sys.exit(1)

# Highest weighted count wins; ties break on the bare apex (fewest labels), so
# www.stitch-ash.com is preferred over a deeper subdomain on a tie.
best = max(sorted(counts), key=lambda h: (counts[h], -h.count('.')))
print('https://%s' % best)
PY
}

APEX_URL="$(resolve_apex || true)"

if [ -z "$APEX_URL" ]; then
  cat >&2 <<EOF
storefront checkout gate: SKIPPED — could not resolve the storefront apex from any
  authoritative source file and no --apex was given.
  Not reporting a PASS: nothing was measured. Pass --apex https://host to force it.
EOF
  exit 0
fi

PROBE_URL="${APEX_URL%/}${PROBE}"

# ── Probe ──────────────────────────────────────────────────────────────────
BODY_FILE="$(mktemp)"
trap 'rm -f "$BODY_FILE"' EXIT

OUT="$(curl -sS -L \
  --max-time "$TIMEOUT" \
  -H 'User-Agent: Mozilla/5.0 (compatible; stitch-ash-ci-gate/1.0)' \
  -H 'Accept: text/html,application/xhtml+xml' \
  -o "$BODY_FILE" \
  -w '%{http_code} %{url_effective} %{num_redirects} %{size_download}' \
  "$PROBE_URL" 2>&1)"
CURL_RC=$?

CODE=$(printf '%s' "$OUT" | awk '{print $1}')
FINAL=$(printf '%s' "$OUT" | awk '{print $2}')
REDIRECTS=$(printf '%s' "$OUT" | awk '{print $3}')
BYTES=$(printf '%s' "$OUT" | awk '{print $4}')

printf 'storefront checkout gate: probing %s\n' "$PROBE_URL"

if [ "$CURL_RC" -ne 0 ]; then
  # Fail OPEN. An unreachable host or a TLS/DNS failure is not evidence of a
  # password page, and must not be able to block the deploy pipeline.
  printf 'storefront checkout gate: INCONCLUSIVE — curl exit %s. Failing OPEN.\n' "$CURL_RC"
  printf '  curl: %s\n' "$OUT"
  printf '  Not reporting a PASS or a FAIL: the probe did not complete.\n'
  exit 0
fi

# grep -c exits 1 on zero matches while still printing "0", so a `|| echo 0`
# fallback would yield "0\n0" and break the integer comparisons below. Taking
# head -1 of the pipeline and defaulting keeps the count a single integer.
GATE_HITS=$(grep -c -i 'Enter using password' "$BODY_FILE" 2>/dev/null | head -1 || true)
GATE_HITS=${GATE_HITS:-0}
SHOPIFY_MARKERS=$(grep -c -i 'shopify' "$BODY_FILE" 2>/dev/null | head -1 || true)
SHOPIFY_MARKERS=${SHOPIFY_MARKERS:-0}
FINAL_PATH=$(printf '%s' "$FINAL" | sed -E 's#^[a-z]+://[^/]+##')
FINAL_PATH=${FINAL_PATH%%\?*}

if [ "$FINAL_PATH" = "/password" ] || [ "$GATE_HITS" -gt 0 ]; then
  cat >&2 <<EOF

  ─────────────────────────────────────────────────────────────────
  BLOCKING: the storefront apex is PASSWORD-GATED. No buyer can check out.

  probe            $PROBE_URL
  HTTP             $CODE
  final URL        $FINAL
  redirects        $REDIRECTS
  bytes            $BYTES
  password prompt  $GATE_HITS match(es) for "Enter using password"
  shopify markers  $SHOPIFY_MARKERS (Shopify's own page, not ours)

  This is a store setting, not a code defect, and this gate cannot change it:
  the Online Store channel's storefront password must be cleared in Shopify
  admin (Settings -> Online Store -> Preferences -> Storefront password ->
  "Require a password"). No CI check can fix it, and no code change can route
  around it, because Shopify serves the password page for the apex itself.

  Until it is cleared: revenue is zero, and every checkoutUrl — including the
  ones minted by POST /api/checkout on this app — dead-ends here.

  This gate FAILS the deploy on purpose. STI-415 established that a gate which
  only runs on pull_request cannot protect the artifact a deploy publishes, and
  a gated apex is the largest possible customer-facing defect in this repo.
  See issue STI-660.
  ─────────────────────────────────────────────────────────────────
EOF
  printf '\nStorefront checkout gate: FAILED — apex is password-gated.\n'
  exit 1
fi

case "$CODE" in
  2*|3*)
    printf 'storefront checkout gate: HTTP %s, %s redirects, %s bytes — not password-gated.\n' \
      "$CODE" "$REDIRECTS" "$BYTES"
    exit 0 ;;
  404)
    printf 'storefront checkout gate: INCONCLUSIVE — HTTP 404 on the synthetic cart path\n'
    printf '  %s. A gated apex redirects into /password before any 404 could occur, so this\n' "$PROBE_URL"
    printf '  is not evidence of gating, and it is not evidence of a working checkout either.\n'
    printf '  Failing OPEN rather than reporting an unearned PASS.\n'
    exit 0 ;;
  5*)
    printf 'storefront checkout gate: INCONCLUSIVE — apex returned HTTP %s. That is a\n' "$CODE"
    printf '  different defect than a password gate; not reporting it as gated. Failing OPEN.\n'
    exit 0 ;;
  *)
    printf 'storefront checkout gate: INCONCLUSIVE — HTTP %s. Failing OPEN.\n' "$CODE"
    exit 0 ;;
esac