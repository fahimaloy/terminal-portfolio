// src/hooks/useFlashCurtain.ts
/* Flash-curtain VFX for blog swipe: amber → transparent + directional card slide */

import { useRef, useCallback, useEffect } from 'react';
import { createScope, createTimeline, stagger, spring } from 'animejs';
import {
  isReducedMotion,
  canAnimate,
  durations,
  easings,
  springs,
} from '../config/animations';

export type FlashDirection = 'next' | 'prev' | 'none';

export interface FlashCurtainOptions {
  color?: string;
  durationMs?: number;
}

export interface FlashScopeHandle {
  revert: () => void;
  add: (fn: () => void | Promise<void>) => void;
}

export function useFlashCurtain(
  rootRef: React.RefObject<HTMLElement | null>,
  curtainRef: React.RefObject<HTMLElement | null>,
  opts: FlashCurtainOptions = {},
) {
  const { color = 'var(--retro-amber)', durationMs = durations.exit * 1000 } =
    opts;
  const scopeRef = useRef<FlashScopeHandle | null>(null);

  const cleanup = useCallback(() => {
    scopeRef.current?.revert();
    scopeRef.current = null;
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

  const flash = useCallback(
    async (
      direction: FlashDirection = 'none',
      incomingEl?: HTMLElement | null,
      outgoingEl?: HTMLElement | null,
    ) => {
      if (!curtainRef.current || !rootRef.current) return;
      if (isReducedMotion() || !canAnimate()) {
        const scope = createScope({
          root: rootRef.current,
        }) as unknown as FlashScopeHandle;
        scopeRef.current = scope;
        scope.add(() => {
          if (incomingEl) {
            incomingEl.style.opacity = '1';
            incomingEl.style.transform = 'translateY(0)';
          }
        });
        setTimeout(() => scope.revert(), 60);
        return;
      }

      const scope = createScope({
        root: rootRef.current,
      }) as unknown as FlashScopeHandle;
      scopeRef.current = scope;

      await scope.add(async () => {
        const tl = createTimeline({
          defaults: { ease: easings.smooth },
        });

        const curtain = curtainRef.current!;
        curtain.style.background = color;
        curtain.style.opacity = '0';
        curtain.style.pointerEvents = 'none';

        tl.add(
          curtain,
          {
            opacity: [0, 1, 0.85, 0],
            duration: durationMs,
            ease: easings.smooth,
          },
          0,
        );

        const dirSign = direction === 'prev' ? -1 : 1;
        if (incomingEl) {
          tl.add(
            incomingEl,
            {
              y: [24 * dirSign, 0],
              opacity: [0, 1],
              duration: durationMs * 0.95,
              ease: spring(springs.snappy) as unknown as string,
              delay: stagger(12, { from: 'first' }),
            },
            40,
          );
        }
        if (outgoingEl) {
          tl.add(
            outgoingEl,
            {
              y: [0, -10 * dirSign],
              opacity: [1, 0.6],
              duration: durationMs * 0.7,
              ease: easings.smooth,
            },
            0,
          );
        }

        await new Promise<void>((res) =>
          window.setTimeout(() => res(), durationMs + 60),
        );
        scope.revert();
        scopeRef.current = null;
      });
    },
    [curtainRef, rootRef, color, durationMs],
  );

  return { flash, cleanup, scopeRef };
}

export default useFlashCurtain;
