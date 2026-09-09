// src/components/ui/GrainOverlay.tsx
/* Paper grain — 0.02 opacity warm noise, no CRT scanline loop. */

import React from 'react';

export default function GrainOverlay() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[1]"
      style={{
        opacity: 0.025,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.92' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.55'/%3E%3C/svg%3E")`,
        mixBlendMode: 'soft-light' as any,
      }}
    />
  );
}
