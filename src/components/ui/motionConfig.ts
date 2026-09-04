// src/components/ui/motionConfig.ts
// Thin adapter: re-exports from config/animations.ts in framer-motion-compatible format.
// Prefer importing directly from config/animations.ts for new code.
import { durations, easings } from '../../config/animations';

export const motionTokens = {
  // framer-motion expects easing as a cubic-bezier array, not a CSS string
  ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
  dur: {
    tap: durations.tap,
    hover: durations.hover,
    enter: durations.enter,
    pulse: durations.pulse,
  },
};
