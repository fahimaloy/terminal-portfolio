// src/hooks/index.ts
/* ═══════════════════════════════════════════════════════════════════════════════
   HOOK BARREL EXPORTS — All animation hooks in one importable module.
   Import: import { useHover, useBoot, useTypewriter, useStagger, useTextScramble, useDraggableCard, useScrollAnimation } from '../hooks';
═══════════════════════════════════════════════════════════════════════════════ */

export { useHover } from './useHover';
export type { HoverOptions } from './useHover';

export { useBoot } from './useBoot';
export type { BootOptions } from './useBoot';

export { useDraggableCard } from './useDraggableCard';
export type { DraggableOptions } from './useDraggableCard';

export { useTextScramble } from './useTextScramble';
export type { ScrambleOptions } from './useTextScramble';

export { useTypewriter } from './useTypewriter';
export type { TypewriterOptions } from './useTypewriter';

export { useStagger } from './useStagger';
export type { StaggerOptions, StaggerMode } from './useStagger';

export { useScrollAnimation } from './useScrollAnimation';
export type { ScrollAnimationOptions } from './useScrollAnimation';

export { useTimeline } from './useTimeline';
export type { TimelineParams, TimelineTarget } from './useTimeline';
