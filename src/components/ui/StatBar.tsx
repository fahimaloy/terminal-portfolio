// src/components/ui/StatBar.tsx
/* ═══════════════════════════════════════════════════════════════════════════════
   STAT BAR — Animated progress bar with anime.js count-up
   Smooth fill animation on mount and value change.
═══════════════════════════════════════════════════════════════════════════════ */

import React, { useEffect, useRef, useState } from 'react';
import { animate } from 'animejs';
import { GlitchAccent } from './GlitchText';
import { canAnimate } from '../../config/animations';

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
const ACCENT_GLOW: Record<GlitchAccent, string> = {
  yellow: 'rgba(255,170,0,0.5)',
  magenta: 'rgba(255,0,170,0.5)',
  cyan: 'rgba(0,240,255,0.5)',
  green: 'rgba(57,255,20,0.5)',
  red: 'rgba(255,51,85,0.5)',
};

type Props = {
  label: string;
  value: number; // 0..100
  accent?: GlitchAccent;
  showValue?: boolean;
  className?: string;
  /** Delay before animation starts */
  delay?: number;
};

export default function StatBar({
  label,
  value,
  accent = 'cyan',
  showValue = true,
  className = '',
  delay = 0,
}: Props) {
  const [displayValue, setDisplayValue] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);
  const proxyRef = useRef({ val: 0 });

  useEffect(() => {
    const target = Math.max(0, Math.min(100, Math.round(value)));

    if (!canAnimate()) {
      setDisplayValue(target);
      setIsVisible(true);
      return;
    }

    const timer = setTimeout(() => {
      setIsVisible(true);
      proxyRef.current.val = 0;
      animate(proxyRef.current, {
        val: [0, target],
        duration: 800,
        ease: 'outExpo',
        onUpdate: () => {
          setDisplayValue(Math.round(proxyRef.current.val));
        },
      });
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return (
    <div className={`font-body text-xs ${className}`}>
      <div className="flex justify-between mb-1">
        <span
          className={`${ACCENT_TEXT[accent]} font-display tracking-[2px] uppercase text-[10px]`}
        >
          {label}
        </span>
        {showValue && (
          <span className="text-text-muted font-mono text-[10px]">
            {displayValue}%
          </span>
        )}
      </div>
      <div className="h-1.5 bg-white/[0.03] overflow-hidden relative">
        <div
          ref={barRef}
          data-testid="stat-bar-fill"
          className={`h-full ${ACCENT_BG[accent]}`}
          style={{
            width: isVisible ? `${displayValue}%` : '0%',
            boxShadow: `0 0 8px ${ACCENT_GLOW[accent]}`,
            transition: isVisible ? 'none' : 'width 0s',
          }}
        />
        {/* Glow trail */}
        <div
          className="absolute top-0 h-full w-4 blur-sm opacity-60"
          style={{
            background: ACCENT_GLOW[accent],
            left: `calc(${displayValue}% - 8px)`,
            transition: isVisible ? 'none' : 'left 0s',
          }}
        />
      </div>
    </div>
  );
}
