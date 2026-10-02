// src/components/ui/AnimatedCounter.tsx
/* Count-up number display. Renders the final value immediately when animation
   isn't possible (SSR / jsdom / reduced motion) so content is never invisible. */

import React, { useEffect, useRef, useState } from 'react';
import { animate } from 'animejs';
import { canAnimate, durations, easings } from '../../config/animations';

interface Props {
  value: number;
  duration?: number;
  className?: string;
  /** Appended after the number, e.g. "+" or "%". */
  suffix?: string;
}

export default function AnimatedCounter({
  value,
  // 700ms, and it used to look like a token read that was not one:
  // `durations[700]` has no `700` key, so `?? 0.7` was silently supplying the
  // whole value while the source claimed to be token-derived. That is worse
  // than no token at all — the fiction survives review and drifts the day a
  // `--dur-700` lands with a different number. `splashAct` is the real 0.7,
  // so the count-up timing is byte-identical to what shipped.
  duration = durations.splashAct * 1000,
  className = '',
  suffix = '',
}: Props) {
  const [display, setDisplay] = useState(canAnimate() ? 0 : value);
  const proxy = useRef({ val: 0 });

  useEffect(() => {
    if (!canAnimate()) {
      setDisplay(value);
      return;
    }

    let animController: ReturnType<typeof animate> | null = null;

    // Deferred by a macrotask so the value paints before the count rolls — with
    // no delay argument, which is what the 0ms timeout was doing. The `delay`
    // prop is gone rather than token-sourced: nothing passed it, so it was a
    // knob nobody could turn, and 0 has no `--dur-*` token to source anyway.
    const timer = setTimeout(() => {
      proxy.current.val = 0;
      animController = animate(proxy.current, {
        val: [0, value],
        duration,
        ease: easings.outExpo ?? 'outExpo',
        onUpdate: () => setDisplay(Math.round(proxy.current.val)),
      });
    });

    return () => {
      clearTimeout(timer);
      animController?.cancel();
    };
  }, [value, duration]);

  return (
    <span className={className}>
      {display}
      {suffix}
    </span>
  );
}
