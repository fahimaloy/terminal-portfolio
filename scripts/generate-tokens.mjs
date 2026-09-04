#!/usr/bin/env node
/**
 * generate-tokens.mjs — Build-time design-token codegen.
 *
 * Single input:  src/styles/tokens.css
 * Outputs:
 *   1. src/config/generated/tokens.generated.ts — accentConfig + typed token re-exports
 *   2. tailwind.tokens.generated.js             — Tailwind extend.colors / fontFamily
 *
 * tailwind.config.js should `require('./tailwind.tokens.generated.js')` so the
 * color/font maps stay derived from tokens.css.
 *
 * Behaviour:
 *   - Parses --neon-*, --glow-*, --glow-*-sm, --dur-*, --ease-*, --bg-*, --text-*,
 *     --glass-*, --spring-* vars via regex (no extra deps).
 *   - Idempotent: re-running with unchanged tokens.css produces byte-identical outputs.
 *   - --check: exits 1 (non-zero) if either generated file would change; prints a diff hint.
 *   - On parse failure (no tokens found / unreadable file) exits non-zero.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const TOKENS_CSS = path.join(ROOT, 'src/styles/tokens.css');
const OUT_TS = path.join(ROOT, 'src/config/generated/tokens.generated.ts');
const OUT_TW = path.join(ROOT, 'tailwind.tokens.generated.js');

const EXPECTED_ACCENTS = ['yellow', 'magenta', 'cyan', 'green', 'red', 'purple', 'blue'];

// ---------------------------------------------------------------------------
// Parse helpers
// ---------------------------------------------------------------------------

function parseTokensCss(css) {
  // Strip @media (prefers-reduced-motion: reduce) block so --dur-* 0ms overrides
  // don't overwrite the real token values (first definition wins).
  const primaryCss = css.split('@media')[0];

  // --neon-yellow: #ffaa00;
  const neon = {};
  for (const m of primaryCss.matchAll(/--neon-([a-z0-9-]+)\s*:\s*(#[0-9a-fA-F]{3,8})\s*;/g)) {
    neon[m[1]] = m[2].toLowerCase();
  }

  // --glow-cyan: rgba(0, 240, 255, 0.5);
  // --glow-cyan-sm: rgba(0, 240, 255, 0.15);
  const glow = {};
  const glowSm = {};
  for (const m of primaryCss.matchAll(/--glow-([a-z0-9-]+)\s*:\s*(rgba\([^)]+\))\s*;/g)) {
    const raw = m[0];
    // Distinguish -sm suffix: check if the declaration key ends with -sm
    // The regex captures e.g. "yellow-sm" for --glow-yellow-sm; split it.
    const key = m[1];
    const value = m[2];
    if (key.endsWith('-sm')) {
      const base = key.slice(0, -3);
      glowSm[base] = value;
    } else {
      glow[key] = value;
    }
  }

  // --dur-enter: 480ms;  → { enter: "480ms" }
  // Use primaryCss so reduced-motion overrides don't clobber real values
  const durations = {};
  for (const m of primaryCss.matchAll(/--dur-([a-z0-9-]+)\s*:\s*([^;]+)\s*;/g)) {
    durations[m[1]] = m[2].trim();
  }

  // --ease-smooth: cubic-bezier(0.16, 1, 0.3, 1);
  const easings = {};
  for (const m of primaryCss.matchAll(/--ease-([a-z0-9-]+)\s*:\s*([^;]+)\s*;/g)) {
    easings[m[1]] = m[2].trim();
  }

  // --bg-void: #0a0a0a;  --bg-panel: rgba(...)
  const bg = {};
  for (const m of primaryCss.matchAll(/--bg-([a-z0-9-]+)\s*:\s*([^;]+)\s*;/g)) {
    bg[m[1]] = m[2].trim();
  }

  // --text-primary: #ffffff;
  // Use primaryCss and filter to only color-like values (hex, rgba, hsl) — skip typography tokens like --text-xs: 0.75rem
  const text = {};
  for (const m of primaryCss.matchAll(/--text-([a-z0-9-]+)\s*:\s*([^;]+)\s*;/g)) {
    const val = m[2].trim();
    if (/^(#|rgba?\(|hsla?\()/i.test(val)) text[m[1]] = val;
  }

  // --glass-bg / --glass-border
  const glass = {};
  for (const m of primaryCss.matchAll(/--glass-([a-z0-9-]+)\s*:\s*([^;]+)\s*;/g)) {
    glass[m[1]] = m[2].trim();
  }

  // --spring-stiff: '{"stiffness":200,"damping":15}';
  const springs = {};
  for (const m of primaryCss.matchAll(/--spring-([a-z0-9-]+)\s*:\s*'([^']+)'\s*;/g)) {
    try {
      springs[m[1]] = JSON.parse(m[2]);
    } catch {
      springs[m[1]] = m[2];
    }
  }

  // --font-display / --font-body / --font-mono
  const fonts = {};
  for (const m of primaryCss.matchAll(/--font-([a-z0-9-]+)\s*:\s*([^;]+)\s*;/g)) {
    fonts[m[1]] = m[2].trim();
  }

  return { neon, glow, glowSm, durations, easings, bg, text, glass, springs, fonts };
}

function msToSeconds(msStr) {
  const s = msStr.trim();
  if (s.endsWith('ms')) return parseFloat(s) / 1000;
  if (s.endsWith('s')) return parseFloat(s);
  return parseFloat(s);
}

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

function generateTsContent(tokens) {
  const { neon, glow, glowSm, durations, easings, springs } = tokens;

  // Build accentConfig entries — preserve EXPECTED_ACCENTS order for stable output
  const accentNames = EXPECTED_ACCENTS.filter((n) => neon[n]);
  // Append any extra neon accents not in the expected list (sorted, for determinism)
  const extra = Object.keys(neon).filter((k) => !EXPECTED_ACCENTS.includes(k)).sort();
  const allAccents = [...accentNames, ...extra];

  const accentEntries = allAccents.map((name) => {
    const color = neon[name];
    const g = glow[name] ?? `rgba(0, 0, 0, 0.5)`;
    const shadow = `0 0 18px ${color}`;
    return `  ${name}: {\n    color: '${color}',\n    glow: '${g}',\n    shadow: '${shadow}',\n  }`;
  });

  // Durations in seconds (as numbers) — mirrors animations.ts
  const durEntries = Object.entries(durations)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `  ${toJsKey(k)}: ${msToSeconds(v)}`);

  // Duration raw ms strings (for reference / debugging)
  const durRawEntries = Object.entries(durations)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `  ${toJsKey(k)}: '${v}'`);

  // Easings
  const easingEntries = Object.entries(easings)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `  ${toJsKey(k)}: '${escapeSingle(v)}'`);

  // Springs
  const springEntries = Object.entries(springs)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `  ${toJsKey(k)}: ${JSON.stringify(v)}`);

  // Glow-sm map (for completeness)
  const glowSmEntries = Object.entries(glowSm)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `  ${toJsKey(k)}: '${escapeSingle(v)}'`);

  const glowEntries = Object.entries(glow)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `  ${toJsKey(k)}: '${escapeSingle(v)}'`);

  return `// AUTO-GENERATED — do not edit. Run: node scripts/generate-tokens.mjs
// Source: src/styles/tokens.css

export type AccentColor = ${allAccents.map((a) => `'${a}'`).join(' | ')};

export const accentConfig: Record<AccentColor, { color: string; glow: string; shadow: string }> = {
${accentEntries.join(',\n')},
} as const;

// Durations in seconds (derived from --dur-* ms values)
export const generatedDurations = {
${durEntries.join(',\n')},
} as const;

// Raw duration strings as authored in tokens.css
export const generatedDurationsRaw = {
${durRawEntries.join(',\n')},
} as const;

// Easing strings (derived from --ease-*)
export const generatedEasings = {
${easingEntries.join(',\n')},
} as const;

// Glow halos (derived from --glow-*)
export const generatedGlow = {
${glowEntries.join(',\n')},
} as const;

export const generatedGlowSm = {
${glowSmEntries.join(',\n')},
} as const;

// Spring presets (derived from --spring-*)
export const generatedSprings = {
${springEntries.join(',\n')},
} as const;
`;
}

function generateTwContent(tokens) {
  const { neon, glow, glowSm, bg, text, glass } = tokens;

  // Build Tailwind extend.colors map — mirrors current tailwind.config.js extend.colors
  const colorEntries = {};

  // bg-* colors
  for (const [k, v] of Object.entries(bg).sort(([a], [b]) => a.localeCompare(b))) {
    colorEntries[`bg-${k}`] = v;
  }
  // neon-* colors
  for (const [k, v] of Object.entries(neon).sort(([a], [b]) => a.localeCompare(b))) {
    colorEntries[`neon-${k}`] = v;
  }
  // text-* colors
  for (const [k, v] of Object.entries(text).sort(([a], [b]) => a.localeCompare(b))) {
    colorEntries[`text-${k}`] = v;
  }
  // glow-* colors
  for (const [k, v] of Object.entries(glow).sort(([a], [b]) => a.localeCompare(b))) {
    colorEntries[`glow-${k}`] = v;
  }
  for (const [k, v] of Object.entries(glowSm).sort(([a], [b]) => a.localeCompare(b))) {
    colorEntries[`glow-${k}-sm`] = v;
  }
  // glass colors
  for (const [k, v] of Object.entries(glass).sort(([a], [b]) => a.localeCompare(b))) {
    // --glass-blur is not a color — skip it
    if (v.startsWith('blur(')) continue;
    // --glass-backdrop-alpha is numeric — skip
    if (/^[0-9.]+$/.test(v)) continue;
    colorEntries[`glass-${k}`] = v;
  }

  const colorLines = Object.entries(colorEntries)
    .map(([k, v]) => `    '${k}': '${escapeSingle(v)}'`)
    .join(',\n');

  return `// AUTO-GENERATED — do not edit. Run: node scripts/generate-tokens.mjs
// Source: src/styles/tokens.css
// Imported by tailwind.config.js: require('./tailwind.tokens.generated.js')

module.exports = {
  colors: {
${colorLines},
  },
};
`;
}

// ---------------------------------------------------------------------------
// Utils
// ---------------------------------------------------------------------------

function toJsKey(cssKey) {
  // "in-out" → "inOut", "expo-in" → "expoIn" etc.
  return cssKey.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

function escapeSingle(s) {
  return s.replace(/'/g, "\\'");
}

function ensureDir(filePath) {
  mkdirSync(path.dirname(filePath), { recursive: true });
}

function readExisting(filePath) {
  if (!existsSync(filePath)) return null;
  try {
    return readFileSync(filePath, 'utf8');
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const isCheck = process.argv.includes('--check');

  // Read and parse tokens.css
  let css;
  try {
    css = readFileSync(TOKENS_CSS, 'utf8');
  } catch (e) {
    console.error(`[generate-tokens] Failed to read ${TOKENS_CSS}: ${e.message}`);
    process.exit(1);
  }

  const tokens = parseTokensCss(css);

  // Validate — must have at least the 7 expected neon accents
  const missingNeon = EXPECTED_ACCENTS.filter((n) => !tokens.neon[n]);
  if (missingNeon.length > 0) {
    console.error(`[generate-tokens] Parse failure: missing --neon-* vars: ${missingNeon.join(', ')}`);
    console.error(`[generate-tokens] Found neon keys: ${Object.keys(tokens.neon).join(', ') || '(none)'}`);
    process.exit(1);
  }
  if (Object.keys(tokens.durations).length === 0) {
    console.error('[generate-tokens] Parse failure: no --dur-* tokens found.');
    process.exit(1);
  }
  if (Object.keys(tokens.easings).length === 0) {
    console.error('[generate-tokens] Parse failure: no --ease-* tokens found.');
    process.exit(1);
  }
  // Validate accent hex values look like real hex colors
  for (const [name, hex] of Object.entries(tokens.neon)) {
    if (!/^#[0-9a-fA-F]{3,8}$/.test(hex)) {
      console.error(`[generate-tokens] Invalid hex for --neon-${name}: ${hex}`);
      process.exit(1);
    }
  }

  const tsContent = generateTsContent(tokens);
  const twContent = generateTwContent(tokens);

  if (isCheck) {
    let dirty = false;
    const existingTs = readExisting(OUT_TS);
    const existingTw = readExisting(OUT_TW);

    if (existingTs === null) {
      console.error(`[generate-tokens] --check: missing ${path.relative(ROOT, OUT_TS)} (would be created)`);
      dirty = true;
    } else if (existingTs !== tsContent) {
      console.error(`[generate-tokens] --check: ${path.relative(ROOT, OUT_TS)} is out of date`);
      dirty = true;
    }

    if (existingTw === null) {
      console.error(`[generate-tokens] --check: missing ${path.relative(ROOT, OUT_TW)} (would be created)`);
      dirty = true;
    } else if (existingTw !== twContent) {
      console.error(`[generate-tokens] --check: ${path.relative(ROOT, OUT_TW)} is out of date`);
      dirty = true;
    }

    if (dirty) {
      console.error('[generate-tokens] Run `node scripts/generate-tokens.mjs` to regenerate.');
      process.exit(1);
    }
    console.log('[generate-tokens] --check OK — generated files are up to date.');
    process.exit(0);
  }

  // Write outputs
  ensureDir(OUT_TS);
  ensureDir(OUT_TW);
  writeFileSync(OUT_TS, tsContent, 'utf8');
  writeFileSync(OUT_TW, twContent, 'utf8');

  console.log(`[generate-tokens] Wrote ${path.relative(ROOT, OUT_TS)} (${Object.keys(tokens.neon).length} accents, ${Object.keys(tokens.durations).length} durations, ${Object.keys(tokens.easings).length} easings)`);
  console.log(`[generate-tokens] Wrote ${path.relative(ROOT, OUT_TW)} (${Object.keys(tokens.neon).length} neon + ${Object.keys(tokens.glow).length} glow + ${Object.keys(tokens.glowSm).length} glow-sm + bg/text/glass colors)`);
}

main();
