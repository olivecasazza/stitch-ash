# Fixture for the DESIGN.md scan root.

Mirrors the shape of the real spec at DESIGN.md:604, which transcribes the
rendered PDP expander block line for line in a fenced example.

The claim in the transcript below is the defect this fixture exists to pin: the
design spec restates the unquoted production lead time as the exact current
customer-facing string, with nothing marking it as unsourced. The catalog copy
here is deliberately CLEAN, so a gate that only scans catalog/ reports a clean
run on this fixture — which is exactly the false green that let this
occurrence sit in main untouched.

Note that this header deliberately does NOT quote the claim. The gate scans the
whole file, fenced examples and comments included, so a fixture that mentioned
the string in its own prose would be flagged for the wrong line. Keep the
number out of the writing above the transcript so the fixture fails only for
the copy it is actually asserting.

## Product detail page

Every product fact lives in the expander. Example (sku-001), as the sections read:

```
Material — Cotton fleece. / Brushed interior.
Fit — Oversized. / Dropped shoulder.
Construction — Double-stitched seams.
Embroidery — Black thread on black. / Design on chest. / Mark on left sleeve.
Care — Cold wash, inside out. / Tumble dry low or hang. / Do not dry-clean.
Shipping & Returns — Made to order. / Ships in 2–3 weeks. / Tracked
shipping. / Returns within 14 days, unworn.
```