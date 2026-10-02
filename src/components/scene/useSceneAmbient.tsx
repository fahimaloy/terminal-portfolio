/**
 * useSceneAmbient — the scene's single per-frame brain.
 *
 * ── Why there is no scroll listener here ───────────────────────────────────
 * This was the first design decision and it is worth writing down, because
 * `ReadingProgress`, `BlogReels`, `blog/[slug]` and `ScrollIndicator` already
 * own four window/document scroll listeners and a fifth was the obvious thing
 * to reach for.
 *
 * There isn't one. `SceneAmbientDriver` samples `window.scrollY` once per frame
 * from inside the render loop that is already running:
 *
 *   - r3f's `frameloop` is `'always'` while the tab is visible and `'never'`
 *     while it is hidden, so scroll is sampled exactly as often as something
 *     could possibly need it and never while the tab is in the background.
 *     A listener would keep firing (well into a hidden tab) for a value the
 *     scene cannot use.
 *   - `window.scrollY` is a scroll-position read, not a layout read. It does
 *     not force a synchronous reflow the way `getBoundingClientRect` or
 *     `offsetTop` would, so polling it per frame is genuinely free.
 *   - Adding it to the loop means it costs nothing when the scene does not
 *     exist. Under reduced motion, on a device with no usable tier, and on the
 *     admin routes, `SceneLayer` renders `StaticField` instead of `SceneCanvas`
 *     and there is no Canvas at all — so there is no driver, no scroll read,
 *     and nothing to tear down. A hook-level listener would have to be
 *     duplicated in every component and gated as carefully.
 *
 * ── Why the idle clock is the SCENE clock ───────────────────────────────────
 * `ScenePointer.movedAt` is `performance.now()`, but r3f's
 * `state.clock.elapsedTime` FREEZES whenever the loop is not advancing. Compare
 * those two directly and a hidden tab produces a nonsense quiet time.
 *
 * So the driver does not convert between the two time bases at all. It treats
 * `movedAt` as a change-detector: it remembers the value it last saw and the
 * scene time at which it changed, and the quiet time is simply how far the
 * scene clock has moved since. That is free of clock conversion, and it has the
 * behaviour the conversion was trying to buy — because the scene clock freezes
 * with the render loop, the quiet time freezes with it too, so returning to a
 * tab that was hidden for ten minutes resumes with the scene exactly where it
 * was and eases into attract mode over the next 2.6 VISIBLE seconds. Nothing
 * snaps.
 *
 * A visitor who has never moved the pointer at all never changes `movedAt`, so
 * the last-change time stays at negative infinity and the scene rests from its
 * very first frame. That is the right default: someone who has loaded the page
 * and not touched the mouse should find something to look at.
 */

