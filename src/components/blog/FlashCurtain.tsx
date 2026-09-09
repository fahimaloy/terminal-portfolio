// src/components/blog/FlashCurtain.tsx
/* Flash curtain VFX — amber full-screen flash + directional slide for blog swipe.
   Used by BlogReels on snapIndexChange. Reduced-motion → no flash. */

import React, { forwardRef } from 'react';

type FlashCurtainProps = {
  color?: string;
  className?: string;
};

const FlashCurtain = forwardRef<HTMLDivElement, FlashCurtainProps>(
  ({ color = 'var(--retro-amber)', className = '' }, ref) => {
    return (
      <div
        ref={ref}
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 z-30 opacity-0 ${className}`}
        style={{ background: color }}
      />
    );
  },
);

FlashCurtain.displayName = 'FlashCurtain';
export default FlashCurtain;
