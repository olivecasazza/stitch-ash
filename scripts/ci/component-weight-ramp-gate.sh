#!/usr/bin/env bash
# scripts/ci/component-weight-ramp-gate.sh
# Fails when component CSS declares a font weight that DESIGN.md's `typography:`
# block does not contain.
#
# STI-516: `token-drift-gate.sh` walks one edge of a three-node chain —
#
#     DESIGN.md  --(gated)-->  tokens.css  --(UNGATED)-->  component CSS
#      design-lead            the mirror             this repo's .vue/.css
#
# — so the second edge was unverified. Six selectors in STI-515 ship
# `font-weight: 600` today, with every existing gate green, because nothing
# looked at component CSS at all. This gate is that second edge.
#
# TIER 1 ONLY, deliberately. The ramp is the cheapest check with the least
# ambiguity: `typography:` is a closed set of weights, so a literal outside it
# is a defect by construction and no selector-to-token mapping is needed to
# know it. Tier 2 (raw literals on the 4px grid / type steps) needs an
# allowlist for genuinely one-off values, and tier 3 (selector -> `components:`
# token diffing) needs a hand-maintained mapping file. Both are deferred, and
# this gate does not pretend to cover them.
#
# What it enforces:
#   1. The legal weight set is READ FROM DESIGN.md, never hardcoded here. If
#      design-lead adds a weight to `typography:`, this gate follows on its own
#      and design-lead does not have to touch a CI script.
#   2. Every `font-weight: <literal>` in component CSS is in that set.
#   3. Every `font:` shorthand whose leading token is a weight literal is too,
#      so the check cannot be routed around with the shorthand.
#   4. Every value named in the baseline file still exists at the same
#      selector. A baseline entry that no longer matches is an ERROR, not a
#      pass: it means a fix landed without the baseline being tightened, and a
#      baseline that only ever grows is a graveyard, not a ratchet.
#
# Baseline, not allowlist: the known violations from STI-515 are recorded in
# scripts/ci/component-weight-ramp-baseline.txt and reported on every run, so
# this gate can land green and still fail the PR that introduces the NEXT one.
# That is the difference between a ratchet and a permanent red job that gets
# disabled and then protects nothing.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DESIGN="$REPO_ROOT/DESIGN.md"
TOKENS="$REPO_ROOT/app/assets/css/tokens.css"
BASELINE="$REPO_ROOT/scripts/ci/component-weight-ramp-baseline.txt"

for f in "$DESIGN" "$TOKENS" "$BASELINE"; do
  [ -f "$f" ] || { echo "ERROR: missing required file: $f"; exit 1; }
done

python3 - "$REPO_ROOT" "$DESIGN" "$TOKENS" "$BASELINE" <<'PY'
import os
import re
import sys

repo_root, design_path, tokens_path, baseline_path = sys.argv[1:5]
design_src = open(design_path, encoding="utf-8").read()
tokens_src = open(tokens_path, encoding="utf-8").read()

# The style sources this gate walks. The first four are the scope STI-516 names;
# the last three are the root-level files and the root stylesheet, which carry
# real font-weight declarations and were otherwise invisible to the walk.
STYLE_DIRS = ["app/assets/css", "app/components", "app/pages", "app/layouts"]
EXTRA_FILES = ["app/error.vue", "app/app.vue", "app/assets/main.css"]

# ---------------------------------------------------------------------------
# 1. The legal weight set, read from DESIGN.md's `typography:` block
# ---------------------------------------------------------------------------
fm_match = re.match(r"\A---\n(.*?)\n---\n", design_src, re.S)
if not fm_match:
    print("ERROR: DESIGN.md has no YAML frontmatter; cannot read the weight ramp.")
    print("Refusing to pass: an unreadable ramp is not a clean ramp.")
    sys.exit(1)
frontmatter = fm_match.group(1)

