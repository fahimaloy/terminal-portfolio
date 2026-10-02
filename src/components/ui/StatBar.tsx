// src/components/ui/StatBar.tsx — thin editorial progress bar
import React, { useEffect, useRef, useState } from 'react';
import { animate } from 'animejs';
import { GlitchAccent } from './GlitchText';
import { canAnimate, durations, easings } from '../../config/animations';
import { useMotionScope } from '../../hooks/useMotionScope';

const ACCENT_COLOR: Record<GlitchAccent, string> = {
  cyan: 'var(--neon-cyan)',
  violet: 'var(--neon-violet)',
  coral: 'var(--neon-coral)',
  amber: 'var(--neon-amber)',
  lime: 'var(--neon-lime)',
  ice: 'var(--neon-ice)',
};

type Props = {
  label: string;
  value: number; // 0..100
  accent?: GlitchAccent;
  showValue?: boolean;
  className?: string;
  // There used to be a `delay?: number` here. It reached the dependency array
  // and nothing else — the `animate()` call below never passed it on, so the
  // stagger it was written for never animated, once. Its only callers passed
  // `delay={0}/{200}/{400}` from a loading skeleton that no longer exists, and
  // the remaining caller on `404.tsx` omits it. Removing the prop is the only
  // honest option: wiring it up now would invent a stagger nobody asked for.
};

export default function StatBar({
  label,
  value,
  accent = 'cyan',
  showValue = true,
  className = '',
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
    motionScope.run((scope) => {
      if (!scope) {
        setDisplayValue(target);
        return;
      }
      animate(proxyRef.current, {
        val: [0, target],
        duration: durations.enter * 1000,
        ease: easings.expoOut,
        onUpdate: () => {
          setDisplayValue(Math.round(proxyRef.current.val));
        },
      });
    });
  }, [value, motionScope]);

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
