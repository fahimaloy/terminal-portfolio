/**
 * SceneCanvas — the r3f host.
 *
 * Kept separate from SceneLayer so the layer can decide *whether* to mount a
 * WebGL context at all. Every route gets exactly one instance.
 */

import { Suspense, useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import ParticleField from './ParticleField';
import FloorGrid from './FloorGrid';
import CoreObject, { ParallaxRig } from './CoreObject';
import type { SceneTier, SceneTierState } from '../../hooks/useSceneQuality';
import {
  useScenePointer,
  ScenePointerProvider,
} from '../../hooks/useScenePointer';

import { SCENE_ACCENTS, SCENE_ACCENT_RUNS } from './palette';
import NeonTubes from './NeonTubes';
import type { DepthLayer } from './ambient';
import {
  SceneAmbientProvider,
  SceneAmbientDriver,
  SceneDepth,
} from './useSceneAmbient';

export type SceneVariant = 'hero' | 'chat' | 'blog';

type Props = {
  variant: SceneVariant;
  /**
   * Lifecycle state, which is NOT the same as a density level: `'paused'`
   * means the tab is hidden. It is deliberately not narrowed to `SceneTier`
   * here — the previous `tier as SceneTier` cast in SceneLayer hid exactly
   * this, and `PARTICLE_COUNT['paused']` silently resolved to `undefined`.
   */
  tier: SceneTierState;
  /** The device's real tier. Drives density, and survives a pause. */
  densityTier: SceneTier;
  /** Incremented by the chat layer to pulse the field. */
  impulse?: number;
};

const PARTICLE_COUNT: Record<Exclude<SceneTier, 'none'>, number> = {
  high: 9000,
  medium: 5000,
  low: 2200,
};

/**
 * Per-variant art direction.
 *
 * These numbers are deliberately restrained. The scene is a *backdrop*: it
 * has to read as depth behind the content, never compete with it. A first
 * pass at 14k particles at size 1.6 turned the page into a nebula and put
 * body text below 4.5:1.
 *
 * `blog` serves two routes — the blog and `/sudosuperuser-ostaad` — and both
 * are reading surfaces, which is why it is the entry that gives up the core
 * object and the tube layer entirely. The admin panel is the denser of the
 * two: it is the only surface in the app that opens a real `aria-modal` dialog
 * over stacks of form fields and tables.
 */
export const VARIANTS: Record<
  SceneVariant,
  {
    opacity: number;
    size: number;
    grid: number;
    gridY: number;
    core: boolean;
    coreOpacity: number;
    cameraZ: number;
    /**
     * Scroll parallax, as a RATE per layer: the fraction of content scroll
     * speed that layer answers with.
     *
     * These are art direction and therefore live in this table (AGENTS.md scene
     * contract) rather than in `ambient.ts`, which holds only the per-layer
     * world-unit scale that comes from where each layer sits in the scene.
     *
     * The ordering is the design. `core` is the farthest element and lags
     * least; `grid` is the closest and lags most; the particle volume and the
     * tubes sit between. What matters is that they are DIFFERENT — depth is
     * read from the spread between layers, so a single shared factor would
     * translate the whole scene as one flat cut-out and read as broken rather
     * than deep. Every rate is below 1.0 for the same reason: a backdrop that
     * outruns the content does not read as distant, it reads as a transition
     * that is stuck halfway.
     *
     * Per variant, because the routes have genuinely different jobs:
     *   - `hero` is the baseline. One screenful of content, so the response is
     *     tuned to feel right within the first viewport of scroll.
     *   - `chat` roughly halves every rate. The conversation IS the content
     *     here and the scroll happens inside a panel; the backdrop has the
     *     least to add on that route and the most to take away.
     *   - `blog` raises them. It is the only variant with a long, real,
     *     document-length scroll, and it is the only route where differential
     *     parallax is the entire point rather than a garnish. It also serves
     *     the admin panel, where the scroll is shorter and the rates simply
     *     have less room to express themselves.
     */
    depth: Record<DepthLayer, number>;
    /**
     * Tube layer. `null` disables it for a variant — the blog is a reading
     * surface, and a cursor-chasing foreground behind body text costs
     * legibility for no gain. The numbers live here rather than in NeonTubes
     * because this table is the scene's single art-direction surface
     * (AGENTS.md scene contract).
     */
    tubes: {
      count: number;
      segments: number;
      radius: number;
      opacity: number;
      follow: number;
      z: number;
      /**
       * The faked "riding tube lights" (a point cloud riding the tube spines,
       * NOT a three.js light — this scene has no lit material for one to
       * affect). These three are art direction, so they live here with every
       * other per-variant number rather than as constants inside NeonTubes.
       */
      glowSamples: number;
      glowSize: number;
      glowIntensity: number;
    } | null;
  }
> = {
  hero: {
    opacity: 0.3,
    size: 0.5,
    grid: 0.16,
    gridY: -7.5,
    core: true,
    coreOpacity: 0.5,
    cameraZ: 9,
    depth: { grid: 0.48, tubes: 0.42, particles: 0.3, core: 0.22 },
    // Tuned against a measured histogram, not by eye. At opacity 0.2 the
    // tubes were invisible; at 0.9 they cut across the display name and the
    // stat row. This sits between: clearly present in the empty middle of
    // the frame, and behind the type at z -3 so the additive blend lifts the
    // background without destroying the glyph edges.
    tubes: {
      count: 3,
      segments: 48,
      radius: 0.1,
      opacity: 0.5,
      follow: 0.09,
      z: -3,
      // The hero gets the full lighting treatment: dense samples so the light
      // is continuous along a 48-segment spine, and enough intensity to read
      // as illumination in the empty middle of the frame. Still additive and
      // still depth-write-free, so it lifts the type rather than veiling it.
      glowSamples: 24,
      glowSize: 0.55,
      glowIntensity: 0.5,
    },
  },
  chat: {
    opacity: 0.2,
    size: 0.45,
    grid: 0.1,
    gridY: -8,
    core: true,
    coreOpacity: 0.22,
    cameraZ: 12,
    depth: { grid: 0.26, tubes: 0.22, particles: 0.16, core: 0.12 },
    // Dimmer and lazier: the chat stream is the content now, and the tubes
    // must not compete with reading text.
    tubes: {
      count: 2,
      segments: 40,
      radius: 0.1,
      opacity: 0.45,
      follow: 0.06,
      z: -5,
      // Subtler: the chat stream IS the content here, and a bright glow behind
      // reading text is the same legibility problem the dimmer tube opacity
      // above already avoids. Fewer samples, smaller, and roughly half the
      // hero's brightness — a hint of light riding the tubes, not a light show.
      glowSamples: 14,
      glowSize: 0.4,
      glowIntensity: 0.24,
    },
  },
  blog: {
    opacity: 0.18,
    size: 0.45,
    grid: 0.14,
    gridY: -7.5,
    core: false,
    coreOpacity: 0,
    cameraZ: 10,
    depth: { grid: 0.56, tubes: 0.48, particles: 0.34, core: 0.26 },
    tubes: null,
  },
};

/**
 * Tube density by tier.
 *
 * `low` gets ONE short tube rather than none. Dropping the layer entirely was
 * too blunt: it is by far the cheapest thing in the scene per pixel (a
 * handful of additive ribbons, no render targets, no extra passes), and it is
 * the layer people notice most. On a weak device the right trade is "less of
 * the effect", not "none of the effect" — which is also why the tier
 * heuristic in useSceneQuality now only looks at compute capability.
 */
const TUBE_TIER: Record<
  Exclude<SceneTier, 'none'>,
  { count: number; segments: number } | null
> = {
  high: { count: 3, segments: 48 },
  medium: { count: 2, segments: 32 },
  low: { count: 1, segments: 20 },
};

export default function SceneCanvas({
  variant,
  tier,
  densityTier,
  impulse = 0,
}: Props) {
  // Gated because the early return below happens AFTER this hook runs, so an
  // ungated listener would be installed on every scene-less route.
  const pointer = useScenePointer(densityTier !== 'none');
  const [paletteStep, setPaletteStep] = useState(0);

  // The tube palette advances on a chat send, cycling the six token accents.
  //
  // The reference implementation randomised colours on ANY click. Here that
  // would mean clicking a project link silently recoloured the background,
  // and `Math.random()` hex would sit outside the design system entirely. The
  // existing `portfolio:chat-send` event is a deliberate user action that
  // already drives the particle shockwave, so it is the natural trigger.
  //
  // Declared BEFORE the early return below: a hook after a conditional return
  // changes the hook count across renders and React throws.
  useEffect(() => {
    if (impulse > 0) {
      setPaletteStep((n) => (n + 1) % SCENE_ACCENT_RUNS);
    }
  }, [impulse]);

  if (densityTier === 'none') return null;
  const art = VARIANTS[variant];
  // Density comes from the detected tier, never from 'paused' — a hidden tab
  // must not change what is drawn when it comes back.
  const count = PARTICLE_COUNT[densityTier];
  // Resolved from tokens.css, not hardcoded — see palette.ts.
  const palette = SCENE_ACCENTS();

  const tierTubes = TUBE_TIER[densityTier];
  const tubes =
    art.tubes && tierTubes
      ? { ...art.tubes, count: tierTubes.count, segments: tierTubes.segments }
      : null;

  return (
    <ScenePointerProvider value={pointer}>
      <SceneAmbientProvider>
        <Canvas
          // The real fix for a hidden tab: r3f's loop keeps running at full
          // rate regardless of tier, so `tier: 'paused'` alone never stopped
          // anything (measured 60 rAF ticks visible vs 61 hidden).
          frameloop={tier === 'paused' ? 'never' : 'always'}
          dpr={[1, 1.75]}
          gl={{
            antialias: false,
            alpha: true,
            powerPreference: 'high-performance',
            failIfMajorPerformanceCaveat: false,
          }}
          camera={{
            position: [0, 0, art.cameraZ],
            fov: 55,
            near: 0.1,
            far: 120,
          }}
          style={{ position: 'absolute', inset: 0 }}
          aria-hidden="true"
        >
          <Suspense fallback={null}>
            {/* First child on purpose: it fills the shared ambient state that
                every layer below reads. Ordering is not load-bearing — each
                consumer writes only its own object — but running the integrator
                first means a layer never sees a value one frame stale. */}
            <SceneAmbientDriver />
            <ParallaxRig>
              {/* Each layer answers scroll at its own rate. See the `depth`
                  table above; the whole point of four groups rather than one
                  transform is that the DIFFERENCE between them is the depth
                  cue. */}
              <SceneDepth layer="particles" rate={art.depth.particles}>
                <ParticleField
                  count={count}
                  opacity={art.opacity}
                  size={art.size}
                  impulse={impulse}
                  palette={palette}
                />
              </SceneDepth>
              <SceneDepth layer="grid" rate={art.depth.grid}>
                <FloorGrid opacity={art.grid} y={art.gridY} impulse={impulse} />
              </SceneDepth>
              {tubes && (
                <SceneDepth layer="tubes" rate={art.depth.tubes}>
                  <NeonTubes
                    count={tubes.count}
                    segments={tubes.segments}
                    radius={tubes.radius}
                    opacity={tubes.opacity}
                    follow={tubes.follow}
                    z={tubes.z}
                    glowSamples={tubes.glowSamples}
                    glowSize={tubes.glowSize}
                    glowIntensity={tubes.glowIntensity}
                    paletteOffset={paletteStep}
                    impulse={impulse}
                  />
                </SceneDepth>
              )}
              {art.core && (
                <SceneDepth layer="core" rate={art.depth.core}>
                  <CoreObject opacity={art.coreOpacity} />
                </SceneDepth>
              )}
            </ParallaxRig>
          </Suspense>
        </Canvas>
      </SceneAmbientProvider>
    </ScenePointerProvider>
  );
}
