'use client';

import React, { useRef, useCallback } from 'react';
import { animate, createAnimatable } from 'animejs';
import { isReducedMotion } from '../../config/animations';

interface MagneticButtonProps {
  children: React.ReactNode;
  className?: string;
  strength?: number;
  onClick?: () => void;
}

export default function MagneticButton({
  children,
  className = '',
  strength = 0.3,
  onClick,
}: MagneticButtonProps) {
  const ref = useRef<HTMLButtonElement>(null);
  const animatableRef = useRef<ReturnType<typeof createAnimatable> | null>(null);

  React.useEffect(() => {
    if (ref.current && !isReducedMotion()) {
      animatableRef.current = createAnimatable(ref.current, {
        duration: 200,
        ease: 'outExpo',
      });
    }
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!ref.current || !animatableRef.current || isReducedMotion()) return;
      const rect = ref.current.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      animatableRef.current.x(x * strength);
      animatableRef.current.y(y * strength);
    },
    [strength],
  );

  const handleMouseLeave = useCallback(() => {
    if (!animatableRef.current || isReducedMotion()) return;
    animatableRef.current.x(0);
    animatableRef.current.y(0);
  }, []);

  return (
    <button
      ref={ref}
      className={className}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {children}
    </button>
  );
}
