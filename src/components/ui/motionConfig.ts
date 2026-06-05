// src/components/ui/motionConfig.ts
export const motionTokens = {
  ease: [0.16, 1, 0.3, 1] as const,
  dur: { tap: 0.12, hover: 0.24, enter: 0.48, pulse: 1.2 },
};

export const tiltHover = {
  rotateX: 2,
  rotateY: 2,
  transition: { duration: motionTokens.dur.hover, ease: motionTokens.ease },
};
