// src/components/blog/LightningTransition.tsx
/* Anime-style lightning wipe played when swapping between blog posts. */

import React, { useEffect, useRef } from 'react';
import { animate, createTimeline, stagger } from 'animejs';
import { isReducedMotion } from '../../config/animations';

interface Props {
  /** Increment/change this to fire the transition. */
  trigger: number;
  onMidpoint?: () => void;
  onComplete?: () => void;
}

const BOLTS = [
  'M60,0 L52,34 L74,30 L44,100 L54,58 L34,62 Z',
  'M30,0 L20,40 L44,36 L14,100 L26,54 L4,58 Z',
  'M90,0 L82,38 L104,32 L76,100 L86,56 L66,60 Z',
];

export default function LightningTransition({
  trigger,
  onMidpoint,
  onComplete,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const firstRun = useRef(true);

  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    const root = rootRef.current;
    if (!root) return;

    if (isReducedMotion()) {
      onMidpoint?.();
      onComplete?.();
      return;
    }

    root.style.pointerEvents = 'auto';

    const sheet = root.querySelector<HTMLElement>('.lt-sheet');
    const bolts = root.querySelectorAll<SVGPathElement>('.lt-bolt');
    const flash = root.querySelector<HTMLElement>('.lt-flash');

    const tl = createTimeline({
      defaults: { ease: 'outExpo' },
      onComplete: () => {
        if (root) root.style.pointerEvents = 'none';
        onComplete?.();
      },
    });

    if (sheet) {
      tl.add(sheet, { scaleY: [0, 1], opacity: [0, 1], duration: 260 }, 0);
    }
    if (bolts.length) {
      tl.add(
        bolts,
        {
          opacity: [0, 1, 0],
          scaleY: [0.6, 1],
          duration: 420,
          delay: stagger(70),
        },
        120,
      );
    }
    if (flash) {
      tl.add(flash, { opacity: [0, 0.85, 0], duration: 240 }, 220);
    }

    // Swap content while the screen is covered.
    tl.call(() => onMidpoint?.(), 380);

    if (sheet) {
      tl.add(sheet, { scaleY: [1, 0], opacity: [1, 0], duration: 300 }, 460);
    }

    return () => {
      tl.revert();
    };
  }, [trigger, onMidpoint, onComplete]);

  return (
    <div
      ref={rootRef}
      aria-hidden="true"
      className="fixed inset-0 z-[80] pointer-events-none overflow-hidden"
    >
      <div
        className="lt-sheet absolute inset-0 origin-top opacity-0"
        style={{
          background:
            'linear-gradient(180deg, var(--glow-cyan-mid), var(--overlay-void-96) 45%, var(--glow-magenta-mid))',
        }}
      />
      <div
        className="lt-flash absolute inset-0 opacity-0"
        style={{ background: 'var(--overlay-white-90)' }}
      />
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 120 100"
        preserveAspectRatio="none"
      >
        {BOLTS.map((d, i) => (
          <path
            key={i}
            className="lt-bolt"
            d={d}
            fill={
              ['var(--neon-cyan)', 'var(--neon-yellow)', 'var(--neon-magenta)'][
                i % 3
              ]
            }
            opacity="0"
            style={{ filter: 'drop-shadow(0 0 6px currentColor)' }}
          />
        ))}
      </svg>
    </div>
  );
}
