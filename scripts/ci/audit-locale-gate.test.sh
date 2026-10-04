#!/usr/bin/env bash
# scripts/ci/audit-locale-gate.test.sh
# Offline self-test for audit-locale-gate.sh. STI-609.
#
# Run offline, no network, no secrets:
#   ./scripts/ci/audit-locale-gate.test.sh
#
# The negative control that matters is the FIRST one. It reproduces the actual
# STI-609 defect end to end: a docs/merch transcript containing the byte-unsafe
# `-P "2.3 weeks"` command against catalog/. Before this suite existed, that
# transcript was in the repo and the audit it belonged to was reported as a
# clean resolved item. The gate must FAIL on it. If the gate passes that
# fixture, the gate is broken and every green it ever prints is meaningless.

set -uo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
GATE="$REPO_ROOT/scripts/ci/audit-locale-gate.sh"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

# Pin the locale to the one that CAUSED the defect. If this suite only passed
# under C.UTF-8 it would not be testing the thing that broke.
export LC_ALL=C
export LANG=C

pass=0
fail=0
ok()  { pass=$((pass+1)); printf '  ok   %s\n' "$1"; }
bad() { fail=$((fail+1)); printf '  FAIL %s\n     expected: %s\n     got:      %s\n' "$1" "$2" "$3"; }

# Build a throwaway repo whose docs/merch holds exactly the transcripts we want
# to exercise. The gate is always the real one; it is pointed at the fixture via
# AUDIT_LOCALE_GATE_ROOT, so `with_gate=no` really does mean "the cited script is
# absent from the tree" rather than "the harness could not find its own copy".
# make_repo <dir> [with_gate]
make_repo() {
  local dir="$1" with_gate="${2:-yes}"
  rm -rf "$dir"
  mkdir -p "$dir/docs/merch" "$dir/scripts/ci"
  if [ "$with_gate" = "yes" ]; then
    cp "$GATE" "$dir/scripts/ci/audit-locale-gate.sh"
  fi
}

expect() {
  local want="$1" label="$2" dir="$3"
  local out; out="$(AUDIT_LOCALE_GATE_ROOT="$dir" "$GATE" 2>&1)"; local got=$?
  if [ "$got" -eq "$want" ]; then
    ok "$label (exit $got)"
  else
    bad "$label" "exit $want" "exit $got :: $(printf '%s' "$out" | head -4 | tr '\n' ' ')"
  fi
  LAST_OUT="$out"
}

expect_out() {
  local needle="$1" label="$2"
  if printf '%s' "$LAST_OUT" | grep -Fq -- "$needle"; then
    ok "$label"
  else
    bad "$label" "output containing '$needle'" "$(printf '%s' "$LAST_OUT" | head -4 | tr '\n' ' ')"
  fi
}

# ---------------------------------------------------------------------------
echo "STI-609 audit-locale-gate self-test"
echo

# 1. THE REGRESSION. The exact command from the STI-609 audit transcript, in a
#    transcript that has not yet been corrected. Must FAIL (exit 1).
echo "1. negative control: the real STI-609 false green"
D="$WORK/r1"; make_repo "$D"
cat > "$D/docs/merch/audit.md" <<'EOF'
# Store copy audit

Verified the hoodie lead time is gone:

```
$ git grep -n -P "2.3 weeks" origin/main -- catalog/ src/ app/
origin/main:catalog/products/sku-001.yaml:16: <p>Made to order.</p>
```
EOF
expect 1 "byte-unsafe -P transcript is rejected" "$D"
expect_out "audit-locale-gate: FAIL" "reports FAIL with the offending line" 
expect_out "catalog/" "names the risky path"

# 2. The corrected transcript — same literal, but via -F. Must PASS (exit 0).
echo "2. negative control reversed: the corrected -F transcript"
D="$WORK/r2"; make_repo "$D"
cat > "$D/docs/merch/audit.md" <<'EOF'
# Store copy audit

Verified with a locale-independent search:

```
$ git grep -n -F "2–3 weeks" origin/main -- catalog/ app/
origin/main:catalog/products/sku-001.yaml:41: <li>Ships in 2–3 weeks.</li>
origin/main:app/data/products.ts:81: "Ships in 2–3 weeks."
```
EOF
expect 0 "corrected -F transcript passes" "$D"

# 3. A transcript quoting the broken form INSIDE a correction note. Must PASS:
#    the doc is correcting the record, and the gate must not punish a doc that
#    quotes the mistake in order to explain it.
echo "3. correction notes quoting the broken form are not punished"
D="$WORK/r3"; make_repo "$D"
cat > "$D/docs/merch/audit.md" <<'EOF'
# Audit

> CORRECTED 2026-10-04: the command above used to be `git grep -n -P "2.3
> weeks"`. That was a false green. Use -F with the literal character.
EOF
expect 0 "correction note passes" "$D"

# 4. The STI-609 doc's own second false green: it credits a gate that does not
#    exist. Must FAIL.
echo "4. doc credits a non-existent guard script"
D="$WORK/r4"; make_repo "$D" no
cat > "$D/docs/merch/audit.md" <<'EOF'
# Audit

This is a false green. Guarded by scripts/ci/audit-locale-gate.sh.
EOF
expect 1 "missing guard script is rejected" "$D"
expect_out "does not exist in the repo" "says the cited script is missing"

# 5. Same doc, but the gate now exists -> must PASS.
echo "5. same doc once the cited script exists"
D="$WORK/r5"; make_repo "$D" yes
cat > "$D/docs/merch/audit.md" <<'EOF'
# Audit

This is a false green. Guarded by scripts/ci/audit-locale-gate.sh.
EOF
expect 0 "cited script present -> passes" "$D"

# 6. A -P pattern with no `.` is safe even on a non-ASCII tree: byte-wise `.`
#    is the only hazard, and `\d`-free digit classes still work. Must PASS.
echo "6. -P without a literal dot is not flagged"
D="$WORK/r6"; make_repo "$D"
cat > "$D/docs/merch/audit.md" <<'EOF'
# Audit

```
$ git grep -n -P "weeks" origin/main -- catalog/
```
EOF
expect 0 "dotless -P passes" "$D"

# 7. The real repo must currently PASS, or CI is red on arrival.
echo "7. the real repo is clean"
if "$GATE" >"$WORK/real.out" 2>&1; then
  ok "repo passes (exit 0)"
  sed 's/^/       /' "$WORK/real.out" | head -5
else
  bad "repo passes" "exit 0" "$(head -12 "$WORK/real.out" | tr '\n' ' ')"
fi

# ---------------------------------------------------------------------------
echo
echo "pass=$pass fail=$fail"
[ "$fail" -eq 0 ] || exit 1
echo "audit-locale-gate.test.sh: PASS"