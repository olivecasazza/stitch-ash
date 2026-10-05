#!/usr/bin/env bash
# scripts/ci/shop-policy-gate.sh
# Fails if the live store publishes no refund policy, and fails if the policy it
# does publish contradicts the direction declared in catalog/returns/default.yaml.
# STI-688.
#
# ── The defect, measured against the live store 2026-10-05 ──────────────────
#
#   $ curl -sS -X POST -H "X-Shopify-Storefront-Access-Token: $TOKEN" \
#       -H 'Content-Type: application/json' \
#       https://stitch-and-ash.myshopify.com/api/2026-04/graphql.json \
#       -d '{"query":"{ shop { refundPolicy { url } shippingPolicy { url } } }"}'
#   HTTP 200
#   {"data":{"shop":{"refundPolicy":null,"shippingPolicy":null}}}
#
# `refundPolicy` is null. The store has a Privacy Policy and nothing else, so
# Shopify checkout renders its own policy links with no returns entry to link,
# while every PDP promises "No returns. Faulty or wrong items replaced."
#
# ── Why this gap survived every gate in the repo ────────────────────────────
#
# Because every existing policy gate is offline and reads only the repo.
# `returns-claim-gate.sh` states its own limit plainly: "It does not call the
# Shopify API and reads no secret. If Shopify holds a description that overrides
# both, that is not covered here." That limit is exactly this defect.
#
# STI-681 fixed the CONTRADICTION (two SKUs disagreed). It did not create a
# DESTINATION for the policy. `catalog/returns/default.yaml` says so itself:
# "DECLARATION-ONLY. Nothing here is written to Shopify by `catalog:apply`;
# there is no Admin API returns-policy object." So the repo held a source of
# truth the store did not, and no gate could see the difference.
#
# This is the STI-226 shape: a green result that measured nothing. CI proved
# the SKUs agree with each other and never asked the store anything.
#
# ── What this gate asserts, precisely ───────────────────────────────────────
#
#   1. PRESENCE. `shop { refundPolicy { url } }` is non-null.
#   2. AGREEMENT. The published page's body does not grant a change-of-mind
#      return window while `direction: final_sale` says the customer may not
#      return on a change of mind. This is the assertion that makes the gate
#      worth more than a null check: a policy that exists and says the opposite
#      is worse than no policy, because it looks authoritative.
#
# ── Design constraints, chosen deliberately ────────────────────────────────
#
# 1. It needs the Storefront token, and that is a real cost. The Storefront
#    GraphQL API answers this store's unauthenticated `shop` query with
#    HTTP 400 "Online Store channel is locked." (STI-660), so presence cannot be
#    asserted anonymously. The token is used as a bearer header and is never
#    echoed, logged, or written to a file. `secrets.SHOPIFY_STOREFRONT_ACCESS_TOKEN`
#    is already mapped into pull_request_checks for other gates, so this adds no
#    new secret.
# 2. It fails OPEN on transport and auth failure, never closed. A missing token
#    (fork pull requests have none), a non-200, a GraphQL `errors` array or a
#    curl failure are each reported as INCONCLUSIVE with exit 0. A secret that
#    is unavailable must not be able to block every pull request, and "I could
#    not ask" must never be reported as "the policy is missing" — that would be
#    the same false green this gate exists to end.
# 3. A null refundPolicy is a DEFINITIVE answer, so it fails CLOSED. That is the
#    whole point: null is the defect, not the absence of one.
# 4. The policy PAGE is fetched credential-free. The returned URL is an
#    absolute https URL on checkout.shopify.com and needs no bearer header, so
#    the body is read without putting the token in a second request.
# 5. It does not invent policy language. It reads `direction:` out of
#    catalog/returns/default.yaml and never hardcodes a commercial position. If
#    the operator answers STI-681, this gate follows the YAML automatically and
#    needs no edit.
# 6. shippingPolicy is reported, not enforced. A null shipping policy is real
#    and is called out, but STI-618 is the open blocker in front of it: 24
#    destinations are quoted no shipping option at all, so checkout cannot
#    complete for most international buyers. Publishing a shipping policy that
#    promises timelines checkout cannot honour is a worse defect than none, and
#    that sequencing decision is the operator's. See STI-688 acceptance
#    criterion 4.
#
# ── Scope limits, stated honestly ───────────────────────────────────────────
#
#   - The direction classifier is SENTENCE-scoped, unlike the per-line claim
#     classifier in returns-claim-gate.sh. A policy page is a long document and
#     a line-based classifier would fire on its headings and boilerplate; a
#     page-wide classifier, which is what this was before 2026-10-05, reads a
#     window on one clause as a grant because of a noun three clauses away.
#   - If the body matches neither a grant nor a denial, the result is
#     UNCLASSIFIED and is reported as UNVERIFIED, not as a PASS. A gate that
#     passes what it could not read is the failure mode of every gate in this
#     repo's history.
#   - It proves the policy is published and not self-contradictory. It does not
#     prove the policy is commercially correct, fair, or legally adequate. That
#     judgement belongs to the operator and is blocked on STI-681.
#   - It reads ONE store. It does not verify the storefront actually renders a
#     link to the policy, which storefront-checkout-gate.sh also cannot see.
#
# Offline self-test, which pins the false-green cases:
#   ./scripts/ci/shop-policy-gate.test.sh
#
# Usage:
#   shop-policy-gate.sh [--domain HOST] [--returns-yaml PATH] [--timeout SECS]
#
# HOST comes from --domain, then $SHOPIFY_STOREFRONT_DOMAIN. The token is read
# only from $SHOPIFY_STOREFRONT_TOKEN and is never accepted as an argument, so
# it cannot land in a CI command line or a process listing.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
API_VERSION="2026-04"
TIMEOUT=30

