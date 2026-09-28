// src/components/ui/HudPanel.tsx
import React from 'react';
import { GlitchAccent } from './GlitchText';
import GridLattice from './graphics/primitives/GridLattice';

const ACCENT_COLOR: Record<GlitchAccent, string> = {
  cyan: 'var(--neon-cyan)',
  violet: 'var(--neon-violet)',
  coral: 'var(--neon-coral)',
  amber: 'var(--neon-amber)',
  lime: 'var(--neon-lime)',
  ice: 'var(--neon-ice)',
};

type Props = React.HTMLAttributes<HTMLDivElement> & {
  accent?: GlitchAccent;
  title?: string;
  innerClassName?: string;
  /** AAA wash — saturated tint behind card (Out-of-Actions grade) */
  wash?: boolean;
  /** Subtle HUD grid on card back */
  grid?: boolean;
};

export default function HudPanel({
  accent = 'amber',
  title,
  className = '',
  innerClassName = '',
  wash = false,
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
    (baseStyle as Record<string, string>).backgroundImage =
      `linear-gradient(var(--wash-${accent}), var(--wash-${accent}))`;
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