typo_match = re.search(r"^typography:\n((?:[ \t]+.*\n?|\n)*)", frontmatter, re.M)
if not typo_match:
    print("ERROR: DESIGN.md frontmatter has no `typography:` block.")
    print("Refusing to pass: the weight ramp has no source of truth.")
    sys.exit(1)

# step name -> declared fontWeight, so a failure can name the exact token a
# selector contradicts rather than only saying "that is off the ramp".
step_weight = {}
for line in typo_match.group(1).splitlines():
    km = re.match(r'^[ \t]+([A-Za-z0-9_"\'-]+):\s*\{(.*)\}\s*$', line)
    if not km:
        continue
    wm = re.search(r"fontWeight:\s*(\d+)", km.group(2))
    if wm:
        step_weight[km.group(1).strip("\"'")] = int(wm.group(1))

if not step_weight:
    print("ERROR: DESIGN.md `typography:` declares no fontWeight on any step.")
    print("Refusing to pass: an empty ramp would make every weight legal.")
    sys.exit(1)

ramp = set(step_weight.values())

# `--text-xs` -> `typography.text-xs`, read off the trace comments tokens.css
# already carries. This reuses the mirror's own citation rather than adding a
# second, hand-maintained mapping.
prop_to_token = {}
for mm in re.finditer(r"--([A-Za-z0-9_-]+)\s*:\s*[^;{}]*;([^\n]*)", tokens_src):
    cite = re.search(r"\btypography\.([A-Za-z0-9_-]+)\b", mm.group(2))
    if cite and cite.group(1) in step_weight:
        prop_to_token["--" + mm.group(1)] = "typography." + cite.group(1)

# ---------------------------------------------------------------------------
# 2. Walk component CSS and collect every weight literal
# ---------------------------------------------------------------------------
# `bold` is 700 by definition. `bolder` / `lighter` are relative weights and
# cannot be checked against a closed set, so they are not checked here; the
# scope limit is stated in the baseline file rather than left implied.
KEYWORD_WEIGHT = {"normal": 400, "bold": 700}

# A `font:` shorthand whose first token is one of these carries no weight.
SHORTHAND_NON_WEIGHT = {
    "inherit", "initial", "unset", "revert", "revert-layer", "caption",
    "icon", "menu", "message-box", "small-caption", "status-bar",
}

STYLE_BLOCK_RE = re.compile(r"<style\b[^>]*>(.*?)</style>", re.S | re.I)
FONT_WEIGHT_RE = re.compile(r"(?<![\w-])font-weight\s*:\s*([^;}]+)")
FONT_SHORTHAND_RE = re.compile(r"(?<![\w-])font\s*:\s*([^;}]+)")


def mask_comments(src):
    """Blank out /* ... */ while preserving offsets and line numbers."""
    out = list(src)
    i = 0
    while True:
        start = src.find("/*", i)
        if start < 0:
            return "".join(out)
        end = src.find("*/", start + 2)
        if end < 0:
            return "".join(out)
        end += 2
        for k in range(start, end):
            if out[k] != "\n":
                out[k] = " "
        i = end


def parse_blocks(masked):
    """Return [{open, close, chain}] for every `{ }` block, chain outermost first.

    Comments are already masked, so a brace inside one cannot open a block.
    """
    blocks = []
    stack = []
    prelude_start = 0
    for i, ch in enumerate(masked):
        if ch == "{":
            selector = " ".join(masked[prelude_start:i].split())
            entry = {
                "open": i,
                "close": None,
                "chain": tuple(stack) + (selector,),
            }
            blocks.append(entry)
            stack.append(entry)
            prelude_start = i + 1
        elif ch == "}":
            if stack:
                stack.pop()["close"] = i
            prelude_start = i + 1
        elif ch == ";":
            prelude_start = i + 1
    for entry in blocks:
        if entry["close"] is None:
            entry["close"] = len(masked)
    return blocks


