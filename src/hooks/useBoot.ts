// src/hooks/useBoot.ts
/* ═══════════════════════════════════════════════════════════════════════════════
   useBoot — Boot/intro sequence animations
   Multi-phase timeline with scramble text, status bars, and fade transitions
═══════════════════════════════════════════════════════════════════════════════ */

import { useEffect, useRef, useCallback, useState } from 'react';
import { createTimeline, createScope, animate, spring } from 'animejs';
import { isReducedMotion, durations } from '../config/animations';

export interface BootOptions {
  /** Root element ref */
  root?: HTMLElement | null;
  /** Steps to display during boot */
  steps?: string[];
  /** Total duration in ms */
  totalDuration?: number;
  /** Skip the boot after this many ms */
  skippableAfter?: number;
  /** Respect reduced motion */
  respectReduced?: boolean;
  /** Callback when boot completes */
  onComplete?: () => void;
  /** Callback when boot is skipped */
  onSkip?: () => void;
}

export function useBoot(options: BootOptions = {}) {
  const {
    root,
    steps = [
      'INITIALIZING_CORE',
      'LOADING_MODULES',
      'COMPILING_ASSETS',
      'SYSTEM_READY',
    ],
    totalDuration = 2500,
    skippableAfter = 1000,
    respectReduced = true,
    onComplete,
    onSkip,
  } = options;

  const scopeRef = useRef<ReturnType<typeof createScope> | null>(null);
  const timelineRef = useRef<ReturnType<typeof createTimeline> | null>(null);
  const onCompleteRef = useRef(onComplete);
  const onSkipRef = useRef(onSkip);
  onCompleteRef.current = onComplete;
  onSkipRef.current = onSkip;
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  const skip = useCallback(() => {
    if (!isVisible) return;
    timelineRef.current?.complete();
    setIsVisible(false);
    onSkipRef.current?.();
  }, [isVisible]);

  const play = useCallback(() => {
    timelineRef.current?.play();
  }, []);

  const pause = useCallback(() => {
    timelineRef.current?.pause();
  }, []);

  const revert = useCallback(() => {
    scopeRef.current?.revert();
    scopeRef.current = null;
    timelineRef.current = null;
  }, []);

  useEffect(() => {
    if (isReducedMotion() && respectReduced) {
      setIsVisible(false);
      onComplete?.();
      return;
    }

    if (!root) return;

    const reduced = isReducedMotion();
    const total = reduced ? 200 : totalDuration;

    const scope = createScope({
      root,
      mediaQueries: {
        reduceMotion: '(prefers-reduced-motion: reduce)',
      },
    });

    scopeRef.current = scope;

    scope.add(() => {
      const stepElements = root.querySelectorAll<HTMLElement>('.boot-step');
      const progressBar = root.querySelector<HTMLElement>('.boot-progress-bar');
      const logo = root.querySelector<HTMLElement>('.boot-logo');

      const tl = createTimeline({
        defaults: { duration: 400, ease: 'outExpo' },
        onComplete: () => {
          setIsVisible(false);
          onCompleteRef.current?.();
        },
        onUpdate: (self: { progress: number }) => {
          setProgress(Math.round(self.progress * 100));
          const stepIdx = Math.min(
            Math.floor((self.progress * 100) / (100 / steps.length)),
            steps.length - 1,
          );
          setCurrentStep(stepIdx);
        },
      });

      timelineRef.current = tl;

      // Phase 1: Logo scale-in with spring
      if (logo) {
        tl.add(
          logo,
          {
            scale: [0.3, 1],
            opacity: [0, 1],
            ...spring({ stiffness: 120, damping: 10 }),
          },
          0,
        );
      }

      // Phase 2: Step labels scramble-reveal
      if (stepElements.length > 0) {
        stepElements.forEach((el, i) => {
          const stepTime = (i / steps.length) * total * 0.7;
          tl.add(
            el,
            {
              opacity: [0, 1],
              y: [8, 0],
              duration: 300,
              ease: 'outExpo',
            },
            stepTime,
          );
        });
      }

      // Phase 3: Progress bar fill
      if (progressBar) {
        tl.add(
          progressBar,
          {
            width: ['0%', '100%'],
            duration: total * 0.8,
            ease: 'inOutExpo',
          },
          100,
        );
      }

      // Phase 4: Final fade out
      const rootEl = root as HTMLElement;
      tl.add(
        rootEl,
        {
          opacity: [1, 0],
          duration: 300,
          ease: 'inExpo',
        },
        total - 300,
      );
    });

    // Auto-skip timeout
    const skipTimer = setTimeout(() => {
      // Boot becomes skippable but doesn't auto-skip
    }, skippableAfter);

    return () => {
      clearTimeout(skipTimer);
      scope.revert();
      scopeRef.current = null;
      timelineRef.current = null;
    };
  }, [root, steps, totalDuration, skippableAfter, respectReduced]);

  return {
    progress,
    currentStep,
    currentLabel: steps[currentStep] || '',
    isVisible,
    isSkippable: progress > 10,
    skip,
    play,
    pause,
    revert,
    scope: scopeRef,
    timeline: timelineRef,
  };
}

export default useBoot;
