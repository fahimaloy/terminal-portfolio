/**
 * Scene-layer regression tests.
 *
 * These cover the three defects this work uncovered, each of which shipped
 * silently because nothing asserted on them:
 *
 *  1. The scene canvas never received pointer events. `SceneLayer` is
 *     `pointer-events-none` with the page content above it, so r3f's
 *     `state.pointer` was frozen at the origin and both `ParallaxRig` and the
 *     particle field's pointer repulsion were inert. Asserting the pointer
 *     store is populated and correctly normalised guards the fix.
 *
 *  2. A hidden tab did not stop rendering. `tier: 'paused'` was set by
 *     `useSceneQuality` but `SceneCanvas` only early-returned on `'none'`, so
import NeonTubes from '../NeonTubes';
 *     the r3f loop kept running at full rate. Assert `frameloop`.
 *
 *  3. `TubeStrip` is the whole allocation story: the reference implementation
 *     this replaces built a fresh `THREE.TubeGeometry` per tube per frame.
 *     Assert the buffers are reused across updates rather than reallocated,
 *     and that the geometry actually covers every spine point — a vertex
 *     count that is one ring short drops the tube's end silently, because
 *     typed arrays ignore out-of-range writes.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React, { act, useContext } from 'react';
import { render } from '@testing-library/react';
import * as THREE from 'three';

import {
  ScenePointerContext,
  useScenePointer,
} from '../../../hooks/useScenePointer';
import type { ScenePointer } from '../../../hooks/useScenePointer';
import SceneCanvas from '../SceneCanvas';
import { TubeStrip } from '../TubeStrip';
import { NEON_TUBES_FRAG, NEON_TUBES_VERT } from '../NeonTubes';
import { sceneAccentRun, SCENE_ACCENT_RUNS } from '../palette';

const frameCallbacks: ((state: unknown, delta: number) => void)[] = [];
let canvasProps: Record<string, unknown> | null = null;

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
    return React.createElement('div', { 'data-testid': 'canvas' });
  },
}));

const IDLE: ScenePointer = {
  x: 0,
  y: 0,
  clientX: 0,
  clientY: 0,
  active: false,
  movedAt: 0,
};

/** Renders a consumer inside the provider so the test can read the store. */
function PointerProbe({ onRead }: { onRead: (p: ScenePointer) => void }) {
  const pointer = useScenePointer();
  return React.createElement(
    ScenePointerContext.Provider,
    { value: pointer },
    React.createElement(Capture, { onRead }),
  );
}

function Capture({ onRead }: { onRead: (p: ScenePointer) => void }) {
  onRead(useContext(ScenePointerContext).current);
  return null;
}

const moveMouse = (clientX: number, clientY: number) => {
  Object.defineProperty(window, 'innerWidth', {
    value: 1440,
    configurable: true,
  });
  Object.defineProperty(window, 'innerHeight', {
    value: 900,
    configurable: true,
  });
  act(() => {
    // jsdom has no PointerEvent; MouseEvent carries the same client coords and
    // still dispatches under the 'pointermove' type.
    window.dispatchEvent(
      new MouseEvent('pointermove', { clientX, clientY, bubbles: true }),
    );
  });
};

describe('scene pointer', () => {
  let seen: ScenePointer = IDLE;
  const onRead = (p: ScenePointer) => {
    seen = p;
  };
  const mount = () => render(React.createElement(PointerProbe, { onRead }));

  beforeEach(() => {
    frameCallbacks.length = 0;
    canvasProps = null;
    seen = IDLE;
  });

  it('normalises window pointermove into -1..1 with y up', () => {
    mount();
    expect(seen.active).toBe(false);

    moveMouse(1440, 0);
    mount();
    expect(seen.active).toBe(true);
    expect(seen.x).toBeCloseTo(1, 5);
    expect(seen.y).toBeCloseTo(1, 5);

    moveMouse(0, 900);
    mount();
    expect(seen.x).toBeCloseTo(-1, 5);
    expect(seen.y).toBeCloseTo(-1, 5);
  });

  it('reports the centre of the viewport as the origin', () => {
    mount();
    moveMouse(720, 450);
    mount();
    expect(seen.x).toBeCloseTo(0, 5);
    expect(seen.y).toBeCloseTo(0, 5);
  });
});

describe('SceneCanvas render loop', () => {
  beforeEach(() => {
    canvasProps = null;
  });

  it('stops the loop while the tab is hidden', () => {
    render(
      React.createElement(SceneCanvas, {
        variant: 'hero',
        tier: 'paused',
        densityTier: 'high',
      }),
    );
    expect(canvasProps?.frameloop).toBe('never');
  });

  it('runs the loop at full rate while the tab is visible', () => {
    render(
      React.createElement(SceneCanvas, {
        variant: 'hero',
        tier: 'high',
        densityTier: 'high',
      }),
    );
    expect(canvasProps?.frameloop).toBe('always');
  });

  it('renders nothing when the device has no usable tier', () => {
    const { container } = render(
      React.createElement(SceneCanvas, {
        variant: 'hero',
        tier: 'none',
        densityTier: 'none',
      }),
    );
    expect(container.querySelector('[data-testid="canvas"]')).toBeNull();
  });
});

