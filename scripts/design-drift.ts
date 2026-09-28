#!/usr/bin/env tsx
/**
 * DESIGN.md -> tokens.css drift check.
 *
 * DESIGN.md is the canonical design contract (hard rule DT-1). app/assets/css/tokens.css
 * is its build mirror. This script proves the mirror still agrees with the source, so a
 * divergence is caught by a command instead of by a human noticing weeks later.
 *
 * Checks:
 *   1. every colors.* value is mirrored to --<key> in tokens.css
 *   2. every spacing.* value is mirrored to --space-<key> (or its declared alias),
 *       and every px/rem spacing value lands on the 4px grid
 *   3. every rounded.* value is mirrored to --radius-<key>, all zero
 *   4. the @nuxt/ui vendor bridge rounded.ui is zeroed in tokens.css (--ui-radius)
 *   5. typography font sizes all resolve in the tokens.css type scale, all JetBrains Mono
 *   6. retired tokens stay retired, and no non-achromatic colour sneaks in (DT-2)
 *
 * Usage: pnpm design:drift
 */
import * as fs from "node:fs";
import * as path from "node:path";

const root = process.cwd();
const designPath = path.join(root, "DESIGN.md");
const tokensPath = path.join(root, "app", "assets", "css", "tokens.css");

/** Retired by DT-2. Any reappearance is a finding, not a preference. */
const RETIRED = [
  { token: "warm bone", value: "#F7F3EC" },
  { token: "thread-gold", value: "#B08D57" },
  { token: "error-ember", value: "#9F3A2F" },
  { token: "ash-silver", value: "#C0C0C0" },
  { token: "Playfair Display", value: "Playfair" },
  { token: "radius-tight 2px", value: "radius-tight" },
];

type Finding = { rule: string; message: string };
const findings: Finding[] = [];
const fail = (rule: string, message: string) => findings.push({ rule, message });

function readFrontmatter(file: string): string {
  const raw = fs.readFileSync(file, "utf8");
  const match = /^---\n([\s\S]*?)\n---\n/.exec(raw);
  if (!match) throw new Error(`${path.basename(file)} has no YAML frontmatter block`);
  return match[1]!;
}

function readTokens(file: string): Map<string, string> {
  const css = fs.readFileSync(file, "utf8");
  const tokens = new Map<string, string>();
  for (const line of css.split("\n")) {
    const decl = /^\s*(--[a-z0-9-]+)\s*:\s*([^;]+);/.exec(line);
    if (decl) tokens.set(decl[1]!, decl[2]!.trim());
  }
  return tokens;
}

/** Top-level `key:` block from the frontmatter body, comments and blanks removed. */
function block(body: string, key: string): string[] {
  const lines = body.split("\n");
  const start = lines.findIndex((l) => l === `${key}:`);
  if (start === -1) return [];
  const out: string[] = [];
  for (const line of lines.slice(start + 1)) {
    if (/^\S/.test(line)) break;
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) out.push(trimmed);
  }
  return out;
}

