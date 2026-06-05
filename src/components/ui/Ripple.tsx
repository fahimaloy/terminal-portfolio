// src/components/ui/Ripple.tsx
import React, { useState } from 'react';

type Ripple = { id: number; x: number; y: number; color: string };

type Props = React.HTMLAttributes<HTMLDivElement> & {
  color?: string;
  /** ms before cleaning up a ripple element */
  duration?: number;
};

export default function Ripple({
  color = 'rgba(255,255,255,0.4)',
  duration = 500,
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
    setRipples((r) => [...r, { id, x, y, color }]);
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
          className="pointer-events-none absolute rounded-full animate-ripple-out"
          style={{
            left: r.x,
            top: r.y,
            width: 8,
            height: 8,
            background: r.color,
            transform: 'translate(-50%, -50%)',
          }}
        />
      ))}
    </div>
  );
}
