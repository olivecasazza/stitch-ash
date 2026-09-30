#!/usr/bin/env python3
"""Build a terranix-equivalent config.tf.json from the real terranix.nix.

Not a general Nix evaluator. It reads the exact `data = builtins.toJSON {
product = { ... }` blocks the live terranix uses and emits the JSON that
terranix would hand `tofu apply`, so the preflight guard is tested against real
declared values instead of values a test author typed by hand.

Usage: build-terranix-config.py <terranix.nix> <out.json>
"""
import json
import re
import sys


def unquote_nix(raw):
    """Nix string literal -> Python string, for the forms terranix uses."""
    raw = raw.strip()
    if raw.startswith('"') and raw.endswith('"') and len(raw) >= 2:
        body = raw[1:-1]
        return (
            body.replace('\\"', '"')
            .replace("\\n", "\n")
            .replace("\\t", "\t")
            .replace("\\\\", "\\")
        )
    if raw.startswith("''") and raw.endswith("''") and len(raw) >= 4:
        return raw[2:-2]
    return raw


def find_block(src, start, at_brace=False):
    """Return the TEXT INSIDE the balanced {...} that begins at `start`.

    at_brace=True means `start` already points AT an opening brace (the common
    case when a regex has just matched through '{'). Otherwise the '{' is
    searched forward from `start`.

    Returns the inner text WITHOUT the outer braces. Callers that want the
    braces back prepend one.
    """
    i = start if at_brace else src.index("{", start)
    if not at_brace and start < len(src) and src[start] == "[":
        i = start
    open_at = i
    opener = src[open_at]
    closer = {"{": "}", "[": "]"}[opener]
    depth = 0
    n = len(src)
    while i < n:
        if src.startswith("''", i):
            j = src.find("''", i + 2)
            i = n if j == -1 else j + 2
            continue
        ch = src[i]
        if ch == '"':
            i += 1
            while i < n and src[i] != '"':
                i += 2 if src[i] == chr(92) else 1
            i += 1
            continue
        if ch in "{[":
            depth += 1
        elif ch in "}]":
            depth -= 1
            if depth == 0:
                # inner text only: everything between the delimiters
                return src[open_at + 1 : i]
        i += 1
    raise ValueError("unbalanced braces")

def strip_comments(text):
    """Remove Nix '#' comments without losing string content.

    Body copy in terranix contains literal '#' and apostrophes, so comment
    detection must be string-aware in BOTH Nix string forms:
      "..."  escapes with backslash
      ''...'' closes on the next ''  (a lone ' is ordinary text inside it)
    Braces inside either form must also be ignored by find_block.
    """
    out, i, n = [], 0, len(text)
    while i < n:
        if text.startswith("''", i):
            j = text.find("''", i + 2)
            j = n if j == -1 else j
            out.append(text[i : j + 2])
            i = j + 2
            continue
        ch = text[i]
        if ch == '"':
            j = i + 1
            while j < n:
                if text[j] == "\\":
                    j += 2
                    continue
                if text[j] == '"':
                    break
                j += 1
            out.append(text[i : min(j + 1, n)])
            i = min(j + 1, n)
            continue
        if ch == "#":
            j = text.find("\n", i)
            i = n if j == -1 else j
            continue
        out.append(ch)
        i += 1
    return "".join(out)


def parse_product(block):
    product = {}
    m = re.search(r"handle\s*=\s*(\"(?:[^\"\\]|\\.)*\")", block)
    if m:
        product["handle"] = unquote_nix(m.group(1))
    m = re.search(r"title\s*=\s*(\"(?:[^\"\\]|\\.)*\")", block)
    if m:
        product["title"] = unquote_nix(m.group(1))
    m = re.search(r"\bstatus\s*=\s*(\"(?:[^\"\\]|\\.)*\")", block)
    if m:
        product["status"] = unquote_nix(m.group(1))

    vm = re.search(r"variants\s*=\s*\[", block)
    if vm:
        inner = "{" + find_block(block, vm.end() - 1) + "}"
        variants = []
        for piece in re.finditer(
            r"\{([^{}]*?)\}", inner, re.S
        ):
            vb = piece.group(1)
            variant = {}
            for key in ("option1", "option2", "option3"):
                km = re.search(key + r"\s*=\s*(\"(?:[^\"\\]|\\.)*\")", vb)
                if km:
                    variant[key] = unquote_nix(km.group(1))
            for key in ("price", "sku", "inventory_policy", "inventory_management"):
                km = re.search(key + r'\s*=\s*("(?:[^"\\]|\\.)*")', vb)
                if km:
                    variant[key] = unquote_nix(km.group(1))
            variants.append(variant)
        if variants:
            product["variants"] = variants
    return product


def main():
    src = strip_comments(open(sys.argv[1], encoding="utf-8").read())

    res = re.search(r"resource\.restapi_object\s*=\s*\{", src)
    if not res:
        sys.exit("no resource.restapi_object in %s" % sys.argv[1])
    body = "{" + find_block(src, res.end() - 1, at_brace=True) + "}"

    entries = []
    for m in re.finditer(r"\n\s{4}(product_\w+)\s*=\s*\{", body):
        name = m.group(1)
        block = "{" + find_block(body, m.end() - 1, at_brace=True) + "}"
        dm = re.search(r"data\s*=\s*builtins\.toJSON\s*\{", block)
        if not dm:
            continue
        payload = "{" + find_block(block, dm.end() - 1, at_brace=True) + "}"
        product = parse_product(payload)
        if "handle" not in product:
            continue
        entries.append(
            {
                "type": "restapi_object",
                "name": name,
                "data": json.dumps({"product": product}),
            }
        )

    if not entries:
        sys.exit("no products parsed from %s" % sys.argv[1])

    json.dump(
        {"resource": {"restapi_object": entries}},
        open(sys.argv[2], "w", encoding="utf-8"),
        indent=2,
    )
    print(
        "wrote %s with %d product(s): %s"
        % (sys.argv[2], len(entries), ", ".join(e["data"] and json.loads(e["data"])["product"]["handle"] for e in entries))
    )


if __name__ == "__main__":
    main()
