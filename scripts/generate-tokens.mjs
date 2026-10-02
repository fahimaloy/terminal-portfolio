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
 *   - Reads ONLY the top-level `:root { … }` block. Theme scopes
 *     ([data-accent='…'], [data-theme='editorial']), the reduced-motion @media
 *     overrides and any other selector are excluded by construction, never by
 *     position — see extractRootBlock() for why that distinction matters.
 *   - Idempotent: re-running with unchanged tokens.css produces byte-identical outputs.
 *   - --check: exits 1 (non-zero) if either generated file would change; prints a diff hint.
 *   - On parse failure (missing/empty :root block, no tokens found, unreadable
 *     file) exits non-zero with a message naming the cause.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const TOKENS_CSS = path.join(ROOT, 'src/styles/tokens.css');
const OUT_TS = path.join(ROOT, 'src/config/generated/tokens.generated.ts');
const OUT_TW = path.join(ROOT, 'tailwind.tokens.generated.js');

// v5 accent vocabulary: 3 primary (cyan / violet / coral) + 3 support
// (amber / lime / ice). Order is stable so generated output is deterministic.
const EXPECTED_ACCENTS = ['cyan', 'violet', 'coral', 'amber', 'lime', 'ice'];
const MIN_ACCENTS = 4; // Require at least 4 neon accents for validation

// ---------------------------------------------------------------------------
// Parse helpers
// ---------------------------------------------------------------------------

/**
 * Skip a CSS string literal starting at `start` (which points at the quote).
 * Returns the index just past the closing quote, or at the terminating newline
 * for an unterminated literal (a CSS string cannot span a raw newline).
 */
function skipCssString(css, start) {
  const quote = css[start];
  let i = start + 1;
  while (i < css.length) {
    const ch = css[i];
    if (ch === '\\') {
      i += 2; // escape — also swallows a backslash-newline continuation
      continue;
    }
    if (ch === quote) return i + 1;
    if (ch === '\n') return i;
    i += 1;
  }
  return i;
}

/** Blank out CSS comments so commented-out text can never read as a selector. */
function stripCssComments(css) {
  let out = '';
  let i = 0;
  while (i < css.length) {
    if (css[i] === '/' && css[i + 1] === '*') {
      const end = css.indexOf('*/', i + 2);
      i = end === -1 ? css.length : end + 2;
      out += ' '; // keep tokens on either side from fusing into one word
      continue;
    }
    out += css[i];
    i += 1;
  }
  return out;
}

/**
 * Return the body of the top-level `:root { … }` rule, comments removed.
 *
 * This replaced `css.split('@media')[0]`, which only ever worked by accident:
 * it reads "everything before the first @media", not "the :root block". Those
 * coincide only while no non-`:root` rule sits above that @media. The
 * `[data-theme='editorial']` scope sat below it and stayed invisible to codegen
 * purely by luck — insert any @media above that scope, or move the scope up,
 * and the parser starts seeing it. That scope re-points --font-display at
 * --font-body, so the leak silently rewrites generated `fontFamily.display`
 * from Orbitron to `var(--font-body)`, stripping the display face from every
 * `font-display` utility in the app while `--check` still reports clean.
 *
 * The walk is comment- and string-aware because tokens.css is heavily commented
 * and `--spring-*` values embed braces inside quotes
 * ('{"stiffness":200,"damping":15}') — a naive depth counter stops early there.
 * Depth is tracked so the reduced-motion `@media { :root { … } }` (its :root
 * sits at depth 2) and any future nested scope are skipped; only a depth-1
 * `:root` whose selector is exactly `:root` counts. The first such rule wins.
 *
 * Throws instead of returning a partial block: a silently empty or truncated
 * parse is precisely what let this bug class reach a green CI.
 */
