// src/hooks/useFormAnimation.ts
/* Form micro-interactions: focus glow, error shake, success pulse. */

import { useCallback, useRef } from 'react';
import { animate } from 'animejs';
import { isReducedMotion } from '../config/animations';

export function useFormAnimation() {
  const shakenRef = useRef<Set<HTMLElement>>(new Set());

  const focusIn = useCallback((el: HTMLElement | null) => {
    if (!el || isReducedMotion()) return;
    animate(el, {
      scale: [1, 1.012],
      duration: 200,
      ease: 'outExpo',
      composition: 'blend',
    });
  }, []);

  const focusOut = useCallback((el: HTMLElement | null) => {
    if (!el || isReducedMotion()) return;
    animate(el, {
      scale: 1,
      duration: 180,
      ease: 'outQuad',
      composition: 'blend',
    });
  }, []);

  const shake = useCallback((el: HTMLElement | null) => {
    if (!el || isReducedMotion()) return;
    if (shakenRef.current.has(el)) return;
    shakenRef.current.add(el);
    animate(el, {
      x: [0, -8, 8, -5, 5, -2, 2, 0],
      duration: 420,
      ease: 'outQuad',
      onComplete: () => shakenRef.current.delete(el),
    });
  }, []);

  const successPulse = useCallback((el: HTMLElement | null) => {
    if (!el || isReducedMotion()) return;
    animate(el, {
      scale: [1, 1.06, 1],
      duration: 520,
      ease: 'outElastic',
    });
  }, []);

  return { focusIn, focusOut, shake, successPulse };
}

export default useFormAnimation;
