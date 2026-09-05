// src/components/ui/TronGrid.tsx
/* ═══════════════════════════════════════════════════════════════════════════════
   TRON GRID — Animated perspective grid with breathing glow
   Uses anime.js to pulse the grid opacity subtly.
═══════════════════════════════════════════════════════════════════════════════ */

import React, { useEffect, useRef } from 'react';
import { animate, createScope } from 'animejs';
import { isReducedMotion } from '../../config/animations';

export default function TronGrid() {
  const gridRef = useRef<HTMLDivElement>(null);
  const scopeRef = useRef<ReturnType<typeof createScope> | null>(null);

  useEffect(() => {
    if (!gridRef.current || isReducedMotion()) return;

    const scope = createScope({ root: gridRef.current });
    scopeRef.current = scope;

    scope.add(() => {
      animate(gridRef.current!, {
        opacity: [0.4, 0.7, 0.4],
        duration: 4000,
        loop: true,
        alternate: true,
        ease: 'inOutSine',
      });
    });

    return () => {
      scope.revert();
    };
  }, []);

  return (
    <div
      ref={gridRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0"
      style={{
        backgroundImage:
          'linear-gradient(var(--glow-cyan-grid) 1px, transparent 1px),' +
          'linear-gradient(90deg, var(--glow-cyan-grid) 1px, transparent 1px)',
        backgroundSize: '30px 30px',
        WebkitMaskImage:
          'radial-gradient(ellipse at center, black 30%, transparent 80%)',
        maskImage:
          'radial-gradient(ellipse at center, black 30%, transparent 80%)',
        opacity: 0.5,
      }}
    />
  );
}
