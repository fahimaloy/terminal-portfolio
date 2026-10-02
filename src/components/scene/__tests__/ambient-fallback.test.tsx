/**
 * Ambient behaviour on the paths where there is no scene, and the driver's own
 * step logic.
 *
 * Two distinct things are being defended here, and they are the two ways this
 * work could quietly break the site's accessibility guarantees:
 *
 *  1. `useSceneQuality` fails CLOSED. Under `prefers-reduced-motion`, with no
 *     WebGL, on a device below the low tier, and after a scene-local error,
 *     `SceneLayer` renders `StaticField` instead of `SceneCanvas` — and with it
 *     goes the Canvas, the frame loop, the pointer listener, and every consumer
 *     of the ambient state. The idle and scroll work must not reintroduce motion
 *     on any of those paths, and it must not introduce a timer or a listener
 *     that keeps running once the scene is gone.
 *
 *  2. The driver is the only place the pure helpers are actually wired to a
 *     clock, so its step logic — the change-detector, the `dt` clamp, and the
 *     rush derived from the SMOOTHED depth — is only as good as the pure tests
 *     for those helpers. Those are covered in `ambient.test.ts`; this file
 *     covers the wiring.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React, { useEffect } from 'react';
import { render } from '@testing-library/react';

import { IDLE_ATTACK_MS, SCROLL_SOFT_MAX_VH, scrollDepth } from '../ambient';
import {
  SceneAmbientProvider,
  SceneAmbientDriver,
  useSceneAmbient,
  type SceneAmbientState,
} from '../useSceneAmbient';
import SceneLayer from '../SceneLayer';
import {
  ScenePointerProvider,
  type ScenePointer,
} from '../../../hooks/useScenePointer';
import type { SceneTierState } from '../../../hooks/useSceneQuality';

/* ── r3f is stubbed so nothing touches WebGL, and so useFrame is capturable ── */

const frameCallbacks: ((state: unknown, delta: number) => void)[] = [];
let canvasProps: Record<string, unknown> | null = null;
let canvasRenders = 0;

vi.mock('@react-three/fiber', () => ({
  useFrame: (cb: (state: unknown, delta: number) => void) => {
    frameCallbacks.push(cb);
    return null;
  },
  useThree: () => ({
    viewport: { width: 20, height: 12 },
    pointer: { x: 0, y: 0 },
    clock: { elapsedTime: 1 },
  }),
  Canvas: (props: Record<string, unknown>) => {
    canvasProps = props;
    canvasRenders += 1;
    return React.createElement('div', { 'data-testid': 'canvas' });
  },
}));

/* ── Scene quality is a parameter, so the fallback paths are testable at all ── */

let quality: {
  tier: SceneTierState;
  detectedTier: 'high' | 'medium' | 'low' | 'none';
  ready: boolean;
  reduced: boolean;
  unsupported: boolean;
};

vi.mock('../../../hooks/useSceneQuality', () => ({
  useSceneQuality: () => quality,
}));

/** Counts every listener the scene attaches to window, per event type. */
function spyOnListeners() {
  const added: Record<string, number> = {};
  const realAdd = window.addEventListener.bind(window);
  const realRemove = window.removeEventListener.bind(window);
  window.addEventListener = ((type: string, ...rest: unknown[]): void => {
    added[type] = (added[type] ?? 0) + 1;
    (realAdd as (...a: unknown[]) => void)(type, ...rest);
  }) as typeof window.addEventListener;
  window.removeEventListener = ((type: string, ...rest: unknown[]): void => {
    added[type] = (added[type] ?? 0) - 1;
    (realRemove as (...a: unknown[]) => void)(type, ...rest);
  }) as typeof window.removeEventListener;
  return {
    added,
    restore: () => {
      window.addEventListener = realAdd;
      window.removeEventListener = realRemove;
    },
  };
}

const POINTER: ScenePointer = {
  x: 0,
  y: 0,
  clientX: 0,
  clientY: 0,
  active: false,
  movedAt: 0,
};

/* ── A harness that mounts the driver for real and hands back its state ────── */

