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
  outline: "#5F5F5F"
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
  # ── Type-scale steps (STI-446) ──────────────────────────────────────────────
  # `tokens.css` carries a `--text-*` step per size used by a component, and
  # `--font-display` / `--font-mono` as the two role aliases. The steps below
  # are the same eight typographies under CSS-shaped names so that each
  # `--text-*` property in the mirror has a named source token. One face:
  # JetBrains Mono at every step. The hero `--text-display` clamp is fluid and
  # is stated in prose under "Hero display line" — `fontSize` accepts only
  # px/rem dimensions, so a `clamp()` here is a lint error, not a style choice.
  text-xs:   { fontFamily: "JetBrains Mono", fontWeight: 500, fontSize: "0.6875rem", lineHeight: 1.3, letterSpacing: "0.12em", fontFeature: "'tnum' 1" }
  text-sm:   { fontFamily: "JetBrains Mono", fontWeight: 400, fontSize: "0.75rem",   lineHeight: 1.5, letterSpacing: "0.02em" }
  text-base: { fontFamily: "JetBrains Mono", fontWeight: 400, fontSize: "0.8125rem", lineHeight: 1.55, letterSpacing: "0em" }
  text-lg:   { fontFamily: "JetBrains Mono", fontWeight: 400, fontSize: "0.9375rem", lineHeight: 1.55, letterSpacing: "0em" }
  text-xl:   { fontFamily: "JetBrains Mono", fontWeight: 500, fontSize: "1.25rem",   lineHeight: 1.15, letterSpacing: "0em" }
  text-2xl:  { fontFamily: "JetBrains Mono", fontWeight: 500, fontSize: "1.75rem",   lineHeight: 1.1,  letterSpacing: "-0.01em" }
  text-3xl:  { fontFamily: "JetBrains Mono", fontWeight: 500, fontSize: "2.5rem",    lineHeight: 1.05, letterSpacing: "-0.02em" }
spacing:
  # ── 4px base grid. `4xl`/`5xl` are the top of the scale (STI-446); the
  # section rhythm below is the same four values under the names
  # components already consume. `--measure` and `--content-max`/`--content-wide`
  # are length dimensions, so they belong to the grid the scale defines.
  xs:   "4px"
  sm:   "8px"
  md:   "12px"
  lg:   "16px"
  xl:   "24px"
  "2xl": "32px"
  "3xl": "48px"
  "4xl": "64px"
  "5xl": "96px"
  section-sm: "32px"
  section-md: "48px"
  section-lg: "64px"
  section-xl: "96px"
  measure:     "65ch"
  content-max: "68.75rem"
  content-wide: "80rem"
