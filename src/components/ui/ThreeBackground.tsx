'use client';

import { useEffect, useRef, useState } from 'react';
import { isReducedMotion, canAnimate } from '../../config/animations';
import ParticleFieldSVG from './graphics/primitives/ParticleFieldSVG';
// @ts-ignore - three types incompatible with current TS version
import * as THREE_ from 'three';
const THREE = THREE_ as any;

interface ThreeBackgroundProps {
  className?: string;
  particleCount?: number;
  color?: string;
  size?: number;
  opacity?: number;
}

export default function ThreeBackground({
  className = '',
  particleCount = 800,
  color = 'var(--neon-cyan-alt)',
  size = 1.2,
  opacity = 0.35,
}: ThreeBackgroundProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<number | undefined>(undefined);
  const [webglFailed, setWebglFailed] = useState(false);
  const webglFailedRef = useRef(false);
  const reducedMotion = isReducedMotion();
  const animateEnabled = canAnimate();
  const [useFallback, setUseFallback] = useState(
    reducedMotion || !animateEnabled,
  );
  const [mounted, setMounted] = useState(false);
  const uniformsRef = useRef<{
    uTime: { value: number };
    uMouse: { value: any };
  }>({
    uTime: { value: 0 },
    uMouse: { value: { x: 0, y: 0 } },
  });

  // Determine if we should use fallback (reduced motion or no animation)
  useEffect(() => {
    setUseFallback(isReducedMotion() || !canAnimate());
  }, []);
  useEffect(() => {
    setMounted(true);
  }, []);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let scene: any;
    let camera: any;
    let renderer: any;
    let geometry: any;
    let material: any;
    let points: any;
    let animationRunning = true;

    // Check WebGL support before attempting
    const canvas = document.createElement('canvas');
    const gl =
      canvas.getContext('webgl', { failIfMajorPerformanceCaveat: false }) ||
      canvas.getContext('experimental-webgl', {
        failIfMajorPerformanceCaveat: false,
      });
    if (!gl) {
      if (!webglFailedRef.current) {
        webglFailedRef.current = true;
        setWebglFailed(true);
      }
      return;
    }

    try {
      // Initialize Three.js only on client
      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(
        45,
        window.innerWidth / window.innerHeight,
        0.1,
        1000,
      );

      // Use Three.js onContextCreationError callback for async failures
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: 'high-performance',
        onContextCreationError: (err: Error) => {
          if (!webglFailedRef.current) {
            webglFailedRef.current = true;
            setWebglFailed(true);
          }
        },
      });

      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setClearColor(0x000000, 0);
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.1;
    } catch (err) {
      if (!webglFailedRef.current) {
        webglFailedRef.current = true;
        setWebglFailed(true);
      }
      return;
    }

    // If WebGL failed during init, don't proceed
    if (webglFailedRef.current) {
      return;
    }

    // Geometry
    geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    const alphas = new Float32Array(particleCount);
    const offsets = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      const r = 8 + Math.random() * 12;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
      sizes[i] = size * (0.5 + Math.random() * 0.8);
      alphas[i] = 0.15 + Math.random() * 0.35;
      offsets[i * 3] = (Math.random() - 0.5) * 0.5;
      offsets[i * 3 + 1] = (Math.random() - 0.5) * 0.5;
      offsets[i * 3 + 2] = (Math.random() - 0.5) * 0.5;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('aAlpha', new THREE.BufferAttribute(alphas, 1));
    geometry.setAttribute('aOffset', new THREE.BufferAttribute(offsets, 3));

    // Material with custom shader
    material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: `
        attribute float aSize;
        attribute float aAlpha;
        attribute vec3 aOffset;
        uniform float uTime;
        uniform vec2 uMouse;
        varying float vAlpha;
        varying vec3 vPos;
        void main() {
          vAlpha = aAlpha;
          vPos = position;
          vec3 pos = position;
          float t = uTime * 0.05;
          pos.x += sin(t + position.y * 0.5) * aOffset.x;
          pos.y += cos(t + position.x * 0.5) * aOffset.y;
          pos.z += sin(t + position.z * 0.5) * aOffset.z;
          vec2 mouseNorm = uMouse / vec2(800.0, 600.0);
          pos.xy += mouseNorm * 0.3 * aAlpha;
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = aSize * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying float vAlpha;
        varying vec3 vPos;
        uniform vec3 uColor;
        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          float alpha = smoothstep(0.5, 0.0, dist) * vAlpha;
          vec3 col = uColor;
          col += vec3(0.1, 0.0, 0.1) * sin(vPos.y * 0.5);
          gl_FragColor = vec4(col, alpha);
        }
      `,
      uniforms: {
        uTime: uniformsRef.current.uTime,
        uMouse: uniformsRef.current.uMouse,
        uColor: { value: new THREE.Color(color) },
      },
    });

    points = new THREE.Points(geometry, material);
    scene.add(points);

    camera.position.set(0, 0, 18);
    camera.lookAt(0, 0, 0);

    // Append canvas
    el.appendChild(renderer.domElement);
    renderer.domElement.style.cssText =
      'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:0;';

    // Mouse move handler
    const onPointerMove = (e: MouseEvent) => {
      uniformsRef.current.uMouse.value.set(
        e.clientX - window.innerWidth / 2,
        -(e.clientY - window.innerHeight / 2),
      );
    };
    window.addEventListener('pointermove', onPointerMove, { passive: true });

    // Resize handler
    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', onResize, { passive: true });

    // Animation loop
    let startTime = performance.now();
    const animate = (now: number) => {
      if (!animationRunning) return;
      if (webglFailedRef.current) return;
      uniformsRef.current.uTime.value = now - startTime;
      camera.position.x = Math.sin(now * 0.00008) * 0.5;
      camera.position.y = Math.cos(now * 0.00006) * 0.3;
      camera.lookAt(0, 0, 0);
      renderer.render(scene, camera);
      frameRef.current = requestAnimationFrame(animate);
    };
    frameRef.current = requestAnimationFrame(animate);

    // Cleanup
    return () => {
      animationRunning = false;
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('resize', onResize);
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
      geometry?.dispose();
      material?.dispose();
      renderer?.dispose();
    };
  }, [particleCount, color, size, opacity, webglFailed]);

  // Prevent hydration mismatch: render placeholder until client-mounted
  if (!mounted) {
    return (
      <div
        ref={containerRef}
        className={`fixed inset-0 -z-10 ${className}`}
        aria-hidden="true"
      />
    );
  }

  // Render fallback if reduced motion, no animation, or WebGL failed
  if (useFallback || webglFailed) {
    return (
      <ParticleFieldSVG
        particleCount={80}
        accent="cyan"
        opacity={opacity}
        className={className}
      />
    );
  }

  return (
    <div
      ref={containerRef}
      className={`fixed inset-0 -z-10 ${className}`}
      aria-hidden="true"
    />
  );
}
