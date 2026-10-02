/**
 * CoreObject — a faceted icosahedron with a fresnel rim, sitting far behind
 * the hero. It gives the particle volume a subject: without a solid mass for
 * the eye to land on, drifting points read as noise.
 */

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { scenePrimary, sceneRim } from './palette';
import { useContext } from 'react';
import { ScenePointerContext } from '../../hooks/useScenePointer';
import { idleAnchor, blendAnchor } from './ambient';
import { useSceneAmbient } from './useSceneAmbient';

type Props = {
  color?: string;
  rimColor?: string;
  radius?: number;
  position?: [number, number, number];
  speed?: number;
  opacity?: number;
};

const VERT = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vViewDir;
  varying float vHeight;

  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vViewDir = normalize(-mv.xyz);
    vHeight = position.y;
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAG = /* glsl */ `
  precision highp float;
  uniform vec3  uColor;
  uniform vec3  uRim;
  uniform float uTime;
  uniform float uOpacity;
  varying vec3 vNormal;
  varying vec3 vViewDir;
  varying float vHeight;

  void main() {
    // Fresnel: the rim lights up as the surface turns away from the eye.
    float fres = pow(1.0 - max(dot(normalize(vNormal), normalize(vViewDir)), 0.0), 2.4);

    // Facet shading from the face normal's Y component, so the polyhedron
    // reads as solid without any lights in the scene.
    float facet = vNormal.y * 0.5 + 0.5;
    float breathe = 0.85 + 0.15 * sin(uTime * 0.6 + vHeight * 2.0);

    vec3 col = mix(uColor, uRim, fres) * (0.35 + facet * 0.5) * breathe;
    float a = uOpacity * (0.16 + fres * 0.9);
    if (a < 0.002) discard;
    gl_FragColor = vec4(col, a);
  }
`;

export default function CoreObject({
  color = sceneRim(''),
  rimColor = scenePrimary(''),
  radius = 2.4,
  position = [0, 0, -14],
  speed = 0.08,
  opacity = 0.85,
}: Props) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const groupRef = useRef<THREE.Group>(null);

  const uniforms = useMemo(
    () => ({
      uColor: { value: new THREE.Color(color) },
      uRim: { value: new THREE.Color(rimColor) },
      uTime: { value: 0 },
      uOpacity: { value: opacity },
    }),
    [color, rimColor],
  );

  useFrame((state) => {
    const mat = materialRef.current;
    if (mat) mat.uniforms.uTime.value = state.clock.elapsedTime;
    const g = groupRef.current;
    if (!g) return;
    g.rotation.y = state.clock.elapsedTime * speed;
    g.rotation.x = Math.sin(state.clock.elapsedTime * speed * 0.6) * 0.16;
    g.position.y =
      position[1] + Math.sin(state.clock.elapsedTime * 0.35) * 0.35;
  });

  return (
    <group ref={groupRef} position={position}>
      <mesh>
        <icosahedronGeometry args={[radius, 1]} />
        <shaderMaterial
          ref={materialRef}
          vertexShader={VERT}
          fragmentShader={FRAG}
          uniforms={uniforms}
          transparent
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

/**
 * ParallaxRig — damps the whole scene group toward whatever is currently
 * driving it: the pointer while the visitor is using it, and a slow
 * wandering attract anchor once they have stopped.
 *
 * Reads the scene pointer rather than r3f's `state.pointer`. The canvas sits
 * under a `pointer-events-none` layer with the page content above it, so it
 * never receives a pointer event and `state.pointer` is permanently (0,0) —
 * this rig was doing nothing at all. See useScenePointer.
 *
 * ── Why an anchor and not just a decay ─────────────────────────────────────
 * The rig used to ease toward the pointer and stop there. That is a fine
 * response and a poor resting state: once the cursor parks, the scene parks
 * and the composition is frozen for as long as the visitor reads. So when
 * `presence` falls, the rig's target crosses over to `idleAnchor` — a pair of
 * incommensurate sine waves on a ~150s and ~370s period — and the whole scene
 * starts drifting through framings it has never been in before. That is what
 * makes a resting background watchable rather than merely alive: there is
 * always somewhere else for the composition to be.
 *
 * The two behaviours are blended by `presence` in `blendAnchor` rather than
 * switched, and this rig's own damp is what hides the handoff: the target can
 * move a long way between two frames when the pointer suddenly claims
 * authority, and the lerp absorbs that into a sweep instead of a cut.
 */
export function ParallaxRig({
  children,
  strength = 0.5,
}: {
  children: React.ReactNode;
  strength?: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const pointer = useContext(ScenePointerContext);
  const ambient = useSceneAmbient();
  // One allocation for the lifetime of the rig; never per frame. Two scratch
  // targets, because the anchor and the blended result are both needed.
  const scratch = useRef({
    anchor: { x: 0, y: 0 },
    target: { x: 0, y: 0 },
  });

  useFrame((state, delta) => {
    const g = groupRef.current;
    if (!g) return;
    const s = scratch.current;
    idleAnchor(s.anchor, ambient.time);
    blendAnchor(
      s.target,
      pointer.current.x,
      pointer.current.y,
      s.anchor.x,
      s.anchor.y,
      ambient.presence,
    );

    const tx = -s.target.y * strength * 0.12;
    const ty = s.target.x * strength * 0.16;
    // The original `* 0.045` was a per-FRAME step, so this rig tilted at
    // double speed on a 120Hz display and nearly triple on a 144Hz one — the
    // same class of bug NeonTubes documents. Converted to the repo's continuous
    // rate so the sweep reads identically at any refresh rate.
    const k = 1 - Math.pow(1 - 0.045, delta * 60);
    g.rotation.x += (tx - g.rotation.x) * k;
    g.rotation.y += (ty - g.rotation.y) * k;
  });

  return <group ref={groupRef}>{children}</group>;
}
