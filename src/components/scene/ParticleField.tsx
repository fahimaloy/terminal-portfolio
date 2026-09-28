/**
 * ParticleField — the GPU particle volume behind the whole site.
 *
 * One draw call: a single THREE.Points with a custom ShaderMaterial. Drift,
 * pointer repulsion, the chat message shockwave and the accent colour mix all
 * happen in the vertex shader, so the per-frame CPU cost is a few uniform
 * writes regardless of particle count.
 */

import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useContext } from 'react';
import { ScenePointerContext } from '../../hooks/useScenePointer';

import { SCENE_ACCENTS } from './palette';

type Props = {
  count: number;
  /** 0–1. Blog sits low; the landing hero runs brighter. */
  opacity?: number;
  /** Base point size in px, before perspective attenuation. */
  size?: number;
  palette: [string, string, string];
  bounds?: [number, number, number];
  /**
   * Increment this to fire a shockwave through the field — the chat layer
   * bumps it on send/receive. The value is only a trigger; ParticleField
   * decays the animation itself.
   */
  impulse?: number;
};

/** Stable module constants: array literals in props/defaults are new objects
 *  on every render, and they feed the geometry + uniform memos. */
const DEFAULT_BOUNDS: [number, number, number] = [16, 12, 12];
const SCRATCH_POINTER = new THREE.Vector2();

const VERT = /* glsl */ `
  uniform float uTime;
  uniform vec2  uPointer;
  uniform float uImpulse;
  uniform float uSize;
  attribute float aSeed;
  attribute float aScale;
  attribute float aAccent;
  varying float vAccent;
  varying float vFade;

  void main() {
    vAccent = aAccent;
    vec3 p = position;

    // Vertical drift, wrapped so the volume never empties or bunches up.
    float drift = mod(uTime * (0.06 + aSeed * 0.10) + aSeed * 40.0, 1.0);
    p.y = mix(-6.0, 6.0, drift);

    // Lateral sway, phase-offset per particle.
    p.x += sin(uTime * 0.24 + aSeed * 25.0) * 0.55;
    p.z += cos(uTime * 0.19 + aSeed * 17.0) * 0.55;

    // Pointer repulsion in the camera-facing plane.
    vec2 flatPos = vec2(p.x, p.y);
    float d = distance(flatPos, uPointer);
    float push = smoothstep(3.2, 0.0, d) * 1.6;
    p.xy += normalize(flatPos - uPointer + vec2(0.0001)) * push;

    // Message shockwave: an expanding ring pushes particles outward and
    // briefly over-brightens them.
    float ring = smoothstep(0.35, 0.0, abs(length(p.xy) - uImpulse * 9.0));
    p.xy += normalize(p.xy + vec2(0.0001)) * ring * 1.1;
    vFade = 1.0 + ring * 1.6;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uSize * aScale * (34.0 / -mv.z);
  }
`;

const FRAG = /* glsl */ `
  precision highp float;
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform vec3 uColorC;
  uniform float uOpacity;
  varying float vAccent;
  varying float vFade;

  void main() {
    // Soft radial falloff — a hard circular edge reads as noise, not light.
    vec2 uv = gl_PointCoord - 0.5;
    float r = length(uv);
    if (r > 0.5) discard;
    float alpha = smoothstep(0.5, 0.0, r);
    alpha *= alpha;

    vec3 col = vAccent < 0.5
      ? mix(uColorA, uColorB, vAccent * 2.0)
      : mix(uColorB, uColorC, (vAccent - 0.5) * 2.0);

    gl_FragColor = vec4(col, alpha * uOpacity * vFade);
  }
`;

export default function ParticleField({
  count,
  opacity = 1,
  size = 0.5,
  palette,
  bounds = DEFAULT_BOUNDS,
  impulse = 0,
}: Props) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const { viewport } = useThree();
  const pointer = useContext(ScenePointerContext);
  const ring = useRef(0);

  useEffect(() => {
    if (impulse > 0) ring.current = 1;
  }, [impulse]);

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const seed = new Float32Array(count);
    const scale = new Float32Array(count);
    const accent = new Float32Array(count);

    // Deterministic PRNG — the field must be identical on server and client.
    let s = 1337;
    const rand = () => {
      s = (s * 1664525 + 1013904223) % 4294967296;
      return s / 4294967296;
    };

    for (let i = 0; i < count; i++) {
      pos[i * 3] = (rand() - 0.5) * bounds[0];
      pos[i * 3 + 1] = (rand() - 0.5) * bounds[1];
      pos[i * 3 + 2] = (rand() - 0.5) * bounds[2];
      seed[i] = rand();
      scale[i] = 0.4 + rand() * 1.6;
      accent[i] = rand();
    }

    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    g.setAttribute('aScale', new THREE.BufferAttribute(scale, 1));
    g.setAttribute('aAccent', new THREE.BufferAttribute(accent, 1));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 40);
    return g;
  }, [count, bounds]);

  // Uniform values live in the memo rather than being pushed through the
  // material ref: the ref is null on the first effect pass, and r3f re-applies
  // the `uniforms` prop whenever the object identity changes.
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uPointer: { value: new THREE.Vector2(0, 0) },
      uImpulse: { value: 0 },
      uSize: { value: size },
      uOpacity: { value: opacity },
      uColorA: { value: new THREE.Color(palette[0]) },
      uColorB: { value: new THREE.Color(palette[1]) },
      uColorC: { value: new THREE.Color(palette[2]) },
    }),
    [palette, opacity, size],
  );
  useFrame((state, delta) => {
    const mat = materialRef.current;
    if (!mat) return;
    mat.uniforms.uTime.value = state.clock.elapsedTime;

    // Scratch vector, not a fresh one per frame: this runs 60–120x/s and the
    // previous `new THREE.Vector2(...)` was pure heap churn in the hot path.
    //
    // Pointer source is the scene pointer, NOT r3f's `state.pointer`. The
    // canvas never receives pointer events (it sits under a
    // `pointer-events-none` layer, with the content above it), so
    // `state.pointer` was frozen at the origin and this repulsion never ran.
    // See useScenePointer.
    SCRATCH_POINTER.set(
      pointer.current.x * viewport.width * 0.5,
      pointer.current.y * viewport.height * 0.5,
    );
    mat.uniforms.uPointer.value.lerp(SCRATCH_POINTER, 0.08);

    if (ring.current > 0) {
      ring.current = Math.max(0, ring.current - delta / 0.9);
      mat.uniforms.uImpulse.value = ring.current;
    }
  });

  return (
    <points geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        ref={materialRef}
        vertexShader={VERT}
        fragmentShader={FRAG}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
