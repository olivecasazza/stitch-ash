import { r as createContext, ax as vueExports, ak as useI18n, a2 as serverRenderer_cjs_prodExports, a9 as useCart, am as useLocalePath, _ as __nuxt_component_0$1, g as __nuxt_component_2$1$1, m as _sfc_main$9$1, aq as useRoute$1, h as __nuxt_component_3, f as __nuxt_component_1$1, ac as useComponentProps, a7 as useAppConfig, a5 as tv, e as Primitive, al as useLocale, aj as useForwardProps, a1 as reactivePick, ao as usePortal, F as FieldGroupReset, V as VisuallyHidden_default, au as useVModel, ai as useForwardExpose, T as Teleport_default, d as Presence_default, ad as useEmitAsProps, a4 as tryOnBeforeUnmount, a6 as unrefElement, v as createSharedComposable, Q as injectConfigProviderContext, L as getActiveElement, A as AUTOFOCUS_ON_MOUNT, y as focusFirst, N as getTabbableCandidates, x as focus, a as AUTOFOCUS_ON_UNMOUNT, Y as onKeyStroke, S as isNullish, E as EVENT_OPTIONS, O as getTabbableEdges, u as createGlobalState } from './server.mjs';
import { b as _sfc_main$2$1, a as _sfc_main$1$1, _ as _sfc_main$9, c as useId } from './InputNumber-vHSIttX4.mjs';
import { z } from 'zod';
import { _ as _export_sfc } from './_plugin-vue_export-helper-1tPrXgE0.mjs';
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