while [ $# -gt 0 ]; do
  case "$1" in
    --domain)       DOMAIN="${2:?--domain needs a value}"; shift 2 ;;
    --returns-yaml) RETURNS_YAML="${2:?--returns-yaml needs a value}"; shift 2 ;;
    --timeout)      TIMEOUT="${2:?--timeout needs a value}"; shift 2 ;;
    -h|--help)      sed -n '2,80p' "${BASH_SOURCE[0]}"; exit 0 ;;
    *) printf 'shop policy gate: unknown argument %s\n' "$1" >&2; exit 64 ;;
  esac
done

RETURNS_YAML="${RETURNS_YAML:-$REPO_ROOT/catalog/returns/default.yaml}"
DOMAIN="${DOMAIN:-${SHOPIFY_STOREFRONT_DOMAIN:-}}"

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

# ── Preflight ───────────────────────────────────────────────────────────────

if [ -z "$DOMAIN" ]; then
  cat >&2 <<EOF
shop policy gate: INCONCLUSIVE — no storefront domain. Pass --domain, or set
  SHOPIFY_STOREFRONT_DOMAIN. Not reporting a PASS: nothing was measured.
EOF
  exit 0
fi
DOMAIN="${DOMAIN%/}"
DOMAIN="${DOMAIN#https://}"
DOMAIN="${DOMAIN#http://}"
DOMAIN="${DOMAIN%%/*}"

# The expected direction. Never hardcoded — this is what makes the gate follow
# the operator's answer on STI-681 instead of second-guessing it.
if [ ! -f "$RETURNS_YAML" ]; then
  printf 'shop policy gate: ERROR — no returns declaration at %s\n' "$RETURNS_YAML" >&2
  exit 1
fi
EXPECTED="$(sed -nE 's/^[[:space:]]*direction:[[:space:]]*([a-z_]+).*/\1/p' "$RETURNS_YAML" | head -1)"
if [ -z "$EXPECTED" ]; then
  printf 'shop policy gate: ERROR — no `direction:` key in %s\n' "$RETURNS_YAML" >&2
  exit 1
fi

case "$EXPECTED" in
  final_sale|returnable) : ;;
  *)
    printf 'shop policy gate: ERROR — direction `%s` in %s is neither final_sale nor returnable\n' \
      "$EXPECTED" "$RETURNS_YAML" >&2
    exit 1
    ;;
esac

# The token is read from the environment only, and never printed. Its absence
# is INCONCLUSIVE, not a pass and not a failure.
TOKEN="${SHOPIFY_STOREFRONT_TOKEN:-}"
if [ -z "$TOKEN" ]; then
  cat >&2 <<EOF
shop policy gate: INCONCLUSIVE — SHOPIFY_STOREFRONT_TOKEN is not set, so the
  store was not asked whether it publishes a refund policy.
  This is NOT a PASS. On a fork pull request this is expected; on a pull
  request from a branch in this repository it means the secret is not wired
  into pull_request_checks and the gate is measuring nothing.
EOF
  exit 0
fi

