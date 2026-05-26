import { _ as __nuxt_component_0 } from './ProductCard-SwRG_0tk.mjs';
import { ax as vueExports, aq as useRoute$1, as as useSeoMeta, a2 as serverRenderer_cjs_prodExports } from './server.mjs';
import { P as PRODUCTS } from './products-BY7H9gon.mjs';
import './Badge-B9wa0G88.mjs';
import './_plugin-vue_export-helper-1tPrXgE0.mjs';
import '../nitro/nitro.mjs';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'lru-cache';
import 'node:fs';
import 'node:path';
import 'node:crypto';
import 'vue-router';
import 'node:url';
import 'zod';
import '@iconify/utils';
import 'consola';
import 'perfect-debounce';
import 'node:diagnostics_channel';
import 'node:stream';
import '../routes/renderer.mjs';
import 'vue-bundle-renderer/runtime';
import 'vue/server-renderer';
import 'unhead/server';
import 'devalue';
import 'unhead/plugins';
import 'unhead/utils';
import 'vue';

const _sfc_main = /* @__PURE__ */ vueExports.defineComponent({
  __name: "index",
  __ssrInlineRender: true,
  setup(__props) {
    const route = useRoute$1();
    const waitlistParam = vueExports.computed(() => route.query.waitlist);
    useSeoMeta({
      title: "STITCH AND ASH — Embroidered Apparel",
      description: "Embroidered apparel. STITCH is the craft. ASH is what it costs. Premium gothic streetwear."
    });
    return (_ctx, _push, _parent, _attrs) => {
      const _component_ProductCard = __nuxt_component_0;
      _push(`<main${serverRenderer_cjs_prodExports.ssrRenderAttrs(_attrs)}><section class="hero wrap"><h1><svg class="mark mark--hero" viewBox="0 0 780 120" preserveAspectRatio="xMidYMid meet" style="${serverRenderer_cjs_prodExports.ssrRenderStyle({ "width": "100%", "max-width": "780px" })}" role="img" aria-label="STITCH AND ASH"><text x="0" y="92" font-family="&quot;UnifrakturMaguntia&quot;, &quot;Old English Text MT&quot;, &quot;Cambria&quot;, serif" font-size="104" letter-spacing="2" font-weight="400">STITCH &amp; ASH</text></svg></h1><p class="tag"> Embroidered apparel. <strong>STITCH</strong> is the craft. <strong>ASH</strong> is what it costs. </p></section><section class="wrap" aria-labelledby="prod-h"><p class="eyebrow" id="prod-h" style="${serverRenderer_cjs_prodExports.ssrRenderStyle({ "margin-block-start": "clamp(3rem, 6vw, 5rem)" })}">The first capsule — embroidered black on black</p><div class="products"><!--[-->`);
      serverRenderer_cjs_prodExports.ssrRenderList(vueExports.unref(PRODUCTS), (p) => {
        _push(serverRenderer_cjs_prodExports.ssrRenderComponent(_component_ProductCard, {
          key: p.handle,
          href: `/product/${p.handle}`,
          name: p.name,
          price: p.price,
          note: p.embroideryCopy,
          badge: p.badge
        }, null, _parent));
      });
      _push(`<!--]--></div></section><section id="statement" class="statement"><div class="wrap measure stack"><p class="eyebrow">Brand</p><p> We make black hoodies. Minimal, embroidered, and black on black. </p><p> They are comfortable, heavy, and have double stitching that won&#39;t fall apart. </p><p> No cheap blanks. Just heavy black cotton and black thread embroidery. That is it. </p></div></section><section id="signup" class="signup wrap"><p class="eyebrow">Pilot waitlist</p>`);
      if (vueExports.unref(waitlistParam) === "ok") {
        _push(`<p class="note" role="status" aria-live="polite" style="${serverRenderer_cjs_prodExports.ssrRenderStyle({ "color": "var(--bone)" })}"> You’re on the list. We’ll reach out when the pilot opens. </p>`);
      } else {
        _push(`<form method="post" action="/api/checkout" class="stack"><div><label for="email">Email</label><input type="email" id="email" name="email" required autocomplete="email" placeholder="you@elsewhere.com"></div><div style="${serverRenderer_cjs_prodExports.ssrRenderStyle({ "display": "flex", "gap": ".5rem", "flex-wrap": "wrap" })}"><input type="hidden" name="intent" value="waitlist"><button type="submit">Join the waitlist</button></div><p class="note"> During the pilot, orders are free — you’ll receive a render of the piece. Real fulfilment lands in the next phase. </p></form>`);
      }
      _push(`</section></main>`);
    };
  }
});
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = vueExports.useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/index.vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};

export { _sfc_main as default };
//# sourceMappingURL=index-D22ND893.mjs.map
