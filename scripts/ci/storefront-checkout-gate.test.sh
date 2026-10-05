#!/usr/bin/env bash
# scripts/ci/storefront-checkout-gate.test.sh
# Offline self-test for storefront-checkout-gate.sh. STI-660.
#
# Run offline, no network, no Shopify credentials:
#   ./scripts/ci/storefront-checkout-gate.test.sh
#
# The gate probes the live apex, so its own suite must not. A stub `curl` is
# placed first on PATH and every case is driven through it, so the suite runs
# in under a second on any machine and never touches the store.
#
# The point of this suite is the false-green case, and it is sharper here than
# for a static gate. This gate can FAIL OPEN by design — an unreachable host
# must not block deploys — so the default state of a broken probe is PASS.
# A suite that only ever asserted the gated case would therefore pass against
# a gate that never detects anything. The negative controls below (cases 3-8)
# exist to pin that PASS is EARNED: an ungated apex, a 404, a 5xx and a dead
# host must each be distinguished, and only an ungated 2xx/3xx may report a
# clean pass.

set -uo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
GATE="$REPO_ROOT/scripts/ci/storefront-checkout-gate.sh"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

pass=0
fail=0

export LC_ALL=C.UTF-8
export LANG=C.UTF-8

ok()   { pass=$((pass+1)); printf '  ok   %s\n' "$1"; }
bad()  { fail=$((fail+1)); printf '  FAIL %s\n     expected %s, got %s\n' "$1" "$2" "$3"; }

expect_exit() {
  local want="$1" label="$2"; shift 2
  local out; out="$("$GATE" "$@" 2>&1)"; local got=$?
  if [ "$got" -eq "$want" ]; then ok "$label (exit $got)"; else bad "$label" "$want" "$got"; fi
  LAST_OUT="$out"
}

expect_out() {
  local needle="$1" label="$2"
  if printf '%s' "$LAST_OUT" | grep -Fq "$needle"; then
    ok "$label"
  else
    bad "$label" "output containing '$needle'" "$(printf '%s' "$LAST_OUT" | head -4 | tr '\n' ' ')"
  fi
}

# ── Stub curl ───────────────────────────────────────────────────────────────
# The real curl is called as:
#   curl -sS -L --max-time N -H ... -o BODY -w 'FMT' URL
# so the stub must honour -o and -w to keep the gate's parsing intact.
STUB="$WORK/bin"
mkdir -p "$STUB"

cat > "$STUB/curl" <<'STUBEOF'
#!/usr/bin/env bash
# Test stub for curl. Behaviour is driven by STUB_MODE / STUB_BODY.
out=""; fmt=""; url=""
while [ $# -gt 0 ]; do
  case "$1" in
    -o) out="$2"; shift 2 ;;
    -w) fmt="$2"; shift 2 ;;
    -H|--max-time) shift 2 ;;
    -*) shift ;;
    *) url="$1"; shift ;;
  esac
done

case "${STUB_MODE:-ok}" in
  ungated)
    printf '%s' "${STUB_BODY:-<html><body>Stitch &amp; Ash</body></html>}" > "$out"
    printf '%s' "$fmt" | sed -e 's/%{http_code}/200/' -e 's#%{url_effective}#'"${STUB_FINAL:-$url}"'#' \
      -e 's/%{num_redirects}/0/' -e 's/%{size_download}/64/'
    exit 0 ;;
  gated)
    printf '%s' "${STUB_BODY:-<html><body>Enter using password</body></html>}" > "$out"
    printf '%s' "$fmt" | sed -e 's/%{http_code}/200/' -e 's#%{url_effective}#'"${STUB_FINAL:-https://www.stitch-ash.com/password}"'#' \
      -e 's/%{num_redirects}/1/' -e 's/%{size_download}/103731/'
    exit 0 ;;
  status)
    printf '%s' "${STUB_BODY:-<html><body>Not found</body></html>}" > "$out"
    printf '%s' "$fmt" | sed -e "s/%{http_code}/${STUB_CODE:-404}/" -e "s#%{url_effective}#${STUB_FINAL:-$url}#" \
      -e 's/%{num_redirects}/0/' -e "s/%{size_download}/${STUB_BYTES:-64}/"
    exit 0 ;;
  dead)
    printf 'curl: (6) Could not resolve host' >&2
    exit "${STUB_RC:-6}" ;;
esac
exit 0
STUBEOF
chmod +x "$STUB/curl"
export PATH="$STUB:$PATH"

APEX="https://www.stitch-ash.com"

echo "storefront-checkout-gate self-test"

# ── 1. The exact live defect (STI-660) ──────────────────────────────────────
# Redirect into /password AND the Shopify password prompt in the body, which is
# what the real apex does today.
export STUB_MODE=gated
export STUB_BODY='<html><body>Enter using password<input type="password"></body></html>'
expect_exit 1 "password-gated apex FAILS the deploy" --apex "$APEX"
expect_out "PASSWORD-GATED" "gating is named in the report"
expect_out "Online Store channel" "report names the store setting to clear"

