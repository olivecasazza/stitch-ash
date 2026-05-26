import { ax as vueExports, as as useSeoMeta, a2 as serverRenderer_cjs_prodExports, _ as __nuxt_component_0$1 } from './server.mjs';
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
  __name: "ops-platform",
  __ssrInlineRender: true,
  setup(__props) {
    useSeoMeta({
      title: "Operations platform — STITCH AND ASH",
      description: "STITCH AND ASH operations platform recommendation."
    });
    return (_ctx, _push, _parent, _attrs) => {
      const _component_NuxtLink = __nuxt_component_0$1;
      _push(`<main${serverRenderer_cjs_prodExports.ssrRenderAttrs(vueExports.mergeProps({
        class: "wrap measure stack-lg",
        style: { "padding-block": "clamp(3rem, 6vw, 5rem)" }
      }, _attrs))}><p>`);
      _push(serverRenderer_cjs_prodExports.ssrRenderComponent(_component_NuxtLink, { to: "/" }, {
        default: vueExports.withCtx((_, _push2, _parent2, _scopeId) => {
          if (_push2) {
            _push2(`← STITCH AND ASH`);
          } else {
            return [
              vueExports.createTextVNode("← STITCH AND ASH")
            ];
          }
        }),
        _: 1
      }, _parent));
      _push(`</p><div class="stack"><h1 style="${serverRenderer_cjs_prodExports.ssrRenderStyle({ "font-family": "var(--font-display)", "font-size": "clamp(2rem, 4vw, 3rem)", "font-weight": "500" })}">Operations platform recommendation</h1><p style="${serverRenderer_cjs_prodExports.ssrRenderStyle({ "font-size": "var(--text-lg)", "color": "var(--bone)" })}"> Do not build an admin sales/orders/shipping/inventory dashboard from scratch right now. Use Shopify as the system of record and keep this site as the branded front-end. </p></div><section class="stack"><h2 class="eyebrow">Why Shopify first</h2><ul class="stack" style="${serverRenderer_cjs_prodExports.ssrRenderStyle({ "padding-inline-start": "1.2rem", "color": "var(--ash-silver)" })}"><li>Orders, payments, taxes, refunds, fraud checks, discounts, and customer accounts are already solved.</li><li>Inventory and SKU variants are mature enough for apparel sizes, colors, blanks, and limited drops.</li><li>Shipping labels, fulfillment status, notifications, and returns can be handled in one admin surface.</li><li>Buy Buttons or Storefront API can plug into Astro without replacing the visual site.</li><li>It gives human admins one operational console while Paperclip stays focused on software work.</li></ul></section><section class="stack"><h2 class="eyebrow">Recommended shape</h2><ol class="stack" style="${serverRenderer_cjs_prodExports.ssrRenderStyle({ "padding-inline-start": "1.2rem", "color": "var(--ash-silver)" })}"><li>Set up Shopify for products, inventory, checkout, orders, shipping, tax, and customer support.</li><li>Embed Shopify Buy Buttons or use Hydrogen/Storefront API only where the brand experience needs it.</li><li>Send regular customer/site reports to a human admin queue.</li><li>Send admin-confirmed software bugs to Paperclip&#39;s software development team.</li><li>Add Paperclip automation later for triage, QA, and release notes — not order fulfillment state.</li></ol></section><section class="stack"><h2 class="eyebrow">Alternatives</h2><p style="${serverRenderer_cjs_prodExports.ssrRenderStyle({ "color": "var(--ash-silver)", "line-height": "1.6" })}"> Medusa or Saleor are viable if we need full OSS ownership and custom fulfillment logic, but they add hosting, security, payment, tax, and admin-maintenance burden. WooCommerce is cheaper but more plugin-heavy. Square is fine for POS-first workflows. For this brand, Shopify is the lowest-risk e2e operational choice. </p></section></main>`);
    };
  }
});
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = vueExports.useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/ops-platform.vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};

export { _sfc_main as default };
//# sourceMappingURL=ops-platform-B-Ih8IsK.mjs.map
