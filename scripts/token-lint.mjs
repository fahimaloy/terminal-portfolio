#!/usr/bin/env node
/**
 * token-lint.mjs — Design-token pre-commit guard.
 *
 * Fails if any staged .tsx/.ts/.css file (outside tokens.css itself) introduces:
 *   1. raw hex color   — /#[0-9a-fA-F]{3,8}\b/
 *   2. raw rgba()      — /rgba\s*\(/
 *   3. ad-hoc duration-/ease- Tailwind class not backed by tokens
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
  // Use git ls-files so we respect .gitignore and don't need extra deps
  try {
    const out = execSync('git ls-files', { encoding: 'utf8' });
    return out.split('\n')
      .map(s => s.trim())
      .filter(Boolean)
      .filter(f => SUPPORTED_EXTS.has(path.extname(f)) && existsSync(f));
  } catch {
    // Fallback: manual walk of src/
    return walkDir('src');
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
    // Skip pure CSS variable definition lines entirely
    if (CSS_VAR_DEF_RE.test(line)) continue;

    const lineNo = i + 1;

    // 1) raw hex — outside tokens.css only; also skip global.css which is a
    // companion to tokens.css (it @imports it and defines utilities that may
    // legitimately inline rgba hex for glass/overlay variants).
    const isTokensCompanion = filePath.replace(/\\/g, '/').endsWith('src/styles/global.css');
    if (!inTokensCss && !isTokensCompanion) {
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
    if (!inTokensCss && !isTokensCompanion) {
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

  if (allViolations.length > 0) {
    const stream = warnLegacy ? console.warn.bind(console) : console.error.bind(console);
    stream('\n[token-lint] Design-token violations found:\n');
    for (const v of allViolations) {
      stream(`  ${v.file}:${v.line}:${v.col}  [${v.rule}]  ${v.message}`);
    }
    stream(`\n[token-lint] ${allViolations.length} violation(s) — fix them or add "// token-lint-ignore" to the offending line.${warnLegacy ? ' (--warn-legacy: not failing)' : ''}\n`);
    if (warnLegacy) {
      console.log(`[token-lint] WARN — ${files.length} file(s) checked, ${allViolations.length} legacy violation(s) (allowed via --warn-legacy).`);
      process.exit(0);
    }
    process.exit(1);
  }

  console.log(`[token-lint] OK — ${files.length} file(s) checked, no violations.`);
}

main();
