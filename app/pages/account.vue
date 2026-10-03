<script setup lang="ts">
/**
 * STI-633: /account — the destination behind the header's `Account` link.
 *
 * DESIGN.md:564 lists Account as one of the four header nav items. The link
 * could not be added honestly without a route to land on, so this page is the
 * route. It is deliberately NOT a sign-in form.
 *
 * Why no sign-in form: this storefront has no customer-account system. Checkout
 * hands off to Shopify's hosted `checkoutUrl` (app/composables/cart.ts, consumed
 * by app/components/cart/Modal.vue), so no order is ever created in a system
 * this app can read back. There is nothing here to sign in TO, so a form would
 * be a dead control — a worse defect than a missing link, because it looks like
 * it works. Until commerce-eng lands the Shopify customer-account integration,
 * this page states the situation and routes order questions to a human.
 *
 * Design: every value below traces to an existing token, and DESIGN.md declares
 * no `components:` token for an account page, so no mirror is needed in
 * tokens.css and no DESIGN.md edit ships with it (HARD RULE 7 is satisfied by
 * having nothing to mirror rather than by an empty diff).
 */

useSeoMeta({
  title: 'Account — STITCH AND ASH',
  description:
    'Track a STITCH AND ASH order or ask about one. Orders are confirmed by email; we answer every message by hand.',
})
</script>

<template>
  <main class="account wrap">
    <p class="eyebrow">Account</p>
    <h1 class="account__title">Your account</h1>

    <p class="account__lede section-title">
      Orders are confirmed by email. For anything about an existing order, we
      can look it up for you.
    </p>

    <section class="account__panel" aria-labelledby="account-orders-h">
      <h2 id="account-orders-h" class="account__sub">Orders</h2>
      <p class="account__line">
        When an order ships, we email a confirmation with tracking. If you have
        not received it, check your spam folder first — then
        <NuxtLink to="/contact" class="account__link">get in touch</NuxtLink>
        and we will find the order for you.
      </p>
      <p class="account__line text-muted">
        This storefront does not yet have accounts. We have deliberately not
        built a sign-in form: there is no order history on this side of the
        site to sign in to, so a form would not do anything.
      </p>
    </section>

    <section class="account__panel" aria-labelledby="account-help-h">
      <h2 id="account-help-h" class="account__sub">Need something else?</h2>
      <p class="account__line">
        Sizing, embroidery, made-to-order lead times, or a change to an order —
        all of it reaches the same two people who make the garments.
        <NuxtLink to="/contact" class="account__link">Send us a message</NuxtLink>.
      </p>
      <p class="account__line">
        Or keep browsing <NuxtLink to="/products" class="account__link">the collection</NuxtLink>.
      </p>
    </section>
  </main>
</template>

<style scoped>
.account {
  padding-block-start: clamp(2rem, 4vw, 3.5rem);
  padding-block-end: clamp(3rem, 8vw, 6rem);
  max-width: var(--measure);
  margin-inline: auto;
}

.account__title {
  font-family: var(--font-display);
  font-size: var(--text-3xl);
  letter-spacing: 0.04em;
  margin-block-start: var(--space-lg);
  margin-block-end: var(--space-xl);
}

.account__lede {
  color: var(--grey-200);
  margin-block-end: var(--space-3xl);
}

.account__panel {
  padding-block: var(--space-2xl);
  border-block-start: var(--rule-light);
}

.account__panel:first-of-type {
  border-block-start: 0;
  padding-block-start: 0;
}

.account__sub {
  font-family: var(--font-display);
  font-size: var(--text-lg);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--bone);
  margin-block-end: var(--space-xl);
}

.account__line {
  font-size: var(--text-base);
  line-height: 1.6;
  color: var(--bone);
  margin-block: 0;
}

.account__line + .account__line {
  margin-block-start: var(--space-lg);
}

.account__link {
  color: var(--bone);
  text-decoration: underline;
  text-decoration-color: var(--grey-400);
  text-underline-offset: 3px;
}

.account__link:hover,
.account__link:focus-visible {
  color: var(--white);
  text-decoration-color: var(--bone);
}
</style>