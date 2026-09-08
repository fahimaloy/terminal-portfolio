// src/components/ui/TypewriterText.tsx
// Editorial stagger-fade — replaces typewriter+glitch with muted y+opacity choreography.
import React, { useEffect, useRef } from 'react';
import { animate, createScope, stagger } from 'animejs';
import { durations, easings, isReducedMotion } from '../../config/animations';

type Props = {
  text: string;
  speed?: number;
  startDelay?: number;
  showCursor?: boolean;
  onDone?: () => void;
  className?: string;
};

export default function TypewriterText({
  text,
  speed: _speed = 40,
  startDelay = 0,
  showCursor: _showCursor = false,
  onDone,
  className = '',
}: Props) {
  const rootRef = useRef<HTMLSpanElement>(null);
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  });

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    if (isReducedMotion()) {
      onDoneRef.current?.();
      return;
    }
    const letters = root.querySelectorAll('.tw-char');
    if (!letters.length) {
      onDoneRef.current?.();
      return;
    }
    const scope = createScope({
      root,
      mediaQueries: { reduceMotion: '(prefers-reduced-motion: reduce)' },
      defaults: {
        duration: (durations[700] ?? 0.7) * 1000,
        ease: easings.outExpo ?? 'outExpo',
        composition: 'blend',
      },
    } as Parameters<typeof createScope>[0]);

    let cancelled = false;
    const timer = startDelay > 0 ? setTimeout(run, startDelay) : null;
    if (!timer) run();

    function run() {
      if (cancelled) return;
      scope.add(() => {
        animate(letters, {
          y: [8, 0],
          opacity: [0, 1],
          duration: 700,
          ease: 'outExpo',
          delay: stagger(40, { from: 'first' }),
          onComplete: () => onDoneRef.current?.(),
        });
      });
    }

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      scope.revert();
    };
  }, [text, startDelay]);

  return (
    <span ref={rootRef} className={className} aria-label={text}>
      {Array.from(text).map((ch, i) => (
        <span
          key={i}
          className="tw-char inline-block opacity-0"
          style={{ whiteSpace: ch === ' ' ? 'pre' : undefined }}
        >
          {ch === ' ' ? '\u00A0' : ch}
        </span>
      ))}
    </span>
  );
}
