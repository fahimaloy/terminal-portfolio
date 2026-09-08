// src/components/ui/NeonChip.tsx — Chip with subtle editorial accent
import React, { useRef, useEffect } from 'react';
import { animate } from 'animejs';
import { GlitchAccent } from './GlitchText';
import { isReducedMotion, durations, easings } from '../../config/animations';

type ChipAccent = GlitchAccent | 'purple' | 'blue';

type Props = React.HTMLAttributes<HTMLSpanElement> & {
  accent?: ChipAccent;
  children: React.ReactNode;
  icon?: React.ReactNode;
  onClick?: () => void;
  className?: string;
  removable?: boolean;
  onRemove?: () => void;
};

export default function NeonChip({
  accent = 'cyan',
  children,
  icon,
  onClick,
  className = '',
  removable,
  onRemove,
  style,
  ...rest
}: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const animRef = useRef<ReturnType<typeof animate> | null>(null);

  useEffect(() => {
    return () => {
      animRef.current?.cancel();
    };
  }, []);

  const handleClick = () => {
    if (isReducedMotion() || !ref.current || !onClick) return;
    animRef.current?.cancel();
    animRef.current = animate(ref.current, {
      scale: [1, 1.05],
      duration: durations.hover * 1000,
      ease: easings.outQuad,
    });
    onClick();
  };

  return (
    <span
      {...rest}
      ref={ref}
      onClick={onClick ? handleClick : undefined}
      style={
        {
          background: `color-mix(in srgb, var(--neon-${accent}) 10%, transparent)`,
          border: `1px solid color-mix(in srgb, var(--neon-${accent}) 18%, transparent)`,
          borderRadius: 'var(--radius-full)',
          color: 'var(--fg-2)',
          ...style,
        } as React.CSSProperties
      }
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-display tracking-[1px] transition-colors ${
        onClick ? 'cursor-pointer hover:scale-[1.05]' : ''
      } ${className}`}
    >
      {icon && <span className="text-[10px]">{icon}</span>}
      {children}
      {removable && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove?.();
          }}
          className="ml-0.5 hover:text-[var(--status-error)] transition-colors"
          aria-label="Remove"
        >
          ×
        </button>
      )}
    </span>
  );
}
