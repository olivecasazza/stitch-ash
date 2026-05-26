import { a as _sfc_main$1$1, _ as _sfc_main$8 } from './Breadcrumb-DKf_g8cz.mjs';
import { b as _sfc_main$2$1, a as _sfc_main$1$2, _ as _sfc_main$b, c as useId, u as useFormControl, V as VisuallyHiddenInput_default, L as Label_default } from './InputNumber-vHSIttX4.mjs';
import { ax as vueExports, ak as useI18n, a7 as useAppConfig, am as useLocalePath, aq as useRoute$1, I as IMAGE_FRAGMENT, s as createError, as as useSeoMeta, a2 as serverRenderer_cjs_prodExports, q as connectionParamsSchema, U as localizationParamsSchema, av as variantOptionFilterSchema, W as metafieldFilterSchema, a3 as taxonomyMetafieldFilterSchema, $ as priceRangeFilterSchema, p as categoryFilterSchema, ar as useRouter, b as PRODUCT_CONNECTION_FRAGMENT, c as PRODUCT_FILTERS_FRAGMENT, P as PRICE_FRAGMENT, w as flattenConnection, m as _sfc_main$9, l as _sfc_main$f, an as useLocalization, ac as useComponentProps, aj as useForwardProps, a1 as reactivePick, a5 as tv, K as get, ai as useForwardExpose, e as Primitive, ah as useFormField, X as omit, Q as injectConfigProviderContext, au as useVModel, r as createContext, af as useEventListener, d as Presence_default, ap as usePrimitiveElement, aa as useCollection$1, S as isNullish, L as getActiveElement } from './server.mjs';
import { z } from 'zod';
import { _ as _sfc_main$a } from './Badge-HJnL0mjq.mjs';
import { _ as __nuxt_component_0$2 } from './ProductCard-ynLY3Lx_.mjs';
import { u as useStorefrontData } from './async-XfSVIDig.mjs';
import { G as isEqual } from '../nitro/nitro.mjs';
import 'perfect-debounce';
import 'node:diagnostics_channel';
import 'node:stream';
import 'consola';
import '../routes/renderer.mjs';
import 'vue-bundle-renderer/runtime';
import 'vue/server-renderer';
import 'unhead/server';
import 'devalue';
import 'unhead/plugins';
import 'unhead/utils';
import 'vue';
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
import '@iconify/utils';
import './Badge-B9wa0G88.mjs';
import './_plugin-vue_export-helper-1tPrXgE0.mjs';

