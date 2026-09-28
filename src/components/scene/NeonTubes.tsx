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
}: Props) {
  const pulse = useRef(0);
  const pointer = useContext(ScenePointerContext);

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

  useEffect(() => {
    if (impulse > 0) pulse.current = 1;
  }, [impulse]);

  // One spine + one strip per tube, allocated once. The spine array is mutated
  // in place every frame; the strip rewrites its vertex buffers from it.
  const tubes = useMemo(() => {
    return Array.from({ length: count }, (_, tubeIndex) => {
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
  }, [count, segments, radialSegments, radius]);

  useEffect(() => {
    return () => {
      tubes.forEach((t) => t.strip.dispose());
    };
  }, [tubes]);

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

  useFrame((state, delta) => {
    const u = material.uniforms;
    u.uTime.value = state.clock.elapsedTime;
    if (pulse.current > 0) {
      pulse.current = Math.max(0, pulse.current - delta / 0.9);
      u.uImpulse.value = pulse.current;
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

    for (const tube of tubes) {
      const { spine, scratch, offset, drift } = tube;
      const last = segments; // index of the final control point

      // A slow idle orbit, so the tubes are alive before the pointer has ever
      // moved and on touch devices where there is no hover at all.
      const t = state.clock.elapsedTime;
      const ox = Math.cos(t * 0.21 + drift) * 1.1;
      const oy = Math.sin(t * 0.17 + drift) * 0.8;

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
    }
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
    </group>
  );
}
