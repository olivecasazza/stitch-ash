---
version: alpha
name: Stitch and Ash
colors:
  ink: "#000000"
  primary: "#5C5C5C"
  charcoal: "#0E0E0E"
  grey-950: "#1A1A1A"
  grey-400: "#9A9A9A"
  grey-200: "#CFCFCF"
  bone: "#E8E8E8"
  white: "#FFFFFF"
  border-rule: "#2A2A2A"
  focus: "#FFFFFF"
typography:
  h1: { fontFamily: "JetBrains Mono", fontWeight: 500, fontSize: "2.5rem", lineHeight: 1.05, letterSpacing: "-0.02em" }
  h2: { fontFamily: "JetBrains Mono", fontWeight: 500, fontSize: "1.75rem", lineHeight: 1.1, letterSpacing: "-0.01em" }
  h3: { fontFamily: "JetBrains Mono", fontWeight: 500, fontSize: "1.25rem", lineHeight: 1.15, letterSpacing: "0em" }
  body-lg: { fontFamily: "JetBrains Mono", fontWeight: 400, fontSize: "0.9375rem", lineHeight: 1.55, letterSpacing: "0em" }
  body: { fontFamily: "JetBrains Mono", fontWeight: 400, fontSize: "0.8125rem", lineHeight: 1.55, letterSpacing: "0em" }
  body-sm: { fontFamily: "JetBrains Mono", fontWeight: 400, fontSize: "0.75rem", lineHeight: 1.5, letterSpacing: "0.02em" }
  label: { fontFamily: "JetBrains Mono", fontWeight: 500, fontSize: "0.6875rem", lineHeight: 1.3, letterSpacing: "0.12em", fontFeature: "'tnum' 1" }
  numeric: { fontFamily: "JetBrains Mono", fontWeight: 500, fontSize: "0.8125rem", lineHeight: 1.4, letterSpacing: "0em", fontFeature: "'tnum' 1" }
spacing:
  xs:   "4px"
  sm:   "8px"
  md:   "12px"
  lg:   "16px"
  xl:   "24px"
  "2xl": "32px"
  "3xl": "48px"
rounded:
  none: "0px"
  sm:   "0px"
  md:   "0px"
  lg:   "0px"
components:
  button-primary:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "12px 16px"
  button-secondary:
    textColor:        "{colors.bone}"
    typography:       "{typography.label}"
    rounded:          "{rounded.none}"
    padding:          "12px 16px"
  card:
    backgroundColor: "{colors.charcoal}"
    textColor:        "{colors.bone}"
    typography:       "{typography.body}"
    rounded:          "{rounded.none}"
    padding:          "16px"
  input:
    backgroundColor: "{colors.charcoal}"
    textColor:        "{colors.bone}"
    typography:       "{typography.body}"
    rounded:          "{rounded.none}"
    padding:          "10px 12px"
  badge:
    textColor:        "{colors.grey-400}"
    typography:       "{typography.label}"
    rounded:          "{rounded.none}"
    padding:          "2px 6px"
  surface-well:
    backgroundColor: "{colors.grey-950}"
  divider:
    backgroundColor: "{colors.border-rule}"
  focus-ring:
    backgroundColor: "{colors.focus}"
    textColor:        "{colors.ink}"
  button-disabled:
    backgroundColor: "{colors.white}"
    textColor:       "{colors.ink}"
    typography:      "{typography.label}"
    rounded:         "{rounded.none}"
    padding:         "12px 16px"
  price:
    textColor:        "{colors.grey-200}"
    typography:       "{typography.numeric}"
  accordion-body:
    backgroundColor: "{colors.charcoal}"
    textColor:       "{colors.bone}"
    typography:      "{typography.body-sm}"
    padding:         "4px 12px 16px"
  accordion-icon:
    textColor: "{colors.grey-400}"
---

## Overview

Stitch and Ash is a premium black-apparel label built around embroidered
design. The UI is **compact monochrome minimal**: pitch-black ground, a flat
achromatic grey hierarchy, **one typeface (JetBrains Mono) carrying everything
from hero lines to body to price**, square edges everywhere, and hairline
dividers in place of shadow. There is no editorial serif, no warm bone, no
thread-gold accent, no rounded surfaces, no second typeface.

