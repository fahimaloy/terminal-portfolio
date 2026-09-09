// src/components/ui/HudPanel.tsx
import React from 'react';
import { GlitchAccent } from './GlitchText';
import Bracket from './graphics/primitives/Bracket';
import GridLattice from './graphics/primitives/GridLattice';

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
  flat?: boolean;
  /** AAA wash — saturated tint behind card (Out-of-Actions grade) */
  wash?: boolean;
  /** Show bracket corners */
  bracket?: boolean;
  /** Subtle HUD grid on card back */
  grid?: boolean;
};

export default function HudPanel({
  accent = 'yellow',
  notch: _notch = 'md',
  title,
  className = '',
  innerClassName = '',
  flat: _flat = false,
  wash = false,
  bracket = false,
  grid = false,
  children,
  ...rest
}: Props) {
  const accentColor = ACCENT_COLOR[accent];
  const baseStyle: React.CSSProperties = {
    background: wash ? `var(--wash-${accent})` : 'var(--bg-2)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--radius-lg)',
    borderTop: `3px solid ${accentColor}`,
    ...(rest.style || {}),
  };

  // When wash is true, blend wash over bg-2 via backgroundImage overlay to keep depth
  if (wash) {
    baseStyle.backgroundColor = 'var(--bg-2)';
    (
      baseStyle as Record<string, string>
    ).backgroundImage = `linear-gradient(var(--wash-${accent}), var(--wash-${accent}))`;
  }

  return (
    <div
      {...rest}
      className={`rounded-card relative overflow-hidden ${className}`}
      style={baseStyle}
    >
      {grid && (
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.035]"
          aria-hidden="true"
        >
          <GridLattice opacity={1} color="var(--grid-1)" />
        </div>
      )}
      {bracket && (
        <div
          className="pointer-events-none absolute inset-0 opacity-50"
          aria-hidden="true"
        >
          <Bracket
            accent={accent}
            className="absolute inset-0"
            strokeWidth={1}
          />
        </div>
      )}
      {title && (
        <div
          className="relative px-3 py-1.5 border-b font-display text-[10px] tracking-[3px] uppercase"
          style={{ borderColor: 'var(--border-subtle)', color: 'var(--fg-2)' }}
        >
          {title}
        </div>
      )}
      <div className={`relative ${innerClassName}`}>{children}</div>
    </div>
  );
}
