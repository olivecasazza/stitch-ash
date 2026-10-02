<script setup lang="ts">
/**
 * ProductPlate — the empty state for a product with no photography yet.
 *
 * DESIGN.md's thesis is "a UI that disappears into the garment and lets the
 * embroidery carry the visual weight". With no photography there is no garment,
 * so a flat charcoal rectangle reads as an unfinished wireframe rather than as
 * restraint. This replaces it with the thing that actually stands in for a
 * product photograph in manufacturing: a garment TECHNICAL FLAT — the outline
 * drawn as line work, with the embroidery zones marked and annotated.
 *
 * The annotation is drawn from the real product copy ("Design embroidered on
 * chest panel; small brand mark on left sleeve"), not invented dimensions, so
 * the plate states product truth rather than implying specifications we do not
 * have.
 *
 * Constraints honoured: hairlines only, zero radius, no shadow/gradient/blur,
 * achromatic tokens exclusively, mono type, no colour as state.
 */
// `name` builds the accessible name. `variant` selects the compact product-grid
// plate or the full PDP plate. `decorative` drops the accessible name, for use
// inside a link that already carries the product name in its text.
const props = defineProps({
  name: { type: String, required: true },
  variant: { type: String, default: 'card' },
  /** The object this flat depicts. Declared per product so a lanyard card
   *  never shows a hoodie. */
  silhouette: { type: String, default: 'hoodie' },
  decorative: { type: Boolean, default: false },
})

const accessibleName = computed(() => `${props.name} — technical flat, image pending`)
</script>

