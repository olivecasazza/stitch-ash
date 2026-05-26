import { ab as useComponentProps, a6 as useAppConfig, aw as vueExports, a4 as tv, a1 as serverRenderer_cjs_prodExports, e as Primitive, ak as useLocale, j as _sfc_main$a, Y as pickLinkProps, m as _sfc_main$b, k as _sfc_main$f, h as _sfc_main$c, J as get } from './server.mjs';

const theme$1 = {
  "base": "w-full max-w-(--ui-container) mx-auto px-4 sm:px-6 lg:px-8"
};
const _sfc_main$1 = {
  __name: "UContainer",
  __ssrInlineRender: true,
  props: {
    as: { type: null, required: false },
    class: { type: null, required: false },
    ui: { type: Object, required: false }
  },
  setup(__props) {
    const _props = __props;
    const props = useComponentProps("container", _props);
    const appConfig = useAppConfig();
    const ui = vueExports.computed(() => tv({ extend: tv(theme$1), ...appConfig.ui?.container || {} }));
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
const _sfc_setup$1 = _sfc_main$1.setup;
_sfc_main$1.setup = (props, ctx) => {
  const ssrContext = vueExports.useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("../node_modules/.pnpm/@nuxt+ui@4.8.0_@internationalized+date@3.12.1_@internationalized+number@3.6.6_@tiptap+e_d719e0a183cea98ed15f9fdb5506ba26/node_modules/@nuxt/ui/dist/runtime/components/Container.vue");
  return _sfc_setup$1 ? _sfc_setup$1(props, ctx) : void 0;
};
const theme = {
  "slots": {
    "root": "relative min-w-0",
    "list": "flex items-center gap-1.5",
    "item": "flex min-w-0",
    "link": "group relative flex items-center gap-1.5 text-sm min-w-0",
    "linkLeadingIcon": "shrink-0 size-5",
    "linkLeadingAvatar": "shrink-0",
    "linkLeadingAvatarSize": "2xs",
    "linkLabel": "truncate",
    "separator": "flex",
    "separatorIcon": "shrink-0 size-5 text-muted"
  },
  "variants": {
    "active": {
      "true": {
        "link": "font-semibold"
      },
      "false": {
        "link": "text-muted font-medium"
      }
    },
    "disabled": {
      "true": {
        "link": "cursor-not-allowed opacity-75"
      }
    },
    "to": {
      "true": ""
    },
    "color": {
      "primary": {
        "link": "focus-visible:outline-primary"
      },
      "secondary": {
        "link": "focus-visible:outline-secondary"
      },
      "success": {
        "link": "focus-visible:outline-success"
      },
      "info": {
        "link": "focus-visible:outline-info"
      },
      "warning": {
        "link": "focus-visible:outline-warning"
      },
      "error": {
        "link": "focus-visible:outline-error"
      },
      "neutral": {
        "link": "focus-visible:outline-inverted"
      }
    }
  },
  "compoundVariants": [
    {
      "disabled": false,
      "active": false,
      "to": true,
      "class": {
        "link": [
          "hover:text-default",
          "transition-colors"
        ]
      }
    },
    {
      "color": "primary",
      "active": true,
      "class": {
        "link": "text-primary"
      }
    },
    {
      "color": "secondary",
      "active": true,
      "class": {
        "link": "text-secondary"
      }
    },
    {
      "color": "success",
      "active": true,
      "class": {
        "link": "text-success"
      }
    },
    {
      "color": "info",
      "active": true,
      "class": {
        "link": "text-info"
      }
    },
    {
      "color": "warning",
      "active": true,
      "class": {
        "link": "text-warning"
      }
    },
    {
      "color": "error",
      "active": true,
      "class": {
        "link": "text-error"
      }
    },
    {
      "color": "neutral",
      "active": true,
      "class": {
        "link": "text-highlighted"
      }
    }
  ],
  "defaultVariants": {
    "color": "primary"
  }
};
const _sfc_main = {
  __name: "UBreadcrumb",
  __ssrInlineRender: true,
  props: {
    as: { type: null, required: false, default: "nav" },
    items: { type: Array, required: false },
    separatorIcon: { type: null, required: false },
    color: { type: null, required: false },
    labelKey: { type: null, required: false, default: "label" },
    class: { type: null, required: false },
    ui: { type: Object, required: false }
  },
  setup(__props) {
    const _props = __props;
    const slots = vueExports.useSlots();
    const props = useComponentProps("breadcrumb", _props);
    const { dir } = useLocale();
    const appConfig = useAppConfig();
    const separatorIcon = vueExports.computed(() => props.separatorIcon || (dir.value === "rtl" ? appConfig.ui.icons.chevronLeft : appConfig.ui.icons.chevronRight));
    const ui = vueExports.computed(() => tv({ extend: tv(theme), ...appConfig.ui?.breadcrumb || {} })({
      color: props.color
    }));
    return (_ctx, _push, _parent, _attrs) => {
      _push(serverRenderer_cjs_prodExports.ssrRenderComponent(vueExports.unref(Primitive), vueExports.mergeProps({
        as: vueExports.unref(props).as,
        "aria-label": "breadcrumb",
        "data-slot": "root",
        class: ui.value.root({ class: [vueExports.unref(props).ui?.root, vueExports.unref(props).class] })
      }, _attrs), {
        default: vueExports.withCtx((_, _push2, _parent2, _scopeId) => {
          if (_push2) {
            _push2(`<ol data-slot="list" class="${serverRenderer_cjs_prodExports.ssrRenderClass(ui.value.list({ class: vueExports.unref(props).ui?.list }))}"${_scopeId}><!--[-->`);
            serverRenderer_cjs_prodExports.ssrRenderList(vueExports.unref(props).items, (item, index) => {
              _push2(`<!--[--><li data-slot="item" class="${serverRenderer_cjs_prodExports.ssrRenderClass(ui.value.item({ class: [vueExports.unref(props).ui?.item, item.ui?.item] }))}"${_scopeId}>`);
              _push2(serverRenderer_cjs_prodExports.ssrRenderComponent(_sfc_main$a, vueExports.mergeProps({ ref_for: true }, vueExports.unref(pickLinkProps)(item), { custom: "" }), {
                default: vueExports.withCtx(({ active, ...slotProps }, _push3, _parent3, _scopeId2) => {
                  if (_push3) {
                    _push3(serverRenderer_cjs_prodExports.ssrRenderComponent(_sfc_main$b, vueExports.mergeProps({ ref_for: true }, slotProps, {
                      as: "span",
                      "aria-current": (item.active ?? active) && index === vueExports.unref(props).items.length - 1 ? "page" : void 0,
                      "data-slot": "link",
                      class: ui.value.link({ class: [vueExports.unref(props).ui?.link, item.ui?.link, item.class], active: item.active ?? index === vueExports.unref(props).items.length - 1, disabled: !!item.disabled, to: !!item.to })
                    }), {
                      default: vueExports.withCtx((_2, _push4, _parent4, _scopeId3) => {
                        if (_push4) {
                          serverRenderer_cjs_prodExports.ssrRenderSlot(_ctx.$slots, item.slot || "item", {
                            item,
                            active: item.active ?? index === vueExports.unref(props).items.length - 1,
                            index,
                            ui: ui.value
                          }, () => {
                            serverRenderer_cjs_prodExports.ssrRenderSlot(_ctx.$slots, item.slot ? `${item.slot}-leading` : "item-leading", {
                              item,
                              active: item.active ?? index === vueExports.unref(props).items.length - 1,
                              index,
                              ui: ui.value
                            }, () => {
                              if (item.icon) {
                                _push4(serverRenderer_cjs_prodExports.ssrRenderComponent(_sfc_main$f, {
                                  name: item.icon,
                                  "data-slot": "linkLeadingIcon",
                                  class: ui.value.linkLeadingIcon({ class: [vueExports.unref(props).ui?.linkLeadingIcon, item.ui?.linkLeadingIcon], active: item.active ?? index === vueExports.unref(props).items.length - 1 })
                                }, null, _parent4, _scopeId3));
                              } else if (item.avatar) {
                                _push4(serverRenderer_cjs_prodExports.ssrRenderComponent(_sfc_main$c, vueExports.mergeProps({
                                  size: vueExports.unref(props).ui?.linkLeadingAvatarSize || ui.value.linkLeadingAvatarSize()
                                }, { ref_for: true }, item.avatar, {
                                  "data-slot": "linkLeadingAvatar",
                                  class: ui.value.linkLeadingAvatar({ class: [vueExports.unref(props).ui?.linkLeadingAvatar, item.ui?.linkLeadingAvatar], active: item.active ?? index === vueExports.unref(props).items.length - 1 })
                                }), null, _parent4, _scopeId3));
                              } else {
                                _push4(`<!---->`);
                              }
                            }, _push4, _parent4, _scopeId3);
                            if (vueExports.unref(get)(item, vueExports.unref(props).labelKey) || !!slots[item.slot ? `${item.slot}-label` : "item-label"]) {
                              _push4(`<span data-slot="linkLabel" class="${serverRenderer_cjs_prodExports.ssrRenderClass(ui.value.linkLabel({ class: [vueExports.unref(props).ui?.linkLabel, item.ui?.linkLabel] }))}"${_scopeId3}>`);
                              serverRenderer_cjs_prodExports.ssrRenderSlot(_ctx.$slots, item.slot ? `${item.slot}-label` : "item-label", {
                                item,
                                active: item.active ?? index === vueExports.unref(props).items.length - 1,
                                index
                              }, () => {
                                _push4(`${serverRenderer_cjs_prodExports.ssrInterpolate(vueExports.unref(get)(item, vueExports.unref(props).labelKey))}`);
                              }, _push4, _parent4, _scopeId3);
                              _push4(`</span>`);
                            } else {
                              _push4(`<!---->`);
                            }
                            serverRenderer_cjs_prodExports.ssrRenderSlot(_ctx.$slots, item.slot ? `${item.slot}-trailing` : "item-trailing", {
                              item,
                              active: item.active ?? index === vueExports.unref(props).items.length - 1,
                              index
                            }, null, _push4, _parent4, _scopeId3);
                          }, _push4, _parent4, _scopeId3);
                        } else {
                          return [
                            vueExports.renderSlot(_ctx.$slots, item.slot || "item", {
                              item,
                              active: item.active ?? index === vueExports.unref(props).items.length - 1,
                              index,
                              ui: ui.value
                            }, () => [
                              vueExports.renderSlot(_ctx.$slots, item.slot ? `${item.slot}-leading` : "item-leading", {
                                item,
                                active: item.active ?? index === vueExports.unref(props).items.length - 1,
                                index,
                                ui: ui.value
                              }, () => [
                                item.icon ? (vueExports.openBlock(), vueExports.createBlock(_sfc_main$f, {
                                  key: 0,
                                  name: item.icon,
                                  "data-slot": "linkLeadingIcon",
                                  class: ui.value.linkLeadingIcon({ class: [vueExports.unref(props).ui?.linkLeadingIcon, item.ui?.linkLeadingIcon], active: item.active ?? index === vueExports.unref(props).items.length - 1 })
                                }, null, 8, ["name", "class"])) : item.avatar ? (vueExports.openBlock(), vueExports.createBlock(_sfc_main$c, vueExports.mergeProps({
                                  key: 1,
                                  size: vueExports.unref(props).ui?.linkLeadingAvatarSize || ui.value.linkLeadingAvatarSize()
                                }, { ref_for: true }, item.avatar, {
                                  "data-slot": "linkLeadingAvatar",
                                  class: ui.value.linkLeadingAvatar({ class: [vueExports.unref(props).ui?.linkLeadingAvatar, item.ui?.linkLeadingAvatar], active: item.active ?? index === vueExports.unref(props).items.length - 1 })
                                }), null, 16, ["size", "class"])) : vueExports.createCommentVNode("", true)
                              ]),
                              vueExports.unref(get)(item, vueExports.unref(props).labelKey) || !!slots[item.slot ? `${item.slot}-label` : "item-label"] ? (vueExports.openBlock(), vueExports.createBlock("span", {
                                key: 0,
                                "data-slot": "linkLabel",
                                class: ui.value.linkLabel({ class: [vueExports.unref(props).ui?.linkLabel, item.ui?.linkLabel] })
                              }, [
                                vueExports.renderSlot(_ctx.$slots, item.slot ? `${item.slot}-label` : "item-label", {
                                  item,
                                  active: item.active ?? index === vueExports.unref(props).items.length - 1,
                                  index
                                }, () => [
                                  vueExports.createTextVNode(vueExports.toDisplayString(vueExports.unref(get)(item, vueExports.unref(props).labelKey)), 1)
                                ])
                              ], 2)) : vueExports.createCommentVNode("", true),
                              vueExports.renderSlot(_ctx.$slots, item.slot ? `${item.slot}-trailing` : "item-trailing", {
                                item,
                                active: item.active ?? index === vueExports.unref(props).items.length - 1,
                                index
                              })
                            ])
                          ];
                        }
                      }),
                      _: 2
                    }, _parent3, _scopeId2));
                  } else {
                    return [
                      vueExports.createVNode(_sfc_main$b, vueExports.mergeProps({ ref_for: true }, slotProps, {
                        as: "span",
                        "aria-current": (item.active ?? active) && index === vueExports.unref(props).items.length - 1 ? "page" : void 0,
                        "data-slot": "link",
                        class: ui.value.link({ class: [vueExports.unref(props).ui?.link, item.ui?.link, item.class], active: item.active ?? index === vueExports.unref(props).items.length - 1, disabled: !!item.disabled, to: !!item.to })
                      }), {
                        default: vueExports.withCtx(() => [
                          vueExports.renderSlot(_ctx.$slots, item.slot || "item", {
                            item,
                            active: item.active ?? index === vueExports.unref(props).items.length - 1,
                            index,
                            ui: ui.value
                          }, () => [
                            vueExports.renderSlot(_ctx.$slots, item.slot ? `${item.slot}-leading` : "item-leading", {
                              item,
                              active: item.active ?? index === vueExports.unref(props).items.length - 1,
                              index,
                              ui: ui.value
                            }, () => [
                              item.icon ? (vueExports.openBlock(), vueExports.createBlock(_sfc_main$f, {
                                key: 0,
                                name: item.icon,
                                "data-slot": "linkLeadingIcon",
                                class: ui.value.linkLeadingIcon({ class: [vueExports.unref(props).ui?.linkLeadingIcon, item.ui?.linkLeadingIcon], active: item.active ?? index === vueExports.unref(props).items.length - 1 })
                              }, null, 8, ["name", "class"])) : item.avatar ? (vueExports.openBlock(), vueExports.createBlock(_sfc_main$c, vueExports.mergeProps({
                                key: 1,
                                size: vueExports.unref(props).ui?.linkLeadingAvatarSize || ui.value.linkLeadingAvatarSize()
                              }, { ref_for: true }, item.avatar, {
                                "data-slot": "linkLeadingAvatar",
                                class: ui.value.linkLeadingAvatar({ class: [vueExports.unref(props).ui?.linkLeadingAvatar, item.ui?.linkLeadingAvatar], active: item.active ?? index === vueExports.unref(props).items.length - 1 })
                              }), null, 16, ["size", "class"])) : vueExports.createCommentVNode("", true)
                            ]),
                            vueExports.unref(get)(item, vueExports.unref(props).labelKey) || !!slots[item.slot ? `${item.slot}-label` : "item-label"] ? (vueExports.openBlock(), vueExports.createBlock("span", {
                              key: 0,
                              "data-slot": "linkLabel",
                              class: ui.value.linkLabel({ class: [vueExports.unref(props).ui?.linkLabel, item.ui?.linkLabel] })
                            }, [
                              vueExports.renderSlot(_ctx.$slots, item.slot ? `${item.slot}-label` : "item-label", {
                                item,
                                active: item.active ?? index === vueExports.unref(props).items.length - 1,
                                index
                              }, () => [
                                vueExports.createTextVNode(vueExports.toDisplayString(vueExports.unref(get)(item, vueExports.unref(props).labelKey)), 1)
                              ])
                            ], 2)) : vueExports.createCommentVNode("", true),
                            vueExports.renderSlot(_ctx.$slots, item.slot ? `${item.slot}-trailing` : "item-trailing", {
                              item,
                              active: item.active ?? index === vueExports.unref(props).items.length - 1,
                              index
                            })
                          ])
                        ]),
                        _: 2
                      }, 1040, ["aria-current", "class"])
                    ];
                  }
                }),
                _: 2
              }, _parent2, _scopeId));
              _push2(`</li>`);
              if (index < vueExports.unref(props).items.length - 1) {
                _push2(`<li role="presentation" aria-hidden="true" data-slot="separator" class="${serverRenderer_cjs_prodExports.ssrRenderClass(ui.value.separator({ class: [vueExports.unref(props).ui?.separator, item.ui?.separator] }))}"${_scopeId}>`);
                serverRenderer_cjs_prodExports.ssrRenderSlot(_ctx.$slots, "separator", { ui: ui.value }, () => {
                  _push2(serverRenderer_cjs_prodExports.ssrRenderComponent(_sfc_main$f, {
                    name: separatorIcon.value,
                    "data-slot": "separatorIcon",
                    class: ui.value.separatorIcon({ class: [vueExports.unref(props).ui?.separatorIcon, item.ui?.separatorIcon] })
                  }, null, _parent2, _scopeId));
                }, _push2, _parent2, _scopeId);
                _push2(`</li>`);
              } else {
                _push2(`<!---->`);
              }
              _push2(`<!--]-->`);
            });
            _push2(`<!--]--></ol>`);
          } else {
            return [
              vueExports.createVNode("ol", {
                "data-slot": "list",
                class: ui.value.list({ class: vueExports.unref(props).ui?.list })
              }, [
                (vueExports.openBlock(true), vueExports.createBlock(vueExports.Fragment, null, vueExports.renderList(vueExports.unref(props).items, (item, index) => {
                  return vueExports.openBlock(), vueExports.createBlock(vueExports.Fragment, { key: index }, [
                    vueExports.createVNode("li", {
                      "data-slot": "item",
                      class: ui.value.item({ class: [vueExports.unref(props).ui?.item, item.ui?.item] })
                    }, [
                      vueExports.createVNode(_sfc_main$a, vueExports.mergeProps({ ref_for: true }, vueExports.unref(pickLinkProps)(item), { custom: "" }), {
                        default: vueExports.withCtx(({ active, ...slotProps }) => [
                          vueExports.createVNode(_sfc_main$b, vueExports.mergeProps({ ref_for: true }, slotProps, {
                            as: "span",
                            "aria-current": (item.active ?? active) && index === vueExports.unref(props).items.length - 1 ? "page" : void 0,
                            "data-slot": "link",
                            class: ui.value.link({ class: [vueExports.unref(props).ui?.link, item.ui?.link, item.class], active: item.active ?? index === vueExports.unref(props).items.length - 1, disabled: !!item.disabled, to: !!item.to })
                          }), {
                            default: vueExports.withCtx(() => [
                              vueExports.renderSlot(_ctx.$slots, item.slot || "item", {
                                item,
                                active: item.active ?? index === vueExports.unref(props).items.length - 1,
                                index,
                                ui: ui.value
                              }, () => [
                                vueExports.renderSlot(_ctx.$slots, item.slot ? `${item.slot}-leading` : "item-leading", {
                                  item,
                                  active: item.active ?? index === vueExports.unref(props).items.length - 1,
                                  index,
                                  ui: ui.value
                                }, () => [
                                  item.icon ? (vueExports.openBlock(), vueExports.createBlock(_sfc_main$f, {
                                    key: 0,
                                    name: item.icon,
                                    "data-slot": "linkLeadingIcon",
                                    class: ui.value.linkLeadingIcon({ class: [vueExports.unref(props).ui?.linkLeadingIcon, item.ui?.linkLeadingIcon], active: item.active ?? index === vueExports.unref(props).items.length - 1 })
                                  }, null, 8, ["name", "class"])) : item.avatar ? (vueExports.openBlock(), vueExports.createBlock(_sfc_main$c, vueExports.mergeProps({
                                    key: 1,
                                    size: vueExports.unref(props).ui?.linkLeadingAvatarSize || ui.value.linkLeadingAvatarSize()
                                  }, { ref_for: true }, item.avatar, {
                                    "data-slot": "linkLeadingAvatar",
                                    class: ui.value.linkLeadingAvatar({ class: [vueExports.unref(props).ui?.linkLeadingAvatar, item.ui?.linkLeadingAvatar], active: item.active ?? index === vueExports.unref(props).items.length - 1 })
                                  }), null, 16, ["size", "class"])) : vueExports.createCommentVNode("", true)
                                ]),
                                vueExports.unref(get)(item, vueExports.unref(props).labelKey) || !!slots[item.slot ? `${item.slot}-label` : "item-label"] ? (vueExports.openBlock(), vueExports.createBlock("span", {
                                  key: 0,
                                  "data-slot": "linkLabel",
                                  class: ui.value.linkLabel({ class: [vueExports.unref(props).ui?.linkLabel, item.ui?.linkLabel] })
                                }, [
                                  vueExports.renderSlot(_ctx.$slots, item.slot ? `${item.slot}-label` : "item-label", {
                                    item,
                                    active: item.active ?? index === vueExports.unref(props).items.length - 1,
                                    index
                                  }, () => [
                                    vueExports.createTextVNode(vueExports.toDisplayString(vueExports.unref(get)(item, vueExports.unref(props).labelKey)), 1)
                                  ])
                                ], 2)) : vueExports.createCommentVNode("", true),
                                vueExports.renderSlot(_ctx.$slots, item.slot ? `${item.slot}-trailing` : "item-trailing", {
                                  item,
                                  active: item.active ?? index === vueExports.unref(props).items.length - 1,
                                  index
                                })
                              ])
                            ]),
                            _: 2
                          }, 1040, ["aria-current", "class"])
                        ]),
                        _: 2
                      }, 1040)
                    ], 2),
                    index < vueExports.unref(props).items.length - 1 ? (vueExports.openBlock(), vueExports.createBlock("li", {
                      key: 0,
                      role: "presentation",
                      "aria-hidden": "true",
                      "data-slot": "separator",
                      class: ui.value.separator({ class: [vueExports.unref(props).ui?.separator, item.ui?.separator] })
                    }, [
                      vueExports.renderSlot(_ctx.$slots, "separator", { ui: ui.value }, () => [
                        vueExports.createVNode(_sfc_main$f, {
                          name: separatorIcon.value,
                          "data-slot": "separatorIcon",
                          class: ui.value.separatorIcon({ class: [vueExports.unref(props).ui?.separatorIcon, item.ui?.separatorIcon] })
                        }, null, 8, ["name", "class"])
                      ])
                    ], 2)) : vueExports.createCommentVNode("", true)
                  ], 64);
                }), 128))
              ], 2)
            ];
          }
        }),
        _: 3
      }, _parent));
    };
  }
};
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = vueExports.useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("../node_modules/.pnpm/@nuxt+ui@4.8.0_@internationalized+date@3.12.1_@internationalized+number@3.6.6_@tiptap+e_d719e0a183cea98ed15f9fdb5506ba26/node_modules/@nuxt/ui/dist/runtime/components/Breadcrumb.vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};

export { _sfc_main as _, _sfc_main$1 as a };
//# sourceMappingURL=Breadcrumb-DUkxvNFs.mjs.map
