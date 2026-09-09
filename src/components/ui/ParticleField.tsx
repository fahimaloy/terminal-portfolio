// src/components/ui/ParticleField.tsx
/* Warm ambient blobs — 3 soft washes, slow drift, muted (softened for hero/aurora legibility). */

import React, { useEffect, useRef } from 'react';
import { animate, createScope } from 'animejs';
import { durations, easings, isReducedMotion } from '../../config/animations';

const BLOBS: { w: number; h: number; left: string; top: string }[] = [
  { w: 520, h: 520, left: '8%', top: '12%' },
  { w: 640, h: 640, left: '52%', top: '8%' },
  { w: 480, h: 480, left: '18%', top: '58%' },
];

export default function ParticleField() {
  const containerRef = useRef<HTMLDivElement>(null);
  const scopeRef = useRef<ReturnType<typeof createScope> | null>(null);

  useEffect(() => {
    if (!containerRef.current || isReducedMotion()) return;
    const scope = createScope({ root: containerRef.current });
    scopeRef.current = scope;

    scope.add(() => {
      const blobs =
        containerRef.current!.querySelectorAll<HTMLElement>('.warm-blob');
      blobs.forEach((el, i) => {
        animate(el, {
          translateX: [0, i % 2 === 0 ? 18 : -18, 0],
          translateY: [0, i % 2 === 0 ? -14 : 16, 0],
          duration: 20000,
          loop: true,
          alternate: true,
          ease: easings.smooth ?? 'inOutSine',
          delay: i * (durations.stagger * 1000),
        });
      });
    });

    return () => {
      scope.revert();
      scopeRef.current = null;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[2] overflow-hidden"
    >
      {BLOBS.map((b, i) => (
        <div
          key={i}
          className="warm-blob absolute rounded-full"
          style={{
            width: b.w,
            height: b.h,
            left: b.left,
            top: b.top,
            background: `radial-gradient(ellipse at center, var(--bg-3), var(--bg-2) 70%, transparent 75%)`,
            opacity: 0.04,
            filter: 'blur(40px)',
            willChange: 'transform',
          }}
        />
      ))}
    </div>
  );
}
