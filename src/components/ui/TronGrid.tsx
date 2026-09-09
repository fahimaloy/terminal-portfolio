// src/components/ui/TronGrid.tsx
/* Warm subtle dot grid — faint 1px border grid, depth layer (opacity 0.14) behind aurora.
   Reduced from 0.22 → 0.14 for hero readability per design doctrine. */

import React from 'react';

export default function TronGrid() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0"
      style={{
        backgroundImage:
          'linear-gradient(var(--border-subtle) 1px, transparent 1px),' +
          'linear-gradient(90deg, var(--border-subtle) 1px, transparent 1px)',
        backgroundSize: '32px 32px',
        opacity: 0.14,
        WebkitMaskImage:
          'radial-gradient(ellipse at center, black 35%, transparent 82%)',
        maskImage:
          'radial-gradient(ellipse at center, black 35%, transparent 82%)',
      }}
    />
  );
}