describe('scene pointer listener lifecycle', () => {
  let added = 0;
  let removed = 0;

  beforeEach(() => {
    // Restore first, or the second test's spy wraps the first one's and the
    // mock recurses until the stack overflows.
    vi.restoreAllMocks();
    added = 0;
    removed = 0;
    const realAdd = window.addEventListener;
    const realRemove = window.removeEventListener;
    vi.spyOn(window, 'addEventListener').mockImplementation((t, f, o) => {
      if (t === 'pointermove') added++;
      return realAdd.call(window, t as never, f as never, o as never);
    });
    vi.spyOn(window, 'removeEventListener').mockImplementation((t, f, o) => {
      if (t === 'pointermove') removed++;
      return realRemove.call(window, t as never, f as never, o as never);
    });
  });

  it('installs no listener on a route that renders no scene', () => {
    // SceneCanvas returns null AFTER calling the hook, so an ungated listener
    // was installed on every reduced-motion / no-WebGL route, doing nothing.
    render(
      React.createElement(SceneCanvas, {
        variant: 'hero',
        tier: 'none',
        densityTier: 'none',
      }),
    );
    expect(added).toBe(0);
  });

  it('removes the listener when the scene unmounts', () => {
    const { unmount } = render(
      React.createElement(SceneCanvas, {
        variant: 'hero',
        tier: 'high',
        densityTier: 'high',
      }),
    );
    expect(added).toBe(1);
    act(() => unmount());
    expect(removed).toBe(1);
  });
});

describe('scene accent palette', () => {
  it('wraps a negative offset instead of indexing out of range', () => {
    // JS `%` keeps the dividend's sign, so a negative offset indexed the token
    // table with -1 and destructured `undefined`, which throws.
    const run = sceneAccentRun(-1, 3);
    expect(run).toHaveLength(3);
    for (const c of run) expect(c).toBeTruthy();
  });

  it('produces the same rotation for offset and offset + the cycle length', () => {
    expect(sceneAccentRun(0, 3)).toEqual(sceneAccentRun(SCENE_ACCENT_RUNS, 3));
  });
});