# ── 2. Detection must not depend solely on the URL path ────────────────────
# A future gate, theme or app could change the /password route. The body
# prompt is an independent signal, so a 200 that still shows the prompt is
# caught even though the path is not /password.
export STUB_FINAL="$APEX/some-other-path"
expect_exit 1 "password prompt off /password still fails" --apex "$APEX"
export STUB_FINAL="$APEX/password"

# ── 3. Ungated apex PASSES, and the pass is earned ──────────────────────────
# This is the false-green control that matters most: if the gate could not tell
# a healthy apex from a gated one, it would report PASS forever.
# STUB_FINAL is unset here on purpose. It is set to a /password URL by the cases
# above, and letting it leak would make the stub report a password final URL for
# a body that is not gated — testing the stub, not the gate.
# STUB_FINAL and STUB_BODY are cleared here on purpose. Both are set by the
# cases above, and letting either leak would make the stub serve a /password
# final URL or a password-prompt body for a case that is not gated — testing the
# stub, not the gate.
export STUB_MODE=ungated
unset STUB_FINAL STUB_BODY
expect_exit 0 "ungated apex passes" --apex "$APEX"
expect_out "not password-gated" "ungated pass is stated explicitly"

# ── 4. preview must never be probed ─────────────────────────────────────────
# preview.stitch-ash.com is ungated BY DESIGN. A gate pointed at it could
# never detect the apex defect and would report a clean PASS on a store that
# cannot take an order — the exact STI-226 false green.
expect_out "probing $APEX/cart/c/gate-probe" "gate reports the apex it probed"

# ── 5. A 404 is INCONCLUSIVE, never PASS and never FAIL ────────────────────
# A gated apex redirects into /password before any 404 could occur, so a 404 is
# not evidence of gating. But it is also not evidence of a working checkout, so
# it must not be reported as a clean pass.
export STUB_MODE=status
unset STUB_BODY
unset STUB_FINAL
export STUB_CODE=404
expect_exit 0 "404 fails OPEN (does not block deploys)" --apex "$APEX"
expect_out "INCONCLUSIVE" "404 is reported as inconclusive, not as a pass"

# ── 6. A 5xx is a DIFFERENT defect and must not be reported as gating ──────
# Reporting "password-gated" for a 5xx would send the operator to clear a
# password that is not set. The remedy differs, so the verdict differs.
export STUB_CODE=503
expect_exit 0 "5xx fails OPEN" --apex "$APEX"
expect_out "INCONCLUSIVE" "5xx is reported as inconclusive"
expect_out "different defect" "5xx is distinguished from a password gate"

# ── 7. A dead host fails OPEN, never closed ────────────────────────────────
# A flaky network or DNS outage must not be able to block every deploy.
export STUB_MODE=dead
expect_exit 0 "unresolvable host fails OPEN" --apex "$APEX"
expect_out "INCONCLUSIVE" "network failure is reported as inconclusive"

# ── 8. A redirect to /password with NO body prompt is still caught ─────────
# Guards against the gate being tightened to require both signals, which would
# have missed this exact state.
export STUB_MODE=gated
export STUB_FINAL="$APEX/password"
export STUB_BODY='<html><body>maintenance</body></html>'
expect_exit 1 "/password path alone (no prompt) still fails" --apex "$APEX"
unset STUB_FINAL STUB_BODY

# ── 9. Usage errors ────────────────────────────────────────────────────────
export STUB_MODE=ungated
expect_exit 2 "unknown argument is a usage error" --not-a-flag
expect_exit 2 "--apex without a value is a usage error" --apex

# ── 10. Unresolvable apex SKIPS rather than reporting an unearned pass ──────
# The resolver reads ranked repo sources. Given a repo root with no apex
# declared anywhere, the gate must decline to guess a domain and must not print
# a PASS it did not measure.
BARE="$WORK/bare-repo"
mkdir -p "$BARE/scripts/ci"
cp "$GATE" "$BARE/scripts/ci/storefront-checkout-gate.sh"
out=$(cd "$BARE" && ./scripts/ci/storefront-checkout-gate.sh 2>&1); got=$?
if [ "$got" -eq 0 ]; then ok "unresolvable apex skips without failing the deploy (exit 0)"; else bad "unresolvable apex skips" 0 "$got"; fi
if printf '%s' "$out" | grep -Fq "SKIPPED"; then
  ok "unresolvable apex is reported as SKIPPED, not PASS"
else
  bad "unresolvable apex reports SKIPPED" "output containing 'SKIPPED'" "$(printf '%s' "$out" | head -3 | tr '\n' ' ')"
fi

printf '\n%d passed, %d failed\n' "$pass" "$fail"
[ "$fail" -eq 0 ]