function extractRootBlock(css) {
  let depth = 0;
  let selectorStart = 0;
  let bodyStart = -1;
  let i = 0;

  while (i < css.length) {
    const ch = css[i];

    // Braces inside comments must not move the depth counter.
    if (ch === '/' && css[i + 1] === '*') {
      const end = css.indexOf('*/', i + 2);
      i = end === -1 ? css.length : end + 2;
      continue;
    }

    // Braces inside string literals must not move the depth counter.
    if (ch === '"' || ch === "'") {
      i = skipCssString(css, i);
      continue;
    }

    if (ch === '{') {
      depth += 1;
      if (
        depth === 1 &&
        bodyStart === -1 &&
        stripCssComments(css.slice(selectorStart, i)).trim() === ':root'
      ) {
        bodyStart = i + 1;
      }
      i += 1;
      continue;
    }

    if (ch === '}') {
      if (depth === 1 && bodyStart !== -1) {
        return stripCssComments(css.slice(bodyStart, i));
      }
      if (depth === 0) {
        throw new Error(
          `unexpected "}" at offset ${i} — unbalanced braces before the :root rule`
        );
      }
      depth -= 1;
      selectorStart = i + 1;
      i += 1;
      continue;
    }

    i += 1;
  }

  throw new Error(
    bodyStart === -1
      ? 'no top-level `:root { … }` rule found — tokens.css must declare one at brace depth 0'
      : 'the top-level `:root { … }` rule is never closed (unbalanced "{")'
  );
}

