// token-lint-ignore -- Entire file uses Three.js with raw colors; will be replaced with premium SVG-based system
import { Suspense, useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { PointMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { isReducedMotion, canAnimate } from '../../config/animations';
import ParticleFieldSVG from './graphics/primitives/ParticleFieldSVG';

// Floating particles in 3D space — code-like glyphs
function CodeParticles() {
  const group = useRef<THREE.Group>(null!);
  const count = 32;

  useFrame((state) => {
    if (!group.current) return;
    const t = state.clock.getElapsedTime();
    group.current.rotation.y = t * 0.05;
    group.current.rotation.x = Math.sin(t * 0.1) * 0.1;
    group.current.children.forEach((child, i) => {
      if (child instanceof THREE.Mesh) {
        const offset = (i / count) * Math.PI * 2;
        child.position.y = Math.sin(t + offset) * 0.3;
        child.position.x = Math.cos(t * 0.7 + offset) * 0.2;
        const scale = 0.8 + Math.sin(t * 2 + offset) * 0.2;
        child.scale.set(scale, scale, scale);
      }
    });
  });

  return (
    <group ref={group} position={[0, 0, 0]}>
      {Array.from({ length: count }, (_, i) => (
        <mesh
          key={i}
          position={[
            (Math.random() - 0.5) * 3,
            (Math.random() - 0.5) * 1.5,
            (Math.random() - 0.5) * 2,
          ]}
        >
          <sphereGeometry args={[0.02, 8, 8]} />
          <PointMaterial
            color="#26f2d5" // token-lint-ignore
            size={0.05}
            sizeAttenuation
            transparent
            opacity={0.6}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ))}
    </group>
  );
}

// Subtle floating monitor stand (abstract)
function MonitorStand() {
  return (
    <group position={[-1.8, -0.8, 0]}>
      <mesh>
        <boxGeometry args={[0.6, 0.04, 0.4]} />
        <meshStandardMaterial
          color="#353432" /* token-lint-ignore */
          roughness={0.8}
          metalness={0.1}
        />
      </mesh>
      <mesh>
        <cylinderGeometry args={[0.06, 0.06, 0.8, 8]} />
        <meshStandardMaterial
          color="#3f3e3d" /* token-lint-ignore */
          roughness={0.7}
          metalness={0.2}
        />
      </mesh>
      <mesh position={[0, -0.42, 0]}>
        <cylinderGeometry args={[0.3, 0.3, 0.04, 16]} />
        <meshStandardMaterial
          color="#353432" /* token-lint-ignore */
          roughness={0.8}
          metalness={0.1}
        />
      </mesh>
    </group>
  );
}

// Floating keyboard tray (minimal)
function KeyboardTray() {
  return (
    <group position={[1.2, -0.9, -0.3]}>
      <mesh>
        <boxGeometry args={[0.8, 0.03, 0.3]} />
        <meshStandardMaterial
          color="#252423" /* token-lint-ignore */
          roughness={0.9}
          metalness={0}
        />
      </mesh>
      <group>
        {Array.from({ length: 3 }, (_, row) =>
          Array.from({ length: 10 }, (_, col) => (
            <mesh
              key={`${row}-${col}`}
              position={[-0.35 + col * 0.078, 0.02, -0.1 + row * 0.078]}
              rotation={[-0.1, 0, 0]}
            >
              <boxGeometry args={[0.05, 0.015, 0.05]} />
              <meshStandardMaterial
                color="#3f3e3d" /* token-lint-ignore */
                roughness={0.6}
                metalness={0.1} /* token-lint-ignore */
              />
            </mesh>
          )),
        )}
      </group>
    </group>
  );
}

// Main workspace scene
function Workspace() {
  return (
    <>
      <ambientLight intensity={0.4} color="#f6f4f2" /* token-lint-ignore */ />
      <directionalLight
        position={[2, 4, 3]}
        intensity={0.6}
        color="#f6f4f2" /* token-lint-ignore */
      />
      <pointLight
        position={[-2, 2, 2]}
        intensity={0.3}
        color="#26f2d5" /* token-lint-ignore */
        decay={2}
      />
      <CodeParticles />
      <MonitorStand />
      <KeyboardTray />
    </>
  );
}

// Canvas wrapper with WebGL detection and fallback
export default function WorkspaceCanvas() {
  const [useFallback, setUseFallback] = useState(false);
  const [webglSupported, setWebglSupported] = useState(true);
  const [webglFailed, setWebglFailed] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Determine if we should use fallback (reduced motion or no animation)
  useEffect(() => {
    const reduced = isReducedMotion();
    const animateEnabled = canAnimate();
    setUseFallback(reduced || !animateEnabled);
  }, []);

  // Check WebGL support
  useEffect(() => {
    if (useFallback) return;

    const canvas = document.createElement('canvas');
    const gl =
      canvas.getContext('webgl', { failIfMajorPerformanceCaveat: false }) ||
      canvas.getContext('experimental-webgl', {
        failIfMajorPerformanceCaveat: false,
      });
    if (!gl) {
      setWebglSupported(false);
      setWebglFailed(true);
      return;
    }

    // Also check if we're in a sandboxed environment that blocks WebGL
    // by attempting to create a WebGL context on a real canvas
    try {
      const testCanvas = document.createElement('canvas');
      const testGl = testCanvas.getContext('webgl2', {
        alpha: true,
        failIfMajorPerformanceCaveat: false,
      });
      if (!testGl) {
        setWebglSupported(false);
        setWebglFailed(true);
      }
    } catch {
      setWebglSupported(false);
      setWebglFailed(true);
    }
  }, [useFallback]);

  // If WebGL is not supported or failed, or reduced motion, render SVG fallback
  if (useFallback || !webglSupported || webglFailed) {
    return (
      <ParticleFieldSVG
        particleCount={60}
        accent="cyan"
        opacity={0.25}
        className="absolute inset-0 -z-10"
      />
    );
  }

  return (
    <Canvas
      ref={canvasRef}
      camera={{ position: [0, 0, 4], fov: 50 }}
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 1,
      }}
      gl={{
        antialias: true,
        alpha: true,
      }}
      frameloop={useFallback ? 'demand' : 'always'}
      onCreated={({ gl }) => {
        // Handle context loss
        gl.canvas.addEventListener('webglcontextlost', (event: Event) => {
          event.preventDefault();
          setWebglFailed(true);
        });
      }}
    >
      <Suspense fallback={null}>
        <Workspace />
      </Suspense>
    </Canvas>
  );
}
