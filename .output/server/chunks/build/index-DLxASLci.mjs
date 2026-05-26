import { a as _sfc_main$1$1, _ as _sfc_main$5 } from './Breadcrumb-DUkxvNFs.mjs';
import { aw as vueExports, aj as useI18n, a6 as useAppConfig, al as useLocalePath, ap as useRoute$1, r as createError, ar as useSeoMeta, a1 as serverRenderer_cjs_prodExports, v as flattenConnection, ab as useComponentProps, a4 as tv, e as Primitive, ak as useLocale, L as getSlotChildrenText, f as __nuxt_component_2$1, j as _sfc_main$a, h as _sfc_main$c, W as omit, n as avatarGroupInjectionKey, i as _sfc_main$d } from './server.mjs';
import { _ as _sfc_main$6 } from './Badge-D9GN-Hcd.mjs';
import { u as useStorefrontData } from './async-B6A707dQ.mjs';
import { B as BLOG_FRAGMENT } from './blog-B0bN3v1U.mjs';
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

function $09ec6a572d60460f$export$842a2cf37af977e1(amount, numerator) {
  return amount - numerator * Math.floor(amount / numerator);
}
const $93635573935797de$var$EPOCH = 1721426;
function $93635573935797de$export$f297eb839006d339(era, year, month, day) {
  year = $93635573935797de$export$c36e0ecb2d4fa69d(era, year);
  let y1 = year - 1;
  let monthOffset = -2;
  if (month <= 2) monthOffset = 0;
  else if ($93635573935797de$export$553d7fa8e3805fc0(year)) monthOffset = -1;
  return $93635573935797de$var$EPOCH - 1 + 365 * y1 + Math.floor(y1 / 4) - Math.floor(y1 / 100) + Math.floor(y1 / 400) + Math.floor((367 * month - 362) / 12 + monthOffset + day);
}
function $93635573935797de$export$553d7fa8e3805fc0(year) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}
function $93635573935797de$export$c36e0ecb2d4fa69d(era, year) {
  return era === "BC" ? 1 - year : year;
}
function $93635573935797de$export$4475b7e617eb123c(year) {
  let era = "AD";
  if (year <= 0) {
    era = "BC";
    year = 1 - year;
  }
  return [
    era,
    year
  ];
}
const $93635573935797de$var$daysInMonth = {
  standard: [
    31,
    28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31
  ],
  leapyear: [
    31,
    29,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31
  ]
};
class $93635573935797de$export$80ee6245ec4f29ec {
  fromJulianDay(jd) {
    let jd0 = jd;
    let depoch = jd0 - $93635573935797de$var$EPOCH;
    let quadricent = Math.floor(depoch / 146097);
    let dqc = $09ec6a572d60460f$export$842a2cf37af977e1(depoch, 146097);
    let cent = Math.floor(dqc / 36524);
    let dcent = $09ec6a572d60460f$export$842a2cf37af977e1(dqc, 36524);
    let quad = Math.floor(dcent / 1461);
    let dquad = $09ec6a572d60460f$export$842a2cf37af977e1(dcent, 1461);
    let yindex = Math.floor(dquad / 365);
    let extendedYear = quadricent * 400 + cent * 100 + quad * 4 + yindex + (cent !== 4 && yindex !== 4 ? 1 : 0);
    let [era, year] = $93635573935797de$export$4475b7e617eb123c(extendedYear);
    let yearDay = jd0 - $93635573935797de$export$f297eb839006d339(era, year, 1, 1);
    let leapAdj = 2;
    if (jd0 < $93635573935797de$export$f297eb839006d339(era, year, 3, 1)) leapAdj = 0;
    else if ($93635573935797de$export$553d7fa8e3805fc0(year)) leapAdj = 1;
    let month = Math.floor(((yearDay + leapAdj) * 12 + 373) / 367);
    let day = jd0 - $93635573935797de$export$f297eb839006d339(era, year, month, 1) + 1;
    return new $2aaf608024c21ca1$export$99faa760c7908e4f(era, year, month, day);
  }
  toJulianDay(date) {
    return $93635573935797de$export$f297eb839006d339(date.era, date.year, date.month, date.day);
  }
  getDaysInMonth(date) {
    return $93635573935797de$var$daysInMonth[$93635573935797de$export$553d7fa8e3805fc0(date.year) ? "leapyear" : "standard"][date.month - 1];
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getMonthsInYear(date) {
    return 12;
  }
  getDaysInYear(date) {
    return $93635573935797de$export$553d7fa8e3805fc0(date.year) ? 366 : 365;
  }
  getMaximumMonthsInYear() {
    return 12;
  }
  getMaximumDaysInMonth() {
    return 31;
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getYearsInEra(date) {
    return 9999;
  }
  getEras() {
    return [
      "BC",
      "AD"
    ];
  }
  isInverseEra(date) {
    return date.era === "BC";
  }
  balanceDate(date) {
    if (date.year <= 0) {
      date.era = date.era === "BC" ? "AD" : "BC";
      date.year = 1 - date.year;
    }
  }
  constructor() {
    this.identifier = "gregory";
  }
}
function $ad063034c8620db8$export$dbc69fd56b53d5e(a, b) {
  return a.isEqual?.(b) ?? b.isEqual?.(a) ?? a.identifier === b.identifier;
}
function $ad063034c8620db8$export$461939dd4422153(timeZone) {
  return $d07e34cce18680fd$export$1b96692a1ba042ac(Date.now(), timeZone);
}
function $ad063034c8620db8$export$d0bdf45af03a6ea3(timeZone) {
  return $d07e34cce18680fd$export$93522d1a439f3617($ad063034c8620db8$export$461939dd4422153(timeZone));
}
function $ad063034c8620db8$export$68781ddf31c0090f(a, b) {
  return a.calendar.toJulianDay(a) - b.calendar.toJulianDay(b);
}
function $ad063034c8620db8$export$c19a80a9721b80f6(a, b) {
  return $ad063034c8620db8$var$timeToMs(a) - $ad063034c8620db8$var$timeToMs(b);
}
function $ad063034c8620db8$var$timeToMs(a) {
  return a.hour * 36e5 + a.minute * 6e4 + a.second * 1e3 + a.millisecond;
}
let $ad063034c8620db8$var$localTimeZone = null;
function $ad063034c8620db8$export$aa8b41735afcabd2() {
  if ($ad063034c8620db8$var$localTimeZone == null) $ad063034c8620db8$var$localTimeZone = new Intl.DateTimeFormat().resolvedOptions().timeZone;
  return $ad063034c8620db8$var$localTimeZone;
}
function $d07e34cce18680fd$export$bd4fb2bc8bb06fb(date) {
  date = $d07e34cce18680fd$export$b4a036af3fc0b032(date, new $93635573935797de$export$80ee6245ec4f29ec());
  let year = $93635573935797de$export$c36e0ecb2d4fa69d(date.era, date.year);
  return $d07e34cce18680fd$var$epochFromParts(year, date.month, date.day, date.hour, date.minute, date.second, date.millisecond);
}
function $d07e34cce18680fd$var$epochFromParts(year, month, day, hour, minute, second, millisecond) {
  let date = /* @__PURE__ */ new Date();
  date.setUTCHours(hour, minute, second, millisecond);
  date.setUTCFullYear(year, month - 1, day);
  return date.getTime();
}
function $d07e34cce18680fd$export$59c99f3515d3493f(ms, timeZone) {
  if (timeZone === "UTC") return 0;
  if (ms > 0 && timeZone === $ad063034c8620db8$export$aa8b41735afcabd2() && true) return new Date(ms).getTimezoneOffset() * -6e4;
  let { year, month, day, hour, minute, second } = $d07e34cce18680fd$var$getTimeZoneParts(ms, timeZone);
  let utc = $d07e34cce18680fd$var$epochFromParts(year, month, day, hour, minute, second, 0);
  return utc - Math.floor(ms / 1e3) * 1e3;
}
const $d07e34cce18680fd$var$formattersByTimeZone = /* @__PURE__ */ new Map();
function $d07e34cce18680fd$var$getTimeZoneParts(ms, timeZone) {
  let formatter = $d07e34cce18680fd$var$formattersByTimeZone.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour12: false,
      era: "short",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric"
    });
    $d07e34cce18680fd$var$formattersByTimeZone.set(timeZone, formatter);
  }
  let parts = formatter.formatToParts(new Date(ms));
  let namedParts = {};
  for (let part of parts) if (part.type !== "literal") namedParts[part.type] = part.value;
  return {
    // Firefox returns B instead of BC... https://bugzilla.mozilla.org/show_bug.cgi?id=1752253
    year: namedParts.era === "BC" || namedParts.era === "B" ? -namedParts.year + 1 : +namedParts.year,
    month: +namedParts.month,
    day: +namedParts.day,
    hour: namedParts.hour === "24" ? 0 : +namedParts.hour,
    minute: +namedParts.minute,
    second: +namedParts.second
  };
}
const $d07e34cce18680fd$var$DAYMILLIS = 864e5;
function $d07e34cce18680fd$var$getValidWallTimes(date, timeZone, earlier, later) {
  let found = earlier === later ? [
    earlier
  ] : [
    earlier,
    later
  ];
  return found.filter((absolute) => $d07e34cce18680fd$var$isValidWallTime(date, timeZone, absolute));
}
function $d07e34cce18680fd$var$isValidWallTime(date, timeZone, absolute) {
  let parts = $d07e34cce18680fd$var$getTimeZoneParts(absolute, timeZone);
  return date.year === parts.year && date.month === parts.month && date.day === parts.day && date.hour === parts.hour && date.minute === parts.minute && date.second === parts.second;
}
function $d07e34cce18680fd$export$5107c82f94518f5c(date, timeZone, disambiguation = "compatible") {
  let dateTime = $d07e34cce18680fd$export$b21e0b124e224484(date);
  if (timeZone === "UTC") return $d07e34cce18680fd$export$bd4fb2bc8bb06fb(dateTime);
  if (timeZone === $ad063034c8620db8$export$aa8b41735afcabd2() && disambiguation === "compatible" && true) {
    dateTime = $d07e34cce18680fd$export$b4a036af3fc0b032(dateTime, new $93635573935797de$export$80ee6245ec4f29ec());
    let date2 = /* @__PURE__ */ new Date();
    let year = $93635573935797de$export$c36e0ecb2d4fa69d(dateTime.era, dateTime.year);
    date2.setFullYear(year, dateTime.month - 1, dateTime.day);
    date2.setHours(dateTime.hour, dateTime.minute, dateTime.second, dateTime.millisecond);
    return date2.getTime();
  }
  let ms = $d07e34cce18680fd$export$bd4fb2bc8bb06fb(dateTime);
  let offsetBefore = $d07e34cce18680fd$export$59c99f3515d3493f(ms - $d07e34cce18680fd$var$DAYMILLIS, timeZone);
  let offsetAfter = $d07e34cce18680fd$export$59c99f3515d3493f(ms + $d07e34cce18680fd$var$DAYMILLIS, timeZone);
  let valid = $d07e34cce18680fd$var$getValidWallTimes(dateTime, timeZone, ms - offsetBefore, ms - offsetAfter);
  if (valid.length === 1) return valid[0];
  if (valid.length > 1) switch (disambiguation) {
    // 'compatible' means 'earlier' for "fall back" transitions
    case "compatible":
    case "earlier":
      return valid[0];
    case "later":
      return valid[valid.length - 1];
    case "reject":
      throw new RangeError("Multiple possible absolute times found");
  }
  switch (disambiguation) {
    case "earlier":
      return Math.min(ms - offsetBefore, ms - offsetAfter);
    // 'compatible' means 'later' for "spring forward" transitions
    case "compatible":
    case "later":
      return Math.max(ms - offsetBefore, ms - offsetAfter);
    case "reject":
      throw new RangeError("No such absolute time found");
  }
}
function $d07e34cce18680fd$export$e67a095c620b86fe(dateTime, timeZone, disambiguation = "compatible") {
  return new Date($d07e34cce18680fd$export$5107c82f94518f5c(dateTime, timeZone, disambiguation));
}
function $d07e34cce18680fd$export$1b96692a1ba042ac(ms, timeZone) {
  let offset = $d07e34cce18680fd$export$59c99f3515d3493f(ms, timeZone);
  let date = new Date(ms + offset);
  let year = date.getUTCFullYear();
  let month = date.getUTCMonth() + 1;
  let day = date.getUTCDate();
  let hour = date.getUTCHours();
  let minute = date.getUTCMinutes();
  let second = date.getUTCSeconds();
  let millisecond = date.getUTCMilliseconds();
  return new $2aaf608024c21ca1$export$d3b7288e7994edea(year < 1 ? "BC" : "AD", year < 1 ? -year + 1 : year, month, day, timeZone, offset, hour, minute, second, millisecond);
}
function $d07e34cce18680fd$export$93522d1a439f3617(dateTime) {
  return new $2aaf608024c21ca1$export$99faa760c7908e4f(dateTime.calendar, dateTime.era, dateTime.year, dateTime.month, dateTime.day);
}
function $d07e34cce18680fd$export$b21e0b124e224484(date, time) {
  let hour = 0, minute = 0, second = 0, millisecond = 0;
  if ("timeZone" in date) ({ hour, minute, second, millisecond } = date);
  else if ("hour" in date && true) return date;
  return new $2aaf608024c21ca1$export$ca871e8dbb80966f(date.calendar, date.era, date.year, date.month, date.day, hour, minute, second, millisecond);
}
function $d07e34cce18680fd$export$b4a036af3fc0b032(date, calendar) {
  if ($ad063034c8620db8$export$dbc69fd56b53d5e(date.calendar, calendar)) return date;
  let calendarDate = calendar.fromJulianDay(date.calendar.toJulianDay(date));
  let copy = date.copy();
  copy.calendar = calendar;
  copy.era = calendarDate.era;
  copy.year = calendarDate.year;
  copy.month = calendarDate.month;
  copy.day = calendarDate.day;
  $435a2ceaa8778ed8$export$c4e2ecac49351ef2(copy);
  return copy;
}
function $d07e34cce18680fd$export$84c95a83c799e074(date, timeZone, disambiguation) {
  if (date instanceof $2aaf608024c21ca1$export$d3b7288e7994edea) {
    if (date.timeZone === timeZone) return date;
    return $d07e34cce18680fd$export$538b00033cc11c75(date, timeZone);
  }
  let ms = $d07e34cce18680fd$export$5107c82f94518f5c(date, timeZone, disambiguation);
  return $d07e34cce18680fd$export$1b96692a1ba042ac(ms, timeZone);
}
function $d07e34cce18680fd$export$83aac07b4c37b25(date) {
  let ms = $d07e34cce18680fd$export$bd4fb2bc8bb06fb(date) - date.offset;
  return new Date(ms);
}
function $d07e34cce18680fd$export$538b00033cc11c75(date, timeZone) {
  let ms = $d07e34cce18680fd$export$bd4fb2bc8bb06fb(date) - date.offset;
  return $d07e34cce18680fd$export$b4a036af3fc0b032($d07e34cce18680fd$export$1b96692a1ba042ac(ms, timeZone), date.calendar);
}
const $435a2ceaa8778ed8$var$ONE_HOUR = 36e5;
function $435a2ceaa8778ed8$export$e16d8520af44a096(date, duration) {
  let mutableDate = date.copy();
  let days = "hour" in mutableDate ? $435a2ceaa8778ed8$var$addTimeFields(mutableDate, duration) : 0;
  $435a2ceaa8778ed8$var$addYears(mutableDate, duration.years || 0);
  if (mutableDate.calendar.balanceYearMonth) mutableDate.calendar.balanceYearMonth(mutableDate, date);
  mutableDate.month += duration.months || 0;
  $435a2ceaa8778ed8$var$balanceYearMonth(mutableDate);
  $435a2ceaa8778ed8$var$constrainMonthDay(mutableDate);
  mutableDate.day += (duration.weeks || 0) * 7;
  mutableDate.day += duration.days || 0;
  mutableDate.day += days;
  $435a2ceaa8778ed8$var$balanceDay(mutableDate);
  if (mutableDate.calendar.balanceDate) mutableDate.calendar.balanceDate(mutableDate);
  if (mutableDate.year < 1) {
    mutableDate.year = 1;
    mutableDate.month = 1;
    mutableDate.day = 1;
  }
  let maxYear = mutableDate.calendar.getYearsInEra(mutableDate);
  if (mutableDate.year > maxYear) {
    let isInverseEra = mutableDate.calendar.isInverseEra?.(mutableDate);
    mutableDate.year = maxYear;
    mutableDate.month = isInverseEra ? 1 : mutableDate.calendar.getMonthsInYear(mutableDate);
    mutableDate.day = isInverseEra ? 1 : mutableDate.calendar.getDaysInMonth(mutableDate);
  }
  if (mutableDate.month < 1) {
    mutableDate.month = 1;
    mutableDate.day = 1;
  }
  let maxMonth = mutableDate.calendar.getMonthsInYear(mutableDate);
  if (mutableDate.month > maxMonth) {
    mutableDate.month = maxMonth;
    mutableDate.day = mutableDate.calendar.getDaysInMonth(mutableDate);
  }
  mutableDate.day = Math.max(1, Math.min(mutableDate.calendar.getDaysInMonth(mutableDate), mutableDate.day));
  return mutableDate;
}
function $435a2ceaa8778ed8$var$addYears(date, years) {
  if (date.calendar.isInverseEra?.(date)) years = -years;
  date.year += years;
}
function $435a2ceaa8778ed8$var$balanceYearMonth(date) {
  while (date.month < 1) {
    $435a2ceaa8778ed8$var$addYears(date, -1);
    date.month += date.calendar.getMonthsInYear(date);
  }
  let monthsInYear = 0;
  while (date.month > (monthsInYear = date.calendar.getMonthsInYear(date))) {
    date.month -= monthsInYear;
    $435a2ceaa8778ed8$var$addYears(date, 1);
  }
}
function $435a2ceaa8778ed8$var$balanceDay(date) {
  while (date.day < 1) {
    date.month--;
    $435a2ceaa8778ed8$var$balanceYearMonth(date);
    date.day += date.calendar.getDaysInMonth(date);
  }
  while (date.day > date.calendar.getDaysInMonth(date)) {
    date.day -= date.calendar.getDaysInMonth(date);
    date.month++;
    $435a2ceaa8778ed8$var$balanceYearMonth(date);
  }
}
function $435a2ceaa8778ed8$var$constrainMonthDay(date) {
  date.month = Math.max(1, Math.min(date.calendar.getMonthsInYear(date), date.month));
  date.day = Math.max(1, Math.min(date.calendar.getDaysInMonth(date), date.day));
}
function $435a2ceaa8778ed8$export$c4e2ecac49351ef2(date) {
  if (date.calendar.constrainDate) date.calendar.constrainDate(date);
  date.year = Math.max(1, Math.min(date.calendar.getYearsInEra(date), date.year));
  $435a2ceaa8778ed8$var$constrainMonthDay(date);
}
function $435a2ceaa8778ed8$export$3e2544e88a25bff8(duration) {
  let inverseDuration = {};
  for (let key in duration) if (typeof duration[key] === "number") inverseDuration[key] = -duration[key];
  return inverseDuration;
}
function $435a2ceaa8778ed8$export$4e2d2ead65e5f7e3(date, duration) {
  return $435a2ceaa8778ed8$export$e16d8520af44a096(date, $435a2ceaa8778ed8$export$3e2544e88a25bff8(duration));
}
function $435a2ceaa8778ed8$export$adaa4cf7ef1b65be(date, fields) {
  let mutableDate = date.copy();
  if (fields.era != null) mutableDate.era = fields.era;
  if (fields.year != null) mutableDate.year = fields.year;
  if (fields.month != null) mutableDate.month = fields.month;
  if (fields.day != null) mutableDate.day = fields.day;
  $435a2ceaa8778ed8$export$c4e2ecac49351ef2(mutableDate);
  return mutableDate;
}
function $435a2ceaa8778ed8$export$e5d5e1c1822b6e56(value, fields) {
  let mutableValue = value.copy();
  if (fields.hour != null) mutableValue.hour = fields.hour;
  if (fields.minute != null) mutableValue.minute = fields.minute;
  if (fields.second != null) mutableValue.second = fields.second;
  if (fields.millisecond != null) mutableValue.millisecond = fields.millisecond;
  $435a2ceaa8778ed8$export$7555de1e070510cb(mutableValue);
  return mutableValue;
}
function $435a2ceaa8778ed8$var$balanceTime(time) {
  time.second += Math.floor(time.millisecond / 1e3);
  time.millisecond = $435a2ceaa8778ed8$var$nonNegativeMod(time.millisecond, 1e3);
  time.minute += Math.floor(time.second / 60);
  time.second = $435a2ceaa8778ed8$var$nonNegativeMod(time.second, 60);
  time.hour += Math.floor(time.minute / 60);
  time.minute = $435a2ceaa8778ed8$var$nonNegativeMod(time.minute, 60);
  let days = Math.floor(time.hour / 24);
  time.hour = $435a2ceaa8778ed8$var$nonNegativeMod(time.hour, 24);
  return days;
}
function $435a2ceaa8778ed8$export$7555de1e070510cb(time) {
  time.millisecond = Math.max(0, Math.min(time.millisecond, 1e3));
  time.second = Math.max(0, Math.min(time.second, 59));
  time.minute = Math.max(0, Math.min(time.minute, 59));
  time.hour = Math.max(0, Math.min(time.hour, 23));
}
function $435a2ceaa8778ed8$var$nonNegativeMod(a, b) {
  let result = a % b;
  if (result < 0) result += b;
  return result;
}
function $435a2ceaa8778ed8$var$addTimeFields(time, duration) {
  time.hour += duration.hours || 0;
  time.minute += duration.minutes || 0;
  time.second += duration.seconds || 0;
  time.millisecond += duration.milliseconds || 0;
  return $435a2ceaa8778ed8$var$balanceTime(time);
}
function $435a2ceaa8778ed8$export$d52ced6badfb9a4c(value, field, amount, options) {
  let mutable = value.copy();
  switch (field) {
    case "era": {
      let eras = value.calendar.getEras();
      let eraIndex = eras.indexOf(value.era);
      if (eraIndex < 0) throw new Error("Invalid era: " + value.era);
      eraIndex = $435a2ceaa8778ed8$var$cycleValue(eraIndex, amount, 0, eras.length - 1, options?.round);
      mutable.era = eras[eraIndex];
      $435a2ceaa8778ed8$export$c4e2ecac49351ef2(mutable);
      break;
    }
    case "year":
      if (mutable.calendar.isInverseEra?.(mutable)) amount = -amount;
      mutable.year = $435a2ceaa8778ed8$var$cycleValue(value.year, amount, -Infinity, 9999, options?.round);
      if (mutable.year === -Infinity) mutable.year = 1;
      if (mutable.calendar.balanceYearMonth) mutable.calendar.balanceYearMonth(mutable, value);
      break;
    case "month":
      mutable.month = $435a2ceaa8778ed8$var$cycleValue(value.month, amount, 1, value.calendar.getMonthsInYear(value), options?.round);
      break;
    case "day":
      mutable.day = $435a2ceaa8778ed8$var$cycleValue(value.day, amount, 1, value.calendar.getDaysInMonth(value), options?.round);
      break;
    default:
      throw new Error("Unsupported field " + field);
  }
  if (value.calendar.balanceDate) value.calendar.balanceDate(mutable);
  $435a2ceaa8778ed8$export$c4e2ecac49351ef2(mutable);
  return mutable;
}
function $435a2ceaa8778ed8$export$dd02b3e0007dfe28(value, field, amount, options) {
  let mutable = value.copy();
  switch (field) {
    case "hour": {
      let hours = value.hour;
      let min = 0;
      let max = 23;
      if (options?.hourCycle === 12) {
        let isPM = hours >= 12;
        min = isPM ? 12 : 0;
        max = isPM ? 23 : 11;
      }
      mutable.hour = $435a2ceaa8778ed8$var$cycleValue(hours, amount, min, max, options?.round);
      break;
    }
    case "minute":
      mutable.minute = $435a2ceaa8778ed8$var$cycleValue(value.minute, amount, 0, 59, options?.round);
      break;
    case "second":
      mutable.second = $435a2ceaa8778ed8$var$cycleValue(value.second, amount, 0, 59, options?.round);
      break;
    case "millisecond":
      mutable.millisecond = $435a2ceaa8778ed8$var$cycleValue(value.millisecond, amount, 0, 999, options?.round);
      break;
    default:
      throw new Error("Unsupported field " + field);
  }
  return mutable;
}
function $435a2ceaa8778ed8$var$cycleValue(value, amount, min, max, round = false) {
  if (round) {
    value += Math.sign(amount);
    if (value < min) value = max;
    let div = Math.abs(amount);
    if (amount > 0) value = Math.ceil(value / div) * div;
    else value = Math.floor(value / div) * div;
    if (value > max) value = min;
  } else {
    value += amount;
    if (value < min) value = max - (min - value - 1);
    else if (value > max) value = min + (value - max - 1);
  }
  return value;
}
function $435a2ceaa8778ed8$export$96b1d28349274637(dateTime, duration) {
  let ms;
  if (duration.years != null && duration.years !== 0 || duration.months != null && duration.months !== 0 || duration.weeks != null && duration.weeks !== 0 || duration.days != null && duration.days !== 0) {
    let res2 = $435a2ceaa8778ed8$export$e16d8520af44a096($d07e34cce18680fd$export$b21e0b124e224484(dateTime), {
      years: duration.years,
      months: duration.months,
      weeks: duration.weeks,
      days: duration.days
    });
    ms = $d07e34cce18680fd$export$5107c82f94518f5c(res2, dateTime.timeZone);
  } else
    ms = $d07e34cce18680fd$export$bd4fb2bc8bb06fb(dateTime) - dateTime.offset;
  ms += duration.milliseconds || 0;
  ms += (duration.seconds || 0) * 1e3;
  ms += (duration.minutes || 0) * 6e4;
  ms += (duration.hours || 0) * 36e5;
  let res = $d07e34cce18680fd$export$1b96692a1ba042ac(ms, dateTime.timeZone);
  return $d07e34cce18680fd$export$b4a036af3fc0b032(res, dateTime.calendar);
}
function $435a2ceaa8778ed8$export$6814caac34ca03c7(dateTime, duration) {
  return $435a2ceaa8778ed8$export$96b1d28349274637(dateTime, $435a2ceaa8778ed8$export$3e2544e88a25bff8(duration));
}
function $435a2ceaa8778ed8$export$9a297d111fc86b79(dateTime, field, amount, options) {
  switch (field) {
    case "hour": {
      let min = 0;
      let max = 23;
      if (options?.hourCycle === 12) {
        let isPM = dateTime.hour >= 12;
        min = isPM ? 12 : 0;
        max = isPM ? 23 : 11;
      }
      let plainDateTime = $d07e34cce18680fd$export$b21e0b124e224484(dateTime);
      let minDate = $d07e34cce18680fd$export$b4a036af3fc0b032($435a2ceaa8778ed8$export$e5d5e1c1822b6e56(plainDateTime, {
        hour: min
      }), new $93635573935797de$export$80ee6245ec4f29ec());
      let minAbsolute = [
        $d07e34cce18680fd$export$5107c82f94518f5c(minDate, dateTime.timeZone, "earlier"),
        $d07e34cce18680fd$export$5107c82f94518f5c(minDate, dateTime.timeZone, "later")
      ].filter((ms2) => $d07e34cce18680fd$export$1b96692a1ba042ac(ms2, dateTime.timeZone).day === minDate.day)[0];
      let maxDate = $d07e34cce18680fd$export$b4a036af3fc0b032($435a2ceaa8778ed8$export$e5d5e1c1822b6e56(plainDateTime, {
        hour: max
      }), new $93635573935797de$export$80ee6245ec4f29ec());
      let maxAbsolute = [
        $d07e34cce18680fd$export$5107c82f94518f5c(maxDate, dateTime.timeZone, "earlier"),
        $d07e34cce18680fd$export$5107c82f94518f5c(maxDate, dateTime.timeZone, "later")
      ].filter((ms2) => $d07e34cce18680fd$export$1b96692a1ba042ac(ms2, dateTime.timeZone).day === maxDate.day).pop();
      let ms = $d07e34cce18680fd$export$bd4fb2bc8bb06fb(dateTime) - dateTime.offset;
      let hours = Math.floor(ms / $435a2ceaa8778ed8$var$ONE_HOUR);
      let remainder = ms % $435a2ceaa8778ed8$var$ONE_HOUR;
      ms = $435a2ceaa8778ed8$var$cycleValue(hours, amount, Math.floor(minAbsolute / $435a2ceaa8778ed8$var$ONE_HOUR), Math.floor(maxAbsolute / $435a2ceaa8778ed8$var$ONE_HOUR), options?.round) * $435a2ceaa8778ed8$var$ONE_HOUR + remainder;
      return $d07e34cce18680fd$export$b4a036af3fc0b032($d07e34cce18680fd$export$1b96692a1ba042ac(ms, dateTime.timeZone), dateTime.calendar);
    }
    case "minute":
    case "second":
    case "millisecond":
      return $435a2ceaa8778ed8$export$dd02b3e0007dfe28(dateTime, field, amount, options);
    case "era":
    case "year":
    case "month":
    case "day": {
      let res = $435a2ceaa8778ed8$export$d52ced6badfb9a4c($d07e34cce18680fd$export$b21e0b124e224484(dateTime), field, amount, options);
      let ms = $d07e34cce18680fd$export$5107c82f94518f5c(res, dateTime.timeZone);
      return $d07e34cce18680fd$export$b4a036af3fc0b032($d07e34cce18680fd$export$1b96692a1ba042ac(ms, dateTime.timeZone), dateTime.calendar);
    }
    default:
      throw new Error("Unsupported field " + field);
  }
}
function $435a2ceaa8778ed8$export$31b5430eb18be4f8(dateTime, fields, disambiguation) {
  let plainDateTime = $d07e34cce18680fd$export$b21e0b124e224484(dateTime);
  let res = $435a2ceaa8778ed8$export$e5d5e1c1822b6e56($435a2ceaa8778ed8$export$adaa4cf7ef1b65be(plainDateTime, fields), fields);
  if (res.compare(plainDateTime) === 0) return dateTime;
  let ms = $d07e34cce18680fd$export$5107c82f94518f5c(res, dateTime.timeZone, disambiguation);
  return $d07e34cce18680fd$export$b4a036af3fc0b032($d07e34cce18680fd$export$1b96692a1ba042ac(ms, dateTime.timeZone), dateTime.calendar);
}
function $58246871e4652552$export$f59dee82248f5ad4(time) {
  return `${String(time.hour).padStart(2, "0")}:${String(time.minute).padStart(2, "0")}:${String(time.second).padStart(2, "0")}${time.millisecond ? String(time.millisecond / 1e3).slice(1) : ""}`;
}
function $58246871e4652552$export$60dfd74aa96791bd(date) {
  let gregorianDate = $d07e34cce18680fd$export$b4a036af3fc0b032(date, new $93635573935797de$export$80ee6245ec4f29ec());
  let year;
  if (gregorianDate.era === "BC") year = gregorianDate.year === 1 ? "0000" : "-" + String(Math.abs(1 - gregorianDate.year)).padStart(6, "00");
  else year = String(gregorianDate.year).padStart(4, "0");
  return `${year}-${String(gregorianDate.month).padStart(2, "0")}-${String(gregorianDate.day).padStart(2, "0")}`;
}
function $58246871e4652552$export$4223de14708adc63(date) {
  return `${$58246871e4652552$export$60dfd74aa96791bd(date)}T${$58246871e4652552$export$f59dee82248f5ad4(date)}`;
}
function $58246871e4652552$var$offsetToString(offset) {
  let sign = Math.sign(offset) < 0 ? "-" : "+";
  offset = Math.abs(offset);
  let offsetHours = Math.floor(offset / 36e5);
  let offsetMinutes = Math.floor(offset % 36e5 / 6e4);
  let offsetSeconds = Math.floor(offset % 36e5 % 6e4 / 1e3);
  let stringOffset = `${sign}${String(offsetHours).padStart(2, "0")}:${String(offsetMinutes).padStart(2, "0")}`;
  if (offsetSeconds !== 0) stringOffset += `:${String(offsetSeconds).padStart(2, "0")}`;
  return stringOffset;
}
function $58246871e4652552$export$bf79f1ebf4b18792(date) {
  return `${$58246871e4652552$export$4223de14708adc63(date)}${$58246871e4652552$var$offsetToString(date.offset)}[${date.timeZone}]`;
}
function $2aaf608024c21ca1$var$shiftArgs(args) {
  let calendar = typeof args[0] === "object" ? args.shift() : new $93635573935797de$export$80ee6245ec4f29ec();
  let era;
  if (typeof args[0] === "string") era = args.shift();
  else {
    let eras = calendar.getEras();
    era = eras[eras.length - 1];
  }
  let year = args.shift();
  let month = args.shift();
  let day = args.shift();
  return [
    calendar,
    era,
    year,
    month,
    day
  ];
}
class $2aaf608024c21ca1$export$99faa760c7908e4f {
  // This prevents TypeScript from allowing other types with the same fields to match.
  // i.e. a ZonedDateTime should not be be passable to a parameter that expects CalendarDate.
  // If that behavior is desired, use the AnyCalendarDate interface instead.
  // @ts-ignore
  #type;
  constructor(...args) {
    let [calendar, era, year, month, day] = $2aaf608024c21ca1$var$shiftArgs(args);
    this.calendar = calendar;
    this.era = era;
    this.year = year;
    this.month = month;
    this.day = day;
    $435a2ceaa8778ed8$export$c4e2ecac49351ef2(this);
  }
  /** Returns a copy of this date. */
  copy() {
    if (this.era) return new $2aaf608024c21ca1$export$99faa760c7908e4f(this.calendar, this.era, this.year, this.month, this.day);
    else return new $2aaf608024c21ca1$export$99faa760c7908e4f(this.calendar, this.year, this.month, this.day);
  }
  /** Returns a new `CalendarDate` with the given duration added to it. */
  add(duration) {
    return $435a2ceaa8778ed8$export$e16d8520af44a096(this, duration);
  }
  /** Returns a new `CalendarDate` with the given duration subtracted from it. */
  subtract(duration) {
    return $435a2ceaa8778ed8$export$4e2d2ead65e5f7e3(this, duration);
  }
  /** Returns a new `CalendarDate` with the given fields set to the provided values. Other fields will be constrained accordingly. */
  set(fields) {
    return $435a2ceaa8778ed8$export$adaa4cf7ef1b65be(this, fields);
  }
  /**
  * Returns a new `CalendarDate` with the given field adjusted by a specified amount.
  * When the resulting value reaches the limits of the field, it wraps around.
  */
  cycle(field, amount, options) {
    return $435a2ceaa8778ed8$export$d52ced6badfb9a4c(this, field, amount, options);
  }
  /** Converts the date to a native JavaScript Date object, with the time set to midnight in the given time zone. */
  toDate(timeZone) {
    return $d07e34cce18680fd$export$e67a095c620b86fe(this, timeZone);
  }
  /** Converts the date to an ISO 8601 formatted string. */
  toString() {
    return $58246871e4652552$export$60dfd74aa96791bd(this);
  }
  /** Compares this date with another. A negative result indicates that this date is before the given one, and a positive date indicates that it is after. */
  compare(b) {
    return $ad063034c8620db8$export$68781ddf31c0090f(this, b);
  }
}
class $2aaf608024c21ca1$export$ca871e8dbb80966f {
  // This prevents TypeScript from allowing other types with the same fields to match.
  // @ts-ignore
  #type;
  constructor(...args) {
    let [calendar, era, year, month, day] = $2aaf608024c21ca1$var$shiftArgs(args);
    this.calendar = calendar;
    this.era = era;
    this.year = year;
    this.month = month;
    this.day = day;
    this.hour = args.shift() || 0;
    this.minute = args.shift() || 0;
    this.second = args.shift() || 0;
    this.millisecond = args.shift() || 0;
    $435a2ceaa8778ed8$export$c4e2ecac49351ef2(this);
  }
  /** Returns a copy of this date. */
  copy() {
    if (this.era) return new $2aaf608024c21ca1$export$ca871e8dbb80966f(this.calendar, this.era, this.year, this.month, this.day, this.hour, this.minute, this.second, this.millisecond);
    else return new $2aaf608024c21ca1$export$ca871e8dbb80966f(this.calendar, this.year, this.month, this.day, this.hour, this.minute, this.second, this.millisecond);
  }
  /** Returns a new `CalendarDateTime` with the given duration added to it. */
  add(duration) {
    return $435a2ceaa8778ed8$export$e16d8520af44a096(this, duration);
  }
  /** Returns a new `CalendarDateTime` with the given duration subtracted from it. */
  subtract(duration) {
    return $435a2ceaa8778ed8$export$4e2d2ead65e5f7e3(this, duration);
  }
  /** Returns a new `CalendarDateTime` with the given fields set to the provided values. Other fields will be constrained accordingly. */
  set(fields) {
    return $435a2ceaa8778ed8$export$adaa4cf7ef1b65be($435a2ceaa8778ed8$export$e5d5e1c1822b6e56(this, fields), fields);
  }
  /**
  * Returns a new `CalendarDateTime` with the given field adjusted by a specified amount.
  * When the resulting value reaches the limits of the field, it wraps around.
  */
  cycle(field, amount, options) {
    switch (field) {
      case "era":
      case "year":
      case "month":
      case "day":
        return $435a2ceaa8778ed8$export$d52ced6badfb9a4c(this, field, amount, options);
      default:
        return $435a2ceaa8778ed8$export$dd02b3e0007dfe28(this, field, amount, options);
    }
  }
  /** Converts the date to a native JavaScript Date object in the given time zone. */
  toDate(timeZone, disambiguation) {
    return $d07e34cce18680fd$export$e67a095c620b86fe(this, timeZone, disambiguation);
  }
  /** Converts the date to an ISO 8601 formatted string. */
  toString() {
    return $58246871e4652552$export$4223de14708adc63(this);
  }
  /** Compares this date with another. A negative result indicates that this date is before the given one, and a positive date indicates that it is after. */
  compare(b) {
    let res = $ad063034c8620db8$export$68781ddf31c0090f(this, b);
    if (res === 0) return $ad063034c8620db8$export$c19a80a9721b80f6(this, $d07e34cce18680fd$export$b21e0b124e224484(b));
    return res;
  }
}
class $2aaf608024c21ca1$export$d3b7288e7994edea {
  // This prevents TypeScript from allowing other types with the same fields to match.
  // @ts-ignore
  #type;
  constructor(...args) {
    let [calendar, era, year, month, day] = $2aaf608024c21ca1$var$shiftArgs(args);
    let timeZone = args.shift();
    let offset = args.shift();
    this.calendar = calendar;
    this.era = era;
    this.year = year;
    this.month = month;
    this.day = day;
    this.timeZone = timeZone;
    this.offset = offset;
    this.hour = args.shift() || 0;
    this.minute = args.shift() || 0;
    this.second = args.shift() || 0;
    this.millisecond = args.shift() || 0;
    $435a2ceaa8778ed8$export$c4e2ecac49351ef2(this);
  }
  /** Returns a copy of this date. */
  copy() {
    if (this.era) return new $2aaf608024c21ca1$export$d3b7288e7994edea(this.calendar, this.era, this.year, this.month, this.day, this.timeZone, this.offset, this.hour, this.minute, this.second, this.millisecond);
    else return new $2aaf608024c21ca1$export$d3b7288e7994edea(this.calendar, this.year, this.month, this.day, this.timeZone, this.offset, this.hour, this.minute, this.second, this.millisecond);
  }
  /** Returns a new `ZonedDateTime` with the given duration added to it. */
  add(duration) {
    return $435a2ceaa8778ed8$export$96b1d28349274637(this, duration);
  }
  /** Returns a new `ZonedDateTime` with the given duration subtracted from it. */
  subtract(duration) {
    return $435a2ceaa8778ed8$export$6814caac34ca03c7(this, duration);
  }
  /** Returns a new `ZonedDateTime` with the given fields set to the provided values. Other fields will be constrained accordingly. */
  set(fields, disambiguation) {
    return $435a2ceaa8778ed8$export$31b5430eb18be4f8(this, fields, disambiguation);
  }
  /**
  * Returns a new `ZonedDateTime` with the given field adjusted by a specified amount.
  * When the resulting value reaches the limits of the field, it wraps around.
  */
  cycle(field, amount, options) {
    return $435a2ceaa8778ed8$export$9a297d111fc86b79(this, field, amount, options);
  }
  /** Converts the date to a native JavaScript Date object. */
  toDate() {
    return $d07e34cce18680fd$export$83aac07b4c37b25(this);
  }
  /** Converts the date to an ISO 8601 formatted string, including the UTC offset and time zone identifier. */
  toString() {
    return $58246871e4652552$export$bf79f1ebf4b18792(this);
  }
  /** Converts the date to an ISO 8601 formatted string in UTC. */
  toAbsoluteString() {
    return this.toDate().toISOString();
  }
  /** Compares this date with another. A negative result indicates that this date is before the given one, and a positive date indicates that it is after. */
  compare(b) {
    return this.toDate().getTime() - $d07e34cce18680fd$export$84c95a83c799e074(b, this.timeZone).toDate().getTime();
  }
}
let $12a3c853105e5a70$var$formatterCache = /* @__PURE__ */ new Map();
class $12a3c853105e5a70$export$ad991b66133851cf {
  constructor(locale, options = {}) {
    this.formatter = $12a3c853105e5a70$var$getCachedDateFormatter(locale, options);
    this.options = options;
  }
  /** Formats a date as a string according to the locale and format options passed to the constructor. */
  format(value) {
    return this.formatter.format(value);
  }
  /** Formats a date to an array of parts such as separators, numbers, punctuation, and more. */
  formatToParts(value) {
    return this.formatter.formatToParts(value);
  }
  /** Formats a date range as a string. */
  formatRange(start, end) {
    if (typeof this.formatter.formatRange === "function")
      return this.formatter.formatRange(start, end);
    if (end < start) throw new RangeError("End date must be >= start date");
    return `${this.formatter.format(start)} – ${this.formatter.format(end)}`;
  }
  /** Formats a date range as an array of parts. */
  formatRangeToParts(start, end) {
    if (typeof this.formatter.formatRangeToParts === "function")
      return this.formatter.formatRangeToParts(start, end);
    if (end < start) throw new RangeError("End date must be >= start date");
    let startParts = this.formatter.formatToParts(start);
    let endParts = this.formatter.formatToParts(end);
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
    let resolvedOptions = this.formatter.resolvedOptions();
    if ($12a3c853105e5a70$var$hasBuggyResolvedHourCycle()) {
      if (!this.resolvedHourCycle) this.resolvedHourCycle = $12a3c853105e5a70$var$getResolvedHourCycle(resolvedOptions.locale, this.options);
      resolvedOptions.hourCycle = this.resolvedHourCycle;
      resolvedOptions.hour12 = this.resolvedHourCycle === "h11" || this.resolvedHourCycle === "h12";
    }
    if (resolvedOptions.calendar === "ethiopic-amete-alem") resolvedOptions.calendar = "ethioaa";
    return resolvedOptions;
  }
}
const $12a3c853105e5a70$var$hour12Preferences = {
  true: {
    // Only Japanese uses the h11 style for 12 hour time. All others use h12.
    ja: "h11"
  },
  false: {}
};
function $12a3c853105e5a70$var$getCachedDateFormatter(locale, options = {}) {
  if (typeof options.hour12 === "boolean" && $12a3c853105e5a70$var$hasBuggyHour12Behavior()) {
    options = {
      ...options
    };
    let pref = $12a3c853105e5a70$var$hour12Preferences[String(options.hour12)][locale.split("-")[0]];
    let defaultHourCycle = options.hour12 ? "h12" : "h23";
    options.hourCycle = pref ?? defaultHourCycle;
    delete options.hour12;
  }
  let cacheKey = locale + (options ? Object.entries(options).sort((a, b) => a[0] < b[0] ? -1 : 1).join() : "");
  if ($12a3c853105e5a70$var$formatterCache.has(cacheKey)) return $12a3c853105e5a70$var$formatterCache.get(cacheKey);
  let numberFormatter = new Intl.DateTimeFormat(locale, options);
  $12a3c853105e5a70$var$formatterCache.set(cacheKey, numberFormatter);
  return numberFormatter;
}
let $12a3c853105e5a70$var$_hasBuggyHour12Behavior = null;
function $12a3c853105e5a70$var$hasBuggyHour12Behavior() {
  if ($12a3c853105e5a70$var$_hasBuggyHour12Behavior == null) $12a3c853105e5a70$var$_hasBuggyHour12Behavior = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    hour12: false
  }).format(new Date(2020, 2, 3, 0)) === "24";
  return $12a3c853105e5a70$var$_hasBuggyHour12Behavior;
}
let $12a3c853105e5a70$var$_hasBuggyResolvedHourCycle = null;
function $12a3c853105e5a70$var$hasBuggyResolvedHourCycle() {
  if ($12a3c853105e5a70$var$_hasBuggyResolvedHourCycle == null) $12a3c853105e5a70$var$_hasBuggyResolvedHourCycle = new Intl.DateTimeFormat("fr", {
    hour: "numeric",
    hour12: false
  }).resolvedOptions().hourCycle === "h12";
  return $12a3c853105e5a70$var$_hasBuggyResolvedHourCycle;
}
function $12a3c853105e5a70$var$getResolvedHourCycle(locale, options) {
  if (!options.timeStyle && !options.hour) return void 0;
  locale = locale.replace(/(-u-)?-nu-[a-zA-Z0-9]+/, "");
  locale += (locale.includes("-u-") ? "" : "-u") + "-nu-latn";
  let formatter = $12a3c853105e5a70$var$getCachedDateFormatter(locale, {
    ...options,
    timeZone: void 0
    // use local timezone
  });
  let min = parseInt(formatter.formatToParts(new Date(2020, 2, 3, 0)).find((p) => p.type === "hour").value, 10);
  let max = parseInt(formatter.formatToParts(new Date(2020, 2, 3, 23)).find((p) => p.type === "hour").value, 10);
  if (min === 0 && max === 23) return "h23";
  if (min === 24 && max === 23) return "h24";
  if (min === 0 && max === 11) return "h11";
  if (min === 12 && max === 11) return "h12";
  throw new Error("Unexpected hour cycle result");
}
function toDate(dateValue, tz = $ad063034c8620db8$export$aa8b41735afcabd2()) {
  if (isZonedDateTime(dateValue)) return dateValue.toDate();
  else return dateValue.toDate(tz);
}
function isCalendarDateTime(dateValue) {
  return dateValue instanceof $2aaf608024c21ca1$export$ca871e8dbb80966f;
}
function isZonedDateTime(dateValue) {
  return dateValue instanceof $2aaf608024c21ca1$export$d3b7288e7994edea;
}
function hasTime(dateValue) {
  return isCalendarDateTime(dateValue) || isZonedDateTime(dateValue);
}
function useDateFormatter(initialLocale, opts = {}) {
  const locale = vueExports.ref(initialLocale);
  function getLocale() {
    return locale.value;
  }
  function setLocale(newLocale) {
    locale.value = newLocale;
  }
  function custom(date, options) {
    return new $12a3c853105e5a70$export$ad991b66133851cf(locale.value, {
      ...opts,
      ...options
    }).format(date);
  }
  function selectedDate(date, includeTime = true) {
    if (hasTime(date) && includeTime) return custom(toDate(date), {
      dateStyle: "long",
      timeStyle: "long"
    });
    else return custom(toDate(date), { dateStyle: "long" });
  }
  function fullMonthAndYear(date, options = {}) {
    return new $12a3c853105e5a70$export$ad991b66133851cf(locale.value, {
      ...opts,
      month: "long",
      year: "numeric",
      ...options
    }).format(date);
  }
  function fullMonth(date, options = {}) {
    return new $12a3c853105e5a70$export$ad991b66133851cf(locale.value, {
      ...opts,
      month: "long",
      ...options
    }).format(date);
  }
  function getMonths() {
    const defaultDate = $ad063034c8620db8$export$d0bdf45af03a6ea3($ad063034c8620db8$export$aa8b41735afcabd2());
    const months = [
      1,
      2,
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      10,
      11,
      12
    ];
    return months.map((item) => ({
      label: fullMonth(toDate(defaultDate.set({ month: item }))),
      value: item
    }));
  }
  function fullYear(date, options = {}) {
    return new $12a3c853105e5a70$export$ad991b66133851cf(locale.value, {
      ...opts,
      year: "numeric",
      ...options
    }).format(date);
  }
  function toParts(date, options) {
    if (isZonedDateTime(date)) return new $12a3c853105e5a70$export$ad991b66133851cf(locale.value, {
      ...opts,
      ...options,
      timeZone: date.timeZone
    }).formatToParts(toDate(date));
    else return new $12a3c853105e5a70$export$ad991b66133851cf(locale.value, {
      ...opts,
      ...options
    }).formatToParts(toDate(date));
  }
  function dayOfWeek(date, length = "narrow") {
    return new $12a3c853105e5a70$export$ad991b66133851cf(locale.value, {
      ...opts,
      weekday: length
    }).format(date);
  }
  function dayPeriod(date) {
    const parts = new $12a3c853105e5a70$export$ad991b66133851cf(locale.value, {
      ...opts,
      hour: "numeric",
      minute: "numeric"
    }).formatToParts(date);
    const value = parts.find((p) => p.type === "dayPeriod")?.value;
    if (value === "PM" || value === "pm" || value === "p.m.") return "PM";
    return "AM";
  }
  const defaultPartOptions = {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric"
  };
  function part(dateObj, type, options = {}) {
    const opts$1 = {
      ...defaultPartOptions,
      ...options
    };
    const parts = toParts(dateObj, opts$1);
    const part$1 = parts.find((p) => p.type === type);
    return part$1 ? part$1.value : "";
  }
  return {
    setLocale,
    getLocale,
    fullMonth,
    fullYear,
    fullMonthAndYear,
    toParts,
    custom,
    part,
    dayPeriod,
    selectedDate,
    dayOfWeek,
    getMonths
  };
}
function usePrefix() {
  const appConfig = useAppConfig();
  const prefix = appConfig.ui?.prefix;
  return (classString) => {
    if (!prefix || !classString) {
      return classString;
    }
    return classString.split(/\s+/).filter(Boolean).map((cls) => `${prefix}:${cls}`).join(" ");
  };
}
const theme$3 = {
  "slots": {
    "root": "inline-flex flex-row-reverse justify-end",
    "base": "relative rounded-full ring-bg first:me-0"
  },
  "variants": {
    "size": {
      "3xs": {
        "base": "ring -me-0.5"
      },
      "2xs": {
        "base": "ring -me-0.5"
      },
      "xs": {
        "base": "ring -me-0.5"
      },
      "sm": {
        "base": "ring-2 -me-1.5"
      },
      "md": {
        "base": "ring-2 -me-1.5"
      },
      "lg": {
        "base": "ring-2 -me-1.5"
      },
      "xl": {
        "base": "ring-3 -me-2"
      },
      "2xl": {
        "base": "ring-3 -me-2"
      },
      "3xl": {
        "base": "ring-3 -me-2"
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
    }
  },
  "defaultVariants": {
    "size": "md",
    "color": "neutral"
  }
};
const _sfc_main$4 = {
  __name: "UAvatarGroup",
  __ssrInlineRender: true,
  props: {
    as: { type: null, required: false },
    size: { type: null, required: false },
    color: { type: null, required: false },
    max: { type: [Number, String], required: false },
    class: { type: null, required: false },
    ui: { type: Object, required: false }
  },
  setup(__props) {
    const _props = __props;
    const slots = vueExports.useSlots();
    const props = useComponentProps("avatarGroup", _props);
    const appConfig = useAppConfig();
    const ui = vueExports.computed(() => tv({ extend: tv(theme$3), ...appConfig.ui?.avatarGroup || {} })({
      size: props.size,
      color: props.color
    }));
    const max = vueExports.computed(() => typeof props.max === "string" ? Number.parseInt(props.max, 10) : props.max);
    const children = vueExports.computed(() => {
      let children2 = slots.default?.();
      if (children2?.length) {
        children2 = children2.flatMap((child) => {
          if (typeof child.type === "symbol") {
            if (typeof child.children === "string") {
              return;
            }
            return child.children;
          }
          return child;
        }).filter(Boolean);
      }
      return children2 || [];
    });
    const visibleAvatars = vueExports.computed(() => {
      if (!children.value.length) {
        return [];
      }
      if (!max.value || max.value <= 0) {
        return [...children.value].reverse();
      }
      return [...children.value].slice(0, max.value).reverse();
    });
    const hiddenCount = vueExports.computed(() => {
      if (!children.value.length) {
        return 0;
      }
      return children.value.length - visibleAvatars.value.length;
    });
    vueExports.provide(avatarGroupInjectionKey, vueExports.computed(() => ({
      size: props.size,
      color: props.color
    })));
    return (_ctx, _push, _parent, _attrs) => {
      _push(serverRenderer_cjs_prodExports.ssrRenderComponent(vueExports.unref(Primitive), vueExports.mergeProps({
        as: vueExports.unref(props).as,
        "data-slot": "root",
        class: ui.value.root({ class: [vueExports.unref(props).ui?.root, vueExports.unref(props).class] })
      }, _attrs), {
        default: vueExports.withCtx((_, _push2, _parent2, _scopeId) => {
          if (_push2) {
            if (hiddenCount.value > 0) {
              _push2(serverRenderer_cjs_prodExports.ssrRenderComponent(_sfc_main$c, {
                text: `+${hiddenCount.value}`,
                "data-slot": "base",
                class: ui.value.base({ class: vueExports.unref(props).ui?.base })
              }, null, _parent2, _scopeId));
            } else {
              _push2(`<!---->`);
            }
            _push2(`<!--[-->`);
            serverRenderer_cjs_prodExports.ssrRenderList(visibleAvatars.value, (avatar, count) => {
              serverRenderer_cjs_prodExports.ssrRenderVNode(_push2, vueExports.createVNode(vueExports.resolveDynamicComponent(avatar), {
                key: count,
                "data-slot": "base",
                class: ui.value.base({ class: vueExports.unref(props).ui?.base })
              }, null), _parent2, _scopeId);
            });
            _push2(`<!--]-->`);
          } else {
            return [
              hiddenCount.value > 0 ? (vueExports.openBlock(), vueExports.createBlock(_sfc_main$c, {
                key: 0,
                text: `+${hiddenCount.value}`,
                "data-slot": "base",
                class: ui.value.base({ class: vueExports.unref(props).ui?.base })
              }, null, 8, ["text", "class"])) : vueExports.createCommentVNode("", true),
              (vueExports.openBlock(true), vueExports.createBlock(vueExports.Fragment, null, vueExports.renderList(visibleAvatars.value, (avatar, count) => {
                return vueExports.openBlock(), vueExports.createBlock(vueExports.resolveDynamicComponent(avatar), {
                  key: count,
                  "data-slot": "base",
                  class: ui.value.base({ class: vueExports.unref(props).ui?.base })
                }, null, 8, ["class"]);
              }), 128))
            ];
          }
        }),
        _: 1
      }, _parent));
    };
  }
};
const _sfc_setup$4 = _sfc_main$4.setup;
_sfc_main$4.setup = (props, ctx) => {
  const ssrContext = vueExports.useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("../node_modules/.pnpm/@nuxt+ui@4.8.0_@internationalized+date@3.12.1_@internationalized+number@3.6.6_@tiptap+e_d719e0a183cea98ed15f9fdb5506ba26/node_modules/@nuxt/ui/dist/runtime/components/AvatarGroup.vue");
  return _sfc_setup$4 ? _sfc_setup$4(props, ctx) : void 0;
};
const theme$2 = {
  "slots": {
    "root": "relative group/user",
    "wrapper": "",
    "name": "font-medium",
    "description": "text-muted",
    "avatar": "shrink-0"
  },
  "variants": {
    "orientation": {
      "horizontal": {
        "root": "flex items-center"
      },
      "vertical": {
        "root": "flex flex-col"
      }
    },
    "to": {
      "true": {
        "name": [
          "text-default peer-hover:text-highlighted peer-focus-visible:text-highlighted",
          "transition-colors"
        ],
        "description": [
          "peer-hover:text-toned peer-focus-visible:text-toned",
          "transition-colors"
        ],
        "avatar": "transform transition-transform duration-200 group-hover/user:scale-115 group-has-focus-visible/user:scale-115"
      },
      "false": {
        "name": "text-highlighted",
        "description": ""
      }
    },
    "size": {
      "3xs": {
        "root": "gap-1",
        "wrapper": "flex items-center gap-1",
        "name": "text-xs",
        "description": "text-xs"
      },
      "2xs": {
        "root": "gap-1.5",
        "wrapper": "flex items-center gap-1.5",
        "name": "text-xs",
        "description": "text-xs"
      },
      "xs": {
        "root": "gap-1.5",
        "wrapper": "flex items-center gap-1.5",
        "name": "text-xs",
        "description": "text-xs"
      },
      "sm": {
        "root": "gap-2",
        "name": "text-xs",
        "description": "text-xs"
      },
      "md": {
        "root": "gap-2",
        "name": "text-sm",
        "description": "text-xs"
      },
      "lg": {
        "root": "gap-2.5",
        "name": "text-sm",
        "description": "text-sm"
      },
      "xl": {
        "root": "gap-2.5",
        "name": "text-base",
        "description": "text-sm"
      },
      "2xl": {
        "root": "gap-3",
        "name": "text-base",
        "description": "text-base"
      },
      "3xl": {
        "root": "gap-3",
        "name": "text-lg",
        "description": "text-base"
      }
    }
  },
  "defaultVariants": {
    "size": "md"
  }
};
const _sfc_main$3 = /* @__PURE__ */ Object.assign({ inheritAttrs: false }, {
  __name: "UUser",
  __ssrInlineRender: true,
  props: {
    as: { type: null, required: false },
    name: { type: String, required: false },
    description: { type: String, required: false },
    avatar: { type: Object, required: false },
    chip: { type: [Boolean, Object], required: false },
    size: { type: null, required: false },
    orientation: { type: null, required: false, default: "horizontal" },
    to: { type: null, required: false },
    target: { type: [String, Object, null], required: false },
    onClick: { type: Function, required: false },
    class: { type: null, required: false },
    ui: { type: Object, required: false }
  },
  setup(__props) {
    const _props = __props;
    const slots = vueExports.useSlots();
    const props = useComponentProps("user", _props);
    const appConfig = useAppConfig();
    const prefix = usePrefix();
    const ui = vueExports.computed(() => tv({ extend: tv(theme$2), ...appConfig.ui?.user || {} })({
      size: props.size,
      orientation: props.orientation,
      to: !!props.to || !!props.onClick
    }));
    return (_ctx, _push, _parent, _attrs) => {
      _push(serverRenderer_cjs_prodExports.ssrRenderComponent(vueExports.unref(Primitive), vueExports.mergeProps({
        as: vueExports.unref(props).as,
        "data-orientation": vueExports.unref(props).orientation,
        "data-slot": "root",
        class: ui.value.root({ class: [vueExports.unref(props).ui?.root, vueExports.unref(props).class] }),
        onClick: vueExports.unref(props).onClick
      }, _attrs), {
        default: vueExports.withCtx((_, _push2, _parent2, _scopeId) => {
          if (_push2) {
            serverRenderer_cjs_prodExports.ssrRenderSlot(_ctx.$slots, "avatar", { ui: ui.value }, () => {
              if (vueExports.unref(props).chip && vueExports.unref(props).avatar) {
                _push2(serverRenderer_cjs_prodExports.ssrRenderComponent(_sfc_main$d, vueExports.mergeProps({ inset: "" }, typeof vueExports.unref(props).chip === "object" ? vueExports.unref(props).chip : {}, {
                  size: vueExports.unref(props).size
                }), {
                  default: vueExports.withCtx((_2, _push3, _parent3, _scopeId2) => {
                    if (_push3) {
                      _push3(serverRenderer_cjs_prodExports.ssrRenderComponent(_sfc_main$c, vueExports.mergeProps({
                        alt: vueExports.unref(props).name
                      }, vueExports.unref(props).avatar, {
                        size: vueExports.unref(props).size,
                        "data-slot": "avatar",
                        class: ui.value.avatar({ class: vueExports.unref(props).ui?.avatar })
                      }), null, _parent3, _scopeId2));
                    } else {
                      return [
                        vueExports.createVNode(_sfc_main$c, vueExports.mergeProps({
                          alt: vueExports.unref(props).name
                        }, vueExports.unref(props).avatar, {
                          size: vueExports.unref(props).size,
                          "data-slot": "avatar",
                          class: ui.value.avatar({ class: vueExports.unref(props).ui?.avatar })
                        }), null, 16, ["alt", "size", "class"])
                      ];
                    }
                  }),
                  _: 1
                }, _parent2, _scopeId));
              } else if (vueExports.unref(props).avatar) {
                _push2(serverRenderer_cjs_prodExports.ssrRenderComponent(_sfc_main$c, vueExports.mergeProps({
                  alt: vueExports.unref(props).name
                }, vueExports.unref(props).avatar, {
                  size: vueExports.unref(props).size,
                  "data-slot": "avatar",
                  class: ui.value.avatar({ class: vueExports.unref(props).ui?.avatar })
                }), null, _parent2, _scopeId));
              } else {
                _push2(`<!---->`);
              }
            }, _push2, _parent2, _scopeId);
            _push2(`<div data-slot="wrapper" class="${serverRenderer_cjs_prodExports.ssrRenderClass(ui.value.wrapper({ class: vueExports.unref(props).ui?.wrapper }))}"${_scopeId}>`);
            if (vueExports.unref(props).to) {
              _push2(serverRenderer_cjs_prodExports.ssrRenderComponent(_sfc_main$a, vueExports.mergeProps({
                "aria-label": vueExports.unref(props).name
              }, { to: vueExports.unref(props).to, target: vueExports.unref(props).target, ..._ctx.$attrs }, {
                class: vueExports.unref(prefix)("focus:outline-none peer"),
                raw: ""
              }), {
                default: vueExports.withCtx((_2, _push3, _parent3, _scopeId2) => {
                  if (_push3) {
                    _push3(`<span class="${serverRenderer_cjs_prodExports.ssrRenderClass(vueExports.unref(prefix)("absolute inset-0"))}" aria-hidden="true"${_scopeId2}></span>`);
                  } else {
                    return [
                      vueExports.createVNode("span", {
                        class: vueExports.unref(prefix)("absolute inset-0"),
                        "aria-hidden": "true"
                      }, null, 2)
                    ];
                  }
                }),
                _: 1
              }, _parent2, _scopeId));
            } else {
              _push2(`<!---->`);
            }
            serverRenderer_cjs_prodExports.ssrRenderSlot(_ctx.$slots, "default", {}, () => {
              if (vueExports.unref(props).name || !!slots.name) {
                _push2(`<p data-slot="name" class="${serverRenderer_cjs_prodExports.ssrRenderClass(ui.value.name({ class: vueExports.unref(props).ui?.name }))}"${_scopeId}>`);
                serverRenderer_cjs_prodExports.ssrRenderSlot(_ctx.$slots, "name", {}, () => {
                  _push2(`${serverRenderer_cjs_prodExports.ssrInterpolate(vueExports.unref(props).name)}`);
                }, _push2, _parent2, _scopeId);
                _push2(`</p>`);
              } else {
                _push2(`<!---->`);
              }
              if (vueExports.unref(props).description || !!slots.description) {
                _push2(`<p data-slot="description" class="${serverRenderer_cjs_prodExports.ssrRenderClass(ui.value.description({ class: vueExports.unref(props).ui?.description }))}"${_scopeId}>`);
                serverRenderer_cjs_prodExports.ssrRenderSlot(_ctx.$slots, "description", {}, () => {
                  _push2(`${serverRenderer_cjs_prodExports.ssrInterpolate(vueExports.unref(props).description)}`);
                }, _push2, _parent2, _scopeId);
                _push2(`</p>`);
              } else {
                _push2(`<!---->`);
              }
            }, _push2, _parent2, _scopeId);
            _push2(`</div>`);
          } else {
            return [
              vueExports.renderSlot(_ctx.$slots, "avatar", { ui: ui.value }, () => [
                vueExports.unref(props).chip && vueExports.unref(props).avatar ? (vueExports.openBlock(), vueExports.createBlock(_sfc_main$d, vueExports.mergeProps({
                  key: 0,
                  inset: ""
                }, typeof vueExports.unref(props).chip === "object" ? vueExports.unref(props).chip : {}, {
                  size: vueExports.unref(props).size
                }), {
                  default: vueExports.withCtx(() => [
                    vueExports.createVNode(_sfc_main$c, vueExports.mergeProps({
                      alt: vueExports.unref(props).name
                    }, vueExports.unref(props).avatar, {
                      size: vueExports.unref(props).size,
                      "data-slot": "avatar",
                      class: ui.value.avatar({ class: vueExports.unref(props).ui?.avatar })
                    }), null, 16, ["alt", "size", "class"])
                  ]),
                  _: 1
                }, 16, ["size"])) : vueExports.unref(props).avatar ? (vueExports.openBlock(), vueExports.createBlock(_sfc_main$c, vueExports.mergeProps({
                  key: 1,
                  alt: vueExports.unref(props).name
                }, vueExports.unref(props).avatar, {
                  size: vueExports.unref(props).size,
                  "data-slot": "avatar",
                  class: ui.value.avatar({ class: vueExports.unref(props).ui?.avatar })
                }), null, 16, ["alt", "size", "class"])) : vueExports.createCommentVNode("", true)
              ]),
              vueExports.createVNode("div", {
                "data-slot": "wrapper",
                class: ui.value.wrapper({ class: vueExports.unref(props).ui?.wrapper })
              }, [
                vueExports.unref(props).to ? (vueExports.openBlock(), vueExports.createBlock(_sfc_main$a, vueExports.mergeProps({
                  key: 0,
                  "aria-label": vueExports.unref(props).name
                }, { to: vueExports.unref(props).to, target: vueExports.unref(props).target, ..._ctx.$attrs }, {
                  class: vueExports.unref(prefix)("focus:outline-none peer"),
                  raw: ""
                }), {
                  default: vueExports.withCtx(() => [
                    vueExports.createVNode("span", {
                      class: vueExports.unref(prefix)("absolute inset-0"),
                      "aria-hidden": "true"
                    }, null, 2)
                  ]),
                  _: 1
                }, 16, ["aria-label", "class"])) : vueExports.createCommentVNode("", true),
                vueExports.renderSlot(_ctx.$slots, "default", {}, () => [
                  vueExports.unref(props).name || !!slots.name ? (vueExports.openBlock(), vueExports.createBlock("p", {
                    key: 0,
                    "data-slot": "name",
                    class: ui.value.name({ class: vueExports.unref(props).ui?.name })
                  }, [
                    vueExports.renderSlot(_ctx.$slots, "name", {}, () => [
                      vueExports.createTextVNode(vueExports.toDisplayString(vueExports.unref(props).name), 1)
                    ])
                  ], 2)) : vueExports.createCommentVNode("", true),
                  vueExports.unref(props).description || !!slots.description ? (vueExports.openBlock(), vueExports.createBlock("p", {
                    key: 1,
                    "data-slot": "description",
                    class: ui.value.description({ class: vueExports.unref(props).ui?.description })
                  }, [
                    vueExports.renderSlot(_ctx.$slots, "description", {}, () => [
                      vueExports.createTextVNode(vueExports.toDisplayString(vueExports.unref(props).description), 1)
                    ])
                  ], 2)) : vueExports.createCommentVNode("", true)
                ])
              ], 2)
            ];
          }
        }),
        _: 3
      }, _parent));
    };
  }
});
const _sfc_setup$3 = _sfc_main$3.setup;
_sfc_main$3.setup = (props, ctx) => {
  const ssrContext = vueExports.useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("../node_modules/.pnpm/@nuxt+ui@4.8.0_@internationalized+date@3.12.1_@internationalized+number@3.6.6_@tiptap+e_d719e0a183cea98ed15f9fdb5506ba26/node_modules/@nuxt/ui/dist/runtime/components/User.vue");
  return _sfc_setup$3 ? _sfc_setup$3(props, ctx) : void 0;
};
const theme$1 = {
  "slots": {
    "root": "relative group/blog-post flex flex-col rounded-lg overflow-hidden",
    "header": "relative overflow-hidden aspect-[16/9] w-full pointer-events-none",
    "body": "min-w-0 flex-1 flex flex-col",
    "footer": "",
    "image": "object-cover object-top w-full h-full",
    "title": "text-xl text-pretty font-semibold text-highlighted",
    "description": "mt-1 text-base text-pretty",
    "authors": "pt-4 mt-auto flex flex-wrap gap-x-3 gap-y-1.5",
    "avatar": "",
    "meta": "flex items-center gap-2 mb-2",
    "date": "text-sm",
    "badge": ""
  },
  "variants": {
    "orientation": {
      "horizontal": {
        "root": "lg:grid lg:grid-cols-2 lg:items-center gap-x-8",
        "body": "justify-center p-4 sm:p-6 lg:px-0"
      },
      "vertical": {
        "root": "flex flex-col",
        "body": "p-4 sm:p-6"
      }
    },
    "variant": {
      "outline": {
        "root": "bg-default ring ring-default",
        "date": "text-toned",
        "description": "text-muted"
      },
      "soft": {
        "root": "bg-elevated/50",
        "date": "text-muted",
        "description": "text-toned"
      },
      "subtle": {
        "root": "bg-elevated/50 ring ring-default",
        "date": "text-muted",
        "description": "text-toned"
      },
      "ghost": {
        "date": "text-toned",
        "description": "text-muted",
        "header": "shadow-lg rounded-lg"
      },
      "naked": {
        "root": "p-0 sm:p-0",
        "date": "text-toned",
        "description": "text-muted",
        "header": "shadow-lg rounded-lg"
      }
    },
    "to": {
      "true": {
        "root": [
          "has-focus-visible:ring-2 has-focus-visible:ring-primary",
          "transition"
        ],
        "image": "transform transition-transform duration-200 group-hover/blog-post:scale-110",
        "avatar": "transform transition-transform duration-200 hover:scale-115 focus-visible:outline-primary"
      }
    },
    "image": {
      "true": ""
    }
  },
  "compoundVariants": [
    {
      "variant": "outline",
      "to": true,
      "class": {
        "root": "hover:bg-elevated/50"
      }
    },
    {
      "variant": "soft",
      "to": true,
      "class": {
        "root": "hover:bg-elevated"
      }
    },
    {
      "variant": "subtle",
      "to": true,
      "class": {
        "root": "hover:bg-elevated hover:ring-accented"
      }
    },
    {
      "variant": "ghost",
      "to": true,
      "class": {
        "root": "hover:bg-elevated/50",
        "header": [
          "group-hover/blog-post:shadow-none",
          "transition-all"
        ]
      }
    },
    {
      "variant": "ghost",
      "to": true,
      "orientation": "vertical",
      "class": {
        "header": "group-hover/blog-post:rounded-b-none"
      }
    },
    {
      "variant": "ghost",
      "to": true,
      "orientation": "horizontal",
      "class": {
        "header": "group-hover/blog-post:rounded-r-none"
      }
    },
    {
      "orientation": "vertical",
      "image": false,
      "variant": "naked",
      "class": {
        "body": "p-0 sm:p-0"
      }
    }
  ],
  "defaultVariants": {
    "variant": "outline"
  }
};
const _sfc_main$2 = /* @__PURE__ */ Object.assign({ inheritAttrs: false }, {
  __name: "UBlogPost",
  __ssrInlineRender: true,
  props: {
    as: { type: null, required: false, default: "article" },
    title: { type: String, required: false },
    description: { type: String, required: false },
    date: { type: [String, Date], required: false },
    badge: { type: [String, Object], required: false },
    authors: { type: Array, required: false },
    image: { type: [String, Object], required: false },
    orientation: { type: null, required: false, default: "vertical" },
    variant: { type: null, required: false },
    to: { type: null, required: false },
    target: { type: [String, Object, null], required: false },
    onClick: { type: Function, required: false },
    class: { type: null, required: false },
    ui: { type: Object, required: false }
  },
  setup(__props) {
    const _props = __props;
    const slots = vueExports.useSlots();
    const props = useComponentProps("blogPost", _props);
    const { locale } = useLocale();
    const appConfig = useAppConfig();
    const formatter = useDateFormatter(locale.value.code);
    const prefix = usePrefix();
    const ui = vueExports.computed(() => tv({ extend: tv(theme$1), ...appConfig.ui?.blogPost || {} })({
      orientation: props.orientation,
      variant: props.variant,
      image: !!props.image,
      to: !!props.to || !!props.onClick
    }));
    const date = vueExports.computed(() => {
      if (!props.date) {
        return;
      }
      try {
        return formatter.custom(new Date(props.date), { dateStyle: "medium" });
      } catch {
        return props.date;
      }
    });
    const datetime = vueExports.computed(() => {
      if (!props.date) {
        return;
      }
      try {
        return new Date(props.date)?.toISOString();
      } catch {
        return void 0;
      }
    });
    const ariaLabel = vueExports.computed(() => {
      const slotText = slots.title && getSlotChildrenText(slots.title());
      return (slotText || props.title || "Post link").trim();
    });
    return (_ctx, _push, _parent, _attrs) => {
      _push(serverRenderer_cjs_prodExports.ssrRenderComponent(vueExports.unref(Primitive), vueExports.mergeProps({
        as: vueExports.unref(props).as,
        "data-orientation": vueExports.unref(props).orientation,
        "data-slot": "root",
        class: ui.value.root({ class: [vueExports.unref(props).ui?.root, vueExports.unref(props).class] }),
        onClick: vueExports.unref(props).onClick
      }, _attrs), {
        default: vueExports.withCtx((_, _push2, _parent2, _scopeId) => {
          if (_push2) {
            if (vueExports.unref(props).image || !!slots.header) {
              _push2(`<div data-slot="header" class="${serverRenderer_cjs_prodExports.ssrRenderClass(ui.value.header({ class: vueExports.unref(props).ui?.header }))}"${_scopeId}>`);
              serverRenderer_cjs_prodExports.ssrRenderSlot(_ctx.$slots, "header", { ui: ui.value }, () => {
                serverRenderer_cjs_prodExports.ssrRenderVNode(_push2, vueExports.createVNode(vueExports.resolveDynamicComponent(vueExports.unref(__nuxt_component_2$1)), vueExports.mergeProps(typeof vueExports.unref(props).image === "string" ? { src: vueExports.unref(props).image, alt: vueExports.unref(props).title } : { alt: vueExports.unref(props).title, ...vueExports.unref(props).image }, {
                  "data-slot": "image",
                  class: ui.value.image({ class: vueExports.unref(props).ui?.image, to: !!vueExports.unref(props).to })
                }), null), _parent2, _scopeId);
              }, _push2, _parent2, _scopeId);
              _push2(`</div>`);
            } else {
              _push2(`<!---->`);
            }
            _push2(`<div data-slot="body" class="${serverRenderer_cjs_prodExports.ssrRenderClass(ui.value.body({ class: vueExports.unref(props).ui?.body }))}"${_scopeId}>`);
            if (vueExports.unref(props).to) {
              _push2(serverRenderer_cjs_prodExports.ssrRenderComponent(_sfc_main$a, vueExports.mergeProps({ "aria-label": ariaLabel.value }, { to: vueExports.unref(props).to, target: vueExports.unref(props).target, ..._ctx.$attrs }, {
                class: vueExports.unref(prefix)("focus:outline-none peer"),
                raw: ""
              }), {
                default: vueExports.withCtx((_2, _push3, _parent3, _scopeId2) => {
                  if (_push3) {
                    _push3(`<span class="${serverRenderer_cjs_prodExports.ssrRenderClass(vueExports.unref(prefix)("absolute inset-0"))}" aria-hidden="true"${_scopeId2}></span>`);
                  } else {
                    return [
                      vueExports.createVNode("span", {
                        class: vueExports.unref(prefix)("absolute inset-0"),
                        "aria-hidden": "true"
                      }, null, 2)
                    ];
                  }
                }),
                _: 1
              }, _parent2, _scopeId));
            } else {
              _push2(`<!---->`);
            }
            serverRenderer_cjs_prodExports.ssrRenderSlot(_ctx.$slots, "body", {}, () => {
              if (date.value || !!slots.date || (vueExports.unref(props).badge || !!slots.badge)) {
                _push2(`<div data-slot="meta" class="${serverRenderer_cjs_prodExports.ssrRenderClass(ui.value.meta({ class: vueExports.unref(props).ui?.meta }))}"${_scopeId}>`);
                serverRenderer_cjs_prodExports.ssrRenderSlot(_ctx.$slots, "badge", {}, () => {
                  if (vueExports.unref(props).badge) {
                    _push2(serverRenderer_cjs_prodExports.ssrRenderComponent(_sfc_main$6, vueExports.mergeProps({
                      color: "neutral",
                      variant: "subtle"
                    }, typeof vueExports.unref(props).badge === "string" ? { label: vueExports.unref(props).badge } : vueExports.unref(props).badge, {
                      "data-slot": "badge",
                      class: ui.value.badge({ class: vueExports.unref(props).ui?.badge })
                    }), null, _parent2, _scopeId));
                  } else {
                    _push2(`<!---->`);
                  }
                }, _push2, _parent2, _scopeId);
                if (date.value || !!slots.date) {
                  _push2(`<time${serverRenderer_cjs_prodExports.ssrRenderAttr("datetime", datetime.value)} data-slot="date" class="${serverRenderer_cjs_prodExports.ssrRenderClass(ui.value.date({ class: vueExports.unref(props).ui?.date }))}"${_scopeId}>`);
                  serverRenderer_cjs_prodExports.ssrRenderSlot(_ctx.$slots, "date", {}, () => {
                    _push2(`${serverRenderer_cjs_prodExports.ssrInterpolate(date.value)}`);
                  }, _push2, _parent2, _scopeId);
                  _push2(`</time>`);
                } else {
                  _push2(`<!---->`);
                }
                _push2(`</div>`);
              } else {
                _push2(`<!---->`);
              }
              if (vueExports.unref(props).title || !!slots.title) {
                _push2(`<h2 data-slot="title" class="${serverRenderer_cjs_prodExports.ssrRenderClass(ui.value.title({ class: vueExports.unref(props).ui?.title }))}"${_scopeId}>`);
                serverRenderer_cjs_prodExports.ssrRenderSlot(_ctx.$slots, "title", {}, () => {
                  _push2(`${serverRenderer_cjs_prodExports.ssrInterpolate(vueExports.unref(props).title)}`);
                }, _push2, _parent2, _scopeId);
                _push2(`</h2>`);
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
              if (vueExports.unref(props).authors?.length || !!slots.authors) {
                _push2(`<div data-slot="authors" class="${serverRenderer_cjs_prodExports.ssrRenderClass(ui.value.authors({ class: vueExports.unref(props).ui?.authors }))}"${_scopeId}>`);
                serverRenderer_cjs_prodExports.ssrRenderSlot(_ctx.$slots, "authors", { ui: ui.value }, () => {
                  if (vueExports.unref(props).authors?.length) {
                    _push2(`<!--[-->`);
                    if (vueExports.unref(props).authors.length > 1) {
                      _push2(serverRenderer_cjs_prodExports.ssrRenderComponent(_sfc_main$4, null, {
                        default: vueExports.withCtx((_2, _push3, _parent3, _scopeId2) => {
                          if (_push3) {
                            _push3(`<!--[-->`);
                            serverRenderer_cjs_prodExports.ssrRenderList(vueExports.unref(props).authors, (author, index) => {
                              _push3(serverRenderer_cjs_prodExports.ssrRenderComponent(_sfc_main$a, {
                                key: index,
                                to: author.to,
                                target: author.target,
                                "data-slot": "avatar",
                                class: ui.value.avatar({ class: vueExports.unref(props).ui?.avatar, to: !!author.to }),
                                raw: ""
                              }, {
                                default: vueExports.withCtx((_3, _push4, _parent4, _scopeId3) => {
                                  if (_push4) {
                                    _push4(serverRenderer_cjs_prodExports.ssrRenderComponent(_sfc_main$c, vueExports.mergeProps({ ref_for: true }, author.avatar), null, _parent4, _scopeId3));
                                  } else {
                                    return [
                                      vueExports.createVNode(_sfc_main$c, vueExports.mergeProps({ ref_for: true }, author.avatar), null, 16)
                                    ];
                                  }
                                }),
                                _: 2
                              }, _parent3, _scopeId2));
                            });
                            _push3(`<!--]-->`);
                          } else {
                            return [
                              (vueExports.openBlock(true), vueExports.createBlock(vueExports.Fragment, null, vueExports.renderList(vueExports.unref(props).authors, (author, index) => {
                                return vueExports.openBlock(), vueExports.createBlock(_sfc_main$a, {
                                  key: index,
                                  to: author.to,
                                  target: author.target,
                                  "data-slot": "avatar",
                                  class: ui.value.avatar({ class: vueExports.unref(props).ui?.avatar, to: !!author.to }),
                                  raw: ""
                                }, {
                                  default: vueExports.withCtx(() => [
                                    vueExports.createVNode(_sfc_main$c, vueExports.mergeProps({ ref_for: true }, author.avatar), null, 16)
                                  ]),
                                  _: 2
                                }, 1032, ["to", "target", "class"]);
                              }), 128))
                            ];
                          }
                        }),
                        _: 1
                      }, _parent2, _scopeId));
                    } else {
                      _push2(serverRenderer_cjs_prodExports.ssrRenderComponent(_sfc_main$3, vueExports.unref(props).authors[0], null, _parent2, _scopeId));
                    }
                    _push2(`<!--]-->`);
                  } else {
                    _push2(`<!---->`);
                  }
                }, _push2, _parent2, _scopeId);
                _push2(`</div>`);
              } else {
                _push2(`<!---->`);
              }
            }, _push2, _parent2, _scopeId);
            _push2(`</div>`);
            if (!!slots.footer) {
              _push2(`<div data-slot="footer" class="${serverRenderer_cjs_prodExports.ssrRenderClass(ui.value.footer({ class: vueExports.unref(props).ui?.footer }))}"${_scopeId}>`);
              serverRenderer_cjs_prodExports.ssrRenderSlot(_ctx.$slots, "footer", {}, null, _push2, _parent2, _scopeId);
              _push2(`</div>`);
            } else {
              _push2(`<!---->`);
            }
          } else {
            return [
              vueExports.unref(props).image || !!slots.header ? (vueExports.openBlock(), vueExports.createBlock("div", {
                key: 0,
                "data-slot": "header",
                class: ui.value.header({ class: vueExports.unref(props).ui?.header })
              }, [
                vueExports.renderSlot(_ctx.$slots, "header", { ui: ui.value }, () => [
                  (vueExports.openBlock(), vueExports.createBlock(vueExports.resolveDynamicComponent(vueExports.unref(__nuxt_component_2$1)), vueExports.mergeProps(typeof vueExports.unref(props).image === "string" ? { src: vueExports.unref(props).image, alt: vueExports.unref(props).title } : { alt: vueExports.unref(props).title, ...vueExports.unref(props).image }, {
                    "data-slot": "image",
                    class: ui.value.image({ class: vueExports.unref(props).ui?.image, to: !!vueExports.unref(props).to })
                  }), null, 16, ["class"]))
                ])
              ], 2)) : vueExports.createCommentVNode("", true),
              vueExports.createVNode("div", {
                "data-slot": "body",
                class: ui.value.body({ class: vueExports.unref(props).ui?.body })
              }, [
                vueExports.unref(props).to ? (vueExports.openBlock(), vueExports.createBlock(_sfc_main$a, vueExports.mergeProps({
                  key: 0,
                  "aria-label": ariaLabel.value
                }, { to: vueExports.unref(props).to, target: vueExports.unref(props).target, ..._ctx.$attrs }, {
                  class: vueExports.unref(prefix)("focus:outline-none peer"),
                  raw: ""
                }), {
                  default: vueExports.withCtx(() => [
                    vueExports.createVNode("span", {
                      class: vueExports.unref(prefix)("absolute inset-0"),
                      "aria-hidden": "true"
                    }, null, 2)
                  ]),
                  _: 1
                }, 16, ["aria-label", "class"])) : vueExports.createCommentVNode("", true),
                vueExports.renderSlot(_ctx.$slots, "body", {}, () => [
                  date.value || !!slots.date || (vueExports.unref(props).badge || !!slots.badge) ? (vueExports.openBlock(), vueExports.createBlock("div", {
                    key: 0,
                    "data-slot": "meta",
                    class: ui.value.meta({ class: vueExports.unref(props).ui?.meta })
                  }, [
                    vueExports.renderSlot(_ctx.$slots, "badge", {}, () => [
                      vueExports.unref(props).badge ? (vueExports.openBlock(), vueExports.createBlock(_sfc_main$6, vueExports.mergeProps({
                        key: 0,
                        color: "neutral",
                        variant: "subtle"
                      }, typeof vueExports.unref(props).badge === "string" ? { label: vueExports.unref(props).badge } : vueExports.unref(props).badge, {
                        "data-slot": "badge",
                        class: ui.value.badge({ class: vueExports.unref(props).ui?.badge })
                      }), null, 16, ["class"])) : vueExports.createCommentVNode("", true)
                    ]),
                    date.value || !!slots.date ? (vueExports.openBlock(), vueExports.createBlock("time", {
                      key: 0,
                      datetime: datetime.value,
                      "data-slot": "date",
                      class: ui.value.date({ class: vueExports.unref(props).ui?.date })
                    }, [
                      vueExports.renderSlot(_ctx.$slots, "date", {}, () => [
                        vueExports.createTextVNode(vueExports.toDisplayString(date.value), 1)
                      ])
                    ], 10, ["datetime"])) : vueExports.createCommentVNode("", true)
                  ], 2)) : vueExports.createCommentVNode("", true),
                  vueExports.unref(props).title || !!slots.title ? (vueExports.openBlock(), vueExports.createBlock("h2", {
                    key: 1,
                    "data-slot": "title",
                    class: ui.value.title({ class: vueExports.unref(props).ui?.title })
                  }, [
                    vueExports.renderSlot(_ctx.$slots, "title", {}, () => [
                      vueExports.createTextVNode(vueExports.toDisplayString(vueExports.unref(props).title), 1)
                    ])
                  ], 2)) : vueExports.createCommentVNode("", true),
                  vueExports.unref(props).description || !!slots.description ? (vueExports.openBlock(), vueExports.createBlock("div", {
                    key: 2,
                    "data-slot": "description",
                    class: ui.value.description({ class: vueExports.unref(props).ui?.description })
                  }, [
                    vueExports.renderSlot(_ctx.$slots, "description", {}, () => [
                      vueExports.createTextVNode(vueExports.toDisplayString(vueExports.unref(props).description), 1)
                    ])
                  ], 2)) : vueExports.createCommentVNode("", true),
                  vueExports.unref(props).authors?.length || !!slots.authors ? (vueExports.openBlock(), vueExports.createBlock("div", {
                    key: 3,
                    "data-slot": "authors",
                    class: ui.value.authors({ class: vueExports.unref(props).ui?.authors })
                  }, [
                    vueExports.renderSlot(_ctx.$slots, "authors", { ui: ui.value }, () => [
                      vueExports.unref(props).authors?.length ? (vueExports.openBlock(), vueExports.createBlock(vueExports.Fragment, { key: 0 }, [
                        vueExports.unref(props).authors.length > 1 ? (vueExports.openBlock(), vueExports.createBlock(_sfc_main$4, { key: 0 }, {
                          default: vueExports.withCtx(() => [
                            (vueExports.openBlock(true), vueExports.createBlock(vueExports.Fragment, null, vueExports.renderList(vueExports.unref(props).authors, (author, index) => {
                              return vueExports.openBlock(), vueExports.createBlock(_sfc_main$a, {
                                key: index,
                                to: author.to,
                                target: author.target,
                                "data-slot": "avatar",
                                class: ui.value.avatar({ class: vueExports.unref(props).ui?.avatar, to: !!author.to }),
                                raw: ""
                              }, {
                                default: vueExports.withCtx(() => [
                                  vueExports.createVNode(_sfc_main$c, vueExports.mergeProps({ ref_for: true }, author.avatar), null, 16)
                                ]),
                                _: 2
                              }, 1032, ["to", "target", "class"]);
                            }), 128))
                          ]),
                          _: 1
                        })) : (vueExports.openBlock(), vueExports.createBlock(_sfc_main$3, vueExports.mergeProps({ key: 1 }, vueExports.unref(props).authors[0]), null, 16))
                      ], 64)) : vueExports.createCommentVNode("", true)
                    ])
                  ], 2)) : vueExports.createCommentVNode("", true)
                ])
              ], 2),
              !!slots.footer ? (vueExports.openBlock(), vueExports.createBlock("div", {
                key: 1,
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
});
const _sfc_setup$2 = _sfc_main$2.setup;
_sfc_main$2.setup = (props, ctx) => {
  const ssrContext = vueExports.useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("../node_modules/.pnpm/@nuxt+ui@4.8.0_@internationalized+date@3.12.1_@internationalized+number@3.6.6_@tiptap+e_d719e0a183cea98ed15f9fdb5506ba26/node_modules/@nuxt/ui/dist/runtime/components/BlogPost.vue");
  return _sfc_setup$2 ? _sfc_setup$2(props, ctx) : void 0;
};
const theme = {
  "base": "flex flex-col gap-8 lg:gap-y-16",
  "variants": {
    "orientation": {
      "horizontal": "sm:grid sm:grid-cols-2 lg:grid-cols-3",
      "vertical": ""
    }
  }
};
const _sfc_main$1 = {
  __name: "UBlogPosts",
  __ssrInlineRender: true,
  props: {
    as: { type: null, required: false },
    posts: { type: Array, required: false },
    orientation: { type: null, required: false, default: "horizontal" },
    class: { type: null, required: false },
    ui: { type: Object, required: false }
  },
  setup(__props) {
    const _props = __props;
    const slots = vueExports.useSlots();
    const props = useComponentProps("blogPosts", _props);
    const getProxySlots = () => omit(slots, ["default"]);
    const appConfig = useAppConfig();
    const ui = vueExports.computed(() => tv({ extend: tv(theme), ...appConfig.ui?.blogPosts || {} }));
    return (_ctx, _push, _parent, _attrs) => {
      _push(serverRenderer_cjs_prodExports.ssrRenderComponent(vueExports.unref(Primitive), vueExports.mergeProps({
        as: vueExports.unref(props).as,
        "data-orientation": vueExports.unref(props).orientation,
        class: ui.value({ orientation: vueExports.unref(props).orientation, class: [vueExports.unref(props).ui?.base, vueExports.unref(props).class] })
      }, _attrs), {
        default: vueExports.withCtx((_, _push2, _parent2, _scopeId) => {
          if (_push2) {
            serverRenderer_cjs_prodExports.ssrRenderSlot(_ctx.$slots, "default", {}, () => {
              _push2(`<!--[-->`);
              serverRenderer_cjs_prodExports.ssrRenderList(vueExports.unref(props).posts, (post, index) => {
                _push2(serverRenderer_cjs_prodExports.ssrRenderComponent(_sfc_main$2, vueExports.mergeProps({
                  key: index,
                  orientation: vueExports.unref(props).orientation === "vertical" ? "horizontal" : "vertical"
                }, { ref_for: true }, post), vueExports.createSlots({ _: 2 }, [
                  vueExports.renderList(getProxySlots(), (_2, name) => {
                    return {
                      name,
                      fn: vueExports.withCtx((slotData, _push3, _parent3, _scopeId2) => {
                        if (_push3) {
                          serverRenderer_cjs_prodExports.ssrRenderSlot(_ctx.$slots, name, vueExports.mergeProps({ ref_for: true }, slotData, { post }), null, _push3, _parent3, _scopeId2);
                        } else {
                          return [
                            vueExports.renderSlot(_ctx.$slots, name, vueExports.mergeProps({ ref_for: true }, slotData, { post }))
                          ];
                        }
                      })
                    };
                  })
                ]), _parent2, _scopeId));
              });
              _push2(`<!--]-->`);
            }, _push2, _parent2, _scopeId);
          } else {
            return [
              vueExports.renderSlot(_ctx.$slots, "default", {}, () => [
                (vueExports.openBlock(true), vueExports.createBlock(vueExports.Fragment, null, vueExports.renderList(vueExports.unref(props).posts, (post, index) => {
                  return vueExports.openBlock(), vueExports.createBlock(_sfc_main$2, vueExports.mergeProps({
                    key: index,
                    orientation: vueExports.unref(props).orientation === "vertical" ? "horizontal" : "vertical"
                  }, { ref_for: true }, post), vueExports.createSlots({ _: 2 }, [
                    vueExports.renderList(getProxySlots(), (_2, name) => {
                      return {
                        name,
                        fn: vueExports.withCtx((slotData) => [
                          vueExports.renderSlot(_ctx.$slots, name, vueExports.mergeProps({ ref_for: true }, slotData, { post }))
                        ])
                      };
                    })
                  ]), 1040, ["orientation"]);
                }), 128))
              ])
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
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("../node_modules/.pnpm/@nuxt+ui@4.8.0_@internationalized+date@3.12.1_@internationalized+number@3.6.6_@tiptap+e_d719e0a183cea98ed15f9fdb5506ba26/node_modules/@nuxt/ui/dist/runtime/components/BlogPosts.vue");
  return _sfc_setup$1 ? _sfc_setup$1(props, ctx) : void 0;
};
const _sfc_main = /* @__PURE__ */ vueExports.defineComponent({
  __name: "index",
  __ssrInlineRender: true,
  async setup(__props) {
    let __temp, __restore;
    const { t: $t } = useI18n();
    const { shopify: { shopName } } = useAppConfig();
    const localePath = useLocalePath();
    const { locale } = useI18n();
    const route = useRoute$1();
    const handle = vueExports.computed(() => route.params.handle);
    const { data: blog, error } = ([__temp, __restore] = vueExports.withAsyncContext(() => useStorefrontData(`blog-${locale.value}-${handle.value}`, `#graphql
    query FetchBlog($handle: String) {
        blog(handle: $handle) {
            ...BlogFields
        }
    }
    ${BLOG_FRAGMENT}
`, {
      variables: {
        handle: handle.value
      },
      transform: (data) => data?.blog,
      cache: "long"
    })), __temp = await __temp, __restore(), __temp);
    if (!blog.value || error.value) {
      throw createError({
        status: 404,
        statusText: `${$t("error.notFound")}: ${route.fullPath}`,
        message: error.value?.message || $t("error.blog")
      });
    }
    useSeoMeta({
      title: `${blog.value?.seo?.title ?? blog.value?.title} | ${shopName}`,
      description: blog.value?.seo?.description ?? $t("seo.description")
    });
    return (_ctx, _push, _parent, _attrs) => {
      const _component_UContainer = _sfc_main$1$1;
      const _component_UBreadcrumb = _sfc_main$5;
      const _component_UBlogPosts = _sfc_main$1;
      const _component_UBlogPost = _sfc_main$2;
      _push(serverRenderer_cjs_prodExports.ssrRenderComponent(_component_UContainer, vueExports.mergeProps({ class: "py-6 lg:py-8" }, _attrs), {
        default: vueExports.withCtx((_, _push2, _parent2, _scopeId) => {
          if (_push2) {
            _push2(serverRenderer_cjs_prodExports.ssrRenderComponent(_component_UBreadcrumb, {
              items: [
                { label: "Blog" },
                { label: vueExports.unref(blog)?.title, to: vueExports.unref(localePath)(`/blog/${vueExports.unref(handle)}`) }
              ],
              class: "mb-6 lg:mb-8"
            }, null, _parent2, _scopeId));
            _push2(`<h1 class="text-4xl lg:text-5xl text-gray-900 font-extrabold mb-6 lg:mb-8"${_scopeId}>${serverRenderer_cjs_prodExports.ssrInterpolate(vueExports.unref(blog)?.title)}</h1>`);
            _push2(serverRenderer_cjs_prodExports.ssrRenderComponent(_component_UBlogPosts, null, {
              default: vueExports.withCtx((_2, _push3, _parent3, _scopeId2) => {
                if (_push3) {
                  _push3(`<!--[-->`);
                  serverRenderer_cjs_prodExports.ssrRenderList(("flattenConnection" in _ctx ? _ctx.flattenConnection : vueExports.unref(flattenConnection))(vueExports.unref(blog)?.articles), (article) => {
                    _push3(serverRenderer_cjs_prodExports.ssrRenderComponent(_component_UBlogPost, {
                      key: article.id,
                      title: article.title,
                      date: article.publishedAt,
                      description: article.excerpt ?? void 0,
                      to: vueExports.unref(localePath)(`/blog/${vueExports.unref(handle)}/${article.handle}`)
                    }, null, _parent3, _scopeId2));
                  });
                  _push3(`<!--]-->`);
                } else {
                  return [
                    (vueExports.openBlock(true), vueExports.createBlock(vueExports.Fragment, null, vueExports.renderList(("flattenConnection" in _ctx ? _ctx.flattenConnection : vueExports.unref(flattenConnection))(vueExports.unref(blog)?.articles), (article) => {
                      return vueExports.openBlock(), vueExports.createBlock(_component_UBlogPost, {
                        key: article.id,
                        title: article.title,
                        date: article.publishedAt,
                        description: article.excerpt ?? void 0,
                        to: vueExports.unref(localePath)(`/blog/${vueExports.unref(handle)}/${article.handle}`)
                      }, null, 8, ["title", "date", "description", "to"]);
                    }), 128))
                  ];
                }
              }),
              _: 1
            }, _parent2, _scopeId));
          } else {
            return [
              vueExports.createVNode(_component_UBreadcrumb, {
                items: [
                  { label: "Blog" },
                  { label: vueExports.unref(blog)?.title, to: vueExports.unref(localePath)(`/blog/${vueExports.unref(handle)}`) }
                ],
                class: "mb-6 lg:mb-8"
              }, null, 8, ["items"]),
              vueExports.createVNode("h1", { class: "text-4xl lg:text-5xl text-gray-900 font-extrabold mb-6 lg:mb-8" }, vueExports.toDisplayString(vueExports.unref(blog)?.title), 1),
              vueExports.createVNode(_component_UBlogPosts, null, {
                default: vueExports.withCtx(() => [
                  (vueExports.openBlock(true), vueExports.createBlock(vueExports.Fragment, null, vueExports.renderList(("flattenConnection" in _ctx ? _ctx.flattenConnection : vueExports.unref(flattenConnection))(vueExports.unref(blog)?.articles), (article) => {
                    return vueExports.openBlock(), vueExports.createBlock(_component_UBlogPost, {
                      key: article.id,
                      title: article.title,
                      date: article.publishedAt,
                      description: article.excerpt ?? void 0,
                      to: vueExports.unref(localePath)(`/blog/${vueExports.unref(handle)}/${article.handle}`)
                    }, null, 8, ["title", "date", "description", "to"]);
                  }), 128))
                ]),
                _: 1
              })
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
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/blog/[handle]/index.vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};

export { _sfc_main as default };
//# sourceMappingURL=index-DLxASLci.mjs.map
