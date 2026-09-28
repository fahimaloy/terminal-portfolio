/**
 * FloorGrid — a shader-drawn perspective floor.
 *
 * This is what makes the scene read as *3D space* rather than floating dots:
 * the grid converges at a vanishing point and a pulse ring travels along it,
 * giving the eye a horizon to measure the particles against.
 */

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { scenePrimary } from './palette';

type Props = {
  color?: string;
  /** Overall intensity — blog runs dimmer than the landing hero. */
  opacity?: number;
  y?: number;
  size?: number;
  /** Same trigger the particle field uses; the ring decays in lockstep. */
  impulse?: number;
};

const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAG = /* glsl */ `
  precision highp float;
  uniform vec3  uColor;
  uniform float uTime;
  uniform float uOpacity;
  uniform float uImpulse;
  varying vec2 vUv;

  // Line mask with a constant width. An fwidth() call would need the
  // derivatives extension on WebGL1 and fails to link on some drivers, which
  // silently took the entire floor offline.
  float gridLine(float coord, float width) {
    float d = abs(fract(coord) - 0.5);
    return 1.0 - smoothstep(0.5 - width, 0.5, d);
  }

  void main() {
    // Perspective foreshortening: the far edge compresses toward the horizon.
    float z = vUv.y;
    float scale = mix(1.0, 26.0, pow(z, 1.6));

    float gx = gridLine(vUv.x * scale, 0.04);
    float gz = gridLine(z * 9.0, 0.05);
    float grid = max(gx, gz * 0.75);

    // Fade both edges: the near edge would otherwise stack into a bright band
    // across the bottom of the viewport, and the far edge must meet the horizon.
    float fade = smoothstep(0.02, 0.42, z) * (1.0 - smoothstep(0.55, 0.95, z));
    float edge = smoothstep(0.0, 0.14, vUv.x) * (1.0 - smoothstep(0.86, 1.0, vUv.x));

    // A pulse ring travelling down the floor, plus one on each message impulse.
    float ring = smoothstep(0.06, 0.0, abs(z - fract(uTime * 0.08)));
    ring += smoothstep(0.10, 0.0, abs(z - uImpulse)) * 1.6;

    float a = (grid * 0.55 + ring * grid * 0.9) * fade * edge * uOpacity;
    if (a < 0.002) discard;
    gl_FragColor = vec4(uColor, a);
  }
`;

export default function FloorGrid({
  color = scenePrimary(''),
  opacity = 0.5,
  y = -6,
  size = 60,
  impulse = 0,
}: Props) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const ring = useRef(0);

  useEffect(() => {
    if (impulse > 0) ring.current = 1;
  }, [impulse]);

  const uniforms = useMemo(
    () => ({
      uColor: { value: new THREE.Color(color) },
      uTime: { value: 0 },
      uOpacity: { value: opacity },
      uImpulse: { value: 0 },
    }),
    [color, opacity],
  );

  useFrame((state, delta) => {
    const mat = materialRef.current;
    if (!mat) return;
    mat.uniforms.uTime.value = state.clock.elapsedTime;
    if (ring.current > 0) {
      ring.current = Math.max(0, ring.current - delta / 0.9);
      mat.uniforms.uImpulse.value = ring.current;
    }
  });

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, y, 0]}>
      <planeGeometry args={[size, size, 1, 1]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={VERT}
        fragmentShader={FRAG}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}
