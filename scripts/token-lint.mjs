#!/usr/bin/env node
/**
 * token-lint.mjs — Design-token pre-commit guard.
 *
 * Fails if any staged .tsx/.ts/.css file (outside tokens.css itself) introduces:
 *   1. raw hex color   — /#[0-9a-fA-F]{3,8}\b/
 *   2. raw rgba()      — /rgba\s*\(/
 *   3. ad-hoc duration-/ease- Tailwind class not backed by tokens
 *   4. off-token Tailwind colour utility — text-gray-400, bg-white/5, …
 *      (never downgraded by --warn-legacy: that flag is for legacy debt,
 *       not for colours that bypass tokens.css)
 *   5. raw anime.js timing literal in a JS/TS object literal — `duration: 200`,
 *      `ease: 'outExpo'`, `delay: 30`, `stagger(40)` (never downgraded either:
 *      the same reasoning — new rule, no legacy debt to excuse)
 *
 * Rules 1–4 only ever see Tailwind CLASS STRINGS, so for the whole of anime.js's
 * history a raw `duration: 200` in an object literal passed CI. Rule 5 closes
 * that hole: AGENTS.md's animation contract ("durations/easings come from
 * src/config/animations.ts, generated from tokens.css") was otherwise
 * documentation-only and the debt regrew silently.
 *
 * Usage:
 *   node scripts/token-lint.mjs [file ...]   — lint given files
 *   node scripts/token-lint.mjs --all        — lint every .tsx/.ts/.css in repo
 *   node scripts/token-lint.mjs              — lint staged files (git diff --cached)
 *
 * Any line containing `token-lint-ignore` is skipped.
 */

import { execSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { readdirSync } from 'node:fs';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const TOKENS_CSS = 'src/styles/tokens.css';

// Allowed duration/ease token suffixes derived from tokens.css ` --dur-*` / `--ease-*`
// Parsed dynamically if tokens.css exists, otherwise fall back to a hard-coded list.
const FALLBACK_DURATIONS = [
  'tap',
  'hover',
  'enter',
  'exit',
  'stagger',
  'slide',
  'pulse',
  'typing',
  'scramble',
  'draw',
  'morph',
  'transition',
  'spring',
  'scroll',
  'counter',
];
const FALLBACK_EASINGS = [
  'smooth',
  'in',
  'out',
  'in-out',
  'expo-in',
  'elastic-in',
  'elastic-out',
  'elastic-in-out',
  'back-in',
  'back-out',
  'back-in-out',
];

function loadAllowedTokens() {
  const durs = new Set(FALLBACK_DURATIONS);
  const eases = new Set(FALLBACK_EASINGS);
  if (existsSync(TOKENS_CSS)) {
    try {
      const css = readFileSync(TOKENS_CSS, 'utf8');
      for (const m of css.matchAll(/--dur-([a-z0-9-]+)\s*:/g)) durs.add(m[1]);
      for (const m of css.matchAll(/--ease-([a-z0-9-]+)\s*:/g)) eases.add(m[1]);
    } catch {
      /* ignore */
    }
  }
  return { durs, eases };
}

// ---------------------------------------------------------------------------
// Off-token Tailwind colour utilities (rule 4)
// ---------------------------------------------------------------------------
// The doctrine: src/styles/tokens.css is the ONLY source of truth for colour.
// Tailwind's built-in palette (`text-gray-400`, `bg-white/5`, `from-purple-500`,
// `border-black/20`, …) is just as much a violation as a raw hex literal — it
// bypasses tokens.css entirely — but it was invisible to the raw-hex/rgba rules.
//
// WHY A POSITIVE ALLOWLIST AND NOT "ANYTHING THAT ISN'T A var()":
// The naive inverse rule ("flag every colour part that is not `var(--…)`")
// flags everything, including the token-backed named colours this project
// generates from tokens.css (`text-neon-cyan`, `bg-glass-border`,
// `ring-cyan`, `border-strong`, …) and every legitimate colour name the
// design-token vocabulary grows in the future. That is the same failure mode
// as a denylist of "known bad" colours: it must be updated on every rename,
// and until it is, it either blocks real tokens or silently misses new
// defaults. An allowlist of the *default Tailwind palette* is finite (22
// families + 5 keywords), stable across Tailwind majors, and complete: every
// class it catches is provably a stock-palette class, never a project token.

// The 22 default Tailwind colour families (v3 and v4 name the same set).
const TW_PALETTE_FAMILIES = new Set([
  'slate',
  'gray',
  'grey',
  'zinc',
  'neutral',
  'stone',
  'red',
  'orange',
  'amber',
  'yellow',
  'lime',
  'green',
  'emerald',
  'teal',
  'cyan',
  'sky',
  'blue',
  'indigo',
  'violet',
  'purple',
  'fuchsia',
  'pink',
  'rose',
]);

// Shade-less stock palette entries that ARE doctrine violations — `bg-white/5`
// and `border-black/20` bypass tokens.css exactly like `text-gray-400` does.
const TW_PALETTE_BARE = new Set(['white', 'black']);

// Colour-less keywords Tailwind accepts on these utilities. They carry no hue
// of their own, so they are always acceptable and are never reported.
const TW_NEUTRAL_KEYWORDS = new Set([
  'transparent',
  'current',
  'currentcolor',
  'inherit',
  'none',
]);

// Colour-bearing utility prefixes. Sorted longest-first at build time so that
// `ring-offset-` wins over `ring-` and `border-x-` over `border-` — otherwise
// the shorter prefix would swallow the side/offset qualifier and the colour
// part would never be seen (silent false negative, not a false positive).
// Every entry here can genuinely carry a colour; none were trimmed.
const COLOUR_PREFIXES = [
  'placeholder-',
  'ring-offset-',
  'decoration-',
  'accent-',
  'border-',
  'divide-',
  'outline-',
  'shadow-',
  'from-',
  'via-',
  'to-',
  'border-t-',
  'border-r-',
  'border-b-',
  'border-l-',
  'border-x-',
  'border-y-',
  'divide-x-',
  'divide-y-',
  'text-',
  'bg-',
  'fill-',
  'stroke-',
  'caret-',
  'ring-',
].sort((a, b) => b.length - a.length);

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// A class-ish run: everything up to the next quote/space/delimiter. Stopping at
// `(`/`)` and `,` truncates exotic arbitrary values (`bg-[url(…)]`) mid-value,
// which is harmless — the result still starts with `[` and is skipped.
const COLOUR_UTIL_RE = new RegExp(
  `\\b(?:!)?(${COLOUR_PREFIXES.map(escapeRe).join('|')})([^\\s"'\\x60,;{}()<>]+)`,
  'g',
);

// `<family>-<shade>`, shade being 50…950 in practice — matched loosely as
// 2–3 digits so a future shade does not need a linter change.
const TW_SHADED_RE = /^([a-z]+)-(\d{2,3})$/;

// Trailing `/opacity` modifier: numeric or bracketed. Stripped before the
// palette check so `bg-white/5` and `bg-white` are treated identically.
const TW_OPACITY_RE = /\/(?:\[[^\]]*\]|\d{1,3})$/;

