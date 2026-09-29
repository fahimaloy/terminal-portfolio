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
import SceneCanvas, { VARIANTS } from '../SceneCanvas';
import { TubeStrip } from '../TubeStrip';
import NeonTubes, {
  NEON_TUBES_FRAG,
  NEON_TUBES_VERT,
  NEON_TUBES_GLOW_FRAG,
  NEON_TUBES_GLOW_VERT,
  GLOW_PALETTE_ROTATION,
  glowAccentRun,
  glowPointCount,
  writeGlowSamples,
} from '../NeonTubes';
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
  // Capture() reads the context during render, so calling render() a second time
  // would mount a SECOND PointerProbe with its own idle pointer and could never
  // observe the first root's. Re-render the same root instead.
  let rerender: () => void;

  const mount = () => {
    const result = render(React.createElement(PointerProbe, { onRead }));
    rerender = () =>
      result.rerender(React.createElement(PointerProbe, { onRead }));
  };

  beforeEach(() => {
    frameCallbacks.length = 0;
    canvasProps = null;
    seen = IDLE;
  });

  it('normalises window pointermove into -1..1 with y up', () => {
    mount();
    expect(seen.active).toBe(false);

    moveMouse(1440, 0);
    rerender();
    expect(seen.active).toBe(true);
    expect(seen.x).toBeCloseTo(1, 5);
    expect(seen.y).toBeCloseTo(1, 5);

    moveMouse(0, 900);
    rerender();
    expect(seen.x).toBeCloseTo(-1, 5);
    expect(seen.y).toBeCloseTo(-1, 5);
  });

  it('reports the centre of the viewport as the origin', () => {
    mount();
    moveMouse(720, 450);
    rerender();
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

/**
 * Art direction, and specifically the entry the admin panel reuses.
 *
 * `/sudosuperuser-ostaad` is mapped to the `blog` variant by the single
 * mapping site in `_app.tsx`, and the admin is the densest reading surface in
 * the app — it is the only one that opens a real `aria-modal` dialog over
 * stacked form fields and tables. These assert *why* `blog` is the right
 * answer, as invariants rather than snapshots: each one fails only if a future
 * pass makes the backdrop louder, brighter, or more mobile than a reading
 * surface can tolerate.
 */
describe('scene art direction', () => {
  // Reset here rather than inline in the loop below: assigning to the
  // module-level `canvasProps` inside the test body narrows it to `null` for
  // the rest of that block, and the optional chain then resolves to `never`.
  beforeEach(() => {
    canvasProps = null;
  });

  it('keeps every variant under the legibility ceiling', () => {
    // The header on VARIANTS records the failure this bounds: an early pass at
    // 14k particles at size 1.6 turned the page into a nebula and put body
    // text below 4.5:1. The scene is a backdrop, so these are ceilings and
    // not preferences.
    for (const [name, art] of Object.entries(VARIANTS)) {
      expect(art.opacity, name).toBeLessThanOrEqual(0.3);
      expect(art.size, name).toBeLessThanOrEqual(0.5);
      expect(art.grid, name).toBeLessThanOrEqual(0.2);
    }
  });

  it('makes `blog` the quietest variant, since the admin reuses it', () => {
    const blog = VARIANTS.blog;
    for (const [name, art] of Object.entries(VARIANTS)) {
      if (name === 'blog') continue;
      expect(blog.opacity, name).toBeLessThanOrEqual(art.opacity);
    }
  });

  it('drops the pointer-chasing tube layer on the reading variants', () => {
    // NeonTubes is a cursor-following FOREGROUND element. Behind dense form
    // and table content it buys nothing and costs glyph edge contrast, so the
    // entry the admin gets must not carry it.
    expect(VARIANTS.blog.tubes).toBeNull();
  });

  it('leaves coreOpacity at zero wherever the core object is disabled', () => {
    // `art.core && <CoreObject opacity={art.coreOpacity} />` means a non-zero
    // coreOpacity is dead config that will read as a bug the instant `core` is
    // switched back on.
    for (const [name, art] of Object.entries(VARIANTS)) {
      if (!art.core) expect(art.coreOpacity, name).toBe(0);
    }
  });

  it('gives each variant its own camera distance', () => {
    // Three variants are three art directions, not one direction behind three
    // names. A copy-paste that gave two of them the same cameraZ would leave
    // the field at an identical apparent depth on two surfaces whose content
    // is nothing alike.
    const zs = Object.values(VARIANTS).map((art) => art.cameraZ);
    expect(new Set(zs).size).toBe(zs.length);
  });

  it('applies each variant camera distance to the mounted canvas', () => {
    // End to end through the mount: the table only earns its keep if the
    // numbers actually reach the <Canvas> camera prop.
    for (const variant of ['hero', 'chat', 'blog'] as const) {
      const { unmount } = render(
        React.createElement(SceneCanvas, {
          variant,
          tier: 'high',
          densityTier: 'high',
        }),
      );
      const camera = canvasProps?.camera as { position: number[] };
      expect(camera.position[2], variant).toBe(VARIANTS[variant].cameraZ);
      act(() => unmount());
    }
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

describe('NeonTubes glow layer', () => {
  /**
   * The faked "riding tube lights" layer: one additive `THREE.Points` cloud
   * whose samples ride the same spine arrays the ribbons are built from.
   *
   * The reference lit this scene with real three.js lights
   * (`lights: { intensity: 200, colors: [...] }`), which cannot be ported as a
   * `<pointLight>`: three.js lights only contribute to lit materials, and this
   * scene has none — every surface is a hand-written unlit `ShaderMaterial`. A
   * real light would compile, mount, and change nothing on screen. These tests
   * hold the additive fake to the same standard a real light would need: right
   * sample count, genuinely on the spine, and shaders that actually link.
   */
  const varyingsOf = (src: string) =>
    [...src.matchAll(/varying\s+\w+\s+(\w+)\s*;/g)].map((m) => m[1]);

  const declaredUniforms = (src: string) =>
    new Set([...src.matchAll(/uniform\s+\w+\s+(\w+)\s*;/g)].map((m) => m[1]));

  const usedUniforms = (src: string) =>
    new Set([...src.matchAll(/\b(u[A-Z]\w*)\b/g)].map((m) => m[1]));

  it('declares exactly the same varyings in both glow stages', () => {
    // A varying in one stage and not the other is a COMPILE error, and a failed
    // program makes three drop the material SILENTLY — the glow would simply
    // never appear, with no exception thrown anywhere in the app.
    expect(varyingsOf(NEON_TUBES_GLOW_FRAG).sort()).toEqual(
      varyingsOf(NEON_TUBES_GLOW_VERT).sort(),
    );
  });

  it('declares every uniform the glow stages read', () => {
    // Every uFoo referenced must be declared, or it silently reads as 0 — which
    // for uViewportH would mean a zero-size point sprite, i.e. an invisible
    // glow with no error anywhere.
    for (const src of [NEON_TUBES_GLOW_FRAG, NEON_TUBES_GLOW_VERT]) {
      const declared = declaredUniforms(src);
      for (const name of usedUniforms(src)) {
        expect(
          declared,
          `${name} read in the glow shader but not declared`,
        ).toContain(name);
      }
    }
  });

  it('needs no GL extension, so the glow links on WebGL1', () => {
    expect(NEON_TUBES_GLOW_FRAG).not.toMatch(/fwidth\s*\(/);
    expect(NEON_TUBES_GLOW_VERT).not.toMatch(/fwidth\s*\(/);
    expect(NEON_TUBES_GLOW_FRAG).not.toMatch(/dFdx\s*\(/);
    expect(NEON_TUBES_GLOW_VERT).not.toMatch(/dFdx\s*\(/);
  });

  it('never reuses the tube ramp, so the light reads as a separate event', () => {
    // The reference deliberately keeps the TUBE palette and the LIGHT palette
    // apart. Reusing the tube ramp made the glow read as a brighter tube rather
    // than as illumination, so the light palette is derived from the same
    // token rotation moved by one accent.
    const tube = sceneAccentRun(0, 3);
    const light = glowAccentRun(0, 3);

    expect(light).toHaveLength(3);
    expect(light).not.toEqual(tube);
    // One step, exactly: related, but never the same three hues.
    expect(light).toEqual(sceneAccentRun(GLOW_PALETTE_ROTATION, 3));
    expect(GLOW_PALETTE_ROTATION).toBe(1);

    // Still resolved from the six token accents — never a random hex, and
    // never a raw literal outside tokens.css.
    for (const c of light) expect(c).toMatch(/^#|^var\(/);
  });

  it('computes the point count as samples per tube x tube count', () => {
    expect(glowPointCount(3, 24)).toBe(72);
    expect(glowPointCount(1, 8)).toBe(8);
    expect(glowPointCount(0, 24)).toBe(0);
    // Guards a negative count rather than throwing inside the frame loop.
    expect(glowPointCount(-2, 8)).toBe(0);
  });

  it('samples the spine, so the light sits on the tube it lights', () => {
    // Pure helper, asserted directly: the glow must ride the spine exactly,
    // interpolating between control points rather than snapping to them.
    const segments = 5;
    const spine = new Float32Array((segments + 1) * 3);
    for (let s = 0; s <= segments; s++) {
      spine[s * 3] = s * 10;
      spine[s * 3 + 1] = s * 2;
      spine[s * 3 + 2] = s;
    }

    // 3 samples over a 5-segment spine puts the middle sample at fractional
    // index 2.5, i.e. exactly half way between control points 2 and 3 — so
    // this covers the lerp, not just the two endpoints. (segments=4 would
    // put it at index 2.0 and only ever hit a control point.)
    const out = new Float32Array(3 * 3);
    writeGlowSamples(spine, segments, out, 0, 3);

    // Head: exactly the first control point.
    expect(out[0]).toBeCloseTo(0, 5);
    expect(out[1]).toBeCloseTo(0, 5);
    expect(out[2]).toBeCloseTo(0, 5);
    // Middle: 50% between control point 2 (x=20,y=4,z=2) and 3 (x=30,y=6,z=3).
    expect(out[3]).toBeCloseTo(25, 5);
    expect(out[4]).toBeCloseTo(5, 5);
    expect(out[5]).toBeCloseTo(2.5, 5);
    // Tail: exactly the last control point.
    expect(out[6]).toBeCloseTo(50, 5);
    expect(out[7]).toBeCloseTo(10, 5);
    expect(out[8]).toBeCloseTo(5, 5);

    // Writing into the middle of a shared buffer must not disturb the rest:
    // every tube's samples live in one preallocated array, so an off-by-one
    // offset would smear one tube's light into its neighbour's slice.
    const shared = new Float32Array(2 * 3 * 3).fill(-99);
    writeGlowSamples(spine, segments, shared, 9, 3);
    expect(shared[0]).toBe(-99);
    expect(shared[8]).toBe(-99);
    expect(shared[9]).toBeCloseTo(0, 5);
  });

  it('builds a glow geometry sized to samples x tubes and tracks the spine', () => {
    // Rendered for real (with r3f's useFrame mocked), so this covers the
    // wiring: the geometry exists, is sized correctly, and is rewritten from
    // the spine in the SAME useFrame that advances the spine.
    const count = 2;
    const segments = 8;
    const samples = 5;

    // Pushed rather than assigned, so `this` is passed as an argument instead
    // of aliased to an outer variable (no-this-alias).
    const glowGeometries: THREE.BufferGeometry[] = [];
    const originalSetAttribute = THREE.BufferGeometry.prototype.setAttribute;
    const spy = vi
      .spyOn(THREE.BufferGeometry.prototype, 'setAttribute')
      .mockImplementation(function (
        this: THREE.BufferGeometry,
        name: string | number | symbol,
        attribute: THREE.BufferAttribute,
      ) {
        // `aTube` exists only on the glow cloud; the tube strips set
        // aParam/position/normal. So this captures the glow geometry and
        // nothing else.
        if (name === 'aTube') glowGeometries.push(this);
        return originalSetAttribute.call(this, name, attribute);
      });

    frameCallbacks.length = 0;

    try {
      render(
        React.createElement(NeonTubes, {
          count,
          segments,
          glowSamples: samples,
        }),
      );
    } finally {
      spy.mockRestore();
    }

    // The glow layer is exactly ONE points cloud, not one per tube: a single
    // draw call is the whole reason for the shared buffer.
    expect(glowGeometries).toHaveLength(1);
    const g = glowGeometries[0];

    const position = g.getAttribute('position') as THREE.BufferAttribute;
    const param = g.getAttribute('aParam') as THREE.BufferAttribute;
    const tubeIndex = g.getAttribute('aTube') as THREE.BufferAttribute;

    expect(position.count).toBe(glowPointCount(count, samples));
    expect(position.count).toBe(count * samples);
    expect(param.count).toBe(position.count);
    expect(tubeIndex.count).toBe(position.count);
    // Preallocated exactly: the buffer is not oversized, so the per-frame
    // write cannot spill into the next tube's slice.
    expect(position.array.length).toBe(count * samples * 3);
    // The static per-point data ramps 0..1 along each tube, and tags which
    // tube each point belongs to, so the shader can gradient each tube.
    expect(param.array[0]).toBeCloseTo(0, 5);
    expect(param.array[samples - 1]).toBeCloseTo(1, 5);
    expect(param.array[samples]).toBeCloseTo(0, 5);
    expect(tubeIndex.array[0]).toBeCloseTo(0, 5);
    expect(tubeIndex.array[samples]).toBeCloseTo(1, 5);

    // Now step the frame loop and assert the glow actually MOVED with the
    // spine, rather than sitting at its seeded positions forever.
    const state = {
      viewport: { width: 20, height: 12, dpr: 1 },
      size: { width: 800, height: 600 },
      clock: { elapsedTime: 0 },
    };
    const frame = frameCallbacks[frameCallbacks.length - 1];
    expect(typeof frame).toBe('function');

    // Settle the spine at one clock time, then jump the clock so the idle
    // orbit moves every tube to a new target.
    for (let i = 0; i < 8; i++) {
      (frame as (s: unknown, d: number) => void)(state, 1 / 60);
    }
    const settled = [position.array[0], position.array[1], position.array[2]];

    state.clock.elapsedTime = 12;
    for (let i = 0; i < 30; i++) {
      (frame as (s: unknown, d: number) => void)(state, 1 / 60);
    }
    const moved = [position.array[0], position.array[1], position.array[2]];

    const travelled = Math.hypot(
      moved[0] - settled[0],
      moved[1] - settled[1],
      moved[2] - settled[2],
    );
    // The head sample IS the head spine point, so if the glow rides the spine
    // this is exactly how far that control point travelled.
    expect(travelled).toBeGreaterThan(0.05);
  });
});
