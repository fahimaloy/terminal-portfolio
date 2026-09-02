// src/hooks/useScrollAnimation.ts
/* ═══════════════════════════════════════════════════════════════════════════════
   useScrollAnimation — Scroll-linked animations with anime.js onScroll
   Supports: parallax, reveal-on-scroll, progress indicators, counter animations
═══════════════════════════════════════════════════════════════════════════════ */

import { useEffect, useRef, useCallback, useMemo } from 'react';
import { animate, onScroll, createScope, createTimeline } from 'animejs';
import { isReducedMotion } from '../config/animations';

export interface ScrollAnimationOptions {
  /** CSS selector or DOM element to animate */
  target?: string | HTMLElement;
  /** Scroll container (default: window) */
  container?: string | HTMLElement;
  /** Sync mode: true = smooth follow, false = trigger once */
  sync?: boolean;
  /** Start position (e.g. 'top 80%') */
  start?: string;
  /** End position (e.g. 'bottom 20%') */
  end?: string;
  /** Threshold 0-1 for trigger mode */
  threshold?: number;
  /** Animation properties */
  keyframes?: Array<Record<string, unknown>>;
  /** Single animation properties (alternative to keyframes) */
  properties?: Record<string, unknown>;
  /** Autoplay override */
  autoplay?: unknown;
  /** Callback on scroll update */
  onUpdate?: (progress: number) => void;
  /** Respect reduced motion (default: true) */
  respectReduced?: boolean;
}

export function useScrollAnimation(options: ScrollAnimationOptions = {}) {
  const {
    target,
    container,
    sync = false,
    start = 'top 80%',
    end = 'bottom 20%',
    threshold = 0,
    keyframes,
    properties,
    autoplay,
    onUpdate,
    respectReduced = true,
  } = options;

  const scopeRef = useRef<ReturnType<typeof createScope> | null>(null);
  const animRef = useRef<ReturnType<typeof animate> | null>(null);
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  // Stable serialized versions of keyframes/properties for dep comparison
  const keyframesKey = useMemo(() => JSON.stringify(keyframes), [keyframes]);
  const propertiesKey = useMemo(() => JSON.stringify(properties), [properties]);

  useEffect(() => {
    if (isReducedMotion() && respectReduced) {
      return;
    }

    const rootEl = typeof target === 'string' ? target : target;
    if (!rootEl) return;

    const scope = createScope({
      root: rootEl as HTMLElement | string,
      mediaQueries: {
        reduceMotion: '(prefers-reduced-motion: reduce)',
      },
      defaults: {
        duration: 800,
        ease: 'outExpo',
      },
    });

    scopeRef.current = scope;

    scope.add(() => {
      const targets =
        typeof target === 'string'
          ? document.querySelectorAll<HTMLElement>(target)
          : target;

      if (!targets) return;

      const scrollAutoplay =
        autoplay ??
        onScroll({
          target: typeof target === 'string' ? target : (target as HTMLElement),
          container,
          sync,
          start,
          end,
          threshold,
          onUpdate: onUpdateRef.current
            ? (self: { progress: number }) => {
                onUpdateRef.current?.(self.progress);
              }
            : undefined,
        } as any);

      if (keyframes && keyframes.length > 0) {
        const tl = createTimeline({
          defaults: { duration: 600, ease: 'outExpo' },
        });
        keyframes.forEach((kf) => {
          tl.add(targets, kf as any);
        });
        animRef.current = tl as unknown as ReturnType<typeof animate>;
      } else if (properties) {
        animate(targets, {
          ...properties,
          autoplay: scrollAutoplay as any,
        } as any);
      }
    });

    return () => {
      scope.revert();
    };
  }, [
    target,
    container,
    sync,
    start,
    end,
    threshold,
    respectReduced,
    autoplay,
    keyframesKey,
    propertiesKey,
  ]);

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

  return { play, pause, revert, scope: scopeRef, anim: animRef };
}

export default useScrollAnimation;