def innermost(blocks, pos):
    """The block containing `pos`, or None. Blocks open in source order, so the
    last one that starts before `pos` and ends after it is the innermost."""
    found = None
    for entry in blocks:
        if entry["open"] < pos < entry["close"]:
            found = entry
    return found


def literal_weight(raw):
    """The numeric weight a declaration spells out, or None if it is not one."""
    m = re.match(r"^(\d+)\b", raw)
    if m:
        return int(m.group(1))
    if raw.lower() in KEYWORD_WEIGHT:
        return KEYWORD_WEIGHT[raw.lower()]
    return None


violations = []   # dicts: path, line, selector, prop, value, token
checked = 0       # every weight literal the walk actually inspected
advisories = []   # SVG presentation attributes: reported, never gated

files = []
for rel_dir in STYLE_DIRS:
    for dirpath, _dirnames, filenames in os.walk(os.path.join(repo_root, rel_dir)):
        for name in sorted(filenames):
            if name.endswith((".vue", ".css")):
                files.append(os.path.join(dirpath, name))
for rel_file in EXTRA_FILES:
    candidate = os.path.join(repo_root, rel_file)
    if os.path.isfile(candidate):
        files.append(candidate)

for path in sorted(files):
    rel = os.path.relpath(path, repo_root)
    src = open(path, encoding="utf-8").read()

    # A .vue file contributes only its <style> blocks; markup is not CSS.
    if rel.endswith(".vue"):
        regions = [(m.group(1), m.start(1)) for m in STYLE_BLOCK_RE.finditer(src)]
    else:
        regions = [(src, 0)]

    for text, offset in regions:
        masked = mask_comments(text)
        blocks = parse_blocks(masked)
        # Lines already passed in the file before this <style> block began.
        line_shift = src.count("\n", 0, offset)
        for mm in FONT_WEIGHT_RE.finditer(masked):
            raw = mm.group(1).strip()
            weight = literal_weight(raw)
            if weight is None:
                continue
            checked += 1
            if weight in ramp:
                continue
            block = innermost(blocks, mm.start())
            chain = block["chain"] if block else ()
            token = ""
            if block:
                head = masked[block["open"]:block["close"]]
                size = re.search(
                    r"font-size\s*:\s*var\((--[A-Za-z0-9_-]+)\)", head
                )
                if size and size.group(1) in prop_to_token:
                    token = prop_to_token[size.group(1)]
            violations.append(
                {
                    "path": rel,
                    "line": 1 + masked.count("\n", 0, mm.start()) + line_shift,
                    "selector": " ".join(chain) if chain else "<top level>",
                    "prop": "font-weight",
                    "raw": raw,
                    "value": str(weight),
                    "token": token,
                }
            )
        for mm in FONT_SHORTHAND_RE.finditer(masked):
            raw = mm.group(1).strip()
            first = raw.split()[0] if raw else ""
            if first.lower() in SHORTHAND_NON_WEIGHT:
                continue
            weight = literal_weight(first)
            if weight is None:
                continue
            checked += 1
            if weight in ramp:
                continue
            block = innermost(blocks, mm.start())
            chain = block["chain"] if block else ()
            violations.append(
                {
                    "path": rel,
                    "line": 1 + masked.count("\n", 0, mm.start()) + line_shift,
                    "selector": " ".join(chain) if chain else "<top level>",
                    "prop": "font (shorthand)",
                    "raw": raw,
                    "value": str(weight),
                    "token": "",
                }
            )

    # SVG presentation attributes are markup, not CSS declarations, so they are
    # outside this gate's scope — but they are reported, so that nobody reading
    # a green run assumes a `font-weight="600"` on a <text> element is covered.
    if rel.endswith(".vue"):
        for mm in re.finditer(r'font-weight\s*=\s*"([^"]+)"', src):
            weight = literal_weight(mm.group(1).strip())
            if weight is None or weight in ramp:
                continue
            advisories.append(
                {
                    "path": rel,
                    "line": 1 + src.count("\n", 0, mm.start()),
                    "raw": mm.group(1).strip(),
                }
            )