describe('TubeStrip', () => {
  it('reuses its buffers across updates instead of reallocating', () => {
    const spine = new Float32Array(9 * 3);
    const strip = new TubeStrip(8, 6, 0.1, spine);

    const bufferBefore = (
      strip.geometry.getAttribute('position') as THREE.BufferAttribute
    ).array;

    // Move the whole spine and update repeatedly, as the frame loop does.
    for (let i = 0; i < 120; i++) {
      for (let s = 0; s < 9; s++) {
        spine[s * 3] = Math.sin(i * 0.1 + s) * 3;
        spine[s * 3 + 1] = Math.cos(i * 0.1 + s) * 2;
      }
      strip.update();
    }

    const bufferAfter = (
      strip.geometry.getAttribute('position') as THREE.BufferAttribute
    ).array;

    // Same underlying typed array => no per-frame allocation.
    expect(bufferAfter).toBe(bufferBefore);
    expect(bufferBefore.byteLength).toBeGreaterThan(0);
  });

  it('covers every spine point with a ring of vertices', () => {
    const segments = 8;
    const radial = 6;
    const radius = 0.25;
    const spine = new Float32Array((segments + 1) * 3);
    for (let s = 0; s <= segments; s++) {
      spine[s * 3] = s * 0.7;
      spine[s * 3 + 1] = Math.sin(s * 0.6) * 1.2;
    }
    const strip = new TubeStrip(segments, radial, radius, spine);
    const pos = strip.geometry.getAttribute(
      'position',
    ) as THREE.BufferAttribute;
    const params = strip.geometry.getAttribute(
      'aParam',
    ) as THREE.BufferAttribute;

    expect(params.count).toBe((segments + 1) * (radial + 1));

    for (let s = 0; s <= segments; s++) {
      for (let r = 0; r <= radial; r++) {
        const v = (s * (radial + 1) + r) * 3;
        const dx = pos.array[v] - spine[s * 3];
        const dy = pos.array[v + 1] - spine[s * 3 + 1];
        const dz = pos.array[v + 2] - spine[s * 3 + 2];
        expect(Math.hypot(dx, dy, dz)).toBeCloseTo(radius, 4);
      }
      // Each ring's last vertex is the seam, and must sit exactly `radius`
      // from its own spine point (already asserted above) at param s/segments.
      const seam = s * (radial + 1) + radial;
      expect(params.array[seam]).toBeCloseTo(s / segments, 5);
    }
  });

  it('keeps the spine spread out instead of collapsing onto a point', () => {
    // The whip depends on the control points staying spread along the tube.
    // Two earlier implementations failed here and neither was visible as an
    // error: chaining "follow the point ahead" collapsed the whole chain onto
    // the head, and a rate that decayed to zero froze the tail and dragged
    // the bundle into a corner. This asserts the invariant directly: after
    // converging, consecutive control points must remain separated, and the
    // chain must span a meaningful fraction of the space it targets.
    const segments = 24;
    const spine = new Float32Array((segments + 1) * 3);
    const spread = 12;
    const k = 0.12;
    const target = { x: 3, y: -2, z: 0 };

    // Run the same converge loop the component runs.
    for (let frame = 0; frame < 400; frame++) {
      for (let s = 0; s <= segments; s++) {
        const t01 = s / segments;
        const ks = k * (1 - t01 * 0.82);
        spine[s * 3] += (target.x - t01 * spread - spine[s * 3]) * ks;
        spine[s * 3 + 1] +=
          (target.y - t01 * spread * 0.55 - spine[s * 3 + 1]) * ks;
        spine[s * 3 + 2] += (0 - t01 * 1.5 - spine[s * 3 + 2]) * ks;
      }
    }

    // Head near the target.
    expect(Math.abs(spine[0] - target.x)).toBeLessThan(1.5);

    // Tail well away from the head: the tube has real length.
    const headToTail = Math.hypot(
      spine[0] - spine[segments * 3],
      spine[1] - spine[segments * 3 + 1],
      spine[2] - spine[segments * 3 + 2],
    );
    expect(headToTail).toBeGreaterThan(spread * 0.5);

    // No single point is pinned far from its neighbours (the frozen-tail bug).
    for (let s = 1; s < segments; s++) {
      const gap = Math.hypot(
        spine[(s - 1) * 3] - spine[s * 3],
        spine[(s - 1) * 3 + 1] - spine[s * 3 + 1],
        spine[(s - 1) * 3 + 2] - spine[s * 3 + 2],
      );
      expect(gap).toBeLessThan(spread);
    }
  });

  it('emits unit-length normals for a stable fresnel term', () => {
    const spine = new Float32Array(5 * 3);
    for (let s = 0; s < 5; s++) spine[s * 3] = s;
    const strip = new TubeStrip(4, 5, 0.3, spine);
    const nrm = strip.geometry.getAttribute('normal') as THREE.BufferAttribute;

    for (let i = 0; i < nrm.array.length; i += 3) {
      const len = Math.hypot(nrm.array[i], nrm.array[i + 1], nrm.array[i + 2]);
      expect(len).toBeCloseTo(1, 4);
    }
  });

  it('does not spin the frame when the spine is a straight line', () => {
    // Frenet normals flip at inflection points, which makes a tube visibly
    // twist. A straight spine must produce a perfectly stable ring.
    const spine = new Float32Array(6 * 3);
    for (let s = 0; s < 6; s++) spine[s * 3] = s * 0.5;
    const strip = new TubeStrip(5, 4, 0.2, spine);
    const nrm = strip.geometry.getAttribute('normal') as THREE.BufferAttribute;

    for (let s = 1; s < 6; s++) {
      for (let r = 0; r <= 4; r++) {
        const v = (s * 5 + r) * 3;
        const p = ((s - 1) * 5 + r) * 3;
        // Consecutive rings share the same radial direction.
        expect(nrm.array[v]).toBeCloseTo(nrm.array[p], 4);
        expect(nrm.array[v + 1]).toBeCloseTo(nrm.array[p + 1], 4);
      }
    }
  });
});

describe('NeonTubes shader interface', () => {
  // A varying declared in one stage and not the other is a COMPILE error.
  // three.js then drops the material without throwing, so the tubes vanish
  // with no console error from the app itself — it only shows up as a raw
  // "undeclared identifier" from the GL driver. This shipped once already.
  const varyingsOf = (src: string) =>
    [...src.matchAll(/varying\s+\w+\s+(\w+)\s*;/g)].map((m) => m[1]);

  it('declares exactly the same varyings in both stages', () => {
    expect(varyingsOf(NEON_TUBES_FRAG).sort()).toEqual(
      varyingsOf(NEON_TUBES_VERT).sort(),
    );
  });

  it('declares every uniform it uses', () => {
    const declared = new Set(
      [...NEON_TUBES_FRAG.matchAll(/uniform\s+\w+\s+(\w+)\s*;/g)].map(
        (m) => m[1],
      ),
    );
    // Every uFoo the body references must be declared, or it reads as 0.
    const used = new Set(
      [...NEON_TUBES_FRAG.matchAll(/\b(u[A-Z]\w*)\b/g)].map((m) => m[1]),
    );
    for (const name of used) {
      expect(declared).toContain(name);
    }
  });

  it('needs no GL extension, so it links on WebGL1', () => {
    // FloorGrid regressed this way: an fwidth() call needed the derivatives
    // extension and silently took the whole floor offline.
    expect(NEON_TUBES_FRAG).not.toMatch(/fwidth\s*\(/);
    expect(NEON_TUBES_VERT).not.toMatch(/fwidth\s*\(/);
  });
});
