// src/components/ui/ScanlineOverlay.tsx
/* ═══════════════════════════════════════════════════════════════════════════════
   SCANLINE OVERLAY — Subtle CRT scanline effect
   Adds a moving horizontal scanline for retro-cyberpunk feel.
═══════════════════════════════════════════════════════════════════════════════ */

import React, { useEffect, useRef } from 'react';
import { animate, createScope } from 'animejs';
import { isReducedMotion } from '../../config/animations';

export default function ScanlineOverlay() {
  const scanlineRef = useRef<HTMLDivElement>(null);
  const scopeRef = useRef<ReturnType<typeof createScope> | null>(null);

  useEffect(() => {
    if (!scanlineRef.current || isReducedMotion()) return;

    const scope = createScope({ root: scanlineRef.current });
    scopeRef.current = scope;

    scope.add(() => {
      animate(scanlineRef.current!, {
        translateY: ['-100vh', '100vh'],
        duration: 6000,
        loop: true,
        ease: 'linear',
      });
    });

    return () => {
      scope.revert();
      scopeRef.current = null;
    };
  }, []);

  return (
    <>
      {/* Static scanlines */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-[1]"
        style={{
          backgroundImage:
            'linear-gradient(180deg, transparent 50%, var(--overlay-white-015) 50.5%, var(--overlay-white-015) 51%, transparent 51.5%)',
          backgroundSize: '100% 3px',
        }}
      />
      {/* Moving scanline bar */}
      <div
        ref={scanlineRef}
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 z-[1] h-8 opacity-[0.04]"
        style={{
          background:
            'linear-gradient(180deg, transparent, var(--neon-cyan), transparent)',
          top: '-32px',
        }}
      />
    </>
  );
}
