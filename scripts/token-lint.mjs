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
  'tap', 'hover', 'enter', 'exit', 'stagger', 'slide', 'pulse',
  'typing', 'scramble', 'draw', 'morph', 'transition', 'spring', 'scroll', 'counter',
];
const FALLBACK_EASINGS = [
  'smooth', 'in', 'out', 'in-out', 'expo-in',
  'elastic-in', 'elastic-out', 'elastic-in-out',
  'back-in', 'back-out', 'back-in-out',
];

function loadAllowedTokens() {
  const durs = new Set(FALLBACK_DURATIONS);
  const eases = new Set(FALLBACK_EASINGS);
  if (existsSync(TOKENS_CSS)) {
    try {
      const css = readFileSync(TOKENS_CSS, 'utf8');
      for (const m of css.matchAll(/--dur-([a-z0-9-]+)\s*:/g)) durs.add(m[1]);
      for (const m of css.matchAll(/--ease-([a-z0-9-]+)\s*:/g)) eases.add(m[1]);
    } catch { /* ignore */ }
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
  'slate', 'gray', 'grey', 'zinc', 'neutral', 'stone',
  'red', 'orange', 'amber', 'yellow', 'lime', 'green', 'emerald',
  'teal', 'cyan', 'sky', 'blue', 'indigo', 'violet', 'purple', 'fuchsia',
  'pink', 'rose',
]);

// Shade-less stock palette entries that ARE doctrine violations — `bg-white/5`
// and `border-black/20` bypass tokens.css exactly like `text-gray-400` does.
const TW_PALETTE_BARE = new Set(['white', 'black']);

// Colour-less keywords Tailwind accepts on these utilities. They carry no hue
// of their own, so they are always acceptable and are never reported.
const TW_NEUTRAL_KEYWORDS = new Set([
  'transparent', 'current', 'currentcolor', 'inherit', 'none',
]);

// Colour-bearing utility prefixes. Sorted longest-first at build time so that
// `ring-offset-` wins over `ring-` and `border-x-` over `border-` — otherwise
// the shorter prefix would swallow the side/offset qualifier and the colour
// part would never be seen (silent false negative, not a false positive).
// Every entry here can genuinely carry a colour; none were trimmed.
const COLOUR_PREFIXES = [
  'placeholder-', 'ring-offset-', 'decoration-', 'accent-', 'border-',
  'divide-', 'outline-', 'shadow-', 'from-', 'via-', 'to-',
  'border-t-', 'border-r-', 'border-b-', 'border-l-', 'border-x-', 'border-y-',
  'divide-x-', 'divide-y-',
  'text-', 'bg-', 'fill-', 'stroke-', 'caret-', 'ring-',
].sort((a, b) => b.length - a.length);

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// A class-ish run: everything up to the next quote/space/delimiter. Stopping at
// `(`/`)` and `,` truncates exotic arbitrary values (`bg-[url(…)]`) mid-value,
// which is harmless — the result still starts with `[` and is skipped.
const COLOUR_UTIL_RE = new RegExp(
  `\\b(?:!)?(${COLOUR_PREFIXES.map(escapeRe).join('|')})([^\\s"'\\x60,;{}()<>]+)`,
  'g'
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
  } catch { /* generated file absent or unparseable — allowlist still stands */ }
  return names;
}

/**
 * True when `rest` (the part after a colour-bearing prefix, opacity modifier
 * still attached) is a stock-Tailwind colour rather than a project token.
 */
