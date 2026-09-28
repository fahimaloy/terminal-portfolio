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
 * ParallaxRig — damps the whole scene group toward the pointer. Gives depth
 * on every device without needing a scroll event.
 *
 * Reads the scene pointer rather than r3f's `state.pointer`. The canvas sits
 * under a `pointer-events-none` layer with the page content above it, so it
 * never receives a pointer event and `state.pointer` is permanently (0,0) —
 * this rig was doing nothing at all. See useScenePointer.
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

  useFrame(() => {
    const g = groupRef.current;
    if (!g) return;
    const tx = -pointer.current.y * strength * 0.12;
    const ty = pointer.current.x * strength * 0.16;
    g.rotation.x += (tx - g.rotation.x) * 0.045;
    g.rotation.y += (ty - g.rotation.y) * 0.045;
  });

  return <group ref={groupRef}>{children}</group>;
}