rounded:
  none: "0px"
  sm:   "0px"
  md:   "0px"
  lg:   "0px"
  # `ui` is the vendor bridge, not a scale step. @nuxt/ui ships
  # `:host,:root{--ui-radius:.25rem}` and its Tailwind `rounded-*`
  # utilities compile against that value, NOT against the keys above, so
  # it needs its own zeroed token. Mirrored as `--ui-radius: 0` in
  # app/assets/css/tokens.css.
  ui:   "0px"
  # `prose` is the second vendor bridge (STI-603). @tailwindcss/typography
  # hard-codes `border-radius: .375rem` on `.prose pre` and `.3125rem` on
  # `.prose kbd` and exposes `--tw-prose-*` for COLOR only — there is no
  # radius variable to set, so the plugin cannot be configured to emit 0.
  # Zeroing it therefore needs an unlayered override rule, not a config
  # value. Mirrored as `--radius-prose: 0` plus a `.prose` override in
  # app/assets/css/tokens.css. See "Prose radius bridge (`rounded.prose`)".
  prose: "0px"
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
    padding:          "8px 12px"
  badge:
    backgroundColor:  "transparent"
    textColor:        "{colors.grey-400}"
    typography:       "{typography.label}"
    rounded:          "{rounded.none}"
    padding:          "0px 8px"
  # `borderColor` is deliberately absent above. The badge boundary is the
  # 1px `primary` hairline, and the schema's valid component sub-tokens are
  # backgroundColor / textColor / typography / rounded / padding / size /
  # height / width — `borderColor` is a `broken-ref` warning, so the
  # boundary is stated in prose under "Badges" with `rule` / `rule-control`
  # rather than forced into a key the linter would reject.
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
    # The panel is transparent. It used to be `charcoal`, which put the body
    # copy on a 12px inset slab while the summary sat at x=0 — the column
    # then had two left edges, and six open sections stacked into slabs.
    # Facts and labels now share one left edge; only the rules separate them.
    backgroundColor: transparent
    textColor:       "{colors.bone}"
    # Body facts render at `text-base` (13px), not `body-sm` (12px). They are
    # the substance of the page, and 12px read as a footnote to an 11px label.
    typography:      "{typography.body}"
    padding:         "0 0 16px"
  # The `<summary>` is a DISCLOSURE CONTROL, not body copy, and is
  # deliberately NOT covered by `accordion-body` (STI-521). It reads
  # uppercase with an icon and must be the heavier of the two, or the panel
  # it opens outweighs its own trigger. It is declared on `label` (500 /
  # 11px / 0.12em), the system's control-voice step — the same step badges,
  # buttons and form labels use — and NOT on `body-sm`. STI-515 shipped it
  # on `body-sm` (400) as a temporary landing on the nearest declared step;
  # that is superseded here.
  #
  # STI-659 ruled on the open naming question raised by STI-634 and the
  # answer is (a): this stays a `typography.label` INSTANCE and gets no step
  # of its own. The rule is settled by the type scale, not by taste — a
  # "distinct" step would have to differ from `label` in some property, and
  # every property is already the one that control voice wants: 500 weight
  # over a 400 panel, 11px so the panel outweighs its trigger, 0.12em
  # tracking, tabular figures, uppercase. A second step differing only in
  # name would be a duplicate with a different key, and the type scale's
  # stated invariant is one step per size. Declaring it here as a component
  # that RESOLVES to `label` is what makes it traceable; a parallel step
  # would make it a second source for the same 11px.
  #
  # Its hit height is set by `padding-block: spacing.lg` (16px) top and bottom
  # over `label`'s 1.3 line-height at 11px: 46.3px, clearing the 44px
  # minimum tap target. `spacing.md` (12px) gave 38.3px.
  #
  # Hover and focus are different states and are not merged: hover is a
  # colour nudge to `grey-400` with no ring, and `:focus-visible` is the
  # standard 2px `focus` ring at a 4px offset, with the label held at `bone`
  # — dimming a label on focus reads as a disabled state.
  accordion-summary:
    textColor:       "{colors.bone}"
    typography:      "{typography.label}"
    rounded:         "{rounded.none}"
  # The header cart count chip. `numeric` is the system's count step and
  # carries `fontFeature: "'tnum' 1"`, which is the actual reason this is
  # `numeric` and not `label`: a bare integer must be tabular or the
  # digit jitters as it changes between 9 and 10 (STI-521).
  #
  # The `1.4em` min-width/height box is NOT the constraint — it is
  # expressed in `em` of the chip's own font-size, so it scales with the
  # type and stays valid at any step. STI-515 stepped the size DOWN to
  # 11px to fit a fixed box that was never fixed. Use the full
  # `numeric` 13px / 0.8125rem; the box follows it.
  cart-pill-count:
    backgroundColor: "{colors.ink}"
    textColor:       "{colors.bone}"
    typography:      "{typography.numeric}"
    rounded:         "{rounded.none}"
  accordion-icon:
    textColor: "{colors.grey-400}"
  # ── Hairline rules (STI-446) ────────────────────────────────────────────────
  # The single allowed "depth" (see Elevation & Depth). `rule` is the standard
  # 1px divider in `border-rule`; `rule-light` is the same hairline with the
  # colour made explicit via `color-mix`, which is how it is expressed in
  # `tokens.css` so a translucent rule cannot be confused with a solid one.
  # `rule-light` is a composite, not a Dimension, so it is stated here in prose
  # rather than as a `rounded:`/`spacing:` key — the spec schema has no token
  # type for a shorthand border and drops it silently if given one.
  # Its source colour is `colors.border-rule`; mirrored as
  # `--rule: 1px solid var(--border-rule)` and
  # `--rule-light: 1px solid color-mix(in srgb, var(--border-rule) 100%, transparent)`.
  # ── Motion (STI-446) ───────────────────────────────────────────────────────
  # `transition-fast` / `transition-base` / `transition-slow` are the only three
  # durations in the system. Easing is always `ease`. There is no token type
  # for a millisecond easing, so these are stated in prose under "Motion"
  # below rather than forced into `spacing:` (which accepts px/rem dimensions
  # only — `120ms ease` is silently dropped, not reported).
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