/** `key: "value"` entries; values are kept unquoted. */
function scalars(lines: string[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const line of lines) {
    const m = /^([\w"-]+):\s*(.+)$/.exec(line);
    if (!m) continue;
    map.set(m[1]!.replace(/^"|"$/g, ""), m[2]!.trim().replace(/^"|"$/g, ""));
  }
  return map;
}

/** `key: { a: 1, b: 2 }` inline entries. */
function flowMaps(lines: string[]): Map<string, Record<string, string>> {
  const map = new Map<string, Record<string, string>>();
  for (const line of lines) {
    const m = /^([\w-]+):\s*\{(.+)\}$/.exec(line);
    if (!m) continue;
    const fields: Record<string, string> = {};
    for (const pair of m[2]!.split(",")) {
      const [k, v] = pair.split(":").map((s) => s.trim().replace(/^"|"$/g, ""));
      if (k && v !== undefined) fields[k] = v;
    }
    map.set(m[1]!, fields);
  }
  return map;
}

function normaliseColor(value: string): string {
  return value.trim().toLowerCase();
}

function isAchromatic(hex: string): boolean {
  const m = /^#([0-9a-f]{6})$/.exec(hex);
  if (!m) return true; // non-hex (rgba()/color-mix()) is not audited here
  const int = parseInt(m[1]!, 16);
  const r = (int >> 16) & 0xff;
  const g = (int >> 8) & 0xff;
  const b = int & 0xff;
  return r === g && g === b;
}

const frontmatter = readFrontmatter(designPath);
const tokens = readTokens(tokensPath);

const designColors = scalars(block(frontmatter, "colors"));
const designSpacing = scalars(block(frontmatter, "spacing"));
const designRounded = scalars(block(frontmatter, "rounded"));
const designTypography = flowMaps(block(frontmatter, "typography"));

// 1. colors -> --<key>
/**
 * DESIGN.md is canonical, so a token key is never renamed to match CSS. Where the
 * mirror uses a different (longer) custom-property name, the rename is declared here
 * and the value is still checked, so the divergence is caught without a token rename.
 */
const CSS_NAME_ALIASES: Record<string, string> = {
  ink: "ink-black",
};

for (const [key, value] of designColors) {
  const cssName = `--${CSS_NAME_ALIASES[key] ?? key}`;
  const actual = tokens.get(cssName);
  if (actual === undefined) {
    fail("color-missing", `DESIGN.md colors.${key} (${value}) has no ${cssName} in tokens.css`);
  } else if (normaliseColor(actual) !== normaliseColor(value)) {
    fail("color-value", `colors.${key}: DESIGN.md ${value} vs tokens.css ${cssName}: ${actual}`);
  }
  if (!isAchromatic(value)) {
    fail("non-achromatic", `colors.${key} ${value} is not achromatic (DT-2 requires an operator-approved accent)`);
  }
}

// 2. spacing -> --space-<key>
/**
 * The section aliases and the layout dimensions mirror without the `--space-` prefix
 * (tokens.css: `--section-lg`, `--content-max`, ...). DESIGN.md declares the mirror
 * name for each in the Layout > Section spacing and Layout measures tables, so the
 * rename is recorded here rather than forcing a token rename in CSS.
 */
const SPACING_CSS_ALIASES: Record<string, string> = {
  "section-sm": "section-sm",
  "section-md": "section-md",
  "section-lg": "section-lg",
  "section-xl": "section-xl",
  measure: "measure",
  "content-max": "content-max",
  "content-wide": "content-wide",
};

/** Root font size the rem-to-px grid check assumes; matches the 16px base in tokens.css. */
const ROOT_REM_PX = 16;

/**
 * 4px-grid check. Returns null for a value that is not an absolute length at all
 * (`65ch`, a `clamp()`, a percentage): those are measures and fluid insets, not grid
 * steps, and are governed by their own DESIGN.md table rather than by the spacing scale.
 */
function offGridPixels(value: string): number | null {
  const px = /^([\d.]+)px$/.exec(value);
  if (px) return Number(px[1]);
  const rem = /^([\d.]+)rem$/.exec(value);
  if (rem) return Number(rem[1]) * ROOT_REM_PX;
  return null;
}

for (const [key, value] of designSpacing) {
  const cssName = `--${SPACING_CSS_ALIASES[key] ?? `space-${key}`}`;
  const actual = tokens.get(cssName);
  if (actual === undefined) {
    fail("spacing-missing", `DESIGN.md spacing.${key} (${value}) has no ${cssName} in tokens.css`);
  } else if (actual !== value) {
    fail("spacing-value", `spacing.${key}: DESIGN.md ${value} vs tokens.css ${cssName}: ${actual}`);
  }
  const pixels = offGridPixels(value);
  if (pixels !== null && pixels % 4 !== 0) {
    fail("spacing-grid", `spacing.${key} ${value} (${pixels}px) is off the 4px base grid`);
  }
}

// 3 + 4. rounded -> --radius-<key>, plus the @nuxt/ui vendor bridge
for (const [key, value] of designRounded) {
  if (value !== "0px" && value !== "0") {
    fail("radius-nonzero", `rounded.${key} is ${value}; DT-2 requires 0 everywhere`);
  }
  // @nuxt/ui owns its own root token, mirrored separately (see DESIGN.md `rounded.ui`).
  if (key === "ui") {
    const bridge = tokens.get("--ui-radius");
    if (bridge === undefined) {
      fail(
        "vendor-bridge-missing",
        "DESIGN.md rounded.ui declares the @nuxt/ui bridge but tokens.css has no --ui-radius; " +
          "rounded-sm/md/full compile against the vendor .25rem default and reintroduce 4px corners",
      );
    } else if (normaliseColor(bridge) !== "0" && normaliseColor(bridge) !== "0px") {
      fail("vendor-bridge-value", `rounded.ui: tokens.css --ui-radius is ${bridge}, expected 0`);
    }
    continue;
  }
  const cssName = `--radius-${key}`;
  const actual = tokens.get(cssName);
  if (actual === undefined) {
    fail("radius-missing", `DESIGN.md rounded.${key} has no ${cssName} in tokens.css`);
  } else if (actual !== "0" && actual !== "0px") {
    fail("radius-value", `rounded.${key}: tokens.css ${cssName} is ${actual}, expected 0`);
  }
}

// 5. typography -> type scale present in tokens.css, mono only
const cssFontSizes = new Set(
  [...tokens.entries()]
    .filter(([name]) => name.startsWith("--text-"))
    .map(([, value]) => value),
);
for (const [scale, fields] of designTypography) {
  if (fields.fontFamily && !/JetBrains Mono/.test(fields.fontFamily)) {
    fail("type-family", `typography.${scale} fontFamily is ${fields.fontFamily}, expected JetBrains Mono`);
  }
  const size = fields.fontSize;
  if (size && !cssFontSizes.has(size)) {
    fail("type-size-missing", `typography.${scale} fontSize ${size} does not resolve to a --text-* token`);
  }
}

// 6. retired tokens stay retired
const cssRaw = fs.readFileSync(tokensPath, "utf8");
for (const { token, value } of RETIRED) {
  if (cssRaw.toLowerCase().includes(value.toLowerCase())) {
    fail("retired-token", `retired ${token} (${value}) reappeared in tokens.css`);
  }
}

const errors = findings.length;
console.log(`design:drift — ${designColors.size} colors, ${designTypography.size} typography scales, ` +
  `${designSpacing.size} spacing, ${designRounded.size} rounded keys checked against ` +
  `${tokens.size} custom properties in app/assets/css/tokens.css`);

if (errors === 0) {
  console.log("design:drift — no drift: DESIGN.md and tokens.css agree, no retired tokens");
  process.exit(0);
}

for (const f of findings) console.error(`design:drift ${f.rule}: ${f.message}`);
console.error(`design:drift — ${errors} finding(s). DESIGN.md is canonical: fix tokens.css, or change DESIGN.md first.`);
process.exit(1);
