// src/hooks/useDraggableCard.ts
/* ═══════════════════════════════════════════════════════════════════════════════
   useDraggableCard — Draggable card behavior using anime.js createDraggable
   Supports: drag, snap, spring release, velocity
═══════════════════════════════════════════════════════════════════════════════ */

import { useEffect, useRef, useCallback } from 'react';
import { createDraggable, createScope, createSpring } from 'animejs';
import { isReducedMotion, isTouchDevice } from '../config/animations';

export interface DraggableOptions {
  /** CSS selector to target */
  selector?: string;
  /** Root element for scope */
  root?: HTMLElement | null;
  /** Drag axis: 'x', 'y', or 'both' */
  axis?: 'x' | 'y' | 'both';
  /** Enable snap to grid */
  snap?: number | number[];
  /** Container to constrain dragging */
  container?: string | HTMLElement;
  /** Spring config for release */
  springConfig?: { stiffness: number; damping: number };
  /** Respect reduced motion */
  respectReduced?: boolean;
  /** Disable on touch devices */
  disableOnTouch?: boolean;
  /** Callback on drag start */
  onGrab?: (el: HTMLElement) => void;
  /** Callback on drag end */
  onRelease?: (el: HTMLElement) => void;
  /** Callback on drag */
  onDrag?: (el: HTMLElement) => void;
}

export function useDraggableCard(options: DraggableOptions = {}) {
  const {
    selector = '.draggable-card',
    root,
    axis = 'both',
    snap,
    container,
    springConfig = { stiffness: 200, damping: 20 },
    respectReduced = true,
    disableOnTouch = true,
    onGrab,
    onRelease,
    onDrag,
  } = options;

  const scopeRef = useRef<ReturnType<typeof createScope> | null>(null);
  const draggableRefs = useRef<
    Map<HTMLElement, ReturnType<typeof createDraggable>>
  >(new Map());

  const disable = useCallback(() => {
    draggableRefs.current.forEach((d) => d.disable());
  }, []);

  const enable = useCallback(() => {
    draggableRefs.current.forEach((d) => d.enable());
  }, []);

  const reset = useCallback(() => {
    draggableRefs.current.forEach((d) => d.reset());
  }, []);

  const revert = useCallback(() => {
    draggableRefs.current.forEach((d) => d.revert());
    draggableRefs.current.clear();
    scopeRef.current?.revert();
    scopeRef.current = null;
  }, []);

  useEffect(() => {
    if (isReducedMotion() && respectReduced) return;
    if (isTouchDevice() && disableOnTouch) return;
    if (!root) return;

    const scope = createScope({ root });
    scopeRef.current = scope;

    scope.add(() => {
      const items = root.querySelectorAll<HTMLElement>(selector);
      items.forEach((item) => {
        const drag = createDraggable(item, {
          x: axis === 'x' || axis === 'both',
          y: axis === 'y' || axis === 'both',
          container,
          snap,
          releaseEase: createSpring(springConfig),
          onGrab: onGrab ? () => onGrab(item) : undefined,
          onRelease: onRelease ? () => onRelease(item) : undefined,
          onDrag: onDrag ? () => onDrag(item) : undefined,
        });

        draggableRefs.current.set(item, drag);
      });
    });

    return () => {
      draggableRefs.current.forEach((d) => d.revert());
      draggableRefs.current.clear();
      scope.revert();
      scopeRef.current = null;
    };
  }, [
    selector,
    root,
    axis,
    snap,
    container,
    springConfig,
    respectReduced,
    disableOnTouch,
    onGrab,
    onRelease,
    onDrag,
  ]);

  return { disable, enable, reset, revert, scope: scopeRef };
}

export default useDraggableCard;
