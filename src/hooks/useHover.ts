// src/hooks/useHover.ts
/* ═══════════════════════════════════════════════════════════════════════════════
   useHover — Hover blend animations for interactive elements
   Uses anime.js blend composition for smooth combination with base animations
═══════════════════════════════════════════════════════════════════════════════ */

import { useEffect, useRef, useCallback } from 'react';
import { animate, createScope } from 'animejs';
import { isReducedMotion, durations, easings } from '../config/animations';

export interface HoverOptions {
  /** CSS selector to target */
  selector?: string;
  /** Root element for scope */
  root?: HTMLElement | null;
  /** Hover scale factor */
  scale?: number;
  /** Hover translateY */
  translateY?: number;
  /** Hover rotation */
  rotate?: number;
  /** Duration for hover animation in ms */
  duration?: number;
  /** Easing */
  ease?: string;
  /** Custom hover properties */
  hoverProperties?: Record<string, unknown>;
  /** Custom leave properties */
  leaveProperties?: Record<string, unknown>;
  /** Respect reduced motion */
  respectReduced?: boolean;
}

export function useHover(options: HoverOptions = {}) {
  const {
    selector = '.hover-item',
    root,
    scale = 1.03,
    translateY = -2,
    rotate = 0,
    duration = durations.hover * 1000,
    ease = easings.quadOut,
    hoverProperties,
    leaveProperties,
    respectReduced = true,
  } = options;

  const scopeRef = useRef<ReturnType<typeof createScope> | null>(null);
  const hoverAnimsRef = useRef<Map<HTMLElement, ReturnType<typeof animate>>>(
    new Map(),
  );

  const revert = useCallback(() => {
    hoverAnimsRef.current.forEach((anim) => {
      anim.revert();
    });
    hoverAnimsRef.current.clear();
    scopeRef.current?.revert();
    scopeRef.current = null;
  }, []);

  useEffect(() => {
    if (isReducedMotion() && respectReduced) {
      return;
    }

    if (!root) return;

    const scope = createScope({
      root,
      defaults: { duration, ease },
    });

    scopeRef.current = scope;

    scope.add(() => {
      const items = root.querySelectorAll<HTMLElement>(selector);
      items.forEach((item) => {
        const defaultHoverProps = {
          scale,
          y: translateY,
          rotate,
          duration,
          ease,
          composition: 'blend',
          ...hoverProperties,
        };

        const defaultLeaveProps = {
          scale: 1,
          y: 0,
          rotate: 0,
          duration: duration * 0.8,
          ease: 'outQuad',
          composition: 'blend',
          ...leaveProperties,
        };

        const handleEnter = () => {
          animate(item, defaultHoverProps);
        };
        const handleLeave = () => {
          animate(item, defaultLeaveProps);
        };

        item.addEventListener('mouseenter', handleEnter);
        item.addEventListener('mouseleave', handleLeave);

        // Store for cleanup
        (item as unknown as { _hoverCleanup?: () => void })._hoverCleanup =
          () => {
            item.removeEventListener('mouseenter', handleEnter);
            item.removeEventListener('mouseleave', handleLeave);
          };
      });
    });

    return () => {
      if (root) {
        const items = root.querySelectorAll<HTMLElement>(selector);
        items.forEach((item) => {
          const cleanup = (item as unknown as { _hoverCleanup?: () => void })
            ._hoverCleanup;
          if (cleanup) cleanup();
        });
      }
      scope.revert();
      scopeRef.current = null;
    };
  }, [
    selector,
    root,
    scale,
    translateY,
    rotate,
    duration,
    ease,
    hoverProperties,
    leaveProperties,
    respectReduced,
  ]);

  return { revert, scope: scopeRef };
}

export default useHover;
