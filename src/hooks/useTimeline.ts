// src/hooks/useTimeline.ts
/* ═══════════════════════════════════════════════════════════════════════════════
   useTimeline — Declarative timeline builder using Anime.js v4 createTimeline.
   Builds complex multi-element animation sequences with scroll sync support.
=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=- */

import { useRef, useEffect } from 'react';
import { createTimeline, onScroll, stagger } from 'animejs';
import { easings, durations } from '../config/animations';

export interface TimelineTarget {
  /** CSS selector or Element */
  target: string | Element | Element[];
  /** Animation parameters */
  params: Record<string, unknown>;
  /** Timeline position */
  position?: number | string;
  /** Stagger delay between matched elements */
  staggerDelay?: number;
}

export interface TimelineParams {
  /** Timeline phases */
  targets: TimelineTarget[];
  /** Global defaults */
  defaults?: Record<string, unknown>;
  /** Timeline-level parameters */
  timelineOptions?: Record<string, unknown>;
  /** Sync with scroll */
  scroll?: {
    container?: HTMLElement | string;
    start?: string;
    end?: string;
    scrub?: boolean;
    pin?: boolean;
  };
  /** Callback on complete */
  onComplete?: () => void;
  /** Auto-play on mount */
  autoPlay?: boolean;
  /** Loop */
  loop?: boolean;
}

/**
 * useTimeline — builds and controls a complex animation timeline.
 * @example
 * ```ts
 * const { play, pause, tl, isPlaying } = useTimeline({
 *   targets: [
 *     { target: '.item-1', params: { opacity: [0, 1], y: [30, 0] }, position: 0 },
 *     { target: '.item-2', params: { opacity: [0, 1], y: [30, 0] }, staggerDelay: 100, position: '-=300' },
 *   ],
 *   onComplete: () => console.log('done'),
 * });
 * ```
 */
export function useTimeline(params: TimelineParams) {
  const containerRef = useRef<HTMLElement>(null);
  const timelineRef = useRef<ReturnType<typeof createTimeline> | null>(null);
  const isPlayingRef = useRef(false);

  const {
    targets,
    defaults,
    timelineOptions,
    scroll: scrollOpts,
    onComplete,
    autoPlay = true,
    loop = false,
  } = params;

  const build = () => {
    if (!containerRef.current || !targets?.length) return;

    const reduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;

    const tlOptions: Record<string, unknown> = {
      ...timelineOptions,
      defaults: {
        ease: easings.expoOut,
        duration: reduced ? 0 : durations.enter * 1000,
        ...((defaults as Record<string, unknown>) ?? {}),
      },
      ...(loop && { loop: true, alternate: true }),
      ...(onComplete && { onComplete }),
    };

    // If scroll is requested, use scroll-linked timeline
    if (scrollOpts) {
      // Use onScroll for scroll-linked animations
      const scrollConfig = {
        container: scrollOpts.container ?? containerRef.current,
        start: scrollOpts.start ?? 'top center',
        ...(scrollOpts.end && { end: scrollOpts.end }),
        ...(scrollOpts.scrub !== undefined && { sync: scrollOpts.scrub }),
      };
      // onScroll is used as autoplay value on timeline
      (tlOptions as Record<string, unknown>).autoplay = onScroll(scrollConfig);
    }

    const tl = createTimeline(tlOptions);
    timelineRef.current = tl;

    targets.forEach((t) => {
      const targetEl =
        typeof t.target === 'string'
          ? containerRef.current?.querySelectorAll(t.target) ?? t.target
          : t.target;

      const animParams: Record<string, unknown> = {
        ...t.params,
        ...(reduced && { duration: 0 }),
      };

      if (t.staggerDelay && Array.isArray(targetEl) && targetEl.length > 1) {
        animParams.delay = stagger(t.staggerDelay, { from: 'first' });
      }

      tl.add(targetEl, animParams as any, t.position ?? '<');
    });

    if (autoPlay) {
      tl.play();
      isPlayingRef.current = true;
    }
  };

  const play = () => {
    timelineRef.current?.play();
    isPlayingRef.current = true;
  };

  const pause = () => {
    timelineRef.current?.pause();
    isPlayingRef.current = false;
  };

  const restart = () => {
    timelineRef.current?.restart();
  };

  const reset = () => {
    timelineRef.current?.reset();
  };

  const seek = (time: number) => {
    timelineRef.current?.seek(time);
  };

  useEffect(() => {
    build();
    return () => {
      timelineRef.current?.revert();
    };
  }, [params]);

  return {
    ref: containerRef,
    tl: timelineRef.current,
    play,
    pause,
    restart,
    reset,
    seek,
    isPlaying: isPlayingRef.current,
  };
}

export { stagger };