ENDPOINT="https://${DOMAIN}/api/${API_VERSION}/graphql.json"
QUERY='{"query":"{ shop { refundPolicy { url } shippingPolicy { url } } }"}'

# ── Ask the store ───────────────────────────────────────────────────────────

CURL_RC=0
BODY="$WORK/shop.json"
HTTP="$(curl -sS --max-time "$TIMEOUT" \
  -X POST \
  -H "X-Shopify-Storefront-Access-Token: ${TOKEN}" \
  -H 'Content-Type: application/json' \
  -H 'User-Agent: stitch-ash-ci-gate/1.0 (shop-policy-gate)' \
  -o "$BODY" \
  -w '%{http_code}' \
  --data-binary "$QUERY" \
  "$ENDPOINT" 2>"$WORK/curl.err")" || CURL_RC=$?

if [ "$CURL_RC" -ne 0 ]; then
  cat >&2 <<EOF
shop policy gate: INCONCLUSIVE — curl exit ${CURL_RC} reaching ${ENDPOINT}.
  Failing OPEN: an unreachable host is not evidence of a missing policy.
  curl: $(head -c 200 "$WORK/curl.err" 2>/dev/null || true)
  Not reporting a PASS or a FAIL: the store was not asked.
EOF
  exit 0
fi

if [ "$HTTP" != "200" ]; then
  cat >&2 <<EOF
shop policy gate: INCONCLUSIVE — HTTP ${HTTP} from ${ENDPOINT}.
  Failing OPEN. Note that an unauthenticated shop query against this store
  answers HTTP 400 "Online Store channel is locked." (STI-660), so a 400 here
  means the token was rejected, not that the policy is missing.
  body: $(head -c 300 "$BODY" 2>/dev/null || true)
EOF
  exit 0
fi

# ── Parse ───────────────────────────────────────────────────────────────────

PARSED="$(python3 - "$BODY" <<'PY'
import json, sys

try:
    with open(sys.argv[1], encoding="utf-8", errors="replace") as fh:
        doc = json.load(fh)
except (OSError, ValueError) as exc:
    print("PARSE_ERROR\t%s" % exc)
    sys.exit(0)

if doc.get("errors"):
    # A GraphQL error is the store declining to answer. That is INCONCLUSIVE.
    msgs = "; ".join(str(e.get("message", e)) for e in doc["errors"][:3])
    print("GRAPHQL_ERROR\t%s" % msgs.replace("\t", " ").replace("\n", " "))
    sys.exit(0)

shop = (doc.get("data") or {}).get("shop")
if not isinstance(shop, dict):
    print("NO_SHOP\tdata.shop missing or not an object")
    sys.exit(0)

def url_of(name):
    node = shop.get(name)
    if isinstance(node, dict):
        return str(node.get("url") or "")
    # An explicit null is the signal; a key that is absent means the API shape
    # moved, which is a different failure and is reported as such.
    if name not in shop:
        return "<absent>"
    return ""

print("REFUND\t%s" % url_of("refundPolicy"))
print("SHIPPING\t%s" % url_of("shippingPolicy"))
PY
)"

if printf '%s' "$PARSED" | grep -qE '^(PARSE_ERROR|GRAPHQL_ERROR|NO_SHOP)'; then
  cat >&2 <<EOF
shop policy gate: INCONCLUSIVE — ${PARSED}
  Failing OPEN: the store declined to answer, which is not a missing policy.
EOF
  exit 0
fi

REFUND_URL="$(printf '%s\n' "$PARSED" | sed -n 's/^REFUND\t//p')"
SHIPPING_URL="$(printf '%s\n' "$PARSED" | sed -n 's/^SHIPPING\t//p')"

printf 'shop policy gate: store %s\n' "$DOMAIN"
printf '  declared direction : %s (%s)\n' "$EXPECTED" "${RETURNS_YAML#$REPO_ROOT/}"

# ── Advisory: shipping policy ───────────────────────────────────────────────
#
# Reported, never enforced. See design constraint 6: STI-618 is in front of
# this, and promising timelines checkout cannot honour is worse than none.
if [ -z "$SHIPPING_URL" ] || [ "$SHIPPING_URL" = "<absent>" ]; then
  printf '  ADVISORY          : shippingPolicy is %s. Also undecided.\n' \
    "${SHIPPING_URL:-null}"
  printf '                       STI-688 crit 4 / STI-618: 24 destinations are\n'
  printf '                       quoted no shipping option, so publishing a\n'
  printf '                       shipping policy now would promise timelines\n'
  printf '                       checkout cannot meet. Operator sequencing call.\n'
