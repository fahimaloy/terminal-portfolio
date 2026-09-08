// src/components/blog/LightningTransition.tsx
/* Muted editorial wipe — warm overlay, no neon bolts. */

import React, { useEffect, useRef } from 'react';
import { createTimeline } from 'animejs';
import { isReducedMotion } from '../../config/animations';

interface Props {
  /** Increment/change this to fire the transition. */
  trigger: number;
  onMidpoint?: () => void;
  onComplete?: () => void;
}

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

    const tl = createTimeline({
      defaults: { ease: 'outExpo' },
      onComplete: () => {
        if (root) root.style.pointerEvents = 'none';
        onComplete?.();
      },
    });

    if (sheet) {
      tl.add(sheet, { scaleY: [0, 1], opacity: [0, 1], duration: 300 }, 0);
    }

    tl.call(() => onMidpoint?.(), 360);

    if (sheet) {
      tl.add(sheet, { scaleY: [1, 0], opacity: [1, 0], duration: 320 }, 420);
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
        style={{ background: 'var(--bg-1)' }}
      />
    </div>
  );
}
