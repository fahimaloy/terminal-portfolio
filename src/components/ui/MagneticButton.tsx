'use client';

import React, { useRef, useCallback } from 'react';
import { spring } from 'animejs';
import { createSafeAnimatable } from '../../utils/animatable';
import { durations, isReducedMotion, springs } from '../../config/animations';

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
        // Was 250ms — no --dur-250 exists, so this takes the next token down
        // (durations[200]), matching AdminLayout's MOBILE_EXIT_MS. NOTE this
        // is inert while a Spring ease is set: anime swaps `duration` for the
        // Spring's `settlingDuration` (1760ms for springs.soft). Kept for the
        // same reason NeonButton passes both — a token, not a bare literal.
        duration: durations[200] * 1000,
        // Was the string 'spring(soft)', which this anime build does not parse:
        // `eases['spring']` is undefined, so parseEaseString falls through to
        // `none` — the follow was running LINEAR at 250ms, never springy.
        // `spring(springs.soft)` is the real Spring that token names.
        // See the note in the handoff: this is a deliberate behaviour change
        // from 250ms-linear to a 1760ms spring, not a like-for-like swap.
        ease: spring(springs.soft),
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
