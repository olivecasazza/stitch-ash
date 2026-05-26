<script setup lang="ts">
import { PRODUCTS } from '~/data/products'

const route = useRoute()
const waitlistParam = computed(() => route.query.waitlist)

useSeoMeta({
  title: 'STITCH AND ASH — Embroidered Apparel',
  description: 'Minimal, embroidered, and black on black. Heavyweight cotton fleece hoodies, double-stitched to last.'
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
        Minimal, embroidered, and black on black. Heavyweight cotton fleece, double-stitched.
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
          We make black hoodies. Minimal, embroidered, and black on black.
        </p>
        <p>
          They are comfortable, heavy, and have double stitching that won't fall apart.
        </p>
        <p>
          No cheap blanks. Just heavy black cotton and black thread embroidery. That is it.
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