import { createContext, useContext, useMemo, useRef } from 'react';
import type { ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import { ScenePointerContext } from '../../hooks/useScenePointer';
import {
  DEPTH_HALF_LIFE_MS,
  DEPTH_TRAVEL,
  RUSH_FALL_MS,
  RUSH_RISE_MS,
  damp,
  layerTravel,
  presenceFromQuiet,
  rushFromVelocity,
  scrollDepth,
  scrollViewports,
  type DepthLayer,
} from './ambient';

export type SceneAmbientState = {
  /** 1 = the pointer is driving the scene, 0 = the scene is running on its own. */
  presence: number;
  /** Smoothed, soft-saturating scroll depth, in viewport heights. */
  depth: number;
  /** Smoothed scroll speed, clamped 0..1. */
  rush: number;
  /**
   * Seconds of SCENE time. Frozen whenever the render loop is not running, so
   * every consumer that derives motion from it — the attract anchor, the tube
   * orbit — pauses and resumes with the scene rather than with the wall clock.
   */
  time: number;
};

/**
 * The out-of-provider value: fully resting, no depth, no rush.
 *
 * A frozen resting default rather than a throw, matching `useScenePointer`'s
 * `IDLE_REF` for the same reason — a scene layer that reads this outside a
 * provider (a test, a future route that mounts a layer directly) should render
 * a plausible static frame, not take the page down.
 */
const RESTING: SceneAmbientState = Object.freeze({
  presence: 0,
  depth: 0,
  rush: 0,
  time: 0,
});

const SceneAmbientContext = createContext<SceneAmbientState>(RESTING);

/**
 * Read the live ambient state. The returned object's identity never changes —
 * the driver mutates its fields in place — so this is safe to read from a
 * `useFrame` callback at 60–120Hz without causing a single re-render.
 */
export function useSceneAmbient(): SceneAmbientState {
  return useContext(SceneAmbientContext);
}

/**
 * Owns the one mutable ambient object for this scene. The value identity is
 * fixed for the lifetime of the provider, which is what keeps the context
 * free: no consumer is ever re-rendered by anything in this file.
 */
export function SceneAmbientProvider({ children }: { children: ReactNode }) {
  const state = useMemo<SceneAmbientState>(
    () => ({ presence: 0, depth: 0, rush: 0, time: 0 }),
    [],
  );
  return (
    <SceneAmbientContext.Provider value={state}>
      {children}
    </SceneAmbientContext.Provider>
  );
}

/**
 * The only `useFrame` in the scene that computes anything shared. Mounted as
 * the first child inside the Canvas; see SceneCanvas.
 *
 * Nothing here allocates, and nothing here reads a layout property.
 */
export function SceneAmbientDriver() {
  const state = useSceneAmbient();
  const pointer = useContext(ScenePointerContext);

  // Change-detector for `movedAt`. See the time-base note at the top of the
  // file: the value is never compared against a wall clock, only against its
  // own previous value.
  const seenMove = useRef(0);
  const movedAtSceneTime = useRef(Number.NEGATIVE_INFINITY);

  useFrame((frameState, delta) => {
    const elapsed = frameState.clock.elapsedTime;
    // Clamped so a single pathological frame cannot teleport every depth layer
    // across the screen. A long real pause is still measured correctly by the
    // idle path, which reads `elapsed` and is deliberately not clamped.
    const dtMs = Math.min(delta * 1000, 100);

    // ── idle ──────────────────────────────────────────────────────────────
    const p = pointer.current;
    if (p.movedAt !== seenMove.current) {
      seenMove.current = p.movedAt;
      movedAtSceneTime.current = elapsed;
    }
    state.presence = presenceFromQuiet(
      (elapsed - movedAtSceneTime.current) * 1000,
    );
    state.time = elapsed;

    // ── scroll ────────────────────────────────────────────────────────────
    // `innerHeight` shifts a little on mobile as the URL bar hides, which moves
    // the target depth; the damp absorbs it, and the saturation means a 10%
    // change in viewport height cannot produce a 10% change in travel.
    const viewports =
      typeof window === 'undefined'
        ? 0
        : scrollViewports(window.scrollY, window.innerHeight);

    const previousDepth = state.depth;
    state.depth = damp(
      state.depth,
      scrollDepth(viewports),
      DEPTH_HALF_LIFE_MS,
      dtMs,
    );

    // Velocity comes from the SMOOTHED depth, not from raw scroll, so it
    // inherits the spike removal above and reads as actual sustained travel
    // rather than as every wheel tick.
    const velocity =
      dtMs > 0 ? Math.abs(state.depth - previousDepth) / (dtMs / 1000) : 0;
    const rushTarget = rushFromVelocity(velocity);
    state.rush = damp(
      state.rush,
      rushTarget,
      rushTarget > state.rush ? RUSH_RISE_MS : RUSH_FALL_MS,
      dtMs,
    );
  });

  return null;
}

/**
 * Wraps one layer in a group that translates with scroll at its own rate.
 *
 * Per-layer, rather than one shared transform on a single parent group, because
 * differential parallax IS the effect: if every layer moved together the scene
 * would translate as a flat cut-out and the depth would collapse. Each layer
 * writes only its own group's Y and reads only the ambient depth, so these
 * callbacks are completely independent of each other and of the order they
 * happen to run in.
 *
 * Positive Y is up, which is the SAME direction the content travels as the page
 * scrolls down — the background lags the page rather than running against it.
 * Running against it is not depth: it reads as the background expanding out of
 * a vanishing point, or as a zoom stuck partway.
 *
 * Only the resting X/Y of the rig's own pointer parallax is left alone here;
 * this group starts at the origin and never touches anything else.
 */
export function SceneDepth({
  layer,
  rate,
  children,
}: {
  layer: DepthLayer;
  rate: number;
  children: ReactNode;
}) {
  const groupRef = useRef<Group>(null);
  const ambient = useSceneAmbient();

  useFrame(() => {
    const g = groupRef.current;
    if (!g) return;
    g.position.y = layerTravel(ambient.depth, rate, DEPTH_TRAVEL[layer]);
  });

  return <group ref={groupRef}>{children}</group>;
}
