// src/components/ui/TronGrid.tsx
import React from 'react';

export default function TronGrid() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0"
      style={{
        backgroundImage:
          'linear-gradient(rgba(0,240,255,0.07) 1px, transparent 1px),' +
          'linear-gradient(90deg, rgba(0,240,255,0.07) 1px, transparent 1px)',
        backgroundSize: '30px 30px',
        WebkitMaskImage:
          'radial-gradient(ellipse at center, #000 30%, transparent 80%)',
        maskImage:
          'radial-gradient(ellipse at center, #000 30%, transparent 80%)',
      }}
    />
  );
}
