#!/usr/bin/env bash
# scripts/ci/token-drift-gate.sh
# Fails if app/assets/css/tokens.css declares a custom property that cannot be
# traced to a token in DESIGN.md, or if DESIGN.md is not lint-clean.
#
# STI-446: 30 custom properties sat in tokens.css with no DESIGN.md token for
# weeks. The daily STI-423 drift run caught them, but nothing stopped a new
# property from landing. This gate is the mechanical form of DESIGN.md's own
# rule — "the chain is strictly Top-down: DESIGN.md -> tokens.css ->
# components and pages" — and of the "Do's" line that every CSS custom
# property must trace to a token in DESIGN.md.
#
# What it enforces:
#   1. Every `--x: y` in tokens.css carries a trace comment naming its source.
#   2. A cited `section.key` trace resolves to a token DESIGN.md really declares,
#      so a typo like `colors.bonee` fails instead of passing as "commented".
#   3. DESIGN.md lints clean (0 errors, 0 warnings) per its own "Do's".
#
# A trace comment is the comment on the same line as the declaration, or the
# comment block immediately following it. Section-header comments (the
# `/* ─── Spacing ─── */` dividers) sit *before* a declaration and are
# deliberately not accepted as traces — that is what made a naive scan give
# false failures.
#
# Scope limit, stated honestly: this gate proves a property is *documented*,
# not that its value *equals* the DESIGN.md value. Value equality is a
# build-output comparison and belongs with the qa-verifier evidence standard.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TOKENS="$REPO_ROOT/app/assets/css/tokens.css"
DESIGN="$REPO_ROOT/DESIGN.md"

for f in "$TOKENS" "$DESIGN"; do
  [ -f "$f" ] || { echo "ERROR: missing required file: $f"; exit 1; }
done

# ---------------------------------------------------------------------------
# 1 + 2. Every property in tokens.css must carry a resolvable DESIGN.md trace
# ---------------------------------------------------------------------------
python3 - "$TOKENS" "$DESIGN" <<'PY'
import re
import sys

tokens_path, design_path = sys.argv[1], sys.argv[2]
tokens_src = open(tokens_path, encoding="utf-8").read()
design_src = open(design_path, encoding="utf-8").read()

SECTIONS = ("colors", "typography", "spacing", "rounded", "components")

fm = ""
m = re.match(r"\A---\n(.*?)\n---\n", design_src, re.S)
if m:
    fm = m.group(1)


def section_keys(name):
    """Keys of a top-level `name:` block in the frontmatter."""
    m = re.search(rf"^{re.escape(name)}:\n((?:[ \t]+.*\n?|\n)*)", fm, re.M)
    if not m:
        return set()
    keys = set()
    for line in m.group(1).splitlines():
        km = re.match(r'^[ \t]+([A-Za-z0-9_"\'-]+):', line)
        if km:
            keys.add(km.group(1).strip('"\''))
    return keys


declared = {s: section_keys(s) for s in SECTIONS}


def known(section, key):
    return section in declared and key in declared[section]


# Names DESIGN.md carries in prose (headings, tables, backticks) rather than as
# a frontmatter key — the fluid and shorthand tokens.
prose_names = set(re.findall(r"`([a-z0-9]+(?:-[a-z0-9]+)+)`", design_src))
for mm in re.finditer(r"^\s*\|\s*`([a-z0-9-]+)`", design_src, re.M):
    prose_names.add(mm.group(1))
for mm in re.finditer(r"^#{2,4}\s+(.*)$", design_src, re.M):
    head = re.sub(r"\s*\([^)]*\)\s*$", "", mm.group(1)).strip()
    prose_names.add(head)

# --- Build a comment-free mask so `;` inside comments cannot confuse parsing.
masked = list(tokens_src)
comments = []
i = 0
while True:
    s = tokens_src.find("/*", i)
    if s < 0:
        break
    e = tokens_src.find("*/", s + 2)
    if e < 0:
        break
    e += 2
    comments.append((s, e, tokens_src[s + 2:e - 2]))
    for k in range(s, e):
        if masked[k] != "\n":
            masked[k] = " "
    i = e
masked = "".join(masked)

decl_re = re.compile(r"--([A-Za-z0-9_-]+)\s*:\s*([^;{}]*);")
decls = [(mm.start(), mm.end(), mm.group(1), mm.group(2).strip()) for mm in decl_re.finditer(masked)]

failures = []
for idx, (start, end, name, value) in enumerate(decls):
    next_start = decls[idx + 1][0] if idx + 1 < len(decls) else len(masked)

    # A trace is a comment that starts after this declaration, with only
    # whitespace between, and ends before the next declaration begins.
    candidates = [
        text
        for (cs, ce, text) in comments
        if cs >= end and ce <= next_start and masked[end:cs].strip() == ""
    ]
    trace = " ".join(candidates)

    if not trace.strip():
        failures.append((name, value, "no trace comment naming its DESIGN.md token"))
        continue

    refs = re.findall(r"\b(colors|typography|spacing|rounded|components)\.([A-Za-z0-9_-]+)\b", trace)
    bad = [f"{s}.{k}" for s, k in refs if not known(s, k)]
    if bad:
        failures.append((name, value, f"cites {', '.join(bad)}, which DESIGN.md does not declare"))
        continue
    if refs:
        continue

    # Prose-stated token: a quoted DESIGN.md heading, or a backticked name that
    # DESIGN.md uses, or the property's own name documented in DESIGN.md.
    quoted = re.findall(r'"([^"]+)"', trace)
    bare = re.findall(r"\b([a-z0-9]+(?:-[a-z0-9]+)+)\b", trace)
    if any(q in prose_names for q in quoted) or any(b in prose_names for b in bare) or name in prose_names:
        continue

    failures.append((name, value, f"trace comment {trace.strip()[:60]!r} names no resolvable token"))

if failures:
    print("ERROR: custom properties in tokens.css with no resolvable DESIGN.md token:")
    for name, value, why in failures:
        print(f"  --{name}: {value}  -> {why}")
    print("")
    print("DESIGN.md is the source of truth: add the token there FIRST, then mirror it.")
    sys.exit(1)

print(f"Token drift gate: {len(decls)} properties in tokens.css all trace to a DESIGN.md token.")
PY

# ---------------------------------------------------------------------------
# 3. DESIGN.md itself must lint clean
# ---------------------------------------------------------------------------
if command -v npx >/dev/null 2>&1; then
  LINT_OUT="$(cd "$REPO_ROOT" && npx --yes @google/design.md lint DESIGN.md 2>/dev/null || true)"
  if [ -n "$LINT_OUT" ]; then
    read -r ERRORS WARNINGS <<EOF
$(printf '%s' "$LINT_OUT" | python3 -c 'import json,sys; s=json.load(sys.stdin).get("summary",{}); print(s.get("errors",0), s.get("warnings",0))' 2>/dev/null || echo "? ?")
EOF
    if [ "$ERRORS" != "0" ] || [ "$WARNINGS" != "0" ]; then
      echo "ERROR: DESIGN.md does not lint clean (errors=$ERRORS warnings=$WARNINGS)."
      printf '%s\n' "$LINT_OUT"
      echo "DESIGN.md's own rule: resolve every error and every warning before merging."
      exit 1
    fi
    echo "Token drift gate: DESIGN.md lints clean (0 errors, 0 warnings)."
  fi
else
  echo "Token drift gate: npx unavailable, skipped the DESIGN.md lint step."
fi

echo "Token drift gate: passed"
exit 0
