import { ax as vueExports, a2 as serverRenderer_cjs_prodExports } from './server.mjs';
import { _ as _export_sfc } from './_plugin-vue_export-helper-1tPrXgE0.mjs';

const _sfc_main = /* @__PURE__ */ vueExports.defineComponent({
  __name: "Badge",
  __ssrInlineRender: true,
  props: {
    variant: { default: "embroidered" }
  },
  setup(__props) {
    const props = __props;
    const labels = {
      "embroidered": "Embroidered",
      "limited-run": "Limited run",
      "low-stock": "Low stock",
      "made-to-order": "Made to order"
    };
    const label = vueExports.computed(() => labels[props.variant] ?? props.variant);
    const classes = vueExports.computed(() => ["badge", `badge--${props.variant}`]);
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<span${serverRenderer_cjs_prodExports.ssrRenderAttrs(vueExports.mergeProps({ class: vueExports.unref(classes) }, _attrs))} data-v-aacad949>${serverRenderer_cjs_prodExports.ssrInterpolate(vueExports.unref(label))}</span>`);
    };
  }
});
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = vueExports.useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/Badge.vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const __nuxt_component_0 = /* @__PURE__ */ Object.assign(_export_sfc(_sfc_main, [["__scopeId", "data-v-aacad949"]]), { __name: "Badge" });

export { __nuxt_component_0 as _ };
//# sourceMappingURL=Badge-B9wa0G88.mjs.map
