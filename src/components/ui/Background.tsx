// src/components/ui/Background.tsx
import React from 'react';
import TronGrid from './TronGrid';
import ScanlineOverlay from './ScanlineOverlay';
import ParticleField from './ParticleField';

export default function Background() {
  return (
    <>
      {/* Base gradient */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            'radial-gradient(ellipse at center, #15151a 0%, #0a0a0a 60%, #000 100%)',
        }}
      />
      <TronGrid />
      <ParticleField />
      <ScanlineOverlay />
      {/* Vignette */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-[3]"
        style={{
          background:
            'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.6) 90%)',
        }}
      />
    </>
  );
}
