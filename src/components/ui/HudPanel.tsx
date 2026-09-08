// src/components/ui/HudPanel.tsx
import React from 'react';
import { GlitchAccent } from './GlitchText';

type NotchSize = 'sm' | 'md' | 'lg';

const ACCENT_COLOR: Record<GlitchAccent, string> = {
  yellow: 'var(--neon-yellow)',
  magenta: 'var(--neon-magenta)',
  cyan: 'var(--neon-cyan)',
  green: 'var(--neon-green)',
  red: 'var(--neon-red)',
  purple: 'var(--neon-purple)',
  blue: 'var(--neon-blue)',
};

type Props = React.HTMLAttributes<HTMLDivElement> & {
  accent?: GlitchAccent;
  notch?: NotchSize;
  title?: string;
  innerClassName?: string;
  /** flat removes the inner gradient — kept for compat, now no-op (flat card always) */
  flat?: boolean;
};

export default function HudPanel({
  accent = 'yellow',
  notch: _notch = 'md',
  title,
  className = '',
  innerClassName = '',
  flat: _flat = false,
  children,
  ...rest
}: Props) {
  const accentColor = ACCENT_COLOR[accent];
  const panelStyle: React.CSSProperties = {
    background: 'var(--bg-2)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--radius-lg)',
    borderTop: `3px solid ${accentColor}`,
    ...(rest.style || {}),
  };

  return (
    <div {...rest} className={`rounded-card ${className}`} style={panelStyle}>
      {title && (
        <div
          className="px-3 py-1.5 border-b font-display text-[10px] tracking-[3px] uppercase"
          style={{ borderColor: 'var(--border-subtle)', color: 'var(--fg-2)' }}
        >
          {title}
        </div>
      )}
      <div className={innerClassName}>{children}</div>
    </div>
  );
}
