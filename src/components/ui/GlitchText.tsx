// src/components/ui/GlitchText.tsx
/* Editorial heading — single span, warm fg-1, optional hairline accent underline.
   No RGB offset layers, no glitch keyframes. Subtle fadeInUp stagger if allowed. */

import React, { useEffect, useRef } from 'react';
import { animate, createScope, stagger } from 'animejs';
import {
  durations,
  easings,
  isReducedMotion,
  canAnimate,
} from '../../config/animations';

export type GlitchAccent =
  | 'yellow'
  | 'magenta'
  | 'cyan'
  | 'green'
  | 'red'
  | 'purple'
  | 'blue';

type Props = {
  children: React.ReactNode;
  accent?: GlitchAccent;
  as?: keyof JSX.IntrinsicElements;
  className?: string;
  shift?: boolean;
  underline?: boolean;
  'data-testid'?: string;
};

export default function GlitchText({
  children,
  as: Tag = 'span',
  className = '',
  underline = false,
  'data-testid': testId,
}: Props) {
  const rootRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!rootRef.current || isReducedMotion() || !canAnimate()) return;
    const root = rootRef.current;
    const scope = createScope({ root });
    scope.add(() => {
      // Single-entity entrance: y + opacity stagger over chars/words if present,
      // otherwise one-shot fade on the root. No offset, no glitch.
      const letters = root.querySelectorAll<HTMLElement>('.glitch-letter');
      if (letters.length) {
        animate(letters, {
          opacity: [0, 1],
          y: [8, 0],
          duration: durations.enter * 1000,
          ease: easings.expoOut,
          delay: stagger(durations.stagger * 1000, { from: 'first' }),
        });
      } else {
        animate(root, {
          opacity: [0, 1],
          y: [8, 0],
          duration: durations.enter * 1000,
          ease: easings.expoOut,
        });
      }
    });
    return () => scope.revert();
  }, []);

  return React.createElement(
    Tag as string,
    {
      ref: rootRef as unknown as React.Ref<HTMLElement>,
      'data-testid': testId,
      className: `font-display tracking-wide inline-block ${
        underline ? 'border-b border-[var(--border-subtle)] pb-1' : ''
      } ${className}`,
      style: { color: 'var(--fg-1)' },
    },
    children,
  );
}
