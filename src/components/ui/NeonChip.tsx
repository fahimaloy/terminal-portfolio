// src/components/ui/NeonChip.tsx
import React from 'react';
import { GlitchAccent } from './GlitchText';

const COLOR: Record<GlitchAccent, string> = {
  yellow: 'text-neon-yellow border-neon-yellow/30',
  magenta: 'text-neon-magenta border-neon-magenta/30',
  cyan: 'text-neon-cyan border-neon-cyan/30',
  green: 'text-neon-green border-neon-green/30',
  red: 'text-neon-red border-neon-red/30',
};

type Props = React.HTMLAttributes<HTMLSpanElement> & {
  accent?: GlitchAccent;
};

export default function NeonChip({
  accent = 'cyan',
  className = '',
  children,
  ...rest
}: Props) {
  return (
    <span
      {...rest}
      className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-display tracking-[1.5px] uppercase border bg-black/30 ${COLOR[accent]} ${className}`}
    >
      {children}
    </span>
  );
}