- **ink (#000000)** — the page ground, header, and product framing.
- **charcoal (#0E0E0E)** — elevated surface for cards and modals;
  distinguishable from `ink` only by a 1px hairline, never by shadow.
- **grey-950 (#1A1A1A)** — tertiary surface, hover wells, image fallback
  plates.
- **border-rule (#2A2A2A)** — mid-dark; the single hairline/divider value
  and the disabled-control fill. **Dividers only.** A decorative hairline
  is exempt from WCAG SC 1.4.11; a control boundary is not, so this
  value is never a control border. See `outline`.
- **outline (#5F5F5F)** — the boundary colour for form controls: inputs,
  textareas, selects, quantity steppers. Chosen as the first step on the
  grey ramp that clears SC 1.4.11 **3:1** against every surface a control
  is filled with — 3.02:1 on `charcoal`, 3.29:1 on `ink` (fill controls
  on `ink`/`charcoal` only; it is 2.89:1 on `grey-950`). `border-rule`
  (1.34:1) and `primary` (2.89:1) both fail 3:1 on `charcoal`, so
  neither can carry this role.
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
- **focus (#FFFFFF)** — a 2px solid square focus ring, 4px offset, no
  color tint. Accessibility-first. The 2px ring is stroke geometry and stays
  off-grid; the 4px offset is spacing and snaps to the base unit.

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

### Type scale (the `--text-*` steps)

`typography:` above carries two parallel sets of names. The named roles
(`h1`, `h2`, `h3`, `body-lg`, `body`, `body-sm`, `label`, `numeric`) are what
components are described against; the `text-*` steps are the same eight
typographies under the CSS-shaped names `tokens.css` mirrors, so every
`--text-*` custom property traces to a key in this file rather than to a
number written in a stylesheet. The two sets must not drift: `text-xs` =
`label`, `text-sm` = `body-sm`, `text-base` = `body`, `text-lg` = `body-lg`,
`text-xl` = `h3`, `text-2xl` = `h2`, `text-3xl` = `h1`.

The size steps are 11 / 12 / 13 / 15 / 20 / 28 / 40px. There is no step
between 15 and 20 or between 20 and 28; hierarchy inside a band is carried by
weight and letter-spacing, not by a new size.

### Hero display line (`--text-display`)

The hero line is the one fluid type value in the system:
`clamp(2.5rem, 6vw + 1rem, 6.5rem)` — 40px at the floor, 104px at the
ceiling, tracking the viewport between. It is mirrored as `--text-display` and
sits *above* `text-3xl` (`h1`) rather than replacing it: `--text-3xl` is the
fixed page-heading size, `--text-display` is the hero only.

It has no `typography:` key on purpose. The spec schema types `fontSize` as a
Dimension (px/rem), so a `clamp()` there is a lint **error**, not a style
choice. Stating it in prose is the only way to keep it canonical while
linting at 0 errors.

### Mono fallback stack (`--font-mono`, `--font-display`)

`--font-mono` is the face stack `"JetBrains Mono", "Fira Code", "Cascadia
Code", "Consolas", monospace`; `--font-display` and `--font-body` both alias
it. One brand face, so there is no display/body distinction to make — the two
role aliases exist to mirror the historical names, not to permit a second
typeface.

Everything below JetBrains Mono is an *availability* fallback for a machine
that lacks the brand face. A fallback rendering is a degraded state, not an
approved one: if a screenshot shows Fira Code or Consolas, the face failed to
load and that is a bug to fix, not a variant to accept.

### Scaled SVG text (the `viewBox` trap)

An SVG `viewBox` is a fixed user-space coordinate system that the browser
scales to whatever box it renders into. A `font-size` written as a
**presentation attribute** — `font-size="13"` on a `<text>` element — is
expressed in those user units, so the size that actually reaches the shopper is
`declared x (renderedWidth / viewBoxWidth)`. On a `0 0 600 750` plate rendered
~400px wide, a perfectly on-ramp `font-size="13"` (the `text-base` step) lands
at **~8.7px**. A presentation attribute is not a CSS declaration, so it never
resolves through `tokens.css`; a component can drop below the type floor with
every existing gate green. It has no `typography:` key here for the same reason
`--text-display` has none: the constraint is a rendered outcome, not a
declarable value.

The rule, in both directions:

- **Legible text is never an SVG presentation attribute.** Text a shopper has
  to read takes a `--text-*` token in a CSS rule (`font-size:
  var(--text-base)`), so it is checkable against the scale the way every other
  text node is.
- **The constraint is the rendered size, not the declared one.** For text set
  inside a scaled `viewBox`, size for the step that must appear on screen,
  divide by the scale factor, and round **up** to a whole user unit. The floor
  of the ramp is 11px (`text-xs` = `label`), so no tracked uppercase caption
  may render below 11px however the user units are spelled.
- **Decorative text may stay an attribute** when it is a logo lockup, a
  duplicate of a neighbouring text node, or otherwise carries no reading
  obligation — and it must never be the only copy of a string on the page.

`design:drift` reads this file's frontmatter and `tokens.css`; it does not
render the page. This class of defect is therefore invisible to the token gate
by construction and needs the source read plus a three-viewport visual review
to be caught at all.

## Layout

Compact modern rhythm on a **4px base grid** (tightened from the prior
0.5rem grid). Section spacing is reduced roughly 40% from the previous
warm-bone era.

- **Page gutter** — `clamp(1rem, 2vw + 0.5rem, 2.5rem)`. About half the
  previous upper bound; mobile reads tighter, desktop stays generous.
  Mirrored as `--gutter`. Like `--text-display`, it is a `clamp()` and so
  cannot be a `spacing:` key (dimensions only); it is stated here.
- **Section spacing** — `section-sm 32px`, `section-md 48px`,
  `section-lg 64px`, `section-xl 96px`. Pick the smallest one that still
  separates the blocks. These are the top of the 4px grid re-expressed under
  the names components consume, and they are **aliases of the scale, not new
  steps**: `section-sm` = `2xl`, `section-md` = `3xl`, `section-lg` = `4xl`,
  `section-xl` = `5xl`. If the two ever disagree, the scale wins.
- **Base unit** — `4px`. Every padding, gap, and offset snaps to it. No
  `13px` or `7px`; either 12 or 16. The grid governs **spacing geometry**.
  **Stroke geometry** is out of its scope and is deliberately off-grid: the
  1px hairlines and the 2px focus ring are line weights, and rounding a
  hairline up to 4px turns a rule into a slab. An *offset* is spacing, not
  stroke, so no offset is exempt.
- **Container max** — 68.75rem; content reaches it sooner because the
  surrounding rhythm is tighter.
- **Reading measure** — 65ch. Long-form copy (journal articles) caps here.

### Layout measures

| Token | Value | Mirrored as | Used for |
|---|---|---|---|
| `content-max` | 68.75rem | `--content-max` | Standard page content container |
| `content-wide` | 80rem | `--content-wide` | Full-bleed sections (header, marquee) |
| `measure` | 65ch | `--measure` | Long-form reading column |
| `gutter` | `clamp(1rem, 2vw + 0.5rem, 2.5rem)` | `--gutter` | Fluid page inset |

`content-max` and `content-wide` are `spacing:` keys above because they are
plain `rem` dimensions and belong to the same grid. `gutter` is fluid and
lives here for the same reason `--text-display` does.

## Motion

Three durations, one easing. There is no spring, no bounce, no per-component
timing.

| Token | Value | Mirrored as | Used for |
|---|---|---|---|
| `transition-fast` | 120ms `ease` | `--transition-fast` | Product-card image swap, hover state |
| `transition-base` | 200ms `ease` | `--transition-base` | Default state change |
| `transition-slow` | 350ms `ease` | `--transition-slow` | Large surface changes only |

Nothing exceeds 350ms. Motion never carries meaning on its own — it may
confirm a state change, never be the only signal of one, and never blocks
input.

These have no frontmatter keys on purpose. The spec schema has no token type
for a millisecond easing, and `spacing:` accepts only `px`/`rem` dimensions:
`"120ms ease"` written there is **silently dropped** by the linter and the
export, with no warning. Stating them here keeps them canonical without
feeding the linter a value it cannot represent.

## Elevation & Depth

**Flat.** No shadows on cards, modals, buttons, or focus. Hierarchy
arrives only through:

1. **1px hairline borders** (color: `border-rule` #2A2A2A) between
   sections and at the edge of every elevated surface. Form controls are
   the one exception: they take `outline` (#5F5F5F) so the
   boundary clears SC 1.4.11 3:1.
2. **Surface tint shift** — `ink` → `charcoal` → `grey-950`, each
   distinguishable only by a hairline, never by shadow or glow.
3. **Weight and underline in type** — never shadow or blur.

The one allowed "depth" is the 1px hairline, and it counts as a border,
not as a shadow. If a design choice needs an actual shadow to read, the
design is wrong; rework it.

### Hairline rules (`--rule`, `--rule-light`, `--rule-control`)

Three named shorthands, all 1px. They exist so a border is never typed as a
raw `border` declaration at the call site:

- `rule` — `1px solid var(--border-rule)`. The standard divider: table rows,
  accordion edges, section breaks.
- `rule-light` — the same hairline with the colour expressed as
  `color-mix(in srgb, var(--border-rule) 100%, transparent)`. At 100% it
  renders identically to `rule`; the explicit form is what stops a future
  edit from quietly making a rule translucent without anyone deciding to.
- `rule-control` — `1px solid var(--outline)`. The form-control boundary, and
  the only shorthand not in `border-rule`. A decorative hairline is exempt
  from WCAG SC 1.4.11; the boundary of an input is not, so a control boundary
  has to clear **3:1** and `border-rule` (1.34:1) does not. Traces to
  `colors.outline`.

None of the three is a Dimension, so none can be a frontmatter key — see the
note in the frontmatter. `rule` and `rule-light` trace to
`colors.border-rule`; `rule-control` traces to `colors.outline`.

## Shapes

**Zero radius everywhere.** Buttons, cards, inputs, badges, image plates,
modals, focus rings — all square. The 2px radius that lingered in the
prior `radius-tight` token is **deleted**, not preserved. Every `rounded:`
key in this seed resolves to `"0"`.

### Third-party radius bridge (`rounded.ui`)

Declaring `--radius-*: 0` is not sufficient on its own. `@nuxt/ui` ships its
own root token, `:host,:root{--ui-radius:.25rem}`, and the Tailwind
`rounded-*` utilities it registers compile against **that** value —
`rounded-sm` is literally `border-radius:var(--ui-radius)`. Any component
that uses a `rounded-*` class therefore reintroduces a 4px corner on the
live site even though every `rounded:` key here is `"0px"`.

The bridge is `rounded.ui: "0px"`, mirrored as
`--ui-radius: 0` in `app/assets/css/tokens.css`. It is part of the token
chain, not a component override: `DESIGN.md` -> `tokens.css` -> components.

Utility classes are not the design system. A component that needs square
edges takes `rounded-none` (or inherits the zeroed root), never `rounded`,
`rounded-sm`, or `rounded-full`. `rounded-full` in particular is a pill and
has no place in a square-edged system.

### Prose radius bridge (`rounded.prose`)

`@tailwindcss/typography` hard-codes a radius inside its prose rules:
`.375rem` on `.prose :where(pre)` and `.3125rem` on `.prose :where(kbd)`.
Unlike its colors, which are exposed as `--tw-prose-*` custom properties,
**the radius is a literal in the plugin's own stylesheet and has no
variable**, so no prose config value can zero it. It reaches the built CSS
because `@nuxt/ui` pulls the plugin in transitively.

The bridge is `rounded.prose: "0px"`, mirrored as `--radius-prose: 0` and an
unlayered `.prose` override in `app/assets/css/tokens.css`. The override has
to be unlayered: in the built stylesheet the plugin's rules sit inside
`@layer utilities`, and an unlayered declaration beats a layered one at any
specificity, so it needs neither `!important` nor a specificity arms race.

This is a decision, not a workaround. The house rule is **zero radius
everywhere with no exceptions**, and prose is not one. If prose styling is
ever adopted, it renders square on the first day rather than reintroducing a
4px corner that no source edit in `app/` can see.

The honest scope limit: the override changes the **resolved** value, not the
**emitted** bytes. The plugin still writes `.375rem` and `.3125rem` into the
stylesheet, so both stay pinned in `scripts/ci/border-radius-ratchet.txt`.
Those two entries are a *vendor-emission tolerance*, not a design allowance —
they exist because the only way to delete the bytes is to drop the plugin,
which is a dependency change, not a CSS one. If the plugin is ever dropped,
the entries and the override both go.

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
- **Input** — charcoal background, `outline` (#5F5F5F) 1px
  boundary, body typography, `8px 12px` padding. `outline` is the
  control-boundary token and is the minimum that clears SC 1.4.11 3:1 on the
  control's own fill; `border-rule` is a divider token and is not a
  substitute. Active field is distinguished by the underline (grey-400
  bottom edge), never by a box-shadow ring.
- Labels sit above inputs in `label` typography.
- Validation messages use grey-400 weight plus underline; never red text.

### Product row
The card is a hairline-ruled **index row**, not a plate. A grid of these reads
as the catalogue's table of contents, which is what the site is: a spec sheet.

- **Flush left, no fill, no border box.** No charcoal plate, no box outline,
  no shadow. The 1px `rule` hairline is `border-block-start` — the row is
  separated from the one above it, so a grid of rows reads as one ruled list
  without any cell owning its own frame.
- **The whole row is one link.** `min-height: 44px` clears the tap-target
  minimum, and `:focus-visible` is the standard 2px `focus` ring at a 4px
  offset — the same ring as every other control on the site.
- **Facts, in columns.** Name, price (`numeric` typography, weight 500,
  tabular figures), the size range, and up to three spec values share one
  baseline-aligned row on wide viewports, so the grid reads across as a
  datasheet instead of reflowing per cell. Under 768px the same facts and
  the same order stack into one block; nothing is dropped.
- **The thumbnail is optional.** A small 4:5 image at the leading edge,
  only when the product has one. When it does not, no space is reserved and
  no placeholder box is drawn — an absent image must not leave a hole in the
  row.
- **No hover lift, no quick add.** Hover is a colour nudge to `white` and,
  when a second image exists, a 120ms opacity swap to the macro detail.
  Quick add does not exist; the row goes to the PDP for size selection.

### Product page
The PDP has two states and the base state is the product's real state, not a
fallback.

- **No imagery → one measured column.** `grid-template-columns:
  minmax(0, 1fr)`, justified to the start, so the page is a single column at
  the prose measure rather than a stretched or empty second track.
- **Imagery → two columns.** The second track is a modifier applied only when
  Shopify actually returns images, at ≥ 768px. A product with no photography
  never pays for a media column it cannot fill.
- **One shared left edge.** Badge, `h1`, price, size selector, CTA and the
  details expander all sit on the same left edge of the same column. There is
  no inset, no plate, and no second alignment to read across.
- **One vertical step.** The spine is `--space-xl` (24px) throughout: the
  heading is out of flow and the accordion contributes no leading of its own,
  so a single row-gap governs the whole column and the CTA cannot drift onto a
  32px step.

### Product copy
Product copy is a spec sheet, not prose. It states what the thing is; it
does not sell it.

- **Format** — the Shopify description (`bodyHtml` in
  `catalog/products/*.yaml`) is one or more `<h3>Label</h3>` +
  `<ul><li>line</li>…</ul>` pairs and nothing else. No `<p>`, no prose.
- **Place** — the PDP shows no description block. The details expander is
  the only place product facts live, one panel per section.
- **Label** — one of Material, Fit, Construction, Embroidery, Size,
  Application, Care, Shipping & Returns. Nothing else.
- **Limits** — at most 7 sections per product, at most 4 lines per section.
- **Line** — one fact per line, at most 8 words, ending in `.`.
  Fragments, not sentences: "Dropped shoulder."
- **Banned** — adjectives of judgement (premium, precise, intentional,
  substantial), claims about the buyer ("built for people who…"),
  second person, "we/our", metaphors, em-dash asides, explanations of why
  a detail matters ("that's the point").
- **Uniqueness** — a fact appears once per product.
- **Enforced** — `src/catalog/product-copy.test.ts` fails CI on structure,
  labels, limits, line rules and uniqueness, and on any drift between the
  catalog YAML and the static mirror in `app/data/products.ts`.

Example (sku-001), as the expander sections read:

```
Material — Cotton fleece. / Brushed interior.
Fit — Oversized. / Dropped shoulder.
Construction — Double-stitched seams.
Embroidery — Black thread on black. / Design on chest. / Mark on left sleeve.
Care — Cold wash, inside out. / Tumble dry low or hang. / Do not dry-clean.
Shipping & Returns — Made to order. / Ships in 2–3 weeks. / Tracked
shipping. / [returns lines — see below]
```

**The returns lines are not written here.** STI-681: the store published
"Returns within 14 days, unworn." on sku-001 and "Final sale." on sku-002 and
sku-003 simultaneously, and this spec is how the contradiction became durable.
Commit 79ad80e ("product descriptions are spec lines, not brand prose", #204)
introduced both strings; before it, no SKU mentioned returns at all. The 14-day
promise was not carried over from a quote, a supplier, or an operator decision
— that commit *authored* a quantified, legally-operative commercial commitment
while removing unverified prose.

Because this document transcribes the PDP as the exact current copy, any agent
re-authoring from it reproduced the invented promise faithfully. That is why
the returns copy is no longer transcribed here.

**Single source: `catalog/returns/default.yaml`.** That file holds the policy
and the exact customer-facing lines; `src/catalog/returns.ts` validates and
loads it, `catalog:validate` reads it, and every SKU's Shipping & Returns
section must render those lines verbatim.

The operator's decision (STI-681): **faulty-only**. No change-of-mind returns
window; a faulty or wrong item is replaced. So the policy is one line, not a
14-day promise — the line it declares is stated once and applied to all three
SKUs.

The policy is DECLARATION-ONLY, like `catalog/shipping/default.yaml`: nothing
in it is written to Shopify by `catalog:apply`. Do not restate the line in this
document, in a SKU, or in `app/data/products.ts` as freehand copy — restate it
from the policy file, or the drift returns.

Enforcement, both layers: `src/catalog/product-copy.test.ts` fails CI unless
every SKU's returns lines equal the policy file's `lines` (and the static
fallback in `app/data/products.ts` equals the catalog `bodyHtml`), and
`scripts/ci/returns-claim-gate.sh` fails when the classified directions
diverge.

### Navigation
- Sticky, transparent over hero, ink-black on scroll.
- One row and nothing else: the wordmark on the left, linking home, and the
  cart indicator on the right as a numeric ("02") with no badge box. There is
  no site footer.
- The cart hit area is at least 44px tall, and the row fits a 320px viewport
  with no horizontal overflow.
- Active route marked with an underline, never a background pill.

**Open decision (STI-633) — the row above vs. a two-link nav.** Commit
`f29e7d8` (#207, operator-authored) reduced the header to wordmark + cart and
banned secondary nav in the same commit that deleted the pages the nav
pointed at. That ban is **not** re-affirmed here; it is recorded as an
unresolved spec question, because the storefront currently has **no route into
its own catalogue**:

- At `main` @ `4662958` the only anchors in the chrome are the wordmark (`/`),
  the cart link (`/cart`, STI-653) and the layout's `#main-content` skip link.
  `Shop`, `Story` and `Account` are gone from the row.
- `app/pages/products.vue` (the canonical full-capsule listing, STI-241) is
  reachable from no nav link. It survives only as a direct URL and as the
  "keep browsing" link on `/account`. `/collections`, `/shop` and `/contact`
  are likewise unlinked from the chrome. `/blog` has no index route at all —
  only `blog/<handle>` and `blog/<handle>/<article>` — and `/blog` returns
  404; it could not be linked to even if nav were restored.
- So a first-time visitor on `/` sees the hero and a product grid (STI-579)
  whose cards link to PDPs, and **no way to reach the full capsule, a
  collection index, or contact without knowing a URL.** For a store whose
  entire product is a made-to-order capsule, that is a navigation hole, not a
  minimalism.
- The "Shop / Story / Account" quartet this rule replaced was itself
  incidental — it was what #207 deleted, not a reviewed spec — so the choice
  is between *some* nav and *no* nav, not between two settled designs.

**What is not open:** the visual treatment, and the cost of restoring it. A
restored link sits between the wordmark and the cart button, takes the
underline active-route rule above, adds no new token, and does not
reintroduce a footer. Compact monochrome minimalism is a typographic and
spatial discipline (DT-2); a single monochrome link does not violate it.

**Correction (STI-633): the treatment is a restoration, not a reuse.** An
earlier version of this section said a restored link "reuses the existing
`.nav-link` selector". That was wrong. #207 deleted the `.nav-menu` and
`.nav-link` scoped rules along with the markup — at `main` the string
`nav-link` appears in exactly two files, this document and
`docs/qa-checklist.md`, and in **no** stylesheet or component. Options (a) and
(b) therefore re-introduce those five rule blocks rather than inherit them.
The cost is bounded and token-clean: `.nav-menu` is one `inline-flex` line
with a `clamp()` gap, and `.nav-link` is four rules (colour, hover/focus
colour, the `::after` underline, its scale transition) that consume only
`--grey-400`, `--bone`, `--text-sm` and `--font-body`. All four tokens still
exist in `app/assets/css/tokens.css`, so restoring the nav adds no custom
property and DT-1's top-down chain has nothing new to mirror.

**Blocked on an operator call** between: (a) restore two links — `Shop` →
`/products`, `Story` → `/#statement` — which is the smallest change that
closes the catalogue hole; (b) restore the full quartet including `Account`
→ `/account`; or (c) confirm the reduction and accept that the capsule has no
nav entry. This decision is the only thing gating [STI-633](/STI/issues/STI-633);
the code already matches option (c), so (c) is the status quo and shipping it
is a decision, not an omission.

### Badges
- Transparent fill, hairline `primary` border, tracked-uppercase `label`
  typography, `0px 8px` padding. Used for `EMBROIDERED`, `LIMITED RUN`,
  `LOW STOCK`, `MADE TO ORDER`. The padding is grid-pure and reads as a
  tag rather than a pill: `label` is 11px / 1.3, so its own leading already
  supplies the breathing room, and a vertical pad on top of it would spend
  vertical space on a micro-label that is meant to sit quietly on a product
  card. The inline step is `8px`, not `4px`, because `0.12em` tracking on
  uppercase needs the extra inline room; `4px` would crowd the tracked
  edge against the hairline.
- The boundary is `1px solid var(--primary)` — the `rule` shorthand's
  colour, not `rule-control`. `rule-control` is reserved for form
  controls that must clear SC 1.4.11 3:1; a badge is a decorative
  surface, so it takes the brand hairline. `borderColor` is not a
  declared sub-token (see the frontmatter note), so the boundary is
  stated here rather than in a key.
- **One declaration site.** `.badge` is styled in
  `app/components/Badge.vue` only. The unlayered copy in
  `app/assets/css/global.css` is a stale duplicate that disagrees on
  `background` (`grey-950`) and `border` (`border-rule`) and must be
  deleted, not reconciled — two declarations of the same class that
  disagree is a defect regardless of which one wins the cascade.

### Accordion
- The expander is the **only** place a product's facts live. There is no
  separate description block on the PDP: sections come from Shopify's
  `descriptionHtml` via `specSections` (Material / Fit / Construction /
  Embroidery / Size / Application / Care / Shipping & Returns), with a
  static mirror in `app/data/products.ts` for a product that has no
  description yet.
- **The panel is transparent and flush with the summary.** It is not
  `charcoal` and it is not inset. An inset slab gave the column two left
  edges — labels at x=0, facts 12px in — and turned six open sections into
  stacked slabs. Labels and lines now share one left edge; the hairlines
  do the separating. Padding is `0 0 16px`.
- Facts render at `text-base` (13px), not `text-sm` (12px): they are the
  substance of the page, and 12px read as a footnote.
- The `<summary>` is a disclosure control, not body copy. It is declared
  on `components.accordion-summary` → `typography.label` (500 / 11px /
  0.12em), the system's control-voice step, and is deliberately **not**
  covered by `components.accordion-body`. A 400-weight trigger under a
  400-weight panel reads as body copy and the panel outweighs its own
  trigger. The label is 11px; that narrowing is intended.
- Hover and focus are separate states, not one rule. `:hover` is a
  colour nudge to `grey-400` with **no ring** — a mouse user should not
  get a focus affordance. `:focus-visible` is the standard 2px `focus`
  ring at a 4px offset, and holds the label at `bone`; dimming a label on
  focus reads as a disabled state. The one link in the expander
  (Shipping & Returns → Contact) follows the same ring rule and sits on
  the same left edge as everything else.
- The summary's hit height is **46.3px** (`padding-block: spacing.lg`,
  16px top and bottom, over `label`'s 1.3 line-height at 11px), clearing
  the 44px minimum tap target. `spacing.md` gave 38.3px.
- The **first section is open by default** — Material, the most relevant
  fact — and nothing else sets `open`.
- **Empty renders nothing.** With zero sections the component emits no
  markup at all, and the PDP hides the heading and wrapper too, so no
  orphan hairline is drawn.
- The panel animates via `::details-content` on `height` and
  `content-visibility` (`allow-discrete`) over `transition-base`, with
  `interpolate-size: allow-keywords` scoped to `.accordion`, so the panel
  and the chevron rotate on the same duration instead of the panel
  snapping under a rotating chevron. Under
  `prefers-reduced-motion: reduce` every transition here is `none`.
  Browsers without `::details-content` simply snap.

### Header
- Sticky but subtle; transparent over hero, ink-black after scroll.
- Left: wordmark, linking home. Right: cart, and nothing else.
- Cart indicator should be numeric and quiet, not a large badge.
- The count chip is `components.cart-pill-count` → `typography.numeric`
  (13px / 500 / tabular). It is `numeric` and not `label` because a
  bare integer must be tabular — proportional figures jitter between
  `9` and `10`. The `1.4em` box is `em`-relative to the chip's own
  font-size, so it scales with the type and is not a reason to step the
  size down.

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
  `--font-body`, `--radius-md` — every CSS custom property must trace
  to a token here. Vendor-shipped custom properties count too: see
  `rounded.ui`. Vendor-shipped **geometry** counts the same way: a vendor
  that hard-codes a radius instead of exposing a variable needs a
  `rounded.*` bridge declared here before it is used, not after — see
  `rounded.prose`.
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
- Don't bring back the section eyebrow or kicker, or the deleted
  `components.eyebrow` token that carried it. The step is retired, not
  deprecated: a section's heading carries its own weight, and a tracked
  uppercase line above it only re-states the heading in quieter type. The
  11px micro-label is `label`'s size, and duplicating it per section is how
  the undeclared-drift this token closed came back.
- Don't adopt prose styling (`prose` / `Prose`) without `rounded.prose`
  mirrored into `tokens.css` first. `@tailwindcss/typography`'s `.375rem`
  pre and `.3125rem` kbd corners are the vendor's default, not a design
  decision, and this system has no prose radius exception.
- Don't add shadow, glow, gradient, blur, or `border-radius > 0`.
- Don't use Tailwind/Nuxt-UI `rounded`, `rounded-sm`, `rounded-md`, or
  `rounded-full` on a component. They compile against `--ui-radius`, not
  against `rounded.*`, so they escape the token chain. Use `rounded-none`
  or nothing at all.
- Don't ship a vendor stylesheet's default custom properties unzeroed.
  Audit `grep -oE '\-\-ui-[a-z-]+:[^;}]*' on the built CSS after any
  dependency bump; a radius or font default can reappear in a patch
  release without touching this file.
- Don't ship large blocks of prose copy. Headlines ≤ 6 words, body
  sentences ≤ 16 words, microcopy ≤ 40 chars.
- Don't use color to convey state. Weight + underline + border only.
- Don't use `border-rule` as a form-control boundary. It is a divider
  token; SC 1.4.11 exempts dividers, not the boundary of an input.
- Don't fork the file into a per-page or per-section variant. The single
  `DESIGN.md` is the contract; component code consumes tokens by name.