/**
 * The ambient state's identity is fixed for the provider's life — the driver
 * mutates its fields in place — so holding the object and reading its fields
 * after each frame is both sufficient and the point: nothing here re-renders.
 */
const sink: { state: SceneAmbientState | null } = { state: null };
const captured = () => sink.state;

function AmbientProbe() {
  const state = useSceneAmbient();
  useEffect(() => {
    // Publishing the reference once is enough and is the point: the object's
    // identity never changes, so the test can read live field values out of it
    // after any frame without the probe itself ever re-rendering.
    sink.state = state;
  }, [state]);
  return null;
}

/**
 * The context carries a ref, exactly as `useScenePointer` produces one, so the
 * driver sees the same shape it sees in production and the test can move the
 * pointer mid-flight the way a real `pointermove` would.
 */
function renderDriver(pointer: ScenePointer) {
  const ref = { current: pointer };
  render(
    <ScenePointerProvider value={ref}>
      <SceneAmbientProvider>
        <AmbientProbe />
        <SceneAmbientDriver />
      </SceneAmbientProvider>
    </ScenePointerProvider>,
  );
  return ref;
}

/** Steps the driver by `count` frames of `ms` each, starting at `startSeconds`. */
function step(count: number, ms: number, startSeconds = 0) {
  for (let i = 1; i <= count; i++) {
    const state = { clock: { elapsedTime: startSeconds + (i * ms) / 1000 } };
    frameCallbacks[frameCallbacks.length - 1](state, ms / 1000);
  }
}

function setScroll(y: number, viewportHeight = 900) {
  Object.defineProperty(window, 'scrollY', {
    value: y,
    configurable: true,
    writable: true,
  });
  Object.defineProperty(window, 'innerHeight', {
    value: viewportHeight,
    configurable: true,
    writable: true,
  });
}

beforeEach(() => {
  frameCallbacks.length = 0;
  canvasProps = null;
  canvasRenders = 0;
  sink.state = null;
  setScroll(0, 900);
  quality = {
    tier: 'high',
    detectedTier: 'high',
    ready: true,
    reduced: false,
    unsupported: false,
  };
});

afterEach(() => {
  vi.restoreAllMocks();
});

/* ═══════════════════════════════════════════════════════════════════════════ */

describe('reduced motion and the static fallback', () => {
  /**
   * The load-bearing assertion of this whole file. If any future edit hoists a
   * listener or a timer above the `useWebGL` gate in `SceneLayer`, this fails
   * and the reduced-motion contract is visibly broken rather than subtly so.
   */
  it('mounts no canvas, no frame loop and no listener under prefers-reduced-motion', () => {
    quality = {
      tier: 'none',
      detectedTier: 'none',
      ready: true,
      reduced: true,
      unsupported: false,
    };
    const listeners = spyOnListeners();

    const { container } = render(<SceneLayer variant="hero" />);

    expect(canvasRenders).toBe(0);
    expect(canvasProps).toBeNull();
    expect(frameCallbacks).toHaveLength(0);
    expect(listeners.added).toEqual({});
    // StaticField still draws: the page keeps its depth, it just stops moving.
    expect(container.querySelectorAll('svg').length).toBeGreaterThan(0);

    listeners.restore();
  });

  it.each([
    ['no WebGL at all', { unsupported: true, tier: 'none' as SceneTierState }],
    ['the device is below the low tier', { tier: 'none' as SceneTierState }],
  ])('degrades to the same static field when %s', (_label, override) => {
    quality = { ...quality, ...override };
    const { container } = render(<SceneLayer variant="blog" />);

    expect(canvasRenders).toBe(0);
    expect(frameCallbacks).toHaveLength(0);
    expect(container.querySelectorAll('svg').length).toBeGreaterThan(0);
  });

  /**
   * The hidden tab is the fourth path, and the interesting one: the canvas is
   * still there, so this is NOT a fallback — but `frameloop: 'never'` means the
   * render loop does not advance, so the ambient driver, the attract anchor and
   * every depth layer are all frozen. No frames, no motion, no work. The scene
   * resumes mid-gesture rather than snapping to a resting pose it never earned.
   */
  it('renders no frames at all while the tab is hidden', () => {
    quality = { ...quality, tier: 'paused' };
    render(<SceneLayer variant="hero" />);

    expect(canvasRenders).toBe(1);
    expect(canvasProps?.frameloop).toBe('never');
    expect(frameCallbacks).toHaveLength(0);
  });

  /**
   * The converse, so the assertions above cannot pass by the gate being stuck
   * shut. A low-tier device is still a real scene, and the idle work should be
   * alive on it — degraded in particle count, not in behaviour.
   */
  it('still builds a real scene on the low tier', () => {
    quality = {
      tier: 'low',
      detectedTier: 'low',
      ready: true,
      reduced: false,
      unsupported: false,
    };
    render(<SceneLayer variant="hero" />);

    expect(canvasRenders).toBe(1);
    expect(canvasProps).not.toBeNull();
  });

  /**
   * Reading the ambient state with no provider must not throw, and must not
   * invent motion. A frozen resting object means a layer mounted outside the
   * provider renders one still frame instead of taking the page down — the same
   * bargain `useScenePointer`'s `IDLE_REF` makes.
   */
  it('degrades to a frozen resting frame outside a provider', () => {
    render(<AmbientProbe />);

    expect(captured()).not.toBeNull();
    expect(captured()).toEqual({ presence: 0, depth: 0, rush: 0, time: 0 });
    expect(Object.isFrozen(captured())).toBe(true);
  });
});