const useBodyLockStackCount = createSharedComposable(() => {
  const map = vueExports.ref(/* @__PURE__ */ new Map());
  vueExports.ref();
  const locked = vueExports.computed(() => {
    for (const value of map.value.values()) if (value) return true;
    return false;
  });
  injectConfigProviderContext({ scrollBody: vueExports.ref(true) });
  vueExports.watch(locked, (val, oldVal) => {
    return;
  }, {
    immediate: true,
    flush: "sync"
  });
  return map;
});
function useBodyScrollLock(initialState) {
  const id = Math.random().toString(36).substring(2, 7);
  const map = useBodyLockStackCount();
  map.value.set(id, initialState);
  const locked = vueExports.computed({
    get: () => map.value.get(id) ?? false,
    set: (value) => map.value.set(id, value)
  });
  tryOnBeforeUnmount();
  return locked;
}
var getDefaultParent = function(originalTarget) {
  {
    return null;
  }
};
var counterMap = /* @__PURE__ */ new WeakMap();
var uncontrolledNodes = /* @__PURE__ */ new WeakMap();
var markerMap = {};
var lockCount = 0;
var unwrapHost = function(node) {
  return node && (node.host || unwrapHost(node.parentNode));
};
var correctTargets = function(parent, targets) {
  return targets.map(function(target) {
    if (parent.contains(target)) {
      return target;
    }
    var correctedTarget = unwrapHost(target);
    if (correctedTarget && parent.contains(correctedTarget)) {
      return correctedTarget;
    }
    console.error("aria-hidden", target, "in not contained inside", parent, ". Doing nothing");
    return null;
  }).filter(function(x) {
    return Boolean(x);
  });
};
var applyAttributeToOthers = function(originalTarget, parentNode, markerName, controlAttribute) {
  var targets = correctTargets(parentNode, Array.isArray(originalTarget) ? originalTarget : [originalTarget]);
  if (!markerMap[markerName]) {
    markerMap[markerName] = /* @__PURE__ */ new WeakMap();
  }
  var markerCounter = markerMap[markerName];
  var hiddenNodes = [];
  var elementsToKeep = /* @__PURE__ */ new Set();
  var elementsToStop = new Set(targets);
  var keep = function(el) {
    if (!el || elementsToKeep.has(el)) {
      return;
    }
    elementsToKeep.add(el);
    keep(el.parentNode);
  };
  targets.forEach(keep);
  var deep = function(parent) {
    if (!parent || elementsToStop.has(parent)) {
      return;
    }
    Array.prototype.forEach.call(parent.children, function(node) {
      if (elementsToKeep.has(node)) {
        deep(node);
      } else {
        try {
          var attr = node.getAttribute(controlAttribute);
          var alreadyHidden = attr !== null && attr !== "false";
          var counterValue = (counterMap.get(node) || 0) + 1;
          var markerValue = (markerCounter.get(node) || 0) + 1;
          counterMap.set(node, counterValue);
          markerCounter.set(node, markerValue);
          hiddenNodes.push(node);
          if (counterValue === 1 && alreadyHidden) {
            uncontrolledNodes.set(node, true);
          }
          if (markerValue === 1) {
            node.setAttribute(markerName, "true");
          }
          if (!alreadyHidden) {
            node.setAttribute(controlAttribute, "true");
          }
        } catch (e) {
          console.error("aria-hidden: cannot operate on ", node, e);
        }
      }
    });
  };
  deep(parentNode);
  elementsToKeep.clear();
  lockCount++;
  return function() {
    hiddenNodes.forEach(function(node) {
      var counterValue = counterMap.get(node) - 1;
      var markerValue = markerCounter.get(node) - 1;
      counterMap.set(node, counterValue);
      markerCounter.set(node, markerValue);
      if (!counterValue) {
        if (!uncontrolledNodes.has(node)) {
          node.removeAttribute(controlAttribute);
        }
        uncontrolledNodes.delete(node);
      }
      if (!markerValue) {
        node.removeAttribute(markerName);
      }
    });
    lockCount--;
    if (!lockCount) {
      counterMap = /* @__PURE__ */ new WeakMap();
      counterMap = /* @__PURE__ */ new WeakMap();
      uncontrolledNodes = /* @__PURE__ */ new WeakMap();
      markerMap = {};
    }
  };
};
var hideOthers = function(originalTarget, parentNode, markerName) {
  if (markerName === void 0) {
    markerName = "data-aria-hidden";
  }
  var targets = Array.from(Array.isArray(originalTarget) ? originalTarget : [originalTarget]);
  var activeParentNode = getDefaultParent();
  if (!activeParentNode) {
    return function() {
      return null;
    };
  }
  targets.push.apply(targets, Array.from(activeParentNode.querySelectorAll("[aria-live], script")));
  return applyAttributeToOthers(targets, activeParentNode, markerName, "aria-hidden");
};
function useHideOthers(target) {
  let undo;
  vueExports.watch(() => unrefElement(target), (el) => {
    let isInsideClosedPopover = false;
    try {
      isInsideClosedPopover = !!el?.closest("[popover]:not(:popover-open)");
    } catch {
    }
    if (el && !isInsideClosedPopover) undo = hideOthers(el);
    else if (undo) undo();
  });
}
const [injectDialogRootContext, provideDialogRootContext] = /* @__PURE__ */ createContext("DialogRoot");
var DialogRoot_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ vueExports.defineComponent({
  inheritAttrs: false,
  __name: "DialogRoot",
  props: {
    open: {
      type: Boolean,
      required: false,
      default: void 0
    },
    defaultOpen: {
      type: Boolean,
      required: false,
      default: false
    },
    modal: {
      type: Boolean,
      required: false,
      default: true
    }
  },
  emits: ["update:open"],
  setup(__props, { emit: __emit }) {
    const props = __props;
    const emit = __emit;
    const open = useVModel(props, "open", emit, {
      defaultValue: props.defaultOpen,
      passive: props.open === void 0
    });
    const triggerElement = vueExports.ref();
    const contentElement = vueExports.ref();
    const { modal } = vueExports.toRefs(props);
    provideDialogRootContext({
      open,
      modal,
      openModal: () => {
        open.value = true;
      },
      onOpenChange: (value) => {
        open.value = value;
      },
      onOpenToggle: () => {
        open.value = !open.value;
      },
      contentId: "",
      titleId: "",
      descriptionId: "",
      triggerElement,
      contentElement
    });
    return (_ctx, _cache) => {
      return vueExports.renderSlot(_ctx.$slots, "default", {
        open: vueExports.unref(open),
        close: () => open.value = false
      });
    };
  }
});
var DialogRoot_default = DialogRoot_vue_vue_type_script_setup_true_lang_default;
var DialogClose_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ vueExports.defineComponent({
  __name: "DialogClose",
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
    const rootContext = injectDialogRootContext();
    return (_ctx, _cache) => {
      return vueExports.openBlock(), vueExports.createBlock(vueExports.unref(Primitive), vueExports.mergeProps(props, {
        type: _ctx.as === "button" ? "button" : void 0,
        onClick: _cache[0] || (_cache[0] = ($event) => vueExports.unref(rootContext).onOpenChange(false))
      }), {
        default: vueExports.withCtx(() => [vueExports.renderSlot(_ctx.$slots, "default")]),
        _: 3
      }, 16, ["type"]);
    };
  }
});
var DialogClose_default = DialogClose_vue_vue_type_script_setup_true_lang_default;
function usePointerDownOutside(onPointerDownOutside, element, enabled = true) {
  element?.value?.ownerDocument ?? globalThis?.document;
  const isPointerInsideDOMTree = vueExports.ref(false);
  vueExports.ref(() => {
  });
  vueExports.watchEffect((cleanupFn) => {
    return;
  });
  return { onPointerDownCapture: () => {
    if (!vueExports.toValue(enabled)) return;
    isPointerInsideDOMTree.value = true;
  } };
}
function useFocusOutside(onFocusOutside, element, enabled = true) {
  element?.value?.ownerDocument ?? globalThis?.document;
  const isFocusInsideDOMTree = vueExports.ref(false);
  vueExports.watchEffect((cleanupFn) => {
    return;
  });
  return {
    onFocusCapture: () => {
      if (!vueExports.toValue(enabled)) return;
      isFocusInsideDOMTree.value = true;
    },
    onBlurCapture: () => {
      if (!vueExports.toValue(enabled)) return;
      isFocusInsideDOMTree.value = false;
    }
  };
}
const context = /* @__PURE__ */ vueExports.reactive({
  layersRoot: /* @__PURE__ */ new Set(),
  layersWithOutsidePointerEventsDisabled: /* @__PURE__ */ new Set(),
  originalBodyPointerEvents: void 0,
  branches: /* @__PURE__ */ new Set()
});
var DismissableLayer_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ vueExports.defineComponent({
  __name: "DismissableLayer",
  props: {
    disableOutsidePointerEvents: {
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
  emits: [
    "escapeKeyDown",
    "pointerDownOutside",
    "focusOutside",
    "interactOutside",
    "dismiss"
  ],
  setup(__props, { emit: __emit }) {
    const props = __props;
    const emits = __emit;
    const { forwardRef, currentElement: layerElement } = useForwardExpose();
    const ownerDocument = vueExports.computed(() => layerElement.value?.ownerDocument ?? globalThis.document);
    const layers = vueExports.computed(() => context.layersRoot);
    const index = vueExports.computed(() => {
      return layerElement.value ? Array.from(layers.value).indexOf(layerElement.value) : -1;
    });
    const isBodyPointerEventsDisabled = vueExports.computed(() => {
      return context.layersWithOutsidePointerEventsDisabled.size > 0;
    });
    const isPointerEventsEnabled = vueExports.computed(() => {
      const localLayers = Array.from(layers.value);
      const [highestLayerWithOutsidePointerEventsDisabled] = [...context.layersWithOutsidePointerEventsDisabled].slice(-1);
      const highestLayerWithOutsidePointerEventsDisabledIndex = localLayers.indexOf(highestLayerWithOutsidePointerEventsDisabled);
      return index.value >= highestLayerWithOutsidePointerEventsDisabledIndex;
    });
    const pointerDownOutside2 = usePointerDownOutside(async (event) => {
      const isPointerDownOnBranch = [...context.branches].some((branch) => branch?.contains(event.target));
      if (!isPointerEventsEnabled.value || isPointerDownOnBranch) return;
      emits("pointerDownOutside", event);
      emits("interactOutside", event);
      await vueExports.nextTick();
      if (!event.defaultPrevented) emits("dismiss");
    }, layerElement);
    const focusOutside = useFocusOutside((event) => {
      const isFocusInBranch = [...context.branches].some((branch) => branch?.contains(event.target));
      if (isFocusInBranch) return;
      emits("focusOutside", event);
      emits("interactOutside", event);
      if (!event.defaultPrevented) emits("dismiss");
    }, layerElement);
    onKeyStroke("Escape", (event) => {
      const isHighestLayer = index.value === layers.value.size - 1;
      if (!isHighestLayer) return;
      emits("escapeKeyDown", event);
      if (!event.defaultPrevented) emits("dismiss");
    });
    vueExports.watchEffect((cleanupFn) => {
      if (!layerElement.value) return;
      if (props.disableOutsidePointerEvents) {
        if (context.layersWithOutsidePointerEventsDisabled.size === 0) {
          context.originalBodyPointerEvents = ownerDocument.value.body.style.pointerEvents;
          ownerDocument.value.body.style.pointerEvents = "none";
        }
        context.layersWithOutsidePointerEventsDisabled.add(layerElement.value);
      }
      layers.value.add(layerElement.value);
      cleanupFn(() => {
        if (props.disableOutsidePointerEvents && context.layersWithOutsidePointerEventsDisabled.size === 1 && !isNullish(context.originalBodyPointerEvents)) ownerDocument.value.body.style.pointerEvents = context.originalBodyPointerEvents;
      });
    });
    vueExports.watchEffect((cleanupFn) => {
      cleanupFn(() => {
        if (!layerElement.value) return;
        layers.value.delete(layerElement.value);
        context.layersWithOutsidePointerEventsDisabled.delete(layerElement.value);
      });
    });
    return (_ctx, _cache) => {
      return vueExports.openBlock(), vueExports.createBlock(vueExports.unref(Primitive), {
        ref: vueExports.unref(forwardRef),
        "as-child": _ctx.asChild,
        as: _ctx.as,
        "data-dismissable-layer": "",
        style: vueExports.normalizeStyle({ pointerEvents: isBodyPointerEventsDisabled.value ? isPointerEventsEnabled.value ? "auto" : "none" : void 0 }),
        onFocusCapture: vueExports.unref(focusOutside).onFocusCapture,
        onBlurCapture: vueExports.unref(focusOutside).onBlurCapture,
        onPointerdownCapture: vueExports.unref(pointerDownOutside2).onPointerDownCapture
      }, {
        default: vueExports.withCtx(() => [vueExports.renderSlot(_ctx.$slots, "default")]),
        _: 3
      }, 8, [
        "as-child",
        "as",
        "style",
        "onFocusCapture",
        "onBlurCapture",
        "onPointerdownCapture"
      ]);
    };
  }
});
var DismissableLayer_default = DismissableLayer_vue_vue_type_script_setup_true_lang_default;
const useFocusStackState = createGlobalState(() => {
  const stack = vueExports.ref([]);
  return stack;
});
function createFocusScopesStack() {
  const stack = useFocusStackState();
  return {
    add(focusScope) {
      const activeFocusScope = stack.value[0];
      if (focusScope !== activeFocusScope) activeFocusScope?.pause();
      stack.value = arrayRemove(stack.value, focusScope);
      stack.value.unshift(focusScope);
    },
    remove(focusScope) {
      stack.value = arrayRemove(stack.value, focusScope);
      stack.value[0]?.resume();
    }
  };
}
function arrayRemove(array, item) {
  const updatedArray = [...array];
  const index = updatedArray.indexOf(item);
  if (index !== -1) updatedArray.splice(index, 1);
  return updatedArray;
}
var FocusScope_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ vueExports.defineComponent({
  __name: "FocusScope",
  props: {
    loop: {
      type: Boolean,
      required: false,
      default: false
    },
    trapped: {
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
  emits: ["mountAutoFocus", "unmountAutoFocus"],
  setup(__props, { emit: __emit }) {
    const props = __props;
    const emits = __emit;
    const { currentRef, currentElement } = useForwardExpose();
    vueExports.ref(null);
    const focusScopesStack = createFocusScopesStack();
    const focusScope = /* @__PURE__ */ vueExports.reactive({
      paused: false,
      pause() {
        this.paused = true;
      },
      resume() {
        this.paused = false;
      }
    });
    vueExports.watchEffect((cleanupFn) => {
      return;
    });
    vueExports.watchEffect(async (cleanupFn) => {
      const container = currentElement.value;
      await vueExports.nextTick();
      if (!container) return;
      focusScopesStack.add(focusScope);
      const previouslyFocusedElement = getActiveElement();
      const hasFocusedCandidate = container.contains(previouslyFocusedElement);
      if (!hasFocusedCandidate) {
        const mountEvent = new CustomEvent(AUTOFOCUS_ON_MOUNT, EVENT_OPTIONS);
        container.addEventListener(AUTOFOCUS_ON_MOUNT, (ev) => emits("mountAutoFocus", ev));
        container.dispatchEvent(mountEvent);
        if (!mountEvent.defaultPrevented) {
          focusFirst(getTabbableCandidates(container), { select: true });
          if (getActiveElement() === previouslyFocusedElement) focus(container);
        }
      }
      cleanupFn(() => {
        container.removeEventListener(AUTOFOCUS_ON_MOUNT, (ev) => emits("mountAutoFocus", ev));
        const unmountEvent = new CustomEvent(AUTOFOCUS_ON_UNMOUNT, EVENT_OPTIONS);
        const unmountEventHandler = (ev) => {
          emits("unmountAutoFocus", ev);
        };
        container.addEventListener(AUTOFOCUS_ON_UNMOUNT, unmountEventHandler);
        container.dispatchEvent(unmountEvent);
        setTimeout(() => {
          if (!unmountEvent.defaultPrevented) focus(previouslyFocusedElement ?? (void 0).body, { select: true });
          container.removeEventListener(AUTOFOCUS_ON_UNMOUNT, unmountEventHandler);
          focusScopesStack.remove(focusScope);
        }, 0);
      });
    });
    function handleKeyDown(event) {
      if (!props.loop && !props.trapped) return;
      if (focusScope.paused) return;
      const isTabKey = event.key === "Tab" && !event.altKey && !event.ctrlKey && !event.metaKey;
      const focusedElement = getActiveElement();
      if (isTabKey && focusedElement) {
        const container = event.currentTarget;
        const [first, last] = getTabbableEdges(container);
        const hasTabbableElementsInside = first && last;
        if (!hasTabbableElementsInside) {
          if (focusedElement === container) event.preventDefault();
        } else if (!event.shiftKey && focusedElement === last) {
          event.preventDefault();
          if (props.loop) focus(first, { select: true });
        } else if (event.shiftKey && focusedElement === first) {
          event.preventDefault();
          if (props.loop) focus(last, { select: true });
        }
      }
    }
    return (_ctx, _cache) => {
      return vueExports.openBlock(), vueExports.createBlock(vueExports.unref(Primitive), {
        ref_key: "currentRef",
        ref: currentRef,
        tabindex: "-1",
        "as-child": _ctx.asChild,
        as: _ctx.as,
        onKeydown: handleKeyDown
      }, {
        default: vueExports.withCtx(() => [vueExports.renderSlot(_ctx.$slots, "default")]),
        _: 3
      }, 8, ["as-child", "as"]);
    };
  }
});
var FocusScope_default = FocusScope_vue_vue_type_script_setup_true_lang_default;
function getOpenState(open) {
  return open ? "open" : "closed";
}
var DialogContentImpl_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ vueExports.defineComponent({
  __name: "DialogContentImpl",
  props: {
    forceMount: {
      type: Boolean,
      required: false
    },
    trapFocus: {
      type: Boolean,
      required: false
    },
    disableOutsidePointerEvents: {
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
  emits: [
    "escapeKeyDown",
    "pointerDownOutside",
    "focusOutside",
    "interactOutside",
    "openAutoFocus",
    "closeAutoFocus"
  ],
  setup(__props, { emit: __emit }) {
    const props = __props;
    const emits = __emit;
    const rootContext = injectDialogRootContext();
    const { forwardRef, currentElement: contentElement } = useForwardExpose();
    rootContext.titleId ||= useId(void 0, "reka-dialog-title");
    rootContext.descriptionId ||= useId(void 0, "reka-dialog-description");
    return (_ctx, _cache) => {
      return vueExports.openBlock(), vueExports.createBlock(vueExports.unref(FocusScope_default), {
        "as-child": "",
        loop: "",
        trapped: props.trapFocus,
        onMountAutoFocus: _cache[5] || (_cache[5] = ($event) => emits("openAutoFocus", $event)),
        onUnmountAutoFocus: _cache[6] || (_cache[6] = ($event) => emits("closeAutoFocus", $event))
      }, {
        default: vueExports.withCtx(() => [vueExports.createVNode(vueExports.unref(DismissableLayer_default), vueExports.mergeProps({
          id: vueExports.unref(rootContext).contentId,
          ref: vueExports.unref(forwardRef),
          as: _ctx.as,
          "as-child": _ctx.asChild,
          "disable-outside-pointer-events": _ctx.disableOutsidePointerEvents,
          role: "dialog",
          "aria-describedby": vueExports.unref(rootContext).descriptionId,
          "aria-labelledby": vueExports.unref(rootContext).titleId,
          "data-state": vueExports.unref(getOpenState)(vueExports.unref(rootContext).open.value)
        }, _ctx.$attrs, {
          onDismiss: _cache[0] || (_cache[0] = ($event) => vueExports.unref(rootContext).onOpenChange(false)),
          onEscapeKeyDown: _cache[1] || (_cache[1] = ($event) => emits("escapeKeyDown", $event)),
          onFocusOutside: _cache[2] || (_cache[2] = ($event) => emits("focusOutside", $event)),
          onInteractOutside: _cache[3] || (_cache[3] = ($event) => emits("interactOutside", $event)),
          onPointerDownOutside: _cache[4] || (_cache[4] = ($event) => emits("pointerDownOutside", $event))
        }), {
          default: vueExports.withCtx(() => [vueExports.renderSlot(_ctx.$slots, "default")]),
          _: 3
        }, 16, [
          "id",
          "as",
          "as-child",
          "disable-outside-pointer-events",
          "aria-describedby",
          "aria-labelledby",
          "data-state"
        ])]),
        _: 3
      }, 8, ["trapped"]);
    };
  }
});
var DialogContentImpl_default = DialogContentImpl_vue_vue_type_script_setup_true_lang_default;
var DialogContentModal_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ vueExports.defineComponent({
  __name: "DialogContentModal",
  props: {
    forceMount: {
      type: Boolean,
      required: false
    },
    trapFocus: {
      type: Boolean,
      required: false
    },
    disableOutsidePointerEvents: {
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
  emits: [
    "escapeKeyDown",
    "pointerDownOutside",
    "focusOutside",
    "interactOutside",
    "openAutoFocus",
    "closeAutoFocus"
  ],
  setup(__props, { emit: __emit }) {
    const props = __props;
    const emits = __emit;
    const rootContext = injectDialogRootContext();
    const emitsAsProps = useEmitAsProps(emits);
    const { forwardRef, currentElement } = useForwardExpose();
    useHideOthers(currentElement);
    return (_ctx, _cache) => {
      return vueExports.openBlock(), vueExports.createBlock(DialogContentImpl_default, vueExports.mergeProps({
        ...props,
        ...vueExports.unref(emitsAsProps)
      }, {
        ref: vueExports.unref(forwardRef),
        "trap-focus": vueExports.unref(rootContext).open.value,
        "disable-outside-pointer-events": true,
        onCloseAutoFocus: _cache[0] || (_cache[0] = (event) => {
          if (!event.defaultPrevented) {
            event.preventDefault();
            vueExports.unref(rootContext).triggerElement.value?.focus();
          }
        }),
        onPointerDownOutside: _cache[1] || (_cache[1] = (event) => {
          const originalEvent = event.detail.originalEvent;
          const ctrlLeftClick = originalEvent.button === 0 && originalEvent.ctrlKey === true;
          const isRightClick = originalEvent.button === 2 || ctrlLeftClick;
          if (isRightClick) event.preventDefault();
        }),
        onFocusOutside: _cache[2] || (_cache[2] = (event) => {
          event.preventDefault();
        })
      }), {
        default: vueExports.withCtx(() => [vueExports.renderSlot(_ctx.$slots, "default")]),
        _: 3
      }, 16, ["trap-focus"]);
    };
  }
});
var DialogContentModal_default = DialogContentModal_vue_vue_type_script_setup_true_lang_default;
var DialogContentNonModal_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ vueExports.defineComponent({
  __name: "DialogContentNonModal",
  props: {
    forceMount: {
      type: Boolean,
      required: false
    },
    trapFocus: {
      type: Boolean,
      required: false
    },
    disableOutsidePointerEvents: {
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
  emits: [
    "escapeKeyDown",
    "pointerDownOutside",
    "focusOutside",
    "interactOutside",
    "openAutoFocus",
    "closeAutoFocus"
  ],
  setup(__props, { emit: __emit }) {
    const props = __props;
    const emits = __emit;
    const emitsAsProps = useEmitAsProps(emits);
    useForwardExpose();
    const rootContext = injectDialogRootContext();
    const hasInteractedOutsideRef = vueExports.ref(false);
    const hasPointerDownOutsideRef = vueExports.ref(false);
    return (_ctx, _cache) => {
      return vueExports.openBlock(), vueExports.createBlock(DialogContentImpl_default, vueExports.mergeProps({
        ...props,
        ...vueExports.unref(emitsAsProps)
      }, {
        "trap-focus": false,
        "disable-outside-pointer-events": false,
        onCloseAutoFocus: _cache[0] || (_cache[0] = (event) => {
          if (!event.defaultPrevented) {
            if (!hasInteractedOutsideRef.value) vueExports.unref(rootContext).triggerElement.value?.focus();
            event.preventDefault();
          }
          hasInteractedOutsideRef.value = false;
          hasPointerDownOutsideRef.value = false;
        }),
        onInteractOutside: _cache[1] || (_cache[1] = (event) => {
          if (!event.defaultPrevented) {
            hasInteractedOutsideRef.value = true;
            if (event.detail.originalEvent.type === "pointerdown") hasPointerDownOutsideRef.value = true;
          }
          const target = event.target;
          const targetIsTrigger = vueExports.unref(rootContext).triggerElement.value?.contains(target);
          if (targetIsTrigger) event.preventDefault();
          if (event.detail.originalEvent.type === "focusin" && hasPointerDownOutsideRef.value) event.preventDefault();
        })
      }), {
        default: vueExports.withCtx(() => [vueExports.renderSlot(_ctx.$slots, "default")]),
        _: 3
      }, 16);
    };
  }
});
var DialogContentNonModal_default = DialogContentNonModal_vue_vue_type_script_setup_true_lang_default;
var DialogContent_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ vueExports.defineComponent({
  __name: "DialogContent",
  props: {
    forceMount: {
      type: Boolean,
      required: false
    },
    disableOutsidePointerEvents: {
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
  emits: [
    "escapeKeyDown",
    "pointerDownOutside",
    "focusOutside",
    "interactOutside",
    "openAutoFocus",
    "closeAutoFocus"
  ],
  setup(__props, { emit: __emit }) {
    const props = __props;
    const emits = __emit;
    const rootContext = injectDialogRootContext();
    const emitsAsProps = useEmitAsProps(emits);
    const { forwardRef } = useForwardExpose();
    return (_ctx, _cache) => {
      return vueExports.openBlock(), vueExports.createBlock(vueExports.unref(Presence_default), { present: _ctx.forceMount || vueExports.unref(rootContext).open.value }, {
        default: vueExports.withCtx(() => [vueExports.unref(rootContext).modal.value ? (vueExports.openBlock(), vueExports.createBlock(DialogContentModal_default, vueExports.mergeProps({
          key: 0,
          ref: vueExports.unref(forwardRef)
        }, {
          ...props,
          ...vueExports.unref(emitsAsProps),
          ..._ctx.$attrs
        }), {
          default: vueExports.withCtx(() => [vueExports.renderSlot(_ctx.$slots, "default")]),
          _: 3
        }, 16)) : (vueExports.openBlock(), vueExports.createBlock(DialogContentNonModal_default, vueExports.mergeProps({
          key: 1,
          ref: vueExports.unref(forwardRef)
        }, {
          ...props,
          ...vueExports.unref(emitsAsProps),
          ..._ctx.$attrs
        }), {
          default: vueExports.withCtx(() => [vueExports.renderSlot(_ctx.$slots, "default")]),
          _: 3
        }, 16))]),
        _: 3
      }, 8, ["present"]);
    };
  }
});
var DialogContent_default = DialogContent_vue_vue_type_script_setup_true_lang_default;
var DialogDescription_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ vueExports.defineComponent({
  __name: "DialogDescription",
  props: {
    asChild: {
      type: Boolean,
      required: false
    },
    as: {
      type: null,
      required: false,
      default: "p"
    }
  },
  setup(__props) {
    const props = __props;
    useForwardExpose();
    const rootContext = injectDialogRootContext();
    return (_ctx, _cache) => {
      return vueExports.openBlock(), vueExports.createBlock(vueExports.unref(Primitive), vueExports.mergeProps(props, { id: vueExports.unref(rootContext).descriptionId }), {
        default: vueExports.withCtx(() => [vueExports.renderSlot(_ctx.$slots, "default")]),
        _: 3
      }, 16, ["id"]);
    };
  }
});
var DialogDescription_default = DialogDescription_vue_vue_type_script_setup_true_lang_default;
var DialogOverlayImpl_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ vueExports.defineComponent({
  __name: "DialogOverlayImpl",
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
    const rootContext = injectDialogRootContext();
    useBodyScrollLock(true);
    useForwardExpose();
    return (_ctx, _cache) => {
      return vueExports.openBlock(), vueExports.createBlock(vueExports.unref(Primitive), {
        as: _ctx.as,
        "as-child": _ctx.asChild,
        "data-state": vueExports.unref(rootContext).open.value ? "open" : "closed",
        style: { "pointer-events": "auto" }
      }, {
        default: vueExports.withCtx(() => [vueExports.renderSlot(_ctx.$slots, "default")]),
        _: 3
      }, 8, [
        "as",
        "as-child",
        "data-state"
      ]);
    };
  }
});
var DialogOverlayImpl_default = DialogOverlayImpl_vue_vue_type_script_setup_true_lang_default;
var DialogOverlay_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ vueExports.defineComponent({
  __name: "DialogOverlay",
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
    const rootContext = injectDialogRootContext();
    const { forwardRef } = useForwardExpose();
    return (_ctx, _cache) => {
      return vueExports.unref(rootContext)?.modal.value ? (vueExports.openBlock(), vueExports.createBlock(vueExports.unref(Presence_default), {
        key: 0,
        present: _ctx.forceMount || vueExports.unref(rootContext).open.value
      }, {
        default: vueExports.withCtx(() => [vueExports.createVNode(DialogOverlayImpl_default, vueExports.mergeProps(_ctx.$attrs, {
          ref: vueExports.unref(forwardRef),
          as: _ctx.as,
          "as-child": _ctx.asChild
        }), {
          default: vueExports.withCtx(() => [vueExports.renderSlot(_ctx.$slots, "default")]),
          _: 3
        }, 16, ["as", "as-child"])]),
        _: 3
      }, 8, ["present"])) : vueExports.createCommentVNode("v-if", true);
    };
  }
});
var DialogOverlay_default = DialogOverlay_vue_vue_type_script_setup_true_lang_default;
var DialogPortal_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ vueExports.defineComponent({
  __name: "DialogPortal",
  props: {
    to: {
      type: null,
      required: false
    },
    disabled: {
      type: Boolean,
      required: false
    },
    defer: {
      type: Boolean,
      required: false
    },
    forceMount: {
      type: Boolean,
      required: false
    }
  },
  setup(__props) {
    const props = __props;
    return (_ctx, _cache) => {
      return vueExports.openBlock(), vueExports.createBlock(vueExports.unref(Teleport_default), vueExports.normalizeProps(vueExports.guardReactiveProps(props)), {
        default: vueExports.withCtx(() => [vueExports.renderSlot(_ctx.$slots, "default")]),
        _: 3
      }, 16);
    };
  }
});
var DialogPortal_default = DialogPortal_vue_vue_type_script_setup_true_lang_default;
var DialogTitle_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ vueExports.defineComponent({
  __name: "DialogTitle",
  props: {
    asChild: {
      type: Boolean,
      required: false
    },
    as: {
      type: null,
      required: false,
      default: "h2"
    }
  },
  setup(__props) {
    const props = __props;
    const rootContext = injectDialogRootContext();
    useForwardExpose();
    return (_ctx, _cache) => {
      return vueExports.openBlock(), vueExports.createBlock(vueExports.unref(Primitive), vueExports.mergeProps(props, { id: vueExports.unref(rootContext).titleId }), {
        default: vueExports.withCtx(() => [vueExports.renderSlot(_ctx.$slots, "default")]),
        _: 3
      }, 16, ["id"]);
    };
  }
});
var DialogTitle_default = DialogTitle_vue_vue_type_script_setup_true_lang_default;
var DialogTrigger_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ vueExports.defineComponent({
  __name: "DialogTrigger",
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
    const rootContext = injectDialogRootContext();
    const { forwardRef } = useForwardExpose();
    rootContext.contentId ||= useId(void 0, "reka-dialog-content");
    return (_ctx, _cache) => {
      return vueExports.openBlock(), vueExports.createBlock(vueExports.unref(Primitive), vueExports.mergeProps(props, {
        ref: vueExports.unref(forwardRef),
        type: _ctx.as === "button" ? "button" : void 0,
        "aria-haspopup": "dialog",
        "aria-expanded": vueExports.unref(rootContext).open.value || false,
        "aria-controls": vueExports.unref(rootContext).open.value ? vueExports.unref(rootContext).contentId : void 0,
        "data-state": vueExports.unref(rootContext).open.value ? "open" : "closed",
        onClick: vueExports.unref(rootContext).onOpenToggle
      }), {
        default: vueExports.withCtx(() => [vueExports.renderSlot(_ctx.$slots, "default")]),
        _: 3
      }, 16, [
        "type",
        "aria-expanded",
        "aria-controls",
        "data-state",
        "onClick"
      ]);
    };
  }
});
var DialogTrigger_default = DialogTrigger_vue_vue_type_script_setup_true_lang_default;
function pointerDownOutside(e, options = {}) {
  const originalEvent = e.detail.originalEvent;
  const target = originalEvent.target;
  if (!target?.isConnected) {
    e.preventDefault();
    return;
  }
  if (options.scrollable) {
    if (originalEvent.offsetX > target.clientWidth || originalEvent.offsetY > target.clientHeight) {
      e.preventDefault();
    }
  }
}
const theme$2 = {
  "slots": {
    "overlay": "fixed inset-0 bg-elevated/75",
    "content": "fixed bg-default divide-y divide-default sm:ring ring-default sm:shadow-lg flex flex-col focus:outline-none",
    "header": "flex items-center gap-1.5 p-4 sm:px-6 min-h-(--ui-header-height)",
    "wrapper": "",
    "body": "flex-1 overflow-y-auto p-4 sm:p-6",
    "footer": "flex items-center gap-1.5 p-4 sm:px-6",
    "title": "text-highlighted font-semibold",
    "description": "mt-1 text-muted text-sm",
    "close": "absolute top-4 end-4"
  },
  "variants": {
    "side": {
      "top": {
        "content": ""
      },
      "right": {
        "content": "max-w-md"
      },
      "bottom": {
        "content": ""
      },
      "left": {
        "content": "max-w-md"
      }
    },
    "inset": {
      "true": {
        "content": "rounded-lg"
      }
    },
    "transition": {
      "true": {
        "overlay": "data-[state=open]:animate-[fade-in_200ms_ease-out] data-[state=closed]:animate-[fade-out_200ms_ease-in]"
      }
    }
  },
  "compoundVariants": [
    {
      "side": "top",
      "inset": true,
      "class": {
        "content": "max-h-[calc(100%-2rem)] inset-x-4 top-4"
      }
    },
    {
      "side": "top",
      "inset": false,
      "class": {
        "content": "max-h-full inset-x-0 top-0"
      }
    },
    {
      "side": "right",
      "inset": true,
      "class": {
        "content": "w-[calc(100%-2rem)] inset-y-4 right-4"
      }
    },
    {
      "side": "right",
      "inset": false,
      "class": {
        "content": "w-full inset-y-0 right-0"
      }
    },
    {
      "side": "bottom",
      "inset": true,
      "class": {
        "content": "max-h-[calc(100%-2rem)] inset-x-4 bottom-4"
      }
    },
    {
      "side": "bottom",
      "inset": false,
      "class": {
        "content": "max-h-full inset-x-0 bottom-0"
      }
    },
    {
      "side": "left",
      "inset": true,
      "class": {
        "content": "w-[calc(100%-2rem)] inset-y-4 left-4"
      }
    },
    {
      "side": "left",
      "inset": false,
      "class": {
        "content": "w-full inset-y-0 left-0"
      }
    },
    {
      "transition": true,
      "side": "top",
      "class": {
        "content": "data-[state=open]:animate-[slide-in-from-top_200ms_ease-in-out] data-[state=closed]:animate-[slide-out-to-top_200ms_ease-in-out]"
      }
    },
    {
      "transition": true,
      "side": "right",
      "class": {
        "content": "data-[state=open]:animate-[slide-in-from-right_200ms_ease-in-out] data-[state=closed]:animate-[slide-out-to-right_200ms_ease-in-out]"
      }
    },
    {
      "transition": true,
      "side": "bottom",
      "class": {
        "content": "data-[state=open]:animate-[slide-in-from-bottom_200ms_ease-in-out] data-[state=closed]:animate-[slide-out-to-bottom_200ms_ease-in-out]"
      }
    },
    {
      "transition": true,
      "side": "left",
      "class": {
        "content": "data-[state=open]:animate-[slide-in-from-left_200ms_ease-in-out] data-[state=closed]:animate-[slide-out-to-left_200ms_ease-in-out]"
      }
    }
  ]
};
const _sfc_main$8 = {
  __name: "USlideover",
  __ssrInlineRender: true,
  props: {
    title: { type: String, required: false },
    description: { type: String, required: false },
    content: { type: Object, required: false },
    overlay: { type: Boolean, required: false, default: true },
    transition: { type: Boolean, required: false, default: true },
    side: { type: null, required: false, default: "right" },
    inset: { type: Boolean, required: false },
    portal: { type: [Boolean, String], required: false, skipCheck: true, default: true },
    close: { type: [Boolean, Object], required: false, default: true },
    closeIcon: { type: null, required: false },
    dismissible: { type: Boolean, required: false, default: true },
    class: { type: null, required: false },
    ui: { type: Object, required: false },
    open: { type: Boolean, required: false },
    defaultOpen: { type: Boolean, required: false },
    modal: { type: Boolean, required: false, default: true }
  },
  emits: ["after:leave", "after:enter", "close:prevent", "update:open"],
  setup(__props, { emit: __emit }) {
    const _props = __props;
    const emits = __emit;
    const slots = vueExports.useSlots();
    const props = useComponentProps("slideover", _props);
    const { t } = useLocale();
    const appConfig = useAppConfig();
    const rootProps = useForwardProps(reactivePick(props, "open", "defaultOpen", "modal"), emits);
    const portalProps = usePortal(vueExports.toRef(() => props.portal));
    const contentProps = vueExports.toRef(() => props.content);
    const contentEvents = vueExports.computed(() => {
      if (!props.dismissible) {
        const events = ["interactOutside", "escapeKeyDown"];
        return events.reduce((acc, curr) => {
          acc[curr] = (e) => {
            e.preventDefault();
            emits("close:prevent");
          };
          return acc;
        }, {});
      }
      return {
        pointerDownOutside
      };
    });
    const ui = vueExports.computed(() => tv({ extend: tv(theme$2), ...appConfig.ui?.slideover || {} })({
      transition: props.transition,
      side: props.side,
      inset: props.inset
    }));
    return (_ctx, _push, _parent, _attrs) => {
      _push(serverRenderer_cjs_prodExports.ssrRenderComponent(vueExports.unref(DialogRoot_default), vueExports.mergeProps(vueExports.unref(rootProps), _attrs), {
        default: vueExports.withCtx(({ open, close }, _push2, _parent2, _scopeId) => {
          if (_push2) {
            if (!!slots.default) {
              _push2(serverRenderer_cjs_prodExports.ssrRenderComponent(vueExports.unref(DialogTrigger_default), {
                "as-child": "",
                class: vueExports.unref(props).class
              }, {
                default: vueExports.withCtx((_, _push3, _parent3, _scopeId2) => {
                  if (_push3) {
                    serverRenderer_cjs_prodExports.ssrRenderSlot(_ctx.$slots, "default", { open }, null, _push3, _parent3, _scopeId2);
                  } else {
                    return [
                      vueExports.renderSlot(_ctx.$slots, "default", { open })
                    ];
                  }
                }),
                _: 2
              }, _parent2, _scopeId));
            } else {
              _push2(`<!---->`);
            }
            _push2(serverRenderer_cjs_prodExports.ssrRenderComponent(vueExports.unref(DialogPortal_default), vueExports.unref(portalProps), {
              default: vueExports.withCtx((_, _push3, _parent3, _scopeId2) => {
                if (_push3) {
                  _push3(serverRenderer_cjs_prodExports.ssrRenderComponent(vueExports.unref(FieldGroupReset), null, {
                    default: vueExports.withCtx((_2, _push4, _parent4, _scopeId3) => {
                      if (_push4) {
                        if (vueExports.unref(props).overlay) {
                          _push4(serverRenderer_cjs_prodExports.ssrRenderComponent(vueExports.unref(DialogOverlay_default), {
                            "data-slot": "overlay",
                            class: ui.value.overlay({ class: vueExports.unref(props).ui?.overlay })
                          }, null, _parent4, _scopeId3));
                        } else {
                          _push4(`<!---->`);
                        }
                        _push4(serverRenderer_cjs_prodExports.ssrRenderComponent(vueExports.unref(DialogContent_default), vueExports.mergeProps({
                          "data-side": vueExports.unref(props).side,
                          "data-slot": "content",
                          class: ui.value.content({ class: [!slots.default && vueExports.unref(props).class, vueExports.unref(props).ui?.content] })
                        }, contentProps.value, {
                          onAfterEnter: ($event) => emits("after:enter"),
                          onAfterLeave: ($event) => emits("after:leave")
                        }, vueExports.toHandlers(contentEvents.value)), {
                          default: vueExports.withCtx((_3, _push5, _parent5, _scopeId4) => {
                            if (_push5) {
                              if (!vueExports.unref(props).title && !slots.title || !vueExports.unref(props).description && !slots.description || !!slots.content) {
                                _push5(serverRenderer_cjs_prodExports.ssrRenderComponent(vueExports.unref(VisuallyHidden_default), null, {
                                  default: vueExports.withCtx((_4, _push6, _parent6, _scopeId5) => {
                                    if (_push6) {
                                      if (!vueExports.unref(props).title && !slots.title) {
                                        _push6(serverRenderer_cjs_prodExports.ssrRenderComponent(vueExports.unref(DialogTitle_default), null, null, _parent6, _scopeId5));
                                      } else if (!!slots.content) {
                                        _push6(serverRenderer_cjs_prodExports.ssrRenderComponent(vueExports.unref(DialogTitle_default), null, {
                                          default: vueExports.withCtx((_5, _push7, _parent7, _scopeId6) => {
                                            if (_push7) {
                                              serverRenderer_cjs_prodExports.ssrRenderSlot(_ctx.$slots, "title", {}, () => {
                                                _push7(`${serverRenderer_cjs_prodExports.ssrInterpolate(vueExports.unref(props).title)}`);
                                              }, _push7, _parent7, _scopeId6);
                                            } else {
                                              return [
                                                vueExports.renderSlot(_ctx.$slots, "title", {}, () => [
                                                  vueExports.createTextVNode(vueExports.toDisplayString(vueExports.unref(props).title), 1)
                                                ])
                                              ];
                                            }
                                          }),
                                          _: 2
                                        }, _parent6, _scopeId5));
                                      } else {
                                        _push6(`<!---->`);
                                      }
                                      if (!vueExports.unref(props).description && !slots.description) {
                                        _push6(serverRenderer_cjs_prodExports.ssrRenderComponent(vueExports.unref(DialogDescription_default), null, null, _parent6, _scopeId5));
                                      } else if (!!slots.content) {
                                        _push6(serverRenderer_cjs_prodExports.ssrRenderComponent(vueExports.unref(DialogDescription_default), null, {
                                          default: vueExports.withCtx((_5, _push7, _parent7, _scopeId6) => {
                                            if (_push7) {
                                              serverRenderer_cjs_prodExports.ssrRenderSlot(_ctx.$slots, "description", {}, () => {
                                                _push7(`${serverRenderer_cjs_prodExports.ssrInterpolate(vueExports.unref(props).description)}`);
                                              }, _push7, _parent7, _scopeId6);
                                            } else {
                                              return [
                                                vueExports.renderSlot(_ctx.$slots, "description", {}, () => [
                                                  vueExports.createTextVNode(vueExports.toDisplayString(vueExports.unref(props).description), 1)
                                                ])
                                              ];
                                            }
                                          }),
                                          _: 2
                                        }, _parent6, _scopeId5));
                                      } else {
                                        _push6(`<!---->`);
                                      }
                                    } else {
                                      return [
                                        !vueExports.unref(props).title && !slots.title ? (vueExports.openBlock(), vueExports.createBlock(vueExports.unref(DialogTitle_default), { key: 0 })) : !!slots.content ? (vueExports.openBlock(), vueExports.createBlock(vueExports.unref(DialogTitle_default), { key: 1 }, {
                                          default: vueExports.withCtx(() => [
                                            vueExports.renderSlot(_ctx.$slots, "title", {}, () => [
                                              vueExports.createTextVNode(vueExports.toDisplayString(vueExports.unref(props).title), 1)
                                            ])
                                          ]),
                                          _: 3
                                        })) : vueExports.createCommentVNode("", true),
                                        !vueExports.unref(props).description && !slots.description ? (vueExports.openBlock(), vueExports.createBlock(vueExports.unref(DialogDescription_default), { key: 2 })) : !!slots.content ? (vueExports.openBlock(), vueExports.createBlock(vueExports.unref(DialogDescription_default), { key: 3 }, {
                                          default: vueExports.withCtx(() => [
                                            vueExports.renderSlot(_ctx.$slots, "description", {}, () => [
                                              vueExports.createTextVNode(vueExports.toDisplayString(vueExports.unref(props).description), 1)
                                            ])
                                          ]),
                                          _: 3
                                        })) : vueExports.createCommentVNode("", true)
                                      ];
                                    }
                                  }),
                                  _: 2
                                }, _parent5, _scopeId4));
                              } else {
                                _push5(`<!---->`);
                              }
                              serverRenderer_cjs_prodExports.ssrRenderSlot(_ctx.$slots, "content", { close }, () => {
                                if (!!slots.header || (vueExports.unref(props).title || !!slots.title) || (vueExports.unref(props).description || !!slots.description) || (vueExports.unref(props).close || !!slots.close)) {
                                  _push5(`<div data-slot="header" class="${serverRenderer_cjs_prodExports.ssrRenderClass(ui.value.header({ class: vueExports.unref(props).ui?.header }))}"${_scopeId4}>`);
                                  serverRenderer_cjs_prodExports.ssrRenderSlot(_ctx.$slots, "header", { close }, () => {
                                    if (vueExports.unref(props).title || !!slots.title || vueExports.unref(props).description || !!slots.description) {
                                      _push5(`<div data-slot="wrapper" class="${serverRenderer_cjs_prodExports.ssrRenderClass(ui.value.wrapper({ class: vueExports.unref(props).ui?.wrapper }))}"${_scopeId4}>`);
                                      if (vueExports.unref(props).title || !!slots.title) {
                                        _push5(serverRenderer_cjs_prodExports.ssrRenderComponent(vueExports.unref(DialogTitle_default), {
                                          "data-slot": "title",
                                          class: ui.value.title({ class: vueExports.unref(props).ui?.title })
                                        }, {
                                          default: vueExports.withCtx((_4, _push6, _parent6, _scopeId5) => {
                                            if (_push6) {
                                              serverRenderer_cjs_prodExports.ssrRenderSlot(_ctx.$slots, "title", {}, () => {
                                                _push6(`${serverRenderer_cjs_prodExports.ssrInterpolate(vueExports.unref(props).title)}`);
                                              }, _push6, _parent6, _scopeId5);
                                            } else {
                                              return [
                                                vueExports.renderSlot(_ctx.$slots, "title", {}, () => [
                                                  vueExports.createTextVNode(vueExports.toDisplayString(vueExports.unref(props).title), 1)
                                                ])
                                              ];
                                            }
                                          }),
                                          _: 2
                                        }, _parent5, _scopeId4));
                                      } else {
                                        _push5(`<!---->`);
                                      }
                                      if (vueExports.unref(props).description || !!slots.description) {
                                        _push5(serverRenderer_cjs_prodExports.ssrRenderComponent(vueExports.unref(DialogDescription_default), {
                                          "data-slot": "description",
                                          class: ui.value.description({ class: vueExports.unref(props).ui?.description })
                                        }, {
                                          default: vueExports.withCtx((_4, _push6, _parent6, _scopeId5) => {
                                            if (_push6) {
                                              serverRenderer_cjs_prodExports.ssrRenderSlot(_ctx.$slots, "description", {}, () => {
                                                _push6(`${serverRenderer_cjs_prodExports.ssrInterpolate(vueExports.unref(props).description)}`);
                                              }, _push6, _parent6, _scopeId5);
                                            } else {
                                              return [
                                                vueExports.renderSlot(_ctx.$slots, "description", {}, () => [
                                                  vueExports.createTextVNode(vueExports.toDisplayString(vueExports.unref(props).description), 1)
                                                ])
                                              ];
                                            }
                                          }),
                                          _: 2
                                        }, _parent5, _scopeId4));
                                      } else {
                                        _push5(`<!---->`);
                                      }
                                      _push5(`</div>`);
                                    } else {
                                      _push5(`<!---->`);
                                    }
                                    serverRenderer_cjs_prodExports.ssrRenderSlot(_ctx.$slots, "actions", {}, null, _push5, _parent5, _scopeId4);
                                    if (vueExports.unref(props).close || !!slots.close) {
                                      _push5(serverRenderer_cjs_prodExports.ssrRenderComponent(vueExports.unref(DialogClose_default), { "as-child": "" }, {
                                        default: vueExports.withCtx((_4, _push6, _parent6, _scopeId5) => {
                                          if (_push6) {
                                            serverRenderer_cjs_prodExports.ssrRenderSlot(_ctx.$slots, "close", { ui: ui.value }, () => {
                                              if (vueExports.unref(props).close) {
                                                _push6(serverRenderer_cjs_prodExports.ssrRenderComponent(_sfc_main$9$1, vueExports.mergeProps({
                                                  icon: vueExports.unref(props).closeIcon || vueExports.unref(appConfig).ui.icons.close,
                                                  color: "neutral",
                                                  variant: "ghost",
                                                  "aria-label": vueExports.unref(t)("slideover.close")
                                                }, typeof vueExports.unref(props).close === "object" ? vueExports.unref(props).close : {}, {
                                                  "data-slot": "close",
                                                  class: ui.value.close({ class: vueExports.unref(props).ui?.close })
                                                }), null, _parent6, _scopeId5));
                                              } else {
                                                _push6(`<!---->`);
                                              }
                                            }, _push6, _parent6, _scopeId5);
                                          } else {
                                            return [
                                              vueExports.renderSlot(_ctx.$slots, "close", { ui: ui.value }, () => [
                                                vueExports.unref(props).close ? (vueExports.openBlock(), vueExports.createBlock(_sfc_main$9$1, vueExports.mergeProps({
                                                  key: 0,
                                                  icon: vueExports.unref(props).closeIcon || vueExports.unref(appConfig).ui.icons.close,
                                                  color: "neutral",
                                                  variant: "ghost",
                                                  "aria-label": vueExports.unref(t)("slideover.close")
                                                }, typeof vueExports.unref(props).close === "object" ? vueExports.unref(props).close : {}, {
                                                  "data-slot": "close",
                                                  class: ui.value.close({ class: vueExports.unref(props).ui?.close })
                                                }), null, 16, ["icon", "aria-label", "class"])) : vueExports.createCommentVNode("", true)
                                              ])
                                            ];
                                          }
                                        }),
                                        _: 2
                                      }, _parent5, _scopeId4));
                                    } else {
                                      _push5(`<!---->`);
                                    }
                                  }, _push5, _parent5, _scopeId4);
                                  _push5(`</div>`);
                                } else {
                                  _push5(`<!---->`);
                                }
                                _push5(`<div data-slot="body" class="${serverRenderer_cjs_prodExports.ssrRenderClass(ui.value.body({ class: vueExports.unref(props).ui?.body }))}"${_scopeId4}>`);
                                serverRenderer_cjs_prodExports.ssrRenderSlot(_ctx.$slots, "body", { close }, null, _push5, _parent5, _scopeId4);
                                _push5(`</div>`);
                                if (!!slots.footer) {
                                  _push5(`<div data-slot="footer" class="${serverRenderer_cjs_prodExports.ssrRenderClass(ui.value.footer({ class: vueExports.unref(props).ui?.footer }))}"${_scopeId4}>`);
                                  serverRenderer_cjs_prodExports.ssrRenderSlot(_ctx.$slots, "footer", { close }, null, _push5, _parent5, _scopeId4);
                                  _push5(`</div>`);
                                } else {
                                  _push5(`<!---->`);
                                }
                              }, _push5, _parent5, _scopeId4);
                            } else {
                              return [
                                !vueExports.unref(props).title && !slots.title || !vueExports.unref(props).description && !slots.description || !!slots.content ? (vueExports.openBlock(), vueExports.createBlock(vueExports.unref(VisuallyHidden_default), { key: 0 }, {
                                  default: vueExports.withCtx(() => [
                                    !vueExports.unref(props).title && !slots.title ? (vueExports.openBlock(), vueExports.createBlock(vueExports.unref(DialogTitle_default), { key: 0 })) : !!slots.content ? (vueExports.openBlock(), vueExports.createBlock(vueExports.unref(DialogTitle_default), { key: 1 }, {
                                      default: vueExports.withCtx(() => [
                                        vueExports.renderSlot(_ctx.$slots, "title", {}, () => [
                                          vueExports.createTextVNode(vueExports.toDisplayString(vueExports.unref(props).title), 1)
                                        ])
                                      ]),
                                      _: 3
                                    })) : vueExports.createCommentVNode("", true),
                                    !vueExports.unref(props).description && !slots.description ? (vueExports.openBlock(), vueExports.createBlock(vueExports.unref(DialogDescription_default), { key: 2 })) : !!slots.content ? (vueExports.openBlock(), vueExports.createBlock(vueExports.unref(DialogDescription_default), { key: 3 }, {
                                      default: vueExports.withCtx(() => [
                                        vueExports.renderSlot(_ctx.$slots, "description", {}, () => [
                                          vueExports.createTextVNode(vueExports.toDisplayString(vueExports.unref(props).description), 1)
                                        ])
                                      ]),
                                      _: 3
                                    })) : vueExports.createCommentVNode("", true)
                                  ]),
                                  _: 3
                                })) : vueExports.createCommentVNode("", true),
                                vueExports.renderSlot(_ctx.$slots, "content", { close }, () => [
                                  !!slots.header || (vueExports.unref(props).title || !!slots.title) || (vueExports.unref(props).description || !!slots.description) || (vueExports.unref(props).close || !!slots.close) ? (vueExports.openBlock(), vueExports.createBlock("div", {
                                    key: 0,
                                    "data-slot": "header",
                                    class: ui.value.header({ class: vueExports.unref(props).ui?.header })
                                  }, [
                                    vueExports.renderSlot(_ctx.$slots, "header", { close }, () => [
                                      vueExports.unref(props).title || !!slots.title || vueExports.unref(props).description || !!slots.description ? (vueExports.openBlock(), vueExports.createBlock("div", {
                                        key: 0,
                                        "data-slot": "wrapper",
                                        class: ui.value.wrapper({ class: vueExports.unref(props).ui?.wrapper })
                                      }, [
                                        vueExports.unref(props).title || !!slots.title ? (vueExports.openBlock(), vueExports.createBlock(vueExports.unref(DialogTitle_default), {
                                          key: 0,
                                          "data-slot": "title",
                                          class: ui.value.title({ class: vueExports.unref(props).ui?.title })
                                        }, {
                                          default: vueExports.withCtx(() => [
                                            vueExports.renderSlot(_ctx.$slots, "title", {}, () => [
                                              vueExports.createTextVNode(vueExports.toDisplayString(vueExports.unref(props).title), 1)
                                            ])
                                          ]),
                                          _: 3
                                        }, 8, ["class"])) : vueExports.createCommentVNode("", true),
                                        vueExports.unref(props).description || !!slots.description ? (vueExports.openBlock(), vueExports.createBlock(vueExports.unref(DialogDescription_default), {
                                          key: 1,
                                          "data-slot": "description",
                                          class: ui.value.description({ class: vueExports.unref(props).ui?.description })
                                        }, {
                                          default: vueExports.withCtx(() => [
                                            vueExports.renderSlot(_ctx.$slots, "description", {}, () => [
                                              vueExports.createTextVNode(vueExports.toDisplayString(vueExports.unref(props).description), 1)
                                            ])
                                          ]),
                                          _: 3
                                        }, 8, ["class"])) : vueExports.createCommentVNode("", true)
                                      ], 2)) : vueExports.createCommentVNode("", true),
                                      vueExports.renderSlot(_ctx.$slots, "actions"),
                                      vueExports.unref(props).close || !!slots.close ? (vueExports.openBlock(), vueExports.createBlock(vueExports.unref(DialogClose_default), {
                                        key: 1,
                                        "as-child": ""
                                      }, {
                                        default: vueExports.withCtx(() => [
                                          vueExports.renderSlot(_ctx.$slots, "close", { ui: ui.value }, () => [
                                            vueExports.unref(props).close ? (vueExports.openBlock(), vueExports.createBlock(_sfc_main$9$1, vueExports.mergeProps({
                                              key: 0,
                                              icon: vueExports.unref(props).closeIcon || vueExports.unref(appConfig).ui.icons.close,
                                              color: "neutral",
                                              variant: "ghost",
                                              "aria-label": vueExports.unref(t)("slideover.close")
                                            }, typeof vueExports.unref(props).close === "object" ? vueExports.unref(props).close : {}, {
                                              "data-slot": "close",
                                              class: ui.value.close({ class: vueExports.unref(props).ui?.close })
                                            }), null, 16, ["icon", "aria-label", "class"])) : vueExports.createCommentVNode("", true)
                                          ])
                                        ]),
                                        _: 2
                                      }, 1024)) : vueExports.createCommentVNode("", true)
                                    ])
                                  ], 2)) : vueExports.createCommentVNode("", true),
                                  vueExports.createVNode("div", {
                                    "data-slot": "body",
                                    class: ui.value.body({ class: vueExports.unref(props).ui?.body })
                                  }, [
                                    vueExports.renderSlot(_ctx.$slots, "body", { close })
                                  ], 2),
                                  !!slots.footer ? (vueExports.openBlock(), vueExports.createBlock("div", {
                                    key: 1,
                                    "data-slot": "footer",
                                    class: ui.value.footer({ class: vueExports.unref(props).ui?.footer })
                                  }, [
                                    vueExports.renderSlot(_ctx.$slots, "footer", { close })
                                  ], 2)) : vueExports.createCommentVNode("", true)
                                ])
                              ];
                            }
                          }),
                          _: 2
                        }, _parent4, _scopeId3));
                      } else {
                        return [
                          vueExports.unref(props).overlay ? (vueExports.openBlock(), vueExports.createBlock(vueExports.unref(DialogOverlay_default), {
                            key: 0,
                            "data-slot": "overlay",
                            class: ui.value.overlay({ class: vueExports.unref(props).ui?.overlay })
                          }, null, 8, ["class"])) : vueExports.createCommentVNode("", true),
                          vueExports.createVNode(vueExports.unref(DialogContent_default), vueExports.mergeProps({
                            "data-side": vueExports.unref(props).side,
                            "data-slot": "content",
                            class: ui.value.content({ class: [!slots.default && vueExports.unref(props).class, vueExports.unref(props).ui?.content] })
                          }, contentProps.value, {
                            onAfterEnter: ($event) => emits("after:enter"),
                            onAfterLeave: ($event) => emits("after:leave")
                          }, vueExports.toHandlers(contentEvents.value)), {
                            default: vueExports.withCtx(() => [
                              !vueExports.unref(props).title && !slots.title || !vueExports.unref(props).description && !slots.description || !!slots.content ? (vueExports.openBlock(), vueExports.createBlock(vueExports.unref(VisuallyHidden_default), { key: 0 }, {
                                default: vueExports.withCtx(() => [
                                  !vueExports.unref(props).title && !slots.title ? (vueExports.openBlock(), vueExports.createBlock(vueExports.unref(DialogTitle_default), { key: 0 })) : !!slots.content ? (vueExports.openBlock(), vueExports.createBlock(vueExports.unref(DialogTitle_default), { key: 1 }, {
                                    default: vueExports.withCtx(() => [
                                      vueExports.renderSlot(_ctx.$slots, "title", {}, () => [
                                        vueExports.createTextVNode(vueExports.toDisplayString(vueExports.unref(props).title), 1)
                                      ])
                                    ]),
                                    _: 3
                                  })) : vueExports.createCommentVNode("", true),
                                  !vueExports.unref(props).description && !slots.description ? (vueExports.openBlock(), vueExports.createBlock(vueExports.unref(DialogDescription_default), { key: 2 })) : !!slots.content ? (vueExports.openBlock(), vueExports.createBlock(vueExports.unref(DialogDescription_default), { key: 3 }, {
                                    default: vueExports.withCtx(() => [
                                      vueExports.renderSlot(_ctx.$slots, "description", {}, () => [
                                        vueExports.createTextVNode(vueExports.toDisplayString(vueExports.unref(props).description), 1)
                                      ])
                                    ]),
                                    _: 3
                                  })) : vueExports.createCommentVNode("", true)
                                ]),
                                _: 3
                              })) : vueExports.createCommentVNode("", true),
                              vueExports.renderSlot(_ctx.$slots, "content", { close }, () => [
                                !!slots.header || (vueExports.unref(props).title || !!slots.title) || (vueExports.unref(props).description || !!slots.description) || (vueExports.unref(props).close || !!slots.close) ? (vueExports.openBlock(), vueExports.createBlock("div", {
                                  key: 0,
                                  "data-slot": "header",
                                  class: ui.value.header({ class: vueExports.unref(props).ui?.header })
                                }, [
                                  vueExports.renderSlot(_ctx.$slots, "header", { close }, () => [
                                    vueExports.unref(props).title || !!slots.title || vueExports.unref(props).description || !!slots.description ? (vueExports.openBlock(), vueExports.createBlock("div", {
                                      key: 0,
                                      "data-slot": "wrapper",
                                      class: ui.value.wrapper({ class: vueExports.unref(props).ui?.wrapper })
                                    }, [
                                      vueExports.unref(props).title || !!slots.title ? (vueExports.openBlock(), vueExports.createBlock(vueExports.unref(DialogTitle_default), {
                                        key: 0,
                                        "data-slot": "title",
                                        class: ui.value.title({ class: vueExports.unref(props).ui?.title })
                                      }, {
                                        default: vueExports.withCtx(() => [
                                          vueExports.renderSlot(_ctx.$slots, "title", {}, () => [
                                            vueExports.createTextVNode(vueExports.toDisplayString(vueExports.unref(props).title), 1)
                                          ])
                                        ]),
                                        _: 3
                                      }, 8, ["class"])) : vueExports.createCommentVNode("", true),
                                      vueExports.unref(props).description || !!slots.description ? (vueExports.openBlock(), vueExports.createBlock(vueExports.unref(DialogDescription_default), {
                                        key: 1,
                                        "data-slot": "description",
                                        class: ui.value.description({ class: vueExports.unref(props).ui?.description })
                                      }, {
                                        default: vueExports.withCtx(() => [
                                          vueExports.renderSlot(_ctx.$slots, "description", {}, () => [
                                            vueExports.createTextVNode(vueExports.toDisplayString(vueExports.unref(props).description), 1)
                                          ])
                                        ]),
                                        _: 3
                                      }, 8, ["class"])) : vueExports.createCommentVNode("", true)
                                    ], 2)) : vueExports.createCommentVNode("", true),
                                    vueExports.renderSlot(_ctx.$slots, "actions"),
                                    vueExports.unref(props).close || !!slots.close ? (vueExports.openBlock(), vueExports.createBlock(vueExports.unref(DialogClose_default), {
                                      key: 1,
                                      "as-child": ""
                                    }, {
                                      default: vueExports.withCtx(() => [
                                        vueExports.renderSlot(_ctx.$slots, "close", { ui: ui.value }, () => [
                                          vueExports.unref(props).close ? (vueExports.openBlock(), vueExports.createBlock(_sfc_main$9$1, vueExports.mergeProps({
                                            key: 0,
                                            icon: vueExports.unref(props).closeIcon || vueExports.unref(appConfig).ui.icons.close,
                                            color: "neutral",
                                            variant: "ghost",
                                            "aria-label": vueExports.unref(t)("slideover.close")
                                          }, typeof vueExports.unref(props).close === "object" ? vueExports.unref(props).close : {}, {
                                            "data-slot": "close",
                                            class: ui.value.close({ class: vueExports.unref(props).ui?.close })
                                          }), null, 16, ["icon", "aria-label", "class"])) : vueExports.createCommentVNode("", true)
                                        ])
                                      ]),
                                      _: 2
                                    }, 1024)) : vueExports.createCommentVNode("", true)
                                  ])
                                ], 2)) : vueExports.createCommentVNode("", true),
                                vueExports.createVNode("div", {
                                  "data-slot": "body",
                                  class: ui.value.body({ class: vueExports.unref(props).ui?.body })
                                }, [
                                  vueExports.renderSlot(_ctx.$slots, "body", { close })
                                ], 2),
                                !!slots.footer ? (vueExports.openBlock(), vueExports.createBlock("div", {
                                  key: 1,
                                  "data-slot": "footer",
                                  class: ui.value.footer({ class: vueExports.unref(props).ui?.footer })
                                }, [
                                  vueExports.renderSlot(_ctx.$slots, "footer", { close })
                                ], 2)) : vueExports.createCommentVNode("", true)
                              ])
                            ]),
                            _: 2
                          }, 1040, ["data-side", "class", "onAfterEnter", "onAfterLeave"])
                        ];
                      }
                    }),
                    _: 2
                  }, _parent3, _scopeId2));
                } else {
                  return [
                    vueExports.createVNode(vueExports.unref(FieldGroupReset), null, {
                      default: vueExports.withCtx(() => [
                        vueExports.unref(props).overlay ? (vueExports.openBlock(), vueExports.createBlock(vueExports.unref(DialogOverlay_default), {
                          key: 0,
                          "data-slot": "overlay",
                          class: ui.value.overlay({ class: vueExports.unref(props).ui?.overlay })
                        }, null, 8, ["class"])) : vueExports.createCommentVNode("", true),
                        vueExports.createVNode(vueExports.unref(DialogContent_default), vueExports.mergeProps({
                          "data-side": vueExports.unref(props).side,
                          "data-slot": "content",
                          class: ui.value.content({ class: [!slots.default && vueExports.unref(props).class, vueExports.unref(props).ui?.content] })
                        }, contentProps.value, {
                          onAfterEnter: ($event) => emits("after:enter"),
                          onAfterLeave: ($event) => emits("after:leave")
                        }, vueExports.toHandlers(contentEvents.value)), {
                          default: vueExports.withCtx(() => [
                            !vueExports.unref(props).title && !slots.title || !vueExports.unref(props).description && !slots.description || !!slots.content ? (vueExports.openBlock(), vueExports.createBlock(vueExports.unref(VisuallyHidden_default), { key: 0 }, {
                              default: vueExports.withCtx(() => [
                                !vueExports.unref(props).title && !slots.title ? (vueExports.openBlock(), vueExports.createBlock(vueExports.unref(DialogTitle_default), { key: 0 })) : !!slots.content ? (vueExports.openBlock(), vueExports.createBlock(vueExports.unref(DialogTitle_default), { key: 1 }, {
                                  default: vueExports.withCtx(() => [
                                    vueExports.renderSlot(_ctx.$slots, "title", {}, () => [
                                      vueExports.createTextVNode(vueExports.toDisplayString(vueExports.unref(props).title), 1)
                                    ])
                                  ]),
                                  _: 3
                                })) : vueExports.createCommentVNode("", true),
                                !vueExports.unref(props).description && !slots.description ? (vueExports.openBlock(), vueExports.createBlock(vueExports.unref(DialogDescription_default), { key: 2 })) : !!slots.content ? (vueExports.openBlock(), vueExports.createBlock(vueExports.unref(DialogDescription_default), { key: 3 }, {
                                  default: vueExports.withCtx(() => [
                                    vueExports.renderSlot(_ctx.$slots, "description", {}, () => [
                                      vueExports.createTextVNode(vueExports.toDisplayString(vueExports.unref(props).description), 1)
                                    ])
                                  ]),
                                  _: 3
                                })) : vueExports.createCommentVNode("", true)
                              ]),
                              _: 3
                            })) : vueExports.createCommentVNode("", true),
                            vueExports.renderSlot(_ctx.$slots, "content", { close }, () => [
                              !!slots.header || (vueExports.unref(props).title || !!slots.title) || (vueExports.unref(props).description || !!slots.description) || (vueExports.unref(props).close || !!slots.close) ? (vueExports.openBlock(), vueExports.createBlock("div", {
                                key: 0,
                                "data-slot": "header",
                                class: ui.value.header({ class: vueExports.unref(props).ui?.header })
                              }, [
                                vueExports.renderSlot(_ctx.$slots, "header", { close }, () => [
                                  vueExports.unref(props).title || !!slots.title || vueExports.unref(props).description || !!slots.description ? (vueExports.openBlock(), vueExports.createBlock("div", {
                                    key: 0,
                                    "data-slot": "wrapper",
                                    class: ui.value.wrapper({ class: vueExports.unref(props).ui?.wrapper })
                                  }, [
                                    vueExports.unref(props).title || !!slots.title ? (vueExports.openBlock(), vueExports.createBlock(vueExports.unref(DialogTitle_default), {
                                      key: 0,
                                      "data-slot": "title",
                                      class: ui.value.title({ class: vueExports.unref(props).ui?.title })
                                    }, {
                                      default: vueExports.withCtx(() => [
                                        vueExports.renderSlot(_ctx.$slots, "title", {}, () => [
                                          vueExports.createTextVNode(vueExports.toDisplayString(vueExports.unref(props).title), 1)
                                        ])
                                      ]),
                                      _: 3
                                    }, 8, ["class"])) : vueExports.createCommentVNode("", true),
                                    vueExports.unref(props).description || !!slots.description ? (vueExports.openBlock(), vueExports.createBlock(vueExports.unref(DialogDescription_default), {
                                      key: 1,
                                      "data-slot": "description",
                                      class: ui.value.description({ class: vueExports.unref(props).ui?.description })
                                    }, {
                                      default: vueExports.withCtx(() => [
                                        vueExports.renderSlot(_ctx.$slots, "description", {}, () => [
                                          vueExports.createTextVNode(vueExports.toDisplayString(vueExports.unref(props).description), 1)
                                        ])
                                      ]),
                                      _: 3
                                    }, 8, ["class"])) : vueExports.createCommentVNode("", true)
                                  ], 2)) : vueExports.createCommentVNode("", true),
                                  vueExports.renderSlot(_ctx.$slots, "actions"),
                                  vueExports.unref(props).close || !!slots.close ? (vueExports.openBlock(), vueExports.createBlock(vueExports.unref(DialogClose_default), {
                                    key: 1,
                                    "as-child": ""
                                  }, {
                                    default: vueExports.withCtx(() => [
                                      vueExports.renderSlot(_ctx.$slots, "close", { ui: ui.value }, () => [
                                        vueExports.unref(props).close ? (vueExports.openBlock(), vueExports.createBlock(_sfc_main$9$1, vueExports.mergeProps({
                                          key: 0,
                                          icon: vueExports.unref(props).closeIcon || vueExports.unref(appConfig).ui.icons.close,
                                          color: "neutral",
                                          variant: "ghost",
                                          "aria-label": vueExports.unref(t)("slideover.close")
                                        }, typeof vueExports.unref(props).close === "object" ? vueExports.unref(props).close : {}, {
                                          "data-slot": "close",
                                          class: ui.value.close({ class: vueExports.unref(props).ui?.close })
                                        }), null, 16, ["icon", "aria-label", "class"])) : vueExports.createCommentVNode("", true)
                                      ])
                                    ]),
                                    _: 2
                                  }, 1024)) : vueExports.createCommentVNode("", true)
                                ])
                              ], 2)) : vueExports.createCommentVNode("", true),
                              vueExports.createVNode("div", {
                                "data-slot": "body",
                                class: ui.value.body({ class: vueExports.unref(props).ui?.body })
                              }, [
                                vueExports.renderSlot(_ctx.$slots, "body", { close })
                              ], 2),
                              !!slots.footer ? (vueExports.openBlock(), vueExports.createBlock("div", {
                                key: 1,
                                "data-slot": "footer",
                                class: ui.value.footer({ class: vueExports.unref(props).ui?.footer })
                              }, [
                                vueExports.renderSlot(_ctx.$slots, "footer", { close })
                              ], 2)) : vueExports.createCommentVNode("", true)
                            ])
                          ]),
                          _: 2
                        }, 1040, ["data-side", "class", "onAfterEnter", "onAfterLeave"])
                      ]),
                      _: 2
                    }, 1024)
                  ];
                }
              }),
              _: 2
            }, _parent2, _scopeId));
          } else {
            return [
              !!slots.default ? (vueExports.openBlock(), vueExports.createBlock(vueExports.unref(DialogTrigger_default), {
                key: 0,
                "as-child": "",
                class: vueExports.unref(props).class
              }, {
                default: vueExports.withCtx(() => [
                  vueExports.renderSlot(_ctx.$slots, "default", { open })
                ]),
                _: 2
              }, 1032, ["class"])) : vueExports.createCommentVNode("", true),
              vueExports.createVNode(vueExports.unref(DialogPortal_default), vueExports.unref(portalProps), {
                default: vueExports.withCtx(() => [
                  vueExports.createVNode(vueExports.unref(FieldGroupReset), null, {
                    default: vueExports.withCtx(() => [
                      vueExports.unref(props).overlay ? (vueExports.openBlock(), vueExports.createBlock(vueExports.unref(DialogOverlay_default), {
                        key: 0,
                        "data-slot": "overlay",
                        class: ui.value.overlay({ class: vueExports.unref(props).ui?.overlay })
                      }, null, 8, ["class"])) : vueExports.createCommentVNode("", true),
                      vueExports.createVNode(vueExports.unref(DialogContent_default), vueExports.mergeProps({
                        "data-side": vueExports.unref(props).side,
                        "data-slot": "content",
                        class: ui.value.content({ class: [!slots.default && vueExports.unref(props).class, vueExports.unref(props).ui?.content] })
                      }, contentProps.value, {
                        onAfterEnter: ($event) => emits("after:enter"),
                        onAfterLeave: ($event) => emits("after:leave")
                      }, vueExports.toHandlers(contentEvents.value)), {
                        default: vueExports.withCtx(() => [
                          !vueExports.unref(props).title && !slots.title || !vueExports.unref(props).description && !slots.description || !!slots.content ? (vueExports.openBlock(), vueExports.createBlock(vueExports.unref(VisuallyHidden_default), { key: 0 }, {
                            default: vueExports.withCtx(() => [
                              !vueExports.unref(props).title && !slots.title ? (vueExports.openBlock(), vueExports.createBlock(vueExports.unref(DialogTitle_default), { key: 0 })) : !!slots.content ? (vueExports.openBlock(), vueExports.createBlock(vueExports.unref(DialogTitle_default), { key: 1 }, {
                                default: vueExports.withCtx(() => [
                                  vueExports.renderSlot(_ctx.$slots, "title", {}, () => [
                                    vueExports.createTextVNode(vueExports.toDisplayString(vueExports.unref(props).title), 1)
                                  ])
                                ]),
                                _: 3
                              })) : vueExports.createCommentVNode("", true),
                              !vueExports.unref(props).description && !slots.description ? (vueExports.openBlock(), vueExports.createBlock(vueExports.unref(DialogDescription_default), { key: 2 })) : !!slots.content ? (vueExports.openBlock(), vueExports.createBlock(vueExports.unref(DialogDescription_default), { key: 3 }, {
                                default: vueExports.withCtx(() => [
                                  vueExports.renderSlot(_ctx.$slots, "description", {}, () => [
                                    vueExports.createTextVNode(vueExports.toDisplayString(vueExports.unref(props).description), 1)
                                  ])
                                ]),
                                _: 3
                              })) : vueExports.createCommentVNode("", true)
                            ]),
                            _: 3
                          })) : vueExports.createCommentVNode("", true),
                          vueExports.renderSlot(_ctx.$slots, "content", { close }, () => [
                            !!slots.header || (vueExports.unref(props).title || !!slots.title) || (vueExports.unref(props).description || !!slots.description) || (vueExports.unref(props).close || !!slots.close) ? (vueExports.openBlock(), vueExports.createBlock("div", {
                              key: 0,
                              "data-slot": "header",
                              class: ui.value.header({ class: vueExports.unref(props).ui?.header })
                            }, [
                              vueExports.renderSlot(_ctx.$slots, "header", { close }, () => [
                                vueExports.unref(props).title || !!slots.title || vueExports.unref(props).description || !!slots.description ? (vueExports.openBlock(), vueExports.createBlock("div", {
                                  key: 0,
                                  "data-slot": "wrapper",
                                  class: ui.value.wrapper({ class: vueExports.unref(props).ui?.wrapper })
                                }, [
                                  vueExports.unref(props).title || !!slots.title ? (vueExports.openBlock(), vueExports.createBlock(vueExports.unref(DialogTitle_default), {
                                    key: 0,
                                    "data-slot": "title",
                                    class: ui.value.title({ class: vueExports.unref(props).ui?.title })
                                  }, {
                                    default: vueExports.withCtx(() => [
                                      vueExports.renderSlot(_ctx.$slots, "title", {}, () => [
                                        vueExports.createTextVNode(vueExports.toDisplayString(vueExports.unref(props).title), 1)
                                      ])
                                    ]),
                                    _: 3
                                  }, 8, ["class"])) : vueExports.createCommentVNode("", true),
                                  vueExports.unref(props).description || !!slots.description ? (vueExports.openBlock(), vueExports.createBlock(vueExports.unref(DialogDescription_default), {
                                    key: 1,
                                    "data-slot": "description",
                                    class: ui.value.description({ class: vueExports.unref(props).ui?.description })
                                  }, {
                                    default: vueExports.withCtx(() => [
                                      vueExports.renderSlot(_ctx.$slots, "description", {}, () => [
                                        vueExports.createTextVNode(vueExports.toDisplayString(vueExports.unref(props).description), 1)
                                      ])
                                    ]),
                                    _: 3
                                  }, 8, ["class"])) : vueExports.createCommentVNode("", true)
                                ], 2)) : vueExports.createCommentVNode("", true),
                                vueExports.renderSlot(_ctx.$slots, "actions"),
                                vueExports.unref(props).close || !!slots.close ? (vueExports.openBlock(), vueExports.createBlock(vueExports.unref(DialogClose_default), {
                                  key: 1,
                                  "as-child": ""
                                }, {
                                  default: vueExports.withCtx(() => [
                                    vueExports.renderSlot(_ctx.$slots, "close", { ui: ui.value }, () => [
                                      vueExports.unref(props).close ? (vueExports.openBlock(), vueExports.createBlock(_sfc_main$9$1, vueExports.mergeProps({
                                        key: 0,
                                        icon: vueExports.unref(props).closeIcon || vueExports.unref(appConfig).ui.icons.close,
                                        color: "neutral",
                                        variant: "ghost",
                                        "aria-label": vueExports.unref(t)("slideover.close")
                                      }, typeof vueExports.unref(props).close === "object" ? vueExports.unref(props).close : {}, {
                                        "data-slot": "close",
                                        class: ui.value.close({ class: vueExports.unref(props).ui?.close })
                                      }), null, 16, ["icon", "aria-label", "class"])) : vueExports.createCommentVNode("", true)
                                    ])
                                  ]),
                                  _: 2
                                }, 1024)) : vueExports.createCommentVNode("", true)
                              ])
                            ], 2)) : vueExports.createCommentVNode("", true),
                            vueExports.createVNode("div", {
                              "data-slot": "body",
                              class: ui.value.body({ class: vueExports.unref(props).ui?.body })
                            }, [
                              vueExports.renderSlot(_ctx.$slots, "body", { close })
                            ], 2),
                            !!slots.footer ? (vueExports.openBlock(), vueExports.createBlock("div", {
                              key: 1,
                              "data-slot": "footer",
                              class: ui.value.footer({ class: vueExports.unref(props).ui?.footer })
                            }, [
                              vueExports.renderSlot(_ctx.$slots, "footer", { close })
                            ], 2)) : vueExports.createCommentVNode("", true)
                          ])
                        ]),
                        _: 2
                      }, 1040, ["data-side", "class", "onAfterEnter", "onAfterLeave"])
                    ]),
                    _: 2
                  }, 1024)
                ]),
                _: 2
              }, 1040)
            ];
          }
        }),
        _: 3
      }, _parent));
    };
  }
};
const _sfc_setup$8 = _sfc_main$8.setup;
_sfc_main$8.setup = (props, ctx) => {
  const ssrContext = vueExports.useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("../node_modules/.pnpm/@nuxt+ui@4.8.0_@internationalized+date@3.12.1_@internationalized+number@3.6.6_@tiptap+e_d719e0a183cea98ed15f9fdb5506ba26/node_modules/@nuxt/ui/dist/runtime/components/Slideover.vue");
  return _sfc_setup$8 ? _sfc_setup$8(props, ctx) : void 0;
};
const theme$1 = {
  "slots": {
    "root": "rounded-lg overflow-hidden",
    "header": "p-4 sm:px-6",
    "title": "text-highlighted font-semibold",
    "description": "mt-1 text-muted text-sm",
    "body": "p-4 sm:p-6",
    "footer": "p-4 sm:px-6"
  },
  "variants": {
    "variant": {
      "solid": {
        "root": "bg-inverted text-inverted",
        "title": "text-inverted",
        "description": "text-dimmed"
      },
      "outline": {
        "root": "bg-default ring ring-default divide-y divide-default"
      },
      "soft": {
        "root": "bg-elevated/50 divide-y divide-default"
      },
      "subtle": {
        "root": "bg-elevated/50 ring ring-default divide-y divide-default"
      }
    }
  },
  "defaultVariants": {
    "variant": "outline"
  }
};
const _sfc_main$7 = {
  __name: "UCard",
  __ssrInlineRender: true,
  props: {
    as: { type: null, required: false },
    title: { type: String, required: false },
    description: { type: String, required: false },
    variant: { type: null, required: false },
    class: { type: null, required: false },
    ui: { type: Object, required: false }
  },
  setup(__props) {
    const _props = __props;
    const slots = vueExports.useSlots();
    const props = useComponentProps("card", _props);
    const appConfig = useAppConfig();
    const ui = vueExports.computed(() => tv({ extend: tv(theme$1), ...appConfig.ui?.card || {} })({
      variant: props.variant
    }));
    return (_ctx, _push, _parent, _attrs) => {
      _push(serverRenderer_cjs_prodExports.ssrRenderComponent(vueExports.unref(Primitive), vueExports.mergeProps({
        as: vueExports.unref(props).as,
        "data-slot": "root",
        class: ui.value.root({ class: [vueExports.unref(props).ui?.root, vueExports.unref(props).class] })
      }, _attrs), {
        default: vueExports.withCtx((_, _push2, _parent2, _scopeId) => {
          if (_push2) {
            if (!!slots.header || (vueExports.unref(props).title || !!slots.title) || (vueExports.unref(props).description || !!slots.description)) {
              _push2(`<div data-slot="header" class="${serverRenderer_cjs_prodExports.ssrRenderClass(ui.value.header({ class: vueExports.unref(props).ui?.header }))}"${_scopeId}>`);
              serverRenderer_cjs_prodExports.ssrRenderSlot(_ctx.$slots, "header", {}, () => {
                if (vueExports.unref(props).title || !!slots.title) {
                  _push2(`<div data-slot="title" class="${serverRenderer_cjs_prodExports.ssrRenderClass(ui.value.title({ class: vueExports.unref(props).ui?.title }))}"${_scopeId}>`);
                  serverRenderer_cjs_prodExports.ssrRenderSlot(_ctx.$slots, "title", {}, () => {
                    _push2(`${serverRenderer_cjs_prodExports.ssrInterpolate(vueExports.unref(props).title)}`);
                  }, _push2, _parent2, _scopeId);
                  _push2(`</div>`);
                } else {
                  _push2(`<!---->`);
                }
                if (vueExports.unref(props).description || !!slots.description) {
                  _push2(`<div data-slot="description" class="${serverRenderer_cjs_prodExports.ssrRenderClass(ui.value.description({ class: vueExports.unref(props).ui?.description }))}"${_scopeId}>`);
                  serverRenderer_cjs_prodExports.ssrRenderSlot(_ctx.$slots, "description", {}, () => {
                    _push2(`${serverRenderer_cjs_prodExports.ssrInterpolate(vueExports.unref(props).description)}`);
                  }, _push2, _parent2, _scopeId);
                  _push2(`</div>`);
                } else {
                  _push2(`<!---->`);
                }
              }, _push2, _parent2, _scopeId);
              _push2(`</div>`);
            } else {
              _push2(`<!---->`);
            }
            if (!!slots.default) {
              _push2(`<div data-slot="body" class="${serverRenderer_cjs_prodExports.ssrRenderClass(ui.value.body({ class: vueExports.unref(props).ui?.body }))}"${_scopeId}>`);
              serverRenderer_cjs_prodExports.ssrRenderSlot(_ctx.$slots, "default", {}, null, _push2, _parent2, _scopeId);
              _push2(`</div>`);
            } else {
              _push2(`<!---->`);
            }
            if (!!slots.footer) {
              _push2(`<div data-slot="footer" class="${serverRenderer_cjs_prodExports.ssrRenderClass(ui.value.footer({ class: vueExports.unref(props).ui?.footer }))}"${_scopeId}>`);
              serverRenderer_cjs_prodExports.ssrRenderSlot(_ctx.$slots, "footer", {}, null, _push2, _parent2, _scopeId);
              _push2(`</div>`);
            } else {
              _push2(`<!---->`);
            }
          } else {
            return [
              !!slots.header || (vueExports.unref(props).title || !!slots.title) || (vueExports.unref(props).description || !!slots.description) ? (vueExports.openBlock(), vueExports.createBlock("div", {
                key: 0,
                "data-slot": "header",
                class: ui.value.header({ class: vueExports.unref(props).ui?.header })
              }, [
                vueExports.renderSlot(_ctx.$slots, "header", {}, () => [
                  vueExports.unref(props).title || !!slots.title ? (vueExports.openBlock(), vueExports.createBlock("div", {
                    key: 0,
                    "data-slot": "title",
                    class: ui.value.title({ class: vueExports.unref(props).ui?.title })
                  }, [
                    vueExports.renderSlot(_ctx.$slots, "title", {}, () => [
                      vueExports.createTextVNode(vueExports.toDisplayString(vueExports.unref(props).title), 1)
                    ])
                  ], 2)) : vueExports.createCommentVNode("", true),
                  vueExports.unref(props).description || !!slots.description ? (vueExports.openBlock(), vueExports.createBlock("div", {
                    key: 1,
                    "data-slot": "description",
                    class: ui.value.description({ class: vueExports.unref(props).ui?.description })
                  }, [
                    vueExports.renderSlot(_ctx.$slots, "description", {}, () => [
                      vueExports.createTextVNode(vueExports.toDisplayString(vueExports.unref(props).description), 1)
                    ])
                  ], 2)) : vueExports.createCommentVNode("", true)
                ])
              ], 2)) : vueExports.createCommentVNode("", true),
              !!slots.default ? (vueExports.openBlock(), vueExports.createBlock("div", {
                key: 1,
                "data-slot": "body",
                class: ui.value.body({ class: vueExports.unref(props).ui?.body })
              }, [
                vueExports.renderSlot(_ctx.$slots, "default")
              ], 2)) : vueExports.createCommentVNode("", true),
              !!slots.footer ? (vueExports.openBlock(), vueExports.createBlock("div", {
                key: 2,
                "data-slot": "footer",
                class: ui.value.footer({ class: vueExports.unref(props).ui?.footer })
              }, [
                vueExports.renderSlot(_ctx.$slots, "footer")
              ], 2)) : vueExports.createCommentVNode("", true)
            ];
          }
        }),
        _: 3
      }, _parent));
    };
  }
};
const _sfc_setup$7 = _sfc_main$7.setup;
_sfc_main$7.setup = (props, ctx) => {
  const ssrContext = vueExports.useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("../node_modules/.pnpm/@nuxt+ui@4.8.0_@internationalized+date@3.12.1_@internationalized+number@3.6.6_@tiptap+e_d719e0a183cea98ed15f9fdb5506ba26/node_modules/@nuxt/ui/dist/runtime/components/Card.vue");
  return _sfc_setup$7 ? _sfc_setup$7(props, ctx) : void 0;
};
const _sfc_main$6 = /* @__PURE__ */ vueExports.defineComponent({
  __name: "Price",
  __ssrInlineRender: true,
  props: {
    price: {}
  },
  setup(__props) {
    const props = __props;
    const { locale } = useI18n();
    const price = vueExports.computed(() => {
      const currencyCode = props.price?.currencyCode;
      if (!currencyCode) return "";
      const rawPrice = Number(props.price.amount);
      const formatter = new Intl.NumberFormat(locale.value, {
        style: "currency",
        currency: currencyCode
      });
      return formatter.format(rawPrice);
    });
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<span${serverRenderer_cjs_prodExports.ssrRenderAttrs(vueExports.mergeProps({ class: "font-bold" }, _attrs))}>${serverRenderer_cjs_prodExports.ssrInterpolate(vueExports.unref(price))}</span>`);
    };
  }
});
const _sfc_setup$6 = _sfc_main$6.setup;
_sfc_main$6.setup = (props, ctx) => {
  const ssrContext = vueExports.useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/product/Price.vue");
  return _sfc_setup$6 ? _sfc_setup$6(props, ctx) : void 0;
};
const __nuxt_component_2$2 = Object.assign(_sfc_main$6, { __name: "ProductPrice" });
const _sfc_main$5 = /* @__PURE__ */ vueExports.defineComponent({
  __name: "LineItem",
  __ssrInlineRender: true,
  props: {
    line: {}
  },
  setup(__props) {
    const props = __props;
    const { update, remove } = useCart();
    const localePath = useLocalePath();
    const variant = vueExports.computed(() => props.line.merchandise);
    const to = vueExports.computed(() => localePath(`/product/${variant.value.product.handle}`));
    const schema = z.object({
      quantity: z.number().min(1).max(10)
    });
    const state = vueExports.reactive({
      quantity: props.line.quantity
    });
    vueExports.watch(state, (state2) => update(props.line.id, state2.quantity));
    return (_ctx, _push, _parent, _attrs) => {
      const _component_UCard = _sfc_main$7;
      const _component_NuxtLink = __nuxt_component_0$1;
      const _component_NuxtImg = __nuxt_component_2$1$1;
      const _component_UForm = _sfc_main$2$1;
      const _component_UFormField = _sfc_main$1$1;
      const _component_UInputNumber = _sfc_main$9;
      const _component_ProductPrice = __nuxt_component_2$2;
      const _component_UButton = _sfc_main$9$1;
      _push(serverRenderer_cjs_prodExports.ssrRenderComponent(_component_UCard, vueExports.mergeProps({ ui: { body: "relative flex justify-between gap-8" } }, _attrs), {
        default: vueExports.withCtx((_, _push2, _parent2, _scopeId) => {
          if (_push2) {
            _push2(serverRenderer_cjs_prodExports.ssrRenderComponent(_component_NuxtLink, {
              to: vueExports.unref(to),
              "aria-label": `${_ctx.$t("product.view")}: '${vueExports.unref(variant).product.title}'`
            }, {
              default: vueExports.withCtx((_2, _push3, _parent3, _scopeId2) => {
                if (_push3) {
                  _push3(serverRenderer_cjs_prodExports.ssrRenderComponent(_component_NuxtImg, {
                    provider: "shopify",
                    src: vueExports.unref(variant).image?.url,
                    alt: vueExports.unref(variant).image?.altText ?? vueExports.unref(variant).product.title,
                    width: "160",
                    height: "160",
                    class: "size-24 lg:size-28"
                  }, null, _parent3, _scopeId2));
                } else {
                  return [
                    vueExports.createVNode(_component_NuxtImg, {
                      provider: "shopify",
                      src: vueExports.unref(variant).image?.url,
                      alt: vueExports.unref(variant).image?.altText ?? vueExports.unref(variant).product.title,
                      width: "160",
                      height: "160",
                      class: "size-24 lg:size-28"
                    }, null, 8, ["src", "alt"])
                  ];
                }
              }),
              _: 1
            }, _parent2, _scopeId));
            _push2(`<div class="h-24 flex flex-col justify-between grow lg:h-28"${_scopeId}>`);
            _push2(serverRenderer_cjs_prodExports.ssrRenderComponent(_component_NuxtLink, {
              to: vueExports.unref(to),
              class: "pt-2.5 font-medium"
            }, {
              default: vueExports.withCtx((_2, _push3, _parent3, _scopeId2) => {
                if (_push3) {
                  _push3(`${serverRenderer_cjs_prodExports.ssrInterpolate(vueExports.unref(variant).product.title)} - ${serverRenderer_cjs_prodExports.ssrInterpolate(vueExports.unref(variant).title)}`);
                } else {
                  return [
                    vueExports.createTextVNode(vueExports.toDisplayString(vueExports.unref(variant).product.title) + " - " + vueExports.toDisplayString(vueExports.unref(variant).title), 1)
                  ];
                }
              }),
              _: 1
            }, _parent2, _scopeId));
            _push2(`<div class="flex justify-between gap-4"${_scopeId}>`);
            _push2(serverRenderer_cjs_prodExports.ssrRenderComponent(_component_UForm, {
              state: vueExports.unref(state),
              schema: vueExports.unref(schema),
              "validate-on": ["change"]
            }, {
              default: vueExports.withCtx((_2, _push3, _parent3, _scopeId2) => {
                if (_push3) {
                  _push3(serverRenderer_cjs_prodExports.ssrRenderComponent(_component_UFormField, { name: "quantity" }, {
                    default: vueExports.withCtx((_3, _push4, _parent4, _scopeId3) => {
                      if (_push4) {
                        _push4(serverRenderer_cjs_prodExports.ssrRenderComponent(_component_UInputNumber, {
                          modelValue: vueExports.unref(state).quantity,
                          "onUpdate:modelValue": ($event) => vueExports.unref(state).quantity = $event,
                          min: 1,
                          max: 10,
                          class: "w-24"
                        }, null, _parent4, _scopeId3));
                      } else {
                        return [
                          vueExports.createVNode(_component_UInputNumber, {
                            modelValue: vueExports.unref(state).quantity,
                            "onUpdate:modelValue": ($event) => vueExports.unref(state).quantity = $event,
                            min: 1,
                            max: 10,
                            class: "w-24"
                          }, null, 8, ["modelValue", "onUpdate:modelValue"])
                        ];
                      }
                    }),
                    _: 1
                  }, _parent3, _scopeId2));
                } else {
                  return [
                    vueExports.createVNode(_component_UFormField, { name: "quantity" }, {
                      default: vueExports.withCtx(() => [
                        vueExports.createVNode(_component_UInputNumber, {
                          modelValue: vueExports.unref(state).quantity,
                          "onUpdate:modelValue": ($event) => vueExports.unref(state).quantity = $event,
                          min: 1,
                          max: 10,
                          class: "w-24"
                        }, null, 8, ["modelValue", "onUpdate:modelValue"])
                      ]),
                      _: 1
                    })
                  ];
                }
              }),
              _: 1
            }, _parent2, _scopeId));
            _push2(serverRenderer_cjs_prodExports.ssrRenderComponent(_component_ProductPrice, {
              price: vueExports.unref(variant).price,
              class: "font-semibold leading-8"
            }, null, _parent2, _scopeId));
            _push2(`</div></div>`);
            _push2(serverRenderer_cjs_prodExports.ssrRenderComponent(_component_UButton, {
              variant: "ghost",
              color: "neutral",
              icon: "i-lucide-x",
              size: "sm",
              class: "absolute top-0 right-0 p-2 rounded-none rounded-bl-md",
              onClick: ($event) => vueExports.unref(remove)(props.line.id)
            }, null, _parent2, _scopeId));
          } else {
            return [
              vueExports.createVNode(_component_NuxtLink, {
                to: vueExports.unref(to),
                "aria-label": `${_ctx.$t("product.view")}: '${vueExports.unref(variant).product.title}'`
              }, {
                default: vueExports.withCtx(() => [
                  vueExports.createVNode(_component_NuxtImg, {
                    provider: "shopify",
                    src: vueExports.unref(variant).image?.url,
                    alt: vueExports.unref(variant).image?.altText ?? vueExports.unref(variant).product.title,
                    width: "160",
                    height: "160",
                    class: "size-24 lg:size-28"
                  }, null, 8, ["src", "alt"])
                ]),
                _: 1
              }, 8, ["to", "aria-label"]),
              vueExports.createVNode("div", { class: "h-24 flex flex-col justify-between grow lg:h-28" }, [
                vueExports.createVNode(_component_NuxtLink, {
                  to: vueExports.unref(to),
                  class: "pt-2.5 font-medium"
                }, {
                  default: vueExports.withCtx(() => [
                    vueExports.createTextVNode(vueExports.toDisplayString(vueExports.unref(variant).product.title) + " - " + vueExports.toDisplayString(vueExports.unref(variant).title), 1)
                  ]),
                  _: 1
                }, 8, ["to"]),
                vueExports.createVNode("div", { class: "flex justify-between gap-4" }, [
                  vueExports.createVNode(_component_UForm, {
                    state: vueExports.unref(state),
                    schema: vueExports.unref(schema),
                    "validate-on": ["change"]
                  }, {
                    default: vueExports.withCtx(() => [
                      vueExports.createVNode(_component_UFormField, { name: "quantity" }, {
                        default: vueExports.withCtx(() => [
                          vueExports.createVNode(_component_UInputNumber, {
                            modelValue: vueExports.unref(state).quantity,
                            "onUpdate:modelValue": ($event) => vueExports.unref(state).quantity = $event,
                            min: 1,
                            max: 10,
                            class: "w-24"
                          }, null, 8, ["modelValue", "onUpdate:modelValue"])
                        ]),
                        _: 1
                      })
                    ]),
                    _: 1
                  }, 8, ["state", "schema"]),
                  vueExports.createVNode(_component_ProductPrice, {
                    price: vueExports.unref(variant).price,
                    class: "font-semibold leading-8"
                  }, null, 8, ["price"])
                ])
              ]),
              vueExports.createVNode(_component_UButton, {
                variant: "ghost",
                color: "neutral",
                icon: "i-lucide-x",
                size: "sm",
                class: "absolute top-0 right-0 p-2 rounded-none rounded-bl-md",
                onClick: ($event) => vueExports.unref(remove)(props.line.id)
              }, null, 8, ["onClick"])
            ];
          }
        }),
        _: 1
      }, _parent));
    };
  }
});
const _sfc_setup$5 = _sfc_main$5.setup;
_sfc_main$5.setup = (props, ctx) => {
  const ssrContext = vueExports.useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/cart/LineItem.vue");
  return _sfc_setup$5 ? _sfc_setup$5(props, ctx) : void 0;
};
const __nuxt_component_1 = Object.assign(_sfc_main$5, { __name: "CartLineItem" });
const _sfc_main$4 = /* @__PURE__ */ vueExports.defineComponent({
  __name: "Modal",
  __ssrInlineRender: true,
  setup(__props) {
    const { open, loading, lines, total, checkoutUrl } = useCart();
    const route = useRoute$1();
    vueExports.watch(() => route.path, () => open.value = false);
    return (_ctx, _push, _parent, _attrs) => {
      const _component_USlideover = _sfc_main$8;
      const _component_CartLineItem = __nuxt_component_1;
      const _component_ProductPrice = __nuxt_component_2$2;
      const _component_Icon = __nuxt_component_3;
      const _component_UButton = _sfc_main$9$1;
      _push(serverRenderer_cjs_prodExports.ssrRenderComponent(_component_USlideover, vueExports.mergeProps({
        open: vueExports.unref(open),
        "onUpdate:open": ($event) => vueExports.isRef(open) ? open.value = $event : null,
        title: _ctx.$t("cart.title"),
        description: _ctx.$t("cart.description"),
        ui: { description: "sr-only", body: "flex flex-col gap-y-6" }
      }, _attrs), {
        body: vueExports.withCtx((_, _push2, _parent2, _scopeId) => {
          if (_push2) {
            _push2(`<!--[-->`);
            serverRenderer_cjs_prodExports.ssrRenderList(vueExports.unref(lines), (line) => {
              _push2(serverRenderer_cjs_prodExports.ssrRenderComponent(_component_CartLineItem, {
                key: line.id,
                line,
                class: "shrink-0 duration-300"
              }, null, _parent2, _scopeId));
            });
            _push2(`<!--]-->`);
            if (vueExports.unref(lines).length === 0) {
              _push2(`<p class="my-auto text-center"${_scopeId}>${serverRenderer_cjs_prodExports.ssrInterpolate(_ctx.$t("cart.empty"))}</p>`);
            } else {
              _push2(`<!---->`);
            }
          } else {
            return [
              vueExports.createVNode(vueExports.TransitionGroup, {
                "enter-to-class": "opacity-100",
                "leave-to-class": "opacity-0",
                "leave-from-class": "opacity-100",
                "enter-from-class": "opacity-0"
              }, {
                default: vueExports.withCtx(() => [
                  (vueExports.openBlock(true), vueExports.createBlock(vueExports.Fragment, null, vueExports.renderList(vueExports.unref(lines), (line) => {
                    return vueExports.openBlock(), vueExports.createBlock(_component_CartLineItem, {
                      key: line.id,
                      line,
                      class: "shrink-0 duration-300"
                    }, null, 8, ["line"]);
                  }), 128))
                ]),
                _: 1
              }),
              vueExports.unref(lines).length === 0 ? (vueExports.openBlock(), vueExports.createBlock("p", {
                key: 0,
                class: "my-auto text-center"
              }, vueExports.toDisplayString(_ctx.$t("cart.empty")), 1)) : vueExports.createCommentVNode("", true)
            ];
          }
        }),
        footer: vueExports.withCtx((_, _push2, _parent2, _scopeId) => {
          if (_push2) {
            if (vueExports.unref(total)) {
              _push2(`<div class="${serverRenderer_cjs_prodExports.ssrRenderClass([{
                "animate-pulse": vueExports.unref(loading)
              }, "flex justify-between items-center w-full"])}"${_scopeId}><div class="flex items-center gap-2"${_scopeId}><p class="font-medium inline-block"${_scopeId}>${serverRenderer_cjs_prodExports.ssrInterpolate(_ctx.$t("cart.subtotal"))}: `);
              _push2(serverRenderer_cjs_prodExports.ssrRenderComponent(_component_ProductPrice, { price: vueExports.unref(total) }, null, _parent2, _scopeId));
              _push2(`</p>`);
              if (vueExports.unref(loading)) {
                _push2(serverRenderer_cjs_prodExports.ssrRenderComponent(_component_Icon, {
                  name: "i-lucide-loader-circle",
                  class: "animate-spin"
                }, null, _parent2, _scopeId));
              } else {
                _push2(`<!---->`);
              }
              _push2(`</div>`);
              _push2(serverRenderer_cjs_prodExports.ssrRenderComponent(_component_UButton, {
                variant: "ghost",
                color: "neutral",
                to: vueExports.unref(checkoutUrl),
                label: _ctx.$t("cart.checkout"),
                size: "xl",
                "trailing-icon": "i-lucide-arrow-right",
                ui: {
                  trailingIcon: "size-4"
                },
                disabled: vueExports.unref(loading) || vueExports.unref(lines).length === 0
              }, null, _parent2, _scopeId));
              _push2(`</div>`);
            } else {
              _push2(`<!---->`);
            }
          } else {
            return [
              vueExports.unref(total) ? (vueExports.openBlock(), vueExports.createBlock("div", {
                key: 0,
                class: ["flex justify-between items-center w-full", {
                  "animate-pulse": vueExports.unref(loading)
                }]
              }, [
                vueExports.createVNode("div", { class: "flex items-center gap-2" }, [
                  vueExports.createVNode("p", { class: "font-medium inline-block" }, [
                    vueExports.createTextVNode(vueExports.toDisplayString(_ctx.$t("cart.subtotal")) + ": ", 1),
                    vueExports.createVNode(_component_ProductPrice, { price: vueExports.unref(total) }, null, 8, ["price"])
                  ]),
                  vueExports.unref(loading) ? (vueExports.openBlock(), vueExports.createBlock(_component_Icon, {
                    key: 0,
                    name: "i-lucide-loader-circle",
                    class: "animate-spin"
                  })) : vueExports.createCommentVNode("", true)
                ]),
                vueExports.createVNode(_component_UButton, {
                  variant: "ghost",
                  color: "neutral",
                  to: vueExports.unref(checkoutUrl),
                  label: _ctx.$t("cart.checkout"),
                  size: "xl",
                  "trailing-icon": "i-lucide-arrow-right",
                  ui: {
                    trailingIcon: "size-4"
                  },
                  disabled: vueExports.unref(loading) || vueExports.unref(lines).length === 0
                }, null, 8, ["to", "label", "disabled"])
              ], 2)) : vueExports.createCommentVNode("", true)
            ];
          }
        }),
        _: 1
      }, _parent));
    };
  }
});
const _sfc_setup$4 = _sfc_main$4.setup;
_sfc_main$4.setup = (props, ctx) => {
  const ssrContext = vueExports.useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/cart/Modal.vue");
  return _sfc_setup$4 ? _sfc_setup$4(props, ctx) : void 0;
};
const __nuxt_component_2$1 = Object.assign(_sfc_main$4, { __name: "CartModal" });
const _sfc_main$3 = /* @__PURE__ */ vueExports.defineComponent({
  __name: "Header",
  __ssrInlineRender: true,
  setup(__props) {
    useCart();
    return (_ctx, _push, _parent, _attrs) => {
      const _component_NuxtLink = __nuxt_component_0$1;
      const _component_ClientOnly = __nuxt_component_1$1;
      const _component_CartModal = __nuxt_component_2$1;
      _push(`<!--[--><header class="site-header" data-v-dc4e8638>`);
      _push(serverRenderer_cjs_prodExports.ssrRenderComponent(_component_NuxtLink, {
        to: "/",
        "aria-label": "STITCH AND ASH home",
        class: "logo-link"
      }, {
        default: vueExports.withCtx((_, _push2, _parent2, _scopeId) => {
          if (_push2) {
            _push2(`<svg class="mark" viewBox="0 0 260 32" role="img" aria-label="STITCH AND ASH" data-v-dc4e8638${_scopeId}><text x="0" y="24" font-family="&quot;UnifrakturMaguntia&quot;, &quot;Old English Text MT&quot;, &quot;Cambria&quot;, serif" font-size="26" letter-spacing="1.5" font-weight="400" data-v-dc4e8638${_scopeId}>STITCH &amp; ASH</text></svg>`);
          } else {
            return [
              (vueExports.openBlock(), vueExports.createBlock("svg", {
                class: "mark",
                viewBox: "0 0 260 32",
                role: "img",
                "aria-label": "STITCH AND ASH"
              }, [
                vueExports.createVNode("text", {
                  x: "0",
                  y: "24",
                  "font-family": '"UnifrakturMaguntia", "Old English Text MT", "Cambria", serif',
                  "font-size": "26",
                  "letter-spacing": "1.5",
                  "font-weight": "400"
                }, "STITCH & ASH")
              ]))
            ];
          }
        }),
        _: 1
      }, _parent));
      _push(`<nav class="nav-menu" aria-label="Primary" data-v-dc4e8638>`);
      _push(serverRenderer_cjs_prodExports.ssrRenderComponent(_component_NuxtLink, {
        to: "/products/sku-001",
        class: "nav-link"
      }, {
        default: vueExports.withCtx((_, _push2, _parent2, _scopeId) => {
          if (_push2) {
            _push2(`Shop`);
          } else {
            return [
              vueExports.createTextVNode("Shop")
            ];
          }
        }),
        _: 1
      }, _parent));
      _push(serverRenderer_cjs_prodExports.ssrRenderComponent(_component_NuxtLink, {
        to: "/#statement",
        class: "nav-link"
      }, {
        default: vueExports.withCtx((_, _push2, _parent2, _scopeId) => {
          if (_push2) {
            _push2(`Story`);
          } else {
            return [
              vueExports.createTextVNode("Story")
            ];
          }
        }),
        _: 1
      }, _parent));
      _push(serverRenderer_cjs_prodExports.ssrRenderComponent(_component_NuxtLink, {
        to: "/ops-platform",
        class: "nav-link"
      }, {
        default: vueExports.withCtx((_, _push2, _parent2, _scopeId) => {
          if (_push2) {
            _push2(`Ops`);
          } else {
            return [
              vueExports.createTextVNode("Ops")
            ];
          }
        }),
        _: 1
      }, _parent));
      _push(`<button class="cart-pill" aria-label="Cart" data-v-dc4e8638><span data-v-dc4e8638>Cart</span>`);
      _push(serverRenderer_cjs_prodExports.ssrRenderComponent(_component_ClientOnly, null, {}, _parent));
      _push(`</button></nav></header>`);
      _push(serverRenderer_cjs_prodExports.ssrRenderComponent(_component_CartModal, null, null, _parent));
      _push(`<!--]-->`);
    };
  }
});
const _sfc_setup$3 = _sfc_main$3.setup;
_sfc_main$3.setup = (props, ctx) => {
  const ssrContext = vueExports.useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/Header.vue");
  return _sfc_setup$3 ? _sfc_setup$3(props, ctx) : void 0;
};
const __nuxt_component_0 = /* @__PURE__ */ Object.assign(_export_sfc(_sfc_main$3, [["__scopeId", "data-v-dc4e8638"]]), { __name: "Header" });
const theme = {
  "base": "min-h-[calc(100vh-var(--ui-header-height))]"
};
const _sfc_main$2 = {
  __name: "UMain",
  __ssrInlineRender: true,
  props: {
    as: { type: null, required: false, default: "main" },
    class: { type: null, required: false },
    ui: { type: Object, required: false }
  },
  setup(__props) {
    const _props = __props;
    const props = useComponentProps("main", _props);
    const appConfig = useAppConfig();
    const ui = vueExports.computed(() => tv({ extend: tv(theme), ...appConfig.ui?.main || {} }));
    return (_ctx, _push, _parent, _attrs) => {
      _push(serverRenderer_cjs_prodExports.ssrRenderComponent(vueExports.unref(Primitive), vueExports.mergeProps({
        as: vueExports.unref(props).as,
        class: ui.value({ class: [vueExports.unref(props).ui?.base, vueExports.unref(props).class] })
      }, _attrs), {
        default: vueExports.withCtx((_, _push2, _parent2, _scopeId) => {
          if (_push2) {
            serverRenderer_cjs_prodExports.ssrRenderSlot(_ctx.$slots, "default", {}, null, _push2, _parent2, _scopeId);
          } else {
            return [
              vueExports.renderSlot(_ctx.$slots, "default")
            ];
          }
        }),
        _: 3
      }, _parent));
    };
  }
};
const _sfc_setup$2 = _sfc_main$2.setup;
_sfc_main$2.setup = (props, ctx) => {
  const ssrContext = vueExports.useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("../node_modules/.pnpm/@nuxt+ui@4.8.0_@internationalized+date@3.12.1_@internationalized+number@3.6.6_@tiptap+e_d719e0a183cea98ed15f9fdb5506ba26/node_modules/@nuxt/ui/dist/runtime/components/Main.vue");
  return _sfc_setup$2 ? _sfc_setup$2(props, ctx) : void 0;
};
const _sfc_main$1 = {};
function _sfc_ssrRender$1(_ctx, _push, _parent, _attrs) {
  const _component_NuxtLink = __nuxt_component_0$1;
  _push(`<footer${serverRenderer_cjs_prodExports.ssrRenderAttrs(vueExports.mergeProps({ class: "site-foot" }, _attrs))} data-v-a8945099>`);
  _push(serverRenderer_cjs_prodExports.ssrRenderComponent(_component_NuxtLink, {
    to: "/",
    "aria-label": "STITCH AND ASH home",
    class: "foot-mark"
  }, {
    default: vueExports.withCtx((_, _push2, _parent2, _scopeId) => {
      if (_push2) {
        _push2(`<svg class="mark" viewBox="0 0 260 32" role="img" aria-label="STITCH AND ASH" data-v-a8945099${_scopeId}><text x="0" y="24" font-family="&quot;UnifrakturMaguntia&quot;, &quot;Old English Text MT&quot;, &quot;Cambria&quot;, serif" font-size="26" letter-spacing="1.5" font-weight="400" data-v-a8945099${_scopeId}>STITCH &amp; ASH</text></svg>`);
      } else {
        return [
          (vueExports.openBlock(), vueExports.createBlock("svg", {
            class: "mark",
            viewBox: "0 0 260 32",
            role: "img",
            "aria-label": "STITCH AND ASH"
          }, [
            vueExports.createVNode("text", {
              x: "0",
              y: "24",
              "font-family": '"UnifrakturMaguntia", "Old English Text MT", "Cambria", serif',
              "font-size": "26",
              "letter-spacing": "1.5",
              "font-weight": "400"
            }, "STITCH & ASH")
          ]))
        ];
      }
    }),
    _: 1
  }, _parent));
  _push(`<div class="footer-meta" data-v-a8945099><span data-v-a8945099>© STITCH &amp; ASH — pilot</span><span class="trilogy" data-v-a8945099>Bone · Ember · Ash</span></div></footer>`);
}
const _sfc_setup$1 = _sfc_main$1.setup;
_sfc_main$1.setup = (props, ctx) => {
  const ssrContext = vueExports.useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/Footer.vue");
  return _sfc_setup$1 ? _sfc_setup$1(props, ctx) : void 0;
};
const __nuxt_component_2 = /* @__PURE__ */ Object.assign(_export_sfc(_sfc_main$1, [["ssrRender", _sfc_ssrRender$1], ["__scopeId", "data-v-a8945099"]]), { __name: "Footer" });
const _sfc_main = {};
function _sfc_ssrRender(_ctx, _push, _parent, _attrs) {
  const _component_Header = __nuxt_component_0;
  const _component_UMain = _sfc_main$2;
  const _component_Footer = __nuxt_component_2;
  _push(`<div${serverRenderer_cjs_prodExports.ssrRenderAttrs(_attrs)}>`);
  _push(serverRenderer_cjs_prodExports.ssrRenderComponent(_component_Header, null, null, _parent));
  _push(serverRenderer_cjs_prodExports.ssrRenderComponent(_component_UMain, null, {
    default: vueExports.withCtx((_, _push2, _parent2, _scopeId) => {
      if (_push2) {
        serverRenderer_cjs_prodExports.ssrRenderSlot(_ctx.$slots, "default", {}, null, _push2, _parent2, _scopeId);
      } else {
        return [
          vueExports.renderSlot(_ctx.$slots, "default")
        ];
      }
    }),
    _: 3
  }, _parent));
  _push(serverRenderer_cjs_prodExports.ssrRenderComponent(_component_Footer, null, null, _parent));
  _push(`</div>`);
}
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = vueExports.useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("layouts/default.vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
const _default = /* @__PURE__ */ _export_sfc(_sfc_main, [["ssrRender", _sfc_ssrRender]]);

export { _default as default };
//# sourceMappingURL=default-BnwPgkG8.mjs.map
