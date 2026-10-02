/**
 * NeonTubes — cursor-chasing neon tubes, the scene's foreground layer.
 *
 * Each tube is a fixed-topology strip (see `TubeStrip`) whose control points
 * chase the pointer with a per-point rate, so the tube trails the cursor like
 * a whip. That trailing delay is the whole effect; the geometry is a means to
 * draw it.
 *
 * Design decisions that differ from the reference implementation:
 *
 *   - NO `threejs-components`, and no CDN import of it. The reference loaded
 *     an unpinned remote bundle in the render path. This is a local component
 *     against the repo's own three/r3f versions.
 *
 *   - NO `MeshTransmissionMaterial`. The reference's glass look costs an extra
 *     render pass per mesh. A single additive fresnel shader gives the same
 *     read for a fraction of the cost, and it matches the existing CoreObject
 *     shader idiom so the scene stays internally consistent.
 *
 *   - NO per-frame `new TubeGeometry`, and no per-frame allocation at all.
 *     See TubeStrip.
 *
 *   - Colours come from tokens.css via `sceneAccentRun`, never `Math.random()`.
 *
 *   - NO three.js light object, and NO lit material, for the "riding tube
 *     lights". Every visible surface in this scene is a hand-written unlit
 *     `ShaderMaterial` (FloorGrid, CoreObject, NeonTubes, ParticleField) and
 *     there is not a single `ambientLight`/`pointLight`/lit material in `src/`.
 *     three.js lights only contribute to lit materials, so a real
 *     `<pointLight intensity={200}>` would compile, mount, and change nothing
 *     on screen. The illumination is therefore FAKED ADDITIVELY: one
 *     `THREE.Points` cloud whose samples ride the very same spine arrays the
 *     ribbons are built from, drawn with an additive soft-falloff sprite. That
 *     is the scene's existing idiom, not a workaround.
 *
 * The pointer is read from ScenePointerContext, not r3f's `state.pointer`:
 * the canvas never receives pointer events (it sits under a
 * `pointer-events-none` layer with the page content above it), so
 * `state.pointer` is permanently (0,0).
 */