fi

# ── Assertion 1: presence ───────────────────────────────────────────────────

if [ "$REFUND_URL" = "<absent>" ]; then
  printf 'shop policy gate: ERROR — shop.refundPolicy missing from the API response.\n' >&2
  printf '  The Storefront API shape moved. This gate needs updating before it can\n' >&2
  printf '  measure anything; do not read it as a policy change.\n' >&2
  exit 1
fi

if [ -z "$REFUND_URL" ]; then
  cat >&2 <<EOF
shop policy gate: FAIL — ${DOMAIN} publishes no refundPolicy.

  shop { refundPolicy { url } } -> null

  Shopify checkout renders its own policy links, and there is no returns entry
  to link, while every PDP promises the ${EXPECTED} policy. The repo declares it
  in catalog/returns/default.yaml; the store has nowhere to point a customer.

  Fixing this is a Shopify Admin shopPolicyUpdate write against a live selling
  store, which is operator work (HARD RULE 5), not an agent action.
EOF
  exit 1
fi

printf '  refundPolicy url    : %s\n' "$REFUND_URL"

# ── Read the published body ─────────────────────────────────────────────────
#
# Credential-free: the returned URL is absolute and needs no bearer header, so
# the token is not put in a second request.
PAGE="$WORK/policy.html"
CURL_RC=0
PAGE_HTTP="$(curl -sS -L --max-time "$TIMEOUT" \
  -H 'User-Agent: stitch-ash-ci-gate/1.0 (shop-policy-gate)' \
  -H 'Accept: text/html,application/xhtml+xml' \
  -o "$PAGE" \
  -w '%{http_code}' \
  "$REFUND_URL" 2>"$WORK/page.err")" || CURL_RC=$?

if [ "$CURL_RC" -ne 0 ] || [ "$PAGE_HTTP" != "200" ]; then
  cat >&2 <<EOF
shop policy gate: INCONCLUSIVE — could not read the published policy page
  (curl exit ${CURL_RC}, HTTP ${PAGE_HTTP:-none}).
  The policy EXISTS; its content could not be read. Failing OPEN: the gate
  asserts presence here and refuses to guess about content it did not read.
EOF
  exit 0
fi

# ── Assertion 2: the body must not contradict the declared direction ────────

CLASSIFIED="$(python3 - "$PAGE" <<'PY'
import html, re, sys

try:
    with open(sys.argv[1], encoding="utf-8", errors="replace") as fh:
        raw = fh.read()
except OSError as exc:
    print("UNREADABLE\t%s" % exc)
    sys.exit(0)

raw = re.sub(r"(?is)<(script|style|noscript).*?</\1>", " ", raw)
text = html.unescape(re.sub(r"(?s)<[^>]+>", " ", raw))

# Sentence boundaries must SURVIVE normalisation, or "same sentence" scoping is
# not scoping at all. `norm = re.sub(r"[^a-z0-9]+", " ", ...)` erases every
# `.`, `,` and `;`, so a character class written as `[^.]` actually means
# "anywhere in the whole document" — which is how a window on one clause
# reached a noun three clauses away. Split into sentences FIRST, normalise each
# one, then join with a newline that the normaliser cannot remove.
norm = "\n".join(
    re.sub(r"[^a-z0-9]+", " ", sent.lower()).strip()
    for sent in re.split(r"[.!?]+", text)
).strip()

if not norm:
    print("UNREADABLE\tno text content in the published page")
    sys.exit(0)

