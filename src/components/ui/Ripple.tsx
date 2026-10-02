// src/components/ui/Ripple.tsx
// Muted editorial ripple — scale+opacity outQuad 420ms, 0.08 opacity.
// The disc colour comes from `color` (default `var(--fg-1)`): it was accepted
// and then ignored, which pinned every ripple to white regardless of what the
// caller asked for. It is now applied to the disc — a caller asking for an
// accent-tinted ripple gets one.
import React, { useState } from 'react';

type Ripple = { id: number; x: number; y: number };

type Props = React.HTMLAttributes<HTMLDivElement> & {
  /**
   * Disc background. A CSS colour or a `var(--token)` reference — tokens.css
   * stays the only colour source. Defaults to the neutral `--fg-1`.
   */
  color?: string;
  /** ms before cleaning up a ripple element */
  duration?: number;
};

export default function Ripple({
  color = 'var(--fg-1)',
  duration = 420,
  className = '',
  children,
  onClick,
  ...rest
}: Props) {
  const [ripples, setRipples] = useState<Ripple[]>([]);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = Date.now() + Math.random();
    setRipples((r) => [...r, { id, x, y }]);
    setTimeout(
      () => setRipples((r) => r.filter((rp) => rp.id !== id)),
      duration,
    );
    onClick?.(e);
  };

  return (
    <div
      onClick={handleClick}
      className={`relative overflow-hidden ${className}`}
      {...rest}
    >
      {children}
      {ripples.map((r) => (
        <span
          key={r.id}
          aria-hidden="true"
          className="pointer-events-none absolute rounded-full"
          style={{
            left: r.x,
            top: r.y,
            width: 12,
            height: 12,
            background: color,
            opacity: 0.08,
            transform: 'translate(-50%, -50%) scale(0)',
            animation: `ripple-muted ${duration}ms cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards`,
          }}
        />
      ))}
      <style>{`@keyframes ripple-muted{to{transform:translate(-50%,-50%) scale(18);opacity:0}}`}</style>
    </div>
  );
}
