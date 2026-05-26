import { ac as useComponentProps, a7 as useAppConfig, ax as vueExports, a5 as tv, z as formBusInjectionKey, J as formStateInjectionKey, B as formErrorsInjectionKey, D as formInputsInjectionKey, G as formLoadingInjectionKey, H as formOptionsInjectionKey, a2 as serverRenderer_cjs_prodExports, R as inputIdInjectionKey, C as formFieldInjectionKey, e as Primitive, au as useVModel, al as useLocale$1, aj as useForwardProps, a1 as reactivePick, ah as useFormField, ag as useFieldGroup, m as _sfc_main$9, ae as useEventBus, ai as useForwardExpose, ap as usePrimitiveElement, S as isNullish, Q as injectConfigProviderContext, a6 as unrefElement, a0 as reactiveComputed, r as createContext, L as getActiveElement, aw as vue, V as VisuallyHidden_default, t as createEventHook } from './server.mjs';

function clamp(value, min = Number.NEGATIVE_INFINITY, max = Number.POSITIVE_INFINITY) {
  return Math.min(max, Math.max(min, value));
}
function roundToStepPrecision(value, step) {
  let roundedValue = value;
  const stepString = step.toString();
  const pointIndex = stepString.indexOf(".");
  const precision = pointIndex >= 0 ? stepString.length - pointIndex : 0;
  if (precision > 0) {
    const pow = 10 ** precision;
    roundedValue = Math.round(roundedValue * pow) / pow;
  }
  return roundedValue;
}
function snapValueToStep(value, min, max, step) {
  min = Number(min);
  max = Number(max);
  const remainder = (value - (Number.isNaN(min) ? 0 : min)) % step;
  let snappedValue = roundToStepPrecision(Math.abs(remainder) * 2 >= step ? value + Math.sign(remainder) * (step - Math.abs(remainder)) : value - remainder, step);
  if (!Number.isNaN(min)) {
    if (snappedValue < min) snappedValue = min;
    else if (!Number.isNaN(max) && snappedValue > max) snappedValue = min + Math.floor(roundToStepPrecision((max - min) / step, step)) * step;
  } else if (!Number.isNaN(max) && snappedValue > max) snappedValue = Math.floor(roundToStepPrecision(max / step, step)) * step;
  snappedValue = roundToStepPrecision(snappedValue, step);
  return snappedValue;
}
function useFormControl(el) {
  return vueExports.computed(() => vueExports.toValue(el) ? Boolean(unrefElement(el)?.closest("form")) : true);
}
let count = 0;
function useId(deterministicId, prefix = "reka") {
  let id;
  if ("useId" in vue) id = vueExports.useId?.();
  else {
    const configProviderContext = injectConfigProviderContext({ useId: void 0 });
    id = configProviderContext.useId?.() ?? `${++count}`;
  }
  return prefix ? `${prefix}-${id}` : id;
}
function useLocale(locale) {
  const context = injectConfigProviderContext({ locale: vueExports.ref("en") });
  return vueExports.computed(() => locale?.value || context.locale?.value || "en");
}
var VisuallyHiddenInputBubble_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ vueExports.defineComponent({
  inheritAttrs: false,
  __name: "VisuallyHiddenInputBubble",
  props: {
    name: {
      type: String,
      required: true
    },
    value: {
      type: null,
      required: true
    },
    checked: {
      type: Boolean,
      required: false,
      default: void 0
    },
    required: {
      type: Boolean,
      required: false
    },
    disabled: {
      type: Boolean,
      required: false
    },
    feature: {
      type: String,
      required: false,
      default: "fully-hidden"
    }
  },
  setup(__props) {
    const props = __props;
    const { primitiveElement, currentElement } = usePrimitiveElement();
    const valueState = vueExports.computed(() => props.checked ?? props.value);
    vueExports.watch(valueState, (cur, prev) => {
      if (!currentElement.value) return;
      const input = currentElement.value;
      const inputProto = (void 0).HTMLInputElement.prototype;
      const descriptor = Object.getOwnPropertyDescriptor(inputProto, "value");
      const setValue = descriptor.set;
      if (setValue && cur !== prev) {
        const inputEvent = new Event("input", { bubbles: true });
        const changeEvent = new Event("change", { bubbles: true });
        setValue.call(input, cur);
        input.dispatchEvent(inputEvent);
        input.dispatchEvent(changeEvent);
      }
    });
    return (_ctx, _cache) => {
      return vueExports.openBlock(), vueExports.createBlock(VisuallyHidden_default, vueExports.mergeProps({
        ref_key: "primitiveElement",
        ref: primitiveElement
      }, {
        ...props,
        ..._ctx.$attrs
      }, { as: "input" }), null, 16);
    };
  }
});
var VisuallyHiddenInputBubble_default = VisuallyHiddenInputBubble_vue_vue_type_script_setup_true_lang_default;
var VisuallyHiddenInput_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ vueExports.defineComponent({
  inheritAttrs: false,
  __name: "VisuallyHiddenInput",
  props: {
    name: {
      type: String,
      required: true
    },
    value: {
      type: null,
      required: true
    },
    checked: {
      type: Boolean,
      required: false,
      default: void 0
    },
    required: {
      type: Boolean,
      required: false
    },
    disabled: {
      type: Boolean,
      required: false
    },
    feature: {
      type: String,
      required: false,
      default: "fully-hidden"
    }
  },
  setup(__props) {
    const props = __props;
    const isFormArrayEmptyAndRequired = vueExports.computed(() => typeof props.value === "object" && Array.isArray(props.value) && props.value.length === 0 && props.required);
    const parsedValue = vueExports.computed(() => {
      if (typeof props.value === "string" || typeof props.value === "number" || typeof props.value === "boolean" || props.value === null || props.value === void 0) return [{
        name: props.name,
        value: props.value
      }];
      else if (typeof props.value === "object" && Array.isArray(props.value)) return props.value.flatMap((obj, index) => {
        if (typeof obj === "object") return Object.entries(obj).map(([key, value]) => ({
          name: `${props.name}[${index}][${key}]`,
          value
        }));
        else return {
          name: `${props.name}[${index}]`,
          value: obj
        };
      });
      else if (props.value !== null && typeof props.value === "object" && !Array.isArray(props.value)) return Object.entries(props.value).map(([key, value]) => ({
        name: `${props.name}[${key}]`,
        value
      }));
      return [];
    });
    return (_ctx, _cache) => {
      return vueExports.openBlock(), vueExports.createElementBlock(vueExports.Fragment, null, [vueExports.createCommentVNode(" We render single input if it's required "), isFormArrayEmptyAndRequired.value ? (vueExports.openBlock(), vueExports.createBlock(VisuallyHiddenInputBubble_default, vueExports.mergeProps({ key: _ctx.name }, {
        ...props,
        ..._ctx.$attrs
      }, {
        name: _ctx.name,
        value: _ctx.value
      }), null, 16, ["name", "value"])) : (vueExports.openBlock(true), vueExports.createElementBlock(vueExports.Fragment, { key: 1 }, vueExports.renderList(parsedValue.value, (parsed) => {
        return vueExports.openBlock(), vueExports.createBlock(VisuallyHiddenInputBubble_default, vueExports.mergeProps({ key: parsed.name }, { ref_for: true }, {
          ...props,
          ..._ctx.$attrs
        }, {
          name: parsed.name,
          value: parsed.value
        }), null, 16, ["name", "value"]);
      }), 128))], 2112);
    };
  }
});
var VisuallyHiddenInput_default = VisuallyHiddenInput_vue_vue_type_script_setup_true_lang_default;
var Label_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ vueExports.defineComponent({
  __name: "Label",
  props: {
    for: {
      type: String,
      required: false
    },
    asChild: {
      type: Boolean,
      required: false
    },
    as: {
      type: null,
      required: false,
      default: "label"
    }
  },
  setup(__props) {
    const props = __props;
    useForwardExpose();
    return (_ctx, _cache) => {
      return vueExports.openBlock(), vueExports.createBlock(vueExports.unref(Primitive), vueExports.mergeProps(props, { onMousedown: _cache[0] || (_cache[0] = (event) => {
        if (!event.defaultPrevented && event.detail > 1) event.preventDefault();
      }) }), {
        default: vueExports.withCtx(() => [vueExports.renderSlot(_ctx.$slots, "default")]),
        _: 3
      }, 16);
    };
  }
});
var Label_default = Label_vue_vue_type_script_setup_true_lang_default;
let $1dfb119a85e764e5$var$formatterCache = /* @__PURE__ */ new Map();
let $1dfb119a85e764e5$var$supportsSignDisplay = false;
try {
  $1dfb119a85e764e5$var$supportsSignDisplay = new Intl.NumberFormat("de-DE", {
    signDisplay: "exceptZero"
  }).resolvedOptions().signDisplay === "exceptZero";
} catch {
}
let $1dfb119a85e764e5$var$supportsUnit = false;
try {
  $1dfb119a85e764e5$var$supportsUnit = new Intl.NumberFormat("de-DE", {
    style: "unit",
    unit: "degree"
  }).resolvedOptions().style === "unit";
} catch {
}
const $1dfb119a85e764e5$var$UNITS = {
  degree: {
    narrow: {
      default: "°",
      "ja-JP": " 度",
      "zh-TW": "度",
      "sl-SI": " °"
    }
  }
};
class $1dfb119a85e764e5$export$cc77c4ff7e8673c5 {
  constructor(locale, options = {}) {
    this.numberFormatter = $1dfb119a85e764e5$var$getCachedNumberFormatter(locale, options);
    this.options = options;
  }
  /** Formats a number value as a string, according to the locale and options provided to the constructor. */
  format(value) {
    let res = "";
    if (!$1dfb119a85e764e5$var$supportsSignDisplay && this.options.signDisplay != null) res = $1dfb119a85e764e5$export$711b50b3c525e0f2(this.numberFormatter, this.options.signDisplay, value);
    else res = this.numberFormatter.format(value);
    if (this.options.style === "unit" && !$1dfb119a85e764e5$var$supportsUnit) {
      let { unit, unitDisplay = "short", locale } = this.resolvedOptions();
      if (!unit) return res;
      let values = $1dfb119a85e764e5$var$UNITS[unit]?.[unitDisplay];
      res += values[locale] || values.default;
    }
    return res;
  }
  /** Formats a number to an array of parts such as separators, digits, punctuation, and more. */
  formatToParts(value) {
    return this.numberFormatter.formatToParts(value);
  }
  /** Formats a number range as a string. */
  formatRange(start, end) {
    if (typeof this.numberFormatter.formatRange === "function") return this.numberFormatter.formatRange(start, end);
    if (end < start) throw new RangeError("End date must be >= start date");
    return `${this.format(start)} – ${this.format(end)}`;
  }
  /** Formats a number range as an array of parts. */
  formatRangeToParts(start, end) {
    if (typeof this.numberFormatter.formatRangeToParts === "function") return this.numberFormatter.formatRangeToParts(start, end);
    if (end < start) throw new RangeError("End date must be >= start date");
    let startParts = this.numberFormatter.formatToParts(start);
    let endParts = this.numberFormatter.formatToParts(end);
    return [
      ...startParts.map((p) => ({
        ...p,
        source: "startRange"
      })),
      {
        type: "literal",
        value: " – ",
        source: "shared"
      },
      ...endParts.map((p) => ({
        ...p,
        source: "endRange"
      }))
    ];
  }
  /** Returns the resolved formatting options based on the values passed to the constructor. */
  resolvedOptions() {
    let options = this.numberFormatter.resolvedOptions();
    if (!$1dfb119a85e764e5$var$supportsSignDisplay && this.options.signDisplay != null) options = {
      ...options,
      signDisplay: this.options.signDisplay
    };
    if (!$1dfb119a85e764e5$var$supportsUnit && this.options.style === "unit") options = {
      ...options,
      style: "unit",
      unit: this.options.unit,
      unitDisplay: this.options.unitDisplay
    };
    return options;
  }
}
function $1dfb119a85e764e5$var$getCachedNumberFormatter(locale, options = {}) {
  let { numberingSystem } = options;
  if (numberingSystem && locale.includes("-nu-")) {
    if (!locale.includes("-u-")) locale += "-u-";
    locale += `-nu-${numberingSystem}`;
  }
  if (options.style === "unit" && !$1dfb119a85e764e5$var$supportsUnit) {
    let { unit, unitDisplay = "short" } = options;
    if (!unit) throw new Error('unit option must be provided with style: "unit"');
    if (!$1dfb119a85e764e5$var$UNITS[unit]?.[unitDisplay]) throw new Error(`Unsupported unit ${unit} with unitDisplay = ${unitDisplay}`);
    options = {
      ...options,
      style: "decimal"
    };
  }
  let cacheKey = locale + (options ? Object.entries(options).sort((a, b) => a[0] < b[0] ? -1 : 1).join() : "");
  if ($1dfb119a85e764e5$var$formatterCache.has(cacheKey)) return $1dfb119a85e764e5$var$formatterCache.get(cacheKey);
  let numberFormatter = new Intl.NumberFormat(locale, options);
  $1dfb119a85e764e5$var$formatterCache.set(cacheKey, numberFormatter);
  return numberFormatter;
}
function $1dfb119a85e764e5$export$711b50b3c525e0f2(numberFormat, signDisplay, num) {
  if (signDisplay === "auto") return numberFormat.format(num);
  else if (signDisplay === "never") return numberFormat.format(Math.abs(num));
  else {
    let needsPositiveSign = false;
    if (signDisplay === "always") needsPositiveSign = num > 0 || Object.is(num, 0);
    else if (signDisplay === "exceptZero") {
      if (Object.is(num, -0) || Object.is(num, 0)) num = Math.abs(num);
      else needsPositiveSign = num > 0;
    }
    if (needsPositiveSign) {
      let negative = numberFormat.format(-num);
      let noSign = numberFormat.format(num);
      let minus = negative.replace(noSign, "").replace(/\u200e|\u061C/, "");
      if ([
        ...minus
      ].length !== 1) console.warn("@react-aria/i18n polyfill for NumberFormat signDisplay: Unsupported case");
      let positive = negative.replace(noSign, "!!!").replace(minus, "+").replace("!!!", noSign);
      return positive;
    } else return numberFormat.format(num);
  }
}
const $eb76cf4feb040f77$var$CURRENCY_SIGN_REGEX = new RegExp("^.*\\(.*\\).*$");
const $eb76cf4feb040f77$var$NUMBERING_SYSTEMS = [
  "latn",
  "arab",
  "hanidec",
  "deva",
  "beng",
  "fullwide"
];
class $eb76cf4feb040f77$export$cd11ab140839f11d {
  constructor(locale, options = {}) {
    this.locale = locale;
    this.options = options;
  }
  /**
  * Parses the given string to a number. Returns NaN if a valid number could not be parsed.
  */
  parse(value) {
    return $eb76cf4feb040f77$var$getNumberParserImpl(this.locale, this.options, value).parse(value);
  }
  /**
  * Returns whether the given string could potentially be a valid number. This should be used to
  * validate user input as the user types. If a `minValue` or `maxValue` is provided, the validity
  * of the minus/plus sign characters can be checked.
  */
  isValidPartialNumber(value, minValue, maxValue) {
    return $eb76cf4feb040f77$var$getNumberParserImpl(this.locale, this.options, value).isValidPartialNumber(value, minValue, maxValue);
  }
  /**
  * Returns a numbering system for which the given string is valid in the current locale.
  * If no numbering system could be detected, the default numbering system for the current
  * locale is returned.
  */
  getNumberingSystem(value) {
    return $eb76cf4feb040f77$var$getNumberParserImpl(this.locale, this.options, value).options.numberingSystem;
  }
}
const $eb76cf4feb040f77$var$numberParserCache = /* @__PURE__ */ new Map();
function $eb76cf4feb040f77$var$getNumberParserImpl(locale, options, value) {
  let defaultParser = $eb76cf4feb040f77$var$getCachedNumberParser(locale, options);
  if (!locale.includes("-nu-") && !defaultParser.isValidPartialNumber(value)) {
    for (let numberingSystem of $eb76cf4feb040f77$var$NUMBERING_SYSTEMS) if (numberingSystem !== defaultParser.options.numberingSystem) {
      let parser = $eb76cf4feb040f77$var$getCachedNumberParser(locale + (locale.includes("-u-") ? "-nu-" : "-u-nu-") + numberingSystem, options);
      if (parser.isValidPartialNumber(value)) return parser;
    }
  }
  return defaultParser;
}
function $eb76cf4feb040f77$var$getCachedNumberParser(locale, options) {
  let cacheKey = locale + (options ? Object.entries(options).sort((a, b) => a[0] < b[0] ? -1 : 1).join() : "");
  let parser = $eb76cf4feb040f77$var$numberParserCache.get(cacheKey);
  if (!parser) {
    parser = new $eb76cf4feb040f77$var$NumberParserImpl(locale, options);
    $eb76cf4feb040f77$var$numberParserCache.set(cacheKey, parser);
  }
  return parser;
}
class $eb76cf4feb040f77$var$NumberParserImpl {
  constructor(locale, options = {}) {
    this.locale = locale;
    if (options.roundingIncrement !== 1 && options.roundingIncrement != null) {
      if (options.maximumFractionDigits == null && options.minimumFractionDigits == null) {
        options.maximumFractionDigits = 0;
        options.minimumFractionDigits = 0;
      } else if (options.maximumFractionDigits == null) options.maximumFractionDigits = options.minimumFractionDigits;
      else if (options.minimumFractionDigits == null) options.minimumFractionDigits = options.maximumFractionDigits;
    }
    this.formatter = new Intl.NumberFormat(locale, options);
    this.options = this.formatter.resolvedOptions();
    this.symbols = $eb76cf4feb040f77$var$getSymbols(locale, this.formatter, this.options, options);
    if (this.options.style === "percent" && ((this.options.minimumFractionDigits ?? 0) > 18 || (this.options.maximumFractionDigits ?? 0) > 18)) console.warn("NumberParser cannot handle percentages with greater than 18 decimal places, please reduce the number in your options.");
  }
  parse(value) {
    let isGroupSymbolAllowed = this.formatter.resolvedOptions().useGrouping;
    let fullySanitizedValue = this.sanitize(value);
    if (!isGroupSymbolAllowed && this.symbols.group && fullySanitizedValue.includes(this.symbols.group)) return NaN;
    else if (this.symbols.group) fullySanitizedValue = fullySanitizedValue.replaceAll(this.symbols.group, "");
    if (this.symbols.decimal) fullySanitizedValue = fullySanitizedValue.replace(this.symbols.decimal, ".");
    if (this.symbols.minusSign) fullySanitizedValue = fullySanitizedValue.replace(this.symbols.minusSign, "-");
    fullySanitizedValue = fullySanitizedValue.replace(this.symbols.numeral, this.symbols.index);
    if (this.options.style === "percent") {
      let isNegative = fullySanitizedValue.indexOf("-");
      fullySanitizedValue = fullySanitizedValue.replace("-", "");
      fullySanitizedValue = fullySanitizedValue.replace("+", "");
      let index = fullySanitizedValue.indexOf(".");
      if (index === -1) index = fullySanitizedValue.length;
      fullySanitizedValue = fullySanitizedValue.replace(".", "");
      if (index - 2 === 0) fullySanitizedValue = `0.${fullySanitizedValue}`;
      else if (index - 2 === -1) fullySanitizedValue = `0.0${fullySanitizedValue}`;
      else if (index - 2 === -2) fullySanitizedValue = "0.00";
      else fullySanitizedValue = `${fullySanitizedValue.slice(0, index - 2)}.${fullySanitizedValue.slice(index - 2)}`;
      if (isNegative > -1) fullySanitizedValue = `-${fullySanitizedValue}`;
    }
    let newValue = fullySanitizedValue ? +fullySanitizedValue : NaN;
    if (isNaN(newValue)) return NaN;
    if (this.options.style === "percent") {
      let options = {
        ...this.options,
        style: "decimal",
        minimumFractionDigits: Math.min((this.options.minimumFractionDigits ?? 0) + 2, 20),
        maximumFractionDigits: Math.min((this.options.maximumFractionDigits ?? 0) + 2, 20)
      };
      return new $eb76cf4feb040f77$export$cd11ab140839f11d(this.locale, options).parse(new $1dfb119a85e764e5$export$cc77c4ff7e8673c5(this.locale, options).format(newValue));
    }
    if (this.options.currencySign === "accounting" && $eb76cf4feb040f77$var$CURRENCY_SIGN_REGEX.test(value)) newValue = -1 * newValue;
    return newValue;
  }
  sanitize(value) {
    let isGroupSymbolAllowed = this.formatter.resolvedOptions().useGrouping;
    if (this.symbols.noNumeralUnits.length > 0 && this.symbols.noNumeralUnits.find((obj) => obj.unit === value)) return this.symbols.noNumeralUnits.find((obj) => obj.unit === value).value.toString();
    value = value.replace(this.symbols.literals, "");
    if (this.symbols.minusSign) value = value.replace("-", this.symbols.minusSign);
    if (this.options.numberingSystem === "arab") {
      if (this.symbols.decimal) {
        value = $eb76cf4feb040f77$var$replaceAll(value, ",", this.symbols.decimal);
        value = $eb76cf4feb040f77$var$replaceAll(value, String.fromCharCode(1548), this.symbols.decimal);
      }
      if (this.symbols.group && isGroupSymbolAllowed) value = $eb76cf4feb040f77$var$replaceAll(value, ".", this.symbols.group);
    }
    if (this.symbols.group === "’" && value.includes("'") && isGroupSymbolAllowed) value = $eb76cf4feb040f77$var$replaceAll(value, "'", this.symbols.group);
    if (this.options.locale === "fr-FR" && this.symbols.group && isGroupSymbolAllowed) {
      value = $eb76cf4feb040f77$var$replaceAll(value, " ", this.symbols.group);
      value = $eb76cf4feb040f77$var$replaceAll(value, /\u00A0/g, this.symbols.group);
    }
    return value;
  }
  isValidPartialNumber(value, minValue = -Infinity, maxValue = Infinity) {
    let isGroupSymbolAllowed = this.formatter.resolvedOptions().useGrouping;
    value = this.sanitize(value);
    if (this.symbols.minusSign && value.startsWith(this.symbols.minusSign) && minValue < 0) value = value.slice(this.symbols.minusSign.length);
    else if (this.symbols.plusSign && value.startsWith(this.symbols.plusSign) && maxValue > 0) value = value.slice(this.symbols.plusSign.length);
    if (this.symbols.decimal && value.indexOf(this.symbols.decimal) > -1 && this.options.maximumFractionDigits === 0) return false;
    if (this.symbols.group && isGroupSymbolAllowed) value = $eb76cf4feb040f77$var$replaceAll(value, this.symbols.group, "");
    value = value.replace(this.symbols.numeral, "");
    if (this.symbols.decimal) value = value.replace(this.symbols.decimal, "");
    return value.length === 0;
  }
}
const $eb76cf4feb040f77$var$nonLiteralParts = /* @__PURE__ */ new Set([
  "decimal",
  "fraction",
  "integer",
  "minusSign",
  "plusSign",
  "group"
]);
const $eb76cf4feb040f77$var$pluralNumbers = [
  0,
  4,
  2,
  1,
  11,
  20,
  3,
  7,
  100,
  21,
  0.1,
  1.1
];
function $eb76cf4feb040f77$var$getSymbols(locale, formatter, intlOptions, originalOptions) {
  let symbolFormatter = new Intl.NumberFormat(locale, {
    ...intlOptions,
    // Resets so we get the full range of symbols
    minimumSignificantDigits: 1,
    maximumSignificantDigits: 21,
    roundingIncrement: 1,
    roundingPriority: "auto",
    roundingMode: "halfExpand",
    useGrouping: true
  });
  let allParts = symbolFormatter.formatToParts(-10000.111);
  let posAllParts = symbolFormatter.formatToParts(10000.111);
  let pluralParts = $eb76cf4feb040f77$var$pluralNumbers.map((n) => symbolFormatter.formatToParts(n));
  let noNumeralUnits = pluralParts.map((p, i) => {
    let unit = p.find((p2) => p2.type === "unit");
    if (unit && !p.some((p2) => p2.type === "integer" || p2.type === "fraction")) return {
      unit: unit.value,
      value: $eb76cf4feb040f77$var$pluralNumbers[i]
    };
    return null;
  }).filter((p) => !!p);
  let minusSign = allParts.find((p) => p.type === "minusSign")?.value ?? "-";
  let plusSign = posAllParts.find((p) => p.type === "plusSign")?.value;
  if (!plusSign && (originalOptions?.signDisplay === "exceptZero" || originalOptions?.signDisplay === "always")) plusSign = "+";
  let decimalParts = new Intl.NumberFormat(locale, {
    ...intlOptions,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).formatToParts(1e-3);
  let decimal = decimalParts.find((p) => p.type === "decimal")?.value;
  let group = allParts.find((p) => p.type === "group")?.value;
  let allPartsLiterals = allParts.filter((p) => !$eb76cf4feb040f77$var$nonLiteralParts.has(p.type)).map((p) => $eb76cf4feb040f77$var$escapeRegex(p.value));
  let pluralPartsLiterals = pluralParts.flatMap((p) => p.filter((p2) => !$eb76cf4feb040f77$var$nonLiteralParts.has(p2.type)).map((p2) => $eb76cf4feb040f77$var$escapeRegex(p2.value)));
  let sortedLiterals = [
    .../* @__PURE__ */ new Set([
      ...allPartsLiterals,
      ...pluralPartsLiterals
    ])
  ].sort((a, b) => b.length - a.length);
  let literals = sortedLiterals.length === 0 ? new RegExp("\\p{White_Space}|\\p{Cf}", "gu") : new RegExp(`${sortedLiterals.join("|")}|\\p{White_Space}|\\p{Cf}`, "gu");
  let numerals = [
    ...new Intl.NumberFormat(intlOptions.locale, {
      useGrouping: false
    }).format(9876543210)
  ].reverse();
  let indexes = new Map(numerals.map((d, i) => [
    d,
    i
  ]));
  let numeral = new RegExp(`[${numerals.join("")}]`, "g");
  let index = (d) => String(indexes.get(d));
  return {
    minusSign,
    plusSign,
    decimal,
    group,
    literals,
    numeral,
    numerals,
    index,
    noNumeralUnits
  };
}
function $eb76cf4feb040f77$var$replaceAll(str, find, replace) {
  if (str.replaceAll) return str.replaceAll(find, replace);
  return str.split(find).join(replace);
}
function $eb76cf4feb040f77$var$escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function usePressedHold(options) {
  const { disabled } = options;
  vueExports.ref();
  const triggerHook = createEventHook();
  const isPressed = vueExports.ref(false);
  vueExports.computed(() => unrefElement(options.target));
  return {
    isPressed,
    onTrigger: triggerHook.on
  };
}
function useNumberFormatter(locale, options = vueExports.ref({})) {
  return reactiveComputed(() => new $1dfb119a85e764e5$export$cc77c4ff7e8673c5(locale.value, options.value));
}
function useNumberParser(locale, options = vueExports.ref({})) {
  return reactiveComputed(() => new $eb76cf4feb040f77$export$cd11ab140839f11d(locale.value, options.value));
}
function handleDecimalOperation(operator, value1, value2) {
  let result = operator === "+" ? value1 + value2 : value1 - value2;
  if (value1 % 1 !== 0 || value2 % 1 !== 0) {
    const value1Decimal = value1.toString().split(".");
    const value2Decimal = value2.toString().split(".");
    const value1DecimalLength = value1Decimal[1] && value1Decimal[1].length || 0;
    const value2DecimalLength = value2Decimal[1] && value2Decimal[1].length || 0;
    const multiplier = 10 ** Math.max(value1DecimalLength, value2DecimalLength);
    value1 = Math.round(value1 * multiplier);
    value2 = Math.round(value2 * multiplier);
    result = operator === "+" ? value1 + value2 : value1 - value2;
    result /= multiplier;
  }
  return result;
}
const [injectNumberFieldRootContext, provideNumberFieldRootContext] = /* @__PURE__ */ createContext("NumberFieldRoot");
var NumberFieldRoot_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ vueExports.defineComponent({
  inheritAttrs: false,
  __name: "NumberFieldRoot",
  props: {
    defaultValue: {
      type: Number,
      required: false,
      default: void 0
    },
    modelValue: {
      type: [Number, null],
      required: false
    },
    min: {
      type: Number,
      required: false
    },
    max: {
      type: Number,
      required: false
    },
    step: {
      type: Number,
      required: false,
      default: 1
    },
    stepSnapping: {
      type: Boolean,
      required: false,
      default: true
    },
    focusOnChange: {
      type: Boolean,
      required: false,
      default: true
    },
    formatOptions: {
      type: null,
      required: false
    },
    locale: {
      type: String,
      required: false
    },
    disabled: {
      type: Boolean,
      required: false
    },
    readonly: {
      type: Boolean,
      required: false
    },
    disableWheelChange: {
      type: Boolean,
      required: false
    },
    invertWheelChange: {
      type: Boolean,
      required: false
    },
    id: {
      type: String,
      required: false
    },
    asChild: {
      type: Boolean,
      required: false
    },
    as: {
      type: null,
      required: false,
      default: "div"
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
    const { disabled, readonly, disableWheelChange, invertWheelChange, min, max, step, stepSnapping, formatOptions, id, locale: propLocale } = vueExports.toRefs(props);
    const modelValue = useVModel(props, "modelValue", emits, {
      defaultValue: props.defaultValue,
      passive: props.modelValue === void 0
    });
    const { primitiveElement, currentElement } = usePrimitiveElement();
    const locale = useLocale(propLocale);
    const isFormControl = useFormControl(currentElement);
    const inputEl = vueExports.ref();
    const isDecreaseDisabled = vueExports.computed(() => !isNullish(modelValue.value) && (clampInputValue(modelValue.value) === min.value || min.value && !isNaN(modelValue.value) ? handleDecimalOperation("-", modelValue.value, step.value) < min.value : false));
    const isIncreaseDisabled = vueExports.computed(() => !isNullish(modelValue.value) && (clampInputValue(modelValue.value) === max.value || max.value && !isNaN(modelValue.value) ? handleDecimalOperation("+", modelValue.value, step.value) > max.value : false));
    function handleChangingValue(type, multiplier = 1) {
      if (props.focusOnChange) inputEl.value?.focus();
      if (props.disabled || props.readonly) return;
      const currentInputValue = numberParser.parse(inputEl.value?.value ?? "");
      if (isNaN(currentInputValue)) modelValue.value = min.value ?? 0;
      else if (type === "increase") modelValue.value = clampInputValue(currentInputValue + (step.value ?? 1) * multiplier);
      else modelValue.value = clampInputValue(currentInputValue - (step.value ?? 1) * multiplier);
    }
    function handleIncrease(multiplier = 1) {
      handleChangingValue("increase", multiplier);
    }
    function handleDecrease(multiplier = 1) {
      handleChangingValue("decrease", multiplier);
    }
    function handleMinMaxValue(type) {
      if (type === "min" && min.value !== void 0) modelValue.value = clampInputValue(min.value);
      else if (type === "max" && max.value !== void 0) modelValue.value = clampInputValue(max.value);
    }
    const numberFormatter = useNumberFormatter(locale, formatOptions);
    const numberParser = useNumberParser(locale, formatOptions);
    const inputMode = vueExports.computed(() => {
      const hasDecimals = numberFormatter.resolvedOptions().maximumFractionDigits > 0;
      return hasDecimals ? "decimal" : "numeric";
    });
    const textValueFormatter = useNumberFormatter(locale, formatOptions);
    const textValue = vueExports.computed(() => isNullish(modelValue.value) || isNaN(modelValue.value) ? "" : textValueFormatter.format(modelValue.value));
    function validate(val) {
      return numberParser.isValidPartialNumber(val, min.value, max.value);
    }
    function setInputValue(val) {
      if (inputEl.value) inputEl.value.value = val;
    }
    function clampInputValue(val) {
      let clampedValue;
      if (step.value === void 0 || isNaN(step.value) || !stepSnapping.value) clampedValue = clamp(val, min.value, max.value);
      else clampedValue = snapValueToStep(val, min.value, max.value, step.value);
      clampedValue = numberParser.parse(numberFormatter.format(clampedValue));
      return clampedValue;
    }
    function applyInputValue(val) {
      const parsedValue = numberParser.parse(val);
      modelValue.value = isNaN(parsedValue) ? void 0 : clampInputValue(parsedValue);
      if (!val.length) return setInputValue(val);
      if (isNaN(parsedValue)) return setInputValue(textValue.value);
      return setInputValue(textValue.value);
    }
    provideNumberFieldRootContext({
      modelValue,
      handleDecrease,
      handleIncrease,
      handleMinMaxValue,
      inputMode,
      inputEl,
      onInputElement: (el) => inputEl.value = el,
      textValue,
      readonly,
      validate,
      applyInputValue,
      disabled,
      disableWheelChange,
      invertWheelChange,
      max,
      min,
      isDecreaseDisabled,
      isIncreaseDisabled,
      id
    });
    return (_ctx, _cache) => {
      return vueExports.openBlock(), vueExports.createBlock(vueExports.unref(Primitive), vueExports.mergeProps(_ctx.$attrs, {
        ref_key: "primitiveElement",
        ref: primitiveElement,
        role: "group",
        as: _ctx.as,
        "as-child": _ctx.asChild,
        "data-disabled": vueExports.unref(disabled) ? "" : void 0,
        "data-readonly": vueExports.unref(readonly) ? "" : void 0
      }), {
        default: vueExports.withCtx(() => [vueExports.renderSlot(_ctx.$slots, "default", {
          modelValue: vueExports.unref(modelValue),
          textValue: textValue.value,
          readonly: vueExports.unref(readonly)
        }), vueExports.unref(isFormControl) && _ctx.name ? (vueExports.openBlock(), vueExports.createBlock(vueExports.unref(VisuallyHiddenInput_default), {
          key: 0,
          type: "text",
          value: vueExports.unref(modelValue),
          name: _ctx.name,
          disabled: vueExports.unref(disabled),
          readonly: vueExports.unref(readonly),
          required: _ctx.required
        }, null, 8, [
          "value",
          "name",
          "disabled",
          "readonly",
          "required"
        ])) : vueExports.createCommentVNode("v-if", true)]),
        _: 3
      }, 16, [
        "as",
        "as-child",
        "data-disabled",
        "data-readonly"
      ]);
    };
  }
});
var NumberFieldRoot_default = NumberFieldRoot_vue_vue_type_script_setup_true_lang_default;
var NumberFieldDecrement_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ vueExports.defineComponent({
  __name: "NumberFieldDecrement",
  props: {
    disabled: {
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
      default: "button"
    }
  },
  setup(__props) {
    const props = __props;
    const rootContext = injectNumberFieldRootContext();
    const isDisabled = vueExports.computed(() => rootContext.disabled?.value || rootContext.readonly.value || props.disabled || rootContext.isDecreaseDisabled.value);
    const { primitiveElement, currentElement } = usePrimitiveElement();
    const { isPressed, onTrigger } = usePressedHold({
      target: currentElement,
      disabled: isDisabled
    });
    onTrigger(() => {
      rootContext.handleDecrease();
    });
    return (_ctx, _cache) => {
      return vueExports.openBlock(), vueExports.createBlock(vueExports.unref(Primitive), vueExports.mergeProps(props, {
        ref_key: "primitiveElement",
        ref: primitiveElement,
        tabindex: "-1",
        "aria-label": "Decrease",
        type: _ctx.as === "button" ? "button" : void 0,
        style: { userSelect: vueExports.unref(isPressed) ? "none" : void 0 },
        disabled: isDisabled.value ? "" : void 0,
        "data-disabled": isDisabled.value ? "" : void 0,
        "data-pressed": vueExports.unref(isPressed) ? "true" : void 0,
        onContextmenu: _cache[0] || (_cache[0] = vueExports.withModifiers(() => {
        }, ["prevent"]))
      }), {
        default: vueExports.withCtx(() => [vueExports.renderSlot(_ctx.$slots, "default")]),
        _: 3
      }, 16, [
        "type",
        "style",
        "disabled",
        "data-disabled",
        "data-pressed"
      ]);
    };
  }
});
var NumberFieldDecrement_default = NumberFieldDecrement_vue_vue_type_script_setup_true_lang_default;
var NumberFieldIncrement_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ vueExports.defineComponent({
  __name: "NumberFieldIncrement",
  props: {
    disabled: {
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
      default: "button"
    }
  },
  setup(__props) {
    const props = __props;
    const rootContext = injectNumberFieldRootContext();
    const isDisabled = vueExports.computed(() => rootContext.disabled?.value || rootContext.readonly.value || props.disabled || rootContext.isIncreaseDisabled.value);
    const { primitiveElement, currentElement } = usePrimitiveElement();
    const { isPressed, onTrigger } = usePressedHold({
      target: currentElement,
      disabled: isDisabled
    });
    onTrigger(() => {
      rootContext.handleIncrease();
    });
    return (_ctx, _cache) => {
      return vueExports.openBlock(), vueExports.createBlock(vueExports.unref(Primitive), vueExports.mergeProps(props, {
        ref_key: "primitiveElement",
        ref: primitiveElement,
        tabindex: "-1",
        "aria-label": "Increase",
        type: _ctx.as === "button" ? "button" : void 0,
        style: { userSelect: vueExports.unref(isPressed) ? "none" : void 0 },
        disabled: isDisabled.value ? "" : void 0,
        "data-disabled": isDisabled.value ? "" : void 0,
        "data-pressed": vueExports.unref(isPressed) ? "true" : void 0,
        onContextmenu: _cache[0] || (_cache[0] = vueExports.withModifiers(() => {
        }, ["prevent"]))
      }), {
        default: vueExports.withCtx(() => [vueExports.renderSlot(_ctx.$slots, "default")]),
        _: 3
      }, 16, [
        "type",
        "style",
        "disabled",
        "data-disabled",
        "data-pressed"
      ]);
    };
  }
});
var NumberFieldIncrement_default = NumberFieldIncrement_vue_vue_type_script_setup_true_lang_default;
var NumberFieldInput_vue_vue_type_script_setup_true_lang_default = /* @__PURE__ */ vueExports.defineComponent({
  __name: "NumberFieldInput",
  props: {
    asChild: {
      type: Boolean,
      required: false
    },
    as: {
      type: null,
      required: false,
      default: "input"
    }
  },
  setup(__props) {
    const props = __props;
    const { primitiveElement } = usePrimitiveElement();
    const rootContext = injectNumberFieldRootContext();
    function handleWheelEvent(event) {
      if (rootContext.disableWheelChange.value) return;
      if (event.target !== getActiveElement()) return;
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
      event.preventDefault();
      if (event.deltaY > 0) rootContext.invertWheelChange.value ? rootContext.handleDecrease() : rootContext.handleIncrease();
      else if (event.deltaY < 0) rootContext.invertWheelChange.value ? rootContext.handleIncrease() : rootContext.handleDecrease();
    }
    const inputValue = vueExports.ref(rootContext.textValue.value);
    vueExports.watch(() => rootContext.textValue.value, () => {
      inputValue.value = rootContext.textValue.value;
    }, {
      immediate: true,
      deep: true
    });
    function handleChange() {
      requestAnimationFrame(() => {
        inputValue.value = rootContext.textValue.value;
      });
    }
    return (_ctx, _cache) => {
      return vueExports.openBlock(), vueExports.createBlock(vueExports.unref(Primitive), vueExports.mergeProps(props, {
        id: vueExports.unref(rootContext).id.value,
        ref_key: "primitiveElement",
        ref: primitiveElement,
        value: inputValue.value,
        role: "spinbutton",
        type: "text",
        tabindex: "0",
        inputmode: vueExports.unref(rootContext).inputMode.value,
        disabled: vueExports.unref(rootContext).disabled.value ? "" : void 0,
        "data-disabled": vueExports.unref(rootContext).disabled.value ? "" : void 0,
        readonly: vueExports.unref(rootContext).readonly.value ? "" : void 0,
        "data-readonly": vueExports.unref(rootContext).readonly.value ? "" : void 0,
        autocomplete: "off",
        autocorrect: "off",
        spellcheck: "false",
        "aria-roledescription": "Number field",
        "aria-valuenow": vueExports.unref(rootContext).modelValue.value,
        "aria-valuemin": vueExports.unref(rootContext).min.value,
        "aria-valuemax": vueExports.unref(rootContext).max.value,
        onKeydown: [
          _cache[0] || (_cache[0] = vueExports.withKeys(vueExports.withModifiers(($event) => vueExports.unref(rootContext).handleIncrease(), ["prevent"]), ["up"])),
          _cache[1] || (_cache[1] = vueExports.withKeys(vueExports.withModifiers(($event) => vueExports.unref(rootContext).handleDecrease(), ["prevent"]), ["down"])),
          _cache[2] || (_cache[2] = vueExports.withKeys(vueExports.withModifiers(($event) => vueExports.unref(rootContext).handleIncrease(10), ["prevent"]), ["page-up"])),
          _cache[3] || (_cache[3] = vueExports.withKeys(vueExports.withModifiers(($event) => vueExports.unref(rootContext).handleDecrease(10), ["prevent"]), ["page-down"])),
          _cache[4] || (_cache[4] = vueExports.withKeys(vueExports.withModifiers(($event) => vueExports.unref(rootContext).handleMinMaxValue("min"), ["prevent"]), ["home"])),
          _cache[5] || (_cache[5] = vueExports.withKeys(vueExports.withModifiers(($event) => vueExports.unref(rootContext).handleMinMaxValue("max"), ["prevent"]), ["end"])),
          _cache[8] || (_cache[8] = vueExports.withKeys(($event) => vueExports.unref(rootContext).applyInputValue($event.target?.value), ["enter"]))
        ],
        onWheel: handleWheelEvent,
        onBeforeinput: _cache[6] || (_cache[6] = (event) => {
          const target = event.target;
          let nextValue = target.value.slice(0, target.selectionStart ?? void 0) + (event.data ?? "") + target.value.slice(target.selectionEnd ?? void 0);
          if (!vueExports.unref(rootContext).validate(nextValue)) event.preventDefault();
        }),
        onInput: _cache[7] || (_cache[7] = (event) => {
          const target = event.target;
          inputValue.value = target.value;
        }),
        onChange: handleChange,
        onBlur: _cache[9] || (_cache[9] = ($event) => vueExports.unref(rootContext).applyInputValue($event.target?.value))
      }), {
        default: vueExports.withCtx(() => [vueExports.renderSlot(_ctx.$slots, "default")]),
        _: 3
      }, 16, [
        "id",
        "value",
        "inputmode",
        "disabled",
        "data-disabled",
        "readonly",
        "data-readonly",
        "aria-valuenow",
        "aria-valuemin",
        "aria-valuemax"
      ]);
    };
  }
});
var NumberFieldInput_default = NumberFieldInput_vue_vue_type_script_setup_true_lang_default;
function isSuperStructSchema(schema) {
  return "schema" in schema && typeof schema.coercer === "function" && typeof schema.validator === "function" && typeof schema.refiner === "function";
}
function isStandardSchema(schema) {
  return "~standard" in schema;
}
async function validateStandardSchema(state, schema) {
  const result = await schema["~standard"].validate(state);
  if (result.issues) {
    return {
      errors: result.issues?.map((issue) => ({
        name: issue.path?.map((item) => typeof item === "object" ? item.key : item).join(".") || "",
        message: issue.message
      })) || [],
      result: null
    };
  }
  return {
    errors: null,
    result: result.value
  };
}
async function validateSuperstructSchema(state, schema) {
  const [err, result] = schema.validate(state);
  if (err) {
    const errors = err.failures().map((error) => ({
      message: error.message,
      name: error.path.join(".")
    }));
    return {
      errors,
      result: null
    };
  }
  return {
    errors: null,
    result
  };
}
function validateSchema(state, schema) {
  if (isStandardSchema(schema)) {
    return validateStandardSchema(state, schema);
  } else if (isSuperStructSchema(schema)) {
    return validateSuperstructSchema(state, schema);
  } else {
    throw new Error("Form validation failed: Unsupported form schema");
  }
}
function getAtPath(data, path) {
  if (!path) return data;
  const value = path.split(".").reduce(
    (value2, key) => value2?.[key],
    data
  );
  return value;
}
function setAtPath(data, path, value) {
  if (!path) return Object.assign(data, value);
  if (!data) return data;
  const keys = path.split(".");
  let current = data;
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (current[key] === void 0 || current[key] === null) {
      if (i + 1 < keys.length && !Number.isNaN(Number(keys[i + 1]))) {
        current[key] = [];
      } else {
        current[key] = {};
      }
    }
    current = current[key];
  }
  const lastKey = keys[keys.length - 1];
  current[lastKey] = value;
  return data;
}
class FormValidationException extends Error {
  formId;
  errors;
  constructor(formId, errors) {
    super("Form validation exception");
    this.formId = formId;
    this.errors = errors;
    Object.setPrototypeOf(this, FormValidationException.prototype);
  }
}
const theme$2 = {
  "base": ""
};
const _sfc_main$2 = {
  __name: "UForm",
  __ssrInlineRender: true,
  props: {
    id: { type: [String, Number], required: false },
    schema: { type: null, required: false },
    state: { type: null, required: false },
    validate: { type: Function, required: false },
    validateOn: { type: Array, required: false, default() {
      return ["input", "blur", "change"];
    } },
    disabled: { type: Boolean, required: false },
    name: { type: null, required: false },
    validateOnInputDelay: { type: Number, required: false, default: 300 },
    transform: { type: null, required: false, default: () => true },
    nested: { type: Boolean, required: false },
    loadingAuto: { type: Boolean, required: false, default: true },
    class: { type: null, required: false },
    ui: { type: Object, required: false },
    onSubmit: { type: Function, required: false }
  },
  emits: ["submit", "error"],
  setup(__props, { expose: __expose, emit: __emit }) {
    const _props = __props;
    const emits = __emit;
    const props = useComponentProps("form", _props);
    const appConfig = useAppConfig();
    const ui = vueExports.computed(() => tv({ extend: tv(theme$2), ...appConfig.ui?.form || {} }));
    const formId = props.id ?? vueExports.useId();
    const formRef = vueExports.useTemplateRef("formRef");
    const bus = useEventBus(`form-${formId}`);
    const parentBus = props.nested === true && vueExports.inject(
      formBusInjectionKey,
      void 0
    );
    const parentState = props.nested === true ? vueExports.inject(formStateInjectionKey, void 0) : void 0;
    const state = vueExports.computed(() => {
      if (parentState?.value) {
        return props.name ? getAtPath(parentState.value, props.name) : parentState.value;
      }
      return props.state;
    });
    vueExports.provide(formBusInjectionKey, bus);
    vueExports.provide(formStateInjectionKey, state);
    const nestedForms = vueExports.ref(/* @__PURE__ */ new Map());
    const errors = vueExports.ref([]);
    vueExports.provide(formErrorsInjectionKey, errors);
    const inputs = vueExports.ref({});
    vueExports.provide(formInputsInjectionKey, inputs);
    const dirtyFields = vueExports.reactive(/* @__PURE__ */ new Set());
    const touchedFields = vueExports.reactive(/* @__PURE__ */ new Set());
    const blurredFields = vueExports.reactive(/* @__PURE__ */ new Set());
    function resolveErrorIds(errs) {
      return errs.map((err) => ({
        ...err,
        id: err?.name ? inputs.value[err.name]?.id : void 0
      }));
    }
    const transformedState = vueExports.ref(null);
    async function getErrors() {
      let errs = props.validate ? await props.validate(state.value) ?? [] : [];
      if (props.schema) {
        const { errors: errors2, result } = await validateSchema(state.value, props.schema);
        if (errors2) {
          errs = errs.concat(errors2);
        } else {
          transformedState.value = result;
        }
      }
      return resolveErrorIds(errs);
    }
    async function _validate(opts = { silent: false, nested: false, transform: false }) {
      const names = opts.name && !Array.isArray(opts.name) ? [opts.name] : opts.name;
      let nestedResults = [];
      let nestedErrors = [];
      if (!names && opts.nested) {
        const validations = Array.from(nestedForms.value.values()).map(
          (form) => validateNestedForm(form, opts)
        );
        const results = await Promise.all(validations);
        nestedErrors = results.filter((r) => r.error).flatMap((r) => r.error.errors.map((e) => addFormPath(e, r.name)));
        nestedResults = results.filter((r) => r.output !== void 0);
      }
      const currentErrors = await getErrors();
      const allErrors = [...currentErrors, ...nestedErrors];
      if (names) {
        errors.value = filterErrorsByNames(allErrors, names);
      } else {
        errors.value = allErrors;
      }
      if (errors.value?.length) {
        if (opts.silent) return false;
        throw new FormValidationException(formId, errors.value);
      }
      if (opts.transform) {
        nestedResults.forEach((result) => {
          if (result.name) {
            setAtPath(transformedState.value, result.name, result.output);
          } else {
            Object.assign(transformedState.value, result.output);
          }
        });
        return transformedState.value ?? state.value;
      }
      return state.value;
    }
    const loading = vueExports.ref(false);
    vueExports.provide(formLoadingInjectionKey, vueExports.readonly(loading));
    async function onSubmitWrapper(payload) {
      loading.value = !!props.loadingAuto;
      const event = payload;
      try {
        event.data = await _validate({ nested: true, transform: props.transform });
        await props.onSubmit?.(event);
        dirtyFields.clear();
      } catch (error) {
        if (!(error instanceof FormValidationException)) {
          throw error;
        }
        const errorEvent = {
          ...event,
          errors: error.errors
        };
        emits("error", errorEvent);
      } finally {
        loading.value = false;
      }
    }
    const disabled = vueExports.computed(() => props.disabled || loading.value);
    vueExports.provide(formOptionsInjectionKey, vueExports.computed(() => ({
      disabled: disabled.value,
      validateOnInputDelay: props.validateOnInputDelay
    })));
    async function validateNestedForm(form, opts) {
      try {
        const result = await form.validate({ ...opts, silent: false });
        return { name: form.name, output: result };
      } catch (error) {
        if (!(error instanceof FormValidationException)) throw error;
        return { name: form.name, error };
      }
    }
    function addFormPath(error, formPath) {
      if (!formPath || !error.name) return error;
      return { ...error, name: formPath + "." + error.name };
    }
    function stripFormPath(error, formPath) {
      const prefix = formPath + ".";
      const name = error?.name?.startsWith(prefix) ? error.name.substring(prefix.length) : error.name;
      return { ...error, name };
    }
    function filterFormErrors(errors2, formPath) {
      if (!formPath) return errors2;
      return errors2.filter((e) => e?.name?.startsWith(formPath + ".")).map((e) => stripFormPath(e, formPath));
    }
    function getFormErrors(form) {
      return form.api.getErrors().map(
        (e) => form.name ? { ...e, name: form.name + "." + e.name } : e
      );
    }
    function matchesTarget(target, path) {
      if (!target || !path) return true;
      if (target instanceof RegExp) return target.test(path);
      return path === target || typeof target === "string" && target.startsWith(path + ".");
    }
    function getNestedTarget(target, formPath) {
      if (!target || target instanceof RegExp) return target;
      if (formPath === target) return void 0;
      if (typeof target === "string" && target.startsWith(formPath + ".")) {
        return target.substring(formPath.length + 1);
      }
      return target;
    }
    function filterErrorsByNames(allErrors, names) {
      const nameSet = new Set(names);
      const patterns = names.map((name) => inputs.value?.[name]?.pattern).filter(Boolean);
      const matchesNames = (error) => {
        if (!error.name) return false;
        if (nameSet.has(error.name)) return true;
        return patterns.some((pattern) => pattern.test(error.name));
      };
      const keepErrors = errors.value.filter((error) => !matchesNames(error));
      const newErrors = allErrors.filter(matchesNames);
      return [...keepErrors, ...newErrors];
    }
    function filterErrorsByTarget(currentErrors, target) {
      return currentErrors.filter(
        (err) => target instanceof RegExp ? !(err.name && target.test(err.name)) : !err.name || err.name !== target
      );
    }
    function isLocalError(error) {
      return !error.name || !!inputs.value[error.name];
    }
    const api = {
      validate: _validate,
      errors,
      setErrors(errs, name) {
        const localErrors = resolveErrorIds(errs.filter(isLocalError));
        const nestedErrors = [];
        for (const form of nestedForms.value.values()) {
          if (matchesTarget(name, form.name)) {
            const formErrors = filterFormErrors(errs, form.name);
            form.api.setErrors(formErrors, getNestedTarget(name, form.name || ""));
            nestedErrors.push(...getFormErrors(form));
          }
        }
        if (name) {
          const keepErrors = filterErrorsByTarget(errors.value, name);
          errors.value = [...keepErrors, ...localErrors, ...nestedErrors];
        } else {
          errors.value = [...localErrors, ...nestedErrors];
        }
      },
      async submit() {
        if (formRef.value instanceof HTMLFormElement && formRef.value.reportValidity() === false) {
          return;
        }
        await onSubmitWrapper(new Event("submit"));
      },
      getErrors(name) {
        if (!name) return errors.value;
        return errors.value.filter(
          (err) => name instanceof RegExp ? err.name && name.test(err.name) : err.name === name
        );
      },
      clear(name) {
        const localErrors = name ? errors.value.filter(
          (err) => isLocalError(err) && (name instanceof RegExp ? !(err.name && name.test(err.name)) : err.name !== name)
        ) : [];
        const nestedErrors = [];
        for (const form of nestedForms.value.values()) {
          if (matchesTarget(name, form.name)) form.api.clear();
          nestedErrors.push(...getFormErrors(form));
        }
        errors.value = [...localErrors, ...nestedErrors];
      },
      disabled,
      loading,
      dirty: vueExports.computed(() => !!dirtyFields.size),
      dirtyFields: vueExports.readonly(dirtyFields),
      blurredFields: vueExports.readonly(blurredFields),
      touchedFields: vueExports.readonly(touchedFields)
    };
    __expose(api);
    return (_ctx, _push, _parent, _attrs) => {
      serverRenderer_cjs_prodExports.ssrRenderVNode(_push, vueExports.createVNode(vueExports.resolveDynamicComponent(vueExports.unref(parentBus) ? "div" : "form"), vueExports.mergeProps({
        id: vueExports.unref(formId),
        ref_key: "formRef",
        ref: formRef,
        class: ui.value({ class: [vueExports.unref(props).ui?.base, vueExports.unref(props).class] }),
        onSubmit: onSubmitWrapper
      }, _attrs), {
        default: vueExports.withCtx((_, _push2, _parent2, _scopeId) => {
          if (_push2) {
            serverRenderer_cjs_prodExports.ssrRenderSlot(_ctx.$slots, "default", {
              errors: errors.value,
              loading: loading.value
            }, null, _push2, _parent2, _scopeId);
          } else {
            return [
              vueExports.renderSlot(_ctx.$slots, "default", {
                errors: errors.value,
                loading: loading.value
              })
            ];
          }
        }),
        _: 3
      }), _parent);
    };
  }
};
const _sfc_setup$2 = _sfc_main$2.setup;
_sfc_main$2.setup = (props, ctx) => {
  const ssrContext = vueExports.useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("../node_modules/.pnpm/@nuxt+ui@4.8.0_@internationalized+date@3.12.1_@internationalized+number@3.6.6_@tiptap+e_d719e0a183cea98ed15f9fdb5506ba26/node_modules/@nuxt/ui/dist/runtime/components/Form.vue");
  return _sfc_setup$2 ? _sfc_setup$2(props, ctx) : void 0;
};
const theme$1 = {
  "slots": {
    "root": "",
    "wrapper": "",
    "labelWrapper": "flex content-center items-center justify-between gap-1",
    "label": "block font-medium text-default",
    "container": "relative",
    "description": "text-muted",
    "error": "mt-2 text-error",
    "hint": "text-muted",
    "help": "mt-2 text-muted"
  },
  "variants": {
    "size": {
      "xs": {
        "root": "text-xs"
      },
      "sm": {
        "root": "text-xs"
      },
      "md": {
        "root": "text-sm"
      },
      "lg": {
        "root": "text-sm"
      },
      "xl": {
        "root": "text-base"
      }
    },
    "required": {
      "true": {
        "label": "after:content-['*'] after:ms-0.5 after:text-error"
      }
    },
    "orientation": {
      "vertical": {
        "container": "mt-1"
      },
      "horizontal": {
        "root": "flex justify-between place-items-baseline gap-2"
      }
    }
  },
  "defaultVariants": {
    "size": "md"
  }
};
const _sfc_main$1 = {
  __name: "UFormField",
  __ssrInlineRender: true,
  props: {
    as: { type: null, required: false },
    name: { type: String, required: false },
    errorPattern: { type: null, required: false },
    label: { type: String, required: false },
    description: { type: String, required: false },
    help: { type: String, required: false },
    error: { type: [Boolean, String], required: false, default: void 0 },
    hint: { type: String, required: false },
    size: { type: null, required: false },
    required: { type: Boolean, required: false },
    eagerValidation: { type: Boolean, required: false },
    validateOnInputDelay: { type: Number, required: false },
    orientation: { type: null, required: false, default: "vertical" },
    class: { type: null, required: false },
    ui: { type: Object, required: false }
  },
  setup(__props) {
    const _props = __props;
    const slots = vueExports.useSlots();
    const props = useComponentProps("formField", _props);
    const appConfig = useAppConfig();
    const ui = vueExports.computed(() => tv({ extend: tv(theme$1), ...appConfig.ui?.formField || {} })({
      size: props.size,
      required: props.required,
      orientation: props.orientation
    }));
    const formErrors = vueExports.inject(formErrorsInjectionKey, null);
    const error = vueExports.computed(() => props.error || formErrors?.value?.find((error2) => error2.name === props.name || props.errorPattern && error2.name?.match(props.errorPattern))?.message);
    const id = vueExports.ref(vueExports.useId());
    const ariaId = id.value;
    const formInputs = vueExports.inject(formInputsInjectionKey, void 0);
    vueExports.watch(id, () => {
      if (formInputs && props.name) {
        formInputs.value[props.name] = { id: id.value, pattern: props.errorPattern };
      }
    }, { immediate: true });
    vueExports.provide(inputIdInjectionKey, id);
    vueExports.provide(formFieldInjectionKey, vueExports.computed(() => ({
      error: error.value,
      name: props.name,
      size: props.size,
      eagerValidation: props.eagerValidation,
      validateOnInputDelay: props.validateOnInputDelay,
      errorPattern: props.errorPattern,
      hint: props.hint,
      description: props.description,
      help: props.help,
      ariaId
    })));
    return (_ctx, _push, _parent, _attrs) => {
      _push(serverRenderer_cjs_prodExports.ssrRenderComponent(vueExports.unref(Primitive), vueExports.mergeProps({
        as: vueExports.unref(props).as,
        "data-orientation": vueExports.unref(props).orientation,
        "data-slot": "root",
        class: ui.value.root({ class: [vueExports.unref(props).ui?.root, vueExports.unref(props).class] })
      }, _attrs), {
        default: vueExports.withCtx((_, _push2, _parent2, _scopeId) => {
          if (_push2) {
            _push2(`<div data-slot="wrapper" class="${serverRenderer_cjs_prodExports.ssrRenderClass(ui.value.wrapper({ class: vueExports.unref(props).ui?.wrapper }))}"${_scopeId}>`);
            if (vueExports.unref(props).label || !!slots.label) {
              _push2(`<div data-slot="labelWrapper" class="${serverRenderer_cjs_prodExports.ssrRenderClass(ui.value.labelWrapper({ class: vueExports.unref(props).ui?.labelWrapper }))}"${_scopeId}>`);
              _push2(serverRenderer_cjs_prodExports.ssrRenderComponent(vueExports.unref(Label_default), {
                for: id.value,
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
              }, _parent2, _scopeId));
              if (vueExports.unref(props).hint || !!slots.hint) {
                _push2(`<span${serverRenderer_cjs_prodExports.ssrRenderAttr("id", `${vueExports.unref(ariaId)}-hint`)} data-slot="hint" class="${serverRenderer_cjs_prodExports.ssrRenderClass(ui.value.hint({ class: vueExports.unref(props).ui?.hint }))}"${_scopeId}>`);
                serverRenderer_cjs_prodExports.ssrRenderSlot(_ctx.$slots, "hint", {
                  hint: vueExports.unref(props).hint
                }, () => {
                  _push2(`${serverRenderer_cjs_prodExports.ssrInterpolate(vueExports.unref(props).hint)}`);
                }, _push2, _parent2, _scopeId);
                _push2(`</span>`);
              } else {
                _push2(`<!---->`);
              }
              _push2(`</div>`);
            } else {
              _push2(`<!---->`);
            }
            if (vueExports.unref(props).description || !!slots.description) {
              _push2(`<p${serverRenderer_cjs_prodExports.ssrRenderAttr("id", `${vueExports.unref(ariaId)}-description`)} data-slot="description" class="${serverRenderer_cjs_prodExports.ssrRenderClass(ui.value.description({ class: vueExports.unref(props).ui?.description }))}"${_scopeId}>`);
              serverRenderer_cjs_prodExports.ssrRenderSlot(_ctx.$slots, "description", {
                description: vueExports.unref(props).description
              }, () => {
                _push2(`${serverRenderer_cjs_prodExports.ssrInterpolate(vueExports.unref(props).description)}`);
              }, _push2, _parent2, _scopeId);
              _push2(`</p>`);
            } else {
              _push2(`<!---->`);
            }
            _push2(`</div><div class="${serverRenderer_cjs_prodExports.ssrRenderClass([(vueExports.unref(props).label || !!slots.label || vueExports.unref(props).description || !!slots.description) && ui.value.container({ class: vueExports.unref(props).ui?.container })])}"${_scopeId}>`);
            serverRenderer_cjs_prodExports.ssrRenderSlot(_ctx.$slots, "default", { error: error.value }, null, _push2, _parent2, _scopeId);
            if (vueExports.unref(props).error !== false && (typeof error.value === "string" && error.value || !!slots.error)) {
              _push2(`<div${serverRenderer_cjs_prodExports.ssrRenderAttr("id", `${vueExports.unref(ariaId)}-error`)} data-slot="error" class="${serverRenderer_cjs_prodExports.ssrRenderClass(ui.value.error({ class: vueExports.unref(props).ui?.error }))}"${_scopeId}>`);
              serverRenderer_cjs_prodExports.ssrRenderSlot(_ctx.$slots, "error", { error: error.value }, () => {
                _push2(`${serverRenderer_cjs_prodExports.ssrInterpolate(error.value)}`);
              }, _push2, _parent2, _scopeId);
              _push2(`</div>`);
            } else if (vueExports.unref(props).help || !!slots.help) {
              _push2(`<div${serverRenderer_cjs_prodExports.ssrRenderAttr("id", `${vueExports.unref(ariaId)}-help`)} data-slot="help" class="${serverRenderer_cjs_prodExports.ssrRenderClass(ui.value.help({ class: vueExports.unref(props).ui?.help }))}"${_scopeId}>`);
              serverRenderer_cjs_prodExports.ssrRenderSlot(_ctx.$slots, "help", {
                help: vueExports.unref(props).help
              }, () => {
                _push2(`${serverRenderer_cjs_prodExports.ssrInterpolate(vueExports.unref(props).help)}`);
              }, _push2, _parent2, _scopeId);
              _push2(`</div>`);
            } else {
              _push2(`<!---->`);
            }
            _push2(`</div>`);
          } else {
            return [
              vueExports.createVNode("div", {
                "data-slot": "wrapper",
                class: ui.value.wrapper({ class: vueExports.unref(props).ui?.wrapper })
              }, [
                vueExports.unref(props).label || !!slots.label ? (vueExports.openBlock(), vueExports.createBlock("div", {
                  key: 0,
                  "data-slot": "labelWrapper",
                  class: ui.value.labelWrapper({ class: vueExports.unref(props).ui?.labelWrapper })
                }, [
                  vueExports.createVNode(vueExports.unref(Label_default), {
                    for: id.value,
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
                  }, 8, ["for", "class"]),
                  vueExports.unref(props).hint || !!slots.hint ? (vueExports.openBlock(), vueExports.createBlock("span", {
                    key: 0,
                    id: `${vueExports.unref(ariaId)}-hint`,
                    "data-slot": "hint",
                    class: ui.value.hint({ class: vueExports.unref(props).ui?.hint })
                  }, [
                    vueExports.renderSlot(_ctx.$slots, "hint", {
                      hint: vueExports.unref(props).hint
                    }, () => [
                      vueExports.createTextVNode(vueExports.toDisplayString(vueExports.unref(props).hint), 1)
                    ])
                  ], 10, ["id"])) : vueExports.createCommentVNode("", true)
                ], 2)) : vueExports.createCommentVNode("", true),
                vueExports.unref(props).description || !!slots.description ? (vueExports.openBlock(), vueExports.createBlock("p", {
                  key: 1,
                  id: `${vueExports.unref(ariaId)}-description`,
                  "data-slot": "description",
                  class: ui.value.description({ class: vueExports.unref(props).ui?.description })
                }, [
                  vueExports.renderSlot(_ctx.$slots, "description", {
                    description: vueExports.unref(props).description
                  }, () => [
                    vueExports.createTextVNode(vueExports.toDisplayString(vueExports.unref(props).description), 1)
                  ])
                ], 10, ["id"])) : vueExports.createCommentVNode("", true)
              ], 2),
              vueExports.createVNode("div", {
                class: [(vueExports.unref(props).label || !!slots.label || vueExports.unref(props).description || !!slots.description) && ui.value.container({ class: vueExports.unref(props).ui?.container })]
              }, [
                vueExports.renderSlot(_ctx.$slots, "default", { error: error.value }),
                vueExports.unref(props).error !== false && (typeof error.value === "string" && error.value || !!slots.error) ? (vueExports.openBlock(), vueExports.createBlock("div", {
                  key: 0,
                  id: `${vueExports.unref(ariaId)}-error`,
                  "data-slot": "error",
                  class: ui.value.error({ class: vueExports.unref(props).ui?.error })
                }, [
                  vueExports.renderSlot(_ctx.$slots, "error", { error: error.value }, () => [
                    vueExports.createTextVNode(vueExports.toDisplayString(error.value), 1)
                  ])
                ], 10, ["id"])) : vueExports.unref(props).help || !!slots.help ? (vueExports.openBlock(), vueExports.createBlock("div", {
                  key: 1,
                  id: `${vueExports.unref(ariaId)}-help`,
                  "data-slot": "help",
                  class: ui.value.help({ class: vueExports.unref(props).ui?.help })
                }, [
                  vueExports.renderSlot(_ctx.$slots, "help", {
                    help: vueExports.unref(props).help
                  }, () => [
                    vueExports.createTextVNode(vueExports.toDisplayString(vueExports.unref(props).help), 1)
                  ])
                ], 10, ["id"])) : vueExports.createCommentVNode("", true)
              ], 2)
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
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("../node_modules/.pnpm/@nuxt+ui@4.8.0_@internationalized+date@3.12.1_@internationalized+number@3.6.6_@tiptap+e_d719e0a183cea98ed15f9fdb5506ba26/node_modules/@nuxt/ui/dist/runtime/components/FormField.vue");
  return _sfc_setup$1 ? _sfc_setup$1(props, ctx) : void 0;
};
const theme = {
  "slots": {
    "root": "relative inline-flex items-center",
    "base": [
      "w-full rounded-md border-0 placeholder:text-dimmed focus:outline-none disabled:cursor-not-allowed disabled:opacity-75",
      "transition-colors"
    ],
    "increment": "absolute flex items-center",
    "decrement": "absolute flex items-center"
  },
  "variants": {
    "fieldGroup": {
      "horizontal": {
        "root": "group has-focus-visible:z-[1]",
        "base": "group-not-only:group-first:rounded-e-none group-not-only:group-last:rounded-s-none group-not-last:group-not-first:rounded-none"
      },
      "vertical": {
        "root": "group has-focus-visible:z-[1]",
        "base": "group-not-only:group-first:rounded-b-none group-not-only:group-last:rounded-t-none group-not-last:group-not-first:rounded-none"
      }
    },
    "color": {
      "primary": "",
      "secondary": "",
      "success": "",
      "info": "",
      "warning": "",
      "error": "",
      "neutral": ""
    },
    "size": {
      "xs": "px-2 py-1 text-sm/4 gap-1",
      "sm": "px-2.5 py-1.5 text-sm/4 gap-1.5",
      "md": "px-2.5 py-1.5 text-base/5 gap-1.5",
      "lg": "px-3 py-2 text-base/5 gap-2",
      "xl": "px-3 py-2 text-base gap-2"
    },
    "variant": {
      "outline": "text-highlighted bg-default ring ring-inset ring-accented",
      "soft": "text-highlighted bg-elevated/50 hover:bg-elevated focus:bg-elevated disabled:bg-elevated/50",
      "subtle": "text-highlighted bg-elevated ring ring-inset ring-accented",
      "ghost": "text-highlighted bg-transparent hover:bg-elevated focus:bg-elevated disabled:bg-transparent dark:disabled:bg-transparent",
      "none": "text-highlighted bg-transparent"
    },
    "disabled": {
      "true": {
        "increment": "opacity-75 cursor-not-allowed",
        "decrement": "opacity-75 cursor-not-allowed"
      }
    },
    "orientation": {
      "horizontal": {
        "base": "text-center",
        "increment": "inset-y-0 end-0 pe-1",
        "decrement": "inset-y-0 start-0 ps-1"
      },
      "vertical": {
        "increment": "top-0 end-0 pe-1 [&>button]:py-0 scale-80",
        "decrement": "bottom-0 end-0 pe-1 [&>button]:py-0 scale-80"
      }
    },
    "highlight": {
      "true": ""
    },
    "fixed": {
      "false": ""
    },
    "increment": {
      "false": ""
    },
    "decrement": {
      "false": ""
    }
  },
  "compoundVariants": [
    {
      "color": "primary",
      "variant": [
        "outline",
        "subtle"
      ],
      "class": "focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
    },
    {
      "color": "secondary",
      "variant": [
        "outline",
        "subtle"
      ],
      "class": "focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-secondary"
    },
    {
      "color": "success",
      "variant": [
        "outline",
        "subtle"
      ],
      "class": "focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-success"
    },
    {
      "color": "info",
      "variant": [
        "outline",
        "subtle"
      ],
      "class": "focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-info"
    },
    {
      "color": "warning",
      "variant": [
        "outline",
        "subtle"
      ],
      "class": "focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-warning"
    },
    {
      "color": "error",
      "variant": [
        "outline",
        "subtle"
      ],
      "class": "focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-error"
    },
    {
      "color": "primary",
      "highlight": true,
      "class": "ring ring-inset ring-primary"
    },
    {
      "color": "secondary",
      "highlight": true,
      "class": "ring ring-inset ring-secondary"
    },
    {
      "color": "success",
      "highlight": true,
      "class": "ring ring-inset ring-success"
    },
    {
      "color": "info",
      "highlight": true,
      "class": "ring ring-inset ring-info"
    },
    {
      "color": "warning",
      "highlight": true,
      "class": "ring ring-inset ring-warning"
    },
    {
      "color": "error",
      "highlight": true,
      "class": "ring ring-inset ring-error"
    },
    {
      "color": "neutral",
      "variant": [
        "outline",
        "subtle"
      ],
      "class": "focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-inverted"
    },
    {
      "color": "neutral",
      "highlight": true,
      "class": "ring ring-inset ring-inverted"
    },
    {
      "orientation": "horizontal",
      "decrement": false,
      "class": "text-start"
    },
    {
      "decrement": true,
      "size": "xs",
      "class": "ps-7"
    },
    {
      "decrement": true,
      "size": "sm",
      "class": "ps-8"
    },
    {
      "decrement": true,
      "size": "md",
      "class": "ps-9"
    },
    {
      "decrement": true,
      "size": "lg",
      "class": "ps-10"
    },
    {
      "decrement": true,
      "size": "xl",
      "class": "ps-11"
    },
    {
      "increment": true,
      "size": "xs",
      "class": "pe-7"
    },
    {
      "increment": true,
      "size": "sm",
      "class": "pe-8"
    },
    {
      "increment": true,
      "size": "md",
      "class": "pe-9"
    },
    {
      "increment": true,
      "size": "lg",
      "class": "pe-10"
    },
    {
      "increment": true,
      "size": "xl",
      "class": "pe-11"
    },
    {
      "fixed": false,
      "size": "xs",
      "class": "md:text-xs"
    },
    {
      "fixed": false,
      "size": "sm",
      "class": "md:text-xs"
    },
    {
      "fixed": false,
      "size": "md",
      "class": "md:text-sm"
    },
    {
      "fixed": false,
      "size": "lg",
      "class": "md:text-sm"
    }
  ],
  "defaultVariants": {
    "size": "md",
    "color": "primary",
    "variant": "outline"
  }
};
const _sfc_main = /* @__PURE__ */ Object.assign({ inheritAttrs: false }, {
  __name: "UInputNumber",
  __ssrInlineRender: true,
  props: {
    as: { type: null, required: false },
    placeholder: { type: String, required: false },
    color: { type: null, required: false },
    variant: { type: null, required: false },
    size: { type: null, required: false },
    highlight: { type: Boolean, required: false },
    fixed: { type: Boolean, required: false },
    orientation: { type: null, required: false, default: "horizontal" },
    increment: { type: [Boolean, Object], required: false, default: true },
    incrementIcon: { type: null, required: false },
    incrementDisabled: { type: Boolean, required: false },
    decrement: { type: [Boolean, Object], required: false, default: true },
    decrementIcon: { type: null, required: false },
    decrementDisabled: { type: Boolean, required: false },
    autofocus: { type: Boolean, required: false },
    autofocusDelay: { type: Number, required: false },
    defaultValue: { type: null, required: false },
    modelValue: { type: null, required: false },
    modelModifiers: { type: null, required: false },
    class: { type: null, required: false },
    ui: { type: Object, required: false },
    min: { type: Number, required: false },
    max: { type: Number, required: false },
    step: { type: Number, required: false },
    stepSnapping: { type: Boolean, required: false },
    disabled: { type: Boolean, required: false },
    required: { type: Boolean, required: false },
    id: { type: String, required: false },
    name: { type: String, required: false },
    formatOptions: { type: null, required: false },
    disableWheelChange: { type: Boolean, required: false },
    invertWheelChange: { type: Boolean, required: false },
    readonly: { type: Boolean, required: false },
    focusOnChange: { type: Boolean, required: false }
  },
  emits: ["update:modelValue", "blur", "change"],
  setup(__props, { expose: __expose, emit: __emit }) {
    const _props = __props;
    const emits = __emit;
    const props = useComponentProps("inputNumber", _props);
    const modelValue = useVModel(props, "modelValue", emits, { defaultValue: props.defaultValue });
    const { t } = useLocale$1();
    const appConfig = useAppConfig();
    const rootProps = useForwardProps(reactivePick(props, "as", "stepSnapping", "formatOptions", "disableWheelChange", "invertWheelChange", "required", "readonly", "focusOnChange"), emits);
    const { emitFormBlur, emitFormFocus, emitFormChange, emitFormInput, id, color, size: formFieldSize, name, highlight, disabled, ariaAttrs } = useFormField(_props);
    const { orientation, size: fieldGroupSize } = useFieldGroup(_props);
    const inputSize = vueExports.computed(() => fieldGroupSize.value || formFieldSize.value);
    const ui = vueExports.computed(() => tv({ extend: tv(theme), ...appConfig.ui?.inputNumber || {} })({
      color: color.value ?? props.color,
      variant: props.variant,
      size: inputSize.value ?? props.size,
      highlight: highlight.value ?? props.highlight,
      fixed: props.fixed,
      orientation: props.orientation,
      fieldGroup: orientation.value,
      increment: props.orientation === "vertical" ? !!props.increment || !!props.decrement : !!props.increment,
      decrement: props.orientation === "vertical" ? false : !!props.decrement
    }));
    const incrementIcon = vueExports.computed(() => props.incrementIcon || (props.orientation === "horizontal" ? appConfig.ui.icons.plus : appConfig.ui.icons.chevronUp));
    const decrementIcon = vueExports.computed(() => props.decrementIcon || (props.orientation === "horizontal" ? appConfig.ui.icons.minus : appConfig.ui.icons.chevronDown));
    const inputRef = vueExports.useTemplateRef("inputRef");
    function onUpdate(value) {
      if (props.modelModifiers?.optional) {
        modelValue.value = value = value ?? void 0;
      }
      const event = new Event("change", { target: { value } });
      emits("change", event);
      emitFormChange();
      emitFormInput();
    }
    function onBlur(event) {
      emitFormBlur();
      emits("blur", event);
    }
    __expose({
      inputRef: vueExports.toRef(() => inputRef.value?.$el)
    });
    return (_ctx, _push, _parent, _attrs) => {
      _push(serverRenderer_cjs_prodExports.ssrRenderComponent(vueExports.unref(NumberFieldRoot_default), vueExports.mergeProps(vueExports.unref(rootProps), {
        id: vueExports.unref(id),
        "default-value": vueExports.unref(props).defaultValue,
        "model-value": vueExports.unref(modelValue),
        min: vueExports.unref(props).min,
        max: vueExports.unref(props).max,
        step: vueExports.unref(props).step,
        "data-slot": "root",
        class: ui.value.root({ class: [vueExports.unref(props).ui?.root, vueExports.unref(props).class] }),
        name: vueExports.unref(name),
        disabled: vueExports.unref(disabled),
        "onUpdate:modelValue": (val) => onUpdate(val)
      }, _attrs), {
        default: vueExports.withCtx((_, _push2, _parent2, _scopeId) => {
          if (_push2) {
            _push2(serverRenderer_cjs_prodExports.ssrRenderComponent(vueExports.unref(NumberFieldInput_default), vueExports.mergeProps({ ..._ctx.$attrs, ...vueExports.unref(ariaAttrs) }, {
              ref_key: "inputRef",
              ref: inputRef,
              placeholder: vueExports.unref(props).placeholder,
              required: vueExports.unref(props).required,
              "data-slot": "base",
              class: ui.value.base({ class: vueExports.unref(props).ui?.base }),
              onBlur,
              onFocus: vueExports.unref(emitFormFocus)
            }), null, _parent2, _scopeId));
            if (!!vueExports.unref(props).increment) {
              _push2(`<div data-slot="increment" class="${serverRenderer_cjs_prodExports.ssrRenderClass(ui.value.increment({ class: vueExports.unref(props).ui?.increment }))}"${_scopeId}>`);
              _push2(serverRenderer_cjs_prodExports.ssrRenderComponent(vueExports.unref(NumberFieldIncrement_default), {
                "as-child": "",
                disabled: vueExports.unref(disabled) || vueExports.unref(props).incrementDisabled
              }, {
                default: vueExports.withCtx((_2, _push3, _parent3, _scopeId2) => {
                  if (_push3) {
                    serverRenderer_cjs_prodExports.ssrRenderSlot(_ctx.$slots, "increment", {}, () => {
                      _push3(serverRenderer_cjs_prodExports.ssrRenderComponent(_sfc_main$9, vueExports.mergeProps({
                        icon: incrementIcon.value,
                        color: vueExports.unref(color),
                        size: inputSize.value,
                        variant: "link",
                        "aria-label": vueExports.unref(t)("inputNumber.increment")
                      }, typeof vueExports.unref(props).increment === "object" ? vueExports.unref(props).increment : void 0), null, _parent3, _scopeId2));
                    }, _push3, _parent3, _scopeId2);
                  } else {
                    return [
                      vueExports.renderSlot(_ctx.$slots, "increment", {}, () => [
                        vueExports.createVNode(_sfc_main$9, vueExports.mergeProps({
                          icon: incrementIcon.value,
                          color: vueExports.unref(color),
                          size: inputSize.value,
                          variant: "link",
                          "aria-label": vueExports.unref(t)("inputNumber.increment")
                        }, typeof vueExports.unref(props).increment === "object" ? vueExports.unref(props).increment : void 0), null, 16, ["icon", "color", "size", "aria-label"])
                      ])
                    ];
                  }
                }),
                _: 3
              }, _parent2, _scopeId));
              _push2(`</div>`);
            } else {
              _push2(`<!---->`);
            }
            if (!!vueExports.unref(props).decrement) {
              _push2(`<div data-slot="decrement" class="${serverRenderer_cjs_prodExports.ssrRenderClass(ui.value.decrement({ class: vueExports.unref(props).ui?.decrement }))}"${_scopeId}>`);
              _push2(serverRenderer_cjs_prodExports.ssrRenderComponent(vueExports.unref(NumberFieldDecrement_default), {
                "as-child": "",
                disabled: vueExports.unref(disabled) || vueExports.unref(props).decrementDisabled
              }, {
                default: vueExports.withCtx((_2, _push3, _parent3, _scopeId2) => {
                  if (_push3) {
                    serverRenderer_cjs_prodExports.ssrRenderSlot(_ctx.$slots, "decrement", {}, () => {
                      _push3(serverRenderer_cjs_prodExports.ssrRenderComponent(_sfc_main$9, vueExports.mergeProps({
                        icon: decrementIcon.value,
                        color: vueExports.unref(color),
                        size: inputSize.value,
                        variant: "link",
                        "aria-label": vueExports.unref(t)("inputNumber.decrement")
                      }, typeof vueExports.unref(props).decrement === "object" ? vueExports.unref(props).decrement : void 0), null, _parent3, _scopeId2));
                    }, _push3, _parent3, _scopeId2);
                  } else {
                    return [
                      vueExports.renderSlot(_ctx.$slots, "decrement", {}, () => [
                        vueExports.createVNode(_sfc_main$9, vueExports.mergeProps({
                          icon: decrementIcon.value,
                          color: vueExports.unref(color),
                          size: inputSize.value,
                          variant: "link",
                          "aria-label": vueExports.unref(t)("inputNumber.decrement")
                        }, typeof vueExports.unref(props).decrement === "object" ? vueExports.unref(props).decrement : void 0), null, 16, ["icon", "color", "size", "aria-label"])
                      ])
                    ];
                  }
                }),
                _: 3
              }, _parent2, _scopeId));
              _push2(`</div>`);
            } else {
              _push2(`<!---->`);
            }
          } else {
            return [
              vueExports.createVNode(vueExports.unref(NumberFieldInput_default), vueExports.mergeProps({ ..._ctx.$attrs, ...vueExports.unref(ariaAttrs) }, {
                ref_key: "inputRef",
                ref: inputRef,
                placeholder: vueExports.unref(props).placeholder,
                required: vueExports.unref(props).required,
                "data-slot": "base",
                class: ui.value.base({ class: vueExports.unref(props).ui?.base }),
                onBlur,
                onFocus: vueExports.unref(emitFormFocus)
              }), null, 16, ["placeholder", "required", "class", "onFocus"]),
              !!vueExports.unref(props).increment ? (vueExports.openBlock(), vueExports.createBlock("div", {
                key: 0,
                "data-slot": "increment",
                class: ui.value.increment({ class: vueExports.unref(props).ui?.increment })
              }, [
                vueExports.createVNode(vueExports.unref(NumberFieldIncrement_default), {
                  "as-child": "",
                  disabled: vueExports.unref(disabled) || vueExports.unref(props).incrementDisabled
                }, {
                  default: vueExports.withCtx(() => [
                    vueExports.renderSlot(_ctx.$slots, "increment", {}, () => [
                      vueExports.createVNode(_sfc_main$9, vueExports.mergeProps({
                        icon: incrementIcon.value,
                        color: vueExports.unref(color),
                        size: inputSize.value,
                        variant: "link",
                        "aria-label": vueExports.unref(t)("inputNumber.increment")
                      }, typeof vueExports.unref(props).increment === "object" ? vueExports.unref(props).increment : void 0), null, 16, ["icon", "color", "size", "aria-label"])
                    ])
                  ]),
                  _: 3
                }, 8, ["disabled"])
              ], 2)) : vueExports.createCommentVNode("", true),
              !!vueExports.unref(props).decrement ? (vueExports.openBlock(), vueExports.createBlock("div", {
                key: 1,
                "data-slot": "decrement",
                class: ui.value.decrement({ class: vueExports.unref(props).ui?.decrement })
              }, [
                vueExports.createVNode(vueExports.unref(NumberFieldDecrement_default), {
                  "as-child": "",
                  disabled: vueExports.unref(disabled) || vueExports.unref(props).decrementDisabled
                }, {
                  default: vueExports.withCtx(() => [
                    vueExports.renderSlot(_ctx.$slots, "decrement", {}, () => [
                      vueExports.createVNode(_sfc_main$9, vueExports.mergeProps({
                        icon: decrementIcon.value,
                        color: vueExports.unref(color),
                        size: inputSize.value,
                        variant: "link",
                        "aria-label": vueExports.unref(t)("inputNumber.decrement")
                      }, typeof vueExports.unref(props).decrement === "object" ? vueExports.unref(props).decrement : void 0), null, 16, ["icon", "color", "size", "aria-label"])
                    ])
                  ]),
                  _: 3
                }, 8, ["disabled"])
              ], 2)) : vueExports.createCommentVNode("", true)
            ];
          }
        }),
        _: 3
      }, _parent));
    };
  }
});
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = vueExports.useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("../node_modules/.pnpm/@nuxt+ui@4.8.0_@internationalized+date@3.12.1_@internationalized+number@3.6.6_@tiptap+e_d719e0a183cea98ed15f9fdb5506ba26/node_modules/@nuxt/ui/dist/runtime/components/InputNumber.vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};

export { Label_default as L, VisuallyHiddenInput_default as V, _sfc_main as _, _sfc_main$1 as a, _sfc_main$2 as b, useId as c, useFormControl as u };
//# sourceMappingURL=InputNumber-vHSIttX4.mjs.map