import { useContext, useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { TubeStrip } from './TubeStrip';
import { sceneAccentRun, SCENE_ACCENT_RUNS } from './palette';
import { ScenePointerContext } from '../../hooks/useScenePointer';
import { useSceneAmbient } from './useSceneAmbient';

type Props = {
  /** How many tubes to draw. */
  count?: number;
  /** Control points per tube. More points = smoother bend, more CPU. */
  segments?: number;
  /** Cross-section resolution. */
  radialSegments?: number;
  radius?: number;
  /** Overall intensity, 0–1. The scene is a backdrop; this stays low. */
  opacity?: number;
  /** Which rotation of the six accents to start on. */
  paletteOffset?: number;
  /**
   * How hard each point chases the one ahead of it. Lower = longer, lazier
   * trail. This is the single knob that defines the "whip" feel.
   */
  follow?: number;
  /** Scene depth. Negative sits behind the particle field. */
  z?: number;
  /** Incremented on chat send to pulse the tubes, like the particle shockwave. */
  impulse?: number;
  /**
   * Glow points per tube in the faked "riding lights" layer. These are samples
   * along the tube's spine, not a mesh, so the cost is one point per sample and
   * one draw call for the whole bundle.
   */
  glowSamples?: number;
  /**
   * Glow radius in WORLD units — the shader turns it into a point size with a
   * perspective divide, so it scales with the canvas the way the tubes do
   * instead of being a fixed pixel count.
   */
  glowSize?: number;
  /** Glow brightness, 0–1. The scene is a backdrop; this stays low. */
  glowIntensity?: number;
};

/** Scratch objects. The frame loop must not allocate. */
const _target = new THREE.Vector3();

// Exported so a test can assert the two stages agree on their varyings. A
// mismatch is a shader COMPILE error, and a failed program makes three drop
// the material silently — the tubes simply never appear, with no exception.
export const NEON_TUBES_VERT = /* glsl */ `
  attribute float aParam;
  varying float vParam;
  varying vec3 vNormalView;
  varying vec3 vViewDir;

  void main() {
    vParam = aParam;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vNormalView = normalize(normalMatrix * normal);
    vViewDir = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;

export const NEON_TUBES_FRAG = /* glsl */ `
  precision highp float;

  uniform vec3  uColorA;
  uniform vec3  uColorB;
  uniform vec3  uColorC;
  uniform float uTime;
  uniform float uOpacity;
  uniform float uImpulse;

  // Must match the vertex shader's varyings exactly: an undeclared identifier
  // here is a shader COMPILE error, which fails the whole material rather than
  // degrading. Nothing in the app surfaced it, because a failed program makes
  // three fall back to a silently non-rendering material.
  varying float vParam;
  varying vec3 vNormalView;
  varying vec3 vViewDir;

  void main() {
    // Fresnel rim: brightest where the surface turns away from the eye. This
    // is what reads as a glowing tube rather than a flat coloured band.
    float fres = pow(1.0 - abs(dot(normalize(vNormalView), normalize(vViewDir))), 2.2);

    // Colour ramp along the tube's length, so each tube carries a gradient
    // rather than one flat hue.
    vec3 col = vParam < 0.5
      ? mix(uColorA, uColorB, vParam * 2.0)
      : mix(uColorB, uColorC, (vParam - 0.5) * 2.0);

    // A slow travelling highlight so the tube reads as moving even when the
    // pointer is still.
    float travel = 0.5 + 0.5 * sin((vParam * 6.0 - uTime * 0.5) * 3.14159);

    float a = (0.12 + fres * 0.88) * uOpacity;
    a *= 1.0 + uImpulse * 1.4;
    if (a < 0.002) discard;

    gl_FragColor = vec4(col * (0.55 + fres * 0.9 + travel * 0.18), a);
  }
`;

/**
 * The "riding tube lights" layer.
 *
 * The reference lit this scene with real three.js lights
 * (`lights: { intensity: 200, colors: [...] }`). That CANNOT be ported as a
 * `<pointLight>`: three.js lights only contribute to lit materials, and this
 * scene has none — every surface is an unlit `ShaderMaterial`. A real light
 * would compile, mount, and change nothing on screen.
 *
 * So the illumination is faked additively with point sprites that ride the same
 * spines the ribbons are built from. That is the scene's own idiom (the
 * particle field is the same trick), it costs ONE draw call for the whole
 * bundle, and it needs no light object at all.
 *
 * Exported for the same reason the tube shaders are: a varying or uniform that
 * is declared in one stage and not the other is a COMPILE error, and a failed
 * program makes three drop the material SILENTLY — the glow just never appears.
 */
export const NEON_TUBES_GLOW_VERT = /* glsl */ `
  attribute float aParam;
  attribute float aTube;

  uniform float uSize;
  uniform float uViewportH;

  varying float vParam;
  varying float vTube;

  void main() {
    vParam = aParam;
    vTube = aTube;

    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    float depth = max(-mv.z, 0.001);

    // World-space radius -> pixels, via the projection's y scale and a
    // perspective divide. Deliberately no derivative builtins (fwidth / dFdx):
    // those need the derivatives extension and silently took the whole
    // FloorGrid offline on WebGL1, so edge softness is a uniform instead.
    gl_PointSize = max(
      1.0,
      uSize * uViewportH * 0.5 * projectionMatrix[1][1] / depth
    );
    gl_Position = projectionMatrix * mv;
  }
`;

export const NEON_TUBES_GLOW_FRAG = /* glsl */ `
  precision highp float;

  uniform vec3  uColorA;
  uniform vec3  uColorB;
  uniform vec3  uColorC;
  uniform float uTime;
  uniform float uIntensity;
  uniform float uImpulse;

  // Must match the vertex shader's varyings exactly — see NEON_TUBES_FRAG.
  varying float vParam;
  varying float vTube;

  void main() {
    // Soft radial falloff, squared for a tight core and a long skirt. Point
    // sprites give this for free, and it costs no derivative builtin.
    float d = length(gl_PointCoord - vec2(0.5));
    float falloff = max(0.0, 1.0 - d * 2.0);
    falloff *= falloff;
    if (falloff < 0.002) discard;

    // Same two-stage ramp shape as the tube ribbon, but over the LIGHT
    // palette, which is rotated one step away from the tube's (see
    // glowAccentRun). Sharing the tube ramp made the glow read as a brighter
    // tube instead of as light falling on the scene.
    vec3 col = vParam < 0.5
      ? mix(uColorA, uColorB, vParam * 2.0)
      : mix(uColorB, uColorC, (vParam - 0.5) * 2.0);

    // Each tube sits further along the light palette, so the bundle does not
    // read as one flat wash.
    col = mix(col, uColorC, clamp(vTube, 0.0, 1.0) * 0.35);

    // Brighter at the head, fading to the tail: the ribbon has the same
    // gradient, so light and tube travel together.
    float head = 0.45 + 0.55 * (1.0 - vParam);
    float shimmer = 0.85 + 0.15 * sin(vParam * 6.0 - uTime * 0.5);

    float a = falloff * head * shimmer * uIntensity;
    a *= 1.0 + uImpulse * 1.4;

    // Additive, so the colour is premultiplied into the rgb as well: an
    // additive blend ignores dst alpha, and writing colour alone would make
    // the sprite read as a flat disc instead of a glowing haze.
    gl_FragColor = vec4(col * a, a);
  }
`;

/**
 * How far the LIGHT palette is rotated relative to the TUBE palette.
 *
 * One step, not a separate palette: the lights must read as belonging to the
 * same scene, but if they share the tube's hues exactly the glow just looks
 * like a brighter tube. Rotating by one accent of the six keeps them related
 * and distinct, and it costs nothing — it is the same `sceneAccentRun`
 * rotation the tube already uses, moved by one index.
 */
export const GLOW_PALETTE_ROTATION = 1;

/** The light palette: the tube's run, rotated by one accent. */
export function glowAccentRun(paletteOffset: number, count = 3): string[] {
  const tubeStart = paletteOffset % SCENE_ACCENT_RUNS;
  return sceneAccentRun(tubeStart + GLOW_PALETTE_ROTATION, count);
}

/** Points in the glow cloud: `samplesPerTube` for each of `tubeCount` tubes. */
export function glowPointCount(
  tubeCount: number,
  samplesPerTube: number,
): number {
  return Math.max(0, tubeCount) * Math.max(0, samplesPerTube);
}

/**
 * Copies `samples` evenly-spaced points from `spine` into `out` at `outOffset`.
 *
 * Pure and allocation-free, exported so a test can assert the glow really does
 * ride the spine without needing a WebGL context. The frame loop calls this
 * INSIDE the same useFrame that advances the spine, so it reads the already
 * updated values and the two can never disagree by a frame.
 */
export function writeGlowSamples(
  spine: Float32Array,
  segments: number,
  out: Float32Array,
  outOffset: number,
  samples: number,
): void {
  const last = Math.max(1, samples - 1);
  for (let j = 0; j < samples; j++) {
    // Fractional index along the spine, so the glow is smooth even when there
    // are far fewer samples than control points.
    const f = (j / last) * segments;
    const s0 = Math.min(segments, Math.floor(f));
    const s1 = Math.min(segments, s0 + 1);
    const frac = f - s0;
    const a = s0 * 3;
    const b = s1 * 3;
    const o = outOffset + j * 3;
    out[o] = spine[a] + (spine[b] - spine[a]) * frac;
    out[o + 1] = spine[a + 1] + (spine[b + 1] - spine[a + 1]) * frac;
    out[o + 2] = spine[a + 2] + (spine[b + 2] - spine[a + 2]) * frac;
  }
}

export default function NeonTubes({
  count = 3,
  segments = 48,
  radialSegments = 8,
  radius = 0.09,
  opacity = 0.5,
  paletteOffset = 0,
  follow = 0.12,
  z = -2,
  impulse = 0,
  glowSamples = 24,
  glowSize = 0.5,
  glowIntensity = 0.45,
}: Props) {
  const pulse = useRef(0);
  const pointer = useContext(ScenePointerContext);
  const ambient = useSceneAmbient();

  // ONE material instance shared by every tube, so the frame loop writes the
  // uniforms once rather than per mesh. Built imperatively instead of as a
  // JSX child because a single `ref` across N <shaderMaterial> elements only
  // ever holds the last one, which would silently leave the others unwritten.
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: NEON_TUBES_VERT,
        fragmentShader: NEON_TUBES_FRAG,
        uniforms: {
          uColorA: { value: new THREE.Color() },
          uColorB: { value: new THREE.Color() },
          uColorC: { value: new THREE.Color() },
          uTime: { value: 0 },
          uOpacity: { value: opacity },
          uImpulse: { value: 0 },
        },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      }),
    // `opacity` is pushed in an effect below rather than here, so a change to
    // it must not rebuild the material and drop the compiled program.

    [],
  );

  useEffect(() => () => material.dispose(), [material]);

  // The glow's material, separate from the tube's: the two read different
  // palettes, and a shader material's uniforms are baked per material, so
  // sharing one instance would force the tube to be lit with the light ramp.
  // Same `useMemo(..., [])` discipline — never a ref effect, because r3f's
  // material ref is null on the first effect pass.
  const glowMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: NEON_TUBES_GLOW_VERT,
        fragmentShader: NEON_TUBES_GLOW_FRAG,
        uniforms: {
          uColorA: { value: new THREE.Color() },
          uColorB: { value: new THREE.Color() },
          uColorC: { value: new THREE.Color() },
          uSize: { value: glowSize },
          uViewportH: { value: 0 },
          uTime: { value: 0 },
          uIntensity: { value: glowIntensity },
          uImpulse: { value: 0 },
        },
        transparent: true,
        // Additive + no depth write: the glow lifts the background and can
        // never occlude the tube ribbons it is riding along, nor write depth
        // that would make them disappear behind it.
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    // `glowSize` / `glowIntensity` are pushed in an effect below, so a change
    // to either must not rebuild the material and drop the compiled program.

    [],
  );

  useEffect(() => () => glowMaterial.dispose(), [glowMaterial]);

  useEffect(() => {
    glowMaterial.uniforms.uSize.value = glowSize;
    glowMaterial.uniforms.uIntensity.value = glowIntensity;
  }, [glowMaterial, glowSize, glowIntensity]);

  useEffect(() => {
    if (impulse > 0) pulse.current = 1;
  }, [impulse]);

  // One spine + one strip per tube, allocated once, ALONG WITH the glow's
  // position buffer. The spine array is mutated in place every frame; the
  // strip rewrites its vertex buffers from it and the glow cloud copies
  // samples out of it.
  const { tubes, glow } = useMemo(() => {
    const list = Array.from({ length: count }, (_, tubeIndex) => {
      const spine = new Float32Array((segments + 1) * 3);
      // Seed each tube on its own arc so they do not start stacked on the
      // origin and visibly snap apart on the first frame.
      const phase = (tubeIndex / count) * Math.PI * 2;
      for (let s = 0; s <= segments; s++) {
        const t = s / segments;
        spine[s * 3] = (t - 0.5) * 6 * Math.cos(phase);
        spine[s * 3 + 1] = (t - 0.5) * 4 * Math.sin(phase);
        spine[s * 3 + 2] = (t - 0.5) * 2;
      }
      return {
        spine,
        // Second buffer for the smoothing pass. A chain of lerps toward the
        // previous point converges to a piecewise-linear shape with a visible
        // corner at every joint, which renders as a faceted tube. One
        // neighbour-average pass per frame turns that back into a curve.
        // Allocated here, once, alongside the spine.
        scratch: new Float32Array((segments + 1) * 3),
        strip: new TubeStrip(segments, radialSegments, radius, spine),
        // Per-tube lateral offset, so the bundle spreads rather than stacking.
        offset: new THREE.Vector3(
          Math.cos(phase) * 1.6,
          Math.sin(phase) * 1.2,
          (tubeIndex - (count - 1) / 2) * 0.8,
        ),
        // Phase for the idle orbit, so neighbouring tubes do not breathe in
        // lockstep and read as a single rigid object.
        drift: phase,
      };
    });

    // The glow cloud: ONE geometry for the whole bundle, so the whole layer is
    // a single draw call. Its position Float32Array is allocated here, once,
    // for the same reason TubeStrip exists — the frame loop must not allocate.
    const pointCount = glowPointCount(count, glowSamples);
    const positions = new Float32Array(pointCount * 3);
    // Static per-point data: where along its tube the sample sits (the colour
    // ramp + head/tail gradient) and which tube it belongs to. Neither changes
    // per frame, so both are filled once and never touched again.
    const params = new Float32Array(pointCount);
    const tubeIndex = new Float32Array(pointCount);
    for (let j = 0; j < pointCount; j++) {
      const tube = Math.floor(j / glowSamples);
      const along = glowSamples > 1 ? (j % glowSamples) / (glowSamples - 1) : 0;
      params[j] = along;
      tubeIndex[j] = count > 1 ? tube / (count - 1) : 0;
    }
    // Seed from the spines so the very first painted frame is already a glow
    // along each tube rather than a bright blob stacked on the origin.
    for (let i = 0; i < list.length; i++) {
      writeGlowSamples(
        list[i].spine,
        segments,
        positions,
        i * glowSamples * 3,
        glowSamples,
      );
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aParam', new THREE.BufferAttribute(params, 1));
    geometry.setAttribute('aTube', new THREE.BufferAttribute(tubeIndex, 1));
    // Fixed and generous, same reasoning as TubeStrip: the tubes whip across
    // the whole frustum and a recomputed bound pops as the spine moves.
    geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 60);

    return {
      tubes: list,
      glow: {
        geometry,
        positions,
        positionAttr: geometry.getAttribute(
          'position',
        ) as THREE.BufferAttribute,
      },
    };
  }, [count, segments, radialSegments, radius, glowSamples]);

  useEffect(() => {
    return () => {
      tubes.forEach((t) => t.strip.dispose());
      glow.geometry.dispose();
    };
  }, [tubes, glow]);

  useEffect(() => {
    material.uniforms.uOpacity.value = opacity;
  }, [material, opacity]);

  // Resolve the token palette into the uniforms. Re-runs only when the caller
  // changes the rotation, never per frame.
  useEffect(() => {
    const [a, b, c] = sceneAccentRun(paletteOffset % SCENE_ACCENT_RUNS, 3);
    material.uniforms.uColorA.value.set(a);
    material.uniforms.uColorB.value.set(b);
    material.uniforms.uColorC.value.set(c);
  }, [material, paletteOffset]);

  // The LIGHT palette: the same six token accents, rotated one step away from
  // the tube's run. Resolved from :root like everything else — never a
  // `Math.random()` hex, which would put the glow outside the design system.
  useEffect(() => {
    const [a, b, c] = glowAccentRun(paletteOffset, 3);
    glowMaterial.uniforms.uColorA.value.set(a);
    glowMaterial.uniforms.uColorB.value.set(b);
    glowMaterial.uniforms.uColorC.value.set(c);
  }, [glowMaterial, paletteOffset]);

  useFrame((state, delta) => {
    const u = material.uniforms;
    const gu = glowMaterial.uniforms;
    u.uTime.value = state.clock.elapsedTime;
    gu.uTime.value = state.clock.elapsedTime;
    if (pulse.current > 0) {
      pulse.current = Math.max(0, pulse.current - delta / 0.9);
      u.uImpulse.value = pulse.current;
      gu.uImpulse.value = pulse.current;
    }

    // Drawing-buffer height, for turning the glow's world-space radius into a
    // pixel point size. Read defensively: there is no `size` on the very first
    // headless mount (SSR/tests), and a stale-but-finite value keeps the
    // shader's divide well-defined instead of writing NaN into a uniform.
    const bufferHeight = state.size?.height ?? 0;
    if (bufferHeight > 0) {
      gu.uViewportH.value = bufferHeight * (state.viewport.dpr ?? 1);
    }

    // Map the normalised pointer into the tube's local space.
    const halfH = state.viewport.height * 0.5;
    const halfW = state.viewport.width * 0.5;
    const p = pointer.current;
    _target.set(p.x * halfW, p.y * halfH, 0);

    // Frame-rate independence. A raw `x += (target - x) * follow` is a
    // per-FRAME step, so on a 120Hz display the tubes move at double speed and
    // on a 144Hz one at nearly triple. Converting to a continuous rate with
    // `1 - (1 - k)^(dt*60)` makes the motion identical at any refresh rate.
    const k = 1 - Math.pow(1 - follow, delta * 60);

    // Scale the arc to the viewport so a tube spans a similar fraction of the
    // frame on a phone and on a desktop, rather than being invisible on a small
    // screen and running off the edges on a large one.
    const spread = Math.min(halfW, halfH) * 1.5;

    // Indexed because each tube's glow samples land in its own slice of the
    // shared position buffer.
    for (let i = 0; i < tubes.length; i++) {
      const tube = tubes[i];
      const { spine, scratch, offset, drift } = tube;
      const last = segments; // index of the final control point

      // A slow idle orbit, so the tubes are alive before the pointer has ever
      // moved and on touch devices where there is no hover at all.
      //
      // The orbit WIDENS as the visitor goes quiet. The bundle is the layer
      // people notice most, and a fixed-amplitude orbit parked under a reading
      // cursor is the least interesting thing it can do; opening it up while
      // nobody is driving it gives the resting scene something to watch without
      // touching the engaged behaviour at all (at presence 1 the multiplier is
      // exactly 1.0, i.e. the orbit this had before). Bounded well short of the
      // frustum edges so it still reads as tubes rather than as spill.
      const t = state.clock.elapsedTime;
      const orbit = 1 + (1 - ambient.presence) * 0.5;
      const ox = Math.cos(t * 0.21 + drift) * 1.1 * orbit;
      const oy = Math.sin(t * 0.17 + drift) * 0.8 * orbit;

      // Head point chases the pointer directly.
      spine[0] += (_target.x + offset.x + ox - spine[0]) * k;
      spine[1] += (_target.y + offset.y + oy - spine[1]) * k;
      spine[2] += (_target.z + offset.z - spine[2]) * k;

      // Every point chases the SAME moving target — the pointer, offset per
      // tube — at a rate that decays along the tube. Fast head, lazy tail, and
      // the trail is exactly the delay gradient between them.
      //
      // Two earlier versions both failed, and the reasons are the whole
      // subtlety of this effect:
      //
      //   - Chaining "each point follows the one in front of it" makes the
      //     whole chain collapse onto the head, so the tube shrinks to a dot
      //     that rides the cursor instead of trailing behind it.
      //   - Letting the rate reach zero at the tail freezes the last points
      //     permanently, and they then drag the rest of the chain off with
      //     them — the bundle parks in a corner and ignores the pointer.
      //
      // So the rate decays but never hits zero, and every point converges on
      // the pointer rather than on its neighbour.
      for (let s = 1; s <= last; s++) {
        const t01 = s / last;
        // Decays from ~1 at the head to ~0.18 at the tail. Never zero.
        const ks = k * (1 - t01 * 0.82);
        const i3 = s * 3;

        // The anchor slides along a fixed direction as s increases, so the
        // points line up into a long streak instead of piling on one spot.
        spine[i3] +=
          (_target.x + offset.x + ox - t01 * spread - spine[i3]) * ks;
        spine[i3 + 1] +=
          (_target.y + offset.y + oy - t01 * spread * 0.55 - spine[i3 + 1]) *
          ks;
        spine[i3 + 2] += (offset.z - t01 * 1.5 - spine[i3 + 2]) * ks;
      }

      // One smoothing pass: each point moves a fraction of the way toward the
      // average of its two neighbours. This is what turns the chain's
      // piecewise-linear shape into an actual curve — without it the tube
      // renders visibly faceted, because the ring at every joint sits at a
      // different angle to its neighbour. Applied AFTER the follow so the
      // lag gradient is preserved, and at a strength low enough that the whip
      // still reads.
      for (let s = 1; s < last; s++) {
        const c = s * 3;
        const p = (s - 1) * 3;
        const n = (s + 1) * 3;
        scratch[c] = spine[c] + ((spine[p] + spine[n]) * 0.5 - spine[c]) * 0.5;
        scratch[c + 1] =
          spine[c + 1] +
          ((spine[p + 1] + spine[n + 1]) * 0.5 - spine[c + 1]) * 0.5;
        scratch[c + 2] =
          spine[c + 2] +
          ((spine[p + 2] + spine[n + 2]) * 0.5 - spine[c + 2]) * 0.5;
      }
      for (let s = 1; s < last; s++) {
        const c = s * 3;
        spine[c] = scratch[c];
        spine[c + 1] = scratch[c + 1];
        spine[c + 2] = scratch[c + 2];
      }

      tube.strip.update();

      // The glow samples come off the spine AFTER the follow and smoothing
      // passes, so the light is always exactly on the tube it lights — reading
      // it before the smoothing would leave the glow a frame behind on the
      // curve. Allocation-free: the destination buffer was sized in the memo.
      writeGlowSamples(
        spine,
        segments,
        glow.positions,
        i * glowSamples * 3,
        glowSamples,
      );
    }

    // ONE upload for the whole bundle, rather than one per tube.
    glow.positionAttr.needsUpdate = true;
  });

  return (
    <group position={[0, 0, z]}>
      {tubes.map((tube, i) => (
        <mesh
          key={i}
          geometry={tube.strip.geometry}
          material={material}
          frustumCulled={false}
        />
      ))}
      {/* The faked "riding tube lights": one additive point cloud for the
          whole bundle, sharing this group's transform so the light sits on the
          tubes. It is drawn after the ribbons, and it writes no depth, so it
          lifts them rather than covering them. */}
      <points
        geometry={glow.geometry}
        material={glowMaterial}
        frustumCulled={false}
      />
    </group>
  );
}
