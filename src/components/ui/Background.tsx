// src/components/ui/Background.tsx
/* ═══════════════════════════════════════════════════════════════════════════════
   BACKGROUND SYSTEM — Scroll-reactive animated background
   Features:
   - Zone-based color changes (background shifts hue based on scroll section)
   - Morphing SVG shapes in background
   - Grid pulse (TronGrid)
   - Particle field cursor follow
   - Scanline overlay
═══════════════════════════════════════════════════════════════════════════════ */

import React, { useEffect, useRef } from 'react';
import {
  animate,
  onScroll,
  createScope,
  createTimeline,
  createDrawable,
  morphTo,
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

// Background zone colors (subtle hue shifts per section)
const ZONES = [
  { start: 0, end: 0.25, color: 'var(--glow-cyan-zone)' },
  { start: 0.25, end: 0.5, color: 'var(--glow-magenta-zone)' },
  { start: 0.5, end: 0.75, color: 'var(--glow-yellow-zone)' },
  { start: 0.75, end: 1, color: 'var(--glow-green-zone)' },
];

// Morphing SVG shape paths (for background decoration)
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
    // Reduced-motion: render shapes statically at their final path (no animation).
    if (isReducedMotion() || !canAnimate()) return;

    const scope = createScope({ root: bgRef.current });
    scopeRef.current = scope;

    scope.add(() => {
      const shapes =
        bgRef.current!.querySelectorAll<SVGPathElement>('.bg-morph-shape');
      if (shapes.length === 0) return;

      // One continuous timeline: boot draw-in → scroll-scrubbed morph.
      // Animation contract: createTimeline for sequences, onScroll sync for
      // scroll-driven scrub, stagger for grids — matches BootSequence.ts +
      // useTimeline.ts + useScrollAnimation.ts conventions.
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

      // Scroll-linked morph stays in the same timeline so boot completion →
      // scroll scrub is one unified animation lifecycle, not two bolted
      // animates sharing only a scope. Each morph is scroll-synced independently
      // so the scrub tracks scroll position per shape.
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
      {/* Base gradient — scroll-reactive zone color */}
      <div
        className="absolute inset-0 transition-colors duration-700"
        style={{
          background:
            'radial-gradient(ellipse at center, var(--bg-smoke) 0%, var(--bg-void) 60%, black 100%)',
        }}
      />

      {/* Morphing SVG shapes (subtle background decoration) */}
      <svg
        className="absolute inset-0 w-full h-full opacity-[0.04]"
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
            <stop offset="0%" stopColor="var(--neon-cyan)" />
            <stop offset="100%" stopColor="var(--neon-magenta)" />
          </linearGradient>
          {/* Hidden morph targets for morphTo() — never rendered */}
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

      {/* Tron Grid */}
      <TronGrid />

      {/* Particle Field */}
      <ParticleField />

      {/* Scanline Overlay */}
      <ScanlineOverlay />

      {/* Vignette */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at center, transparent 30%, var(--overlay-60) 90%)',
        }}
      />
    </div>
  );
}
