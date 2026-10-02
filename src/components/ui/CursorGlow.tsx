'use client';

import React, { useEffect, useRef } from 'react';
import { createSafeAnimatable } from '../../utils/animatable';
import { durations, easings, isReducedMotion } from '../../config/animations';

interface CursorGlowProps {
  color?: string;
  size?: number;
  intensity?: number;
}

export default function CursorGlow({
  // Kept for API compat; resolved from warm tokens unless overridden
  color,
  size = 160,
  intensity = 1,
}: CursorGlowProps) {
  const glowRef = useRef<HTMLDivElement>(null);
  const animatableRef = useRef<ReturnType<typeof createSafeAnimatable> | null>(
    null,
  );

  // Resolve warm default via CSS var; caller override wins
  const bg = color ?? 'var(--fg-1)';

  useEffect(() => {
    if (isReducedMotion()) return;
    const glowEl = glowRef.current;
    if (!glowEl) return;

    animatableRef.current = createSafeAnimatable(glowEl, {
      x: 0,
      y: 0,
      // Was 400ms — no --dur-400 exists, so this takes the next token down
      // (durations[300]), matching ExperienceTimeline/AdminLayout.
      duration: durations[300] * 1000,
      ease: easings.outExpo,
    });

    const handleMouseMove = (e: MouseEvent) => {
      if (
        !animatableRef.current ||
        typeof animatableRef.current.x !== 'function'
      )
        return;
      animatableRef.current.x(e.clientX - size / 2);
      animatableRef.current.y(e.clientY - size / 2);
    };

    window.addEventListener('mousemove', handleMouseMove);

    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = () => {
      if (mq.matches) {
        window.removeEventListener('mousemove', handleMouseMove);
        animatableRef.current?.revert();
        animatableRef.current = null;
      } else {
        if (!animatableRef.current && glowRef.current) {
          animatableRef.current = createSafeAnimatable(glowRef.current, {
            x: 0,
            y: 0,
            duration: durations[300] * 1000,
            ease: easings.outExpo,
          });
          window.addEventListener('mousemove', handleMouseMove);
        }
      }
    };

    if (typeof mq.addEventListener === 'function')
      mq.addEventListener('change', handleChange);
    else if (typeof (mq as any).addListener === 'function')
      (mq as any).addListener(handleChange);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (typeof mq.removeEventListener === 'function')
        mq.removeEventListener('change', handleChange);
      else if (typeof (mq as any).removeListener === 'function')
        (mq as any).removeListener(handleChange);
      animatableRef.current?.revert();
      const cancellable = animatableRef.current as unknown as {
        cancel?: () => void;
      } | null;
      if (cancellable && typeof cancellable.cancel === 'function') {
        try {
          cancellable.cancel();
        } catch {}
      }
      animatableRef.current = null;
    };
  }, [size]);

  return (
    <div
      ref={glowRef}
      aria-hidden="true"
      className="pointer-events-none fixed z-[1] rounded-full"
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle, ${bg} 0%, transparent 70%)`,
        opacity: 0.06 * intensity,
        filter: 'blur(20px)',
        left: 0,
        top: 0,
        willChange: 'transform',
      }}
    />
  );
}
