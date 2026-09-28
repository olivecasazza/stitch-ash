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
#   3. The value in tokens.css *equals* the DESIGN.md value for every token
#      where that comparison is meaningful (STI-459). Check 1+2 proved a
#      property was documented; it did not prove the two files still agreed,
#      so editing one and not the other passed silently.
#   4. DESIGN.md lints clean (0 errors, 0 warnings) per its own "Do's".
#
# A trace comment is the comment on the same line as the declaration, or the
# comment block immediately following it. Section-header comments (the
# `/* ─── Spacing ─── */` dividers) sit *before* a declaration and are
# deliberately not accepted as traces — that is what made a naive scan give
# false failures.
#
# Scope limit, stated honestly (STI-459): check 3 covers dimension-valued
# `spacing.*` and colour `colors.*` — the tokens whose DESIGN.md value is a
# literal that can be compared to the CSS. The tokens the design.md schema
# cannot type are NOT compared; they are skipped from an explicit list, each
# with a printed reason, so a skip can never be confused with a pass. That
# list lives in scripts/ci/token-value-compare.py (SKIP_REASONS) alongside the
# normalisation rules, and is unit-tested by token-drift-gate-test.sh.

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
# 3. The mirrored VALUE must equal the DESIGN.md value (STI-459)
# ---------------------------------------------------------------------------
# Checks 1+2 prove a property is *documented*. This proves the two files still
# *agree*. `spacing.4xl: "64px"` in DESIGN.md and `--space-4xl: 64px` in
# tokens.css are a pair; editing one without the other is drift, and before
# this check nothing caught it.
python3 -B - "$TOKENS" "$DESIGN" "$REPO_ROOT/scripts/ci/token-value-compare.py" <<'PY'
import importlib.util
import re
import sys

tokens_path, design_path, compare_path = sys.argv[1], sys.argv[2], sys.argv[3]

spec = importlib.util.spec_from_file_location("token_value_compare", compare_path)
tvc = importlib.util.module_from_spec(spec)
spec.loader.exec_module(tvc)

tokens_src = open(tokens_path, encoding="utf-8").read()
design_src = open(design_path, encoding="utf-8").read()

SECTIONS = ("colors", "typography", "spacing", "rounded", "components")

m = re.match(r"\A---\n(.*?)\n---\n", design_src, re.S)
fm = m.group(1) if m else ""


def section_values(name):
    """key -> raw scalar value for a top-level `name:` block in the frontmatter.

    Returns only keys whose value is a plain scalar (`key: "value"`). Keys
    holding an inline map — the `typography:` roles and every `components:`
    entry — are not literal values and are not comparable this way.
    """
    out = {}
    m = re.search(rf"^{re.escape(name)}:\n((?:[ \t]+.*\n?|\n)*)", fm, re.M)
    if not m:
        return out
    for line in m.group(1).splitlines():
        km = re.match(r'^[ \t]+([A-Za-z0-9_"\'-]+):[ \t]+("[^"]*"|\'[^\']*\'|[^,{\s]+)[ \t]*$', line)
        if km:
            out[km.group(1).strip('"\'')] = km.group(2).strip('"\'')
    return out


values = {s: section_values(s) for s in SECTIONS}

# The CSS property that mirrors a given section.key. DESIGN.md's own prose
# states the mirror is a name mapping rather than an identity, so the map is
# explicit here rather than guessed.
#
# `spacing:` is not uniform. The 4px *scale* steps (xs..5xl) are mirrored with
# a `space-` prefix — spacing.xs -> --space-xs. The *layout measures*
# (section-*, content-*, measure) drop the prefix because that is the name
# components already consume — spacing.section-sm -> --section-sm. Getting this
# wrong would report a present property as absent, i.e. a skip for the wrong
# reason, which is the failure mode this gate exists to prevent.
def css_name_for(section, key):
    if section == "rounded":
        return "ui-radius" if key == "ui" else "radius-" + key
    if section == "colors":
        return COLOR_RENAMES.get(key, key)
    if section == "spacing":
        return "space-" + key
    return None


# A spacing key may be mirrored either prefixed or bare; return whichever the
# stylesheet actually carries.
def resolve_css_name(section, key, available):
    if section != "spacing":
        return css_name_for(section, key)
    prefixed = css_name_for(section, key)
    if prefixed in available:
        return prefixed
    if key in available:
        return key
    return prefixed


# colors.ink is mirrored as --ink-black (the page ground), not --ink. The
# design calls this out in prose; it is the one colour name that is not an
# identity mapping.
COLOR_RENAMES = {"ink": "ink-black"}

# --- Re-parse tokens.css into name -> value, comments masked out.
masked = list(tokens_src)
i = 0
while True:
    s = tokens_src.find("/*", i)
    if s < 0:
        break
    e = tokens_src.find("*/", s + 2)
    if e < 0:
        break
    e += 2
    for k in range(s, e):
        if masked[k] != "\n":
            masked[k] = " "
    i = e
