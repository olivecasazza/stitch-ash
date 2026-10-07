#!/usr/bin/env bash
# scripts/ci/shop-policy-gate.test.sh
# Offline self-test for shop-policy-gate.sh. STI-688.
#
# Run offline, no network, no Shopify credentials:
#   ./scripts/ci/shop-policy-gate.test.sh
#
# The gate calls the live Storefront API and fetches the published policy page,
# so this suite must not. A stub `curl` is placed first on PATH and every case
# is driven through it, so the suite runs in well under a second on any machine
# and never reads a real token or touches the store.
#
# The point of this suite is the false green. This gate fails OPEN by design on
# transport and auth failure — a fork pull request has no storefront token, and
# that must not block CI — so the default state of a broken probe is PASS. A
# suite that only ever asserted the failing case would therefore pass against a
# gate that detects nothing at all. The negative controls in the second half
# exist to pin that PASS is EARNED: the live defect (refundPolicy null) must
# FAIL, an unauthenticated 400 must be INCONCLUSIVE and not FAIL, and text the
# classifier cannot read must never be reported as agreement.

set -uo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
GATE="$REPO_ROOT/scripts/ci/shop-policy-gate.sh"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

pass=0
fail=0

export LC_ALL=C.UTF-8
export LANG=C.UTF-8

ok()  { pass=$((pass+1)); printf '  ok   %s\n' "$1"; }
bad() { fail=$((fail+1)); printf '  FAIL %s\n     expected %s\n     got      %s\n' "$1" "$2" "$3"; }

# The captured output goes through a FILE, not a variable. Several cases must run
# in a subshell — to unset a token or export a domain without leaking either into
# the rest of the suite — and a subshell cannot export an assignment back to its
# parent. A `LAST_OUT` variable therefore reads STALE in exactly the cases that
# most need it to be current, which is how this suite asserted against the
# previous case's output and still exited 0 on the exit-code assertion. The
# exit code itself was always real; only the text assertions were lying.
LAST_OUT_FILE="$WORK/last-out"
: > "$LAST_OUT_FILE"

expect_exit() {
  local want="$1" label="$2"; shift 2
  local out rc
  out="$("$GATE" "$@" 2>&1)"; rc=$?
  printf '%s' "$out" > "$LAST_OUT_FILE"
  if [ "$rc" -eq "$want" ]; then ok "$label (exit $rc)"; else bad "$label" "exit $want" "exit $rc"; fi
}

last_out() { cat "$LAST_OUT_FILE"; }

# Assert against the gate's SUCCESS marker, not the bare word "PASS".
# The INCONCLUSIVE paths print "Not reporting a PASS." and "Not reporting a
# PASS: content this gate could not read ...", so grepping for "PASS" refutes the
# very disclaimer those paths depend on and silently stops testing anything.
# `shop policy gate: PASS` is printed only by the one line that means it passed.
PASS_MARKER='shop policy gate: PASS'

expect_out() {
  local needle="$1" label="$2"
  if last_out | grep -Fq "$needle"; then
    ok "$label"
  else
    bad "$label" "output containing '$needle'" "$(last_out | tr '\n' ' ' | head -c 200)"
  fi
}

refute_out() {
  local needle="$1" label="$2"
  if last_out | grep -Fq "$needle"; then
    bad "$label" "output NOT containing '$needle'" "$(last_out | tr '\n' ' ' | head -c 200)"
  else
    ok "$label"
  fi
}

# ── Stub curl ───────────────────────────────────────────────────────────────
#
# The gate calls curl twice, with `-o FILE -w '%{http_code}'` both times:
#   1. POST .../api/2026-04/graphql.json   (carries --data-binary)
#   2. GET  <refundPolicy url>             (the published policy page)
# The stub must honour -o and -w so the gate's parsing stays intact, and it
# selects a fixture from STUB_SHOP_MODE / STUB_PAGE_MODE.
STUB="$WORK/bin"
mkdir -p "$STUB"

cat > "$STUB/curl" <<'STUBEOF'
#!/usr/bin/env bash
# Stub curl for shop-policy-gate.sh. Never touches the network.
set -uo pipefail

