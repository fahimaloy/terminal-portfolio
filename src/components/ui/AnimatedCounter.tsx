// src/components/ui/AnimatedCounter.tsx
/* Count-up number display. Renders the final value immediately when animation
   isn't possible (SSR / jsdom / reduced motion) so content is never invisible. */

import React, { useEffect, useRef, useState } from 'react';
import { animate } from 'animejs';
import { canAnimate } from '../../config/animations';

interface Props {
  value: number;
  duration?: number;
  delay?: number;
  className?: string;
  /** Appended after the number, e.g. "+" or "%". */
  suffix?: string;
}

export default function AnimatedCounter({
  value,
  duration = 1200,
  delay = 0,
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

    const timer = setTimeout(() => {
      proxy.current.val = 0;
      animate(proxy.current, {
        val: [0, value],
        duration,
        ease: 'outExpo',
        onUpdate: () => setDisplay(Math.round(proxy.current.val)),
      });
    }, delay);

    return () => clearTimeout(timer);
  }, [value, duration, delay]);

  return (
    <span className={className}>
      {display}
      {suffix}
    </span>
  );
}
