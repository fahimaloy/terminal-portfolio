// src/components/ui/NeonButton.tsx
import React from 'react';
import { GlitchAccent } from './GlitchText';

type Variant = 'filled' | 'outline' | 'ghost';

const VARIANT_BG: Record<Variant, Record<GlitchAccent, string>> = {
  filled: {
    yellow: 'bg-neon-yellow text-black',
    magenta: 'bg-neon-magenta text-white',
    cyan: 'bg-neon-cyan text-black',
    green: 'bg-neon-green text-black',
    red: 'bg-neon-red text-white',
    purple: 'bg-neon-purple text-white',
    blue: 'bg-neon-blue text-black',
  },
  outline: {
    yellow: 'bg-transparent text-neon-yellow',
    magenta: 'bg-transparent text-neon-magenta',
    cyan: 'bg-transparent text-neon-cyan',
    green: 'bg-transparent text-neon-green',
    red: 'bg-transparent text-neon-red',
    purple: 'bg-transparent text-neon-purple',
    blue: 'bg-transparent text-neon-blue',
  },
  ghost: {
    yellow: 'bg-transparent text-text-secondary',
    magenta: 'bg-transparent text-text-secondary',
    cyan: 'bg-transparent text-text-secondary',
    green: 'bg-transparent text-text-secondary',
    red: 'bg-transparent text-text-secondary',
    purple: 'bg-transparent text-text-secondary',
    blue: 'bg-transparent text-text-secondary',
  },
};

const GLOW: Record<GlitchAccent, string> = {
  yellow: 'hud-glow-yellow',
  magenta: 'hud-glow-magenta',
  cyan: 'hud-glow-cyan',
  green: 'hud-glow-green',
  red: 'hud-glow-red',
  purple: 'hud-glow-purple',
  blue: 'hud-glow-blue',
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
  ...rest
}: Props) {
  const isDisabled = disabled || loading;
  return (
    <button
      {...rest}
      disabled={isDisabled}
      className={`clip-notch-sm font-display tracking-[2px] uppercase text-[11px] px-4 py-2.5
        ${VARIANT_BG[variant][accent]} ${GLOW[accent]}
        transition-all duration-200 hover:scale-[1.03] active:scale-[0.97]
        disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-bg-void
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
