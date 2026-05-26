import { _ as __nuxt_component_0 } from './Badge-BgAmNzpY.mjs';
import { aw as vueExports, ap as useRoute$1, r as createError, a8 as useCart, ar as useSeoMeta, a1 as serverRenderer_cjs_prodExports } from './server.mjs';
import { _ as _export_sfc } from './_plugin-vue_export-helper-1tPrXgE0.mjs';
import { P as PRODUCTS } from './products-BY7H9gon.mjs';
import { u as useStorefrontData } from './async-B6A707dQ.mjs';
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

const _sfc_main$2 = /* @__PURE__ */ vueExports.defineComponent({
  __name: "SizeSelector",
  __ssrInlineRender: true,
  props: {
    sizes: {},
    modelValue: { default: "" },
    name: { default: "size" }
  },
  emits: ["update:modelValue"],
  setup(__props, { emit: __emit }) {
    const props = __props;
    const emit = __emit;
    const selected = vueExports.computed({
      get: () => props.modelValue,
      set: (val) => emit("update:modelValue", val)
    });
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<fieldset${serverRenderer_cjs_prodExports.ssrRenderAttrs(vueExports.mergeProps({ class: "size-selector" }, _attrs))} data-v-f1fe5ec6><legend class="size-selector__legend" data-v-f1fe5ec6>Size</legend><div class="size-selector__options" data-v-f1fe5ec6><!--[-->`);
      serverRenderer_cjs_prodExports.ssrRenderList(__props.sizes, (size) => {
        _push(`<label class="size-selector__label"${serverRenderer_cjs_prodExports.ssrRenderAttr("for", `size-${size.toLowerCase().replace(/\s+/g, "-")}`)} data-v-f1fe5ec6><input class="size-selector__input" type="radio"${serverRenderer_cjs_prodExports.ssrRenderAttr("id", `size-${size.toLowerCase().replace(/\s+/g, "-")}`)}${serverRenderer_cjs_prodExports.ssrRenderAttr("name", __props.name)}${serverRenderer_cjs_prodExports.ssrRenderAttr("value", size)}${serverRenderer_cjs_prodExports.ssrIncludeBooleanAttr(serverRenderer_cjs_prodExports.ssrLooseEqual(vueExports.unref(selected), size)) ? " checked" : ""} data-v-f1fe5ec6><span class="size-selector__swatch" data-v-f1fe5ec6>${serverRenderer_cjs_prodExports.ssrInterpolate(size)}</span></label>`);
      });
      _push(`<!--]--></div></fieldset>`);
    };
  }
});
const _sfc_setup$2 = _sfc_main$2.setup;
_sfc_main$2.setup = (props, ctx) => {
  const ssrContext = vueExports.useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/SizeSelector.vue");
  return _sfc_setup$2 ? _sfc_setup$2(props, ctx) : void 0;
};
const __nuxt_component_1 = /* @__PURE__ */ Object.assign(_export_sfc(_sfc_main$2, [["__scopeId", "data-v-f1fe5ec6"]]), { __name: "SizeSelector" });
const _sfc_main$1 = /* @__PURE__ */ vueExports.defineComponent({
  __name: "DetailsAccordion",
  __ssrInlineRender: true,
  props: {
    sections: {}
  },
  setup(__props) {
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<div${serverRenderer_cjs_prodExports.ssrRenderAttrs(vueExports.mergeProps({ class: "accordion" }, _attrs))} data-v-97b5a3d3><!--[-->`);
      serverRenderer_cjs_prodExports.ssrRenderList(__props.sections, (section, i) => {
        _push(`<details class="accordion__item"${serverRenderer_cjs_prodExports.ssrIncludeBooleanAttr(i === 0) ? " open" : ""} data-v-97b5a3d3><summary class="accordion__summary" data-v-97b5a3d3><span data-v-97b5a3d3>${serverRenderer_cjs_prodExports.ssrInterpolate(section.label)}</span><svg class="accordion__icon" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" data-v-97b5a3d3><polyline points="4 6 8 10 12 6" data-v-97b5a3d3></polyline></svg></summary><div class="accordion__body" data-v-97b5a3d3><p data-v-97b5a3d3>${section.body ?? ""}</p></div></details>`);
      });
      _push(`<!--]--></div>`);
    };
  }
});
const _sfc_setup$1 = _sfc_main$1.setup;
_sfc_main$1.setup = (props, ctx) => {
  const ssrContext = vueExports.useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/DetailsAccordion.vue");
  return _sfc_setup$1 ? _sfc_setup$1(props, ctx) : void 0;
};
const __nuxt_component_2 = /* @__PURE__ */ Object.assign(_export_sfc(_sfc_main$1, [["__scopeId", "data-v-97b5a3d3"]]), { __name: "DetailsAccordion" });
const _sfc_main = /* @__PURE__ */ vueExports.defineComponent({
  __name: "[handle]",
  __ssrInlineRender: true,
  async setup(__props) {
    let __temp, __restore;
    const route = useRoute$1();
    const handle = vueExports.computed(() => route.params.handle);
    const staticProduct = vueExports.computed(() => PRODUCTS.find((p) => p.handle === handle.value));
    if (!staticProduct.value) {
      throw createError({
        statusCode: 404,
        statusMessage: `Product not found: ${route.fullPath}`
      });
    }
    const { data, error } = ([__temp, __restore] = vueExports.withAsyncContext(() => useStorefrontData(`product-${handle.value}`, `#graphql
  query FetchProduct($handle: String!) {
    product(handle: $handle) {
      id
      title
      description
      variants(first: 50) {
        edges {
          node {
            id
            title
            price {
              amount
              currencyCode
            }
            availableForSale
          }
        }
      }
    }
  }
`, {
      variables: vueExports.computed(() => ({ handle: handle.value })),
      cache: "long"
    })), __temp = await __temp, __restore(), __temp);
    const productExistsInShopify = vueExports.computed(() => !!data.value?.product);
    const isPreview = vueExports.computed(() => !productExistsInShopify.value || !!error.value);
    const displayName = vueExports.computed(() => data.value?.product?.title ?? staticProduct.value?.name ?? "");
    const displayDescription = vueExports.computed(() => data.value?.product?.description ?? staticProduct.value?.description ?? "");
    const displayPrice = vueExports.computed(() => {
      const shopifyVariants = data.value?.product?.variants?.edges || [];
      const firstPrice = shopifyVariants[0]?.node?.price?.amount;
      return firstPrice ? parseFloat(firstPrice).toFixed(0) : staticProduct.value?.price ?? 0;
    });
    const resolvedVariants = vueExports.computed(() => {
      return (data.value?.product?.variants?.edges || []).map((edge) => edge.node);
    });
    const variantId = vueExports.computed(() => {
      return resolvedVariants.value.find((v) => v.availableForSale)?.id ?? null;
    });
    const hasRealSizes = vueExports.computed(() => (staticProduct.value?.sizes?.length ?? 0) > 1);
    const sizeValues = vueExports.computed(() => (staticProduct.value?.sizes || []).map((s) => s.label));
    const selectedSize = vueExports.ref(sizeValues.value[0] || "One size");
    const zoomed = vueExports.ref(false);
    useCart();
    useSeoMeta({
      title: vueExports.computed(() => `${displayName.value} — STITCH AND ASH`),
      description: vueExports.computed(() => displayDescription.value)
    });
    return (_ctx, _push, _parent, _attrs) => {
      const _component_Badge = __nuxt_component_0;
      const _component_SizeSelector = __nuxt_component_1;
      const _component_DetailsAccordion = __nuxt_component_2;
      _push(`<main${serverRenderer_cjs_prodExports.ssrRenderAttrs(vueExports.mergeProps({ class: "pdp wrap" }, _attrs))} data-v-1bbb2c1f>`);
      if (vueExports.unref(isPreview)) {
        _push(`<div class="pdp__preview-notice" role="status" data-v-1bbb2c1f><span data-v-1bbb2c1f>Preview — commerce not yet wired. No checkout available.</span></div>`);
      } else {
        _push(`<!---->`);
      }
      _push(`<div class="pdp__layout" data-v-1bbb2c1f><div class="pdp__gallery" data-v-1bbb2c1f><div class="pdp__image-placeholder"${serverRenderer_cjs_prodExports.ssrRenderAttr("data-zoomed", vueExports.unref(zoomed) ? "" : void 0)} role="button"${serverRenderer_cjs_prodExports.ssrRenderAttr("aria-label", vueExports.unref(zoomed) ? "Collapse image" : "Zoom image")} tabindex="0" data-v-1bbb2c1f><svg viewBox="0 0 600 750" xmlns="http://www.w3.org/2000/svg"${serverRenderer_cjs_prodExports.ssrRenderAttr("aria-label", `${vueExports.unref(displayName)} — product image coming soon`)} role="img" class="pdp__placeholder-svg" style="${serverRenderer_cjs_prodExports.ssrRenderStyle(vueExports.unref(zoomed) ? { transform: "scale(1.6)" } : {})}" data-v-1bbb2c1f><rect width="600" height="750" fill="#0B0B0B" data-v-1bbb2c1f></rect><rect x="1" y="1" width="598" height="748" fill="none" stroke="#C0C0C0" stroke-width="1" stroke-dasharray="6 6" opacity="0.4" data-v-1bbb2c1f></rect><g stroke="#1A1A1A" stroke-width="1" opacity="0.6" data-v-1bbb2c1f><!--[-->`);
      serverRenderer_cjs_prodExports.ssrRenderList(20, (i) => {
        _push(`<line${serverRenderer_cjs_prodExports.ssrRenderAttr("x1", 0)}${serverRenderer_cjs_prodExports.ssrRenderAttr("y1", (i - 1) * 40)}${serverRenderer_cjs_prodExports.ssrRenderAttr("x2", 600)}${serverRenderer_cjs_prodExports.ssrRenderAttr("y2", (i - 1) * 40)} data-v-1bbb2c1f></line>`);
      });
      _push(`<!--]--><!--[-->`);
      serverRenderer_cjs_prodExports.ssrRenderList(15, (i) => {
        _push(`<line${serverRenderer_cjs_prodExports.ssrRenderAttr("x1", (i - 1) * 42)}${serverRenderer_cjs_prodExports.ssrRenderAttr("y1", 0)}${serverRenderer_cjs_prodExports.ssrRenderAttr("x2", (i - 1) * 42)}${serverRenderer_cjs_prodExports.ssrRenderAttr("y2", 750)} data-v-1bbb2c1f></line>`);
      });
      _push(`<!--]--></g><text x="300" y="360" text-anchor="middle" dominant-baseline="middle" fill="#C0C0C0" font-family="Inter, system-ui, sans-serif" font-size="13" letter-spacing="0.12em" opacity="0.5" data-v-1bbb2c1f>${serverRenderer_cjs_prodExports.ssrInterpolate(vueExports.unref(displayName).toUpperCase())}</text><text x="300" y="385" text-anchor="middle" dominant-baseline="middle" fill="#C0C0C0" font-family="Inter, system-ui, sans-serif" font-size="10" letter-spacing="0.1em" opacity="0.35" data-v-1bbb2c1f> PHOTOGRAPHY COMING SOON </text></svg><button class="pdp__zoom-btn"${serverRenderer_cjs_prodExports.ssrRenderAttr("aria-label", vueExports.unref(zoomed) ? "Collapse image" : "Zoom image")} data-v-1bbb2c1f><svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true" data-v-1bbb2c1f><circle cx="8" cy="8" r="5.5" data-v-1bbb2c1f></circle><line x1="12.5" y1="12.5" x2="18" y2="18" data-v-1bbb2c1f></line>`);
      if (!vueExports.unref(zoomed)) {
        _push(`<line x1="8" y1="5.5" x2="8" y2="10.5" data-v-1bbb2c1f></line>`);
      } else {
        _push(`<!---->`);
      }
      if (!vueExports.unref(zoomed)) {
        _push(`<line x1="5.5" y1="8" x2="10.5" y2="8" data-v-1bbb2c1f></line>`);
      } else {
        _push(`<!---->`);
      }
      if (vueExports.unref(zoomed)) {
        _push(`<line x1="5.5" y1="8" x2="10.5" y2="8" data-v-1bbb2c1f></line>`);
      } else {
        _push(`<!---->`);
      }
      _push(`</svg></button></div></div><div class="pdp__info" data-v-1bbb2c1f><div class="pdp__badges" data-v-1bbb2c1f>`);
      _push(serverRenderer_cjs_prodExports.ssrRenderComponent(_component_Badge, { variant: "made-to-order" }, null, _parent));
      if (vueExports.unref(isPreview)) {
        _push(serverRenderer_cjs_prodExports.ssrRenderComponent(_component_Badge, {
          variant: "limited-run",
          class: "pdp__preview-badge"
        }, null, _parent));
      } else {
        _push(`<!---->`);
      }
      _push(`</div><h1 class="pdp__name" data-v-1bbb2c1f>${serverRenderer_cjs_prodExports.ssrInterpolate(vueExports.unref(displayName))}</h1><p class="pdp__price" data-v-1bbb2c1f>$${serverRenderer_cjs_prodExports.ssrInterpolate(vueExports.unref(displayPrice))}</p><p class="pdp__description" data-v-1bbb2c1f>${serverRenderer_cjs_prodExports.ssrInterpolate(vueExports.unref(displayDescription))}</p><p class="pdp__embroidery-note" data-v-1bbb2c1f>${serverRenderer_cjs_prodExports.ssrInterpolate(vueExports.unref(staticProduct)?.embroideryCopy)}</p><div class="pdp__size-wrap" data-v-1bbb2c1f>`);
      if (vueExports.unref(hasRealSizes)) {
        _push(serverRenderer_cjs_prodExports.ssrRenderComponent(_component_SizeSelector, {
          sizes: vueExports.unref(sizeValues),
          modelValue: vueExports.unref(selectedSize),
          "onUpdate:modelValue": ($event) => vueExports.isRef(selectedSize) ? selectedSize.value = $event : null
        }, null, _parent));
      } else {
        _push(`<p class="pdp__one-size" data-v-1bbb2c1f><span class="pdp__one-size-label" data-v-1bbb2c1f>Size</span> One size </p>`);
      }
      _push(`</div>`);
      if (vueExports.unref(variantId)) {
        _push(`<button class="pdp__atc-btn pdp__atc-btn--primary" data-v-1bbb2c1f> Add to cart </button>`);
      } else {
        _push(`<button class="pdp__atc-btn pdp__atc-btn--disabled" disabled aria-disabled="true" data-v-1bbb2c1f> Made to order — coming soon </button>`);
      }
      _push(`<div class="pdp__accordion-wrap" data-v-1bbb2c1f>`);
      _push(serverRenderer_cjs_prodExports.ssrRenderComponent(_component_DetailsAccordion, {
        sections: vueExports.unref(staticProduct)?.details || []
      }, null, _parent));
      _push(`</div></div></div></main>`);
    };
  }
});
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = vueExports.useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/product/[handle].vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const _handle_ = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-1bbb2c1f"]]);

export { _handle_ as default };
//# sourceMappingURL=_handle_-CfrrmFsf.mjs.map