# ---------------------------------------------------------------------------
# 3. Ratchet against the recorded baseline
# ---------------------------------------------------------------------------
baseline_entries = []
with open(baseline_path, encoding="utf-8") as fh:
    for lineno, raw_line in enumerate(fh, 1):
        line = raw_line.split("#", 1)[0].strip()
        if not line:
            continue
        parts = [p.strip() for p in line.split("::")]
        if len(parts) != 4:
            print(f"ERROR: {os.path.basename(baseline_path)}:{lineno} is malformed.")
            print(f"  {raw_line.strip()}")
            print("  Expected: path::selector::property::value")
            sys.exit(1)
        baseline_entries.append(tuple(parts))

baseline_keys = set(baseline_entries)

offending = [
    v
    for v in violations
    if (v["path"], v["selector"], v["prop"], v["value"]) not in baseline_keys
]

still_open = []
stale = []
for entry in baseline_entries:
    match = next(
        (
            v
            for v in violations
            if (v["path"], v["selector"], v["prop"], v["value"]) == entry
        ),
        None,
    )
    if match is None:
        stale.append(entry)
    else:
        still_open.append((entry, match))

ramp_desc = ", ".join(
    "{} ({})".format(
        weight, ", ".join(sorted(k for k, v in step_weight.items() if v == weight))
    )
    for weight in sorted(ramp)
)

if offending:
    print("ERROR: component CSS declares a font weight outside DESIGN.md's ramp.")
    print(f"  Ramp: {ramp_desc}")
    for v in offending:
        if v["token"]:
            step = v["token"].split(".", 1)[1]
            why = "contradicts {} (fontWeight {})".format(
                v["token"], step_weight[step]
            )
        else:
            why = "off the ramp by construction (no --text-* step in the same rule)"
        print(f"  {v['path']}:{v['line']}  {v['selector']}")
        print(f"      {v['prop']}: {v['raw']}  -> {why}")
    print("")
    print("DESIGN.md is the source of truth. If the weight is legitimate, add it")
    print("to `typography:` FIRST (design-lead owns DESIGN.md), then fix the")
    print("selector. Do not silence this by widening the baseline.")
    sys.exit(1)

if stale:
    print("ERROR: baseline entries no longer match any violation.")
    for path, selector, prop, value in stale:
        print(f"  {path}  {selector}  {prop}: {value}")
    print("")
    print("A fixed violation must be DELETED from")
    print(f"  {os.path.basename(baseline_path)}")
    print("in the same PR that fixes it. A baseline that only ever grows is a")
    print("graveyard: it hides new violations that happen to reuse an old key.")
    sys.exit(1)

print(
    "Component weight ramp gate: {} weight literal(s) inspected across {} "
    "style source(s); {} outside the ramp, {} in the baseline.".format(
        checked,
        len(files),
        len(violations),
        len(still_open),
    )
)
print(f"  Ramp: {ramp_desc}")
if still_open:
    print(
        "Component weight ramp gate: {} known violation(s) still open, recorded "
        "in {} and tracked by STI-515:".format(
            len(still_open), os.path.basename(baseline_path)
        )
    )
    for _entry, v in still_open:
        print(f"  {v['path']}:{v['line']}  {v['selector']}  {v['prop']}: {v['raw']}")
if advisories:
    print("")
    print("ADVISORY (not gated): a font weight outside the ramp on an SVG")
    print("presentation attribute. Those are markup attributes, not CSS")
    print("declarations, so this gate does not fail on them. Treat them as")
    print("findings for a human, not as covered by this gate.")
    for a in advisories:
        print(f'  {a["path"]}:{a["line"]}  font-weight="{a["raw"]}"')
print("Component weight ramp gate: passed")
sys.exit(0)
PY