// Trailing `!` — the Tailwind important modifier. v3.2 accepts it as a suffix
// and v4 prefers it, so `text-white!` is a real stock-palette class. Stripped
// BEFORE TW_OPACITY_RE because the two can combine (`bg-black/20!`) and the
// opacity regex is end-anchored — reversing the order would leave `/20!`
// unmatched and silently miss the colour.
const TW_IMPORTANT_RE = /!$/;

const OFFTOKEN_COLOR_RULE = 'no-offtoken-color-utility';

// Rules that --warn-legacy must never downgrade — see the note in main().
const NEVER_DOWNGRADED = new Set([OFFTOKEN_COLOR_RULE, 'no-raw-anime-timing']);

// Colour keys this project actually defines (tailwind.tokens.generated.js, which
// is generated from tokens.css). Used only to *suppress* — a class whose colour
// part is a defined key is a token-backed class by construction, so it can never
// be reported even if a key were later named e.g. `purple-500`.
function loadConfiguredColours() {
  const names = new Set();
  const rel = 'tailwind.tokens.generated.js';
  if (!existsSync(rel)) return names;
  try {
    const req = createRequire(path.resolve(rel));
    const mod = req('./' + rel);
    const colours = mod?.colors;
    if (colours && typeof colours === 'object') {
      for (const [k, v] of Object.entries(colours)) {
        if (typeof v === 'string') names.add(k.toLowerCase());
      }
    }
  } catch {
    /* generated file absent or unparseable — allowlist still stands */
  }
  return names;
}

/**
 * True when `rest` (the part after a colour-bearing prefix, opacity modifier
 * still attached) is a stock-Tailwind colour rather than a project token.
 */
function isOffTokenColour(prefix, rest, configured) {
  if (!rest) return false; // `placeholder-` with no suffix
  // Arbitrary values are never this rule's business: token-backed
  // (`text-[var(--fg-1)]`, `border-[var(--glass-border)]`) by contract, and any
  // raw colour hiding in one (`text-[#fff]`) is already caught by rules 1/2.
  if (rest.startsWith('[') || rest.startsWith('-[')) return false;
  const base = rest
    .toLowerCase()
    .replace(TW_IMPORTANT_RE, '')
    .replace(TW_OPACITY_RE, '');
  if (!base) return false;
  if (TW_NEUTRAL_KEYWORDS.has(base)) return false;
  if (configured.has(base) || configured.has(prefix + base)) return false;
  if (TW_PALETTE_BARE.has(base)) return true;
  const m = base.match(TW_SHADED_RE);
  if (m && TW_PALETTE_FAMILIES.has(m[1])) return true;
  // Bare family name, no shade: every stock family also defines a DEFAULT
  // (`text-amber` is #f59e0b, `text-cyan` is #06b6d4), so this is a stock colour
  // too — the shade-less spelling of the same violation. The `configured` lookups
  // above run first on purpose: the project spells its accents `neon-<name>` and
  // `ring-<name>`, so a token named exactly `cyan` would win here and stay legal.
  if (TW_PALETTE_FAMILIES.has(base)) return true;
  return false;
}

