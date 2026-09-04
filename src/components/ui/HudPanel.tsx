// src/components/ui/HudPanel.tsx
import React from 'react';
import { GlitchAccent } from './GlitchText';

type NotchSize = 'sm' | 'md' | 'lg';
const NOTCH_CLASS: Record<NotchSize, string> = {
  sm: 'clip-notch-sm',
  md: 'clip-notch-md',
  lg: 'clip-notch-lg',
};
const GLOW_CLASS: Record<GlitchAccent, string> = {
  yellow: 'hud-glow-yellow',
  magenta: 'hud-glow-magenta',
  cyan: 'hud-glow-cyan',
  green: 'hud-glow-green',
  red: 'hud-glow-red',
  purple: 'hud-glow-purple',
  blue: 'hud-glow-blue',
};
const ACCENT_TITLE: Record<GlitchAccent, string> = {
  yellow: 'text-neon-yellow',
  magenta: 'text-neon-magenta',
  cyan: 'text-neon-cyan',
  green: 'text-neon-green',
  red: 'text-neon-red',
  purple: 'text-neon-purple',
  blue: 'text-neon-blue',
};

type Props = React.HTMLAttributes<HTMLDivElement> & {
  accent?: GlitchAccent;
  notch?: NotchSize;
  title?: string;
  innerClassName?: string;
  /** flat removes the inner gradient */
  flat?: boolean;
};

export default function HudPanel({
  accent = 'yellow',
  notch = 'md',
  title,
  className = '',
  innerClassName = '',
  flat = false,
  children,
  ...rest
}: Props) {
  const bgStyle: React.CSSProperties = flat
    ? { background: 'var(--bg-smoke)' }
    : {
        background:
          'linear-gradient(135deg, rgba(255,255,255,0.02), rgba(0,0,0,0.4))',
      };
  return (
    <div
      {...rest}
      className={`${NOTCH_CLASS[notch]} ${GLOW_CLASS[accent]} ${className}`}
      style={{ ...bgStyle, ...(rest.style || {}) }}
    >
      {title && (
        <div
          className={`px-3 py-1.5 border-b border-white/5 font-display text-[10px] tracking-[3px] uppercase ${ACCENT_TITLE[accent]}`}
        >
          {title}
        </div>
      )}
      <div className={innerClassName}>{children}</div>
    </div>
  );
}