The brand direction is restraint. A UI that disappears into the garment and
lets the embroidery carry the visual weight. Hierarchy is communicated
through type weight, hairline rules, and whitespace — never through color
contrast shifts, shadow, or radius.

## Colors

The palette is **fully achromatic on pitch black**. There is one allowed
warmth — the slight #E8E8E8 of `bone` (replacing the prior warm bone
#F7F3EC, stripped of its warmth for full neutrality). Every other token sits
on the grey ramp from #0E0E0E to #FFFFFF.

- **ink (#000000)** — the page ground, header, footer, product framing.
- **charcoal (#0E0E0E)** — elevated surface for cards and modals;
  distinguishable from `ink` only by a 1px hairline, never by shadow.
- **grey-950 (#1A1A1A)** — tertiary surface, hover wells, image fallback
  plates.
- **border-rule (#2A2A2A)** — mid-dark; the single hairline/divider value
  and the disabled-control fill.
- **primary (#5C5C5C)** — muted strokes and the brand surface for
  low-emphasis interactive elements.
- **grey-400 (#9A9A9A)** — secondary text, captions, metadata, timestamps,
  microcopy.
- **grey-200 (#CFCFCF)** — default body-text color for paragraph copy that
  is not hero or special.
- **bone (#E8E8E8)** — neutral emphasis text, the only "off-black" tone
  permitted for inline emphasis.
- **white (#FFFFFF)** — reserved for max-contrast moments only: primary
  CTA fill, focus ring. Use sparingly; overuse flattens contrast.
- **focus (#FFFFFF)** — a 2px solid square focus ring, 2px offset, no
  color tint. Accessibility-first.

**Forbidden in this seed**: warm bone #F7F3EC, thread-gold #B08D57,
error-ember #9F3A2F, ash-silver #C0C0C0. Any signal previously carried by a
hue must be re-expressed through weight, underline, or border.

## Typography

**One family does all the work.** JetBrains Mono, with tabular figures on
every numeric and tracked uppercase on every label. The previous stack
(Playfair Display + Inter + JetBrains Mono) collapses to a single mono
face; nothing else reaches the surface.

- **Display (`h1`, `h2`)** — JetBrains Mono 500 weight, tight `lineHeight`,
  negative letter-spacing. Compact hero text — never editorial-feeling.
- **Section heads (`h3`)** — 1.25rem, weight 500, no italics, no
  decorative flourishes.
- **Body (`body-lg`, `body`, `body-sm`)** — 12–15px range, 1.5 line-height,
  plain. Bold is reserved for emphasis; underline or `text-transform:
  uppercase` carries hierarchy instead.
- **Labels (`label`)** — tracked uppercase at 11px, `font-feature: 'tnum'`
  on by default. Used for nav, badges, captions, button text, form labels.
- **Numbers (`numeric`)** — tabular figures; prices, sizes, SKUs, dates,
  counts. Never proportional.

`letter-spacing` stays negative on display, zero on body, positive on
labels. The "editorial" feeling that previously lived in Playfair is now
expressed through whitespace and rule lines alone.

## Layout

Compact modern rhythm on a **4px base grid** (tightened from the prior
0.5rem grid). Section spacing is reduced roughly 40% from the previous
warm-bone era.

- **Page gutter** — `clamp(1rem, 2vw + 0.5rem, 2.5rem)`. About half the
  previous upper bound; mobile reads tighter, desktop stays generous.
- **Section spacing** — `section-sm 32px`, `section-md 48px`,
  `section-lg 64px`, `section-xl 96px`. Pick the smallest one that still
  separates the blocks.
- **Base unit** — `4px`. Every padding, gap, and offset snaps to it. No
  `13px` or `7px`; either 12 or 16.
- **Container max** — 68.75rem; content reaches it sooner because the
  surrounding rhythm is tighter.

## Elevation & Depth

**Flat.** No shadows on cards, modals, buttons, or focus. Hierarchy
arrives only through:

1. **1px hairline borders** (color: `border-rule` #2A2A2A) between
   sections and at the edge of every elevated surface.
2. **Surface tint shift** — `ink` → `charcoal` → `grey-950`, each
   distinguishable only by a hairline, never by shadow or glow.
3. **Weight and underline in type** — never shadow or blur.

The one allowed "depth" is the 1px hairline, and it counts as a border,
not as a shadow. If a design choice needs an actual shadow to read, the
design is wrong; rework it.

## Shapes

**Zero radius everywhere.** Buttons, cards, inputs, badges, image plates,
modals, focus rings — all square. The 2px radius that lingered in the
prior `radius-tight` token is **deleted**, not preserved. Every `rounded:`
key in this seed resolves to `"0"`.

## Components

### Buttons
- **Primary** — white fill, black text, square, label typography,
  `12px 16px` padding. No hover transition beyond a 100ms background
  swap to `grey-200` (#CFCFCF).
- **Secondary** — transparent fill, `primary` (#5C5C5C) text, square, label
  typography. Focus ring: 2px white solid.
- **Tertiary** — text-only link, no underline at rest, underline on hover.
- **Disabled** — `primary` border, `grey-400` text, no fill.

### Forms
- **Input** — charcoal background, hairline border, label-shadowed body
  typography. Active field is distinguished by the underline (grey-400
  bottom edge), never by a box-shadow ring.
- Labels sit above inputs in `label` typography.
- Validation messages use grey-400 weight plus underline; never red text.

### Product card
- Square charcoal plate, hairline border, 4:5 image aspect.
- No hover lift. Hover swaps the primary image for the macro detail via
  a 120ms opacity transition.
- Name and price on a single row below the image, 12px gap, `numeric`
  typography for the price.
- No "quick add" — direct to PDP for size selection.

### Navigation
- Sticky, transparent over hero, ink-black on scroll.
- Wordmark left; primary links right; cart indicator as a numeric
  ("02"), no badge box.
- Active route marked with an underline, never a background pill.

### Badges
- Transparent fill, hairline `primary` border, tracked-uppercase `label`
  typography. Used for `EMBROIDERED`, `LIMITED RUN`, `LOW STOCK`,
  `MADE TO ORDER`.

### Header
- Sticky but subtle; transparent over hero, ink-black after scroll.
- Left: wordmark. Right: Shop, Story, Account, Cart.
- Cart indicator should be numeric and quiet, not a large badge.

## Do's and Don'ts

**Do**

- Use only the twelve named colors. Add a new grey step only when a
  measured contrast pair demands it; never to "liven up" the palette.
- Run every UI change against `npx @google/design.md lint DESIGN.md` —
  resolve every `error`, every `contrast-ratio` warning, and every
  `orphaned-tokens` warning before merging.
- Verify visually on **desktop (1440×900), tablet (820×1180), AND
  mobile (390×844)**. A defect visible on only one viewport is still a
  defect.
- Keep `tokens.css` in lockstep with this file. `--ink-black`,
  `--font-body`, `--radius-tight` — every CSS custom property must trace
  to a token here.
- Commit styling decisions here before they reach a component. PRs that
  introduce a color, type, or radius without a `DESIGN.md` update are
  rejected at QA.
- Express state changes through weight, underline, and border — not
  through hue.

**Don't**

- Don't bring back Playfair Display, Inter, or any non-monospace face at
  the surface level. Inter remains an internal fallback for pathological
  glyphs only; it does not appear in typography tokens.
- Don't reintroduce warm bone #F7F3EC, thread-gold #B08D57, ember
  #9F3A2F, or ash-silver #C0C0C0. These four tokens are explicitly
  retired — see the prior `Do's and Don'ts` for the rationale, which is
  now load-bearing history rather than live guidance.
- Don't reintroduce the deleted `radius-tight: 2px` token. Every
  `rounded:` key in this seed is `"0"`; future keys must also be `"0"`.
- Don't add shadow, glow, gradient, blur, or `border-radius > 0`.
- Don't ship large blocks of prose copy. Headlines ≤ 6 words, body
  sentences ≤ 16 words, microcopy ≤ 40 chars.
- Don't use color to convey state. Weight + underline + border only.
- Don't fork the file into a per-page or per-section variant. The single
  `DESIGN.md` is the contract; component code consumes tokens by name.