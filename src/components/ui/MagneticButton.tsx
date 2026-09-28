'use client';

import React, { useRef, useCallback } from 'react';
import { createSafeAnimatable } from '../../utils/animatable';
import { isReducedMotion } from '../../config/animations';

type MagneticButtonOwnProps = {
  children: React.ReactNode;
  className?: string;
  strength?: number;
};

/**
 * Polymorphic in `as`. A plain union of the two attribute bags collapses to
 * `never` when spread onto a generic `ElementType`, so the variants are
 * discriminated on `as` instead: a button gets button attributes, an anchor
 * gets anchor attributes, and both are checked at the call site.
 */
type MagneticButtonProps = MagneticButtonOwnProps &
  (
    | ({ as?: 'button' } & React.ButtonHTMLAttributes<HTMLButtonElement>)
    | ({ as: 'a' } & React.AnchorHTMLAttributes<HTMLAnchorElement>)
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

  // `as` is destructured above, so the tag is known and the remaining props
  // are narrowed to that element's attribute bag.
  return (
    <Component
      ref={ref}
      className={className}
      onClick={onClick as never}
      onMouseMove={handleMouseMove as never}
      onMouseLeave={handleMouseLeave as never}
      {...(rest as Record<string, unknown>)}
    >
      {children}
    </Component>
  );
}