out=""
url=""
prev=""
for a in "$@"; do
  case "$prev" in
    -o) out="$a" ;;
  esac
  case "$a" in
    -o|--data-binary|-d|-X|-H|-w|--max-time|-L|-sS) ;;
    http://*|https://*) url="$a" ;;
  esac
  prev="$a"
done

# A transport failure must be simulated before anything is written, because the
# gate branches on curl's exit status and must not also see a status code.
if [ "${STUB_CURL_RC:-0}" != "0" ]; then
  printf 'stub curl: simulated transport failure\n' >&2
  exit "$STUB_CURL_RC"
fi

if printf '%s' "$url" | grep -q '/graphql\.json'; then
  code="${STUB_SHOP_HTTP:-200}"
  case "${STUB_SHOP_MODE:-empty_shop}" in
    refund_null)
      body='{"data":{"shop":{"refundPolicy":null,"shippingPolicy":null}}}'
      ;;
    refund_present)
      body='{"data":{"shop":{"refundPolicy":{"url":"https://checkout.shopify.com/75579326509/policies/999001.html?locale=en"},"shippingPolicy":null}}}'
      ;;
    refund_and_shipping)
      body='{"data":{"shop":{"refundPolicy":{"url":"https://checkout.shopify.com/75579326509/policies/999002.html?locale=en"},"shippingPolicy":{"url":"https://checkout.shopify.com/75579326509/policies/999003.html"}}}}'
      ;;
    errors)
      body='{"errors":[{"message":"Online Store channel is locked."}]}'
      ;;
    malformed)
      body='this is not json'
      ;;
    no_shop)
      body='{"data":{}}'
      ;;
    refund_key_absent)
      body='{"data":{"shop":{"shippingPolicy":null}}}'
      ;;
    *)
      body='{"data":{"shop":{}}}'
      ;;
  esac
else
  code="${STUB_PAGE_HTTP:-200}"
  case "${STUB_PAGE_MODE:-unclassified}" in
    final_sale)
      body='<html><body><h1>Returns Policy</h1>
<p>Stitch and Ash goods are made to order. We do not accept returns and all
sales are final, because each piece is embroidered to your specification.</p>
<p>If your item arrives faulty, or is not what you ordered, contact us within
14 days of delivery and we will replace it.</p>
<p>Questions? Email the studio.</p></body></html>'
      ;;
    # The repo's own FAULTY-ONLY wording, verbatim from
    # catalog/returns/default.yaml, including the faulty-REPLACEMENT window.
    # This fixture exists because of a real false contradiction: a bare
    # `days of delivery` grant clause matched "contact us within 14 days of
    # delivery and we will replace it", so the gate classified this page
    # AMBIGUOUS and failed the very policy text STI-688 is waiting on. A
    # replacement window is not a refund window.
    final_sale_replacement_window)
      body='<html><body><h1>Refund Policy</h1>
<p>Returns: no returns. All sales are final.</p>
<p>If an item is faulty or not what you ordered, contact us within 14 days of
delivery and we will replace it. Replacement is not a refund and does not make
the item returnable.</p></body></html>'
      ;;
    returnable)
      body='<html><body><h1>Refund Policy</h1>
<p>Changed your mind? You can return any unaltered item within 30 days of
delivery and we will issue a full refund to the original payment method.</p>
<p>Faulty or wrong items are replaced free of charge.</p></body></html>'
      ;;
    ambiguous)
      body='<html><body><h1>Refund Policy</h1>
<p>We do not accept returns; all sales are final.</p>
<p>That said, if you change your mind you may return the item within 30 days
of delivery for a refund.</p></body></html>'
      ;;
    unclassified)
      body='<html><body><h1>Policy</h1>
<p>This document sets out our commitments to the people who buy from our
studio. We make considered goods and we stand behind them.</p></body></html>'
      ;;
    empty)
      body='<html><body><script>var x=1;</script></body></html>'
      ;;
  esac
fi

if [ -n "$out" ]; then printf '%s' "$body" > "$out"; fi
printf '%s' "$code"
STUBEOF