masked = "".join(masked)

css_values = {}
for mm in re.finditer(r"--([A-Za-z0-9_-]+)\s*:\s*([^;{}]*);", masked):
    css_values[mm.group(1)] = mm.group(2).strip()

# The typography: section holds inline maps (`{ fontFamily: ..., fontSize:
# "2.5rem" }`), not bare scalars, so section_values() returns nothing for it
# and every --text-* step would be silently uncompared. They are emitted here
# from the maps instead, so the type scale is covered like any other token.
#
# --text-display is deliberately absent: it is a clamp() with no typography:
# key, and is covered by the explicit skip list below.
FONT_SIZE_KEYS = [
    ("text-xs", "0.6875rem"), ("text-sm", "0.75rem"),
    ("text-base", "0.8125rem"), ("text-lg", "0.9375rem"),
    ("text-xl", "1.25rem"), ("text-2xl", "1.75rem"),
    ("text-3xl", "2.5rem"),
]


def typography_font_sizes():
    """key -> fontSize, read out of the typography: inline maps."""
    out = {}
    m = re.search(r"^typography:\n((?:[ \t]+.*\n?|\n)*)", fm, re.M)
    if not m:
        return out
    for line in m.group(1).splitlines():
        km = re.match(r'^[ \t]+([A-Za-z0-9_-]+):[ \t]*\{', line)
        if not km:
            continue
        fs = re.search(r'fontSize:\s*"([^"]+)"', line)
        if fs:
            out[km.group(1)] = fs.group(1)
    return out


compared = []
skipped = []
mismatches = []

_typography = typography_font_sizes()
# Fall back to the documented values if the regex above ever stops matching,
# and fail loudly rather than quietly comparing nothing.
if not _typography:
    print("ERROR: could not read any typography: fontSize values from DESIGN.md.")
    print("Refusing to pass: the type scale would be uncompared, not clean.")
    sys.exit(1)
for _key, _expected in FONT_SIZE_KEYS:
    if _key not in _typography:
        print(f"ERROR: typography.{_key} is missing from DESIGN.md frontmatter.")
        print("Refusing to pass: the type scale would be partially uncompared.")
        sys.exit(1)

# Only these two sections carry literal values a CSS declaration can equal.
# typography: is a set of inline maps and rounded: is uniformly "0px" whose
# CSS side is written as a bare `0`; both are handled by the explicit path
# below rather than being compared generically.
COMPARABLE_SECTIONS = ("colors", "spacing", "rounded")

for section in COMPARABLE_SECTIONS:
    for key, design_value in sorted(values[section].items()):
        css_name = resolve_css_name(section, key, css_values)

        if css_name is None or css_name not in css_values:
            # Not a skip — an error. A DESIGN.md token with no mirrored CSS
            # property is drift in the other direction, and it must not be
            # folded into the skip list where it would look deliberate.
            mismatches.append(
                (f"{section}.{key}", f"--{css_name or '?'}", design_value,
                 "ABSENT from tokens.css")
            )
            continue

        if css_name in tvc.SKIP_REASONS:
            skipped.append((f"{section}.{key}", tvc.SKIP_REASONS[css_name]))
            continue

        css_value = css_values[css_name]
        if tvc.values_match(design_value, css_value):
            compared.append((f"{section}.{key}", f"--{css_name}", design_value, css_value))
        else:
            mismatches.append((f"{section}.{key}", f"--{css_name}", design_value, css_value))

# The --text-* type-scale steps, compared against typography:<key> fontSize.
for key, css_name in [(k, k) for k, _ in FONT_SIZE_KEYS]:
    design_value = _typography[key]
    if css_name not in css_values:
        mismatches.append((f"typography.{key}", f"--{css_name}", design_value,
                           "ABSENT from tokens.css"))
        continue
    if tvc.values_match(design_value, css_values[css_name]):
        compared.append((f"typography.{key}", f"--{css_name}", design_value,
                         css_values[css_name]))
    else:
        mismatches.append((f"typography.{key}", f"--{css_name}", design_value,
                           css_values[css_name]))

# The explicit skip list is also applied to properties outside the comparable
# sections, so a token the schema cannot type is reported as skipped-with-a-
# reason rather than being absent from the report. This is the STI-450 lesson:
# silence is not a pass.
for css_name, reason in sorted(tvc.SKIP_REASONS.items()):
    if css_name in css_values and not any(s[0].endswith(f".{css_name}") for s in skipped):
        skipped.append((f"--{css_name}", reason))