function parseTokensCss(css) {
  // Generated tokens come from the top-level `:root` block and nowhere else.
  // Every other block is either an override (reduced-motion @media, [data-theme],
  // [data-accent]) or a scope that re-points a token at another token; feeding
  // either into codegen replaces an authored value with a reference.
  const rootCss = extractRootBlock(css);

  const declared = (rootCss.match(/--[a-zA-Z0-9_-]+\s*:/g) || []).length;
  if (declared === 0) {
    throw new Error(
      'the top-level :root block declares 0 custom properties — refusing to generate from an empty token set'
    );
  }

  // --neon-yellow: #ffaa00;
  const neon = {};
  for (const m of rootCss.matchAll(/--neon-([a-z0-9-]+)\s*:\s*(#[0-9a-fA-F]{3,8})\s*;/g)) {
    neon[m[1]] = m[2].toLowerCase();
  }

  // --glow-cyan: rgba(0, 240, 255, 0.5);
  // --glow-cyan-sm: rgba(0, 240, 255, 0.15);
  const glow = {};
  const glowSm = {};
  for (const m of rootCss.matchAll(/--glow-([a-z0-9-]+)\s*:\s*(rgba\([^)]+\))\s*;/g)) {
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
  // :root only — reduced-motion overrides must not clobber real values
  const durations = {};
  for (const m of rootCss.matchAll(/--dur-([a-z0-9-]+)\s*:\s*([^;]+)\s*;/g)) {
    durations[m[1]] = m[2].trim();
  }

  // --ease-smooth: cubic-bezier(0.16, 1, 0.3, 1);
  const easings = {};
  for (const m of rootCss.matchAll(/--ease-([a-z0-9-]+)\s*:\s*([^;]+)\s*;/g)) {
    easings[m[1]] = m[2].trim();
  }

  // --bg-void: #0a0a0a;  --bg-panel: rgba(...)
  const bg = {};
  for (const m of rootCss.matchAll(/--bg-([a-z0-9-]+)\s*:\s*([^;]+)\s*;/g)) {
    bg[m[1]] = m[2].trim();
  }

  // --text-primary: #ffffff;
  // :root only, filtered to color-like values (hex, rgba, hsl) — skip typography tokens like --text-xs: 0.75rem
  const text = {};
  for (const m of rootCss.matchAll(/--text-([a-z0-9-]+)\s*:\s*([^;]+)\s*;/g)) {
    const val = m[2].trim();
    if (/^(#|rgba?\(|hsla?\()/i.test(val)) text[m[1]] = val;
  }

  // --glass-bg / --glass-border
  const glass = {};
  for (const m of rootCss.matchAll(/--glass-([a-z0-9-]+)\s*:\s*([^;]+)\s*;/g)) {
    glass[m[1]] = m[2].trim();
  }

  // --spring-stiff: '{"stiffness":200,"damping":15}';
  const springs = {};
  for (const m of rootCss.matchAll(/--spring-([a-z0-9-]+)\s*:\s*'([^']+)'\s*;/g)) {
    try {
      springs[m[1]] = JSON.parse(m[2]);
    } catch {
      springs[m[1]] = m[2];
    }
  }

  // --font-display / --font-body / --font-mono
  const fonts = {};
  for (const m of rootCss.matchAll(/--font-([a-z0-9-]+)\s*:\s*([^;]+)\s*;/g)) {
    fonts[m[1]] = m[2].trim();
  }


  // --wash-*, --grid-*, --surface-*, --ring-*, --status-*, --border-*, --shadow-*
  const wash = {};
  for (const m of rootCss.matchAll(/--wash-([a-z0-9-]+)\s*:\s*([^;]+)\s*;/g)) {
    wash[m[1]] = m[2].trim();
  }
  const grid = {};
  for (const m of rootCss.matchAll(/--grid-([a-z0-9-]+)\s*:\s*([^;]+)\s*;/g)) {
    grid[m[1]] = m[2].trim();
  }
  const surface = {};
  for (const m of rootCss.matchAll(/--surface-([a-z0-9-]+)\s*:\s*([^;]+)\s*;/g)) {
    surface[m[1]] = m[2].trim();
  }
  const ring = {};
  for (const m of rootCss.matchAll(/--ring-([a-z0-9-]+)\s*:\s*([^;]+)\s*;/g)) {
    ring[m[1]] = m[2].trim();
  }
  const status = {};
  for (const m of rootCss.matchAll(/--status-([a-z0-9-]+)\s*:\s*([^;]+)\s*;/g)) {
    status[m[1]] = m[2].trim();
  }
  const border = {};
  for (const m of rootCss.matchAll(/--border-([a-z0-9-]+)\s*:\s*([^;]+)\s*;/g)) {
    border[m[1]] = m[2].trim();
  }
  const shadow = {};
  for (const m of rootCss.matchAll(/--shadow-([a-z0-9-]+)\s*:\s*([^;]+)\s*;/g)) {
    shadow[m[1]] = m[2].trim();
  }

  return { neon, glow, glowSm, durations, easings, bg, text, glass, springs, fonts, wash, grid, surface, ring, status, border, shadow };
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
  const { neon, glow, glowSm, durations, easings, springs, wash, grid, surface, ring, status, border, shadow } = tokens;

  // Build accentConfig entries — preserve EXPECTED_ACCENTS order for stable output
  const accentNames = EXPECTED_ACCENTS.filter((n) => neon[n]);
  // Append any extra neon accents not in the expected list (sorted, for determinism)
  const extra = Object.keys(neon).filter((k) => !EXPECTED_ACCENTS.includes(k)).sort();
  const allAccents = [...accentNames, ...extra];

  const accentEntries = allAccents.map((name) => {
    const color = neon[name];
    const g = glow[name] ?? `rgba(0, 0, 0, 0.5)`;
    const shadow = `0 0 18px ${color}`;
    const jsKey = toJsKey(name);
    return `  ${jsKey}: {\n    color: '${color}',\n    glow: '${g}',\n    shadow: '${shadow}',\n  }`;
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

  // Wash surfaces (derived from --wash-*)
  const washEntries = Object.entries(wash)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `  ${toJsKey(k)}: '${escapeSingle(v)}'`);

  // Grid lattice (derived from --grid-*)
  const gridEntries = Object.entries(grid)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `  ${toJsKey(k)}: '${escapeSingle(v)}'`);

  // Surface elevation (derived from --surface-*)
  const surfaceEntries = Object.entries(surface)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `  ${toJsKey(k)}: '${escapeSingle(v)}'`);

  // Ring/stroke aliases (derived from --ring-*)
  const ringEntries = Object.entries(ring)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `  ${toJsKey(k)}: '${escapeSingle(v)}'`);

  return `// AUTO-GENERATED — do not edit. Run: node scripts/generate-tokens.mjs
// Source: src/styles/tokens.css

export type AccentColor = ${allAccents.map((a) => `'${toJsKey(a)}'`).join(' | ')};

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

// Wash surfaces (derived from --wash-*)
export const generatedWash: Record<string, string> = {
${washEntries.join(',\n')},
} as const;

// Grid lattice (derived from --grid-*)
export const generatedGrid: Record<string, string> = {
${gridEntries.join(',\n')},
} as const;

// Surface elevation (derived from --surface-*)
export const generatedSurface: Record<string, string> = {
${surfaceEntries.join(',\n')},
} as const;

// Ring/stroke aliases (derived from --ring-*)
export const generatedRing: Record<string, string> = {
${ringEntries.join(',\n')},
} as const;
`;
}

function generateTwContent(tokens) {
  const { neon, glow, glowSm, bg, text, glass, wash, grid, surface, ring, status, border, durations, easings, fonts } = tokens;

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
  // wash colors
  for (const [k, v] of Object.entries(wash).sort(([a], [b]) => a.localeCompare(b))) {
    colorEntries[`wash-${k}`] = v;
  }
  // grid colors
  for (const [k, v] of Object.entries(grid).sort(([a], [b]) => a.localeCompare(b))) {
    colorEntries[`grid-${k}`] = v;
  }
  // surface colors
  for (const [k, v] of Object.entries(surface).sort(([a], [b]) => a.localeCompare(b))) {
    colorEntries[`surface-${k}`] = v;
  }
  // ring colors
  for (const [k, v] of Object.entries(ring).sort(([a], [b]) => a.localeCompare(b))) {
    colorEntries[`ring-${k}`] = v;
  }
  // status colors
  for (const [k, v] of Object.entries(status).sort(([a], [b]) => a.localeCompare(b))) {
    colorEntries[`status-${k}`] = v;
  }
  // border colors
  for (const [k, v] of Object.entries(border).sort(([a], [b]) => a.localeCompare(b))) {
    colorEntries[`border-${k}`] = v;
  }

  const colorLines = Object.entries(colorEntries)
    .map(([k, v]) => `    '${k}': '${escapeSingle(v)}'`)
    .join(',\n');

  // `duration-*` utilities are backed by the same --dur-* tokens the JS reads,
  // so a Tailwind class and an anime.js tween can never disagree on timing.
  const durationLines = Object.entries(durations)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `    '${toJsKey(k)}': '${escapeSingle(v)}'`)
    .join(',\n');

  const easingLines = Object.entries(easings)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `    '${toJsKey(k)}': '${escapeSingle(v)}'`)
    .join(',\n');

  // font-* families come from tokens.css so `font-display` can never drift from
  // --font-display (it did: the Tailwind class shipped Space Grotesk while the
  // token said Orbitron).
  const fontFamily = {};
  for (const [k, v] of Object.entries(fonts).sort(([a], [b]) => a.localeCompare(b))) {
    fontFamily[k] = v
      .split(',')
      .map((f) => f.trim().replace(/^['"]|['"]$/g, ''))
      .filter(Boolean);
  }
  const fontLines = Object.entries(fontFamily)
    .map(([k, v]) => `    '${k}': ${JSON.stringify(v)}`)
    .join(',\n');

  return `// AUTO-GENERATED — do not edit. Run: node scripts/generate-tokens.mjs
// Source: src/styles/tokens.css
// Imported by tailwind.config.js: require('./tailwind.tokens.generated.js')

module.exports = {
  colors: {
${colorLines},
  },
  fontFamily: {
${fontLines},
  },
  transitionDuration: {
${durationLines},
  },
  transitionTimingFunction: {
${easingLines},
  },
};
`;
}

// ---------------------------------------------------------------------------
// Utils
// ---------------------------------------------------------------------------

function toJsKey(cssKey) {
  // "in-out" → "inOut", "expo-in" → "expoIn", "cyan-30" → "cyan30" etc.
  return cssKey.replace(/-([a-z0-9])/g, (_, c) => (/[0-9]/.test(c) ? c : c.toUpperCase()));
}

function escapeSingle(s) {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
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

  let tokens;
  try {
    tokens = parseTokensCss(css);
  } catch (e) {
    console.error(`[generate-tokens] Parse failure: ${e.message}`);
    console.error(`[generate-tokens] Source: ${path.relative(ROOT, TOKENS_CSS)}`);
    process.exit(1);
  }

  // Validate — must have at least MIN_ACCENTS neon accents
  const foundNeon = Object.keys(tokens.neon);
  if (foundNeon.length < MIN_ACCENTS) {
    console.error(`[generate-tokens] Parse failure: need at least ${MIN_ACCENTS} neon accents, found ${foundNeon.length}`);
    console.error(`[generate-tokens] Found neon keys: ${foundNeon.join(', ') || '(none)'}`);
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

  console.log(`[generate-tokens] Wrote ${path.relative(ROOT, OUT_TS)} (${Object.keys(tokens.neon).length} accents, ${Object.keys(tokens.durations).length} durations, ${Object.keys(tokens.easings).length} easings, ${Object.keys(tokens.wash).length} wash, ${Object.keys(tokens.grid).length} grid, ${Object.keys(tokens.surface).length} surface, ${Object.keys(tokens.ring).length} ring)`);
  console.log(`[generate-tokens] Wrote ${path.relative(ROOT, OUT_TW)} (${Object.keys(tokens.neon).length} neon + ${Object.keys(tokens.glow).length} glow + ${Object.keys(tokens.glowSm).length} glow-sm + bg/text/glass colors)`);
}

main();
