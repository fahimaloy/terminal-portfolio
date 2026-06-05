// src/components/ui/StatBar.tsx
import React from 'react';
import { GlitchAccent } from './GlitchText';

const ACCENT_BG: Record<GlitchAccent, string> = {
  yellow: 'bg-neon-yellow',
  magenta: 'bg-neon-magenta',
  cyan: 'bg-neon-cyan',
  green: 'bg-neon-green',
  red: 'bg-neon-red',
};
const ACCENT_TEXT: Record<GlitchAccent, string> = {
  yellow: 'text-neon-yellow',
  magenta: 'text-neon-magenta',
  cyan: 'text-neon-cyan',
  green: 'text-neon-green',
  red: 'text-neon-red',
};

type Props = {
  label: string;
  value: number; // 0..100
  accent?: GlitchAccent;
  showValue?: boolean;
  className?: string;
};

export default function StatBar({
  label,
  value,
  accent = 'cyan',
  showValue = true,
  className = '',
}: Props) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className={`font-body text-xs ${className}`}>
      <div className="flex justify-between mb-1">
        <span className={`${ACCENT_TEXT[accent]} font-display tracking-[2px] uppercase text-[10px]`}>
          {label}
        </span>
        {showValue && <span className="text-text-muted">{v}%</span>}
      </div>
      <div className="h-1.5 bg-white/5 overflow-hidden">
        <div
          data-testid="stat-bar-fill"
          className={`h-full ${ACCENT_BG[accent]} transition-all duration-500 ease-out`}
          style={{ width: `${v}%`, boxShadow: '0 0 6px currentColor' }}
        />
      </div>
    </div>
  );
}
