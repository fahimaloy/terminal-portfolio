'use client';

import React, { useRef, useCallback } from 'react';
import { createSafeAnimatable } from '../../utils/animatable';
import { isReducedMotion } from '../../config/animations';

type MagneticButtonBaseProps = {
  children: React.ReactNode;
  className?: string;
  strength?: number;
  as?: React.ElementType;
};

type MagneticButtonProps = MagneticButtonBaseProps &
  (
    | React.ButtonHTMLAttributes<HTMLButtonElement>
    | React.AnchorHTMLAttributes<HTMLAnchorElement>
  );

export default function MagneticButton({
  children,
  className = '',
  strength = 0.18,
  onClick,
  as: Component = 'button',
  ...rest
}: MagneticButtonProps) {
  const ref = useRef<any>(null);
  const animatableRef = useRef<ReturnType<typeof createSafeAnimatable> | null>(
    null,
  );

  React.useEffect(() => {
    if (ref.current && !isReducedMotion()) {
      animatableRef.current = createSafeAnimatable(ref.current, {
        x: 0,
        y: 0,
        duration: 250,
        ease: 'spring(soft)',
      });
    }
    return () => {
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
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!ref.current || !animatableRef.current || isReducedMotion()) return;
      if (typeof animatableRef.current.x !== 'function') return;
      if (typeof animatableRef.current.y !== 'function') return;
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
    if (typeof animatableRef.current.x !== 'function') return;
    if (typeof animatableRef.current.y !== 'function') return;
    animatableRef.current.x(0);
    animatableRef.current.y(0);
  }, []);

  return (
    <Component
      ref={ref}
      className={className}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      {...rest}
    >
      {children}
    </Component>
  );
}