<template>
  <svg
    class="product-plate"
    :class="`product-plate--${variant}`"
    viewBox="0 0 600 750"
    xmlns="http://www.w3.org/2000/svg"
    preserveAspectRatio="xMidYMid meet"
    :role="decorative ? undefined : 'img'"
    :aria-label="decorative ? undefined : accessibleName"
    :aria-hidden="decorative ? 'true' : undefined"
    focusable="false"
  >
    <!-- Ground -->
    <rect width="600" height="750" fill="var(--charcoal)" />

    <!-- Crop / registration marks: the plate is a drawing sheet, not a photo -->
    <g stroke="var(--border-rule)" stroke-width="1" fill="none">
      <path d="M40 64 V40 H64" />
      <path d="M536 40 H560 V64" />
      <path d="M560 686 V710 H536" />
      <path d="M64 710 H40 V686" />
    </g>

    <!-- Sheet rule -->
    <rect x="40" y="40" width="520" height="670" fill="none" stroke="var(--border-rule)" stroke-width="1" />

    <!--
      One flat per silhouette, so the plate depicts the actual object rather
      than the same garment on every card. Line work only, centred on x=300 in
      a 600-wide sheet, spanning y=150..600 so every silhouette fills the plate
      without crowding the sheet rule.
    -->
    <g v-if="silhouette === 'lanyard'" class="product-plate__flat" fill="none" stroke="var(--grey-400)" stroke-width="1.25">
      <!-- Strap loop -->
      <path d="M210 268 C210 202 250 172 300 172 C350 172 390 202 390 268" />
      <path d="M236 268 C236 218 264 196 300 196 C336 196 364 218 364 268" stroke="var(--border-rule)" />
      <!-- Hardware ring -->
      <circle cx="300" cy="316" r="22" />
      <circle cx="300" cy="316" r="10" stroke="var(--border-rule)" />
      <!-- Strap, tapering down to the webbing plate -->
      <path d="M282 336 L256 470" />
      <path d="M318 336 L344 470" />
      <!-- Webbing plate -->
      <path d="M244 470 H356 L372 604 H228 Z" />
      <path d="M252 498 H348" stroke="var(--border-rule)" />
      <!-- Embroidered face on the strap -->
      <rect x="264" y="380" width="72" height="76" stroke-dasharray="5 4" />
      <g stroke="var(--border-rule)" stroke-width="1">
        <path d="M278 400 H322" />
        <path d="M278 414 H322" />
        <path d="M278 428 H308" />
        <path d="M278 442 H316" />
      </g>
    </g>

    <g v-else-if="silhouette === 'sticker'" class="product-plate__flat" fill="none" stroke="var(--grey-400)" stroke-width="1.25">
      <!-- Backing sheet, centred -->
      <rect x="186" y="236" width="228" height="256" />
      <!-- Peel / cut line -->
      <rect x="204" y="254" width="192" height="220" stroke="var(--border-rule)" stroke-dasharray="5 4" />
      <!-- Corner peel marks -->
      <path d="M186 236 L204 254" /><path d="M414 236 L396 254" />
      <path d="M186 492 L204 474" /><path d="M414 492 L396 474" />
      <!-- Embroidered face, centred -->
      <rect x="244" y="290" width="112" height="148" stroke-dasharray="5 4" />
      <g stroke="var(--border-rule)" stroke-width="1">
        <path d="M258 316 H342" />
        <path d="M258 332 H342" />
        <path d="M258 348 H324" />
        <path d="M258 364 H334" />
        <path d="M258 380 H316" />
        <path d="M258 396 H336" />
        <path d="M258 412 H300" />
      </g>
    </g>

    <g v-else class="product-plate__flat" fill="none" stroke="var(--grey-400)" stroke-width="1.25">
      <!-- Hood -->
      <path d="M232 214 C232 168 262 142 300 142 C338 142 368 168 368 214" />
      <path d="M258 214 C258 182 276 166 300 166 C324 166 342 182 342 214" stroke="var(--border-rule)" />

      <!-- Shoulders and sleeves -->
      <path d="M232 214 L150 258 L118 384 L182 404 L206 330" />
      <path d="M368 214 L450 258 L482 384 L418 404 L394 330" />

      <!-- Torso -->
      <path d="M206 262 L206 592" />
      <path d="M394 262 L394 592" />

      <!-- Shoulder seam and side seams -->
      <path d="M232 214 L206 262" stroke="var(--border-rule)" />
      <path d="M368 214 L394 262" stroke="var(--border-rule)" />
      <path d="M206 330 L182 404" stroke="var(--border-rule)" />
      <path d="M394 330 L418 404" stroke="var(--border-rule)" />

      <!-- Ribbed hem and cuffs -->
      <path d="M206 574 H394" stroke="var(--border-rule)" />
      <path d="M118 366 L182 386" stroke="var(--border-rule)" />
      <path d="M482 366 L418 386" stroke="var(--border-rule)" />

      <!-- Chest panel: the main embroidered design -->
      <rect x="238" y="292" width="124" height="104" stroke-dasharray="5 4" />

      <!-- Satin stitch runs inside the chest panel -->
      <g stroke="var(--border-rule)" stroke-width="1">
        <path d="M252 316 H348" />
        <path d="M252 330 H348" />
        <path d="M252 344 H330" />
        <path d="M252 358 H312" />
        <path d="M252 372 H336" />
      </g>

      <!-- Left sleeve brand mark -->
      <rect x="146" y="300" width="30" height="30" stroke-dasharray="5 4" />
      <g stroke="var(--border-rule)" stroke-width="1">
        <path d="M154 312 H168" />
        <path d="M154 320 H164" />
      </g>
    </g>

    <!-- Annotation. Leader lines point at the embroidery zone(s); the labels
         name the actual part of the object shown, so a lanyard is never
         captioned "chest panel". -->
    <g class="product-plate__notes">
      <template v-if="silhouette === 'hoodie'">
        <path d="M362 320 H470" stroke="var(--border-rule)" stroke-width="1" fill="none" />
        <circle cx="362" cy="320" r="2" fill="var(--grey-400)" />
        <text x="478" y="316">CHEST PANEL</text>
        <text x="478" y="332" class="product-plate__note-sub">SATIN STITCH</text>
        <path d="M146 286 V246 H236" stroke="var(--border-rule)" stroke-width="1" fill="none" />
        <circle cx="146" cy="286" r="2" fill="var(--grey-400)" />
        <text x="60" y="242">BRAND MARK</text>
        <text x="60" y="258" class="product-plate__note-sub">LEFT SLEEVE</text>
      </template>
      <template v-else-if="silhouette === 'lanyard'">
        <path d="M336 404 H462" stroke="var(--border-rule)" stroke-width="1" fill="none" />
        <circle cx="336" cy="404" r="2" fill="var(--grey-400)" />
        <text x="470" y="400">STRAP FACE</text>
        <text x="470" y="416" class="product-plate__note-sub">SATIN STITCH</text>
        <path d="M300 316 V214" stroke="var(--border-rule)" stroke-width="1" fill="none" />
        <circle cx="300" cy="214" r="2" fill="var(--grey-400)" />
        <text x="308" y="210">HARDWARE RING</text>
      </template>
      <template v-else>
        <path d="M356 340 H462" stroke="var(--border-rule)" stroke-width="1" fill="none" />
        <circle cx="356" cy="340" r="2" fill="var(--grey-400)" />
        <text x="470" y="336">FACE</text>
        <text x="470" y="352" class="product-plate__note-sub">SATIN STITCH</text>
        <path d="M204 254 V214" stroke="var(--border-rule)" stroke-width="1" fill="none" />
        <circle cx="204" cy="254" r="2" fill="var(--grey-400)" />
        <text x="60" y="210">PEEL EDGE</text>
      </template>
    </g>

    <!-- Sheet furniture: what this plate is, stated plainly -->
    <g class="product-plate__sheet">
      <text x="40" y="666">TECHNICAL FLAT — FRONT</text>
      <text x="560" y="666" text-anchor="end">IMAGE PENDING</text>
    </g>
  </svg>
</template>

<style scoped>
.product-plate {
  display: block;
  width: 100%;
  height: 100%;
}

/* All type is the single brand face, tracked and uppercase like every other
   label in the system. No new colour: --grey-400 and --bone only. */
.product-plate text {
  font-family: var(--font-body);
  font-size: 15px;
  font-weight: 500;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  fill: var(--grey-400);
}

/* Hierarchy comes from size and case, never colour: --border-rule on charcoal
   is effectively invisible and would fail contrast. Every annotation uses
   --grey-400 (7.46:1 on charcoal), which also keeps colour entirely out of
   the signalling business. */
.product-plate .product-plate__note-sub {
  font-size: 13px;
  letter-spacing: 0.12em;
}

.product-plate .product-plate__sheet text {
  font-size: 13px;
}

/* The card plate is roughly a third of the PDP plate. Drop the annotation so
   the type does not shrink below legibility, and keep the flat itself — it is
   what stops the card reading as a void. */
.product-plate--card .product-plate__notes {
  display: none;
}

.product-plate--card text {
  font-size: 17px;
}
</style>