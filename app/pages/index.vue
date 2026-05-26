<script setup lang="ts">
import { PRODUCTS } from '~/data/products'

const route = useRoute()
const waitlistParam = computed(() => route.query.waitlist)

useSeoMeta({
  title: 'STITCH AND ASH — Embroidered Apparel',
  description: 'Embroidered apparel. STITCH is the craft. ASH is what it costs. Premium gothic streetwear.'
})
</script>

<template>
  <main>
    <!-- HERO -->
    <section class="hero wrap">
      <h1>
        <svg
          class="mark mark--hero"
          viewBox="0 0 780 120"
          preserveAspectRatio="xMidYMid meet"
          style="width: 100%; max-width: 780px;"
          role="img"
          aria-label="STITCH AND ASH"
        >
          <text
            x="0"
            y="92"
            font-family='"UnifrakturMaguntia", "Old English Text MT", "Cambria", serif'
            font-size="104"
            letter-spacing="2"
            font-weight="400"
          >STITCH &amp; ASH</text>
        </svg>
      </h1>
      <p class="tag">
        Embroidered apparel. <strong>STITCH</strong> is the craft.
        <strong>ASH</strong> is what it costs.
      </p>
    </section>

    <!-- PRODUCTS -->
    <section class="wrap" aria-labelledby="prod-h">
      <p class="eyebrow" id="prod-h" style="margin-block-start: clamp(3rem, 6vw, 5rem)">The first capsule &mdash; embroidered black on black</p>
      <div class="products">
        <ProductCard
          v-for="p in PRODUCTS"
          :key="p.handle"
          :href="`/product/${p.handle}`"
          :name="p.name"
          :price="p.price"
          :note="p.embroideryCopy"
          :badge="p.badge"
        />
      </div>
    </section>

    <!-- BRAND STATEMENT -->
    <section id="statement" class="statement">
      <div class="wrap measure stack">
        <p class="eyebrow">Brand</p>
        <p>
          Two words held in tension. STITCH is precision &mdash;
          the slow needle, the locked thread, the part that survives wash
          after wash. ASH is what burns clean: restraint, weight, the
          black ground that lets the mark sit.
        </p>
        <p>
          We make embroidered apparel in small runs. Black thread on black
          ground. Every piece carries two embroidered elements: the design,
          and the mark. Nothing extra.
        </p>
      </div>
    </section>

    <!-- WAITLIST -->
    <section id="signup" class="signup wrap">
      <p class="eyebrow">Pilot waitlist</p>
      <template v-if="waitlistParam === 'ok'">
        <p class="note" role="status" aria-live="polite" style="color:var(--bone)">
          You&rsquo;re on the list. We&rsquo;ll reach out when the pilot opens.
        </p>
      </template>
      <template v-else>
        <form method="post" action="/api/checkout" class="stack">
          <div>
            <label for="email">Email</label>
            <input type="email" id="email" name="email" required autocomplete="email" placeholder="you@elsewhere.com" />
          </div>
          <div style="display:flex;gap:.5rem;flex-wrap:wrap">
            <input type="hidden" name="intent" value="waitlist" />
            <button type="submit">Join the waitlist</button>
          </div>
          <p class="note">
            During the pilot, orders are free &mdash; you&rsquo;ll receive a render of
            the piece. Real fulfilment lands in the next phase.
          </p>
        </form>
      </template>
    </section>
  </main>
</template>
