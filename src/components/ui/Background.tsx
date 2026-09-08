// src/components/ui/Background.tsx
/* Warm ambient background — soft washes, scroll-scrubbed morph dekor, no neon zones. */

import React, { useEffect, useRef } from 'react';
import {
  createScope,
  createTimeline,
  createDrawable,
  morphTo,
  onScroll,
  stagger,
} from 'animejs';
import {
  isReducedMotion,
  canAnimate,
  drawPreset,
  morphPreset,
  durations,
} from '../../config/animations';
import TronGrid from './TronGrid';
import ScanlineOverlay from './ScanlineOverlay';
import ParticleField from './ParticleField';

const MORPH_PATHS = [
  'M50,10 C80,10 90,30 90,50 C90,70 80,90 50,90 C20,90 10,70 10,50 C10,30 20,10 50,10',
  'M50,5 C90,15 95,50 85,80 C75,95 40,95 20,80 C5,65 5,35 15,20 C25,10 40,5 50,5',
  'M50,15 C75,15 85,35 85,55 C85,75 70,85 50,85 C30,85 15,70 15,50 C15,30 30,15 50,15',
];

export default function Background() {
  const bgRef = useRef<HTMLDivElement>(null);
  const scopeRef = useRef<ReturnType<typeof createScope> | null>(null);

  useEffect(() => {
    if (!bgRef.current) return;
    if (isReducedMotion() || !canAnimate()) return;

    const scope = createScope({ root: bgRef.current });
    scopeRef.current = scope;

    scope.add(() => {
      const shapes =
        bgRef.current!.querySelectorAll<SVGPathElement>('.bg-morph-shape');
      if (shapes.length === 0) return;

      const tl = createTimeline({
        defaults: { ease: drawPreset.ease },
      });

      const drawables = createDrawable('.bg-morph-shape');
      tl.add(
        drawables,
        {
          draw: ['0 0', drawPreset.draw],
          duration: durations.draw * 1000,
          ease: drawPreset.ease,
          delay: stagger(durations.stagger * 1000, { from: 'first' }),
        },
        0,
      );

      // Scroll-scrubbed morph — warm washes, not neon zones
      shapes.forEach((shape, i) => {
        tl.add(
          shape,
          {
            d: morphTo(`#bg-morph-target-${(i + 1) % MORPH_PATHS.length}`),
            duration: durations.morph * 1000,
            ease: morphPreset.ease,
            autoplay: onScroll({ sync: true }),
          } as any,
          0,
        );
      });
    });

    return () => {
      scope.revert();
      scopeRef.current = null;
    };
  }, []);

  return (
    <div ref={bgRef} className="fixed inset-0 z-0" aria-hidden="true">
      {/* Base — warm charcoal washes */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at center, var(--bg-2) 0%, var(--bg-1) 62%, var(--bg-1) 100%)',
        }}
      />
      {/* Subtle warm vignette wash */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 90% 70% at 50% 18%, var(--bg-3) 0%, transparent 55%), radial-gradient(ellipse 70% 60% at 80% 85%, var(--overlay-white-015) 0%, transparent 60%)',
        }}
      />

      {/* Morphing SVG shapes — warm border-subtle, very low opacity */}
      <svg
        className="absolute inset-0 w-full h-full opacity-[0.035]"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient
            id="bg-shape-grad"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop offset="0%" stopColor="var(--border-subtle)" />
            <stop offset="100%" stopColor="var(--fg-3)" />
          </linearGradient>
          {MORPH_PATHS.map((d, i) => (
            <path
              key={`bg-morph-target-${i}`}
              id={`bg-morph-target-${i}`}
              d={d}
              fill="none"
              stroke="none"
            />
          ))}
        </defs>
        <path
          className="bg-morph-shape"
          d={MORPH_PATHS[0]}
          fill="none"
          stroke="url(#bg-shape-grad)"
          strokeWidth="0.5"
          transform="translate(100, 100) scale(1.5)"
        />
        <path
          className="bg-morph-shape"
          d={MORPH_PATHS[1]}
          fill="none"
          stroke="url(#bg-shape-grad)"
          strokeWidth="0.5"
          transform="translate(600, 300) scale(2)"
        />
        <path
          className="bg-morph-shape"
          d={MORPH_PATHS[2]}
          fill="none"
          stroke="url(#bg-shape-grad)"
          strokeWidth="0.5"
          transform="translate(300, 600) scale(1.8)"
        />
      </svg>

      <TronGrid />
      <ParticleField />
      <ScanlineOverlay />

      {/* Vignette — warm */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at center, transparent 42%, var(--overlay-60) 92%)',
        }}
      />
    </div>
  );
}
