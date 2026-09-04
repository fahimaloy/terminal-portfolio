// src/components/ui/NeonChip.tsx
/* ═══════════════════════════════════════════════════════════════════════════════
   NEON CHIP — Small tag/label with neon glow and hover animation
   Uses anime.js for hover scale effect.
═══════════════════════════════════════════════════════════════════════════════ */

import React, { useRef, useEffect } from 'react';
import { animate } from 'animejs';
import { GlitchAccent } from './GlitchText';
import { isReducedMotion } from '../../config/animations';

const ACCENT_BG: Record<GlitchAccent, string> = {
  yellow: 'bg-neon-yellow/15 border-neon-yellow/30',
  magenta: 'bg-neon-magenta/15 border-neon-magenta/30',
  cyan: 'bg-neon-cyan/15 border-neon-cyan/30',
  green: 'bg-neon-green/15 border-neon-green/30',
  red: 'bg-neon-red/15 border-neon-red/30',
};
const ACCENT_TEXT: Record<GlitchAccent, string> = {
  yellow: 'text-neon-yellow',
  magenta: 'text-neon-magenta',
  cyan: 'text-neon-cyan',
  green: 'text-neon-green',
  red: 'text-neon-red',
};

type Props = React.HTMLAttributes<HTMLSpanElement> & {
  accent?: GlitchAccent;
  children: React.ReactNode;
  icon?: React.ReactNode;
  onClick?: () => void;
  className?: string;
  removable?: boolean;
  onRemove?: () => void;
};

export default function NeonChip({
  accent = 'cyan',
  children,
  icon,
  onClick,
  className = '',
  removable,
  onRemove,
  ...rest
}: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const animRef = useRef<ReturnType<typeof animate> | null>(null);

  useEffect(() => {
    return () => { animRef.current?.cancel(); };
  }, []);

  const handleClick = () => {
    if (isReducedMotion() || !ref.current || !onClick) return;
    animRef.current?.cancel();
    animRef.current = animate(ref.current, {
      scale: [1, 1.05],
      duration: 200,
      ease: 'outExpo',
    });
    onClick();
  };

  return (
    <span
      {...rest}
      ref={ref}
      onClick={handleClick}
      className={`inline-flex items-center gap-1 px-2 py-0.5 border rounded-md text-[10px] font-display tracking-[1px] transition-colors duration-200 ${
        ACCENT_BG[accent]
      } ${ACCENT_TEXT[accent]} ${onClick ? 'cursor-pointer hover:scale-[1.05]' : ''} ${className}`}
    >
      {icon && <span className="text-[10px]">{icon}</span>}
      {children}
      {removable && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove?.();
          }}
          className="ml-0.5 hover:text-red-400"
          aria-label="Remove"
        >
          ×
        </button>
      )}
    </span>
  );
}
