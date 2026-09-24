'use client';

import React, { useEffect, useRef, useState } from 'react';
import { animate, createScope, stagger } from 'animejs';
import {
  durations,
  easings,
  isReducedMotion,
  canAnimate,
} from '../../../../config/animations';

type Accent =
  | 'yellow'
  | 'magenta'
  | 'cyan'
  | 'green'
  | 'purple'
  | 'blue'
  | 'red';

export interface ParticleFieldSVGProps {
  particleCount?: number;
  accent?: Accent;
  size?: number;
  opacity?: number;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * ParticleFieldSVG — animated particle field using SVG + anime.js v4
 * Replaces Three.js particle system when WebGL is unavailable
 * Respects prefers-reduced-motion via isReducedMotion()/canAnimate()
 * Selectors: .grat-particles, .grat-particle
 */
export default function ParticleFieldSVG({
  particleCount = 80,
  accent = 'cyan',
  opacity = 0.35,
  className,
  style,
}: ParticleFieldSVGProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scopeRef = useRef<ReturnType<typeof createScope> | null>(null);
  const particlesRef = useRef<SVGCircleElement[]>([]);
  const mouseRef = useRef({ x: 0, y: 0 });
  const reducedMotion = isReducedMotion();
  const animateEnabled = canAnimate() && !reducedMotion;

  // Generate particle data
  const particles = React.useMemo(() => {
    const arr: Array<{
      x: number;
      y: number;
      radius: number;
      alpha: number;
      offsetX: number;
      offsetY: number;
      delay: number;
    }> = [];
    for (let i = 0; i < particleCount; i++) {
      const r = 15 + Math.random() * 35;
      const theta = Math.random() * Math.PI * 2;
      arr.push({
        x: 50 + r * Math.cos(theta),
        y: 50 + r * Math.sin(theta),
        radius: 0.8 + Math.random() * 1.5,
        alpha: 0.15 + Math.random() * 0.35,
        offsetX: (Math.random() - 0.5) * 0.5,
        offsetY: (Math.random() - 0.5) * 0.5,
        delay: Math.random() * 2,
      });
    }
    return arr;
  }, [particleCount]);

  // Initialize anime.js scope
  useEffect(() => {
    if (!animateEnabled || !containerRef.current) return;

    // Clear particle refs when particleCount changes to avoid stale refs
    particlesRef.current = [];

    const root = containerRef.current;
    const scope = createScope({
      root,
      mediaQueries: { reduceMotion: '(prefers-reduced-motion: reduce)' },
      defaults: { duration: durations.enter * 1000, ease: easings.outExpo },
    });
    scopeRef.current = scope;

    return () => scope.revert();
  }, [animateEnabled, particleCount]);

  // Mouse move handler
  useEffect(() => {
    if (!animateEnabled) return;
    const handler = (e: MouseEvent) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * 100 - 50;
      mouseRef.current.y = ((e.clientY - rect.top) / rect.height) * 100 - 50;
    };
    window.addEventListener('pointermove', handler, { passive: true });
    return () => window.removeEventListener('pointermove', handler);
  }, [animateEnabled]);

  // Animation loop using anime.js
  useEffect(() => {
    if (!animateEnabled || !scopeRef.current) return;

    const scope = scopeRef.current;
    let animationFrame: number;
    let startTime = performance.now();

    const animateLoop = (now: number) => {
      const elapsed = now - startTime;
      const t = elapsed * 0.05;

      particlesRef.current.forEach((circle, i) => {
        const p = particles[i];
        if (!circle) return;

        // Orbital motion
        const px = p.x + Math.sin(t + p.y * 0.05) * p.offsetX * 30;
        const py = p.y + Math.cos(t + p.x * 0.05) * p.offsetY * 30;

        // Mouse influence
        const mx = mouseRef.current.x * 0.3 * p.alpha;
        const my = mouseRef.current.y * 0.3 * p.alpha;

        // Point size based on "depth" (y position)
        const pointSize = p.radius * (200 / (100 + py));

        circle.setAttribute('cx', `${px + mx}`);
        circle.setAttribute('cy', `${py + my}`);
        circle.setAttribute('r', `${pointSize}`);
      });

      animationFrame = requestAnimationFrame(animateLoop);
    };

    animationFrame = requestAnimationFrame(animateLoop);

    return () => {
      if (animationFrame) cancelAnimationFrame(animationFrame);
    };
  }, [animateEnabled, particles]);

  // Entrance animation
  useEffect(() => {
    if (
      !animateEnabled ||
      !scopeRef.current ||
      particlesRef.current.length === 0
    )
      return;

    const scope = scopeRef.current;
    // Only animate circles that have corresponding particle data
    const circles = particlesRef.current.slice(0, particles.length);

    scope.add(() => {
      animate(circles, {
        opacity: [0, (i: number) => particles[i].alpha * opacity],
        scale: [0, 1],
        duration: durations.enter * 1000 * 0.6,
        ease: easings.outExpo,
        delay: stagger(durations.stagger * 1000 * 0.8, { from: 'first' }),
      });
    });
  }, [animateEnabled, opacity, particles]);

  if (!animateEnabled) {
    // Static fallback for reduced motion or when explicitly failed
    return (
      <div
        ref={containerRef}
        className={`fixed inset-0 -z-10 ${className}`}
        aria-hidden="true"
        style={{
          background: `
            radial-gradient(ellipse at 20% 20%, var(--field-glow-cyan) 0%, transparent 50%),
            radial-gradient(ellipse at 80% 80%, var(--field-glow-magenta) 0%, transparent 50%),
            radial-gradient(ellipse at 50% 50%, var(--field-glow-violet) 0%, transparent 60%)
          `,
          animation: 'aurora-drift 20s ease-in-out infinite alternate',
          ...style,
        }}
      >
        <style jsx>{`
          @keyframes aurora-drift {
            0% {
              background-position: 0% 50%;
            }
            100% {
              background-position: 100% 50%;
            }
          }
        `}</style>
      </div>
    );
  }

  const stroke = `var(--ring-${accent})`;

  return (
    <div
      ref={containerRef}
      className={`fixed inset-0 -z-10 ${className}`}
      aria-hidden="true"
      style={style}
    >
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        style={{ overflow: 'visible' }}
        data-graphic="grat-particles"
      >
        <g className="grat-particles" data-graphic="grat-particles">
          {particles.map((p, i) => (
            <circle
              key={i}
              className="grat-particle"
              data-graphic="grat-particle"
              cx={p.x}
              cy={p.y}
              r={p.radius}
              fill={stroke}
              fillOpacity={0}
              stroke="none"
              ref={(el) => {
                if (el) particlesRef.current[i] = el;
              }}
            />
          ))}
        </g>
      </svg>
    </div>
  );
}
