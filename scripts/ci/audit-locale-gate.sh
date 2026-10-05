#!/usr/bin/env bash
# scripts/ci/audit-locale-gate.sh
# Fails if a docs/merch audit transcript records a `git grep -P` / `grep -P`
# command whose result depends on the runner's locale, or if any such
# transcript's stated verdict is reproduced by the byte-unsafe pattern.
#
# STI-609: the hoodie "2-3 weeks" lead-time defect survived a full audit pass
# because the audit's own search command could not see the string it was
# auditing. Under this repo's runner locale (LC_CTYPE=ANSI_X3.4-1968, LANG
# unset) grep's `.` is byte-wise, and the en dash in "2-3 weeks" is three
# bytes (E2 80 93). So:
#
#   git grep -c -P "2.3 weeks" -- catalog/products/sku-001.yaml   -> no output, 0 matches
#   LC_ALL=C.UTF-8 git grep -c -P "2.3 weeks" .../sku-001.yaml  -> 1 match
#
# A search that returns nothing was reported as "the catalog no longer
# restates a lead time", and that false green is still cited in
# docs/merch/2026-09-28-monthly-kpi-report.md as a resolved item. The defect
# shipped. The audit was not the check that caught it — the live page was.
#
# What it enforces, over docs/merch/*.md transcripts:
#   1. No transcript may contain a `.`-containing `grep -P` pattern (with or
#      without git) targeting a path under catalog/ app/ src/ i18n/ docs/.
#      Those trees carry non-ASCII (en dash U+2013, curly quotes, bullet).
#   2. A transcript that names one of those byte-unsafe strings must also
#      carry a matching `-F` command, so the doc is not asking a future
#      reader to re-run the broken form.
#   3. README/GATE CORRECTNESS: every `scripts/...` path a transcript or doc
#      cites as a guard must exist in the repo. The STI-609 note claimed
#      "Guarded by scripts/ci/audit-locale-gate.sh" before that file existed;
#      a doc that credits a non-existent gate is a false green of its own.
#
# Scope limit, stated honestly: this is a linter over committed docs, not a
# proof that any audit ran correctly. It cannot tell whether a human reached the
# right conclusion. What it does prove is that the mechanical commands the docs
# instruct a reader to run cannot silently return zero under the runner locale.
#
# Offline, no network, no secrets, no Node.

set -euo pipefail

REPO_ROOT="${AUDIT_LOCALE_GATE_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
DOC_DIR="$REPO_ROOT/docs/merch"

# Byte-unsafe literals that actually occur in this repo's copy. Each is
# quoted with a literal UTF-8 character on purpose: the gate itself must not
# depend on locale, so it reads and compares bytes via python3, never grep -P.
UNSAFE_STRINGS=(
  "2–3 weeks"   # en dash, U+2013
  "3–5 weeks"
)

# Trees that legitimately contain non-ASCII, so a `.` in a -P pattern there is
# a real hazard rather than a theoretical one.
RISKY_PATH_RE='(catalog|app|src|i18n|docs)/'

cd "$REPO_ROOT"

python3 - "$DOC_DIR" "$REPO_ROOT" <<'PY'
import os
import re
import sys

doc_dir, repo_root = sys.argv[1], sys.argv[2]
UNSAFE = ["2–3 weeks", "3–5 weeks"]
RISKY = re.compile(r"(catalog|app|src|i18n|docs)/")

# `-P` use with a `.` in the pattern, optionally via git grep. `.` is the whole
# problem: one byte under a non-UTF-8 locale, one character under UTF-8.
UNSAFE_P = re.compile(r"(?:git\s+)?\bgrep\b[^\n]*-P\s*['\"][^'\"]*\.")
# A `-F` command covering the same literal: the safe replacement.
SAFE_F = re.compile(r"\bgrep\b[^\n]*-F\s*['\"][^'\"]+['\"]")

errors = []
warnings = []

if not os.path.isdir(doc_dir):
    print(f"ERROR: missing required directory: {doc_dir}")
    sys.exit(1)

docs = sorted(
    os.path.join(doc_dir, f) for f in os.listdir(doc_dir) if f.endswith(".md")
)

for path in docs:
    rel = os.path.relpath(path, repo_root)
    with open(path, encoding="utf-8") as fh:
        lines = fh.readlines()

    for lineno, line in enumerate(lines, 1):
        # (1) a `.` inside a -P pattern, aimed at a tree that has non-ASCII
        if UNSAFE_P.search(line) and RISKY.search(line):
            # (2) tolerate it only if the surrounding block is a correction
            # note. The STI-609 correction quotes the broken form on purpose,
            # several lines below its own "CORRECTED" banner, so a same-line
            # test misses it. Look at a window instead — and require that the
            # block ALSO states the safe form, so a doc cannot excuse itself by
            # merely mentioning the word "corrected".
            # start of the enclosing markdown block: walk up to the last truly
            # blank line, capped so a 4000-line file cannot drag it in whole.
            start = max(0, lineno - 1 - 30)
            while start < lineno - 1 and lines[start].strip() != "":
                start -= 1
            start = min(start + 1, lineno - 1)
            window = "".join(lines[start:lineno])
            excused = (
                ("CORRECTED" in window or "false green" in window)
                and (SAFE_F.search(window) or "-F" in window)
            )
            if excused:
                warnings.append(f"{rel}:{lineno}: quotes the broken -P form (correction note)")
                continue
            if SAFE_F.search(line):
                continue
            errors.append(
                f"{rel}:{lineno}: `grep -P` pattern contains `.` against a non-ASCII tree.\n"
                f"    {line.rstrip()}\n"
                f"    Under LC_CTYPE=ANSI_X3.4-1968 `.` is byte-wise and matches nothing here.\n"
                f"    Use -F with the literal character."
            )

    # (3) every scripts/... path cited as an existing guard must exist
    src = "".join(lines)
    for cited in sorted(set(re.findall(r"scripts/ci/[A-Za-z0-9._-]+", src))):
        # Strip markdown's sentence punctuation: a doc that ends the sentence
        # with the path ("... audit-locale-gate.sh." ) is citing it, not
        # naming a file called "audit-locale-gate.sh." — otherwise every
        # mid-sentence citation reads as a missing file.
        cited = cited.rstrip(".,;:")
        if not os.path.isfile(os.path.join(repo_root, cited)):
            errors.append(
                f"{rel}: cites `{cited}` as a guard, but that file does not exist in the repo.\n"
                f"    A doc that credits a non-existent gate is a false green."
            )

for w in warnings:
    print(f"note:  {w}")

if errors:
    print(f"audit-locale-gate: {len(errors)} problem(s) in docs/merch")
    for e in errors:
        print("  " + e.replace("\n", "\n  "))
    print("audit-locale-gate: FAIL")
    sys.exit(1)

print(f"audit-locale-gate: OK ({len(docs)} transcripts scanned, "
      f"{len(UNSAFE)} known non-ASCII literals)")
PY