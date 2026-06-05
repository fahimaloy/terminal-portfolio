// src/components/ui/GlitchText.tsx
import React from 'react';

export type GlitchAccent = 'yellow' | 'magenta' | 'cyan' | 'green' | 'red';

const ACCENT_COLORS: Record<GlitchAccent, string> = {
  yellow: '#ffaa00',
  magenta: '#ff00aa',
  cyan: '#00f0ff',
  green: '#39ff14',
  red: '#ff3355',
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
        color: '#fff',
      }}
    >
      {children}
    </Tag>
  );
}
