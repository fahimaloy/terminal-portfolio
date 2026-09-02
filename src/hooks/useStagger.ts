// src/hooks/useStagger.ts
/* ═══════════════════════════════════════════════════════════════════════════════
   useStagger — Staggered entrance animations for lists and grids
   Supports: list, grid, center, first, last, random stagger modes
═══════════════════════════════════════════════════════════════════════════════ */

import { useEffect, useRef, useCallback } from 'react';
import { animate, createScope, stagger } from 'animejs';
import { isReducedMotion, durations, easings } from '../config/animations';

export type StaggerMode =
  | 'list'
  | 'grid'
  | 'center'
  | 'first'
  | 'last'
  | 'random';

export interface StaggerOptions {
  /** CSS selector to target children */
  selector?: string;
  /** Root element for the scope (read inside effect so refs work) */
  root?: HTMLElement | null;
  /** Ref object whose .current holds the root (alternative to root) */
  rootRef?: React.RefObject<HTMLElement | null>;
  /** Stagger mode */
  mode?: StaggerMode;
  /** Grid dimensions for grid mode [cols, rows] */
  grid?: [number, number];
  /** Base delay between items in ms */
  delay?: number;
  /** Animation duration in ms */
  duration?: number;
  /** Easing function */
  ease?: string;
  /** Animation properties */
  properties?: Record<string, unknown>;
  /** Custom stagger options override */
  staggerOptions?: Record<string, unknown>;
  /** Play on mount */
  autoplay?: boolean;
  /** Respect reduced motion */
  respectReduced?: boolean;
  /** Small delay before starting (waits for DOM paint) */
  paintDelay?: number;
}

const staggerPresets: Record<StaggerMode, Record<string, unknown>> = {
  list: { from: 'first' },
  grid: { from: 'center', grid: [13, 13] as [number, number] },
  center: { from: 'center' },
  first: { from: 'first' },
  last: { from: 'last' },
  random: { from: 'random' },
};

export function useStagger(options: StaggerOptions = {}) {
  const {
    selector = '.stagger-item',
    root,
    rootRef,
    mode = 'list',
    grid,
    delay = durations.stagger * 1000,
    duration = durations.enter * 1000,
    ease = easings.expoOut,
    properties,
    staggerOptions,
    autoplay = true,
    respectReduced = true,
    paintDelay = 50,
  } = options;

  const scopeRef = useRef<ReturnType<typeof createScope> | null>(null);
  const animRef = useRef<ReturnType<typeof animate> | null>(null);

  const play = useCallback(() => {
    animRef.current?.play();
  }, []);

  const pause = useCallback(() => {
    animRef.current?.pause();
  }, []);

  const revert = useCallback(() => {
    scopeRef.current?.revert();
    scopeRef.current = null;
    animRef.current = null;
  }, []);

  // Track the last-played root so we can replay when it changes.
  const lastRootRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isReducedMotion() && respectReduced) {
      return;
    }

    const target = rootRef?.current ?? root ?? null;
    if (!target) return;

    // If the same root is already animated, skip.
    if (lastRootRef.current === target && animRef.current) return;

    lastRootRef.current = target;

    // Small delay to ensure DOM is painted
    const timer = setTimeout(() => {
      const scope = createScope({
        root: target,
        mediaQueries: {
          reduceMotion: '(prefers-reduced-motion: reduce)',
        },
        defaults: {
          duration,
          ease,
        },
      });

      scopeRef.current = scope;

      scope.add(() => {
        const items = target.querySelectorAll<HTMLElement>(selector);
        if (items.length === 0) return;

        const preset = staggerPresets[mode];
        const finalStagger = stagger(delay, {
          ...preset,
          ...(grid && mode === 'grid' ? { grid } : {}),
          ...staggerOptions,
        } as any);

        const anim = animate(items, {
          opacity: [0, 1],
          y: [24, 0],
          scale: [0.95, 1],
          delay: finalStagger,
          duration,
          ease,
          composition: 'blend',
          ...properties,
          autoplay,
        } as any);

        animRef.current = anim;
      });
    }, paintDelay);

    return () => {
      clearTimeout(timer);
      scopeRef.current?.revert();
      scopeRef.current = null;
      animRef.current = null;
      lastRootRef.current = null;
    };
  }, [
    selector,
    root,
    rootRef,
    mode,
    grid,
    delay,
    duration,
    ease,
    properties,
    staggerOptions,
    autoplay,
    respectReduced,
    paintDelay,
  ]);

  return { play, pause, revert, scope: scopeRef, anim: animRef };
}

export default useStagger;
