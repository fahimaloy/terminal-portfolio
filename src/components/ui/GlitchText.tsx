// src/components/ui/GlitchText.tsx
import React from 'react';

export type GlitchAccent =
  | 'yellow'
  | 'magenta'
  | 'cyan'
  | 'green'
  | 'red'
  | 'purple'
  | 'blue';

const ACCENT_COLORS: Record<GlitchAccent, string> = {
  yellow: 'var(--neon-yellow)',
  magenta: 'var(--neon-magenta)',
  cyan: 'var(--neon-cyan)',
  green: 'var(--neon-green)',
  red: 'var(--neon-red)',
  purple: 'var(--neon-purple)',
  blue: 'var(--neon-blue)',
};

type Props = {
  children: React.ReactNode;
  accent?: GlitchAccent;
  as?: keyof JSX.IntrinsicElements;
  className?: string;
  shift?: boolean;
  'data-testid'?: string;
};

export default function GlitchText({
  children,
  accent = 'magenta',
  as: Tag = 'span',
  className = '',
  shift = false,
  'data-testid': testId,
}: Props) {
  const color = ACCENT_COLORS[accent];
  const offset = 3;
  return (
    <Tag
      data-testid={testId}
      className={`font-display tracking-wider inline-block ${
        shift ? 'animate-glitch-shift' : ''
      } ${className}`}
      style={{
        textShadow: `${offset}px 0 0 ${color}, -${offset}px 0 0 var(--neon-cyan), 0 0 18px ${color}`,
        color: 'var(--text-primary)',
      }}
    >
      {children}
    </Tag>
  );
}
