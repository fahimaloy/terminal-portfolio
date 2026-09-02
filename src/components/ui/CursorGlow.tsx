'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import { createAnimatable } from 'animejs';
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
  const animatableRef = useRef<ReturnType<typeof createAnimatable> | null>(null);

  useEffect(() => {
    if (!glowRef.current || isReducedMotion()) return;
    animatableRef.current = createAnimatable(glowRef.current, {
      duration: 400,
      ease: 'outExpo',
    });
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!animatableRef.current || isReducedMotion()) return;
      animatableRef.current.x(e.clientX - size / 2);
      animatableRef.current.y(e.clientY - size / 2);
    },
    [size],
  );

  useEffect(() => {
    if (isReducedMotion()) return;
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [handleMouseMove]);

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
