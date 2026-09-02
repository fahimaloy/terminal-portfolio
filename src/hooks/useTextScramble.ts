// src/hooks/useTextScramble.ts
/* ═══════════════════════════════════════════════════════════════════════════════
   useTextScramble — Text scramble reveal effect (terminal/boot style)
   Uses anime.js scrambleText or manual character cycling
═══════════════════════════════════════════════════════════════════════════════ */

import { useEffect, useRef, useCallback, useState } from 'react';
import { animate, createScope } from 'animejs';
import { isReducedMotion } from '../config/animations';

export interface ScrambleOptions {
  /** CSS selector */
  selector?: string;
  /** Root element for scope */
  root?: HTMLElement | null;
  /** Text to scramble to */
  text?: string;
  /** Auto-play on mount */
  autoplay?: boolean;
  /** Cursor character */
  cursor?: string;
  /** Scramble characters set */
  scrambleChars?: string;
  /** Duration in ms */
  duration?: number;
  /** Easing */
  ease?: string;
  /** Respect reduced motion */
  respectReduced?: boolean;
  /** Callback on complete */
  onComplete?: () => void;
  /** Loop the scramble effect */
  loop?: boolean;
}

const DEFAULT_CHARS =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';

export function useTextScramble(options: ScrambleOptions = {}) {
  const {
    selector = '.scramble-text',
    root,
    text = '',
    autoplay = true,
    cursor = '█',
    scrambleChars = 'uppercase',
    duration = 1500,
    ease = 'outExpo',
    respectReduced = true,
    onComplete,
    loop = false,
  } = options;

  const scopeRef = useRef<ReturnType<typeof createScope> | null>(null);
  const animRef = useRef<ReturnType<typeof animate> | null>(null);
  const [displayText, setDisplayText] = useState(text);
  const [isAnimating, setIsAnimating] = useState(false);

  const play = useCallback(() => {
    animRef.current?.play();
  }, []);

  const pause = useCallback(() => {
    animRef.current?.pause();
  }, []);

  const restart = useCallback(() => {
    animRef.current?.restart();
  }, []);

  const revert = useCallback(() => {
    scopeRef.current?.revert();
    scopeRef.current = null;
    animRef.current = null;
    setIsAnimating(false);
  }, []);

  useEffect(() => {
    if (isReducedMotion() && respectReduced) {
      setDisplayText(text);
      return;
    }

    if (!root) return;

    const scope = createScope({ root });
    scopeRef.current = scope;

    scope.add(() => {
      const el = root.querySelector<HTMLElement>(selector);
      if (!el) return;

      // Build character spans for scramble effect
      const chars =
        scrambleChars === 'uppercase'
          ? 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
          : scrambleChars === 'numbers'
          ? '0123456789'
          : DEFAULT_CHARS;

      const originalText = el.textContent || text;
      const charsArray = originalText.split('');

      let currentIndex = 0;
      const revealedIndices = new Set<number>();

      setIsAnimating(true);

      const proxyTarget = { progress: 0 };

      const anim = animate(proxyTarget, {
        progress: 1,
        duration,
        ease,
        loop,
        autoplay,
        onUpdate: () => {
          const p = proxyTarget.progress;
          const targetIndex = Math.floor(p * originalText.length);

          // Reveal characters progressively
          while (
            currentIndex < targetIndex &&
            currentIndex < originalText.length
          ) {
            revealedIndices.add(currentIndex);
            currentIndex++;
          }

          // Build display text
          let result = '';
          for (let i = 0; i < originalText.length; i++) {
            if (revealedIndices.has(i) || originalText[i] === ' ') {
              result += originalText[i];
            } else {
              result += chars[Math.floor(Math.random() * chars.length)];
            }
          }

          setDisplayText(result + cursor);
          el.textContent = result + cursor;
        },
        onComplete: () => {
          setDisplayText(originalText);
          el.textContent = originalText;
          setIsAnimating(false);
          onComplete?.();
        },
      });

      animRef.current = anim;
    });

    return () => {
      scope.revert();
      scopeRef.current = null;
      animRef.current = null;
      setIsAnimating(false);
    };
  }, [
    selector,
    root,
    text,
    autoplay,
    cursor,
    scrambleChars,
    duration,
    ease,
    respectReduced,
    onComplete,
    loop,
  ]);

  return {
    displayText,
    isAnimating,
    play,
    pause,
    restart,
    revert,
    scope: scopeRef,
    anim: animRef,
  };
}

export default useTextScramble;