// Regexes
const HEX_RE = /#[0-9a-fA-F]{3,8}\b/g;
const RGBA_RE = /rgba\s*\(/g;
// Matches Tailwind arbitrary class tokens like duration-300, duration-[320ms], ease-in-out etc. inside quotes
const DURATION_CLASS_RE = /duration-(?:\[?[^\s"'`]*\]?|[a-z0-9-]+)/g;
const EASE_CLASS_RE = /ease-(?:\[?[^\s"'`]*\]?|[a-z0-9-]+)/g;

const IGNORE_MARKER = 'token-lint-ignore';
const SUPPORTED_EXTS = new Set(['.ts', '.tsx', '.css']);

// ---------------------------------------------------------------------------
// Rule 5 — raw anime.js timing literals inside JS/TS object literals
// ---------------------------------------------------------------------------
// Rules 1–4 only inspect Tailwind class strings. They therefore never saw
// `duration: 200` written in an object literal, which is the shape anime.js
// actually consumes. Every such literal in this repo passed CI for as long as
// the rule set existed.
//
// WHY THE KEY SET IS A POSITIVE RULE AND NOT A DENYLIST OF ANIME EASING NAMES
// (`outExpo`, `inOutQuad`, …):
// the token-backed spelling is ALWAYS an identifier — `easings.outExpo`,
// `easings.expoIn` — and never a string literal, because `src/config/animations.ts`
// maps every easing name to a generated value. So "the value of an `ease:` key is
// a string literal" is a complete, positive test with no denylist to keep in sync
// when anime renames an easing or the token map gains one. It also catches the
// shapes a name denylist would miss — `ease: 'spring(soft)'` shipped a real bug
// (anime has no `eases.spring`, and its parser silently falls through to `none`),
// and a typo'd easing string fails just as silently.
//
// WHY A FILE-SCOPE GATE ON *REACHING* anime.js, NOT ON IMPORTING IT:
// `duration`, `ease` and `delay` are common property names in unrelated code
// (`SkillCard.test.tsx` has `duration: '2 yrs'` — a project tenure, not an
// animation). So the rule needs to know which files can hand a timing to anime.
// Gating on "this file imports `animejs`" was the first cut and it was wrong by
// exactly one hop: the repo wraps anime in hooks and utils that accept raw
// `delay?: number` / `duration?: number` / `ease?: string` and forward them
// (`useStagger`, `useMotionScope`, `useFlashCurtain`, `createSafeAnimatable`).
// Six admin pages call `useStagger({ delay: 60 })` and import no anime at all,
// so they were invisible — a raw 60ms under the animation contract, ungated.
// The gate is therefore import-REACHABILITY to anime, derived from the tree
// itself (see `animeBoundaryModules`) rather than from a hand-written list of
// wrapper names: a wrapper added tomorrow is covered without editing this file.
const ANIME_TIMING_RULE = 'no-raw-anime-timing';

// Any module reference to animejs: a real import, a bare `import 'animejs'`, a
// `require('animejs')`, or a `vi.mock('animejs', …)` / `jest.mock(…)` in a test
// — a test that mocks animejs is still asserting on anime params, so it is in
// scope rather than silently exempt.
const ANIME_MODULE_RE =
  /(?:\bfrom\s*|\bimport\s*|\brequire\s*\(\s*|\bmock\s*\(\s*)['"]animejs(?:\/[^'"]*)?['"]/;

// Timing keys, each matched ONLY against a bare numeric literal value so that
// every token-derived form passes untouched: `durations[300] * 1000`,
// `durations.stagger * (1/5) * 1000`, `stagger(durations.stagger * 1000, …)`,
// `delay: stagger(…)`, `ease: easings.outExpo`, `ease: softSpring`.
const ANIME_DURATION_RE = /\bduration\s*:\s*(\d+(?:\.\d+)?)/g;
const ANIME_DELAY_RE = /\bdelay\s*:\s*(\d+(?:\.\d+)?)/g;
// `ease:` with a quoted value — see the positive-rule note above.
const ANIME_EASE_RE = /\bease\s*:\s*(['"`])([^'"`\n]*)\1/g;
const ANIME_STAGGER_RE = /\bstagger\(\s*(\d+(?:\.\d+)?)/g;

// ---------------------------------------------------------------------------
// Rule 5 scope, part 2 — reaching anime.js THROUGH the repo's own wrappers
// ---------------------------------------------------------------------------
// Gating on "this file imports `animejs`" misses every caller of a wrapper.
// This repo has four of them, and all four accept caller timings verbatim:
//   src/hooks/useStagger.ts   StaggerOptions.delay/.duration/.ease/.paintDelay
//   src/hooks/useMotionScope.ts  MotionScopeOptions.defaults.{duration,ease}
//   src/hooks/useFlashCurtain.ts FlashCurtainOptions.durationMs
//   src/utils/animatable.ts    createSafeAnimatable(target, params: AnimatableParams)
// A wrapper is recognised by SYNTAX, never by name, so a new one is covered
// without editing this file:
//
//   1. it references `animejs`, AND
//   2. it exposes a caller-controlled timing, in one of two detectable shapes:
//        (a) a timing key declared in a type — `delay?: number;`
//        (b) an anime call whose FINAL argument is a bare identifier —
//            `return raw(target, params)` in animatable.ts. Final argument only,
//            because in `animate(el, {…})` the final argument is the target-ish
//            object and the params are inline; treating that as forwarding would
//            classify every anime call site in the repo as a wrapper.
//   3. it lives in a reusable layer (`src/hooks`, `src/utils`, `src/lib`) rather
//      than under `src/components`. Those layers are the repo's documented
//      no-JSX helper directories (AGENTS.md directory map); a component is a
//      CONSUMER of a wrapper, and is only in scope itself if it imports animejs
//      directly. `src/config` is deliberately excluded — `animations.ts` is the
//      token SOURCE, the opposite end of this pipeline, and treating it as a
//      boundary would put every file that imports `durations` in scope.
//
// Barrel closure: a module that RE-EXPORTS a boundary module is itself a
// boundary, so `import { useStagger } from '../hooks'` resolves exactly like
// `from '../hooks/useStagger'`. Closure follows re-export statements ONLY —
// following ordinary imports would make the whole app one hop from anime.
const ANIME_BOUNDARY_LAYER_RE = /(?:^|\/)(?:hooks|utils|lib)\//;
// Identifiers that are token maps, not caller-supplied values: `stagger(durations…)`.
const ANIME_TOKEN_NAMES = new Set([
  'durations',
  'easings',
  'springs',
  'accents',
]);
// (a) a timing key declared with a numeric/string type in the module's own surface.
const ANIME_WRAPPER_DECL_RE =
  /(?:^|[^\w$.])(?:duration|delay|ease|loopDelay|paintDelay|durationMs)\??\s*:\s*(?:number|string)\b/;
// Every module specifier a file pulls in, import or re-export alike.
const ANIME_IMPORT_SPEC_RE =
  /(?:\bfrom\s*|\brequire\s*\(\s*|\bimport\s*\(\s*|\bimport\s+)['"]([^'"\n]+)['"]/g;
// Re-export edges only — the ones a barrel is allowed to forward.
const ANIME_REEXPORT_SPEC_RE =
  /\bexport\s+(?:\*(?:\s+as\s+[A-Za-z_$][\w$]*)?|\{[^}]*\})\s*from\s*['"]([^'"\n]+)['"]/g;

/** Local binding names this module imported from `animejs`, alias-aware. */
function animeImportedBindings(maskedSrc) {
  const names = [];
  const re =
    /import\s+(?:type\s+)?\{([^}]*)\}\s*from\s*['"]animejs(?:\/[^'"]*)?['"]/g;
  for (const m of maskedSrc.matchAll(re)) {
    for (const part of m[1].split(',')) {
      const spec = part.trim().replace(/^type\s+/, '');
      if (!spec) continue;
      const as = spec.split(/\s+as\s+/);
      const local = (as[1] ?? as[0]).trim();
      if (/^[A-Za-z_$][\w$]*$/.test(local)) names.push(local);
    }
  }
  return names;
}

/** True when this module hands a caller-controlled timing into anime. */
function forwardsTimingToAnime(maskedSrc) {
  if (ANIME_WRAPPER_DECL_RE.test(maskedSrc)) return true;
  const bindings = animeImportedBindings(maskedSrc);
  if (bindings.length === 0) return false;
  const callRe = new RegExp(
    `\\b(?:${bindings.join('|')})\\s*\\(([^()]*)\\)`,
    'g',
  );
  for (const m of maskedSrc.matchAll(callRe)) {
    const args = m[1].split(',');
    const last = (args[args.length - 1] ?? '').trim();
    if (/^[A-Za-z_$][\w$]*$/.test(last) && !ANIME_TOKEN_NAMES.has(last)) {
      return true;
    }
  }
  return false;
}

/** Absolute, extension-less, posix key — the identity used across this section. */
function animeModuleKey(fileOrDir) {
  return path
    .resolve(fileOrDir)
    .replace(/\\/g, '/')
    .replace(/\.(tsx|ts|jsx|js)$/, '');
}

function animeImportSpecs(maskedSrc, re) {
  return [...maskedSrc.matchAll(re)].map((m) => m[1]);
}

/** Candidate keys for a specifier: the path itself, or its `index` barrel. */
function animeResolveSpecifier(importerFile, spec) {
  if (!spec.startsWith('.')) return [];
  const base = animeModuleKey(path.resolve(path.dirname(importerFile), spec));
  return [base, `${base}/index`];
}

/**
 * Recursive `src/` walk for the boundary derivation. Deliberately NOT the
 * script's existing `walkDirSync`: that one reaches `fs` through
 * `Function('…require…')`, which throws in an ES module, so it is only ever
 * reachable from the `--all` git-ls-files fallback. This file already imports
 * `readdirSync` at the top, so use it and keep the rule self-contained.
 */
function animeWalkSources(dir) {
  const out = [];
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...animeWalkSources(full));
    else if (/\.(tsx|ts)$/.test(e.name)) out.push(full);
  }
  return out;
}

let animeBoundaryCache = null;

/**
 * Absolute keys of every module whose timings reach anime.js — the wrappers,
 * plus the barrels that re-export them. Memoised per process: `--all` calls it
 * once, and a single-file invocation pays one tree walk.
 */
function animeBoundaryModules() {
  if (animeBoundaryCache) return animeBoundaryCache;

  const sources = new Map();
  for (const abs of animeWalkSources(path.resolve('src'))) {
    const repoRel = path.relative(process.cwd(), abs).replace(/\\/g, '/');
    if (isGeneratedFile(repoRel) || isTokensCss(repoRel)) continue;
    let raw;
    try {
      raw = readFileSync(abs, 'utf8');
    } catch {
      continue;
    }
    sources.set(abs, maskSource(raw, false));
  }

  const boundary = new Set();
  for (const [abs, src] of sources) {
    if (!ANIME_MODULE_RE.test(src)) continue;
    if (!ANIME_BOUNDARY_LAYER_RE.test(abs.replace(/\\/g, '/'))) continue;
    if (forwardsTimingToAnime(src)) boundary.add(animeModuleKey(abs));
  }

  // Barrel closure, re-export edges only.
  let grew = true;
  while (grew) {
    grew = false;
    for (const [abs, src] of sources) {
      const key = animeModuleKey(abs);
      if (boundary.has(key)) continue;
      for (const spec of animeImportSpecs(src, ANIME_REEXPORT_SPEC_RE)) {
        if (animeResolveSpecifier(abs, spec).some((t) => boundary.has(t))) {
          boundary.add(key);
          grew = true;
          break;
        }
      }
    }
  }

  animeBoundaryCache = boundary;
  return boundary;
}

/**
 * How (or whether) this file reaches anime.js. Returns a label for the report
 * — the wrapper that let a raw literal through is more useful to the reader than
 * a bare "this is an anime file".
 */
function animeReachedVia(filePath, content) {
  const src = maskSource(content, false);
  if (ANIME_MODULE_RE.test(src)) return 'animejs';
  const abs = path.resolve(filePath);
  const boundary = animeBoundaryModules();
  for (const spec of animeImportSpecs(src, ANIME_IMPORT_SPEC_RE)) {
    for (const target of animeResolveSpecifier(abs, spec)) {
      if (boundary.has(target)) {
        return path.relative(process.cwd(), target).replace(/\\/g, '/');
      }
    }
  }
  return null;
}

// Tokens that may legally precede a `/` that opens a regex literal rather than
// an division. Anything else (identifier, digit, `)`, `]`) means division.
const REGEX_KEYWORD_BEFORE = new Set([
  'return',
  'typeof',
  'instanceof',
  'in',
  'of',
  'new',
  'delete',
  'void',
  'case',
  'do',
  'else',
  'yield',
  'await',
]);
const REGEX_PUNCT_BEFORE = new Set([
  '(',
  '{',
  '[',
  ',',
  ';',
  ':',
  '=',
  '&',
  '|',
  '!',
  '?',
  '+',
  '-',
  '*',
  '%',
  '^',
  '~',
  '<',
  '>',
  '\n',
]);

const WORD_CHAR_RE = /[A-Za-z0-9_$]/;

/**
 * Blank the CONTENT of every comment, and — when `blankStrings` is set — the
 * content of every string and template literal too. Quote characters, offsets
 * and line breaks are all preserved, so `line:col` stays accurate and every
 * downstream regex keeps the same indices it had on the original source.
 *
 * WHY COMMENTS MUST BE BLANKED: this repo deliberately documents the old
 * literal form in comments — `SignalTicks.tsx` ("For drawable stagger: delay
 * stagger(40,…)"), `TypewriterText.tsx` ("used to be a hardcoded `stagger(40)`"),
 * `sudosuperuser-ostaad/index.tsx` ("Was stagger(70)") — and all three files
 * import animejs. Matching raw text would fire on the repo's own archaeology.
 *
 * WHY STRING BODIES MUST BE BLANKED (for rule 5's matcher): a `duration: 200`
 * inside a string is DATA — a fixture, a doc blob, a JSON payload — not an
 * anime call. This repo's own rule-5 test suite contains a few dozen such
 * strings, and they are exactly the false positives the two-pass design
 * removes. The `ease:` rule survives this because it keys off the QUOTE
 * characters, which are preserved: `ease: 'outExpo'` still matches with its body
 * blanked, and the reported name is recovered from the raw line by offset.
 *
 * The two passes are deliberately separate:
 *   blankStrings:false → the module-reference gate, which needs to SEE
 *     `from 'animejs'` and `vi.mock('animejs')` — both of which live in strings.
 *   blankStrings:true  → rule 5's matcher, which must not see string data.
 *
 * Known limitation: a comment nested inside a template-literal hole
 * (a backtick, then `${`, then a block comment, then an expression) is not
 * blanked, because template literals are scanned as single opaque runs. No such
 * construct exists in this repo, and a real timing literal inside such a hole is
 * still worth reporting.
 */
function maskSource(src, blankStrings) {
  const out = src.split('');
  const n = src.length;
  let i = 0;
  // Last significant (non-whitespace, non-comment) character and word seen —
  // the only signal needed to tell a regex literal from a division.
  let prevChar = '';
  let prevWord = '';

  const blankRun = (from, to) => {
    for (let k = from; k < to; k++) {
      if (out[k] !== '\n') out[k] = ' ';
    }
  };

  while (i < n) {
    const c = src[i];

    if (c === '/' && src[i + 1] === '/') {
      const start = i;
      while (i < n && src[i] !== '\n') i++;
      blankRun(start, i);
      continue;
    }

    if (c === '/' && src[i + 1] === '*') {
      const start = i;
      i += 2;
      while (i < n && !(src[i] === '*' && src[i + 1] === '/')) i++;
      if (i < n) i += 2;
      blankRun(start, i);
      continue;
    }

    if (c === '"' || c === "'") {
      const quote = c;
      const start = i;
      i++;
      while (i < n) {
        if (src[i] === '\\') {
          i += 2;
          continue;
        }
        if (src[i] === quote) {
          i++;
          break;
        }
        i++;
      }
      if (blankStrings) blankRun(start + 1, i - 1);
      prevChar = quote;
      prevWord = '';
      continue;
    }

    if (c === '`') {
      const start = i;
      i++;
      while (i < n) {
        if (src[i] === '\\') {
          i += 2;
          continue;
        }
        if (src[i] === '`') {
          i++;
          break;
        }
        i++;
      }
      if (blankStrings) blankRun(start + 1, i - 1);
      prevChar = '`';
      prevWord = '';
      continue;
    }

    if (c === '/') {
      const regexAllowed =
        !prevChar ||
        (prevWord && REGEX_KEYWORD_BEFORE.has(prevWord)) ||
        REGEX_PUNCT_BEFORE.has(prevChar);
      if (regexAllowed) {
        i++;
        let inClass = false;
        while (i < n) {
          const ch = src[i];
          if (ch === '\\') {
            i += 2;
            continue;
          }
          if (ch === '\n') break; // not a regex after all — bail out
          if (ch === '[') inClass = true;
          else if (ch === ']') inClass = false;
          else if (ch === '/' && !inClass) {
            i++;
            while (i < n && /[a-z]/i.test(src[i])) i++;
            break;
          }
          i++;
        }
        prevChar = '/';
        prevWord = '';
        continue;
      }
      // Division — fall through to the ordinary character path.
    }

    if (WORD_CHAR_RE.test(c)) {
      let j = i;
      while (j < n && WORD_CHAR_RE.test(src[j])) j++;
      const word = src.slice(i, j);
      i = j;
      prevChar = word[word.length - 1];
      prevWord = word;
      continue;
    }

    i++;
    if (!/\s/.test(c)) {
      prevChar = c;
      prevWord = '';
    }
  }

  return out.join('');
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const GENERATED_FILES = new Set([
  'src/config/generated/tokens.generated.ts',
  'tailwind.tokens.generated.js',
]);

function isGeneratedFile(file) {
  const normalised = file.replace(/\\/g, '/');
  for (const g of GENERATED_FILES) {
    if (
      normalised === g ||
      normalised.endsWith('/' + g) ||
      normalised.endsWith(g)
    )
      return true;
  }
  return false;
}

function isTokensCss(file) {
  // Allow both posix and win paths — normalise to posix for comparison
  const normalised = file.replace(/\\/g, '/');
  return (
    normalised === TOKENS_CSS ||
    normalised.endsWith('/' + TOKENS_CSS) ||
    normalised.endsWith(TOKENS_CSS)
  );
}

function collectFiles() {
  const args = process.argv.slice(2).filter((a) => a !== '--all');

  // --all flag → walk repo
  if (process.argv.includes('--all')) {
    return collectAllFiles();
  }

  // Explicit file list via args
  if (args.length > 0) {
    return args.filter((f) => {
      const ext = path.extname(f);
      return SUPPORTED_EXTS.has(ext) && existsSync(f);
    });
  }

  // Default: staged files from git
  try {
    const out = execSync('git diff --cached --name-only --diff-filter=ACMR', {
      encoding: 'utf8',
    });
    return out
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)
      .filter((f) => SUPPORTED_EXTS.has(path.extname(f)) && existsSync(f));
  } catch {
    return [];
  }
}

function collectAllFiles() {
  // `git ls-files` only returns TRACKED files, so any newly created file was
  // invisible to `--all` until it was staged — the gate reported "OK" over a
  // directory that was never linted. Prefer the filesystem walk, which is
  // what the fallback used to do, and use git only to add tracked files
  // outside src/ (e2e, scripts).
  const fromDisk = walkDir('src');
  try {
    const out = execSync('git ls-files', { encoding: 'utf8' });
    const tracked = out
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)
      .filter((f) => SUPPORTED_EXTS.has(path.extname(f)) && existsSync(f));
    return [...new Set([...fromDisk, ...tracked])];
  } catch {
    return fromDisk;
  }
}

function walkDir(dir) {
  const results = [];
  let entries;
  try {
    const { readdirSync } = await_import_sync();
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return results;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) results.push(...walkDir(full));
    else if (SUPPORTED_EXTS.has(path.extname(full))) results.push(full);
  }
  return results;
}

function await_import_sync() {
  // dynamic helper so top-level stays ESM-clean
  return await_createRequire();
}
function await_createRequire() {
  // Use node:fs synchronously — avoid async at top-level

  const fs = await_require_fs();
  return fs;
}
function await_require_fs() {
  return { readdirSync: awaitFs().readdirSync };
}
function awaitFs() {
  // lazy import of fs
  const m = awaitImport('node:fs');
  return m;
}
function awaitImport(spec) {
  // synchronous require via createRequire
  const { createRequire } = awaitCreateRequire2();
  const req = createRequire(import.meta.url);
  return req(spec);
}
function awaitCreateRequire2() {
  // inline to avoid circular
  return { createRequire: awaitModule().createRequire };
}
function awaitModule() {
  // Use global require available in Node ESM via createRequire bridge
  // Fallback: import synchronously
  try {
    // @ts-ignore — module is available in Node
    const mod = globalThis.process?.getBuiltinModule
      ? globalThis.process.getBuiltinModule('node:module')
      : null;
    if (mod) return mod;
  } catch {
    /* ignore */
  }
  // Last resort: return a shim that throws
  return {
    createRequire: () => {
      throw new Error('createRequire unavailable');
    },
  };
}

// Simple synchronous walk without the ceremony above — override walkDir
function walkDirSync(dir) {
  const { readdirSync } = await_simpleFs();
  const out = [];
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walkDirSync(full));
    else if (SUPPORTED_EXTS.has(path.extname(full))) out.push(full);
  }
  return out;
}
function await_simpleFs() {
  // Direct require via Function to avoid ESM static analysis issues without extra deps
  const req = Function(
    'return typeof require!=="undefined"?require:undefined',
  )();
  if (req) return req('fs');
  // ESM fallback — use createRequire

  const cr = eval(
    "(() => { try { const m=require('module'); return m.createRequire(import.meta.url); } catch(e){ return null; } })()",
  );
  if (cr) return cr('fs');
  throw new Error('Cannot load fs');
}

// Patch walkDir to use sync version — re-assign for collectAllFiles fallback
// (collectAllFiles will use git ls-files first; this is only the fallback path)

// ---------------------------------------------------------------------------
// Lint logic
// ---------------------------------------------------------------------------
/**
 * Check a single file. Returns array of { line, col, rule, message }.
 */
function lintFile(filePath, allowed) {
  if (isGeneratedFile(filePath)) return [];
  const violations = [];
  let content;
  try {
    content = readFileSync(filePath, 'utf8');
  } catch {
    return violations;
  }

  const lines = content.split('\n');
  const inTokensCss = isTokensCss(filePath);
  const fileIsCss = path.extname(filePath) === '.css';
  // CSS variable definition lines (e.g. --neon-cyan: #00f0ff;) are never violations
  const CSS_VAR_DEF_RE = /^\s*--[a-zA-Z0-9-_]+\s*:/;

  // Rule 5 scope gate: JS/TS only, and only files that can hand a timing to
  // anime.js — directly, or through one of the repo's own wrappers.
  // tokens.css and the generated token maps are excluded here as well as by
  // `isGeneratedFile`/`isTokensCss` — they are the SOURCE of the token values,
  // so a raw number in one is the definition, not a violation.
  //
  // `animeReachedVia` reads the comment-masked source with STRING BODIES
  // VISIBLE, because the module reference itself lives inside a string
  // (`from 'animejs'`, `require('animejs')`, `vi.mock('animejs')`), and it
  // returns the label that put this file in scope (`animejs`, or the wrapper it
  // imports). `null` means out of scope.
  const animeVia =
    inTokensCss || fileIsCss ? null : animeReachedVia(filePath, content);
  const animeFile = animeVia !== null;
  // Rule 5's matcher reads the source with string bodies ALSO blanked, so a
  // `duration: 200` sitting in fixture/doc data is not mistaken for an anime
  // call. Offsets and quote characters survive, so columns stay correct and the
  // `ease:` rule still fires (it keys off the quotes) — its reported name is
  // recovered from the raw line by offset.
  const codeLines = animeFile ? maskSource(content, true).split('\n') : lines;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes(IGNORE_MARKER)) continue;
    // Adjacent-line ignore: prettier may split a JSX element and its
    // trailing {/* token-lint-ignore */} onto the next line (e.g. _app.tsx
    // theme-color meta). Treat a raw-hex line as ignored when the immediate
    // next or previous line carries the marker.
    const adjIgnored =
      (i + 1 < lines.length && lines[i + 1].includes(IGNORE_MARKER)) ||
      (i > 0 && lines[i - 1].includes(IGNORE_MARKER));
    // Skip pure CSS variable definition lines entirely
    if (CSS_VAR_DEF_RE.test(line)) continue;

    const lineNo = i + 1;

    // 5) raw anime.js timing literal in an object literal — `duration: 200`,
    //    `ease: 'outExpo'`, `delay: 30`, `stagger(40)`. Matched against the
    //    masked line (comments AND string bodies blanked), so the repo's own
    //    archaeology of the old literal form ("used to be a hardcoded
    //    `stagger(40)`") and any fixture/doc data are never reported, and
    //    honoured by the same single ignore marker as rules 1–4 — including the
    //    adjacent-line form JSX needs.
    if (animeFile && !adjIgnored) {
      const code = codeLines[i] ?? '';
      // Name the path into anime once — `via animejs` or the wrapper that let a
      // raw literal through — so a report line says WHY the rule applies here.
      const via =
        animeVia === 'animejs'
          ? 'via animejs'
          : `via ${animeVia} (reaches animejs)`;
      for (const m of code.matchAll(ANIME_DURATION_RE)) {
        violations.push({
          file: filePath,
          line: lineNo,
          col: line.indexOf(m[0]) + m.index + 1,
          rule: ANIME_TIMING_RULE,
          message: `raw anime.js duration ${m[1]} ${via} — use durations.* from src/config/animations.ts (tokens.css --dur-*) instead`,
        });
      }
      for (const m of code.matchAll(ANIME_DELAY_RE)) {
        violations.push({
          file: filePath,
          line: lineNo,
          col: line.indexOf(m[0]) + m.index + 1,
          rule: ANIME_TIMING_RULE,
          message: `raw anime.js delay ${m[1]} ${via} — use durations.* from src/config/animations.ts (tokens.css --dur-*) instead`,
        });
      }
      for (const m of code.matchAll(ANIME_EASE_RE)) {
        // The body is blanked in `code`; recover the real easing name from the
        // raw line. `m[0]` ends with the closing quote, so the body starts one
        // character (the opening quote) before the tail.
        const at = m.index + m[0].length - 1 - m[2].length;
        violations.push({
          file: filePath,
          line: lineNo,
          col: line.indexOf(m[0]) + m.index + 1,
          rule: ANIME_TIMING_RULE,
          message: `raw anime.js ease "${line.slice(at, at + m[2].length)}" ${via} — use easings.* from src/config/animations.ts instead (easing strings must come from the generated token map)`,
        });
      }
      for (const m of code.matchAll(ANIME_STAGGER_RE)) {
        violations.push({
          file: filePath,
          line: lineNo,
          col: line.indexOf(m[0]) + m.index + 1,
          rule: ANIME_TIMING_RULE,
          message: `raw anime.js stagger(${m[1]}) ${via} — use stagger(durations.stagger * 1000, { from: 'first' }) instead`,
        });
      }
    }

    // 1) raw hex — outside tokens.css only; also skip global.css which is a
    // companion to tokens.css (it @imports it and defines utilities that may
    // legitimately inline rgba hex for glass/overlay variants).
    const isTokensCompanion = filePath
      .replace(/\\/g, '/')
      .endsWith('src/styles/global.css');
    if (!inTokensCss && !isTokensCompanion && !adjIgnored) {
      for (const m of line.matchAll(HEX_RE)) {
        violations.push({
          file: filePath,
          line: lineNo,
          col: m.index + 1,
          rule: 'no-raw-hex',
          message: `raw hex color "${m[0]}" — use a CSS variable / token instead`,
        });
      }
    }

    // 2) raw rgba() — outside tokens.css (and its companion) only
    if (!inTokensCss && !isTokensCompanion && !adjIgnored) {
      for (const m of line.matchAll(RGBA_RE)) {
        violations.push({
          file: filePath,
          line: lineNo,
          col: m.index + 1,
          rule: 'no-raw-rgba',
          message: `raw rgba() — use a CSS variable / token instead`,
        });
      }
    }

    // 3) ad-hoc duration-/ease- Tailwind class not backed by tokens
    // Scope check to Tailwind class context only:
    //   - lines containing className= / class= / @apply
    //   - OR quoted strings (class lists are always inside quotes in .tsx)
    // This avoids false-positives on CSS variable definitions like `--ease-smooth:`
    // and bare CSS properties.
    const looksLikeClassContext =
      line.includes('className') ||
      line.includes('class=') ||
      line.includes('@apply') ||
      /["'`]/.test(line);

    // Also skip lines that are CSS variable definitions (already filtered above, but also
    // covers --ease-* inside :root where the regex would otherwise match `--ease-smooth` suffix)
    const isCssVarDef = CSS_VAR_DEF_RE.test(line);

    if (looksLikeClassContext && !isCssVarDef) {
      // Extract only the quoted segments for duration/ease scanning so that
      // surrounding JS/CSS is not misinterpreted.
      // We scan quoted strings + @apply tail if present. Simpler: collect all
      // double/single/backtick-quoted spans on this line and scan inside them.
      const quotedSpans = [];
      for (const m of line.matchAll(/(["'`])[^"'`]*?\1/g))
        quotedSpans.push(m[0]);
      // Also include @apply tail (unquoted) — e.g. @apply duration-200
      const atApplyTail = line.match(/@apply\s+[^;]+/)?.[0] || '';
      const scanTargets = quotedSpans.length
        ? quotedSpans
        : atApplyTail
          ? [atApplyTail]
          : [];
      // If there are no quoted spans and no @apply, but className/class was present,
      // fall back to scanning the whole line (covers template literal splits).
      const targets = scanTargets.length
        ? scanTargets
        : line.includes('className') || line.includes('class=')
          ? [line]
          : [];

      for (const target of targets) {
        for (const m of target.matchAll(DURATION_CLASS_RE)) {
          const token = m[0];
          const suffix = token
            .slice('duration-'.length)
            .replace(/[",'`}\];]+$/, '')
            .replace(/;$/, '');
          if (suffix.startsWith('[')) {
            violations.push({
              file: filePath,
              line: lineNo,
              col: line.indexOf(m[0], 0) + m.index + 1,
              rule: 'no-adhoc-duration',
              message: `ad-hoc Tailwind class "${m[0]}" — use a token duration instead`,
            });
            continue;
          }
          if (!suffix) continue;
          if (!allowed.durs.has(suffix)) {
            violations.push({
              file: filePath,
              line: lineNo,
              col: line.indexOf(m[0], 0) + m.index + 1,
              rule: 'no-adhoc-duration',
              message: `ad-hoc Tailwind class "${token}" not backed by tokens (allowed: ${[...allowed.durs].join(', ')})`,
            });
          }
        }

        for (const m of target.matchAll(EASE_CLASS_RE)) {
          const token = m[0];
          const suffix = token
            .slice('ease-'.length)
            .replace(/[",'`}\];]+$/, '')
            .replace(/;$/, '');
          if (suffix.startsWith('[')) {
            violations.push({
              file: filePath,
              line: lineNo,
              col: line.indexOf(m[0], 0) + m.index + 1,
              rule: 'no-adhoc-ease',
              message: `ad-hoc Tailwind class "${token}" — use a token easing (allowed: ${[...allowed.eases].join(', ')})`,
            });
            continue;
          }
          if (!suffix) continue;
          if (!allowed.eases.has(suffix)) {
            violations.push({
              file: filePath,
              line: lineNo,
              col: line.indexOf(m[0], 0) + m.index + 1,
              rule: 'no-adhoc-ease',
              message: `ad-hoc Tailwind class "${token}" not backed by tokens (allowed: ${[...allowed.eases].join(', ')})`,
            });
          }
        }

        for (const m of target.matchAll(/duration-\[[^\]]+\]/g)) {
          violations.push({
            file: filePath,
            line: lineNo,
            col: line.indexOf(m[0], 0) + m.index + 1,
            rule: 'no-adhoc-duration',
            message: `ad-hoc Tailwind class "${m[0]}" — use a token duration instead`,
          });
        }
        for (const m of target.matchAll(/ease-\[[^\]]+\]/g)) {
          violations.push({
            file: filePath,
            line: lineNo,
            col: line.indexOf(m[0], 0) + m.index + 1,
            rule: 'no-adhoc-ease',
            message: `ad-hoc Tailwind class "${m[0]}" — use a token easing instead`,
          });
        }

        // 4) off-token Tailwind colour utility — `text-gray-400`, `bg-white/5`,
        // `from-purple-500`. Same class-context scoping as rule 3, plus the
        // adjacent-line ignore marker that rules 1/2 honour.
        if (!adjIgnored) {
          for (const m of target.matchAll(COLOUR_UTIL_RE)) {
            if (!isOffTokenColour(m[1], m[2], allowed.colours)) continue;
            violations.push({
              file: filePath,
              line: lineNo,
              col: line.indexOf(m[0], 0) + m.index + 1,
              rule: OFFTOKEN_COLOR_RULE,
              message: `off-token Tailwind colour "${m[0]}" — use a token colour (var(--…) or a generated token class) instead`,
            });
          }
        }
      }
    }
  }

  return violations;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
function main() {
  const allowed = loadAllowedTokens();
  allowed.colours = loadConfiguredColours();

  // Re-resolve collectAllFiles fallback to use walkDirSync (guards against the async helpers above)
  // Monkey-patch collectAllFiles so the --all fallback uses sync walk
  // (git ls-files is preferred; sync walk is only if git fails)

  let files = collectFiles();

  // If collectFiles returned [] due to git error but --all was requested, try sync walk as fallback
  if (process.argv.includes('--all') && files.length === 0) {
    const { readdirSync } = (() => {
      try {
        return Function('return require')()('fs');
      } catch {
        return {
          readdirSync: () => {
            throw new Error();
          },
        };
      }
    })();
    const walkSync = (dir) => {
      const out = [];
      let entries;
      try {
        entries = readdirSync(dir, { withFileTypes: true });
      } catch {
        return out;
      }
      for (const e of entries) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) {
          if (
            [
              'node_modules',
              '.next',
              '.git',
              'dist',
              'build',
              'coverage',
              'e2e',
            ].includes(e.name)
          )
            continue;
          out.push(...walkSync(full));
        } else if (SUPPORTED_EXTS.has(path.extname(full))) {
          const n = full.replace(/\\/g, '/');
          if (n === TOKENS_CSS || n.endsWith('/' + TOKENS_CSS)) continue; // still lint but allow hex/rgba there — skip from --all enumeration is wrong; include it but linter will allow it
          out.push(full);
        }
      }
      return out;
    };
    // For --all we want to include tokens.css too but linter will exempt it, so include src walk
    const walked = walkSync('src');
    // Also walk top-level css if any
    files = walked;
  }

  const warnLegacy = process.argv.includes('--warn-legacy');

  // Exclude generated files — they are derived from tokens.css and necessarily contain raw hex/rgba
  files = files.filter((f) => !isGeneratedFile(f));

  // Filter to only interesting files; also exclude tokens.css from hex/rgba checks via lintFile logic,
  // but keep it in the set so duration/ease checks still run (harmless).
  // We keep tokens.css in enumeration so lintFile can decide per-rule.

  // For --all we include tokens.css explicitly so its exempt path is exercised
  if (
    process.argv.includes('--all') &&
    existsSync(TOKENS_CSS) &&
    !files.includes(TOKENS_CSS)
  ) {
    files.push(TOKENS_CSS);
  }

  if (files.length === 0) {
    console.log('[token-lint] No matching staged files — skipping.');
    process.exit(0);
  }

  let allViolations = [];
  for (const f of files) {
    allViolations.push(...lintFile(f, allowed));
  }

  // De-duplicate identical violations (can happen if both duration regex and arbitrary check fire)
  const seen = new Set();
  allViolations = allViolations.filter((v) => {
    const k = `${v.file}:${v.line}:${v.col}:${v.rule}:${v.message}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  // Remove duplicate arbitrary vs normal duration hits for bracket syntax (normal loop already skips '[' but be safe)
  // (already handled by skip above)

  // --warn-legacy downgrades the pre-existing rules to a warning (legacy debt
  // the repo is tracking down). It deliberately does NOT downgrade
  // no-offtoken-color-utility: that rule reports colours bypassing tokens.css,
  // which is the doctrine violation, not legacy debt. Exit code stays 1
  // whenever a colour violation is present, flag or no flag.
  //
  // no-raw-anime-timing is on the same list for a different-but-related reason:
  // it is a NEW rule with no legacy debt behind it. `--warn-legacy` exists to
  // forgive what shipped before a gate did; downgrading a rule that never had
  // any would make the pre-commit hook (the surface developers actually hit)
  // silently pass the thing this rule was added to enforce.
  const fatalViolations = warnLegacy
    ? allViolations.filter((v) => NEVER_DOWNGRADED.has(v.rule))
    : allViolations;
  const downgradedViolations = warnLegacy
    ? allViolations.filter((v) => !NEVER_DOWNGRADED.has(v.rule))
    : [];

  if (fatalViolations.length > 0) {
    console.error('\n[token-lint] Design-token violations found:\n');
    for (const v of fatalViolations) {
      console.error(
        `  ${v.file}:${v.line}:${v.col}  [${v.rule}]  ${v.message}`,
      );
    }
    if (downgradedViolations.length > 0) {
      console.warn(
        `\n[token-lint] ${downgradedViolations.length} further legacy violation(s) downgraded by --warn-legacy:`,
      );
      for (const v of downgradedViolations) {
        console.warn(
          `  ${v.file}:${v.line}:${v.col}  [${v.rule}]  ${v.message}`,
        );
      }
    }
    const suffix = downgradedViolations.length
      ? ` (${downgradedViolations.length} legacy violation(s) downgraded by --warn-legacy)`
      : '';
    console.error(
      `\n[token-lint] ${fatalViolations.length} violation(s) — fix them or add "// token-lint-ignore" to the offending line.${suffix}\n`,
    );
    process.exit(1);
  }

  if (downgradedViolations.length > 0) {
    console.warn('\n[token-lint] Legacy design-token violations found:\n');
    for (const v of downgradedViolations) {
      console.warn(`  ${v.file}:${v.line}:${v.col}  [${v.rule}]  ${v.message}`);
    }
    console.warn(
      `\n[token-lint] ${downgradedViolations.length} legacy violation(s) — fix them or add "// token-lint-ignore" to the offending line. (--warn-legacy: not failing)\n`,
    );
    console.log(
      `[token-lint] WARN — ${files.length} file(s) checked, ${downgradedViolations.length} legacy violation(s) (allowed via --warn-legacy).`,
    );
    process.exit(0);
  }

  console.log(
    `[token-lint] OK — ${files.length} file(s) checked, no violations.`,
  );
}

main();