function isOffTokenColour(prefix, rest, configured) {
  if (!rest) return false;                       // `placeholder-` with no suffix
  // Arbitrary values are never this rule's business: token-backed
  // (`text-[var(--fg-1)]`, `border-[var(--glass-border)]`) by contract, and any
  // raw colour hiding in one (`text-[#fff]`) is already caught by rules 1/2.
  if (rest.startsWith('[') || rest.startsWith('-[')) return false;
  const base = rest.toLowerCase().replace(TW_IMPORTANT_RE, '').replace(TW_OPACITY_RE, '');
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
const HEX_RE   = /#[0-9a-fA-F]{3,8}\b/g;
const RGBA_RE  = /rgba\s*\(/g;
// Matches Tailwind arbitrary class tokens like duration-300, duration-[320ms], ease-in-out etc. inside quotes
const DURATION_CLASS_RE = /duration-(?:\[?[^\s"'`]*\]?|[a-z0-9-]+)/g;
const EASE_CLASS_RE     = /ease-(?:\[?[^\s"'`]*\]?|[a-z0-9-]+)/g;

const IGNORE_MARKER = 'token-lint-ignore';
const SUPPORTED_EXTS = new Set(['.ts', '.tsx', '.css']);

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
    if (normalised === g || normalised.endsWith('/' + g) || normalised.endsWith(g)) return true;
  }
  return false;
}

function isTokensCss(file) {
  // Allow both posix and win paths — normalise to posix for comparison
  const normalised = file.replace(/\\/g, '/');
  return normalised === TOKENS_CSS || normalised.endsWith('/' + TOKENS_CSS) || normalised.endsWith(TOKENS_CSS);
}

function collectFiles() {
  const args = process.argv.slice(2).filter(a => a !== '--all');

  // --all flag → walk repo
  if (process.argv.includes('--all')) {
    return collectAllFiles();
  }

  // Explicit file list via args
  if (args.length > 0) {
    return args.filter(f => {
      const ext = path.extname(f);
      return SUPPORTED_EXTS.has(ext) && existsSync(f);
    });
  }

  // Default: staged files from git
  try {
    const out = execSync('git diff --cached --name-only --diff-filter=ACMR', { encoding: 'utf8' });
    return out.split('\n')
      .map(s => s.trim())
      .filter(Boolean)
      .filter(f => SUPPORTED_EXTS.has(path.extname(f)) && existsSync(f));
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
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const fs = await_require_fs();
  return fs;
}
function await_require_fs() {
  return { readdirSync: (awaitFs()).readdirSync };
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
  return { createRequire: (awaitModule()).createRequire };
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
  } catch { /* ignore */ }
  // Last resort: return a shim that throws
  return { createRequire: () => { throw new Error('createRequire unavailable'); } };
}

// Simple synchronous walk without the ceremony above — override walkDir
function walkDirSync(dir) {
  const { readdirSync } = await_simpleFs();
  const out = [];
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walkDirSync(full));
    else if (SUPPORTED_EXTS.has(path.extname(full))) out.push(full);
  }
  return out;
}
function await_simpleFs() {
  // Direct require via Function to avoid ESM static analysis issues without extra deps
  const req = Function('return typeof require!=="undefined"?require:undefined')();
  if (req) return req('fs');
  // ESM fallback — use createRequire
  // eslint-disable-next-line no-eval
  const cr = eval("(() => { try { const m=require('module'); return m.createRequire(import.meta.url); } catch(e){ return null; } })()");
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
  try { content = readFileSync(filePath, 'utf8'); } catch { return violations; }

  const lines = content.split('\n');
  const inTokensCss = isTokensCss(filePath);
  const fileIsCss = path.extname(filePath) === '.css';
  // CSS variable definition lines (e.g. --neon-cyan: #00f0ff;) are never violations
  const CSS_VAR_DEF_RE = /^\s*--[a-zA-Z0-9-_]+\s*:/;

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

    // 1) raw hex — outside tokens.css only; also skip global.css which is a
    // companion to tokens.css (it @imports it and defines utilities that may
    // legitimately inline rgba hex for glass/overlay variants).
    const isTokensCompanion = filePath.replace(/\\/g, '/').endsWith('src/styles/global.css');
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
      for (const m of line.matchAll(/(["'`])[^"'`]*?\1/g)) quotedSpans.push(m[0]);
      // Also include @apply tail (unquoted) — e.g. @apply duration-200
      const atApplyTail = line.match(/@apply\s+[^;]+/)?.[0] || '';
      const scanTargets = quotedSpans.length ? quotedSpans : (atApplyTail ? [atApplyTail] : []);
      // If there are no quoted spans and no @apply, but className/class was present,
      // fall back to scanning the whole line (covers template literal splits).
      const targets = scanTargets.length ? scanTargets : (line.includes('className') || line.includes('class=') ? [line] : []);

      for (const target of targets) {
        for (const m of target.matchAll(DURATION_CLASS_RE)) {
          const token = m[0];
          let suffix = token.slice('duration-'.length).replace(/[",'`}\];]+$/, '').replace(/;$/, '');
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
          let suffix = token.slice('ease-'.length).replace(/[",'`}\];]+$/, '').replace(/;$/, '');
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
    const { readdirSync } = (() => { try { return Function('return require')()('fs'); } catch { return { readdirSync: () => { throw new Error(); } }; } })();
    const walkSync = (dir) => {
      let out = [];
      let entries;
      try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return out; }
      for (const e of entries) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) {
          if (['node_modules', '.next', '.git', 'dist', 'build', 'coverage', 'e2e'].includes(e.name)) continue;
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
  if (process.argv.includes('--all') && existsSync(TOKENS_CSS) && !files.includes(TOKENS_CSS)) {
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
  allViolations = allViolations.filter(v => {
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
  const fatalViolations = warnLegacy
    ? allViolations.filter((v) => v.rule === OFFTOKEN_COLOR_RULE)
    : allViolations;
  const downgradedViolations = warnLegacy
    ? allViolations.filter((v) => v.rule !== OFFTOKEN_COLOR_RULE)
    : [];

  if (fatalViolations.length > 0) {
    console.error('\n[token-lint] Design-token violations found:\n');
    for (const v of fatalViolations) {
      console.error(`  ${v.file}:${v.line}:${v.col}  [${v.rule}]  ${v.message}`);
    }
    if (downgradedViolations.length > 0) {
      console.warn(`\n[token-lint] ${downgradedViolations.length} further legacy violation(s) downgraded by --warn-legacy:`);
      for (const v of downgradedViolations) {
        console.warn(`  ${v.file}:${v.line}:${v.col}  [${v.rule}]  ${v.message}`);
      }
    }
    const suffix = downgradedViolations.length
      ? ` (${downgradedViolations.length} legacy violation(s) downgraded by --warn-legacy)`
      : '';
    console.error(`\n[token-lint] ${fatalViolations.length} violation(s) — fix them or add "// token-lint-ignore" to the offending line.${suffix}\n`);
    process.exit(1);
  }

  if (downgradedViolations.length > 0) {
    console.warn('\n[token-lint] Legacy design-token violations found:\n');
    for (const v of downgradedViolations) {
      console.warn(`  ${v.file}:${v.line}:${v.col}  [${v.rule}]  ${v.message}`);
    }
    console.warn(`\n[token-lint] ${downgradedViolations.length} legacy violation(s) — fix them or add "// token-lint-ignore" to the offending line. (--warn-legacy: not failing)\n`);
    console.log(`[token-lint] WARN — ${files.length} file(s) checked, ${downgradedViolations.length} legacy violation(s) (allowed via --warn-legacy).`);
    process.exit(0);
  }

  console.log(`[token-lint] OK — ${files.length} file(s) checked, no violations.`);
}

main();
