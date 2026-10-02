// src/components/blog/LightningTransition.tsx
/* Muted editorial wipe — warm overlay, no neon bolts. */

import React, { useEffect, useRef } from 'react';
import { createTimeline } from 'animejs';
import { isReducedMotion, durations, easings } from '../../config/animations';

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
      defaults: { ease: easings.expoOut },
      onComplete: () => {
        if (root) root.style.pointerEvents = 'none';
        onComplete?.();
      },
    });

    // The sheet is a page turn, not a strobe: it covers, hands off at the
    // midpoint, then lifts. Every beat is derived from the shared duration
    // tokens so the wipe keeps pace with the rest of the reading surface.
    const coverMs = durations.enter * 1000 * 0.5;
    const handOffMs = durations.enter * 1000 * 0.6;
    const liftAtMs = durations.enter * 1000 * 0.66;
    const liftMs = durations.exit * 1000 * 0.8;

    if (sheet) {
      tl.add(sheet, { scaleY: [0, 1], opacity: [0, 1], duration: coverMs }, 0);
    }

    tl.call(() => onMidpoint?.(), handOffMs);

    if (sheet) {
      tl.add(
        sheet,
        { scaleY: [1, 0], opacity: [1, 0], duration: liftMs },
        liftAtMs,
      );
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
