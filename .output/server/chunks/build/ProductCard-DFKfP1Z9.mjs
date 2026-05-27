import { ax as vueExports, a2 as serverRenderer_cjs_prodExports, _ as __nuxt_component_0$1 } from './server.mjs';
import { _ as __nuxt_component_0$2 } from './Badge-CQj1DBYI.mjs';
import { _ as _export_sfc } from './_plugin-vue_export-helper-1tPrXgE0.mjs';

const _sfc_main = /* @__PURE__ */ vueExports.defineComponent({
  __name: "ProductCard",
  __ssrInlineRender: true,
  props: {
    href: {},
    name: {},
    price: {},
    note: {},
    imageSrc: {},
    imageAlt: { default: "" },
    hoverImageSrc: {},
    badge: {}
  },
  setup(__props) {
    const props = __props;
    const finalImageAlt = vueExports.computed(() => props.imageAlt || props.name);
    return (_ctx, _push, _parent, _attrs) => {
      const _component_NuxtLink = __nuxt_component_0$1;
      const _component_Badge = __nuxt_component_0$2;
      _push(serverRenderer_cjs_prodExports.ssrRenderComponent(_component_NuxtLink, vueExports.mergeProps({
        to: __props.href,
        class: "product-card"
      }, _attrs), {
        default: vueExports.withCtx((_, _push2, _parent2, _scopeId) => {
          if (_push2) {
            _push2(`<div class="product-card__image-wrap" data-v-0c20330c${_scopeId}>`);
            if (__props.imageSrc) {
              _push2(`<!--[--><img class="${serverRenderer_cjs_prodExports.ssrRenderClass(["product-card__img", "product-card__img--primary", { "has-hover": __props.hoverImageSrc }])}"${serverRenderer_cjs_prodExports.ssrRenderAttr("src", __props.imageSrc)}${serverRenderer_cjs_prodExports.ssrRenderAttr("alt", vueExports.unref(finalImageAlt))} loading="lazy" decoding="async" data-v-0c20330c${_scopeId}>`);
              if (__props.hoverImageSrc) {
                _push2(`<img class="product-card__img product-card__img--hover"${serverRenderer_cjs_prodExports.ssrRenderAttr("src", __props.hoverImageSrc)}${serverRenderer_cjs_prodExports.ssrRenderAttr("alt", `${vueExports.unref(finalImageAlt)} — detail`)} loading="lazy" decoding="async" aria-hidden="true" data-v-0c20330c${_scopeId}>`);
              } else {
                _push2(`<!---->`);
              }
              _push2(`<!--]-->`);
            } else {
              _push2(`<div class="product-card__placeholder" aria-hidden="true" data-v-0c20330c${_scopeId}>${serverRenderer_cjs_prodExports.ssrInterpolate(__props.name.toLowerCase())}</div>`);
            }
            _push2(`</div><div class="product-card__body" data-v-0c20330c${_scopeId}><div class="product-card__row" data-v-0c20330c${_scopeId}><h3 class="product-card__name" data-v-0c20330c${_scopeId}>${serverRenderer_cjs_prodExports.ssrInterpolate(__props.name)}</h3>`);
            if (__props.badge) {
              _push2(serverRenderer_cjs_prodExports.ssrRenderComponent(_component_Badge, { variant: __props.badge }, null, _parent2, _scopeId));
            } else {
              _push2(`<!---->`);
            }
            _push2(`</div>`);
            if (__props.note) {
              _push2(`<p class="product-card__note" data-v-0c20330c${_scopeId}>${serverRenderer_cjs_prodExports.ssrInterpolate(__props.note)}</p>`);
            } else {
              _push2(`<!---->`);
            }
            _push2(`<p class="product-card__price" data-v-0c20330c${_scopeId}>$${serverRenderer_cjs_prodExports.ssrInterpolate(__props.price)}</p></div>`);
          } else {
            return [
              vueExports.createVNode("div", { class: "product-card__image-wrap" }, [
                __props.imageSrc ? (vueExports.openBlock(), vueExports.createBlock(vueExports.Fragment, { key: 0 }, [
                  vueExports.createVNode("img", {
                    class: ["product-card__img", "product-card__img--primary", { "has-hover": __props.hoverImageSrc }],
                    src: __props.imageSrc,
                    alt: vueExports.unref(finalImageAlt),
                    loading: "lazy",
                    decoding: "async"
                  }, null, 10, ["src", "alt"]),
                  __props.hoverImageSrc ? (vueExports.openBlock(), vueExports.createBlock("img", {
                    key: 0,
                    class: "product-card__img product-card__img--hover",
                    src: __props.hoverImageSrc,
                    alt: `${vueExports.unref(finalImageAlt)} — detail`,
                    loading: "lazy",
                    decoding: "async",
                    "aria-hidden": "true"
                  }, null, 8, ["src", "alt"])) : vueExports.createCommentVNode("", true)
                ], 64)) : (vueExports.openBlock(), vueExports.createBlock("div", {
                  key: 1,
                  class: "product-card__placeholder",
                  "aria-hidden": "true"
                }, vueExports.toDisplayString(__props.name.toLowerCase()), 1))
              ]),
              vueExports.createVNode("div", { class: "product-card__body" }, [
                vueExports.createVNode("div", { class: "product-card__row" }, [
                  vueExports.createVNode("h3", { class: "product-card__name" }, vueExports.toDisplayString(__props.name), 1),
                  __props.badge ? (vueExports.openBlock(), vueExports.createBlock(_component_Badge, {
                    key: 0,
                    variant: __props.badge
                  }, null, 8, ["variant"])) : vueExports.createCommentVNode("", true)
                ]),
                __props.note ? (vueExports.openBlock(), vueExports.createBlock("p", {
                  key: 0,
                  class: "product-card__note"
                }, vueExports.toDisplayString(__props.note), 1)) : vueExports.createCommentVNode("", true),
                vueExports.createVNode("p", { class: "product-card__price" }, "$" + vueExports.toDisplayString(__props.price), 1)
              ])
            ];
          }
        }),
        _: 1
      }, _parent));
    };
  }
});
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = vueExports.useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/ProductCard.vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const __nuxt_component_0 = /* @__PURE__ */ Object.assign(_export_sfc(_sfc_main, [["__scopeId", "data-v-0c20330c"]]), { __name: "ProductCard" });

export { __nuxt_component_0 as _ };
//# sourceMappingURL=ProductCard-DFKfP1Z9.mjs.map
