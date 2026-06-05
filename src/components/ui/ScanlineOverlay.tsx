// src/components/ui/ScanlineOverlay.tsx
import React from 'react';

export default function ScanlineOverlay() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[1]"
      style={{
        backgroundImage:
          'linear-gradient(180deg, transparent 50%, rgba(255,255,255,0.025) 50.5%, rgba(255,255,255,0.025) 51%, transparent 51.5%)',
        backgroundSize: '100% 4px',
      }}
    />
  );
}
