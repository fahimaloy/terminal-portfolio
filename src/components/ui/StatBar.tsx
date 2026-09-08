// src/components/ui/StatBar.tsx — thin editorial progress bar
import React, { useEffect, useRef, useState } from 'react';
import { animate } from 'animejs';
import { GlitchAccent } from './GlitchText';
import { canAnimate, durations, easings } from '../../config/animations';

const ACCENT_COLOR: Record<GlitchAccent, string> = {
  yellow: 'var(--neon-yellow)',
  magenta: 'var(--neon-magenta)',
  cyan: 'var(--neon-cyan)',
  green: 'var(--neon-green)',
  red: 'var(--neon-red)',
  purple: 'var(--neon-purple)',
  blue: 'var(--neon-blue)',
};

type Props = {
  label: string;
  value: number; // 0..100
  accent?: GlitchAccent;
  showValue?: boolean;
  className?: string;
  /** Delay before animation starts (ms) */
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
        duration: durations.enter * 1000,
        ease: easings.expoOut,
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
          className="font-display tracking-[2px] uppercase text-[10px]"
          style={{ color: 'var(--fg-2)' }}
        >
          {label}
        </span>
        {showValue && (
          <span
            className="font-mono text-[10px]"
            style={{ color: 'var(--text-muted)' }}
          >
            {displayValue}%
          </span>
        )}
      </div>
      <div
        className="h-1 overflow-hidden relative"
        style={{
          background: 'var(--bg-3)',
          borderRadius: 'var(--radius-full)',
        }}
      >
        <div
          ref={barRef}
          data-testid="stat-bar-fill"
          className="h-full"
          style={{
            width: isVisible ? `${displayValue}%` : '0%',
            background: ACCENT_COLOR[accent],
            borderRadius: 'var(--radius-full)',
            transition: isVisible ? 'none' : 'width 0s',
          }}
        />
      </div>
    </div>
  );
}