chmod +x "$STUB/curl"
export PATH="$STUB:$PATH"

# A distinctive token so the leak test can look for it by name. Not a real
# credential and never transmitted: the stub curl answers everything locally.
export SHOPIFY_STOREFRONT_TOKEN="shpat_STUBSENTINEL_zzz_do_not_leak"
DOMAIN="stitch-and-ash.myshopify.com"
RETURNS="$REPO_ROOT/catalog/returns/default.yaml"

# The ambient environment must not decide this suite's result. A developer (or
# an agent) running it from a shell with SHOPIFY_STOREFRONT_DOMAIN exported —
# which is exactly the case on a commerce workstation, measured 2026-10-05 —
# otherwise gets the real domain substituted into the cases that assert a
# missing or missing-by-env domain, and those cases report the state of a live
# store instead of the state under test. Every case below passes --domain
# explicitly except the two that are about the domain fallback, which set it in
# their own subshell.
unset SHOPIFY_STOREFRONT_DOMAIN

# A flipped declaration, so the test can prove the gate reads `direction:` from
# the repo rather than hardcoding a commercial position.
RETV="$WORK/returns-returnable.yaml"
printf 'id: test\ndirection: returnable\nlines:\n  - "Returns within 30 days."\n' > "$RETV"

printf 'shop-policy-gate.sh self-test\n\n'

# ── 1. The live defect must FAIL (closed) ───────────────────────────────────
printf 'presence — the STI-688 defect\n'
STUB_SHOP_MODE=refund_null expect_exit 1 "refundPolicy null is a FAIL, not an inconclusive" \
  --domain "$DOMAIN" --returns-yaml "$RETURNS"
expect_out "publishes no refundPolicy" "reports the missing refundPolicy"
expect_out "final_sale" "echoes the declared direction it measured against"
expect_out "shopPolicyUpdate" "names the fix as an operator Admin write"
refute_out "$PASS_MARKER" "never claims a PASS on the defect"
refute_out "$SHOPIFY_STOREFRONT_TOKEN" "does not leak the token"

# ── 2. Published and agreeing must PASS ─────────────────────────────────────
printf '\nagreement — published policy matches the declaration\n'
STUB_SHOP_MODE=refund_present STUB_PAGE_MODE=final_sale \
  expect_exit 0 "final_sale declared and published" \
  --domain "$DOMAIN" --returns-yaml "$RETURNS"
expect_out "$PASS_MARKER" "reports PASS"
expect_out "FINAL_SALE" "reports the observed classification"

# Regression pin, not a duplicate: a faulty-REPLACEMENT window attached to a
# final-sale page must not be read as a change-of-mind GRANT. When it was, the
# gate failed the repo's own declared policy text.
STUB_SHOP_MODE=refund_present STUB_PAGE_MODE=final_sale_replacement_window \
  expect_exit 0 "a replacement window does not contradict final_sale" \
  --domain "$DOMAIN" --returns-yaml "$RETURNS"
expect_out "FINAL_SALE" "a replacement window classifies as final_sale, not a grant"
refute_out "AMBIGUOUS" "a faulty-replacement window is not a self-contradiction"

STUB_SHOP_MODE=refund_present STUB_PAGE_MODE=returnable \
  expect_exit 0 "returnable declared and published (direction is read from the repo)" \
  --domain "$DOMAIN" --returns-yaml "$RETV"
expect_out "$PASS_MARKER" "reports PASS on the flipped declaration"

# ── 3. A published policy that contradicts the repo must FAIL ───────────────
printf '\ncontradiction — exists but disagrees\n'
STUB_SHOP_MODE=refund_present STUB_PAGE_MODE=returnable \
  expect_exit 1 "final_sale declared, returns granted" \
  --domain "$DOMAIN" --returns-yaml "$RETURNS"
expect_out "contradicts the repo" "reports the contradiction"
refute_out "$PASS_MARKER" "never passes a policy that grants returns under final_sale"

STUB_SHOP_MODE=refund_present STUB_PAGE_MODE=final_sale \
  expect_exit 1 "returnable declared, returns denied" \
  --domain "$DOMAIN" --returns-yaml "$RETV"