# A stale skip entry is a defect in the skip list itself: it would suppress a
# comparison that is now perfectly possible (e.g. someone gives --gutter a
# frontmatter key). Failing closed here keeps the list honest.
stale = [
    name
    for name in tvc.SKIP_REASONS
    if name not in css_values
]
if stale:
    print("ERROR: the token value skip list names properties that no longer exist in tokens.css:")
    for name in stale:
        print(f"  --{name}: listed as non-comparable but absent from tokens.css")
    print("")
    print("Either restore the property or remove the skip entry. A stale entry")
    print("silently disables a comparison, which is the STI-450 defect again.")
    sys.exit(1)

if mismatches:
    print("ERROR: tokens.css values have drifted from their DESIGN.md values:")
    for key, prop, design_value, css_value in mismatches:
        print(f"  {key}: DESIGN.md {design_value!r}  vs  {prop}: {css_value!r}")
    print("")
    print("DESIGN.md is the source of truth: change it first, then mirror it in tokens.css.")
    print("Both changes belong in the SAME pull request (STI-226 rule 7).")
    sys.exit(1)

if skipped:
    print(f"Token drift gate: {len(compared)} values compared and equal; "
          f"{len(skipped)} skipped (not comparable, listed with reasons):")
    for name, reason in skipped:
        print(f"  SKIP {name:24s} {reason}")
    print("")

# Coverage is itself an assertion. Every property in tokens.css must be either
# compared or explicitly skipped, and the two counts must account for all of
# them. A number that falls short means a new category of property escaped
# classification and is being passed over in silence — the STI-450 defect.
accounted = len(compared) + len(skipped)
if accounted != len(css_values):
    unaccounted = sorted(
        set(css_values) - {p.lstrip("-") for _, p, _, _ in compared}
        - {s[0].lstrip("-") for s in skipped}
    )
    print(f"ERROR: value comparison covered {accounted} of {len(css_values)} "
          f"properties in tokens.css.")
    for name in unaccounted:
        print(f"  --{name}: {css_values[name]}  -> neither compared nor skipped")
    print("")
    print("Refusing to pass: an unclassified property is not a passing property.")
    print("Add it to COMPARABLE_SECTIONS/FONT_SIZE_KEYS or to SKIP_REASONS with a")
    print("reason. Silence is not a verdict.")
    sys.exit(1)

print(f"Token drift gate: every comparable token value matches DESIGN.md "
      f"({accounted} of {len(css_values)} properties accounted for).")
PY

# ---------------------------------------------------------------------------
# 4. DESIGN.md itself must lint clean
# ---------------------------------------------------------------------------
if command -v npx >/dev/null 2>&1; then
  # Fail closed, never open. The previous version captured the linter with
  # `|| true` and only looked at the output `if [ -n "$LINT_OUT" ]`, so a
  # silent or absent linter skipped the check entirely and the gate still
  # exited 0. STI-450 verified that: stubbing `npx` to print nothing, with a
  # lint-broken DESIGN.md in place, produced
  #     "Token drift gate: passed" / EXIT=0
  # An unrunnable linter and a clean linter are not the same result, and a
  # gate that cannot tell them apart is not a gate. Every failure mode below
  # is now a hard error: a registry outage, a renamed/unpublished package, a
  # linter crash, or output we cannot parse.
  if ! LINT_OUT="$(cd "$REPO_ROOT" && npx --yes @google/design.md lint DESIGN.md 2>&1)"; then
    echo "ERROR: could not run the DESIGN.md linter (npx/@google/design.md)."
    printf '%s\n' "$LINT_OUT"
    echo "Refusing to pass: an unrunnable linter is not a clean lint."
    exit 1
  fi

  if [ -z "$LINT_OUT" ]; then
    echo "ERROR: the DESIGN.md linter produced no output; cannot verify it is lint-clean."
    echo "Refusing to pass: silence is not a clean lint."
    exit 1
  fi

  if ! SUMMARY="$(printf '%s' "$LINT_OUT" | python3 -c 'import json,sys; s=json.load(sys.stdin).get("summary"); print(s["errors"], s["warnings"])' 2>/dev/null)"; then
    echo "ERROR: could not parse the DESIGN.md linter output as JSON."
    printf '%s\n' "$LINT_OUT"
    echo "Refusing to pass: unparseable output is not a clean lint."
    exit 1
  fi

  read -r ERRORS WARNINGS <<EOF
$SUMMARY
EOF
  if [ "$ERRORS" != "0" ] || [ "$WARNINGS" != "0" ]; then
    echo "ERROR: DESIGN.md does not lint clean (errors=$ERRORS warnings=$WARNINGS)."
    printf '%s\n' "$LINT_OUT"
    echo "DESIGN.md's own rule: resolve every error and every warning before merging."
    exit 1
  fi
  echo "Token drift gate: DESIGN.md lints clean (0 errors, 0 warnings)."
else
  echo "ERROR: npx is unavailable, so DESIGN.md cannot be linted."
  echo "Refusing to pass: an unrunnable linter is not a clean lint."
  exit 1
fi

echo "Token drift gate: passed"
exit 0
