// src/components/ui/NeonButton.tsx
import React from 'react';
import { GlitchAccent } from './GlitchText';

type Variant = 'filled' | 'outline' | 'ghost';

const ACCENT_MAP: Record<GlitchAccent, string> = {
  yellow: 'var(--neon-yellow)',
  magenta: 'var(--neon-magenta)',
  cyan: 'var(--neon-cyan)',
  green: 'var(--neon-green)',
  red: 'var(--neon-red)',
  purple: 'var(--neon-purple)',
  blue: 'var(--neon-blue)',
};

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  accent?: GlitchAccent;
  loading?: boolean;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
};

export default function NeonButton({
  variant = 'filled',
  accent = 'yellow',
  loading = false,
  iconLeft,
  iconRight,
  className = '',
  children,
  disabled,
  style,
  ...rest
}: Props) {
  const isDisabled = disabled || loading;
  const accentColor = ACCENT_MAP[accent];

  const variantStyle: React.CSSProperties =
    variant === 'filled'
      ? {
          background: accentColor,
          color: 'var(--bg-1)',
          border: `1px solid ${accentColor}`,
        }
      : variant === 'outline'
      ? {
          background: 'transparent',
          color: accentColor,
          border: `1px solid ${accentColor}`,
        }
      : {
          background: 'transparent',
          color: 'var(--fg-2)',
          border: '1px solid transparent',
        };

  return (
    <button
      {...rest}
      disabled={isDisabled}
      style={
        {
          ...variantStyle,
          borderRadius: 'var(--radius-md)',
          transition: `transform var(--dur-hover) var(--ease-out), background var(--dur-hover) var(--ease-out), color var(--dur-hover) var(--ease-out), border-color var(--dur-hover) var(--ease-out), opacity var(--dur-hover) var(--ease-out)`, // token-lint-ignore — CSS var, not Tailwind ease class
          ...style,
        } as React.CSSProperties
      }
      className={`font-display tracking-[2px] uppercase text-[11px] px-4 py-2.5
        hover:scale-[1.02] active:scale-[0.98]
        disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--neon-cyan)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-1)]
        inline-flex items-center gap-2 ${className}`}
    >
      {loading ? (
        <span className="w-3 h-3 border-2 border-current/30 border-t-current rounded-full animate-spin" />
      ) : (
        iconLeft
      )}
      <span>{children}</span>
      {!loading && iconRight}
    </button>
  );
}