STUB_SHOP_MODE=refund_present STUB_PAGE_MODE=ambiguous \
  expect_exit 1 "a page that both grants and denies is not a pass" \
  --domain "$DOMAIN" --returns-yaml "$RETURNS"
expect_out "AMBIGUOUS" "labels the self-contradictory page AMBIGUOUS"

# ── 4. Negative controls: transport and auth failures fail OPEN ─────────────
printf '\nnegative controls — these must NOT report a FAIL on the defect\n'
# An EMPTY token and an UNSET token are the same thing to the gate, but they are
# different code paths through the environment, and a token that is merely empty
# must not be mistaken for one that was supplied. The previous copy of this case
# was labelled "no storefront token at all" while running with the sentinel
# token still exported, so it silently re-ran case 1 above and asserted nothing
# about tokens. Both are asserted here, in subshells so the export is restored.
( SHOPIFY_STOREFRONT_TOKEN="" STUB_SHOP_MODE=refund_null expect_exit 0 \
  "an empty token is INCONCLUSIVE, never a FAIL" \
  --domain "$DOMAIN" --returns-yaml "$RETURNS" )
expect_out "SHOPIFY_STOREFRONT_TOKEN is not set" "an empty token is named as the missing precondition"
refute_out "$PASS_MARKER" "an empty token is never reported as agreement"

( unset SHOPIFY_STOREFRONT_TOKEN; STUB_SHOP_MODE=refund_null expect_exit 0 \
  "unset token is INCONCLUSIVE, never a FAIL" --domain "$DOMAIN" --returns-yaml "$RETURNS" )
expect_out "This is NOT a PASS" "an absent token is not reported as agreement"
expect_out "not wired" "an absent token says the secret is not wired, not just missing"

STUB_SHOP_MODE=errors STUB_SHOP_HTTP=400 expect_exit 0 \
  "HTTP 400 locked channel (the no-token STI-660 shape)" \
  --domain "$DOMAIN" --returns-yaml "$RETURNS"
expect_out "INCONCLUSIVE" "a 400 is INCONCLUSIVE, not a missing policy"
refute_out "FAIL —" "a 400 does not print the failure banner"

STUB_SHOP_MODE=errors STUB_SHOP_HTTP=200 expect_exit 0 \
  "GraphQL errors array" --domain "$DOMAIN" --returns-yaml "$RETURNS"
expect_out "INCONCLUSIVE" "GraphQL errors are INCONCLUSIVE"

STUB_SHOP_MODE=malformed expect_exit 0 \
  "malformed JSON body" --domain "$DOMAIN" --returns-yaml "$RETURNS"
expect_out "INCONCLUSIVE" "malformed JSON is INCONCLUSIVE"

STUB_SHOP_MODE=no_shop expect_exit 0 \
  "data.shop missing" --domain "$DOMAIN" --returns-yaml "$RETURNS"
expect_out "INCONCLUSIVE" "a missing shop node is INCONCLUSIVE"

STUB_CURL_RC=6 expect_exit 0 \
  "curl transport failure (DNS)" --domain "$DOMAIN" --returns-yaml "$RETURNS"
expect_out "INCONCLUSIVE" "a dead socket is INCONCLUSIVE"
refute_out "no refundPolicy" "a transport failure does not assert a missing policy"

# ── 5. Content it could not read must never be reported as agreement ────────
printf '\nunverified content — unreadable is not agreement\n'
STUB_SHOP_MODE=refund_present STUB_PAGE_MODE=unclassified expect_exit 0 \
  "policy page states neither grant nor denial" \
  --domain "$DOMAIN" --returns-yaml "$RETURNS"
expect_out "UNVERIFIED" "unclassifiable body is UNVERIFIED, not PASS"
refute_out "$PASS_MARKER" "unclassifiable body does not pass"

STUB_SHOP_MODE=refund_present STUB_PAGE_MODE=empty expect_exit 0 \
  "policy page has no text content" \
  --domain "$DOMAIN" --returns-yaml "$RETURNS"
