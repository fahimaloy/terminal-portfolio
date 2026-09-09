// src/components/ui/StatBar.tsx — thin editorial progress bar
import React, { useEffect, useRef, useState } from 'react';
import { animate } from 'animejs';
import { GlitchAccent } from './GlitchText';
import { canAnimate, durations, easings } from '../../config/animations';
import { useMotionScope } from '../../hooks/useMotionScope';

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
  const motionScope = useMotionScope(barRef);

  useEffect(() => {
    const target = Math.max(0, Math.min(100, Math.round(value)));

    if (!canAnimate()) {
      setDisplayValue(target);
      setIsVisible(true);
      return;
    }

    setIsVisible(true);

    proxyRef.current.val = 0;
    const scope = motionScope.create();
    if (!scope) return;

    scope.add(() => {
      animate(proxyRef.current, {
        val: [0, target],
        duration: durations.entry * 1000,
        ease: easings.expoOut,
        onUpdate: () => {
          setDisplayValue(Math.round(proxyRef.current.val));
        },
      });
    });

    return () => {
      scope.revert();
    };
  }, [value, delay]);

  return (
    <div className={`font-body text-xs ${className}`}>
      <div className="flex items-center justify-between mb-1">
        <div
          className="font-mono text-[10px] tracking-[0.18em]"
          style={{ color: 'var(--fg-3)' }}
        >
          {label}
        </div>
        {showValue && (
          <div
            className="font-mono text-[11px] tabular-nums"
            style={{ color: `var(--neon-${accent})` }}
          >
            {displayValue}%
          </div>
        )}
      </div>
      <div
        className="relative h-2 overflow-hidden rounded-full"
        style={{
          background: 'var(--bg-3)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <div
          className="absolute inset-0 opacity-40"
          style={{ background: `var(--wash-${accent})` }}
          aria-hidden="true"
        />
        <div
          data-testid="stat-bar-fill"
          ref={barRef}
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            width: isVisible ? `${displayValue}%` : '0%',
            transition: isVisible ? 'none' : 'width 0s',
            background: `var(--neon-${accent})`,
            boxShadow: `0 0 10px var(--glow-${accent})`,
          }}
        />
      </div>
    </div>
  );
}
