# STITCH AND ASH: UX Framework (flows, copy, imagery, voice)

> **This file is not the design system.** `DESIGN.md` at the repo root is the
> single source of truth for visual style — colour, type, spacing, radius,
> elevation. Everything visual resolves there:
> `DESIGN.md` → `app/assets/css/tokens.css` → components and pages. Nothing in
> this file may contradict it, and if the two ever disagree, `DESIGN.md` wins
> and this file is the bug.
>
> This file is a **non-canonical pointer and companion record**. It exists to
> answer three questions `DESIGN.md` deliberately does not:
>
> 1. what the product is, in positioning terms ([§ 1](#1-brand-positioning));
> 2. what the customer *does*, screen by screen ([§ 2](#2-customer-flows));
> 3. what the brand *sounds* like, and what the imagery looks like
>    ([§ 3](#3-voice-and-imagery)).
>
> Structural/UX guidance is retained in condensed form ([§ 4](#4-engineering-notes)).
> The old style sections — display faces, palette, spacing scale, corner radius,
> component styling — were removed when this file was rewritten against
> `DESIGN.md` ([STI-438](/STI/issues/STI-438)); see
> [`docs/decisions/2026-09-27-ux-framework-reduced-to-companion.md`](docs/decisions/2026-09-27-ux-framework-reduced-to-companion.md).
> Nothing was lost: every removed value already lived in `DESIGN.md`.

## 1. Brand Positioning

STITCH AND ASH is a premium black-apparel label built around exclusively
embroidered design. The brand should feel precise, restrained, textural, and
collectible: less streetwear drop noise, more gallery object and atelier craft.

The product **is** the embroidery. The storefront is the mount, not the piece:
it stays quiet so the garment carries the visual weight.

## 2. Customer Flows

Structural guidance from the original framework, condensed. Style — every
colour, typeface, radius, and spacing value used below — is `DESIGN.md`'s to
specify; do not derive one from the other.

### 2.1 Home

Goal: establish the brand and route shoppers into the first collection.

Required sections:

1. Hero: full-bleed editorial image or video with wordmark/tagline and the
   primary CTA.
2. Craft proof: macro embroidery strip with 2–3 short proof points —
   dense stitchwork, heavy black cotton, limited production.
3. Featured collection: 3–4 products with strong product cards.
4. Brand story preview: concise atelier/craft copy with a link to the story page.
5. No footer. The chrome is a single header row — wordmark left, cart right —
   and nothing else, so contact lives on the PDP Shipping & Returns panel and
   on the `/contact` page rather than in a footer.

### 2.2 Product Detail

Goal: make the embroidery, fit, and purchase decision clear.

- Image gallery with macro zoom and model fit shots.
- Product name, price, badge, description, size selector, size guide, add to cart.
- Details accordion for Fabric, Embroidery, Fit, Care, Shipping and Returns.

Interactions:

- Size must be selected before add to cart.
- The size guide opens in a lightweight modal or drawer.
- Macro zoom must be reachable by click/tap, never hover-only.

### 2.3 Cart

Goal: confirm choices and move to checkout without friction.

- Preferred pattern: slide-out cart on add, with a `/cart` route fallback.
- Item thumbnail, name, selected size, quantity controls, remove link.
- Subtotal, shipping/tax note, checkout CTA, continue-shopping link.
- A free-shipping threshold only if it is actually true.

### 2.4 Checkout

Goal: a clean, trusted purchase flow with minimal distraction.

1. Contact and shipping.
2. Delivery method.
3. Payment.
4. Review and place order.

Rules:

- Keep the header minimal; the logo links back but full navigation does not.
- Support accelerated payment if available.
- Put secure-payment and return-policy notes next to payment, not in a
  distracting banner.
- Errors must be specific — "Enter a valid postal code", not "Invalid form".

### 2.5 Order status and confirmation

Goal: reassure the customer and set expectations.

Confirmation page:

- Strong headline, order number, email-receipt note, shipping estimate, and a
  product summary.
- A tracking CTA when tracking exists; otherwise a return-to-collection CTA.
- A care teaser with a link to care instructions.

Order status page:

- Milestone tracker: Received, Preparing, Shipped, Delivered.
- Carrier and tracking link once available, plus a support contact for
  delivery issues.

### 2.6 Account

Goal: make repeat purchase and order tracking feel like an archive, not an
administrative form.

There is no account route in the storefront. Orders are shown where they
already are: on the `/contact` page and, after a purchase, in the email
Shopify sends. Keep it that way — a local sign-in that authenticates against
nothing is worse than no sign-in.

## 3. Voice and Imagery

These are the only parts of the old framework that were never a style
contradiction. They stand as written.

### 3.1 Voice and tone

- Sparse, confident, craft-led.
- Short declarative copy: "Black cotton. Silver thread. Built to endure."
- Avoid hype — "must-have", "fire", "limited-time only" — unless the release
  mechanic genuinely supports it.
- Emphasise embroidery, hand feel, weight, edition, and provenance.

Copy is the one place the mono voice is most audible, and the one place a
reviewer is most likely to let a serif instinct back in. If a line reads
"editorial", check the `typography` block in `DESIGN.md` before shipping it.

### 3.2 Imagery direction

- Macro embroidery detail is the signature image style.
- Photograph black garments with side light so stitching and fabric texture stay
  visible.
- Alternate model/lifestyle shots with close craft crops.
- Backgrounds stay achromatic — black, concrete grey, natural shadow. No
  bright colour sets, and no warm-tinted grounds; see the `colors` block in
  `DESIGN.md` for the permitted values.

## 4. Engineering Notes

- Expose design tokens as CSS custom properties. The authoritative list is the
  `DESIGN.md` frontmatter, mirrored in `app/assets/css/tokens.css`; a property
  in `tokens.css` that traces to no `DESIGN.md` token is a defect.
- Build reusable components before page assembly: Header, ProductCard, Button,
  Badge, SizeSelector, CartDrawer, CheckoutStep, OrderStatusTimeline. The
  Header is one row (wordmark, cart); there is no Footer component.
- Keep commerce integration behind product/cart/checkout services so Shopify
  can be swapped in natively. Shopify is the chosen provider for order
  tracking, purchasing/banking features, and inventory management; all
  transactions and backend state route through it
  (see [`docs/decisions/2026-07-21-shopify-as-system-of-record.md`](docs/decisions/2026-07-21-shopify-as-system-of-record.md)).
- The initial preview may use static products provided the purchase path is
  wired to the selected commerce provider or a realistic checkout sandbox.

## Related

- [`DESIGN.md`](DESIGN.md) — the canonical design system.
- [`app/assets/css/tokens.css`](app/assets/css/tokens.css) — its build-time mirror.
- [`docs/ui-ux-storefront-review-runbook.md`](docs/ui-ux-storefront-review-runbook.md)
  — how a reviewer checks a UI change, including the three-viewport rule.
- [`docs/qa-checklist.md`](docs/qa-checklist.md) — the reject-on-sight list.
- [STI-438](/STI/issues/STI-438) — this rewrite.
