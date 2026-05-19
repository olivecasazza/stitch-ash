# STITCH AND ASH: Design System and UX Framework

## 1. Brand Style

### Positioning
STITCH AND ASH is a premium black-apparel label built around exclusively embroidered design. The brand should feel precise, restrained, textural, and collectible: less streetwear drop noise, more gallery object and atelier craft.

### Typography
- Display headings: an elegant editorial serif such as Playfair Display, Cormorant Garamond, or Merriweather. Use for hero lines, product names, and campaign moments.
- Body and interface: a clean grotesk/sans such as Inter, Neue Haas Grotesk, or Helvetica Neue. Use for navigation, pricing, forms, and product details.
- Type behavior: tight heading line-height, generous letter spacing for labels, never more than two type families.

### Color palette
- Ink Black: #0B0B0B - primary ground, header, footer, product framing.
- Charcoal: #1A1A1A - elevated panels, hover states, dark-section variation.
- Bone: #F7F3EC - warm luxury background alternative to pure white.
- Crisp White: #FFFFFF - product cards, form surfaces, contrast copy.
- Ash Silver: #C0C0C0 - dividers, secondary text, metal-thread cue.
- Thread Gold: #B08D57 - rare accent for limited badges, focus rings, order milestones.
- Error Ember: #9F3A2F - validation and payment errors only.

### Spacing and layout
- Use an 8px base grid.
- Page gutters: 20px mobile, 40px tablet, 72px desktop.
- Section spacing: 64px mobile, 96-128px desktop.
- Product cards need breathing room; avoid dense merchandising grids.
- Prefer thin dividers, large image blocks, and asymmetric editorial layouts.

### Imagery direction
- Macro embroidery detail is the signature image style.
- Black garments should be photographed with side light so stitching and fabric texture remain visible.
- Alternate model/lifestyle shots with close crop craft shots.
- Backgrounds should be black, bone, concrete gray, or natural shadow; avoid bright color sets.

### Voice and tone
- Sparse, confident, craft-led.
- Use short declarative copy: "Black cotton. Silver thread. Built to endure."
- Avoid hype language like "must-have," "fire," or "limited-time only" unless the release mechanic truly supports it.
- Emphasize embroidery, hand feel, weight, edition, and provenance.

## 2. Core Components

### Header
- Sticky but subtle; transparent over hero, black or bone after scroll.
- Left: wordmark. Center/right: Shop, Story, Account, Cart.
- Cart indicator should be numeric and quiet, not a large badge.

### Buttons
- Primary: black fill on light surfaces; white fill on black surfaces. Rectangular, 2px radius or no radius.
- Secondary: outline with thin border.
- Tertiary: text link with underline on hover.
- Disabled: Ash Silver border/text, no fill.

### Product card
- Large image, product name, price, small material/embroidery note.
- Hover: second image or macro detail; do not add aggressive shadows.
- Quick add only if size selection can be handled cleanly.

### Form fields
- Tall fields, simple labels above inputs, clear inline validation.
- Focus ring in Thread Gold for accessibility and brand consistency.

### Badges
- Use sparingly: "Embroidered," "Limited run," "Low stock," "Made to order."
- Small uppercase labels with letter spacing.

## 3. Core Store UX Flow

### A. Home
Goal: establish the brand and route shoppers into the first collection.

Required sections:
1. Hero: full-bleed editorial image or video with wordmark/tagline and primary CTA "Explore the Collection."
2. Craft proof: macro embroidery strip with 2-3 short proof points: "Dense stitchwork," "Heavy black cotton," "Limited production."
3. Featured collection: 3-4 products with strong product cards.
4. Brand story preview: concise atelier/craft copy with link to Story.
5. Footer: email capture, social proof, shipping/returns links.

Primary CTA: Explore the Collection.
Secondary CTA: View the Stitch Detail.

### B. Product Detail
Goal: make the embroidery, fit, and purchase decision clear.

Layout:
- Left/top: image gallery with macro zoom and model fit shots.
- Right/below: product name, price, badge, description, size selector, size guide, add to cart.
- Below: details accordion for Fabric, Embroidery, Fit, Care, Shipping and Returns.

Important interactions:
- Size must be selected before add to cart.
- Size guide opens in a lightweight modal or drawer.
- Macro image zoom should be accessible by click/tap, not hover only.

### C. Cart
Goal: confirm choices and move to checkout without friction.

Preferred pattern: slide-out cart on add, with route fallback at /cart.
Contents:
- Item thumbnail, name, selected size, quantity controls, remove link.
- Subtotal, shipping/tax note, checkout CTA.
- Continue shopping link.
- Optional free-shipping threshold only if true.

### D. Checkout
Goal: clean, trusted purchase flow with minimal distraction.

Recommended flow:
1. Contact and shipping.
2. Delivery method.
3. Payment.
4. Review and place order.

Design rules:
- Keep header minimal; logo should link back but avoid full navigation.
- Support accelerated payment if available.
- Show secure payment and return policy notes near payment, not as a distracting banner.
- Errors must be specific: "Enter a valid postal code" instead of "Invalid form."

### E. Order Status / Confirmation
Goal: reassure the customer and set expectations.

Confirmation page:
- Strong headline: "Order received."
- Order number, email receipt note, shipping estimate, product summary.
- CTA: "Track order" when tracking exists, otherwise "Return to collection."
- Include care teaser: "Preserve the stitchwork" with link to care instructions.

Order status page:
- Milestone tracker: Received, Preparing, Shipped, Delivered.
- Shipping carrier and tracking link once available.
- Support contact for delivery issues.

### F. Account
Goal: make repeat purchases and order tracking feel exclusive, not administrative.

Core screens:
- Sign in / create account.
- Orders list with status and detail link.
- Saved addresses.
- Early access preference or collection alerts.

Tone:
- Label account as "Archive" or "Client account" if the brand wants a more elevated feel, but keep standard terms available for clarity.

## 4. Accessibility and Responsive Requirements
- Maintain WCAG AA contrast, especially silver text on black.
- All CTAs need visible focus states.
- Image galleries need alt text describing garment and embroidery, not generic filenames.
- Product purchase path must be fully keyboard usable.
- Mobile PDP should show image, title, price, size selector, and add-to-cart before long story content.

## 5. SWE Implementation Notes
- Expose design tokens as CSS custom properties: color, spacing, radius, type scale, shadow, transition.
- Build reusable components before page assembly: Header, ProductCard, Button, Badge, SizeSelector, CartDrawer, CheckoutStep, OrderStatusTimeline.
- Keep commerce integration abstracted behind product/cart/checkout services so Shopify, Stripe, Plaid, or future providers can be swapped.
- Initial preview can use static products if the purchase path is clearly wired to the selected commerce provider or a realistic checkout sandbox.
