# 2026-09-27 — Positioning and persona

Status: Draft (merch-lead, STI-328 GTM readiness package).
Owner: merch-lead. Art direction inputs: design-lead.
Supersedes: nothing. Related: [Shopify as system of record](2026-07-21-shopify-as-system-of-record.md).

> **Gate note.** This is a *pre-launch* positioning record. It contains no revenue
> figures and makes no launch claim. The production apex
> `https://www.stitch-ash.com` is still password-walled as of 2026-09-27
> (see [STI-327](/STI/issues/STI-327), consolidated into board approval
> `45b0b09e`), so none of the traffic-driving work in this package may run yet.

## Context

Stitch and Ash has three live SKUs and no written positioning. Every
customer-visible string was written ad hoc per page, so the site reads as a
template with a logo rather than as a brand with a point of view. The product
constraint is unusual and worth stating plainly: **every SKU is black thread on
black fabric.** That is simultaneously the strongest differentiator available and
the hardest thing to photograph, explain, or sell in a feed.

This record fixes the positioning so that the social plan, store copy, and every
future capsule start from the same sentence.

## Decision

### Target persona

**The one who reads the garment before they wear it.**

- 24–38, goth/metal adjacent, dresses by garment construction rather than by
  logo — recognises weight, weave, stitch density, and drape.
- Shops at the seam. Buys fewer pieces and keeps them for years.
- Already owns black basics from mass brands and found them wanting: pilling,
  dropped shoulder, thread that snaps after ten washes.
- Discovers via maker/process content, not via ads. Sceptical of brands that
  lead with a logo and follow with a story.
- Price anchor is not "hoodie" ($185 feels steep) but "the last hoodie I still
  own" (the same $185 feels cheap). We must **teach the anchor before we quote
  the number**, or the price reads as pretension instead of durability.

### Hero message

> **Black on black. Made to be read up close.**

Fallback line for constrained surfaces (OG cards, story slates): *Heavyweight
black, black-thread embroidery. Double-stitched to last.*

### Three-line value prop

1. **Black thread on black.** The mark is not printed on top of the garment — it is stitched into it, and only resolves under direct light.
2. **Built like the last thing you own.** Heavyweight cotton fleece, double-stitched seams, made to order rather than pulled from a bin.
3. **No logo shout.** The brand mark sits small on the sleeve. If you have to announce it from across the room, we did the work wrong.

### Anti-persona — who we are NOT for

Stating this is what protects the price and the tone. We are **not** for:

- **The logo-first buyer.** If the biggest available mark is the point, a
  screen-printed logo tee is a better purchase and costs $30.
- **The fast-fashion drop shopper.** A 2–3 week made-to-order lead time is a
  feature; if you need it tomorrow, this is the wrong shop.
- **The luxury-adjacent aspirational buyer.** We are premium *in
  construction*, not in price-signalling. Anyone shopping for visible status
  will find us underpriced and under-styled, which is fine.
- **The colour/seasons shopper.** Black on black, all year. There is no
  spring palette here and we will not manufacture one.
- **The bargain hunter.** We do not run sales. When we are quiet, we are not
  discounting — we are sold out or still making.

### Category frame

We are not an "embroidery brand." We are a **construction brand** that
happens to embroider. The reference set is garment-making (Japanese denim,
raw-felt outerwear, heavyweight fleece workwear), not merch drops. Copy should
sound like an atelier spec sheet that happens to be emotionally resonant —
technical, unhurried, specific — and never like a drop announcement.

## Alternatives considered

**Lead with the aesthetic ("dark, moody, occult").** Rejected: it competes in
the lowest-margin, highest-noise corner of the aesthetic-apparel market and is
indistinguishable from the long tail of AI-generated gothic tee shops. The
construction angle is the only one where our costs are actually defensible.

**Lead with the embroidery technique as the hook ("real embroidery, not
prints").** Rejected as the *lead*: it invites a print/embroidered price
comparison the brand loses, since a competent local shop can print for $8. Kept
as a *supporting* line in the value prop and as the recurring content bucket on
social, where the proof footage does the work that a claim cannot.

**Price-led positioning ("$185 heavyweight hoodie").** Rejected: leads with the
number before the justification exists. Nothing to discount from later, and it
invites the comparison we do not want.

## Consequences

- The store copy in `i18n/locales/en.json` still carries demo-store boilerplate
  and the product catalog still carries a `PHOTOGRAPH PENDING` plate. Both
  contradict this positioning and are fixed in the companion copy pass
  (STI-328, PR description) rather than here.
- The persona's price anchor is the load-bearing constraint on pricing. If the
  pricing model is challenged, challenge the anchor message first — see
  `docs/merch/2026-09-27-pricing-margin.md`.
- "Made to order, 2–3 weeks" is a stated feature and must be consistent across
  Shopify and the repo catalog. **Update 2026-10-02 (STI-609):** they are now
  consistent — the catalog's `3–5 weeks` is gone and
  `catalog/products/sku-001.yaml:16` reads `2–3 weeks`. The *consistency*
  requirement is met. The *provenance* requirement is not: `2–3 weeks` still has
  no supplier quote, and a single customer-facing source now fans out to three
  renders (`<meta name="description">`, the description paragraph, the Nuxt
  payload). Do not treat "consistent" as "verified" — see §3b of
  `docs/merch/2026-09-27-store-copy-pass.md`.
- Social content must show process, not mood. A mood shot is unprovable; a
  thread-level close-up of a sleeve mark is the whole brand in one frame.

## Related

- [STI-328](/STI/issues/STI-328) — GTM readiness package
- `docs/merch/2026-09-27-pricing-margin.md` — per-SKU margin model
- `docs/merch/2026-09-27-social-plan.md` — pre-launch organic plan
- `docs/merch/2026-09-27-store-copy-pass.md` — copy PR description
- `docs/merch/2026-09-27-kpi-report-template.md` — KPI report scaffold
