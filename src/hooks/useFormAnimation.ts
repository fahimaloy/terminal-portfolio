// src/hooks/useFormAnimation.ts — micro-interactions using token-driven durations/easings
import { useCallback, useRef } from 'react';
import { animate } from 'animejs';
import { isReducedMotion, durations, easings } from '../config/animations';

export function useFormAnimation() {
  const shakenRef = useRef<Set<HTMLElement>>(new Set());

  const focusIn = useCallback((el: HTMLElement | null) => {
    if (!el || isReducedMotion()) return;
    animate(el, {
      scale: [1, 1.012],
      duration: durations.hover * 1000,
      ease: easings.expoOut,
      composition: 'blend',
    });
  }, []);

  const focusOut = useCallback((el: HTMLElement | null) => {
    if (!el || isReducedMotion()) return;
    animate(el, {
      scale: 1,
      duration: durations.tap * 1000 + 60,
      ease: easings.quadOut,
      composition: 'blend',
    });
  }, []);

  const shake = useCallback((el: HTMLElement | null) => {
    if (!el || isReducedMotion()) return;
    if (shakenRef.current.has(el)) return;
    shakenRef.current.add(el);
    animate(el, {
      x: [0, -8, 8, -5, 5, -2, 2, 0],
      duration: durations.enter * 1000 - 60,
      ease: easings.quadOut,
      onComplete: () => shakenRef.current.delete(el),
    });
  }, []);

  const successPulse = useCallback((el: HTMLElement | null) => {
    if (!el || isReducedMotion()) return;
    animate(el, {
      scale: [1, 1.06, 1],
      duration: durations.enter * 1000 + 40,
      ease: easings.elasticOut,
    });
  }, []);

  return { focusIn, focusOut, shake, successPulse };
}

export default useFormAnimation;
