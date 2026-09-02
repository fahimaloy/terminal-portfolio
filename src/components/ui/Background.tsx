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
import { onScroll, createScope } from 'animejs';
import { isReducedMotion } from '../../config/animations';
import TronGrid from './TronGrid';
import ScanlineOverlay from './ScanlineOverlay';
import ParticleField from './ParticleField';

// Background zone colors (subtle hue shifts per section)
const ZONES = [
  { start: 0, end: 0.25, color: 'rgba(0, 240, 255, 0.06)' },    // cyan
  { start: 0.25, end: 0.5, color: 'rgba(255, 0, 170, 0.06)' },  // magenta
  { start: 0.5, end: 0.75, color: 'rgba(255, 170, 0, 0.06)' },  // yellow
  { start: 0.75, end: 1, color: 'rgba(57, 255, 20, 0.06)' },    // green
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
  const intervalsRef = useRef<ReturnType<typeof setInterval>[]>([]);

  useEffect(() => {
    if (!bgRef.current) return;

    const scope = createScope({ root: bgRef.current });
    scopeRef.current = scope;

    if (!isReducedMotion()) {
      scope.add(() => {
        // Morphing SVG background shapes
        const shapes = bgRef.current!.querySelectorAll('.bg-morph-shape');
        if (shapes.length > 0) {
          // Animate each shape through the morph paths
          shapes.forEach((shape, i) => {
            const pathEl = shape as SVGPathElement;
            let pathIndex = 0;
            const interval = setInterval(() => {
              pathIndex = (pathIndex + 1) % MORPH_PATHS.length;
              pathEl.setAttribute('d', MORPH_PATHS[pathIndex]);
            }, 4000 + i * 800);
            intervalsRef.current.push(interval);
          });
        }
      });
    }

    return () => {
      intervalsRef.current.forEach(clearInterval);
      intervalsRef.current = [];
      scope.revert();
    };
  }, []);

  return (
    <div ref={bgRef} className="fixed inset-0 z-0" aria-hidden="true">
      {/* Base gradient — scroll-reactive zone color */}
      <div
        className="absolute inset-0 transition-colors duration-700"
        style={{
          background:
            'radial-gradient(ellipse at center, #15151a 0%, #0a0a0a 60%, #000 100%)',
        }}
      />

      {/* Morphing SVG shapes (subtle background decoration) */}
      <svg
        className="absolute inset-0 w-full h-full opacity-[0.04]"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id="bg-shape-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--neon-cyan)" />
            <stop offset="100%" stopColor="var(--neon-magenta)" />
          </linearGradient>
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
            'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.6) 90%)',
        }}
      />
    </div>
  );
}
