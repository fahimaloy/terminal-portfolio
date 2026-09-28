/**
 * palette.ts — resolves the scene's colours from the CSS token pipeline.
 *
 * three.js needs concrete colour values, so `var(--neon-cyan)` cannot be
 * handed to `THREE.Color` directly. Reading the custom property off
 * `:root` keeps tokens.css the single source of truth: change the accent
 * there and the scene follows, with no second copy of the palette in JS and
 * no raw hex for the token linter to reject.
 *
 * Resolution is memoised on the resolved value so a re-render does not re-read
 * the stylesheet, and a browser without a DOM (SSR, tests) falls back to the
 * documented default rather than throwing.
 */

type CssRoot = Pick<Document, 'documentElement'>;

const cache = new Map<string, string>();

/** Reads `--name` from :root and returns its trimmed value, or `fallback`. */
export function tokenColor(name: string, fallback: string): string {
  const cached = cache.get(name);
  if (cached !== undefined) return cached;

  let value = fallback;
  if (typeof document !== 'undefined') {
    const root: CssRoot = document;
    value =
      getComputedStyle(root.documentElement).getPropertyValue(name).trim() ||
      fallback;
  }
  cache.set(name, value);
  return value;
}

/** Clears the memo. Only needed if the document theme can change at runtime. */
export function resetPaletteCache(): void {
  cache.clear();
}

/**
 * The three accents the particle field and scene art direction are built on.
 * The hexes below are last-resort values for SSR and tests, where there is no
 * :root to read. They mirror tokens.css so a no-DOM render still gets the
 * right palette — they are not a second source of truth.
 */
export const SCENE_ACCENTS: () => [string, string, string] = () => [
  tokenColor('--neon-cyan', '#3df2ff'), // token-lint-ignore — SSR fallback
  tokenColor('--neon-violet', '#7c5cff'), // token-lint-ignore — SSR fallback
  tokenColor('--neon-coral', '#ff4d6d'), // token-lint-ignore — SSR fallback
];

/**
 * The six-accent vocabulary, in the same order as
 * `EXPECTED_ACCENTS` in scripts/generate-tokens.mjs. This is a rotation over
 * the token palette, NOT a second source of truth: every value is read off
 * `:root`, so a change in tokens.css moves these with it.
 *
 * The reference implementation this replaces called `Math.random()` here,
 * which produced arbitrary hex values outside the design system entirely.
 */
const ACCENT_TOKENS: readonly [string, string][] = [
  ['--neon-cyan', '#3df2ff'], // token-lint-ignore — SSR fallback
  ['--neon-violet', '#7c5cff'], // token-lint-ignore — SSR fallback
  ['--neon-coral', '#ff4d6d'], // token-lint-ignore — SSR fallback
  ['--neon-amber', '#ffb020'], // token-lint-ignore — SSR fallback
  ['--neon-lime', '#4dffa6'], // token-lint-ignore — SSR fallback
  ['--neon-ice', '#9be8ff'], // token-lint-ignore — SSR fallback
];

/**
 * Resolves `count` consecutive accents starting at `offset`, wrapping.
 * Shared by every scene consumer that wants a multi-colour ramp.
 *
 * The modulo is normalised to a positive value: JavaScript's `%` keeps the
 * sign of the dividend, so a negative offset indexes the token table with a
 * negative number and destructures `undefined`, which throws. A caller
 * computing `step - 1` at the start of a cycle hits this.
 */
export function sceneAccentRun(offset: number, count: number): string[] {
  const n = ACCENT_TOKENS.length;
  const start = ((offset % n) + n) % n;
  return Array.from({ length: count }, (_, i) => {
    const [token, fallback] = ACCENT_TOKENS[(start + i) % n];
    return tokenColor(token, fallback);
  });
}

/** How many distinct rotations the accent run produces. */
export const SCENE_ACCENT_RUNS = ACCENT_TOKENS.length;

export const scenePrimary = (fallback: string) =>
  tokenColor('--neon-cyan', fallback);
export const sceneRim = (fallback: string) =>
  tokenColor('--neon-violet', fallback);
