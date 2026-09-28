// src/components/ui/GlitchText.tsx
/* GLITCH TEXT — editorial heading with a restrained, interaction-triggered
   chromatic split.

   WHY HOVER AND NOT MOUNT: this is a shared heading primitive used by ~17 call
   sites (admin panel nav, form headings, blog reels, the error boundary). A
   glitch that fired on every mount would be noise in all of them. Triggering
   on pointer-enter/focus makes it a deliberate response to an interaction, and
   it degrades to the plain fg-1 heading everywhere it is not triggered.

   WHAT THE EFFECT IS: two offset `text-shadow` layers in the accent hue and
   its counter-hue, plus a sub-2px horizontal jitter. Both are written
   IMPERATIVELY from an anime.js envelope — the element's static inline style
   carries no text-shadow, so a component that is never hovered renders as
   exactly the plain heading it has always rendered.

   Both offsets are `--neon-*` token vars (never raw hex/rgba) drawn from the
   six-name accent vocabulary. `ice` is the fixed counter-layer, except when the
   accent already IS ice, where `cyan` takes the counter so the split always
   reads as a genuine two-tone edge.

   The whole effect is gated on `canAnimate()`, which is false under
   `prefers-reduced-motion` and in jsdom, so reduced-motion users and the test
   suite get the static heading with no shadow written at all. */

import React, { useEffect, useRef } from 'react';
import { animate, createScope, stagger } from 'animejs';
import {
  durations,
  easings,
  isReducedMotion,
  canAnimate,
} from '../../config/animations';

import type { AccentColor } from '../../config/animations';

export type GlitchAccent = AccentColor;

type Props = {
  children: React.ReactNode;
  accent?: GlitchAccent;
  as?: keyof React.JSX.IntrinsicElements;
  className?: string;
  shift?: boolean;
  underline?: boolean;
  'data-testid'?: string;
};

const SPLIT_DURATION_MS = durations[300] * 1000;
const JITTER_DURATION_MS = durations[150] * 1000;
/** Peak horizontal offset of each shadow layer, in px. Deliberately sub-2px:
 *  a readable chromatic edge, not a broken-looking heading. */
const SPLIT_PEAK_PX = 2;
/** Peak horizontal jitter of the element itself, in px. */
const JITTER_PEAK_PX = 1.5;

export default function GlitchText({
  children,
  as: Tag = 'span',
  className = '',
  accent = 'cyan',
  shift = false,
  underline = false,
  'data-testid': testId,
}: Props) {
  const rootRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || isReducedMotion() || !canAnimate()) return;

    const scope = createScope({ root });
    scope.add(() => {
      // Entrance: the pre-existing fade/rise, unchanged. The glitch is an
      // interaction effect, so it deliberately does not fire here.
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

    /* The glitch envelope is a plain object animated from 1 -> 0, so the
       shadow snaps on and decays off on the token clock. Nothing is written
       until the first frame, which is what keeps the resting state clean. */
    const counterAccent: AccentColor = accent === 'ice' ? 'cyan' : 'ice';
    const envelope = { amount: 0 };
    let glitchTl: ReturnType<typeof animate> | null = null;

    const clearSplit = () => {
      root.style.textShadow = '';
    };

    const fire = () => {
      if (!canAnimate()) return;
      glitchTl?.pause();
      envelope.amount = 1;
      glitchTl = animate(envelope, {
        amount: [1, 0],
        duration: SPLIT_DURATION_MS,
        ease: easings.outQuad,
        onUpdate: () => {
          const a = envelope.amount;
          if (a <= 0.01) {
            clearSplit();
            return;
          }
          const off = a * SPLIT_PEAK_PX;
          root.style.textShadow = `${off.toFixed(2)}px 0 var(--neon-${accent}), ${(-off).toFixed(2)}px 0 var(--neon-${counterAccent})`;
        },
        onComplete: clearSplit,
      });
    };

    const stop = () => {
      glitchTl?.pause();
      envelope.amount = 0;
      clearSplit();
    };

    if (shift) {
      // Physical release: a single short jitter as the split opens.
      animate(root, {
        x: [
          { to: -JITTER_PEAK_PX },
          { to: JITTER_PEAK_PX },
          { to: 0 },
        ],
        duration: JITTER_DURATION_MS,
        ease: easings.outQuad,
        composition: 'blend',
      });
    }

    root.addEventListener('pointerenter', fire);
    root.addEventListener('pointerleave', stop);
    // Keyboard parity: the glitch is reachable without a pointer.
    root.addEventListener('focus', fire);
    root.addEventListener('blur', stop);

    return () => {
      root.removeEventListener('pointerenter', fire);
      root.removeEventListener('pointerleave', stop);
      root.removeEventListener('focus', fire);
      root.removeEventListener('blur', stop);
      glitchTl?.pause();
      clearSplit();
      scope.revert();
    };
  }, [accent, shift]);

  return React.createElement(
    Tag as string,
    {
      ref: rootRef as unknown as React.Ref<HTMLElement>,
      'data-testid': testId,
      className: `font-display tracking-wide inline-block ${
        underline ? 'border-b border-[var(--border-subtle)] pb-1' : ''
      } ${className}`,
      // No text-shadow here on purpose — see the header. The glitch writes it
      // imperatively and only while it is actually playing.
      style: { color: 'var(--fg-1)' },
    },
    children,
  );
}
