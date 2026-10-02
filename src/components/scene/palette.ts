/**
 * palette.ts — resolves the scene's colours from the CSS token pipeline, and
 * owns the contract for the document-wide `data-accent` switch.
 *
 * three.js needs concrete colour values, so `var(--neon-cyan)` cannot be
 * handed to `THREE.Color` directly. Reading the custom property off
 * `:root` keeps tokens.css the single source of truth: change the accent
 * there and the scene follows, with no second copy of the palette in JS and
 * no raw hex for the token linter to reject.
 *
 * Resolution is memoised *per token name*, so a re-render does not re-read the
 * stylesheet, and a browser without a DOM (SSR, tests) falls back to the
 * documented default rather than throwing.
 *
 * ## The memo is the whole problem
 *
 * A name-keyed memo is only safe while a token's *value* cannot change under
 * its *name*. `data-accent` breaks that assumption: `--accent-color` keeps its
 * name for the life of the page and its value changes six ways. Without
 * `resetPaletteCache()` the scene would keep rendering the accent that was
 * active on its first render, forever. So the memo is deliberately paired with
 * an explicit invalidation + announcement step.
 *
 * ## Consumers do not read per frame
 *
 * Colours are resolved during React render (`SceneCanvas` calls
 * `SCENE_ACCENTS()`), then frozen into `THREE.Color` uniforms. `useFrame`
 * only ever writes `uTime` / `uImpulse` / `uPointer`. Clearing the memo
 * therefore cannot repaint anything by itself — it needs one re-render, which
 * `resetPaletteCache()` announces on `window` so an app shell can trigger it.
 */

type CssRoot = Pick<Document, 'documentElement'>;

/**
 * Attribute the six `[data-accent='…']` blocks in tokens.css key off. It lives
 * on `<html>` (see `AccentSwitcher`), so it is readable from here and from CSS
 * alike, and it survives every component mount order.
 */
export const ACCENT_ATTRIBUTE = 'data-accent';

/** localStorage key for the visitor's chosen accent. */
export const ACCENT_STORAGE_KEY = 'portfolio:accent';

/**
 * Dispatched on `window` after the document accent changes, so a subscriber
 * can force the one React render that re-reads the palette. Same
 * `portfolio:*` namespace as the chat events in `_app.tsx`.
 */
export const ACCENT_CHANGE_EVENT = 'portfolio:accent-change';

/**
 * The accent a visitor gets before they choose one. Index 0 of
 * `ACCENT_TOKENS`, i.e. the same cyan `tokens.css` puts in `:root`.
 */
export const DEFAULT_ACCENT_INDEX = 0;

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

/**
 * Drops the memo and announces the change.
 *
 * Both halves are required and neither is sufficient alone: without the
 * `cache.clear()` the next read returns the stale value, and without the
 * event nothing re-reads at all — scene colours are captured in `useMemo`ed
 * `THREE.Color` uniforms, not sampled per frame.
 *
 * Call this *after* `ACCENT_ATTRIBUTE` has been written to the document, or
 * the re-render will read the previous accent.
 */
export function resetPaletteCache(accent?: string): void {
  cache.clear();
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent<{ accent: string | undefined }>(ACCENT_CHANGE_EVENT, {
      detail: { accent },
    }),
  );
}

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
 * The six accent names, DERIVED from `ACCENT_TOKENS` rather than written out
 * again, so the scene's rotation order and the UI's swatch order cannot drift.
 * `AccentSwitcher` renders its own list typed by `AccentColor`; a test asserts
 * the two agree element for element.
 */
export const ACCENT_NAMES: readonly string[] = ACCENT_TOKENS.map(([token]) =>
  token.replace('--neon-', ''),
);

/** The accent a visitor gets before they choose one. */
export const DEFAULT_ACCENT = ACCENT_NAMES[DEFAULT_ACCENT_INDEX];

/**
 * Which accent the document is currently wearing, as an index into
 * `ACCENT_TOKENS`.
 *
 * Read live — NOT memoised — because it is the one input the name-keyed cache
 * cannot track: `data-accent` changes its value while every token name stays
 * put. An unrecognised or absent value falls back to the default rather than
 * returning `-1`, so a hand-edited `data-accent="red"` degrades to cyan
 * instead of indexing the token table out of bounds.
 */
export function activeAccentIndex(): number {
  if (typeof document === 'undefined') return DEFAULT_ACCENT_INDEX;
  const name = document.documentElement.getAttribute(ACCENT_ATTRIBUTE);
  if (!name) return DEFAULT_ACCENT_INDEX;
  const index = ACCENT_TOKENS.findIndex(
    ([token]) => token === `--neon-${name}`,
  );
  return index === -1 ? DEFAULT_ACCENT_INDEX : index;
}

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

/**
 * The three accents the particle field and scene art direction are built on,
 * led by whatever the visitor picked: violet gives violet → coral → amber,
 * amber gives amber → lime → ice, and so on around the wheel.
 *
 * With no `data-accent` set this is byte-identical to the previous fixed
 * cyan → violet → coral ramp, so the default render is unchanged.
 */
export const SCENE_ACCENTS: () => [string, string, string] = () => {
  const [a, b, c] = sceneAccentRun(activeAccentIndex(), 3);
  return [a, b, c];
};

/**
 * Last-resort values for SSR and tests, where there is no `:root` to read.
 * They mirror tokens.css so a no-DOM render still gets the right palette —
 * they are not a second source of truth.
 */
const PRIMARY_FALLBACK = '#3df2ff'; // token-lint-ignore — SSR fallback
const RIM_FALLBACK = '#7c5cff'; // token-lint-ignore — SSR fallback

/**
 * The scene's key colour: the floor grid and the core object's fresnel rim.
 *
 * Resolves `--accent-color`, the role token `[data-accent]` actually
 * repoints — which is precisely why it goes stale the moment a visitor picks
 * a different accent, and why `resetPaletteCache()` exists.
 *
 * The `||` is load-bearing. Callers pass `''` as "no idea", and
 * `new THREE.Color('')` does not throw — three's `setStyle('')` matches no
 * keyword and leaves the colour at opaque white, which would silently turn
 * the floor grid white on any document where the token is missing.
 */
export function scenePrimary(fallback = ''): string {
  return tokenColor('--accent-color', fallback || PRIMARY_FALLBACK);
}

/**
 * The scene's secondary light: the core object's body. Deliberately pinned to
 * violet rather than the accent, so the object reads as a violet body inside
 * a fresnel rim of whatever the visitor chose.
 */
export function sceneRim(fallback = ''): string {
  return tokenColor('--neon-violet', fallback || RIM_FALLBACK);
}