# A change-of-mind GRANT: a return or refund the customer may exercise against
# the seller's will, WITH A WINDOW ATTACHED TO IT in the same sentence.
#
# Both halves are required, and that requirement is the whole fix. Measured
# against real wording on 2026-10-05, not theorised:
#
#   - catalog/returns/default.yaml (FAULTY-ONLY, `direction: final_sale`) says
#     "contact us within 14 days of delivery and we will replace it". The
#     earlier pattern had a bare `days of (delivery|receipt|purchase)` clause
#     that matched that faulty-REPLACEMENT offer, so it classified the repo's
#     own settled policy AMBIGUOUS and the gate failed the very text STI-688 is
#     waiting on. A replacement window is not a refund window, and
#     `replace`/`replacement` is deliberately absent from the noun list.
#   - A bare `\breturnable\b` was the second false grant, and the one most
#     likely to fire on a real Shopify policy page: final-sale copy routinely
#     closes "Replacement does not make the item returnable." That is a denial
#     written with the word the naive pattern reads as a grant. Demanding a
#     window costs recall on a thin page and buys correctness on a real one;
#     the miss is reported UNCLASSIFIED/UNVERIFIED and fails OPEN, whereas a
#     false grant fails CLOSED and blocks the fix. Refusing to guess in the
#     direction that stops the deploy is the right way to be wrong.
SAME_SENTENCE = r"[^\n]{0,140}?"
WINDOW = (
    r"(?:\d{1,3}|one|two|three|fourteen|twenty|thirty|sixty|ninety)"
    r"[\s-]*(?:calendar\s+|business\s+)?days?"
)
RETURN_NOUN = r"\b(?:return|returns|returning|refund|refunds|exchange|exchanges)\b"
GRANT = re.compile(
    RETURN_NOUN + SAME_SENTENCE + r"\b(?:within|in|after|of)\s+" + WINDOW
    + r"|\b" + WINDOW + r"\b" + SAME_SENTENCE + RETURN_NOUN
)

# A DENIAL: the seller refuses a change of mind. These are checked as whole
# phrases because negations ("no returns", "not returnable") are exactly what
# must be caught and a naive negation-scope search misreads them.
DENY = re.compile(
    r"\bno returns\b|\bno refunds\b|\bnot returnable\b|\bnon returnable\b"
    r"|\breturns are not\b|\bwe do not accept returns\b|\bdo not accept returns\b"
    r"|\bcannot be returned\b|\bmay not be returned\b|\bnot eligible for return\b"
    r"|\bdoes not make the item returnable\b|\bis not returnable\b"
    r"|\bfinal sale\b|\ball sales are final\b|\bsales are final\b"
)

has_grant = bool(GRANT.search(norm))
has_deny = bool(DENY.search(norm))

if has_grant and has_deny:
    print("AMBIGUOUS\tpage both grants and denies a change of mind")
elif has_grant:
    print("RETURNABLE\tpage grants a change-of-mind return window")
elif has_deny:
    print("FINAL_SALE\tpage denies a change of mind")
else:
    print("UNCLASSIFIED\tpage states neither a grant nor a denial of returns")
PY
)"

OBSERVED="$(printf '%s' "$CLASSIFIED" | cut -f1)"
DETAIL="$(printf '%s' "$CLASSIFIED" | cut -f2-)"

printf '  published body      : %s (%s)\n' "$OBSERVED" "$DETAIL"

case "$OBSERVED" in
  UNREADABLE)
    printf 'shop policy gate: INCONCLUSIVE — the published policy page could not be read as text.\n' >&2
    printf '  Failing OPEN. Not reporting a PASS: content this gate could not read is not content it cleared.\n' >&2
    exit 0
    ;;
  UNCLASSIFIED)
    printf 'shop policy gate: UNVERIFIED — the published policy matched neither a\n' >&2
    printf '  change-of-mind grant nor a denial, so agreement with `direction: %s`\n' "$EXPECTED" >&2
    printf '  could not be established.\n' >&2
    printf '  Failing OPEN, because passing text this gate did not understand is the\n' >&2
    printf '  exact false green this gate was written to end. Re-run with the page\n' >&2
    printf '  body in hand before treating this as agreement.\n' >&2
    exit 0
    ;;
esac

if [ "$EXPECTED" = "final_sale" ] && [ "$OBSERVED" != "FINAL_SALE" ]; then
  cat >&2 <<EOF
shop policy gate: FAIL — the published refund policy contradicts the repo.

  declared : final_sale  (customer may not return on a change of mind)
  published: ${OBSERVED} — ${DETAIL}
  url      : ${REFUND_URL}

  A refund policy that exists and grants returns is worse than no policy at all:
  it looks authoritative, and it is what checkout will link.
EOF
  exit 1
fi

if [ "$EXPECTED" = "returnable" ] && [ "$OBSERVED" != "RETURNABLE" ]; then
  cat >&2 <<EOF
shop policy gate: FAIL — the published refund policy contradicts the repo.

  declared : returnable
  published: ${OBSERVED} — ${DETAIL}
  url      : ${REFUND_URL}
EOF
  exit 1
fi

printf 'shop policy gate: PASS — refundPolicy is published and agrees with `direction: %s`.\n' "$EXPECTED"
exit 0