<script setup lang="ts">
/**
 * STI-652: /account — order history, by handing off to the account surface that
 * actually holds it.
 *
 * This page previously (STI-633) told the customer the storefront "does not yet
 * have accounts", on the reasoning that checkout hands off to Shopify's hosted
 * `checkoutUrl` (app/composables/cart.ts, consumed by
 * app/components/cart/Modal.vue), so no order is ever created in a system this
 * app can read back. That reasoning was half right and the conclusion was wrong.
 * Orders are not created anywhere this app can read — that part is true — but
 * they are created in an account the customer can open. The store runs
 * Shopify's hosted customer accounts; `app/utils/customer-account.ts` records the
 * live probe that proves it and why the page links out instead of signing in.
 *
 * The link is the fix, not a workaround. The Accepted ADR
 * (docs/decisions/2026-07-21-shopify-as-system-of-record.md:20) states that
 * customer accounts are Shopify's and that this site "links to Shopify's account
 * surface; it does not maintain its own auth" — so linking is the shape the
 * architecture already asked for. Building a local sign-in form here would have
 * contradicted it, and on this store it would not have worked anyway: the new
 * customer-account flow completes its credential exchange against
 * shopify.com/authentication/... using a redirect URI that only an operator can
 * register in Shopify admin.
 *
 * Design: every value below traces to an existing token, and DESIGN.md declares
 * no `components:` token for an account page, so no mirror is needed in
 * tokens.css and no DESIGN.md edit ships with it (HARD RULE 7 is satisfied by
 * having nothing to mirror rather than by an empty diff). The call to action
 * reuses the global `.btn-primary` rather than adding a local button style.
 */

import { CUSTOMER_ACCOUNT_URL } from '~/utils/customer-account'

useSeoMeta({
  title: 'Account — STITCH AND ASH',
  description:
    'Your STITCH AND ASH order history, addresses, and tracking — all in one place.',
})
</script>

<template>
  <main class="account wrap">
    <p class="eyebrow">Account</p>
    <h1 class="account__title">Your account</h1>

    <p class="account__lede section-title">
      Your orders, addresses, and tracking live in the STITCH AND ASH account you
      use at checkout. It is the same account for every order, so there is
      nothing to sign up for twice.
    </p>

    <p class="account__actions">
      <a :href="CUSTOMER_ACCOUNT_URL" class="btn-primary account__cta">
        Open your account
      </a>
    </p>

    <section class="account__panel" aria-labelledby="account-orders-h">
      <h2 id="account-orders-h" class="account__sub">Orders</h2>
      <p class="account__line">
        Every order you have placed is listed there with its current status and,
        once it has shipped, its tracking numbers — from confirmed through to
        delivered. We also email a confirmation when an order goes out, so you
        can find an order from either side.
      </p>
      <p class="account__line text-muted">
        Opening your account takes you to the secure area where your orders are
        held. This site keeps no second copy of them and asks for no separate
        password here — one account, one sign-in.
      </p>
    </section>

    <section class="account__panel" aria-labelledby="account-help-h">
      <h2 id="account-help-h" class="account__sub">Cannot get in, or need a hand?</h2>
      <p class="account__line">
        If you have never ordered, or cannot remember which email address you
        used, tell us and we will find the order for you. Sizing, embroidery,
        made-to-order lead times, or a change to an order all reach the same two
        people who make the garments.
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

.account__actions {
  margin-block-end: var(--space-3xl);
}

/* The button itself is the global `.btn-primary` (white fill, uppercase,
   no radius) — reused rather than restyled, so /account cannot drift from the
   one call-to-action treatment the site has. The local rule only makes it a
   block-level link so it sits on its own line at every width. */
.account__cta {
  display: inline-block;
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