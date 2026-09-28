#!/usr/bin/env python3
"""Value-equality comparison for the token drift gate (STI-459).

Extracted from `token-drift-gate.sh` so the normalisation rules can be tested
directly by `token-drift-gate-test.sh` instead of only being asserted in prose.

The gate already proved a custom property in `app/assets/css/tokens.css` cites
a token `DESIGN.md` really declares. That is a *documentation* proof. It says
nothing about whether the CSS value still equals the DESIGN.md value, so an
edit to one file and not the other passed silently. This module closes that
hole for the tokens where the comparison is meaningful.

Importable: `normalise()` and `values_match()` are pure functions with no I/O.
"""

import re

# ---------------------------------------------------------------------------
# The explicit skip list.
#
# These are properties whose tokens.css value cannot be compared against a
# DESIGN.md *value*, for one reason each. They are enumerated here — not
# inferred from a fallthrough — so that adding a fifth uncategorisable token
# forces a human to decide whether it is comparable, rather than letting an
# unrecognised value quietly pass. See token-drift-gate.sh for the rationale
# behind each category; the four below are the schema-untypeable categories
# identified in STI-446.
# ---------------------------------------------------------------------------
SKIP_REASONS = {
    # clamp() — the spec schema types fontSize/spacing as a px|rem Dimension,
    # so a fluid value has no frontmatter key. Stated in DESIGN.md prose.
    "text-display": "clamp() fluid type value; schema types fontSize as a px/rem Dimension, so it has no typography: key",
    "gutter": "clamp() fluid spacing value; a clamp() in spacing: is silently dropped by the linter and export",
    # Millisecond easing — no token type for a time/easing pair, and spacing:
    # accepts only px/rem. Stated in DESIGN.md prose under Motion.
    "transition-fast": "millisecond easing shorthand; schema has no token type for '120ms ease'",
    "transition-base": "millisecond easing shorthand; schema has no token type for '200ms ease'",
    "transition-slow": "millisecond easing shorthand; schema has no token type for '350ms ease'",
    # Border shorthands — a composite, not a Dimension. Stated in prose.
    "rule": "border shorthand composite, not a Dimension; has no frontmatter key",
    "rule-light": "border shorthand composite using color-mix(), not a Dimension; has no frontmatter key",
    "rule-control": "border shorthand composite, not a Dimension; has no frontmatter key",
    # @nuxt/fonts rewrites this stack at build time, so the stylesheet value
    # never reaches production verbatim.
    "font-mono": "@nuxt/fonts rewrites the font stack at build time; the authored value is not what ships",
    # Indirection: the value is a var() reference. The target is still checked
    # (see resolve_reference), so these are compared, not skipped — STI-462
    # finding 1 caught them being skipped and pointed out that the reason text
    # ("not a literal design token value") implied an impossibility that did
    # not actually hold.
}


def normalise(value):
    """Return a canonical form of a CSS/design token value for comparison.

    Handles the equivalences that would otherwise false-positive:

      * hex colour — case-insensitive, and a 3-digit form expands to its
        6-digit equivalent (`#000` == `#000000`).
      * time — `120ms` and `0.12s` are the same duration, and `.12s` and
        `0.12s` are the same number written differently.
      * unitless zero — in CSS `0`, `0px` and `0rem` are the same length, so
        DESIGN.md's `rounded.*: "0px"` and tokens.css's `border-radius: 0`
        must not read as drift.

    Whitespace is collapsed and surrounding quotes are dropped so that
    `"64px"` in DESIGN.md and `64px` in tokens.css compare equal.
    """
    v = value.strip()
    # Collapse internal whitespace: `1px  solid` and `1px solid` are one value.
    v = re.sub(r"\s+", " ", v)
    # DESIGN.md quotes its values; tokens.css usually does not.
    if len(v) >= 2 and v[0] == v[-1] and v[0] in "\"'":
        v = v[1:-1].strip()
    v = v.lower()

    # Hex: expand the 3-digit shorthand so #abc == #aabbcc.
    def _hex(m):
        digits = m.group(1)
        if len(digits) == 3:
            digits = "".join(c * 2 for c in digits)
        elif len(digits) == 4:  # #rgba -> #rrggbbaa
            digits = "".join(c * 2 for c in digits)
        return "#" + digits

    v = re.sub(r"#([0-9a-f]{3,8})\b", _hex, v)

    # Time: `120ms` == `0.12s` == `.12s`. Normalise both onto milliseconds.
    def _time(m):
        number, unit = m.group(1), m.group(2)
        try:
            n = float(number)
        except ValueError:
            return m.group(0)
        if unit == "s":
            n *= 1000
        # Drop a trailing zero fraction so 120.0ms and 120ms are identical.
        if n.is_integer():
            return f"{int(n)}ms"
        return f"{n}ms"

    v = re.sub(r"(?<![\w.])(\d*\.?\d+)(ms|s)\b", _time, v)

    # Unitless zero: `0`, `0px` and `0rem` are the same length in CSS. Only
    # the *sole* token in the value is collapsed, so `0 0 0 0` and `0px 0` are
    # left alone.
    if re.fullmatch(r"0(?:\.0+)?(?:px|rem|em|%)?", v):
        v = "0"

    return v.strip()


def values_match(design_value, css_value):
    """True when a DESIGN.md value and a tokens.css value are the same value."""
    return normalise(design_value) == normalise(css_value)


# ---------------------------------------------------------------------------
# Reference comparison (STI-462 finding 1)
# ---------------------------------------------------------------------------
# Some tokens.css values are not literals but references:
#     --accordion-body-bg: var(--charcoal)
#     --font-display:      var(--font-mono)
# and DESIGN.md states the same token by reference:
#     components.accordion-body.backgroundColor: "{colors.charcoal}"
#     (--font-display / --font-body alias the "Mono fallback stack")
#
# These were previously skipped as "not a literal value", which was wrong: both
# sides name the same target, so equality IS checkable. QA demonstrated a false
# negative -- swapping an accordion surface to a different declared token
# (`var(--grey-950)`) passed the gate with EXIT=0. Silently-passing is exactly
# what this gate must not do, so these are now compared rather than skipped.
#
# An alias is resolved transitively: var(--font-display) -> var(--font-mono) is
# the same token, and --font-mono is itself non-comparable, so a chain that ends
# at a skipped property is reported as an alias rather than a mismatch.

_VAR_RE = re.compile(r"^var\(\s*--([A-Za-z0-9_-]+)\s*\)$")


def var_target(css_value):
    """The custom property a `var(--x)` value points at, or None."""
    m = _VAR_RE.match(css_value.strip())
    return m.group(1) if m else None


def resolve_reference(css_name, css_values, _seen=None):
    """Follow a var() alias chain to the property actually supplying the value.

    Returns (final_css_name, final_value, depth). If the property is not a
    var() alias, it is returned unchanged at depth 0.
    """
    seen = _seen if _seen is not None else set()
    if css_name in seen:
        # A cycle is a defect in tokens.css, not a comparison result.
        return css_name, css_values.get(css_name, ""), 0
    seen.add(css_name)

    value = css_values.get(css_name, "")
    target = var_target(value)
    if target is None or target not in css_values:
        return css_name, value, 0
    final_name, final_value, depth = resolve_reference(target, css_values, seen)
    return final_name, final_value, depth + 1
