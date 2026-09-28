/**
 * useMotionPreference — the ONLY safe way to read `prefers-reduced-motion`
 * during render.
 *
 * `isReducedMotion()` / `canAnimate()` from `config/animations` are correct
 * inside effects and event handlers: those run client-side only, so a
 * server/client disagreement is impossible. They are NOT correct during
 * render. On the server both return their no-`window` value (`false` for
 * `isReducedMotion`, `false` for `canAnimate`); in the browser they return
 * the user's real preference. A component that branches its JSX on either one
 * therefore renders a different tree on the server than on the client, and
 * React discards the entire hydrated tree and re-renders it client-side —
 * the "Hydration failed because the server rendered HTML didn't match the
 * client" bailout this repo hit on the landing page (ScrollIndicator) and
 * would hit on /blog (BlogCard, BlogReels).
 *
 * `canAnimate()` is the worse of the two: it is `false` on the server and
 * `true` in an ordinary browser, so ANY render-time use of it mismatches for
 * every visitor, not just reduced-motion users.
 *
 * `useSyncExternalStore` is what makes this correct. Its `getServerSnapshot`
 * is used for the server render AND for hydration, so the first client render
 * is guaranteed to agree with the server; the store value is adopted
 * immediately afterwards. There is no effect and no manual setState.
 *
 * Before reaching for this, prefer CSS: if the reduced-motion difference is
 * purely presentational, a `@media (prefers-reduced-motion: …)` rule needs no
 * JS at all and cannot mismatch. Use this hook only when the branch genuinely
 * changes which elements exist.
 */
import { useMemo, useSyncExternalStore } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

export type MotionPreference = {
  /** The user asked for less motion. Always `false` until after hydration. */
  reduced: boolean;
  /** A browser that has settled and permits animation. */
  canAnimate: boolean;
};

const mql = (): MediaQueryList | null => {
  if (
    typeof window === 'undefined' ||
    typeof window.matchMedia !== 'function'
  ) {
    return null;
  }
  return window.matchMedia(QUERY);
};

const subscribe = (onChange: () => void) => {
  const query = mql();
  if (!query) return () => {};
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
};

// The store value is a BOOLEAN, not the object. `useSyncExternalStore`
// compares snapshots with Object.is and re-renders forever if the snapshot is
// a fresh object each call; a boolean is inherently stable. The object shape
// callers want is derived below with useMemo.
const getSnapshot = (): boolean => mql()?.matches ?? false;

/**
 * Used for the server render and for hydration. `false` here means "motion is
 * welcome", which is exactly what `isReducedMotion()` returned on the server
 * and therefore what a server-rendered branch was already assuming — so the
 * first client render agrees with the server and the real preference is
 * adopted immediately afterwards.
 */
const getServerSnapshot = (): boolean => false;

const MOTION_OK: MotionPreference = { reduced: false, canAnimate: true };
const MOTION_REDUCED: MotionPreference = { reduced: true, canAnimate: false };

/**
 * @returns the no-`window` assumption for the server render and for
 *          hydration, then the live `prefers-reduced-motion` value. Tracks
 *          changes to the OS/browser setting while mounted.
 */
export function useMotionPreference(): MotionPreference {
  const reduced = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
  // Hydration and the server render both see `false` here, so the first client
  // render is identical to the server's; the real preference is adopted right
  // after, in a re-render.
  return useMemo<MotionPreference>(
    () => (reduced ? MOTION_REDUCED : MOTION_OK),
    [reduced],
  );
}

/** Convenience wrapper for the single-value case. */
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
