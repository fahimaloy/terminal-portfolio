// src/hooks/index.ts
/* ═══════════════════════════════════════════════════════════════════════════════
   HOOK BARREL EXPORTS — All animation hooks in one importable module.
═══════════════════════════════════════════════════════════════════════════════ */

export { useStagger } from './useStagger';
export type { StaggerOptions, StaggerMode } from './useStagger';

export { useMotionScope } from './useMotionScope';
export type { MotionScopeOptions, MotionScopeRun } from './useMotionScope';

export { useFlashCurtain } from './useFlashCurtain';
export type {
  FlashDirection,
  FlashCurtainOptions,
  FlashScopeHandle,
} from './useFlashCurtain';