describe('the ambient driver, step by step', () => {
  it('registers exactly one frame callback and no listeners of its own', () => {
    const listeners = spyOnListeners();
    renderDriver(POINTER);

    expect(frameCallbacks).toHaveLength(1);
    expect(listeners.added).toEqual({});

    listeners.restore();
  });

  /**
   * A visitor who has not touched the mouse never changes `movedAt`, so the
   * last-change time is still negative infinity and the scene is at full rest on
   * frame one. There is no warm-up period where the scene sits in a
   * half-engaged state nobody asked for.
   */
  it('rests from the very first frame when the pointer has never moved', () => {
    renderDriver(POINTER);
    step(1, 16.7);

    expect(captured()?.presence).toBe(0);
    expect(captured()?.depth).toBe(0);
    expect(captured()?.rush).toBe(0);
  });

  it('stays engaged while the pointer keeps moving, then hands over', () => {
    const pointer = { ...POINTER, active: true, movedAt: 500 };
    const ref = renderDriver(pointer);

    // A move at t=0, then another at t=0.48s. The scene is engaged across the
    // gap because `movedAt` changed, restarting the quiet clock each time.
    step(1, 16.7, 0);
    expect(captured()?.presence).toBe(1);
    ref.current.movedAt = 2000;
    step(1, 16.7, 0.483);
    expect(captured()?.presence).toBe(1);

    // Now the pointer is left alone. `movedAt` is frozen, so the quiet clock
    // runs down: full presence through the attack, handed over by the release.
    ref.current.movedAt = 2000;
    step(1, 16.7, 0.5);
    expect(captured()?.presence).toBe(1);
    step(1, 16.7, 0.5 + IDLE_ATTACK_MS / 1000 + 0.1);
    expect(captured()?.presence).toBeLessThan(1);
    // 200 frames is ~3.3s, which is past the release from the last change.
    step(200, 16.7, 0.5 + IDLE_ATTACK_MS / 1000 + 0.1);
    expect(captured()?.presence).toBe(0);
    // And the ramp stays inside its range even if a frame skips the whole
    // release at once, so the shader can never be handed a value it did not
    // expect.
    step(1, 16.7, 60);
    expect(captured()?.presence).toBe(0);
  });

  /**
   * The tab was hidden for ten minutes. `movedAt` is a wall clock and has
   * advanced; the scene clock has not. Reading quiet time off the wall clock
   * would slam the scene to zero rest on the first frame back. Reading it off the
   * scene clock means the visitor returns to exactly the state they left.
   */
  it('does not treat a hidden tab as ten minutes of stillness', () => {
    const pointer = { ...POINTER, active: true, movedAt: 500 };
    renderDriver(pointer);

    step(1, 16.7, 100);
    expect(captured()?.presence).toBe(1);

    // First frame back: the scene clock is where it was, the wall clock is not
    // consulted at all.
    step(1, 16.7, 100);
    expect(captured()?.presence).toBe(1);
    expect(captured()?.time).toBeCloseTo(100.0167, 4);
  });

  it('reports scene time, not wall time, so every derived animation pauses together', () => {
    renderDriver(POINTER);
    step(1, 16.7, 42);
    expect(captured()?.time).toBeCloseTo(42.0167, 4);
  });

  it('accumulates scroll depth toward the saturated maximum', () => {
    renderDriver(POINTER);
    setScroll(900, 900); // one viewport

    // One screenful of scroll, smoothed over a 140ms half-life.
    step(120, 16.7, 0);
    expect(captured()?.depth).toBeGreaterThan(0.5);
    expect(captured()?.depth).toBeLessThan(SCROLL_SOFT_MAX_VH);

    // And it keeps creeping, which is the point of a soft ceiling: the layers
    // never slam into a clamp partway down a long article.
    const afterOneScreen = captured()!.depth;
    setScroll(9000, 900); // ten viewports
    step(600, 16.7, 2);
    expect(captured()!.depth).toBeGreaterThan(afterOneScreen);
    expect(captured()!.depth).toBeLessThan(SCROLL_SOFT_MAX_VH);
  });

  it('clamps a pathological frame so no layer can teleport', () => {
    renderDriver(POINTER);
    setScroll(9000, 900);
    const target = scrollDepth(10);

    // A single 2-second frame. Unclamped, the damp would close ~100% of the
    // remaining distance in one go and every depth layer would jump the full
    // remaining travel — a third of the scene's height, in one step, which
    // reads as a glitch rather than as scroll.
    frameCallbacks[frameCallbacks.length - 1]({ clock: { elapsedTime: 2 } }, 2);
    const oneFrame = captured()!.depth;

    expect(oneFrame).toBeGreaterThan(0);
    // The clamp caps the step at 100ms, so one long frame closes the same
    // fraction of the gap as ten ordinary ones would.
    expect(oneFrame).toBeLessThan(target * 0.5);

    // Ten ordinary frames of the same total duration get there properly.
    for (let i = 0; i < 10; i++) {
      frameCallbacks[frameCallbacks.length - 1](
        { clock: { elapsedTime: 2.2 } },
        0.2,
      );
    }
    expect(captured()!.depth).toBeGreaterThan(oneFrame);
  });

  it('builds rush from sustained travel and lets it decay after the scroll stops', () => {
    renderDriver(POINTER);

    // A hard flick: 3.4 viewport heights of scroll.
    setScroll(3060, 900);
    step(6, 16.7, 0);
    const rushing = captured()!.rush;
    expect(rushing).toBeGreaterThan(0.3);

    // Stop. The scroll position has not changed, so the derivative falls to
    // zero and rush bleeds away on its own — no event, no listener, and nothing
    // to miss when a scroll happens that we do not hear about.
    step(120, 16.7, 0.1);
    expect(captured()!.rush).toBeLessThan(rushing * 0.35);
    // It decays toward zero rather than snapping to it: the smoothed depth
    // converges asymptotically, so the derivative it is measured from has a
    // float residue. The residue is ~1/5000th of the tuned rush gain, so it is
    // not worth a threshold, but it is worth not pretending otherwise.
    expect(captured()!.rush).toBeLessThan(0.2);
    expect(captured()!.rush).toBeGreaterThanOrEqual(0);
  });

  it('reads no layout property, so sampling scroll per frame cannot force a reflow', () => {
    const readLayout = vi.fn();
    const descriptors = ['offsetTop', 'clientHeight', 'scrollHeight'];
    for (const key of descriptors) {
      Object.defineProperty(HTMLElement.prototype, key, {
        configurable: true,
        get() {
          readLayout(key);
          return 0;
        },
      });
    }

    renderDriver(POINTER);
    setScroll(1800, 900);
    step(30, 16.7, 0);

    expect(readLayout).not.toHaveBeenCalled();
  });
});
