// src/components/ui/ScanlineOverlay.tsx
/* Back-compat wrapper — now renders GrainOverlay. Keep import path stable. */
import React from 'react';
import GrainOverlay from './GrainOverlay';

export default function ScanlineOverlay() {
  return <GrainOverlay />;
}
