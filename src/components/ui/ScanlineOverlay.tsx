// src/components/ui/ScanlineOverlay.tsx
/* Minimal warm paper grain — single static wash; no CRT scanline, no animation loop. */

import React from 'react';

export default function ScanlineOverlay() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[1]"
      style={{
        opacity: 0.015,
        backgroundImage:
          'linear-gradient(180deg, transparent 50%, var(--fg-1) 50.5%)',
        backgroundSize: '100% 3px',
      }}
    />
  );
}
