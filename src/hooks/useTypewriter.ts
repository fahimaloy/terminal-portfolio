// src/hooks/useTypewriter.ts
/* ═══════════════════════════════════════════════════════════════════════════════
   useTypewriter — Typewriter text effect
   Writes text character by character with cursor blink
═══════════════════════════════════════════════════════════════════════════════ */

import { useEffect, useRef, useCallback, useState } from 'react';
import { animate, createScope } from 'animejs';
import { isReducedMotion } from '../config/animations';

export interface TypewriterOptions {
  /** Target element selector */
  selector?: string;
  /** Root element for scope */
  root?: HTMLElement | null;
  /** Text to type */
  text?: string;
  /** Characters per second */
  speed?: number;
  /** Auto-play on mount */
  autoplay?: boolean;
  /** Cursor character */
  cursor?: string;
  /** Blink cursor */
  blinkCursor?: boolean;
  /** Loop the typewriter */
  loop?: boolean;
  /** Delay before starting in ms */
  delay?: number;
  /** Pause at end in ms */
  endPause?: number;
  /** Respect reduced motion */
  respectReduced?: boolean;
  /** Callback on complete */
  onComplete?: () => void;
  /** Callback on character */
  onChar?: (char: string, index: number) => void;
}

export function useTypewriter(options: TypewriterOptions = {}) {
  const {
    selector = '.typewriter-text',
    root,
    text = '',
    speed = 80,
    autoplay = true,
    cursor = '█',
    blinkCursor = true,
    loop = false,
    delay = 0,
    endPause = 1000,
    respectReduced = true,
    onComplete,
    onChar,
  } = options;

  const scopeRef = useRef<ReturnType<typeof createScope> | null>(null);
  const animRef = useRef<ReturnType<typeof animate> | null>(null);
  const [displayText, setDisplayText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const play = useCallback(() => {
    animRef.current?.play();
  }, []);

  const pause = useCallback(() => {
    animRef.current?.pause();
  }, []);

  const restart = useCallback(() => {
    animRef.current?.restart();
    setCurrentIndex(0);
    setDisplayText('');
    setIsTyping(true);
  }, []);

  const revert = useCallback(() => {
    scopeRef.current?.revert();
    scopeRef.current = null;
    animRef.current = null;
    setIsTyping(false);
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

      const textToType = text || el.textContent || '';
      if (!textToType) return;

      setIsTyping(true);

      const proxyTarget = { progress: 0 };

      const anim = animate(proxyTarget, {
        progress: 1,
        duration: textToType.length * speed,
        ease: 'linear',
        loop,
        autoplay,
        delay,
        onUpdate: () => {
          const p = proxyTarget.progress;
          const idx = Math.floor(p * textToType.length);
          const currentText = textToType.substring(0, idx);

          setDisplayText(currentText + cursor);
          el.textContent = currentText + cursor;
          setCurrentIndex(idx);

          if (onChar && idx > 0 && idx <= textToType.length) {
            onChar(textToType[idx - 1], idx - 1);
          }
        },
        onComplete: () => {
          setDisplayText(textToType);
          el.textContent = textToType;
          setIsTyping(false);
          onComplete?.();
        },
        });

      animRef.current = anim;
    });

    return () => {
      scope.revert();
      scopeRef.current = null;
      animRef.current = null;
      setIsTyping(false);
    };
  }, [
    selector,
    root,
    text,
    speed,
    autoplay,
    cursor,
    blinkCursor,
    loop,
    delay,
    endPause,
    respectReduced,
    onComplete,
    onChar,
  ]);

  return {
    displayText,
    isTyping,
    currentIndex,
    play,
    pause,
    restart,
    revert,
    scope: scopeRef,
    anim: animRef,
  };
}

export default useTypewriter;