function isValueEqualOrExist(base, current) {
  if (isNullish(base)) return false;
  if (Array.isArray(base)) return base.some((val) => isEqual(val, current));
  else return isEqual(base, current);
}
const ignoredElement = ["INPUT", "TEXTAREA"];
function useArrowNavigation(e, currentElement, parentElement, options = {}) {
  if (!currentElement || options.enableIgnoredElement && ignoredElement.includes(currentElement.nodeName)) return null;
  const { arrowKeyOptions = "both", attributeName = "[data-reka-collection-item]", itemsArray = [], loop = true, dir = "ltr", preventScroll = true, focus = false } = options;
  const [right, left, up, down, home, end] = [
    e.key === "ArrowRight",
    e.key === "ArrowLeft",
    e.key === "ArrowUp",
    e.key === "ArrowDown",
    e.key === "Home",
    e.key === "End"
  ];
  const goingVertical = up || down;
  const goingHorizontal = right || left;
  if (!home && !end && (!goingVertical && !goingHorizontal || arrowKeyOptions === "vertical" && goingHorizontal || arrowKeyOptions === "horizontal" && goingVertical)) return null;
  const allCollectionItems = parentElement ? Array.from(parentElement.querySelectorAll(attributeName)) : itemsArray;
  if (!allCollectionItems.length) return null;
  if (preventScroll) e.preventDefault();
  let item = null;
  if (goingHorizontal || goingVertical) {
    const goForward = goingVertical ? down : dir === "ltr" ? right : left;
    item = findNextFocusableElement(allCollectionItems, currentElement, {
      goForward,
      loop
    });
  } else if (home) item = allCollectionItems.at(0) || null;
  else if (end) item = allCollectionItems.at(-1) || null;
  if (focus) item?.focus();
  return item;
}
function findNextFocusableElement(elements, currentElement, options, iterations = !elements.includes(currentElement) ? elements.length + 1 : elements.length) {
  if (--iterations === 0) return null;
  const index = elements.indexOf(currentElement);
  let newIndex;
  if (index === -1) newIndex = options.goForward ? 0 : elements.length - 1;
  else newIndex = options.goForward ? index + 1 : index - 1;
  if (!options.loop && (newIndex < 0 || newIndex >= elements.length)) return null;
  const adjustedNewIndex = (newIndex + elements.length) % elements.length;
  const candidate = elements[adjustedNewIndex];
  if (!candidate) return null;
  const isDisabled = candidate.hasAttribute("disabled") && candidate.getAttribute("disabled") !== "false";
  if (isDisabled) return findNextFocusableElement(elements, candidate, options, iterations);
  return candidate;
}
function useDirection(dir) {
  const context = injectConfigProviderContext({ dir: vueExports.ref("ltr") });
  return vueExports.computed(() => dir?.value || context.dir?.value || "ltr");
}
const [injectCollapsibleRootContext, provideCollapsibleRootContext] = /* @__PURE__ */ createContext("CollapsibleRoot");
var CollapsibleRoot_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ vueExports.defineComponent({
  __name: "CollapsibleRoot",
  props: {
    defaultOpen: {
      type: Boolean,
      required: false,
      default: false
    },
    open: {
      type: Boolean,
      required: false,
      default: void 0
    },
    disabled: {
      type: Boolean,
      required: false
    },
    unmountOnHide: {
      type: Boolean,
      required: false,
      default: true
    },
    asChild: {
      type: Boolean,
      required: false
    },
    as: {
      type: null,
      required: false
    }
  },
  emits: ["update:open"],
  setup(__props, { expose: __expose, emit: __emit }) {
    const props = __props;
    const emit = __emit;
    const open = useVModel(props, "open", emit, {
      defaultValue: props.defaultOpen,
      passive: props.open === void 0
    });
    const { disabled, unmountOnHide } = vueExports.toRefs(props);
    provideCollapsibleRootContext({
      contentId: "",
      disabled,
      open,
      unmountOnHide,
      onOpenToggle: () => {
        if (disabled.value) return;
        open.value = !open.value;
      }
    });
    __expose({ open });
    useForwardExpose();
    return (_ctx, _cache) => {
      return vueExports.openBlock(), vueExports.createBlock(vueExports.unref(Primitive), {
        as: _ctx.as,
        "as-child": props.asChild,
        "data-state": vueExports.unref(open) ? "open" : "closed",
        "data-disabled": vueExports.unref(disabled) ? "" : void 0
      }, {
        default: vueExports.withCtx(() => [vueExports.renderSlot(_ctx.$slots, "default", { open: vueExports.unref(open) })]),
        _: 3
      }, 8, [
        "as",
        "as-child",
        "data-state",
        "data-disabled"
      ]);
    };
  }
});
var CollapsibleRoot_default = CollapsibleRoot_vue_vue_type_script_setup_true_lang_default;
var CollapsibleContent_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ vueExports.defineComponent({
  inheritAttrs: false,
  __name: "CollapsibleContent",
  props: {
    forceMount: {
      type: Boolean,
      required: false
    },
    asChild: {
      type: Boolean,
      required: false
    },
    as: {
      type: null,
      required: false
    }
  },
  emits: ["contentFound"],
  setup(__props, { emit: __emit }) {
    const props = __props;
    const emits = __emit;
    const rootContext = injectCollapsibleRootContext();
    rootContext.contentId ||= useId(void 0, "reka-collapsible-content");
    const presentRef = vueExports.ref();
    const { forwardRef, currentElement } = useForwardExpose();
    const width = vueExports.ref(0);
    const height = vueExports.ref(0);
    const isOpen = vueExports.computed(() => rootContext.open.value);
    const isMountAnimationPrevented = vueExports.ref(isOpen.value);
    const currentStyle = vueExports.ref();
    vueExports.watch(() => [isOpen.value, presentRef.value?.present], async () => {
      await vueExports.nextTick();
      const node = currentElement.value;
      if (!node) return;
      currentStyle.value = currentStyle.value || {
        transitionDuration: node.style.transitionDuration,
        animationName: node.style.animationName
      };
      node.style.transitionDuration = "0s";
      node.style.animationName = "none";
      const rect = node.getBoundingClientRect();
      height.value = rect.height;
      width.value = rect.width;
      if (!isMountAnimationPrevented.value) {
        node.style.transitionDuration = currentStyle.value.transitionDuration;
        node.style.animationName = currentStyle.value.animationName;
      }
    }, { immediate: true });
    const skipAnimation = vueExports.computed(() => isMountAnimationPrevented.value && rootContext.open.value);
    useEventListener(currentElement, "beforematch", (ev) => {
      requestAnimationFrame(() => {
        rootContext.onOpenToggle();
        emits("contentFound");
      });
    });
    return (_ctx, _cache) => {
      return vueExports.openBlock(), vueExports.createBlock(vueExports.unref(Presence_default), {
        ref_key: "presentRef",
        ref: presentRef,
        present: _ctx.forceMount || vueExports.unref(rootContext).open.value,
        "force-mount": true
      }, {
        default: vueExports.withCtx(({ present }) => [vueExports.createVNode(vueExports.unref(Primitive), vueExports.mergeProps(_ctx.$attrs, {
          id: vueExports.unref(rootContext).contentId,
          ref: vueExports.unref(forwardRef),
          "as-child": props.asChild,
          as: _ctx.as,
          hidden: !present ? vueExports.unref(rootContext).unmountOnHide.value ? "" : "until-found" : void 0,
          "data-state": skipAnimation.value ? void 0 : vueExports.unref(rootContext).open.value ? "open" : "closed",
          "data-disabled": vueExports.unref(rootContext).disabled?.value ? "" : void 0,
          style: {
            [`--reka-collapsible-content-height`]: `${height.value}px`,
            [`--reka-collapsible-content-width`]: `${width.value}px`
          }
        }), {
          default: vueExports.withCtx(() => [(vueExports.unref(rootContext).unmountOnHide.value ? present : true) ? vueExports.renderSlot(_ctx.$slots, "default", { key: 0 }) : vueExports.createCommentVNode("v-if", true)]),
          _: 2
        }, 1040, [
          "id",
          "as-child",
          "as",
          "hidden",
          "data-state",
          "data-disabled",
          "style"
        ])]),
        _: 3
      }, 8, ["present"]);
    };
  }
});
var CollapsibleContent_default = CollapsibleContent_vue_vue_type_script_setup_true_lang_default;
var CollapsibleTrigger_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ vueExports.defineComponent({
  __name: "CollapsibleTrigger",
  props: {
    asChild: {
      type: Boolean,
      required: false
    },
    as: {
      type: null,
      required: false,
      default: "button"
    }
  },
  setup(__props) {
    const props = __props;
    useForwardExpose();
    const rootContext = injectCollapsibleRootContext();
    return (_ctx, _cache) => {
      return vueExports.openBlock(), vueExports.createBlock(vueExports.unref(Primitive), {
        type: _ctx.as === "button" ? "button" : void 0,
        as: _ctx.as,
        "as-child": props.asChild,
        "aria-controls": vueExports.unref(rootContext).contentId,
        "aria-expanded": vueExports.unref(rootContext).open.value,
        "data-state": vueExports.unref(rootContext).open.value ? "open" : "closed",
        "data-disabled": vueExports.unref(rootContext).disabled?.value ? "" : void 0,
        disabled: vueExports.unref(rootContext).disabled?.value,
        onClick: vueExports.unref(rootContext).onOpenToggle
      }, {
        default: vueExports.withCtx(() => [vueExports.renderSlot(_ctx.$slots, "default")]),
        _: 3
      }, 8, [
        "type",
        "as",
        "as-child",
        "aria-controls",
        "aria-expanded",
        "data-state",
        "data-disabled",
        "disabled",
        "onClick"
      ]);
    };
  }
});
var CollapsibleTrigger_default = CollapsibleTrigger_vue_vue_type_script_setup_true_lang_default;
function validateProps({ type, defaultValue, modelValue }) {
  const value = modelValue || defaultValue;
  const canTypeBeInferred = modelValue !== void 0 || defaultValue !== void 0;
  if (canTypeBeInferred) return Array.isArray(value) ? "multiple" : "single";
  else return type ?? "single";
}
function getDefaultType({ type, defaultValue, modelValue }) {
  if (type) return type;
  return validateProps({
    type,
    defaultValue,
    modelValue
  });
}
function getDefaultValue({ type, defaultValue }) {
  if (defaultValue !== void 0) return defaultValue;
  return type === "single" ? void 0 : [];
}
function useSingleOrMultipleValue(props, emits) {
  const type = vueExports.computed(() => getDefaultType(props));
  const modelValue = useVModel(props, "modelValue", emits, {
    defaultValue: getDefaultValue(props),
    passive: props.modelValue === void 0,
    deep: true
  });
  function changeModelValue(value) {
    if (type.value === "single") modelValue.value = isEqual(value, modelValue.value) ? void 0 : value;
    else {
      const modelValueArray = Array.isArray(modelValue.value) ? [...modelValue.value || []] : [modelValue.value].filter(Boolean);
      if (isValueEqualOrExist(modelValueArray, value)) {
        const index = modelValueArray.findIndex((i) => isEqual(i, value));
        modelValueArray.splice(index, 1);
      } else modelValueArray.push(value);
      modelValue.value = modelValueArray;
    }
  }
  const isSingle = vueExports.computed(() => type.value === "single");
  return {
    modelValue,
    changeModelValue,
    isSingle
  };
}
const [injectAccordionRootContext, provideAccordionRootContext] = /* @__PURE__ */ createContext("AccordionRoot");
var AccordionRoot_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ vueExports.defineComponent({
  __name: "AccordionRoot",
  props: {
    collapsible: {
      type: Boolean,
      required: false,
      default: false
    },
    disabled: {
      type: Boolean,
      required: false,
      default: false
    },
    dir: {
      type: String,
      required: false
    },
    orientation: {
      type: String,
      required: false,
      default: "vertical"
    },
    unmountOnHide: {
      type: Boolean,
      required: false,
      default: true
    },
    asChild: {
      type: Boolean,
      required: false
    },
    as: {
      type: null,
      required: false
    },
    type: {
      type: String,
      required: false
    },
    modelValue: {
      type: null,
      required: false
    },
    defaultValue: {
      type: null,
      required: false
    }
  },
  emits: ["update:modelValue"],
  setup(__props, { emit: __emit }) {
    const props = __props;
    const emits = __emit;
    const { dir, disabled, unmountOnHide } = vueExports.toRefs(props);
    const direction = useDirection(dir);
    const { modelValue, changeModelValue, isSingle } = useSingleOrMultipleValue(props, emits);
    const { forwardRef, currentElement: parentElement } = useForwardExpose();
    provideAccordionRootContext({
      disabled,
      direction,
      orientation: props.orientation,
      parentElement,
      isSingle,
      collapsible: props.collapsible,
      modelValue,
      changeModelValue,
      unmountOnHide
    });
    return (_ctx, _cache) => {
      return vueExports.openBlock(), vueExports.createBlock(vueExports.unref(Primitive), {
        ref: vueExports.unref(forwardRef),
        "as-child": _ctx.asChild,
        as: _ctx.as
      }, {
        default: vueExports.withCtx(() => [vueExports.renderSlot(_ctx.$slots, "default", { modelValue: vueExports.unref(modelValue) })]),
        _: 3
      }, 8, ["as-child", "as"]);
    };
  }
});
var AccordionRoot_default = AccordionRoot_vue_vue_type_script_setup_true_lang_default;
var AccordionItemState = /* @__PURE__ */ (function(AccordionItemState$1) {
  AccordionItemState$1["Open"] = "open";
  AccordionItemState$1["Closed"] = "closed";
  return AccordionItemState$1;
})(AccordionItemState || {});
const [injectAccordionItemContext, provideAccordionItemContext] = /* @__PURE__ */ createContext("AccordionItem");
var AccordionItem_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ vueExports.defineComponent({
  __name: "AccordionItem",
  props: {
    disabled: {
      type: Boolean,
      required: false
    },
    value: {
      type: String,
      required: true
    },
    unmountOnHide: {
      type: Boolean,
      required: false,
      default: void 0
    },
    asChild: {
      type: Boolean,
      required: false
    },
    as: {
      type: null,
      required: false
    }
  },
  setup(__props, { expose: __expose }) {
    const props = __props;
    const rootContext = injectAccordionRootContext();
    const open = vueExports.computed(() => rootContext.isSingle.value ? props.value === rootContext.modelValue.value : Array.isArray(rootContext.modelValue.value) && rootContext.modelValue.value.includes(props.value));
    const disabled = vueExports.computed(() => {
      return rootContext.disabled.value || props.disabled;
    });
    const dataDisabled = vueExports.computed(() => disabled.value ? "" : void 0);
    const dataState = vueExports.computed(() => open.value ? AccordionItemState.Open : AccordionItemState.Closed);
    __expose({
      open,
      dataDisabled
    });
    const { currentRef, currentElement } = useForwardExpose();
    provideAccordionItemContext({
      open,
      dataState,
      disabled,
      dataDisabled,
      triggerId: "",
      currentRef,
      currentElement,
      value: vueExports.computed(() => props.value)
    });
    function handleArrowKey(e) {
      const target = e.target;
      const allCollectionItems = Array.from(rootContext.parentElement.value?.querySelectorAll("[data-reka-collection-item]") ?? []);
      const collectionItemIndex = allCollectionItems.findIndex((item) => item === target);
      if (collectionItemIndex === -1) return null;
      useArrowNavigation(e, target, rootContext.parentElement.value, {
        arrowKeyOptions: rootContext.orientation,
        dir: rootContext.direction.value,
        focus: true
      });
    }
    return (_ctx, _cache) => {
      return vueExports.openBlock(), vueExports.createBlock(vueExports.unref(CollapsibleRoot_default), {
        "data-orientation": vueExports.unref(rootContext).orientation,
        "data-disabled": dataDisabled.value,
        "data-state": dataState.value,
        disabled: disabled.value,
        open: open.value,
        as: props.as,
        "as-child": props.asChild,
        "unmount-on-hide": props.unmountOnHide ?? vueExports.unref(rootContext).unmountOnHide.value,
        onKeydown: vueExports.withKeys(handleArrowKey, [
          "up",
          "down",
          "left",
          "right",
          "home",
          "end"
        ])
      }, {
        default: vueExports.withCtx(() => [vueExports.renderSlot(_ctx.$slots, "default", { open: open.value })]),
        _: 3
      }, 8, [
        "data-orientation",
        "data-disabled",
        "data-state",
        "disabled",
        "open",
        "as",
        "as-child",
        "unmount-on-hide"
      ]);
    };
  }
});
var AccordionItem_default = AccordionItem_vue_vue_type_script_setup_true_lang_default;
var AccordionContent_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ vueExports.defineComponent({
  __name: "AccordionContent",
  props: {
    forceMount: {
      type: Boolean,
      required: false
    },
    asChild: {
      type: Boolean,
      required: false
    },
    as: {
      type: null,
      required: false
    }
  },
  setup(__props) {
    const props = __props;
    const rootContext = injectAccordionRootContext();
    const itemContext = injectAccordionItemContext();
    useForwardExpose();
    return (_ctx, _cache) => {
      return vueExports.openBlock(), vueExports.createBlock(vueExports.unref(CollapsibleContent_default), {
        role: "region",
        "as-child": props.asChild,
        as: _ctx.as,
        "force-mount": props.forceMount,
        "aria-labelledby": vueExports.unref(itemContext).triggerId,
        "data-state": vueExports.unref(itemContext).dataState.value,
        "data-disabled": vueExports.unref(itemContext).dataDisabled.value,
        "data-orientation": vueExports.unref(rootContext).orientation,
        style: {
          "--reka-accordion-content-width": "var(--reka-collapsible-content-width)",
          "--reka-accordion-content-height": "var(--reka-collapsible-content-height)"
        },
        onContentFound: _cache[0] || (_cache[0] = ($event) => vueExports.unref(rootContext).changeModelValue(vueExports.unref(itemContext).value.value))
      }, {
        default: vueExports.withCtx(() => [vueExports.renderSlot(_ctx.$slots, "default")]),
        _: 3
      }, 8, [
        "as-child",
        "as",
        "force-mount",
        "aria-labelledby",
        "data-state",
        "data-disabled",
        "data-orientation"
      ]);
    };
  }
});
var AccordionContent_default = AccordionContent_vue_vue_type_script_setup_true_lang_default;
var AccordionHeader_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ vueExports.defineComponent({
  __name: "AccordionHeader",
  props: {
    asChild: {
      type: Boolean,
      required: false
    },
    as: {
      type: null,
      required: false,
      default: "h3"
    }
  },
  setup(__props) {
    const props = __props;
    const rootContext = injectAccordionRootContext();
    const itemContext = injectAccordionItemContext();
    useForwardExpose();
    return (_ctx, _cache) => {
      return vueExports.openBlock(), vueExports.createBlock(vueExports.unref(Primitive), {
        as: props.as,
        "as-child": props.asChild,
        "data-orientation": vueExports.unref(rootContext).orientation,
        "data-state": vueExports.unref(itemContext).dataState.value,
        "data-disabled": vueExports.unref(itemContext).dataDisabled.value
      }, {
        default: vueExports.withCtx(() => [vueExports.renderSlot(_ctx.$slots, "default")]),
        _: 3
      }, 8, [
        "as",
        "as-child",
        "data-orientation",
        "data-state",
        "data-disabled"
      ]);
    };
  }
});
var AccordionHeader_default = AccordionHeader_vue_vue_type_script_setup_true_lang_default;
var AccordionTrigger_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ vueExports.defineComponent({
  __name: "AccordionTrigger",
  props: {
    asChild: {
      type: Boolean,
      required: false
    },
    as: {
      type: null,
      required: false
    }
  },
  setup(__props) {
    const props = __props;
    const rootContext = injectAccordionRootContext();
    const itemContext = injectAccordionItemContext();
    itemContext.triggerId ||= useId(void 0, "reka-accordion-trigger");
    function changeItem() {
      const triggerDisabled = rootContext.isSingle.value && itemContext.open.value && !rootContext.collapsible;
      if (itemContext.disabled.value || triggerDisabled) return;
      rootContext.changeModelValue(itemContext.value.value);
    }
    return (_ctx, _cache) => {
      return vueExports.openBlock(), vueExports.createBlock(vueExports.unref(CollapsibleTrigger_default), {
        id: vueExports.unref(itemContext).triggerId,
        ref: vueExports.unref(itemContext).currentRef,
        "data-reka-collection-item": "",
        as: props.as,
        "as-child": props.asChild,
        "aria-disabled": vueExports.unref(itemContext).disabled.value || void 0,
        "aria-expanded": vueExports.unref(itemContext).open.value || false,
        "data-disabled": vueExports.unref(itemContext).dataDisabled.value,
        "data-orientation": vueExports.unref(rootContext).orientation,
        "data-state": vueExports.unref(itemContext).dataState.value,
        disabled: vueExports.unref(itemContext).disabled.value,
        onClick: changeItem
      }, {
        default: vueExports.withCtx(() => [vueExports.renderSlot(_ctx.$slots, "default")]),
        _: 3
      }, 8, [
        "id",
        "as",
        "as-child",
        "aria-disabled",
        "aria-expanded",
        "data-disabled",
        "data-orientation",
        "data-state",
        "disabled"
      ]);
    };
  }
});
var AccordionTrigger_default = AccordionTrigger_vue_vue_type_script_setup_true_lang_default;
const ENTRY_FOCUS = "rovingFocusGroup.onEntryFocus";
const EVENT_OPTIONS = {
  bubbles: false,
  cancelable: true
};
const MAP_KEY_TO_FOCUS_INTENT = {
  ArrowLeft: "prev",
  ArrowUp: "prev",
  ArrowRight: "next",
  ArrowDown: "next",
  PageUp: "first",
  Home: "first",
  PageDown: "last",
  End: "last"
};
function getDirectionAwareKey(key, dir) {
  if (dir !== "rtl") return key;
  return key === "ArrowLeft" ? "ArrowRight" : key === "ArrowRight" ? "ArrowLeft" : key;
}
function getFocusIntent(event, orientation, dir) {
  const key = getDirectionAwareKey(event.key, dir);
  if (orientation === "vertical" && ["ArrowLeft", "ArrowRight"].includes(key)) return void 0;
  if (orientation === "horizontal" && ["ArrowUp", "ArrowDown"].includes(key)) return void 0;
  return MAP_KEY_TO_FOCUS_INTENT[key];
}
function focusFirst(candidates, preventScroll = false) {
  const PREVIOUSLY_FOCUSED_ELEMENT = getActiveElement();
  for (const candidate of candidates) {
    if (candidate === PREVIOUSLY_FOCUSED_ELEMENT) return;
    candidate.focus({ preventScroll });
    if (getActiveElement() !== PREVIOUSLY_FOCUSED_ELEMENT) return;
  }
}
function wrapArray(array, startIndex) {
  return array.map((_, index) => array[(startIndex + index) % array.length]);
}
const [injectRovingFocusGroupContext, provideRovingFocusGroupContext] = /* @__PURE__ */ createContext("RovingFocusGroup");
var RovingFocusGroup_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ vueExports.defineComponent({
  __name: "RovingFocusGroup",
  props: {
    orientation: {
      type: String,
      required: false,
      default: void 0
    },
    dir: {
      type: String,
      required: false
    },
    loop: {
      type: Boolean,
      required: false,
      default: false
    },
    currentTabStopId: {
      type: [String, null],
      required: false
    },
    defaultCurrentTabStopId: {
      type: String,
      required: false
    },
    preventScrollOnEntryFocus: {
      type: Boolean,
      required: false,
      default: false
    },
    asChild: {
      type: Boolean,
      required: false
    },
    as: {
      type: null,
      required: false
    }
  },
  emits: ["entryFocus", "update:currentTabStopId"],
  setup(__props, { expose: __expose, emit: __emit }) {
    const props = __props;
    const emits = __emit;
    const { loop, orientation, dir: propDir } = vueExports.toRefs(props);
    const dir = useDirection(propDir);
    const currentTabStopId = useVModel(props, "currentTabStopId", emits, {
      defaultValue: props.defaultCurrentTabStopId,
      passive: props.currentTabStopId === void 0
    });
    const isTabbingBackOut = vueExports.ref(false);
    const isClickFocus = vueExports.ref(false);
    const focusableItemsCount = vueExports.ref(0);
    const { getItems, CollectionSlot } = useCollection$1({ isProvider: true });
    function handleFocus(event) {
      const isKeyboardFocus = !isClickFocus.value;
      if (event.currentTarget && event.target === event.currentTarget && isKeyboardFocus && !isTabbingBackOut.value) {
        const entryFocusEvent = new CustomEvent(ENTRY_FOCUS, EVENT_OPTIONS);
        event.currentTarget.dispatchEvent(entryFocusEvent);
        emits("entryFocus", entryFocusEvent);
        if (!entryFocusEvent.defaultPrevented) {
          const items = getItems().map((i) => i.ref).filter((i) => i.dataset.disabled !== "");
          const activeItem = items.find((item) => item.getAttribute("data-active") === "");
          const highlightedItem = items.find((item) => item.getAttribute("data-highlighted") === "");
          const currentItem = items.find((item) => item.id === currentTabStopId.value);
          const candidateItems = [
            activeItem,
            highlightedItem,
            currentItem,
            ...items
          ].filter(Boolean);
          focusFirst(candidateItems, props.preventScrollOnEntryFocus);
        }
      }
      isClickFocus.value = false;
    }
    function handleMouseUp() {
      setTimeout(() => {
        isClickFocus.value = false;
      }, 1);
    }
    __expose({ getItems });
    provideRovingFocusGroupContext({
      loop,
      dir,
      orientation,
      currentTabStopId,
      onItemFocus: (tabStopId) => {
        currentTabStopId.value = tabStopId;
      },
      onItemShiftTab: () => {
        isTabbingBackOut.value = true;
      },
      onFocusableItemAdd: () => {
        focusableItemsCount.value++;
      },
      onFocusableItemRemove: () => {
        focusableItemsCount.value--;
      }
    });
    return (_ctx, _cache) => {
      return vueExports.openBlock(), vueExports.createBlock(vueExports.unref(CollectionSlot), null, {
        default: vueExports.withCtx(() => [vueExports.createVNode(vueExports.unref(Primitive), {
          tabindex: isTabbingBackOut.value || focusableItemsCount.value === 0 ? -1 : 0,
          "data-orientation": vueExports.unref(orientation),
          as: _ctx.as,
          "as-child": _ctx.asChild,
          dir: vueExports.unref(dir),
          style: { "outline": "none" },
          onMousedown: _cache[0] || (_cache[0] = ($event) => isClickFocus.value = true),
          onMouseup: handleMouseUp,
          onFocus: handleFocus,
          onBlur: _cache[1] || (_cache[1] = ($event) => isTabbingBackOut.value = false)
        }, {
          default: vueExports.withCtx(() => [vueExports.renderSlot(_ctx.$slots, "default")]),
          _: 3
        }, 8, [
          "tabindex",
          "data-orientation",
          "as",
          "as-child",
          "dir"
        ])]),
        _: 3
      });
    };
  }
});
var RovingFocusGroup_default = RovingFocusGroup_vue_vue_type_script_setup_true_lang_default;
var RovingFocusItem_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ vueExports.defineComponent({
  __name: "RovingFocusItem",
  props: {
    tabStopId: {
      type: String,
      required: false
    },
    focusable: {
      type: Boolean,
      required: false,
      default: true
    },
    active: {
      type: Boolean,
      required: false
    },
    allowShiftKey: {
      type: Boolean,
      required: false
    },
    asChild: {
      type: Boolean,
      required: false
    },
    as: {
      type: null,
      required: false,
      default: "span"
    }
  },
  setup(__props) {
    const props = __props;
    const context = injectRovingFocusGroupContext();
    const randomId = useId();
    const id = vueExports.computed(() => props.tabStopId || randomId);
    const isCurrentTabStop = vueExports.computed(() => context.currentTabStopId.value === id.value);
    const { getItems, CollectionItem } = useCollection$1();
    function handleKeydown(event) {
      if (event.key === "Tab" && event.shiftKey) {
        context.onItemShiftTab();
        return;
      }
      if (event.target !== event.currentTarget) return;
      const focusIntent = getFocusIntent(event, context.orientation.value, context.dir.value);
      if (focusIntent !== void 0) {
        if (event.metaKey || event.ctrlKey || event.altKey || (props.allowShiftKey ? false : event.shiftKey)) return;
        event.preventDefault();
        let candidateNodes = [...getItems().map((i) => i.ref).filter((i) => i.dataset.disabled !== "")];
        if (focusIntent === "last") candidateNodes.reverse();
        else if (focusIntent === "prev" || focusIntent === "next") {
          if (focusIntent === "prev") candidateNodes.reverse();
          const currentIndex = candidateNodes.indexOf(event.currentTarget);
          candidateNodes = context.loop.value ? wrapArray(candidateNodes, currentIndex + 1) : candidateNodes.slice(currentIndex + 1);
        }
        vueExports.nextTick(() => focusFirst(candidateNodes));
      }
    }
    return (_ctx, _cache) => {
      return vueExports.openBlock(), vueExports.createBlock(vueExports.unref(CollectionItem), null, {
        default: vueExports.withCtx(() => [vueExports.createVNode(vueExports.unref(Primitive), {
          tabindex: isCurrentTabStop.value ? 0 : -1,
          "data-orientation": vueExports.unref(context).orientation.value,
          "data-active": _ctx.active ? "" : void 0,
          "data-disabled": !_ctx.focusable ? "" : void 0,
          as: _ctx.as,
          "as-child": _ctx.asChild,
          onMousedown: _cache[0] || (_cache[0] = (event) => {
            if (!_ctx.focusable) event.preventDefault();
            else vueExports.unref(context).onItemFocus(id.value);
          }),
          onFocus: _cache[1] || (_cache[1] = ($event) => vueExports.unref(context).onItemFocus(id.value)),
          onKeydown: handleKeydown
        }, {
          default: vueExports.withCtx(() => [vueExports.renderSlot(_ctx.$slots, "default")]),
          _: 3
        }, 8, [
          "tabindex",
          "data-orientation",
          "data-active",
          "data-disabled",
          "as",
          "as-child"
        ])]),
        _: 3
      });
    };
  }
});
var RovingFocusItem_default = RovingFocusItem_vue_vue_type_script_setup_true_lang_default;
const [injectCheckboxGroupRootContext, provideCheckboxGroupRootContext] = /* @__PURE__ */ createContext("CheckboxGroupRoot");
var CheckboxGroupRoot_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ vueExports.defineComponent({
  __name: "CheckboxGroupRoot",
  props: {
    defaultValue: {
      type: Array,
      required: false
    },
    modelValue: {
      type: Array,
      required: false
    },
    rovingFocus: {
      type: Boolean,
      required: false,
      default: true
    },
    disabled: {
      type: Boolean,
      required: false
    },
    as: {
      type: null,
      required: false
    },
    asChild: {
      type: Boolean,
      required: false
    },
    dir: {
      type: String,
      required: false
    },
    orientation: {
      type: String,
      required: false
    },
    loop: {
      type: Boolean,
      required: false
    },
    name: {
      type: String,
      required: false
    },
    required: {
      type: Boolean,
      required: false
    }
  },
  emits: ["update:modelValue"],
  setup(__props, { emit: __emit }) {
    const props = __props;
    const emits = __emit;
    const { disabled, rovingFocus, dir: propDir } = vueExports.toRefs(props);
    const dir = useDirection(propDir);
    const { primitiveElement, currentElement } = usePrimitiveElement();
    const isFormControl = useFormControl(currentElement);
    const modelValue = useVModel(props, "modelValue", emits, {
      defaultValue: props.defaultValue ?? [],
      passive: props.modelValue === void 0
    });
    const rovingFocusProps = vueExports.computed(() => {
      return rovingFocus.value ? {
        loop: props.loop,
        dir: dir.value,
        orientation: props.orientation
      } : {};
    });
    provideCheckboxGroupRootContext({
      modelValue,
      rovingFocus,
      disabled
    });
    return (_ctx, _cache) => {
      return vueExports.openBlock(), vueExports.createBlock(vueExports.resolveDynamicComponent(vueExports.unref(rovingFocus) ? vueExports.unref(RovingFocusGroup_default) : vueExports.unref(Primitive)), vueExports.mergeProps({
        ref_key: "primitiveElement",
        ref: primitiveElement,
        as: _ctx.as,
        "as-child": _ctx.asChild
      }, rovingFocusProps.value), {
        default: vueExports.withCtx(() => [vueExports.renderSlot(_ctx.$slots, "default"), vueExports.unref(isFormControl) && _ctx.name ? (vueExports.openBlock(), vueExports.createBlock(vueExports.unref(VisuallyHiddenInput_default), {
          key: 0,
          name: _ctx.name,
          value: vueExports.unref(modelValue),
          required: _ctx.required
        }, null, 8, [
          "name",
          "value",
          "required"
        ])) : vueExports.createCommentVNode("v-if", true)]),
        _: 3
      }, 16, ["as", "as-child"]);
    };
  }
});
var CheckboxGroupRoot_default = CheckboxGroupRoot_vue_vue_type_script_setup_true_lang_default;
function isIndeterminate(checked) {
  return checked === "indeterminate";
}
function getState(checked) {
  return isIndeterminate(checked) ? "indeterminate" : checked ? "checked" : "unchecked";
}
const [injectCheckboxRootContext, provideCheckboxRootContext] = /* @__PURE__ */ createContext("CheckboxRoot");
var CheckboxRoot_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ vueExports.defineComponent({
  inheritAttrs: false,
  __name: "CheckboxRoot",
  props: {
    defaultValue: {
      type: null,
      required: false
    },
    modelValue: {
      type: null,
      required: false,
      default: void 0
    },
    disabled: {
      type: Boolean,
      required: false
    },
    value: {
      type: null,
      required: false,
      default: "on"
    },
    id: {
      type: String,
      required: false
    },
    trueValue: {
      type: null,
      required: false,
      default: () => true
    },
    falseValue: {
      type: null,
      required: false,
      default: () => false
    },
    asChild: {
      type: Boolean,
      required: false
    },
    as: {
      type: null,
      required: false,
      default: "button"
    },
    name: {
      type: String,
      required: false
    },
    required: {
      type: Boolean,
      required: false
    }
  },
  emits: ["update:modelValue"],
  setup(__props, { emit: __emit }) {
    const props = __props;
    const emits = __emit;
    const { forwardRef, currentElement } = useForwardExpose();
    const checkboxGroupContext = injectCheckboxGroupRootContext(null);
    const modelValue = useVModel(props, "modelValue", emits, {
      defaultValue: props.defaultValue ?? props.falseValue,
      passive: props.modelValue === void 0
    });
    const disabled = vueExports.computed(() => checkboxGroupContext?.disabled.value || props.disabled);
    const isChecked = vueExports.computed(() => isEqual(modelValue.value, props.trueValue));
    const checkboxState = vueExports.computed(() => {
      if (!isNullish(checkboxGroupContext?.modelValue.value)) return isValueEqualOrExist(checkboxGroupContext.modelValue.value, props.value);
      else {
        if (modelValue.value === "indeterminate") return "indeterminate";
        return isChecked.value;
      }
    });
    function handleClick() {
      if (!isNullish(checkboxGroupContext?.modelValue.value)) {
        const modelValueArray = [...checkboxGroupContext.modelValue.value || []];
        if (isValueEqualOrExist(modelValueArray, props.value)) {
          const index = modelValueArray.findIndex((i) => isEqual(i, props.value));
          modelValueArray.splice(index, 1);
        } else modelValueArray.push(props.value);
        checkboxGroupContext.modelValue.value = modelValueArray;
      } else if (modelValue.value === "indeterminate") modelValue.value = props.trueValue;
      else modelValue.value = isChecked.value ? props.falseValue : props.trueValue;
    }
    const isFormControl = useFormControl(currentElement);
    const ariaLabel = vueExports.computed(() => props.id && currentElement.value ? (void 0).querySelector(`[for="${props.id}"]`)?.innerText : void 0);
    provideCheckboxRootContext({
      disabled,
      state: checkboxState
    });
    return (_ctx, _cache) => {
      return vueExports.openBlock(), vueExports.createBlock(vueExports.resolveDynamicComponent(vueExports.unref(checkboxGroupContext)?.rovingFocus.value ? vueExports.unref(RovingFocusItem_default) : vueExports.unref(Primitive)), vueExports.mergeProps(_ctx.$attrs, {
        id: _ctx.id,
        ref: vueExports.unref(forwardRef),
        role: "checkbox",
        "as-child": _ctx.asChild,
        as: _ctx.as,
        type: _ctx.as === "button" ? "button" : void 0,
        "aria-checked": vueExports.unref(isIndeterminate)(checkboxState.value) ? "mixed" : checkboxState.value,
        "aria-required": _ctx.required,
        "aria-label": _ctx.$attrs["aria-label"] || ariaLabel.value,
        "data-state": vueExports.unref(getState)(checkboxState.value),
        "data-disabled": disabled.value ? "" : void 0,
        disabled: disabled.value,
        focusable: vueExports.unref(checkboxGroupContext)?.rovingFocus.value ? !disabled.value : void 0,
        onKeydown: vueExports.withKeys(vueExports.withModifiers(() => {
        }, ["prevent"]), ["enter"]),
        onClick: handleClick
      }), {
        default: vueExports.withCtx(() => [vueExports.renderSlot(_ctx.$slots, "default", {
          modelValue: vueExports.unref(modelValue),
          state: checkboxState.value
        }), vueExports.unref(isFormControl) && _ctx.name && !vueExports.unref(checkboxGroupContext) ? (vueExports.openBlock(), vueExports.createBlock(vueExports.unref(VisuallyHiddenInput_default), {
          key: 0,
          type: "checkbox",
          checked: !!checkboxState.value,
          name: _ctx.name,
          value: _ctx.value,
          disabled: disabled.value,
          required: _ctx.required
        }, null, 8, [
          "checked",
          "name",
          "value",
          "disabled",
          "required"
        ])) : vueExports.createCommentVNode("v-if", true)]),
        _: 3
      }, 16, [
        "id",
        "as-child",
        "as",
        "type",
        "aria-checked",
        "aria-required",
        "aria-label",
        "data-state",
        "data-disabled",
        "disabled",
        "focusable",
        "onKeydown"
      ]);
    };
  }
});
var CheckboxRoot_default = CheckboxRoot_vue_vue_type_script_setup_true_lang_default;
var CheckboxIndicator_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ vueExports.defineComponent({
  __name: "CheckboxIndicator",
  props: {
    forceMount: {
      type: Boolean,
      required: false
    },
    asChild: {
      type: Boolean,
      required: false
    },
    as: {
      type: null,
      required: false,
      default: "span"
    }
  },
  setup(__props) {
    const { forwardRef } = useForwardExpose();
    const rootContext = injectCheckboxRootContext();
    return (_ctx, _cache) => {
      return vueExports.openBlock(), vueExports.createBlock(vueExports.unref(Presence_default), { present: _ctx.forceMount || vueExports.unref(isIndeterminate)(vueExports.unref(rootContext).state.value) || vueExports.unref(rootContext).state.value === true }, {
        default: vueExports.withCtx(() => [vueExports.createVNode(vueExports.unref(Primitive), vueExports.mergeProps({
          ref: vueExports.unref(forwardRef),
          "data-state": vueExports.unref(getState)(vueExports.unref(rootContext).state.value),
          "data-disabled": vueExports.unref(rootContext).disabled.value ? "" : void 0,
          style: { pointerEvents: "none" },
          "as-child": _ctx.asChild,
          as: _ctx.as
        }, _ctx.$attrs), {
          default: vueExports.withCtx(() => [vueExports.renderSlot(_ctx.$slots, "default")]),
          _: 3
        }, 16, [
          "data-state",
          "data-disabled",
          "as-child",
          "as"
        ])]),
        _: 3
      }, 8, ["present"]);
    };
  }
});
var CheckboxIndicator_default = CheckboxIndicator_vue_vue_type_script_setup_true_lang_default;
const queryToFilters = (query) => {
  const filters = Object.entries(query).filter(([key]) => key.startsWith("filter."));
  return filters.reduce((filters2, [key, value]) => {
    const filterKey = key.split(".").at(-1) ?? key;
    if (Array.isArray(value)) {
      value.forEach((v) => filters2.push({
        [filterKey]: v === "true" || v === "false" ? JSON.parse(v) : v
      }));
    } else {
      filters2.push({
        [filterKey]: JSON.parse(String(value))
      });
    }
    return filters2;
  }, []);
};
const filtersToQuery = (filters) => {
  let query = {};
  filters.forEach((filter) => {
    const name = Object.keys(filter).at(0);
    if (filters.length === 0) {
      const { [`filter.${name}`]: _, ...restQuery } = query;
      query = restQuery;
    } else if (filters.length === 1) {
      query[`filter.${name}`] = JSON.stringify(filters[0]?.[name]);
    } else {
      query[`filter.${name}`] = filters.map((f) => String(f[name]));
    }
  });
  return query;
};
const debounce = (callback, wait) => {
  let timeoutId = null;
  return (...args) => {
    (void 0).clearTimeout(timeoutId);
    timeoutId = (void 0).setTimeout(() => {
      callback(...args);
    }, wait);
  };
};
const useFilters = (name) => {
  const router = useRouter();
  const route = useRoute$1();
  const filters = vueExports.computed(() => queryToFilters(route.query));
  const get2 = () => queryToFilters(route.query).filter((filter) => name ? !!filter[name] : true) ?? [];
  const set = debounce((value) => router.push({
    query: {
      ...route.query,
      ...name ? { [`filter.${name}`]: void 0 } : {},
      before: void 0,
      after: void 0,
      first: void 0,
      last: void 0,
      ...filtersToQuery(value)
    }
  }), 200);
  return { filters, get: get2, set };
};
const _sfc_main$7 = /* @__PURE__ */ vueExports.defineComponent({
  __name: "PriceRange",
  __ssrInlineRender: true,
  props: {
    filter: {}
  },
  setup(__props) {
    const props = __props;
    const { get: get2, set } = useFilters("price");
    const input = vueExports.computed(() => JSON.parse(props.filter.values.at(0)?.input ?? "{}")?.price);
    const componentToFilter = (value) => [{ price: value }];
    const filterToComponent = (filter) => filter.map((f) => f.price).filter((p) => p !== void 0).at(0) ?? input.value;
    const schema = z.object({
      min: z.number().min(0).optional(),
      max: z.number().min(1).optional()
    });
    const state = vueExports.reactive(filterToComponent(get2()) ?? {});
    const submit = async (value) => set(componentToFilter(value));
    return (_ctx, _push, _parent, _attrs) => {
      const _component_UForm = _sfc_main$2$1;
      const _component_UFormField = _sfc_main$1$2;
      const _component_UInputNumber = _sfc_main$b;
      _push(serverRenderer_cjs_prodExports.ssrRenderComponent(_component_UForm, vueExports.mergeProps({
        state: vueExports.unref(state),
        schema: vueExports.unref(schema),
        class: "flex flex-col gap-4"
      }, _attrs), {
        default: vueExports.withCtx((_, _push2, _parent2, _scopeId) => {
          if (_push2) {
            _push2(`<div class="flex flex-row gap-4"${_scopeId}>`);
            _push2(serverRenderer_cjs_prodExports.ssrRenderComponent(_component_UFormField, {
              name: "min",
              label: _ctx.$t("price.from")
            }, {
              default: vueExports.withCtx((_2, _push3, _parent3, _scopeId2) => {
                if (_push3) {
                  _push3(serverRenderer_cjs_prodExports.ssrRenderComponent(_component_UInputNumber, {
                    modelValue: vueExports.unref(state).min,
                    "onUpdate:modelValue": ($event) => vueExports.unref(state).min = $event,
                    class: "w-24",
                    min: 0,
                    max: vueExports.unref(state).max,
                    onChange: ($event) => submit(vueExports.unref(state))
                  }, null, _parent3, _scopeId2));
                } else {
                  return [
                    vueExports.createVNode(_component_UInputNumber, {
                      modelValue: vueExports.unref(state).min,
                      "onUpdate:modelValue": ($event) => vueExports.unref(state).min = $event,
                      class: "w-24",
                      min: 0,
                      max: vueExports.unref(state).max,
                      onChange: ($event) => submit(vueExports.unref(state))
                    }, null, 8, ["modelValue", "onUpdate:modelValue", "max", "onChange"])
                  ];
                }
              }),
              _: 1
            }, _parent2, _scopeId));
            _push2(serverRenderer_cjs_prodExports.ssrRenderComponent(_component_UFormField, {
              name: "max",
              label: _ctx.$t("price.to")
            }, {
              default: vueExports.withCtx((_2, _push3, _parent3, _scopeId2) => {
                if (_push3) {
                  _push3(serverRenderer_cjs_prodExports.ssrRenderComponent(_component_UInputNumber, {
                    modelValue: vueExports.unref(state).max,
                    "onUpdate:modelValue": ($event) => vueExports.unref(state).max = $event,
                    class: "w-24",
                    min: vueExports.unref(state).min,
                    onChange: ($event) => submit(vueExports.unref(state))
                  }, null, _parent3, _scopeId2));
                } else {
                  return [
                    vueExports.createVNode(_component_UInputNumber, {
                      modelValue: vueExports.unref(state).max,
                      "onUpdate:modelValue": ($event) => vueExports.unref(state).max = $event,
                      class: "w-24",
                      min: vueExports.unref(state).min,
                      onChange: ($event) => submit(vueExports.unref(state))
                    }, null, 8, ["modelValue", "onUpdate:modelValue", "min", "onChange"])
                  ];
                }
              }),
              _: 1
            }, _parent2, _scopeId));
            _push2(`</div>`);
          } else {
            return [
              vueExports.createVNode("div", { class: "flex flex-row gap-4" }, [
                vueExports.createVNode(_component_UFormField, {
                  name: "min",
                  label: _ctx.$t("price.from")
                }, {
                  default: vueExports.withCtx(() => [
                    vueExports.createVNode(_component_UInputNumber, {
                      modelValue: vueExports.unref(state).min,
                      "onUpdate:modelValue": ($event) => vueExports.unref(state).min = $event,
                      class: "w-24",
                      min: 0,
                      max: vueExports.unref(state).max,
                      onChange: ($event) => submit(vueExports.unref(state))
                    }, null, 8, ["modelValue", "onUpdate:modelValue", "max", "onChange"])
                  ]),
                  _: 1
                }, 8, ["label"]),
                vueExports.createVNode(_component_UFormField, {
                  name: "max",
                  label: _ctx.$t("price.to")
                }, {
                  default: vueExports.withCtx(() => [
                    vueExports.createVNode(_component_UInputNumber, {
                      modelValue: vueExports.unref(state).max,
                      "onUpdate:modelValue": ($event) => vueExports.unref(state).max = $event,
                      class: "w-24",
                      min: vueExports.unref(state).min,
                      onChange: ($event) => submit(vueExports.unref(state))
                    }, null, 8, ["modelValue", "onUpdate:modelValue", "min", "onChange"])
                  ]),
                  _: 1
                }, 8, ["label"])
              ])
            ];
          }
        }),
        _: 1
      }, _parent));
    };
  }
});
const _sfc_setup$7 = _sfc_main$7.setup;
_sfc_main$7.setup = (props, ctx) => {
  const ssrContext = vueExports.useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/filter/type/PriceRange.vue");
  return _sfc_setup$7 ? _sfc_setup$7(props, ctx) : void 0;
};
const __nuxt_component_0$1 = Object.assign(_sfc_main$7, { __name: "FilterTypePriceRange" });
const theme$2 = {
  "slots": {
    "root": "relative flex items-start",
    "container": "flex items-center",
    "base": "rounded-sm ring ring-inset ring-accented overflow-hidden focus-visible:outline-2 focus-visible:outline-offset-2",
    "indicator": "flex items-center justify-center size-full text-inverted",
    "icon": "shrink-0 size-full",
    "wrapper": "w-full",
    "label": "block font-medium text-default",
    "description": "text-muted"
  },
  "variants": {
    "color": {
      "primary": {
        "base": "focus-visible:outline-primary",
        "indicator": "bg-primary"
      },
      "secondary": {
        "base": "focus-visible:outline-secondary",
        "indicator": "bg-secondary"
      },
      "success": {
        "base": "focus-visible:outline-success",
        "indicator": "bg-success"
      },
      "info": {
        "base": "focus-visible:outline-info",
        "indicator": "bg-info"
      },
      "warning": {
        "base": "focus-visible:outline-warning",
        "indicator": "bg-warning"
      },
      "error": {
        "base": "focus-visible:outline-error",
        "indicator": "bg-error"
      },
      "neutral": {
        "base": "focus-visible:outline-inverted",
        "indicator": "bg-inverted"
      }
    },
    "variant": {
      "list": {
        "root": ""
      },
      "card": {
        "root": "border border-muted rounded-lg"
      }
    },
    "indicator": {
      "start": {
        "root": "flex-row",
        "wrapper": "ms-2"
      },
      "end": {
        "root": "flex-row-reverse",
        "wrapper": "me-2"
      },
      "hidden": {
        "base": "sr-only",
        "wrapper": "text-center"
      }
    },
    "size": {
      "xs": {
        "base": "size-3",
        "container": "h-4",
        "wrapper": "text-xs"
      },
      "sm": {
        "base": "size-3.5",
        "container": "h-4",
        "wrapper": "text-xs"
      },
      "md": {
        "base": "size-4",
        "container": "h-5",
        "wrapper": "text-sm"
      },
      "lg": {
        "base": "size-4.5",
        "container": "h-5",
        "wrapper": "text-sm"
      },
      "xl": {
        "base": "size-5",
        "container": "h-6",
        "wrapper": "text-base"
      }
    },
    "required": {
      "true": {
        "label": "after:content-['*'] after:ms-0.5 after:text-error"
      }
    },
    "disabled": {
      "true": {
        "root": "opacity-75",
        "base": "cursor-not-allowed",
        "label": "cursor-not-allowed",
        "description": "cursor-not-allowed"
      }
    },
    "highlight": {
      "true": ""
    },
    "checked": {
      "true": ""
    }
  },
  "compoundVariants": [
    {
      "size": "xs",
      "variant": "card",
      "class": {
        "root": "p-2.5"
      }
    },
    {
      "size": "sm",
      "variant": "card",
      "class": {
        "root": "p-3"
      }
    },
    {
      "size": "md",
      "variant": "card",
      "class": {
        "root": "p-3.5"
      }
    },
    {
      "size": "lg",
      "variant": "card",
      "class": {
        "root": "p-4"
      }
    },
    {
      "size": "xl",
      "variant": "card",
      "class": {
        "root": "p-4.5"
      }
    },
    {
      "color": "primary",
      "variant": "card",
      "class": {
        "root": "has-data-[state=checked]:border-primary"
      }
    },
    {
      "color": "secondary",
      "variant": "card",
      "class": {
        "root": "has-data-[state=checked]:border-secondary"
      }
    },
    {
      "color": "success",
      "variant": "card",
      "class": {
        "root": "has-data-[state=checked]:border-success"
      }
    },
    {
      "color": "info",
      "variant": "card",
      "class": {
        "root": "has-data-[state=checked]:border-info"
      }
    },
    {
      "color": "warning",
      "variant": "card",
      "class": {
        "root": "has-data-[state=checked]:border-warning"
      }
    },
    {
      "color": "error",
      "variant": "card",
      "class": {
        "root": "has-data-[state=checked]:border-error"
      }
    },
    {
      "color": "neutral",
      "variant": "card",
      "class": {
        "root": "has-data-[state=checked]:border-inverted"
      }
    },
    {
      "variant": "card",
      "disabled": true,
      "class": {
        "root": "cursor-not-allowed"
      }
    },
    {
      "color": "primary",
      "highlight": true,
      "class": {
        "base": "ring-primary"
      }
    },
    {
      "color": "secondary",
      "highlight": true,
      "class": {
        "base": "ring-secondary"
      }
    },
    {
      "color": "success",
      "highlight": true,
      "class": {
        "base": "ring-success"
      }
    },
    {
      "color": "info",
      "highlight": true,
      "class": {
        "base": "ring-info"
      }
    },
    {
      "color": "warning",
      "highlight": true,
      "class": {
        "base": "ring-warning"
      }
    },
    {
      "color": "error",
      "highlight": true,
      "class": {
        "base": "ring-error"
      }
    },
    {
      "color": "neutral",
      "highlight": true,
      "class": {
        "base": "ring-inverted"
      }
    }
  ],
  "defaultVariants": {
    "size": "md",
    "color": "primary",
    "variant": "list",
    "indicator": "start"
  }
};
const _sfc_main$6 = /* @__PURE__ */ Object.assign({ inheritAttrs: false }, {
  __name: "UCheckbox",
  __ssrInlineRender: true,
  props: {
    as: { type: null, required: false },
    label: { type: String, required: false },
    description: { type: String, required: false },
    color: { type: null, required: false },
    variant: { type: null, required: false },
    size: { type: null, required: false },
    indicator: { type: null, required: false },
    highlight: { type: Boolean, required: false },
    icon: { type: null, required: false },
    indeterminateIcon: { type: null, required: false },
    class: { type: null, required: false },
    ui: { type: Object, required: false },
    disabled: { type: Boolean, required: false },
    required: { type: Boolean, required: false },
    name: { type: String, required: false },
    value: { type: null, required: false },
    id: { type: String, required: false },
    defaultValue: { type: null, required: false },
    modelValue: { type: null, required: false },
    trueValue: { type: null, required: false },
    falseValue: { type: null, required: false }
  },
  emits: ["change", "update:modelValue"],
  setup(__props, { emit: __emit }) {
    const _props = __props;
    const slots = vueExports.useSlots();
    const emits = __emit;
    const props = useComponentProps("checkbox", _props);
    const appConfig = useAppConfig();
    const rootProps = useForwardProps(reactivePick(props, "required", "value", "defaultValue", "modelValue", "trueValue", "falseValue"), emits);
    const { id: _id, emitFormChange, emitFormInput, size, color, highlight, name, disabled, ariaAttrs } = useFormField(_props);
    const id = _id.value ?? vueExports.useId();
    const attrs = vueExports.useAttrs();
    const forwardedAttrs = vueExports.computed(() => {
      const { "data-state": _, ...rest } = attrs;
      return rest;
    });
    const ui = vueExports.computed(() => tv({ extend: tv(theme$2), ...appConfig.ui?.checkbox || {} })({
      size: size.value ?? props.size,
      color: color.value ?? props.color,
      variant: props.variant,
      indicator: props.indicator,
      highlight: highlight.value ?? props.highlight,
      required: props.required,
      disabled: disabled.value
    }));
    function onUpdate(value) {
      const event = new Event("change", { target: { value } });
      emits("change", event);
      emitFormChange();
      emitFormInput();
    }
    return (_ctx, _push, _parent, _attrs) => {
      _push(serverRenderer_cjs_prodExports.ssrRenderComponent(vueExports.unref(Primitive), vueExports.mergeProps({
        as: !vueExports.unref(props).variant || vueExports.unref(props).variant === "list" ? vueExports.unref(props).as : vueExports.unref(Label_default),
        "data-slot": "root",
        class: ui.value.root({ class: [vueExports.unref(props).ui?.root, vueExports.unref(props).class] })
      }, _attrs), {
        default: vueExports.withCtx((_, _push2, _parent2, _scopeId) => {
          if (_push2) {
            _push2(`<div data-slot="container" class="${serverRenderer_cjs_prodExports.ssrRenderClass(ui.value.container({ class: vueExports.unref(props).ui?.container }))}"${_scopeId}>`);
            _push2(serverRenderer_cjs_prodExports.ssrRenderComponent(vueExports.unref(CheckboxRoot_default), vueExports.mergeProps({ id: vueExports.unref(id) }, { ...vueExports.unref(rootProps), ...forwardedAttrs.value, ...vueExports.unref(ariaAttrs) }, {
              name: vueExports.unref(name),
              disabled: vueExports.unref(disabled),
              "data-slot": "base",
              class: ui.value.base({ class: vueExports.unref(props).ui?.base }),
              "onUpdate:modelValue": onUpdate
            }), {
              default: vueExports.withCtx(({ state }, _push3, _parent3, _scopeId2) => {
                if (_push3) {
                  _push3(serverRenderer_cjs_prodExports.ssrRenderComponent(vueExports.unref(CheckboxIndicator_default), {
                    "data-slot": "indicator",
                    class: ui.value.indicator({ class: vueExports.unref(props).ui?.indicator })
                  }, {
                    default: vueExports.withCtx((_2, _push4, _parent4, _scopeId3) => {
                      if (_push4) {
                        if (state === "indeterminate") {
                          _push4(serverRenderer_cjs_prodExports.ssrRenderComponent(_sfc_main$f, {
                            name: vueExports.unref(props).indeterminateIcon || vueExports.unref(appConfig).ui.icons.minus,
                            "data-slot": "icon",
                            class: ui.value.icon({ class: vueExports.unref(props).ui?.icon })
                          }, null, _parent4, _scopeId3));
                        } else {
                          _push4(serverRenderer_cjs_prodExports.ssrRenderComponent(_sfc_main$f, {
                            name: vueExports.unref(props).icon || vueExports.unref(appConfig).ui.icons.check,
                            "data-slot": "icon",
                            class: ui.value.icon({ class: vueExports.unref(props).ui?.icon })
                          }, null, _parent4, _scopeId3));
                        }
                      } else {
                        return [
                          state === "indeterminate" ? (vueExports.openBlock(), vueExports.createBlock(_sfc_main$f, {
                            key: 0,
                            name: vueExports.unref(props).indeterminateIcon || vueExports.unref(appConfig).ui.icons.minus,
                            "data-slot": "icon",
                            class: ui.value.icon({ class: vueExports.unref(props).ui?.icon })
                          }, null, 8, ["name", "class"])) : (vueExports.openBlock(), vueExports.createBlock(_sfc_main$f, {
                            key: 1,
                            name: vueExports.unref(props).icon || vueExports.unref(appConfig).ui.icons.check,
                            "data-slot": "icon",
                            class: ui.value.icon({ class: vueExports.unref(props).ui?.icon })
                          }, null, 8, ["name", "class"]))
                        ];
                      }
                    }),
                    _: 2
                  }, _parent3, _scopeId2));
                } else {
                  return [
                    vueExports.createVNode(vueExports.unref(CheckboxIndicator_default), {
                      "data-slot": "indicator",
                      class: ui.value.indicator({ class: vueExports.unref(props).ui?.indicator })
                    }, {
                      default: vueExports.withCtx(() => [
                        state === "indeterminate" ? (vueExports.openBlock(), vueExports.createBlock(_sfc_main$f, {
                          key: 0,
                          name: vueExports.unref(props).indeterminateIcon || vueExports.unref(appConfig).ui.icons.minus,
                          "data-slot": "icon",
                          class: ui.value.icon({ class: vueExports.unref(props).ui?.icon })
                        }, null, 8, ["name", "class"])) : (vueExports.openBlock(), vueExports.createBlock(_sfc_main$f, {
                          key: 1,
                          name: vueExports.unref(props).icon || vueExports.unref(appConfig).ui.icons.check,
                          "data-slot": "icon",
                          class: ui.value.icon({ class: vueExports.unref(props).ui?.icon })
                        }, null, 8, ["name", "class"]))
                      ]),
                      _: 2
                    }, 1032, ["class"])
                  ];
                }
              }),
              _: 1
            }, _parent2, _scopeId));
            _push2(`</div>`);
            if (vueExports.unref(props).label || !!slots.label || (vueExports.unref(props).description || !!slots.description)) {
              _push2(`<div data-slot="wrapper" class="${serverRenderer_cjs_prodExports.ssrRenderClass(ui.value.wrapper({ class: vueExports.unref(props).ui?.wrapper }))}"${_scopeId}>`);
              if (vueExports.unref(props).label || !!slots.label) {
                serverRenderer_cjs_prodExports.ssrRenderVNode(_push2, vueExports.createVNode(vueExports.resolveDynamicComponent(!vueExports.unref(props).variant || vueExports.unref(props).variant === "list" ? vueExports.unref(Label_default) : "p"), {
                  for: vueExports.unref(id),
                  "data-slot": "label",
                  class: ui.value.label({ class: vueExports.unref(props).ui?.label })
                }, {
                  default: vueExports.withCtx((_2, _push3, _parent3, _scopeId2) => {
                    if (_push3) {
                      serverRenderer_cjs_prodExports.ssrRenderSlot(_ctx.$slots, "label", {
                        label: vueExports.unref(props).label
                      }, () => {
                        _push3(`${serverRenderer_cjs_prodExports.ssrInterpolate(vueExports.unref(props).label)}`);
                      }, _push3, _parent3, _scopeId2);
                    } else {
                      return [
                        vueExports.renderSlot(_ctx.$slots, "label", {
                          label: vueExports.unref(props).label
                        }, () => [
                          vueExports.createTextVNode(vueExports.toDisplayString(vueExports.unref(props).label), 1)
                        ])
                      ];
                    }
                  }),
                  _: 3
                }), _parent2, _scopeId);
              } else {
                _push2(`<!---->`);
              }
              if (vueExports.unref(props).description || !!slots.description) {
                _push2(`<p data-slot="description" class="${serverRenderer_cjs_prodExports.ssrRenderClass(ui.value.description({ class: vueExports.unref(props).ui?.description }))}"${_scopeId}>`);
                serverRenderer_cjs_prodExports.ssrRenderSlot(_ctx.$slots, "description", {
                  description: vueExports.unref(props).description
                }, () => {
                  _push2(`${serverRenderer_cjs_prodExports.ssrInterpolate(vueExports.unref(props).description)}`);
                }, _push2, _parent2, _scopeId);
                _push2(`</p>`);
              } else {
                _push2(`<!---->`);
              }
              _push2(`</div>`);
            } else {
              _push2(`<!---->`);
            }
          } else {
            return [
              vueExports.createVNode("div", {
                "data-slot": "container",
                class: ui.value.container({ class: vueExports.unref(props).ui?.container })
              }, [
                vueExports.createVNode(vueExports.unref(CheckboxRoot_default), vueExports.mergeProps({ id: vueExports.unref(id) }, { ...vueExports.unref(rootProps), ...forwardedAttrs.value, ...vueExports.unref(ariaAttrs) }, {
                  name: vueExports.unref(name),
                  disabled: vueExports.unref(disabled),
                  "data-slot": "base",
                  class: ui.value.base({ class: vueExports.unref(props).ui?.base }),
                  "onUpdate:modelValue": onUpdate
                }), {
                  default: vueExports.withCtx(({ state }) => [
                    vueExports.createVNode(vueExports.unref(CheckboxIndicator_default), {
                      "data-slot": "indicator",
                      class: ui.value.indicator({ class: vueExports.unref(props).ui?.indicator })
                    }, {
                      default: vueExports.withCtx(() => [
                        state === "indeterminate" ? (vueExports.openBlock(), vueExports.createBlock(_sfc_main$f, {
                          key: 0,
                          name: vueExports.unref(props).indeterminateIcon || vueExports.unref(appConfig).ui.icons.minus,
                          "data-slot": "icon",
                          class: ui.value.icon({ class: vueExports.unref(props).ui?.icon })
                        }, null, 8, ["name", "class"])) : (vueExports.openBlock(), vueExports.createBlock(_sfc_main$f, {
                          key: 1,
                          name: vueExports.unref(props).icon || vueExports.unref(appConfig).ui.icons.check,
                          "data-slot": "icon",
                          class: ui.value.icon({ class: vueExports.unref(props).ui?.icon })
                        }, null, 8, ["name", "class"]))
                      ]),
                      _: 2
                    }, 1032, ["class"])
                  ]),
                  _: 1
                }, 16, ["id", "name", "disabled", "class"])
              ], 2),
              vueExports.unref(props).label || !!slots.label || (vueExports.unref(props).description || !!slots.description) ? (vueExports.openBlock(), vueExports.createBlock("div", {
                key: 0,
                "data-slot": "wrapper",
                class: ui.value.wrapper({ class: vueExports.unref(props).ui?.wrapper })
              }, [
                vueExports.unref(props).label || !!slots.label ? (vueExports.openBlock(), vueExports.createBlock(vueExports.resolveDynamicComponent(!vueExports.unref(props).variant || vueExports.unref(props).variant === "list" ? vueExports.unref(Label_default) : "p"), {
                  key: 0,
                  for: vueExports.unref(id),
                  "data-slot": "label",
                  class: ui.value.label({ class: vueExports.unref(props).ui?.label })
                }, {
                  default: vueExports.withCtx(() => [
                    vueExports.renderSlot(_ctx.$slots, "label", {
                      label: vueExports.unref(props).label
                    }, () => [
                      vueExports.createTextVNode(vueExports.toDisplayString(vueExports.unref(props).label), 1)
                    ])
                  ]),
                  _: 3
                }, 8, ["for", "class"])) : vueExports.createCommentVNode("", true),
                vueExports.unref(props).description || !!slots.description ? (vueExports.openBlock(), vueExports.createBlock("p", {
                  key: 1,
                  "data-slot": "description",
                  class: ui.value.description({ class: vueExports.unref(props).ui?.description })
                }, [
                  vueExports.renderSlot(_ctx.$slots, "description", {
                    description: vueExports.unref(props).description
                  }, () => [
                    vueExports.createTextVNode(vueExports.toDisplayString(vueExports.unref(props).description), 1)
                  ])
                ], 2)) : vueExports.createCommentVNode("", true)
              ], 2)) : vueExports.createCommentVNode("", true)
            ];
          }
        }),
        _: 3
      }, _parent));
    };
  }
});
const _sfc_setup$6 = _sfc_main$6.setup;
_sfc_main$6.setup = (props, ctx) => {
  const ssrContext = vueExports.useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("../node_modules/.pnpm/@nuxt+ui@4.8.0_@internationalized+date@3.12.1_@internationalized+number@3.6.6_@tiptap+e_d719e0a183cea98ed15f9fdb5506ba26/node_modules/@nuxt/ui/dist/runtime/components/Checkbox.vue");
  return _sfc_setup$6 ? _sfc_setup$6(props, ctx) : void 0;
};
const theme$1 = {
  "slots": {
    "root": "relative",
    "fieldset": "flex gap-x-2",
    "legend": "mb-1 block font-medium text-default",
    "item": ""
  },
  "variants": {
    "orientation": {
      "horizontal": {
        "fieldset": "flex-row"
      },
      "vertical": {
        "fieldset": "flex-col"
      }
    },
    "color": {
      "primary": {},
      "secondary": {},
      "success": {},
      "info": {},
      "warning": {},
      "error": {},
      "neutral": {}
    },
    "variant": {
      "list": {},
      "card": {},
      "table": {
        "item": "border border-muted"
      }
    },
    "size": {
      "xs": {
        "fieldset": "gap-y-0.5",
        "legend": "text-xs"
      },
      "sm": {
        "fieldset": "gap-y-0.5",
        "legend": "text-xs"
      },
      "md": {
        "fieldset": "gap-y-1",
        "legend": "text-sm"
      },
      "lg": {
        "fieldset": "gap-y-1",
        "legend": "text-sm"
      },
      "xl": {
        "fieldset": "gap-y-1.5",
        "legend": "text-base"
      }
    },
    "required": {
      "true": {
        "legend": "after:content-['*'] after:ms-0.5 after:text-error"
      }
    },
    "disabled": {
      "true": {}
    }
  },
  "compoundVariants": [
    {
      "size": "xs",
      "variant": "table",
      "class": {
        "item": "p-2.5"
      }
    },
    {
      "size": "sm",
      "variant": "table",
      "class": {
        "item": "p-3"
      }
    },
    {
      "size": "md",
      "variant": "table",
      "class": {
        "item": "p-3.5"
      }
    },
    {
      "size": "lg",
      "variant": "table",
      "class": {
        "item": "p-4"
      }
    },
    {
      "size": "xl",
      "variant": "table",
      "class": {
        "item": "p-4.5"
      }
    },
    {
      "orientation": "horizontal",
      "variant": "table",
      "class": {
        "item": "first-of-type:rounded-s-lg last-of-type:rounded-e-lg",
        "fieldset": "gap-0 -space-x-px"
      }
    },
    {
      "orientation": "vertical",
      "variant": "table",
      "class": {
        "item": "first-of-type:rounded-t-lg last-of-type:rounded-b-lg",
        "fieldset": "gap-0 -space-y-px"
      }
    },
    {
      "color": "primary",
      "variant": "table",
      "class": {
        "item": "has-data-[state=checked]:bg-primary/10 has-data-[state=checked]:border-primary/50 has-data-[state=checked]:z-[1]"
      }
    },
    {
      "color": "secondary",
      "variant": "table",
      "class": {
        "item": "has-data-[state=checked]:bg-secondary/10 has-data-[state=checked]:border-secondary/50 has-data-[state=checked]:z-[1]"
      }
    },
    {
      "color": "success",
      "variant": "table",
      "class": {
        "item": "has-data-[state=checked]:bg-success/10 has-data-[state=checked]:border-success/50 has-data-[state=checked]:z-[1]"
      }
    },
    {
      "color": "info",
      "variant": "table",
      "class": {
        "item": "has-data-[state=checked]:bg-info/10 has-data-[state=checked]:border-info/50 has-data-[state=checked]:z-[1]"
      }
    },
    {
      "color": "warning",
      "variant": "table",
      "class": {
        "item": "has-data-[state=checked]:bg-warning/10 has-data-[state=checked]:border-warning/50 has-data-[state=checked]:z-[1]"
      }
    },
    {
      "color": "error",
      "variant": "table",
      "class": {
        "item": "has-data-[state=checked]:bg-error/10 has-data-[state=checked]:border-error/50 has-data-[state=checked]:z-[1]"
      }
    },
    {
      "color": "neutral",
      "variant": "table",
      "class": {
        "item": "has-data-[state=checked]:bg-elevated has-data-[state=checked]:border-inverted/50 has-data-[state=checked]:z-[1]"
      }
    },
    {
      "variant": "table",
      "disabled": true,
      "class": {
        "item": "cursor-not-allowed"
      }
    }
  ],
  "defaultVariants": {
    "size": "md",
    "variant": "list",
    "color": "primary"
  }
};
const _sfc_main$5 = {
  __name: "UCheckboxGroup",
  __ssrInlineRender: true,
  props: {
    as: { type: null, required: false },
    legend: { type: String, required: false },
    valueKey: { type: null, required: false, default: "value" },
    labelKey: { type: null, required: false, default: "label" },
    descriptionKey: { type: null, required: false, default: "description" },
    items: { type: null, required: false },
    modelValue: { type: null, required: false },
    defaultValue: { type: null, required: false },
    size: { type: null, required: false },
    variant: { type: null, required: false },
    orientation: { type: null, required: false, default: "vertical" },
    class: { type: null, required: false },
    ui: { type: Object, required: false },
    disabled: { type: Boolean, required: false },
    loop: { type: Boolean, required: false },
    name: { type: String, required: false },
    required: { type: Boolean, required: false },
    color: { type: null, required: false },
    highlight: { type: Boolean, required: false },
    indicator: { type: null, required: false },
    icon: { type: null, required: false }
  },
  emits: ["change", "update:modelValue"],
  setup(__props, { emit: __emit }) {
    const _props = __props;
    const emits = __emit;
    const slots = vueExports.useSlots();
    const props = useComponentProps("checkboxGroup", _props);
    const appConfig = useAppConfig();
    const rootProps = useForwardProps(reactivePick(props, "as", "modelValue", "defaultValue", "orientation", "loop", "required"), emits);
    const checkboxProps = useForwardProps(reactivePick(props, "variant", "indicator", "icon"));
    const getProxySlots = () => omit(slots, ["legend"]);
    const { emitFormChange, emitFormInput, color, highlight, name, size, id: _id, disabled, ariaAttrs } = useFormField(_props, { bind: false });
    const id = _id.value ?? vueExports.useId();
    const ui = vueExports.computed(() => tv({ extend: theme$1, ...appConfig.ui?.checkboxGroup || {} })({
      size: size.value ?? props.size,
      required: props.required,
      orientation: props.orientation,
      color: color.value ?? props.color,
      variant: props.variant,
      disabled: disabled.value
    }));
    function normalizeItem(item) {
      if (item === null) {
        return {
          id: `${id}:null`,
          value: void 0,
          label: void 0
        };
      }
      if (typeof item === "string" || typeof item === "number") {
        return {
          id: `${id}:${item}`,
          value: String(item),
          label: String(item)
        };
      }
      const value = get(item, props.valueKey);
      const label = get(item, props.labelKey);
      const description = get(item, props.descriptionKey);
      return {
        ...item,
        value,
        label,
        description,
        id: `${id}:${value}`
      };
    }
    const normalizedItems = vueExports.computed(() => {
      if (!props.items) {
        return [];
      }
      return props.items.map(normalizeItem);
    });
    function onUpdate(value) {
      const event = new Event("change", { target: { value } });
      emits("change", event);
      emitFormChange();
      emitFormInput();
    }
    return (_ctx, _push, _parent, _attrs) => {
      _push(serverRenderer_cjs_prodExports.ssrRenderComponent(vueExports.unref(CheckboxGroupRoot_default), vueExports.mergeProps({ id: vueExports.unref(id) }, vueExports.unref(rootProps), {
        name: vueExports.unref(name),
        disabled: vueExports.unref(disabled),
        "data-slot": "root",
        class: ui.value.root({ class: [vueExports.unref(props).ui?.root, vueExports.unref(props).class] }),
        "onUpdate:modelValue": onUpdate
      }, _attrs), {
        default: vueExports.withCtx((_, _push2, _parent2, _scopeId) => {
          if (_push2) {
            _push2(`<fieldset${serverRenderer_cjs_prodExports.ssrRenderAttrs(vueExports.mergeProps({
              "data-slot": "fieldset",
              class: ui.value.fieldset({ class: vueExports.unref(props).ui?.fieldset })
            }, vueExports.unref(ariaAttrs)))}${_scopeId}>`);
            if (vueExports.unref(props).legend || !!slots.legend) {
              _push2(`<legend data-slot="legend" class="${serverRenderer_cjs_prodExports.ssrRenderClass(ui.value.legend({ class: vueExports.unref(props).ui?.legend }))}"${_scopeId}>`);
              serverRenderer_cjs_prodExports.ssrRenderSlot(_ctx.$slots, "legend", {}, () => {
                _push2(`${serverRenderer_cjs_prodExports.ssrInterpolate(vueExports.unref(props).legend)}`);
              }, _push2, _parent2, _scopeId);
              _push2(`</legend>`);
            } else {
              _push2(`<!---->`);
            }
            _push2(`<!--[-->`);
            serverRenderer_cjs_prodExports.ssrRenderList(normalizedItems.value, (item) => {
              _push2(serverRenderer_cjs_prodExports.ssrRenderComponent(_sfc_main$6, vueExports.mergeProps({
                key: item.value
              }, { ref_for: true }, { ...item, ...vueExports.unref(checkboxProps) }, {
                color: vueExports.unref(color),
                highlight: vueExports.unref(highlight),
                size: vueExports.unref(size),
                name: vueExports.unref(name),
                disabled: item.disabled || vueExports.unref(disabled),
                ui: { ...vueExports.unref(props).ui ? vueExports.unref(omit)(vueExports.unref(props).ui, ["root"]) : void 0, ...item.ui || {} },
                "data-slot": "item",
                class: ui.value.item({ class: [vueExports.unref(props).ui?.item, item.ui?.item, item.class], disabled: item.disabled || vueExports.unref(disabled) })
              }), vueExports.createSlots({ _: 2 }, [
                vueExports.renderList(getProxySlots(), (_2, name2) => {
                  return {
                    name: name2,
                    fn: vueExports.withCtx((_3, _push3, _parent3, _scopeId2) => {
                      if (_push3) {
                        serverRenderer_cjs_prodExports.ssrRenderSlot(_ctx.$slots, name2, { item }, null, _push3, _parent3, _scopeId2);
                      } else {
                        return [
                          vueExports.renderSlot(_ctx.$slots, name2, { item })
                        ];
                      }
                    })
                  };
                })
              ]), _parent2, _scopeId));
            });
            _push2(`<!--]--></fieldset>`);
          } else {
            return [
              vueExports.createVNode("fieldset", vueExports.mergeProps({
                "data-slot": "fieldset",
                class: ui.value.fieldset({ class: vueExports.unref(props).ui?.fieldset })
              }, vueExports.unref(ariaAttrs)), [
                vueExports.unref(props).legend || !!slots.legend ? (vueExports.openBlock(), vueExports.createBlock("legend", {
                  key: 0,
                  "data-slot": "legend",
                  class: ui.value.legend({ class: vueExports.unref(props).ui?.legend })
                }, [
                  vueExports.renderSlot(_ctx.$slots, "legend", {}, () => [
                    vueExports.createTextVNode(vueExports.toDisplayString(vueExports.unref(props).legend), 1)
                  ])
                ], 2)) : vueExports.createCommentVNode("", true),
                (vueExports.openBlock(true), vueExports.createBlock(vueExports.Fragment, null, vueExports.renderList(normalizedItems.value, (item) => {
                  return vueExports.openBlock(), vueExports.createBlock(_sfc_main$6, vueExports.mergeProps({
                    key: item.value
                  }, { ref_for: true }, { ...item, ...vueExports.unref(checkboxProps) }, {
                    color: vueExports.unref(color),
                    highlight: vueExports.unref(highlight),
                    size: vueExports.unref(size),
                    name: vueExports.unref(name),
                    disabled: item.disabled || vueExports.unref(disabled),
                    ui: { ...vueExports.unref(props).ui ? vueExports.unref(omit)(vueExports.unref(props).ui, ["root"]) : void 0, ...item.ui || {} },
                    "data-slot": "item",
                    class: ui.value.item({ class: [vueExports.unref(props).ui?.item, item.ui?.item, item.class], disabled: item.disabled || vueExports.unref(disabled) })
                  }), vueExports.createSlots({ _: 2 }, [
                    vueExports.renderList(getProxySlots(), (_2, name2) => {
                      return {
                        name: name2,
                        fn: vueExports.withCtx(() => [
                          vueExports.renderSlot(_ctx.$slots, name2, { item })
                        ])
                      };
                    })
                  ]), 1040, ["color", "highlight", "size", "name", "disabled", "ui", "class"]);
                }), 128))
              ], 16)
            ];
          }
        }),
        _: 3
      }, _parent));
    };
  }
};
const _sfc_setup$5 = _sfc_main$5.setup;
_sfc_main$5.setup = (props, ctx) => {
  const ssrContext = vueExports.useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("../node_modules/.pnpm/@nuxt+ui@4.8.0_@internationalized+date@3.12.1_@internationalized+number@3.6.6_@tiptap+e_d719e0a183cea98ed15f9fdb5506ba26/node_modules/@nuxt/ui/dist/runtime/components/CheckboxGroup.vue");
  return _sfc_setup$5 ? _sfc_setup$5(props, ctx) : void 0;
};
const _sfc_main$4 = /* @__PURE__ */ vueExports.defineComponent({
  __name: "List",
  __ssrInlineRender: true,
  props: {
    filter: {}
  },
  setup(__props) {
    const props = __props;
    const key = vueExports.computed(() => Object.keys(JSON.parse(props.filter.values.at(0)?.input ?? "{}")).at(0));
    const items = vueExports.computed(() => props.filter.values.map((v) => v.label));
    const { get: get2, set } = useFilters(key.value);
    const componentToFilter = (value2) => props.filter.values.filter((v) => value2.includes(v.label)).map((v) => JSON.parse(v.input));
    const filterToComponent = (filter) => filter.map((f) => props.filter.values.find((v) => v.input === JSON.stringify(f))?.label).filter((v) => v !== void 0);
    const value = vueExports.ref(filterToComponent(get2()));
    const submit = async (value2) => set(componentToFilter(value2));
    return (_ctx, _push, _parent, _attrs) => {
      const _component_UCheckboxGroup = _sfc_main$5;
      _push(serverRenderer_cjs_prodExports.ssrRenderComponent(_component_UCheckboxGroup, vueExports.mergeProps({
        modelValue: vueExports.unref(value),
        "onUpdate:modelValue": [($event) => vueExports.isRef(value) ? value.value = $event : null, (value2) => submit(value2)],
        items: vueExports.unref(items)
      }, _attrs), null, _parent));
    };
  }
});
const _sfc_setup$4 = _sfc_main$4.setup;
_sfc_main$4.setup = (props, ctx) => {
  const ssrContext = vueExports.useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/filter/type/List.vue");
  return _sfc_setup$4 ? _sfc_setup$4(props, ctx) : void 0;
};
const __nuxt_component_1 = Object.assign(_sfc_main$4, { __name: "FilterTypeList" });
const theme = {
  "slots": {
    "root": "w-full",
    "item": "border-b border-default last:border-b-0",
    "header": "flex",
    "trigger": "group flex-1 flex items-center gap-1.5 font-medium text-sm py-3.5 focus-visible:outline-primary min-w-0",
    "content": "data-[state=open]:animate-[accordion-down_200ms_ease-out] data-[state=closed]:animate-[accordion-up_200ms_ease-out] overflow-hidden focus:outline-none",
    "body": "text-sm pb-3.5",
    "leadingIcon": "shrink-0 size-5",
    "trailingIcon": "shrink-0 size-5 ms-auto group-data-[state=open]:rotate-180 transition-transform duration-200",
    "label": "text-start break-words"
  },
  "variants": {
    "disabled": {
      "true": {
        "trigger": "cursor-not-allowed opacity-75"
      }
    }
  }
};
const _sfc_main$3 = {
  __name: "UAccordion",
  __ssrInlineRender: true,
  props: {
    as: { type: null, required: false },
    items: { type: Array, required: false },
    trailingIcon: { type: null, required: false },
    valueKey: { type: null, required: false, default: "value" },
    labelKey: { type: null, required: false, default: "label" },
    class: { type: null, required: false },
    ui: { type: Object, required: false },
    collapsible: { type: Boolean, required: false, default: true },
    defaultValue: { type: null, required: false },
    modelValue: { type: null, required: false },
    type: { type: String, required: false, default: "single" },
    disabled: { type: Boolean, required: false },
    unmountOnHide: { type: Boolean, required: false, default: true }
  },
  emits: ["update:modelValue"],
  setup(__props, { emit: __emit }) {
    const _props = __props;
    const emits = __emit;
    const slots = vueExports.useSlots();
    const props = useComponentProps("accordion", _props);
    const appConfig = useAppConfig();
    const rootProps = useForwardProps(reactivePick(props, "as", "collapsible", "defaultValue", "disabled", "modelValue", "unmountOnHide"), emits);
    const ui = vueExports.computed(() => tv({ extend: tv(theme), ...appConfig.ui?.accordion || {} })({
      disabled: props.disabled
    }));
    return (_ctx, _push, _parent, _attrs) => {
      _push(serverRenderer_cjs_prodExports.ssrRenderComponent(vueExports.unref(AccordionRoot_default), vueExports.mergeProps(vueExports.unref(rootProps), {
        type: vueExports.unref(props).type,
        "data-slot": "root",
        class: ui.value.root({ class: [vueExports.unref(props).ui?.root, vueExports.unref(props).class] })
      }, _attrs), {
        default: vueExports.withCtx((_, _push2, _parent2, _scopeId) => {
          if (_push2) {
            _push2(`<!--[-->`);
            serverRenderer_cjs_prodExports.ssrRenderList(vueExports.unref(props).items, (item, index) => {
              _push2(serverRenderer_cjs_prodExports.ssrRenderComponent(vueExports.unref(AccordionItem_default), {
                key: vueExports.unref(get)(item, vueExports.unref(props).valueKey) ?? index,
                value: vueExports.unref(get)(item, vueExports.unref(props).valueKey) ?? String(index),
                disabled: item.disabled,
                "data-slot": "item",
                class: ui.value.item({ class: [vueExports.unref(props).ui?.item, item.ui?.item, item.class] })
              }, {
                default: vueExports.withCtx(({ open }, _push3, _parent3, _scopeId2) => {
                  if (_push3) {
                    _push3(serverRenderer_cjs_prodExports.ssrRenderComponent(vueExports.unref(AccordionHeader_default), {
                      as: "div",
                      "data-slot": "header",
                      class: ui.value.header({ class: [vueExports.unref(props).ui?.header, item.ui?.header] })
                    }, {
                      default: vueExports.withCtx((_2, _push4, _parent4, _scopeId3) => {
                        if (_push4) {
                          _push4(serverRenderer_cjs_prodExports.ssrRenderComponent(vueExports.unref(AccordionTrigger_default), {
                            "data-slot": "trigger",
                            class: ui.value.trigger({ class: [vueExports.unref(props).ui?.trigger, item.ui?.trigger], disabled: item.disabled })
                          }, {
                            default: vueExports.withCtx((_3, _push5, _parent5, _scopeId4) => {
                              if (_push5) {
                                serverRenderer_cjs_prodExports.ssrRenderSlot(_ctx.$slots, "leading", {
                                  item,
                                  index,
                                  open,
                                  ui: ui.value
                                }, () => {
                                  if (item.icon) {
                                    _push5(serverRenderer_cjs_prodExports.ssrRenderComponent(_sfc_main$f, {
                                      name: item.icon,
                                      "data-slot": "leadingIcon",
                                      class: ui.value.leadingIcon({ class: [vueExports.unref(props).ui?.leadingIcon, item?.ui?.leadingIcon] })
                                    }, null, _parent5, _scopeId4));
                                  } else {
                                    _push5(`<!---->`);
                                  }
                                }, _push5, _parent5, _scopeId4);
                                if (vueExports.unref(get)(item, vueExports.unref(props).labelKey) || !!slots.default) {
                                  _push5(`<span data-slot="label" class="${serverRenderer_cjs_prodExports.ssrRenderClass(ui.value.label({ class: [vueExports.unref(props).ui?.label, item.ui?.label] }))}"${_scopeId4}>`);
                                  serverRenderer_cjs_prodExports.ssrRenderSlot(_ctx.$slots, "default", {
                                    item,
                                    index,
                                    open
                                  }, () => {
                                    _push5(`${serverRenderer_cjs_prodExports.ssrInterpolate(vueExports.unref(get)(item, vueExports.unref(props).labelKey))}`);
                                  }, _push5, _parent5, _scopeId4);
                                  _push5(`</span>`);
                                } else {
                                  _push5(`<!---->`);
                                }
                                serverRenderer_cjs_prodExports.ssrRenderSlot(_ctx.$slots, "trailing", {
                                  item,
                                  index,
                                  open,
                                  ui: ui.value
                                }, () => {
                                  _push5(serverRenderer_cjs_prodExports.ssrRenderComponent(_sfc_main$f, {
                                    name: item.trailingIcon || vueExports.unref(props).trailingIcon || vueExports.unref(appConfig).ui.icons.chevronDown,
                                    "data-slot": "trailingIcon",
                                    class: ui.value.trailingIcon({ class: [vueExports.unref(props).ui?.trailingIcon, item.ui?.trailingIcon] })
                                  }, null, _parent5, _scopeId4));
                                }, _push5, _parent5, _scopeId4);
                              } else {
                                return [
                                  vueExports.renderSlot(_ctx.$slots, "leading", {
                                    item,
                                    index,
                                    open,
                                    ui: ui.value
                                  }, () => [
                                    item.icon ? (vueExports.openBlock(), vueExports.createBlock(_sfc_main$f, {
                                      key: 0,
                                      name: item.icon,
                                      "data-slot": "leadingIcon",
                                      class: ui.value.leadingIcon({ class: [vueExports.unref(props).ui?.leadingIcon, item?.ui?.leadingIcon] })
                                    }, null, 8, ["name", "class"])) : vueExports.createCommentVNode("", true)
                                  ]),
                                  vueExports.unref(get)(item, vueExports.unref(props).labelKey) || !!slots.default ? (vueExports.openBlock(), vueExports.createBlock("span", {
                                    key: 0,
                                    "data-slot": "label",
                                    class: ui.value.label({ class: [vueExports.unref(props).ui?.label, item.ui?.label] })
                                  }, [
                                    vueExports.renderSlot(_ctx.$slots, "default", {
                                      item,
                                      index,
                                      open
                                    }, () => [
                                      vueExports.createTextVNode(vueExports.toDisplayString(vueExports.unref(get)(item, vueExports.unref(props).labelKey)), 1)
                                    ])
                                  ], 2)) : vueExports.createCommentVNode("", true),
                                  vueExports.renderSlot(_ctx.$slots, "trailing", {
                                    item,
                                    index,
                                    open,
                                    ui: ui.value
                                  }, () => [
                                    vueExports.createVNode(_sfc_main$f, {
                                      name: item.trailingIcon || vueExports.unref(props).trailingIcon || vueExports.unref(appConfig).ui.icons.chevronDown,
                                      "data-slot": "trailingIcon",
                                      class: ui.value.trailingIcon({ class: [vueExports.unref(props).ui?.trailingIcon, item.ui?.trailingIcon] })
                                    }, null, 8, ["name", "class"])
                                  ])
                                ];
                              }
                            }),
                            _: 2
                          }, _parent4, _scopeId3));
                        } else {
                          return [
                            vueExports.createVNode(vueExports.unref(AccordionTrigger_default), {
                              "data-slot": "trigger",
                              class: ui.value.trigger({ class: [vueExports.unref(props).ui?.trigger, item.ui?.trigger], disabled: item.disabled })
                            }, {
                              default: vueExports.withCtx(() => [
                                vueExports.renderSlot(_ctx.$slots, "leading", {
                                  item,
                                  index,
                                  open,
                                  ui: ui.value
                                }, () => [
                                  item.icon ? (vueExports.openBlock(), vueExports.createBlock(_sfc_main$f, {
                                    key: 0,
                                    name: item.icon,
                                    "data-slot": "leadingIcon",
                                    class: ui.value.leadingIcon({ class: [vueExports.unref(props).ui?.leadingIcon, item?.ui?.leadingIcon] })
                                  }, null, 8, ["name", "class"])) : vueExports.createCommentVNode("", true)
                                ]),
                                vueExports.unref(get)(item, vueExports.unref(props).labelKey) || !!slots.default ? (vueExports.openBlock(), vueExports.createBlock("span", {
                                  key: 0,
                                  "data-slot": "label",
                                  class: ui.value.label({ class: [vueExports.unref(props).ui?.label, item.ui?.label] })
                                }, [
                                  vueExports.renderSlot(_ctx.$slots, "default", {
                                    item,
                                    index,
                                    open
                                  }, () => [
                                    vueExports.createTextVNode(vueExports.toDisplayString(vueExports.unref(get)(item, vueExports.unref(props).labelKey)), 1)
                                  ])
                                ], 2)) : vueExports.createCommentVNode("", true),
                                vueExports.renderSlot(_ctx.$slots, "trailing", {
                                  item,
                                  index,
                                  open,
                                  ui: ui.value
                                }, () => [
                                  vueExports.createVNode(_sfc_main$f, {
                                    name: item.trailingIcon || vueExports.unref(props).trailingIcon || vueExports.unref(appConfig).ui.icons.chevronDown,
                                    "data-slot": "trailingIcon",
                                    class: ui.value.trailingIcon({ class: [vueExports.unref(props).ui?.trailingIcon, item.ui?.trailingIcon] })
                                  }, null, 8, ["name", "class"])
                                ])
                              ]),
                              _: 2
                            }, 1032, ["class"])
                          ];
                        }
                      }),
                      _: 2
                    }, _parent3, _scopeId2));
                    if (item.content || !!slots.content || item.slot && !!slots[item.slot] || !!slots.body || item.slot && !!slots[`${item.slot}-body`]) {
                      _push3(serverRenderer_cjs_prodExports.ssrRenderComponent(vueExports.unref(AccordionContent_default), {
                        "data-slot": "content",
                        class: ui.value.content({ class: [vueExports.unref(props).ui?.content, item.ui?.content] })
                      }, {
                        default: vueExports.withCtx((_2, _push4, _parent4, _scopeId3) => {
                          if (_push4) {
                            serverRenderer_cjs_prodExports.ssrRenderSlot(_ctx.$slots, item.slot || "content", {
                              item,
                              index,
                              open,
                              ui: ui.value
                            }, () => {
                              _push4(`<div data-slot="body" class="${serverRenderer_cjs_prodExports.ssrRenderClass(ui.value.body({ class: [vueExports.unref(props).ui?.body, item.ui?.body] }))}"${_scopeId3}>`);
                              serverRenderer_cjs_prodExports.ssrRenderSlot(_ctx.$slots, item.slot ? `${item.slot}-body` : "body", {
                                item,
                                index,
                                open,
                                ui: ui.value
                              }, () => {
                                _push4(`${serverRenderer_cjs_prodExports.ssrInterpolate(item.content)}`);
                              }, _push4, _parent4, _scopeId3);
                              _push4(`</div>`);
                            }, _push4, _parent4, _scopeId3);
                          } else {
                            return [
                              vueExports.renderSlot(_ctx.$slots, item.slot || "content", {
                                item,
                                index,
                                open,
                                ui: ui.value
                              }, () => [
                                vueExports.createVNode("div", {
                                  "data-slot": "body",
                                  class: ui.value.body({ class: [vueExports.unref(props).ui?.body, item.ui?.body] })
                                }, [
                                  vueExports.renderSlot(_ctx.$slots, item.slot ? `${item.slot}-body` : "body", {
                                    item,
                                    index,
                                    open,
                                    ui: ui.value
                                  }, () => [
                                    vueExports.createTextVNode(vueExports.toDisplayString(item.content), 1)
                                  ])
                                ], 2)
                              ])
                            ];
                          }
                        }),
                        _: 2
                      }, _parent3, _scopeId2));
                    } else {
                      _push3(`<!---->`);
                    }
                  } else {
                    return [
                      vueExports.createVNode(vueExports.unref(AccordionHeader_default), {
                        as: "div",
                        "data-slot": "header",
                        class: ui.value.header({ class: [vueExports.unref(props).ui?.header, item.ui?.header] })
                      }, {
                        default: vueExports.withCtx(() => [
                          vueExports.createVNode(vueExports.unref(AccordionTrigger_default), {
                            "data-slot": "trigger",
                            class: ui.value.trigger({ class: [vueExports.unref(props).ui?.trigger, item.ui?.trigger], disabled: item.disabled })
                          }, {
                            default: vueExports.withCtx(() => [
                              vueExports.renderSlot(_ctx.$slots, "leading", {
                                item,
                                index,
                                open,
                                ui: ui.value
                              }, () => [
                                item.icon ? (vueExports.openBlock(), vueExports.createBlock(_sfc_main$f, {
                                  key: 0,
                                  name: item.icon,
                                  "data-slot": "leadingIcon",
                                  class: ui.value.leadingIcon({ class: [vueExports.unref(props).ui?.leadingIcon, item?.ui?.leadingIcon] })
                                }, null, 8, ["name", "class"])) : vueExports.createCommentVNode("", true)
                              ]),
                              vueExports.unref(get)(item, vueExports.unref(props).labelKey) || !!slots.default ? (vueExports.openBlock(), vueExports.createBlock("span", {
                                key: 0,
                                "data-slot": "label",
                                class: ui.value.label({ class: [vueExports.unref(props).ui?.label, item.ui?.label] })
                              }, [
                                vueExports.renderSlot(_ctx.$slots, "default", {
                                  item,
                                  index,
                                  open
                                }, () => [
                                  vueExports.createTextVNode(vueExports.toDisplayString(vueExports.unref(get)(item, vueExports.unref(props).labelKey)), 1)
                                ])
                              ], 2)) : vueExports.createCommentVNode("", true),
                              vueExports.renderSlot(_ctx.$slots, "trailing", {
                                item,
                                index,
                                open,
                                ui: ui.value
                              }, () => [
                                vueExports.createVNode(_sfc_main$f, {
                                  name: item.trailingIcon || vueExports.unref(props).trailingIcon || vueExports.unref(appConfig).ui.icons.chevronDown,
                                  "data-slot": "trailingIcon",
                                  class: ui.value.trailingIcon({ class: [vueExports.unref(props).ui?.trailingIcon, item.ui?.trailingIcon] })
                                }, null, 8, ["name", "class"])
                              ])
                            ]),
                            _: 2
                          }, 1032, ["class"])
                        ]),
                        _: 2
                      }, 1032, ["class"]),
                      item.content || !!slots.content || item.slot && !!slots[item.slot] || !!slots.body || item.slot && !!slots[`${item.slot}-body`] ? (vueExports.openBlock(), vueExports.createBlock(vueExports.unref(AccordionContent_default), {
                        key: 0,
                        "data-slot": "content",
                        class: ui.value.content({ class: [vueExports.unref(props).ui?.content, item.ui?.content] })
                      }, {
                        default: vueExports.withCtx(() => [
                          vueExports.renderSlot(_ctx.$slots, item.slot || "content", {
                            item,
                            index,
                            open,
                            ui: ui.value
                          }, () => [
                            vueExports.createVNode("div", {
                              "data-slot": "body",
                              class: ui.value.body({ class: [vueExports.unref(props).ui?.body, item.ui?.body] })
                            }, [
                              vueExports.renderSlot(_ctx.$slots, item.slot ? `${item.slot}-body` : "body", {
                                item,
                                index,
                                open,
                                ui: ui.value
                              }, () => [
                                vueExports.createTextVNode(vueExports.toDisplayString(item.content), 1)
                              ])
                            ], 2)
                          ])
                        ]),
                        _: 2
                      }, 1032, ["class"])) : vueExports.createCommentVNode("", true)
                    ];
                  }
                }),
                _: 2
              }, _parent2, _scopeId));
            });
            _push2(`<!--]-->`);
          } else {
            return [
              (vueExports.openBlock(true), vueExports.createBlock(vueExports.Fragment, null, vueExports.renderList(vueExports.unref(props).items, (item, index) => {
                return vueExports.openBlock(), vueExports.createBlock(vueExports.unref(AccordionItem_default), {
                  key: vueExports.unref(get)(item, vueExports.unref(props).valueKey) ?? index,
                  value: vueExports.unref(get)(item, vueExports.unref(props).valueKey) ?? String(index),
                  disabled: item.disabled,
                  "data-slot": "item",
                  class: ui.value.item({ class: [vueExports.unref(props).ui?.item, item.ui?.item, item.class] })
                }, {
                  default: vueExports.withCtx(({ open }) => [
                    vueExports.createVNode(vueExports.unref(AccordionHeader_default), {
                      as: "div",
                      "data-slot": "header",
                      class: ui.value.header({ class: [vueExports.unref(props).ui?.header, item.ui?.header] })
                    }, {
                      default: vueExports.withCtx(() => [
                        vueExports.createVNode(vueExports.unref(AccordionTrigger_default), {
                          "data-slot": "trigger",
                          class: ui.value.trigger({ class: [vueExports.unref(props).ui?.trigger, item.ui?.trigger], disabled: item.disabled })
                        }, {
                          default: vueExports.withCtx(() => [
                            vueExports.renderSlot(_ctx.$slots, "leading", {
                              item,
                              index,
                              open,
                              ui: ui.value
                            }, () => [
                              item.icon ? (vueExports.openBlock(), vueExports.createBlock(_sfc_main$f, {
                                key: 0,
                                name: item.icon,
                                "data-slot": "leadingIcon",
                                class: ui.value.leadingIcon({ class: [vueExports.unref(props).ui?.leadingIcon, item?.ui?.leadingIcon] })
                              }, null, 8, ["name", "class"])) : vueExports.createCommentVNode("", true)
                            ]),
                            vueExports.unref(get)(item, vueExports.unref(props).labelKey) || !!slots.default ? (vueExports.openBlock(), vueExports.createBlock("span", {
                              key: 0,
                              "data-slot": "label",
                              class: ui.value.label({ class: [vueExports.unref(props).ui?.label, item.ui?.label] })
                            }, [
                              vueExports.renderSlot(_ctx.$slots, "default", {
                                item,
                                index,
                                open
                              }, () => [
                                vueExports.createTextVNode(vueExports.toDisplayString(vueExports.unref(get)(item, vueExports.unref(props).labelKey)), 1)
                              ])
                            ], 2)) : vueExports.createCommentVNode("", true),
                            vueExports.renderSlot(_ctx.$slots, "trailing", {
                              item,
                              index,
                              open,
                              ui: ui.value
                            }, () => [
                              vueExports.createVNode(_sfc_main$f, {
                                name: item.trailingIcon || vueExports.unref(props).trailingIcon || vueExports.unref(appConfig).ui.icons.chevronDown,
                                "data-slot": "trailingIcon",
                                class: ui.value.trailingIcon({ class: [vueExports.unref(props).ui?.trailingIcon, item.ui?.trailingIcon] })
                              }, null, 8, ["name", "class"])
                            ])
                          ]),
                          _: 2
                        }, 1032, ["class"])
                      ]),
                      _: 2
                    }, 1032, ["class"]),
                    item.content || !!slots.content || item.slot && !!slots[item.slot] || !!slots.body || item.slot && !!slots[`${item.slot}-body`] ? (vueExports.openBlock(), vueExports.createBlock(vueExports.unref(AccordionContent_default), {
                      key: 0,
                      "data-slot": "content",
                      class: ui.value.content({ class: [vueExports.unref(props).ui?.content, item.ui?.content] })
                    }, {
                      default: vueExports.withCtx(() => [
                        vueExports.renderSlot(_ctx.$slots, item.slot || "content", {
                          item,
                          index,
                          open,
                          ui: ui.value
                        }, () => [
                          vueExports.createVNode("div", {
                            "data-slot": "body",
                            class: ui.value.body({ class: [vueExports.unref(props).ui?.body, item.ui?.body] })
                          }, [
                            vueExports.renderSlot(_ctx.$slots, item.slot ? `${item.slot}-body` : "body", {
                              item,
                              index,
                              open,
                              ui: ui.value
                            }, () => [
                              vueExports.createTextVNode(vueExports.toDisplayString(item.content), 1)
                            ])
                          ], 2)
                        ])
                      ]),
                      _: 2
                    }, 1032, ["class"])) : vueExports.createCommentVNode("", true)
                  ]),
                  _: 2
                }, 1032, ["value", "disabled", "class"]);
              }), 128))
            ];
          }
        }),
        _: 3
      }, _parent));
    };
  }
};
const _sfc_setup$3 = _sfc_main$3.setup;
_sfc_main$3.setup = (props, ctx) => {
  const ssrContext = vueExports.useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("../node_modules/.pnpm/@nuxt+ui@4.8.0_@internationalized+date@3.12.1_@internationalized+number@3.6.6_@tiptap+e_d719e0a183cea98ed15f9fdb5506ba26/node_modules/@nuxt/ui/dist/runtime/components/Accordion.vue");
  return _sfc_setup$3 ? _sfc_setup$3(props, ctx) : void 0;
};
const _sfc_main$2 = /* @__PURE__ */ vueExports.defineComponent({
  __name: "Group",
  __ssrInlineRender: true,
  props: {
    filters: {}
  },
  setup(__props, { expose: __expose }) {
    const props = __props;
    __expose({
      reset: () => resetFilters()
    });
    const router = useRouter();
    const route = useRoute$1();
    const filters = vueExports.computed(() => props.filters?.map((filter) => {
      const filterItem = {
        label: filter.label,
        props: {
          filter
        }
      };
      switch (filter.type) {
        case "PRICE_RANGE":
          return {
            component: __nuxt_component_0$1,
            ...filterItem
          };
        case "LIST":
          return {
            component: __nuxt_component_1,
            ...filterItem
          };
      }
    })?.filter((f) => f !== void 0));
    const quantity = vueExports.computed(() => Object.keys(route.query).filter((p) => p.includes("filter")).length);
    const filtersKey = vueExports.ref(vueExports.useId());
    const resetFilters = async () => {
      await router.push({ query: {} });
    };
    vueExports.watch(() => route.query, (value) => Object.keys(value).length === 0 ? filtersKey.value += 1 : null, { deep: true });
    return (_ctx, _push, _parent, _attrs) => {
      const _component_UButton = _sfc_main$9;
      const _component_UBadge = _sfc_main$a;
      const _component_UAccordion = _sfc_main$3;
      _push(`<div${serverRenderer_cjs_prodExports.ssrRenderAttrs(vueExports.mergeProps({ class: "lg:mt-14 lg:me-16" }, _attrs))}><div class="lg:sticky lg:top-24"><div class="flex justify-between items-center mb-4"><p class="leading-8 text-xl font-bold">${serverRenderer_cjs_prodExports.ssrInterpolate(_ctx.$t("filters.title"))}</p>`);
      if (vueExports.unref(quantity)) {
        _push(`<div class="relative">`);
        _push(serverRenderer_cjs_prodExports.ssrRenderComponent(_component_UButton, {
          variant: "ghost",
          color: "primary",
          class: "ms-4",
          label: _ctx.$t("filters.clear"),
          onClick: resetFilters
        }, null, _parent));
        _push(serverRenderer_cjs_prodExports.ssrRenderComponent(_component_UBadge, {
          class: "absolute font-bold rounded-full -top-1.5 -right-2 px-1.5 font-mono lg:text-xs lg:-right-3 lg:-top-2",
          size: "xs"
        }, {
          default: vueExports.withCtx((_, _push2, _parent2, _scopeId) => {
            if (_push2) {
              _push2(`${serverRenderer_cjs_prodExports.ssrInterpolate(vueExports.unref(quantity))}`);
            } else {
              return [
                vueExports.createTextVNode(vueExports.toDisplayString(vueExports.unref(quantity)), 1)
              ];
            }
          }),
          _: 1
        }, _parent));
        _push(`</div>`);
      } else {
        _push(`<!---->`);
      }
      _push(`</div>`);
      _push(serverRenderer_cjs_prodExports.ssrRenderComponent(_component_UAccordion, {
        key: vueExports.unref(filtersKey),
        items: vueExports.unref(filters),
        type: "multiple"
      }, {
        body: vueExports.withCtx(({ item }, _push2, _parent2, _scopeId) => {
          if (_push2) {
            serverRenderer_cjs_prodExports.ssrRenderVNode(_push2, vueExports.createVNode(vueExports.resolveDynamicComponent(item.component), item.props, null), _parent2, _scopeId);
          } else {
            return [
              (vueExports.openBlock(), vueExports.createBlock(vueExports.resolveDynamicComponent(item.component), item.props, null, 16))
            ];
          }
        }),
        _: 1
      }, _parent));
      _push(`</div></div>`);
    };
  }
});
const _sfc_setup$2 = _sfc_main$2.setup;
_sfc_main$2.setup = (props, ctx) => {
  const ssrContext = vueExports.useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/filter/Group.vue");
  return _sfc_setup$2 ? _sfc_setup$2(props, ctx) : void 0;
};
const __nuxt_component_0 = Object.assign(_sfc_main$2, { __name: "FilterGroup" });
const useCollection = () => {
  const { shopify: { collection: { perPage } } } = useAppConfig();
  const { country, language } = useLocalization();
  const { filters } = useFilters();
  const route = useRoute$1();
  const before = vueExports.computed(() => route.query.before ? String(route.query.before) : void 0);
  const after = vueExports.computed(() => route.query.after ? String(route.query.after) : void 0);
  const first = vueExports.computed(() => route.query.last ? void 0 : Number(route.query.first ?? perPage));
  const last = vueExports.computed(() => route.query.last ? Number(route.query.last ?? perPage) : void 0);
  const sortKey = vueExports.computed(() => route.query.sortKey ? String(route.query.sortKey) : void 0);
  const reverse = vueExports.computed(() => route.query.reverse ? Boolean(route.query.reverse) : void 0);
  const params = vueExports.computed(() => ({
    before: before.value,
    after: after.value,
    first: first.value,
    last: last.value,
    sortKey: sortKey.value,
    reverse: reverse.value,
    filters: filters.value,
    language: language.value,
    country: country.value
  }));
  return {
    params,
    before,
    after,
    first,
    last,
    sortKey,
    reverse,
    filters
  };
};
const COLLECTION_FRAGMENT = `#graphql
    fragment CollectionFields on Collection {
        title
        handle
        description
        image {
            ...ImageFields
        }
        seo {
            description
            title
        }
    }
`;
const productFilterSchema = z.object({
  available: z.boolean().optional(),
  category: categoryFilterSchema.optional(),
  price: priceRangeFilterSchema.optional(),
  productMetafield: metafieldFilterSchema.optional(),
  productType: z.string().optional(),
  productVendor: z.string().optional(),
  tag: z.string().optional(),
  taxonomyMetafield: taxonomyMetafieldFilterSchema.optional(),
  variantMetafield: metafieldFilterSchema.optional(),
  variantOption: variantOptionFilterSchema.optional()
}).array();
const productSortKeysSchema = z.enum([
  "BEST_SELLING",
  "COLLECTION_DEFAULT",
  "CREATED",
  "ID",
  "MANUAL",
  "PRICE",
  "RELEVANCE",
  "TITLE",
  "UPDATED_AT"
]);
connectionParamsSchema.extend({
  sortKey: productSortKeysSchema.optional(),
  reverse: z.boolean().optional(),
  filters: z.array(productFilterSchema).optional()
});
z.object({
  handle: z.string(),
  selectedOptions: z.array(z.object({
    name: z.string(),
    value: z.string()
  })).optional()
}).extend(localizationParamsSchema.shape);
const collectionInputSchema = z.object({
  handle: z.string(),
  filters: productFilterSchema.optional()
}).extend(connectionParamsSchema.shape).extend(localizationParamsSchema.shape);
const _sfc_main$1 = /* @__PURE__ */ vueExports.defineComponent({
  __name: "Products",
  __ssrInlineRender: true,
  props: {
    handle: {}
  },
  async setup(__props) {
    let __temp, __restore;
    const props = __props;
    const { shopify: { shopName } } = useAppConfig();
    const { params } = useCollection();
    const { locale } = useI18n();
    const router = useRouter();
    const route = useRoute$1();
    const key = vueExports.computed(() => `collection-${locale.value}-${props.handle}-products`);
    const { data: collection, status } = ([__temp, __restore] = vueExports.withAsyncContext(() => useStorefrontData(key, `#graphql
    query FetchCollectionProducts(
        $handle: String,
        $after: String,
        $before: String,
        $first: Int,
        $last: Int,
        $sortKey: ProductCollectionSortKeys,
        $reverse: Boolean,
        $filters: [ProductFilter!],
        $language: LanguageCode,
        $country: CountryCode
    )
    @inContext(language: $language, country: $country) {
        collection(handle: $handle) {
            ...CollectionFields

            products(
                after: $after,
                before: $before,
                first: $first,
                last: $last,
                reverse: $reverse,
                sortKey: $sortKey,
                filters: $filters
            ) {
                ...ProductConnectionFields
                ...ProductFilterFields
            }
        }
    }
    ${PRODUCT_CONNECTION_FRAGMENT}
    ${PRODUCT_FILTERS_FRAGMENT}
    ${COLLECTION_FRAGMENT}
    ${IMAGE_FRAGMENT}
    ${PRICE_FRAGMENT}
`, {
      variables: vueExports.computed(() => collectionInputSchema.parse({
        handle: props.handle,
        ...params.value
      })),
      transform: (data) => data?.collection,
      watch: [params],
      cache: "long"
    })), __temp = await __temp, __restore(), __temp);
    useSeoMeta({
      title: `${collection.value?.title} | ${shopName}`,
      description: collection.value?.description
    });
    const filters = vueExports.computed(() => collection.value?.products.filters);
    const pageInfo = vueExports.computed(() => collection.value?.products.pageInfo);
    const products = vueExports.computed(() => flattenConnection(collection.value?.products));
    const loadPrevious = async () => {
      route.query.after = null;
      route.query.before = pageInfo.value?.startCursor ?? null;
      await router.push({ query: {
        ...route.query,
        before: pageInfo.value?.startCursor,
        after: void 0,
        first: void 0,
        last: 12
      } });
    };
    const loadNext = async () => {
      await router.push({ query: {
        ...route.query,
        before: void 0,
        after: pageInfo.value?.endCursor,
        first: 12,
        last: void 0
      } });
    };
    vueExports.watch(locale, () => {
      route.query.first = null;
      route.query.last = null;
    });
    vueExports.watch(() => collection.value?.products.pageInfo, async () => await vueExports.nextTick().then(() => (void 0).scrollTo({ top: 0, behavior: "smooth" })), { deep: true });
    return (_ctx, _push, _parent, _attrs) => {
      const _component_FilterGroup = __nuxt_component_0;
      const _component_UButton = _sfc_main$9;
      const _component_ProductCard = __nuxt_component_0$2;
      const _component_UIcon = _sfc_main$f;
      _push(`<div${serverRenderer_cjs_prodExports.ssrRenderAttrs(vueExports.mergeProps({ class: "w-full lg:grid lg:grid-cols-12" }, _attrs))}>`);
      if (vueExports.unref(filters)?.length) {
        _push(serverRenderer_cjs_prodExports.ssrRenderComponent(_component_FilterGroup, {
          filters: vueExports.unref(filters),
          class: "lg:col-span-4 xl:col-span-3"
        }, null, _parent));
      } else {
        _push(`<!---->`);
      }
      _push(`<div class="my-12 lg:my-14 lg:col-span-8 xl:col-span-9">`);
      if (vueExports.unref(pageInfo)?.hasPreviousPage) {
        _push(`<div class="flex w-full justify-center pb-8 md:mb-8">`);
        _push(serverRenderer_cjs_prodExports.ssrRenderComponent(_component_UButton, {
          variant: "soft",
          color: "primary",
          class: "cursor-pointer",
          icon: "i-lucide-arrow-up",
          onClick: loadPrevious
        }, {
          default: vueExports.withCtx((_, _push2, _parent2, _scopeId) => {
            if (_push2) {
              _push2(`${serverRenderer_cjs_prodExports.ssrInterpolate(_ctx.$t("pagination.previous"))}`);
            } else {
              return [
                vueExports.createTextVNode(vueExports.toDisplayString(_ctx.$t("pagination.previous")), 1)
              ];
            }
          }),
          _: 1
        }, _parent));
        _push(`</div>`);
      } else {
        _push(`<!---->`);
      }
      _push(`<div class="grid w-full grid-cols-1 gap-16 md:grid-cols-2 xl:grid-cols-3"><!--[-->`);
      serverRenderer_cjs_prodExports.ssrRenderList(vueExports.unref(products), (product, index) => {
        _push(serverRenderer_cjs_prodExports.ssrRenderComponent(_component_ProductCard, {
          key: product.id,
          product,
          class: "pb-14 border-b border-b-default",
          loading: index < 3 ? "eager" : "lazy",
          carousel: ""
        }, null, _parent));
      });
      _push(`<!--]--></div>`);
      if (vueExports.unref(pageInfo)?.hasNextPage) {
        _push(`<div class="flex w-full justify-center mt-14">`);
        _push(serverRenderer_cjs_prodExports.ssrRenderComponent(_component_UButton, {
          variant: "soft",
          color: "primary",
          class: "cursor-pointer",
          icon: "i-lucide-arrow-down",
          onClick: loadNext
        }, {
          default: vueExports.withCtx((_, _push2, _parent2, _scopeId) => {
            if (_push2) {
              _push2(`${serverRenderer_cjs_prodExports.ssrInterpolate(_ctx.$t("pagination.next"))}`);
            } else {
              return [
                vueExports.createTextVNode(vueExports.toDisplayString(_ctx.$t("pagination.next")), 1)
              ];
            }
          }),
          _: 1
        }, _parent));
        _push(`</div>`);
      } else {
        _push(`<!---->`);
      }
      if (vueExports.unref(status) === "pending") {
        _push(`<div class="flex justify-center pt-8">${serverRenderer_cjs_prodExports.ssrInterpolate(_ctx.$t("collection.products.loading"))}</div>`);
      } else if (!vueExports.unref(products) || vueExports.unref(products).length === 0) {
        _push(`<div class="flex flex-col justify-center items-center col-span-full text-center"><div class="flex items-center pb-2 gap-2">`);
        _push(serverRenderer_cjs_prodExports.ssrRenderComponent(_component_UIcon, {
          name: "i-lucide-triangle-alert",
          class: "text-dimmed size-6"
        }, null, _parent));
        _push(`<p class="text-xl text-dimmed">${serverRenderer_cjs_prodExports.ssrInterpolate(_ctx.$t("collection.products.notFound"))}</p></div>`);
        _push(serverRenderer_cjs_prodExports.ssrRenderComponent(_component_UButton, {
          variant: "subtle",
          color: "primary",
          class: "mt-4",
          label: _ctx.$t("filters.clear"),
          onClick: ($event) => vueExports.unref(router).push({ query: {} })
        }, null, _parent));
        _push(`</div>`);
      } else {
        _push(`<!---->`);
      }
      _push(`</div></div>`);
    };
  }
});
const _sfc_setup$1 = _sfc_main$1.setup;
_sfc_main$1.setup = (props, ctx) => {
  const ssrContext = vueExports.useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/collection/Products.vue");
  return _sfc_setup$1 ? _sfc_setup$1(props, ctx) : void 0;
};
const __nuxt_component_2 = Object.assign(_sfc_main$1, { __name: "CollectionProducts" });
const _sfc_main = /* @__PURE__ */ vueExports.defineComponent({
  __name: "[handle]",
  __ssrInlineRender: true,
  async setup(__props) {
    let __temp, __restore;
    const { t: $t } = useI18n();
    const { shopify: { shopName } } = useAppConfig();
    const localePath = useLocalePath();
    const { locale } = useI18n();
    const route = useRoute$1();
    const handle = vueExports.computed(() => route.params.handle);
    const key = vueExports.computed(() => `collection-${locale.value}-${handle.value}`);
    const { data: collection, error } = ([__temp, __restore] = vueExports.withAsyncContext(() => useStorefrontData(key, `#graphql
    query FetchCollection(
        $handle: String,
        $language: LanguageCode,
        $country: CountryCode
    )
    @inContext(language: $language, country: $country) {
        collection(handle: $handle) {
            ...CollectionFields
        }
    }
    ${COLLECTION_FRAGMENT}
    ${IMAGE_FRAGMENT}
`, {
      variables: vueExports.computed(() => collectionInputSchema.parse({
        handle: handle.value
      })),
      transform: (data) => data?.collection,
      cache: "long"
    })), __temp = await __temp, __restore(), __temp);
    if (!collection.value || error.value) {
      throw createError({
        status: 404,
        statusText: `${$t("error.notFound")}: ${route.fullPath}`,
        message: error.value?.message || $t("error.collection"),
        fatal: true
      });
    }
    useSeoMeta({
      title: `${collection.value?.title} | ${shopName}`,
      description: collection.value?.description ?? $t("seo.description")
    });
    return (_ctx, _push, _parent, _attrs) => {
      const _component_UContainer = _sfc_main$1$1;
      const _component_UBreadcrumb = _sfc_main$8;
      const _component_CollectionProducts = __nuxt_component_2;
      _push(serverRenderer_cjs_prodExports.ssrRenderComponent(_component_UContainer, vueExports.mergeProps({ class: "py-6 lg:py-8" }, _attrs), {
        default: vueExports.withCtx((_, _push2, _parent2, _scopeId) => {
          if (_push2) {
            _push2(serverRenderer_cjs_prodExports.ssrRenderComponent(_component_UBreadcrumb, {
              items: [
                { label: "Collections" },
                { label: vueExports.unref(collection)?.title, to: vueExports.unref(localePath)(`/collection/${vueExports.unref(handle)}`) }
              ],
              class: "mb-6 lg:mb-8"
            }, null, _parent2, _scopeId));
            _push2(`<h1 class="text-4xl lg:text-5xl text-gray-900 font-extrabold mb-6 lg:mb-8"${_scopeId}>${serverRenderer_cjs_prodExports.ssrInterpolate(vueExports.unref(collection)?.title)}</h1><p class="lg:text-lg max-w-md mb-8 lg:mb-10"${_scopeId}>${serverRenderer_cjs_prodExports.ssrInterpolate(vueExports.unref(collection)?.description)}</p>`);
            _push2(serverRenderer_cjs_prodExports.ssrRenderComponent(_component_CollectionProducts, { handle: vueExports.unref(handle) }, null, _parent2, _scopeId));
          } else {
            return [
              vueExports.createVNode(_component_UBreadcrumb, {
                items: [
                  { label: "Collections" },
                  { label: vueExports.unref(collection)?.title, to: vueExports.unref(localePath)(`/collection/${vueExports.unref(handle)}`) }
                ],
                class: "mb-6 lg:mb-8"
              }, null, 8, ["items"]),
              vueExports.createVNode("h1", { class: "text-4xl lg:text-5xl text-gray-900 font-extrabold mb-6 lg:mb-8" }, vueExports.toDisplayString(vueExports.unref(collection)?.title), 1),
              vueExports.createVNode("p", { class: "lg:text-lg max-w-md mb-8 lg:mb-10" }, vueExports.toDisplayString(vueExports.unref(collection)?.description), 1),
              vueExports.createVNode(_component_CollectionProducts, { handle: vueExports.unref(handle) }, null, 8, ["handle"])
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
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/collection/[handle].vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};

export { _sfc_main as default };
//# sourceMappingURL=_handle_-DIfp9K1F.mjs.map
