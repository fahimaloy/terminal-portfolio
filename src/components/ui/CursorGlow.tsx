'use client';

import React, { useEffect, useRef } from 'react';
import { createSafeAnimatable } from '../../utils/animatable';
import { isReducedMotion } from '../../config/animations';

interface CursorGlowProps {
  color?: string;
  size?: number;
  intensity?: number;
}

export default function CursorGlow({
  color = 'rgba(0, 240, 255, 0.15)',
  size = 400,
  intensity = 1,
}: CursorGlowProps) {
  const glowRef = useRef<HTMLDivElement>(null);
  const animatableRef = useRef<ReturnType<typeof createSafeAnimatable> | null>(null);

  useEffect(() => {
    if (isReducedMotion()) return;

    const glowEl = glowRef.current;
    if (!glowEl) return;

    // Create animatable with x:0 y:0 so the instance exposes .x() and .y()
    animatableRef.current = createSafeAnimatable(glowEl, {
      x: 0,
      y: 0,
      duration: 400,
      ease: 'outExpo',
    });

    const handleMouseMove = (e: MouseEvent) => {
      if (!animatableRef.current || typeof animatableRef.current.x !== 'function') return;
      animatableRef.current.x(e.clientX - size / 2);
      animatableRef.current.y(e.clientY - size / 2);
    };

    window.addEventListener('mousemove', handleMouseMove);

    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = () => {
      // Re-evaluate: if reduced motion is now preferred, teardown animatable
      if (mq.matches) {
        window.removeEventListener('mousemove', handleMouseMove);
        animatableRef.current?.revert();
        animatableRef.current = null;
      } else {
        // Recreate if needed
        if (!animatableRef.current && glowRef.current) {
          animatableRef.current = createSafeAnimatable(glowRef.current, {
            x: 0,
            y: 0,
            duration: 400,
            ease: 'outExpo',
          });
          window.addEventListener('mousemove', handleMouseMove);
        }
      }
    };

    // Modern browsers
    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', handleChange);
    } else if (typeof mq.addListener === 'function') {
      mq.addListener(handleChange);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (typeof mq.removeEventListener === 'function') {
        mq.removeEventListener('change', handleChange);
      } else if (typeof mq.removeListener === 'function') {
        mq.removeListener(handleChange);
      }
      animatableRef.current?.revert();
      // Fallback if animejs version exposes cancel but not revert
      const cancellable = animatableRef.current as unknown as { cancel?: () => void } | null;
      if (cancellable && typeof cancellable.cancel === 'function') {
        try {
          cancellable.cancel();
        } catch {}
      }
      animatableRef.current = null;
    };
  }, [size]);

  if (isReducedMotion()) return null;

  return (
    <div
      ref={glowRef}
      aria-hidden="true"
      className="pointer-events-none fixed z-[1] rounded-full blur-[80px] opacity-0 transition-opacity duration-300"
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
        opacity: intensity * 0.6,
        left: 0,
        top: 0,
        willChange: 'transform',
      }}
    />
  );
}