expect_out "INCONCLUSIVE" "an empty page is INCONCLUSIVE"
refute_out "$PASS_MARKER" "an empty page does not pass"

STUB_SHOP_MODE=refund_present STUB_PAGE_MODE=final_sale STUB_PAGE_HTTP=500 \
  expect_exit 0 "published policy page returns 500" \
  --domain "$DOMAIN" --returns-yaml "$RETURNS"
expect_out "policy EXISTS" "an unreadable page still records that the policy exists"

# ── 6. API shape drift must be loud, not silent ──────────────────────────────
printf '\nAPI shape drift\n'
STUB_SHOP_MODE=refund_key_absent expect_exit 1 \
  "refundPolicy key absent from the response" \
  --domain "$DOMAIN" --returns-yaml "$RETURNS"
expect_out "needs updating" "absent key says the gate must be updated"
refute_out "publishes no refundPolicy" "absent key is not misread as a null policy"

# ── 7. Preconditions ────────────────────────────────────────────────────────
printf '\npreconditions\n'
STUB_SHOP_MODE=refund_present STUB_PAGE_MODE=final_sale expect_exit 0 \
  "no domain given and none in the environment" \
  --returns-yaml "$RETURNS"
expect_out "no storefront domain" "a missing domain is INCONCLUSIVE"
refute_out "$PASS_MARKER" "a missing domain is never reported as agreement"

# The other side of the same fallback: the domain must come from the environment
# when no flag is passed, or the gate is unreachable in CI as configured.
( export SHOPIFY_STOREFRONT_DOMAIN="$DOMAIN"
  STUB_SHOP_MODE=refund_present STUB_PAGE_MODE=final_sale expect_exit 0 \
    "domain from \$SHOPIFY_STOREFRONT_DOMAIN when no --domain flag" \
    --returns-yaml "$RETURNS" )
expect_out "$DOMAIN" "the environment-supplied domain is the one measured"

STUB_SHOP_MODE=refund_present STUB_PAGE_MODE=final_sale expect_exit 1 \
  "returns declaration does not exist" \
  --domain "$DOMAIN" --returns-yaml "$WORK/nope.yaml"
expect_out "ERROR" "a missing returns declaration is a hard error, not a pass"

BADYAML="$WORK/bad-direction.yaml"
printf 'id: test\ndirection: sideways\n' > "$BADYAML"
STUB_SHOP_MODE=refund_present expect_exit 1 \
  "direction is neither final_sale nor returnable" \
  --domain "$DOMAIN" --returns-yaml "$BADYAML"
expect_out "neither final_sale nor returnable" "an unknown direction is rejected, not guessed"

# ── 8. The shipping advisory is reported but never enforced ─────────────────
printf '\nshipping advisory — reported, never enforced (STI-618 sequence)\n'
STUB_SHOP_MODE=refund_present STUB_PAGE_MODE=final_sale expect_exit 0 \
  "refundPolicy fine but shippingPolicy null still passes" \
  --domain "$DOMAIN" --returns-yaml "$RETURNS"
expect_out "ADVISORY" "the null shippingPolicy is surfaced"
expect_out "STI-618" "the advisory points at the blocker in front of it"
expect_out "$PASS_MARKER" "and still reports an overall PASS"

# ── 9. No domain may be guessed into a policy check ─────────────────────────
printf '\ntoken hygiene\n'
STUB_SHOP_MODE=refund_null expect_exit 1 "token is never echoed on the failing path" \
  --domain "$DOMAIN" --returns-yaml "$RETURNS"
refute_out "shpat_" "no credential-shaped substring anywhere in the output"
refute_out "SENTINEL" "the sentinel token never appears in the output"

# ── Summary ─────────────────────────────────────────────────────────────────
printf '\n%s\n' "----------------------------------------"
printf 'passed: %d\nfailed: %d\n' "$pass" "$fail"
if [ "$fail" -ne 0 ]; then
  printf 'shop-policy-gate self-test: FAILED\n'
  exit 1
fi
printf 'shop-policy-gate self-test: OK\n'