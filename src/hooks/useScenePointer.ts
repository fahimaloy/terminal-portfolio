/**
 * useScenePointer — the scene's pointer source.
 *
 * WHY THIS EXISTS: the scene canvas does not receive pointer events. `SceneLayer`
 * is `pointer-events-none fixed inset-0 z-0` and the page content sits above it
 * in `z-10`, so every `pointermove` is consumed by the content before it can
 * reach the r3f wrapper div. Measured on the live homepage: 0 events on the
 * canvas vs 20 on `window`, rising to 20/20 the instant the content layer's
 * pointer-events is disabled.
 *
 * The consequence was that `state.pointer` was frozen at (0,0) and every
 * consumer of it was silently inert — `ParallaxRig` did not parallax and the
 * particle field had no pointer repulsion. This hook restores pointer input
 * without touching the z-order or the "background never blocks content" rule.
 *
 * Design constraints:
 *   - ONE passive `pointermove` listener on `window`, installed once.
 *   - Values land in a ref, never state: a re-render per mouse move would
 *     re-render the whole scene tree at pointer frequency.
 *   - Consumers read the ref inside `useFrame`, i.e. on the render thread,
 *     so no subscription machinery is needed.
 *   - Normalised to the same -1..1 space r3f uses, so the maths that already
 *     reads `state.pointer` keeps working unchanged.
 */

import { createContext, useEffect, useRef } from 'react';

export type ScenePointer = {
  /** Normalised device coords, -1..1, y up. Mirrors r3f's `state.pointer`. */
  x: number;
  y: number;
  /** Raw client pixels, for effects that need a 1:1 mapping. */
  clientX: number;
  clientY: number;
  /**
   * True once a real pointer has been seen, and it stays true afterwards: a
   * scene should not jump when the cursor leaves the window. Consumers that
   * need liveness (idle animation) compare `movedAt` against the clock.
   */
  active: boolean;
  /**
   * `performance.now()` of the last movement.
   *
   * READ THIS BEFORE USING IT AGAINST A CLOCK. This is a wall-clock value and
   * keeps advancing while the tab is hidden; r3f's `state.clock.elapsedTime`
   * freezes the moment `frameloop` stops advancing. Subtracting the two
   * directly yields a nonsense quiet time after a backgrounded tab.
   *
   * The scene's only consumer therefore treats it as a change-detector rather
   * than a timestamp to subtract: it remembers the value it last saw and the
   * scene time at which the value changed, and the quiet time falls out of the
   * scene clock alone. See `SceneAmbientDriver` in
   * `src/components/scene/useSceneAmbient.tsx`.
   */
  movedAt: number;
};

/**
 * The pristine idle template. Frozen so it cannot itself be mutated into a
 * shared singleton again — every instance gets its own copy via
 * `createIdlePointer()` below, never this object.
 */
const IDLE: ScenePointer = Object.freeze({
  x: 0,
  y: 0,
  clientX: 0,
  clientY: 0,
  active: false,
  movedAt: 0,
});

/**
 * Per-instance idle pointer. A hook instance mutates its own object for the
 * lifetime of the mount, so seeding a ref with the module-level `IDLE` would
 * let the FIRST `pointermove` from ANY mount flip `IDLE.active = true` for the
 * whole module — and every later fresh mount would then read a stale, already
 * active pointer. Each instance therefore starts from its own copy.
 */
const createIdlePointer = (): ScenePointer => ({ ...IDLE });

/**
 * The default is a usable idle ref rather than `null`, so a scene component
 * read outside a provider degrades to "no pointer" instead of throwing. That
 * keeps every call site a plain `useContext(ScenePointerContext)`.
 *
 * It is a copy, not `IDLE` itself: it is handed to every unprovided consumer,
 * and the effect below must never be able to write through it.
 */
const IDLE_REF = {
  current: createIdlePointer(),
} as React.RefObject<ScenePointer>;

export const ScenePointerContext =
  createContext<React.RefObject<ScenePointer>>(IDLE_REF);

export const ScenePointerProvider = ScenePointerContext.Provider;

/**
 * Installs the single window-level pointer listener and returns the ref that
 * scene components read from inside `useFrame`.
 *
 * `enabled` gates the listener. `SceneCanvas` returns null when the device has
 * no usable tier, but the hook still runs its effect, so without the gate
 * every scene-less route (reduced motion, no WebGL) still paid for a
 * window-level listener doing nothing. Mount-time work, so `enabled` is
 * expected to be stable; flipping it later re-runs the effect correctly.
 */
export function useScenePointer(enabled = true): React.RefObject<ScenePointer> {
  const ref = useRef<ScenePointer>(createIdlePointer());

  useEffect(() => {
    if (!enabled) return;
    const pointer = ref.current;
    // `passive` — this listener never calls preventDefault, and a background
    // that can cancel the page's scroll is exactly the bug this repo keeps
    // paying for.
    const onMove = (event: PointerEvent) => {
      pointer.clientX = event.clientX;
      pointer.clientY = event.clientY;
      pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
      pointer.y = -((event.clientY / window.innerHeight) * 2 - 1);
      pointer.active = true;
      pointer.movedAt = performance.now();
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, [enabled]);

  return ref;
}
