// src/__tests__/pages/document-accent-bootstrap.test.tsx
//
// WHAT THIS PROTECTS
//
// The six accent names exist in three places: `ACCENT_NAMES` in
// `components/scene/palette.ts`, `EXPECTED_ACCENTS` in
// `scripts/generate-tokens.mjs`, and a bare array literal inside the
// pre-paint script in `src/pages/_document.tsx` — which an inline `<script>`
// cannot import its way out of. The third copy is the dangerous one, because
// nothing else can see it: a name dropped from it leaves that accent dead on
// the first paint of a hard reload (the `data-accent` attribute is simply
// never written, so `tokens.css` falls back to `:root`'s cyan) while the type
// checker, the token linter and every other test stay green. A silent,
// invisible, one-name failure is exactly the bug class this repo treats as
// unacceptable, so the literal is read back out of the file here and
// deep-equalied against the palette.
//
// The rest of the file is behaviour rather than bookkeeping: the script is
// reconstructed from the file's own fragments and executed against jsdom, so
// the three ways it can go wrong at runtime (a stored value outside the
// allowlist, storage that throws instead of returning null, and being emitted
// too late in `<head>` to beat the first paint) each have an assertion.
//
// The fragments are read as TEXT rather than imported, because importing
// `_document.tsx` would pull in `next/document`'s context-dependent
// components for no benefit: the point is to test the bytes that ship.
//
// REVERT
//
// Deleting the script removes the flash and costs nothing else: the accent
// still applies on hydration via `AccentSwitcher`'s layout effect, one paint
// later. These tests exist to make the duplication safe, not to make the
// script load-bearing.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ACCENT_ATTRIBUTE,
  ACCENT_NAMES,
  ACCENT_STORAGE_KEY,
} from '../../components/scene/palette';

const source = readFileSync(
  resolve(process.cwd(), 'src/pages/_document.tsx'),
  'utf8',
);

/** The `const X = <expr>` literal as written in the file, verbatim. */
function literalOf(name: string, terminator: RegExp): string {
  const match = new RegExp(`const ${name} = (${terminator.source})`).exec(
    source,
  );
  if (!match) {
    throw new Error(
      `_document.tsx no longer declares \`const ${name} = …\`. If the pre-paint accent bootstrap was removed or renamed, delete this test with it — there is nothing left for it to protect.`,
    );
  }
  return match[1];
}

/** The accent names as the file spells them, without evaluating anything. */
const inlinedNames: string[] = Array.from(
  literalOf('BOOTSTRAP_ACCENT_NAMES', /\[[^\]]*\]/).matchAll(/'([^']+)'/g),
  (m) => m[1],
);

/**
 * The exact script the document ships: the file's own `[…].join('')` run with
 * the real key and attribute from `palette.ts`, so this cannot drift from
 * either the fragments or the module it borrows them from.
 */
const shippedScript: string = new Function(
  'ACCENT_STORAGE_KEY',
  'ACCENT_ATTRIBUTE',
  'BOOTSTRAP_ACCENT_NAMES',
  `return ${literalOf('ACCENT_BOOTSTRAP_SCRIPT', /\[[\s\S]*?\]\.join\(''\)/)}`,
)(ACCENT_STORAGE_KEY, ACCENT_ATTRIBUTE, inlinedNames);

/** Run the shipped script against the live jsdom document. */
const bootstrap = () => {
  new Function(shippedScript)();
};

describe('the pre-paint accent bootstrap in _document.tsx', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    document.documentElement.removeAttribute(ACCENT_ATTRIBUTE);
  });

  it('inlines exactly the six accent names palette.ts knows about', () => {
    // THE DRIFT GUARD. A name in `ACCENT_NAMES` but not in the inlined list is
    // an accent that only breaks on hard reload, with nothing else failing.
    expect(inlinedNames).toEqual([...ACCENT_NAMES]);
    expect(inlinedNames).toHaveLength(6);
  });

  it('borrows the storage key and the attribute from palette.ts', () => {
    // The other two names in the chain must not be re-spelled as string
    // literals here, or renaming a key in `palette.ts` would leave the
    // bootstrap reading a key nothing writes.
    expect(source).toMatch(
      /import\s*\{[\s\S]*?ACCENT_STORAGE_KEY[\s\S]*?\}\s*from\s*'\.\.\/components\/scene\/palette'/,
    );
    expect(shippedScript).toContain(ACCENT_STORAGE_KEY);
    expect(shippedScript).toContain(ACCENT_ATTRIBUTE);
  });

  it('sets data-accent from storage before React runs, for a stored name in the allowlist', () => {
    localStorage.setItem(ACCENT_STORAGE_KEY, 'amber');
    bootstrap();
    expect(document.documentElement.getAttribute(ACCENT_ATTRIBUTE)).toBe(
      'amber',
    );
  });

  it('leaves the attribute off for a value outside the allowlist', () => {
    // An unrecognised `data-accent` is worse than none at all: it matches no
    // `[data-accent='…']` block, so `--accent-color` resolves to nothing and
    // every `var(--accent-color)` consumer falls back to an invalid value.
    for (const stored of ['chartreuse', 'CYAN', '', ' cyan']) {
      localStorage.setItem(ACCENT_STORAGE_KEY, stored);
      bootstrap();
      expect(
        document.documentElement.getAttribute(ACCENT_ATTRIBUTE),
      ).toBeNull();
    }
  });

  it('does nothing when no preference is stored', () => {
    localStorage.removeItem(ACCENT_STORAGE_KEY);
    bootstrap();
    expect(document.documentElement.getAttribute(ACCENT_ATTRIBUTE)).toBeNull();
  });

  it('cannot throw when storage access is denied', () => {
    // Private mode and blocked third-party storage do not return null — they
    // throw. There is nothing to recover to (`:root` in tokens.css is already a
    // valid accent), so the catch is empty and the page must still boot.
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('storage is disabled', 'SecurityError');
    });
    expect(bootstrap).not.toThrow();
    expect(document.documentElement.getAttribute(ACCENT_ATTRIBUTE)).toBeNull();
  });

  it('is emitted inside <head>, ahead of the first resource it has to beat', () => {
    // Placement is the feature. After the first `<link>` there is a paint with
    // the wrong accent already on screen, which is the flash this exists to
    // remove.
    const headStart = source.indexOf('<Head>');
    const scriptAt = source.indexOf('<script dangerouslySetInnerHTML');
    const firstResourceAt = source.indexOf('<link rel="preconnect"');
    expect(headStart).toBeGreaterThan(-1);
    expect(scriptAt).toBeGreaterThan(headStart);
    expect(scriptAt).toBeLessThan(firstResourceAt);
    expect(source.indexOf('</Head>')).toBeGreaterThan(scriptAt);
  });
});
